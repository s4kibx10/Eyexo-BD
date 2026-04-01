export type UserRole = 'admin' | 'staff';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  totalOrders?: number;
  lastLogin?: any;
}

export type OrderStatus = 'pending' | 'in transit' | 'delivered' | 'cancelled';

export interface Order {
  id?: string;
  customerName: string;
  phoneNumber: string;
  address: string;
  productName: string;
  color?: string;
  price: number;
  orderDate: string;
  trackingId?: string;
  status: OrderStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: any;
  read: boolean;
}
