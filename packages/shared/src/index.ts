/**
 * Shared Types and Permissions Package
 *
 * Common types, interfaces, and permissions used across the application.
 * Provides:
 * - Core data model types (Workspace, Board, Card, User, etc.)
 * - Workspace/Board/Ticket role definitions
 * - Permission checking utilities and mappings
 * - Type definitions for API and database layers
 *
 * Used by: API, Web, Database, and tRPC packages
 */

/** Unique identifier type used throughout the application */
export type Id = string;

/**
 * User profile information
 */
export type UserProfile = {
  /** Unique user ID */
  id: Id;
  /** User email address */
  email: string;
  /** Optional display name */
  displayName?: string;
  /** Optional photo URL */
  photoURL?: string;
};

/** Workspace member roles with permission levels */
export type WorkspaceRole = 'admin' | 'maintainer' | 'editor' | 'viewer';

/**
 * Workspace data structure
 */
export type Workspace = {
  /** Unique workspace ID */
  id: Id;
  /** Workspace title/name */
  title: string;
  /** Workspace description */
  description: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
};

/**
 * Workspace member with assigned role
 */
export type WorkspaceMember = {
  /** ID of the user in this workspace */
  userId: Id;
  /** User's role within the workspace */
  role: WorkspaceRole;
  /** ISO timestamp of membership creation */
  createdAt: string;
  /** ISO timestamp of last role update */
  updatedAt: string;
};

/**
 * Board/project data structure
 */
export type Board = {
  /** Unique board ID */
  id: Id;
  /** Board title/name */
  title: string;
  /** Optional background color */
  backgroundColor?: string;
  /** IDs of members on this board */
  memberIds: Id[];
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
};

/**
 * Column/list on a board
 */
export type List = {
  /** Unique list ID */
  id: Id;
  /** ID of the parent board */
  boardId: Id;
  /** List title/name */
  title: string;
  /** Display order on the board */
  position: number;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
};

/**
 * Card/ticket in a list
 */
export type Card = {
  /** Unique card ID */
  id: Id;
  /** ID of the parent list */
  listId: Id;
  /** Card title/name */
  title: string;
  /** Optional detailed description */
  description?: string;
  /** Completion status */
  isDone: boolean;
  /** Optional due date in ISO format */
  dueDate?: string;
  /** IDs of attached labels */
  labelIds?: Id[];
  /** IDs of assigned members */
  memberIds?: Id[];
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
};

// Export permission utilities and mappings from sub-modules
export * from './workspace-permissions';
export * from './board-ticket-permissions';
export * from './ticket-permissions';


