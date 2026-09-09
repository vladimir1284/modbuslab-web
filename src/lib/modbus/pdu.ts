import { EXCEPTION_NAMES } from './exceptions.js';
import type { DecodedPdu } from './types.js';

export function makeExceptionPdu(fn: number, code: number): Uint8Array {
  return new Uint8Array([fn | 0x80, code]);
}

export function parsePdu(pdu: Uint8Array, unit = 0): DecodedPdu {
  if (pdu.length === 0) {
    throw new Error('Empty PDU');
  }
  const fn = pdu[0];
  const isException = (fn & 0x80) !== 0;

  if (isException) {
    const rawFn = fn & 0x7f;
    const exceptionCode = pdu[1] ?? 0;
    return {
      unit,
      fn: rawFn,
      isException: true,
      exceptionCode,
      rawPdu: pdu
    };
  }

  const view = new DataView(pdu.buffer, pdu.byteOffset, pdu.byteLength);

  switch (fn) {
    case 0: { // Control de estaciones esclavas
      const subfn = pdu.length >= 3 ? view.getUint16(1, false) : undefined;
      const data = pdu.length > 3 ? pdu.subarray(3) : undefined;
      return { unit, fn, isException: false, subfn, data, rawPdu: pdu };
    }
    case 1: // Read Coils
    case 2: // Read Discrete Inputs
    case 3: // Read Holding Registers
    case 4: { // Read Input Registers
      if (pdu.length === 5) { // Request
        const addr = view.getUint16(1, false);
        const count = view.getUint16(3, false);
        return { unit, fn, isException: false, addr, count, rawPdu: pdu };
      } else { // Response
        const bytes = pdu[1];
        const data = pdu.subarray(2, 2 + bytes);
        return { unit, fn, isException: false, bytes, data, rawPdu: pdu };
      }
    }
    case 5: // Write Single Coil
    case 6: { // Write Single Register (or request/response)
      const addr = view.getUint16(1, false);
      const value = view.getUint16(3, false);
      return { unit, fn, isException: false, addr, value, rawPdu: pdu };
    }
    case 7: { // Read Exception Status
      if (pdu.length === 1) { // Request
        return { unit, fn, isException: false, rawPdu: pdu };
      } else { // Response
        const statusByte = pdu[1];
        return { unit, fn, isException: false, statusByte, rawPdu: pdu };
      }
    }
    case 8: { // Diagnostics
      const subfn = view.getUint16(1, false);
      const value = view.getUint16(3, false);
      return { unit, fn, isException: false, subfn, value, rawPdu: pdu };
    }
    case 11: { // Get Comm Event Counter
      if (pdu.length === 1) { // Request
        return { unit, fn, isException: false, rawPdu: pdu };
      } else { // Response
        const statusByte = view.getUint16(1, false);
        const eventCounter = view.getUint16(3, false);
        return { unit, fn, isException: false, statusByte, eventCounter, rawPdu: pdu };
      }
    }
    case 15: { // Write Multiple Coils
      const addr = view.getUint16(1, false);
      const count = view.getUint16(3, false);
      if (pdu.length > 5) { // Request
        const bytes = pdu[5];
        const data = pdu.subarray(6, 6 + bytes);
        return { unit, fn, isException: false, addr, count, bytes, data, rawPdu: pdu };
      } else { // Response
        return { unit, fn, isException: false, addr, count, rawPdu: pdu };
      }
    }
    case 16: { // Write Multiple Registers
      const addr = view.getUint16(1, false);
      const count = view.getUint16(3, false);
      if (pdu.length > 5) { // Request
        const bytes = pdu[5];
        const data = pdu.subarray(6, 6 + bytes);
        return { unit, fn, isException: false, addr, count, bytes, data, rawPdu: pdu };
      } else { // Response
        return { unit, fn, isException: false, addr, count, rawPdu: pdu };
      }
    }
    default:
      return { unit, fn, isException: false, rawPdu: pdu };
  }
}
