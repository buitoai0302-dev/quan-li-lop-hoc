import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bulkImportStudents, bulkImportOther } from '../api/import.api';
import { getBranches } from '@/features/branches';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '@/utils/errorHelper';
import type { Branch } from '@/types';

export type ImportType = 'students' | 'teachers' | 'rooms' | 'classes';

export const useImport = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [importType, setImportType] = useState<ImportType>(
    (searchParams.get('type') as ImportType) || 'students'
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await getBranches();
        setBranches(data);
        if (data.length > 0) setSelectedBranch(data[0].id);
      } catch (err: any) {
        handleApiError(err, t);
      }
    };
    fetchBranches();
  }, [t]);

  useEffect(() => {
    const typeFromUrl = searchParams.get('type') as ImportType;
    if (typeFromUrl && ['students', 'teachers', 'rooms', 'classes'].includes(typeFromUrl)) {
      setImportType(typeFromUrl);
    }
  }, [searchParams]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setParsedData([]);
    setHeaders([]);
  };

  const processFile = () => {
    if (!file) return;
    setIsProcessing(true);
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'csv' || fileExt === 'tsv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) setHeaders(results.meta.fields);
          setParsedData(results.data as any);
          setIsProcessing(false);
        },
        error: (error) => {
          toast.error(t('import.errors.readCsv', { message: error.message }));
          setIsProcessing(false);
        },
      });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          if (json.length > 0) {
            setHeaders(Object.keys(json[0] as object));
            setParsedData(json as any);
          }
          setIsProcessing(false);
        } catch (err) {
          toast.error(t('import.errors.readExcel'));
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
  };

  const handleImport = async () => {
    if (!selectedBranch || parsedData.length === 0) return;
    setIsUploading(true);

    const getValue = (row: any, possibleKeys: string[]) => {
      const rowKeys = Object.keys(row);
      for (const key of possibleKeys) {
        const matchedKey = rowKeys.find((rk) => rk.trim().toLowerCase() === key.toLowerCase());
        if (matchedKey && row[matchedKey]) return row[matchedKey];
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

    const validData = mappedData.filter(
      (d: any) =>
        (importType === 'rooms' ? d.name : d.full_name || d.name) &&
        (importType === 'classes' ? d.teacher_email : true)
    );

    try {
      if (importType === 'students') {
        const data = await bulkImportStudents(validData, selectedBranch);
        toast.success(`Success: ${data.students_count} students, ${data.classes_count} classes.`);
      } else {
        const data = await bulkImportOther(importType, validData);
        toast.success(data.message || t('common.success'));
      }
      handleClearFile();
      return true;
    } catch (err: any) {
      handleApiError(err, t);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    importType,
    setImportType,
    branches,
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
