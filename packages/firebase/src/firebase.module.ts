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
  const projectId = options?.projectId ?? process.env.FIREBASE_PROJECT_ID;

  const credential = serviceAccountJson
    ? admin.credential.cert(JSON.parse(serviceAccountJson))
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


