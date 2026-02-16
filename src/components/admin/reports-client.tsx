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
import type { Employee, TimeEntry, Document, Bonus } from '@/lib/data';
import { format, set, addDays, subDays, getHours } from 'date-fns';
import { formatCurrency, calculatePay, getWeekDateRange, getWeekDays, generateCsvContent } from '@/lib/utils';
import { Download, Loader2, Trash2, ChevronLeft, ChevronRight, BadgeDollarSign } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface WeeklyReportData {
    employee: Document<Employee>;
    dailyData: {
        [date: string]: {
            entry: Document<TimeEntry> | undefined;
            wasLate: boolean;
        };
    };
    weeklyBonuses: Document<Bonus>[];
    summary: {
        totalRegularHours: number;
        totalBonusHours: number;
        totalBasePay: number;
        totalOnTimeBonusPay: number;
        totalWeeklyBonusPay: number;
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
  const { data: employees = [] } = useCollection<Employee>('employees');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { start, end } = useMemo(() => getWeekDateRange(currentDate), [currentDate]);

  const timeEntriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'timeEntries'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
  }, [firestore, start, end]);

  const bonusesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'bonuses'),
      where('date', '>=', start),
      where('date', '<=', end)
    );
  }, [firestore, start, end]);


  const { data: timeEntries = [], setData: setTimeEntries } = useCollection<TimeEntry>(timeEntriesQuery);
  const { data: bonuses = [] } = useCollection<Bonus>(bonusesQuery);


  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [clockInTime, setClockInTime] = useState('');
  const [clockOutTime, setClockOutTime] = useState('');
  const [clockOutPeriod, setClockOutPeriod] = useState<'am' | 'pm'>('pm');
  const [isSaving, setIsSaving] = useState(false);

  // Sort employees alphabetically by last name
  const sortedEmployees = useMemo(() => {
    return [...employees].filter(e => (e as any).active !== false).sort((a, b) => {
      const lastA = a.name.split(' ').pop()?.toLowerCase() || '';
      const lastB = b.name.split(' ').pop()?.toLowerCase() || '';
      return lastA.localeCompare(lastB);
    });
  }, [employees]);

  const weeklyReportData: WeeklyReportData[] = useMemo(() => {
    if (!sortedEmployees.length) return [];
    return sortedEmployees.map(employee => {
        const employeeEntries = timeEntries.filter(
            entry => entry.employeeId === employee.id && entry.clockIn && entry.clockOut
        );
        
        const weeklyBonuses = bonuses.filter(bonus => bonus.employeeId === employee.id);

        let totalRegularHours = 0;
        let totalBonusHours = 0;
        let totalBasePay = 0;
        let totalOnTimeBonusPay = 0;

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
                    totalOnTimeBonusPay += payDetails.bonus;
                }
            } else {
                dailyData[dayStr] = { entry: undefined, wasLate: false };
            }
        });
        
        const totalWeeklyBonusPay = weeklyBonuses.reduce((acc, bonus) => acc + bonus.amount, 0);
        const totalPayroll = totalBasePay + totalOnTimeBonusPay + totalWeeklyBonusPay;

        return {
            employee,
            dailyData,
            weeklyBonuses,
            summary: {
                totalRegularHours,
                totalBonusHours,
                totalBasePay,
                totalOnTimeBonusPay,
                totalWeeklyBonusPay,
                totalPayroll,
            }
        };
    });
  }, [sortedEmployees, timeEntries, bonuses, start]);
  
  const handleCellClick = (employee: Document<Employee>, date: Date, entry: Document<TimeEntry> | undefined) => {
    setEditingEntry({ employee, date, entry });
    setClockInTime(entry?.clockIn ? format(entry.clockIn.toDate(), 'h:mm') : '');
    if (entry?.clockOut) {
        const clockOutDate = entry.clockOut.toDate();
        setClockOutTime(format(clockOutDate, 'h:mm'));
        setClockOutPeriod(getHours(clockOutDate) >= 12 ? 'pm' : 'am');
    } else {
        setClockOutTime('');
        setClockOutPeriod('pm');
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingEntry || !firestore) return;
    setIsSaving(true);
    
    const { employee, date, entry } = editingEntry;

    try {
        let clockInDate: Date | null = null;
        if (clockInTime) {
            const [hour, minute] = clockInTime.split(':').map(Number);
            if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
                let hours = hour;
                if (hour === 12) hours = 0; // 12 AM is 0 hours
                clockInDate = set(date, { hours, minutes: minute });
            } else {
                throw new Error('Invalid clock-in time format.');
            }
        }

        let clockOutDate: Date | null = null;
        if (clockOutTime) {
            const [hour, minute] = clockOutTime.split(':').map(Number);
             if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
                let hours = hour;
                if (clockOutPeriod === 'pm' && hour < 12) {
                    hours += 12;
                } else if (clockOutPeriod === 'am' && hour === 12) { // 12 AM
                    hours = 0;
                }
                clockOutDate = set(date, { hours, minutes: minute });
            } else {
                 throw new Error('Invalid clock-out time format.');
            }
        }
        
        const clockInTimestamp = clockInDate ? Timestamp.fromDate(clockInDate) : null;
        const clockOutTimestamp = clockOutDate ? Timestamp.fromDate(clockOutDate) : null;

        if (entry) { // Update existing entry
            const entryRef = doc(firestore, 'timeEntries', entry.id);
            const updatedData = {
                clockIn: clockInTimestamp,
                clockOut: clockOutTimestamp,
            };
            await updateDoc(entryRef, updatedData);
            
            setTimeEntries(prev => prev.map(e => e.id === entry.id ? {...e, ...updatedData} : e));

            toast({ title: 'Success', description: 'Time entry updated.' });
        } else { // Create new entry
            const collRef = collection(firestore, 'timeEntries');
            const newEntryData: Omit<TimeEntry, 'id'> = {
                employeeId: employee.id,
                date: Timestamp.fromDate(date),
                clockIn: clockInTimestamp,
                clockOut: clockOutTimestamp,
            };
            const newDocRef = await addDoc(collRef, newEntryData);
            
            setTimeEntries(prev => [...prev, { id: newDocRef.id, ...newEntryData } as Document<TimeEntry>]);
            
            toast({ title: 'Success', description: 'Time entry created.' });
        }
        setDialogOpen(false);
    } catch (e: any) {
        if (e instanceof FirestorePermissionError) {
          errorEmitter.emit('permission-error', e);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: e.message || 'Could not save the entry. Please check the time format (h:mm).' });
        }
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async () => {
      if (!editingEntry || !editingEntry.entry || !firestore) return;
      setIsSaving(true);
      
      const entryId = editingEntry.entry.id;
      const entryRef = doc(firestore, 'timeEntries', entryId);
      
      try {
        await deleteDoc(entryRef);

        setTimeEntries(prev => prev.filter(e => e.id !== entryId));

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
                                  <TableHead colSpan={2} className="text-center">On-Time Bonus</TableHead>
                                  <TableHead rowSpan={2} className="text-center">Weekly Bonus</TableHead>
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
                              {weeklyReportData.map(({ employee, dailyData, summary, weeklyBonuses }) => (
                                  <React.Fragment key={employee.id}>
                                      <TableRow className="bg-muted/20">
                                          <TableCell className="font-semibold sticky left-0 bg-muted/20 z-10 flex items-center gap-2">
                                              <span>{employee.name}</span>
                                                {weeklyBonuses.length > 0 && (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button className="relative">
                                                                <BadgeDollarSign className="h-5 w-5 text-yellow-500" />
                                                                <span className="absolute -top-1 -right-2 text-xs font-bold text-yellow-700">{weeklyBonuses.length}</span>
                                                            </button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-80">
                                                            <div className="grid gap-4">
                                                                <div className="space-y-2">
                                                                    <h4 className="font-medium leading-none">Weekly Bonuses</h4>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        Bonuses awarded for this week.
                                                                    </p>
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    {weeklyBonuses.map(bonus => (
                                                                        <div key={bonus.id} className="grid grid-cols-3 items-center gap-4">
                                                                            <span className="col-span-2 truncate" title={bonus.reason}>{bonus.reason}</span>
                                                                            <span className="font-semibold justify-self-end">{formatCurrency(bonus.amount)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                          </TableCell>
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
                                                                  {format(dayData.entry.clockIn.toDate(), 'h:mm aa')} / {format(dayData.entry.clockOut.toDate(), 'h:mm aa')}
                                                              </div>
                                                          ) : '--'}
                                                      </button>
                                                  </TableCell>
                                              );
                                          })}
                                          <TableCell className="text-center">{summary.totalRegularHours.toFixed(2)}</TableCell>
                                          <TableCell className="text-center">{formatCurrency(summary.totalBasePay)}</TableCell>
                                          <TableCell className="text-center">{summary.totalBonusHours.toFixed(2)}</TableCell>
                                          <TableCell className="text-center">{formatCurrency(summary.totalOnTimeBonusPay)}</TableCell>
                                          <TableCell className="text-center">{formatCurrency(summary.totalWeeklyBonusPay)}</TableCell>
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
                        <Label htmlFor="clockIn" className="text-right">Clock In (AM)</Label>
                        <Input
                            id="clockIn"
                            value={clockInTime}
                            onChange={(e) => setClockInTime(e.target.value)}
                            className="col-span-3"
                            placeholder="h:mm (12-hour)"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="clockOut" className="text-right">Clock Out</Label>
                        <Input
                            id="clockOut"
                            value={clockOutTime}
                            onChange={(e) => setClockOutTime(e.target.value)}
                            className="col-span-2"
                            placeholder="h:mm (12-hour)"
                        />
                         <Select value={clockOutPeriod} onValueChange={(v) => setClockOutPeriod(v as 'am' | 'pm')}>
                            <SelectTrigger className="col-span-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="am">AM</SelectItem>
                                <SelectItem value="pm">PM</SelectItem>
                            </SelectContent>
                        </Select>
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
