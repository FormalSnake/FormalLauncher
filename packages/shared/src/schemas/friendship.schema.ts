import { z } from 'zod'

export const UsernameSchema = z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/)

export const UserProfileSchema = z.object({
  userId: z.string(),
  username: z.string(),
  friendCode: z.string(),
})
export type UserProfile = z.infer<typeof UserProfileSchema>

export const FriendSearchResultSchema = z.object({
  userId: z.string(),
  username: z.string(),
  friendCode: z.string(),
})
export type FriendSearchResult = z.infer<typeof FriendSearchResultSchema>

export const FriendshipStatusSchema = z.enum(['pending', 'accepted', 'blocked'])
export type FriendshipStatus = z.infer<typeof FriendshipStatusSchema>

export const FriendshipSchema = z.object({
  id: z.string().uuid(),
  requesterId: z.string(),
  addresseeId: z.string(),
  status: FriendshipStatusSchema,
  createdAt: z.string().datetime(),
})
export type Friendship = z.infer<typeof FriendshipSchema>

export const FriendSchema = z.object({
  friendshipId: z.string().uuid(),
  userId: z.string(),
  username: z.string(),
  friendCode: z.string(),
})
export type Friend = z.infer<typeof FriendSchema>

export const FriendRequestSchema = z.object({
  friendshipId: z.string().uuid(),
  requesterId: z.string(),
  username: z.string(),
  friendCode: z.string(),
  createdAt: z.string().datetime(),
})
export type FriendRequest = z.infer<typeof FriendRequestSchema>

export const ProfileSetupInputSchema = z.object({
  username: UsernameSchema,
})
export type ProfileSetupInput = z.infer<typeof ProfileSetupInputSchema>
