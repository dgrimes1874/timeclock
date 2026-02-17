import {initializeApp, getApps, FirebaseApp} from 'firebase/app';
import {getAuth, Auth} from 'firebase/auth';
import {initializeFirestore, persistentLocalCache, persistentSingleTabManager, Firestore} from 'firebase/firestore';
import {firebaseConfig} from './config';
export {useCollection} from './firestore/use-collection';
export {useDoc} from './firestore/use-doc';
export * from './provider';
let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let initialized = false;

export function initializeFirebase() {
  if (!initialized && getApps().length === 0) {
    initialized = true;
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    firestore = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({ forceOwnership: true }),
      }),
    });
  } else if (!initialized) {
    initialized = true;
    firebaseApp = getApps()[0];
    auth = getAuth(firebaseApp);
    const { getFirestore } = require('firebase/firestore');
    firestore = getFirestore(firebaseApp);
  }
  return {firebaseApp, auth, firestore};
}
