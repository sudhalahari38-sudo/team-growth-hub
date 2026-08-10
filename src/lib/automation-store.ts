/**
 * Local persistence for automations + run history.
 * Mirrors the pattern used by nudge-history.ts; swap for DB tables when
 * Lovable Cloud persistence is enabled.
 */
import type { AutomationConfig, AutomationRun } from "./automation-types";

const CFG_KEY = "ld.automations.v1";
const RUN_KEY = "ld.automation-runs.v1";

const listeners = new Set<() => void>();
let cfgCache: AutomationConfig[] | null = null;
let runCache: AutomationRun[] | null = null;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeAutomations(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listAutomations(): AutomationConfig[] {
  if (!cfgCache) cfgCache = readJson<AutomationConfig[]>(CFG_KEY, []);
  return cfgCache;
}

function writeAutomations(next: AutomationConfig[]) {
  cfgCache = next;
  try {
    window.localStorage.setItem(CFG_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  emit();
}

export function upsertAutomation(cfg: AutomationConfig) {
  const list = listAutomations();
  const i = list.findIndex((a) => a.id === cfg.id);
  if (i === -1) writeAutomations([...list, cfg]);
  else writeAutomations(list.map((a) => (a.id === cfg.id ? cfg : a)));
}

export function deleteAutomation(id: string) {
  writeAutomations(listAutomations().filter((a) => a.id !== id));
}

export function listRuns(automationId?: string): AutomationRun[] {
  if (!runCache) runCache = readJson<AutomationRun[]>(RUN_KEY, []);
  const rows = automationId ? runCache.filter((r) => r.automationId === automationId) : runCache;
  return [...rows].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function appendRun(run: AutomationRun) {
  const next = [...(runCache ?? listRuns()), run].slice(-200);
  runCache = next;
  try {
    window.localStorage.setItem(RUN_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  emit();
}

export function clearRuns(automationId?: string) {
  const next = automationId ? listRuns().filter((r) => r.automationId !== automationId) : [];
  runCache = next;
  try {
    window.localStorage.setItem(RUN_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  emit();
}
