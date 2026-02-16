import {initializeApp, getApps, FirebaseApp} from 'firebase/app';
import {getAuth, Auth} from 'firebase/auth';
import {initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore} from 'firebase/firestore';
import {firebaseConfig} from './config';
export {useCollection} from './firestore/use-collection';
export {useDoc} from './firestore/use-doc';
export * from './provider';
let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
export function initializeFirebase() {
  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    firestore = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } else {
    firebaseApp = getApps()[0];
    auth = getAuth(firebaseApp);
    // After first init, just get the existing instance
    const { getFirestore } = require('firebase/firestore');
    firestore = getFirestore(firebaseApp);
  }
  return {firebaseApp, auth, firestore};
}
