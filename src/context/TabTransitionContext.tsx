import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type SlideDirection = 'left' | 'right' | null;

interface TabTransitionContextValue {
  order: string[];
  previousIndex: number | null;
  currentIndex: number | null;
  direction: SlideDirection;
  trigger: number; // increments each time a transition should animate
  setCurrentByRouteName: (name: string) => void;
}

const TabTransitionContext = createContext<TabTransitionContextValue | undefined>(undefined);

export function TabTransitionProvider({ order, children }: { order: string[]; children: React.ReactNode }) {
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<SlideDirection>(null);
  const [trigger, setTrigger] = useState(0);

  const setCurrentByRouteName = useCallback((name: string) => {
    const newIndex = order.indexOf(name);
    if (newIndex === -1) return;

    if (currentIndex === null) {
      setCurrentIndex(newIndex);
      setPreviousIndex(null);
      setDirection(null);
      return;
    }

    if (newIndex !== currentIndex) {
      setPreviousIndex(currentIndex);
      setDirection(newIndex > currentIndex ? 'left' : 'right');
      setCurrentIndex(newIndex);
      setTrigger((t) => t + 1);
    }
  }, [order, currentIndex]);

  const value = useMemo<TabTransitionContextValue>(() => ({
    order,
    previousIndex,
    currentIndex,
    direction,
    trigger,
    setCurrentByRouteName,
  }), [order, previousIndex, currentIndex, direction, trigger, setCurrentByRouteName]);

  return (
    <TabTransitionContext.Provider value={value}>
      {children}
    </TabTransitionContext.Provider>
  );
}

export function useTabTransition() {
  const ctx = useContext(TabTransitionContext);
  if (!ctx) throw new Error('useTabTransition must be used within a TabTransitionProvider');
  return ctx;
}
