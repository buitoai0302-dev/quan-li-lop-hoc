import api from '@/api';

export interface Tuition {
  id: string;
  tenant_id: string;
  student_id: string;
  student_name: string;
  student_phone?: string;
  parent_phone?: string;
  class_id?: string;
  class_name?: string;
  billing_cycle: 'monthly' | 'per_session' | 'per_course';
  billing_period?: string;
  amount: number;
  discount: number;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue' | 'waived';
  notes?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  tuition_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'momo' | 'vnpay' | 'stripe' | 'other';
  reference_code?: string;
  received_by_name?: string;
  notes?: string;
  created_at: string;
}

export interface TuitionSummary {
  total_count: string;
  total_amount_due: string;
  total_paid: string;
  total_outstanding: string;
}

export interface TuitionListResponse {
  data: Tuition[];
  summary: TuitionSummary;
}

export interface CreateTuitionDto {
  student_id: string;
  class_id?: string;
  amount: number;
  discount?: number;
  due_date: string;
  billing_cycle?: string;
  billing_period?: string;
  notes?: string;
}

export interface BulkGenerateDto {
  class_id: string;
  amount: number;
  discount?: number;
  due_date: string;
  billing_period: string;
  billing_cycle?: string;
  notes?: string;
  skip_existing?: boolean;
}

export interface RecordPaymentDto {
  amount_paid: number;
  payment_date?: string;
  payment_method?: string;
  reference_code?: string;
  notes?: string;
}

const BASE = '/tuitions';

export const tuitionApi = {
  list: (params?: Record<string, string>) =>
    api.get<TuitionListResponse>(BASE, { params }).then((r) => r.data),

  overdue: () => api.get<Tuition[]>(`${BASE}/overdue`).then((r) => r.data),

  create: (dto: CreateTuitionDto) => api.post<Tuition>(BASE, dto).then((r) => r.data),

  bulkGenerate: (dto: BulkGenerateDto) =>
    api
      .post<{ created: number; skipped: number; tuitions: Tuition[] }>(`${BASE}/bulk-generate`, dto)
      .then((r) => r.data),

  update: (id: string, dto: Partial<CreateTuitionDto>) =>
    api.patch<Tuition>(`${BASE}/${id}`, dto).then((r) => r.data),

  delete: (id: string) => api.delete(`${BASE}/${id}`).then((r) => r.data),

  getPayments: (tuitionId: string) =>
    api.get<Payment[]>(`${BASE}/${tuitionId}/payments`).then((r) => r.data),

  recordPayment: (tuitionId: string, dto: RecordPaymentDto) =>
    api
      .post<{ payment: Payment; tuition: Tuition }>(`${BASE}/${tuitionId}/payments`, dto)
      .then((r) => r.data),
};
