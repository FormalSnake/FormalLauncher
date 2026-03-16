import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useProxiedImage } from '@/hooks/use-proxied-image'

export function McAvatar({
  id,
  name,
  size,
}: {
  id: string
  name: string
  size?: 'default' | 'sm' | 'lg'
}) {
  const { data: src } = useProxiedImage(
    `https://mc-heads.net/avatar/${id}/64`,
  )
  return (
    <Avatar size={size}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback>{name[0]}</AvatarFallback>
    </Avatar>
  )
}
