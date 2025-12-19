import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller.js';
import { TicketAccessService } from './ticket-access.service.js';

@Module({
  controllers: [TicketController],
  providers: [TicketAccessService],
})
export class TicketModule {}


