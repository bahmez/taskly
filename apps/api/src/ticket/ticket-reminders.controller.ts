import { Controller, ForbiddenException, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { TicketRemindersDispatcherService } from './ticket-reminders-dispatcher.service.js';

@Controller('/api/internal/ticket-reminders')
export class TicketRemindersController {
  constructor(private readonly dispatcher: TicketRemindersDispatcherService) {}

  @Post('/dispatch')
  async dispatch(@Req() req: Request) {
    const expected = process.env.CRON_SECRET ?? '';
    const provided = String(req.header('x-taskly-cron-secret') ?? '');

    // In production we require a secret (Cloud Scheduler should send it).
    if (process.env.NODE_ENV === 'production') {
      if (!expected) throw new ForbiddenException('CRON_SECRET not configured');
      if (!provided || provided !== expected) throw new ForbiddenException('Invalid cron secret');
    } else {
      // In dev/test, allow without secret unless configured.
      if (expected && provided !== expected) throw new ForbiddenException('Invalid cron secret');
    }

    const res = await this.dispatcher.runOnce(Date.now());
    return { ok: true, ...res };
  }
}

