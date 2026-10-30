/**
 * Phase 0 Payload-First Security Test Suite for firestore.rules
 * Verifies that all 12 Dirty Dozen payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'get' | 'delete';
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on Issue Create',
    collectionPath: '/issues/1',
    operation: 'create',
    payload: {
      id: 1,
      title: 'Valid title here',
      description: 'Valid description text with enough length',
      location: 'Durgachak, Haldia',
      category: 'Road',
      status: 'Open',
      urgency_hits: 0,
      similar_count: 0,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
      isSuperAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Title Too Short (< 5 chars)',
    collectionPath: '/issues/2',
    operation: 'create',
    payload: {
      id: 2,
      title: 'Bad',
      description: 'Valid description text with enough length',
      location: 'Durgachak, Haldia',
      category: 'Road',
      status: 'Open',
      urgency_hits: 0,
      similar_count: 0,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Description Volumetric Overflow (> 2000 chars)',
    collectionPath: '/issues/3',
    operation: 'create',
    payload: {
      id: 3,
      title: 'Valid title here',
      description: 'A'.repeat(2005),
      location: 'Durgachak, Haldia',
      category: 'Road',
      status: 'Open',
      urgency_hits: 0,
      similar_count: 0,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'JavaScript URI in photo_url (XSS Vector)',
    collectionPath: '/issues/4',
    operation: 'create',
    payload: {
      id: 4,
      title: 'Valid title here',
      description: 'Valid description text with enough length',
      location: 'Durgachak, Haldia',
      photo_url: 'javascript:alert(1)',
      category: 'Road',
      status: 'Open',
      urgency_hits: 0,
      similar_count: 0,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Invalid Category Enum',
    collectionPath: '/issues/5',
    operation: 'create',
    payload: {
      id: 5,
      title: 'Valid title here',
      description: 'Valid description text with enough length',
      location: 'Durgachak, Haldia',
      category: 'Aviation',
      status: 'Open',
      urgency_hits: 0,
      similar_count: 0,
      created_at: '2026-10-30T00:00:00Z',
      updated_at: '2026-10-30T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unauthorized Status Transition (Invalid Key & Unauthenticated)',
    collectionPath: '/issues/1',
    operation: 'update',
    payload: {
      status: 'In Progress',
      updated_at: '2026-10-30T01:00:00Z',
      authorityKey: 'wrong-key',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'State Shortcutting (Open -> Resolved Directly)',
    collectionPath: '/issues/1',
    operation: 'update',
    payload: {
      status: 'Resolved',
      updated_at: '2026-10-30T01:00:00Z',
      authorityKey: 'NOVA-HALDIA-KEY-2026',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Mutating Terminal Resolved Issue',
    collectionPath: '/issues/17',
    operation: 'update',
    payload: {
      status: 'In Progress',
      updated_at: '2026-10-30T01:00:00Z',
      authorityKey: 'NOVA-HALDIA-KEY-2026',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable Field Tampering (created_at modified)',
    collectionPath: '/issues/1',
    operation: 'update',
    payload: {
      status: 'In Progress',
      created_at: '1999-01-01T00:00:00Z',
      updated_at: '2026-10-30T01:00:00Z',
      authorityKey: 'NOVA-HALDIA-KEY-2026',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Orphaned Status Event Write on Non-Existent Issue',
    collectionPath: '/issues/999999/events/ev1',
    operation: 'create',
    payload: {
      issue_id: 999999,
      from: 'Open',
      to: 'In Progress',
      note: 'Valid officer note here',
      at: '2026-10-30T01:00:00Z',
      authorityKey: 'NOVA-HALDIA-KEY-2026',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Too Short Officer Note (< 3 chars)',
    collectionPath: '/issues/1/events/ev2',
    operation: 'create',
    payload: {
      issue_id: 1,
      from: 'Open',
      to: 'In Progress',
      note: 'ok',
      at: '2026-10-30T01:00:00Z',
      authorityKey: 'NOVA-HALDIA-KEY-2026',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'PII Blanket Read on Another Admin Profile',
    collectionPath: '/admins/other-admin-uid',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
  },
];
