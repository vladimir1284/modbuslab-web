<script lang="ts">
  import type { CodecName } from '../modbus/types.js';

  let {
    codec = $bindable('rtu'),
    delayMs = $bindable(40),
    timeoutMs = $bindable(300),
    faults = $bindable({ lossProbability: 0, corruptProbability: 0, extraDelayMs: 0 }),
    onChange
  }: {
    codec: CodecName;
    delayMs: number;
    timeoutMs: number;
    faults: { lossProbability: number; corruptProbability: number; extraDelayMs: number };
    onChange: () => void;
  } = $props();

  let showFaults = $state(false);
</script>

<div class="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-3">
  <div class="flex items-center justify-between border-b pb-2">
    <h2 class="text-md font-bold text-gray-800">Configuración del Enlace</h2>
    <button
      type="button"
      onclick={() => (showFaults = !showFaults)}
      class="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
    >
      {showFaults ? 'Ocultar inyección de fallos' : 'Condiciones del enlace...'}
    </button>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div class="flex flex-col gap-1">
      <label for="codec-select" class="text-xs font-semibold text-gray-700">Encuadre / Protocolo</label>
      <select
        id="codec-select"
        bind:value={codec}
        onchange={onChange}
        class="px-2 py-1 text-sm border rounded border-gray-300 focus:ring-2 focus:ring-indigo-500"
      >
        <option value="rtu">RTU (Hex binario + CRC16)</option>
        <option value="ascii">ASCII (: Hex ASCII + LRC)</option>
        <option value="tcp">TCP (Cabecera MBAP)</option>
      </select>
    </div>

    <div class="flex flex-col gap-1">
      <label for="delay-input" class="text-xs font-semibold text-gray-700">Retardo respuesta (ms)</label>
      <input
        id="delay-input"
        type="number"
        bind:value={delayMs}
        onchange={onChange}
        min="0"
        max="5000"
        class="px-2 py-1 text-sm border rounded border-gray-300 focus:ring-2 focus:ring-indigo-500"
      />
    </div>

    <div class="flex flex-col gap-1">
      <label for="timeout-input" class="text-xs font-semibold text-gray-700">Timeout (ms)</label>
      <input
        id="timeout-input"
        type="number"
        bind:value={timeoutMs}
        onchange={onChange}
        min="50"
        max="10000"
        class="px-2 py-1 text-sm border rounded border-gray-300 focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  </div>

  {#if showFaults}
    <div class="pt-2 border-t mt-2 bg-amber-50 p-3 rounded border border-amber-200 space-y-2">
      <h3 class="text-xs font-bold text-amber-900 uppercase tracking-wider">Inyección de Fallos Simualdos</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="flex flex-col gap-1">
          <label for="loss-prob-range" class="text-xs text-gray-700">Pérdida de trama: {(faults.lossProbability * 100).toFixed(0)}%</label>
          <input
            id="loss-prob-range"
            type="range"
            min="0"
            max="1"
            step="0.05"
            bind:value={faults.lossProbability}
            onchange={onChange}
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="corrupt-prob-range" class="text-xs text-gray-700">Corrupción CRC: {(faults.corruptProbability * 100).toFixed(0)}%</label>
          <input
            id="corrupt-prob-range"
            type="range"
            min="0"
            max="1"
            step="0.05"
            bind:value={faults.corruptProbability}
            onchange={onChange}
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="extra-delay-input" class="text-xs text-gray-700">Retardo extra (ms)</label>
          <input
            id="extra-delay-input"
            type="number"
            bind:value={faults.extraDelayMs}
            onchange={onChange}
            min="0"
            max="5000"
            class="px-2 py-1 text-xs border rounded border-gray-300"
          />
        </div>
      </div>
    </div>
  {/if}
</div>
