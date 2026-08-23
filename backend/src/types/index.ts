export interface PaginationFilters {
  limit?: number | string;
  offset?: number | string;
}

export interface BaseFilters extends PaginationFilters {
  search?: string;
  status?: string;
  branch_id?: string;
}

export interface TuitionFilters extends PaginationFilters {
  status?: string;
  class_id?: string;
  billing_period?: string;
  student_id?: string;
}

export interface CreateStudentDto {
  full_name: string;
  phone?: string;
  parent_phone?: string;
  date_of_birth?: string;
  address?: string;
  notes?: string;
  email?: string;
  branch_id?: string;
  class_name?: string;
}

export interface UpdateStudentDto extends Partial<CreateStudentDto> {
  status?: string;
  is_active?: boolean;
}

export interface CreateClassDto {
  name: string;
  course_id?: string;
  subject_id?: string;
  teacher_id?: string;
  branch_id: string;
  start_date?: string;
  end_date?: string;
  schedule?: any;
  max_capacity?: number;
  recurring_schedules?: any[];
  enrollments?: any[];
}

export interface UpdateClassDto extends Partial<CreateClassDto> {
  status?: string;
}

export interface CreateTuitionDto {
  student_id: string;
  class_id?: string;
  amount: number | string;
  discount?: number | string;
  due_date: string;
  billing_cycle?: string;
  billing_period?: string;
  notes?: string;
}

export interface BulkGenerateTuitionDto {
  class_id: string;
  amount: number | string;
  discount?: number | string;
  due_date: string;
  billing_period: string;
  billing_cycle?: string;
  notes?: string;
  skip_existing?: boolean;
}

export interface UpdateTuitionDto {
  amount?: number | string;
  discount?: number | string;
  due_date?: string;
  status?: string;
  notes?: string;
}

export interface RecordPaymentDto {
  amount_paid: number | string;
  payment_date?: string;
  payment_method?: string;
  reference_code?: string;
  notes?: string;
}

export interface UpdateTenantDto {
  name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  settings?: any;
}
