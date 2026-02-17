'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Employee, TimeEntry, Document } from '@/lib/data';
import { format } from 'date-fns';
import { isLate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { LogIn, LogOut, Loader2, Star, Timer } from 'lucide-react';

import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, addDoc, updateDoc, Timestamp, doc, onSnapshot } from 'firebase/firestore';

// Confetti particle component
function ConfettiOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const particles = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 2,
      color: ['#10B981', '#FBBF24', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'][Math.floor(Math.random() * 6)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.3);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
}

// Late shake overlay
function LateOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-late-popup text-center">
        <div className="text-8xl mb-2">😬</div>
        <div className="bg-red-600 text-white text-3xl font-bold px-8 py-4 rounded-2xl shadow-2xl">
          LATE — No Bonus!
        </div>
      </div>
      <style jsx>{`
        @keyframes late-popup {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          20% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          40% { transform: scale(0.95) rotate(-3deg); }
          60% { transform: scale(1.05) rotate(2deg); }
          80% { transform: scale(1) rotate(0deg); }
          100% { transform: scale(0.8) rotate(0deg); opacity: 0; }
        }
        .animate-late-popup {
          animation: late-popup 2.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}

// On time celebration overlay
function OnTimeOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-ontime-popup text-center">
        <div className="text-8xl mb-2">🎉</div>
        <div className="bg-green-600 text-white text-3xl font-bold px-8 py-4 rounded-2xl shadow-2xl">
          ON TIME — Bonus!
        </div>
      </div>
      <style jsx>{`
        @keyframes ontime-popup {
          0% { transform: scale(0) rotate(10deg); opacity: 0; }
          30% { transform: scale(1.3) rotate(-5deg); opacity: 1; }
          50% { transform: scale(0.95) rotate(3deg); }
          70% { transform: scale(1.1) rotate(-1deg); }
          85% { transform: scale(1) rotate(0deg); }
          100% { transform: scale(0.8) rotate(0deg); opacity: 0; }
        }
        .animate-ontime-popup {
          animation: ontime-popup 2.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}

export default function TimeclockPublicClient() {
  const firestore = useFirestore();
  const { data: employees = [], loading: employeesLoading } = useCollection<Employee>('employees');
  const [employeeEntries, setEmployeeEntries] = useState<Record<string, Document<TimeEntry> | null>>({});
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [clockingIds, setClockingIds] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  // Animation states
  const [showConfetti, setShowConfetti] = useState(false);
  const [showOnTime, setShowOnTime] = useState(false);
  const [showLate, setShowLate] = useState(false);

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
  useEffect(() => {
    setIsClient(true);
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      if (now.getHours() === 4 && now.getMinutes() === 0 && now.getSeconds() < 2) {
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);







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

  const handleClock = async (employee: Document<Employee>, action: 'in' | 'out') => {
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
        if (late) {
          setShowLate(true);
          toast({
            variant: 'destructive',
            title: `😬 ${employee.name} — LATE`,
            description: `${format(now, 'h:mm:ss aa')} — No bonus today.`,
          });
        } else {
          setShowConfetti(true);
          setShowOnTime(true);
          toast({
            title: `🎉 ${employee.name} — ON TIME!`,
            description: `${format(now, 'h:mm:ss aa')} — Bonus earned!`,
          });
        }
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
            title: `👋 ${employee.name} Clocked Out`,
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

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6">
      {/* Celebration overlays */}
      {showConfetti && <ConfettiOverlay onDone={() => setShowConfetti(false)} />}
      {showOnTime && <OnTimeOverlay onDone={() => setShowOnTime(false)} />}
      {showLate && <LateOverlay onDone={() => setShowLate(false)} />}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-full p-3 text-primary-foreground">
              <Timer size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">TimeWise Payroll</h1>
              <p className="text-muted-foreground">Tap your name to clock in or out.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground rounded-lg px-6 py-3 text-center">
              <p className="text-sm font-medium">Current Time</p>
              <p className="text-3xl font-bold font-mono tracking-tight">
                {currentTime ? format(currentTime, 'h:mm:ss') : '--:--:--'}
                <span className="text-lg ml-1">{currentTime ? format(currentTime, 'aa') : ''}</span>
              </p>
              <p className="text-xs text-primary-foreground/70">
                {currentTime ? format(currentTime, 'eeee, MMMM d') : ''}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          <Star className="inline h-4 w-4 text-yellow-500 mr-1" />
          Clock in by <strong>7:00 AM</strong> to earn your on-time bonus.
        </p>

        {/* Employee Cards Grid */}
        {employeesLoading || loadingEntries ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedEmployees.map(employee => {
              const entry = employeeEntries[employee.id] || null;
              const status = getStatus(entry);
              const isClocking = clockingIds.has(employee.id);
              const wasLate = entry?.clockIn ? isLate(entry.clockIn.toDate()) : false;
              const gotBonus = entry?.clockIn ? !wasLate : false;

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
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      status === 'in' && gotBonus ? 'bg-green-500'
                        : status === 'in' && !gotBonus ? 'bg-red-500'
                        : status === 'done' && gotBonus ? 'bg-green-500'
                        : status === 'done' && !gotBonus ? 'bg-red-500'
                        : 'bg-gray-300'
                    }`}
                  />

                  <CardHeader className="pb-1 pt-4">
                    <CardTitle className="text-lg">{employee.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {status === 'in' && gotBonus && '🟢 Clocked In — On Time'}
                      {status === 'in' && !gotBonus && '🔴 Clocked In — Late'}
                      {status === 'done' && gotBonus && '✅ Shift Complete — On Time'}
                      {status === 'done' && !gotBonus && '🔴 Shift Complete — Late'}
                      {status === 'out' && '⚪ Not Clocked In'}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-2 pb-3">
                    {entry?.clockIn && (
                      <div className="bg-muted/50 rounded-md p-2 space-y-0.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Clock In:</span>
                          <span className="font-medium">
                            {format(entry.clockIn.toDate(), 'h:mm aa')}
                            {gotBonus && <Star className="inline h-3.5 w-3.5 text-yellow-500 ml-1 -mt-0.5" />}
                            {wasLate && <span className="text-red-600 text-xs ml-1 font-semibold">LATE</span>}
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
                        <Button
                          className="flex-1 h-10 text-base"
                          onClick={() => handleClock(employee, 'in')}
                          disabled={isClocking}
                        >
                          {isClocking ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <LogIn className="mr-2 h-5 w-5" />
                          )}
                          Clock In
                        </Button>
                      )}

                      {status === 'in' && (
                        <Button
                          className="flex-1 h-10 text-base"
                          variant="secondary"
                          onClick={() => handleClock(employee, 'out')}
                          disabled={isClocking}
                        >
                          {isClocking ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : (
                            <LogOut className="mr-2 h-5 w-5" />
                          )}
                          Clock Out
                        </Button>
                      )}

                      {status === 'done' && (
                        <div className="flex-1 h-10 flex items-center justify-center text-muted-foreground text-sm">
                          ✅ Shift complete for today
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
