<script lang="ts">
  let {
    label = 'Instrumento',
    value = 0,
    unit = 'V',
    maxScale = $bindable(300),
    revealedScaleLabel = '',
    revealed = false
  }: {
    label: string;
    value: number;
    unit?: string;
    maxScale?: number;
    revealedScaleLabel?: string;
    revealed?: boolean;
  } = $props();

  let angle = $derived.by(() => {
    const clamped = Math.max(0, Math.min(value, maxScale));
    const fraction = clamped / maxScale;
    return -135 + fraction * 270;
  });
</script>

<div class="bg-gray-900 text-white p-3 rounded-lg shadow border border-gray-800 flex flex-col items-center gap-2 select-none">
  <div class="flex items-center justify-between w-full">
    <span class="text-xs font-bold tracking-wider text-gray-300 uppercase">{label}</span>
    {#if revealed && revealedScaleLabel}
      <span class="text-[10px] text-amber-400 font-mono bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
        {revealedScaleLabel}
      </span>
    {/if}
  </div>

  <div class="relative w-36 h-36 flex items-center justify-center">
    <svg viewBox="0 0 100 100" class="w-full h-full">
      <path
        d="M 18 82 A 42 42 0 1 1 82 82"
        fill="none"
        stroke="#475569"
        stroke-width="4"
        stroke-linecap="round"
      />

      {#each [0, 0.25, 0.5, 0.75, 1.0] as frac}
        {@const tickAngle = (-135 + frac * 270) * (Math.PI / 180)}
        {@const x1 = 50 + 36 * Math.sin(tickAngle)}
        {@const y1 = 50 - 36 * Math.cos(tickAngle)}
        {@const x2 = 50 + 42 * Math.sin(tickAngle)}
        {@const y2 = 50 - 42 * Math.cos(tickAngle)}
        {@const lx = 50 + 28 * Math.sin(tickAngle)}
        {@const ly = 50 - 28 * Math.cos(tickAngle)}
        <line {x1} {y1} {x2} {y2} stroke="#94a3b8" stroke-width="2" />
        <text
          x={lx}
          y={ly}
          fill="#cbd5e1"
          font-size="6"
          text-anchor="middle"
          dominant-baseline="central"
          font-family="monospace"
        >
          {Math.round(frac * maxScale)}
        </text>
      {/each}

      <g transform={`rotate(${angle}, 50, 50)`}>
        <line x1="50" y1="50" x2="50" y2="14" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="50" cy="50" r="4" fill="#ef4444" />
      </g>
    </svg>
  </div>

  <div class="flex items-center justify-between w-full pt-1 border-t border-gray-800 text-xs">
    <div class="font-mono text-emerald-400 font-bold text-sm">
      {value.toFixed(1)} <span class="text-xs text-gray-400">{unit}</span>
    </div>
    <div class="flex items-center gap-1 text-[10px] text-gray-400">
      <span>Máx:</span>
      <input
        type="number"
        bind:value={maxScale}
        min="10"
        max="10000"
        class="w-12 px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-right font-mono text-white focus:outline-none focus:border-indigo-500"
      />
    </div>
  </div>
</div>
