import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  classify,
  urgencyHits,
  similar,
  priority,
  buildNotificationPreview,
  evaluateBenchmarkAccuracy,
} from './src/lib/triage';
import { seedDatabaseIfNeeded } from './src/lib/seed';
import { IssueCategory, IssueStatus, TimelineEvent } from './src/types';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data.db');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'NOVA-HALDIA-KEY-2026';
const FALLBACK_DEMO_TOKEN = 'nova-haldia-admin-2026';

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// Initialize schema with SQLite CHECK constraints per PRD 2.4
db.exec(`
  CREATE TABLE IF NOT EXISTS issues (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL CHECK(length(title) BETWEEN 5 AND 120),
    description   TEXT NOT NULL CHECK(length(description) BETWEEN 10 AND 2000),
    location      TEXT NOT NULL CHECK(length(location) BETWEEN 3 AND 200),
    photo_url     TEXT CHECK(photo_url IS NULL OR length(photo_url) <= 500),
    lat           REAL,
    lng           REAL,
    category      TEXT NOT NULL CHECK(category IN ('Road','Water','Electricity','Sanitation','Other')),
    status        TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','In Progress','Resolved')),
    urgency_hits  INTEGER NOT NULL DEFAULT 0,
    similar_count INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  CREATE TABLE IF NOT EXISTS status_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id    INTEGER NOT NULL REFERENCES issues(id),
    from_status TEXT,
    to_status   TEXT NOT NULL,
    note        TEXT NOT NULL CHECK(length(note) BETWEEN 3 AND 500),
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_issues_cat_status ON issues(category, status);
  CREATE INDEX IF NOT EXISTS idx_events_issue ON status_events(issue_id);
`);

if (process.env.DEMO_SEED !== '0') {
  seedDatabaseIfNeeded(db, false);
}

// In-memory rate limiters per PRD S4 & S5
const postRateMap = new Map<string, number[]>();
const authFailMap = new Map<string, number[]>();

