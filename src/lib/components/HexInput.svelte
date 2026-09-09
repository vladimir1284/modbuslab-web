<script lang="ts">
  import { formatHex } from '../modbus/hex.js';

  let {
    value = $bindable(0),
    width = 4, // 4 for HHHH, 2 for HH
    disabled = false,
    label = '',
    id = ''
  }: {
    value: number;
    width?: number;
    disabled?: boolean;
    label?: string;
    id?: string;
  } = $props();

  let hexText = $derived(formatHex(value, width));

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const clean = target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, width);
    const parsed = parseInt(clean, 16);
    value = isNaN(parsed) ? 0 : parsed;
  }
</script>

<div class="flex flex-col gap-1">
  {#if label}
    <label for={id} class="text-xs font-semibold text-gray-700">{label}</label>
  {/if}
  <div class="relative group">
    <input
      {id}
      type="text"
      value={hexText}
      oninput={handleInput}
      {disabled}
      maxlength={width}
      class="w-full px-2 py-1 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
    />
    <div
      class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded shadow pointer-events-none z-10 whitespace-nowrap"
    >
      Dec: {value} (0x{formatHex(value, width)})
    </div>
  </div>
</div>
