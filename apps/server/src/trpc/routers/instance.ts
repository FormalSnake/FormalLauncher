import { router, protectedProcedure } from '../'
import { instances } from '../../db/schema'
import { eq } from 'drizzle-orm'

export const instanceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(instances).where(eq(instances.userId, ctx.session.user.id))
  }),
})
