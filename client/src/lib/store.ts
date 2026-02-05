import { create } from 'zustand';

// Types mimicking the database structure
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Supplier {
  id: string;
  name: string;
  serviceName: string;
  isRecurring: boolean;
  dueDay?: number;
  ownerId: string;
}

export interface Payment {
  id: string;
  supplierId: string;
  amount: number;
  monthYear: string; // "jan26"
  pixKey?: string;
  dueDay?: number;
  fileUrl?: string; // invoice/receipt
  registrationDate: string;
  isArchived: boolean;
  status: 'paid' | 'pending' | 'overdue';
}

interface AppState {
  user: User | null;
  suppliers: Supplier[];
  payments: Payment[];
  login: (user: User) => void;
  logout: () => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'ownerId'>) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'registrationDate' | 'isArchived'>) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null, // Start logged out
  suppliers: [
    { id: '1', name: 'Vivo', serviceName: 'Internet Fibra', isRecurring: true, dueDay: 10, ownerId: 'u1' },
    { id: '2', name: 'Sabesp', serviceName: 'Água e Esgoto', isRecurring: true, dueDay: 15, ownerId: 'u1' },
    { id: '3', name: 'Enel', serviceName: 'Energia Elétrica', isRecurring: true, dueDay: 20, ownerId: 'u1' },
    { id: '4', name: 'TechSolutions', serviceName: 'Manutenção PC', isRecurring: false, ownerId: 'u1' },
  ],
  payments: [
    { id: 'p1', supplierId: '1', amount: 129.90, monthYear: 'jan26', status: 'paid', registrationDate: '2026-01-10T10:00:00Z', isArchived: false, pixKey: 'vivo@pix.com.br' },
    { id: 'p2', supplierId: '2', amount: 85.50, monthYear: 'jan26', status: 'paid', registrationDate: '2026-01-15T14:30:00Z', isArchived: false, pixKey: 'contas@sabesp.sp.gov.br' },
    { id: 'p3', supplierId: '3', amount: 210.00, monthYear: 'jan26', status: 'overdue', registrationDate: '2026-01-20T09:00:00Z', isArchived: false },
  ],
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
  addSupplier: (newSupplier) => set((state) => ({
    suppliers: [...state.suppliers, { 
      ...newSupplier, 
      id: Math.random().toString(36).substr(2, 9),
      ownerId: state.user?.id || 'guest'
    }]
  })),
  addPayment: (newPayment) => set((state) => ({
    payments: [...state.payments, {
      ...newPayment,
      id: Math.random().toString(36).substr(2, 9),
      registrationDate: new Date().toISOString(),
      isArchived: false,
    }]
  })),
}));
