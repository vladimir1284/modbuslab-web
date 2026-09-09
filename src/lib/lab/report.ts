import { bytesToHex } from '../modbus/hex.js';
import type { LabState } from './log.js';
import { buildTasksForVariant, evaluateTask10, evaluateTask8 } from './tasks.js';
import { getVariant } from './variants.js';

export function generateMarkdownReport(state: LabState, snapshot: any): string {
  const v = getVariant(state.variantNumber);
  const tasks = buildTasksForVariant(v);
  const durationMinutes = Math.round((Date.now() - state.startTime) / 60000);

  let md = `# Informe de laboratorio — ModbusLab\n\n`;
  md += `- **Estudiante nº:** ${state.listNumber}\n`;
  md += `- **Variante:** ${state.variantNumber}\n`;
  md += `- **Fecha:** ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}\n`;
  md += `- **Duración de la sesión:** ${durationMinutes} min\n\n`;

  md += `## Resultado de las tareas\n\n`;
  md += `| Tarea | Estado | Trama que la cumplió | Respuesta |\n`;
  md += `|---|---|---|---|\n`;

  for (const t of tasks) {
    let ok = false;
    let matchEx: any = null;

    if (t.id === 'analyzer-8') {
      ok = evaluateTask8(state.history, v);
    } else if (t.id === 'task-10') {
      ok = evaluateTask10(state.history, v);
    } else {
      matchEx = state.history.find((x) => t.matches(x, v));
      ok = !!matchEx;
    }

    const statusStr = ok ? '✓ CUMPLIDA' : '✗ PENDIENTE';
    const txHex = matchEx ? bytesToHex(matchEx.txFrame) : '-';
    const rxHex = matchEx && matchEx.rxFrame ? bytesToHex(matchEx.rxFrame) : '-';

    md += `| ${t.label} | ${statusStr} | \`${txHex}\` | \`${rxHex}\` |\n`;
  }

  md += `\n## Bitácora completa (${state.history.length} intercambios)\n\n`;
  md += `| Hora | Origen | Encuadre | Envío (Tx) | Respuesta (Rx) | Estado |\n`;
  md += `|---|---|---|---|---|---|\n`;

  for (const x of state.history) {
    const time = new Date(x.timestamp).toLocaleTimeString('es-ES');
    const tx = bytesToHex(x.txFrame);
    const rx = x.rxFrame ? bytesToHex(x.rxFrame) : '(Timeout)';
    const st = x.ok ? 'OK' : x.error || 'ERROR';
    md += `| ${time} | ${x.origin} | ${x.codec.toUpperCase()} | \`${tx}\` | \`${rx}\` | ${st} |\n`;
  }

  if (snapshot) {
    md += `\n## Estado final de los dispositivos\n\n`;
    md += `### PLC (Master-K120S)\n`;
    md += `- **Entradas:** ${snapshot.plcInputs ? snapshot.plcInputs.map((b: boolean) => (b ? '1' : '0')).join('') : '-'}\n`;
    md += `- **Salidas:** ${snapshot.plcOutputs ? snapshot.plcOutputs.map((b: boolean) => (b ? '1' : '0')).join('') : '-'}\n\n`;

    if (snapshot.analyzerState) {
      const st = snapshot.analyzerState;
      md += `### Analizador (WM14)\n`;
      md += `- **Tensiones LN:** V1=${st.V[0].toFixed(1)}V, V2=${st.V[1].toFixed(1)}V, V3=${st.V[2].toFixed(1)}V\n`;
      md += `- **Corrientes:** I1=${st.I[0].toFixed(2)}A, I2=${st.I[1].toFixed(2)}A, I3=${st.I[2].toFixed(2)}A\n`;
      md += `- **Frecuencia:** ${st.f.toFixed(1)} Hz\n`;
      md += `- **Energía:** ${st.kWh.toFixed(1)} kWh\n`;
    }
  }

  return md;
}
