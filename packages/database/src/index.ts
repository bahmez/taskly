/**
 * Database Package Exports
 *
 * Exports all database services, stores, and types for Firestore operations.
 * 
 * Organization:
 * - DatabaseModule: NestJS module for dependency injection
 * - Stores: Low-level Firestore CRUD operations
 * - Services: High-level business logic built on stores
 * - Models: TypeScript types for all entities
 *
 * Entities:
 * - Users: User profiles and avatars
 * - Workspaces: Workspaces, members, and invitations
 * - Boards: Boards, columns, and labels
 * - Tickets: Tickets, comments, checklists, attachments
 * - Ticket Reminders: Reminder scheduling
 * - Notifications: User notifications
 * - Activity Logs: Activity tracking
 */

// Module
export { DatabaseModule } from './database.module';

// User types and services
export type {
  UserAvatar,
  UserAvatarBackground,
  UserAvatarBackgroundImage,
  UserAvatarImage,
  UserModel,
  UserCreateInput,
  UserUpdateInput,
} from './users/user.model';
export { UsersStore } from './users/users.store';
export { UsersService } from './users/users.service';

// Workspace types and services
export type {
  WorkspaceModel,
  WorkspaceCreateInput,
  WorkspaceUpdateInput,
  WorkspaceRole,
  WorkspaceMemberModel,
  WorkspaceInvitationModel,
} from './workspaces/workspace.model';
export { WorkspacesStore } from './workspaces/workspaces.store';
export { WorkspacesService } from './workspaces/workspaces.service';

// Board types and services
export type {
  BoardBackground,
  BoardBackgroundImage,
  BoardModel,
  BoardCreateInput,
  BoardUpdateInput,
  BoardColumnModel,
  BoardColumnCreateInput,
  BoardColumnUpdateInput,
  BoardLabelModel,
  BoardLabelCreateInput,
  BoardLabelUpdateInput,
} from './boards/board.model';
export { BoardsStore } from './boards/boards.store';
export { BoardsService } from './boards/boards.service';

// Ticket types and services
export type {
  TicketModel,
  TicketCreateInput,
  TicketUpdateInput,
  TicketCommentModel,
  TicketChecklistModel,
  TicketChecklistItemModel,
  TicketAttachmentModel,
  TicketAttachmentStatus,
  TicketWatchOverrideModel,
} from './tickets/ticket.model';
export { TicketsStore } from './tickets/tickets.store';
export { TicketsService } from './tickets/tickets.service';

// Ticket reminder types and services
export type { TicketReminderModel, TicketReminderCreateInput } from './tickets/ticket-reminder.model';
export { TicketRemindersStore } from './tickets/ticket-reminders.store';
export { TicketRemindersService } from './tickets/ticket-reminders.service';

// Notification types and services
export type { NotificationModel, NotificationCreateInput, NotificationType } from './notifications/notification.model';
export { NotificationsStore } from './notifications/notifications.store';
export { NotificationsService } from './notifications/notifications.service';

// Activity log types and services
export type { ActivityLogModel, ActivityLogCreateInput, ActivityLogType } from './activity-logs/activity-log.model';
export { ActivityLogsStore } from './activity-logs/activity-logs.store';
export { ActivityLogsService } from './activity-logs/activity-logs.service';


