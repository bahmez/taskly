/**
 * Board Module
 *
 * Provides REST endpoints for board management and kanban operations.
 * 
 * Features:
 * - Board CRUD (create, read, update, archive)
 * - Column management (create, reorder, delete)
 * - Label/tag management with colors
 * - Ticket management (list, create, move between columns, archive)
 * - Background customization (colors, gradients, Unsplash images)
 * - Permission checking via BoardAccessService
 *
 * All endpoints require Firebase authentication.
 * Access is controlled by workspace membership and board-level permissions.
 * 
 * Related Services:
 * - BoardAccessService: Authorization and permission checks
 * - BoardBackgroundsService: Background options catalog
 */

import { Module } from '@nestjs/common';
import { BoardController } from './board.controller.js';
import { BoardAccessService } from './board-access.service.js';
import { BoardBackgroundsService } from './board-backgrounds.service.js';

@Module({
  controllers: [BoardController],
  providers: [BoardAccessService, BoardBackgroundsService],
})
export class BoardModule {}


