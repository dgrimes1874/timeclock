'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Employee, TimeEntry, Document } from '@/lib/data';
import { format } from 'date-fns';
import { isLate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, LogIn, LogOut, Timer, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, Timestamp, doc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export default function ClockClient() {
  const firestore = useFirestore();
  const { user: adminUser } = useUser(); // Check for admin user session
  const { data: employees = [], loading: employeesLoading } = useCollection<Employee>('employees');
  const [timeEntries, setTimeEntries] = useState<Document<TimeEntry>[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const [isClocking, setIsClocking] = useState(false);
  const [isFetchingEntries, setIsFetchingEntries] = useState(false);


  useEffect(() => {
    setIsClient(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTimeEntries = async () => {
      if (firestore && selectedEmployeeId) {
        setIsFetchingEntries(true);
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const startOfToday = new Date(todayStr);
        const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

        const q = query(
          collection(firestore, 'timeEntries'),
          where('employeeId', '==', selectedEmployeeId),
          where('date', '>=', startOfToday),
          where('date', '<', endOfToday)
        );
        const querySnapshot = await getDocs(q);
        const entries: Document<TimeEntry>[] = [];
        querySnapshot.forEach(doc => {
          entries.push({ id: doc.id, ...doc.data() } as Document<TimeEntry>);
        });
        setTimeEntries(entries);
        setIsFetchingEntries(false);
      } else {
        setTimeEntries([]);
      }
    };
    fetchTimeEntries();
  }, [selectedEmployeeId, firestore]);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const todayEntryForSelected = timeEntries[0];

  const status = todayEntryForSelected?.clockIn && !todayEntryForSelected?.clockOut
    ? 'Clocked In'
    : 'Clocked Out';

  const handleClockAction = async () => {
    if (!selectedEmployeeId || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an employee first.' });
      return;
    }
    
    setIsClocking(true);
    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);

    if (status === 'Clocked Out') { // Clocking In
      const collRef = collection(firestore, 'timeEntries');
      const newEntry: Omit<TimeEntry, 'id' | 'clockOut'> & { clockOut: null } = {
        employeeId: selectedEmployeeId,
        clockIn: nowTimestamp,
        clockOut: null,
        date: Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate())),
      };
      
      addDoc(collRef, newEntry)
        .then((docRef) => {
            setTimeEntries([{ id: docRef.id, ...newEntry } as Document<TimeEntry>]);
            toast({
                title: `Successfully Clocked In`,
                description: `${format(now, 'h:mm:ss aa')} - ${isLate(now) ? 'You have been marked as late.' : 'You are now clocked in.'}`
            });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: collRef.path,
                operation: 'create',
                requestResourceData: newEntry,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setIsClocking(false));

    } else { // Clocking Out
      if (todayEntryForSelected) {
        const entryRef = doc(firestore, 'timeEntries', todayEntryForSelected.id);
        const updatedData = { clockOut: nowTimestamp };

        updateDoc(entryRef, updatedData)
            .then(() => {
                setTimeEntries(prev => prev.map(e => e.id === todayEntryForSelected.id ? {...e, clockOut: nowTimestamp} : e));
                toast({
                    title: `Successfully Clocked Out`,
                    description: `${format(now, 'h:mm:ss aa')} - You are now clocked out.`
                });
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: entryRef.path,
                    operation: 'update',
                    requestResourceData: updatedData
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => setIsClocking(false));
      } else {
        setIsClocking(false);
      }
    }
  };
  
  if (!isClient) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
       {adminUser && (
        <Button variant="ghost" className="absolute top-4 left-4" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
        </Button>
       )}

      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-primary rounded-full p-3 text-primary-foreground">
              <Timer size={32} />
            </div>
          </div>
          <CardTitle className="text-3xl font-headline">TimeWise Payroll</CardTitle>
          <CardDescription>Select your name and clock in or out for your shift.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId || ''} disabled={employeesLoading}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder={employeesLoading ? "Loading employees..." : "Select Your Name..."} />
            </SelectTrigger>
            <SelectContent>
              {employees.map(employee => (
                <SelectItem key={employee.id} value={employee.id} className="h-10 text-base">
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="text-center bg-primary text-primary-foreground rounded-lg p-6">
            <p className="text-lg font-medium">Current Time</p>
            <p className="text-6xl font-bold font-mono tracking-tighter">
                {currentTime ? format(currentTime, 'h:mm:ss') : '--:--:--'}<span className="text-3xl align-top">{currentTime ? format(currentTime, 'aa') : ''}</span>
            </p>
            <p className="text-muted-foreground text-primary-foreground/70">{currentTime ? format(currentTime, 'eeee, MMMM d') : ''}</p>
          </div>

          {selectedEmployee && (
            <div className="text-center">
                <p className="text-muted-foreground">Status for {selectedEmployee.name}</p>
                {isFetchingEntries ? (
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                ) : (
                    <>
                        <p className={`text-2xl font-semibold ${status === 'Clocked In' ? 'text-green-600' : 'text-gray-500'}`}>
                            {status}
                        </p>
                        {status === 'Clocked In' && todayEntryForSelected?.clockIn && (
                            <p className="text-sm text-muted-foreground">
                                Clocked in at {format(todayEntryForSelected.clockIn.toDate(), 'h:mm aa')}
                                {isLate(todayEntryForSelected.clockIn.toDate()) && <span className="text-red-600 font-semibold"> (Late)</span>}
                            </p>
                        )}
                    </>
                )}
            </div>
          )}

          <Button 
            onClick={handleClockAction} 
            disabled={!selectedEmployeeId || isClocking || isFetchingEntries} 
            className="h-16 text-xl"
            variant={status === 'Clocked In' ? 'secondary' : 'default'}
          >
            {isClocking ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : (status === 'Clocked Out' ? <LogIn className="mr-2 h-6 w-6" /> : <LogOut className="mr-2 h-6 w-6" />)}
            {isClocking ? 'Processing...' : (status === 'Clocked Out' ? 'Clock In' : 'Clock Out')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
