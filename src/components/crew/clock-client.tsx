'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { employees as initialEmployees, timeEntries as initialTimeEntries } from '@/lib/data';
import type { Employee, TimeEntry } from '@/lib/data';
import { format } from 'date-fns';
import { isLate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, LogIn, LogOut, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ClockClient() {
  const [employees] = useState<Employee[]>(initialEmployees);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(initialTimeEntries);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [adminCode, setAdminCode] = useState('');
  const [isDialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  
  const todayEntryForSelected = selectedEmployeeId
    ? timeEntries.find(entry =>
        entry.employeeId === selectedEmployeeId &&
        format(entry.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
      )
    : undefined;

  const status = todayEntryForSelected?.clockIn && !todayEntryForSelected?.clockOut
    ? 'Clocked In'
    : 'Clocked Out';

  const handleClockAction = () => {
    if (!selectedEmployeeId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an employee first.' });
      return;
    }
    
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');

    setTimeEntries(prevEntries => {
      const entryIndex = prevEntries.findIndex(e => e.employeeId === selectedEmployeeId && format(e.date, 'yyyy-MM-dd') === todayStr);

      if (status === 'Clocked Out') { // Clocking In
        if (entryIndex > -1) {
          const newEntries = [...prevEntries];
          newEntries[entryIndex] = { ...newEntries[entryIndex], clockIn: now, clockOut: null };
          return newEntries;
        } else {
          // This case should be handled by the initial data, but as a fallback:
           const newEntry: TimeEntry = { id: `t${Date.now()}`, employeeId: selectedEmployeeId, clockIn: now, clockOut: null, date: now };
           return [...prevEntries, newEntry];
        }
      } else { // Clocking Out
        if (entryIndex > -1) {
          const newEntries = [...prevEntries];
          newEntries[entryIndex] = { ...newEntries[entryIndex], clockOut: now };
          return newEntries;
        }
      }
      return prevEntries;
    });

    const action = status === 'Clocked Out' ? 'Clocked In' : 'Clocked Out';
    const description = action === 'Clocked In' && isLate(now)
      ? 'You have been marked as late.'
      : `You are now ${action.toLowerCase()}.`;
      
    toast({
        title: `Successfully ${action}`,
        description: `${format(now, 'HH:mm:ss')} - ${description}`
    });
  };
  
  const handleAdminAccess = () => {
    if (adminCode.toLowerCase() === 'pam') {
      router.push('/');
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect Code',
        description: 'The code you entered is incorrect. Please try again.',
      });
      setAdminCode('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-4">
       <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="absolute top-4 left-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Admin Access</DialogTitle>
            <DialogDescription>
              Enter the passcode to access the admin dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="admin-code" className="text-right">
                Passcode
              </Label>
              <Input
                id="admin-code"
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => e.key === 'Enter' && handleAdminAccess()}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleAdminAccess}>Enter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId || ''}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Select Your Name..." />
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
                {currentTime ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
            </p>
            <p className="text-muted-foreground text-primary-foreground/70">{currentTime ? format(currentTime, 'eeee, MMMM d') : ''}</p>
          </div>

          {selectedEmployee && (
            <div className="text-center">
                <p className="text-muted-foreground">Status for {selectedEmployee.name}</p>
                <p className={`text-2xl font-semibold ${status === 'Clocked In' ? 'text-green-600' : 'text-gray-500'}`}>
                    {status}
                </p>
                 {status === 'Clocked In' && todayEntryForSelected?.clockIn && (
                    <p className="text-sm text-muted-foreground">
                        Clocked in at {format(todayEntryForSelected.clockIn, 'HH:mm')}
                        {isLate(todayEntryForSelected.clockIn) && <span className="text-red-600 font-semibold"> (Late)</span>}
                    </p>
                )}
            </div>
          )}

          <Button 
            onClick={handleClockAction} 
            disabled={!selectedEmployeeId} 
            className="h-16 text-xl"
            variant={status === 'Clocked In' ? 'secondary' : 'default'}
          >
            {status === 'Clocked Out' ? <LogIn className="mr-2 h-6 w-6" /> : <LogOut className="mr-2 h-6 w-6" />}
            {status === 'Clocked Out' ? 'Clock In' : 'Clock Out'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
