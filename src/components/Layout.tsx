import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, PlusCircle, Users, User, Bell, Eye, Glasses } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Layout: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: ReceiptText, label: 'Orders', path: '/orders' },
    { icon: PlusCircle, label: 'Add Order', path: '/add-order', primary: true },
    { icon: Users, label: 'Users', path: '/users', adminOnly: true },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-background text-on-background font-body pb-24">
      {/* Top Bar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm h-16">
        <div className="flex justify-between items-center px-6 h-full w-full max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20 relative overflow-hidden">
              <Eye className="text-on-primary w-4 h-4 absolute -translate-x-1 -translate-y-0.5 opacity-70" />
              <Glasses className="text-on-primary w-6 h-6 absolute translate-x-0.5 translate-y-0.5" />
            </div>
            <h1 className="text-lg font-bold text-blue-800 dark:text-blue-300 font-headline tracking-tight">
              Optical Order Manager
            </h1>
          </div>
          <NavLink to="/notifications" className="relative p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
            <Bell className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-slate-900"></span>
          </NavLink>
        </div>
        <div className="bg-slate-200 dark:bg-slate-800 h-[1.5px] w-full max-w-md mx-auto"></div>
      </header>

      {/* Main Content */}
      <main className="pt-20 px-6 max-w-md mx-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-[24px] z-50 max-w-md mx-auto left-1/2 -translate-x-1/2">
        <div className="flex justify-around items-center px-4 pb-6 pt-3">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-12 h-12 transition-all duration-300 rounded-full",
                  isActive 
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200" 
                    : "text-slate-400 dark:text-slate-500 hover:opacity-80"
                )}
              >
                <item.icon className={cn("w-6 h-6", item.primary && "w-8 h-8 text-primary")} />
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
