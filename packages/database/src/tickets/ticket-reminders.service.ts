import { Inject, Injectable } from '@nestjs/common';
import type { TicketModel } from './ticket.model';
import type { TicketReminderCreateInput, TicketReminderModel } from './ticket-reminder.model';
import { TicketRemindersStore } from './ticket-reminders.store';
import { TicketsService } from './tickets.service';

function parseDateMs(x: string): number {
  const ms = Date.parse(x);
  if (!Number.isFinite(ms)) throw new Error('Invalid remindAt');
  return ms;
}

@Injectable()
export class TicketRemindersService {
  constructor(
    @Inject(TicketRemindersStore) private readonly store: TicketRemindersStore,
    @Inject(TicketsService) private readonly tickets: TicketsService,
  ) {}

  private async requireTicket(ticketId: string): Promise<TicketModel> {
    const t = await this.tickets.getById(ticketId);
    if (!t) throw new Error('Ticket not found');
    return t;
  }

  async listForUser(ticketId: string, userId: string): Promise<TicketReminderModel[]> {
    const t = await this.requireTicket(ticketId);
    return await this.store.list(t.boardId, ticketId, { userId });
  }

  async createForUser(ticketId: string, input: TicketReminderCreateInput): Promise<TicketReminderModel> {
    const t = await this.requireTicket(ticketId);
    const remindAtMs = parseDateMs(input.remindAt);
    const remindAt = new Date(remindAtMs).toISOString();
    return await this.store.create(t.boardId, ticketId, { userId: input.userId, remindAt, remindAtMs });
  }

  async removeForUser(ticketId: string, reminderId: string, userId: string): Promise<void> {
    const t = await this.requireTicket(ticketId);
    const existing = await this.store.get(t.boardId, ticketId, reminderId);
    if (!existing) return;
    if (existing.userId !== userId) throw new Error('Forbidden');
    await this.store.delete(t.boardId, ticketId, reminderId);
  }

  async listDue(nowMs: number, input?: { limit?: number }) {
    return await this.store.listDue(nowMs, input);
  }

  async claimDue(nowMs: number, input: { limit?: number; claimId: string; claimTtlMs?: number }) {
    return await this.store.claimDue(nowMs, input);
  }

  async markSent(
    boardId: string,
    ticketId: string,
    reminderId: string,
    input: { notificationIds: Record<string, string>; claimId: string },
  ): Promise<void> {
    await this.store.markSent(boardId, ticketId, reminderId, { sentAt: new Date().toISOString(), notificationIds: input.notificationIds, claimId: input.claimId });
  }

  async releaseClaim(boardId: string, ticketId: string, reminderId: string, claimId: string): Promise<void> {
    await this.store.releaseClaim(boardId, ticketId, reminderId, claimId);
  }
}

