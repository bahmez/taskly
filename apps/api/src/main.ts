/**
 * Taskly API Entry Point
 *
 * This is the main bootstrap file for the Taskly API server.
 * It initializes:
 * - Express server with CORS configuration
 * - NestJS application with Swagger documentation
 * - Firebase authentication and tRPC middleware
 * - Database services and Google Cloud Storage integration
 *
 * The API serves both REST endpoints (via NestJS controllers)
 * and tRPC procedures mounted at /trpc.
 */

import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
import { BoardBackgroundsService } from './board/board-backgrounds.service.js';
import crypto from 'node:crypto';

/**
 * Extracts and validates a Bearer token from the Authorization header.
 * @param header - The Authorization header value
 * @returns The JWT token if valid, or null if missing/invalid format
 */
function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (!type || type.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/**
 * Sanitizes a filename by removing path separators and limiting length.
 * @param name - The filename to sanitize
 * @returns Sanitized filename (max 200 chars)
 */
function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, '_').trim();
  return base.slice(0, 200) || 'file';
}

/**
 * Builds a GCS object path for ticket attachments.
 * Includes board/ticket hierarchy and random suffix for uniqueness.
 * @param boardId - The board ID
 * @param ticketId - The ticket ID
 * @param filename - The original filename
 * @returns GCS object path: boards/{boardId}/tickets/{ticketId}/{randomHex}-{filename}
 */
function buildObjectPath(boardId: string, ticketId: string, filename: string): string {
  const safe = sanitizeFilename(filename);
  const rand = crypto.randomBytes(8).toString('hex');
  return `boards/${boardId}/tickets/${ticketId}/${rand}-${safe}`;
}

/**
 * Builds a GCS object path for user avatar images.
 * Includes user hierarchy and random suffix for uniqueness.
 * @param userId - The user ID
 * @param filename - The original filename
 * @returns GCS object path: users/{userId}/avatar/{randomHex}-{filename}
 */
function buildUserAvatarPath(userId: string, filename: string): string {
  const safe = sanitizeFilename(filename);
  const rand = crypto.randomBytes(8).toString('hex');
  return `users/${userId}/avatar/${rand}-${safe}`;
}

/**
 * Bootstrap function that initializes the entire API server.
 * Sets up Express, NestJS, Swagger, Swagger authentication, and tRPC.
 */
