<script lang="ts">
  let {
    label = '',
    value = 0,
    unit = '',
    precision = 1
  }: {
    label: string;
    value: number;
    unit?: string;
    precision?: number;
  } = $props();
</script>

<div class="bg-gray-900 text-white p-3 rounded-lg shadow border border-gray-800 flex flex-col justify-between select-none">
  <span class="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{label}</span>
  <div class="font-mono text-emerald-400 font-bold text-lg mt-1">
    {value.toFixed(precision)} <span class="text-xs font-normal text-gray-400">{unit}</span>
  </div>
</div>
