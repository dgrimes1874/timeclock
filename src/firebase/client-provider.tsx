'use client';

import { FirebaseProvider } from './provider';
import { initializeFirebase } from '.';
import React from 'react';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// This function ensures that Firebase is initialized only once.
const firebaseApp = initializeFirebase();

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseProvider {...firebaseApp}>
      {children}
      <FirebaseErrorListener />
    </FirebaseProvider>
  );
}
