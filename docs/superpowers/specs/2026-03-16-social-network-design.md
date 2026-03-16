# Social Network System Design

## Context

FormalLauncher currently supports multi-instance management with server sync for a single user. Users want to connect with friends, share configured instances, and communicate — similar to Essential mod's social features but built into the launcher. This spec covers three subsystems: friend system, instance sharing with ownership/overrides/conflict resolution, and real-time chat (DMs + instance group chats).

## Architecture Overview

All social features use tRPC (HTTP batch link for queries/mutations, SSE-based `httpSubscriptionLink` for subscriptions). No new transport layers — tRPC v11's SSE subscription support works with the existing Hono Fetch adapter on Bun without any server changes. Chat messages are encrypted at rest using the existing AES-256-GCM encryption system.

```
Desktop Client
  ├── httpBatchLink ──────────→ tRPC (friend, sharing, chat queries/mutations)
  └── httpSubscriptionLink ──→ tRPC SSE subscriptions (chat.onNewMessage, chat.onTyping)

Server (Hono + tRPC)
  ├── friend router   → friendships, user_profiles
  ├── sharing router  → shared_instances, instance_overrides, instance_conflicts
  └── chat router     → conversations, messages, conversation_members
```

---

## 1. Data Model

### New `user_profiles` Table

Separate from Better Auth's `users` table to avoid conflicts:

| Column | Type | Constraints |
|--------|------|-------------|
| `userId` | text PK, FK→users | onDelete cascade |
| `username` | text | unique, 3-20 chars, `^[a-zA-Z0-9_]+$` |
| `friendCode` | text | 6-digit suffix (e.g., `#012345`) |
| `createdAt` | timestamp | defaultNow |
| `updatedAt` | timestamp | $onUpdate |

Unique: `(username, friendCode)`. Display format: `Username#012345`.

### New Tables

#### `friendships`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid PK | defaultRandom |
| `requesterId` | text FK→users | onDelete cascade |
| `addresseeId` | text FK→users | onDelete cascade |
| `status` | text | `'pending'` \| `'accepted'` \| `'blocked'` |
| `blockedById` | text? FK→users | Who initiated the block (null if not blocked) |
| `createdAt` | timestamp | defaultNow |
| `updatedAt` | timestamp | $onUpdate |

Unique: `(requesterId, addresseeId)`. Indexes: both user columns, `(addresseeId, status)`.

#### `shared_instances`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid PK | defaultRandom |
| `instanceId` | uuid FK→instances | onDelete cascade |
| `ownerId` | text FK→users | onDelete cascade |
| `sharedWithId` | text FK→users | onDelete cascade |
| `createdAt` | timestamp | defaultNow |
| `updatedAt` | timestamp | $onUpdate |

Unique: `(instanceId, sharedWithId)`.

#### `instance_overrides`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid PK | defaultRandom |
| `instanceId` | uuid FK→instances | onDelete cascade |
| `userId` | text FK→users | onDelete cascade |
| `field` | text | e.g., `'ramMb'`, `'jvmArgs'`, `'javaPath'`, `'mod:<projectId>:enabled'` |
| `value` | text | Encrypted with user's DEK |
| `updatedAt` | timestamp | $onUpdate |

Unique: `(instanceId, userId, field)`.

#### `instance_conflicts`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid PK | defaultRandom |
| `instanceId` | uuid FK→instances | onDelete cascade |
| `userId` | text FK→users | onDelete cascade |
| `field` | text | Which field conflicts |
| `ownerValue` | text | Encrypted with user's DEK |
| `localValue` | text | Encrypted with user's DEK |
| `resolvedAt` | timestamp? | null until resolved |
| `createdAt` | timestamp | defaultNow |
| `updatedAt` | timestamp | $onUpdate |

#### `conversations`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid PK | defaultRandom |
| `type` | text | `'dm'` \| `'instance_group'` |
| `instanceId` | uuid? FK→instances | For group chats only, onDelete set null |
| `createdAt` | timestamp | defaultNow |
| `updatedAt` | timestamp | $onUpdate |

#### `conversation_members`
| Column | Type | Constraints |
|--------|------|-------------|
| `conversationId` | uuid FK→conversations | onDelete cascade |
| `userId` | text FK→users | onDelete cascade |
| `encryptedConversationDek` | text | Conversation DEK wrapped with user's DEK |
| `joinedAt` | timestamp | defaultNow |

Composite PK: `(conversationId, userId)`.

#### `messages`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid PK | defaultRandom |
| `conversationId` | uuid FK→conversations | onDelete cascade |
| `senderId` | text FK→users | onDelete set null |
| `content` | text | Encrypted with conversation DEK |
| `createdAt` | timestamp | defaultNow |

Index: `(conversationId, createdAt)`.

