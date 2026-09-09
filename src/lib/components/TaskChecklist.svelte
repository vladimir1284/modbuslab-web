<script lang="ts">
  import type { Task } from '../lab/tasks.js';

  let {
    tasks = [] as Task[],
    completedTaskIds = new Set<string>()
  }: {
    tasks: Task[];
    completedTaskIds: Set<string>;
  } = $props();

  let mandatoryTasks = $derived(tasks.filter((t) => !t.optional));
  let optionalTasks = $derived(tasks.filter((t) => t.optional));

  let completedMandatoryCount = $derived(
    mandatoryTasks.filter((t) => completedTaskIds.has(t.id)).length
  );

  let progressPercent = $derived(
    mandatoryTasks.length > 0 ? Math.round((completedMandatoryCount / mandatoryTasks.length) * 100) : 0
  );
</script>

<div class="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-3">
  <div class="flex items-center justify-between border-b pb-2">
    <div>
      <h2 class="text-md font-bold text-gray-800">Verificación de Tareas (Variante)</h2>
      <p class="text-xs text-gray-500">
        Progreso: {completedMandatoryCount}/{mandatoryTasks.length} ({progressPercent}%)
      </p>
    </div>
    <div class="w-32 bg-gray-200 h-2.5 rounded-full overflow-hidden">
      <div class="bg-emerald-500 h-full transition-all duration-300" style={`width: ${progressPercent}%`}></div>
    </div>
  </div>

  <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
    {#each mandatoryTasks as t}
      {@const done = completedTaskIds.has(t.id)}
      <div
        class="flex items-center justify-between p-2 rounded text-xs border transition-colors"
        class:bg-emerald-50={done}
        class:border-emerald-200={done}
        class:text-emerald-900={done}
        class:bg-gray-50={!done}
        class:border-gray-200={!done}
        class:text-gray-700={!done}
      >
        <span class="font-medium">{t.label}</span>
        <span class="font-bold shrink-0">{done ? '✓ CUMPLIDA' : '⏳ PENDIENTE'}</span>
      </div>
    {/each}

    {#if optionalTasks.length > 0}
      <div class="pt-2 border-t mt-2">
        <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tareas Opcionales</h3>
        {#each optionalTasks as t}
          {@const done = completedTaskIds.has(t.id)}
          <div
            class="flex items-center justify-between p-2 rounded text-xs border"
            class:bg-amber-50={done}
            class:border-amber-200={done}
            class:text-amber-900={done}
            class:bg-gray-50={!done}
            class:border-gray-200={!done}
            class:text-gray-600={!done}
          >
            <span>{t.label}</span>
            <span class="font-bold shrink-0">{done ? '✓ COMPLETADA' : 'OPCIONAL'}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
