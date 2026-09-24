import { AreaMemory } from './memory.js';
import type { SlaveHandler } from './slave.js';

export type LadderRule =
  | { out: number; op: 'copy'; in: number }
  | { out: number; op: 'and'; in: [number, number] }
  | { out: number; op: 'or'; in: [number, number] }
  | { out: number; op: 'not'; in: number }
  | { out: number; op: 'blink'; periodMs: number };

export interface PlcConfig {
  inputCount: number;  // default 18
  outputCount: number; // default 12
  inputBase: number;   // default 0x0000
  outputBase: number;  // default 0x0040
  ledColor: 'red' | 'green';
  runProgram: boolean;
  rules: LadderRule[];
}

export class PlcMasterK implements SlaveHandler {
  readonly station = 2;
  private areas: Map<number, AreaMemory> = new Map();
  public config: PlcConfig = {
    inputCount: 18,
    outputCount: 12,
    inputBase: 0x0000,
    outputBase: 0x0040,
    ledColor: 'red',
    runProgram: false,
    rules: [
      { out: 0x0040, op: 'copy', in: 0x0000 },                 // O1 = I1
      { out: 0x0041, op: 'and', in: [0x0001, 0x0002] },        // O2 = I2 AND I3
      { out: 0x0042, op: 'not', in: 0x0003 },                 // O3 = NOT I4
      { out: 0x004b, op: 'blink', periodMs: 1000 }            // O12 = blink 1000ms
    ]
  };

  private commEventCounter = 0;

  // Diagnostic counters for fn 08 subfn 0x000B..0x0012 (README §4.3).
  private busMessageCount = 0;
  private busCommErrorCount = 0;
  private busExceptionErrorCount = 0;
  private slaveMessageCount = 0;
  private slaveNoResponseCount = 0;
  private slaveNakCount = 0;
  private slaveBusyCount = 0;
  private busCharOverrunCount = 0;

  private recordSuccess(): void {
    this.busMessageCount++;
    this.slaveMessageCount++;
    this.commEventCounter++;
  }

  private recordException(code: number): number {
    this.busMessageCount++;
    this.slaveMessageCount++;
    this.busExceptionErrorCount++;
    return code;
  }

  constructor() {
    // Areas 0..8 according to Master-K memory map
    // Nibble high: 0=P, 1=M, 2=L, 3=K, 4=F(RO), 5=T, 6=C, 7=S, 8=D
    for (let i = 0; i <= 8; i++) {
      const isReadOnly = i === 4; // Area F is read-only
      this.areas.set(i, new AreaMemory(1024, isReadOnly));
    }
    this.randomizeInputs();
  }

  randomizeInputs(): void {
    for (let i = 0; i < this.config.inputCount; i++) {
      this.setInputBit(i, Math.random() < 0.5);
    }
    if (this.config.inputCount >= 2) {
      const allTrue = Array.from({ length: this.config.inputCount }, (_, i) => this.getInputBit(i)).every(Boolean);
      const allFalse = Array.from({ length: this.config.inputCount }, (_, i) => this.getInputBit(i)).every((b) => !b);
      if (allTrue) {
        this.setInputBit(0, false);
      } else if (allFalse) {
        this.setInputBit(0, true);
      }
    }
  }

  private getArea(addr: number): { area: AreaMemory; offset: number } | null {
    const areaId = (addr >> 12) & 0x0f;
    const offset = addr & 0x0fff;
    const area = this.areas.get(areaId);
    if (!area) return null;
    return { area, offset };
  }

  // Physical input toggle from UI
  setInputBit(bitIndex: number, value: boolean): void {
    const bitAddr = this.config.inputBase + bitIndex;
    const loc = this.getArea(bitAddr);
    if (loc) {
      loc.area.setBit(loc.offset, value);
    }
  }

  getInputBit(bitIndex: number): boolean {
    const bitAddr = this.config.inputBase + bitIndex;
    const loc = this.getArea(bitAddr);
    return loc ? loc.area.getBit(loc.offset) : false;
  }

  getOutputBit(bitIndex: number): boolean {
    const bitAddr = this.config.outputBase + bitIndex;
    const loc = this.getArea(bitAddr);
    return loc ? loc.area.getBit(loc.offset) : false;
  }

