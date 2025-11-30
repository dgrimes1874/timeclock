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

function useCollection<T>(pathOrQuery: string | Query<T>): {
  data: Document<T>[];
  loading: boolean;
  error: Error | null;
  firestore: Firestore;
};
function useCollection<T>(
  pathOrQuery: string | Query<T>
): {data: Document<T>[]; loading: boolean; error: Error | null; firestore: Firestore} {
  const firestore = useFirestore();
  const [data, setData] = useState<Document<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const memoizedQuery = useMemo(() => {
    if (!pathOrQuery) return null;
    return typeof pathOrQuery === 'string'
      ? (collection(firestore, pathOrQuery) as CollectionReference<T>)
      : (pathOrQuery as Query<T>);
  }, [pathOrQuery, firestore]);

  useEffect(() => {
    if (!memoizedQuery) {
      setLoading(false);
      return;
    }

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
      err => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery]);

  return {data, loading, error, firestore};
}

export {useCollection};
