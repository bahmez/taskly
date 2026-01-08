import { DynamicModule, Global, Module } from '@nestjs/common';
import admin from 'firebase-admin';
import { FIREBASE_ADMIN_APP, FIREBASE_AUTH, FIRESTORE } from './firebase.constants';

export type FirebaseModuleOptions = {
  /**
   * JSON string of the Firebase service account.
   * If not provided, will fall back to application default credentials.
   */
  serviceAccountJson?: string;
  /**
   * Explicit project id (optional).
   */
  projectId?: string;
};

function initFirebaseAdminApp(options?: FirebaseModuleOptions): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountJson =
    options?.serviceAccountJson ?? process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  // Try to infer projectId from multiple sources to reduce local dev friction.
  // - explicit option
  // - backend env (preferred)
  // - common GCP envs
  // - service account json "project_id"
  // - web env (last resort, useful for local dev)
  let inferredProjectId: string | undefined;
  let parsedServiceAccount: unknown = undefined;
  if (serviceAccountJson) {
    try {
      parsedServiceAccount = JSON.parse(serviceAccountJson) as unknown;
      inferredProjectId = (parsedServiceAccount as { project_id?: unknown })?.project_id as
        | string
        | undefined;
    } catch {
      // ignore parse errors here; credential.cert will throw with a clearer message later
    }
  }

  const projectId =
    options?.projectId ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    inferredProjectId ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      '[firebase-admin] Missing projectId (FIREBASE_PROJECT_ID). verifyIdToken may fail with "incorrect aud/iss".',
    );
  }

  const credential = serviceAccountJson
    ? admin.credential.cert((parsedServiceAccount ?? JSON.parse(serviceAccountJson)) as object)
    : admin.credential.applicationDefault();

  return admin.initializeApp({
    credential,
    projectId,
  });
}

@Global()
@Module({})
export class FirebaseModule {
  static forRoot(options?: FirebaseModuleOptions): DynamicModule {
    const appProvider = {
      provide: FIREBASE_ADMIN_APP,
      useFactory: () => initFirebaseAdminApp(options),
    };

    const authProvider = {
      provide: FIREBASE_AUTH,
      useFactory: (app: admin.app.App) => admin.auth(app),
      inject: [FIREBASE_ADMIN_APP],
    };

    const firestoreProvider = {
      provide: FIRESTORE,
      useFactory: (app: admin.app.App) => {
        const db = admin.firestore(app);
        db.settings({ ignoreUndefinedProperties: true });
        return db;
      },
      inject: [FIREBASE_ADMIN_APP],
    };

    return {
      module: FirebaseModule,
      providers: [appProvider, authProvider, firestoreProvider],
      exports: [appProvider, authProvider, firestoreProvider],
    };
  }
}


