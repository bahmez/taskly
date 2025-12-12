import { Inject, Injectable } from '@nestjs/common';
import type { Firestore } from 'firebase-admin/firestore';
import { FIRESTORE } from '@taskly/firebase';
import type { UserCreateInput, UserModel, UserUpdateInput } from './user.model';

type UserDoc = Omit<UserModel, 'id'>;

@Injectable()
export class UsersStore {
  constructor(@Inject(FIRESTORE) private readonly db: Firestore) {}

  private col() {
    return this.db.collection('users');
  }

  async getById(id: string): Promise<UserModel | null> {
    const snap = await this.col().doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data() as UserDoc;
    return { id: snap.id, ...data };
  }

  async create(input: UserCreateInput): Promise<UserModel> {
    const now = new Date().toISOString();
    const doc: UserDoc = {
      username: input.username,
      first_name: input.first_name,
      last_name: input.last_name,
      description: input.description ?? '',
      createdAt: now,
      updatedAt: now,
    };

    await this.col().doc(input.id).create(doc);
    return { id: input.id, ...doc };
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
          createdAt: now,
          updatedAt: now,
        } satisfies UserDoc);
      }
    });

    const after = await ref.get();
    const data = after.data() as UserDoc;
    return { id: after.id, ...data };
  }

  async update(id: string, patch: UserUpdateInput): Promise<UserModel> {
    const ref = this.col().doc(id);
    const now = new Date().toISOString();
    await ref.update({ ...patch, updatedAt: now });
    const snap = await ref.get();
    const data = snap.data() as UserDoc;
    return { id: snap.id, ...data };
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
        const data = doc.data() as UserDoc;
        byId.set(doc.id, { id: doc.id, ...data });
      }
      if (byId.size >= capped) break;
    }

    return [...byId.values()].slice(0, capped);
  }
}


