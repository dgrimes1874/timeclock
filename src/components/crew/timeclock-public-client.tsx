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

// ============ ON-TIME CELEBRATIONS ============

const onTimeCelebrations = [
  // 1. Confetti rain
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    const particles = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
      id: i, x: Math.random() * 100, delay: Math.random() * 0.3,
      duration: 1 + Math.random() * 1.5,
      color: ['#10B981','#FBBF24','#3B82F6','#8B5CF6','#EC4899','#F97316'][Math.floor(Math.random() * 6)],
      size: 6 + Math.random() * 8,
    })), []);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-bounce-in text-center">
            <div className="text-7xl mb-2">🎉</div>
            <div className="bg-green-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — BONUS!</div>
          </div>
        </div>
        {particles.map(p => (
          <div key={p.id} style={{ position:'absolute', left:`${p.x}%`, top:'-10px', width:`${p.size}px`, height:`${p.size}px`, backgroundColor: p.color, borderRadius: Math.random()>0.5?'50%':'2px', animationDelay:`${p.delay}s`, animationDuration:`${p.duration}s`, animation:`confetti-fall ${p.duration}s ${p.delay}s linear forwards` }} />
        ))}
        <style>{`@keyframes confetti-fall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}} @keyframes bounce-in{0%{transform:scale(0);opacity:0}50%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}} .animate-bounce-in{animation:bounce-in 0.5s ease-out forwards}`}</style>
      </div>
    );
  },
  // 2. Thumbs up explosion
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    const thumbs = useMemo(() => Array.from({ length: 15 }, (_, i) => ({
      id: i, x: 30 + Math.random() * 40, delay: Math.random() * 0.5, size: 24 + Math.random() * 32,
    })), []);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-bounce-in text-center">
            <div className="text-8xl mb-2">👍</div>
            <div className="bg-green-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — NICE!</div>
          </div>
        </div>
        {thumbs.map(t => (
          <div key={t.id} style={{ position:'absolute', left:`${t.x}%`, bottom:'-30px', fontSize:`${t.size}px`, animation:`float-up 1.5s ${t.delay}s ease-out forwards`, opacity:0 }}>👍</div>
        ))}
        <style>{`@keyframes float-up{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-100vh) rotate(20deg);opacity:0}} @keyframes bounce-in{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}} .animate-bounce-in{animation:bounce-in 0.5s ease-out forwards}`}</style>
      </div>
    );
  },
  // 3. Star burst
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    const stars = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
      id: i, angle: (i / 20) * 360, distance: 100 + Math.random() * 200, size: 20 + Math.random() * 20, delay: Math.random() * 0.3,
    })), []);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
        <div className="animate-bounce-in text-center z-10">
          <div className="text-7xl mb-2">⭐</div>
          <div className="bg-yellow-500 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — SUPERSTAR!</div>
        </div>
        {stars.map(s => (
          <div key={s.id} style={{ position:'absolute', left:'50%', top:'50%', fontSize:`${s.size}px`, animation:`star-burst 1.5s ${s.delay}s ease-out forwards`, opacity:0, '--angle':`${s.angle}deg`, '--dist':`${s.distance}px` } as any}>⭐</div>
        ))}
        <style>{`@keyframes star-burst{0%{transform:translate(-50%,-50%) rotate(0);opacity:1}100%{transform:translate(calc(-50% + var(--dist) * cos(var(--angle))), calc(-50% + var(--dist) * sin(var(--angle)))) rotate(360deg);opacity:0}} @keyframes bounce-in{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}} .animate-bounce-in{animation:bounce-in 0.5s ease-out forwards}`}</style>
      </div>
    );
  },
  // 4. Money rain
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    const bills = useMemo(() => Array.from({ length: 25 }, (_, i) => ({
      id: i, x: Math.random() * 100, delay: Math.random() * 0.5, duration: 1 + Math.random() * 1.5, emoji: ['💵','💰','🤑'][Math.floor(Math.random()*3)], size: 24 + Math.random() * 20,
    })), []);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-bounce-in text-center">
            <div className="text-7xl mb-2">💰</div>
            <div className="bg-green-700 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — CHA-CHING!</div>
          </div>
        </div>
        {bills.map(b => (
          <div key={b.id} style={{ position:'absolute', left:`${b.x}%`, top:'-30px', fontSize:`${b.size}px`, animation:`money-fall ${b.duration}s ${b.delay}s linear forwards`, opacity:0 }}>{b.emoji}</div>
        ))}
        <style>{`@keyframes money-fall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(360deg);opacity:0}} @keyframes bounce-in{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}} .animate-bounce-in{animation:bounce-in 0.5s ease-out forwards}`}</style>
      </div>
    );
  },
  // 5. Rocket launch
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
        <div className="animate-bounce-in text-center">
          <div className="text-7xl mb-2 animate-rocket">🚀</div>
          <div className="bg-blue-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — CRUSHING IT!</div>
        </div>
        <style>{`@keyframes bounce-in{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}} .animate-bounce-in{animation:bounce-in 0.5s ease-out forwards} @keyframes rocket{0%{transform:translateY(0)}50%{transform:translateY(-30px)}100%{transform:translateY(0)}} .animate-rocket{animation:rocket 0.5s ease-in-out infinite}`}</style>
      </div>
    );
  },
  // 6. Fire streak
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    const fires = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
      id: i, x: Math.random() * 100, delay: Math.random() * 0.5, size: 20 + Math.random() * 24,
    })), []);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-bounce-in text-center">
            <div className="text-7xl mb-2">🔥</div>
            <div className="bg-orange-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — ON FIRE!</div>
          </div>
        </div>
        {fires.map(f => (
          <div key={f.id} style={{ position:'absolute', left:`${f.x}%`, bottom:'-20px', fontSize:`${f.size}px`, animation:`fire-rise 1.2s ${f.delay}s ease-out forwards`, opacity:0 }}>🔥</div>
        ))}
        <style>{`@keyframes fire-rise{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-100vh);opacity:0}} @keyframes bounce-in{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}} .animate-bounce-in{animation:bounce-in 0.5s ease-out forwards}`}</style>
      </div>
    );
  },
  // 7. Crown
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="animate-bounce-in text-center">
          <div className="text-8xl mb-2 animate-wobble">👑</div>
          <div className="bg-purple-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — ROYALTY!</div>
        </div>
        <style>{`@keyframes bounce-in{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}} .animate-bounce-in{animation:bounce-in 0.5s ease-out forwards} @keyframes wobble{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}} .animate-wobble{animation:wobble 0.4s ease-in-out infinite}`}</style>
      </div>
    );
  },
  // 8. Flexing muscle
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="animate-bounce-in text-center">
          <div className="text-8xl mb-2 animate-pulse">💪</div>
          <div className="bg-emerald-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — BEAST MODE!</div>
        </div>
        <style>{`@keyframes bounce-in{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}} .animate-bounce-in{animation:bounce-in 0.5s ease-out forwards}`}</style>
      </div>
    );
  },
  // 9. Lightning
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    const bolts = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
      id: i, x: Math.random() * 100, delay: Math.random() * 0.8, size: 28 + Math.random() * 20,
    })), []);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-bounce-in text-center">
            <div className="text-7xl mb-2">⚡</div>
            <div className="bg-yellow-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — LIGHTNING FAST!</div>
          </div>
        </div>
        {bolts.map(b => (
          <div key={b.id} style={{ position:'absolute', left:`${b.x}%`, top:'-20px', fontSize:`${b.size}px`, animation:`bolt-drop 0.6s ${b.delay}s ease-in forwards`, opacity:0 }}>⚡</div>
        ))}
        <style>{`@keyframes bolt-drop{0%{transform:translateY(0);opacity:1}100%{transform:translateY(100vh);opacity:0}} @keyframes bounce-in{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}} .animate-bounce-in{animation:bounce-in 0.5s ease-out forwards}`}</style>
      </div>
    );
  },
  // 10. Party popper
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    const emojis = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
      id: i, x: Math.random() * 100, delay: Math.random() * 0.4, size: 20 + Math.random() * 20,
      emoji: ['🎊','🎈','🎉','🥳','🎆'][Math.floor(Math.random()*5)],
    })), []);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-bounce-in text-center">
            <div className="text-7xl mb-2">🥳</div>
            <div className="bg-pink-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — PARTY TIME!</div>
          </div>
        </div>
        {emojis.map(e => (
          <div key={e.id} style={{ position:'absolute', left:`${e.x}%`, top:'-20px', fontSize:`${e.size}px`, animation:`party-fall 1.5s ${e.delay}s linear forwards`, opacity:0 }}>{e.emoji}</div>
        ))}
        <style>{`@keyframes party-fall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(540deg);opacity:0}} @keyframes bounce-in{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}} .animate-bounce-in{animation:bounce-in 0.5s ease-out forwards}`}</style>
      </div>
    );
  },
];

