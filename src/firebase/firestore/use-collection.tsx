'use client';

import {useState, useEffect, useMemo} from 'react';
import {
  onSnapshot,
  query,
  where,
  type Firestore,
  type CollectionReference,
  type Query,
} from 'firebase/firestore';
import type {Document} from '@/lib/data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function useCollection<T>(q: Query<T> | null): {
  data: Document<T>[];
  loading: boolean;
  error: Error | null;
  setData: React.Dispatch<React.SetStateAction<Document<T>[]>>;
};
function useCollection<T>(q: Query<T> | null) {
  const [data, setData] = useState<Document<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      setData([]); // Clear data when query is null
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      q,
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
            path: (q as Query).path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(permissionError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [q]);

  return {data, loading, error, setData};
}

export {useCollection};
