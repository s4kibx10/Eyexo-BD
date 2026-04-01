import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { LayoutDashboard, Terminal, Cloud, Eye, Glasses } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Access Authenticated');
        navigate('/');
      } else {
        // Signup
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: email.split('@')[0],
          email: email,
          role: role,
          totalOrders: 0,
          lastLogin: serverTimestamp(),
        });
        
        toast.success('Practice Registered');
        navigate('/');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Authentication Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent to your inbox');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex flex-col items-center justify-center p-6 overflow-x-hidden relative">
      {/* Visual Accents */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] -z-10"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px] -z-10"></div>
      
      <main className="w-full max-w-[440px] flex flex-col items-center gap-10 z-10">
        {/* Brand Identity */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#005dac] to-[#1976d2] flex items-center justify-center shadow-lg shadow-primary/20 mb-6 relative">
            <Eye className="text-on-primary w-8 h-8 absolute -translate-x-2 -translate-y-1 opacity-80" />
            <Glasses className="text-on-primary w-10 h-10 absolute translate-x-1 translate-y-1" />
          </div>
          <h1 className="font-headline font-extrabold text-3xl tracking-tight text-on-background mb-2">
            Optical Order Manager
          </h1>
          <p className="text-on-surface-variant font-body text-sm max-w-[280px]">
            Curating precision and clarity for the visionary professional.
          </p>
        </div>

        {/* Auth Container */}
        <div className="w-full bg-surface-container-low rounded-[2rem] p-2 flex flex-col shadow-sm">
          {/* Tab Switcher */}
          <div className="flex p-1 gap-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={cn(
                "flex-1 py-3 text-sm font-semibold rounded-full transition-all duration-300",
                isLogin ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-bright"
              )}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={cn(
                "flex-1 py-3 text-sm font-semibold rounded-full transition-all duration-300",
                !isLogin ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-bright"
              )}
            >
              Signup
            </button>
          </div>

          {/* Form Content */}
          <div className="px-6 pb-10">
            <form onSubmit={handleAuth} className="space-y-6">
              {/* Role Toggle */}
              <div className="flex flex-col gap-3">
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold px-1">
                  Access Level
                </span>
                <div className="flex bg-surface-container-highest rounded-full p-1 h-11 relative">
                  <button
                    type="button"
                    onClick={() => setRole('staff')}
                    className={cn(
                      "flex-1 flex items-center justify-center text-xs font-semibold rounded-full cursor-pointer transition-all duration-300 z-10",
                      role === 'staff' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant"
                    )}
                  >
                    Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={cn(
                      "flex-1 flex items-center justify-center text-xs font-semibold rounded-full cursor-pointer transition-all duration-300 z-10",
                      role === 'admin' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant"
                    )}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Input Fields */}
              <div className="space-y-4">
                <div className="relative group">
                  <label className="absolute left-4 top-2 text-[10px] uppercase tracking-widest text-primary font-bold">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pt-7 pb-3 px-4 bg-surface-container-highest border-none rounded-xl focus:ring-0 focus:bg-surface-container-lowest transition-colors text-sm font-medium text-on-surface placeholder:text-outline-variant"
                    placeholder="name@optical.com"
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary group-focus-within:w-full transition-all duration-300"></div>
                </div>
                <div className="relative group">
                  <label className="absolute left-4 top-2 text-[10px] uppercase tracking-widest text-primary font-bold">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pt-7 pb-3 px-4 bg-surface-container-highest border-none rounded-xl focus:ring-0 focus:bg-surface-container-lowest transition-colors text-sm font-medium text-on-surface placeholder:text-outline-variant"
                    placeholder="••••••••"
                  />
                  <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-primary group-focus-within:w-full transition-all duration-300"></div>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20"
                  />
                  <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">
                    Keep me signed in
                  </span>
                </label>
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-primary hover:text-secondary transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-full bg-gradient-to-br from-[#005dac] to-[#1976d2] text-on-primary font-headline font-bold text-sm tracking-wide shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Authenticate Access'}
              </button>
            </form>
          </div>
        </div>

        {/* Developer Attribution */}
        <div className="mt-4 text-center">
          <p className="text-[10px] font-label uppercase tracking-widest text-outline-variant">
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
      </main>
    </div>
  );
};

export default Login;