**Pagination:** Cursor-based using `(createdAt, id)` composite cursor since UUIDs are non-sequential.

#### `conversation_read_cursors`
| Column | Type | Constraints |
|--------|------|-------------|
| `conversationId` | uuid FK→conversations | onDelete cascade |
| `userId` | text FK→users | onDelete cascade |
| `lastReadMessageId` | uuid? FK→messages | onDelete set null |
| `updatedAt` | timestamp | $onUpdate |

Composite PK: `(conversationId, userId)`.

---

## 2. Friend System

### tRPC Router: `friend`

| Procedure | Type | Input | Behavior |
|-----------|------|-------|----------|
| `search` | Query | `{ query: string }` | Search by username. Returns id, username, friendCode. Excludes self + existing friends. Rate limited (20 req/min). |
| `sendRequest` | Mutation | `{ addresseeId }` | Create pending friendship. Validate: not self, not existing, not blocked. |
| `acceptRequest` | Mutation | `{ friendshipId }` | Set status='accepted'. Only addressee can accept. |
| `rejectRequest` | Mutation | `{ friendshipId }` | Delete row. Only addressee can reject. |
| `remove` | Mutation | `{ friendshipId }` | Delete friendship. Either party. Cascades: remove shared instances between them, remove from shared group chats. |
| `block` | Mutation | `{ userId }` | Set status='blocked', blockedById=current user. Cascades same as remove. |
| `list` | Query | — | Accepted friends with username, friendCode. |
| `pendingRequests` | Query | — | Incoming pending requests. |

### Username Flow
- On first login (no profile), redirect to username setup page
- Validate: 3-20 chars, `^[a-zA-Z0-9_]+$`, unique
- friendCode: random 6-digit number, retry on `(username, friendCode)` collision (up to 10 attempts)

---

## 3. Instance Sharing

### tRPC Router: `sharing`

| Procedure | Type | Input | Behavior |
|-----------|------|-------|----------|
| `share` | Mutation | `{ instanceId, friendId }` | Create share. Validate ownership + friendship. Auto-create instance group conversation. |
| `unshare` | Mutation | `{ instanceId, friendId }` | Remove share + overrides + conflicts for that friend. Remove from group chat. |
| `listSharedWithMe` | Query | — | Instances shared with me, with owner info. |
| `listSharedByMe` | Query | — | My shared instances, with friend lists. |
| `pullShared` | Query | `{ instanceId }` | Get owner's latest instance data, apply my overrides, return merged + unresolved conflicts. |
| `setOverride` | Mutation | `{ instanceId, field, value }` | Set local override. Validate: is shared with me, field is overridable. |
| `removeOverride` | Mutation | `{ instanceId, field }` | Revert to owner value. |
| `getOverrides` | Query | `{ instanceId }` | List my overrides for an instance. |
| `resolveConflict` | Mutation | `{ conflictId, resolution }` | `'keep_mine'`: keep override. `'use_owner'`: delete override, accept owner value. |
| `listConflicts` | Query | — | All unresolved conflicts for current user. |

### Overridable Fields
- `ramMb`, `jvmArgs`, `javaPath` — settings overrides
- Individual mod `enabled` state — stored as override with field `mod:<projectId>:enabled`

### Non-overridable (always from owner)
- `name`, `minecraftVersion`, `modLoader`, `modLoaderVersion`
- Mod list (which mods exist), resource packs, modpack info

### Conflict Detection
When owner pushes an instance update:
1. Server compares old vs new field values
2. For each changed field, check if any friend has an override on that field
3. If yes → create `instance_conflicts` row with both values
4. Friend sees conflict on next `pullShared` or via SSE subscription notification

### Conflict Resolution
- `keep_mine`: override stays, conflict marked resolved
- `use_owner`: override deleted, conflict marked resolved
- UI shows a banner with conflict details and resolution buttons

---

## 4. Chat System

### tRPC Router: `chat`

| Procedure | Type | Input | Behavior |
|-----------|------|-------|----------|
| `listConversations` | Query | — | All conversations with last message preview + unread count. |
| `getMessages` | Query | `{ conversationId, cursor?, limit? }` | Cursor-based pagination using `(createdAt, id)`, newest first. Validate membership. Decrypt with conversation DEK. |
| `sendMessage` | Mutation | `{ conversationId, content }` | Validate membership. Max 2000 chars. Encrypt with conversation DEK. Emit via subscription. Rate limited (30 msg/min). |
| `startDm` | Mutation | `{ friendId }` | Find or create DM conversation. Validate friendship. |
| `onNewMessage` | Subscription | — | SSE stream of new messages for all user's conversations. |
| `onTyping` | Subscription | `{ conversationId }` | Typing indicator (stretch goal). |
| `markRead` | Mutation | `{ conversationId, messageId }` | Update read cursor. |

