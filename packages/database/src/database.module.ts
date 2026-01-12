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

@Global()
@Module({
  providers: [
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


