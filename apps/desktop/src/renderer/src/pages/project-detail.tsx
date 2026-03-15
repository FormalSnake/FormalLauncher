import { useParams, useNavigate } from 'react-router'
import { useModrinthProject } from '@/hooks/use-modrinth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeftIcon,
  DownloadIcon,
  HeartIcon,
  ExternalLinkIcon,
  PackageIcon,
  CalendarIcon,
  ScaleIcon,
} from 'lucide-react'

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ProjectDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { data: project, isLoading, error } = useModrinthProject(slug ?? '')

  if (isLoading) {
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1"
          onClick={() => navigate('/browse')}
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
        <div className="flex items-start gap-4">
          <Skeleton className="size-16 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" onClick={() => navigate('/browse')}>
          Back to Browse
        </Button>
      </div>
    )
  }

  const links = [
    project.source_url && { label: 'Source', url: project.source_url },
    project.issues_url && { label: 'Issues', url: project.issues_url },
    project.wiki_url && { label: 'Wiki', url: project.wiki_url },
    project.discord_url && { label: 'Discord', url: project.discord_url },
    ...project.donation_urls.map((d) => ({ label: d.platform, url: d.url })),
  ].filter(Boolean) as { label: string; url: string }[]

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-1"
        onClick={() => navigate('/browse')}
      >
        <ArrowLeftIcon className="size-4" />
        Back
      </Button>

      <div className="flex items-start gap-4">
        {project.icon_url ? (
          <img
            src={project.icon_url}
            alt={project.title}
            className="size-16 shrink-0 rounded-xl"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-muted">
            <PackageIcon className="size-8 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
          <p className="text-sm text-muted-foreground">{project.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {project.categories.map((cat) => (
              <Badge key={cat} variant="secondary">
                {cat}
              </Badge>
            ))}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <DownloadIcon className="size-3" />
              {formatDownloads(project.downloads)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <HeartIcon className="size-3" />
              {formatDownloads(project.followers)}
            </span>
          </div>
        </div>
      </div>

      {project.gallery.length > 0 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {project.gallery
            .sort((a, b) => a.ordering - b.ordering)
            .map((img) => (
              <img
                key={img.url}
                src={img.url}
                alt={img.title ?? ''}
                className="h-40 shrink-0 rounded-lg object-cover"
              />
            ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-[1fr_280px] gap-6">
        <div className="prose prose-sm prose-invert max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>{project.body}</Markdown>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <ScaleIcon className="size-4 text-muted-foreground" />
                <span>{project.license.name || project.license.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-muted-foreground" />
                <div>
                  <div>Created {formatDate(project.date_created)}</div>
                  <div className="text-muted-foreground">
                    Updated {formatDate(project.date_modified)}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Client: <Badge variant="outline" className="ml-1">{project.client_side}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Server: <Badge variant="outline" className="ml-1">{project.server_side}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {links.length > 0 && (
            <Card>
              <CardContent className="space-y-2">
                {links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ExternalLinkIcon className="size-3" />
                    {link.label}
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
