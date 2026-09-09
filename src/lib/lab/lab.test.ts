import { describe, expect, it } from 'vitest';
import type { Exchange } from '../modbus/types.js';
import { evaluateTask10, evaluateTask8 } from './tasks.js';
import { VARIANTS, getVariant } from './variants.js';

describe('Lab Domain & Task Verifier', () => {
  it('correctly retrieves all 44 variants', () => {
    expect(VARIANTS.length).toBe(44);
    for (let i = 1; i <= 44; i++) {
      const v = getVariant(i);
      expect(v.n).toBe(i);
    }
  });

  it('evaluates Task 8 across student individual read history', () => {
    const v = getVariant(1); // V L1-N (0x0280), VA ∑ (0x02a6), Hz (0x02b8)
    const mockExchanges: Exchange[] = [
      {
        id: 1,
        timestamp: Date.now(),
        origin: 'student',
        codec: 'rtu',
        txFrame: new Uint8Array(),
        reqPdu: { unit: 1, fn: 3, isException: false, addr: 0x0280, count: 2, rawPdu: new Uint8Array() },
        elapsedMs: 10,
        ok: true
      },
      {
        id: 2,
        timestamp: Date.now(),
        origin: 'student',
        codec: 'rtu',
        txFrame: new Uint8Array(),
        reqPdu: { unit: 1, fn: 3, isException: false, addr: 0x02a6, count: 2, rawPdu: new Uint8Array() },
        elapsedMs: 10,
        ok: true
      },
      {
        id: 3,
        timestamp: Date.now(),
        origin: 'student',
        codec: 'rtu',
        txFrame: new Uint8Array(),
        reqPdu: { unit: 1, fn: 3, isException: false, addr: 0x02b8, count: 1, rawPdu: new Uint8Array() },
        elapsedMs: 10,
        ok: true
      }
    ];

    expect(evaluateTask8(mockExchanges, v)).toBe(true);
  });

  it('requires student origin for task 10 sequence', () => {
    const v = getVariant(1);
    const mockMonitorExchange: Exchange = {
      id: 1,
      timestamp: Date.now(),
      origin: 'monitor',
      codec: 'rtu',
      txFrame: new Uint8Array(),
      reqPdu: { unit: 1, fn: 3, isException: false, addr: 0x1084, count: 1, rawPdu: new Uint8Array() },
      elapsedMs: 10,
      ok: true
    };

    expect(evaluateTask10([mockMonitorExchange], v)).toBe(false);
  });
});
