import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE } from '@taskly/firebase';
import type { UserAvatar, UserAvatarBackground, UserCreateInput, UserModel, UserUpdateInput } from './user.model';

type UserDoc = Omit<UserModel, 'id'>;

function parseAvatarBackground(raw: unknown): UserAvatarBackground | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const value = raw.trim();
    if (!value) return null;
    return { type: 'color', value };
  }
  if (typeof raw !== 'object') return null;
  const data = raw as { type?: unknown; value?: unknown };
  if (data.type === 'color' || data.type === 'gradient') {
    if (typeof data.value !== 'string') return null;
    const value = data.value.trim();
    if (!value) return null;
    return { type: data.type, value };
  }
  if (data.type === 'image') {
    const value = data.value as Record<string, unknown> | undefined;
    if (!value || typeof value !== 'object') return null;
    const id = typeof value.id === 'string' ? value.id : '';
    const url = typeof value.url === 'string' ? value.url : '';
    const thumbUrl = typeof value.thumbUrl === 'string' ? value.thumbUrl : '';
    if (!id || !url || !thumbUrl) return null;
    return {
      type: 'image',
      value: {
        source: value.source === 'unsplash' ? 'unsplash' : 'unsplash',
        id,
        url,
        thumbUrl,
        blurHash: typeof value.blurHash === 'string' ? value.blurHash : null,
        color: typeof value.color === 'string' ? value.color : null,
        authorName: typeof value.authorName === 'string' ? value.authorName : null,
        authorUrl: typeof value.authorUrl === 'string' ? value.authorUrl : null,
      },
    };
  }
  return null;
}

function parseAvatar(raw: unknown): UserAvatar | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as { type?: unknown; background?: unknown; image?: unknown };
  if (data.type === 'initials') {
    return { type: 'initials', background: parseAvatarBackground(data.background) };
  }
  if (data.type === 'image') {
    const image = data.image as Record<string, unknown> | undefined;
    if (!image || typeof image !== 'object') return null;
    const objectPath = typeof image.objectPath === 'string' ? image.objectPath : '';
    if (!objectPath) return null;
    return { type: 'image', image: { source: 'upload', objectPath } };
  }
  return null;
}

function toUserModel(id: string, data: Partial<UserDoc>): UserModel {
  return {
    id,
    username: String(data.username ?? ''),
    first_name: String(data.first_name ?? ''),
    last_name: String(data.last_name ?? ''),
    description: String(data.description ?? ''),
    avatar: parseAvatar(data.avatar),
    createdAt: String(data.createdAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  };
}

@Injectable()
export class UsersStore {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  private col() {
    return this.db.collection('users');
  }

  async getById(id: string): Promise<UserModel | null> {
    const snap = await this.col().doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data() as Partial<UserDoc>;
    return toUserModel(snap.id, data);
  }

  async create(input: UserCreateInput): Promise<UserModel> {
    const now = new Date().toISOString();
    const doc: UserDoc = {
      username: input.username,
      first_name: input.first_name,
      last_name: input.last_name,
      description: input.description ?? '',
      avatar: input.avatar ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.col().doc(input.id).create(doc);
    return toUserModel(input.id, doc);
  }

  async upsert(input: UserCreateInput): Promise<UserModel> {
    const now = new Date().toISOString();
    const ref = this.col().doc(input.id);

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        tx.update(ref, {
          updatedAt: now,
        });
      } else {
        tx.create(ref, {
          username: input.username,
          first_name: input.first_name,
          last_name: input.last_name,
          description: input.description ?? '',
          avatar: input.avatar ?? null,
          createdAt: now,
          updatedAt: now,
        } satisfies UserDoc);
      }
    });

    const after = await ref.get();
    const data = after.data() as Partial<UserDoc>;
    return toUserModel(after.id, data);
  }

  async update(id: string, patch: UserUpdateInput): Promise<UserModel> {
    const ref = this.col().doc(id);
    const now = new Date().toISOString();
    await ref.update({ ...patch, updatedAt: now });
    const snap = await ref.get();
    const data = snap.data() as Partial<UserDoc>;
    return toUserModel(snap.id, data);
  }

  async delete(id: string): Promise<void> {
    await this.col().doc(id).delete();
  }

  /**
   * Firestore doesn't support a true OR prefix search across multiple fields easily.
   * We run up to 3 prefix queries and merge unique results.
   */
  async searchByPrefix(
    q: string,
    limit: number,
  ): Promise<UserModel[]> {
    const query = q.trim();
    if (!query) return [];

    const capped = Math.min(Math.max(limit, 1), 30);
    const end = `${query}\uf8ff`;

    const fields: Array<keyof Pick<UserDoc, 'username' | 'first_name' | 'last_name'>> =
      ['username', 'first_name', 'last_name'];

    const snaps = await Promise.all(
      fields.map((field) =>
        this.col()
          .orderBy(field)
          .startAt(query)
          .endAt(end)
          .limit(capped)
          .get(),
      ),
    );

    const byId = new Map<string, UserModel>();
    for (const snap of snaps) {
      for (const doc of snap.docs) {
        if (byId.size >= capped) break;
        const data = doc.data() as Partial<UserDoc>;
        byId.set(doc.id, toUserModel(doc.id, data));
      }
      if (byId.size >= capped) break;
    }

    return [...byId.values()].slice(0, capped);
  }
}


