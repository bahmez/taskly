/**
 * User Module
 *
 * Provides REST endpoints for user profile management.
 * 
 * Features:
 * - Profile retrieval (/users/me)
 * - User search with limit
 * - Profile updates (username, name, description)
 * - Account deletion
 * - User lookup by ID
 *
 * All endpoints require Firebase authentication (Bearer JWT).
 */

import { Module } from '@nestjs/common';
import { UserController } from './user.controller.js';

@Module({
  controllers: [UserController],
})
export class UserModule {}


