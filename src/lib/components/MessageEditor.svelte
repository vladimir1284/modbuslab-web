<script lang="ts">
  import DataInputDialog from './DataInputDialog.svelte';
  import HexInput from './HexInput.svelte';

  let {
    onSend
  }: {
    onSend: (station: number, pdu: Uint8Array) => void;
  } = $props();

  export const FUNCTION_LABELS: Record<number, string> = {
    0: '0 - Control de estaciones esclavas',
    1: '1 - Lectura de n bits de salida o internos',
    2: '2 - Lectura de n bits de entradas',
    3: '3 - Lectura de n palabras de salidas o internos',
    4: '4 - Lectura de n palabras de entradas',
    5: '5 - Escritura de un bit',
    6: '6 - Escritura de una palabra',
    7: '7 - Lectura rápida de 8 bits',
    8: '8 - Control de contadores de diagnósticos número 1 a 8',
    11: '11 - Control del contador de diagnósticos número 9',
    15: '15 - Escritura de n bits',
    16: '16 - Escritura de n palabras'
  };

  export const FIELD_ENABLE: Record<
    number,
    {
      subfn: boolean;
      addr: boolean;
      count: boolean;
      bytes: boolean;
      data: boolean;
      dataMask: 'HHHH' | 'BB';
    }
  > = {
    0: { subfn: true, addr: false, count: false, bytes: false, data: true, dataMask: 'HHHH' },
    1: { subfn: false, addr: true, count: true, bytes: false, data: false, dataMask: 'HHHH' },
    2: { subfn: false, addr: true, count: true, bytes: false, data: false, dataMask: 'HHHH' },
    3: { subfn: false, addr: true, count: true, bytes: false, data: false, dataMask: 'HHHH' },
    4: { subfn: false, addr: true, count: true, bytes: false, data: false, dataMask: 'HHHH' },
    5: { subfn: false, addr: true, count: false, bytes: false, data: true, dataMask: 'HHHH' },
    6: { subfn: false, addr: true, count: false, bytes: false, data: true, dataMask: 'HHHH' },
    7: { subfn: false, addr: false, count: false, bytes: false, data: false, dataMask: 'HHHH' },
    8: { subfn: true, addr: false, count: false, bytes: false, data: true, dataMask: 'HHHH' },
    11: { subfn: false, addr: false, count: false, bytes: false, data: false, dataMask: 'HHHH' },
    15: { subfn: false, addr: true, count: true, bytes: true, data: true, dataMask: 'BB' },
    16: { subfn: false, addr: true, count: true, bytes: true, data: true, dataMask: 'HHHH' }
  };

  let station = $state(1);
  let fn = $state(1);
  let subfn = $state(0);
  let addr = $state(0);
  let count = $state(1);
  let bytes = $state(2);
  let singleData = $state(0);
  let multiData = $state<number[]>([]);

  let openDataDialog = $state(false);

  let activeConfig = $derived(FIELD_ENABLE[fn] ?? FIELD_ENABLE[1]);

  $effect(() => {
    if (fn === 15) {
      bytes = Math.ceil(count / 8);
    } else if (fn === 16) {
      bytes = count * 2;
    }
  });

  let builtPdu = $derived.by(() => {
    try {
      if (fn === 0) {
        return new Uint8Array([0, (subfn >> 8) & 0xff, subfn & 0xff, (singleData >> 8) & 0xff, singleData & 0xff]);
      }
      if (fn >= 1 && fn <= 4) {
        return new Uint8Array([fn, (addr >> 8) & 0xff, addr & 0xff, (count >> 8) & 0xff, count & 0xff]);
      }
      if (fn === 5 || fn === 6) {
        return new Uint8Array([fn, (addr >> 8) & 0xff, addr & 0xff, (singleData >> 8) & 0xff, singleData & 0xff]);
      }
      if (fn === 7 || fn === 11) {
        return new Uint8Array([fn]);
      }
      if (fn === 8) {
        return new Uint8Array([8, (subfn >> 8) & 0xff, subfn & 0xff, (singleData >> 8) & 0xff, singleData & 0xff]);
      }
      if (fn === 15) {
        const bLen = Math.ceil(count / 8);
        const pdu = new Uint8Array(6 + bLen);
        pdu[0] = 15;
        pdu[1] = (addr >> 8) & 0xff;
        pdu[2] = addr & 0xff;
        pdu[3] = (count >> 8) & 0xff;
        pdu[4] = count & 0xff;
        pdu[5] = bLen;
        for (let i = 0; i < bLen; i++) {
          pdu[6 + i] = multiData[i] ?? 0;
        }
        return pdu;
      }
      if (fn === 16) {
        const bLen = count * 2;
        const pdu = new Uint8Array(6 + bLen);
        pdu[0] = 16;
        pdu[1] = (addr >> 8) & 0xff;
        pdu[2] = addr & 0xff;
        pdu[3] = (count >> 8) & 0xff;
        pdu[4] = count & 0xff;
        pdu[5] = bLen;
        for (let i = 0; i < count; i++) {
          const w = multiData[i] ?? 0;
          pdu[6 + i * 2] = (w >> 8) & 0xff;
          pdu[6 + i * 2 + 1] = w & 0xff;
        }
        return pdu;
      }
      return null;
    } catch {
      return null;
    }
  });

  function handleSend() {
    if (builtPdu) {
      onSend(station, builtPdu);
    }
  }

  function handleOpenDialog() {
    openDataDialog = true;
  }
