import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Menu, X, Shield, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/children', label: 'Children', icon: Users },
  { path: '/staff', label: 'Staff', icon: UserCog },
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Mobile header */}
      <header className="lg:hidden shrink-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-semibold text-foreground">OSHC Care Plans</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 bg-card border-r transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto lg:shrink-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-5 hidden lg:flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-primary" />
            <div>
              <h1 className="font-semibold text-foreground text-sm">OSHC Care Plans</h1>
              <p className="text-[11px] text-muted-foreground">Compliance & Risk Management</p>
            </div>
          </div>
          <nav className="px-3 py-4 space-y-1">
            {navItems.map(item => {
              const active = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto pb-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}