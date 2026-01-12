import { describe, expect, it, vi } from 'vitest';
import { TicketRemindersDispatcherService } from './ticket-reminders-dispatcher.service';

describe('TicketRemindersDispatcherService', () => {
  it('runOnce sends notifications for due reminders and marks them as sent', async () => {
    const reminders = {
      claimDue: vi.fn(async () => [{ id: 'r1', boardId: 'b1', ticketId: 't1', userId: 'u1', remindAt: '2026-01-01T00:00:00.000Z', remindAtMs: 0 }]),
      markSent: vi.fn(async () => undefined),
      releaseClaim: vi.fn(async () => undefined),
    };
    const tickets = {
      getById: vi.fn(async () => ({ id: 't1', boardId: 'b1', columnId: 'c1', title: 'T', description: '', dueDate: null, assigneeIds: ['u2'], labelIds: [], position: 1, isArchived: false, archivedAt: null, createdAt: '', updatedAt: '' })),
    };
    const notifications = {
      create: vi.fn(async (userId: string) => ({ id: userId === 'u1' ? 'n1' : 'n2' })),
    };

    const svc = new TicketRemindersDispatcherService(
      reminders as unknown as any,
      tickets as unknown as any,
      notifications as unknown as any,
    );

    await svc.runOnce(1);

    expect(notifications.create).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        type: 'ticket_reminder',
        title: expect.stringContaining('Rappel'),
        data: expect.objectContaining({ ticketId: 't1', boardId: 'b1', reminderId: 'r1' }),
      }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      'u2',
      expect.objectContaining({
        type: 'ticket_reminder',
        title: expect.stringContaining('Rappel'),
        data: expect.objectContaining({ ticketId: 't1', boardId: 'b1', reminderId: 'r1' }),
      }),
    );
    expect(reminders.markSent).toHaveBeenCalledWith('b1', 't1', 'r1', expect.objectContaining({ notificationIds: { u1: 'n1', u2: 'n2' }, claimId: expect.any(String) }));
  });
});

