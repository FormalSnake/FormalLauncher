import { Hono } from 'hono'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './trpc/router'
import { createContext } from './trpc'
import { routes } from './routes'

const app = new Hono()

app.route('/', routes)

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
  }),
)

export default {
  port: 3000,
  fetch: app.fetch,
}
