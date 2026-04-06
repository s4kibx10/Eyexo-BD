import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus } from '../types';
import { User, Phone, MapPin, Layers, Calendar, Truck, Send, Microscope, Eye, Upload, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { GoogleGenAI, Type } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AddOrder: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
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
    eyePower: {
      re: { sph: '', cyl: '', axis: '', add: '' },
      le: { sph: '', cyl: '', axis: '', add: '' }
    }
  });

  const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Data,
                },
              },
              {
                text: `You are an expert Optometrist Assistant. Your task is to extract eye prescription details from the provided image with 100% accuracy.
                
                Look for:
                - Right Eye (often labeled as RE, OD, or Oculus Dexter)
                - Left Eye (often labeled as LE, OS, or Oculus Sinister)
                - SPH (Sphere): Look for values like +2.50, -1.25, etc.
                - CYL (Cylinder): Look for values like -0.50, +1.00, etc.
                - AXIS: Look for values between 0 and 180.
                - ADD (Addition): Look for values like +2.00, +2.50.
                
                Rules:
                1. Extract the values EXACTLY as they appear in the image.
                2. Include the plus (+) or minus (-) signs if they are present.
                3. If a value is missing or not applicable (like a blank space or a dash), return an empty string "".
                4. Do not guess or hallucinate values. If you are unsure, leave it empty.
                
                Return the result as a JSON object.`,
              },
            ],
          },
          config: {
            systemInstruction: "You are a highly precise medical data extraction tool. Accuracy is your top priority. Extract eye prescription data exactly as written.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                re: {
                  type: Type.OBJECT,
                  properties: {
                    sph: { type: Type.STRING },
                    cyl: { type: Type.STRING },
                    axis: { type: Type.STRING },
                    add: { type: Type.STRING },
                  },
                },
                le: {
                  type: Type.OBJECT,
                  properties: {
                    sph: { type: Type.STRING },
                    cyl: { type: Type.STRING },
                    axis: { type: Type.STRING },
                    add: { type: Type.STRING },
                  },
                },
              },
            },
          },
        });

        const result = JSON.parse(response.text);
        setFormData(prev => ({
          ...prev,
          eyePower: {
            re: {
              sph: result.re?.sph || '',
              cyl: result.re?.cyl || '',
              axis: result.re?.axis || '',
              add: result.re?.add || ''
            },
            le: {
              sph: result.le?.sph || '',
              cyl: result.le?.cyl || '',
              axis: result.le?.axis || '',
              add: result.le?.add || ''
            }
          }
        }));
        toast.success('Prescription scanned successfully!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('AI Scan Error:', error);
      toast.error('Failed to scan prescription. Please enter manually.');
    } finally {
      setAiLoading(false);
    }
  };

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

        const codAmount = Math.round(parseFloat(formData.price));
        if (isNaN(codAmount) || codAmount <= 0) {
          toast.error('Steadfast requires a valid Price (COD amount) as a whole number greater than 0');
          setLoading(false);
          return;
        }

        if (formData.address.trim().length < 10) {
          toast.error('Steadfast requires a more detailed address (at least 10 characters)');
          setLoading(false);
          return;
        }

        try {
          const response = await fetch('/api/steadfast/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              invoice: `OPT-${Date.now()}`,
              recipient_name: formData.customerName.trim(),
              recipient_phone: cleanPhone,
              recipient_address: formData.address.trim(),
              cod_amount: codAmount,
              note: (formData.note || 'Optical Order').substring(0, 255)
            })
          });

          const result = await response.json();
          if (response.ok && result.status === 200) {
            finalTrackingId = result.order.tracking_code;
            toast.success(`Steadfast Parcel Created: ${finalTrackingId}`);
          } else {
            console.error("Steadfast API Error:", result);
            const errorMsg = result.message || result.error || 'Check your Steadfast API Key/Secret in Settings';
            toast.error(`Steadfast Error: ${errorMsg}`);
            // We stop here if Steadfast is mandatory, or continue if it's optional.
            // Given the user's request, let's stop if Steadfast fails to avoid inconsistent states.
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error("Steadfast Fetch Error:", err);
          toast.error('Failed to connect to Steadfast API');
          setLoading(false);
          return;
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

          {/* Eye Power Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Eye className="w-4 h-4" /> Eye Power
              </h4>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAiScan}
                  className="hidden"
                  id="prescription-upload"
                  disabled={aiLoading}
                />
                <label
                  htmlFor="prescription-upload"
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                    aiLoading 
                      ? "bg-surface-container-highest text-outline cursor-not-allowed" 
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  {aiLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {aiLoading ? 'Scanning...' : 'Scan Prescription'}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Right Eye */}
              <div className="p-4 bg-surface-container-highest rounded-xl space-y-4">
                <div className="text-[10px] font-bold text-outline uppercase tracking-widest border-b border-outline/10 pb-2">Right Eye (RE)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-primary uppercase">SPH</label>
                    <input
                      type="text"
                      value={formData.eyePower.re.sph}
                      onChange={(e) => setFormData({
                        ...formData,
                        eyePower: { ...formData.eyePower, re: { ...formData.eyePower.re, sph: e.target.value } }
                      })}
                      className="w-full bg-surface-container-lowest border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-primary/30"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-primary uppercase">CYL</label>
                    <input
                      type="text"
                      value={formData.eyePower.re.cyl}
                      onChange={(e) => setFormData({
                        ...formData,
                        eyePower: { ...formData.eyePower, re: { ...formData.eyePower.re, cyl: e.target.value } }
                      })}
                      className="w-full bg-surface-container-lowest border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-primary/30"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-primary uppercase">AXIS</label>
                    <input
                      type="text"
                      value={formData.eyePower.re.axis}
                      onChange={(e) => setFormData({
                        ...formData,
                        eyePower: { ...formData.eyePower, re: { ...formData.eyePower.re, axis: e.target.value } }
                      })}
                      className="w-full bg-surface-container-lowest border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-primary/30"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-primary uppercase">ADD</label>
                    <input
                      type="text"
                      value={formData.eyePower.re.add}
                      onChange={(e) => setFormData({
                        ...formData,
                        eyePower: { ...formData.eyePower, re: { ...formData.eyePower.re, add: e.target.value } }
                      })}
                      className="w-full bg-surface-container-lowest border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-primary/30"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Left Eye */}
              <div className="p-4 bg-surface-container-highest rounded-xl space-y-4">
                <div className="text-[10px] font-bold text-outline uppercase tracking-widest border-b border-outline/10 pb-2">Left Eye (LE)</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-primary uppercase">SPH</label>
                    <input
                      type="text"
                      value={formData.eyePower.le.sph}
                      onChange={(e) => setFormData({
                        ...formData,
                        eyePower: { ...formData.eyePower, le: { ...formData.eyePower.le, sph: e.target.value } }
                      })}
                      className="w-full bg-surface-container-lowest border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-primary/30"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-primary uppercase">CYL</label>
                    <input
                      type="text"
                      value={formData.eyePower.le.cyl}
                      onChange={(e) => setFormData({
                        ...formData,
                        eyePower: { ...formData.eyePower, le: { ...formData.eyePower.le, cyl: e.target.value } }
                      })}
                      className="w-full bg-surface-container-lowest border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-primary/30"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-primary uppercase">AXIS</label>
                    <input
                      type="text"
                      value={formData.eyePower.le.axis}
                      onChange={(e) => setFormData({
                        ...formData,
                        eyePower: { ...formData.eyePower, le: { ...formData.eyePower.le, axis: e.target.value } }
                      })}
                      className="w-full bg-surface-container-lowest border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-primary/30"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-primary uppercase">ADD</label>
                    <input
                      type="text"
                      value={formData.eyePower.le.add}
                      onChange={(e) => setFormData({
                        ...formData,
                        eyePower: { ...formData.eyePower, le: { ...formData.eyePower.le, add: e.target.value } }
                      })}
                      className="w-full bg-surface-container-lowest border-none rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-primary/30"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
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
