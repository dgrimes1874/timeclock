'use client';

import React from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from '.';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // Directly initialize Firebase. The component ensures this only runs on the client.
  const { firebaseApp, auth, firestore } = initializeFirebase();

  return (
    <FirebaseProvider firebaseApp={firebaseApp} auth={auth} firestore={firestore}>
      {children}
      <FirebaseErrorListener />
    </FirebaseProvider>
  );
}
