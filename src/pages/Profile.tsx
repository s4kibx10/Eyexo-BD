import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { LogOut, Download, Settings, ShieldCheck, User as UserIcon, TrendingUp, Camera, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { json2csv } from 'json-2-csv';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const Profile: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setEditName(profile.name);
      setEditPhoto(profile.photoURL || '');
    }
  }, [profile]);

  useEffect(() => {
    // Mock performance data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = months.map(m => ({ name: m, value: Math.floor(Math.random() * 50) + 10 }));
    setPerformanceData(data);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        toast.error('Image size must be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        name: editName,
        photoURL: editPhoto
      });
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const snapshot = await getDocs(ordersRef);
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (orders.length === 0) {
        toast.error('No orders to export');
        return;
      }

      const csv = json2csv(orders);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `optical_orders_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Orders exported to CSV');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export orders');
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <section className="flex justify-between items-start">
        <div>
          <p className="text-[0.6875rem] font-label uppercase tracking-widest text-outline mb-1">My Account</p>
          <h2 className="text-2xl font-headline font-medium text-on-background">Profile Settings</h2>
        </div>
        <button 
          onClick={() => setIsEditing(true)}
          className="p-2 rounded-full bg-surface-container-low text-outline hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Settings size={20} />
        </button>
      </section>

      {/* Profile Card */}
      <div className="bg-surface-container-lowest rounded-[2rem] p-8 shadow-sm flex flex-col items-center text-center space-y-4">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-primary/10 p-1 border-2 border-primary/20 overflow-hidden">
            {profile.photoURL ? (
              <img 
                src={profile.photoURL} 
                alt={profile.name}
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} 
                alt={profile.name}
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera size={14} />
          </button>
        </div>
        <div>
          <h3 className="text-xl font-headline font-bold text-on-surface">{profile.name}</h3>
          <p className="text-on-surface-variant text-sm">{profile.email}</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary">
            {profile.role}
          </span>
          {isAdmin && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-green-100 text-green-700">
              <ShieldCheck size={12} className="mr-1" /> Verified
            </span>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-headline font-bold text-on-surface">Edit Profile</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 rounded-full hover:bg-surface-container-high">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col items-center space-y-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-28 h-28 rounded-full bg-primary/10 p-1 border-2 border-primary/20 overflow-hidden">
                    {editPhoto ? (
                      <img 
                        src={editPhoto} 
                        alt="Preview"
                        className="w-full h-full rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-outline">
                        <UserIcon size={40} />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
                <p className="text-xs text-outline">Click to change profile picture</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline tracking-widest uppercase ml-4">Display Name</label>
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-on-surface font-medium"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 rounded-full bg-surface-container-high text-on-surface font-headline font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex-1 py-4 rounded-full bg-primary text-on-primary font-headline font-bold flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={20} />
                      Save
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container-low p-6 rounded-3xl space-y-2">
          <p className="text-[10px] font-bold text-outline tracking-widest uppercase">Total Handled</p>
          <p className="text-3xl font-headline font-bold text-primary">{profile.totalOrders || 0}</p>
        </div>
        <div className="bg-surface-container-low p-6 rounded-3xl space-y-2">
          <p className="text-[10px] font-bold text-outline tracking-widest uppercase">Performance</p>
          <div className="flex items-center gap-1 text-green-600 font-bold">
            <TrendingUp size={16} />
            <span>+12%</span>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <section className="bg-surface-container-low rounded-[2rem] p-6">
        <p className="text-[10px] font-bold text-outline tracking-widest uppercase mb-6">Monthly Performance</p>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#005dac" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#005dac" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#005dac" 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                strokeWidth={3}
              />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#717783', fontWeight: 600 }} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Actions */}
      <div className="space-y-4">
        <button 
          onClick={exportToCSV}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-full bg-surface-container-highest text-on-surface font-headline font-bold active:scale-[0.98] transition-transform"
        >
          <Download size={20} />
          Export Orders to CSV
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 py-5 rounded-full bg-error/10 text-error font-headline font-bold active:scale-[0.98] transition-transform"
        >
          <LogOut size={20} />
          Authenticate Sign Out
        </button>
      </div>

      {/* Developer Attribution */}
      <div className="pt-8 text-center">
        <p className="text-[10px] font-label uppercase tracking-widest text-outline">
          Developed by{" "}
          <a 
            href="https://www.facebook.com/mushfiqulhasansakib.x" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary font-bold hover:underline"
          >
            "Mushfiqul Hasan Sakib"
          </a>
        </p>
      </div>
    </div>
  );
};

export default Profile;
