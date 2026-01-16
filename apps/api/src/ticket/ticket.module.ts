/**
 * Ticket Module
 *
 * Provides REST endpoints for ticket management and reminders.
 * 
 * Controllers:
 * - TicketController: Public ticket operations (CRUD, comments, assignments, attachments)
 * - TicketRemindersController: Internal endpoint for scheduled reminder dispatch
 *
 * Features:
 * - Ticket CRUD (create, read, update, archive)
 * - Comments and discussions
 * - Assignee management
 * - Label assignment
 * - Checklists with items
 * - File attachments with GCS signed URLs
 * - Watch status for notifications
 * - Ticket reminders with scheduled dispatch
 *
 * All public endpoints require Firebase authentication.
 * Access is controlled by workspace membership and ticket-level permissions.
 * 
 * Related Services:
 * - TicketAccessService: Authorization and permission checks
 * - GcsService: Google Cloud Storage for file uploads/downloads
 * - TicketRemindersDispatcherService: Scheduled reminder dispatch
 */

import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller.js';
import { TicketRemindersController } from './ticket-reminders.controller.js';
import { TicketAccessService } from './ticket-access.service.js';
import { GcsService } from '../gcs/gcs.service.js';
import { TicketRemindersDispatcherService } from './ticket-reminders-dispatcher.service.js';

@Module({
  controllers: [TicketController, TicketRemindersController],
  providers: [TicketAccessService, GcsService, TicketRemindersDispatcherService],
})
export class TicketModule {}


