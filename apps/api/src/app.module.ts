/**
 * Root application module for Taskly API.
 * 
 * Orchestrates all sub-modules and imports shared services:
 * - Firebase authentication configuration
 * - Database module with ORM models and services
 * - Feature modules for Users, Workspaces, Boards, and Tickets
 * - Global controllers (/health endpoint)
 */

import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { FirebaseModule } from '@taskly/firebase';
import { DatabaseModule } from '@taskly/database';
import { UserModule } from './user/user.module.js';
import { WorkspaceModule } from './workspace/workspace.module.js';
import { BoardModule } from './board/board.module.js';
import { TicketModule } from './ticket/ticket.module.js';

@Module({
  imports: [
    // Firebase authentication and admin SDK configuration
    FirebaseModule.forRoot(),
    // Database models and services (Firestore integration)
    DatabaseModule,
    // Feature modules with controllers and services
    UserModule,
    WorkspaceModule,
    BoardModule,
    TicketModule,
  ],
  // Global controllers available at app level
  controllers: [AppController],
})
export class AppModule {}


