'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Employee, TimeEntry, Document } from '@/lib/data';
import { format } from 'date-fns';
import { isLate } from '@/lib/utils';
import { Clock, CheckCircle, XCircle, AlertTriangle, Users } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';

interface CombinedEntry {
  employee: Document<Employee>;
  entry: Document<TimeEntry> | undefined;
  status: 'Clocked In' | 'Clocked Out' | 'Late';
}

export default function DashboardClient() {
  const firestore = useFirestore();
  const { data: employees = [] } = useCollection<Employee>('employees');
  
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  
  const timeEntriesQuery = useMemo(() => {
    if (!firestore) return null;
    const startOfToday = new Date(todayStr);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    return query(
      collection(firestore, 'timeEntries'), 
      where('date', '>=', Timestamp.fromDate(startOfToday)),
      where('date', '<', Timestamp.fromDate(endOfToday))
    );
  }, [firestore, todayStr]);

  const { data: timeEntries = [] } = useCollection<TimeEntry>(timeEntriesQuery);

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const combinedData: CombinedEntry[] = useMemo(() => employees.map(employee => {
    const entry = timeEntries.find(e => e.employeeId === employee.id);
    let status: CombinedEntry['status'] = 'Clocked Out';
    if (entry?.clockIn && !entry.clockOut) {
      status = isLate(entry.clockIn.toDate()) ? 'Late' : 'Clocked In';
    }
    return { employee, entry, status };
  }), [employees, timeEntries]);

  const getStatusBadge = (status: CombinedEntry['status']) => {
    switch (status) {
      case 'Clocked In':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"><CheckCircle className="mr-1 h-3 w-3" />On Time</Badge>;
      case 'Late':
        return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Late</Badge>;
      case 'Clocked Out':
        return <Badge variant="outline"><XCircle className="mr-1 h-3 w-3" />Clocked Out</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };
  
  const activeEmployees = combinedData.filter(d => d.status !== 'Clocked Out').length;
  
  if (!isClient) {
    return null;
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{employees.length}</div>
                <p className="text-xs text-muted-foreground">Total registered crew members</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{activeEmployees}</div>
                <p className="text-xs text-muted-foreground">Employees currently clocked in</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late Clock-ins</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{combinedData.filter(d => d.status === 'Late').length}</div>
                 <p className="text-xs text-muted-foreground">Marked as late today</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{currentTime ? format(currentTime, 'h:mm:ss aa') : '--:--:--'}</div>
                <p className="text-xs text-muted-foreground">{currentTime ? format(currentTime, 'eeee, MMMM do') : 'Loading...'}</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Status Dashboard</CardTitle>
          <CardDescription>Real-time clock-in/out status of all crew members for today.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clock In Time</TableHead>
                <TableHead>Clock Out Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinedData.map(({ employee, entry, status }) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={`https://picsum.photos/seed/${employee.id}/40/40`} data-ai-hint="person face"/>
                        <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{employee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(status)}</TableCell>
                  <TableCell>
                    {entry?.clockIn ? format(entry.clockIn.toDate(), 'h:mm:ss aa') : '--:--:--'}
                  </TableCell>
                  <TableCell>
                    {entry?.clockOut ? format(entry.clockOut.toDate(), 'h:mm:ss aa') : '--:--:--'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
