# Arquitectura del Sistema

**ModbusLab** está diseñado bajo una arquitectura orientada al cliente (*client-side only*), garantizando privacidad, tolerancia a fallos y ejecución fuera de línea.

---

## 🏗️ Aislamiento en Web Worker

La simulación de los dispositivos industriales (PLC Master-K120S y Analizador WM14) se ejecuta en un **Web Worker dedicado** (`device.worker.ts`), completamente desacoplado del hilo principal de la interfaz gráfica.

```
+-----------------------------------------------------------------------+
|                            Hilo Principal (UI)                        |
|                                                                       |
|   Components (MessageEditor, FrameConsole, PlcMonitor, Analyzer)      |
|                                   |                                   |
|                             lab/log.ts (Store)                        |
|                                   |                                   |
|                            worker/client.ts                           |
+----------------------------------- | ---------------------------------+
                                     |
                         postMessage | Uint8Array
                                     v
+-----------------------------------------------------------------------+
|                           Web Worker (Sandbox)                        |
|                                                                       |
|                          worker/device.worker.ts                      |
|                                   |                                   |
|                             devices/bus.ts                            |
|                                   |                                   |
|                 +-----------------+-----------------+                 |
|                 |                                   |                 |
|       devices/plc-masterk.ts              devices/analyzer-wm14.ts    |
|         (Estación 2 - PLC)                 (Estación 1 - WM14)        |
+-----------------------------------------------------------------------+
```

### Protocolo de Mensajes Cliente-Worker

La comunicación entre el hilo principal y el Web Worker utiliza tipos Fuertemente Tipados:

```ts
// Peticiones del cliente al Web Worker
type Req =
  | { id: number; t: 'tx'; frame: Uint8Array; codec: 'rtu'|'ascii'|'tcp'; timeoutMs: number; origin: 'student' | 'monitor' }
  | { id: number; t: 'setInput'; bit: number; value: boolean }
  | { id: number; t: 'setLoad'; phase: 0|1|2; slot: number; on: boolean; kw: number; pf: number }
  | { id: number; t: 'config'; patch: Partial<SimConfig> }
  | { id: number; t: 'snapshot' };

// Respuestas del Web Worker al cliente
type Res =
  | { id: number; t: 'rx'; frame: Uint8Array; elapsedMs: number }
  | { id: number; t: 'timeout'; elapsedMs: number }
  | { id: number; t: 'snapshot'; data: DeviceSnapshot }
  | { id: number; t: 'error'; message: string };
```

---

## 🚌 Bus Virtual y Simulación de Canal

El módulo `bus.ts` dentro del Worker coordina el tráfico Modbus:

- **Enrutamiento por Estación:** Redirige tramas a la Estación 1 (WM14) o Estación 2 (PLC).
- **Broadcast:** Direcciones a Estación 0 ejecutan la acción en todos los esclavos sin emitir respuesta.
- **Estaciones Inexistentes:** Peticiones a estaciones 3, 4, 5 resultan en **Timeout**.
- **Inyección de Fallos:**
    - Probabilidad de pérdida de tramas.
    - Probabilidad de corrupción de sumas de verificación (CRC-16 / LRC).
    - Retardo de propagación configurable (por defecto 40 ms).

---

## 🎯 Motor de Verificación de Tareas

Las tareas de laboratorio son verificadas mediante predicados puros sobre la bitácora de tramas:

!!! warning "Filtro Obligatorio de Procedencia (`origin === 'student'`)"
    El verificador únicamente evalúa tramas enviadas con `origin === 'student'`. Las tramas generadas por el sondeo automático de los monitores (`origin === 'monitor'`) se descartan para evitar que el estudiante apruebe tareas de forma pasiva.

```ts
export interface Task {
  id: string;
  group: 'plc' | 'analyzer';
  label: string;
  optional?: boolean;
  matches(x: Exchange, v: Variant): boolean;
}
```

---

## 💾 Persistencia Local y Generación de Informes

- **Persistencia en LocalStorage:** El estado de la sesión, la variante cargada, la lista de tareas completadas y la bitácora completa se almacenan bajo la clave `modbuslab.session.v1`.
- **Generación de Informes (`report.ts`):** Produce un documento Markdown descargable de forma nativa en el cliente mediante la API `URL.createObjectURL` sin necesidad de enviar datos a ningún servidor.
