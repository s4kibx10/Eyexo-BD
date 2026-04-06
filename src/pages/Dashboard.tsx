import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, UserProfile } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, CheckCircle2, Clock, MoreHorizontal, PlusCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { startOfDay, startOfMonth, endOfDay, format, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    today: 0,
    month: 0,
    delivered: 0,
    pending: 0,
    todayTrend: 0,
  });
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const ordersRef = collection(db, 'orders');
    const todayStart = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    // Real-time stats
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      const getValidDate = (createdAt: any) => {
        if (!createdAt) return new Date(0); // Fallback for null/undefined
        if (typeof createdAt.toDate === 'function') return createdAt.toDate();
        const date = new Date(createdAt);
        return isNaN(date.getTime()) ? new Date(0) : date;
      };

      const todayOrders = allOrders.filter(o => getValidDate(o.createdAt) >= todayStart);
      const monthOrders = allOrders.filter(o => getValidDate(o.createdAt) >= monthStart);
      const delivered = allOrders.filter(o => o.status === 'delivered');
      const pending = allOrders.filter(o => o.status === 'pending');

      // Calculate trend (Today vs Yesterday)
      const yesterdayStart = startOfDay(subDays(new Date(), 1));
      const yesterdayOrders = allOrders.filter(o => {
        const d = getValidDate(o.createdAt);
        return d >= yesterdayStart && d < todayStart;
      });

      const todayCount = todayOrders.length;
      const yesterdayCount = yesterdayOrders.length;
      let trend = 0;
      if (yesterdayCount > 0) {
        trend = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
      } else if (todayCount > 0) {
        trend = 100;
      }

      setStats({
        today: todayCount,
        month: monthOrders.length,
        delivered: delivered.length,
        pending: pending.length,
        todayTrend: trend,
      });

      // Daily Volume Chart Data (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayName = format(date, 'EEE').toUpperCase();
        const targetDateStr = format(date, 'yyyy-MM-dd');
        const count = allOrders.filter(o => {
          const orderDate = getValidDate(o.createdAt);
          return format(orderDate, 'yyyy-MM-dd') === targetDateStr;
        }).length;
        return { name: dayName, value: count };
      });
      setDailyData(last7Days);

      // Performance Curve (Last 6 Months)
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const date = startOfMonth(subDays(new Date(), (5 - i) * 30));
        const monthName = format(date, 'MMM').toUpperCase();
        const monthStart = startOfMonth(date);
        const count = allOrders.filter(o => {
          const orderDate = getValidDate(o.createdAt);
          return orderDate >= monthStart && orderDate < startOfMonth(subDays(monthStart, -32));
        }).length;
        return { name: monthName, value: count };
      });
      setPerformanceData(last6Months);
    });

    // Top Users
    const usersRef = collection(db, 'users');
    const topUsersQuery = query(usersRef, orderBy('totalOrders', 'desc'), limit(3));
    const unsubscribeUsers = onSnapshot(topUsersQuery, (snapshot) => {
      setTopUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, []);

  const statCards = [
    { label: 'TODAY', value: stats.today, icon: Calendar, trend: stats.todayTrend !== 0 ? `${stats.todayTrend > 0 ? '+' : ''}${stats.todayTrend}%` : null, color: 'text-primary' },
    { label: 'MONTH', value: stats.month > 1000 ? `${(stats.month / 1000).toFixed(1)}k` : stats.month, icon: TrendingUp, color: 'text-orange-500' },
    { label: 'DELIVERED', value: stats.delivered, icon: CheckCircle2, color: 'text-primary' },
    { label: 'PENDING', value: stats.pending, icon: Clock, color: 'text-primary' },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <section>
        <p className="text-[0.6875rem] font-label uppercase tracking-widest text-outline mb-1">Overview</p>
        <h2 className="text-xl font-headline font-medium text-on-background">Morning, curator.</h2>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm flex flex-col gap-4 min-h-[140px]"
          >
            <div className="flex justify-between items-start">
              <stat.icon className={stat.color} size={20} />
              {stat.trend && (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${stats.todayTrend >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {stat.trend}
                </span>
              )}
            </div>
            <div className="mt-auto">
              <p className="text-[10px] font-bold text-outline tracking-wider uppercase">{stat.label}</p>
              <p className="text-2xl font-headline font-medium text-on-surface">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Order Analytics */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-headline font-medium text-on-surface">Order Analytics</h3>
          <button 
            onClick={() => navigate('/orders')}
            className="text-primary text-xs font-semibold hover:underline"
          >
            View Detailed
          </button>
        </div>
        
        <div className="bg-surface-container-low rounded-[2rem] p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-6">
              <p className="text-[10px] font-bold text-outline tracking-widest uppercase">Daily Volume</p>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary/30"></div>
              </div>
            </div>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <Tooltip 
                    cursor={{ fill: 'rgba(0, 93, 172, 0.05)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#005dac" 
                    radius={[4, 4, 0, 0]} 
                    barSize={30}
                  />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#717783', fontWeight: 600 }} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-[2rem] p-6">
          <p className="text-[10px] font-bold text-outline tracking-widest uppercase mb-6">Performance Curve</p>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#005dac" 
                  strokeWidth={3} 
                  dot={{ fill: '#005dac', strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#717783', fontWeight: 600 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Top Curators */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-headline font-medium text-on-surface">Top Curators</h3>
          <button className="text-outline">
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className="space-y-4">
          {topUsers.map((user, i) => (
            <div key={user.uid} className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-surface-container-high overflow-hidden">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                    alt={user.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <div className="flex-1 border-b border-surface-container-high pb-4">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-on-surface">{user.name}</p>
                  <p className="text-primary font-bold">{user.totalOrders || 0}</p>
                </div>
                <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((user.totalOrders || 0) / 2, 100)}%` }}
                    className="bg-primary h-full rounded-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating Action Button */}
      <button 
        onClick={() => navigate('/add-order')}
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-primary text-on-primary shadow-[0_10px_20px_rgba(0,93,172,0.3)] flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <PlusCircle size={32} />
      </button>
    </div>
  );
};

export default Dashboard;
