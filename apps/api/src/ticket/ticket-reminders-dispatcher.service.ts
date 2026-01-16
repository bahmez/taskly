/**
 * Ticket Reminders Dispatcher Service
 *
 * Manages the scheduled dispatch of ticket reminders.
 * 
 * Features:
 * - Polls database for due reminders at regular intervals
 * - Sends notifications to ticket watchers and assignees
 * - Supports both polling and HTTP-triggered dispatch (Cloud Scheduler)
 * - Handles graceful startup/shutdown with NestJS lifecycle hooks
 * - Fault-tolerant: individual reminder failures don't crash the service
 *
 * Environment variables:
 * - ENABLE_TICKET_REMINDERS_POLLING: Enable automatic polling (default true, except production)
 * - DISABLE_TICKET_REMINDERS_DISPATCHER: Disable completely
 * - TICKET_REMINDERS_POLL_INTERVAL_MS: Polling interval (default 60000ms = 1min)
 * - CRON_SECRET: Secret for HTTP dispatch endpoint authentication
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationsService, TicketRemindersService, TicketsService } from '@taskly/database';
import crypto from 'node:crypto';

/**
 * Service for dispatching ticket reminders.
 * Implements NestJS lifecycle hooks for polling management.
 */
@Injectable()
export class TicketRemindersDispatcherService implements OnModuleInit, OnModuleDestroy {
  /** Interval timer for polling reminders (null if not running) */
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly reminders: TicketRemindersService,
    private readonly tickets: TicketsService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Type guard to validate reminder object structure.
   * Ensures reminder has all required fields from database claim operation.
   * 
   * @param x - Object to validate
   * @returns true if object is a valid reminder with required fields
   */
  private static isDueReminder(x: unknown): x is {
    id: string;
    boardId: string;
    ticketId: string;
    userId: string;
    remindAt: string;
    remindAtMs: number;
  } {
    if (!x || typeof x !== 'object') return false;
    const o = x as Record<string, unknown>;
    return (
      typeof o.id === 'string' &&
      typeof o.boardId === 'string' &&
      typeof o.ticketId === 'string' &&
      typeof o.userId === 'string' &&
      typeof o.remindAt === 'string' &&
      typeof o.remindAtMs === 'number'
    );
  }

  /**
   * Processes due reminders once and sends notifications.
   * 
   * This is the core dispatch logic that:
   * 1. Claims due reminders from the database
   * 2. Fetches ticket details
   * 3. Creates notifications for watchers and assignees
   * 4. Marks reminders as processed
   * 
   * Designed for fault-tolerance: individual reminder failures don't stop processing.
   * 
   * @param nowMs - Current timestamp in milliseconds (default: Date.now())
   * @returns Statistics: claimed reminders and successfully sent notifications
   * 
   * @example
   * const { claimed, sent } = await dispatcher.runOnce();
   * console.log(`Claimed ${claimed} reminders, sent ${sent} notifications`);
   */
  async runOnce(nowMs = Date.now()): Promise<{ claimed: number; sent: number }> {
    // In dev, if @taskly/database runtime build is stale, Nest may inject `undefined` here.
    // Never crash the API because of the dispatcher.
    if (!this.reminders) return { claimed: 0, sent: 0 };

    // Generate unique claim ID to prevent duplicate processing across instances
    const claimId = crypto.randomBytes(12).toString('hex');
    
    // Fetch due reminders with distributed lock (claim/release pattern)
    const due =
      typeof (this.reminders as unknown as { claimDue?: unknown }).claimDue === 'function'
        ? await this.reminders.claimDue(nowMs, { limit: 200, claimId, claimTtlMs: 5 * 60_000 })
        : // Backward-compatible fallback (older @taskly/database build)
          (
            await (this.reminders as unknown as {
              listDue: (nowMs: number, input?: { limit?: number }) => Promise<unknown[]>;
            }).listDue(nowMs, { limit: 200 })
          ).filter(TicketRemindersDispatcherService.isDueReminder);

    let sent = 0;
    
    // Process each due reminder independently (one failure doesn't stop others)
    for (const r of due) {
      try {
        // Get ticket details to include in notification
        const t = await this.tickets.getById(r.ticketId);
        if (!t) continue;

        // Notify both the reminder creator and all ticket assignees
        const targets = Array.from(new Set([r.userId, ...t.assigneeIds].filter((x) => typeof x === 'string' && x.length > 0)));
        const notificationIds: Record<string, string> = {};
        
        // Send notification to each target (best-effort per recipient)
        for (const userId of targets) {
          try {
            const notif = await this.notifications.create(userId, {
              type: 'ticket_reminder',
              title: `Rappel: "${t.title}"`,
              body: t.dueDate ? `Échéance: ${t.dueDate}` : null,
              actorId: null,
              data: { ticketId: t.id, boardId: t.boardId, reminderId: r.id, remindAt: r.remindAt },
            });
            notificationIds[userId] = notif.id;
          } catch {
            // Best-effort per recipient - continue with other users
          }
        }

        // Mark reminder as processed so we don't retry forever
        if (typeof (this.reminders as unknown as { markSent?: unknown }).markSent === 'function') {
          await this.reminders.markSent(r.boardId, r.ticketId, r.id, { notificationIds, claimId });
        }
        sent++;
      } catch {
        // Best-effort: a reminder dispatch should never crash the API process.
        // Release the claim so another instance can retry
        try {
          if (typeof (this.reminders as unknown as { releaseClaim?: unknown }).releaseClaim === 'function') {
            await this.reminders.releaseClaim(r.boardId, r.ticketId, r.id, claimId);
          }
        } catch {
          // ignore - already in error state
        }
      }
    }

    return { claimed: due.length, sent };
  }

  /**
   * NestJS lifecycle hook: initializes polling timer on module startup.
   * 
   * Behavior:
   * - Test environment: polling disabled
   * - DISABLE_TICKET_REMINDERS_DISPATCHER=1: completely disabled
   * - Production: polling disabled by default (use Cloud Scheduler instead)
   * - Dev/local: polling enabled by default
   * 
   * Runs dispatch once on startup, then at configurable interval.
   */
  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') return;
    if (process.env.DISABLE_TICKET_REMINDERS_DISPATCHER === '1') return;

    // In production (Cloud Run), prefer triggering dispatch via Cloud Scheduler -> HTTP endpoint.
    // Polling stays enabled for local/dev unless explicitly enabled in prod.
    const enablePolling = process.env.ENABLE_TICKET_REMINDERS_POLLING === '1' || process.env.NODE_ENV !== 'production';
    if (!enablePolling) return;

    // Get polling interval from environment, default to 60 seconds
    const intervalMsRaw = Number(process.env.TICKET_REMINDERS_POLL_INTERVAL_MS ?? 60_000);
    const intervalMs = Number.isFinite(intervalMsRaw) && intervalMsRaw > 0 ? intervalMsRaw : 60_000;

    // Run once on startup (best-effort), then periodically
    this.runOnce().catch(() => {
      // ignore (best-effort)
    });
    this.timer = setInterval(() => {
      void this.runOnce().catch(() => {
        // ignore (best-effort)
      });
    }, intervalMs);
  }

  /**
   * NestJS lifecycle hook: cleans up polling timer on module destruction.
   * Called when application is shutting down.
   */
  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

