import type { WorkspaceRole } from './index';
import type { Permission } from './workspace-permissions';

export const ticketRolePermissions: Record<WorkspaceRole, Permission[]> = {
  viewer: [
    'ticket.content.read',
    'ticket.comments.read',
    'ticket.assignments.read',
  ],
  editor: [
    'ticket.content.read',
    'ticket.comments.read',
    'ticket.assignments.read',
    'ticket.content.write',
    'ticket.comments.write',
    'ticket.assignments.write',
  ],
  maintainer: [
    'ticket.content.read',
    'ticket.comments.read',
    'ticket.assignments.read',
    'ticket.content.write',
    'ticket.comments.write',
    'ticket.assignments.write',
  ],
  admin: ['ticket.*'],
};


