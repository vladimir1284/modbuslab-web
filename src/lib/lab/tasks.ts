import type { Exchange } from '../modbus/types.js';
import { parseBitAddr, type Variant } from './variants.js';

export interface Task {
  id: string;
  group: 'plc' | 'analyzer';
  label: string;
  optional?: boolean;
  matches(x: Exchange, v: Variant): boolean;
}

export const WM14_VAR_ADDRESSES: Record<string, number> = {
  'V L1-N': 0x0280,
  'A L1': 0x0282,
  'W L1': 0x0284,
  'V L2-N': 0x0286,
  'A L2': 0x0288,
  'W L2': 0x028a,
  'V L3-N': 0x028c,
  'A L3': 0x028e,
  'W L3': 0x0290,
  'V L1-L2': 0x0292,
  'V L2-L3': 0x0294,
  'V L3-L1': 0x0296,
  'VL-L ∑': 0x0298,
  'A max': 0x029a,
  'A n': 0x029c,
  'W ∑': 0x029e,
  'VA L1': 0x02a0,
  'VA L2': 0x02a2,
  'VA L3': 0x02a4,
  'VA ∑': 0x02a6,
  'var L1': 0x02a8,
  'var L2': 0x02aa,
  'var L3': 0x02ac,
  'var ∑': 0x02ae,
  'Hz': 0x02b8
};

export function buildTasksForVariant(v: Variant): Task[] {
  const toggleBitAddr = parseBitAddr(v.toggleBit);
  const startInputAddr = parseBitAddr(v.readInputs[0]);
  const endInputAddr = parseBitAddr(v.readInputs[1]);
  const inputCount = endInputAddr - startInputAddr + 1;

  return [
    {
      id: 'plc-1',
      group: 'plc',
      label: `1. Escribir 1 en ${v.toggleBit}`,
      matches: (x) =>
        x.origin === 'student' &&
        x.ok &&
        x.reqPdu?.unit === 2 &&
        x.reqPdu?.fn === 5 &&
        x.reqPdu?.addr === toggleBitAddr &&
        x.reqPdu?.value === 0xff00
    },
    {
      id: 'plc-2',
      group: 'plc',
      label: `2. Leer bit ${v.toggleBit}`,
      matches: (x) =>
        x.origin === 'student' &&
        x.ok &&
        x.reqPdu?.unit === 2 &&
        (x.reqPdu?.fn === 1 || x.reqPdu?.fn === 2) &&
        x.reqPdu?.addr !== undefined &&
        x.reqPdu.addr <= toggleBitAddr &&
        x.reqPdu.addr + (x.reqPdu.count ?? 1) > toggleBitAddr
    },
    {
      id: 'plc-3',
      group: 'plc',
      label: `3. Escribir 0 en ${v.toggleBit}`,
      matches: (x) =>
        x.origin === 'student' &&
        x.ok &&
        x.reqPdu?.unit === 2 &&
        x.reqPdu?.fn === 5 &&
        x.reqPdu?.addr === toggleBitAddr &&
        x.reqPdu?.value === 0x0000
    },
    {
      id: 'plc-4',
      group: 'plc',
      label: `4. Leer bit ${v.toggleBit}`,
      matches: (x) =>
        x.origin === 'student' &&
        x.ok &&
        x.reqPdu?.unit === 2 &&
        (x.reqPdu?.fn === 1 || x.reqPdu?.fn === 2) &&
        x.reqPdu?.addr !== undefined &&
        x.reqPdu.addr <= toggleBitAddr &&
        x.reqPdu.addr + (x.reqPdu.count ?? 1) > toggleBitAddr
    },
    {
      id: 'plc-5',
      group: 'plc',
      label: `5. Leer entradas ${v.readInputs[0]}–${v.readInputs[1]}`,
      matches: (x) =>
        x.origin === 'student' &&
        x.ok &&
        x.reqPdu?.unit === 2 &&
        (x.reqPdu?.fn === 1 || x.reqPdu?.fn === 2) &&
        x.reqPdu?.addr === startInputAddr &&
        (x.reqPdu?.count ?? 0) >= inputCount
    },
    {
      id: 'plc-6',
      group: 'plc',
      label: `6. Escribir 5555h en dir. ${v.plcBase.toString(16).toUpperCase()}h`,
      matches: (x) => {
        if (x.origin !== 'student' || !x.ok || x.reqPdu?.unit !== 2) return false;
        if (x.reqPdu.fn === 6 && x.reqPdu.addr === v.plcBase && x.reqPdu.value === 0x5555) return true;
        if (x.reqPdu.fn === 16 && x.reqPdu.addr === v.plcBase && x.reqPdu.data) {
          const bytes = Uint8Array.from(x.reqPdu.data);
          const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
          return view.byteLength >= 2 && view.getUint16(0, false) === 0x5555;
        }
        return false;
      }
    },
    {
      id: 'plc-7',
      group: 'plc',
      label: '7. Leer registro de salida en dir. P00 (0000h)',
      matches: (x) =>
        x.origin === 'student' &&
        x.ok &&
        x.reqPdu?.unit === 2 &&
        (x.reqPdu?.fn === 3 || x.reqPdu?.fn === 4) &&
        x.reqPdu?.addr === 0x0000
    },
    {
      id: 'analyzer-8',
      group: 'analyzer',
      label: `8. Lecturas individuales de: ${v.analyzerVars.join(', ')}`,
      matches: (x) => false // evaluated by evaluateTask8 across history
    },
    {
      id: 'analyzer-9',
      group: 'analyzer',
      label: `9. Leer 4 registros desde ${v.analyzerBase.toString(16).padStart(4, '0').toUpperCase()}h`,
      matches: (x) =>
        x.origin === 'student' &&
        x.ok &&
        x.reqPdu?.unit === 1 &&
        (x.reqPdu?.fn === 3 || x.reqPdu?.fn === 4) &&
        x.reqPdu?.addr === v.analyzerBase &&
        x.reqPdu?.count === 4
    },
    {
      id: 'task-10',
      group: 'analyzer',
      label: '10. (Opcional) Reescalado de Ct_ratio y verificación',
      optional: true,
      matches: (x) => false // evaluated by evaluateTask10 across history
    }
  ];
}

