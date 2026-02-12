'use client';

import React from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from '.';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // This function initializes Firebase and gets the app, auth, and firestore instances.
  const { firebaseApp, auth, firestore } = initializeFirebase();

  return (
    <FirebaseProvider firebaseApp={firebaseApp} auth={auth} firestore={firestore}>
      {children}
      <FirebaseErrorListener />
    </FirebaseProvider>
  );
}