// ============ LATE ANIMATIONS ============

const lateCelebrations = [
  // 1. Sad face shake
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="animate-shake-in text-center">
          <div className="text-8xl mb-2">😬</div>
          <div className="bg-red-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — LATE!</div>
        </div>
        <style>{`@keyframes shake-in{0%{transform:scale(0)}30%{transform:scale(1.1)}40%{transform:translateX(-10px)}50%{transform:translateX(10px)}60%{transform:translateX(-10px)}70%{transform:translateX(10px)}80%{transform:translateX(-5px)}90%{transform:translateX(5px)}100%{transform:translateX(0)}} .animate-shake-in{animation:shake-in 0.8s ease-out forwards}`}</style>
      </div>
    );
  },
  // 2. Alarm clock
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="animate-shake-in text-center">
          <div className="text-8xl mb-2 animate-ring">⏰</div>
          <div className="bg-red-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — OVERSLEPT!</div>
        </div>
        <style>{`@keyframes shake-in{0%{transform:scale(0)}30%{transform:scale(1.1)}40%{transform:translateX(-10px)}50%{transform:translateX(10px)}60%{transform:translateX(-10px)}70%{transform:translateX(10px)}100%{transform:translateX(0)}} .animate-shake-in{animation:shake-in 0.8s ease-out forwards} @keyframes ring{0%,100%{transform:rotate(0)}10%{transform:rotate(15deg)}20%{transform:rotate(-15deg)}30%{transform:rotate(15deg)}40%{transform:rotate(-15deg)}} .animate-ring{animation:ring 0.5s ease-in-out infinite}`}</style>
      </div>
    );
  },
  // 3. Turtle
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="animate-slow-enter text-center">
          <div className="text-8xl mb-2">🐢</div>
          <div className="bg-red-700 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — SLOWPOKE!</div>
        </div>
        <style>{`@keyframes slow-enter{0%{transform:translateX(-100vw)}70%{transform:translateX(20px)}100%{transform:translateX(0)}} .animate-slow-enter{animation:slow-enter 1.5s ease-out forwards}`}</style>
      </div>
    );
  },
  // 4. Disappointed face
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="animate-drop-in text-center">
          <div className="text-8xl mb-2">😮‍💨</div>
          <div className="bg-red-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — NO BONUS!</div>
        </div>
        <style>{`@keyframes drop-in{0%{transform:translateY(-100vh)}60%{transform:translateY(20px)}80%{transform:translateY(-10px)}100%{transform:translateY(0)}} .animate-drop-in{animation:drop-in 0.7s ease-out forwards}`}</style>
      </div>
    );
  },
  // 5. Snooze / sleeping
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    const zzz = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
      id: i, delay: i * 0.2, x: 45 + Math.random() * 10,
    })), []);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
        <div className="animate-shake-in text-center z-10">
          <div className="text-8xl mb-2">😴</div>
          <div className="bg-red-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — WAKE UP!</div>
        </div>
        {zzz.map(z => (
          <div key={z.id} style={{ position:'absolute', left:`${z.x}%`, top:'40%', fontSize:'36px', animation:`zzz-float 1.5s ${z.delay}s ease-out forwards`, opacity:0 }}>💤</div>
        ))}
        <style>{`@keyframes zzz-float{0%{transform:translate(0,0) scale(0.5);opacity:1}100%{transform:translate(30px,-150px) scale(1.2);opacity:0}} @keyframes shake-in{0%{transform:scale(0)}30%{transform:scale(1.1)}40%{transform:translateX(-10px)}50%{transform:translateX(10px)}60%{transform:translateX(-10px)}100%{transform:translateX(0)}} .animate-shake-in{animation:shake-in 0.8s ease-out forwards}`}</style>
      </div>
    );
  },
  // 6. Broken clock
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="animate-shake-in text-center">
          <div className="text-8xl mb-2">🕐</div>
          <div className="bg-red-800 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — TOO LATE!</div>
        </div>
        <style>{`@keyframes shake-in{0%{transform:scale(0) rotate(-180deg)}50%{transform:scale(1.2) rotate(10deg)}70%{transform:scale(0.9) rotate(-5deg)}100%{transform:scale(1) rotate(0)}} .animate-shake-in{animation:shake-in 0.8s ease-out forwards}`}</style>
      </div>
    );
  },
  // 7. Facepalm
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="animate-drop-in text-center">
          <div className="text-8xl mb-2">🤦</div>
          <div className="bg-red-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — REALLY?!</div>
        </div>
        <style>{`@keyframes drop-in{0%{transform:translateY(-100vh) rotate(-30deg)}60%{transform:translateY(20px)}80%{transform:translateY(-10px)}100%{transform:translateY(0) rotate(0)}} .animate-drop-in{animation:drop-in 0.7s ease-out forwards}`}</style>
      </div>
    );
  },
  // 8. Ghost (you're invisible)
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="animate-fade-shake text-center">
          <div className="text-8xl mb-2">👻</div>
          <div className="bg-gray-700 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — WHERE WERE YOU?!</div>
        </div>
        <style>{`@keyframes fade-shake{0%{opacity:0;transform:scale(0.5)}30%{opacity:1;transform:scale(1.1)}40%{transform:translateX(-8px)}50%{transform:translateX(8px)}60%{transform:translateX(-8px)}70%{transform:translateX(8px)}100%{transform:translateX(0)}} .animate-fade-shake{animation:fade-shake 0.8s ease-out forwards}`}</style>
      </div>
    );
  },
  // 9. Snail
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <div className="animate-slow-enter text-center">
          <div className="text-8xl mb-2">🐌</div>
          <div className="bg-red-600 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — SNAIL PACE!</div>
        </div>
        <style>{`@keyframes slow-enter{0%{transform:translateX(-100vw)}70%{transform:translateX(20px)}100%{transform:translateX(0)}} .animate-slow-enter{animation:slow-enter 1.5s ease-out forwards}`}</style>
      </div>
    );
  },
  // 10. Thumbs down rain
  ({ name, onDone }: { name: string; onDone: () => void }) => {
    useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
    const thumbs = useMemo(() => Array.from({ length: 15 }, (_, i) => ({
      id: i, x: Math.random() * 100, delay: Math.random() * 0.5, size: 20 + Math.random() * 20,
    })), []);
    return (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-shake-in text-center">
            <div className="text-7xl mb-2">👎</div>
            <div className="bg-red-700 text-white text-2xl font-bold px-6 py-3 rounded-2xl shadow-2xl">{name} — NOT COOL!</div>
          </div>
        </div>
        {thumbs.map(t => (
          <div key={t.id} style={{ position:'absolute', left:`${t.x}%`, top:'-20px', fontSize:`${t.size}px`, animation:`td-fall 1.2s ${t.delay}s linear forwards`, opacity:0 }}>👎</div>
        ))}
        <style>{`@keyframes td-fall{0%{transform:translateY(0);opacity:1}100%{transform:translateY(100vh);opacity:0}} @keyframes shake-in{0%{transform:scale(0)}30%{transform:scale(1.1)}40%{transform:translateX(-10px)}50%{transform:translateX(10px)}60%{transform:translateX(-10px)}100%{transform:translateX(0)}} .animate-shake-in{animation:shake-in 0.8s ease-out forwards}`}</style>
      </div>
    );
  },
];

