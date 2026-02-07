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
  fileUrl?: string; // invoice file (fatura)
  receiptUrl?: string; // receipt file (comprovante)
  registrationDate: string;
  isArchived: boolean;
  status: 'paid' | 'pending' | 'overdue';
}

interface AppState {
  user: User | null;
  suppliers: Supplier[];
  payments: Payment[];
  selectedYear: number;
  login: (user: User) => void;
  logout: () => void;
  setYear: (year: number) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'ownerId'>) => void;
  updateSupplier: (id: string, supplier: Partial<Omit<Supplier, 'id' | 'ownerId'>>) => void;
  deleteSupplier: (id: string) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'registrationDate' | 'isArchived'>) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  archiveYear: (year: number) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  selectedYear: 2026,
  suppliers: [
    { id: '1', name: 'Vivo', serviceName: 'Internet Fibra', isRecurring: true, dueDay: 10, ownerId: 'u1' },
    { id: '2', name: 'Sabesp', serviceName: 'Água e Esgoto', isRecurring: true, dueDay: 15, ownerId: 'u1' },
    { id: '3', name: 'Enel', serviceName: 'Energia Elétrica', isRecurring: true, dueDay: 20, ownerId: 'u1' },
    { id: '4', name: 'TechSolutions', serviceName: 'Manutenção PC', isRecurring: false, ownerId: 'u1' },
  ],
  payments: [
    { id: 'p1', supplierId: '1', amount: 129.90, monthYear: 'jan26', status: 'paid', registrationDate: '2026-01-10T10:00:00Z', isArchived: false, pixKey: 'vivo@pix.com.br', dueDay: 10, fileUrl: 'mock-fatura.pdf', receiptUrl: 'mock-comprovante.jpg' },
    { id: 'p2', supplierId: '2', amount: 85.50, monthYear: 'jan26', status: 'paid', registrationDate: '2026-01-15T14:30:00Z', isArchived: false, pixKey: 'contas@sabesp.sp.gov.br', dueDay: 15, fileUrl: 'mock-fatura.pdf', receiptUrl: 'mock-comprovante.jpg' },
    { id: 'p3', supplierId: '1', amount: 129.90, monthYear: 'fev26', status: 'paid', registrationDate: '2026-02-10T10:00:00Z', isArchived: false, pixKey: 'vivo@pix.com.br', dueDay: 10, fileUrl: 'mock-fatura.pdf', receiptUrl: 'mock-comprovante.jpg' },
  ],
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
  setYear: (year) => set({ selectedYear: year }),
  addSupplier: (newSupplier) => set((state) => ({
    suppliers: [...state.suppliers, { 
      ...newSupplier, 
      id: Math.random().toString(36).substr(2, 9),
      ownerId: state.user?.id || 'guest'
    }]
  })),
  updateSupplier: (id, updatedFields) => set((state) => ({
    suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...updatedFields } : s)
  })),
  deleteSupplier: (id) => set((state) => ({
    suppliers: state.suppliers.filter(s => s.id !== id)
  })),
  addPayment: (newPayment) => set((state) => ({
    payments: [...state.payments, {
      ...newPayment,
      id: Math.random().toString(36).substr(2, 9),
      registrationDate: new Date().toISOString(),
      isArchived: false,
    }]
  })),
  updatePayment: (id, updatedFields) => set((state) => ({
    payments: state.payments.map(p => p.id === id ? { ...p, ...updatedFields } : p)
  })),
  deletePayment: (id) => set((state) => ({
    payments: state.payments.filter(p => p.id !== id)
  })),
  archiveYear: (year) => set((state) => ({
    payments: state.payments.map(p => 
      p.monthYear.endsWith(year.toString().slice(-2)) 
        ? { ...p, isArchived: true, fileUrl: undefined, receiptUrl: undefined } 
        : p
    )
  })),
}));
