import { router, protectedProcedure } from '../'
import { userProfiles } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { ProfileSetupInputSchema } from '@formallauncher/shared'

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const [profile] = await ctx.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, ctx.session.user.id))
    return profile ?? null
  }),

  setup: protectedProcedure
    .input(ProfileSetupInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if already set up
      const [existing] = await ctx.db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, ctx.session.user.id))
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Profile already exists' })
      }

      // Try to create with unique friendCode
      for (let attempt = 0; attempt < 10; attempt++) {
        const friendCode = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
        try {
          const [profile] = await ctx.db
            .insert(userProfiles)
            .values({
              userId: ctx.session.user.id,
              username: input.username,
              friendCode,
            })
            .returning()
          return profile
        } catch (err: any) {
          if (err?.code === '23505') continue // unique violation, retry
          throw err
        }
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not generate unique friend code. Try a different username.',
      })
    }),
})
