import { Module } from '@nestjs/common';
import { UsersStore } from './users/users.store';
import { UsersService } from './users/users.service';
import { WorkspacesStore } from './workspaces/workspaces.store';
import { WorkspacesService } from './workspaces/workspaces.service';

@Module({
  providers: [UsersStore, UsersService, WorkspacesStore, WorkspacesService],
  exports: [UsersStore, UsersService, WorkspacesStore, WorkspacesService],
})
export class DatabaseModule {}


