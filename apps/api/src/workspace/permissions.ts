/**
 * Workspace Permission Exports
 *
 * Re-exports permission types and utilities from the shared package.
 * This maintains a clean separation between API layer and shared logic.
 *
 * The actual permission definitions and role mappings are managed
 * in the @taskly/shared package for consistency across the application.
 */

export {
  type Permission,
  workspaceRolePermissions,
  permissionMatches,
  hasPermission,
  canAssignRole,
} from '@taskly/shared';


