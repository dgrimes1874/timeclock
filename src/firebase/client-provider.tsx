'use client';

import React, { useEffect } from 'react';
import { FirebaseProvider, useFirestore } from './provider';
import { initializeFirebase } from '.';
import { enableIndexedDbPersistence } from 'firebase/firestore';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

const firebaseApp = initializeFirebase();

function OfflinePersistenceProvider({ children }: { children: React.ReactNode }) {
    const firestore = useFirestore();

    useEffect(() => {
        const enablePersistence = async () => {
            try {
                await enableIndexedDbPersistence(firestore);
            } catch (err: any) {
                if (err.code === 'failed-precondition') {
                    console.warn(
                        'Firebase persistence failed to enable. It may be active in another tab.'
                    );
                } else if (err.code === 'unimplemented') {
                    console.warn('Firebase persistence is not supported in this browser.');
                }
            }
        };

        enablePersistence();
    }, [firestore]);

    return <>{children}</>;
}


export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseProvider {...firebaseApp}>
      <OfflinePersistenceProvider>
        {children}
      </OfflinePersistenceProvider>
      <FirebaseErrorListener />
    </FirebaseProvider>
  );
}
