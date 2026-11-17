/**
 * Security verification specification for SENTINEL AI Firestore rules.
 * Lists the 12 adversarial payloads validated against firestore.rules.
 */
export interface DirtyDozenPayloadCase {
  name: string;
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedOutcome: 'PERMISSION_DENIED';
  reason: string;
}

export const DIRTY_DOZEN_CASES: DirtyDozenPayloadCase[] = [
  {
    name: 'Unauthenticated profile read',
    path: '/users/user_1',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'request.auth == null fails isOwner()',
  },
  {
    name: 'Unverified email token write',
    path: '/users/user_1/transcriptions/tr_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'email_verified == false fails isVerifiedUser()',
  },
  {
    name: 'Cross-user PII contact read',
    path: '/users/user_1/private/contact',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'request.auth.uid != userId fails isOwner()',
  },
  {
    name: 'Cross-user chat session spoofing',
    path: '/users/user_1/chatSessions/sess_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'userId != request.auth.uid rejected by isOwner() and isValidChatSession()',
  },
  {
    name: 'Shadow field injection on session create',
    path: '/users/user_1/chatSessions/sess_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'data.keys().hasOnly(...) blocks unexpected fields such as isAdmin',
  },
  {
    name: 'ID poisoning with invalid characters',
    path: '/users/user_1/chatSessions/bad$id',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'isValidId() enforces ^[a-zA-Z0-9_\\-]+$ and <= 128 chars',
  },
  {
    name: 'Orphaned chat message without parent session',
    path: '/users/user_1/chatSessions/missing_sess/messages/msg_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Master Gate get() on parent chatSession rejects missing parent',
  },
  {
    name: 'Client-spoofed timestamp on transcription',
    path: '/users/user_1/transcriptions/tr_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'incoming().createdAt == request.time enforces server timestamp',
  },
  {
    name: 'Immutable createdAt mutation on session update',
    path: '/users/user_1/chatSessions/sess_1',
    operation: 'update',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'incoming().createdAt == existing().createdAt and affectedKeys().hasOnly() reject tampering',
  },
  {
    name: 'Oversized message text (>16000 chars)',
    path: '/users/user_1/chatSessions/sess_1/messages/msg_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'data.text.size() <= 16000 rejects resource-exhaustion payloads',
  },
  {
    name: 'Unallowlisted modelId in chat session',
    path: '/users/user_1/chatSessions/sess_1',
    operation: 'create',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'modelId allowlist rejects unauthorized model names',
  },
  {
    name: 'Cross-user list query scrape',
    path: '/users/user_1/transcriptions',
    operation: 'list',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'allow list requires isOwner(userId) && resource.data.userId == request.auth.uid',
  },
];
