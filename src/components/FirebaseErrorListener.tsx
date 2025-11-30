'use client';

import {useEffect} from 'react';
import {errorEmitter} from '@/firebase/error-emitter';
import type {FirestorePermissionError} from '@/firebase/errors';
import {useToast} from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const {toast} = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error(
        'Firestore Permission Error:',
        JSON.stringify(error.context, null, 2)
      );
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description:
          'You do not have permission to perform this action. Check the developer console for details.',
      });
      // In a production environment, you might want to log this to a service
      // like Sentry, but for development, we'll throw to show the Next.js overlay.
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
