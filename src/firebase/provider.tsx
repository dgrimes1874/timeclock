'use client';

import React, {createContext, useContext} from 'react';
import type {FirebaseApp} from 'firebase/app';
import type {Auth} from 'firebase/auth';
import type {Firestore} from 'firebase/firestore';
import {useUser} from './auth/use-user';
import {useCollection} from './firestore/use-collection';
import {useDoc} from './firestore/use-doc';

// The Firebase context object
interface FirebaseContextValue {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

// The Firebase provider component
export function FirebaseProvider({
  children,
  ...value
}: {
  children: React.ReactNode;
} & FirebaseContextValue) {
  const {Provider} = FirebaseContext;
  return <Provider value={value}>{children}</Provider>;
}

// Hook for accessing the Firebase context
export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
  return useFirebase().firebaseApp;
}

export function useAuth() {
  return useFirebase().auth;
}

export function useFirestore() {
  return useFirebase().firestore;
}

// Add the useUser, useCollection, and useDoc hooks
export {useUser, useCollection, useDoc};
