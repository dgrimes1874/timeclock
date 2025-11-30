'use client';

import {useState, useEffect, useMemo} from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type Firestore,
  type CollectionReference,
  type Query,
} from 'firebase/firestore';
import {useFirestore} from '..';
import type {Document} from '@/lib/data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function useCollection<T>(pathOrQuery: string | Query<T> | null): {
  data: Document<T>[];
  loading: boolean;
  error: Error | null;
  setData: React.Dispatch<React.SetStateAction<Document<T>[]>>;
};
function useCollection<T>(pathOrQuery: string | Query<T> | null) {
  const firestore = useFirestore();
  const [data, setData] = useState<Document<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const memoizedQuery = useMemo(() => {
    if (!firestore || !pathOrQuery) return null;
    return typeof pathOrQuery === 'string'
      ? (collection(firestore, pathOrQuery) as CollectionReference<T>)
      : (pathOrQuery as Query<T>);
  }, [pathOrQuery, firestore]);

  useEffect(() => {
    if (!memoizedQuery) {
      setLoading(false);
      setData([]); // Clear data when query is null
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      memoizedQuery,
      snapshot => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Document<T>[];
        setData(docs);
        setLoading(false);
      },
      async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: (memoizedQuery as Query).path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery]);

  return {data, loading, error, setData};
}

export {useCollection};
