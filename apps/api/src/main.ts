import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import cors from 'cors';
import util from 'node:util';
import { createRequire } from 'node:module';
import { access } from 'node:fs/promises';
import { AppModule } from './app.module.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { FIREBASE_ADMIN_APP, FIREBASE_AUTH } from '@taskly/firebase';
import { BoardsService, TicketsService, UsersService, WorkspacesService } from '@taskly/database';
import type { AppRouter, Context } from '@taskly/trpc';

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (!type || type.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

async function bootstrap() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/7e54a11d-8189-469f-bb83-095a429868a4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'apps/api/src/main.ts:bootstrap',message:'bootstrap start',data:{cwd:process.cwd(),node:process.version,platform:process.platform},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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
  if (process.env.NODE_ENV !== 'production') {
    try {
      const firebaseApp = app.get(FIREBASE_ADMIN_APP) as unknown as { options?: { projectId?: string } };
      // Note: firestore.projectId may throw "Client is not yet ready", so we don't touch it here.
      // eslint-disable-next-line no-console
      console.log('[firebase-admin] effective projectId', {
        appProjectId: firebaseApp?.options?.projectId ?? null,
        envProjectId: process.env.FIREBASE_PROJECT_ID ?? null,
        envGoogleCloudProject: process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? null,
        envNextPublicProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[firebase-admin] could not log effective projectId', e);
    }
  }
  const usersService = app.get(UsersService);
  const workspacesService = app.get(WorkspacesService);
  const boardsService = app.get(BoardsService);
  const ticketsService = app.get(TicketsService);

  // Resolve + load @taskly/trpc at runtime so we can log what actually happens (race vs link issue).
  const require = createRequire(import.meta.url);
  let trpcResolved: string | null = null;
  try {
    trpcResolved = require.resolve('@taskly/trpc');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7e54a11d-8189-469f-bb83-095a429868a4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B',location:'apps/api/src/main.ts:trpc-resolve',message:'require.resolve(@taskly/trpc) succeeded',data:{resolved:trpcResolved},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  } catch (e) {
    const err = e as { message?: string; code?: string };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7e54a11d-8189-469f-bb83-095a429868a4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B',location:'apps/api/src/main.ts:trpc-resolve',message:'require.resolve(@taskly/trpc) failed',data:{code:err?.code ?? null,message:err?.message ?? String(e)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }

  if (trpcResolved) {
    try {
      await access(trpcResolved);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7e54a11d-8189-469f-bb83-095a429868a4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'apps/api/src/main.ts:trpc-access',message:'resolved entry exists on disk',data:{resolved:trpcResolved},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    } catch (e) {
      const err = e as { message?: string; code?: string };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7e54a11d-8189-469f-bb83-095a429868a4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'apps/api/src/main.ts:trpc-access',message:'resolved entry missing on disk (likely build race or link issue)',data:{resolved:trpcResolved,code:err?.code ?? null,message:err?.message ?? String(e)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }
  }

  let appRouter: AppRouter;
  try {
    const mod = await import('@taskly/trpc');
    appRouter = (mod as { appRouter: AppRouter }).appRouter;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7e54a11d-8189-469f-bb83-095a429868a4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'apps/api/src/main.ts:trpc-import',message:'dynamic import(@taskly/trpc) succeeded',data:{exports:Object.keys(mod as object),hasAppRouter:!!appRouter},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  } catch (e) {
    const err = e as { message?: string; code?: string; stack?: string };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7e54a11d-8189-469f-bb83-095a429868a4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A',location:'apps/api/src/main.ts:trpc-import',message:'dynamic import(@taskly/trpc) failed',data:{code:err?.code ?? null,message:err?.message ?? String(e),stack:(err?.stack ?? '').split('\n').slice(0,6).join('\n')},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw e;
  }

  // tRPC endpoint (after Nest is created, so we can reuse its providers)
  server.use(
    '/trpc',
    createExpressMiddleware<AppRouter>({
      router: appRouter,
      onError({ error, path, type, req }) {
        if (process.env.NODE_ENV !== 'production') {
          const cause = error.cause as
            | {
                message?: string;
                code?: string | number;
                details?: unknown;
                note?: unknown;
                statusDetails?: unknown;
                metadata?: { getMap?: () => unknown };
                stack?: string;
              }
            | undefined;
          // eslint-disable-next-line no-console
          console.error('[trpc] request failed', {
            path,
            type,
            code: error.code,
            message: error.message,
            causeMessage: cause?.message ?? (error.cause as unknown),
            causeCode: cause?.code,
            causeDetails: cause?.details,
            causeNote: cause?.note,
            causeStatusDetails: cause?.statusDetails,
            causeMetadata: cause?.metadata?.getMap?.(),
            errorStack: error.stack,
            hasAuthHeader: Boolean(req.headers.authorization),
          });
          if (cause) {
            // eslint-disable-next-line no-console
            console.error('[trpc] raw cause (inspect)', util.inspect(cause, { depth: 8 }));
          }
        }
      },
      createContext: async ({ req }): Promise<Context> => {
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
          unarchiveWorkspace: workspacesService.unarchiveWorkspace.bind(workspacesService),
          listWorkspacesForUser: workspacesService.listWorkspacesForUser.bind(workspacesService),
          listArchivedWorkspacesForUser: workspacesService.listArchivedWorkspacesForUser.bind(workspacesService),

          getMember: workspacesService.getMember.bind(workspacesService),
          upsertMember: workspacesService.upsertMember.bind(workspacesService),
          removeMember: workspacesService.removeMember.bind(workspacesService),
          listMembers: workspacesService.listMembers.bind(workspacesService),
          countMembers: workspacesService.countMembers.bind(workspacesService),
          countAdmins: workspacesService.countAdmins.bind(workspacesService),

          createInvitation: workspacesService.createInvitation.bind(workspacesService),
          listPendingInvitations: workspacesService.listPendingInvitations.bind(workspacesService),
          getInvitation: workspacesService.getInvitation.bind(workspacesService),
          cancelInvitation: workspacesService.cancelInvitation.bind(workspacesService),
          acceptInvitationByToken: workspacesService.acceptInvitationByToken.bind(workspacesService),
          declineInvitationByToken: workspacesService.declineInvitationByToken.bind(workspacesService),
        };

        const boards = {
          getBoardById: boardsService.getBoardById.bind(boardsService),
          updateBoard: boardsService.updateBoard.bind(boardsService),
          archiveBoard: boardsService.archiveBoard.bind(boardsService),

          listBoardsForWorkspace: boardsService.listBoardsForWorkspace.bind(boardsService),
          createBoard: boardsService.createBoard.bind(boardsService),
          reorderBoards: boardsService.reorderBoards.bind(boardsService),

          listColumns: boardsService.listColumns.bind(boardsService),
          createColumn: boardsService.createColumn.bind(boardsService),
          updateColumn: boardsService.updateColumn.bind(boardsService),
          deleteColumn: boardsService.deleteColumn.bind(boardsService),
          reorderColumns: boardsService.reorderColumns.bind(boardsService),

          listTickets: boardsService.listTickets.bind(boardsService),
          listTicketsByColumn: boardsService.listTicketsByColumn.bind(boardsService),
          createTicket: boardsService.createTicket.bind(boardsService),
          moveTicket: boardsService.moveTicket.bind(boardsService),
          archiveTicket: boardsService.archiveTicket.bind(boardsService),
        };

        const tickets = {
          getById: ticketsService.getById.bind(ticketsService),
          update: ticketsService.update.bind(ticketsService),
          archive: ticketsService.archive.bind(ticketsService),

          listComments: ticketsService.listComments.bind(ticketsService),
          addComment: ticketsService.addComment.bind(ticketsService),
          updateComment: ticketsService.updateComment.bind(ticketsService),
          deleteComment: ticketsService.deleteComment.bind(ticketsService),

          getAssigneeIds: ticketsService.getAssigneeIds.bind(ticketsService),
          addAssignee: ticketsService.addAssignee.bind(ticketsService),
          removeAssignee: ticketsService.removeAssignee.bind(ticketsService),
        };

        if (!token) {
          return { user: null, users, workspaces, boards, tickets };
        }

        try {
          const decoded = await firebaseAuth.verifyIdToken(token);
          const user = await usersService.ensureUserExists(decoded);
          return { user, users, workspaces, boards, tickets };
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            const err = e as { message?: string; code?: string };
            // eslint-disable-next-line no-console
            console.warn('[trpc] verifyIdToken failed', { code: err?.code, message: err?.message });
          }
          return { user: null, users, workspaces, boards, tickets };
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


