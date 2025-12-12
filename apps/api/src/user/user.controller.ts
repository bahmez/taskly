import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard, CurrentUser } from '@taskly/auth';
import type { UserModel, UserUpdateInput } from '@taskly/database';
import { UsersService } from '@taskly/database';

type UpdateMeDto = UserUpdateInput;

@Controller('/users')
export class UserController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(FirebaseAuthGuard)
  @Get('/me')
  me(@CurrentUser() user: UserModel) {
    return user;
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/search')
  async search(
    @Query('q') q = '',
    @Query('limit') limitStr = '10',
  ) {
    const parsed = Number(limitStr);
    const limit = Number.isFinite(parsed) ? parsed : 10;
    const capped = Math.min(Math.max(limit, 1), 30);
    return await this.users.search(q, capped);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('/:id')
  async getById(@Param('id') id: string) {
    const user = await this.users.getById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @UseGuards(FirebaseAuthGuard)
  @Patch('/me')
  async updateMe(
    @CurrentUser() user: UserModel,
    @Body() body: UpdateMeDto,
  ) {
    const patch: UserUpdateInput = {
      username: body.username,
      first_name: body.first_name,
      last_name: body.last_name,
      description: body.description,
    };
    return await this.users.updateMe(user.id, patch);
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete('/me')
  async deleteMe(@CurrentUser() user: UserModel) {
    await this.users.deleteMe(user.id);
    return { ok: true };
  }
}


