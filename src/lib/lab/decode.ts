// Client-side decode helpers. The device (analyzer-wm14.ts) only ever exposes raw
// register bytes over Modbus; converting those bytes to engineering values — using
// whatever Ct_ratio/Vt_ratio the student last read — happens here, in the UI layer,
// exactly like a real WM14 monitor would.

function toSigned16(u: number): number {
  return u >= 0x8000 ? u - 0x10000 : u;
}

export function unpackBits(data: Uint8Array, count: number): boolean[] {
  const out: boolean[] = [];
  for (let i = 0; i < count; i++) {
    out.push(((data[i >> 3] ?? 0) >> (i & 7) & 1) === 1);
  }
  return out;
}

export function bytesToUint16Array(data: Uint8Array): number[] {
  const out: number[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let i = 0; i + 1 < data.length; i += 2) {
    out.push(view.getUint16(i, false));
  }
  return out;
}

export interface AnalyzerReadings {
  V: [number, number, number];
  I: [number, number, number];
  W: [number, number, number];
  VAR: [number, number, number];
  PF: [number, number, number];
  VLLsum: number;
  ANeutral: number;
  WSum: number;
  VARSum: number;
  PFSum: number;
}

/**
 * block1: 12 raw registers from 0280h (V/A/W per phase + V L1-L2/L2-L3/L3-L1)
 * block2: 12 raw registers from 0298h (VL-L∑, A max, A n, W∑, VA x3, VA∑, var x3, var∑)
 * block3: 8 raw registers from 02B0h (…, Hz at idx4, PF words at idx6/idx7)
 */
export function decodeAnalyzerBlocks(
  block1: number[],
  block2: number[],
  block3: number[],
  ct: number,
  vt: number
): AnalyzerReadings {
  const s16 = toSigned16;

  const V: [number, number, number] = [
    (s16(block1[0]) / 10) * vt,
    (s16(block1[3]) / 10) * vt,
    (s16(block1[6]) / 10) * vt
  ];
  const I: [number, number, number] = [
    (s16(block1[1]) / 1000) * ct,
    (s16(block1[4]) / 1000) * ct,
    (s16(block1[7]) / 1000) * ct
  ];
  const W: [number, number, number] = [
    (s16(block1[2]) / 10) * ct * vt,
    (s16(block1[5]) / 10) * ct * vt,
    (s16(block1[8]) / 10) * ct * vt
  ];

  const VLLsum = (s16(block2[0]) / 1) * vt; // 0298h VL-L∑ (VC: reg*VT)
  const ANeutral = (s16(block2[2]) / 1000) * ct; // 029Ch A n
  const WSum = s16(block2[3]) * ct * vt; // 029Eh W∑ (P∑: reg*CT*VT)
  const VAR: [number, number, number] = [
    (s16(block2[8]) / 10) * ct * vt, // 02A8h var L1
    (s16(block2[9]) / 10) * ct * vt, // 02AAh var L2
    (s16(block2[10]) / 10) * ct * vt // 02ACh var L3
  ];
  const VARSum = s16(block2[11]) * ct * vt; // 02AEh var∑

  const decodePfByte = (byte: number): number => {
    const mag = (byte & 0x7f) / 100;
    return (byte & 0x80) !== 0 ? -mag : mag; // bit7: 0 inductive, 1 capacitive
  };
  const pfWord12 = block3[6] ?? 0; // 02BCh: LSB=PF L1, MSB=PF L2
  const pfWord3s = block3[7] ?? 0; // 02BEh: LSB=PF L3, MSB=PF∑
  const PF: [number, number, number] = [
    decodePfByte(pfWord12 & 0xff),
    decodePfByte((pfWord12 >> 8) & 0xff),
    decodePfByte(pfWord3s & 0xff)
  ];
  const PFSum = decodePfByte((pfWord3s >> 8) & 0xff);

  return { V, I, W, VAR, PF, VLLsum, ANeutral, WSum, VARSum, PFSum };
}
