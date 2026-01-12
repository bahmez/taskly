import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { TicketRemindersController } from './ticket-reminders.controller';

describe('TicketRemindersController', () => {
  const dispatcher = {
    runOnce: vi.fn(),
  };

  const prevEnv = { ...process.env };

  beforeEach(() => {
    dispatcher.runOnce.mockReset();
    process.env = { ...prevEnv };
  });

  afterEach(() => {
    process.env = { ...prevEnv };
  });

  it('rejects in production when secret is missing or invalid', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 's';
    const controller = new TicketRemindersController(dispatcher as unknown as any);
    await expect(controller.dispatch({ header: () => undefined } as any)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.dispatch({ header: () => 'bad' } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts in production when secret matches and calls dispatcher', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 's';
    dispatcher.runOnce.mockResolvedValueOnce({ claimed: 2, sent: 2 });

    const controller = new TicketRemindersController(dispatcher as unknown as any);
    await expect(controller.dispatch({ header: () => 's' } as any)).resolves.toEqual({ ok: true, claimed: 2, sent: 2 });
    expect(dispatcher.runOnce).toHaveBeenCalledTimes(1);
  });

  it('accepts in dev when secret is not configured', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.CRON_SECRET;
    dispatcher.runOnce.mockResolvedValueOnce({ claimed: 0, sent: 0 });

    const controller = new TicketRemindersController(dispatcher as unknown as any);
    await expect(controller.dispatch({ header: () => undefined } as any)).resolves.toEqual({ ok: true, claimed: 0, sent: 0 });
  });
});

