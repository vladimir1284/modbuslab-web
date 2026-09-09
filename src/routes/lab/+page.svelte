<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import FrameConsole from '$lib/components/FrameConsole.svelte';
  import LinkConfig from '$lib/components/LinkConfig.svelte';
  import MessageEditor from '$lib/components/MessageEditor.svelte';
  import PlcMonitor from '$lib/components/PlcMonitor.svelte';
  import AnalyzerMonitor from '$lib/components/AnalyzerMonitor.svelte';
  import TaskChecklist from '$lib/components/TaskChecklist.svelte';
  import type { PlcConfig } from '$lib/devices/plc-masterk.js';
  import { clearSession, loadSession, saveSession } from '$lib/lab/log.js';
  import { buildTasksForVariant, evaluateTask10, evaluateTask8 } from '$lib/lab/tasks.js';
  import { bytesToUint16Array, decodeAnalyzerBlocks, unpackBits, type AnalyzerReadings } from '$lib/lab/decode.js';
  import { getVariant } from '$lib/lab/variants.js';
  import { getCodec } from '$lib/modbus/codec.js';
  import { parsePdu } from '$lib/modbus/pdu.js';
  import Logo from '$lib/components/Logo.svelte';
  import type { CodecName, Exchange } from '$lib/modbus/types.js';
  import { DeviceClient } from '$lib/worker/client.js';

  let activeTab = $state<'bits' | 'registers'>('bits');

  let listNumber = $state(1);
  let variant = $derived(getVariant(listNumber));
  let tasks = $derived(buildTasksForVariant(variant));

  let historyBits = $state<Exchange[]>([]);
  let historyRegisters = $state<Exchange[]>([]);

  let codecBits = $state<CodecName>('rtu');
  let codecRegisters = $state<CodecName>('rtu');

  let delayMsBits = $state(40);
  let delayMsRegisters = $state(40);

  let timeoutMsBits = $state(300);
  let timeoutMsRegisters = $state(300);

  let faultsBits = $state({ lossProbability: 0, corruptProbability: 0, extraDelayMs: 0 });
  let faultsRegisters = $state({ lossProbability: 0, corruptProbability: 0, extraDelayMs: 0 });

  let plcInputs = $state<boolean[]>(Array(18).fill(false));
  let plcOutputs = $state<boolean[]>(Array(12).fill(false));
  let plcConfig = $state<PlcConfig>({
    inputCount: 18,
    outputCount: 12,
    inputBase: 0x0000,
    outputBase: 0x0040,
    ledColor: 'red',
    runProgram: false,
    rules: []
  });

  let analyzerReadings = $state<AnalyzerReadings>({
    V: [220, 220, 220],
    I: [0, 0, 0],
    W: [0, 0, 0],
    VAR: [0, 0, 0],
    PF: [1, 1, 1],
    VLLsum: 0,
    ANeutral: 0,
    WSum: 0,
    VARSum: 0,
    PFSum: 1
  });
  let vtRatio = $state(1.0);
  let ctRatio = $state(25);
  let analyzerStation = $state(1);

  let revealedCt = $state(false);
  let revealedVt = $state(false);

  let monitorPlcRunning = $state(false);
  let monitorAnalyzerRunning = $state(false);

  let client: DeviceClient | null = null;
  let plcMonitorInterval: any = null;
  let analyzerMonitorInterval: any = null;

  let exchangeCounter = 0;
  let tcpTid = 0;

  let completedTaskIds = $derived.by(() => {
    const fullHistory = [...historyBits, ...historyRegisters];
    const set = new Set<string>();

    for (const t of tasks) {
      if (t.id === 'analyzer-8') {
        if (evaluateTask8(fullHistory, variant)) set.add(t.id);
      } else if (t.id === 'task-10') {
        if (evaluateTask10(fullHistory, variant)) set.add(t.id);
      } else {
        if (fullHistory.some((x) => t.matches(x, variant))) {
          set.add(t.id);
        }
      }
    }
    return set;
  });

  onMount(() => {
    client = new DeviceClient();

    const sess = loadSession();
    if (sess) {
      listNumber = sess.listNumber;
      revealedCt = sess.revealedCt ?? false;
      revealedVt = sess.revealedVt ?? false;
      if (sess.history) {
        historyBits = sess.history.filter((x: any) => x.tab === 'bits' || !x.tab);
        historyRegisters = sess.history.filter((x: any) => x.tab === 'registers');
      }
    }
  });

  onDestroy(() => {
    if (plcMonitorInterval) clearInterval(plcMonitorInterval);
    if (analyzerMonitorInterval) clearInterval(analyzerMonitorInterval);
    client?.terminate();
  });

  function persist() {
    saveSession({
      listNumber,
      variantNumber: variant.n,
      startTime: Date.now(),
      history: [
        ...historyBits.map((x) => ({ ...x, tab: 'bits' })),
        ...historyRegisters.map((x) => ({ ...x, tab: 'registers' }))
      ] as any,
      revealedCt,
      revealedVt
    });
  }

  async function updateLinkConfig(tab: 'bits' | 'registers') {
    if (!client) return;
    const isBits = tab === 'bits';
    await client.config({
      delayMs: isBits ? delayMsBits : delayMsRegisters,
      timeoutMs: isBits ? timeoutMsBits : timeoutMsRegisters,
      faults: isBits ? faultsBits : faultsRegisters
    });
  }

  async function sendModbusPdu(
    station: number,
    pdu: Uint8Array,
    origin: 'student' | 'monitor' = 'student'
  ): Promise<Exchange | undefined> {
    if (!client) return undefined;
    const curTab = activeTab;
    const codecName = curTab === 'bits' ? codecBits : codecRegisters;
    const timeout = curTab === 'bits' ? timeoutMsBits : timeoutMsRegisters;
    const codec = getCodec(codecName);

    // MBAP tid: incremented per request, response must echo it (README §4.2).
    const tcpCtx = codecName === 'tcp' ? { transactionId: (tcpTid = (tcpTid + 1) & 0xffff) } : undefined;
    const txFrame = codec.encode(station, pdu, tcpCtx);
    const startMs = Date.now();

    let rxFrame: Uint8Array | undefined = undefined;
    let ok = false;
    let errStr: string | undefined = undefined;
    let elapsed = 0;

    try {
      const res = await client.tx(txFrame, codecName, timeout, origin);
      if (res.t === 'rx') {
        rxFrame = res.frame;
        elapsed = res.elapsedMs;
        ok = true;
      } else if (res.t === 'timeout') {
        elapsed = res.elapsedMs;
        errStr = 'Timeout';
      }
    } catch (e: any) {
      errStr = e?.message || 'Error de envío';
      elapsed = Date.now() - startMs;
    }

    let reqPdu;
    let resPdu;
    try {
      reqPdu = parsePdu(pdu, station);
    } catch {}
    if (rxFrame) {
      try {
        const decodedFrame = codec.decode(rxFrame, tcpCtx);
        resPdu = parsePdu(decodedFrame.pdu, decodedFrame.unit);
      } catch (e: any) {
        ok = false;
        errStr = e?.message || 'Error de decodificación';
      }
    }

    const exchange: Exchange = {
      id: ++exchangeCounter,
      timestamp: Date.now(),
      origin,
      codec: codecName,
      txFrame,
      rxFrame,
      reqPdu,
      resPdu,
      error: errStr,
      elapsedMs: elapsed,
      ok
    };

    // Check condition to reveal CT/VT scale source label
    if (origin === 'student' && ok && station === analyzerStation && reqPdu && (reqPdu.fn === 3 || reqPdu.fn === 4)) {
      if (reqPdu.addr !== undefined && reqPdu.count !== undefined) {
        if (reqPdu.addr <= 0x1082 && reqPdu.addr + reqPdu.count > 0x1082) revealedVt = true;
        if (reqPdu.addr <= 0x1084 && reqPdu.addr + reqPdu.count > 0x1084) revealedCt = true;
      }
    }

    if (curTab === 'bits') {
      historyBits = [exchange, ...historyBits];
    } else {
      historyRegisters = [exchange, ...historyRegisters];
    }
    persist();
    return exchange;
  }

  function togglePlcMonitor() {
    monitorPlcRunning = !monitorPlcRunning;
    if (monitorPlcRunning) {
      plcMonitorInterval = setInterval(async () => {
        // Sondeo periódico PLC: fn 01 entradas y fn 01 salidas (bases configurables)
        const inAddr = plcConfig.inputBase;
        const pduIn = new Uint8Array([1, (inAddr >> 8) & 0xff, inAddr & 0xff, 0, plcConfig.inputCount]);
        const exIn = await sendModbusPdu(2, pduIn, 'monitor');
        if (exIn?.ok && exIn.resPdu?.data) {
          plcInputs = unpackBits(exIn.resPdu.data as Uint8Array, plcConfig.inputCount);
        }

        const outAddr = plcConfig.outputBase;
        const pduOut = new Uint8Array([1, (outAddr >> 8) & 0xff, outAddr & 0xff, 0, plcConfig.outputCount]);
        const exOut = await sendModbusPdu(2, pduOut, 'monitor');
        if (exOut?.ok && exOut.resPdu?.data) {
          plcOutputs = unpackBits(exOut.resPdu.data as Uint8Array, plcConfig.outputCount);
        }
      }, 1000);
    } else {
      clearInterval(plcMonitorInterval);
    }
  }

  let analyzerCycleCount = 0;
  function toggleAnalyzerMonitor() {
    monitorAnalyzerRunning = !monitorAnalyzerRunning;
    if (monitorAnalyzerRunning) {
      analyzerMonitorInterval = setInterval(async () => {
        analyzerCycleCount++;
        // Sondeo periódico Analizador: 3 lecturas fn 04
        const ex1 = await sendModbusPdu(analyzerStation, new Uint8Array([4, 0x02, 0x80, 0, 12]), 'monitor');
        const ex2 = await sendModbusPdu(analyzerStation, new Uint8Array([4, 0x02, 0x98, 0, 12]), 'monitor');
        const ex3 = await sendModbusPdu(analyzerStation, new Uint8Array([4, 0x02, 0xb0, 0, 8]), 'monitor');
        if (ex1?.ok && ex2?.ok && ex3?.ok && ex1.resPdu?.data && ex2.resPdu?.data && ex3.resPdu?.data) {
          const block1 = bytesToUint16Array(ex1.resPdu.data as Uint8Array);
          const block2 = bytesToUint16Array(ex2.resPdu.data as Uint8Array);
          const block3 = bytesToUint16Array(ex3.resPdu.data as Uint8Array);
          analyzerReadings = decodeAnalyzerBlocks(block1, block2, block3, ctRatio, vtRatio);
        }

        // Cada 5 ciclos (5s), leer Vt_ratio y Ct_ratio
        if (analyzerCycleCount % 5 === 0) {
          const exVtCt = await sendModbusPdu(analyzerStation, new Uint8Array([3, 0x10, 0x82, 0, 2]), 'monitor');
          if (exVtCt?.ok && exVtCt.resPdu?.data) {
            const regs = bytesToUint16Array(exVtCt.resPdu.data as Uint8Array);
            if (regs[0] !== undefined) vtRatio = regs[0] / 10;
            if (regs[1] !== undefined) ctRatio = regs[1];
          }
        }
      }, 1000);
    } else {
      clearInterval(analyzerMonitorInterval);
    }
  }

  function handleSwitchTab(tab: 'bits' | 'registers') {
    activeTab = tab;
    // Detener ambos monitores al cambiar de pestaña
    if (monitorPlcRunning) togglePlcMonitor();
    if (monitorAnalyzerRunning) toggleAnalyzerMonitor();
  }

  function handleRestartSession() {
    if (confirm('¿Estás seguro de reiniciar la sesión del laboratorio? Se borrará la bitácora.')) {
      clearSession();
      historyBits = [];
      historyRegisters = [];
      revealedCt = false;
      revealedVt = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-100 flex flex-col">
  <header class="bg-indigo-900 text-white p-4 shadow-md flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Logo size="md" variant="dark" />
      <span class="bg-indigo-800 text-indigo-200 text-xs px-2.5 py-1 rounded font-mono border border-indigo-700">
        Estudiante nº {listNumber} · Variante {variant.n}
      </span>
    </div>

    <div class="flex items-center gap-3">
      <a href="/informe" target="_blank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded shadow transition-colors">
        Generar / Ver Informe
      </a>
      <button type="button" onclick={handleRestartSession} class="px-3 py-1.5 bg-red-800 hover:bg-red-900 text-xs font-bold rounded shadow transition-colors">
        Reiniciar Laboratorio
      </button>
    </div>
  </header>

  <div class="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 gap-4">
    <!-- Vertical Tabs Left -->
    <nav class="flex md:flex-col gap-2 shrink-0 w-full md:w-48">
      <button
        type="button"
        onclick={() => handleSwitchTab('bits')}
        class="flex-1 md:flex-initial p-3 text-left font-bold text-sm rounded-lg border transition-colors flex items-center gap-2"
        class:bg-indigo-600={activeTab === 'bits'}
        class:text-white={activeTab === 'bits'}
        class:border-indigo-700={activeTab === 'bits'}
        class:bg-white={activeTab !== 'bits'}
        class:text-gray-700={activeTab !== 'bits'}
        class:border-gray-200={activeTab !== 'bits'}
      >
        <span>Bits Operations</span>
      </button>

      <button
        type="button"
        onclick={() => handleSwitchTab('registers')}
        class="flex-1 md:flex-initial p-3 text-left font-bold text-sm rounded-lg border transition-colors flex items-center gap-2"
        class:bg-indigo-600={activeTab === 'registers'}
        class:text-white={activeTab === 'registers'}
        class:border-indigo-700={activeTab === 'registers'}
        class:bg-white={activeTab !== 'registers'}
        class:text-gray-700={activeTab !== 'registers'}
        class:border-gray-200={activeTab !== 'registers'}
      >
        <span>Registers Operations</span>
      </button>

      <div class="hidden md:block mt-auto pt-4">
        <TaskChecklist tasks={tasks} completedTaskIds={completedTaskIds} />
      </div>
    </nav>

    <!-- Main Active Tab Content -->
    <main class="flex-1 space-y-4 overflow-hidden">
      {#if activeTab === 'bits'}
        <MessageEditor onSend={(st, pdu) => sendModbusPdu(st, pdu)} />
        <LinkConfig
          bind:codec={codecBits}
          bind:delayMs={delayMsBits}
          bind:timeoutMs={timeoutMsBits}
          bind:faults={faultsBits}
          onChange={() => updateLinkConfig('bits')}
        />
        <FrameConsole history={historyBits} />
        <PlcMonitor
          inputs={plcInputs}
          outputs={plcOutputs}
          monitorRunning={monitorPlcRunning}
          config={plcConfig}
          onToggleMonitor={togglePlcMonitor}
          onToggleInput={(b) => client?.setInput(b, !plcInputs[b])}
          onSaveConfig={(cfg) => {
            plcConfig = cfg;
            client?.config({ plc: cfg });
          }}
        />
      {:else}
        <MessageEditor onSend={(st, pdu) => sendModbusPdu(st, pdu)} />
        <LinkConfig
          bind:codec={codecRegisters}
          bind:delayMs={delayMsRegisters}
          bind:timeoutMs={timeoutMsRegisters}
          bind:faults={faultsRegisters}
          onChange={() => updateLinkConfig('registers')}
        />
        <FrameConsole history={historyRegisters} />
        <AnalyzerMonitor
          readings={analyzerReadings}
          vtRatio={vtRatio}
          ctRatio={ctRatio}
          stationNumber={analyzerStation}
          monitorRunning={monitorAnalyzerRunning}
          revealedCt={revealedCt}
          revealedVt={revealedVt}
          onToggleMonitor={toggleAnalyzerMonitor}
          onToggleLoad={(p, s, on, kw, pf) => client?.setLoad(p, s, on, kw, pf)}
        />
      {/if}

      <div class="md:hidden pt-2">
        <TaskChecklist tasks={tasks} completedTaskIds={completedTaskIds} />
      </div>
    </main>
  </div>
</div>
