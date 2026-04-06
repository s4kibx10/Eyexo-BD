import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Bell, Check, Truck, Package, ExternalLink, Edit3, User, MapPin, Eye, Glasses, Layers, X, Loader2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    customerName: '',
    phoneNumber: '',
    address: '',
    price: 0
  });

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'orders', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Order;
        setOrder(data);
        setEditData({
          customerName: data.customerName,
          phoneNumber: data.phoneNumber,
          address: data.address,
          price: data.price
        });
      } else {
        toast.error('Order not found');
        navigate('/orders');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  const handleSave = async () => {
    if (!id || !order || !profile) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'orders', id), {
        customerName: editData.customerName,
        phoneNumber: editData.phoneNumber,
        address: editData.address,
        price: Number(editData.price),
        lastEditedBy: profile.uid,
        lastEditedByName: profile.name,
        lastEditedAt: new Date().toISOString()
      });
      toast.success('Order updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update order');
    } finally {
      setIsSaving(false);
    }
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

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const trackLive = async () => {
    if (!order?.trackingId) return;
    try {
      const res = await fetch(`/api/steadfast/status/${order.trackingId}`);
      const data = await res.json();
      
      // Steadfast status mapping
      const statusMap: Record<string, OrderStatus> = {
        'pending': 'pending',
        'in_transit': 'in transit',
        'delivered': 'delivered',
        'cancelled': 'cancelled',
        'returned': 'cancelled'
      };

      const mappedStatus = statusMap[data.status] || data.status;
      
      toast.info(`Steadfast Status: ${data.status}`);
      
      if (mappedStatus && mappedStatus !== order.status) {
        await updateStatus(mappedStatus as OrderStatus);
      }
    } catch (error) {
      toast.error('Failed to fetch tracking status');
    }
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  if (!order) return null;

  const steps = [
    { key: 'pending', label: 'PENDING', icon: Check },
    { key: 'in transit', label: 'IN TRANSIT', icon: Truck },
    { key: 'delivered', label: 'DELIVERED', icon: Package },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order.status);

  return (
    <div className="pt-4 pb-24 space-y-8">
      {/* Hero Order Identity */}
      <section className="space-y-2">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-blue-50 transition-colors">
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <span className="font-label text-[10px] text-outline tracking-widest uppercase">Order Reference</span>
        </div>
        <div className="flex justify-between items-end">
          <h2 className="font-headline text-[3.5rem] leading-none font-light text-primary">
            #{order.id?.slice(-4).toUpperCase()}
          </h2>
          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-full bg-surface-container-low text-primary hover:bg-primary/10 transition-colors"
            >
              <Edit3 size={20} />
            </button>
            <div className={cn(
              "px-4 py-1.5 rounded-full font-medium text-sm flex items-center gap-2",
              order.status === 'delivered' ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"
            )}>
              <span className={cn("w-2 h-2 rounded-full", order.status === 'delivered' ? "bg-green-500" : "bg-primary animate-pulse")}></span>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </div>
          </div>
        </div>
      </section>

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
                <h3 className="text-xl font-headline font-bold text-on-surface">Edit Order Info</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 rounded-full hover:bg-surface-container-high">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline tracking-widest uppercase ml-4">Customer Name</label>
                  <input 
                    type="text"
                    value={editData.customerName}
                    onChange={(e) => setEditData({...editData, customerName: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-on-surface font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline tracking-widest uppercase ml-4">Phone Number</label>
                  <input 
                    type="text"
                    value={editData.phoneNumber}
                    onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-on-surface font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline tracking-widest uppercase ml-4">Address</label>
                  <textarea 
                    value={editData.address}
                    onChange={(e) => setEditData({...editData, address: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-on-surface font-medium resize-none"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-outline tracking-widest uppercase ml-4">Price (৳)</label>
                  <input 
                    type="number"
                    value={editData.price}
                    onChange={(e) => setEditData({...editData, price: Number(e.target.value)})}
                    className="w-full px-6 py-4 rounded-2xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-on-surface font-medium"
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
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-4 rounded-full bg-primary text-on-primary font-headline font-bold flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={20} />
                      Save
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status Timeline */}
      <section className="bg-surface-container-low rounded-xl p-6">
        <h3 className="font-headline text-lg font-semibold mb-6">Tracking Timeline</h3>
        <div className="relative flex justify-between items-start">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 w-full h-0.5 bg-surface-container-highest">
            <div 
              className="h-full bg-primary transition-all duration-500" 
              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            ></div>
          </div>
          {/* Status Points */}
          {steps.map((step, i) => {
            const isCompleted = i <= currentStepIndex;
            const isCurrent = i === currentStepIndex;
            
            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center gap-3 text-center w-1/3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                  isCompleted ? "bg-primary text-on-primary shadow-primary/20" : "bg-surface-container-highest text-outline-variant"
                )}>
                  <step.icon size={20} />
                </div>
                <span className={cn(
                  "font-label text-[10px] uppercase font-bold",
                  isCompleted ? "text-primary" : "text-outline-variant"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Steadfast Tracking Link */}
        <div className="mt-8 pt-6 border-t border-outline-variant/10 flex items-center justify-between">
          <div>
            <p className="font-label text-[10px] uppercase text-outline">Carrier: Steadfast</p>
            <p className="font-headline font-semibold text-on-surface">{order.trackingId || 'N/A'}</p>
          </div>
          <button 
            onClick={trackLive}
            className="text-primary font-medium text-sm flex items-center gap-1 hover:underline"
          >
            Track Live <ExternalLink size={14} />
          </button>
        </div>
      </section>

      {/* Customer & Product Bento */}
      <div className="grid grid-cols-1 gap-4">
        {/* Customer Card */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-surface-container-low overflow-hidden">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${order.customerName}`} 
                alt="Customer" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="font-headline font-semibold text-lg">{order.customerName}</h4>
              <p className="text-on-surface-variant text-sm">{order.phoneNumber}</p>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-lg p-4">
            <p className="font-label text-[10px] uppercase text-outline mb-1">Shipping Address</p>
            <p className="text-sm leading-relaxed">{order.address}</p>
          </div>
        </div>

        {/* Product Card */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="font-headline font-semibold text-lg">{order.productName}</h4>
              <p className="text-on-surface-variant text-sm">SKU: OPT-{order.id?.slice(0, 4).toUpperCase()}</p>
            </div>
            <div className="w-16 h-16 rounded-xl bg-surface-container-low flex items-center justify-center overflow-hidden">
              {order.productName.toLowerCase().includes('progressive') || order.productName.toLowerCase().includes('bifocal') ? (
                <Layers className="w-8 h-8 text-primary" />
              ) : (
                <Glasses className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>
          <div className="bg-surface-container-low rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
              <span className="text-xs font-semibold text-primary">Order Details</span>
              <Eye className="w-4 h-4 text-outline" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-label text-[10px] uppercase text-outline">Price</p>
                <p className="font-headline font-medium">৳{order.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase text-outline">Created Date & Time</p>
                <p className="font-headline font-medium text-xs">{formatDateTime(order.createdAt)}</p>
              </div>
              {order.color && (
                <div>
                  <p className="font-label text-[10px] uppercase text-outline">Color</p>
                  <p className="font-headline font-medium">{order.color}</p>
                </div>
              )}
              <div className="col-span-2 pt-2 border-t border-outline-variant/10">
                <p className="font-label text-[10px] uppercase text-outline">Staff Member</p>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-primary" />
                  <p className="font-headline font-medium text-sm">{order.createdByName || 'Unknown'}</p>
                </div>
              </div>
              {order.lastEditedAt && (
                <div className="col-span-2 pt-2 border-t border-outline-variant/10">
                  <p className="font-label text-[10px] uppercase text-outline">Last Edited</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Edit3 className="w-4 h-4 text-orange-500" />
                    <p className="font-headline font-medium text-[10px]">
                      By {order.lastEditedByName} on {formatDateTime(order.lastEditedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Eye Power Details */}
          {order.eyePower && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/10">
                <Eye className="w-4 h-4 text-primary" />
                <h5 className="text-xs font-bold uppercase tracking-widest text-on-surface">Eye Power Specifications</h5>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Right Eye */}
                <div className="bg-surface-container-low rounded-lg p-3 space-y-2">
                  <p className="text-[9px] font-bold text-outline uppercase tracking-widest border-b border-outline/10 pb-1">Right Eye (RE)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[8px] font-bold text-primary uppercase">SPH</p>
                      <p className="text-xs font-medium">{order.eyePower.re.sph || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-primary uppercase">CYL</p>
                      <p className="text-xs font-medium">{order.eyePower.re.cyl || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-primary uppercase">AXIS</p>
                      <p className="text-xs font-medium">{order.eyePower.re.axis || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-primary uppercase">ADD</p>
                      <p className="text-xs font-medium">{order.eyePower.re.add || '-'}</p>
                    </div>
                  </div>
                </div>
                {/* Left Eye */}
                <div className="bg-surface-container-low rounded-lg p-3 space-y-2">
                  <p className="text-[9px] font-bold text-outline uppercase tracking-widest border-b border-outline/10 pb-1">Left Eye (LE)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[8px] font-bold text-primary uppercase">SPH</p>
                      <p className="text-xs font-medium">{order.eyePower.le.sph || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-primary uppercase">CYL</p>
                      <p className="text-xs font-medium">{order.eyePower.le.cyl || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-primary uppercase">AXIS</p>
                      <p className="text-xs font-medium">{order.eyePower.le.axis || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-primary uppercase">ADD</p>
                      <p className="text-xs font-medium">{order.eyePower.le.add || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Section */}
      <div className="pt-4">
        <div className="flex gap-4">
          <button 
            onClick={() => updateStatus('in transit')}
            className="flex-1 bg-surface-container-highest text-on-surface font-semibold py-4 rounded-full active:scale-95 transition-transform"
          >
            Mark In Transit
          </button>
          <button 
            onClick={() => updateStatus('delivered')}
            className="flex-1 bg-primary text-on-primary font-semibold py-4 rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            Mark Delivered
          </button>
        </div>
        <button 
          onClick={() => updateStatus('cancelled')}
          className="w-full mt-4 text-error font-semibold py-4 rounded-full border border-error/20 active:scale-95 transition-transform"
        >
          Cancel Order
        </button>
      </div>
    </div>
  );
};

export default OrderDetails;
