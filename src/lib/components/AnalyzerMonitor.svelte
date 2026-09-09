<script lang="ts">
  import AnalogInstrument from './AnalogInstrument.svelte';
  import DigitalInstrument from './DigitalInstrument.svelte';
  import LoadBank from './LoadBank.svelte';
  import type { ProcessState } from '../devices/process.js';

  let {
    processState = {
      V: [220, 220, 220],
      I: [0, 0, 0],
      phi: [0, 0, 0],
      f: 60.0,
      kWh: 0,
      varh: 0,
      hourmeterHours: 0
    } as ProcessState,
    vtRatio = 1.0,
    ctRatio = 25,
    stationNumber = 1,
    monitorRunning = false,
    revealedCt = false,
    revealedVt = false,
    onToggleMonitor,
    onToggleLoad
  }: {
    processState: ProcessState;
    vtRatio: number;
    ctRatio: number;
    stationNumber: number;
    monitorRunning: boolean;
    revealedCt: boolean;
    revealedVt: boolean;
    onToggleMonitor: () => void;
    onToggleLoad: (phase: 0 | 1 | 2, slot: number, on: boolean, kw: number, pf: number) => void;
  } = $props();

  let activeTab = $state<'sys' | 'l1' | 'l2' | 'l3'>('sys');

  let maxVScale = $state(300);
  let maxIScale = $state(150);

  let p1 = $derived(processState.V[0] * processState.I[0] * Math.cos(processState.phi[0]));
  let p2 = $derived(processState.V[1] * processState.I[1] * Math.cos(processState.phi[1]));
  let p3 = $derived(processState.V[2] * processState.I[2] * Math.cos(processState.phi[2]));

  let q1 = $derived(processState.V[0] * processState.I[0] * Math.sin(processState.phi[0]));
  let q2 = $derived(processState.V[1] * processState.I[1] * Math.sin(processState.phi[1]));
  let q3 = $derived(processState.V[2] * processState.I[2] * Math.sin(processState.phi[2]));

  let pf1 = $derived(Math.cos(processState.phi[0]));
  let pf2 = $derived(Math.cos(processState.phi[1]));
  let pf3 = $derived(Math.cos(processState.phi[2]));

  let pSum = $derived(p1 + p2 + p3);
  let qSum = $derived(q1 + q2 + q3);
  let pfSum = $derived(Math.cos(Math.atan2(qSum, pSum)));
  let vSumLL = $derived((processState.V[0] + processState.V[1] + processState.V[2]) / 3 * Math.sqrt(3));
</script>

