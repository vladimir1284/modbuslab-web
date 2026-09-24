import { describe, expect, it } from 'vitest';
import { AnalyzerWm14 } from './analyzer-wm14.js';
import { PlcMasterK } from './plc-masterk.js';
import { PhysicalProcess } from './process.js';
import { VirtualBus } from './bus.js';

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

  it('tracks fn 08 diagnostic counters for subfn 0x000B/0x000D/0x000E (README §4.3)', () => {
    const plc = new PlcMasterK();
    plc.readHoldingRegisters(0x0004, 1); // 1 successful message
    plc.writeSingleRegister(0x4000, 0x1234); // 1 exception (Area F read-only)

    const busMsgRes = plc.diagnostics(0x000b, 0) as Uint8Array;
    const excRes = plc.diagnostics(0x000d, 0) as Uint8Array;
    const slaveMsgRes = plc.diagnostics(0x000e, 0) as Uint8Array;

    const readCount = (r: Uint8Array) => new DataView(r.buffer, r.byteOffset, r.byteLength).getUint16(3, false);

    expect(readCount(busMsgRes)).toBe(2); // read + write(exception), counted before this diagnostics call itself
    expect(readCount(excRes)).toBeGreaterThanOrEqual(1);
    expect(readCount(slaveMsgRes)).toBeGreaterThanOrEqual(2);
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

  it('initializes inputs in a randomized state and supports re-randomization', () => {
    const plc = new PlcMasterK();
    const inputs1 = Array.from({ length: plc.config.inputCount }, (_, i) => plc.getInputBit(i));
    const hasTrue1 = inputs1.some((b) => b);
    const hasFalse1 = inputs1.some((b) => !b);

    expect(hasTrue1).toBe(true);
    expect(hasFalse1).toBe(true);

    plc.randomizeInputs();
    const inputs2 = Array.from({ length: plc.config.inputCount }, (_, i) => plc.getInputBit(i));
    const hasTrue2 = inputs2.some((b) => b);
    const hasFalse2 = inputs2.some((b) => !b);

    expect(hasTrue2).toBe(true);
    expect(hasFalse2).toBe(true);
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

  it('echoes the MBAP tid back on a TCP response (§4.2)', async () => {
    const bus = new VirtualBus();
    // fn 03 read 1 register at 0x0004, wrapped in an MBAP frame with tid = 0x00AB
    const pdu = new Uint8Array([0x03, 0x00, 0x04, 0x00, 0x01]);
    const frame = new Uint8Array(7 + pdu.length);
    const view = new DataView(frame.buffer);
    view.setUint16(0, 0x00ab, false); // tid
    view.setUint16(2, 0, false); // protocol id
    view.setUint16(4, 1 + pdu.length, false); // length
    frame[6] = 2; // unit (PLC)
    frame.set(pdu, 7);

    const res = await bus.processFrame(frame, 'tcp');
    expect(res.timeout).toBe(false);
    const resTid = new DataView(res.frame!.buffer, res.frame!.byteOffset, res.frame!.byteLength).getUint16(0, false);
    expect(resTid).toBe(0x00ab);
  });

  it('sets the current alarm bit (bit 1 of 0x027E) when phase current exceeds the threshold', () => {
    const process = new PhysicalProcess();
    process.state.V = [220, 220, 220];
    process.state.I = [25, 25, 25]; // over the ALARM_I_THRESHOLD = 20 A picked for this lab
    const analyzer = new AnalyzerWm14(process);
    analyzer.updateRamFromProcess(Date.now());

    const res = analyzer.readExceptionStatus() as Uint8Array;
    expect(res[1] & 0x02).toBe(0x02);
  });

  it('computes block-window demand averages for the dmd registers (§5.2, simplified)', () => {
    const process = new PhysicalProcess();
    process.state.V = [220, 220, 220];
    process.state.I = [5, 5, 5];
    process.state.phi = [0, 0, 0];
    const analyzer = new AnalyzerWm14(process);

    const t0 = 1_000_000;
    analyzer.updateRamFromProcess(t0); // opens the demand window; no block has closed yet

    const before = analyzer.readHoldingRegisters(0x02b0, 1) as Uint8Array;
    const beforeVal = new DataView(before.buffer, before.byteOffset, before.byteLength).getUint16(2, false);
    expect(beforeVal).toBe(0);

    analyzer.updateRamFromProcess(t0 + 15 * 60000); // P_int default = 15 min -> closes the block

    const after = analyzer.readHoldingRegisters(0x02b0, 1) as Uint8Array;
    const afterVal = new DataView(after.buffer, after.byteOffset, after.byteLength).getUint16(2, false);
    // W dmd, type P∑: reg = P_W / (CT*VT). Steady 220V * 5A * 3 phases = 3300 W, CT=25, VT=1.
    expect(afterVal).toBe(132);
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
