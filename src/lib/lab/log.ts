import type { Exchange } from '../modbus/types.js';

export interface LabState {
  listNumber: number;
  variantNumber: number;
  studentName?: string;
  startTime: number;
  history: Exchange[];
  revealedCt: boolean;
  revealedVt: boolean;
}

const STORAGE_KEY = 'modbuslab.session.v1';

export function loadSession(): LabState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(state: LabState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore private browsing storage quota errors
  }
}

export function clearSession(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
