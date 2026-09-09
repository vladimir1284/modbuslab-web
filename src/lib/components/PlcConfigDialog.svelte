<script lang="ts">
  import type { PlcConfig } from '../devices/plc-masterk.js';

  let {
    open = $bindable(false),
    config = $bindable() as PlcConfig,
    onSave
  }: {
    open: boolean;
    config: PlcConfig;
    onSave: (cfg: PlcConfig) => void;
  } = $props();

  let inputCount = $state(18);
  let outputCount = $state(12);
  let inputBaseHex = $state('0000');
  let outputBaseHex = $state('0040');
  let ledColor = $state<'red' | 'green'>('red');
  let runProgram = $state(false);

  $effect(() => {
    if (open) {
      inputCount = config.inputCount;
      outputCount = config.outputCount;
      inputBaseHex = config.inputBase.toString(16).padStart(4, '0').toUpperCase();
      outputBaseHex = config.outputBase.toString(16).padStart(4, '0').toUpperCase();
      ledColor = config.ledColor;
      runProgram = config.runProgram;
    }
  });

  function handleSave() {
    onSave({
      ...config,
      inputCount,
      outputCount,
      inputBase: parseInt(inputBaseHex, 16) || 0,
      outputBase: parseInt(outputBaseHex, 16) || 0,
      ledColor,
      runProgram
    });
    open = false;
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
      <h3 class="text-lg font-bold text-gray-800">Configuración del PLC Virtual</h3>

      <div class="space-y-3 text-sm">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="plc-inputs-count" class="font-semibold text-gray-700 block text-xs">Cant. Entradas</label>
            <input id="plc-inputs-count" type="number" bind:value={inputCount} min="1" max="64" class="w-full border px-2 py-1 rounded" />
          </div>
          <div>
            <label for="plc-inputs-base" class="font-semibold text-gray-700 block text-xs">Dir. Base Entradas (Hex)</label>
            <input id="plc-inputs-base" type="text" bind:value={inputBaseHex} maxlength="4" class="w-full border px-2 py-1 rounded font-mono" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="plc-outputs-count" class="font-semibold text-gray-700 block text-xs">Cant. Salidas</label>
            <input id="plc-outputs-count" type="number" bind:value={outputCount} min="1" max="64" class="w-full border px-2 py-1 rounded" />
          </div>
          <div>
            <label for="plc-outputs-base" class="font-semibold text-gray-700 block text-xs">Dir. Base Salidas (Hex)</label>
            <input id="plc-outputs-base" type="text" bind:value={outputBaseHex} maxlength="4" class="w-full border px-2 py-1 rounded font-mono" />
          </div>
        </div>

        <div>
          <label for="plc-led-color" class="font-semibold text-gray-700 block text-xs">Color de LEDs</label>
          <select id="plc-led-color" bind:value={ledColor} class="w-full border px-2 py-1 rounded">
            <option value="red">Rojo</option>
            <option value="green">Verde</option>
          </select>
        </div>

        <div class="pt-2 border-t flex items-center gap-2">
          <input id="plc-run-program" type="checkbox" bind:checked={runProgram} class="rounded text-indigo-600" />
          <label for="plc-run-program" class="font-semibold text-gray-800 text-xs cursor-pointer">
            Ejecutar programa de escalera (O1=I1, O2=I2 AND I3, O3=NOT I4, O12=blink)
          </label>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2 border-t">
        <button type="button" onclick={() => (open = false)} class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
        <button type="button" onclick={handleSave} class="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold">Guardar</button>
      </div>
    </div>
  </div>
{/if}
