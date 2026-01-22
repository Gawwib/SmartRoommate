import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';

const STORAGE_KEY = 'appMode';
const RoleContext = createContext({
  mode: 'tenant',
  isHost: false,
  isTransitioning: false,
  pendingMode: null,
  toggleMode: () => {},
  switchToTenant: () => {}
});

export function RoleProvider({ children }) {
  const transitionDuration = 600;
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'tenant';
    } catch {
      return 'tenant';
    }
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore write errors caused by disabled storage */
    }
  }, [mode]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const startModeTransition = useCallback(
    (nextMode) => {
      if (mode === nextMode || isTransitioning) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setPendingMode(nextMode);
      setIsTransitioning(true);
      timerRef.current = setTimeout(() => {
        setMode(nextMode);
        setIsTransitioning(false);
        setPendingMode(null);
        timerRef.current = null;
      }, transitionDuration);
    },
    [mode, isTransitioning, transitionDuration]
  );

  const toggleMode = useCallback(() => {
    const nextMode = mode === 'host' ? 'tenant' : 'host';
    startModeTransition(nextMode);
  }, [mode, startModeTransition]);

  const switchToTenant = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPendingMode(null);
    setIsTransitioning(false);
    setMode('tenant');
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isHost: mode === 'host',
      isTransitioning,
      pendingMode,
      toggleMode,
      switchToTenant
    }),
    [mode, isTransitioning, pendingMode, toggleMode, switchToTenant]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
