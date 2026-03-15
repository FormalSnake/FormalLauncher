import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './trpc/router'
import { createContext } from './trpc'
import { routes } from './routes'

const app = new Hono()

app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  }),
)

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
