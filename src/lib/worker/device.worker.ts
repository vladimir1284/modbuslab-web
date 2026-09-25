import { VirtualBus } from '../devices/bus.js';
import type { CodecName } from '../modbus/types.js';

export interface ReqTx {
  id: number;
  t: 'tx';
  frame: Uint8Array;
  codec: CodecName;
  timeoutMs: number;
  origin: 'student' | 'monitor';
}

export interface ReqSetInput {
  id: number;
  t: 'setInput';
  bit: number;
  value: boolean;
}

export interface ReqSetLoad {
  id: number;
  t: 'setLoad';
  phase: 0 | 1 | 2;
  slot: number;
  on: boolean;
  kw?: number;
  pf?: number;
}

export interface ReqConfig {
  id: number;
  t: 'config';
  patch: {
    delayMs?: number;
    timeoutMs?: number;
    faults?: {
      lossProbability?: number;
      corruptProbability?: number;
      extraDelayMs?: number;
    };
    plc?: Partial<import('../devices/plc-masterk.js').PlcConfig>;
    analyzerLock?: boolean;
    analyzerPassword?: number;
  };
}

export interface ReqSnapshot {
  id: number;
  t: 'snapshot';
}

export interface ReqRandomizeInputs {
  id: number;
  t: 'randomizeInputs';
}

export type WorkerReq = ReqTx | ReqSetInput | ReqSetLoad | ReqConfig | ReqSnapshot | ReqRandomizeInputs;

export type WorkerRes =
  | { id: number; t: 'rx'; frame: Uint8Array; elapsedMs: number }
  | { id: number; t: 'timeout'; elapsedMs: number }
  | { id: number; t: 'snapshot'; data: any }
  | { id: number; t: 'error'; message: string };

const bus = new VirtualBus();

// Simulation ticker loop (step physics every 100ms)
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const dtSec = (now - lastTick) / 1000;
  lastTick = now;
  bus.stepProcess(dtSec);
}, 100);

self.onmessage = async (e: MessageEvent<WorkerReq>) => {
  const req = e.data;
  try {
    switch (req.t) {
      case 'tx': {
        const res = await bus.processFrame(req.frame, req.codec, req.timeoutMs);
        if (res.timeout) {
          self.postMessage({ id: req.id, t: 'timeout', elapsedMs: res.elapsedMs } satisfies WorkerRes);
        } else {
          self.postMessage({ id: req.id, t: 'rx', frame: res.frame!, elapsedMs: res.elapsedMs } satisfies WorkerRes);
        }
        break;
      }
      case 'setInput': {
        bus.plc.setInputBit(req.bit, req.value);
        self.postMessage({ id: req.id, t: 'snapshot', data: { ok: true } } satisfies WorkerRes);
        break;
      }
      case 'setLoad': {
        bus.process.setLoadSlot(req.phase, req.slot, req.on, req.kw, req.pf);
        self.postMessage({ id: req.id, t: 'snapshot', data: { ok: true } } satisfies WorkerRes);
        break;
      }
      case 'config': {
        if (req.patch.delayMs !== undefined) bus.delayMs = req.patch.delayMs;
        if (req.patch.timeoutMs !== undefined) bus.timeoutMs = req.patch.timeoutMs;
        if (req.patch.faults) {
          Object.assign(bus.faults, req.patch.faults);
        }
        if (req.patch.plc) {
          Object.assign(bus.plc.config, req.patch.plc);
        }
        if (req.patch.analyzerLock !== undefined) bus.analyzer.lockEnabled = req.patch.analyzerLock;
        if (req.patch.analyzerPassword !== undefined) bus.analyzer.password = req.patch.analyzerPassword;
        self.postMessage({ id: req.id, t: 'snapshot', data: { ok: true } } satisfies WorkerRes);
        break;
      }
      case 'snapshot': {
        const data = {
          plcInputs: Array.from({ length: bus.plc.config.inputCount }, (_, i) => bus.plc.getInputBit(i)),
          plcOutputs: Array.from({ length: bus.plc.config.outputCount }, (_, i) => bus.plc.getOutputBit(i)),
          analyzerState: bus.process.state,
          vtRatio: bus.analyzer.getEepromWord(0x1082) / 10.0,
          ctRatio: bus.analyzer.getEepromWord(0x1084),
          station: bus.analyzer.stationNumber
        };
        self.postMessage({ id: req.id, t: 'snapshot', data } satisfies WorkerRes);
        break;
      }
      case 'randomizeInputs': {
        bus.plc.randomizeInputs();
        const data = {
          plcInputs: Array.from({ length: bus.plc.config.inputCount }, (_, i) => bus.plc.getInputBit(i))
        };
        self.postMessage({ id: req.id, t: 'snapshot', data } satisfies WorkerRes);
        break;
      }
    }
  } catch (err: any) {
    self.postMessage({ id: req.id, t: 'error', message: err?.message || 'Worker error' } satisfies WorkerRes);
  }
};
