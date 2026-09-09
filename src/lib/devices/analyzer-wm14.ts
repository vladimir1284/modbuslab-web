import { PhysicalProcess } from './process.js';
import type { SlaveHandler } from './slave.js';

export class AnalyzerWm14 implements SlaveHandler {
  readonly station = 1;
  private ram = new Uint16Array(0x300); // 0x000..0x2FF
  private eeprom = new Uint16Array(0x100); // 0x1000..0x10FF -> mapped to index addr - 0x1000

  public lockEnabled = false;
  public password = 0x0000;
  private unlockedUntilMs = 0;
  private currentStation = 1;

  constructor(public process: PhysicalProcess) {
    // Initial EEPROM values
    this.setEepromWord(0x1080, 0x0000); // Password
    this.setEepromWord(0x1082, 0x000a); // Vt_ratio = 10 (1.0)
    this.setEepromWord(0x1084, 0x0019); // Ct_ratio = 25
    this.setEepromWord(0x1086, 0x000f); // P_int = 15 min
    this.setEepromWord(0x1088, 0x0002); // Filter_rng = 2%
    this.setEepromWord(0x108a, 0x0001); // Filter_coe = 1
    this.setEepromWord(0x108c, 0x0001); // Address = 1
    this.setEepromWord(0x108e, 0x00f0); // Set_vup = 240 V
  }

  get stationNumber(): number {
    return this.currentStation;
  }

  getEepromWord(byteAddr: number): number {
    const idx = (byteAddr - 0x1000) >> 1;
    return this.eeprom[idx] ?? 0;
  }

  setEepromWord(byteAddr: number, val: number): void {
    const idx = (byteAddr - 0x1000) >> 1;
    if (idx >= 0 && idx < this.eeprom.length) {
      this.eeprom[idx] = val & 0xffff;
    }
  }

