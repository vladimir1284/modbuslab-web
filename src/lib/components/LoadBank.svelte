<script lang="ts">
  let {
    onToggleLoad
  }: {
    onToggleLoad: (phase: 0 | 1 | 2, slot: number, on: boolean, kw: number, pf: number) => void;
  } = $props();

  const PHASES = ['Fase L1', 'Fase L2', 'Fase L3'];
  const INITIAL_SLOTS = [
    { label: 'Carga Inductiva A (1.0 kW, fp 0.95 L)', kw: 1.0, pf: 0.95 },
    { label: 'Carga Inductiva B (2.0 kW, fp 0.85 L)', kw: 2.0, pf: 0.85 },
    { label: 'Carga Capacitiva C (0.5 kW, fp 0.90 C)', kw: 0.5, pf: -0.90 }
  ];

  let states = $state([
    [false, false, false],
    [false, false, false],
    [false, false, false]
  ]);

  function toggle(phaseIdx: 0 | 1 | 2, slotIdx: number) {
    states[phaseIdx][slotIdx] = !states[phaseIdx][slotIdx];
    const slotInfo = INITIAL_SLOTS[slotIdx];
    onToggleLoad(phaseIdx, slotIdx, states[phaseIdx][slotIdx], slotInfo.kw, slotInfo.pf);
  }
</script>

<div class="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-3">
  <h2 class="text-md font-bold text-gray-800 border-b pb-2">Banco de Cargas Trifásico Virtual</h2>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    {#each PHASES as phaseName, pIdx}
      <div class="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
        <h3 class="text-xs font-bold text-indigo-700 uppercase tracking-wider">{phaseName}</h3>
        <div class="space-y-1.5">
          {#each INITIAL_SLOTS as slot, sIdx}
            <button
              type="button"
              onclick={() => toggle(pIdx as 0 | 1 | 2, sIdx)}
              class="w-full text-left px-2 py-1.5 text-xs rounded font-semibold border flex items-center justify-between transition-colors"
              class:bg-emerald-100={states[pIdx][sIdx]}
              class:border-emerald-400={states[pIdx][sIdx]}
              class:text-emerald-900={states[pIdx][sIdx]}
              class:bg-white={!states[pIdx][sIdx]}
              class:border-gray-300={!states[pIdx][sIdx]}
              class:text-gray-700={!states[pIdx][sIdx]}
            >
              <span>{slot.label}</span>
              <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded" class:bg-emerald-600={states[pIdx][sIdx]} class:text-white={states[pIdx][sIdx]} class:bg-gray-200={!states[pIdx][sIdx]}>
                {states[pIdx][sIdx] ? 'ON' : 'OFF'}
              </span>
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
