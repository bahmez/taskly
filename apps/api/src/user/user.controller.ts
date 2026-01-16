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
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard, CurrentUser } from '@taskly/auth';
import type { UserModel, UserUpdateInput } from '@taskly/database';
import { UsersService } from '@taskly/database';

class UserDto {
  @ApiProperty({ example: 'usr_123' })
  id!: string;

  @ApiProperty({ example: 'jdoe' })
  username!: string;

  @ApiProperty({ example: 'John' })
  first_name!: string;

  @ApiProperty({ example: 'Doe' })
  last_name!: string;

  @ApiProperty({ example: 'Product designer', nullable: true })
  description!: string;

  @ApiProperty({
    type: 'object',
    nullable: true,
    description: 'Avatar payload (initials or image).',
  })
  avatar!: Record<string, unknown> | null;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2024-01-02T10:00:00.000Z' })
  updatedAt!: string;
}

class UpdateMeDto implements UserUpdateInput {
  @ApiProperty({ required: false, example: 'jdoe' })
  username?: string;

  @ApiProperty({ required: false, example: 'John' })
  first_name?: string;

  @ApiProperty({ required: false, example: 'Doe' })
  last_name?: string;

  @ApiProperty({ required: false, example: 'Product designer' })
  description?: string;
}

@ApiTags('users')
@ApiBearerAuth('bearer')
@Controller('/users')
export class UserController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(FirebaseAuthGuard)
  @ApiOkResponse({ type: UserDto })
  @Get('/me')
  me(@CurrentUser() user: UserModel) {
    return user;
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiOkResponse({ type: [UserDto] })
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
  @ApiOkResponse({ type: UserDto })
  @Get('/:id')
  async getById(@Param('id') id: string) {
    const user = await this.users.getById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @UseGuards(FirebaseAuthGuard)
  @ApiBody({ type: UpdateMeDto })
  @ApiOkResponse({ type: UserDto })
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
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean', example: true } },
    },
  })
  @Delete('/me')
  async deleteMe(@CurrentUser() user: UserModel) {
    await this.users.deleteMe(user.id);
    return { ok: true };
  }
}


