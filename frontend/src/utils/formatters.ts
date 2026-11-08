const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export const formatCurrency = (amount: number | string): string => {
  const value = Number(amount);
  return vndFormatter.format(Number.isFinite(value) ? value : 0);
};

export const formatDate = (
  value: Date | string | number | null | undefined,
  locale: string = 'vi-VN',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (value == null || value === '') return '—';
  // A date-only value is a calendar day, so avoid UTC conversion shifting it.
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(locale, options).format(date);
};
