'use client';

import React, { useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from '.';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const firebaseApp = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider {...firebaseApp}>
      {children}
      <FirebaseErrorListener />
    </FirebaseProvider>
  );
}
