import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus } from '../types';
import { User, Phone, MapPin, Layers, Calendar, Truck, Send, Microscope } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const AddOrder: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [sendToSteadfast, setSendToSteadfast] = useState(true);
  
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    address: '',
    productName: 'Progressive',
    color: '',
    price: '',
    trackingId: '',
    note: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setLoading(true);
    try {
      let finalTrackingId = formData.trackingId;

      // If user wants to send to Steadfast
      if (sendToSteadfast) {
        // Basic phone number validation for Steadfast (11 digits)
        const cleanPhone = formData.phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length !== 11) {
          toast.error('Steadfast requires an 11-digit phone number (e.g., 017XXXXXXXX)');
          setLoading(false);
          return;
        }

        try {
          const response = await fetch('/api/steadfast/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoice: `OPT-${Date.now()}`,
              recipient_name: formData.customerName,
              recipient_phone: cleanPhone,
              recipient_address: formData.address,
              cod_amount: parseFloat(formData.price),
              note: formData.note || 'Optical Order'
            })
          });

          const result = await response.json();
          if (response.ok && result.status === 200) {
            finalTrackingId = result.order.tracking_code;
            toast.success(`Steadfast Parcel Created: ${finalTrackingId}`);
          } else {
            console.error("Steadfast API Error:", result);
            const errorMsg = result.message || result.error || 'Check API credentials';
            toast.error(`Steadfast Error: ${errorMsg}`);
            // We continue saving the order in our DB even if Steadfast fails, but with a warning
          }
        } catch (err) {
          console.error("Steadfast Fetch Error:", err);
          toast.error('Failed to connect to Steadfast API');
        }
      }

      const orderData = {
        ...formData,
        orderDate: new Date().toLocaleDateString('en-GB'), // Automatic date (e.g. DD/MM/YYYY)
        trackingId: finalTrackingId,
        price: parseFloat(formData.price),
        status: 'pending' as OrderStatus,
        createdBy: profile.uid,
        createdByName: profile.name,
        createdAt: serverTimestamp(),
      };

      // Add Order
      try {
        await addDoc(collection(db, 'orders'), orderData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'orders');
      }

      // Update User Stats
      const userRef = doc(db, 'users', profile.uid);
      try {
        await updateDoc(userRef, {
          totalOrders: increment(1)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      }

      toast.success('Order Created Successfully');
      navigate('/orders');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-4 pb-24">
      {/* Page Header */}
      <div className="mb-10">
        <span className="text-primary font-label text-[0.6875rem] uppercase tracking-widest font-semibold">New Entry</span>
        <h2 className="text-3xl font-headline font-light text-on-surface mt-1">Create Order</h2>
        <p className="text-on-surface-variant text-sm mt-2 font-body">Capture detailed specifications for the precision lens fitting.</p>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section: Customer Info */}
        <div className="space-y-6">
          <div className="relative group">
            <label className="absolute -top-2.5 left-4 px-1 bg-background text-primary font-label text-[10px] font-bold z-10 uppercase tracking-wider">
              Customer Name
            </label>
            <div className="flex items-center bg-surface-container-highest rounded-xl p-4 transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/10">
              <User className="text-outline mr-3 w-5 h-5" />
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="bg-transparent border-none focus:ring-0 w-full text-on-surface placeholder:text-outline-variant font-medium"
                placeholder="e.g. Julianne Moore"
              />
            </div>
          </div>

          <div className="relative group">
            <label className="absolute -top-2.5 left-4 px-1 bg-background text-primary font-label text-[10px] font-bold z-10 uppercase tracking-wider">
              Phone Number
            </label>
            <div className="flex items-center bg-surface-container-highest rounded-xl p-4 transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/10">
              <Phone className="text-outline mr-3 w-5 h-5" />
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="bg-transparent border-none focus:ring-0 w-full text-on-surface placeholder:text-outline-variant font-medium"
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>

          <div className="relative group">
            <label className="absolute -top-2.5 left-4 px-1 bg-background text-primary font-label text-[10px] font-bold z-10 uppercase tracking-wider">
              Delivery Address
            </label>
            <div className="flex items-start bg-surface-container-highest rounded-xl p-4 transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/10">
              <MapPin className="text-outline mr-3 mt-1 w-5 h-5" />
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-transparent border-none focus:ring-0 w-full text-on-surface placeholder:text-outline-variant font-medium resize-none"
                placeholder="Street, Building, City, Zip Code"
                rows={3}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Section: Product Details */}
        <div className="p-6 bg-surface-container-low rounded-xl space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-headline text-lg font-medium text-on-surface">Specifications</h3>
            <Microscope className="text-primary w-6 h-6" />
          </div>

          <div className="relative group">
            <label className="absolute -top-2.5 left-4 px-1 bg-surface-container-low text-primary font-label text-[10px] font-bold z-10 uppercase tracking-wider">
              Lens Type
            </label>
            <div className="relative flex items-center bg-surface-container-highest rounded-xl px-4 py-3 transition-all">
              <Layers className="text-outline mr-3 w-5 h-5" />
              <select
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                className="appearance-none bg-transparent border-none focus:ring-0 w-full text-on-surface font-medium pr-8"
              >
                <option>Progressive</option>
                <option>Bifocal</option>
                <option>Single Vision</option>
                <option>Photosun</option>
                <option>Bluecut</option>
                <option>Photosun Bluecut</option>
                <option>Others</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative group">
              <label className="absolute -top-2.5 left-4 px-1 bg-surface-container-low text-primary font-label text-[10px] font-bold z-10 uppercase tracking-wider">
                Price
              </label>
              <div className="flex items-center bg-surface-container-highest rounded-xl p-4 transition-all">
                <span className="text-outline mr-2 w-4 h-4 flex items-center justify-center font-bold text-lg">৳</span>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="bg-transparent border-none focus:ring-0 w-full text-on-surface font-headline font-medium"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="relative group">
              <label className="absolute -top-2.5 left-4 px-1 bg-surface-container-low text-primary font-label text-[10px] font-bold z-10 uppercase tracking-wider">
                Color (Optional)
              </label>
              <div className="flex items-center bg-surface-container-highest rounded-xl p-4 transition-all">
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="bg-transparent border-none focus:ring-0 w-full text-on-surface font-medium text-sm"
                  placeholder="e.g. Black, Brown"
                />
              </div>
            </div>
          </div>

          <div className="relative group">
            <label className="absolute -top-2.5 left-4 px-1 bg-surface-container-low text-primary font-label text-[10px] font-bold z-10 uppercase tracking-wider">
              Note / Instructions
            </label>
            <div className="flex items-center bg-surface-container-highest rounded-xl p-4 transition-all">
              <input
                type="text"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="bg-transparent border-none focus:ring-0 w-full text-on-surface placeholder:text-outline-variant font-medium"
                placeholder="e.g. Fragile, Handle with care"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <input
              type="checkbox"
              id="sendToSteadfast"
              checked={sendToSteadfast}
              onChange={(e) => setSendToSteadfast(e.target.checked)}
              className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20"
            />
            <label htmlFor="sendToSteadfast" className="text-sm font-medium text-on-surface cursor-pointer">
              Automatically send to Steadfast Courier
            </label>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-br from-[#005dac] to-[#1976d2] w-full py-5 rounded-full text-on-primary font-headline font-bold text-lg shadow-[0_20px_40px_rgba(0,93,172,0.15)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
          >
            <span>{loading ? 'Saving...' : 'Save Order'}</span>
            <Send className="group-hover:translate-x-1 transition-transform w-5 h-5" />
          </button>
          <p className="text-center text-outline text-xs mt-6 font-medium">
            By saving, this order will be queued for laboratory processing.
          </p>
        </div>
      </form>
    </div>
  );
};

export default AddOrder;
