import { CodecAscii } from './codec-ascii.js';
import { CodecRtu } from './codec-rtu.js';
import { CodecTcp } from './codec-tcp.js';
import type { Codec, CodecName } from './types.js';

export function getCodec(name: CodecName): Codec {
  switch (name) {
    case 'rtu':
      return new CodecRtu();
    case 'ascii':
      return new CodecAscii();
    case 'tcp':
      return new CodecTcp();
    default:
      throw new Error(`Unknown codec: ${name}`);
  }
}
