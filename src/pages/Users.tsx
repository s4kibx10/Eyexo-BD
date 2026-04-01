import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, setDoc, orderBy, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import { Search, UserPlus, Edit, Trash2, MoreVertical, ShieldCheck, User as UserIcon, X, Check, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'staff' as 'staff' | 'admin' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('totalOrders', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(allUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (uid: string) => {
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, 'users', uid));
      toast.success('User deleted successfully');
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsProcessing(true);
    try {
      const userRef = doc(db, 'users', editingUser.uid);
      await updateDoc(userRef, {
        name: editingUser.name,
        role: editingUser.role
      });
      toast.success('User updated successfully');
      setEditingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingUser.uid}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a real app, this would involve Firebase Admin or an invite system.
      // Here we create the profile; the user must sign up with this email to link.
      // For demo purposes, we'll use a random UID if they don't exist.
      const tempUid = Math.random().toString(36).substring(7);
      await setDoc(doc(db, 'users', tempUid), {
        uid: tempUid,
        ...newUser,
        totalOrders: 0,
        lastLogin: 'Never',
      });
      toast.success('User profile created. They can now sign up with this email.');
      setShowAddModal(false);
      setNewUser({ name: '', email: '', role: 'staff' });
    } catch (error) {
      toast.error('Failed to add user');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const formatLastLogin = (lastLogin: any) => {
    if (!lastLogin) return 'Never';
    if (lastLogin === 'Never') return 'Never';
    
    try {
      // Handle Firestore Timestamp
      if (lastLogin && typeof lastLogin === 'object' && typeof lastLogin.toDate === 'function') {
        return lastLogin.toDate().toLocaleDateString();
      }
      
      // Handle ISO string or other strings
      if (typeof lastLogin === 'string') {
        if (lastLogin.includes('T')) {
          const date = new Date(lastLogin);
          return isNaN(date.getTime()) ? lastLogin : date.toLocaleDateString();
        }
        return lastLogin;
      }
      
      // Handle Date object
      if (lastLogin instanceof Date) {
        return lastLogin.toLocaleDateString();
      }
      
      // Handle number (timestamp)
      if (typeof lastLogin === 'number') {
        return new Date(lastLogin).toLocaleDateString();
      }
    } catch (error) {
      console.error('Error formatting lastLogin:', error);
    }
    
    return String(lastLogin);
  };

  return (
    <div className="space-y-10 pb-10">
      {/* Editorial Header Section */}
      <section>
        <p className="font-label text-[0.6875rem] uppercase tracking-widest text-outline mb-2">Internal Administration</p>
        <div className="flex justify-between items-end">
          <h2 className="font-headline text-2xl font-medium text-on-background">User Access</h2>
          <div className="font-headline text-5xl leading-none text-primary/10">{users.length}</div>
        </div>
      </section>

      {/* Search / Lens Input */}
      <div className="relative flex items-center bg-surface-container-highest rounded-xl px-4 py-3 group">
        <Search className="text-outline mr-3 w-5 h-5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none focus:ring-0 p-0 w-full text-sm placeholder:text-outline"
          placeholder="Search staff by name or role..."
        />
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary scale-x-0 group-focus-within:scale-x-100 transition-transform origin-left"></div>
      </div>

      {/* User List */}
      <div className="space-y-[1.2rem]">
        {loading ? (
          <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>
        ) : filteredUsers.map((user) => (
          <div key={user.uid} className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_20px_40px_rgba(26,28,28,0.06)] relative overflow-hidden group">
            <div className={cn("absolute left-0 top-0 bottom-0 w-[2px]", user.role === 'admin' ? "bg-primary" : "bg-tertiary")}></div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-low overflow-hidden">
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
                <div>
                  <h3 className="font-semibold text-on-background">{user.name}</h3>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase mt-1",
                    user.role === 'admin' ? "bg-primary/10 text-primary" : "bg-orange-100 text-orange-600"
                  )}>
                    {user.role}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => setEditingUser(user)}
                  className="p-2 hover:bg-surface-bright rounded-full transition-colors text-outline"
                >
                  <Edit size={20} />
                </button>
                <button 
                  onClick={() => setConfirmDelete(user.uid)}
                  className="p-2 hover:bg-error/10 rounded-full transition-colors text-error"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-surface-container-low">
              <div className="flex flex-col">
                <span className="font-label text-[10px] uppercase text-outline">Orders Handled</span>
                <span className="font-headline font-bold text-lg text-on-secondary-container">{user.totalOrders || 0}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-label text-[10px] uppercase text-outline">Last Login</span>
                <span className="text-sm text-on-surface-variant">
                  {formatLastLogin(user.lastLogin)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAB: Add User */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-primary text-on-primary shadow-[0_10px_20px_rgba(0,93,172,0.3)] flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <UserPlus size={32} />
      </button>

      <AnimatePresence>
        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-sm space-y-6"
            >
              <h3 className="text-2xl font-headline font-medium">Add New User</h3>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full p-4 bg-surface-container-highest border-none rounded-xl focus:ring-2 focus:ring-primary/20"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full p-4 bg-surface-container-highest border-none rounded-xl focus:ring-2 focus:ring-primary/20"
                    placeholder="john@optical.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Role</label>
                  <select 
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="w-full p-4 bg-surface-container-highest border-none rounded-xl focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 rounded-full bg-surface-container-high text-on-surface font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 rounded-full bg-primary text-on-primary font-bold shadow-lg shadow-primary/20"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-sm space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-headline font-medium">Edit User</h3>
                <button onClick={() => setEditingUser(null)} className="p-2 rounded-full hover:bg-surface-container-high">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full p-4 bg-surface-container-highest border-none rounded-xl focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Email (Read-only)</label>
                  <input 
                    type="email" 
                    disabled
                    value={editingUser.email}
                    className="w-full p-4 bg-surface-container-low border-none rounded-xl text-outline cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Role</label>
                  <select 
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full p-4 bg-surface-container-highest border-none rounded-xl focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-4 rounded-full bg-surface-container-high text-on-surface font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 py-4 rounded-full bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-on-primary"></div> : <><Check size={20} /> Save</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-sm space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-headline font-bold text-on-surface">Delete User?</h3>
                <p className="text-sm text-on-surface-variant">This action cannot be undone. All associated data for this staff member will remain, but they will lose access.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-4 rounded-full bg-surface-container-high text-on-surface font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(confirmDelete)}
                  disabled={isProcessing}
                  className="flex-1 py-4 rounded-full bg-error text-white font-bold shadow-lg shadow-error/20 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
