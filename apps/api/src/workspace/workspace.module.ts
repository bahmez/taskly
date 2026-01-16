/**
 * Workspace Module
 *
 * Provides REST endpoints for workspace management.
 * 
 * Features:
 * - Workspace CRUD (create, read, update, archive)
 * - Member management (add, remove, list, role assignment)
 * - Invitation system (create, list, accept, decline)
 * - Board management within workspaces
 * - Permission checking via WorkspaceAccessService
 *
 * All endpoints require Firebase authentication.
 * Access is controlled by workspace membership and role-based permissions.
 */

import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller.js';
import { WorkspaceAccessService } from './workspace-access.service.js';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceAccessService],
})
export class WorkspaceModule {}


