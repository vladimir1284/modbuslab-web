import { crc16 } from './checksum.js';
import { ChecksumError } from './exceptions.js';
import type { Codec, EncodeCtx, Frame } from './types.js';

export class CodecRtu implements Codec {
  readonly name = 'rtu' as const;

  encode(unit: number, pdu: Uint8Array, _ctx?: EncodeCtx): Uint8Array {
    const frame = new Uint8Array(1 + pdu.length + 2);
    frame[0] = unit;
    frame.set(pdu, 1);
    const crc = crc16(frame.subarray(0, 1 + pdu.length));
    frame[1 + pdu.length] = crc & 0xff; // LSB
    frame[1 + pdu.length + 1] = (crc >> 8) & 0xff; // MSB
    return frame;
  }

  decode(frame: Uint8Array, _ctx?: EncodeCtx): Frame {
    if (frame.length < 3) {
      throw new ChecksumError('Frame too short for RTU');
    }
    const payloadLen = frame.length - 2;
    const computedCrc = crc16(frame.subarray(0, payloadLen));
    const receivedCrc = frame[payloadLen] | (frame[payloadLen + 1] << 8);

    if (computedCrc !== receivedCrc) {
      throw new ChecksumError(`RTU CRC error: computed ${computedCrc.toString(16)}, got ${receivedCrc.toString(16)}`);
    }

    return {
      unit: frame[0],
      pdu: frame.subarray(1, payloadLen)
    };
  }
}
