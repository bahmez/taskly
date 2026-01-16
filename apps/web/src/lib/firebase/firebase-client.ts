/**
 * Firebase Client Library (Client-side only)
 *
 * This module initializes and caches Firebase instances for use in the frontend.
 * All functions check for browser environment to prevent SSR issues.
 *
 * Features:
 * - Firebase App initialization from environment variables
 * - Authentication (Firebase Auth) provider
 * - Google Analytics (optional)
 * - Instance caching to prevent re-initialization
 * - Safe SSR handling (returns null during server-side rendering)
 *
 * Environment variables required (NEXT_PUBLIC_* prefix for client access):
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (optional)
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID (optional)
 * - NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (optional, for Analytics)
 */

'use client';

import type { FirebaseApp } from 'firebase/app';
import { getApps, initializeApp } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';
import type { Auth } from 'firebase/auth';
import { getAuth } from 'firebase/auth';

/**
 * Reads Firebase configuration from environment variables.
 * Validates required fields and logs warnings if missing.
 * 
 * @returns Firebase configuration object with all available settings
 */
function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) {
    // eslint-disable-next-line no-console
    console.warn(
      '[firebase] Missing env vars. Please set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID',
    );
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

/** Cached Firebase App instance (null during SSR) */
let cachedApp: FirebaseApp | null = null;
/** Cached Firebase Auth instance (null during SSR) */
let cachedAuth: Auth | null = null;
/** Cached Firebase Analytics instance (null during SSR) */
let cachedAnalytics: Analytics | null = null;

/**
 * Gets or initializes the Firebase App instance.
 * Safe for SSR - returns null during server-side rendering.
 * 
 * @returns Firebase App instance or null if not in browser or config is invalid
 */
export function getFirebaseApp(): FirebaseApp | null {
  // Avoid running Firebase init during SSR/prerender
  if (typeof window === 'undefined') return null;
  if (cachedApp) return cachedApp;

  const cfg = getFirebaseConfig();
  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) return null;

  cachedApp = getApps().length > 0 ? getApps()[0]! : initializeApp(cfg);
  return cachedApp;
}

/**
 * Gets or initializes the Firebase Auth instance.
 * Safe for SSR - returns null during server-side rendering.
 * 
 * @returns Firebase Auth instance or null if not in browser or app initialization fails
 */
export function getFirebaseAuth(): Auth | null {
  if (typeof window === 'undefined') return null;
  if (cachedAuth) return cachedAuth;

  const app = getFirebaseApp();
  if (!app) return null;

  cachedAuth = getAuth(app);
  return cachedAuth;
}

/**
 * Gets or initializes the Firebase Analytics instance.
 * Safe for SSR - returns null during server-side rendering.
 * Analytics is optional and requires NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID.
 * 
 * @returns Firebase Analytics instance or null if not in browser, not configured, or not supported
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (cachedAnalytics) return cachedAnalytics;

  const cfg = getFirebaseConfig();
  // Analytics is optional (needs measurementId)
  if (!cfg.measurementId) return null;

  const app = getFirebaseApp();
  if (!app) return null;

  // Dynamic import for Analytics (to keep bundle size smaller if not needed)
  const { isSupported, getAnalytics } = await import('firebase/analytics');
  if (!(await isSupported())) return null;

  cachedAnalytics = getAnalytics(app);
  return cachedAnalytics;
}


