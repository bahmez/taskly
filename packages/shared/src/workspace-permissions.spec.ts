import { describe, expect, it } from 'vitest';
import { canAssignRole, hasPermission, permissionMatches } from './workspace-permissions';

describe('workspace-permissions', () => {
  it('permissionMatches supports exact match', () => {
    expect(permissionMatches('workspace.meta.read', 'workspace.meta.read')).toBe(true);
    expect(permissionMatches('workspace.meta.read', 'workspace.meta.write')).toBe(false);
  });

  it('permissionMatches supports wildcard suffix .*', () => {
    expect(permissionMatches('workspace.*', 'workspace.members.write')).toBe(true);
    expect(permissionMatches('board.*', 'workspace.members.write')).toBe(false);
  });

  it('hasPermission returns true if any grant matches', () => {
    expect(hasPermission(['workspace.meta.read'], 'workspace.meta.read')).toBe(true);
    expect(hasPermission(['workspace.meta.read'], 'workspace.meta.write')).toBe(false);
    expect(hasPermission(['workspace.*'], 'workspace.members.write')).toBe(true);
  });

  it('canAssignRole enforces role rules', () => {
    expect(canAssignRole('admin', 'admin')).toBe(true);
    expect(canAssignRole('admin', 'viewer')).toBe(true);

    expect(canAssignRole('maintainer', 'viewer')).toBe(true);
    expect(canAssignRole('maintainer', 'editor')).toBe(true);
    expect(canAssignRole('maintainer', 'maintainer')).toBe(false);
    expect(canAssignRole('maintainer', 'admin')).toBe(false);

    expect(canAssignRole('editor', 'viewer')).toBe(false);
    expect(canAssignRole('viewer', 'viewer')).toBe(false);
  });
});


