export interface LoadSlot {
  on: boolean;
  kw: number;
  pf: number; // e.g. 0.9 (positive for inductive)
}

export interface PhaseLoad {
  slots: [LoadSlot, LoadSlot, LoadSlot];
}

export interface ProcessState {
  V: [number, number, number];    // Line to Neutral voltages (V)
  I: [number, number, number];    // Line currents (A)
  phi: [number, number, number];  // Phase shift angles (rad)
  f: number;                      // Frequency (Hz)
  kWh: number;
  varh: number;
  hourmeterHours: number;
}

export class PhysicalProcess {
  private loads: [PhaseLoad, PhaseLoad, PhaseLoad] = [
    { slots: [{ on: false, kw: 1.0, pf: 0.95 }, { on: false, kw: 2.0, pf: 0.85 }, { on: false, kw: 0.5, pf: -0.9 }] },
    { slots: [{ on: false, kw: 1.0, pf: 0.95 }, { on: false, kw: 2.0, pf: 0.85 }, { on: false, kw: 0.5, pf: -0.9 }] },
    { slots: [{ on: false, kw: 1.0, pf: 0.95 }, { on: false, kw: 2.0, pf: 0.85 }, { on: false, kw: 0.5, pf: -0.9 }] },
  ];

  public state: ProcessState = {
    V: [220, 220, 220],
    I: [0.01, 0.01, 0.01],
    phi: [0, 0, 0],
    f: 60.0,
    kWh: 12.4,
    varh: 3.2,
    hourmeterHours: 45.5,
  };

  setLoadSlot(phase: 0 | 1 | 2, slot: number, on: boolean, kw?: number, pf?: number): void {
    if (slot >= 0 && slot < 3) {
      this.loads[phase].slots[slot].on = on;
      if (kw !== undefined) this.loads[phase].slots[slot].kw = kw;
      if (pf !== undefined) this.loads[phase].slots[slot].pf = pf;
    }
  }

  getLoads(): [PhaseLoad, PhaseLoad, PhaseLoad] {
    return this.loads;
  }

  step(dtSec: number): void {
    this.state.hourmeterHours += dtSec / 3600;

    // Small random walk for voltages & frequency
    for (let k = 0; k < 3; k++) {
      const vNoise = (Math.random() - 0.5) * 0.4;
      this.state.V[k] = Math.max(210, Math.min(230, this.state.V[k] + vNoise));
    }
    const fNoise = (Math.random() - 0.5) * 0.02;
    this.state.f = Math.max(59.5, Math.min(60.5, this.state.f + fNoise));

    // Calculate currents and power per phase from load slots + baseline
    let totalW = 0;
    let totalVar = 0;

    for (let k = 0; k < 3; k++) {
      let pKw = 0;
      let qKvar = 0;

      for (const slot of this.loads[k].slots) {
        if (slot.on) {
          pKw += slot.kw;
          const pf = slot.pf;
          const absPf = Math.min(1.0, Math.max(0.1, Math.abs(pf)));
          const tanPhi = Math.tan(Math.acos(absPf));
          const qSign = pf < 0 ? -1 : 1; // Negative pf = capacitive
          qKvar += pKw * tanPhi * qSign;
        }
      }

      const pW = pKw * 1000 + 10; // 10W baseline
      const qVar = qKvar * 1000;

      const sVA = Math.sqrt(pW * pW + qVar * qVar);
      const vPh = this.state.V[k];
      const iPh = sVA / vPh;

      this.state.I[k] = iPh;
      this.state.phi[k] = Math.atan2(qVar, pW);

      totalW += pW;
      totalVar += qVar;
    }

    this.state.kWh += (totalW * dtSec) / 3600000;
    this.state.varh += (totalVar * dtSec) / 3600000;
  }
}
