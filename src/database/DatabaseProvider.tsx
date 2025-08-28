import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { initializeDatabase } from './schema';

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  return (
    <SQLiteProvider 
      databaseName="journal.db" 
      onInit={initializeDatabase}
      useSuspense
    >
      {children}
    </SQLiteProvider>
  );
};