export function evaluateTask8(history: Exchange[], v: Variant): boolean {
  for (const varName of v.analyzerVars) {
    const targetAddr = WM14_VAR_ADDRESSES[varName];
    if (targetAddr === undefined) continue;

    const found = history.some(
      (x) =>
        x.origin === 'student' &&
        x.ok &&
        x.reqPdu?.unit === 1 &&
        (x.reqPdu?.fn === 3 || x.reqPdu?.fn === 4) &&
        x.reqPdu?.addr === targetAddr &&
        (x.reqPdu?.count === 1 || x.reqPdu?.count === 2)
    );
    if (!found) return false;
  }
  return true;
}

export function evaluateTask10(history: Exchange[], v: Variant): boolean {
  // History is stored newest-first (UI unshifts each new exchange); this predicate is
  // order-sensitive (fn03 -> fn06 -> current read), so it must scan in chronological order.
  const chronological = [...history].sort((a, b) => a.timestamp - b.timestamp);

  let step1Idx = -1;
  let step2Idx = -1;

  for (let i = 0; i < chronological.length; i++) {
    const x = chronological[i];
    if (x.origin !== 'student' || !x.ok) continue;

    // Step 1: Read Ct_ratio at 0x1084
    if (step1Idx === -1 && x.reqPdu?.unit === 1 && (x.reqPdu?.fn === 3 || x.reqPdu?.fn === 4) && x.reqPdu?.addr === 0x1084) {
      step1Idx = i;
      continue;
    }

    // Step 2: Write 0x0032 to 0x1084
    if (step1Idx !== -1 && step2Idx === -1 && x.reqPdu?.unit === 1 && x.reqPdu?.fn === 6 && x.reqPdu?.addr === 0x1084 && x.reqPdu?.value === 0x0032) {
      step2Idx = i;
      continue;
    }

    // Step 3: Read current magnitude after step 2 (A L1/A L2/A L3 only — not a voltage register)
    if (step2Idx !== -1 && x.reqPdu?.unit === 1 && (x.reqPdu?.fn === 3 || x.reqPdu?.fn === 4)) {
      if (x.reqPdu?.addr === 0x0282 || x.reqPdu?.addr === 0x0288 || x.reqPdu?.addr === 0x028e) {
        return true;
      }
    }
  }

  return false;
}
