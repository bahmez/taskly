import type { WorkspaceRole } from './index';
import type { Permission } from './workspace-permissions';

// Board + ticket permissions are derived from the workspace membership role for now.
export const boardRolePermissions: Record<WorkspaceRole, Permission[]> = {
  viewer: [
    'board.meta.read',
    'board.columns.read',
    'board.tickets.read',
    'ticket.content.read',
  ],
  editor: [
    'board.meta.read',
    'board.columns.read',
    'board.tickets.read',
    'board.tickets.write',
    'ticket.content.read',
    'ticket.content.write',
  ],
  maintainer: [
    'board.meta.read',
    'board.columns.read',
    'board.tickets.read',
    'board.tickets.write',
    'ticket.content.read',
    'ticket.content.write',
    'board.columns.*',
  ],
  admin: ['board.*', 'ticket.*'],
};


