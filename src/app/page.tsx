import TimeclockPublicClient from "@/components/crew/timeclock-public-client";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Time Clock | TimeWise Payroll',
  description: 'Clock in or out for your shift.',
};
export default function HomePage() {
    return (
      <FirebaseClientProvider>
        <TimeclockPublicClient />
      </FirebaseClientProvider>
    );
}
