import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { App } from 'firebase-admin/app';
import { FirebaseModule } from './firebase.module';
import { FIREBASE_ADMIN_APP, FIREBASE_AUTH, FIRESTORE } from './firebase.constants';

const adminMock = vi.hoisted(() => ({
  apps: [] as unknown[],
  app: vi.fn(),
  initializeApp: vi.fn(),
  credential: {
    cert: vi.fn(),
    applicationDefault: vi.fn(),
  },
  auth: vi.fn(),
  firestore: vi.fn(),
}));

vi.mock('firebase-admin', () => ({ default: adminMock }));

function getProvider(mod: ReturnType<typeof FirebaseModule.forRoot>, token: string) {
  const providers = mod.providers ?? [];
  const p = (providers as Array<{ provide?: unknown; useFactory?: unknown }>).find(
    (x) => x.provide === token,
  );
  if (!p) throw new Error(`Provider not found: ${token}`);
  return p as { provide: string; useFactory: (...args: unknown[]) => unknown; inject?: unknown[] };
}

describe('FirebaseModule', () => {
  beforeEach(() => {
    adminMock.apps.length = 0;
    adminMock.app.mockReset();
    adminMock.initializeApp.mockReset();
    adminMock.credential.cert.mockReset();
    adminMock.credential.applicationDefault.mockReset();
    adminMock.auth.mockReset();
    adminMock.firestore.mockReset();

    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GCLOUD_PROJECT;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  });

  it('reuses existing admin app when already initialized', () => {
    const existingApp = { name: '[DEFAULT]' } as unknown as App;
    adminMock.apps.push(existingApp);
    adminMock.app.mockReturnValueOnce(existingApp);

    const mod = FirebaseModule.forRoot();
    const appProvider = getProvider(mod, FIREBASE_ADMIN_APP);
    const app = appProvider.useFactory();

    expect(app).toBe(existingApp);
    expect(adminMock.initializeApp).not.toHaveBeenCalled();
  });

  it('prefers explicit projectId option over env vars and service account', () => {
    process.env.FIREBASE_PROJECT_ID = 'env-project';
    const serviceAccountJson = JSON.stringify({ project_id: 'json-project', client_email: 'x', private_key: 'y' });

    const fakeCredential = { kind: 'cert' };
    adminMock.credential.cert.mockReturnValueOnce(fakeCredential);
    const fakeApp = { name: 'app' } as unknown as App;
    adminMock.initializeApp.mockReturnValueOnce(fakeApp);

    const mod = FirebaseModule.forRoot({ projectId: 'opt-project', serviceAccountJson });
    const appProvider = getProvider(mod, FIREBASE_ADMIN_APP);
    const app = appProvider.useFactory();

    expect(app).toBe(fakeApp);
    expect(adminMock.credential.cert).toHaveBeenCalled();
    expect(adminMock.initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'opt-project', credential: fakeCredential }),
    );
  });

  it('infers projectId from serviceAccountJson.project_id when not provided', () => {
    const serviceAccountJson = JSON.stringify({ project_id: 'json-project', client_email: 'x', private_key: 'y' });
    const fakeCredential = { kind: 'cert' };
    adminMock.credential.cert.mockReturnValueOnce(fakeCredential);
    adminMock.initializeApp.mockReturnValueOnce({} as unknown as App);

    const mod = FirebaseModule.forRoot({ serviceAccountJson });
    const appProvider = getProvider(mod, FIREBASE_ADMIN_APP);
    appProvider.useFactory();

    expect(adminMock.initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'json-project' }),
    );
  });

  it('auth provider uses admin.auth(app)', () => {
    const mod = FirebaseModule.forRoot();
    const authProvider = getProvider(mod, FIREBASE_AUTH);

    const app = {} as unknown as App;
    authProvider.useFactory(app);
    expect(adminMock.auth).toHaveBeenCalledWith(app);
  });

  it('firestore provider sets ignoreUndefinedProperties', () => {
    const db = { settings: vi.fn() };
    adminMock.firestore.mockReturnValueOnce(db);

    const mod = FirebaseModule.forRoot();
    const firestoreProvider = getProvider(mod, FIRESTORE);

    const app = {} as unknown as App;
    const got = firestoreProvider.useFactory(app);
    expect(got).toBe(db);
    expect(db.settings).toHaveBeenCalledWith({ ignoreUndefinedProperties: true });
  });
});


