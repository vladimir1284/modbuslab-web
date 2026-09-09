<script lang="ts">
  import { onMount } from 'svelte';
  import { loadSession, type LabState } from '$lib/lab/log.js';
  import { generateMarkdownReport } from '$lib/lab/report.js';

  let sessionState = $state<LabState | null>(null);
  let markdownText = $state('');

  onMount(() => {
    sessionState = loadSession();
    if (sessionState) {
      markdownText = generateMarkdownReport(sessionState, null);
    }
  });

  function handleDownload() {
    if (!markdownText) return;
    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_modbuslab_estudiante_${sessionState?.listNumber || 1}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<main class="max-w-4xl mx-auto py-8 px-4 space-y-6">
  <div class="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-gray-800">Vista Previa del Informe</h1>
      <p class="text-xs text-gray-500">Generado a partir de la sesión activa del laboratorio</p>
    </div>

    <div class="flex items-center gap-3">
      <button
        type="button"
        onclick={() => window.print()}
        class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded border border-gray-300 shadow-sm"
      >
        Imprimir / PDF
      </button>

      <button
        type="button"
        onclick={handleDownload}
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow transition-colors"
      >
        Descargar Markdown (.md)
      </button>
    </div>
  </div>

  <div class="bg-white p-8 rounded-xl shadow border border-gray-200 font-mono text-xs whitespace-pre-wrap leading-relaxed">
    {#if markdownText}
      {markdownText}
    {:else}
      <div class="text-gray-400 italic text-center py-8">
        No se encontró ninguna sesión activa de laboratorio.
      </div>
    {/if}
  </div>
</main>