  updateRamFromProcess(nowMs: number): void {
    const st = this.process.state;
    const vt10 = this.getEepromWord(0x1082);
    const ct = this.getEepromWord(0x1084);
    const vt = vt10 / 10.0;

    // Convert engineering values to raw register values (which are multiplied by CT/VT in engineering calculation)
    // Formula inversion:
    // V_LN (VN): reg = V / (0.1 * VT) = V * 10 / VT
    // V_LL (VC): reg = V / VT
    // A (A): reg = I * 1000 / CT
    // P (P): reg = P_W * 10 / (CT * VT)
    // P_sum (Psum): reg = P_W / (CT * VT)
    // f (H): reg = f * 10
    // PF: LSB/MSB byte encoding

    const v1_raw = Math.round((st.V[0] * 10) / vt);
    const v2_raw = Math.round((st.V[1] * 10) / vt);
    const v3_raw = Math.round((st.V[2] * 10) / vt);

    const a1_raw = Math.round((st.I[0] * 1000) / ct);
    const a2_raw = Math.round((st.I[1] * 1000) / ct);
    const a3_raw = Math.round((st.I[2] * 1000) / ct);

    const p1_w = st.V[0] * st.I[0] * Math.cos(st.phi[0]);
    const p2_w = st.V[1] * st.I[1] * Math.cos(st.phi[1]);
    const p3_w = st.V[2] * st.I[2] * Math.cos(st.phi[2]);

    const p1_raw = Math.round((p1_w * 10) / (ct * vt));
    const p2_raw = Math.round((p2_w * 10) / (ct * vt));
    const p3_raw = Math.round((p3_w * 10) / (ct * vt));

    // Phasors for line-to-line voltages (120 deg apart)
    const v1_c = { r: st.V[0], i: 0 };
    const v2_c = { r: st.V[1] * Math.cos((-2 * Math.PI) / 3), i: st.V[1] * Math.sin((-2 * Math.PI) / 3) };
    const v3_c = { r: st.V[2] * Math.cos((2 * Math.PI) / 3), i: st.V[2] * Math.sin((2 * Math.PI) / 3) };

    const v12 = Math.hypot(v1_c.r - v2_c.r, v1_c.i - v2_c.i);
    const v23 = Math.hypot(v2_c.r - v3_c.r, v2_c.i - v3_c.i);
    const v31 = Math.hypot(v3_c.r - v1_c.r, v3_c.i - v1_c.i);

    const v12_raw = Math.round(v12 / vt);
    const v23_raw = Math.round(v23 / vt);
    const v31_raw = Math.round(v31 / vt);
    const vll_sum_raw = Math.round((v12 + v23 + v31) / 3 / vt);

    // Neutral current
    const i1_c = { r: st.I[0] * Math.cos(st.phi[0]), i: st.I[0] * Math.sin(st.phi[0]) };
    const i2_c = {
      r: st.I[1] * Math.cos((-2 * Math.PI) / 3 + st.phi[1]),
      i: st.I[1] * Math.sin((-2 * Math.PI) / 3 + st.phi[1])
    };
    const i3_c = {
      r: st.I[2] * Math.cos((2 * Math.PI) / 3 + st.phi[2]),
      i: st.I[2] * Math.sin((2 * Math.PI) / 3 + st.phi[2])
    };
    const i_n = Math.hypot(i1_c.r + i2_c.r + i3_c.r, i1_c.i + i2_c.i + i3_c.i);
    const an_raw = Math.round((i_n * 1000) / ct);

    const w_sum = p1_w + p2_w + p3_w;
    const w_sum_raw = Math.round(w_sum / (ct * vt));

    const va1_w = st.V[0] * st.I[0];
    const va2_w = st.V[1] * st.I[1];
    const va3_w = st.V[2] * st.I[2];
    const va1_raw = Math.round((va1_w * 10) / (ct * vt));
    const va2_raw = Math.round((va2_w * 10) / (ct * vt));
    const va3_raw = Math.round((va3_w * 10) / (ct * vt));
    const vasum_raw = Math.round((va1_w + va2_w + va3_w) / (ct * vt));

    const var1_w = st.V[0] * st.I[0] * Math.sin(st.phi[0]);
    const var2_w = st.V[1] * st.I[1] * Math.sin(st.phi[1]);
    const var3_w = st.V[2] * st.I[2] * Math.sin(st.phi[2]);
    const var1_raw = Math.round((var1_w * 10) / (ct * vt));
    const var2_raw = Math.round((var2_w * 10) / (ct * vt));
    const var3_raw = Math.round((var3_w * 10) / (ct * vt));
    const varsum_raw = Math.round((var1_w + var2_w + var3_w) / (ct * vt));

    const hz_raw = Math.round(st.f * 10);

    // PF encoding function
    const encodePfByte = (phi: number) => {
      const pfVal = Math.cos(phi);
      const mag = Math.round(Math.abs(pfVal) * 100) & 0x7f;
      const signBit = phi < 0 ? 0x80 : 0x00; // bit 7: 0 = ind, 1 = cap
      return mag | signBit;
    };

    const pf1_b = encodePfByte(st.phi[0]);
    const pf2_b = encodePfByte(st.phi[1]);
    const pf3_b = encodePfByte(st.phi[2]);
    const pf_sum_b = encodePfByte(Math.atan2(var1_w + var2_w + var3_w, w_sum));

    const pf12_word = (pf2_b << 8) | pf1_b;
    const pf3sum_word = (pf_sum_b << 8) | pf3_b;

    // Write RAM measurements according to WM14 byte addresses
    this.setRamWord(0x0280, v1_raw);
    this.setRamWord(0x0282, a1_raw);
    this.setRamWord(0x0284, p1_raw);
    this.setRamWord(0x0286, v2_raw);
    this.setRamWord(0x0288, a2_raw);
    this.setRamWord(0x028a, p2_raw);
    this.setRamWord(0x028c, v3_raw);
    this.setRamWord(0x028e, a3_raw);
    this.setRamWord(0x0290, p3_raw);
    this.setRamWord(0x0292, v12_raw);
    this.setRamWord(0x0294, v23_raw);
    this.setRamWord(0x0296, v31_raw);
    this.setRamWord(0x0298, vll_sum_raw);
    this.setRamWord(0x029a, Math.max(a1_raw, a2_raw, a3_raw));
    this.setRamWord(0x029c, an_raw);
    this.setRamWord(0x029e, w_sum_raw);
    this.setRamWord(0x02a0, va1_raw);
    this.setRamWord(0x02a2, va2_raw);
    this.setRamWord(0x02a4, va3_raw);
    this.setRamWord(0x02a6, vasum_raw);
    this.setRamWord(0x02a8, var1_raw);
    this.setRamWord(0x02aa, var2_raw);
    this.setRamWord(0x02ac, var3_raw);
    this.setRamWord(0x02ae, varsum_raw);
    this.setRamWord(0x02b0, w_sum_raw);
    this.setRamWord(0x02b2, vasum_raw);
    this.setRamWord(0x02b4, w_sum_raw);
    this.setRamWord(0x02b6, 0);
    this.setRamWord(0x02b8, hz_raw);
    this.setRamWord(0x02ba, Math.max(a1_raw, a2_raw, a3_raw));
    this.setRamWord(0x02bc, pf12_word);
    this.setRamWord(0x02be, pf3sum_word);
    this.setRamWord(0x02c0, a1_raw);
    this.setRamWord(0x02c2, a2_raw);
    this.setRamWord(0x02c4, a3_raw);

    // 32-bit registers (kWh, varh, hourmeter)
    const kwh_raw = Math.round(st.kWh * 10);
    const varh_raw = Math.round(st.varh * 10);
    const hm_raw = Math.round(st.hourmeterHours * 100);

    this.setRamDword(0x02c6, kwh_raw);
    this.setRamDword(0x02ca, varh_raw);
    this.setRamDword(0x02ce, hm_raw);

    // Alarm byte at 0x027E
    let alarmByte = 0;
    const vMax = Math.max(st.V[0], st.V[1], st.V[2]);
    const vUpThreshold = this.getEepromWord(0x108e);
    if (vMax > vUpThreshold) alarmByte |= 0x01; // bit 0: voltage alarm
    this.ram[0x027e >> 1] = alarmByte;
  }

