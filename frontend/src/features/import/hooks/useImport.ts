import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bulkImportStudents, bulkImportOther } from '../api/import.api';
import { useBranches } from '@/features/branches/hooks/useBranches';
import toast from 'react-hot-toast';
import { readImportFile, validateImportFile, importFileErrorKey } from '@/utils/import-file';
import { IMPORT_FILE_ERROR_PARAMS } from '@/utils/import-file-policy';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '@/utils/errorHelper';
import type { ApiErrorData } from '@/utils/errorHelper';
import type { AxiosError } from 'axios';

const IMPORT_TYPES = ['students', 'teachers', 'rooms', 'classes'] as const;
export type ImportType = (typeof IMPORT_TYPES)[number];
const isImportType = (value: string | null): value is ImportType =>
  IMPORT_TYPES.some((type) => type === value);

export const useImport = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [importType, setImportType] = useState<ImportType>(() => {
    const type = searchParams.get('type');
    return isImportType(type) ? type : 'students';
  });
  const { branches, query: branchesQuery } = useBranches();
  const processingRequestId = useRef(0);
  const parseController = useRef<AbortController | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setSelectedBranch((current) =>
      branches.some((branch) => branch.id === current) ? current : branches[0]?.id || ''
    );
  }, [branches]);

  useEffect(() => {
    const typeFromUrl = searchParams.get('type');
    if (isImportType(typeFromUrl)) setImportType(typeFromUrl);
  }, [searchParams]);

  useEffect(
    () => () => {
      processingRequestId.current += 1;
      parseController.current?.abort();
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processingRequestId.current += 1;
    parseController.current?.abort();
    setIsProcessing(false);
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    try {
      validateImportFile(selected);
    } catch (error) {
      toast.error(t(importFileErrorKey(error), IMPORT_FILE_ERROR_PARAMS));
      e.target.value = '';
      return;
    }
    setFile(selected);
    setParsedData([]);
    setHeaders([]);
  };

  const processFile = async () => {
    if (!file || isProcessing || isUploading) return;
    const requestId = ++processingRequestId.current;
    parseController.current?.abort();
    const controller = new AbortController();
    parseController.current = controller;
    setIsProcessing(true);
    try {
      const { data, headers: fields } = await readImportFile(file, controller.signal);
      if (requestId !== processingRequestId.current) return;
      setParsedData(data);
      setHeaders(fields);
      if (!data.length) toast.error(t('import.errors.noData'));
    } catch (error) {
      if (requestId !== processingRequestId.current || controller.signal.aborted) return;
      setParsedData([]);
      setHeaders([]);
      toast.error(t(importFileErrorKey(error), IMPORT_FILE_ERROR_PARAMS));
    } finally {
      if (requestId === processingRequestId.current) setIsProcessing(false);
    }
  };

  const handleClearFile = () => {
    processingRequestId.current += 1;
    parseController.current?.abort();
    setIsProcessing(false);
    setFile(null);
    setParsedData([]);
    setHeaders([]);
  };

  const handleImport = async () => {
    if (isUploading || isProcessing || !selectedBranch || parsedData.length === 0) return false;
    setIsUploading(true);

    const getValue = (row: Record<string, unknown>, possibleKeys: string[]) => {
      const rowKeys = Object.keys(row);
      for (const key of possibleKeys) {
        const matchedKey = rowKeys.find((rk) => rk.trim().toLowerCase() === key.toLowerCase());
        if (matchedKey && row[matchedKey] != null && row[matchedKey] !== '') return row[matchedKey];
      }
      return '';
    };

    const mappedData = parsedData.map((row) => {
      const common = { branch_id: selectedBranch };
      if (importType === 'students') {
        return {
          ...common,
          full_name: getValue(row, ['Tên', 'Họ Tên', 'Name', 'Full Name', 'full_name']),
          email: getValue(row, ['Email', 'email']),
          phone: getValue(row, ['SĐT', 'Phone', 'phone', 'Số điện thoại']),
          date_of_birth: getValue(row, ['Ngày sinh', 'DOB', 'date_of_birth']),
          class_name: getValue(row, ['Tên Lớp', 'Lớp', 'Class Name', 'class_name', 'Class']),
        };
      } else if (importType === 'teachers') {
        return {
          ...common,
          full_name: getValue(row, ['Tên', 'Họ Tên', 'Name', 'Full Name', 'full_name']),
          email: getValue(row, ['Email', 'email']),
          phone: getValue(row, ['SĐT', 'Phone', 'phone', 'Số điện thoại']),
          specialization: getValue(row, ['Chuyên môn', 'Specialization', 'specialization']),
        };
      } else if (importType === 'rooms') {
        return {
          ...common,
          name: getValue(row, ['Tên Phòng', 'Tên', 'Name', 'Room Name', 'name']),
          capacity: getValue(row, ['Sức chứa', 'Capacity', 'capacity']),
          room_type: getValue(row, ['Loại phòng', 'Type', 'room_type', 'Room Type']),
        };
      } else {
        return {
          ...common,
          name: getValue(row, ['Tên Lớp', 'Tên', 'Name', 'Class Name', 'name']),
          max_capacity: getValue(row, ['Sĩ số tối đa', 'Max Capacity', 'max_capacity', 'Sĩ số']),
          start_date: getValue(row, [
            'Ngày bắt đầu',
            'Start Date',
            'start_date',
            'Ngày khai giảng',
          ]),
          end_date: getValue(row, ['Ngày kết thúc', 'End Date', 'end_date', 'Ngày bế giảng']),
          teacher_email: getValue(row, [
            'Email Giáo Viên',
            'Teacher Email',
            'teacher_email',
            'GV Email',
          ]),
        };
      }
    });

    try {
      if (importType === 'students') {
        const data = await bulkImportStudents(mappedData, selectedBranch);
        toast.success(
          t('success.IMPORT_SUCCESS', {
            students: data.students_count,
            classes: data.classes_count,
          })
        );
      } else {
        const data = await bulkImportOther(importType, mappedData);
        toast.success(t('import.result', { imported: data.successCount, skipped: data.skipCount }));
      }
      handleClearFile();
      return true;
    } catch (err) {
      handleApiError(err as AxiosError<ApiErrorData>, t);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    importType,
    setImportType,
    branches,
    branchesQuery,
    selectedBranch,
    setSelectedBranch,
    file,
    handleFileSelect,
    processFile,
    handleClearFile,
    parsedData,
    headers,
    isProcessing,
    isUploading,
    handleImport,
  };
};
