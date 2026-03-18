import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trpc } from '@/lib/trpc'

export function UsernameSetupPage() {
  const navigate = useNavigate()
  const utils = trpc.useUtils()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)

  const setupMutation = trpc.profile.setup.useMutation({
    onSuccess: async () => {
      await utils.profile.get.refetch()
      navigate('/')
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(username)

  return (
    <div className="flex h-svh items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Choose a Username</h1>
          <p className="text-sm text-muted-foreground">
            This will be your display name for friends and chat.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError(null)
              }}
              placeholder="Enter username"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              3-20 characters, letters, numbers, and underscores only.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={() => setupMutation.mutate({ username })}
            disabled={!isValid || setupMutation.isPending}
          >
            {setupMutation.isPending ? 'Setting up...' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
