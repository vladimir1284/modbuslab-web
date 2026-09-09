import type { CodecName } from '../modbus/types.js';
import type { WorkerReq, WorkerRes } from './device.worker.js';

export class DeviceClient {
  private worker: Worker | null = null;
  private reqId = 0;
  private pending = new Map<number, { resolve: (res: WorkerRes) => void; reject: (err: any) => void }>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.worker = new Worker(new URL('./device.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<WorkerRes>) => {
        const res = e.data;
        const p = this.pending.get(res.id);
        if (p) {
          this.pending.delete(res.id);
          if (res.t === 'error') {
            p.reject(new Error(res.message));
          } else {
            p.resolve(res);
          }
        }
      };
    }
  }

  private send<T extends WorkerRes>(req: any): Promise<T> {
    if (!this.worker) {
      return Promise.reject(new Error('Worker not available'));
    }
    const id = ++this.reqId;
    const fullReq = { ...req, id } as WorkerReq;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as any, reject });
      this.worker!.postMessage(fullReq);
    });
  }

  tx(frame: Uint8Array, codec: CodecName, timeoutMs = 300, origin: 'student' | 'monitor' = 'student'): Promise<WorkerRes> {
    return this.send({ t: 'tx', frame, codec, timeoutMs, origin });
  }

  setInput(bit: number, value: boolean): Promise<WorkerRes> {
    return this.send({ t: 'setInput', bit, value });
  }

  setLoad(phase: 0 | 1 | 2, slot: number, on: boolean, kw?: number, pf?: number): Promise<WorkerRes> {
    return this.send({ t: 'setLoad', phase, slot, on, kw, pf });
  }

  config(patch: any): Promise<WorkerRes> {
    return this.send({ t: 'config', patch });
  }

  snapshot(): Promise<WorkerRes> {
    return this.send({ t: 'snapshot' });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
