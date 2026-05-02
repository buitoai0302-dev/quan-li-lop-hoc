import React, { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';

interface Branch {
  id: string;
  name: string;
}

type ImportType = 'students' | 'teachers' | 'rooms' | 'classes';

const ImportData: React.FC = () => {
  const { t } = useTranslation();
  const [importType, setImportType] = useState<ImportType>('students');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches');
        setBranches(res.data);
        if (res.data.length > 0) {
          setSelectedBranch(res.data[0].id);
        }
      } catch (err) {
        toast.error(t('common.error'));
      }
    };
    fetchBranches();
  }, []);

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
      const res = await api.post(`/import/${importType}`, { data: validData });
      toast.success(res.data.message || t('common.success'));
      handleClearFile();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.error'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col transition-colors">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('import.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('import.subtitle')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('import.dataType')} *</label>
          <select
            className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
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
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('import.branch')} *</label>
          <select
            className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="" disabled>{t('import.selectBranch')}</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800/50">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center">
            <AlertCircle size={16} className="mr-2" /> {t('import.guideTitle')}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            {t('import.guideDesc')}
          </p>
          <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-400 mt-2 ml-2">
            {(importType === 'students' || importType === 'teachers') && (
              <>
                <li><strong>{t('import.required')}:</strong> <code>{t('import.fields.name')}</code>, <code>{t('import.fields.email')}</code></li>
                <li><strong>{t('import.optional')}:</strong> <code>{t('import.fields.phone')}</code>, {importType === 'students' ? <code>{t('import.fields.dob')}</code> : <code>{t('import.fields.specialization')}</code>}</li>
              </>
            )}
            {importType === 'rooms' && (
              <>
                <li><strong>{t('import.required')}:</strong> <code>{t('import.fields.roomName')}</code></li>
                <li><strong>{t('import.optional')}:</strong> <code>{t('import.fields.capacity')}</code>, <code>{t('import.fields.roomType')}</code></li>
              </>
            )}
            {importType === 'classes' && (
              <>
                <li><strong>{t('import.required')}:</strong> <code>{t('import.fields.className')}</code>, <code>{t('import.fields.teacherEmail')}</code></li>
                <li><strong>{t('import.optional')}:</strong> <code>{t('import.fields.maxCapacity')}</code>, <code>{t('import.fields.startDate')}</code>, <code>{t('import.fields.endDate')}</code></li>
              </>
            )}
          </ul>
        </div>
      </div>

      {!file || parsedData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-6 min-h-[250px] relative">
          <input
            type="file"
            accept=".csv, .tsv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload size={48} className={`mb-4 ${file ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}`} />
          {file ? (
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">{file.name}</p>
              <button 
                onClick={(e) => { e.stopPropagation(); processFile(); }}
                className="relative z-10 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
              >
                {t('import.analyzeFile')}
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('import.dropzoneText')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center max-w-md">
                {t('import.dropzoneSub')}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-4 bg-gray-50 dark:bg-gray-800/80">
            <div className="flex items-center">
              <FileText size={24} className="text-primary mr-3" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{file?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('import.rowCount', { count: parsedData.length })}</p>
              </div>
            </div>
            <button 
              onClick={handleClearFile}
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-md transition-colors"
              title={t('import.clearFile')}
            >
              <Trash2 size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {isProcessing ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : parsedData.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                    {headers.map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {parsedData.slice(0, 100).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{i + 1}</td>
                      {headers.map((h, j) => (
                        <td key={j} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                          {row[h]?.toString() || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {parsedData.length > 100 && (
                    <tr>
                      <td colSpan={headers.length + 1} className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/80">
                        {t('import.hiddenRows', { count: parsedData.length - 100 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] text-gray-500 dark:text-gray-400">
                {t('import.noData')}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleImport}
              disabled={isUploading || parsedData.length === 0}
              className={`flex items-center px-6 py-2 rounded-lg font-medium text-white shadow-sm transition-colors ${
                isUploading || parsedData.length === 0 ? 'bg-blue-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('import.processing')}
                </>
              ) : (
                <>
                  <CheckCircle size={18} className="mr-2" /> {t('import.confirm')}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportData;
