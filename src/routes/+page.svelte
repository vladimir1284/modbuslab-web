<script lang="ts">
  import { goto } from '$app/navigation';
  import Logo from '$lib/components/Logo.svelte';
  import { getVariant } from '$lib/lab/variants.js';

  let listNumber = $state(1);

  let variant = $derived(getVariant(listNumber));

  function handleStart() {
    if (typeof localStorage !== 'undefined') {
      const state = {
        listNumber,
        variantNumber: variant.n,
        startTime: Date.now(),
        history: [],
        revealedCt: false,
        revealedVt: false
      };
      localStorage.setItem('modbuslab.session.v1', JSON.stringify(state));
    }
    goto('/lab');
  }
</script>

<main class="max-w-2xl mx-auto py-12 px-4 space-y-6">
  <div class="bg-white p-8 rounded-xl shadow-md border border-gray-200 text-center space-y-4">
    <div class="flex justify-center pb-2">
      <Logo size="xl" variant="light" />
    </div>

    <p class="text-sm text-gray-600 max-w-lg mx-auto">
      Laboratorio virtual de protocolo Modbus para PLC LS Master-K120S y Analizador de Redes Carlo Gavazzi WM14.
    </p>

    <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 max-w-md mx-auto text-left space-y-4">
      <div>
        <label for="list-number-input" class="block text-sm font-bold text-gray-700 mb-1">
          Selecciona tu número de lista (1–44)
        </label>
        <input
          id="list-number-input"
          type="number"
          min="1"
          max="44"
          bind:value={listNumber}
          class="w-full px-3 py-2 border border-gray-300 rounded-md font-bold text-lg text-indigo-700 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div class="bg-indigo-50 p-3 rounded border border-indigo-100 text-xs space-y-1 text-indigo-900">
        <div class="font-bold border-b border-indigo-200 pb-1">Asignación de variante nº {variant.n}:</div>
        <div><strong>Bit PLC a conmutar:</strong> {variant.toggleBit}</div>
        <div><strong>Rango de entradas a leer:</strong> {variant.readInputs[0]}–{variant.readInputs[1]}</div>
        <div><strong>Dir. Base escritura PLC:</strong> {variant.plcBase.toString(16).toUpperCase()}h</div>
        <div><strong>Magnitudes Analizador:</strong> {variant.analyzerVars.join(', ')}</div>
        <div><strong>Dir. Base Analizador:</strong> {variant.analyzerBase.toString(16).padStart(4, '0').toUpperCase()}h</div>
      </div>

      <button
        type="button"
        onclick={handleStart}
        class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md shadow-md transition-colors"
      >
        Ingresar al Laboratorio
      </button>
    </div>
  </div>
</main>
