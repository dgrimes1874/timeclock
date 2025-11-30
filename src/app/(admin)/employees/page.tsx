import EmployeesClient from "@/components/admin/employees-client";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employees | TimeWise Payroll',
  description: 'Manage your crew members and their payroll rules.',
};

export default function EmployeesPage() {
    return <EmployeesClient />;
}
