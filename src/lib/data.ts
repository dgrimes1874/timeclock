import { subDays, set } from 'date-fns';

export type Employee = {
  id: string;
  name: string;
  hourlyRate: number;
  onTimeBonus: number;
  rules: string;
};

export type TimeEntry = {
  id: string;
  employeeId: string;
  clockIn: Date | null;
  clockOut: Date | null;
  date: Date;
};

export const employees: Employee[] = [
  { id: '1', name: 'John Doe', hourlyRate: 25, onTimeBonus: 5, rules: 'Standard pay rules apply.' },
  { id: '2', name: 'Jane Smith', hourlyRate: 30, onTimeBonus: 5, rules: 'Standard pay rules apply.' },
  { id: '3', name: 'Mike Johnson', hourlyRate: 22, onTimeBonus: 4, rules: 'Standard pay rules apply.' },
  { id: '4', name: 'Emily Davis', hourlyRate: 28, onTimeBonus: 5, rules: 'Standard pay rules apply.' },
  { id: '5', name: 'Chris Brown', hourlyRate: 35, onTimeBonus: 6, rules: 'Eligible for overtime after 8 hours.' },
];

const today = new Date();

export const timeEntries: TimeEntry[] = [
  // John Doe - This week
  { id: 't1', employeeId: '1', clockIn: set(subDays(today, 6), { hours: 6, minutes: 58 }), clockOut: set(subDays(today, 6), { hours: 16, minutes: 5 }), date: subDays(today, 6) }, // On-time
  { id: 't2', employeeId: '1', clockIn: set(subDays(today, 5), { hours: 7, minutes: 10 }), clockOut: set(subDays(today, 5), { hours: 15, minutes: 30 }), date: subDays(today, 5) }, // Late
  { id: 't3', employeeId: '1', clockIn: set(subDays(today, 4), { hours: 6, minutes: 55 }), clockOut: set(subDays(today, 4), { hours: 16, minutes: 0 }), date: subDays(today, 4) }, // On-time
  { id: 't16', employeeId: '1', clockIn: set(subDays(today, 3), { hours: 6, minutes: 59 }), clockOut: set(subDays(today, 3), { hours: 16, minutes: 0 }), date: subDays(today, 3) }, // On-time
  { id: 't17', employeeId: '1', clockIn: set(subDays(today, 2), { hours: 7, minutes: 1 }), clockOut: set(subDays(today, 2), { hours: 16, minutes: 0 }), date: subDays(today, 2) }, // Late
  { id: 't11', employeeId: '1', clockIn: set(today, { hours: 6, minutes: 59 }), clockOut: null, date: today }, // In progress

  // Jane Smith - This week
  { id: 't4', employeeId: '2', clockIn: set(subDays(today, 6), { hours: 6, minutes: 50 }), clockOut: set(subDays(today, 6), { hours: 16, minutes: 15 }), date: subDays(today, 6) }, // On-time
  { id: 't5', employeeId: '2', clockIn: set(subDays(today, 5), { hours: 6, minutes: 59 }), clockOut: set(subDays(today, 5), { hours: 16, minutes: 2 }), date: subDays(today, 5) }, // On-time
  { id: 't18', employeeId: '2', clockIn: set(subDays(today, 4), { hours: 7, minutes: 30 }), clockOut: set(subDays(today, 4), { hours: 17, minutes: 2 }), date: subDays(today, 4) }, // Late
  { id: 't12', employeeId: '2', clockIn: set(today, { hours: 7, minutes: 15 }), clockOut: null, date: today }, // In progress, Late
  { id: 't20', employeeId: '2', clockIn: set(subDays(today, 3), { hours: 6, minutes: 55 }), clockOut: set(subDays(today, 3), { hours: 16, minutes: 0 }), date: subDays(today, 3) }, // On-time
  { id: 't21', employeeId: '2', clockIn: set(subDays(today, 2), { hours: 6, minutes: 58 }), clockOut: set(subDays(today, 2), { hours: 16, minutes: 5 }), date: subDays(today, 2) }, // On-time
  { id: 't22', employeeId: '2', clockIn: set(subDays(today, 1), { hours: 7, minutes: 5 }), clockOut: set(subDays(today, 1), { hours: 16, minutes: 10 }), date: subDays(today, 1) }, // Late

  // Mike Johnson - Mixed
  { id: 't6', employeeId: '3', clockIn: set(subDays(today, 8), { hours: 7, minutes: 5 }), clockOut: set(subDays(today, 8), { hours: 15, minutes: 0 }), date: subDays(today, 8) }, // Last week, late
  { id: 't7', employeeId: '3', clockIn: set(subDays(today, 2), { hours: 7, minutes: 20 }), clockOut: set(subDays(today, 2), { hours: 16, minutes: 10 }), date: subDays(today, 2) }, // This week, late
  { id: 't13', employeeId: '3', clockIn: null, clockOut: null, date: today }, // Not clocked in
  { id: 't23', employeeId: '3', clockIn: set(subDays(today, 6), { hours: 7, minutes: 15 }), clockOut: set(subDays(today, 6), { hours: 15, minutes: 0 }), date: subDays(today, 6) }, // Late
  { id: 't24', employeeId: '3', clockIn: set(subDays(today, 5), { hours: 6, minutes: 50 }), clockOut: set(subDays(today, 5), { hours: 15, minutes: 5 }), date: subDays(today, 5) }, // On-time
  { id: 't25', employeeId: '3', clockIn: set(subDays(today, 4), { hours: 6, minutes: 58 }), clockOut: set(subDays(today, 4), { hours: 15, minutes: 10 }), date: subDays(today, 4) }, // On-time
  { id: 't26', employeeId: '3', clockIn: set(subDays(today, 3), { hours: 7, minutes: 1 }), clockOut: set(subDays(today, 3), { hours: 15, minutes: 15 }), date: subDays(today, 3) }, // Late
  { id: 't27', employeeId: '3', clockIn: set(subDays(today, 1), { hours: 6, minutes: 59 }), clockOut: set(subDays(today, 1), { hours: 15, minutes: 5 }), date: subDays(today, 1) }, // On-time

  // Emily Davis
  { id: 't8', employeeId: '4', clockIn: set(subDays(today, 4), { hours: 6, minutes: 45 }), clockOut: set(subDays(today, 4), { hours: 17, minutes: 0 }), date: subDays(today, 4) }, // On-time
  { id: 't14', employeeId: '4', clockIn: set(today, { hours: 6, minutes: 55 }), clockOut: null, date: today }, // In progress, on-time
  { id: 't28', employeeId: '4', clockIn: set(subDays(today, 6), { hours: 6, minutes: 55 }), clockOut: set(subDays(today, 6), { hours: 16, minutes: 30 }), date: subDays(today, 6) }, // On-time
  { id: 't29', employeeId: '4', clockIn: set(subDays(today, 5), { hours: 6, minutes: 59 }), clockOut: set(subDays(today, 5), { hours: 16, minutes: 35 }), date: subDays(today, 5) }, // On-time
  { id: 't30', employeeId: '4', clockIn: set(subDays(today, 3), { hours: 7, minutes: 10 }), clockOut: set(subDays(today, 3), { hours: 16, minutes: 40 }), date: subDays(today, 3) }, // Late
  { id: 't31', employeeId: '4', clockIn: set(subDays(today, 2), { hours: 6, minutes: 50 }), clockOut: set(subDays(today, 2), { hours: 16, minutes: 45 }), date: subDays(today, 2) }, // On-time
  { id: 't32', employeeId: '4', clockIn: set(subDays(today, 1), { hours: 6, minutes: 58 }), clockOut: set(subDays(today, 1), { hours: 16, minutes: 50 }), date: subDays(today, 1) }, // On-time

  // Chris Brown (no recent entries)
  { id: 't9', employeeId: '5', clockIn: set(subDays(today, 10), { hours: 6, minutes: 55 }), clockOut: set(subDays(today, 10), { hours: 18, minutes: 0 }), date: subDays(today, 10) },
  { id: 't10', employeeId: '5', clockIn: set(subDays(today, 11), { hours: 7, minutes: 1 }), clockOut: set(subDays(today, 11), { hours: 17, minutes: 30 }), date: subDays(today, 11) },
  { id: 't15', employeeId: '5', clockIn: null, clockOut: null, date: today },
];
