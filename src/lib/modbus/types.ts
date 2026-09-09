export type CodecName = 'rtu' | 'ascii' | 'tcp';

export interface Frame {
  unit: number;
  pdu: Uint8Array;
}

export interface EncodeCtx {
  transactionId?: number;
}

export interface Codec {
  readonly name: CodecName;
  encode(unit: number, pdu: Uint8Array, ctx?: EncodeCtx): Uint8Array;
  decode(frame: Uint8Array, ctx?: EncodeCtx): Frame;
}

export interface DecodedPdu {
  unit: number;
  fn: number;
  isException: boolean;
  exceptionCode?: number;
  addr?: number;
  count?: number;
  subfn?: number;
  bytes?: number;
  data?: Uint8Array | number[];
  value?: number;
  values?: number[];
  statusByte?: number;
  eventCounter?: number;
  rawPdu: Uint8Array;
}

export interface Exchange {
  id: number;
  timestamp: number;
  origin: 'student' | 'monitor';
  codec: CodecName;
  txFrame: Uint8Array;
  rxFrame?: Uint8Array;
  reqPdu?: DecodedPdu;
  resPdu?: DecodedPdu;
  error?: string;
  elapsedMs: number;
  ok: boolean;
}
