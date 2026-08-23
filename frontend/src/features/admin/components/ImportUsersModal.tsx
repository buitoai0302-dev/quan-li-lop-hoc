import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, FileText, Download } from 'lucide-react';
import { Button } from '@/components/common/UI';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { getAdminTenants, importAdminUsers } from '../api/admin.api';
import type { Tenant } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { handleApiError } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';
import type { ApiErrorData } from '@/utils/errorHelper';

interface ImportUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportUsersModal: React.FC<ImportUsersModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAdminTenants()
        .then((res) => {
          setTenants(res);
          if (res.length > 0) setSelectedTenant(res[0].id);
        })
        .catch((err) => handleApiError(err as AxiosError<ApiErrorData>, t));
    }
  }, [isOpen, t]);

  const importMutation = useMutation({
    mutationFn: (data: any[]) => importAdminUsers(selectedTenant, data),
    onSuccess: (res) => {
      toast.success(
        res.message || t('admin.users.messages.import_success', 'Nhập dữ liệu thành công')
      );
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      handleClose();
    },
    onError: (error) => handleApiError(error as AxiosError<ApiErrorData>, t),
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
      const isCsv = selectedFile.name.endsWith('.csv');

      if (!isExcel && !isCsv) {
        toast.error(
          t('import.errors.invalid_file_type', 'Vui lòng chọn file Excel hoặc CSV hợp lệ')
        );
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Email: 'nguyenvana@example.com',
        'Họ Tên': 'Nguyễn Văn A',
        'Role (admin/staff/teacher/student)': 'staff',
        'Password (Tuỳ chọn)': '',
      },
      {
        Email: 'tranvanb@example.com',
        'Họ Tên': 'Trần Văn B',
        'Role (admin/staff/teacher/student)': 'admin',
        'Password (Tuỳ chọn)': 'matkhau123',
      },
      {
        Email: 'giaovien@example.com',
        'Họ Tên': 'Giáo viên C',
        'Role (admin/staff/teacher/student)': 'teacher',
        'Password (Tuỳ chọn)': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'Template_Import_Users.xlsx');
  };

  const handleSubmit = async () => {
    if (!file || !selectedTenant) {
      toast.error(t('import.errors.missing_file_or_tenant', 'Vui lòng chọn file và trung tâm'));
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

        if (jsonData.length === 0) {
          toast.error(t('import.errors.empty_file', 'File không có dữ liệu'));
          setIsProcessing(false);
          return;
        }

        const getValue = (row: Record<string, unknown>, possibleKeys: string[]) => {
          const rowKeys = Object.keys(row);
          for (const key of possibleKeys) {
            const matchedKey = rowKeys.find((rk) => rk.trim().toLowerCase() === key.toLowerCase());
            if (matchedKey && row[matchedKey]) return String(row[matchedKey]).trim();
          }
          return '';
        };

        const mappedData = jsonData.map((row) => {
          let role = getValue(row, [
            'Role (admin/staff/teacher/student)',
            'Role (admin/staff)',
            'Role',
            'Vai trò',
            'Quyền',
          ]).toLowerCase();

          if (!['admin', 'staff', 'teacher', 'student'].includes(role)) {
            role = 'staff'; // default to staff if invalid
          }

          return {
            email: getValue(row, ['Email', 'Thư điện tử']),
            full_name: getValue(row, ['Họ Tên', 'Họ và tên', 'Name', 'Full Name']),
            role: role,
            password: getValue(row, ['Password (Tuỳ chọn)', 'Password', 'Mật khẩu']),
          };
        });

        // Filter out empty rows
        const validData = mappedData.filter((d) => d.email && d.full_name);

        if (validData.length === 0) {
          toast.error(
            t(
              'import.errors.no_valid_data',
              'Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra lại cột Email và Họ Tên.'
            )
          );
          setIsProcessing(false);
          return;
        }

        importMutation.mutate(validData);
      } catch (error) {
        toast.error(t('import.errors.read_file_error', 'Lỗi khi đọc file. Vui lòng thử lại.'));
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      toast.error(t('import.errors.read_file_error', 'Lỗi khi đọc file. Vui lòng thử lại.'));
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleClose = () => {
    setFile(null);
    setSelectedTenant('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-xl relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="h-6 w-6 text-blue-500" />
            {t('admin.users.modal.import_users', 'Nhập dữ liệu người dùng')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t(
              'admin.users.modal.import_users_desc',
              'Tải lên file Excel (.xlsx) hoặc CSV để thêm nhiều người dùng cùng lúc.'
            )}
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('admin.users.modal.select_tenant', 'Chọn Trung tâm (Tenant)')}{' '}
              <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">
                -- {t('admin.users.modal.select_tenant_placeholder', 'Chọn trung tâm')} --
              </option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {t('import.no_template', 'Chưa có file mẫu?')}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                {t(
                  'import.download_template_desc',
                  'Tải file mẫu về và điền thông tin người dùng.'
                )}
              </p>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              size="sm"
              className="bg-white"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('import.download_template', 'Tải file mẫu')}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('import.data_file', 'File dữ liệu')} <span className="text-red-500">*</span>
            </label>
            <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <FileText className="h-8 w-8 text-gray-400" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {file ? (
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {file.name}
                    </span>
                  ) : (
                    <span>
                      {t('import.drag_and_drop', 'Kéo thả hoặc')}{' '}
                      <span className="text-blue-500">
                        {t('import.click_to_select', 'nhấn để chọn file')}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <Button onClick={handleClose} variant="ghost">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!file || !selectedTenant || isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing
                ? t('common.processing', 'Đang xử lý...')
                : t('common.import', 'Nhập dữ liệu')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportUsersModal;
