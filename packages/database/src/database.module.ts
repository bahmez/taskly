import { Module } from '@nestjs/common';
import { UsersStore } from './users/users.store';
import { UsersService } from './users/users.service';
import { WorkspacesStore } from './workspaces/workspaces.store';
import { WorkspacesService } from './workspaces/workspaces.service';
import { BoardsStore } from './boards/boards.store';
import { BoardsService } from './boards/boards.service';

@Module({
  providers: [
    UsersStore,
    UsersService,
    WorkspacesStore,
    WorkspacesService,
    BoardsStore,
    BoardsService,
  ],
  exports: [
    UsersStore,
    UsersService,
    WorkspacesStore,
    WorkspacesService,
    BoardsStore,
    BoardsService,
  ],
})
export class DatabaseModule {}


