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
  { id: '1', name: 'John Doe', hourlyRate: 25, onTimeBonus: 50, rules: 'Standard pay rules apply.' },
  { id: '2', name: 'Jane Smith', hourlyRate: 30, onTimeBonus: 50, rules: 'Standard pay rules apply.' },
  { id: '3', name: 'Mike Johnson', hourlyRate: 22, onTimeBonus: 40, rules: 'Standard pay rules apply.' },
  { id: '4', name: 'Emily Davis', hourlyRate: 28, onTimeBonus: 50, rules: 'Standard pay rules apply.' },
  { id: '5', name: 'Chris Brown', hourlyRate: 35, onTimeBonus: 60, rules: 'Eligible for overtime after 8 hours.' },
];

const today = new Date();

export const timeEntries: TimeEntry[] = [
  // John Doe
  { id: 't1', employeeId: '1', clockIn: set(subDays(today, 1), { hours: 6, minutes: 58 }), clockOut: set(subDays(today, 1), { hours: 16, minutes: 5 }), date: subDays(today, 1) },
  { id: 't2', employeeId: '1', clockIn: set(subDays(today, 2), { hours: 7, minutes: 10 }), clockOut: set(subDays(today, 2), { hours: 15, minutes: 30 }), date: subDays(today, 2) },
  { id: 't3', employeeId: '1', clockIn: set(subDays(today, 3), { hours: 6, minutes: 55 }), clockOut: set(subDays(today, 3), { hours: 16, minutes: 0 }), date: subDays(today, 3) },
  { id: 't11', employeeId: '1', clockIn: set(today, { hours: 6, minutes: 59 }), clockOut: null, date: today },

  // Jane Smith
  { id: 't4', employeeId: '2', clockIn: set(subDays(today, 1), { hours: 6, minutes: 50 }), clockOut: set(subDays(today, 1), { hours: 16, minutes: 15 }), date: subDays(today, 1) },
  { id: 't5', employeeId: '2', clockIn: set(subDays(today, 2), { hours: 6, minutes: 59 }), clockOut: set(subDays(today, 2), { hours: 16, minutes: 2 }), date: subDays(today, 2) },
  { id: 't12', employeeId: '2', clockIn: set(today, { hours: 7, minutes: 15 }), clockOut: null, date: today },

  // Mike Johnson
  { id: 't6', employeeId: '3', clockIn: set(subDays(today, 1), { hours: 7, minutes: 5 }), clockOut: set(subDays(today, 1), { hours: 15, minutes: 0 }), date: subDays(today, 1) },
  { id: 't7', employeeId: '3', clockIn: set(subDays(today, 2), { hours: 7, minutes: 20 }), clockOut: set(subDays(today, 2), { hours: 16, minutes: 10 }), date: subDays(today, 2) },
  { id: 't13', employeeId: '3', clockIn: null, clockOut: null, date: today },

  // Emily Davis
  { id: 't8', employeeId: '4', clockIn: set(subDays(today, 1), { hours: 6, minutes: 45 }), clockOut: set(subDays(today, 1), { hours: 17, minutes: 0 }), date: subDays(today, 1) },
  { id: 't14', employeeId: '4', clockIn: set(today, { hours: 6, minutes: 55 }), clockOut: null, date: today },

  // Chris Brown (no recent entries)
  { id: 't9', employeeId: '5', clockIn: set(subDays(today, 5), { hours: 6, minutes: 55 }), clockOut: set(subDays(today, 5), { hours: 18, minutes: 0 }), date: subDays(today, 5) },
  { id: 't10', employeeId: '5', clockIn: set(subDays(today, 6), { hours: 7, minutes: 1 }), clockOut: set(subDays(today, 6), { hours: 17, minutes: 30 }), date: subDays(today, 6) },
  { id: 't15', employeeId: '5', clockIn: null, clockOut: null, date: today },
];
