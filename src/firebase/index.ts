import {initializeApp, getApps, FirebaseApp} from 'firebase/app';
import {getAuth, Auth} from 'firebase/auth';
import {getFirestore, Firestore, enableIndexedDbPersistence} from 'firebase/firestore';

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
    firestore = getFirestore(firebaseApp);

    enableIndexedDbPersistence(firestore).catch(err => {
      if (err.code == 'failed-precondition') {
        // This can happen if multiple tabs are open. Persistence will still work in the primary tab.
        console.warn(
          'Firebase persistence failed to enable in this tab. It may be active in another tab.'
        );
      } else if (err.code == 'unimplemented') {
        // The browser does not support persistence.
        console.warn('Firebase persistence is not supported in this browser.');
      }
    });
  } else {
    firebaseApp = getApps()[0];
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  }

  return {firebaseApp, auth, firestore};
}
