import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import cors from 'cors';
import { AppModule } from './app.module.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '@taskly/trpc';
import { FIREBASE_AUTH } from '@taskly/firebase';
import { UsersService, WorkspacesService } from '@taskly/database';

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
  const workspacesService = app.get(WorkspacesService);

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

        const workspaces = {
          createWorkspace: workspacesService.createWorkspace.bind(workspacesService),
          getWorkspaceById: workspacesService.getWorkspaceById.bind(workspacesService),
          updateWorkspace: workspacesService.updateWorkspace.bind(workspacesService),
          archiveWorkspace: workspacesService.archiveWorkspace.bind(workspacesService),
          listWorkspacesForUser: workspacesService.listWorkspacesForUser.bind(workspacesService),

          getMember: workspacesService.getMember.bind(workspacesService),
          upsertMember: workspacesService.upsertMember.bind(workspacesService),
          removeMember: workspacesService.removeMember.bind(workspacesService),
          listMembers: workspacesService.listMembers.bind(workspacesService),
          countMembers: workspacesService.countMembers.bind(workspacesService),
          countAdmins: workspacesService.countAdmins.bind(workspacesService),

          listBoards: workspacesService.listBoards.bind(workspacesService),
          createBoard: workspacesService.createBoard.bind(workspacesService),
          archiveBoard: workspacesService.archiveBoard.bind(workspacesService),
          reorderBoards: workspacesService.reorderBoards.bind(workspacesService),

          createInvitation: workspacesService.createInvitation.bind(workspacesService),
          listPendingInvitations: workspacesService.listPendingInvitations.bind(workspacesService),
          getInvitation: workspacesService.getInvitation.bind(workspacesService),
          cancelInvitation: workspacesService.cancelInvitation.bind(workspacesService),
          acceptInvitationByToken: workspacesService.acceptInvitationByToken.bind(workspacesService),
          declineInvitationByToken: workspacesService.declineInvitationByToken.bind(workspacesService),
        };

        if (!token) {
          return { user: null, users, workspaces };
        }

        try {
          const decoded = await firebaseAuth.verifyIdToken(token);
          const user = await usersService.ensureUserExists(decoded);
          return { user, users, workspaces };
        } catch {
          return { user: null, users, workspaces };
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


