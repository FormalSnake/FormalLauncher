import { useNavigate } from 'react-router'
import { PageHeader } from '@/components/shared/page-header'
import { InstanceCard } from '@/components/shared/instance-card'
import { Button } from '@/components/ui/button'
import { mockInstances } from '@/data/mock'
import { PlayIcon, PlusIcon } from 'lucide-react'

export function HomePage() {
  const navigate = useNavigate()
  const recentInstances = mockInstances.slice(0, 3)
  const lastInstance = mockInstances[0]

  return (
    <div>
      <PageHeader title="Home" />

      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">Recent Instances</h2>
        <div className="grid grid-cols-3 gap-4">
          {recentInstances.map((instance) => (
            <InstanceCard key={instance.id} instance={instance} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="flex gap-3">
          <Button size="lg" className="gap-2" onClick={() => navigate(`/instances/${lastInstance.id}`)}>
            <PlayIcon className="size-4" />
            Play {lastInstance.name}
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate('/instances')}>
            <PlusIcon className="size-4" />
            Create Instance
          </Button>
        </div>
      </section>
    </div>
  )
}
