'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';

interface UIStateContextType {
  // State
  loading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  
  // Operations
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export function useUIStateContext() {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error('useUIStateContext must be used within a UIStateProvider');
  }
  return context;
}

interface UIStateProviderProps {
  children: ReactNode;
  initialLoading?: boolean;
  initialError?: string | null;
}

export function UIStateProvider({ 
  children,
  initialLoading = false,
  initialError = null
}: UIStateProviderProps) {
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<string | null>(initialError);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const value = {
    loading,
    error,
    sidebarOpen,
    setLoading,
    setError,
    setSidebarOpen
  };

  return (
    <UIStateContext.Provider value={value}>
      {children}
    </UIStateContext.Provider>
  );
} 