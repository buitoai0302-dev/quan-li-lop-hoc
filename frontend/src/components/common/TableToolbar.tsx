import React from 'react';
import { Button } from '@/components/common/UI';
import { Search, Trash2, Upload, Plus } from 'lucide-react';
import ExportMenu from '@/components/common/ExportMenu';
import { useTranslation } from 'react-i18next';

export interface TableToolbarProps {
  // Filter
  isFilterVisible?: boolean;
  onToggleFilter?: () => void;

  // Selection / Bulk Action
  selectedCount?: number;
  onBulkDelete?: () => void;

  // Export
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  isExportDisabled?: boolean;

  // Import (optional)
  onImport?: () => void;

  // Add
  onAdd?: () => void;
  addLabel?: string;
  AddIcon?: React.ElementType;
}

const TableToolbar: React.FC<TableToolbarProps> = ({
  isFilterVisible,
  onToggleFilter,
  selectedCount = 0,
  onBulkDelete,
  onExportExcel,
  onExportPDF,
  isExportDisabled,
  onImport,
  onAdd,
  addLabel,
  AddIcon = Plus,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      {/* Toggle Filter Button */}
      {onToggleFilter && (
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFilter}
          className={`h-9 w-9 px-0 rounded-lg transition-all ${isFilterVisible ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}
          title={t('common.filter')}
        >
          <Search size={16} />
        </Button>
      )}

      {/* Bulk Delete Button */}
      {selectedCount > 0 && onBulkDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkDelete}
          className="h-9 px-2.5 sm:px-4 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-red-200 dark:border-red-800/50 whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 shadow-sm"
        >
          <Trash2 size={14} />
          <span className="hidden sm:inline">
            {t('common.delete')} ({selectedCount})
          </span>
        </Button>
      )}

      {/* Export Menu */}
      {(onExportExcel || onExportPDF) && (
        <ExportMenu
          onExportExcel={onExportExcel || (() => {})}
          onExportPDF={onExportPDF || (() => {})}
          disabled={isExportDisabled}
        />
      )}

      {/* Import Button */}
      {onImport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onImport}
          className="h-9 w-9 sm:w-auto px-0 sm:px-4 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2"
        >
          <Upload size={14} />
          <span className="hidden sm:inline">{t('common.import')}</span>
        </Button>
      )}

      {/* Add Button */}
      {onAdd && (
        <Button
          variant="default"
          size="sm"
          onClick={onAdd}
          className="h-9 w-9 sm:w-auto px-0 sm:px-4 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2 group"
        >
          <AddIcon
            size={16}
            className="shrink-0 transition-transform duration-300 group-hover:rotate-90"
          />
          {addLabel && <span className="hidden sm:inline">{addLabel}</span>}
        </Button>
      )}
    </div>
  );
};

export default TableToolbar;
