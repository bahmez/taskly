/**
 * Internal Ticket Reminders Controller
 *
 * Provides an HTTP endpoint for triggering reminder dispatch.
 * 
 * This is an internal-only endpoint meant to be called by:
 * - Cloud Scheduler (production): Sends authenticated requests with secret header
 * - Development: Can be called without auth for testing
 * 
 * The endpoint triggers the TicketRemindersDispatcherService to process due reminders
 * and send notifications to users.
 * 
 * Not exposed in the public Swagger documentation (tagged as 'internal').
 */

import { Controller, ForbiddenException, Post, Req } from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { TicketRemindersDispatcherService } from './ticket-reminders-dispatcher.service.js';

/**
 * Controller for internal ticket reminder operations.
 * Handles scheduled dispatch of ticket reminders via HTTP.
 */
@ApiTags('internal')
@Controller('/api/internal/ticket-reminders')
export class TicketRemindersController {
  constructor(private readonly dispatcher: TicketRemindersDispatcherService) {}

  /**
   * HTTP endpoint to manually dispatch ticket reminders.
   * 
   * Triggers immediate processing of due reminders and sends notifications.
   * Intended to be called by Cloud Scheduler in production.
   * 
   * Security:
   * - Production: Requires valid x-taskly-cron-secret header (must match CRON_SECRET env var)
   * - Development: Optional secret (if CRON_SECRET is set, header must match)
   * 
   * @param req - Express request object (used to extract cron secret header)
   * @returns Status object with dispatch statistics
   * @throws ForbiddenException if secret validation fails
   * 
   * @example
   * // Production call via Cloud Scheduler
   * curl -X POST http://api.example.com/api/internal/ticket-reminders/dispatch \
   *   -H "x-taskly-cron-secret: $CRON_SECRET"
   * 
   * @example
   * // Response
   * {
   *   "ok": true,
   *   "claimed": 12,      // Number of reminders retrieved
   *   "sent": 10          // Number of notifications successfully sent
   * }
   */
  @ApiHeader({
    name: 'x-taskly-cron-secret',
    required: false,
    description: 'Secret requis en production pour déclencher la tâche',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        claimed: { type: 'number', example: 12 },
        sent: { type: 'number', example: 10 },
      },
    },
  })
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

    // Execute reminder dispatch
    const res = await this.dispatcher.runOnce(Date.now());
    return { ok: true, ...res };
  }
}

