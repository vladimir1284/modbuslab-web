export class ChecksumError extends Error {
  constructor(message = 'Invalid checksum') {
    super(message);
    this.name = 'ChecksumError';
  }
}

export class ModbusProtocolError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = 'ModbusProtocolError';
  }
}

export const EXCEPTION_NAMES: Record<number, string> = {
  0x01: 'ILLEGAL FUNCTION',
  0x02: 'ILLEGAL DATA ADDRESS',
  0x03: 'ILLEGAL DATA VALUE',
  0x04: 'SLAVE DEVICE FAILURE',
  0x05: 'ACKNOWLEDGE',
  0x06: 'SLAVE DEVICE BUSY',
};
