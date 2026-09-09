<script lang="ts">
  let {
    label = '',
    addressHex = '00',
    on = false,
    color = 'red',
    isInput = true,
    onClick
  }: {
    label: string;
    addressHex: string;
    on?: boolean;
    color?: 'red' | 'green';
    isInput?: boolean;
    onClick?: () => void;
  } = $props();
</script>

<div class="flex flex-col items-center gap-1 select-none">
  <span class="text-[10px] font-bold text-gray-600">{label}</span>
  <button
    type="button"
    onclick={onClick}
    disabled={!isInput}
    class="relative w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center bg-gray-200 shadow-inner focus:outline-none"
    class:cursor-pointer={isInput}
    class:cursor-default={!isInput}
    title={isInput ? 'Clic para conmutar entrada física' : 'Salida del PLC'}
  >
    <svg class="w-6 h-6" viewBox="0 0 32 32">
      <defs>
        <radialGradient id="redOn" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ff8888" />
          <stop offset="40%" stop-color="#ff0000" />
          <stop offset="100%" stop-color="#880000" />
        </radialGradient>
        <radialGradient id="redOff" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#773333" />
          <stop offset="100%" stop-color="#331111" />
        </radialGradient>
        <radialGradient id="greenOn" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#88ff88" />
          <stop offset="40%" stop-color="#00cc00" />
          <stop offset="100%" stop-color="#005500" />
        </radialGradient>
        <radialGradient id="greenOff" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#337733" />
          <stop offset="100%" stop-color="#113311" />
        </radialGradient>
      </defs>

      <circle
        cx="16"
        cy="16"
        r="14"
        fill={color === 'red' ? (on ? 'url(#redOn)' : 'url(#redOff)') : (on ? 'url(#greenOn)' : 'url(#greenOff)')}
      />
      {#if on}
        <circle cx="16" cy="16" r="15" fill="none" stroke={color === 'red' ? '#ff6666' : '#66ff66'} stroke-width="1.5" class="animate-pulse" />
      {/if}
    </svg>
  </button>
  <span class="text-[9px] font-mono text-gray-500">{addressHex}h</span>
</div>
