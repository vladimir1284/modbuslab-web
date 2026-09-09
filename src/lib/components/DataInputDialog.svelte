<script lang="ts">
  import HexInput from './HexInput.svelte';

  let {
    open = $bindable(false),
    count = 1,
    fn = 16,
    dataMask = 'HHHH',
    initialValues = [] as number[],
    onSave
  }: {
    open: boolean;
    count: number;
    fn: number;
    dataMask?: 'HHHH' | 'BB';
    initialValues?: number[];
    onSave: (values: number[]) => void;
  } = $props();

  let values = $state<number[]>([]);
  let binInputs = $state<string[]>([]);

  $effect(() => {
    if (open) {
      if (fn === 15) {
        // Binary inputs for fn 15 (bytes count)
        binInputs = Array.from({ length: count }, (_, i) => {
          const v = initialValues[i] ?? 0;
          return v.toString(2).padStart(8, '0');
        });
      } else {
        values = Array.from({ length: count }, (_, i) => initialValues[i] ?? 0);
      }
    }
  });

  function handleSave() {
    if (fn === 15) {
      const parsed = binInputs.map((b) => parseInt(b.replace(/[^01]/g, ''), 2) || 0);
      onSave(parsed);
    } else {
      onSave(values);
    }
    open = false;
  }
</script>

{#if open}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[80vh] flex flex-col">
      <h3 class="text-lg font-bold text-gray-800">
        Ingresar datos ({fn === 15 ? `${count} octeto(s) binarios` : `${count} palabra(s) hex`})
      </h3>

      <div class="flex-1 overflow-y-auto space-y-2 pr-2">
        {#if fn === 15}
          {#each binInputs as binStr, i}
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono w-16">Octeto {i + 1}:</span>
              <input
                type="text"
                maxlength="12"
                value={binInputs[i]}
                onfocus={(e) => {
                  const target = e.currentTarget as HTMLInputElement;
                  setTimeout(() => target.select(), 0);
                }}
                oninput={(e) => {
                  const target = e.target as HTMLInputElement;
                  let clean = target.value.replace(/[^01]/g, '');
                  while (clean.length > 8 && clean.startsWith('0')) {
                    clean = clean.slice(1);
                  }
                  binInputs[i] = clean.slice(0, 8);
                }}
                class="flex-1 px-2 py-1 text-sm font-mono border rounded border-gray-300 focus:ring-2 focus:ring-indigo-500"
                placeholder="10110010"
              />
            </div>
          {/each}
        {:else}
          {#each values as val, i}
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono w-24">Reg {i + 1}:</span>
              <div class="flex-1">
                <HexInput width={4} bind:value={values[i]} />
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <div class="flex justify-end gap-2 pt-2 border-t">
        <button
          type="button"
          onclick={() => (open = false)}
          class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          Cancelar
        </button>
        <button
          type="button"
          onclick={handleSave}
          class="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold"
        >
          Aceptar
        </button>
      </div>
    </div>
  </div>
{/if}
