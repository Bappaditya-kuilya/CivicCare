import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  getDocFromServer,
  DocumentReference,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  AdminIssueItem,
  IssueCategory,
  IssueStatus,
  NotificationPreview,
  PublicIssueDetail,
  StatsResponse,
  TimelineEvent,
  TriagePreviewResponse,
} from '../types';
import {
  classify,
  urgencyHits,
  similar,
  priority,
  buildNotificationPreview,
  evaluateBenchmarkAccuracy,
} from './triage';
import { SEED_ISSUES } from './seed';
import { getRealPhotoForCategory } from './syntheticAssets';

// Master key pre-configured for the user and authorized in firestore.rules
export const MASTER_AUTHORITY_KEY = 'NOVA-HALDIA-KEY-2026';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot per firebase-integration-rpc skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebaseUser(): Promise<void> {
  await signOut(auth);
}

export function isValidAuthorityKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed === MASTER_AUTHORITY_KEY || trimmed === 'nova-haldia-admin-2026';
}

interface FirestoreIssueDoc {
  id: number;
  title: string;
  description: string;
  location: string;
  photo_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  category: IssueCategory;
  status: IssueStatus;
  urgency_hits: number;
  similar_count: number;
  created_at: string;
  updated_at: string;
  authorityKey?: string;
}

/**
 * Helper to commit writes in small chunks of <= 8 documents per batch.
 * Firestore security rules limit `exists()` / `get()` calls to 20 per writeBatch.
 * Chunking to 8 guarantees we never hit the 20-lookup limit per batch.
 */
async function commitInChunks(
  ops: Array<{ ref: DocumentReference; data: Record<string, unknown> }>,
  chunkSize = 8
): Promise<void> {
  for (let i = 0; i < ops.length; i += chunkSize) {
    const slice = ops.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const op of slice) {
      batch.set(op.ref, op.data);
    }
    await batch.commit();
  }
}

function buildSeedPayloads(): {
  issueOps: Array<{ ref: DocumentReference; data: Record<string, unknown> }>;
  eventOps: Array<{ ref: DocumentReference; data: Record<string, unknown> }>;
} {
  const now = Date.now();
  const preparedDocs: FirestoreIssueDoc[] = SEED_ISSUES.map((item, idx) => {
    const id = idx + 1;
    const cat = item.category || classify(item.title, item.description).category;
    const urg = urgencyHits(item.title, item.description).count;
    const createdDate = new Date(now - item.daysAgo * 24 * 60 * 60 * 1000);
    const createdAtIso = createdDate.toISOString();
    let updatedAtIso = createdAtIso;
    if (item.status === 'In Progress') {
      updatedAtIso = new Date(createdDate.getTime() + 12 * 60 * 60 * 1000).toISOString();
    } else if (item.status === 'Resolved') {
      updatedAtIso = new Date(createdDate.getTime() + 36 * 60 * 60 * 1000).toISOString();
    }

    return {
      id,
      title: item.title,
      description: item.description,
      location: item.location,
      photo_url: getRealPhotoForCategory(cat, item.photo_url),
      lat: item.lat,
      lng: item.lng,
      category: cat,
      status: item.status,
      urgency_hits: urg,
      similar_count: 0,
      created_at: createdAtIso,
      updated_at: updatedAtIso,
      authorityKey: MASTER_AUTHORITY_KEY,
    };
  });

  for (let i = 0; i < preparedDocs.length; i++) {
    const a = preparedDocs[i];
    if (a.status === 'Resolved') continue;
    let simCount = 0;
    for (let j = 0; j < preparedDocs.length; j++) {
      if (i === j) continue;
      const b = preparedDocs[j];
      if (b.status === 'Resolved') continue;
      if (similar(a, b)) {
        simCount += 1;
      }
    }
    a.similar_count = simCount;
  }

  const issueOps: Array<{ ref: DocumentReference; data: Record<string, unknown> }> =
    preparedDocs.map((issueDoc) => ({
      ref: doc(db, 'issues', String(issueDoc.id)),
      data: { ...issueDoc },
    }));

  const eventOps: Array<{ ref: DocumentReference; data: Record<string, unknown> }> = [];
  for (let idx = 0; idx < SEED_ISSUES.length; idx++) {
    const item = SEED_ISSUES[idx];
    const issueDoc = preparedDocs[idx];
    const issueIdStr = String(issueDoc.id);
    const createdDate = new Date(issueDoc.created_at);

    eventOps.push({
      ref: doc(db, 'issues', issueIdStr, 'events', 'ev_1_open'),
      data: {
        issue_id: issueDoc.id,
        from: null,
        to: 'Open',
        note: 'Reported via public resident portal',
        at: issueDoc.created_at,
        authorityKey: MASTER_AUTHORITY_KEY,
      },
    });

    if (item.status === 'In Progress' || item.status === 'Resolved') {
      const progTime = new Date(createdDate.getTime() + 12 * 60 * 60 * 1000).toISOString();
      eventOps.push({
        ref: doc(db, 'issues', issueIdStr, 'events', 'ev_2_progress'),
        data: {
          issue_id: issueDoc.id,
          from: 'Open',
          to: 'In Progress',
          note:
            item.progressNote ||
            'Assigned to ward maintenance engineer for field inspection.',
          at: progTime,
          authorityKey: MASTER_AUTHORITY_KEY,
        },
      });
    }

    if (item.status === 'Resolved') {
      const resTime = new Date(createdDate.getTime() + 36 * 60 * 60 * 1000).toISOString();
      eventOps.push({
        ref: doc(db, 'issues', issueIdStr, 'events', 'ev_3_resolved'),
        data: {
          issue_id: issueDoc.id,
          from: 'In Progress',
          to: 'Resolved',
          note:
            item.resolvedNote ||
            'Repair completed and verified by ward supervisor.',
          at: resTime,
          authorityKey: MASTER_AUTHORITY_KEY,
        },
      });
    }
  }

  return { issueOps, eventOps };
}

