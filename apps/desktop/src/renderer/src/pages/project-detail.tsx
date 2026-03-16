import { useCallback, useEffect, useState } from 'react'
import { useParams, useOutletContext, useNavigate } from 'react-router'
import type { AppShellContext } from '@/components/layout/app-shell'
import { useModrinthProject, useModrinthVersions } from '@/hooks/use-modrinth'
import { useModpackInstall } from '@/hooks/use-modpack-install'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { InstallDialog } from '@/components/shared/install-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconHeart2,
  IconExternalLink,
  IconCube,
  IconCalendar,
  IconScale,
  IconLoader,
} from 'nucleo-pixel'

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
  const { setTitleOverride } = useOutletContext<AppShellContext>()
  const { data: project, isLoading, error } = useModrinthProject(slug ?? '')
  const { installModpack, installing: modpackInstalling, progress: modpackProgress, error: modpackError } = useModpackInstall()

  useEffect(() => {
    if (project) setTitleOverride(project.title)
    return () => setTitleOverride(null)
  }, [project, setTitleOverride])

  const sortedGallery = project?.gallery
    ?.slice()
    .sort((a, b) => a.ordering - b.ordering) ?? []

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [installOpen, setInstallOpen] = useState(false)
  const [modpackDialogOpen, setModpackDialogOpen] = useState(false)
  const [modpackName, setModpackName] = useState('')
  const [modpackVersionId, setModpackVersionId] = useState('')

  const isModpack = project?.project_type === 'modpack'

  const { data: modpackVersions } = useModrinthVersions(
    isModpack ? project?.id ?? '' : '',
  )
  const selectedImage = selectedIndex !== null ? sortedGallery[selectedIndex] : null

  const goNext = useCallback(() => {
    setSelectedIndex((i) =>
      i !== null && i < sortedGallery.length - 1 ? i + 1 : i
    )
  }, [sortedGallery.length])

  const goPrev = useCallback(() => {
    setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i))
  }, [])

  useEffect(() => {
    if (selectedIndex === null) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedIndex, goNext, goPrev])

  if (isLoading) {
    return (
      <div>
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
      <div className="flex items-start gap-4">
        {project.icon_url ? (
          <img
            src={project.icon_url}
            alt={project.title}
            className="size-16 shrink-0 rounded-xl"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-muted">
            <IconCube className="size-8 text-muted-foreground" />
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
              <IconDownload className="size-3" />
              {formatDownloads(project.downloads)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconHeart2 className="size-3" />
              {formatDownloads(project.followers)}
            </span>
          </div>
        </div>
      </div>

      {sortedGallery.length > 0 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {sortedGallery.map((img, i) => (
            <button
              key={img.url}
              type="button"
              className="shrink-0 cursor-pointer overflow-hidden rounded-lg"
              onClick={() => setSelectedIndex(i)}
            >
              <img
                src={img.url}
                alt={img.title ?? ''}
                className="h-40 object-cover transition-transform hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIndex(null)
        }}
      >
        <DialogContent className="sm:max-w-5xl p-0 overflow-hidden" showCloseButton>
          {selectedImage && (
            <div className="flex flex-col">
              <div className="relative flex items-center justify-center bg-black/50">
                {selectedIndex !== null && selectedIndex > 0 && (
                  <button
                    type="button"
                    className="absolute left-2 z-10 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                    onClick={goPrev}
                  >
                    <IconChevronLeft className="size-5" />
                  </button>
                )}
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title ?? ''}
                  className="max-h-[80vh] w-full object-contain"
                />
                {selectedIndex !== null &&
                  selectedIndex < sortedGallery.length - 1 && (
                    <button
                      type="button"
                      className="absolute right-2 z-10 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                      onClick={goNext}
                    >
                      <IconChevronRight className="size-5" />
                    </button>
                  )}
              </div>
              {(selectedImage.title || selectedImage.description) && (
                <div className="p-4">
                  <DialogTitle>
                    {selectedImage.title || 'Gallery Image'}
                  </DialogTitle>
                  {selectedImage.description && (
                    <DialogDescription className="mt-1">
                      {selectedImage.description}
                    </DialogDescription>
                  )}
                </div>
              )}
              {!selectedImage.title && !selectedImage.description && (
                <DialogTitle className="sr-only">Gallery Image</DialogTitle>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-6 grid grid-cols-[1fr_280px] gap-6">
        <div className="prose prose-sm prose-invert max-w-none">
          {project.project_type !== 'modpack' && (
            <InstallDialog
              projectId={project.id}
              projectName={project.title}
              projectType={project.project_type === 'resourcepack' ? 'resourcepack' : 'mod'}
              open={installOpen}
              onOpenChange={setInstallOpen}
            />
          )}
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              rehypeRaw,
              [rehypeSanitize, {
                ...defaultSchema,
                tagNames: [...(defaultSchema.tagNames ?? []), 'iframe', 'video', 'source'],
                attributes: {
                  ...defaultSchema.attributes,
                  iframe: ['src', 'width', 'height', 'frameBorder', 'allow', 'allowFullScreen', 'title', 'style'],
                  video: ['src', 'width', 'height', 'controls', 'autoPlay', 'loop', 'muted', 'poster', 'style'],
                  source: ['src', 'type'],
                },
              }],
            ]}
          >
            {project.body}
          </Markdown>
        </div>

        <div className="space-y-4">
          {project.project_type === 'modpack' ? (
            <Button
              className="w-full"
              onClick={() => {
                setModpackName(project.title)
                setModpackDialogOpen(true)
              }}
            >
              <IconDownload className="mr-2 size-4" />
              Install Modpack
            </Button>
          ) : (
            <Button className="w-full" onClick={() => setInstallOpen(true)}>
              <IconDownload className="mr-2 size-4" />
              Install
            </Button>
          )}
          <Card>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <IconScale className="size-4 text-muted-foreground" />
                <span>{project.license.name || project.license.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCalendar className="size-4 text-muted-foreground" />
                <div>
                  <div>Created {formatDate(project.published)}</div>
                  <div className="text-muted-foreground">
                    Updated {formatDate(project.updated)}
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
                    <IconExternalLink className="size-3" />
                    {link.label}
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modpack install dialog */}
      <Dialog open={modpackDialogOpen} onOpenChange={setModpackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install Modpack</DialogTitle>
            <DialogDescription>
              This will create a new instance with all mods from the modpack.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Instance Name</label>
              <Input
                value={modpackName}
                onChange={(e) => setModpackName(e.target.value)}
                placeholder="Modpack instance name"
              />
            </div>
            {modpackVersions && modpackVersions.length > 0 && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Version</label>
                <Select value={modpackVersionId} onValueChange={(v) => v && setModpackVersionId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Latest" />
                  </SelectTrigger>
                  <SelectContent>
                    {modpackVersions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.version_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {modpackProgress && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Downloading mods...</span>
                  <span>{modpackProgress.current}/{modpackProgress.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${modpackProgress.total > 0 ? (modpackProgress.current / modpackProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {modpackError && (
              <p className="text-sm text-destructive">{modpackError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={!modpackName.trim() || modpackInstalling}
              onClick={async () => {
                const selectedVer = modpackVersionId
                  ? modpackVersions?.find((v) => v.id === modpackVersionId)
                  : modpackVersions?.[0]
                if (!selectedVer) return
                const file = selectedVer.files.find((f) => f.primary) ?? selectedVer.files[0]
                if (!file) return
                const instanceId = await installModpack(
                  file.url,
                  modpackName.trim(),
                  {
                    modpackProjectId: project?.id,
                    modpackVersionId: selectedVer.id,
                  },
                )
                if (instanceId) {
                  setModpackDialogOpen(false)
                  navigate(`/instances/${instanceId}`)
                }
              }}
            >
              {modpackInstalling ? (
                <>
                  <IconLoader className="mr-2 size-4 animate-spin" />
                  Installing...
                </>
              ) : (
                'Install'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
