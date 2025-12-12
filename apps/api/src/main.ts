import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import cors from 'cors';
import { AppModule } from './app.module.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '@taskly/trpc';
import { FIREBASE_AUTH } from '@taskly/firebase';
import { UsersService } from '@taskly/database';

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (!type || type.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

async function bootstrap() {
  const server = express();

  // CORS au niveau Express, pour couvrir aussi le middleware tRPC monté sur Express.
  server.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
      credentials: true,
    }),
  );

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  // Optionnel: Nest gère aussi CORS pour ses routes (ex: /health).
  // On le laisse, mais l'important est le middleware Express ci-dessus.
  app.enableCors();

  const firebaseAuth = app.get(FIREBASE_AUTH) as unknown as {
    verifyIdToken: (token: string) => Promise<{ uid: string } & Record<string, unknown>>;
  };
  const usersService = app.get(UsersService);

  // tRPC endpoint (after Nest is created, so we can reuse its providers)
  server.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext: async ({ req }) => {
        const token = extractBearerToken(req.headers.authorization);

        const users = {
          getById: usersService.getById.bind(usersService),
          search: usersService.search.bind(usersService),
          updateMe: usersService.updateMe.bind(usersService),
          deleteMe: usersService.deleteMe.bind(usersService),
        };

        if (!token) {
          return { user: null, users };
        }

        try {
          const decoded = await firebaseAuth.verifyIdToken(token);
          const user = await usersService.ensureUserExists(decoded);
          return { user, users };
        } catch {
          return { user: null, users };
        }
      },
    }),
  );

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);
}

bootstrap();


