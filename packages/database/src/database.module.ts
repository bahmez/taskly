import { Global, Module } from '@nestjs/common';
import { UsersStore } from './users/users.store';
import { UsersService } from './users/users.service';
import { WorkspacesStore } from './workspaces/workspaces.store';
import { WorkspacesService } from './workspaces/workspaces.service';
import { BoardsStore } from './boards/boards.store';
import { BoardsService } from './boards/boards.service';
import { TicketsStore } from './tickets/tickets.store';
import { TicketsService } from './tickets/tickets.service';

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
  ],
})
export class DatabaseModule {}


