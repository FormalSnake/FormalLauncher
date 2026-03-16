import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/lib/trpc'
import { useFriendsStore } from '@/store/friends.store'
import { IconPlus, IconCircleCheck, IconCircleXmark } from 'nucleo-pixel'

export function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { setFriends, setPendingRequests, removeFriend, addFriend, removeRequest, searchResults, setSearchResults } = useFriendsStore()

  const friendsQuery = trpc.friend.list.useQuery()
  const pendingQuery = trpc.friend.pendingRequests.useQuery()

  useEffect(() => {
    if (friendsQuery.data) setFriends(friendsQuery.data)
  }, [friendsQuery.data, setFriends])

  useEffect(() => {
    if (pendingQuery.data) setPendingRequests(pendingQuery.data)
  }, [pendingQuery.data, setPendingRequests])

  const [activeSearch, setActiveSearch] = useState<string | null>(null)
  const searchQuery2 = trpc.friend.search.useQuery(
    { query: activeSearch! },
    { enabled: !!activeSearch },
  )

  useEffect(() => {
    if (searchQuery2.data) setSearchResults(searchQuery2.data)
  }, [searchQuery2.data, setSearchResults])

  const sendRequestMutation = trpc.friend.sendRequest.useMutation()
  const acceptMutation = trpc.friend.acceptRequest.useMutation({
    onSuccess: (data) => {
      removeRequest(data.friendshipId)
      addFriend(data)
      pendingQuery.refetch()
      friendsQuery.refetch()
    },
  })
  const rejectMutation = trpc.friend.rejectRequest.useMutation({
    onSuccess: (_, vars) => {
      removeRequest(vars.friendshipId)
      pendingQuery.refetch()
    },
  })
  const removeMutation = trpc.friend.remove.useMutation({
    onSuccess: (_, vars) => {
      removeFriend(vars.friendshipId)
      friendsQuery.refetch()
    },
  })

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim())
    }
  }

  const friends = friendsQuery.data ?? []
  const pendingRequests = pendingQuery.data ?? []

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Friends</h1>

      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">
            Friends
            {friends.length > 0 && (
              <Badge variant="secondary" className="ml-2">{friends.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="search">Add Friend</TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4">
          {friends.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No friends yet. Search for users to add them!
            </p>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.friendshipId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <span className="font-medium">{friend.username}</span>
                    <span className="text-muted-foreground">#{friend.friendCode}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMutation.mutate({ friendshipId: friend.friendshipId })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {pendingRequests.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No pending requests.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div
                  key={req.friendshipId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <span className="font-medium">{req.username}</span>
                    <span className="text-muted-foreground">#{req.friendCode}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => acceptMutation.mutate({ friendshipId: req.friendshipId })}
                      disabled={acceptMutation.isPending}
                    >
                      <IconCircleCheck className="mr-1 size-4" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => rejectMutation.mutate({ friendshipId: req.friendshipId })}
                      disabled={rejectMutation.isPending}
                    >
                      <IconCircleXmark className="mr-1 size-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <div className="mb-4 flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              disabled={searchQuery2.isLoading || !searchQuery.trim()}
            >
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <span className="font-medium">{user.username}</span>
                    <span className="text-muted-foreground">#{user.friendCode}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      sendRequestMutation.mutate(
                        { addresseeId: user.userId },
                        { onSuccess: () => setSearchResults(searchResults.filter((u) => u.userId !== user.userId)) },
                      )
                    }
                    disabled={sendRequestMutation.isPending}
                  >
                    <IconPlus className="mr-1 size-4" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchQuery2.isSuccess && searchResults.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No users found.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
