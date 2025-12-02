'use client';

import { FirebaseProvider } from './provider';
import { initializeFirebase } from '.';
import React, { useState, useEffect } from 'react';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Loader2 } from 'lucide-react';

let firebaseApp: ReturnType<typeof initializeFirebase> | null = null;

function getFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }
  firebaseApp = initializeFirebase();
  return firebaseApp;
}

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    // This ensures that Firebase is initialized safely in the browser environment.
    getFirebaseApp();
    setInitialized(true);
  }, []);

  if (!initialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        Initializing Environment...
      </div>
    );
  }

  return (
    <FirebaseProvider {...getFirebaseApp()}>
      {children}
      <FirebaseErrorListener />
    </FirebaseProvider>
  );
}
