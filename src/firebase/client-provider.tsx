'use client';

import {FirebaseProvider} from './provider';
import {initializeFirebase} from '.';
import React from 'react';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

let firebaseApp: ReturnType<typeof initializeFirebase> | null = null;

function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }
  firebaseApp = initializeFirebase();
  return firebaseApp;
}

export function FirebaseClientProvider({children}: {children: React.ReactNode}) {
  // We are using this provider to ensure that the client-side firebase app is initialized only once.
  const {} = getFirebaseApp();
  return (
    <FirebaseProvider {...getFirebaseApp()}>
      {children}
      <FirebaseErrorListener />
    </FirebaseProvider>
  );
}
