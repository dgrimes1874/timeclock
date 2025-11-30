import DashboardClient from '@/components/admin/dashboard-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | TimeWise Payroll',
  description: 'Live status dashboard for all crew members.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