  private setRamWord(byteAddr: number, val: number): void {
    const idx = byteAddr >> 1;
    if (idx >= 0 && idx < this.ram.length) {
      this.ram[idx] = val & 0xffff;
    }
  }

  private setRamDword(byteAddr: number, val: number): void {
    const idx = byteAddr >> 1;
    if (idx >= 0 && idx + 1 < this.ram.length) {
      this.ram[idx] = (val >> 16) & 0xffff;
      this.ram[idx + 1] = val & 0xffff;
    }
  }

  private getWordAtByteAddr(byteAddr: number, nowMs: number): number | null {
    if (byteAddr % 2 !== 0) return null; // Addresses must be even

    if (byteAddr >= 0x027e && byteAddr <= 0x02d0) {
      return this.ram[byteAddr >> 1] ?? 0;
    }
    if (byteAddr >= 0x1080 && byteAddr <= 0x108e) {
      return this.getEepromWord(byteAddr);
    }
    return null;
  }

  // Modbus Slave Handlers
  readHoldingRegisters(addr: number, count: number): Uint8Array | number {
    return this.readRegisters(addr, count, 0x03);
  }

  readInputRegisters(addr: number, count: number): Uint8Array | number {
    return this.readRegisters(addr, count, 0x04);
  }

  private readRegisters(byteAddr: number, count: number, fn: number): Uint8Array | number {
    if (byteAddr % 2 !== 0) {
      return 0x02; // ILLEGAL DATA ADDRESS
    }
    const res = new Uint8Array(2 + count * 2);
    res[0] = fn;
    res[1] = count * 2;
    const view = new DataView(res.buffer);

    for (let i = 0; i < count; i++) {
      const curAddr = byteAddr + i * 2;
      const val = this.getWordAtByteAddr(curAddr, Date.now());
      if (val === null) {
        return 0x02; // ILLEGAL DATA ADDRESS
      }
      view.setUint16(2 + i * 2, val, false);
    }
    return res;
  }

