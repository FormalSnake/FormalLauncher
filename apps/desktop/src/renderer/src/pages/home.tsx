import { useNavigate } from 'react-router'
import { InstanceCard } from '@/components/shared/instance-card'
import { Button } from '@/components/ui/button'
import { useInstancesStore } from '@/store/instances.store'
import { IconMediaPlay, IconPlus } from 'nucleo-pixel'
import { useLaunch } from '@/hooks/use-launch'
import { useMinecraftAccountsStore } from '@/store/minecraft-accounts.store'

export function HomePage() {
  const navigate = useNavigate()
  const instances = useInstancesStore((s) => s.instances)
  const recentInstances = instances.slice(0, 3)
  const lastInstance = instances[0]
  const activeAccount = useMinecraftAccountsStore((s) => s.getActiveAccount())
  const { launch, isLaunching, isRunning } = useLaunch()

  const handleQuickPlay = () => {
    if (!lastInstance) return
    if (!activeAccount) {
      navigate('/accounts')
      return
    }
    launch(lastInstance.id)
  }

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-lg font-medium">Welcome to FormalLauncher</p>
        <p className="text-sm text-muted-foreground">
          Create your first instance to get started.
        </p>
        <Button
          size="lg"
          className="gap-2"
          onClick={() => navigate('/instances')}
        >
          <IconPlus className="size-4" />
          Create Instance
        </Button>
      </div>
    )
  }

  return (
    <div>
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Recent Instances</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentInstances.map((instance) => (
            <InstanceCard key={instance.id} instance={instance} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            className="gap-2"
            onClick={handleQuickPlay}
            disabled={isLaunching || isRunning}
          >
            <IconMediaPlay className="size-4" />
            Play {lastInstance.name}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2"
            onClick={() => navigate('/instances')}
          >
            <IconPlus className="size-4" />
            Create Instance
          </Button>
        </div>
      </section>
    </div>
  )
}
