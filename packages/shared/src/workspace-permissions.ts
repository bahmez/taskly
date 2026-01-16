/**
 * Workspace-Level Permissions and Role-Based Access Control
 *
 * Defines permission strings and role-to-permission mappings for workspaces.
 * Supports wildcard permissions (workspace.*) for admin role.
 *
 * Roles (hierarchical):
 * - admin: Full control (all workspace permissions)
 * - maintainer: Can manage members and boards
 * - editor: Can read and create content
 * - viewer: Read-only access
 *
 * Permission format: 'namespace.action' or 'namespace.*' for wildcards
 */

import type { WorkspaceRole } from './index';

/** Permission string type */
export type Permission = string;

/**
 * Role-to-permissions mapping for workspaces.
 * Maps each role to an array of allowed permission strings.
 *
 * Supports:
 * - Specific permissions: 'workspace.boards.read'
 * - Wildcard permissions: 'workspace.*' (all workspace permissions)
 * - Full wildcard: '*' (all permissions)
 */
export const workspaceRolePermissions: Record<WorkspaceRole, Permission[]> = {
  // Viewer: Read-only access
  viewer: ['workspace.meta.read', 'workspace.boards.read', 'workspace.members.read'],
  // Editor: Read + create/edit content
  editor: ['workspace.meta.read', 'workspace.boards.read', 'workspace.members.read'],
  // Maintainer: Can manage members and boards
  maintainer: [
    'workspace.meta.read',
    'workspace.boards.read',
    'workspace.members.read',
    'workspace.members.write',
  ],
  // Admin: Full control
  admin: ['workspace.*'],
};

/**
 * Checks if a granted permission matches a required permission.
 * Supports wildcard matching (e.g., 'workspace.*' matches 'workspace.boards.read').
 *
 * @param grant - The granted permission string
 * @param required - The required permission string
 * @returns true if the grant satisfies the requirement
 *
 * @example
 * permissionMatches('workspace.*', 'workspace.boards.read') // true
 * permissionMatches('workspace.boards.read', 'workspace.boards.read') // true
 * permissionMatches('workspace.boards.read', 'workspace.members.write') // false
 */
export function permissionMatches(grant: Permission, required: Permission): boolean {
  // Exact match or full wildcard
  if (grant === '*' || grant === required) return true;
  // Wildcard prefix match (e.g., 'workspace.*' matches 'workspace.boards.read')
  if (grant.endsWith('.*')) {
    const prefix = grant.slice(0, -2);
    return required.startsWith(`${prefix}.`);
  }
  return false;
}

/**
 * Checks if any granted permission satisfies a required permission.
 *
 * @param grants - Array of granted permissions
 * @param required - The required permission string
 * @returns true if any grant satisfies the requirement
 *
 * @example
 * hasPermission(['workspace.boards.read', 'workspace.meta.read'], 'workspace.boards.read') // true
 */
export function hasPermission(grants: Permission[], required: Permission): boolean {
  return grants.some((g) => permissionMatches(g, required));
}

/**
 * Validates if an actor with a given role can assign another role.
 * Implements role hierarchy: admin > maintainer > editor > viewer
 *
 * Rules:
 * - Admin can assign any role
 * - Maintainer can only assign viewer or editor (not admin or maintainer)
 * - Others cannot assign roles
 *
 * @param actorRole - The role of the actor performing the assignment
 * @param newRole - The role being assigned
 * @returns true if the actor can assign this role
 *
 * @example
 * canAssignRole('admin', 'editor') // true
 * canAssignRole('maintainer', 'viewer') // true
 * canAssignRole('maintainer', 'admin') // false
 * canAssignRole('editor', 'viewer') // false
 */
export function canAssignRole(actorRole: WorkspaceRole, newRole: WorkspaceRole): boolean {
  // Admin can assign any role
  if (actorRole === 'admin') return true;
  // Maintainer can only assign viewer or editor (not themselves or admin)
  if (actorRole === 'maintainer') return newRole === 'viewer' || newRole === 'editor';
  // Other roles cannot assign
  return false;
}


