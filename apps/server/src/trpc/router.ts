import { router } from './'
import { instanceRouter } from './routers/instance'

export const appRouter = router({
  instance: instanceRouter,
})

export type AppRouter = typeof appRouter
