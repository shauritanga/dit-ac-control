import { createContext, useContext, type ReactNode } from 'react';
import { useLiveData } from '../hooks/useLiveData';

type DataContextValue = ReturnType<typeof useLiveData>;

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const value = useLiveData();
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useFacilityData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useFacilityData must be used within DataProvider');
  return ctx;
}
