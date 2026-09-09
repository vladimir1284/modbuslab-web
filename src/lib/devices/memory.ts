export class AreaMemory {
  private words: Uint16Array;
  readonly readOnly: boolean;

  constructor(sizeInWords: number, readOnly = false) {
    this.words = new Uint16Array(sizeInWords);
    this.readOnly = readOnly;
  }

  getWord(wordAddr: number): number {
    if (wordAddr < 0 || wordAddr >= this.words.length) {
      throw new Error('Out of bounds word address');
    }
    return this.words[wordAddr];
  }

  setWord(wordAddr: number, value: number): void {
    if (this.readOnly) {
      throw new Error('Area is read-only');
    }
    if (wordAddr < 0 || wordAddr >= this.words.length) {
      throw new Error('Out of bounds word address');
    }
    this.words[wordAddr] = value & 0xffff;
  }

  getBit(bitAddr: number): boolean {
    const wordIndex = bitAddr >> 4;
    const bitIndex = bitAddr & 0x0f;
    if (wordIndex < 0 || wordIndex >= this.words.length) {
      throw new Error('Out of bounds bit address');
    }
    return (this.words[wordIndex] & (1 << bitIndex)) !== 0;
  }

  setBit(bitAddr: number, value: boolean): void {
    if (this.readOnly) {
      throw new Error('Area is read-only');
    }
    const wordIndex = bitAddr >> 4;
    const bitIndex = bitAddr & 0x0f;
    if (wordIndex < 0 || wordIndex >= this.words.length) {
      throw new Error('Out of bounds bit address');
    }
    if (value) {
      this.words[wordIndex] |= (1 << bitIndex);
    } else {
      this.words[wordIndex] &= ~(1 << bitIndex);
    }
  }

  getWords(startWord: number, count: number): Uint16Array {
    if (startWord < 0 || startWord + count > this.words.length) {
      throw new Error('Out of bounds word range');
    }
    return this.words.slice(startWord, startWord + count);
  }

  setWords(startWord: number, values: ArrayLike<number>): void {
    if (this.readOnly) {
      throw new Error('Area is read-only');
    }
    if (startWord < 0 || startWord + values.length > this.words.length) {
      throw new Error('Out of bounds word range');
    }
    for (let i = 0; i < values.length; i++) {
      this.words[startWord + i] = values[i] & 0xffff;
    }
  }

  getBits(startBit: number, count: number): boolean[] {
    const res: boolean[] = new Array(count);
    for (let i = 0; i < count; i++) {
      res[i] = this.getBit(startBit + i);
    }
    return res;
  }

  setBits(startBit: number, bits: boolean[]): void {
    if (this.readOnly) {
      throw new Error('Area is read-only');
    }
    for (let i = 0; i < bits.length; i++) {
      this.setBit(startBit + i, bits[i]);
    }
  }

  get sizeWords(): number {
    return this.words.length;
  }
}
