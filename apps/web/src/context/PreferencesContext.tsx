import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type WorkspacePreferences = {
  /** Notify when a unit is offline */
  notifyOffline: boolean;
  /** Notify when power is outside min–max band */
  notifyHighPower: boolean;
  /** Notify on failed commands */
  notifyFailedCommand: boolean;
  /**
   * Minimum expected power (W) while unit is ON.
   * Below this → possible malfunction / not cooling properly.
   */
  powerThresholdMinW: number;
  /**
   * Maximum allowed power (W).
   * At or above this → overload / high load alert.
   */
  powerThresholdMaxW: number;
  autoRefresh: boolean;
  confirmCommands: boolean;
};

type PreferencesContextValue = {
  preferences: WorkspacePreferences;
  setPreference: <K extends keyof WorkspacePreferences>(
    key: K,
    value: WorkspacePreferences[K],
  ) => void;
  updatePreferences: (patch: Partial<WorkspacePreferences>) => void;
  resetPreferences: () => void;
};

const STORAGE_KEY = 'dit-ac-preferences';

export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  notifyOffline: true,
  notifyHighPower: true,
  notifyFailedCommand: true,
  powerThresholdMinW: 200,
  powerThresholdMaxW: 1500,
  autoRefresh: true,
  confirmCommands: false,
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function clampPower(n: number, fallback: number) {
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(Math.min(20000, Math.max(0, n)));
}

function loadPreferences(): WorkspacePreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<WorkspacePreferences> & {
      powerThresholdW?: number;
    };

    // Migrate old single-threshold key if present
    let minW =
      typeof parsed.powerThresholdMinW === 'number'
        ? parsed.powerThresholdMinW
        : DEFAULT_PREFERENCES.powerThresholdMinW;
    let maxW =
      typeof parsed.powerThresholdMaxW === 'number'
        ? parsed.powerThresholdMaxW
        : typeof parsed.powerThresholdW === 'number'
          ? parsed.powerThresholdW
          : DEFAULT_PREFERENCES.powerThresholdMaxW;

    minW = clampPower(minW, DEFAULT_PREFERENCES.powerThresholdMinW);
    maxW = clampPower(maxW, DEFAULT_PREFERENCES.powerThresholdMaxW);
    if (minW > maxW) {
      const t = minW;
      minW = maxW;
      maxW = t;
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      powerThresholdMinW: minW,
      powerThresholdMaxW: maxW,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<WorkspacePreferences>(loadPreferences);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    document.documentElement.removeAttribute('data-density');
  }, [preferences]);

  const setPreference = useCallback(
    <K extends keyof WorkspacePreferences>(key: K, value: WorkspacePreferences[K]) => {
      setPreferences((current) => {
        const next = { ...current, [key]: value };
        // Keep min ≤ max
        if (key === 'powerThresholdMinW' && typeof value === 'number') {
          if (value > next.powerThresholdMaxW) next.powerThresholdMaxW = value;
        }
        if (key === 'powerThresholdMaxW' && typeof value === 'number') {
          if (value < next.powerThresholdMinW) next.powerThresholdMinW = value;
        }
        return next;
      });
    },
    [],
  );

  const updatePreferences = useCallback((patch: Partial<WorkspacePreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      if (next.powerThresholdMinW > next.powerThresholdMaxW) {
        const t = next.powerThresholdMinW;
        next.powerThresholdMinW = next.powerThresholdMaxW;
        next.powerThresholdMaxW = t;
      }
      return next;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo(
    () => ({ preferences, setPreference, updatePreferences, resetPreferences }),
    [preferences, setPreference, updatePreferences, resetPreferences],
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}
