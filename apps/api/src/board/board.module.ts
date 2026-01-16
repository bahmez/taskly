import { Module } from '@nestjs/common';
import { BoardController } from './board.controller.js';
import { BoardAccessService } from './board-access.service.js';
import { BoardBackgroundsService } from './board-backgrounds.service.js';

@Module({
  controllers: [BoardController],
  providers: [BoardAccessService, BoardBackgroundsService],
})
export class BoardModule {}


