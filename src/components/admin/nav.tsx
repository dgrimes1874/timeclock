'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Home, Users, FileText, Timer, LogOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/employees', icon: Users, label: 'Employees' },
  { href: '/reports', icon: FileText, label: 'Reports' },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <Timer className="h-8 w-8 text-primary" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold font-headline">TimeWise Payroll</h2>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.label }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="my-2" />
      <SidebarFooter>
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={{ children: 'Crew View' }}>
                    <Link href="/crew">
                        <LogOut className="rotate-180" />
                        <span>Crew View</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip={{ children: 'Admin' }}>
                    <Avatar className="h-6 w-6">
                        <AvatarImage src="https://picsum.photos/seed/admin/32/32" data-ai-hint="person face" />
                        <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <span>Admin</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
