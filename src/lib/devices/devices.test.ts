import { describe, expect, it } from 'vitest';
import { AnalyzerWm14 } from './analyzer-wm14.js';
import { PlcMasterK } from './plc-masterk.js';
import { PhysicalProcess } from './process.js';

describe('PLC Virtual Master-K120S', () => {
  it('handles coil write and register read bit mapping (P40 coil to word P0004 bit 0)', () => {
    const plc = new PlcMasterK();
    // fn 05 write coil P40 (0x0040) = 0xFF00
    const resWrite = plc.writeSingleCoil(0x0040, 0xff00);
    expect(resWrite).toBeInstanceOf(Uint8Array);

    // fn 03 read word 0x0004 (contains bits P040..P04F)
    const resRead = plc.readHoldingRegisters(0x0004, 1);
    expect(resRead).toBeInstanceOf(Uint8Array);
    if (resRead instanceof Uint8Array) {
      const view = new DataView(resRead.buffer, resRead.byteOffset, resRead.byteLength);
      const val = view.getUint16(2, false);
      expect(val & 0x0001).toBe(1); // Bit 0 (P40) is set
    }
  });

  it('rejects write to physical input address', () => {
    const plc = new PlcMasterK();
    const res = plc.writeSingleCoil(0x0000, 0xff00);
    expect(res).toBe(0x02); // ILLEGAL DATA ADDRESS
  });

  it('returns exception 02 for write to Area F (read-only)', () => {
    const plc = new PlcMasterK();
    const res = plc.writeSingleRegister(0x4000, 0x1234);
    expect(res).toBe(0x02);
  });
});

describe('Analyzer Virtual Carlo Gavazzi WM14', () => {
  it('reads 12 registers from 0x0280 correctly and handles CT/VT rescaling', () => {
    const process = new PhysicalProcess();
    const analyzer = new AnalyzerWm14(process);
    analyzer.updateRamFromProcess(Date.now());

    // Read 12 registers starting at byte address 0x0280
    const res1 = analyzer.readHoldingRegisters(0x0280, 12);
    expect(res1).toBeInstanceOf(Uint8Array);

    // Write Ct_ratio = 50 (0x0032) to 0x1084 with fn 06
    const resWriteCt = analyzer.writeSingleRegister(0x1084, 0x0032);
    expect(resWriteCt).toBeInstanceOf(Uint8Array);

    // Read CT ratio back with fn 03 from 0x1082 (2 registers = Vt_ratio & Ct_ratio)
    const resEeprom = analyzer.readHoldingRegisters(0x1082, 2);
    expect(resEeprom).toBeInstanceOf(Uint8Array);
    if (resEeprom instanceof Uint8Array) {
      const view = new DataView(resEeprom.buffer, resEeprom.byteOffset, resEeprom.byteLength);
      expect(view.getUint16(2, false)).toBe(10); // Vt_ratio = 10
      expect(view.getUint16(4, false)).toBe(50); // Ct_ratio = 50
    }
  });

  it('returns exception 02 for odd byte addresses', () => {
    const process = new PhysicalProcess();
    const analyzer = new AnalyzerWm14(process);
    const res = analyzer.readHoldingRegisters(0x0281, 1);
    expect(res).toBe(0x02);
  });

  it('keeps the raw current register unchanged after Ct_ratio is rewritten (§5.2 rescaling task)', () => {
    const process = new PhysicalProcess();
    process.state.V = [220, 220, 220];
    process.state.I = [5, 5, 5];
    const analyzer = new AnalyzerWm14(process);
    analyzer.updateRamFromProcess(Date.now());

    const before = analyzer.readHoldingRegisters(0x0282, 1) as Uint8Array;
    const beforeRaw = new DataView(before.buffer, before.byteOffset, before.byteLength).getUint16(2, false);

    analyzer.writeSingleRegister(0x1084, 0x0032); // Ct_ratio = 50
    analyzer.updateRamFromProcess(Date.now());

    const after = analyzer.readHoldingRegisters(0x0282, 1) as Uint8Array;
    const afterRaw = new DataView(after.buffer, after.byteOffset, after.byteLength).getUint16(2, false);

    expect(afterRaw).toBe(beforeRaw);

    const decodedWithOldCt = (beforeRaw / 1000) * 25;
    const decodedWithNewCt = (afterRaw / 1000) * 50;
    expect(decodedWithNewCt).toBeCloseTo(decodedWithOldCt * 2, 5);
  });

  it('handles station address change correctly', () => {
    const process = new PhysicalProcess();
    const analyzer = new AnalyzerWm14(process);
    expect(analyzer.stationNumber).toBe(1);

    // fn 06 write station address = 3 to 0x108c
    const res = analyzer.writeSingleRegister(0x108c, 3);
    expect(res).toBeInstanceOf(Uint8Array);
    expect(analyzer.stationNumber).toBe(3);
  });
});
