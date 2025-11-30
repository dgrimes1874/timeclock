'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Employee, Document } from '@/lib/data';
import { formatCurrency } from '@/lib/utils';
import { PlusCircle, Edit, Loader2 } from 'lucide-react';
import { customizePayrollRules } from '@/ai/flows/customize-payroll-rules';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const employeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  hourlyRate: z.coerce.number().min(0, 'Hourly rate must be a positive number.'),
  onTimeBonus: z.coerce.number().min(0, 'Bonus must be a positive number.'),
  rules: z.string().optional(),
});

const rulesSchema = z.object({
  customInstructions: z.string().min(10, "Please provide more detailed instructions."),
});

export default function EmployeesClient() {
  const firestore = useFirestore();
  const { data: employees = [], loading: employeesLoading } = useCollection<Employee>('employees');

  const [selectedEmployee, setSelectedEmployee] = useState<Document<Employee> | null>(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const { toast } = useToast();
  
  const [isAiLoading, setAiLoading] = useState(false);
  const [adjustedRules, setAdjustedRules] = useState<string | null>(null);

  const form = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
  });
  
  const rulesForm = useForm<z.infer<typeof rulesSchema>>({
    resolver: zodResolver(rulesSchema),
  });

  const handleEdit = (employee: Document<Employee>) => {
    form.reset(employee);
    setSelectedEmployee(employee);
    setFormOpen(true);
  };

  const handleAdd = () => {
    form.reset({ name: '', hourlyRate: 0, onTimeBonus: 0, rules: 'Standard pay rules apply.' });
    setSelectedEmployee(null);
    setFormOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof employeeSchema>) => {
    if (!firestore) return;
    const { id, ...employeeData } = values;

    if (id) {
      const docRef = doc(firestore, 'employees', id);
      updateDoc(docRef, employeeData)
        .then(() => {
          toast({ title: 'Success', description: 'Employee updated successfully.' });
          setFormOpen(false);
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: employeeData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    } else {
      const employeesCollection = collection(firestore, 'employees');
      const dataToCreate = { ...employeeData, rules: 'Standard pay rules apply.' };
      addDoc(employeesCollection, dataToCreate)
        .then(() => {
          toast({ title: 'Success', description: 'Employee added successfully.' });
          setFormOpen(false);
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: employeesCollection.path,
            operation: 'create',
            requestResourceData: dataToCreate,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
  };

  const onRulesSubmit = async (values: z.infer<typeof rulesSchema>) => {
    if (!selectedEmployee) return;

    setAiLoading(true);
    setAdjustedRules(null);
    try {
      const result = await customizePayrollRules({
        employeeName: selectedEmployee.name,
        currentRules: selectedEmployee.rules,
        customInstructions: values.customInstructions,
      });
      setAdjustedRules(result.adjustedRules);
      toast({ title: 'AI Suggestion Ready', description: 'Review the adjusted payroll rules.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to get AI suggestion.' });
    } finally {
      setAiLoading(false);
    }
  };
  
  const applyAdjustedRules = async () => {
    if (selectedEmployee && adjustedRules && firestore) {
        const docRef = doc(firestore, 'employees', selectedEmployee.id);
        const updatedData = { rules: adjustedRules };
        updateDoc(docRef, updatedData)
            .then(() => {
                toast({ title: 'Rules Updated', description: `Payroll rules for ${selectedEmployee.name} have been updated.` });
                setAdjustedRules(null);
                rulesForm.reset();
                setSelectedEmployee(prev => prev ? {...prev, rules: adjustedRules} : null);
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: updatedData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
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
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="hourlyRate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="onTimeBonus" render={({ field }) => (
                      <FormItem>
                        <FormLabel>On-Time Bonus ($/hr)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              ) : employees.map((employee) => (
                <TableRow key={employee.id} onClick={() => { setSelectedEmployee(employee); setAdjustedRules(null); rulesForm.reset(); }} className="cursor-pointer" data-state={selectedEmployee?.id === employee.id ? 'selected' : ''}>
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
          <CardTitle>Customize Payroll Rules (AI)</CardTitle>
          <CardDescription>Select an employee and use AI to adjust their payroll rules.</CardDescription>
        </CardHeader>
        {selectedEmployee ? (
          <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedEmployee.name}'s Current Rules</h3>
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md mt-1">{selectedEmployee.rules}</p>
              </div>
              <Form {...rulesForm}>
                  <form onSubmit={rulesForm.handleSubmit(onRulesSubmit)} className="space-y-4">
                       <FormField control={rulesForm.control} name="customInstructions" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Instructions</FormLabel>
                            <FormControl>
                                <Textarea placeholder={`e.g., "Double overtime pay on weekends." or "No on-time bonus for this week."`} {...field} />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                       )} />
                       <Button type="submit" disabled={isAiLoading}>
                         {isAiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         Generate Adjusted Rules
                       </Button>
                  </form>
              </Form>

              {adjustedRules && (
                <div className="space-y-2 pt-4">
                    <h3 className="font-semibold">AI Suggested Rules</h3>
                    <p className="text-sm text-green-700 dark:text-green-400 p-3 bg-green-50 dark:bg-green-900/50 rounded-md mt-1">{adjustedRules}</p>
                    <Button onClick={applyAdjustedRules}>Apply these rules</Button>
                </div>
              )}
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-muted-foreground text-center py-8">Select an employee from the list to customize their rules.</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
