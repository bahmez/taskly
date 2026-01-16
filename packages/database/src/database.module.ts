/**
 * Database Module
 *
 * Provides all database services and stores for Firestore integration.
 * Global module - automatically imported everywhere, no need to import in features.
 *
 * Architecture:
 * - Stores: Low-level Firestore operations (CRUD, queries)
 * - Services: High-level business logic built on stores
 *
 * Provides services for:
 * - Users: User profiles and data
 * - Workspaces: Workspace management and members
 * - Boards: Board and column operations
 * - Tickets: Ticket CRUD and comments
 * - Ticket Reminders: Reminder scheduling and dispatch
 * - Notifications: User notifications
 * - Activity Logs: Activity tracking
 */

import { Global, Module } from '@nestjs/common';
import { UsersStore } from './users/users.store';
import { UsersService } from './users/users.service';
import { WorkspacesStore } from './workspaces/workspaces.store';
import { WorkspacesService } from './workspaces/workspaces.service';
import { BoardsStore } from './boards/boards.store';
import { BoardsService } from './boards/boards.service';
import { TicketsStore } from './tickets/tickets.store';
import { TicketsService } from './tickets/tickets.service';
import { TicketRemindersStore } from './tickets/ticket-reminders.store';
import { TicketRemindersService } from './tickets/ticket-reminders.service';
import { NotificationsStore } from './notifications/notifications.store';
import { NotificationsService } from './notifications/notifications.service';
import { ActivityLogsStore } from './activity-logs/activity-logs.store';
import { ActivityLogsService } from './activity-logs/activity-logs.service';

/**
 * Global database module providing all Firestore-based services.
 * Automatically available in all modules without explicit import.
 */
@Global()
@Module({
  providers: [
    // User services
    UsersStore,
    UsersService,
    // Workspace services
    WorkspacesStore,
    WorkspacesService,
    // Board services
    BoardsStore,
    BoardsService,
    // Ticket services
    TicketsStore,
    TicketsService,
    TicketRemindersStore,
    TicketRemindersService,
    // Notification services
    NotificationsStore,
    NotificationsService,
    // Activity log services
    ActivityLogsStore,
    ActivityLogsService,
  ],
  // Export all services for use in other modules
  exports: [
    UsersStore,
    UsersService,
    WorkspacesStore,
    WorkspacesService,
    BoardsStore,
    BoardsService,
    TicketsStore,
    TicketsService,
    TicketRemindersStore,
    TicketRemindersService,
    NotificationsStore,
    NotificationsService,
    ActivityLogsStore,
    ActivityLogsService,
  ],
})
export class DatabaseModule {}


