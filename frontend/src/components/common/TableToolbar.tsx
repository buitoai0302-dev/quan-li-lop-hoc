import React from 'react';
import { Button } from '@/components/common/UI';
import ActionHint from './ActionHint';
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
    <div className="flex flex-wrap items-start justify-end gap-x-1.5 gap-y-2 sm:items-center sm:gap-2">
      {/* Toggle Filter Button */}
      {onToggleFilter && (
        <ActionHint label={t('common.filter')} showTouchLabel={false}>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilter}
            aria-expanded={Boolean(isFilterVisible)}
            className={`h-11 w-11 sm:h-9 sm:w-9 px-0 rounded-lg transition-colors ${isFilterVisible ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}
          >
            <Search aria-hidden="true" size={16} />
          </Button>
        </ActionHint>
      )}

      {/* Bulk Delete Button */}
      {selectedCount > 0 && onBulkDelete && (
        <ActionHint label={`${t('common.delete')} (${selectedCount})`}>
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDelete}
            className="min-h-11 sm:min-h-9 px-2.5 sm:px-4 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg text-xs font-semibold transition-all border border-red-200 dark:border-red-800/50 whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 shadow-sm"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">
              {t('common.delete')} ({selectedCount})
            </span>
          </Button>
        </ActionHint>
      )}

      {/* Export Menu */}
      {(onExportExcel || onExportPDF) && (
        <ExportMenu
          onExportExcel={onExportExcel || (() => {})}
          onExportPDF={onExportPDF || (() => {})}
          onImport={onImport}
          disabled={isExportDisabled}
        />
      )}

      {/* Import Button */}
      {onImport && !onExportExcel && !onExportPDF && (
        <ActionHint label={t('common.import')} touchLabel={t('common.importShort')}>
          <Button
            variant="outline"
            size="sm"
            onClick={onImport}
            className="h-11 w-11 sm:h-9 sm:w-9 sm:w-auto px-0 sm:px-4 rounded-lg text-xs font-semibold gap-2"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">{t('common.import')}</span>
          </Button>
        </ActionHint>
      )}

      {/* Add Button */}
      {onAdd && (
        <Button
          variant="default"
          size="sm"
          onClick={onAdd}
          className="add-action h-11 gap-1.5 rounded-lg px-2.5 text-xs font-semibold sm:h-9 sm:gap-2 sm:px-4 pointer-coarse:min-h-11"
        >
          <AddIcon
            aria-hidden="true"
            size={16}
            className={AddIcon === Plus ? 'add-action-icon shrink-0' : 'shrink-0'}
          />
          {addLabel || t('common.add')}
        </Button>
      )}
    </div>
  );
};

export default TableToolbar;
