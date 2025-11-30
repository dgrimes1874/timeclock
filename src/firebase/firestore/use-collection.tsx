'use client';

import {useState, useEffect, useMemo} from 'react';
import {
  onSnapshot,
  query,
  where,
  type Firestore,
  type CollectionReference,
  type Query,
  collection
} from 'firebase/firestore';
import type {Document} from '@/lib/data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useFirestore } from '..';

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
    if (typeof pathOrQuery === 'string') {
      return collection(firestore, pathOrQuery) as Query<T>;
    }
    return pathOrQuery;
  }, [firestore, pathOrQuery]);

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
            path: (memoizedQuery as any)._path?.toString(),
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
