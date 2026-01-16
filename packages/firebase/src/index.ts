/**
 * Firebase Admin SDK Integration Package
 *
 * Provides NestJS module for Firebase Admin SDK initialization.
 *
 * Exports:
 * - FirebaseModule: NestJS module for dependency injection
 * - FIREBASE_ADMIN_APP: Injection token for FirebaseApp
 * - FIREBASE_AUTH: Injection token for Firebase Auth service
 * - FIRESTORE: Injection token for Firestore database
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [FirebaseModule.forRoot()]
 * })
 * export class AppModule {}
 * ```
 */

export { FirebaseModule } from './firebase.module';
export {
  FIREBASE_ADMIN_APP,
  FIREBASE_AUTH,
  FIRESTORE,
} from './firebase.constants';


