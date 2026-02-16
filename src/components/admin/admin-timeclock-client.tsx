'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Employee, TimeEntry, Document } from '@/lib/data';
import { format } from 'date-fns';
import { isLate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { LogIn, LogOut, Loader2, Clock, Pencil, Star, Wifi, WifiOff } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, Timestamp, doc, onSnapshot } from 'firebase/firestore';

export default function AdminTimeclockClient() {
  const firestore = useFirestore();
  const { data: employees = [], loading: employeesLoading } = useCollection<Employee>('employees');
  const [employeeEntries, setEmployeeEntries] = useState<Record<string, Document<TimeEntry> | null>>({});
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [clockingIds, setClockingIds] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const { toast } = useToast();

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTriggeredRef = useRef(false);
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Document<Employee> | null>(null);
  const [editingEntry, setEditingEntry] = useState<Document<TimeEntry> | null>(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [adminClockDialogOpen, setAdminClockDialogOpen] = useState(false);
  const [adminClockEmployee, setAdminClockEmployee] = useState<Document<Employee> | null>(null);
  const [adminClockTime, setAdminClockTime] = useState('');
  const [adminClockAction, setAdminClockAction] = useState<'in' | 'out'>('in');
  const [isSavingAdminClock, setIsSavingAdminClock] = useState(false);

  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.active !== false);
  }, [employees]);

  const sortedEmployees = useMemo(() => {
    return [...activeEmployees].sort((a, b) => {
      const lastA = a.name.split(' ').pop()?.toLowerCase() || '';
      const lastB = b.name.split(' ').pop()?.toLowerCase() || '';
      return lastA.localeCompare(lastB);
    });
  }, [activeEmployees]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: '✅ Back Online', description: 'Syncing any pending clock entries...' });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({ title: '⚠️ Offline Mode', description: 'Clock entries will sync when connection returns.' });
    };
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Clock tick + countdown logic
  useEffect(() => {
    setIsClient(true);
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();

      // At 6:59:30, check if anyone is not clocked in
      if (h === 6 && m === 59 && s === 30 && !countdownTriggeredRef.current) {
        const anyNotClockedIn = sortedEmployees.some(emp => {
          const entry = employeeEntries[emp.id];
          return !entry || !entry.clockIn;
        });
        if (anyNotClockedIn) {
          countdownTriggeredRef.current = true;
          setCountdown(30);
        }
      }

      // Reset the trigger flag after 7:01 so it can trigger again next day
      if (h === 7 && m === 1) {
        countdownTriggeredRef.current = false;
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sortedEmployees, employeeEntries]);

  // Countdown ticker
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Use real-time listener instead of one-time fetch
  useEffect(() => {
    if (!firestore || activeEmployees.length === 0) return;
    setLoadingEntries(true);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const startOfToday = new Date(todayStr);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const q = query(
      collection(firestore, 'timeEntries'),
      where('date', '>=', startOfToday),
      where('date', '<', endOfToday)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entriesMap: Record<string, Document<TimeEntry> | null> = {};
      activeEmployees.forEach(emp => {
        entriesMap[emp.id] = null;
      });
      snapshot.forEach(docSnap => {
        const data = { id: docSnap.id, ...docSnap.data() } as Document<TimeEntry>;
        entriesMap[data.employeeId] = data;
      });
      setEmployeeEntries(entriesMap);
      setLoadingEntries(false);
    }, (error) => {
      console.error('Snapshot error:', error);
      setLoadingEntries(false);
    });

    return () => unsubscribe();
  }, [firestore, activeEmployees]);

  const getStatus = (entry: Document<TimeEntry> | null | undefined) => {
    if (!entry || !entry.clockIn) return 'out';
    if (entry.clockIn && !entry.clockOut) return 'in';
    return 'done';
  };

  const handleQuickClock = async (employee: Document<Employee>, action: 'in' | 'out') => {
    if (!firestore) return;

    setClockingIds(prev => new Set(prev).add(employee.id));
    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);

    try {
      if (action === 'in') {
        const newEntry: any = {
          employeeId: employee.id,
          clockIn: nowTimestamp,
          clockOut: null,
          date: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
        };
        const docRef = await addDoc(collection(firestore, 'timeEntries'), newEntry);
        setEmployeeEntries(prev => ({
          ...prev,
          [employee.id]: { id: docRef.id, ...newEntry } as Document<TimeEntry>,
        }));
        const late = isLate(now);
        toast({
          title: `${employee.name} Clocked In`,
          description: `${format(now, 'h:mm:ss aa')}${late ? ' - LATE (No Bonus)' : ' - On Time (Bonus!)'}`,
        });
      } else {
        const entry = employeeEntries[employee.id];
        if (entry) {
          const entryRef = doc(firestore, 'timeEntries', entry.id);
          await updateDoc(entryRef, { clockOut: nowTimestamp });
          setEmployeeEntries(prev => ({
            ...prev,
            [employee.id]: { ...entry, clockOut: nowTimestamp } as Document<TimeEntry>,
          }));
          toast({
            title: `${employee.name} Clocked Out`,
            description: format(now, 'h:mm:ss aa'),
          });
        }
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to clock.' });
    } finally {
      setClockingIds(prev => {
        const next = new Set(prev);
        next.delete(employee.id);
        return next;
      });
    }
  };

  const openAdminClockDialog = (employee: Document<Employee>, action: 'in' | 'out') => {
    setAdminClockEmployee(employee);
    setAdminClockAction(action);
    const now = new Date();
    setAdminClockTime(format(now, 'HH:mm'));
    setAdminClockDialogOpen(true);
  };

  const handleAdminClockSubmit = async () => {
    if (!firestore || !adminClockEmployee || !adminClockTime) return;
    setIsSavingAdminClock(true);

    const [hours, minutes] = adminClockTime.split(':').map(Number);
    const now = new Date();
    const customTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    const customTimestamp = Timestamp.fromDate(customTime);

    try {
      if (adminClockAction === 'in') {
        const newEntry: any = {
          employeeId: adminClockEmployee.id,
          clockIn: customTimestamp,
          clockOut: null,
          date: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
        };
        const docRef = await addDoc(collection(firestore, 'timeEntries'), newEntry);
        setEmployeeEntries(prev => ({
          ...prev,
          [adminClockEmployee!.id]: { id: docRef.id, ...newEntry } as Document<TimeEntry>,
        }));
        const late = isLate(customTime);
        toast({
          title: `${adminClockEmployee.name} Clocked In (Admin)`,
          description: `Set to ${format(customTime, 'h:mm aa')}${late ? ' - LATE' : ' - On Time'}`,
        });
      } else {
        const entry = employeeEntries[adminClockEmployee.id];
        if (entry) {
          const entryRef = doc(firestore, 'timeEntries', entry.id);
          await updateDoc(entryRef, { clockOut: customTimestamp });
          setEmployeeEntries(prev => ({
            ...prev,
            [adminClockEmployee!.id]: { ...entry, clockOut: customTimestamp } as Document<TimeEntry>,
          }));
          toast({
            title: `${adminClockEmployee.name} Clocked Out (Admin)`,
            description: `Set to ${format(customTime, 'h:mm aa')}`,
          });
        }
      }
      setAdminClockDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed.' });
    } finally {
      setIsSavingAdminClock(false);
    }
  };

  const openEditDialog = (employee: Document<Employee>, entry: Document<TimeEntry>) => {
    setEditingEmployee(employee);
    setEditingEntry(entry);
    setEditClockIn(entry.clockIn ? format(entry.clockIn.toDate(), 'HH:mm') : '');
    setEditClockOut(entry.clockOut ? format(entry.clockOut.toDate(), 'HH:mm') : '');
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!firestore || !editingEntry || !editingEmployee) return;
    setIsSavingEdit(true);

    const now = new Date();
    const updates: any = {};
    if (editClockIn) {
      const [h, m] = editClockIn.split(':').map(Number);
      updates.clockIn = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0));
    }
    if (editClockOut) {
      const [h, m] = editClockOut.split(':').map(Number);
      updates.clockOut = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0));
    } else {
      updates.clockOut = null;
    }

    try {
      const entryRef = doc(firestore, 'timeEntries', editingEntry.id);
      await updateDoc(entryRef, updates);
      setEmployeeEntries(prev => ({
        ...prev,
        [editingEmployee!.id]: { ...editingEntry!, ...updates } as Document<TimeEntry>,
      }));
      toast({
        title: `${editingEmployee.name} - Time Updated`,
        description: `Clock In: ${editClockIn || 'N/A'}, Clock Out: ${editClockOut || 'N/A'}`,
      });
      setEditDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to update.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (!isClient) return null;

  // Count not-clocked-in employees for countdown display
  const notClockedInNames = sortedEmployees
    .filter(emp => {
      const entry = employeeEntries[emp.id];
      return !entry || !entry.clockIn;
    })
    .map(emp => emp.name);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Clock</h1>
          <p className="text-muted-foreground">
            {currentTime ? format(currentTime, 'eeee, MMMM d, yyyy') : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Online/Offline indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
            isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <div className="bg-primary text-primary-foreground rounded-lg px-6 py-3 text-center">
            <p className="text-sm font-medium">Current Time</p>
            <p className="text-3xl font-bold font-mono tracking-tight">
              {currentTime ? format(currentTime, 'h:mm:ss') : '--:--:--'}
              <span className="text-lg ml-1">{currentTime ? format(currentTime, 'aa') : ''}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Countdown Banner */}
      {countdown !== null && countdown > 0 && notClockedInNames.length > 0 && (
        <div className="bg-red-600 text-white rounded-lg p-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">⏰ BONUS CUTOFF IN {countdown}s</p>
              <p className="text-sm opacity-90">
                Not clocked in: {notClockedInNames.join(', ')}
              </p>
            </div>
            <p className="text-5xl font-bold font-mono">{countdown}</p>
          </div>
        </div>
      )}

      {countdown === 0 && notClockedInNames.length > 0 && (
        <div className="bg-red-800 text-white rounded-lg p-4">
          <p className="text-lg font-bold">🚫 BONUS CUTOFF PASSED</p>
          <p className="text-sm opacity-90">
            Missed bonus: {notClockedInNames.join(', ')}
          </p>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <Star className="inline h-4 w-4 text-yellow-500 mr-1" />
        Bonus cutoff: Clock in by <strong>7:00 AM</strong> to earn the on-time bonus. After 7:00 = no bonus.
      </p>

      {/* Employee Cards Grid */}
      {employeesLoading || loadingEntries ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading employees...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedEmployees.map(employee => {
            const entry = employeeEntries[employee.id] || null;
            const status = getStatus(entry);
            const isClocking = clockingIds.has(employee.id);
            const wasLate = entry?.clockIn ? isLate(entry.clockIn.toDate()) : false;
            const gotBonus = entry?.clockIn ? !wasLate : false;

            // Ring color: green if on time, red if late, gray if not clocked in
            let ringClass = '';
            if (status === 'in' || status === 'done') {
              ringClass = gotBonus
                ? 'ring-4 ring-green-500 border-green-500'
                : 'ring-4 ring-red-500 border-red-500';
            }

            return (
              <Card
                key={employee.id}
                className={`relative overflow-hidden transition-all ${ringClass} ${
                  status === 'done' ? 'bg-muted/30' : ''
                }`}
              >
                {/* Top status bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    status === 'in' && gotBonus
                      ? 'bg-green-500'
                      : status === 'in' && !gotBonus
                      ? 'bg-red-500'
                      : status === 'done' && gotBonus
                      ? 'bg-green-500'
                      : status === 'done' && !gotBonus
                      ? 'bg-red-500'
                      : 'bg-gray-300'
                  }`}
                />

                <CardHeader className="pb-3 pt-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{employee.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {status === 'in' && gotBonus && '🟢 Clocked In — On Time'}
                        {status === 'in' && !gotBonus && '🔴 Clocked In — Late'}
                        {status === 'done' && gotBonus && '✅ Shift Complete — On Time'}
                        {status === 'done' && !gotBonus && '🔴 Shift Complete — Late'}
                        {status === 'out' && '⚪ Not Clocked In'}
                      </p>
                    </div>
                    {entry && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(employee, entry)}
                        title="Edit times"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {entry?.clockIn && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clock In:</span>
                        <span className="font-medium">
                          {format(entry.clockIn.toDate(), 'h:mm aa')}
                          {gotBonus && (
                            <Star className="inline h-3.5 w-3.5 text-yellow-500 ml-1 -mt-0.5" />
                          )}
                          {wasLate && (
                            <span className="text-red-600 text-xs ml-1 font-semibold">LATE</span>
                          )}
                        </span>
                      </div>
                      {entry.clockOut && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Clock Out:</span>
                          <span className="font-medium">{format(entry.clockOut.toDate(), 'h:mm aa')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {status === 'out' && (
                      <>
                        <Button
                          className="flex-1 h-12"
                          onClick={() => handleQuickClock(employee, 'in')}
                          disabled={isClocking}
                        >
                          {isClocking ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <LogIn className="mr-2 h-4 w-4" />
                          )}
                          Clock In
                        </Button>
                        <Button
                          variant="outline"
                          className="h-12"
                          onClick={() => openAdminClockDialog(employee, 'in')}
                          title="Clock in with custom time"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {status === 'in' && (
                      <>
                        <Button
                          className="flex-1 h-12"
                          variant="secondary"
                          onClick={() => handleQuickClock(employee, 'out')}
                          disabled={isClocking}
                        >
                          {isClocking ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="mr-2 h-4 w-4" />
                          )}
                          Clock Out
                        </Button>
                        <Button
                          variant="outline"
                          className="h-12"
                          onClick={() => openAdminClockDialog(employee, 'out')}
                          title="Clock out with custom time"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {status === 'done' && (
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={() => openEditDialog(employee, entry!)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Times
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Admin Clock Dialog */}
      <Dialog open={adminClockDialogOpen} onOpenChange={setAdminClockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {adminClockAction === 'in' ? 'Clock In' : 'Clock Out'} - {adminClockEmployee?.name}
            </DialogTitle>
            <DialogDescription>
              Set a custom {adminClockAction === 'in' ? 'clock in' : 'clock out'} time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="admin-clock-time">
                {adminClockAction === 'in' ? 'Clock In' : 'Clock Out'} Time
              </Label>
              <Input
                id="admin-clock-time"
                type="time"
                value={adminClockTime}
                onChange={e => setAdminClockTime(e.target.value)}
                className="mt-1.5"
              />
              {adminClockAction === 'in' && adminClockTime && (
                <p className="text-sm mt-2">
                  {(() => {
                    const [h, m] = adminClockTime.split(':').map(Number);
                    const testTime = new Date();
                    testTime.setHours(h, m, 0);
                    const late = isLate(testTime);
                    return late ? (
                      <span className="text-red-600 font-medium">⚠️ After 7:00 AM — No bonus</span>
                    ) : (
                      <span className="text-green-600 font-medium">✅ Before 7:01 AM — Bonus applies</span>
                    );
                  })()}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminClockDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdminClockSubmit} disabled={isSavingAdminClock || !adminClockTime}>
              {isSavingAdminClock && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {adminClockAction === 'in' ? 'Clock In' : 'Clock Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Times Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Times - {editingEmployee?.name}</DialogTitle>
            <DialogDescription>Modify clock in and clock out times for today.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-clock-in">Clock In Time</Label>
              <Input
                id="edit-clock-in"
                type="time"
                value={editClockIn}
                onChange={e => setEditClockIn(e.target.value)}
                className="mt-1.5"
              />
              {editClockIn && (
                <p className="text-sm mt-1">
                  {(() => {
                    const [h, m] = editClockIn.split(':').map(Number);
                    const testTime = new Date();
                    testTime.setHours(h, m, 0);
                    const late = isLate(testTime);
                    return late ? (
                      <span className="text-red-600">After 7:00 — No bonus</span>
                    ) : (
                      <span className="text-green-600">Before 7:01 — Bonus applies</span>
                    );
                  })()}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-clock-out">Clock Out Time</Label>
              <Input
                id="edit-clock-out"
                type="time"
                value={editClockOut}
                onChange={e => setEditClockOut(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty if still working.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={isSavingEdit || !editClockIn}>
              {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
