import { Hono } from 'hono'
import { auth } from '../lib/auth'

const routes = new Hono()

routes.get('/health', (c) => c.json({ status: 'ok' }))

routes.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))

export { routes }
