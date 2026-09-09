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

  it('evaluates task 10 correctly when history is stored newest-first (UI order)', () => {
    const v = getVariant(1);
    const base = Date.now();
    const mk = (id: number, tOffset: number, reqPdu: Exchange['reqPdu']): Exchange => ({
      id,
      timestamp: base + tOffset,
      origin: 'student',
      codec: 'rtu',
      txFrame: new Uint8Array(),
      reqPdu,
      elapsedMs: 10,
      ok: true
    });

    // Chronological order: read Ct_ratio -> write 0x0032 -> read current.
    // Stored newest-first, as +page.svelte does when unshifting new exchanges.
    const historyNewestFirst: Exchange[] = [
      mk(3, 2000, { unit: 1, fn: 3, isException: false, addr: 0x0282, count: 1, rawPdu: new Uint8Array() }),
      mk(2, 1000, { unit: 1, fn: 6, isException: false, addr: 0x1084, value: 0x0032, rawPdu: new Uint8Array() }),
      mk(1, 0, { unit: 1, fn: 3, isException: false, addr: 0x1084, count: 1, rawPdu: new Uint8Array() })
    ];

    expect(evaluateTask10(historyNewestFirst, v)).toBe(true);
  });

  it('does not accept a voltage register as proof of reading current for task 10', () => {
    const v = getVariant(1);
    const base = Date.now();
    const mk = (id: number, tOffset: number, reqPdu: Exchange['reqPdu']): Exchange => ({
      id,
      timestamp: base + tOffset,
      origin: 'student',
      codec: 'rtu',
      txFrame: new Uint8Array(),
      reqPdu,
      elapsedMs: 10,
      ok: true
    });

    const history: Exchange[] = [
      mk(1, 0, { unit: 1, fn: 3, isException: false, addr: 0x1084, count: 1, rawPdu: new Uint8Array() }),
      mk(2, 1000, { unit: 1, fn: 6, isException: false, addr: 0x1084, value: 0x0032, rawPdu: new Uint8Array() }),
      // V L1-N (0x0280) is a voltage register, not current — must not satisfy the task.
      mk(3, 2000, { unit: 1, fn: 3, isException: false, addr: 0x0280, count: 1, rawPdu: new Uint8Array() })
    ];

    expect(evaluateTask10(history, v)).toBe(false);
  });
});
