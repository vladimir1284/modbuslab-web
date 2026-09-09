import { getCodec } from '../modbus/codec.js';
import type { CodecName, EncodeCtx } from '../modbus/types.js';
import { AnalyzerWm14 } from './analyzer-wm14.js';
import { PlcMasterK } from './plc-masterk.js';
import { PhysicalProcess } from './process.js';
import { ModbusSlave } from './slave.js';

export interface FaultConfig {
  lossProbability: number;      // 0..1
  corruptProbability: number;   // 0..1
  extraDelayMs: number;
}

export interface BusResponse {
  frame?: Uint8Array;
  elapsedMs: number;
  timeout: boolean;
}

export class VirtualBus {
  public process = new PhysicalProcess();
  public plc = new PlcMasterK();
  public analyzer = new AnalyzerWm14(this.process);

  public delayMs = 40;
  public timeoutMs = 300;
  public faults: FaultConfig = {
    lossProbability: 0,
    corruptProbability: 0,
    extraDelayMs: 0
  };

  private slaves = new Map<number, ModbusSlave>();

  constructor() {
    this.slaves.set(this.plc.station, new ModbusSlave(this.plc.station, this.plc));
  }

  private getSlaveForStation(station: number): ModbusSlave | null {
    if (station === this.plc.station) {
      return this.slaves.get(this.plc.station)!;
    }
    if (station === this.analyzer.stationNumber) {
      return new ModbusSlave(this.analyzer.stationNumber, this.analyzer);
    }
    return null;
  }

  stepProcess(dtSec: number): void {
    this.process.step(dtSec);
    this.plc.stepScan(Date.now());
    this.analyzer.updateRamFromProcess(Date.now());
  }

  async processFrame(
    frame: Uint8Array,
    codecName: CodecName,
    timeoutMs = this.timeoutMs
  ): Promise<BusResponse> {
    const codec = getCodec(codecName);

    // Check packet loss simulation
    if (Math.random() < this.faults.lossProbability) {
      const delay = this.delayMs + this.faults.extraDelayMs + timeoutMs;
      return { elapsedMs: delay, timeout: true };
    }

    let decoded;
    try {
      decoded = codec.decode(frame);
    } catch {
      // Corrupt request frame -> ignore/timeout
      return { elapsedMs: timeoutMs, timeout: true };
    }

    const { unit, pdu } = decoded;

    // MBAP tid must be echoed back verbatim in the response (README §4.2).
    let encodeCtx: EncodeCtx | undefined;
    if (codecName === 'tcp' && frame.length >= 2) {
      const tid = new DataView(frame.buffer, frame.byteOffset, frame.byteLength).getUint16(0, false);
      encodeCtx = { transactionId: tid };
    }

    // Simulate extra processing delay
    const totalDelay = this.delayMs + this.faults.extraDelayMs;

    if (unit === 0) { // Broadcast
      for (let s = 1; s <= 247; s++) {
        const slave = this.getSlaveForStation(s);
        if (slave) slave.processPdu(pdu);
      }
      return { elapsedMs: totalDelay, timeout: false };
    }

    const slave = this.getSlaveForStation(unit);
    if (!slave) {
      return { elapsedMs: timeoutMs, timeout: true };
    }

    const resPdu = slave.processPdu(pdu);
    let resFrame = codec.encode(unit, resPdu, encodeCtx);

    // Check CRC corruption simulation
    if (Math.random() < this.faults.corruptProbability && resFrame.length > 2) {
      resFrame = new Uint8Array(resFrame);
      resFrame[resFrame.length - 1] ^= 0xff; // Flip bits in last byte
    }

    return {
      frame: resFrame,
      elapsedMs: totalDelay,
      timeout: false
    };
  }
}
