import type { WorkspaceRole } from './index';

export type Permission = string;

export const workspaceRolePermissions: Record<WorkspaceRole, Permission[]> = {
  viewer: ['workspace.meta.read', 'workspace.boards.read', 'workspace.members.read'],
  editor: ['workspace.meta.read', 'workspace.boards.read', 'workspace.members.read'],
  maintainer: [
    'workspace.meta.read',
    'workspace.boards.read',
    'workspace.members.read',
    'workspace.members.write',
  ],
  admin: ['workspace.*'],
};

export function permissionMatches(grant: Permission, required: Permission): boolean {
  if (grant === '*' || grant === required) return true;
  if (grant.endsWith('.*')) {
    const prefix = grant.slice(0, -2);
    return required.startsWith(`${prefix}.`);
  }
  return false;
}

export function hasPermission(grants: Permission[], required: Permission): boolean {
  return grants.some((g) => permissionMatches(g, required));
}

export function canAssignRole(actorRole: WorkspaceRole, newRole: WorkspaceRole): boolean {
  if (actorRole === 'admin') return true;
  if (actorRole === 'maintainer') return newRole === 'viewer' || newRole === 'editor';
  return false;
}


