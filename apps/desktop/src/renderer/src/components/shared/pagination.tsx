import { Button } from '@/components/ui/button'
import { IconChevronLeft, IconChevronRight } from 'nucleo-pixel'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number | ((prev: number) => number)) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange((p) => p - 1)}
      >
        <IconChevronLeft className="size-4" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange((p) => p + 1)}
      >
        Next
        <IconChevronRight className="size-4" />
      </Button>
    </div>
  )
}
