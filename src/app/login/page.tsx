import LoginClient from '@/components/auth/login-client';
import type { Metadata } from 'next';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
    title: 'Admin Login | TimeWise Payroll',
    description: 'Log in to the admin dashboard.',
};

export default function LoginPage() {
    return (
        <FirebaseClientProvider>
            <LoginClient />
        </FirebaseClientProvider>
    );
}
