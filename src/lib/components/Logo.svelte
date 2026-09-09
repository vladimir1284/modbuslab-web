<script lang="ts">
  interface Props {
    size?: 'sm' | 'md' | 'lg' | 'xl' | number;
    showText?: boolean;
    variant?: 'dark' | 'light';
    showTag?: boolean;
    class?: string;
  }

  let {
    size = 'md',
    showText = true,
    variant = 'dark',
    showTag = true,
    class: className = ''
  }: Props = $props();

  let iconSize = $derived.by(() => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm': return 24;
      case 'md': return 32;
      case 'lg': return 40;
      case 'xl': return 56;
      default: return 32;
    }
  });

  let textSizeClass = $derived.by(() => {
    switch (size) {
      case 'sm': return 'text-sm';
      case 'md': return 'text-lg';
      case 'lg': return 'text-2xl';
      case 'xl': return 'text-3xl';
      default: return 'text-lg';
    }
  });

  let tagSizeClass = $derived.by(() => {
    switch (size) {
      case 'sm': return 'text-[9px] px-1 py-0.2';
      case 'md': return 'text-[10px] px-1.5 py-0.5';
      case 'lg': return 'text-xs px-2 py-0.5';
      case 'xl': return 'text-sm px-2.5 py-1';
      default: return 'text-[10px] px-1.5 py-0.5';
    }
  });
</script>

<div class="inline-flex items-center gap-2.5 select-none {className}">
  <!-- SVG Icon Mark -->
  <svg
    width={iconSize}
    height={iconSize}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="shrink-0 drop-shadow-sm"
  >
    <defs>
      <linearGradient id="logo-bg-grad-{iconSize}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1b4b" />
        <stop offset="100%" stop-color="#312e81" />
      </linearGradient>
      <linearGradient id="logo-wave-grad-{iconSize}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="50%" stop-color="#34d399" />
        <stop offset="100%" stop-color="#fbbf24" />
      </linearGradient>
      <filter id="logo-glow-{iconSize}" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Outer Rounded Box -->
    <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#logo-bg-grad-{iconSize})" stroke="#4338ca" stroke-width="1.5" />

    <!-- Dashed Bus line accent -->
    <line x1="10" y1="48" x2="54" y2="48" stroke="#3730a3" stroke-width="1.5" stroke-dasharray="2 2" />

    <!-- Stylized M / Digital Signal Trace -->
    <path
      d="M 12 44 V 20 L 22 20 V 36 L 32 16 L 42 36 V 20 L 52 20 V 44"
      stroke="url(#logo-wave-grad-{iconSize})"
      stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      filter="url(#logo-glow-{iconSize})"
    />

    <!-- Connected Nodes -->
    <!-- Station 1 Node (Analyzer) -->
    <circle cx="12" cy="44" r="3" fill="#38bdf8" stroke="#0284c7" stroke-width="1" />
    <circle cx="12" cy="44" r="1.2" fill="#ffffff" />

    <!-- Station 2 Node (PLC) -->
    <circle cx="52" cy="44" r="3" fill="#34d399" stroke="#059669" stroke-width="1" />
    <circle cx="52" cy="44" r="1.2" fill="#ffffff" />

    <!-- Center Pulse Peak Indicator -->
    <circle cx="32" cy="16" r="2.5" fill="#fbbf24" />
  </svg>

  {#if showText}
    <div class="flex items-center gap-1.5 font-extrabold tracking-tight {textSizeClass}">
      <span class={variant === 'dark' ? 'text-white' : 'text-indigo-950'}>
        Modbus<span class={variant === 'dark' ? 'text-cyan-400' : 'text-sky-600'}>Lab</span>
      </span>

      {#if showTag}
        <span class="font-mono font-bold uppercase rounded tracking-wider border {tagSizeClass} {variant === 'dark' ? 'bg-indigo-800 text-sky-300 border-indigo-700' : 'bg-indigo-100 text-indigo-900 border-indigo-200'}">
          Web
        </span>
      {/if}
    </div>
  {/if}
</div>
