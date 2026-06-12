import { useEffect, useState } from "react";

export interface DashboardSettings {
  transcriptEnabled: boolean;
}

const KEY = "dashboard-settings";
const DEFAULTS: DashboardSettings = { transcriptEnabled: false };

function read(): DashboardSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

const listeners = new Set<(s: DashboardSettings) => void>();

export function useDashboardSettings() {
  const [settings, setSettings] = useState<DashboardSettings>(() => read());

  useEffect(() => {
    const fn = (s: DashboardSettings) => setSettings(s);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const update = (patch: Partial<DashboardSettings>) => {
    const next = { ...read(), ...patch };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    listeners.forEach((fn) => fn(next));
  };

  return { settings, update };
}