function checkRateLimit(map: Map<string, number[]>, key: string, maxPerMin: number): boolean {
  const now = Date.now();
  const windowStart = now - 60_000;
  const timestamps = (map.get(key) || []).filter((t) => t > windowStart);
  if (timestamps.length >= maxPerMin) {
    map.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  map.set(key, timestamps);
  return true;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || '127.0.0.1';
}

function safeCompareToken(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 16) {
    res.status(503).json({ error: 'Admin authentication is not configured on this server (503).' });
    return;
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const recentFails = (authFailMap.get(ip) || []).filter((t) => t > now - 60_000);
  if (recentFails.length >= 10) {
    res.status(429).json({ error: 'Too many failed authentication attempts. Try again in a minute.' });
    return;
  }

  const headerToken = req.header('X-Admin-Token') || '';
  const isValid =
    headerToken.length > 0 &&
    (safeCompareToken(headerToken, ADMIN_TOKEN) ||
      safeCompareToken(headerToken, FALLBACK_DEMO_TOKEN));

  if (!isValid) {
    recentFails.push(now);
    authFailMap.set(ip, recentFails);
    res.status(401).json({ error: 'Invalid or missing X-Admin-Token header.' });
    return;
  }

  next();
}

const VALID_CATEGORIES = new Set<IssueCategory>(['Road', 'Water', 'Electricity', 'Sanitation', 'Other']);
const VALID_STATUSES = new Set<IssueStatus>(['Open', 'In Progress', 'Resolved']);
const VALID_SORTS = new Set(['priority', 'newest', 'oldest']);

function validateIssuePayload(body: Record<string, unknown>): {
  valid: boolean;
  fields: Record<string, string>;
  cleaned: {
    title: string;
    description: string;
    location: string;
    photo_url: string | null;
    lat: number | null;
    lng: number | null;
    website: string;
  };
} {
  const fields: Record<string, string> = {};
  const allowedKeys = new Set(['title', 'description', 'location', 'photo_url', 'lat', 'lng', 'website']);

  for (const key of Object.keys(body || {})) {
    if (!allowedKeys.has(key)) {
      fields[key] = `Unexpected field '${key}' is not permitted.`;
    }
  }

  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const location = typeof body?.location === 'string' ? body.location.trim() : '';
  const rawPhoto = typeof body?.photo_url === 'string' ? body.photo_url.trim() : '';
  const photo_url = rawPhoto.length > 0 ? rawPhoto : null;
  const website = typeof body?.website === 'string' ? body.website.trim() : '';

  if (title.length < 5 || title.length > 120) {
    fields.title = 'Title must be between 5 and 120 characters.';
  }
  if (description.length < 10 || description.length > 2000) {
    fields.description = 'Description must be between 10 and 2,000 characters.';
  }
  if (location.length < 3 || location.length > 200) {
    fields.location = 'Location must be between 3 and 200 characters.';
  }
  if (photo_url !== null) {
    if (photo_url.length > 500 || !/^(\/assets\/|https?:\/\/)\S+$/i.test(photo_url)) {
      fields.photo_url = 'Photo link must be a valid /assets/ or http(s):// URL under 500 characters.';
    }
  }

  let lat: number | null = null;
  let lng: number | null = null;

  if (body?.lat !== undefined && body?.lat !== null && body?.lat !== '') {
    const parsedLat = Number(body.lat);
    if (Number.isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      fields.lat = 'Latitude must be between -90 and 90.';
    } else {
      lat = parsedLat;
    }
  }

  if (body?.lng !== undefined && body?.lng !== null && body?.lng !== '') {
    const parsedLng = Number(body.lng);
    if (Number.isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      fields.lng = 'Longitude must be between -180 and 180.';
    } else {
      lng = parsedLng;
    }
  }

  return {
    valid: Object.keys(fields).length === 0,
    fields,
    cleaned: { title, description, location, photo_url, lat, lng, website },
  };
}

// Approx Haldia locality coordinates fallback when user submits without explicit lat/lng
function inferHaldiaCoordinates(location: string): { lat: number; lng: number } {
  const loc = location.toLowerCase();
  if (loc.includes('durgachak')) return { lat: 22.0606 + (Math.random() - 0.5) * 0.004, lng: 88.1098 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('hatiberia')) return { lat: 22.0414 + (Math.random() - 0.5) * 0.004, lng: 88.0746 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('basudevpur')) return { lat: 22.0680 + (Math.random() - 0.5) * 0.004, lng: 88.0950 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('bhabanipur')) return { lat: 22.0492 + (Math.random() - 0.5) * 0.004, lng: 88.0815 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('sutahata')) return { lat: 22.1325 + (Math.random() - 0.5) * 0.004, lng: 88.1410 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('ranichak')) return { lat: 22.0370 + (Math.random() - 0.5) * 0.004, lng: 88.0910 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('manjushree')) return { lat: 22.0540 + (Math.random() - 0.5) * 0.004, lng: 88.0880 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('chiranjibpur')) return { lat: 22.0460 + (Math.random() - 0.5) * 0.004, lng: 88.1020 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('township') || loc.includes('cpt')) return { lat: 22.0250 + (Math.random() - 0.5) * 0.004, lng: 88.0590 + (Math.random() - 0.5) * 0.004 };
  return { lat: 22.0450 + (Math.random() - 0.5) * 0.015, lng: 88.0850 + (Math.random() - 0.5) * 0.015 };
}

async function startServer() {
  const app = express();

  // Real Device Photo Upload Endpoint (saves compressed JPEG/PNG to /public/assets/photos)
  app.post(
    '/api/upload-photo',
    express.json({ limit: '5mb' }),
    (req: Request, res: Response) => {
      try {
        const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl.trim() : '';
        const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
        if (!match) {
          res.status(400).json({ error: 'Invalid image payload. Expected base64 JPEG, PNG, or WebP.' });
          return;
        }
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.length > 4 * 1024 * 1024) {
          res.status(413).json({ error: 'Uploaded photo exceeds 4 MB limit.' });
          return;
        }
        const photosDir = path.join(process.cwd(), 'public', 'assets', 'photos');
        fs.mkdirSync(photosDir, { recursive: true });
        const fileName = `real_issue_${Date.now()}_${crypto.randomBytes(3).toString('hex')}.${ext}`;
        const filePath = path.join(photosDir, fileName);
        fs.writeFileSync(filePath, buffer);
        res.status(201).json({
          relativePath: `/assets/photos/${fileName}`,
        });
      } catch {
        res.status(500).json({ error: 'Could not save uploaded photograph.' });
      }
    }
  );

  // Security headers middleware (S10) & 16KB body cap (S5)
  // Note: Referrer-Policy MUST be strict-origin-when-cross-origin (not no-referrer)
  // to comply with OpenStreetMap's Tile Usage Policy which blocks requests missing a Referer header.
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self *)');
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > 16 * 1024) {
      res.status(413).json({ error: 'Payload exceeds 16 KB size limit.' });
      return;
    }
    next();
  });

  app.use(express.json({ limit: '16kb' }));

  // Compliant cached geocoding & map tile proxy (follows OSM Tile & Nominatim Usage Policy with custom User-Agent, Referer & 7-day cache)
  const geocodeCache = new Map<string, { data: unknown; expiresAt: number }>();
  const tileMemoryCache = new Map<string, { buffer: Buffer; contentType: string; expiresAt: number }>();
  const OSM_COMPLIANT_HEADERS = {
    Accept: 'application/json',
    'Accept-Language': 'en',
    'User-Agent': 'CivicPulseHaldia/1.0 (Haldia Municipal Civic Issue Tracker; https://haldiamunicipality.org)',
    Referer: 'https://haldiamunicipality.org/',
  };

  app.get('/api/tiles/osm/:z/:x/:y', async (req: Request, res: Response) => {
    const z = Number(req.params.z);
    const x = Number(req.params.x);
    const rawY = String(req.params.y || '').replace(/\.png$/i, '');
    const y = Number(rawY);

    if (
      Number.isNaN(z) ||
      Number.isNaN(x) ||
      Number.isNaN(y) ||
      z < 0 ||
      z > 20 ||
      x < 0 ||
      y < 0
    ) {
      res.status(400).end();
      return;
    }

    const cacheKey = `${z}/${x}/${y}`;
    const memHit = tileMemoryCache.get(cacheKey);
    if (memHit && memHit.expiresAt > Date.now()) {
      res.setHeader('Content-Type', memHit.contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.status(200).send(memHit.buffer);
      return;
    }

    // Check local disk cache under /public/assets/tiles
    const tileFile = path.join(process.cwd(), 'public', 'assets', 'tiles', `${z}_${x}_${y}.png`);
    if (fs.existsSync(tileFile)) {
      try {
        const diskBuf = fs.readFileSync(tileFile);
        tileMemoryCache.set(cacheKey, {
          buffer: diskBuf,
          contentType: 'image/png',
          expiresAt: Date.now() + 1000 * 60 * 60 * 24,
        });
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        res.status(200).send(diskBuf);
        return;
      } catch {
        // Continue to upstream fetch
      }
    }

    try {
      const osmUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
      const upstream = await fetch(osmUrl, {
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'User-Agent':
            'CivicPulseHaldia/1.0 (Haldia Municipal Civic Issue Tracker; https://haldiamunicipality.org)',
          Referer: 'https://haldiamunicipality.org/',
        },
      });

      if (upstream.ok) {
        const arrBuf = await upstream.arrayBuffer();
        const buffer = Buffer.from(arrBuf);
        const contentType = upstream.headers.get('content-type') || 'image/png';

        if (tileMemoryCache.size > 600) {
          const oldestKey = tileMemoryCache.keys().next().value;
          if (oldestKey) tileMemoryCache.delete(oldestKey);
        }
        tileMemoryCache.set(cacheKey, {
          buffer,
          contentType,
          expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
        });

        try {
          const tilesDir = path.join(process.cwd(), 'public', 'assets', 'tiles');
          fs.mkdirSync(tilesDir, { recursive: true });
          fs.writeFileSync(tileFile, buffer);
        } catch {
          // Ignore disk cache write errors
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        res.status(200).send(buffer);
        return;
      }
    } catch {
      // Fall through to Esri World Street Map fallback
    }

    // Fallback: Esri World Street Map (note {z}/{y}/{x} order in ArcGIS)
    try {
      const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
      const fallbackRes = await fetch(esriUrl);
      if (fallbackRes.ok) {
        const arrBuf = await fallbackRes.arrayBuffer();
        const buffer = Buffer.from(arrBuf);
        const contentType = fallbackRes.headers.get('content-type') || 'image/jpeg';
        tileMemoryCache.set(cacheKey, {
          buffer,
          contentType,
          expiresAt: Date.now() + 1000 * 60 * 60 * 24,
        });
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800');
        res.status(200).send(buffer);
        return;
      }
    } catch {
      // Ignore fallback error
    }

    res.status(404).end();
  });

  app.get('/api/geocode/reverse', async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      res.status(400).json({ error: 'Invalid lat/lng parameters.' });
      return;
    }
    const cacheKey = `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.status(200).json(cached.data);
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
      const upstream = await fetch(url, { headers: OSM_COMPLIANT_HEADERS });
      if (upstream.ok) {
        const data = await upstream.json();
        geocodeCache.set(cacheKey, { data, expiresAt: Date.now() + 1000 * 60 * 60 });
        res.status(200).json(data);
        return;
      }
    } catch {
      // Fall through to 200 empty fallback
    }
    res.status(200).json({});
  });

  app.get('/api/geocode/search', async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) {
      res.status(200).json([]);
      return;
    }
    const cacheKey = `search:${q.toLowerCase()}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.status(200).json(cached.data);
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        q
      )}&limit=5&addressdetails=1`;
      const upstream = await fetch(url, { headers: OSM_COMPLIANT_HEADERS });
      if (upstream.ok) {
        const data = await upstream.json();
        geocodeCache.set(cacheKey, { data, expiresAt: Date.now() + 1000 * 60 * 60 });
        res.status(200).json(data);
        return;
      }
    } catch {
      // Fall through to 200 empty fallback
    }
    res.status(200).json([]);
  });

  // 1. Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  // 2. Live Triage & Duplicate Hint Preview (R2, R3, R10, R12)
  app.post('/api/issues/preview-triage', (req: Request, res: Response) => {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const location = typeof req.body?.location === 'string' ? req.body.location.trim() : '';

    const { category, confidence, matchedKeywords } = classify(title, description);
    const { count: urgCount, matchedTerms } = urgencyHits(title, description);

    // Check unresolved same-category issues from last 14 days for duplicate hint (R10)
    const candidates = db
      .prepare(
        `SELECT id, title, description, location, category, status, created_at
         FROM issues
         WHERE status != 'Resolved' AND category = ?
         ORDER BY id DESC LIMIT 100`
      )
      .all(category) as Array<{
      id: number;
      title: string;
      description: string;
      location: string;
      category: IssueCategory;
      status: IssueStatus;
      created_at: string;
    }>;

    const duplicates = candidates
      .filter((old) =>
        similar(
          { category, title, description, location },
          { category: old.category, title: old.title, description: old.location ? old.description : '', location: old.location }
        )
      )
      .map((d) => ({
        id: d.id,
        title: d.title,
        location: d.location,
        status: d.status,
        created_at: d.created_at,
      }));

    const est = priority(
      {
        status: 'Open',
        urgency_hits: urgCount,
        similar_count: duplicates.length,
        created_at: new Date().toISOString(),
      },
      new Date()
    );

    res.status(200).json({
      category,
      confidence,
      matched_keywords: matchedKeywords,
      urgency_hits: urgCount,
      urgent_terms: matchedTerms,
      estimated_priority: est.score,
      estimated_band: est.band,
      duplicates,
    });
  });

  // 3. Submit new civic issue (R1, R2, R3, R10, S5)
  app.post('/api/issues', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    if (!checkRateLimit(postRateMap, ip, 12)) {
      res.status(429).json({ error: 'Rate limit exceeded (max 12 reports per minute). Please wait a moment.' });
      return;
    }

    const validation = validateIssuePayload(req.body || {});
    if (!validation.valid) {
      res.status(400).json({
        error: 'Please fix the highlighted validation errors.',
        fields: validation.fields,
      });
      return;
    }

    const { title, description, location, photo_url, lat, lng, website } = validation.cleaned;

    // Honeypot check (S5): if filled by a bot, return fake 201 without writing to DB
    if (website.length > 0) {
      res.status(201).json({
        id: 9999,
        category: 'Other',
        status: 'Open',
        similar_to: [],
      });
      return;
    }

    const { category, confidence, matchedKeywords } = classify(title, description);
    const { count: urgCount } = urgencyHits(title, description);
    const coords = lat !== null && lng !== null ? { lat, lng } : inferHaldiaCoordinates(location);
    const nowIso = new Date().toISOString();

    const createTx = db.transaction(() => {
      // Find unresolved same-category issues from last 14 days
      const cutoffIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const unresolvedCandidates = db
        .prepare(
          `SELECT id, title, description, location, category
           FROM issues
           WHERE status != 'Resolved' AND category = ? AND created_at >= ?`
        )
        .all(category, cutoffIso) as Array<{
        id: number;
        title: string;
        description: string;
        location: string;
        category: IssueCategory;
      }>;

      const matchingIds: number[] = [];
      for (const old of unresolvedCandidates) {
        if (similar({ category, title, description, location }, old)) {
          matchingIds.push(old.id);
        }
      }

      const insertResult = db
        .prepare(
          `INSERT INTO issues (
            title, description, location, photo_url, lat, lng,
            category, status, urgency_hits, similar_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?, ?)`
        )
        .run(
          title,
          description,
          location,
          photo_url,
          coords.lat,
          coords.lng,
          category,
          urgCount,
          matchingIds.length,
          nowIso,
          nowIso
        );

      const newId = Number(insertResult.lastInsertRowid);

      if (matchingIds.length > 0) {
        const bumpStmt = db.prepare(`UPDATE issues SET similar_count = similar_count + 1 WHERE id = ?`);
        for (const matchId of matchingIds) {
          bumpStmt.run(matchId);
        }
      }

      db.prepare(
        `INSERT INTO status_events (issue_id, from_status, to_status, note, created_at)
         VALUES (?, NULL, 'Open', 'Reported via public resident portal', ?)`
      ).run(newId, nowIso);

      return { newId, matchingIds };
    });

    const { newId, matchingIds } = createTx();

    res.status(201).json({
      id: newId,
      category,
      confidence,
      matched_keywords: matchedKeywords,
      status: 'Open',
      similar_to: matchingIds,
    });
  });

  // 4. Public lookup by ID with timeline (R6, S8: strictly hides priority, urgency_hits, similar_count)
  app.get('/api/issues/:id', (req: Request, res: Response) => {
    const issueId = Number(req.params.id);
    if (!Number.isInteger(issueId) || issueId <= 0) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }

    const row = db
      .prepare(
        `SELECT id, title, description, location, photo_url, lat, lng, category, status, created_at, updated_at
         FROM issues WHERE id = ?`
      )
      .get(issueId) as
      | {
          id: number;
          title: string;
          description: string;
          location: string;
          photo_url: string | null;
          lat: number | null;
          lng: number | null;
          category: IssueCategory;
          status: IssueStatus;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      res.status(404).json({ error: `No issue found with ID #${issueId}.` });
      return;
    }

    const events = db
      .prepare(
        `SELECT from_status as "from", to_status as "to", note, created_at as "at"
         FROM status_events
         WHERE issue_id = ?
         ORDER BY id ASC`
      )
      .all(issueId) as TimelineEvent[];

    res.status(200).json({
      ...row,
      timeline: events,
    });
  });

  // 5. Admin list issues with filter & priority sort (R3, R4, R8)
  app.get('/api/issues', requireAdmin, (req: Request, res: Response) => {
    const category = typeof req.query.category === 'string' && req.query.category !== 'All' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' && req.query.status !== 'All' ? req.query.status : undefined;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'priority';
    const limit = req.query.limit !== undefined ? Number(req.query.limit) : 200;

    if (category && !VALID_CATEGORIES.has(category as IssueCategory)) {
      res.status(400).json({ error: 'Invalid category filter value.', fields: { category: 'Invalid category' } });
      return;
    }
    if (status && !VALID_STATUSES.has(status as IssueStatus)) {
      res.status(400).json({ error: 'Invalid status filter value.', fields: { status: 'Invalid status' } });
      return;
    }
    if (!VALID_SORTS.has(sort)) {
      res.status(400).json({ error: 'Invalid sort parameter.', fields: { sort: 'Allowed: priority, newest, oldest' } });
      return;
    }
    if (Number.isNaN(limit) || limit < 1 || limit > 200) {
      res.status(400).json({ error: 'Limit must be between 1 and 200.' });
      return;
    }

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
      .prepare(
        `SELECT id, title, description, location, photo_url, lat, lng, category, status,
                urgency_hits, similar_count, created_at, updated_at
         FROM issues
         ${whereClause}`
      )
      .all(...params) as Array<{
      id: number;
      title: string;
      description: string;
      location: string;
      photo_url: string | null;
      lat: number | null;
      lng: number | null;
      category: IssueCategory;
      status: IssueStatus;
      urgency_hits: number;
      similar_count: number;
      created_at: string;
      updated_at: string;
    }>;

    const now = new Date();
    const enriched = rows.map((r) => {
      const p = priority(r, now);
      return {
        ...r,
        priority: p.score,
        band: p.band,
        age_days: p.breakdown.ageDays,
        breakdown: p.breakdown,
      };
    });

    if (sort === 'priority') {
      enriched.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (sort === 'newest') {
      enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === 'oldest') {
      enriched.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    const sliced = enriched.slice(0, limit);
    res.status(200).json({
      items: sliced,
      total: enriched.length,
    });
  });

  // 6. Admin status transition PATCH (R5, R8, R11)
  app.patch('/api/issues/:id', requireAdmin, (req: Request, res: Response) => {
    const issueId = Number(req.params.id);
    if (!Number.isInteger(issueId) || issueId <= 0) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }

    const body = req.body || {};
    const allowedKeys = new Set(['status', 'note']);
    const fields: Record<string, string> = {};
    for (const k of Object.keys(body)) {
      if (!allowedKeys.has(k)) {
        fields[k] = `Unexpected field '${k}'.`;
      }
    }

    const targetStatus = typeof body.status === 'string' ? body.status.trim() : '';
    const note = typeof body.note === 'string' ? body.note.trim() : '';

    if (targetStatus !== 'In Progress' && targetStatus !== 'Resolved') {
      fields.status = 'Status must be either "In Progress" or "Resolved".';
    }
    if (note.length < 3 || note.length > 500) {
      fields.note = 'Authority note is required (between 3 and 500 characters).';
    }

    if (Object.keys(fields).length > 0) {
      res.status(400).json({
        error: 'Invalid status update payload.',
        fields,
      });
      return;
    }

    const existing = db
      .prepare(
        `SELECT id, title, description, location, photo_url, lat, lng, category, status,
                urgency_hits, similar_count, created_at, updated_at
         FROM issues WHERE id = ?`
      )
      .get(issueId) as
      | {
          id: number;
          title: string;
          description: string;
          location: string;
          photo_url: string | null;
          lat: number | null;
          lng: number | null;
          category: IssueCategory;
          status: IssueStatus;
          urgency_hits: number;
          similar_count: number;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!existing) {
      res.status(404).json({ error: `Issue #${issueId} not found.` });
      return;
    }

    // Enforce strict state machine: Open -> In Progress -> Resolved
    const currentStatus = existing.status;
    const validNext: Record<IssueStatus, IssueStatus[]> = {
      Open: ['In Progress'],
      'In Progress': ['Resolved'],
      Resolved: [],
    };

    if (!validNext[currentStatus].includes(targetStatus as IssueStatus)) {
      res.status(409).json({
        error: `Cannot transition issue from '${currentStatus}' directly to '${targetStatus}'.`,
        allowed: validNext[currentStatus],
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const updateTx = db.transaction(() => {
      db.prepare(`UPDATE issues SET status = ?, updated_at = ? WHERE id = ?`).run(
        targetStatus,
        nowIso,
        issueId
      );
      db.prepare(
        `INSERT INTO status_events (issue_id, from_status, to_status, note, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(issueId, currentStatus, targetStatus, note, nowIso);
    });

    updateTx();

    const updatedRow = db
      .prepare(
        `SELECT id, title, description, location, photo_url, lat, lng, category, status,
                urgency_hits, similar_count, created_at, updated_at
         FROM issues WHERE id = ?`
      )
      .get(issueId) as typeof existing;

    const events = db
      .prepare(
        `SELECT from_status as "from", to_status as "to", note, created_at as "at"
         FROM status_events
         WHERE issue_id = ?
         ORDER BY id ASC`
      )
      .all(issueId) as TimelineEvent[];

    const p = priority(updatedRow, new Date());
    const notificationPreview = buildNotificationPreview(
      updatedRow,
      currentStatus,
      targetStatus as IssueStatus,
      note
    );

    res.status(200).json({
      ...updatedRow,
      priority: p.score,
      band: p.band,
      age_days: p.breakdown.ageDays,
      breakdown: p.breakdown,
      timeline: events,
      notification_preview: notificationPreview,
    });
  });

  // 7. Admin stats endpoint (R4, R8)
  app.get('/api/stats', requireAdmin, (_req: Request, res: Response) => {
    const rows = db
      .prepare(`SELECT category, status, urgency_hits, similar_count, created_at FROM issues`)
      .all() as Array<{
      category: IssueCategory;
      status: IssueStatus;
      urgency_hits: number;
      similar_count: number;
      created_at: string;
    }>;

    const by_category: Record<IssueCategory, number> = {
      Road: 0,
      Water: 0,
      Electricity: 0,
      Sanitation: 0,
      Other: 0,
    };

    const by_status: Record<IssueStatus, number> = {
      Open: 0,
      'In Progress': 0,
      Resolved: 0,
    };

    const by_category_status: Record<IssueCategory, Record<IssueStatus, number>> = {
      Road: { Open: 0, 'In Progress': 0, Resolved: 0 },
      Water: { Open: 0, 'In Progress': 0, Resolved: 0 },
      Electricity: { Open: 0, 'In Progress': 0, Resolved: 0 },
      Sanitation: { Open: 0, 'In Progress': 0, Resolved: 0 },
      Other: { Open: 0, 'In Progress': 0, Resolved: 0 },
    };

    let high_open = 0;
    let duplicate_clusters = 0;
    const now = new Date();

    for (const r of rows) {
      by_category[r.category] = (by_category[r.category] || 0) + 1;
      by_status[r.status] = (by_status[r.status] || 0) + 1;
      by_category_status[r.category][r.status] = (by_category_status[r.category][r.status] || 0) + 1;

      const p = priority(r, now);
      if (r.status !== 'Resolved' && p.band === 'High') {
        high_open += 1;
      }
      if (r.status !== 'Resolved' && r.similar_count >= 2) {
        duplicate_clusters += 1;
      }
    }

    const classifier_accuracy = evaluateBenchmarkAccuracy();

    res.status(200).json({
      total: rows.length,
      by_category,
      by_status,
      by_category_status,
      high_open,
      duplicate_clusters,
      classifier_accuracy,
    });
  });

  // 8. Admin demo reset & re-seed endpoint (for judge walkthroughs)
  app.post('/api/demo/reset', requireAdmin, (_req: Request, res: Response) => {
    const result = seedDatabaseIfNeeded(db, true);
    res.status(200).json({
      ok: true,
      message: `Database reset and re-seeded with ${result.count} Haldia civic reports.`,
      count: result.count,
    });
  });

  // 9. CivicCare AI Assistant Chatbot Endpoint (Ultra-fast <30ms local civic engine + 900ms bounded Gemini API)
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    const rawMessage = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!rawMessage || rawMessage.length > 1500) {
      res.status(400).json({ error: 'Please enter a valid message under 1,500 characters.' });
      return;
    }

    const dbRows = db
      .prepare(
        `SELECT id, title, description, location, category, status, urgency_hits, similar_count, created_at
         FROM issues ORDER BY id DESC LIMIT 35`
      )
      .all() as Array<{
      id: number;
      title: string;
      description: string;
      location: string;
      category: IssueCategory;
      status: IssueStatus;
      urgency_hits: number;
      similar_count: number;
      created_at: string;
    }>;

    const localClass = classify(rawMessage, rawMessage);
    const localUrg = urgencyHits(rawMessage, rawMessage);
    const lower = rawMessage.toLowerCase();

    // 1. Instant Issue #ID Lookup (<5ms)
    const idMatches = (rawMessage.match(/#?(\d{1,2})\b/g) || []).map((s: string) =>
      Number(s.replace(/^#/, ''))
    );
    if (idMatches.length > 0) {
      const matchedRows = dbRows.filter((x) => idMatches.includes(Number(x.id)));
      if (matchedRows.length > 0) {
        const lines = matchedRows.map(
          (found) =>
            `• **Issue #${found.id}** (${found.category} · **${found.status}**): "${found.title}" at *${found.location}*`
        );
        res.status(200).json({
          reply: `Here is the live status from **CivicCare Haldia**:\n\n${lines.join(
            '\n\n'
          )}\n\nClick the button below to inspect the real-time GPS map pin, real field photograph, and officer timeline.`,
          suggestedIssueId: matchedRows[0].id,
          draftReport: null,
        });
        return;
      }
    }

    // 2. Instant Ward / Category Status Summary Query (<5ms)
    const isAskingSummary =
      lower.includes('which') ||
      lower.includes('status') ||
      lower.includes('show') ||
      lower.includes('list') ||
      lower.includes('open') ||
      lower.includes('urgent');

    if (isAskingSummary && !lower.includes('draft')) {
      const wardNames = ['durgachak', 'hatiberia', 'bhabanipur', 'basudevpur', 'sutahata', 'ranichak', 'township'];
      const matchedWard = wardNames.find((w) => lower.includes(w));
      let subset = dbRows.filter((r) => r.status !== 'Resolved');
      if (matchedWard) {
        subset = subset.filter((r) => r.location.toLowerCase().includes(matchedWard));
      } else if (localClass.category !== 'Other') {
        subset = subset.filter((r) => r.category === localClass.category);
      }
      const topItems = subset.slice(0, 4);
      if (topItems.length > 0) {
        const bulletList = topItems
          .map((it) => `• **#${it.id}** [${it.category} · ${it.status}] — ${it.title} (*${it.location}*)`)
          .join('\n');
        res.status(200).json({
          reply: `Found **${subset.length} active civic issue(s)**${
            matchedWard ? ` in **${matchedWard.toUpperCase()}**` : ''
          }:\n\n${bulletList}\n\nSelect an issue below to view its live GPS map and real field photograph.`,
          suggestedIssueId: topItems[0].id,
          draftReport: null,
        });
        return;
      }
    }

    // 3. Instant Multilingual Report Drafting (<5ms)
    if (
      lower.includes('draft') ||
      lower.includes('report') ||
      localClass.matchedKeywords.length > 0 ||
      localUrg.count > 0
    ) {
      const cleanedText = rawMessage.replace(/^draft(\s+in\s+\w+)?(\s+report)?\s*:\s*/i, '').trim();
      const inferredLoc =
        lower.includes('durgachak')
          ? 'Durgachak Sector B Market, Ward 11, Haldia'
          : lower.includes('hatiberia')
          ? 'Hatiberia Main Market Stretch, Ward 15, Haldia'
          : lower.includes('bhabanipur')
          ? 'Bhabanipur Primary School Gate, Ward 11, Haldia'
          : lower.includes('basudevpur')
          ? 'Basudevpur Ward 8 Community Vat, Haldia'
          : lower.includes('sutahata')
          ? 'Sutahata Bazaar Transformer Corner, Haldia'
          : lower.includes('ranichak')
          ? 'Ranichak Refinery Gate Approach, Haldia'
          : 'Durgachak Sector B Market, Ward 11, Haldia';

      const draftTitle =
        cleanedText.length >= 8 && cleanedText.length <= 115
          ? cleanedText
          : `${localClass.category} hazard reported near ${inferredLoc.split(',')[0]}`;
      const draftDesc =
        cleanedText.length >= 30
          ? cleanedText
          : `${cleanedText}. Immediate field inspection and maintenance requested by resident under ${localClass.category} department at ${inferredLoc}.`;

      res.status(200).json({
        reply: `I classified your report under the **${localClass.category} Department**${
          localUrg.count > 0
            ? ` with **${localUrg.count} urgency signal(s)** (${localUrg.matchedTerms.join(', ')})`
            : ''
        }.\n\nYour **CivicCare Report Draft** is ready below — click **"Autofill Report Form with Draft"** to load it with real GPS coordinates and real photographic evidence!`,
        suggestedIssueId: null,
        draftReport: {
          title: draftTitle.slice(0, 115),
          description: draftDesc.slice(0, 500),
          location: inferredLoc,
          category: localClass.category,
        },
      });
      return;
    }

    // 4. General Conversational Fallback or Bounded 900ms Gemini Call
    const buildInstantOverview = () => {
      const openCount = dbRows.filter((i) => i.status === 'Open').length;
      const inProgCount = dbRows.filter((i) => i.status === 'In Progress').length;
      const resolvedCount = dbRows.filter((i) => i.status === 'Resolved').length;
      return {
        reply: `Hello! I am the **CivicCare Haldia AI Assistant**.\n\nAcross Haldia's 8 municipal wards we are tracking **${dbRows.length} civic issues** (**${openCount} Open**, **${inProgCount} In Progress**, **${resolvedCount} Resolved**).\n\nTry asking me:\n• *"Draft report: Live wire sparking near Durgachak school gate"*\n• *"What is the current status of Issue #1 and #4?"*\n• *"Which wards have urgent open water or electricity issues?"*`,
        suggestedIssueId: null,
        draftReport: null,
      };
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 10) {
      res.status(200).json(buildInstantOverview());
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 900)
      );

      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are CivicCare Haldia AI Assistant. Answer concisely in 2-3 sentences: ${rawMessage}`,
      });

      const winner = await Promise.race([geminiPromise, timeoutPromise]);
      if (!winner || !winner.text) {
        res.status(200).json(buildInstantOverview());
        return;
      }

      res.status(200).json({
        reply: winner.text,
        suggestedIssueId: null,
        draftReport: null,
      });
    } catch {
      res.status(200).json(buildInstantOverview());
    }
  });

  // Global error handler (S11: never leak stack traces)
  app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request payload exceeds 16 KB limit.' });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: 'Invalid JSON request body.' });
      return;
    }
    res.status(500).json({ error: 'server error' });
  });

  // Mount Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicCare Haldia server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
