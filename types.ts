
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
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  category: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  totalEstimatedCost?: number;
}

export interface AppNotification {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}
