import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller.js';
import { TicketAccessService } from './ticket-access.service.js';
import { GcsService } from '../gcs/gcs.service.js';

@Module({
  controllers: [TicketController],
  providers: [TicketAccessService, GcsService],
})
export class TicketModule {}