### Encryption Model
- Each conversation gets its own DEK (generated server-side)
- The conversation DEK is encrypted with each member's user DEK and stored in `conversation_members.encryptedConversationDek`
- On message send/read, server unwraps the conversation DEK using the user's DEK, then encrypts/decrypts message content
- When a member is added: wrap conversation DEK with new member's user DEK
- When a member is removed: no DEK rotation — removed members could theoretically read historical messages they were present for (they no longer have API access, and the wrapped key is deleted). This matches the threat model where the server is trusted and encryption is for at-rest DB protection.

**Note:** This is encryption-at-rest, not end-to-end encryption. The server holds the KEK and can unwrap all DEKs. This is consistent with the existing instance sync encryption model.

### tRPC SSE Subscription Setup
- Use tRPC v11's `httpSubscriptionLink` (SSE-based) — works with existing Hono Fetch adapter on Bun, no server transport changes needed
- Desktop adds `httpSubscriptionLink` alongside `httpBatchLink` using `splitLink` (subscriptions → SSE, rest → HTTP batch)
- Auth: uses existing cookie-based auth (same-origin requests include credentials)
- Reconnection: SSE auto-reconnects natively; on reconnect, client fetches missed messages via `getMessages`

### Instance Group Chats
- Auto-created when instance is first shared with a friend
- Members = owner + all friends the instance is shared with
- Adding/removing shares updates group membership
- Group chat name defaults to instance name
- If all friends are unshared, conversation stays (for history) but becomes inactive

### Known v1 Gaps
- No message edit or delete (can be added later)
- No file/image sharing in chat
- No typing indicators (stretch goal)

---

## 5. Client Architecture

### New Zustand Stores

**`useFriendsStore`** (persisted):
```
friends: Friend[]
pendingRequests: FriendRequest[]
searchResults: UserSearchResult[]
```

**`useSharedInstancesStore`** (persisted):
```
sharedWithMe: SharedInstance[]
sharedByMe: SharedByMeInstance[]
overrides: Record<instanceId, Override[]>
conflicts: Conflict[]
```

**`useChatStore`** (persisted):
```
conversations: Conversation[]
activeConversationId: string | null
messages: Record<conversationId, Message[]>
```

### New Shared Schemas (packages/shared)

- `friendship.schema.ts` — FriendshipSchema, FriendSearchResultSchema, UserProfileSchema
- `sharing.schema.ts` — SharedInstanceSchema, OverrideSchema, ConflictSchema, ConflictResolutionSchema
- `chat.schema.ts` — ConversationSchema, MessageSchema, SendMessageInputSchema

### New Routes

| Route | Page |
|-------|------|
| `/username-setup` | UsernameSetupPage (first login gate) |
| `/friends` | FriendsPage (list, search, pending) |
| `/chat` | ChatPage (conversation list + active chat) |
| `/chat/:conversationId` | ChatPage (with selected conversation) |

### Modified Pages
- **InstanceDetailPage** — "Share" button (owner), "Shared with" list, conflict banner (friend)
- **InstancesPage** — "Shared with me" section/tab, visual indicators for shared instances
- **AppShell sidebar** — Friends icon + pending badge, Chat icon + unread badge

### Sync Integration
- Shared instances sync separately from owned instances
- Friends pull shared instances via `sharing.pullShared`, not `instance.pull`
- Owner's `instance.push` triggers conflict detection server-side
- Desktop triggers shared instance refresh after receiving SSE subscription events

---

## 6. Security

- **Ownership enforcement:** Every sharing/override/conflict operation validates instance ownership or share membership
- **Friendship gating:** Can only share with accepted friends. DMs require friendship. Blocking cascades to shares/chats.
- **Block privacy:** Block status is not revealed to the blocked user — friend requests return generic "unable to send" error
- **Rate limiting:** Friend search (20 req/min), message sending (30 msg/min)
- **Input validation:** Username format, message length (2000 chars), override field whitelist
- **Encryption at rest:** Per-conversation DEKs for chat, per-user DEKs for overrides/conflict values (consistent with existing model)
- **Auth:** SSE subscriptions use existing cookie-based auth. All procedures use `protectedProcedure`.

---

## 7. Error Handling

- **Friend request to blocked user:** Return generic "unable to send request" (don't reveal block)
- **Share with non-friend:** Reject with clear error
- **Conflict on deleted instance:** Clean up conflicts via cascade delete
- **SSE disconnection:** Native SSE reconnection + fetch missed messages on reconnect
- **Username collision:** Retry friendCode generation (up to 10 attempts), fail gracefully

---

## 8. Prerequisites

- `ENCRYPTION_KEK` environment variable must be set (existing requirement from `apps/server/src/lib/crypto.ts`)
- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (existing)
