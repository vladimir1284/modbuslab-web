<script lang="ts">
  import DigitalPoint from './DigitalPoint.svelte';
  import PlcConfigDialog from './PlcConfigDialog.svelte';
  import type { PlcConfig } from '../devices/plc-masterk.js';

  let {
    inputs = [] as boolean[],
    outputs = [] as boolean[],
    monitorRunning = false,
    config = {
      inputCount: 18,
      outputCount: 12,
      inputBase: 0x0000,
      outputBase: 0x0040,
      ledColor: 'red',
      runProgram: false,
      rules: []
    } as PlcConfig,
    onToggleMonitor,
    onToggleInput,
    onSaveConfig
  }: {
    inputs: boolean[];
    outputs: boolean[];
    monitorRunning: boolean;
    config: PlcConfig;
    onToggleMonitor: () => void;
    onToggleInput: (bit: number) => void;
    onSaveConfig: (cfg: PlcConfig) => void;
  } = $props();

  let openConfig = $state(false);
</script>

<div class="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-4">
  <div class="flex items-center justify-between border-b pb-2">
    <div>
      <h2 class="text-md font-bold text-gray-800">Monitor del PLC — Master-K120S (Estación 2)</h2>
      <p class="text-xs text-gray-500">Sondeo periódicos de entradas (fn 01) y salidas (fn 01) en vivo</p>
    </div>

    <div class="flex items-center gap-2">
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

      <button
        type="button"
        onclick={() => (openConfig = true)}
        class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded border border-gray-300"
      >
        Configurar PLC...
      </button>
    </div>
  </div>

  <div class="space-y-4 bg-gray-50 p-3 rounded border border-gray-200">
    <div>
      <h3 class="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Entradas Digitales (Interruptores Físicos)</h3>
      <div class="flex flex-wrap gap-2">
        {#each Array.from({ length: config.inputCount }) as _, i}
          {@const addr = config.inputBase + i}
          {@const addrHex = addr.toString(16).padStart(4, '0').toUpperCase()}
          <DigitalPoint
            label={`I${i + 1}`}
            addressHex={addrHex}
            on={inputs[i]}
            color={config.ledColor}
            isInput={true}
            onClick={() => onToggleInput(i)}
          />
        {/each}
      </div>
    </div>

    <div class="pt-3 border-t border-gray-200">
      <h3 class="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Salidas Digitales (Actuadores / Bobinas)</h3>
      <div class="flex flex-wrap gap-2">
        {#each Array.from({ length: config.outputCount }) as _, i}
          {@const addr = config.outputBase + i}
          {@const addrHex = addr.toString(16).padStart(4, '0').toUpperCase()}
          <DigitalPoint
            label={`O${i + 1}`}
            addressHex={addrHex}
            on={outputs[i]}
            color={config.ledColor}
            isInput={false}
          />
        {/each}
      </div>
    </div>
  </div>
</div>

<PlcConfigDialog bind:open={openConfig} {config} onSave={onSaveConfig} />
