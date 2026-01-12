import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationsService, TicketRemindersService, TicketsService } from '@taskly/database';
import crypto from 'node:crypto';

@Injectable()
export class TicketRemindersDispatcherService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly reminders: TicketRemindersService,
    private readonly tickets: TicketsService,
    private readonly notifications: NotificationsService,
  ) {}

  async runOnce(nowMs = Date.now()): Promise<{ claimed: number; sent: number }> {
    // In dev, if @taskly/database runtime build is stale, Nest may inject `undefined` here.
    // Never crash the API because of the dispatcher.
    if (!this.reminders) return { claimed: 0, sent: 0 };

    const claimId = crypto.randomBytes(12).toString('hex');
    const due =
      typeof (this.reminders as unknown as { claimDue?: unknown }).claimDue === 'function'
        ? await this.reminders.claimDue(nowMs, { limit: 200, claimId, claimTtlMs: 5 * 60_000 })
        : // Backward-compatible fallback (older @taskly/database build)
          await (this.reminders as unknown as { listDue: (nowMs: number, input?: { limit?: number }) => Promise<any[]> }).listDue(nowMs, {
            limit: 200,
          });

    let sent = 0;
    for (const r of due) {
      try {
        const t = await this.tickets.getById(r.ticketId);
        if (!t) continue;

        const targets = Array.from(new Set([r.userId, ...t.assigneeIds].filter((x) => typeof x === 'string' && x.length > 0)));
        const notificationIds: Record<string, string> = {};
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
            // Best-effort per recipient.
          }
        }

        // Mark as processed so we don't retry forever.
        if (typeof (this.reminders as unknown as { markSent?: unknown }).markSent === 'function') {
          await this.reminders.markSent(r.boardId, r.ticketId, r.id, { notificationIds, claimId });
        }
        sent++;
      } catch {
        // Best-effort: a reminder dispatch should never crash the API process.
        try {
          if (typeof (this.reminders as unknown as { releaseClaim?: unknown }).releaseClaim === 'function') {
            await this.reminders.releaseClaim(r.boardId, r.ticketId, r.id, claimId);
          }
        } catch {
          // ignore
        }
      }
    }

    return { claimed: due.length, sent };
  }

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') return;
    if (process.env.DISABLE_TICKET_REMINDERS_DISPATCHER === '1') return;

    // In production (Cloud Run), prefer triggering dispatch via Cloud Scheduler -> HTTP endpoint.
    // Polling stays enabled for local/dev unless explicitly enabled in prod.
    const enablePolling = process.env.ENABLE_TICKET_REMINDERS_POLLING === '1' || process.env.NODE_ENV !== 'production';
    if (!enablePolling) return;

    const intervalMsRaw = Number(process.env.TICKET_REMINDERS_POLL_INTERVAL_MS ?? 60_000);
    const intervalMs = Number.isFinite(intervalMsRaw) && intervalMsRaw > 0 ? intervalMsRaw : 60_000;

    // Run once on startup, then periodically.
    this.runOnce().catch(() => {
      // ignore (best-effort)
    });
    this.timer = setInterval(() => {
      void this.runOnce().catch(() => {
        // ignore (best-effort)
      });
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