async function bootstrap() {
  // Initialize Express server instance
  const server = express();

  // Apply CORS middleware at Express level to cover both REST and tRPC routes
  server.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
      credentials: true,
    }),
  );

  // Create and initialize NestJS application with Express adapter
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  // Also enable CORS at NestJS level (for /health and other direct routes)
  app.enableCors();

  // Configure Swagger/OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Taskly API')
    .setDescription('REST API documentation for Taskly - workspace, board, and ticket management system')
    .setVersion('1.0')
    // Configure Bearer token authentication for Swagger UI
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  // Setup Swagger UI at /docs endpoint with persistent auth
  SwaggerModule.setup('/docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Retrieve Firebase authentication service for token verification
  const firebaseAuth = app.get(FIREBASE_AUTH) as unknown as {
    verifyIdToken: (token: string) => Promise<{ uid: string } & Record<string, unknown>>;
  };

  // Log Firebase configuration in development mode
  if (process.env.NODE_ENV !== 'production') {
    try {
      const firebaseApp = app.get(FIREBASE_ADMIN_APP) as unknown as { options?: { projectId?: string } };
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

  // Retrieve all database and service providers from NestJS container
  const usersService = app.get(UsersService);
  const workspacesService = app.get(WorkspacesService);
  const boardsService = app.get(BoardsService);
  const boardBackgroundsService = app.get(BoardBackgroundsService);
  const ticketsService = app.get(TicketsService);
  const ticketRemindersService = app.get(TicketRemindersService);
  const notificationsService = app.get(NotificationsService);
  const activityLogsService = app.get(ActivityLogsService);
  const gcsService = app.get(GcsService);

  // Dynamically import tRPC app router
  const mod = await import('@taskly/trpc');
  const appRouter = (mod as { appRouter: AppRouter }).appRouter;

  // Mount tRPC middleware on Express server
  // This must be after NestJS is created so we can reuse its providers
  server.use(
    '/trpc',
    createExpressMiddleware<AppRouter>({
      router: appRouter,
      // Error handler for tRPC procedures
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
      // Create tRPC context with authenticated user and database services
      createContext: async ({ req }): Promise<Context> => {
        // Extract and validate Bearer token from request headers
        const token = extractBearerToken(req.headers.authorization);

        // User service wrapper with additional GCS operations
        const users = {
          getById: usersService.getById.bind(usersService),
          search: usersService.search.bind(usersService),
          updateMe: usersService.updateMe.bind(usersService),
          deleteMe: usersService.deleteMe.bind(usersService),
          // Generate signed upload URL for user avatar
          createAvatarUpload: async (userId: string, input: { filename: string; contentType: string; resumable?: boolean }) => {
            const filename = sanitizeFilename(input.filename);
            const contentType = input.contentType.trim() || 'application/octet-stream';
            const objectPath = buildUserAvatarPath(userId, filename);
            const upload = await gcsService.signedUploadUrl({
              objectPath,
              contentType,
              resumable: input.resumable ?? false,
            });
            return { objectPath, upload };
          },
          // Generate signed download URL for user avatar
          getAvatarDownload: async (objectPath: string) => {
            return await gcsService.signedDownloadUrl({ objectPath });
          },
        };

        // Workspace service wrapper with member and invitation operations
        const workspaces = {
          createWorkspace: workspacesService.createWorkspace.bind(workspacesService),
          getWorkspaceById: workspacesService.getWorkspaceById.bind(workspacesService),
          updateWorkspace: workspacesService.updateWorkspace.bind(workspacesService),
          archiveWorkspace: workspacesService.archiveWorkspace.bind(workspacesService),
          unarchiveWorkspace: workspacesService.unarchiveWorkspace.bind(workspacesService),
          listWorkspacesForUser: workspacesService.listWorkspacesForUser.bind(workspacesService),
          listArchivedWorkspacesForUser: workspacesService.listArchivedWorkspacesForUser.bind(workspacesService),
          // Member management
          getMember: workspacesService.getMember.bind(workspacesService),
          upsertMember: workspacesService.upsertMember.bind(workspacesService),
          removeMember: workspacesService.removeMember.bind(workspacesService),
          listMembers: workspacesService.listMembers.bind(workspacesService),
          countMembers: workspacesService.countMembers.bind(workspacesService),
          countAdmins: workspacesService.countAdmins.bind(workspacesService),
          // Invitation management
          createInvitation: workspacesService.createInvitation.bind(workspacesService),
          listPendingInvitations: workspacesService.listPendingInvitations.bind(workspacesService),
          getInvitation: workspacesService.getInvitation.bind(workspacesService),
          cancelInvitation: workspacesService.cancelInvitation.bind(workspacesService),
          acceptInvitationByToken: workspacesService.acceptInvitationByToken.bind(workspacesService),
          declineInvitationByToken: workspacesService.declineInvitationByToken.bind(workspacesService),
        };

        // Board service wrapper with columns, labels, and tickets operations
        const boards = {
          // Board CRUD
          getBoardById: boardsService.getBoardById.bind(boardsService),
          updateBoard: boardsService.updateBoard.bind(boardsService),
          archiveBoard: boardsService.archiveBoard.bind(boardsService),
          // Board listing and reordering
          listBoardsForWorkspace: boardsService.listBoardsForWorkspace.bind(boardsService),
          createBoard: boardsService.createBoard.bind(boardsService),
          reorderBoards: boardsService.reorderBoards.bind(boardsService),
          // Column management
          listColumns: boardsService.listColumns.bind(boardsService),
          createColumn: boardsService.createColumn.bind(boardsService),
          updateColumn: boardsService.updateColumn.bind(boardsService),
          deleteColumn: boardsService.deleteColumn.bind(boardsService),
          reorderColumns: boardsService.reorderColumns.bind(boardsService),
          // Label management
          listLabels: boardsService.listLabels.bind(boardsService),
          createLabel: boardsService.createLabel.bind(boardsService),
          updateLabel: boardsService.updateLabel.bind(boardsService),
          deleteLabel: boardsService.deleteLabel.bind(boardsService),
          reorderLabels: boardsService.reorderLabels.bind(boardsService),
          // Ticket querying and movement
          listTickets: boardsService.listTickets.bind(boardsService),
          listTicketsByColumn: boardsService.listTicketsByColumn.bind(boardsService),
          createTicket: boardsService.createTicket.bind(boardsService),
          moveTicket: boardsService.moveTicket.bind(boardsService),
          archiveTicket: boardsService.archiveTicket.bind(boardsService),
        };

        // Board backgrounds service wrapper
        const boardBackgrounds = {
          list: boardBackgroundsService.list.bind(boardBackgroundsService),
        };

        /**
         * Factory function to create ticket service wrapper with role-based authorization.
         * @param actorId - The ID of the user performing actions (null for unauthenticated)
         * @returns Ticket service wrapper with methods bound to the current actor
         */
        const makeTickets = (actorId: string | null) => ({
          // Ticket CRUD
          getById: ticketsService.getById.bind(ticketsService),
          update: ticketsService.update.bind(ticketsService),
          archive: ticketsService.archive.bind(ticketsService),
          // Comments
          listComments: ticketsService.listComments.bind(ticketsService),
          addComment: ticketsService.addComment.bind(ticketsService),
          updateComment: ticketsService.updateComment.bind(ticketsService),
          deleteComment: ticketsService.deleteComment.bind(ticketsService),
          // Assignees
          getAssigneeIds: ticketsService.getAssigneeIds.bind(ticketsService),
          addAssignee: ticketsService.addAssignee.bind(ticketsService),
          removeAssignee: ticketsService.removeAssignee.bind(ticketsService),
          // Watch status for notifications
          getWatchStatus: ticketsService.getWatchStatus.bind(ticketsService),
          setWatchStatus: ticketsService.setWatchStatus.bind(ticketsService),
          listWatchUserIds: ticketsService.listWatchUserIds.bind(ticketsService),
          // Labels
          getLabelIds: ticketsService.getLabelIds.bind(ticketsService),
          addLabel: ticketsService.addLabel.bind(ticketsService),
          removeLabel: ticketsService.removeLabel.bind(ticketsService),
          // Checklists and items
          listChecklists: ticketsService.listChecklists.bind(ticketsService),
          createChecklist: ticketsService.createChecklist.bind(ticketsService),
          updateChecklist: ticketsService.updateChecklist.bind(ticketsService),
          deleteChecklist: ticketsService.deleteChecklist.bind(ticketsService),
          reorderChecklists: ticketsService.reorderChecklists.bind(ticketsService),
          addChecklistItem: ticketsService.addChecklistItem.bind(ticketsService),
          updateChecklistItem: ticketsService.updateChecklistItem.bind(ticketsService),
          deleteChecklistItem: ticketsService.deleteChecklistItem.bind(ticketsService),
          reorderChecklistItems: ticketsService.reorderChecklistItems.bind(ticketsService),
          // Attachments with GCS signed URLs
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

        // Notifications service wrapper
        const notifications = {
          create: notificationsService.create.bind(notificationsService),
          list: notificationsService.list.bind(notificationsService),
          countUnread: notificationsService.countUnread.bind(notificationsService),
          markRead: notificationsService.markRead.bind(notificationsService),
          markAllRead: notificationsService.markAllRead.bind(notificationsService),
        };

        // Ticket reminders service wrapper
        const ticketReminders = {
          list: (ticketId: string, input: { userId: string }) => ticketRemindersService.listForUser(ticketId, input.userId),
          create: (ticketId: string, input: { userId: string; remindAt: string }) =>
            ticketRemindersService.createForUser(ticketId, { userId: input.userId, remindAt: input.remindAt }),
          remove: (ticketId: string, reminderId: string, input: { userId: string }) =>
            ticketRemindersService.removeForUser(ticketId, reminderId, input.userId),
        };

        // Activity logs service wrapper
        const activityLogs = {
          create: activityLogsService.create.bind(activityLogsService),
          listForBoard: activityLogsService.listForBoard.bind(activityLogsService),
          listForTicket: activityLogsService.listForTicket.bind(activityLogsService),
        };

        // If no token provided, return unauthenticated context
        if (!token) {
          return {
            user: null,
            users,
            workspaces,
            boards,
            boardBackgrounds,
            tickets: makeTickets(null),
            ticketReminders,
            notifications,
            activityLogs,
          };
        }

        // Verify JWT token with Firebase and return authenticated context
        try {
          const decoded = await firebaseAuth.verifyIdToken(token);
          const user = await usersService.ensureUserExists(decoded);
          return {
            user,
            users,
            workspaces,
            boards,
            boardBackgrounds,
            tickets: makeTickets(user.id),
            ticketReminders,
            notifications,
            activityLogs,
          };
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            const err = e as { message?: string; code?: string };
            // eslint-disable-next-line no-console
            console.warn('[trpc] verifyIdToken failed', { code: err?.code, message: err?.message });
          }
          // Return unauthenticated context on token verification failure
          return {
            user: null,
            users,
            workspaces,
            boards,
            boardBackgrounds,
            tickets: makeTickets(null),
            ticketReminders,
            notifications,
            activityLogs,
          };
        }
      },
    }),
  );

  // Start server on configured port (default 4000)
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);
}

bootstrap();


