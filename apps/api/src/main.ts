import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import cors from 'cors';
import { AppModule } from './app.module.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '@taskly/trpc';
import { FIREBASE_AUTH } from '@taskly/firebase';
import { BoardsService, TicketsService, UsersService, WorkspacesService } from '@taskly/database';

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
  const boardsService = app.get(BoardsService);
  const ticketsService = app.get(TicketsService);

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
        } catch {
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


