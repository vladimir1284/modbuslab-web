import { ChecksumError } from './exceptions.js';
import type { Codec, EncodeCtx, Frame } from './types.js';

export class CodecTcp implements Codec {
  readonly name = 'tcp' as const;

  encode(unit: number, pdu: Uint8Array, ctx?: EncodeCtx): Uint8Array {
    const tid = ctx?.transactionId ?? 0;
    const len = 1 + pdu.length; // unit id + pdu length
    const frame = new Uint8Array(7 + pdu.length);

    const view = new DataView(frame.buffer);
    view.setUint16(0, tid, false); // Transaction ID
    view.setUint16(2, 0, false);   // Protocol ID (0 = Modbus)
    view.setUint16(4, len, false); // Length
    frame[6] = unit;              // Unit ID
    frame.set(pdu, 7);            // PDU

    return frame;
  }

  decode(frame: Uint8Array, ctx?: EncodeCtx): Frame {
    if (frame.length < 7) {
      throw new ChecksumError('TCP frame too short for MBAP header');
    }
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
    const tid = view.getUint16(0, false);
    const proto = view.getUint16(2, false);
    const len = view.getUint16(4, false);

    if (proto !== 0) {
      throw new ChecksumError(`Invalid protocol ID in TCP header: ${proto}`);
    }
    if (ctx?.transactionId !== undefined && tid !== ctx.transactionId) {
      throw new ChecksumError(`Transaction ID mismatch: expected ${ctx.transactionId}, got ${tid}`);
    }
    if (frame.length < 6 + len) {
      throw new ChecksumError(`TCP frame incomplete: expected ${6 + len} bytes, got ${frame.length}`);
    }

    return {
      unit: frame[6],
      pdu: frame.subarray(7, 6 + len)
    };
  }
}
