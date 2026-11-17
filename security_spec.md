# SENTINEL AI Firestore Security Specification

## 1. Data Invariants
1. Every document under `/users/{userId}` and its subcollections is strictly owned by `request.auth.uid == userId` with `request.auth.token.email_verified == true`.
2. PII (`email`, `photoUrl`) is isolated in `/users/{userId}/private/{docId}` and never exposed in `/users/{userId}`.
3. Every `ChatMessage` under `/users/{userId}/chatSessions/{sessionId}/messages/{messageId}` requires the parent `ChatSession` to exist and belong to `request.auth.uid` (Master Gate).
4. Document IDs are bounded to `1..128` characters matching `^[a-zA-Z0-9_\-]+$`.
5. All `createdAt` / `updatedAt` timestamps must equal `request.time` on creation/update, and `createdAt` and ownership fields (`uid`, `userId`, `sessionId`) are immutable after creation.
6. Every write enforces `keys().hasAll(...)` and `keys().hasOnly(...)` on create, and `affectedKeys().hasOnly(...)` + entity schema validation on update.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. **Unauthenticated Read/Write**: `request.auth == null` reading `/users/u1` or creating a chat session.
2. **Unverified Email Token**: `request.auth.token.email_verified == false` writing to `/users/u1/transcriptions/t1`.
3. **Cross-User Profile Read**: User `u2` reading `/users/u1` or `/users/u1/private/contact`.
4. **Cross-User Session Creation (Identity Spoofing)**: User `u2` creating `/users/u1/chatSessions/s1` or setting `userId: "u1"`.
5. **Shadow / Ghost Field Injection**: Creating a `ChatSession` with extra `{ isAdmin: true }` field.
6. **ID Poisoning**: Creating `/users/u1/chatSessions/../../etc` or a 200-character ID.
7. **Orphaned Chat Message**: Creating `/users/u1/chatSessions/nonexistent/messages/m1` where parent session does not exist.
8. **Client-Spoofed Timestamp**: Creating a `TranscriptionRecord` with `createdAt` set to a past ISO string instead of `request.time`.
9. **Immutable Field Tampering**: Updating a `ChatSession` to change `createdAt` or `userId`.
10. **Oversized Payload (Denial of Wallet)**: Writing a `ChatMessage` with `text` > 16,000 characters.
11. **Invalid Enum Value**: Setting `ChatSession.modelId` to an unallowlisted model string.
12. **Blanket Collection Scrape**: Attempting `list` on `/users/u1/transcriptions` as `u2` without matching `resource.data.userId == request.auth.uid`.