  private isInputPhysicalAddr(bitAddr: number): boolean {
    return bitAddr >= this.config.inputBase && bitAddr < this.config.inputBase + this.config.inputCount;
  }

  stepScan(nowMs: number): void {
    if (!this.config.runProgram) return;

    for (const rule of this.config.rules) {
      let val = false;
      switch (rule.op) {
        case 'copy':
          val = this.readBitValue(rule.in);
          break;
        case 'and':
          val = this.readBitValue(rule.in[0]) && this.readBitValue(rule.in[1]);
          break;
        case 'or':
          val = this.readBitValue(rule.in[0]) || this.readBitValue(rule.in[1]);
          break;
        case 'not':
          val = !this.readBitValue(rule.in);
          break;
        case 'blink':
          val = Math.floor(nowMs / (rule.periodMs / 2)) % 2 === 0;
          break;
      }
      this.writeBitValueInternal(rule.out, val);
    }
  }

  private readBitValue(bitAddr: number): boolean {
    const loc = this.getArea(bitAddr);
    return loc ? loc.area.getBit(loc.offset) : false;
  }

  private writeBitValueInternal(bitAddr: number, value: boolean): void {
    const loc = this.getArea(bitAddr);
    if (loc && !loc.area.readOnly) {
      loc.area.setBit(loc.offset, value);
    }
  }

  // Modbus Slave Handlers
  readCoils(addr: number, count: number): Uint8Array | number { // fn 01
    return this.readBits(addr, count, 0x01);
  }

  readDiscreteInputs(addr: number, count: number): Uint8Array | number { // fn 02
    return this.readBits(addr, count, 0x02);
  }

  private readBits(addr: number, count: number, fn: number): Uint8Array | number {
    const loc = this.getArea(addr);
    if (!loc || loc.offset + count > loc.area.sizeWords * 16) {
      return this.recordException(0x02); // ILLEGAL DATA ADDRESS
    }
    const byteCount = Math.ceil(count / 8);
    const res = new Uint8Array(2 + byteCount);
    res[0] = fn;
    res[1] = byteCount;

    for (let i = 0; i < count; i++) {
      const bit = loc.area.getBit(loc.offset + i);
      if (bit) {
        const byteIndex = 2 + Math.floor(i / 8);
        const bitOffset = i % 8;
        res[byteIndex] |= (1 << bitOffset);
      }
    }
    this.recordSuccess();
    return res;
  }

  readHoldingRegisters(addr: number, count: number): Uint8Array | number { // fn 03
    return this.readRegisters(addr, count, 0x03);
  }

  readInputRegisters(addr: number, count: number): Uint8Array | number { // fn 04
    return this.readRegisters(addr, count, 0x04);
  }

  private readRegisters(addr: number, count: number, fn: number): Uint8Array | number {
    const loc = this.getArea(addr);
    if (!loc || loc.offset + count > loc.area.sizeWords) {
      return this.recordException(0x02); // ILLEGAL DATA ADDRESS
    }
    const res = new Uint8Array(2 + count * 2);
    res[0] = fn;
    res[1] = count * 2;
    const view = new DataView(res.buffer);

    for (let i = 0; i < count; i++) {
      const val = loc.area.getWord(loc.offset + i);
      view.setUint16(2 + i * 2, val, false);
    }
    this.recordSuccess();
    return res;
  }

  writeSingleCoil(addr: number, value: number): Uint8Array | number { // fn 05
    if (this.isInputPhysicalAddr(addr)) {
      return this.recordException(0x02); // Physical inputs cannot be written
    }
    const loc = this.getArea(addr);
    if (!loc || loc.offset >= loc.area.sizeWords * 16) {
      return this.recordException(0x02); // ILLEGAL DATA ADDRESS
    }
    if (loc.area.readOnly) {
      return this.recordException(0x02);
    }
    loc.area.setBit(loc.offset, value === 0xff00);

    const res = new Uint8Array(5);
    res[0] = 0x05;
    const view = new DataView(res.buffer);
    view.setUint16(1, addr, false);
    view.setUint16(3, value, false);
    this.recordSuccess();
    return res;
  }

