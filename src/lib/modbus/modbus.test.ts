import { describe, expect, it } from 'vitest';
import { CodecAscii } from './codec-ascii.js';
import { CodecRtu } from './codec-rtu.js';
import { CodecTcp } from './codec-tcp.js';
import { crc16, lrc } from './checksum.js';
import { bytesToHex, hexToBytes } from './hex.js';
import { parsePdu } from './pdu.js';

describe('Modbus Checksums', () => {
  it('verifies 2012 test vectors for RTU CRC', () => {
    // 01 03 02 98 00 01 + 04 5D
    const req = new Uint8Array([0x01, 0x03, 0x02, 0x98, 0x00, 0x01]);
    const crcReq = crc16(req);
    expect(crcReq).toBe(0x5d04);

    // 01 03 02 00 E0 + B9 CC
    const res = new Uint8Array([0x01, 0x03, 0x02, 0x00, 0xe0]);
    const crcRes = crc16(res);
    expect(crcRes).toBe(0xccb9);
  });

  it('calculates LRC correctly', () => {
    const pdu = new Uint8Array([0x01, 0x03, 0x02, 0x98, 0x00, 0x01]);
    const lrcVal = lrc(pdu);
    expect(lrcVal).toBe(0x61);
  });
});

describe('Modbus Codecs', () => {
  it('encodes and decodes RTU frames', () => {
    const codec = new CodecRtu();
    const pdu = new Uint8Array([0x03, 0x02, 0x98, 0x00, 0x01]);
    const encoded = codec.encode(1, pdu);
    expect(bytesToHex(encoded)).toBe('01 03 02 98 00 01 04 5D');

    const decoded = codec.decode(encoded);
    expect(decoded.unit).toBe(1);
    expect(bytesToHex(decoded.pdu)).toBe('03 02 98 00 01');
  });

  it('encodes and decodes ASCII frames', () => {
    const codec = new CodecAscii();
    const pdu = new Uint8Array([0x03, 0x02, 0x98, 0x00, 0x01]);
    const encoded = codec.encode(1, pdu);
    const text = new TextDecoder().decode(encoded);
    expect(text).toBe(':01030298000161\r\n');

    const decoded = codec.decode(encoded);
    expect(decoded.unit).toBe(1);
    expect(bytesToHex(decoded.pdu)).toBe('03 02 98 00 01');
  });

  it('encodes and decodes TCP (MBAP) frames', () => {
    const codec = new CodecTcp();
    const pdu = new Uint8Array([0x03, 0x02, 0x98, 0x00, 0x01]);
    const encoded = codec.encode(1, pdu, { transactionId: 12 });
    expect(bytesToHex(encoded)).toBe('00 0C 00 00 00 06 01 03 02 98 00 01');

    const decoded = codec.decode(encoded, { transactionId: 12 });
    expect(decoded.unit).toBe(1);
    expect(bytesToHex(decoded.pdu)).toBe('03 02 98 00 01');
  });

  it('rejects a mismatched MBAP tid', () => {
    const codec = new CodecTcp();
    const pdu = new Uint8Array([0x03, 0x02, 0x98, 0x00, 0x01]);
    const encoded = codec.encode(1, pdu, { transactionId: 12 });

    expect(() => codec.decode(encoded, { transactionId: 13 })).toThrow('Transaction ID mismatch');
  });
});

describe('Modbus PDU Parsing', () => {
  it('parses read response PDU correctly', () => {
    const pdu = new Uint8Array([0x03, 0x02, 0x00, 0xe0]);
    const parsed = parsePdu(pdu, 1);
    expect(parsed.unit).toBe(1);
    expect(parsed.fn).toBe(3);
    expect(parsed.bytes).toBe(2);
    expect(parsed.data ? bytesToHex(parsed.data) : '').toBe('00 E0');
  });
});
