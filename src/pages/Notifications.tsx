import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Truck, ShoppingCart, Activity, AlertTriangle, Settings, ChevronRight, Trash2, CheckCircle, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, writeBatch, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Notifications: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(allNotifs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [profile]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Notification removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(notif => {
      if (!notif.read) {
        batch.update(doc(db, 'notifications', notif.id), { read: true });
      }
    });
    try {
      await batch.commit();
      toast.success('All marked as read');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications/batch');
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(notif => {
      batch.delete(doc(db, 'notifications', notif.id));
    });
    try {
      await batch.commit();
      toast.success('All notifications cleared');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'notifications/batch');
    }
  };

  const createTestNotification = async () => {
    if (!profile) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: profile.uid,
        title: 'Test Notification',
        message: 'This is a test notification to verify functionality.',
        type: 'info',
        timestamp: serverTimestamp(),
        read: false
      });
      toast.success('Test notification created');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return Truck;
      case 'warning': return AlertTriangle;
      case 'error': return Settings;
      default: return Bell;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    
    let date: Date;
    try {
      if (timestamp && typeof timestamp === 'object' && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }
      
      if (isNaN(date.getTime())) {
        return 'Recently';
      }
    } catch (e) {
      return 'Recently';
    }

    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-10 pb-10">
      {/* Editorial Header Section */}
      <section className="flex justify-between items-end">
        <div>
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-outline mb-1 font-label">Updates</p>
          <h1 className="text-[1.75rem] font-medium font-headline leading-tight">Notifications</h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={markAllAsRead}
            className="text-primary font-label text-[0.6875rem] uppercase tracking-widest font-bold pb-1 hover:opacity-70 transition-opacity"
          >
            Mark all as read
          </button>
          <button 
            onClick={clearAll}
            className="text-error font-label text-[0.6875rem] uppercase tracking-widest font-bold pb-1 hover:opacity-70 transition-opacity"
          >
            Clear All
          </button>
        </div>
      </section>

      {/* Notification List */}
      <div className="space-y-[1.2rem]">
        {loading ? (
          <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>
        ) : notifications.length === 0 ? (
          <div className="text-center p-10 bg-surface-container-low rounded-2xl border-2 border-dashed border-outline-variant/20">
            <Bell className="mx-auto text-outline-variant mb-3 opacity-20" size={48} />
            <p className="text-outline font-medium">No notifications yet.</p>
            <button 
              onClick={createTestNotification}
              className="mt-4 text-primary text-xs font-bold uppercase tracking-widest"
            >
              Create test notification
            </button>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {notifications.map((notif, i) => {
              const Icon = getIcon(notif.type);
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  layout
                  className={cn(
                    "relative bg-surface-container-lowest rounded-xl p-5 shadow-[0_20px_40px_rgba(26,28,28,0.03)] transition-all hover:bg-surface-bright group",
                    notif.read && "bg-surface-container-low shadow-none opacity-80"
                  )}
                >
                  {!notif.read && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3/5 bg-primary rounded-r-full"></div>
                  )}
                  <div className="flex gap-4">
                    <div className={cn(
                      "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                      notif.type === 'success' ? "bg-primary/10 text-primary" :
                      notif.type === 'warning' ? "bg-orange-100 text-orange-600" :
                      notif.type === 'error' ? "bg-error/10 text-error" :
                      "bg-blue-100 text-blue-600"
                    )}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-on-surface">{notif.title}</h3>
                        <div className="flex items-center gap-2">
                          {!notif.read && (
                            <button 
                              onClick={() => markAsRead(notif.id)}
                              className="p-1.5 hover:bg-primary/10 rounded-full text-primary transition-colors"
                              title="Mark as read"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => deleteNotification(notif.id)}
                            className="p-1.5 hover:bg-error/10 rounded-full text-error opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-on-surface-variant text-sm leading-relaxed mb-3">{notif.message}</p>
                      <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-outline font-label">
                        {formatTime(notif.timestamp)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Optimization Tip Card */}
      <div className="mt-12 bg-slate-900 rounded-xl p-6 text-white overflow-hidden relative shadow-lg">
        <div className="relative z-10">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.15em] text-blue-400 mb-2 block font-label">
            Optimization Tip
          </span>
          <h4 className="text-lg font-headline font-medium mb-3">Manage order peaks with ease.</h4>
          <p className="text-blue-100 text-xs opacity-80 leading-relaxed max-w-[70%]">
            Enable auto-assignment to speed up your local delivery workflow by 22%.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="mt-5 px-5 py-2.5 bg-gradient-to-br from-[#005dac] to-[#1976d2] text-white rounded-full text-xs font-bold shadow-md active:scale-95 transition-transform"
          >
            View Analytics
          </button>
        </div>
        {/* Decorative Element */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <Bell size={80} strokeWidth={1} />
        </div>
      </div>
    </div>
  );
};

export default Notifications;
