# Security Specification — CivicPulse Haldia (Firestore Rules)

## 1. Data Invariants
1. **Path ID Hardening**: Every document ID (`issueId`, `eventId`, `adminUid`) must be a valid alphanumeric/hyphen/underscore string of length `<= 128` matching `^[a-zA-Z0-9_\-]+$`.
2. **Strict Schema & Volumetric Bounds**:
   - `Issue`: `title` (`5..120` chars), `description` (`10..2000` chars), `location` (`3..200` chars), `category` in `['Road', 'Water', 'Electricity', 'Sanitation', 'Other']`, `status` in `['Open', 'In Progress', 'Resolved']`, optional `photo_url` (`<= 500` chars matching `^https?://\S+$`).
   - `StatusEvent`: Must belong to an existing `/issues/{issueId}` parent document (`exists(/databases/$(database)/documents/issues/$(issueId))`), with `note` (`3..500` chars) and `to` in `['Open', 'In Progress', 'Resolved']`.
3. **State Machine & Terminal Locking**:
   - New resident issues must start with `status == 'Open'`.
   - Status updates on `/issues/{issueId}` must only transition `Open -> In Progress` or `In Progress -> Resolved` (unless overridden by a verified admin seeding/resetting), and must never modify immutable fields (`id`, `created_at`).
   - Once an issue reaches `Resolved`, standard transitions are locked (`existing().status != 'Resolved'`).
4. **Authority Access Control**:
   - Status updates require either a verified Firebase Auth admin (`bappadityakuilya@gmail.com` with `email_verified == true` or a document in `/admins/$(request.auth.uid)`) OR a valid master `authorityKey` (`NOVA-HALDIA-KEY-2026`).
5. **PII Isolation**:
   - `/issues` and `/issues/{issueId}/events` store zero PII by design.
   - `/admins/{adminUid}` stores authority email and is strictly restricted to `isOwner(adminUid) || isAdmin()`.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on Issue Create**: `{ id: 1, title: "Valid title", description: "Valid description text", location: "Haldia", category: "Road", status: "Open", urgency_hits: 0, similar_count: 0, created_at: "2026-10-30T00:00:00Z", updated_at: "2026-10-30T00:00:00Z", isSuperAdmin: true }` -> `PERMISSION_DENIED`
2. **Title Too Short (< 5 chars)**: `{ id: 2, title: "Bad", description: "Valid description text", location: "Haldia", category: "Road", status: "Open", urgency_hits: 0, similar_count: 0, created_at: "2026-10-30T00:00:00Z", updated_at: "2026-10-30T00:00:00Z" }` -> `PERMISSION_DENIED`
3. **Description Overflow (> 2000 chars)**: `{ id: 3, title: "Valid title", description: "A".repeat(2005), location: "Haldia", category: "Road", status: "Open", urgency_hits: 0, similar_count: 0, created_at: "2026-10-30T00:00:00Z", updated_at: "2026-10-30T00:00:00Z" }` -> `PERMISSION_DENIED`
4. **JavaScript URI in `photo_url` (XSS Vector)**: `{ id: 4, title: "Valid title", description: "Valid description text", location: "Haldia", photo_url: "javascript:alert(1)", category: "Road", status: "Open", urgency_hits: 0, similar_count: 0, created_at: "2026-10-30T00:00:00Z", updated_at: "2026-10-30T00:00:00Z" }` -> `PERMISSION_DENIED`
5. **Invalid Category Enum**: `{ id: 5, title: "Valid title", description: "Valid description text", location: "Haldia", category: "Spacecraft", status: "Open", urgency_hits: 0, similar_count: 0, created_at: "2026-10-30T00:00:00Z", updated_at: "2026-10-30T00:00:00Z" }` -> `PERMISSION_DENIED`
6. **Unauthorized Status Transition (No Auth & Wrong Authority Key)**: `PATCH /issues/1` with `{ status: "In Progress", authorityKey: "wrong-key" }` -> `PERMISSION_DENIED`
7. **State Shortcutting (`Open -> Resolved` directly)**: `PATCH /issues/1` from `Open` to `Resolved` without `In Progress` -> `PERMISSION_DENIED`
8. **Mutating Terminal `Resolved` Issue**: `PATCH /issues/17` when `existing().status == 'Resolved'` -> `PERMISSION_DENIED`
9. **Immutable Field Tampering (`created_at` or `id` changed on update)**: `PATCH /issues/1` changing `created_at` -> `PERMISSION_DENIED`
10. **Orphaned Status Event Write**: Creating `/issues/999999/events/ev1` when `/issues/999999` does not exist -> `PERMISSION_DENIED`
11. **Empty Officer Note on Status Event (< 3 chars)**: Creating `/issues/1/events/ev2` with `note: "ok"` -> `PERMISSION_DENIED`
12. **PII Blanket Read on `/admins/{otherUid}`**: Authenticated non-admin user reading another user's `/admins/{otherUid}` document -> `PERMISSION_DENIED`
