'use client';

import React from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from '.';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// This component now solely focuses on initializing Firebase on the client
// and setting up the provider and error listener.
export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const { firebaseApp, auth, firestore } = initializeFirebase();

  return (
    <FirebaseProvider firebaseApp={firebaseApp} auth={auth} firestore={firestore}>
      {children}
      <FirebaseErrorListener />
    </FirebaseProvider>
  );
}
