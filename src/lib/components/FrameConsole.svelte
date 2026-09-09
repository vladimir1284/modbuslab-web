<script lang="ts">
  import { EXCEPTION_NAMES } from '../modbus/exceptions.js';
  import { bytesToHex } from '../modbus/hex.js';
  import type { Exchange } from '../modbus/types.js';

  let {
    history = []
  }: {
    history: Exchange[];
  } = $props();

  let rawMode = $state(false);
  let expandedIds = $state<Set<number>>(new Set());

  function toggleExpand(id: number) {
    if (expandedIds.has(id)) {
      expandedIds.delete(id);
    } else {
      expandedIds.add(id);
    }
    expandedIds = new Set(expandedIds);
  }

  function formatRawString(x: Exchange): string {
    const tx = Array.from(x.txFrame).join('-');
    const rx = x.rxFrame ? Array.from(x.rxFrame).join('-') : 'TIMEOUT';
    return `-> ${tx}\n<- ${rx}`;
  }
</script>

<div class="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-3">
  <div class="flex items-center justify-between border-b pb-2">
    <h2 class="text-md font-bold text-gray-800">Consola de Tramas</h2>
    <label class="flex items-center gap-2 text-xs text-gray-600 font-semibold cursor-pointer">
      <input type="checkbox" bind:checked={rawMode} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
      Modo crudo (estilo 2012)
    </label>
  </div>

  <div class="max-h-72 overflow-y-auto space-y-1 font-mono text-xs">
    {#if history.length === 0}
      <div class="text-gray-400 italic p-2 text-center">No hay tramas registradas en esta sesión</div>
    {:else}
      {#each history as x (x.id)}
        {#if rawMode}
          <div class="bg-gray-900 text-green-400 p-2 rounded whitespace-pre">
            {formatRawString(x)}
          </div>
        {:else}
          <div class="border rounded border-gray-200 overflow-hidden">
            <button
              type="button"
              onclick={() => toggleExpand(x.id)}
              class="w-full text-left p-2 hover:bg-gray-50 flex items-center justify-between gap-2 border-l-4"
              class:border-l-emerald-500={x.ok}
              class:border-l-red-500={!x.ok}
            >
              <div class="flex items-center gap-3 overflow-hidden">
                <span class="text-gray-400 shrink-0">{new Date(x.timestamp).toLocaleTimeString()}</span>
                <span class="text-indigo-600 font-bold shrink-0">→ {bytesToHex(x.txFrame)}</span>
                <span class="shrink-0" class:text-emerald-700={x.ok} class:text-red-600={!x.ok}>
                  ← {x.rxFrame ? bytesToHex(x.rxFrame) : '(Timeout)'}
                </span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-sans">{x.elapsedMs} ms</span>
                <span class="text-gray-400">{expandedIds.has(x.id) ? '▲' : '▼'}</span>
              </div>
            </button>

            {#if expandedIds.has(x.id)}
              <div class="p-3 bg-gray-50 border-t text-gray-700 space-y-2 border-gray-100">
                <div class="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span class="font-bold">Origen:</span> {x.origin}</div>
                  <div><span class="font-bold">Encuadre:</span> {x.codec.toUpperCase()}</div>
                </div>

                {#if x.reqPdu}
                  <div class="bg-white p-2 rounded border">
                    <div class="font-bold text-indigo-700">Petición (PDU):</div>
                    <div>Estación: {x.reqPdu.unit} | Fn: {x.reqPdu.fn} {#if x.reqPdu.addr !== undefined}| Dir: {x.reqPdu.addr.toString(16).padStart(4, '0')}h ({x.reqPdu.addr}){/if} {#if x.reqPdu.count !== undefined}| Cant: {x.reqPdu.count}{/if}</div>
                  </div>
                {/if}

                {#if x.resPdu}
                  <div class="bg-white p-2 rounded border">
                    <div class="font-bold" class:text-emerald-700={!x.resPdu.isException} class:text-red-600={x.resPdu.isException}>
                      Respuesta (PDU): {#if x.resPdu.isException}EXCEPCIÓN {x.resPdu.exceptionCode} ({EXCEPTION_NAMES[x.resPdu.exceptionCode ?? 0] || 'DESCONOCIDA'}){/if}
                    </div>
                    {#if !x.resPdu.isException && x.resPdu.data}
                      <div>Datos: {bytesToHex(x.resPdu.data)}</div>
                    {/if}
                  </div>
                {:else if !x.ok}
                  <div class="text-red-600 font-bold bg-red-50 p-2 rounded border border-red-200">
                    Error: {x.error || 'Timeout sin respuesta'}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>
