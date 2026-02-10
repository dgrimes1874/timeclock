import ClockClient from "@/components/crew/clock-client";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crew Clock In/Out | TimeWise Payroll',
  description: 'Clock in or out for your shift.',
};

export default function HomePage() {
    return (
      <FirebaseClientProvider>
        <ClockClient />
      </FirebaseClientProvider>
    );
}
