import type { WorkspaceRole } from './index';
import type { Permission } from './workspace-permissions';

// Board + ticket permissions are derived from the workspace membership role for now.
export const boardRolePermissions: Record<WorkspaceRole, Permission[]> = {
  viewer: [
    'board.meta.read',
    'board.columns.read',
    'board.tickets.read',
    'ticket.content.read',
    'ticket.comments.read',
    'ticket.assignments.read',
  ],
  editor: [
    'board.meta.read',
    'board.columns.read',
    'board.tickets.read',
    'board.tickets.write',
    'ticket.content.read',
    'ticket.content.write',
    'ticket.comments.read',
    'ticket.comments.write',
    'ticket.assignments.read',
    'ticket.assignments.write',
  ],
  maintainer: [
    'board.meta.read',
    'board.columns.read',
    'board.tickets.read',
    'board.tickets.write',
    'ticket.content.read',
    'ticket.content.write',
    'ticket.comments.read',
    'ticket.comments.write',
    'ticket.assignments.read',
    'ticket.assignments.write',
    'board.columns.*',
  ],
  admin: ['board.*', 'ticket.*'],
};


