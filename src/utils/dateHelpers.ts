/**
 * Date utility functions for the journal app
 */

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const formatDisplayDate = (date: string): string => {
  const d = new Date(date);
  // Normalize to our canonical YYYY-MM-DD string to compare with helpers
  const normalized = formatDate(d);
  if (isToday(normalized)) return 'Today';
  if (isTomorrow(normalized)) return 'Tomorrow';
  if (isYesterday(normalized)) return 'Yesterday';

  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const getToday = (): string => {
  return formatDate(new Date());
};

export const getYesterday = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
};

export const getTomorrow = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow);
};

export const isToday = (date: string): boolean => {
  return date === getToday();
};

export const isYesterday = (date: string): boolean => {
  return date === getYesterday();
};

export const isTomorrow = (date: string): boolean => {
  return date === getTomorrow();
};

export const getDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

export const getWeekRange = (date: string): { start: string; end: string } => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  
  const start = new Date(d);
  start.setDate(d.getDate() - dayOfWeek);
  
  const end = new Date(d);
  end.setDate(d.getDate() + (6 - dayOfWeek));
  
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
};
