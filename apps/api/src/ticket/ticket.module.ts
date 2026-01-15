import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller.js';
import { TicketRemindersController } from './ticket-reminders.controller.js';
import { TicketAccessService } from './ticket-access.service.js';
import { GcsService } from '../gcs/gcs.service.js';
import { TicketRemindersDispatcherService } from './ticket-reminders-dispatcher.service.js';

@Module({
  controllers: [TicketController, TicketRemindersController],
  providers: [TicketAccessService, GcsService, TicketRemindersDispatcherService],
})
export class TicketModule {}


