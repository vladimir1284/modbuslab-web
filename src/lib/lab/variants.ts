export interface Variant {
  n: number;
  toggleBit: string;
  readInputs: [string, string];
  plcBase: number;
  analyzerVars: string[];
  analyzerBase: number;
}

export const VARIANTS: Variant[] = [
  { n: 1, toggleBit: 'P40', readInputs: ['P00', 'P04'], plcBase: 0x2000, analyzerVars: ['V L1-N', 'VA ∑', 'Hz'], analyzerBase: 0x0280 },
  { n: 2, toggleBit: 'P41', readInputs: ['P01', 'P05'], plcBase: 0x2001, analyzerVars: ['A L1', 'VA L1', 'A n'], analyzerBase: 0x0282 },
  { n: 3, toggleBit: 'P42', readInputs: ['P02', 'P06'], plcBase: 0x2002, analyzerVars: ['V L2-N', 'VA ∑', 'Hz'], analyzerBase: 0x0284 },
  { n: 4, toggleBit: 'P43', readInputs: ['P03', 'P07'], plcBase: 0x2003, analyzerVars: ['A L2', 'VA L2', 'A n'], analyzerBase: 0x0286 },
  { n: 5, toggleBit: 'P44', readInputs: ['P04', 'P08'], plcBase: 0x2004, analyzerVars: ['V L3-N', 'VA ∑', 'Hz'], analyzerBase: 0x0288 },
  { n: 6, toggleBit: 'P45', readInputs: ['P05', 'P09'], plcBase: 0x2005, analyzerVars: ['A L3', 'VA L3', 'A n'], analyzerBase: 0x028a },
  { n: 7, toggleBit: 'P46', readInputs: ['P06', 'P0A'], plcBase: 0x2006, analyzerVars: ['W L1', 'A max', 'VL-L ∑'], analyzerBase: 0x028c },
  { n: 8, toggleBit: 'P47', readInputs: ['P07', 'P0B'], plcBase: 0x2007, analyzerVars: ['V L1-L2', 'A L1', 'Hz'], analyzerBase: 0x028e },
  { n: 9, toggleBit: 'P40', readInputs: ['P00', 'P04'], plcBase: 0x2008, analyzerVars: ['W L2', 'A max', 'VL-L ∑'], analyzerBase: 0x0290 },
  { n: 10, toggleBit: 'P41', readInputs: ['P01', 'P05'], plcBase: 0x2009, analyzerVars: ['V L2-L3', 'A L2', 'Hz'], analyzerBase: 0x0292 },
  { n: 11, toggleBit: 'P42', readInputs: ['P02', 'P06'], plcBase: 0x200a, analyzerVars: ['W L3', 'A max', 'VL-L ∑'], analyzerBase: 0x0294 },
  { n: 12, toggleBit: 'P43', readInputs: ['P03', 'P07'], plcBase: 0x200b, analyzerVars: ['V L3-L1', 'A L3', 'Hz'], analyzerBase: 0x0296 },
  { n: 13, toggleBit: 'P40', readInputs: ['P04', 'P08'], plcBase: 0x200c, analyzerVars: ['V L3-N', 'var L1', 'A n'], analyzerBase: 0x0298 },
  { n: 14, toggleBit: 'P41', readInputs: ['P05', 'P09'], plcBase: 0x200d, analyzerVars: ['V L1-N', 'var L3', 'A L2'], analyzerBase: 0x029a },
  { n: 15, toggleBit: 'P42', readInputs: ['P06', 'P0A'], plcBase: 0x200e, analyzerVars: ['V L2-N', 'var L2', 'A n'], analyzerBase: 0x029c },
  { n: 16, toggleBit: 'P43', readInputs: ['P07', 'P0B'], plcBase: 0x200f, analyzerVars: ['A L3', 'VA L3', 'A n'], analyzerBase: 0x029e },
  { n: 17, toggleBit: 'P44', readInputs: ['P02', 'P06'], plcBase: 0x2010, analyzerVars: ['W L1', 'A max', 'VL-L ∑'], analyzerBase: 0x02a0 },
  { n: 18, toggleBit: 'P45', readInputs: ['P03', 'P07'], plcBase: 0x2011, analyzerVars: ['V L1-L2', 'A L1', 'Hz'], analyzerBase: 0x02a2 },
  { n: 19, toggleBit: 'P46', readInputs: ['P04', 'P08'], plcBase: 0x2012, analyzerVars: ['W L2', 'A max', 'VL-L ∑'], analyzerBase: 0x02a4 },
  { n: 20, toggleBit: 'P47', readInputs: ['P05', 'P09'], plcBase: 0x2013, analyzerVars: ['V L2-L3', 'A L2', 'Hz'], analyzerBase: 0x0286 },
  { n: 21, toggleBit: 'P40', readInputs: ['P06', 'P0A'], plcBase: 0x2014, analyzerVars: ['W L3', 'A max', 'VL-L ∑'], analyzerBase: 0x0288 },
  { n: 22, toggleBit: 'P41', readInputs: ['P07', 'P0B'], plcBase: 0x2015, analyzerVars: ['V L3-L1', 'A L3', 'Hz'], analyzerBase: 0x028a },
  { n: 23, toggleBit: 'P42', readInputs: ['P00', 'P04'], plcBase: 0x2016, analyzerVars: ['V L3-N', 'var L1', 'A n'], analyzerBase: 0x028c },
  { n: 24, toggleBit: 'P43', readInputs: ['P01', 'P05'], plcBase: 0x2017, analyzerVars: ['V L1-N', 'var L3', 'A L2'], analyzerBase: 0x028e },
  { n: 25, toggleBit: 'P40', readInputs: ['P02', 'P06'], plcBase: 0x2018, analyzerVars: ['V L2-N', 'var L2', 'A n'], analyzerBase: 0x0290 },
  { n: 26, toggleBit: 'P41', readInputs: ['P03', 'P07'], plcBase: 0x2019, analyzerVars: ['A L3', 'VA L3', 'A n'], analyzerBase: 0x0292 },
  { n: 27, toggleBit: 'P42', readInputs: ['P04', 'P08'], plcBase: 0x201a, analyzerVars: ['W L1', 'A max', 'VL-L ∑'], analyzerBase: 0x029a },
  { n: 28, toggleBit: 'P43', readInputs: ['P05', 'P09'], plcBase: 0x201b, analyzerVars: ['V L1-L2', 'A L1', 'Hz'], analyzerBase: 0x029c },
  { n: 29, toggleBit: 'P44', readInputs: ['P06', 'P0A'], plcBase: 0x201c, analyzerVars: ['W L2', 'A max', 'VL-L ∑'], analyzerBase: 0x029e },
  { n: 30, toggleBit: 'P45', readInputs: ['P07', 'P0B'], plcBase: 0x201d, analyzerVars: ['V L2-L3', 'A L2', 'Hz'], analyzerBase: 0x02a0 },
  { n: 31, toggleBit: 'P46', readInputs: ['P02', 'P06'], plcBase: 0x201e, analyzerVars: ['W L3', 'A max', 'VL-L ∑'], analyzerBase: 0x02a2 },
  { n: 32, toggleBit: 'P47', readInputs: ['P03', 'P07'], plcBase: 0x201f, analyzerVars: ['V L3-L1', 'A L3', 'Hz'], analyzerBase: 0x02a4 },
  { n: 33, toggleBit: 'P40', readInputs: ['P04', 'P08'], plcBase: 0x2020, analyzerVars: ['V L3-N', 'var L1', 'A n'], analyzerBase: 0x0286 },
  { n: 34, toggleBit: 'P42', readInputs: ['P05', 'P09'], plcBase: 0x2021, analyzerVars: ['V L3-L1', 'A L3', 'Hz'], analyzerBase: 0x0288 },
  { n: 35, toggleBit: 'P40', readInputs: ['P00', 'P04'], plcBase: 0x2000, analyzerVars: ['V L3-N', 'var L1', 'A n'], analyzerBase: 0x028a },
  { n: 36, toggleBit: 'P41', readInputs: ['P01', 'P05'], plcBase: 0x2001, analyzerVars: ['V L1-N', 'var L3', 'A L2'], analyzerBase: 0x028c },
  { n: 37, toggleBit: 'P42', readInputs: ['P02', 'P06'], plcBase: 0x2002, analyzerVars: ['V L2-N', 'var L2', 'A n'], analyzerBase: 0x028e },
  { n: 38, toggleBit: 'P43', readInputs: ['P03', 'P07'], plcBase: 0x2003, analyzerVars: ['A L3', 'VA L3', 'A n'], analyzerBase: 0x0290 },
  { n: 39, toggleBit: 'P44', readInputs: ['P04', 'P08'], plcBase: 0x2004, analyzerVars: ['W L1', 'A max', 'VL-L ∑'], analyzerBase: 0x0292 },
  { n: 40, toggleBit: 'P45', readInputs: ['P05', 'P09'], plcBase: 0x2005, analyzerVars: ['V L1-L2', 'A L1', 'Hz'], analyzerBase: 0x029a },
  { n: 41, toggleBit: 'P46', readInputs: ['P06', 'P0A'], plcBase: 0x2006, analyzerVars: ['W L2', 'A max', 'VL-L ∑'], analyzerBase: 0x029c },
  { n: 42, toggleBit: 'P47', readInputs: ['P07', 'P0B'], plcBase: 0x2007, analyzerVars: ['V L2-L3', 'A L2', 'Hz'], analyzerBase: 0x029e },
  { n: 43, toggleBit: 'P40', readInputs: ['P00', 'P04'], plcBase: 0x2008, analyzerVars: ['W L3', 'A max', 'VL-L ∑'], analyzerBase: 0x02a0 },
  { n: 44, toggleBit: 'P41', readInputs: ['P01', 'P05'], plcBase: 0x2009, analyzerVars: ['V L3-L1', 'A L3', 'Hz'], analyzerBase: 0x02a2 },
];

export function parseBitAddr(masterKBitStr: string): number {
  // P40 -> 0x0040, P0B -> 0x000B
  const hexPart = masterKBitStr.replace(/^P/i, '');
  return parseInt(hexPart, 16);
}

export function getVariant(n: number): Variant {
  const v = VARIANTS.find((x) => x.n === n);
  return v || VARIANTS[0];
}
