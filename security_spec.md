# Security Specification — SHAH NOOR WRITES

## 1. Data Invariants
1. Only the verified publication owner (`realzuhaan@gmail.com` with `email_verified == true`, or an explicit verified UID listed in `/admins/{uid}`) may create, edit, publish, schedule, or delete articles and categories.
2. Public readers may only read (`get`/`list`) articles whose `status == 'published'` or whose `status == 'scheduled'` and `publishAt <= request.time`. Drafts and future-scheduled articles are strictly inaccessible to non-admin callers.
3. Newsletter subscriber emails (`/subscribers/{subscriberId}`) and reader contact messages (`/messages/{messageId}`) contain PII: unauthenticated or non-admin users may `create` valid submissions, but `read`, `update`, and `delete` are strictly restricted to the verified admin.
4. All document IDs are validated against `^[a-zA-Z0-9_-]+$` (max 128 chars) to prevent path poisoning.
5. `createdAt` and `updatedAt` must equal `request.time`; `createdAt` and `authorId` are immutable after creation.
6. Strict `hasAll` / `hasOnly` and `affectedKeys().hasOnly(...)` guards prevent shadow fields and privilege escalation.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `create` on `/articles/test-post` -> Denied (not admin).
2. Signed-in non-admin user `create` on `/articles/test-post` -> Denied (not admin).
3. Spoofed email `realzuhaan@gmail.com` with `email_verified: false` `create` on `/articles/test-post` -> Denied.
4. Admin `create` on `/articles/test-post` with shadow field `isVerified: true` -> Denied (`hasOnly`).
5. Admin `create` on `/articles/bad..id` -> Denied (`isValidId`).
6. Admin `create` on `/articles/test-post` with `authorId: 'other-uid'` -> Denied (`authorId == request.auth.uid`).
7. Admin `create` on `/articles/test-post` with forged `createdAt` not equal to `request.time` -> Denied.
8. Admin `update` on `/articles/test-post` attempting to mutate `createdAt` or `authorId` -> Denied.
9. Public `get` or `list` on draft article (`status == 'draft'`) -> Denied.
10. Public `get` or `list` on `/subscribers` or `/messages` -> Denied (PII isolation).
11. Public `create` on `/messages/msg-1` with `status: 'read'` or shadow field `adminNote: 'x'` -> Denied.
12. Public `create` on `/subscribers/sub-1` with invalid email string or >160 chars -> Denied.
