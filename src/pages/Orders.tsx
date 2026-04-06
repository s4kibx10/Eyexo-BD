import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, OrderStatus, UserProfile } from '../types';
import { Search, Filter, Calendar, ChevronRight, UserCircle, User, Glasses, Layers, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Orders: React.FC = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [staffFilter, setStaffFilter] = useState<string | 'all'>('all');
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStaffFilter, setShowStaffFilter] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      const fetchStaff = async () => {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const users = snapshot.docs.map(doc => doc.data() as UserProfile);
        setStaffList(users);
      };
      fetchStaff();
    }
  }, [profile]);

  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    let q = query(ordersRef, orderBy('createdAt', 'desc'));

    if (statusFilter !== 'all' && staffFilter !== 'all') {
      q = query(ordersRef, where('status', '==', statusFilter), where('createdBy', '==', staffFilter), orderBy('createdAt', 'desc'));
    } else if (statusFilter !== 'all') {
      q = query(ordersRef, where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
    } else if (staffFilter !== 'all') {
      q = query(ordersRef, where('createdBy', '==', staffFilter), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(allOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [statusFilter, staffFilter]);

  const filteredOrders = orders.filter(o => 
    o.phoneNumber.includes(search) || 
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors = {
    pending: 'bg-orange-500',
    'in transit': 'bg-blue-500',
    delivered: 'bg-primary',
    cancelled: 'bg-error',
  };

  const statusLabels = {
    pending: 'PENDING',
    'in transit': 'IN TRANSIT',
    delivered: 'DELIVERED',
    cancelled: 'CANCELLED',
  };

  const formatDateTime = (createdAt: any) => {
    if (!createdAt) return 'N/A';
    
    try {
      let date: Date;
      if (typeof createdAt.toDate === 'function') {
        date = createdAt.toDate();
      } else if (createdAt.seconds) {
        date = new Date(createdAt.seconds * 1000);
      } else {
        date = new Date(createdAt);
      }

      if (isNaN(date.getTime())) return 'N/A';

      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-7 pb-10">
      {/* Hero Search Section */}
      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-label uppercase tracking-widest text-outline font-semibold">Active Inventory</p>
          <h2 className="text-3xl font-headline font-light text-on-surface">Manage Orders</h2>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-outline w-5 h-5" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-surface-container-highest border-none rounded-xl font-body text-on-surface focus:bg-surface-container-lowest focus:ring-0 focus:border-b-2 focus:border-primary transition-all duration-300 placeholder:text-outline/60"
            placeholder="Search by phone number..."
          />
        </div>
      </section>

      {/* Scrolling Filters */}
      <section className="overflow-x-auto -mx-6 px-6 no-scrollbar">
        <div className="flex gap-3 pb-2">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-low text-on-surface-variant rounded-full whitespace-nowrap text-sm font-medium hover:bg-surface-bright transition-colors">
            <Calendar className="w-4 h-4" />
            Today
          </button>
          <button 
            onClick={() => setStatusFilter('all')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-medium transition-all",
              statusFilter === 'all' ? "bg-primary text-on-primary shadow-sm" : "bg-surface-container-low text-on-surface-variant"
            )}
          >
            <Filter className="w-4 h-4" />
            All Status
          </button>
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setShowStaffFilter(!showStaffFilter)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-medium transition-all",
                staffFilter !== 'all' ? "bg-secondary text-on-secondary shadow-sm" : "bg-surface-container-low text-on-surface-variant"
              )}
            >
              <UserCircle className="w-4 h-4" />
              {staffFilter === 'all' ? 'All Staff' : staffList.find(s => s.uid === staffFilter)?.name || 'Staff'}
            </button>
          )}
        </div>
      </section>

      <AnimatePresence>
        {showStaffFilter && profile?.role === 'admin' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 p-4 bg-surface-container-low rounded-2xl">
              <button
                onClick={() => { setStaffFilter('all'); setShowStaffFilter(false); }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                  staffFilter === 'all' ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant"
                )}
              >
                All
              </button>
              {staffList.map(staff => (
                <button
                  key={staff.uid}
                  onClick={() => { setStaffFilter(staff.uid); setShowStaffFilter(false); }}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all",
                    staffFilter === staff.uid ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant"
                  )}
                >
                  {staff.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order List */}
      <section className="space-y-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-[0.6875rem] font-label uppercase tracking-widest text-outline">
            Total {filteredOrders.length} Orders
          </span>
          <Link to="/" className="text-xs text-primary font-semibold">View Analytics</Link>
        </div>

        {loading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center p-10 text-outline">No orders found.</div>
        ) : (
          filteredOrders.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="group relative bg-surface-container-lowest p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-all duration-200 block"
            >
              <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-r-full", statusColors[order.status])}></div>
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-on-surface">{order.customerName}</h3>
                  <p className="text-xs text-outline font-headline tracking-wide">{order.phoneNumber}</p>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-medium text-on-surface-variant">Staff: {order.createdByName || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-medium text-on-surface-variant">{formatDateTime(order.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full",
                  order.status === 'pending' ? "bg-orange-100 text-orange-600" :
                  order.status === 'in transit' ? "bg-blue-100 text-blue-600" :
                  order.status === 'delivered' ? "bg-primary/10 text-primary" :
                  "bg-error/10 text-error"
                )}>
                  {statusLabels[order.status]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center overflow-hidden">
                    {order.productName.toLowerCase().includes('progressive') || order.productName.toLowerCase().includes('bifocal') ? (
                      <Layers className={cn("w-6 h-6 text-primary", order.status === 'cancelled' && "text-outline")} />
                    ) : (
                      <Glasses className={cn("w-6 h-6 text-primary", order.status === 'cancelled' && "text-outline")} />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-widest text-outline">Product</p>
                    <p className="text-xs font-medium text-on-surface">
                      {order.productName}
                      {order.color && <span className="text-outline font-normal ml-1">({order.color})</span>}
                    </p>
                  </div>
                </div>
                <ChevronRight className="text-outline-variant group-hover:text-primary transition-colors w-5 h-5" />
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
};

export default Orders;
