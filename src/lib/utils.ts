import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { intervalToDuration, isAfter, set, startOfWeek, endOfWeek, eachDayOfInterval, addDays, format } from 'date-fns';
import type { Employee, TimeEntry, Document } from '@/lib/data';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function isLate(clockInTime: Date): boolean {
  const onTimeDeadline = set(clockInTime, { hours: 7, minutes: 0, seconds: 59 });
  return isAfter(clockInTime, onTimeDeadline);
}

export function calculateHoursWorked(clockIn: Date | null, clockOut: Date | null): number {
  if (!clockIn || !clockOut) return 0;
  // If clock out is before clock in, it's the next day
  const effectiveClockOut = isAfter(clockOut, clockIn) ? clockOut : addDays(clockOut, 1);
  const duration = intervalToDuration({ start: clockIn, end: effectiveClockOut });
  const hours = (duration.hours ?? 0) + ((duration.minutes ?? 0) / 60);
  return parseFloat(hours.toFixed(2));
}

export function formatHours(hours: number): string {
    if (hours === 0) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
}

export function calculatePay(employee: Document<Employee>, entry: Document<TimeEntry>): { totalPay: number; wasLate: boolean; hours: number; basePay: number; bonus: number; } {
  if (!entry.clockIn) {
    return { totalPay: 0, wasLate: false, hours: 0, basePay: 0, bonus: 0 };
  }
  
  const wasLate = isLate(entry.clockIn.toDate());
  const hours = calculateHoursWorked(entry.clockIn.toDate(), entry.clockOut?.toDate() || null);
  const basePay = hours * employee.hourlyRate;
  const bonus = wasLate ? 0 : hours * employee.onTimeBonus;

  const totalPay = basePay + bonus;

  return { totalPay, wasLate, hours, basePay, bonus };
}

export function getWeekDateRange(date: Date = new Date()): { start: Date, end: Date } {
    const start = startOfWeek(date, { weekStartsOn: 6 }); // Saturday
    const end = endOfWeek(date, { weekStartsOn: 6 }); // Friday
    return { start, end };
}

export function getWeekDays(start: Date): Date[] {
    return eachDayOfInterval({ start, end: addDays(start, 6) });
}

export function generateCsvContent(reportData: any[], weekDays: Date[]): string {
    const headers = [
        'Employee',
        ...weekDays.map(day => `${format(day, 'EEE')} Clock In`),
        ...weekDays.map(day => `${format(day, 'EEE')} Clock Out`),
        'Total Regular Hours',
        'Regular Pay',
        'Total Bonus Hours',
        'Bonus Pay',
        'Total Payroll'
    ];

    const rows = reportData.map(data => {
        const row = [
            `"${data.employee.name}"`,
            ...weekDays.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayEntry = data.dailyData[dayStr]?.entry;
                return dayEntry?.clockIn ? format(dayEntry.clockIn.toDate(), 'h:mm aa') : '';
            }),
            ...weekDays.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayEntry = data.dailyData[dayStr]?.entry;
                return dayEntry?.clockOut ? format(dayEntry.clockOut.toDate(), 'h:mm aa') : '';
            }),
            data.summary.totalRegularHours.toFixed(2),
            formatCurrency(data.summary.totalBasePay),
            data.summary.totalBonusHours.toFixed(2),
            formatCurrency(data.summary.totalBonusPay),
            formatCurrency(data.summary.totalPayroll)
        ];
        return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}
