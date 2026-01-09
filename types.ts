
export enum OrderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED'
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  expiryDate?: string;
  lastUpdated: string;
  pricePerUnit: number;
}

export interface UsageHistory {
  id: string;
  itemId: string;
  itemName: string;
  date: string;
  quantityConsumed: number;
  unit: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  category: string;
  reliability: number; // 0-100
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface AppNotification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}
