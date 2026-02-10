'use client';

import React from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from '.';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const { firebaseApp, auth, firestore } = initializeFirebase();

  return (
    <FirebaseProvider firebaseApp={firebaseApp} auth={auth} firestore={firestore}>
      {children}
      <FirebaseErrorListener />
    </FirebaseProvider>
  );
}