// ============ MAIN COMPONENT ============

export default function TimeclockPublicClient() {
  const firestore = useFirestore();
  const { data: employees = [], loading: employeesLoading } = useCollection<Employee>('employees');
  const [employeeEntries, setEmployeeEntries] = useState<Record<string, Document<TimeEntry> | null>>({});
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [clockingIds, setClockingIds] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  // Animation state
  const [activeAnimation, setActiveAnimation] = useState<{ type: 'ontime' | 'late'; index: number; name: string } | null>(null);

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
      activeEmployees.forEach(emp => { entriesMap[emp.id] = null; });
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

  const triggerAnimation = (type: 'ontime' | 'late', name: string) => {
    const list = type === 'ontime' ? onTimeCelebrations : lateCelebrations;
    const index = Math.floor(Math.random() * list.length);
    setActiveAnimation({ type, index, name });
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
          triggerAnimation('late', employee.name);
        } else {
          triggerAnimation('ontime', employee.name);
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

  // Render the active animation
  const renderAnimation = () => {
    if (!activeAnimation) return null;
    const list = activeAnimation.type === 'ontime' ? onTimeCelebrations : lateCelebrations;
    const AnimComponent = list[activeAnimation.index];
    return <AnimComponent name={activeAnimation.name} onDone={() => setActiveAnimation(null)} />;
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6">
      {renderAnimation()}

      <div className="max-w-7xl mx-auto space-y-6">
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

        <p className="text-sm text-muted-foreground">
          <Star className="inline h-4 w-4 text-yellow-500 mr-1" />
          Clock in by <strong>7:00 AM</strong> to earn your on-time bonus.
        </p>

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
                  className={`relative overflow-hidden transition-all ${ringClass} ${status === 'done' ? 'bg-muted/30' : ''}`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    (status === 'in' || status === 'done') && gotBonus ? 'bg-green-500'
                    : (status === 'in' || status === 'done') && !gotBonus ? 'bg-red-500'
                    : 'bg-gray-300'
                  }`} />

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
                          {isClocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
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
                          {isClocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
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
