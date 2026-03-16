import { initTRPC, TRPCError } from '@trpc/server'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { db } from '../db'
import { auth } from '../lib/auth'
import { getOrCreateUserDek } from '../lib/crypto'

export async function createContext(opts: FetchCreateContextFnOptions) {
  const session = await auth.api.getSession({ headers: opts.req.headers })
  return { db, session }
}

export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  const dek = await getOrCreateUserDek(ctx.db, ctx.session.user.id)
  return next({ ctx: { ...ctx, session: ctx.session, dek } })
})
