import { Module } from '@nestjs/common';
import { UsersStore } from './users/users.store';
import { UsersService } from './users/users.service';

@Module({
  providers: [UsersStore, UsersService],
  exports: [UsersStore, UsersService],
})
export class DatabaseModule {}


