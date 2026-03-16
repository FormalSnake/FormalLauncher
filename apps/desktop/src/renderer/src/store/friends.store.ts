import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Friend, FriendRequest, FriendSearchResult } from '@formallauncher/shared'

interface FriendsState {
  friends: Friend[]
  pendingRequests: FriendRequest[]
  searchResults: FriendSearchResult[]
  setFriends: (friends: Friend[]) => void
  setPendingRequests: (requests: FriendRequest[]) => void
  setSearchResults: (results: FriendSearchResult[]) => void
  removeFriend: (friendshipId: string) => void
  addFriend: (friend: Friend) => void
  removeRequest: (friendshipId: string) => void
}

export const useFriendsStore = create<FriendsState>()(
  persist(
    (set) => ({
      friends: [],
      pendingRequests: [],
      searchResults: [],

      setFriends: (friends) => set({ friends }),
      setPendingRequests: (requests) => set({ pendingRequests: requests }),
      setSearchResults: (results) => set({ searchResults: results }),

      removeFriend: (friendshipId) =>
        set((state) => ({
          friends: state.friends.filter((f) => f.friendshipId !== friendshipId),
        })),

      addFriend: (friend) =>
        set((state) => ({
          friends: [...state.friends, friend],
        })),

      removeRequest: (friendshipId) =>
        set((state) => ({
          pendingRequests: state.pendingRequests.filter(
            (r) => r.friendshipId !== friendshipId,
          ),
        })),
    }),
    {
      name: 'formallauncher-friends',
      partialize: (state) => ({
        friends: state.friends,
      }),
    },
  ),
)
