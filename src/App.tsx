import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import AddOrder from './pages/AddOrder';
import OrderDetails from './pages/OrderDetails';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import LoadingScreen from './components/LoadingScreen';
import { Toaster } from 'sonner';
import { useEffect } from 'react';

const AppContent: React.FC = () => {
  const { loading, globalLoading, setGlobalLoading } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    // Show loading on every route change for a brief moment
    setGlobalLoading(true);
    const timer = setTimeout(() => {
      setGlobalLoading(false);
    }, 800); // 800ms for a smooth transition
    
    return () => clearTimeout(timer);
  }, [location.pathname, setGlobalLoading]);

  if (loading || globalLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/add-order" element={<AddOrder />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            
            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/users" element={<Users />} />
            </Route>
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
