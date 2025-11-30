import ReportsClient from "@/components/admin/reports-client";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payroll Reports | TimeWise Payroll',
  description: 'Generate and view daily and weekly payroll reports.',
};

export default function ReportsPage() {
    return <ReportsClient />;
}
