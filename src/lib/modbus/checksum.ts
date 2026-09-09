import { ChecksumError } from './exceptions.js';

export function crc16(buf: Uint8Array): number {
  let crc = 0xffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
  }
  return crc;
}

export function lrc(buf: Uint8Array): number {
  let sum = 0;
  for (const b of buf) {
    sum = (sum + b) & 0xff;
  }
  return (-sum) & 0xff;
}