</script>

<div class="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-4">
  <h2 class="text-md font-bold text-gray-800 border-b pb-2">Editor de mensajes Modbus</h2>

  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <div class="flex flex-col gap-1">
      <label for="station-select" class="text-xs font-semibold text-gray-700">Estación</label>
      <select
        id="station-select"
        bind:value={station}
        class="px-2 py-1 text-sm border rounded border-gray-300 focus:ring-2 focus:ring-indigo-500"
      >
        {#each [0, 1, 2, 3, 4, 5] as s}
          <option value={s}>{s} {s === 0 ? '(Broadcast)' : ''}</option>
        {/each}
      </select>
    </div>

    <div class="flex flex-col gap-1 col-span-2 sm:col-span-3">
      <label for="fn-select" class="text-xs font-semibold text-gray-700">Función</label>
      <select
        id="fn-select"
        bind:value={fn}
        class="px-2 py-1 text-sm border rounded border-gray-300 focus:ring-2 focus:ring-indigo-500"
      >
        {#each Object.entries(FUNCTION_LABELS) as [codeStr, label]}
          <option value={Number(codeStr)}>{label}</option>
        {/each}
      </select>
    </div>

    <HexInput label="SubFunción" width={4} bind:value={subfn} disabled={!activeConfig.subfn} />
    <HexInput label="Dirección" width={4} bind:value={addr} disabled={!activeConfig.addr} />
    <HexInput label="Número" width={4} bind:value={count} disabled={!activeConfig.count} />
    <HexInput label="Octetos" width={2} bind:value={bytes} disabled={!activeConfig.bytes} />

    <div class="col-span-2 sm:col-span-4 flex items-end gap-2">
      {#if fn === 15 || fn === 16}
        <button
          type="button"
          onclick={handleOpenDialog}
          class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded border border-gray-300 flex-1"
        >
          Editar Datos ({fn === 15 ? `${bytes} bytes` : `${count} palabras`})
        </button>
      {:else}
        <div class="flex-1">
          <HexInput label="Datos" width={4} bind:value={singleData} disabled={!activeConfig.data} />
        </div>
      {/if}

      <button
        type="button"
        onclick={handleSend}
        disabled={!builtPdu}
        class="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-bold rounded shadow transition-colors"
      >
        Enviar
      </button>
    </div>
  </div>
</div>

<DataInputDialog
  bind:open={openDataDialog}
  count={fn === 15 ? bytes : count}
  {fn}
  dataMask={activeConfig.dataMask}
  initialValues={multiData}
  onSave={(v) => (multiData = v)}
/>
