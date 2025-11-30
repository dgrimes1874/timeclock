'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { employees as initialEmployees, timeEntries as initialTimeEntries } from '@/lib/data';
import type { Employee, TimeEntry } from '@/lib/data';
import { format } from 'date-fns';
import { formatCurrency, calculatePay, getWeekDateRange, getWeekDays, generateCsvContent, isLate } from '@/lib/utils';
import { Download } from 'lucide-react';

interface WeeklyReportData {
    employee: Employee;
    dailyData: {
        [date: string]: {
            clockIn: Date | null;
            clockOut: Date | null;
            wasLate: boolean;
        };
    };
    summary: {
        totalRegularHours: number;
        totalBonusHours: number;
        totalBasePay: number;
        totalBonusPay: number;
        totalPayroll: number;
    };
}

export default function ReportsClient() {
  const [employees] = useState<Employee[]>(initialEmployees);
  const [timeEntries] = useState<TimeEntry[]>(initialTimeEntries);
  
  const { start, end } = getWeekDateRange();
  const weekDays = getWeekDays(start);

  const weeklyReportData: WeeklyReportData[] = useMemo(() => {
    return employees.map(employee => {
        const employeeEntries = timeEntries.filter(
            entry => entry.employeeId === employee.id && entry.clockIn && entry.clockOut && entry.date >= start && entry.date <= end
        );

        let totalRegularHours = 0;
        let totalBonusHours = 0;
        let totalBasePay = 0;
        let totalBonusPay = 0;

        const dailyData: WeeklyReportData['dailyData'] = {};

        weekDays.forEach(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const entryForDay = employeeEntries.find(e => format(e.date, 'yyyy-MM-dd') === dayStr);

            if (entryForDay) {
                const { wasLate, hours, basePay, bonus } = calculatePay(employee, entryForDay);
                dailyData[dayStr] = { clockIn: entryForDay.clockIn, clockOut: entryForDay.clockOut, wasLate };
                totalRegularHours += hours;
                totalBasePay += basePay;
                if (!wasLate) {
                    totalBonusHours += hours;
                    totalBonusPay += bonus;
                }
            } else {
                dailyData[dayStr] = { clockIn: null, clockOut: null, wasLate: false };
            }
        });
        
        const totalPayroll = totalBasePay + totalBonusPay;

        return {
            employee,
            dailyData,
            summary: {
                totalRegularHours,
                totalBonusHours,
                totalBasePay,
                totalBonusPay,
                totalPayroll,
            }
        };
    });
  }, [employees, timeEntries, start, end, weekDays]);

  const handleDownloadCsv = () => {
    const csvContent = generateCsvContent(weeklyReportData, weekDays);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
        URL.revokeObjectURL(link.href);
    }
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `payroll_report_${format(start, 'yyyy-MM-dd')}_to_${format(end, 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid gap-6">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Detailed Weekly Payroll Report</CardTitle>
                        <CardDescription>
                            Report for the week of {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}.
                            The week starts on Saturday and ends on Friday.
                        </CardDescription>
                    </div>
                    <Button onClick={handleDownloadCsv}>
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead rowSpan={2} className="sticky left-0 bg-card z-10">Employee</TableHead>
                                {weekDays.map(day => (
                                    <TableHead key={format(day, 'T')} className="text-center min-w-[120px]">{format(day, 'EEE')}</TableHead>
                                ))}
                                <TableHead colSpan={2} className="text-center">Regular Pay</TableHead>
                                <TableHead colSpan={2} className="text-center">Bonus Pay</TableHead>
                                <TableHead rowSpan={2} className="text-right">Total Payroll</TableHead>
                            </TableRow>
                            <TableRow>
                                {weekDays.map(day => (
                                    <TableHead key={`${format(day, 'T')}-sub`} className="text-center text-xs font-normal text-muted-foreground p-1">In / Out</TableHead>
                                ))}
                                <TableHead className="text-center text-xs font-normal text-muted-foreground p-1">Hours</TableHead>
                                <TableHead className="text-center text-xs font-normal text-muted-foreground p-1">Amount</TableHead>
                                <TableHead className="text-center text-xs font-normal text-muted-foreground p-1">Hours</TableHead>
                                <TableHead className="text-center text-xs font-normal text-muted-foreground p-1">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {weeklyReportData.map(({ employee, dailyData, summary }) => (
                                <React.Fragment key={employee.id}>
                                    <TableRow className="bg-muted/20">
                                        <TableCell className="font-semibold sticky left-0 bg-muted/20 z-10">{employee.name}</TableCell>
                                        {weekDays.map(day => {
                                            const dayStr = format(day, 'yyyy-MM-dd');
                                            const dayData = dailyData[dayStr];
                                            return (
                                                <TableCell key={dayStr} className="text-center">
                                                    {dayData.clockIn && dayData.clockOut ? (
                                                        <div className={dayData.wasLate ? 'text-red-600' : ''}>
                                                            {format(dayData.clockIn, 'HH:mm')} / {format(dayData.clockOut, 'HH:mm')}
                                                        </div>
                                                    ) : '--'}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell className="text-center">{summary.totalRegularHours.toFixed(2)}</TableCell>
                                        <TableCell className="text-center">{formatCurrency(summary.totalBasePay)}</TableCell>
                                        <TableCell className="text-center">{summary.totalBonusHours.toFixed(2)}</TableCell>
                                        <TableCell className="text-center">{formatCurrency(summary.totalBonusPay)}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(summary.totalPayroll)}</TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
