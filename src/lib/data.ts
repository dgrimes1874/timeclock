import type { Timestamp } from 'firebase/firestore';

export interface Document {
  id: string;
}

export interface Employee {
  name: string;
  hourlyRate: number;
  onTimeBonus: number;
  rules: string;
  active: boolean;
}

export interface TimeEntry {
  employeeId: string;
  clockIn: Timestamp | null;
  clockOut: Timestamp | null;
  date: Timestamp;
}

export interface Bonus {
  employeeId: string;
  amount: number;
  reason: string;
  date: Timestamp;
}
