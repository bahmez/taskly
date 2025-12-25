'use client';

import type { FirebaseApp } from 'firebase/app';
import { getApps, initializeApp } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';
import type { Auth } from 'firebase/auth';
import { getAuth } from 'firebase/auth';

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

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedAnalytics: Analytics | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  // Avoid running Firebase init during SSR/prerender
  if (typeof window === 'undefined') return null;
  if (cachedApp) return cachedApp;

  const cfg = getFirebaseConfig();
  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) return null;

  cachedApp = getApps().length > 0 ? getApps()[0]! : initializeApp(cfg);
  return cachedApp;
}

export function getFirebaseAuth(): Auth | null {
  if (typeof window === 'undefined') return null;
  if (cachedAuth) return cachedAuth;

  const app = getFirebaseApp();
  if (!app) return null;

  cachedAuth = getAuth(app);
  return cachedAuth;
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null;
  if (cachedAnalytics) return cachedAnalytics;

  const cfg = getFirebaseConfig();
  // Analytics is optional (needs measurementId)
  if (!cfg.measurementId) return null;

  const app = getFirebaseApp();
  if (!app) return null;

  const { isSupported, getAnalytics } = await import('firebase/analytics');
  if (!(await isSupported())) return null;

  cachedAnalytics = getAnalytics(app);
  return cachedAnalytics;
}


