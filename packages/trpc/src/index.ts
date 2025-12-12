import superjson from 'superjson';
import { initTRPC } from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export type User = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type UserUpdateInput = Partial<
  Pick<User, 'username' | 'first_name' | 'last_name' | 'description'>
>;

export type UsersContext = {
  getById: (id: string) => Promise<User | null>;
  search: (q: string, limit: number) => Promise<User[]>;
  updateMe: (userId: string, patch: UserUpdateInput) => Promise<User>;
  deleteMe: (userId: string) => Promise<void>;
};

export type Context = {
  user: User | null;
  users: UsersContext;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next();
});

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ text: z.string().optional() }).optional())
    .query(({ input }) => {
      const text = input?.text ?? 'monorepo';
      return { message: `Bonjour ${text} — tRPC OK` };
    }),
  users: router({
    me: protectedProcedure.query(({ ctx }) => ctx.user),

    byId: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        const user = await ctx.users.getById(input.id);
        if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
        return user;
      }),

    search: protectedProcedure
      .input(
        z.object({
          q: z.string().default(''),
          limit: z.number().int().min(1).max(30).default(10),
        }),
      )
      .query(({ ctx, input }) => ctx.users.search(input.q, input.limit)),

    updateMe: protectedProcedure
      .input(
        z.object({
          username: z.string().min(1).max(64).optional(),
          first_name: z.string().max(128).optional(),
          last_name: z.string().max(128).optional(),
          description: z.string().max(2048).optional(),
        }),
      )
      .mutation(({ ctx, input }) => ctx.users.updateMe(ctx.user!.id, input)),

    deleteMe: protectedProcedure.mutation(async ({ ctx }) => {
      await ctx.users.deleteMe(ctx.user!.id);
      return { ok: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;


