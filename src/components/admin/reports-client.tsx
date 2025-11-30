'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { employees as initialEmployees, timeEntries as initialTimeEntries } from '@/lib/data';
import type { Employee, TimeEntry } from '@/lib/data';
import { format } from 'date-fns';
import { formatCurrency, calculatePay, formatHours } from '@/lib/utils';
import { generateReportSummaries } from '@/ai/flows/generate-report-summaries';
import { useToast } from '@/hooks/use-toast';
import { Bot, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DailyReportEntry {
  employee: Employee;
  entry: TimeEntry;
  payDetails: {
    totalPay: number;
    wasLate: boolean;
    hours: number;
    basePay: number;
    bonus: number;
  };
}

interface WeeklySummary {
    employee: Employee;
    totalHours: number;
    totalPay: number;
}

export default function ReportsClient() {
  const [employees] = useState<Employee[]>(initialEmployees);
  const [timeEntries] = useState<TimeEntry[]>(initialTimeEntries);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();

  const dailyReportData: DailyReportEntry[] = useMemo(() => {
    return timeEntries
      .filter(entry => entry.clockIn && entry.clockOut)
      .map(entry => {
        const employee = employees.find(e => e.id === entry.employeeId);
        if (!employee) return null;
        const payDetails = calculatePay(employee, entry);
        return { employee, entry, payDetails };
      })
      .filter((e): e is DailyReportEntry => e !== null)
      .sort((a, b) => b.entry.date.getTime() - a.entry.date.getTime());
  }, [timeEntries, employees]);
  
  const weeklySummaryData: WeeklySummary[] = useMemo(() => {
    const summaryMap = new Map<string, { totalHours: number, totalPay: number }>();
    dailyReportData.forEach(({ employee, payDetails }) => {
        const current = summaryMap.get(employee.id) || { totalHours: 0, totalPay: 0 };
        current.totalHours += payDetails.hours;
        current.totalPay += payDetails.totalPay;
        summaryMap.set(employee.id, current);
    });
    
    return Array.from(summaryMap.entries()).map(([employeeId, data]) => {
        const employee = employees.find(e => e.id === employeeId)!;
        return { employee, ...data };
    });
  }, [dailyReportData, employees]);

  const handleGenerateSummary = async () => {
    setAiLoading(true);
    setAiSummary(null);
    try {
      const reportText = dailyReportData.map(r => 
        `${r.employee.name} on ${format(r.entry.date, 'MM/dd')}: ${formatHours(r.payDetails.hours)}, Regular Pay: ${formatCurrency(r.payDetails.basePay)}, Bonus: ${formatCurrency(r.payDetails.bonus)}, Total: ${formatCurrency(r.payDetails.totalPay)}, Late: ${r.payDetails.wasLate ? 'Yes' : 'No'}`
      ).join('\n');

      const result = await generateReportSummaries({ reportData: reportText });
      setAiSummary(result.summary);
      toast({ title: 'AI Summary Generated', description: 'The payroll report summary is ready.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate AI summary.' });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>AI Report Summary</CardTitle>
              <CardDescription>Generate an AI-powered summary of the payroll reports.</CardDescription>
            </div>
            <Button onClick={handleGenerateSummary} disabled={isAiLoading}>
                {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                Generate Summary
            </Button>
          </div>
        </CardHeader>
        {(isAiLoading || aiSummary) && (
            <CardContent>
                {isAiLoading && <p className="text-muted-foreground">Generating summary...</p>}
                {aiSummary && (
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">{aiSummary}</p>
                    </div>
                )}
            </CardContent>
        )}
      </Card>
      
      <Tabs defaultValue="weekly-summary">
        <TabsList>
          <TabsTrigger value="weekly-summary">Weekly Summary</TabsTrigger>
          <TabsTrigger value="daily-log">Daily Payroll Log</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly-summary">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Summary</CardTitle>
              <CardDescription>Total hours and pay for each employee for the current pay period (Saturday-Friday).</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Total Hours</TableHead>
                            <TableHead>Total Pay</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {weeklySummaryData.map(({ employee, totalHours, totalPay }) => (
                            <TableRow key={employee.id}>
                                <TableCell className="font-medium">{employee.name}</TableCell>
                                <TableCell>{formatHours(totalHours)}</TableCell>
                                <TableCell>{formatCurrency(totalPay)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="daily-log">
          <Card>
            <CardHeader>
              <CardTitle>Daily Payroll Log</CardTitle>
              <CardDescription>A detailed log of all completed work entries.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Regular Pay</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead className="text-right">Total Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyReportData.map(({ employee, entry, payDetails }) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{format(entry.date, 'MM/dd/yyyy')}</TableCell>
                      <TableCell>{entry.clockIn ? format(entry.clockIn, 'HH:mm') : '-'}</TableCell>
                      <TableCell>{entry.clockOut ? format(entry.clockOut, 'HH:mm') : '-'}</TableCell>
                      <TableCell>{formatHours(payDetails.hours)}</TableCell>
                      <TableCell>
                        {payDetails.wasLate 
                          ? <Badge variant="destructive">Late</Badge> 
                          : <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">On-Time</Badge>
                        }
                      </TableCell>
                      <TableCell>{formatCurrency(payDetails.basePay)}</TableCell>
                      <TableCell>{formatCurrency(payDetails.bonus)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payDetails.totalPay)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
