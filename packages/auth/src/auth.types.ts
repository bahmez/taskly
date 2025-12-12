import type { DecodedIdToken } from 'firebase-admin/auth';
import type { UserModel } from '@taskly/database';

export type AuthenticatedRequest = {
  firebase: {
    token: DecodedIdToken;
  };
  user: UserModel;
};


