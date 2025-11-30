'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Employee, TimeEntry, Document } from '@/lib/data';
import { format, parse, set, addDays, subDays } from 'date-fns';
import { formatCurrency, calculatePay, getWeekDateRange, getWeekDays, generateCsvContent } from '@/lib/utils';
import { Download, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface WeeklyReportData {
    employee: Document<Employee>;
    dailyData: {
        [date: string]: {
            entry: Document<TimeEntry> | undefined;
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

type EditingEntry = {
    employee: Document<Employee>;
    entry: Document<TimeEntry> | undefined;
    date: Date;
};

export default function ReportsClient() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { data: employees = [] } = useCollection<Employee>(collection(firestore, 'employees'));
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const { start, end } = getWeekDateRange(currentDate);

  const { data: timeEntries = [] } = useCollection<TimeEntry>(
    firestore ? query(
      collection(firestore, 'timeEntries'),
      where('date', '>=', start),
      where('date', '<=', end)
    ) : null
  );

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [clockInTime, setClockInTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const weeklyReportData: WeeklyReportData[] = useMemo(() => {
    if (!employees.length) return [];
    return employees.map(employee => {
        const employeeEntries = timeEntries.filter(
            entry => entry.employeeId === employee.id && entry.clockIn && entry.clockOut
        );

        let totalRegularHours = 0;
        let totalBonusHours = 0;
        let totalBasePay = 0;
        let totalBonusPay = 0;

        const dailyData: WeeklyReportData['dailyData'] = {};
        const weekDays = getWeekDays(start);

        weekDays.forEach(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const entryForDay = employeeEntries.find(e => format(e.date.toDate(), 'yyyy-MM-dd') === dayStr);
            let wasLate = false;

            if (entryForDay) {
                const payDetails = calculatePay(employee, entryForDay);
                wasLate = payDetails.wasLate;
                dailyData[dayStr] = { entry: entryForDay, wasLate };
                totalRegularHours += payDetails.hours;
                totalBasePay += payDetails.basePay;
                if (!wasLate) {
                    totalBonusHours += payDetails.hours;
                    totalBonusPay += payDetails.bonus;
                }
            } else {
                dailyData[dayStr] = { entry: undefined, wasLate: false };
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
  }, [employees, timeEntries, start]);
  
  const handleCellClick = (employee: Document<Employee>, date: Date, entry: Document<TimeEntry> | undefined) => {
    setEditingEntry({ employee, date, entry });
    setClockInTime(entry?.clockIn ? format(entry.clockIn.toDate(), 'HH:mm') : '');
    setClockOutTime(entry?.clockOut ? format(entry.clockOut.toDate(), 'HH:mm') : '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingEntry || !firestore) return;
    setIsSaving(true);
    
    const { employee, date, entry } = editingEntry;

    try {
        const clockInDate = clockInTime ? set(date, { hours: parseInt(clockInTime.split(':')[0]), minutes: parseInt(clockInTime.split(':')[1])}) : null;
        const clockOutDate = clockOutTime ? set(date, { hours: parseInt(clockOutTime.split(':')[0]), minutes: parseInt(clockOutTime.split(':')[1])}) : null;

        if (entry) { // Update existing entry
            const entryRef = doc(firestore, 'timeEntries', entry.id);
            const updatedData = {
                clockIn: clockInDate ? Timestamp.fromDate(clockInDate) : null,
                clockOut: clockOutDate ? Timestamp.fromDate(clockOutDate) : null,
            };
            await updateDoc(entryRef, updatedData);
            toast({ title: 'Success', description: 'Time entry updated.' });
        } else { // Create new entry
            const collRef = collection(firestore, 'timeEntries');
            const newEntry = {
                employeeId: employee.id,
                date: Timestamp.fromDate(date),
                clockIn: clockInDate ? Timestamp.fromDate(clockInDate) : null,
                clockOut: clockOutDate ? Timestamp.fromDate(clockOutDate) : null,
            };
            await addDoc(collRef, newEntry);
            toast({ title: 'Success', description: 'Time entry created.' });
        }
        setDialogOpen(false);
    } catch (e: any) {
        if (e instanceof FirestorePermissionError) {
          errorEmitter.emit('permission-error', e);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not save the entry. Please check the time format (HH:mm).' });
        }
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
      if (!editingEntry || !editingEntry.entry || !firestore) return;
      setIsSaving(true);
      
      const entryRef = doc(firestore, 'timeEntries', editingEntry.entry.id);
      
      try {
        await deleteDoc(entryRef);
        toast({ title: 'Success', description: 'Time entry deleted.' });
        setDialogOpen(false);
      } catch (e: any) {
          if (e instanceof FirestorePermissionError) {
            errorEmitter.emit('permission-error', e);
          } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the entry.' });
          }
      } finally {
        setIsSaving(false);
      }
  };

  const handleDownloadCsv = () => {
    const csvContent = generateCsvContent(weeklyReportData, getWeekDays(start));
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

  const weekDays = getWeekDays(start);

  const goToPreviousWeek = () => setCurrentDate(subDays(currentDate, 7));
  const goToNextWeek = () => setCurrentDate(addDays(currentDate, 7));


  return (
    <>
      <div className="grid gap-6">
          <Card>
              <CardHeader>
                  <div className="flex justify-between items-center">
                      <div>
                          <CardTitle>Detailed Weekly Payroll Report</CardTitle>
                          <CardDescription>
                              Report for the week of {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}.
                              Click a cell to add or edit an entry.
                          </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={goToNextWeek}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleDownloadCsv}>
                            <Download className="mr-2 h-4 w-4" />
                            Download CSV
                        </Button>
                      </div>
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
                                                  <TableCell key={dayStr} className="text-center p-0">
                                                      <button 
                                                        onClick={() => handleCellClick(employee, day, dayData?.entry)}
                                                        className={`w-full h-full p-2 text-center rounded-sm hover:bg-accent hover:text-accent-foreground focus:relative focus:z-20 focus:outline-none focus:ring-2 focus:ring-ring ${dayData?.wasLate ? 'text-red-600' : ''}`}
                                                      >
                                                          {dayData?.entry?.clockIn && dayData?.entry?.clockOut ? (
                                                              <div>
                                                                  {format(dayData.entry.clockIn.toDate(), 'HH:mm')} / {format(dayData.entry.clockOut.toDate(), 'HH:mm')}
                                                              </div>
                                                          ) : '--'}
                                                      </button>
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

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            {editingEntry && (
              <>
                <DialogHeader>
                    <DialogTitle>Edit Time for {editingEntry.employee.name}</DialogTitle>
                    <DialogDescription>
                        {format(editingEntry.date, 'eeee, MMMM do yyyy')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="clockIn" className="text-right">Clock In</Label>
                        <Input
                            id="clockIn"
                            value={clockInTime}
                            onChange={(e) => setClockInTime(e.target.value)}
                            className="col-span-3"
                            placeholder="HH:mm (24-hour)"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="clockOut" className="text-right">Clock Out</Label>
                        <Input
                            id="clockOut"
                            value={clockOutTime}
                            onChange={(e) => setClockOutTime(e.target.value)}
                            className="col-span-3"
                            placeholder="HH:mm (24-hour)"
                        />
                    </div>
                </div>
                <DialogFooter className="justify-between sm:justify-between">
                    <div>
                        {editingEntry.entry && (
                            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Delete
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                      <Button onClick={handleSave} disabled={isSaving}>
                          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save
                      </Button>
                    </div>
                </DialogFooter>
              </>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
