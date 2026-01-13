import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import cors from 'cors';
import util from 'node:util';
import { AppModule } from './app.module.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { FIREBASE_ADMIN_APP, FIREBASE_AUTH } from '@taskly/firebase';
import {
  ActivityLogsService,
  BoardsService,
  NotificationsService,
  TicketRemindersService,
  TicketsService,
  UsersService,
  WorkspacesService,
} from '@taskly/database';
import type { AppRouter, Context } from '@taskly/trpc';
import { GcsService } from './gcs/gcs.service.js';
import crypto from 'node:crypto';

function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (!type || type.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, '_').trim();
  return base.slice(0, 200) || 'file';
}

function buildObjectPath(boardId: string, ticketId: string, filename: string): string {
  const safe = sanitizeFilename(filename);
  const rand = crypto.randomBytes(8).toString('hex');
  return `boards/${boardId}/tickets/${ticketId}/${rand}-${safe}`;
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
  const ticketRemindersService = app.get(TicketRemindersService);
  const notificationsService = app.get(NotificationsService);
  const activityLogsService = app.get(ActivityLogsService);
  const gcsService = app.get(GcsService);

  const mod = await import('@taskly/trpc');
  const appRouter = (mod as { appRouter: AppRouter }).appRouter;

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

          listLabels: boardsService.listLabels.bind(boardsService),
          createLabel: boardsService.createLabel.bind(boardsService),
          updateLabel: boardsService.updateLabel.bind(boardsService),
          deleteLabel: boardsService.deleteLabel.bind(boardsService),
          reorderLabels: boardsService.reorderLabels.bind(boardsService),

          listTickets: boardsService.listTickets.bind(boardsService),
          listTicketsByColumn: boardsService.listTicketsByColumn.bind(boardsService),
          createTicket: boardsService.createTicket.bind(boardsService),
          moveTicket: boardsService.moveTicket.bind(boardsService),
          archiveTicket: boardsService.archiveTicket.bind(boardsService),
        };

        const makeTickets = (actorId: string | null) => ({
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

          getLabelIds: ticketsService.getLabelIds.bind(ticketsService),
          addLabel: ticketsService.addLabel.bind(ticketsService),
          removeLabel: ticketsService.removeLabel.bind(ticketsService),

          listChecklists: ticketsService.listChecklists.bind(ticketsService),
          createChecklist: ticketsService.createChecklist.bind(ticketsService),
          updateChecklist: ticketsService.updateChecklist.bind(ticketsService),
          deleteChecklist: ticketsService.deleteChecklist.bind(ticketsService),
          reorderChecklists: ticketsService.reorderChecklists.bind(ticketsService),

          addChecklistItem: ticketsService.addChecklistItem.bind(ticketsService),
          updateChecklistItem: ticketsService.updateChecklistItem.bind(ticketsService),
          deleteChecklistItem: ticketsService.deleteChecklistItem.bind(ticketsService),
          reorderChecklistItems: ticketsService.reorderChecklistItems.bind(ticketsService),

          listAttachments: ticketsService.listAttachments.bind(ticketsService),
          createAttachmentUpload: async (
            ticketId: string,
            input: { filename: string; contentType: string; resumable?: boolean },
          ) => {
            if (!actorId) throw new Error('Unauthorized');

            const t = await ticketsService.getById(ticketId);
            if (!t) throw new Error('Ticket not found');

            const filename = sanitizeFilename(input.filename);
            const contentType = input.contentType.trim() || 'application/octet-stream';
            const objectPath = buildObjectPath(t.boardId, ticketId, filename);

            const attachment = await ticketsService.createAttachmentRecord(ticketId, {
              createdBy: actorId,
              filename,
              contentType,
              objectPath,
            });

            const upload = await gcsService.signedUploadUrl({
              objectPath,
              contentType,
              resumable: input.resumable ?? true,
            });
            return { attachment, upload };
          },
          completeAttachment: ticketsService.completeAttachment.bind(ticketsService),
          getAttachmentDownload: async (ticketId: string, attachmentId: string) => {
            const att = await ticketsService.getAttachment(ticketId, attachmentId);
            if (!att) throw new Error('Attachment not found');
            if (att.status !== 'uploaded') throw new Error('Attachment not uploaded yet');
            const download = await gcsService.signedDownloadUrl({ objectPath: att.objectPath });
            return { attachment: att, download };
          },
          removeAttachment: async (ticketId: string, attachmentId: string) => {
            const att = await ticketsService.deleteAttachmentRecord(ticketId, attachmentId);
            if (att) await gcsService.deleteObject(att.objectPath);
          },
        });

        const notifications = {
          create: notificationsService.create.bind(notificationsService),
          list: notificationsService.list.bind(notificationsService),
          countUnread: notificationsService.countUnread.bind(notificationsService),
          markRead: notificationsService.markRead.bind(notificationsService),
          markAllRead: notificationsService.markAllRead.bind(notificationsService),
        };

        const ticketReminders = {
          list: (ticketId: string, input: { userId: string }) => ticketRemindersService.listForUser(ticketId, input.userId),
          create: (ticketId: string, input: { userId: string; remindAt: string }) =>
            ticketRemindersService.createForUser(ticketId, { userId: input.userId, remindAt: input.remindAt }),
          remove: (ticketId: string, reminderId: string, input: { userId: string }) =>
            ticketRemindersService.removeForUser(ticketId, reminderId, input.userId),
        };

        const activityLogs = {
          create: activityLogsService.create.bind(activityLogsService),
          listForBoard: activityLogsService.listForBoard.bind(activityLogsService),
          listForTicket: activityLogsService.listForTicket.bind(activityLogsService),
        };

        if (!token) {
          return { user: null, users, workspaces, boards, tickets: makeTickets(null), ticketReminders, notifications, activityLogs };
        }

        try {
          const decoded = await firebaseAuth.verifyIdToken(token);
          const user = await usersService.ensureUserExists(decoded);
          return { user, users, workspaces, boards, tickets: makeTickets(user.id), ticketReminders, notifications, activityLogs };
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            const err = e as { message?: string; code?: string };
            // eslint-disable-next-line no-console
            console.warn('[trpc] verifyIdToken failed', { code: err?.code, message: err?.message });
          }
          return { user: null, users, workspaces, boards, tickets: makeTickets(null), ticketReminders, notifications, activityLogs };
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