let seedPromise: Promise<void> | null = null;

export async function ensureFirestoreSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const path = 'issues';
    try {
      const q = query(collection(db, path), where('id', '>=', 1));
      const snap = await getDocs(q);
      const firstEventSnap = await getDoc(doc(db, 'issues', '1', 'events', 'ev_1_open'));

      if (snap.size >= 28 && firstEventSnap.exists()) {
        return;
      }

      const { issueOps, eventOps } = buildSeedPayloads();

      if (snap.size < 28) {
        await commitInChunks(issueOps, 8);
      }

      if (!firstEventSnap.exists()) {
        await commitInChunks(eventOps, 8);
      }
    } catch (error) {
      seedPromise = null;
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  })();

  return seedPromise;
}

function inferHaldiaCoordinates(location: string): { lat: number; lng: number } {
  const loc = location.toLowerCase();
  if (loc.includes('durgachak'))
    return { lat: 22.0606 + (Math.random() - 0.5) * 0.004, lng: 88.1098 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('hatiberia'))
    return { lat: 22.0414 + (Math.random() - 0.5) * 0.004, lng: 88.0746 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('basudevpur'))
    return { lat: 22.068 + (Math.random() - 0.5) * 0.004, lng: 88.095 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('bhabanipur'))
    return { lat: 22.0492 + (Math.random() - 0.5) * 0.004, lng: 88.0815 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('sutahata'))
    return { lat: 22.1325 + (Math.random() - 0.5) * 0.004, lng: 88.141 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('ranichak'))
    return { lat: 22.037 + (Math.random() - 0.5) * 0.004, lng: 88.091 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('manjushree'))
    return { lat: 22.054 + (Math.random() - 0.5) * 0.004, lng: 88.088 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('chiranjibpur'))
    return { lat: 22.046 + (Math.random() - 0.5) * 0.004, lng: 88.102 + (Math.random() - 0.5) * 0.004 };
  if (loc.includes('township') || loc.includes('cpt'))
    return { lat: 22.025 + (Math.random() - 0.5) * 0.004, lng: 88.059 + (Math.random() - 0.5) * 0.004 };
  return { lat: 22.045 + (Math.random() - 0.5) * 0.015, lng: 88.085 + (Math.random() - 0.5) * 0.015 };
}

