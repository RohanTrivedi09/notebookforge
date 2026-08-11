export interface SnitchUser {
  name: string;
  defaultHeader?: string;
  defaultFooter?: string;
  theme?: string;
}

export const getSnitchUser = (): SnitchUser | null => {
  const data = localStorage.getItem('snitch_user');
  return data ? (JSON.parse(data) as SnitchUser) : null;
};

export const setSnitchUser = (user: SnitchUser) => {
  localStorage.setItem('snitch_user', JSON.stringify(user));
};

export interface ConversionHistoryItem {
  filename: string;
  timestamp: number;
  headerConfig?: string;
  footerConfig?: string;
}

export const getConversionHistory = (): ConversionHistoryItem[] => {
  const data = localStorage.getItem('snitch_history');
  return data ? (JSON.parse(data) as ConversionHistoryItem[]) : [];
};

export const addConversionHistory = (item: ConversionHistoryItem) => {
  const history = getConversionHistory();
  const newHistory = [item, ...history].slice(0, 10);
  localStorage.setItem('snitch_history', JSON.stringify(newHistory));
};

export const clearConversionHistory = () => {
  localStorage.removeItem('snitch_history');
};
