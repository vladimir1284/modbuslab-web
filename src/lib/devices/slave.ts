import { makeExceptionPdu } from '../modbus/pdu.js';

export interface SlaveHandler {
  readCoils?(addr: number, count: number): Uint8Array | number; // Uint8Array or exception code
  readDiscreteInputs?(addr: number, count: number): Uint8Array | number;
  readHoldingRegisters?(addr: number, count: number): Uint8Array | number;
  readInputRegisters?(addr: number, count: number): Uint8Array | number;
  writeSingleCoil?(addr: number, value: number): Uint8Array | number;
  writeSingleRegister?(addr: number, value: number): Uint8Array | number;
  readExceptionStatus?(): Uint8Array | number;
  diagnostics?(subfn: number, data: number): Uint8Array | number;
  getCommEventCounter?(): Uint8Array | number;
  writeMultipleCoils?(addr: number, count: number, bytes: number, data: Uint8Array): Uint8Array | number;
  writeMultipleRegisters?(addr: number, count: number, bytes: number, data: Uint8Array): Uint8Array | number;
}

export class ModbusSlave {
  constructor(public readonly station: number, private handler: SlaveHandler) {}

  processPdu(pdu: Uint8Array): Uint8Array {
    if (pdu.length === 0) return makeExceptionPdu(0, 0x01);
    const fn = pdu[0];
    const view = new DataView(pdu.buffer, pdu.byteOffset, pdu.byteLength);

    if (fn === 0) { // Control de estaciones esclavas -> Illegal Function
      return makeExceptionPdu(0, 0x01);
    }

    let result: Uint8Array | number = 0x01; // default ILLEGAL FUNCTION

    switch (fn) {
      case 1: { // Read Coils
        if (pdu.length < 5) return makeExceptionPdu(1, 0x03);
        const addr = view.getUint16(1, false);
        const count = view.getUint16(3, false);
        if (count < 1 || count > 2000) return makeExceptionPdu(1, 0x03);
        result = this.handler.readCoils ? this.handler.readCoils(addr, count) : 0x01;
        break;
      }
      case 2: { // Read Discrete Inputs
        if (pdu.length < 5) return makeExceptionPdu(2, 0x03);
        const addr = view.getUint16(1, false);
        const count = view.getUint16(3, false);
        if (count < 1 || count > 2000) return makeExceptionPdu(2, 0x03);
        result = this.handler.readDiscreteInputs ? this.handler.readDiscreteInputs(addr, count) : 0x01;
        break;
      }
      case 3: { // Read Holding Registers
        if (pdu.length < 5) return makeExceptionPdu(3, 0x03);
        const addr = view.getUint16(1, false);
        const count = view.getUint16(3, false);
        if (count < 1 || count > 125) return makeExceptionPdu(3, 0x03);
        result = this.handler.readHoldingRegisters ? this.handler.readHoldingRegisters(addr, count) : 0x01;
        break;
      }
      case 4: { // Read Input Registers
        if (pdu.length < 5) return makeExceptionPdu(4, 0x03);
        const addr = view.getUint16(1, false);
        const count = view.getUint16(3, false);
        if (count < 1 || count > 125) return makeExceptionPdu(4, 0x03);
        result = this.handler.readInputRegisters ? this.handler.readInputRegisters(addr, count) : 0x01;
        break;
      }
      case 5: { // Write Single Coil
        if (pdu.length < 5) return makeExceptionPdu(5, 0x03);
        const addr = view.getUint16(1, false);
        const value = view.getUint16(3, false);
        if (value !== 0xff00 && value !== 0x0000) return makeExceptionPdu(5, 0x03);
        result = this.handler.writeSingleCoil ? this.handler.writeSingleCoil(addr, value) : 0x01;
        break;
      }
      case 6: { // Write Single Register
        if (pdu.length < 5) return makeExceptionPdu(6, 0x03);
        const addr = view.getUint16(1, false);
        const value = view.getUint16(3, false);
        result = this.handler.writeSingleRegister ? this.handler.writeSingleRegister(addr, value) : 0x01;
        break;
      }
      case 7: { // Read Exception Status
        result = this.handler.readExceptionStatus ? this.handler.readExceptionStatus() : 0x01;
        break;
      }
      case 8: { // Diagnostics
        if (pdu.length < 5) return makeExceptionPdu(8, 0x03);
        const subfn = view.getUint16(1, false);
        const data = view.getUint16(3, false);
        result = this.handler.diagnostics ? this.handler.diagnostics(subfn, data) : 0x01;
        break;
      }
      case 11: { // Get Comm Event Counter
        result = this.handler.getCommEventCounter ? this.handler.getCommEventCounter() : 0x01;
        break;
      }
      case 15: { // Write Multiple Coils
        if (pdu.length < 6) return makeExceptionPdu(15, 0x03);
        const addr = view.getUint16(1, false);
        const count = view.getUint16(3, false);
        const bytes = pdu[5];
        if (count < 1 || count > 1968 || bytes !== Math.ceil(count / 8) || pdu.length < 6 + bytes) {
          return makeExceptionPdu(15, 0x03);
        }
        const data = pdu.subarray(6, 6 + bytes);
        result = this.handler.writeMultipleCoils ? this.handler.writeMultipleCoils(addr, count, bytes, data) : 0x01;
        break;
      }
      case 16: { // Write Multiple Registers
        if (pdu.length < 6) return makeExceptionPdu(16, 0x03);
        const addr = view.getUint16(1, false);
        const count = view.getUint16(3, false);
        const bytes = pdu[5];
        if (count < 1 || count > 123 || bytes !== count * 2 || pdu.length < 6 + bytes) {
          return makeExceptionPdu(16, 0x03);
        }
        const data = pdu.subarray(6, 6 + bytes);
        result = this.handler.writeMultipleRegisters ? this.handler.writeMultipleRegisters(addr, count, bytes, data) : 0x01;
        break;
      }
      default:
        return makeExceptionPdu(fn, 0x01);
    }

    if (typeof result === 'number') {
      return makeExceptionPdu(fn, result);
    }
    return result;
  }
}
