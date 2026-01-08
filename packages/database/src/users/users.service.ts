import { Inject, Injectable } from '@nestjs/common';
import type { UserModel, UserUpdateInput } from './user.model';
import { UsersStore } from './users.store';

export type FirebaseIdTokenLike = {
  uid: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
};

function safeString(x: unknown): string {
  if (typeof x !== 'string') return '';
  return x.trim();
}

function deriveNamesFromDisplayName(name: string): { first_name: string; last_name: string } {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0]!, last_name: '' };
  return { first_name: parts[0]!, last_name: parts.slice(1).join(' ') };
}

function deriveUsername(token: FirebaseIdTokenLike): string {
  const email = safeString(token.email);
  if (email.includes('@')) return email.split('@')[0]!.toLowerCase();
  const name = safeString(token.name);
  if (name) return name.toLowerCase().replace(/\s+/g, '.').slice(0, 32);
  return token.uid.slice(0, 32);
}

@Injectable()
export class UsersService {
  constructor(@Inject(UsersStore) private readonly users: UsersStore) {}

  async ensureUserExists(token: FirebaseIdTokenLike): Promise<UserModel> {
    const existing = await this.users.getById(token.uid);
    if (existing) return existing;

    const displayName = safeString(token.name);
    const { first_name, last_name } = displayName
      ? deriveNamesFromDisplayName(displayName)
      : { first_name: '', last_name: '' };

    return await this.users.upsert({
      id: token.uid,
      username: deriveUsername(token),
      first_name,
      last_name,
      description: '',
    });
  }

  async getById(id: string): Promise<UserModel | null> {
    return await this.users.getById(id);
  }

  async search(q: string, limit: number): Promise<UserModel[]> {
    return await this.users.searchByPrefix(q, limit);
  }

  async updateMe(userId: string, patch: UserUpdateInput): Promise<UserModel> {
    return await this.users.update(userId, patch);
  }

  async deleteMe(userId: string): Promise<void> {
    await this.users.delete(userId);
  }
}


