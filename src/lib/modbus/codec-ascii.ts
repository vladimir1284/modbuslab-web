import { lrc } from './checksum.js';
import { ChecksumError } from './exceptions.js';
import { bytesToHex, hexToBytes } from './hex.js';
import type { Codec, EncodeCtx, Frame } from './types.js';

export class CodecAscii implements Codec {
  readonly name = 'ascii' as const;

  encode(unit: number, pdu: Uint8Array, _ctx?: EncodeCtx): Uint8Array {
    const binaryData = new Uint8Array(1 + pdu.length);
    binaryData[0] = unit;
    binaryData.set(pdu, 1);
    const lrcVal = lrc(binaryData);

    const fullBinary = new Uint8Array(binaryData.length + 1);
    fullBinary.set(binaryData, 0);
    fullBinary[binaryData.length] = lrcVal;

    const hexStr = bytesToHex(fullBinary).replace(/\s+/g, '');
    const asciiStr = ':' + hexStr + '\r\n';
    return new TextEncoder().encode(asciiStr);
  }

  decode(frame: Uint8Array, _ctx?: EncodeCtx): Frame {
    const text = new TextDecoder().decode(frame).trim();
    if (!text.startsWith(':')) {
      throw new ChecksumError('ASCII frame must start with :');
    }
    const hexPart = text.slice(1);
    if (hexPart.length % 2 !== 0 || hexPart.length < 6) { // min 1 byte unit + 1 byte fn + 1 byte lrc = 3 bytes = 6 hex chars
      throw new ChecksumError('Invalid ASCII frame length');
    }

    const binary = hexToBytes(hexPart);
    const payloadLen = binary.length - 1;
    const dataPart = binary.subarray(0, payloadLen);
    const computedLrc = lrc(dataPart);
    const receivedLrc = binary[payloadLen];

    if (computedLrc !== receivedLrc) {
      throw new ChecksumError(`ASCII LRC error: computed ${computedLrc.toString(16)}, got ${receivedLrc.toString(16)}`);
    }

    return {
      unit: binary[0],
      pdu: binary.subarray(1, payloadLen)
    };
  }
}
