import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import * as schema from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export const appRouter = router({
  users: router({
    getAll: publicProcedure.query(async ({ ctx }) => {
      return await ctx.db.select().from(schema.users).orderBy(desc(schema.users.created_at));
    }),
    // login logic could go here
  }),
  enrollments: router({
    getMyEnrollments: protectedProcedure.query(async ({ ctx }) => {
      return await ctx.db
        .select()
        .from(schema.enrollments)
        .where(eq(schema.enrollments.student_id, ctx.user.id));
    }),
  }),
  payments: router({
    getMyPayments: protectedProcedure.query(async ({ ctx }) => {
      return await ctx.db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.student_id, ctx.user.id));
    }),
  }),
  support: router({
    getMyTickets: protectedProcedure.query(async ({ ctx }) => {
      return await ctx.db
        .select()
        .from(schema.supportTickets)
        .where(eq(schema.supportTickets.student_id, ctx.user.id))
        .orderBy(desc(schema.supportTickets.created_at));
    }),
    createTicket: protectedProcedure
      .input(
        z.object({
          category: z.string(),
          description: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = crypto.randomUUID();
        await ctx.db.insert(schema.supportTickets).values({
          id,
          student_id: ctx.user.id,
          category: input.category,
          description: input.description,
          created_at: new Date().toISOString(),
          status: 'open',
        });
        return { success: true, id };
      }),
  }),
  batches: router({
    getAll: publicProcedure.query(async ({ ctx }) => {
      return await ctx.db.select().from(schema.batches);
    })
  }),
});

export type AppRouter = typeof appRouter;
