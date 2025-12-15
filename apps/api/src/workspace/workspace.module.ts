import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller.js';
import { WorkspaceAccessService } from './workspace-access.service.js';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceAccessService],
})
export class WorkspaceModule {}


