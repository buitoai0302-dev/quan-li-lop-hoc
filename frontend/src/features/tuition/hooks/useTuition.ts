import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tuitionApi,
  BulkGenerateDto,
  CreateTuitionDto,
  RecordPaymentDto,
} from '../api/tuition.api';
import toast from 'react-hot-toast';

const KEYS = {
  list: (params?: Record<string, string>) => ['tuitions', params],
  overdue: () => ['tuitions', 'overdue'],
  payments: (id: string) => ['tuitions', id, 'payments'],
};

export const useTuitions = (params?: Record<string, string>) =>
  useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => tuitionApi.list(params),
  });

export const useOverdueTuitions = () =>
  useQuery({
    queryKey: KEYS.overdue(),
    queryFn: tuitionApi.overdue,
  });

export const useCreateTuition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTuitionDto) => tuitionApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tuitions'] });
    },
  });
};

export const useBulkGenerateTuitions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: BulkGenerateDto) => tuitionApi.bulkGenerate(dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tuitions'] });
      toast.success(
        `Đã tạo ${data.created} khoản học phí${data.skipped ? `, bỏ qua ${data.skipped} đã tồn tại` : ''}`
      );
    },
  });
};

export const useUpdateTuition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateTuitionDto> }) =>
      tuitionApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tuitions'] });
    },
  });
};

export const useDeleteTuition = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tuitionApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tuitions'] });
      toast.success('Đã xóa khoản học phí');
    },
  });
};

export const useTuitionPayments = (tuitionId: string, enabled = true) =>
  useQuery({
    queryKey: KEYS.payments(tuitionId),
    queryFn: () => tuitionApi.getPayments(tuitionId),
    enabled,
  });

export const useRecordPayment = (tuitionId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: RecordPaymentDto) => tuitionApi.recordPayment(tuitionId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tuitions'] });
      qc.invalidateQueries({ queryKey: KEYS.payments(tuitionId) });
      toast.success('Đã ghi nhận thanh toán thành công!');
    },
  });
};