  writeSingleRegister(addr: number, value: number): Uint8Array | number { // fn 06
    const loc = this.getArea(addr);
    if (!loc || loc.offset >= loc.area.sizeWords) {
      return this.recordException(0x02); // ILLEGAL DATA ADDRESS
    }
    if (loc.area.readOnly) {
      return this.recordException(0x02);
    }
    loc.area.setWord(loc.offset, value);

    const res = new Uint8Array(5);
    res[0] = 0x06;
    const view = new DataView(res.buffer);
    view.setUint16(1, addr, false);
    view.setUint16(3, value, false);
    this.recordSuccess();
    return res;
  }

  readExceptionStatus(): Uint8Array | number { // fn 07
    const res = new Uint8Array(2);
    res[0] = 0x07;
    res[1] = 0x00; // Status byte
    this.recordSuccess();
    return res;
  }

  diagnostics(subfn: number, data: number): Uint8Array | number { // fn 08
    const res = new Uint8Array(5);
    res[0] = 0x08;
    const view = new DataView(res.buffer);
    view.setUint16(1, subfn, false);

    switch (subfn) {
      case 0x0000: // Return Query Data
        view.setUint16(3, data, false);
        break;
      case 0x000b: // Return Bus Message Count
        view.setUint16(3, this.busMessageCount & 0xffff, false);
        break;
      case 0x000c: // Return Bus Communication Error Count
        view.setUint16(3, this.busCommErrorCount & 0xffff, false);
        break;
      case 0x000d: // Return Bus Exception Error Count
        view.setUint16(3, this.busExceptionErrorCount & 0xffff, false);
        break;
      case 0x000e: // Return Slave Message Count
        view.setUint16(3, this.slaveMessageCount & 0xffff, false);
        break;
      case 0x000f: // Return Slave No Response Count
        view.setUint16(3, this.slaveNoResponseCount & 0xffff, false);
        break;
      case 0x0010: // Return Slave NAK Count
        view.setUint16(3, this.slaveNakCount & 0xffff, false);
        break;
      case 0x0011: // Return Slave Busy Count
        view.setUint16(3, this.slaveBusyCount & 0xffff, false);
        break;
      case 0x0012: // Return Bus Character Overrun Count
        view.setUint16(3, this.busCharOverrunCount & 0xffff, false);
        break;
      default:
        view.setUint16(3, 0, false);
    }
    this.recordSuccess();
    return res;
  }

  getCommEventCounter(): Uint8Array | number { // fn 11
    const res = new Uint8Array(5);
    res[0] = 0x0b;
    const view = new DataView(res.buffer);
    view.setUint16(1, 0xffff, false); // status
    view.setUint16(3, this.commEventCounter, false);
    return res;
  }

  writeMultipleCoils(addr: number, count: number, bytes: number, data: Uint8Array): Uint8Array | number { // fn 15
    for (let i = 0; i < count; i++) {
      if (this.isInputPhysicalAddr(addr + i)) {
        return this.recordException(0x02);
      }
    }
    const loc = this.getArea(addr);
    if (!loc || loc.offset + count > loc.area.sizeWords * 16) {
      return this.recordException(0x02);
    }
    if (loc.area.readOnly) {
      return this.recordException(0x02);
    }

    for (let i = 0; i < count; i++) {
      const byteIdx = Math.floor(i / 8);
      const bitIdx = i % 8;
      const bitVal = (data[byteIdx] & (1 << bitIdx)) !== 0;
      loc.area.setBit(loc.offset + i, bitVal);
    }

    const res = new Uint8Array(5);
    res[0] = 0x0f;
    const view = new DataView(res.buffer);
    view.setUint16(1, addr, false);
    view.setUint16(3, count, false);
    this.recordSuccess();
    return res;
  }

  writeMultipleRegisters(addr: number, count: number, bytes: number, data: Uint8Array): Uint8Array | number { // fn 16
    const loc = this.getArea(addr);
    if (!loc || loc.offset + count > loc.area.sizeWords) {
      return this.recordException(0x02);
    }
    if (loc.area.readOnly) {
      return this.recordException(0x02);
    }
    const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);

    for (let i = 0; i < count; i++) {
      const val = dataView.getUint16(i * 2, false);
      loc.area.setWord(loc.offset + i, val);
    }

    const res = new Uint8Array(5);
    res[0] = 0x10;
    const view = new DataView(res.buffer);
    view.setUint16(1, addr, false);
    view.setUint16(3, count, false);
    this.recordSuccess();
    return res;
  }
}
