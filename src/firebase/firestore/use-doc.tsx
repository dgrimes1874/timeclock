'use client';

import {useState, useEffect, useMemo} from 'react';
import {
  doc,
  onSnapshot,
  type Firestore,
  type DocumentReference,
} from 'firebase/firestore';
import {useFirestore} from '..';
import type {Document} from '@/lib/data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export function useDoc<T>(pathOrRef: string | DocumentReference<T> | null) {
  const firestore = useFirestore();
  const [data, setData] = useState<Document<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const memoizedRef = useMemo(() => {
    if (!firestore || !pathOrRef) return null;
    return typeof pathOrRef === 'string'
      ? (doc(firestore, pathOrRef) as DocumentReference<T>)
      : (pathOrRef as DocumentReference<T>);
  }, [pathOrRef, firestore]);

  useEffect(() => {
    if (!memoizedRef) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      memoizedRef,
      snapshot => {
        if (snapshot.exists()) {
          const docData = {
            id: snapshot.id,
            ...snapshot.data(),
          } as Document<T>;
          setData(docData);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: memoizedRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedRef]);

  return {data, loading, error};
}
