'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Employee, Document, Bonus } from '@/lib/data';
import { formatCurrency, getWeekDateRange } from '@/lib/utils';
import { PlusCircle, Edit, Loader2, DollarSign } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const employeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  hourlyRate: z.coerce.number().min(0, 'Hourly rate must be a positive number.'),
  onTimeBonus: z.coerce.number().min(0, 'Bonus must be a positive number.'),
  active: z.boolean(),
  rules: z.string().optional(),
});

const bonusSchema = z.object({
  employeeId: z.string().min(1, "Please select an employee."),
  amount: z.coerce.number().min(0.01, "Bonus amount must be greater than zero."),
  reason: z.string().min(3, "Please provide a brief reason."),
});

export default function EmployeesClient() {
  const { data: employees = [], loading: employeesLoading } = useCollection<Employee>('employees');

  const [selectedEmployee, setSelectedEmployee] = useState<Document<Employee> | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const { toast } = useToast();
  
  const firestore = useFirestore();

  const employeeForm = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
  });
  
  const bonusForm = useForm<z.infer<typeof bonusSchema>>({
    resolver: zodResolver(bonusSchema),
    defaultValues: {
        employeeId: '',
        amount: 0,
        reason: '',
    },
  });

  // Only active employees, sorted by last name
  const activeEmployees = useMemo(() => {
    return employees
      .filter(e => e.active !== false)
      .sort((a, b) => {
        const lastA = a.name.split(' ').pop()?.toLowerCase() || '';
        const lastB = b.name.split(' ').pop()?.toLowerCase() || '';
        return lastA.localeCompare(lastB);
      });
  }, [employees]);

  const handleEdit = (employee: Document<Employee>) => {
    employeeForm.reset({
      ...employee,
      active: employee.active !== false,
    });
    setSelectedEmployee(employee);
    setFormOpen(true);
  };

  const handleAdd = () => {
    employeeForm.reset({ name: '', hourlyRate: 0, onTimeBonus: 0, active: true, rules: 'Standard pay rules apply.' });
    setSelectedEmployee(null);
    setFormOpen(true);
  };

  const onEmployeeSubmit = async (values: z.infer<typeof employeeSchema>) => {
    if (!firestore) return;
    const { id, ...employeeData } = values;

    try {
      if (id) {
        const docRef = doc(firestore, 'employees', id);
        await updateDoc(docRef, employeeData);
        toast({ title: 'Success', description: 'Employee updated successfully.' });
      } else {
        const employeesCollection = collection(firestore, 'employees');
        const dataToCreate = { ...employeeData, rules: 'Standard pay rules apply.' };
        await addDoc(employeesCollection, dataToCreate);
        toast({ title: 'Success', description: 'Employee added successfully.' });
      }
      setFormOpen(false);
    } catch (serverError: any) {
      const operation = id ? 'update' : 'create';
      const path = id ? `employees/${id}` : 'employees';
      const requestResourceData = id ? employeeData : { ...employeeData, rules: 'Standard pay rules apply.' };
      
      const permissionError = new FirestorePermissionError({ path, operation, requestResourceData });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const onBonusSubmit = async (values: z.infer<typeof bonusSchema>) => {
    if (!firestore) return;

    const { start } = getWeekDateRange(new Date());

    const newBonus: Omit<Bonus, 'id'> = {
        ...values,
        amount: values.amount,
        date: Timestamp.fromDate(start),
    };

    try {
        const bonusesCollection = collection(firestore, 'bonuses');
        await addDoc(bonusesCollection, newBonus);
        toast({ title: 'Success!', description: `Bonus of ${formatCurrency(values.amount)} added for the selected employee.` });
        bonusForm.reset();
    } catch (serverError: any) {
         const permissionError = new FirestorePermissionError({
            path: 'bonuses',
            operation: 'create',
            requestResourceData: newBonus,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Employee Management</CardTitle>
              <CardDescription>Add, edit, and manage your crew members.</CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAdd}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                  <DialogDescription>Fill in the details for the crew member.</DialogDescription>
                </DialogHeader>
                <Form {...employeeForm}>
                  <form onSubmit={employeeForm.handleSubmit(onEmployeeSubmit)} className="space-y-4">
                    <FormField control={employeeForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={employeeForm.control} name="hourlyRate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={employeeForm.control} name="onTimeBonus" render={({ field }) => (
                      <FormItem>
                        <FormLabel>On-Time Bonus ($/hr)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={employeeForm.control} name="active" render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel className="text-base">Active Employee</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Inactive employees are hidden from all views.
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={employeeForm.formState.isSubmitting}>
                        {employeeForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Employee
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>On-Time Bonus</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
              ) : activeEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{formatCurrency(employee.hourlyRate)}</TableCell>
                  <TableCell>{formatCurrency(employee.onTimeBonus)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Add Weekly Bonus</CardTitle>
          <CardDescription>Reward an employee for a job well done this week.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...bonusForm}>
                <form onSubmit={bonusForm.handleSubmit(onBonusSubmit)} className="space-y-4">
                    <FormField
                        control={bonusForm.control}
                        name="employeeId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Employee</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an employee" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {activeEmployees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={bonusForm.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Bonus Amount</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input type="number" step="0.01" placeholder="50.00" {...field} className="pl-8" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={bonusForm.control}
                        name="reason"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Reason</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="e.g., 'Excellent performance on the project.'" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={bonusForm.formState.isSubmitting}>
                        {bonusForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Bonus
                    </Button>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
