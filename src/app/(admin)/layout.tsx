import React from 'react';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import AdminNav from '@/components/admin/nav';
import Header from '@/components/admin/header';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <SidebarProvider defaultOpen>
        <Sidebar>
          <AdminNav />
        </Sidebar>
        <SidebarInset>
          <Header />
          <main className="flex-1 p-4 sm:p-6 bg-background/95">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </FirebaseClientProvider>
  );
}
