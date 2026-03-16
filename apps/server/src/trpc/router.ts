import { router } from './'
import { instanceRouter } from './routers/instance'
import { profileRouter } from './routers/profile'
import { friendRouter } from './routers/friend'
import { sharingRouter } from './routers/sharing'
import { chatRouter } from './routers/chat'

export const appRouter = router({
  instance: instanceRouter,
  profile: profileRouter,
  friend: friendRouter,
  sharing: sharingRouter,
  chat: chatRouter,
})

export type AppRouter = typeof appRouter