<div class="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-4">
  <div class="flex items-center justify-between border-b pb-2">
    <div>
      <h2 class="text-md font-bold text-gray-800">
        Monitor del Analizador — Carlo Gavazzi WM14 (Estación {stationNumber})
      </h2>
      <p class="text-xs text-gray-500">Sondeo periódico fn 04 (0280h, 0298h, 02B0h) + escala (1082h/1084h)</p>
    </div>

    <button
      type="button"
      onclick={onToggleMonitor}
      class="px-3 py-1 text-xs font-bold rounded shadow transition-colors"
      class:bg-emerald-600={!monitorRunning}
      class:hover:bg-emerald-700={!monitorRunning}
      class:bg-amber-600={monitorRunning}
      class:hover:bg-amber-700={monitorRunning}
      class:text-white={true}
    >
      {monitorRunning ? 'Detener Monitor' : 'Iniciar Monitor'}
    </button>
  </div>

  <!-- Instrument Panel Tabs -->
  <div class="flex items-center gap-1 border-b">
    {#each [{ id: 'sys', label: 'Sistema' }, { id: 'l1', label: 'Fase 1' }, { id: 'l2', label: 'Fase 2' }, { id: 'l3', label: 'Fase 3' }] as tab}
      <button
        type="button"
        onclick={() => (activeTab = tab.id as any)}
        class="px-4 py-2 text-xs font-bold border-b-2 transition-colors"
        class:border-indigo-600={activeTab === tab.id}
        class:text-indigo-600={activeTab === tab.id}
        class:border-transparent={activeTab !== tab.id}
        class:text-gray-500={activeTab !== tab.id}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <!-- Dial Instruments Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
    {#if activeTab === 'sys'}
      <AnalogInstrument
        label="Tensión de Línea"
        value={vSumLL}
        unit="V"
        bind:maxScale={maxVScale}
        revealedScaleLabel={`VT = ${vtRatio.toFixed(1)} (leído 1082h)`}
        revealed={revealedVt}
      />
      <AnalogInstrument
        label="Corriente Neutro"
        value={0.0}
        unit="A"
        bind:maxScale={maxIScale}
        revealedScaleLabel={`CT = ${ctRatio} (leído 1084h)`}
        revealed={revealedCt}
      />
      <DigitalInstrument label="Potencia Activa ∑" value={pSum} unit="W" />
      <DigitalInstrument label="Potencia Reactiva ∑" value={qSum} unit="VAR" />
      <DigitalInstrument label="Factor de Potencia ∑" value={pfSum} unit="" precision={2} />
    {:else if activeTab === 'l1'}
      <AnalogInstrument
        label="Tensión V L1-N"
        value={processState.V[0]}
        unit="V"
        bind:maxScale={maxVScale}
        revealedScaleLabel={`VT = ${vtRatio.toFixed(1)} (leído 1082h)`}
        revealed={revealedVt}
      />
      <AnalogInstrument
        label="Corriente A L1"
        value={processState.I[0]}
        unit="A"
        bind:maxScale={maxIScale}
        revealedScaleLabel={`CT = ${ctRatio} (leído 1084h)`}
        revealed={revealedCt}
      />
      <DigitalInstrument label="Potencia W L1" value={p1} unit="W" />
      <DigitalInstrument label="Potencia var L1" value={q1} unit="VAR" />
      <DigitalInstrument label="Factor de Potencia L1" value={pf1} unit="" precision={2} />
    {:else if activeTab === 'l2'}
      <AnalogInstrument
        label="Tensión V L2-N"
        value={processState.V[1]}
        unit="V"
        bind:maxScale={maxVScale}
        revealedScaleLabel={`VT = ${vtRatio.toFixed(1)} (leído 1082h)`}
        revealed={revealedVt}
      />
      <AnalogInstrument
        label="Corriente A L2"
        value={processState.I[1]}
        unit="A"
        bind:maxScale={maxIScale}
        revealedScaleLabel={`CT = ${ctRatio} (leído 1084h)`}
        revealed={revealedCt}
      />
      <DigitalInstrument label="Potencia W L2" value={p2} unit="W" />
      <DigitalInstrument label="Potencia var L2" value={q2} unit="VAR" />
      <DigitalInstrument label="Factor de Potencia L2" value={pf2} unit="" precision={2} />
    {:else if activeTab === 'l3'}
      <AnalogInstrument
        label="Tensión V L3-N"
        value={processState.V[2]}
        unit="V"
        bind:maxScale={maxVScale}
        revealedScaleLabel={`VT = ${vtRatio.toFixed(1)} (leído 1082h)`}
        revealed={revealedVt}
      />
      <AnalogInstrument
        label="Corriente A L3"
        value={processState.I[2]}
        unit="A"
        bind:maxScale={maxIScale}
        revealedScaleLabel={`CT = ${ctRatio} (leído 1084h)`}
        revealed={revealedCt}
      />
      <DigitalInstrument label="Potencia W L3" value={p3} unit="W" />
      <DigitalInstrument label="Potencia var L3" value={q3} unit="VAR" />
      <DigitalInstrument label="Factor de Potencia L3" value={pf3} unit="" precision={2} />
    {/if}
  </div>

  <LoadBank {onToggleLoad} />
</div>
