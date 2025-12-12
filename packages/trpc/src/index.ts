import superjson from 'superjson';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export type Context = {
  userId: string | null;
};

export function createContext(_opts: CreateExpressContextOptions): Context {
  // MVP: pas d'auth ici. Plus tard, on branchera Firebase Auth (JWT/ID token) et Firestore.
  return { userId: null };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ text: z.string().optional() }).optional())
    .query(({ input }) => {
      const text = input?.text ?? 'monorepo';
      return { message: `Bonjour ${text} — tRPC OK` };
    }),
});

export type AppRouter = typeof appRouter;


