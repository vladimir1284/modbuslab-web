export function bytesToHex(buf: Uint8Array | number[]): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

export function hexToBytes(hexStr: string): Uint8Array {
  const clean = hexStr.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Hex string must have an even length');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

export function formatHex(value: number, width: number): string {
  return value.toString(16).padStart(width, '0').toUpperCase();
}
