import { Inject, Injectable } from '@nestjs/common';
import type { ActivityLogCreateInput, ActivityLogModel } from './activity-log.model';
import { ActivityLogsStore } from './activity-logs.store';

@Injectable()
export class ActivityLogsService {
  constructor(@Inject(ActivityLogsStore) private readonly store: ActivityLogsStore) {}

  create(boardId: string, input: ActivityLogCreateInput): Promise<ActivityLogModel> {
    return this.store.create(boardId, input);
  }

  listForBoard(
    boardId: string,
    input: { limit: number; cursor?: string | null; includeTickets?: boolean },
  ): Promise<{ items: ActivityLogModel[]; nextCursor: string | null }> {
    return this.store.listForBoard(boardId, input);
  }

  listForTicket(
    boardId: string,
    ticketId: string,
    input: { limit: number; cursor?: string | null },
  ): Promise<{ items: ActivityLogModel[]; nextCursor: string | null }> {
    return this.store.listForTicket(boardId, ticketId, input);
  }
}

