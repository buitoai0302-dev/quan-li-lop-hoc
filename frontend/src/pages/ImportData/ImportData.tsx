import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  Import as ImportIcon,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ConfirmModal from '@/components/common/ConfirmModal';
import PageHeader from '@/components/common/PageHeader';
import { Card, Button } from '@/components/common/UI';
import PageLoading from '@/components/common/PageLoading';

import { useImport } from '@/features/import/hooks/useImport';
import type { ImportType } from '@/features/import/hooks/useImport';

const ImportData: React.FC = () => {
  const { t } = useTranslation();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const {
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
    handleImport: executeImport,
  } = useImport();

  const handleImport = async () => {
    const success = await executeImport();
    if (success) {
      setIsConfirmOpen(false);
    }
  };

  const downloadTemplate = () => {
    let templateData: any[] = [];
    if (importType === 'students') {
      templateData = [
        {
          'Họ Tên': 'Nguyễn Văn A',
          Email: 'student@example.com',
          SĐT: '0901234567',
          'Ngày sinh': '2010-05-20',
          'Tên Lớp': 'Lớp Toán 10A1',
        },
      ];
    } else if (importType === 'teachers') {
      templateData = [
        {
          'Họ Tên': 'Trần Thị B',
          Email: 'teacher@example.com',
          SĐT: '0987654321',
          'Chuyên môn': 'Toán học',
        },
      ];
    } else if (importType === 'rooms') {
      templateData = [{ 'Tên Phòng': 'Phòng 101', 'Sức chứa': '30', 'Loại phòng': 'Lý thuyết' }];
    } else {
      templateData = [
        {
          'Tên Lớp': 'Toán 10A1',
          'Sĩ số tối đa': '30',
          'Ngày bắt đầu': '2024-09-01',
          'Ngày kết thúc': '2025-05-31',
          'Email Giáo Viên': 'teacher@example.com',
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `Template_Import_${importType}.xlsx`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={ImportIcon}
        actions={
          <button
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="h-9 px-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100 dark:border-gray-700 whitespace-nowrap flex items-center justify-center gap-2 active:scale-95 shadow-sm"
          >
            <AlertCircle size={14} />
            <span className="hidden sm:inline">
              {isGuideOpen ? t('common.close') : t('common.viewDetail')}
            </span>
          </button>
        }
      />

      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card
            className="p-4 sm:p-6"
            header={
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                    {t('import.type')}
                  </label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all text-xs font-bold dark:text-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
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
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                    {t('import.selectBranch')}
                  </label>
                  <select
                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary transition-all text-xs font-bold dark:text-white appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                  >
                    <option value="" disabled>
                      {t('import.selectBranch')}
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    onClick={downloadTemplate}
                    className="h-11 w-full flex items-center justify-center px-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    <FileText size={16} className="mr-2" /> {t('import.downloadTemplate')}
                  </button>
                </div>
              </div>
            }
          >
            {isGuideOpen && (
              <div className="mb-6 p-5 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100/50 dark:border-amber-800/20 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle size={16} className="text-amber-500" />
                  <h4 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                    {t('import.guideTitle')}
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {(importType === 'students' || importType === 'teachers') && (
                    <>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.name')}
                        </span>
                      </div>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.email')}
                        </span>
                      </div>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100/50 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.phone')}
                        </span>
                      </div>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100/50 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {importType === 'students'
                            ? t('import.fields.dob')
                            : t('import.fields.specialization')}
                        </span>
                      </div>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100/50 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.className')}
                        </span>
                      </div>
                    </>
                  )}
                  {importType === 'rooms' && (
                    <>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.roomName')}
                        </span>
                      </div>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100/50 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.capacity')}
                        </span>
                      </div>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100/50 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.roomType')}
                        </span>
                      </div>
                    </>
                  )}
                  {importType === 'classes' && (
                    <>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.className')}
                        </span>
                      </div>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.teacherEmail')}
                        </span>
                      </div>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100/50 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.maxCapacity')}
                        </span>
                      </div>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100/50 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.startDate')}
                        </span>
                      </div>
                      <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-amber-100/50 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {t('import.fields.endDate')}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="mt-4 text-[10px] text-amber-700/60 font-bold italic">
                  <span className="text-rose-500 font-black mr-1">*</span> {t('import.guideDesc')}
                </p>
              </div>
            )}

            {!file || (parsedData.length === 0 && !isProcessing) ? (
              <div className="min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-3xl bg-gray-50/50 dark:bg-gray-900/20 p-10 relative group transition-all hover:border-primary/50 hover:bg-primary/[0.02]">
                <input
                  type="file"
                  accept=".csv, .tsv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-gray-50 dark:border-gray-700">
                  <Upload size={32} />
                </div>
                <div className="text-center">
                  <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
                    {t('import.dropzoneText')}
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">{t('import.dropzoneSub')}</p>
                </div>
                {file && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      processFile();
                    }}
                    className="mt-8 px-10 py-3.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 z-30"
                  >
                    {t('import.analyzeFile')}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-primary shrink-0 border border-primary/10">
                      <FileText size={24} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 dark:text-white truncate leading-tight mb-1">
                        {file?.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-primary">
                        <CheckCircle size={12} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {t('import.rowCount', { count: parsedData.length })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleClearFile}
                    className="px-4 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    {t('import.clearFile')}
                  </button>
                </div>

                {isProcessing ? (
                  <PageLoading />
                ) : (
                  <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-inner">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full">
                        <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                          <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest italic w-16">
                              #
                            </th>
                            {headers.map((h, i) => (
                              <th
                                key={i}
                                className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {parsedData.slice(0, 50).map((row, i) => (
                            <tr
                              key={i}
                              className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                            >
                              <td className="px-6 py-4 text-[10px] font-black text-gray-300 italic">
                                {i + 1}
                              </td>
                              {headers.map((h, j) => (
                                <td
                                  key={j}
                                  className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap"
                                >
                                  {row[h]?.toString() || ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {parsedData.length > 50 && (
                            <tr>
                              <td
                                colSpan={headers.length + 1}
                                className="px-6 py-8 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest italic bg-gray-50/20"
                              >
                                {t('import.hiddenRows', { count: parsedData.length - 50 })}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setIsConfirmOpen(true)}
                    disabled={isUploading || parsedData.length === 0}
                    className="px-12 py-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {t('import.processing')}
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} strokeWidth={3} />
                        {t('import.confirm')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleImport}
        title={t('import.confirmTitle') || t('common.confirm')}
        message={
          t('import.confirmMessage', {
            count: parsedData.length,
            type: t(`import.${importType}`),
          }) || `Are you sure you want to import ${parsedData.length} records?`
        }
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        type="primary"
        isLoading={isUploading}
      />
    </div>
  );
};

export default ImportData;