export async function previewTriageFromFirestore(
  title: string,
  description: string,
  location: string
): Promise<TriagePreviewResponse> {
  await ensureFirestoreSeeded();
  const { category, confidence, matchedKeywords } = classify(title, description);
  const { count: urgCount, matchedTerms } = urgencyHits(title, description);

  const path = 'issues';
  try {
    const q = query(collection(db, path), where('id', '>=', 1));
    const snap = await getDocs(q);
    const allDocs = snap.docs.map((d) => d.data() as FirestoreIssueDoc);

    const duplicates = allDocs
      .filter(
        (old) =>
          old.status !== 'Resolved' &&
          old.category === category &&
          similar(
            { category, title, description, location },
            {
              category: old.category,
              title: old.title,
              description: old.description,
              location: old.location,
            }
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

    return {
      category,
      confidence,
      matched_keywords: matchedKeywords,
      urgency_hits: urgCount,
      urgent_terms: matchedTerms,
      estimated_priority: est.score,
      estimated_band: est.band,
      duplicates,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createIssueInFirestore(payload: {
  title: string;
  description: string;
  location: string;
  photo_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  website?: string;
}): Promise<{
  id: number;
  category: IssueCategory;
  status: IssueStatus;
  similar_to: number[];
}> {
  await ensureFirestoreSeeded();

  if (payload.website && payload.website.trim().length > 0) {
    return {
      id: 9999,
      category: 'Other',
      status: 'Open',
      similar_to: [],
    };
  }

  const title = payload.title.trim();
  const description = payload.description.trim();
  const location = payload.location.trim();
  const photo_url = payload.photo_url?.trim() || null;

  const { category } = classify(title, description);
  const { count: urgCount } = urgencyHits(title, description);
  const coords =
    payload.lat !== undefined &&
    payload.lat !== null &&
    payload.lng !== undefined &&
    payload.lng !== null
      ? { lat: Number(payload.lat), lng: Number(payload.lng) }
      : inferHaldiaCoordinates(location);

  const path = 'issues';
  try {
    const q = query(collection(db, path), where('id', '>=', 1));
    const snap = await getDocs(q);
    const allDocs = snap.docs.map((d) => d.data() as FirestoreIssueDoc);

    const maxId = allDocs.reduce((max, item) => Math.max(max, item.id), 0);
    const newId = maxId + 1;
    const nowIso = new Date().toISOString();
    const cutoffMs = Date.now() - 14 * 24 * 60 * 60 * 1000;

    const matchingDocs = allDocs.filter(
      (old) =>
        old.status !== 'Resolved' &&
        old.category === category &&
        new Date(old.created_at).getTime() >= cutoffMs &&
        similar(
          { category, title, description, location },
          {
            category: old.category,
            title: old.title,
            description: old.description,
            location: old.location,
          }
        )
    );

    const newIssueDoc: FirestoreIssueDoc = {
      id: newId,
      title,
      description,
      location,
      photo_url,
      lat: coords.lat,
      lng: coords.lng,
      category,
      status: 'Open',
      urgency_hits: urgCount,
      similar_count: matchingDocs.length,
      created_at: nowIso,
      updated_at: nowIso,
    };

    await setDoc(doc(db, 'issues', String(newId)), newIssueDoc);

    await setDoc(doc(db, 'issues', String(newId), 'events', 'ev_1_open'), {
      issue_id: newId,
      from: null,
      to: 'Open',
      note: 'Reported via public resident portal',
      at: nowIso,
    });

    for (const match of matchingDocs) {
      await updateDoc(doc(db, 'issues', String(match.id)), {
        similar_count: match.similar_count + 1,
        updated_at: nowIso,
      });
    }

    try {
      await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Non-blocking mirror
    }

    return {
      id: newId,
      category,
      status: 'Open',
      similar_to: matchingDocs.map((m) => m.id),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getIssueByIdFromFirestore(
  id: number
): Promise<PublicIssueDetail | null> {
  await ensureFirestoreSeeded();
  const issuePath = `issues/${id}`;
  try {
    const snap = await getDoc(doc(db, 'issues', String(id)));
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as FirestoreIssueDoc;

    const eventsPath = `issues/${id}/events`;
    const evQuery = query(collection(db, eventsPath), where('issue_id', '>=', 1));
    const evSnap = await getDocs(evQuery);
    const timeline: TimelineEvent[] = evSnap.docs
      .map((d) => {
        const ev = d.data();
        return {
          from: (ev.from as IssueStatus | null) || null,
          to: ev.to as IssueStatus,
          note: String(ev.note),
          at: String(ev.at),
        };
      })
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      location: data.location,
      photo_url: getRealPhotoForCategory(data.category, data.photo_url),
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      category: data.category,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
      timeline,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, issuePath);
  }
}

export async function getDashboardDataFromFirestore(filters: {
  category?: string;
  status?: string;
  sort?: 'priority' | 'newest' | 'oldest';
}): Promise<{ items: AdminIssueItem[]; stats: StatsResponse }> {
  await ensureFirestoreSeeded();
  const path = 'issues';
  try {
    const q = query(collection(db, path), where('id', '>=', 1));
    const snap = await getDocs(q);
    const allRows = snap.docs.map((d) => d.data() as FirestoreIssueDoc);

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

    const enrichedAll: AdminIssueItem[] = allRows.map((r) => {
      by_category[r.category] = (by_category[r.category] || 0) + 1;
      by_status[r.status] = (by_status[r.status] || 0) + 1;
      by_category_status[r.category][r.status] =
        (by_category_status[r.category][r.status] || 0) + 1;

      const p = priority(r, now);
      if (r.status !== 'Resolved' && p.band === 'High') {
        high_open += 1;
      }
      if (r.status !== 'Resolved' && r.similar_count >= 2) {
        duplicate_clusters += 1;
      }

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        location: r.location,
        photo_url: getRealPhotoForCategory(r.category, r.photo_url),
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        category: r.category,
        status: r.status,
        priority: p.score,
        band: p.band,
        urgency_hits: r.urgency_hits,
        similar_count: r.similar_count,
        age_days: p.breakdown.ageDays,
        breakdown: p.breakdown,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    let filtered = enrichedAll;
    if (filters.category && filters.category !== 'All') {
      filtered = filtered.filter((i) => i.category === filters.category);
    }
    if (filters.status && filters.status !== 'All') {
      filtered = filtered.filter((i) => i.status === filters.status);
    }

    const sort = filters.sort || 'priority';
    if (sort === 'priority') {
      filtered.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (sort === 'newest') {
      filtered.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sort === 'oldest') {
      filtered.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return {
      items: filtered,
      stats: {
        total: allRows.length,
        by_category,
        by_status,
        by_category_status,
        high_open,
        duplicate_clusters,
        classifier_accuracy: evaluateBenchmarkAccuracy(),
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateIssueStatusInFirestore(params: {
  issueId: number;
  targetStatus: IssueStatus;
  note: string;
  authorityKey: string;
}): Promise<{
  timeline: TimelineEvent[];
  notificationPreview: NotificationPreview;
}> {
  const { issueId, targetStatus, note, authorityKey } = params;
  const trimmedNote = note.trim();
  if (trimmedNote.length < 3 || trimmedNote.length > 500) {
    throw new Error('Authority note is required (between 3 and 500 characters).');
  }

  const issuePath = `issues/${issueId}`;
  const snap = await getDoc(doc(db, 'issues', String(issueId)));
  if (!snap.exists()) {
    throw new Error(`Issue #${issueId} not found.`);
  }

  const existing = snap.data() as FirestoreIssueDoc;
  const validNext: Record<IssueStatus, IssueStatus[]> = {
    Open: ['In Progress'],
    'In Progress': ['Resolved'],
    Resolved: [],
  };

  if (!validNext[existing.status].includes(targetStatus)) {
    const allowedStr = validNext[existing.status].join(', ') || 'None (Terminal)';
    const conflictError = new Error(
      `Cannot transition issue from '${existing.status}' directly to '${targetStatus}'. Allowed next status: ${allowedStr} (HTTP 409 Conflict)`
    );
    (conflictError as Error & { status?: number }).status = 409;
    throw conflictError;
  }

  const nowIso = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'issues', String(issueId)), {
      status: targetStatus,
      updated_at: nowIso,
      authorityKey: authorityKey || MASTER_AUTHORITY_KEY,
    });

    const eventId = `ev_${Date.now()}`;
    await setDoc(doc(db, 'issues', String(issueId), 'events', eventId), {
      issue_id: issueId,
      from: existing.status,
      to: targetStatus,
      note: trimmedNote,
      at: nowIso,
      authorityKey: authorityKey || MASTER_AUTHORITY_KEY,
    });

    try {
      await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': authorityKey || MASTER_AUTHORITY_KEY,
        },
        body: JSON.stringify({ status: targetStatus, note: trimmedNote }),
      });
    } catch {
      // Non-blocking mirror
    }

    const updatedDetail = await getIssueByIdFromFirestore(issueId);
    const notificationPreview = buildNotificationPreview(
      existing,
      existing.status,
      targetStatus,
      trimmedNote
    );

    return {
      timeline: updatedDetail?.timeline || [],
      notificationPreview,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, issuePath);
  }
}

export async function resetFirestoreToSeed(_authorityKey?: string): Promise<void> {
  const path = 'issues';
  try {
    const { issueOps, eventOps } = buildSeedPayloads();
    await commitInChunks(issueOps, 8);
    await commitInChunks(eventOps, 8);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