  writeSingleRegister(byteAddr: number, value: number): Uint8Array | number {
    if (byteAddr % 2 !== 0) return 0x02;

    // EEPROM parameters range
    if (byteAddr < 0x1080 || byteAddr > 0x108e) {
      return 0x02; // RAM measures are not writable
    }

    const now = Date.now();
    if (byteAddr === 0x1080) { // Password
      this.setEepromWord(0x1080, value);
      if (value === this.password) {
        this.unlockedUntilMs = now + 120000; // Unlock for 120s
      }
      return this.makeWriteResponse(0x06, byteAddr, value);
    }

    if (this.lockEnabled && now > this.unlockedUntilMs) {
      return 0x06; // SLAVE DEVICE BUSY
    }

    // Validate value ranges
    switch (byteAddr) {
      case 0x1082: // Vt_ratio (1..999)
        if (value < 1 || value > 999) return 0x03; // ILLEGAL DATA VALUE
        break;
      case 0x1084: // Ct_ratio (1..999)
        if (value < 1 || value > 999) return 0x03;
        break;
      case 0x1086: // P_int (1..60)
        if (value < 1 || value > 60) return 0x03;
        break;
      case 0x1088: // Filter_rng (1..100)
        if (value < 1 || value > 100) return 0x03;
        break;
      case 0x108a: // Filter_coe (1..100)
        if (value < 1 || value > 100) return 0x03;
        break;
      case 0x108c: // Address (1..247)
        if (value < 1 || value > 247) return 0x03;
        break;
      case 0x108e: // Set_vup (1..999)
        if (value < 1 || value > 999) return 0x03;
        break;
    }

    const oldStation = this.currentStation;
    this.setEepromWord(byteAddr, value);

    const res = this.makeWriteResponse(0x06, byteAddr, value);

    if (byteAddr === 0x108c) {
      // Address change takes effect AFTER response
      this.currentStation = value;
    }

    return res;
  }

  writeMultipleRegisters(byteAddr: number, count: number, bytes: number, data: Uint8Array): Uint8Array | number {
    if (byteAddr % 2 !== 0) return 0x02;
    if (byteAddr < 0x1080 || byteAddr + count * 2 - 2 > 0x108e) {
      return 0x02;
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let i = 0; i < count; i++) {
      const addr = byteAddr + i * 2;
      const val = view.getUint16(i * 2, false);
      const res = this.writeSingleRegister(addr, val);
      if (typeof res === 'number') return res;
    }

    const res = new Uint8Array(5);
    res[0] = 0x10;
    const resView = new DataView(res.buffer);
    resView.setUint16(1, byteAddr, false);
    resView.setUint16(3, count, false);
    return res;
  }

  private makeWriteResponse(fn: number, byteAddr: number, val: number): Uint8Array {
    const res = new Uint8Array(5);
    res[0] = fn;
    const view = new DataView(res.buffer);
    view.setUint16(1, byteAddr, false);
    view.setUint16(3, val, false);
    return res;
  }

  readExceptionStatus(): Uint8Array | number {
    const res = new Uint8Array(2);
    res[0] = 0x07;
    res[1] = this.ram[0x027e >> 1] & 0xff;
    return res;
  }

  diagnostics(subfn: number, data: number): Uint8Array | number {
    const res = new Uint8Array(5);
    res[0] = 0x08;
    const view = new DataView(res.buffer);
    view.setUint16(1, subfn, false);
    view.setUint16(3, subfn === 0x0000 ? data : 0, false);
    return res;
  }

  getCommEventCounter(): Uint8Array | number {
    const res = new Uint8Array(5);
    res[0] = 0x0b;
    const view = new DataView(res.buffer);
    view.setUint16(1, 0xffff, false);
    view.setUint16(3, 1, false);
    return res;
  }
}
