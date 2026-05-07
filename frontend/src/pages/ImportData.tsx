import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '../utils/errorHelper';
import NoResults from '../components/NoResults';
import ConfirmModal from '../components/ConfirmModal';

interface Branch {
  id: string;
  name: string;
}

type ImportType = 'students' | 'teachers' | 'rooms' | 'classes';

const ImportData: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [importType, setImportType] = useState<ImportType>((searchParams.get('type') as ImportType) || 'students');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches');
        setBranches(res.data);
        if (res.data.length > 0) {
          setSelectedBranch(res.data[0].id);
        }
      } catch (err) {
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
          if (results.meta.fields) {
            setHeaders(results.meta.fields);
          }
          setParsedData(results.data);
          setIsProcessing(false);
        },
        error: (error) => {
          toast.error(t('import.errors.readCsv', { message: error.message }));
          setIsProcessing(false);
        }
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
            setParsedData(json);
          } else {
            setParsedData([]);
          }
          setIsProcessing(false);
        } catch (err) {
          toast.error(t('import.errors.readExcel'));
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error(t('import.errors.invalidFormat'));
      setFile(null);
      setIsProcessing(false);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
  };

  const handleImport = async () => {
    if (!selectedBranch) {
      toast.error(t('import.errors.noBranch'));
      return;
    }
    if (parsedData.length === 0) {
      toast.error(t('import.errors.noDataToImport'));
      return;
    }

    setIsUploading(true);

    const getValue = (row: any, possibleKeys: string[]) => {
      const rowKeys = Object.keys(row);
      for (const key of possibleKeys) {
        const matchedKey = rowKeys.find(rk => rk.trim().toLowerCase() === key.toLowerCase());
        if (matchedKey && row[matchedKey]) {
          return row[matchedKey];
        }
      }
      return '';
    };

    const mappedData = parsedData.map(row => {
      if (importType === 'students') {
        return {
          full_name: getValue(row, ['Tên', 'Họ Tên', 'Name', 'Full Name', 'full_name']),
          email: getValue(row, ['Email', 'email']),
          phone: getValue(row, ['SĐT', 'Phone', 'phone', 'Số điện thoại']),
          date_of_birth: getValue(row, ['Ngày sinh', 'DOB', 'date_of_birth']),
          class_name: getValue(row, ['Tên Lớp', 'Lớp', 'Class Name', 'class_name', 'Class']),
          branch_id: selectedBranch
        };
      } else if (importType === 'teachers') {
        return {
          full_name: getValue(row, ['Tên', 'Họ Tên', 'Name', 'Full Name', 'full_name']),
          email: getValue(row, ['Email', 'email']),
          phone: getValue(row, ['SĐT', 'Phone', 'phone', 'Số điện thoại']),
          specialization: getValue(row, ['Chuyên môn', 'Specialization', 'specialization']),
          branch_id: selectedBranch
        };
      } else if (importType === 'rooms') {
        return {
          name: getValue(row, ['Tên Phòng', 'Tên', 'Name', 'Room Name', 'name']),
          capacity: getValue(row, ['Sức chứa', 'Capacity', 'capacity']),
          room_type: getValue(row, ['Loại phòng', 'Type', 'room_type', 'Room Type']),
          branch_id: selectedBranch
        };
      } else {
        return {
          name: getValue(row, ['Tên Lớp', 'Tên', 'Name', 'Class Name', 'name']),
          max_capacity: getValue(row, ['Sĩ số tối đa', 'Max Capacity', 'max_capacity', 'Sĩ số']),
          start_date: getValue(row, ['Ngày bắt đầu', 'Start Date', 'start_date', 'Ngày khai giảng']),
          end_date: getValue(row, ['Ngày kết thúc', 'End Date', 'end_date', 'Ngày bế giảng']),
          teacher_email: getValue(row, ['Email Giáo Viên', 'Teacher Email', 'teacher_email', 'GV Email']),
          branch_id: selectedBranch
        };
      }
    });

    let validData = [];
    if (importType === 'students' || importType === 'teachers') {
      validData = mappedData.filter(d => d.full_name && d.email);
    } else if (importType === 'rooms') {
      validData = mappedData.filter(d => d.name);
    } else {
      validData = mappedData.filter(d => d.name && d.teacher_email);
    }

    if (validData.length === 0) {
      toast.error(t('import.errors.invalidData'));
      setIsUploading(false);
      return;
    }

    try {
      let res;
      if (importType === 'students') {
        // Use the new smart bulk import for students
        res = await api.post('/students/bulk', { students: validData, branch_id: selectedBranch });
        toast.success(`Đã nhập thành công ${res.data.students_count} học sinh và xử lý ${res.data.classes_count} lớp học.`);
      } else {
        res = await api.post(`/import/${importType}`, { data: validData });
        toast.success(res.data.message || t('common.success'));
      }
      handleClearFile();
      setIsConfirmOpen(false);
    } catch (err: any) {
      handleApiError(err, t);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    let templateData: any[] = [];
    if (importType === 'students') {
      templateData = [{ 'Họ Tên': 'Nguyễn Văn A', 'Email': 'student@example.com', 'SĐT': '0901234567', 'Ngày sinh': '2010-05-20', 'Tên Lớp': 'Lớp Toán 10A1' }];
    } else if (importType === 'teachers') {
      templateData = [{ 'Họ Tên': 'Trần Thị B', 'Email': 'teacher@example.com', 'SĐT': '0987654321', 'Chuyên môn': 'Toán học' }];
    } else if (importType === 'rooms') {
      templateData = [{ 'Tên Phòng': 'Phòng 101', 'Sức chứa': '30', 'Loại phòng': 'Lý thuyết' }];
    } else {
      templateData = [{ 'Tên Lớp': 'Toán 10A1', 'Sĩ số tối đa': '30', 'Ngày bắt đầu': '2024-09-01', 'Ngày kết thúc': '2025-05-31', 'Email Giáo Viên': 'teacher@example.com' }];
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Template_Import_${importType}.xlsx`);
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-3 sm:p-5 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-white dark:border-gray-700/50 min-h-full flex flex-col transition-all">
      {/* Compact Header & Configuration Row */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-primary rounded-full"></div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase">{t('import.title')}</h2>
          </div>
          <button
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-all active:scale-95"
          >
            <AlertCircle size={12} className={isGuideOpen ? 'text-primary' : ''} />
            <span className="hidden sm:inline">{isGuideOpen ? t('common.close') : t('common.viewDetail')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
          <div className="md:col-span-4 relative group">
            <select
              className="block w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl py-2 px-4 text-[11px] font-bold dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
              value={importType}
              onChange={(e) => {
                setImportType(e.target.value as ImportType);
                handleClearFile();
              }}
            >
              <option value="students">{t('import.students')}</option>
              <option value="teachers">{t('import.teachers')}</option>
              <option value="rooms">{t('import.rooms')}</option>
              <option value="classes">{t('import.classes')}</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300 group-hover:text-primary transition-colors">
              <Upload size={14} />
            </div>
          </div>

          <div className="md:col-span-5 relative group">
            <select
              className="block w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl py-2 px-4 text-[11px] font-bold dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="" disabled>{t('import.selectBranch')}</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300 group-hover:text-primary transition-colors">
              <AlertCircle size={14} />
            </div>
          </div>

          <div className="md:col-span-3">
            <button
              onClick={downloadTemplate}
              className="w-full flex items-center justify-center px-4 py-2 text-[9px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl transition-all active:scale-95 shadow-sm group/btn"
            >
              <FileText size={14} className="mr-2 group-hover/btn:scale-110 transition-transform" /> {t('import.downloadTemplate')}
            </button>
          </div>
        </div>
      </div>


      {/* Collapsible Guide Section */}
      {isGuideOpen && (
        <div className="mb-6 p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800 animate-in slide-in-from-top-2 duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <AlertCircle size={60} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 relative z-10">
            {(importType === 'students' || importType === 'teachers') && (
              <>
                <div className="px-3 py-1.5 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-100/50 dark:border-rose-800/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-rose-600 dark:text-rose-400">{t('import.fields.name')}</span>
                </div>
                <div className="px-3 py-1.5 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-100/50 dark:border-rose-800/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-rose-600 dark:text-rose-400">{t('import.fields.email')}</span>
                </div>
                <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-50"></div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">{t('import.fields.phone')}</span>
                </div>
                <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-50"></div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">{importType === 'students' ? t('import.fields.dob') : t('import.fields.specialization')}</span>
                </div>
                <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-50"></div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">{t('import.fields.className')}</span>
                </div>
              </>
            )}
            {importType === 'rooms' && (
              <>
                <div className="px-3 py-1.5 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-100/50 dark:border-rose-800/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-rose-600 dark:text-rose-400">{t('import.fields.roomName')}</span>
                </div>
                <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/20">
                  <span className="text-[10px] font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">{t('import.fields.capacity')}</span>
                </div>
                <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/20">
                  <span className="text-[10px] font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">{t('import.fields.roomType')}</span>
                </div>
              </>
            )}
            {importType === 'classes' && (
              <>
                <div className="px-3 py-1.5 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-100/50 dark:border-rose-800/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-rose-600 dark:text-rose-400">{t('import.fields.className')}</span>
                </div>
                <div className="px-3 py-1.5 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-100/50 dark:border-rose-800/20 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-rose-600 dark:text-rose-400">{t('import.fields.teacherEmail')}</span>
                </div>
                <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/20">
                  <span className="text-[10px] font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">{t('import.fields.maxCapacity')}</span>
                </div>
                <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/20">
                  <span className="text-[10px] font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">{t('import.fields.startDate')}</span>
                </div>
                <div className="px-3 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/20">
                  <span className="text-[10px] font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">{t('import.fields.endDate')}</span>
                </div>
              </>
            )}
          </div>
          <p className="mt-3 text-[9px] text-gray-400 font-bold italic opacity-70 flex items-center gap-1.5">
            <span className="text-rose-400 font-black">*</span> {t('import.guideDesc')}
          </p>
        </div>
      )}

      {/* Main Upload Area */}
      {!file || parsedData.length === 0 ? (
        <div className="flex-1 min-h-[280px] flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[2.5rem] bg-gray-50/30 dark:bg-gray-900/20 p-8 relative group transition-all hover:border-primary/30 hover:bg-primary/[0.02] overflow-hidden">
          <input
            type="file"
            accept=".csv, .tsv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 rounded-3xl bg-white dark:bg-gray-800 shadow-2xl shadow-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 border border-gray-100 dark:border-gray-700 relative">
              <div className="absolute inset-0 bg-primary/5 rounded-full animate-ping opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <Upload size={36} strokeWidth={2.5} />
            </div>

            <div className="text-center max-w-sm">
              {file ? (
                <div className="relative z-30 animate-in fade-in zoom-in duration-300">
                  <p className="text-base font-black text-gray-900 dark:text-white mb-5 tracking-tight">{file.name}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); processFile(); }}
                    className="px-10 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-95"
                  >
                    {t('import.analyzeFile')}
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{t('import.dropzoneText')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                    {t('import.dropzoneSub')}
                  </p>
                  <div className="pt-4 flex items-center justify-center gap-3">
                    <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-gray-700 shadow-sm">CSV</span>
                    <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-gray-700 shadow-sm">XLSX</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-primary/[0.03] dark:bg-primary/[0.05] border border-primary/10 rounded-[1.5rem] mb-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-primary border border-primary/10 shrink-0">
                <FileText size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-tight truncate">{file?.name}</p>
                <div className="flex items-center gap-1.5 text-primary mt-0.5">
                  <CheckCircle size={12} strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase tracking-[0.1em]">{t('import.rowCount', { count: parsedData.length })}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClearFile}
              className="px-4 py-2 flex items-center gap-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all text-[9px] font-black uppercase tracking-widest self-end sm:self-center"
            >
              <Trash2 size={16} />
              <span>{t('import.clearFile')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-1 h-3 bg-primary rounded-full"></div>
            <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t('common.preview') || 'Preview'}</h4>
          </div>

          <div className="flex-1 overflow-auto bg-white/50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 rounded-[1.5rem] shadow-inner relative">
            {isProcessing ? (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="relative">
                  <div className="w-12 h-12 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
              </div>
            ) : parsedData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                  <thead className="bg-gray-50/50 dark:bg-gray-900/50 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest w-12 italic border-b border-gray-100 dark:border-gray-800">Row</th>
                      {headers.map((h, i) => (
                        <th key={i} className="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {parsedData.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-primary/[0.02] dark:hover:bg-primary/[0.03] transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap text-[9px] font-black text-gray-300 dark:text-gray-600 italic">#{i + 1}</td>
                        {headers.map((h, j) => (
                          <td key={j} className="px-5 py-3 whitespace-nowrap text-xs font-bold text-gray-700 dark:text-gray-300">
                            {row[h]?.toString() || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {parsedData.length > 50 && (
                      <tr>
                        <td colSpan={headers.length + 1} className="px-6 py-6 text-center bg-gray-50/20 dark:bg-gray-900/10">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 opacity-50">
                            {t('import.hiddenRows', { count: parsedData.length - 50 })}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <NoResults title={t('import.noData')} isTable={false} />
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isUploading || parsedData.length === 0}
              className={`group flex items-center px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white shadow-2xl transition-all active:scale-95 ${isUploading || parsedData.length === 0
                  ? 'bg-gray-300 cursor-not-allowed opacity-50'
                  : 'bg-primary hover:bg-primary-dark shadow-primary/30'
                }`}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                  {t('import.processing')}
                </>
              ) : (
                <>
                  <CheckCircle size={18} className="mr-3 group-hover:scale-110 transition-transform" strokeWidth={3} />
                  {t('import.confirm')}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleImport}
        title={t('import.confirmTitle') || t('common.confirm')}
        message={t('import.confirmMessage', { count: parsedData.length, type: t(`import.${importType}`) }) || `Are you sure you want to import ${parsedData.length} records?`}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        type="primary"
        isLoading={isUploading}
      />
    </div>
  );
};

export default ImportData;
