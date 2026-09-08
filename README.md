# ModbusLab Web — Especificación de implementación

Documento de trabajo para un agente de desarrollo. Describe la reimplementación del
laboratorio ModbusLab (PyQt4 + `modbus-tk`, 2012) como aplicación SvelteKit desplegada en
un Worker de Cloudflare, sustituyendo el PLC y el analizador de redes físicos por
**dispositivos virtuales** que responden a los mismos mapas de memoria.

El original está en el repositorio privado del curso, en `src/`: `MainWidget.py` (editor
de mensajes y consola), `PLC_digital_IO.py` (monitor del PLC), `Analyzer.py` (monitor del
analizador), `Intefaz.py` (ventana principal). Este documento es autosuficiente: toda la
información de los mapas de memoria, las escalas y las variantes que hacía falta extraer
de ese código y de los manuales de los equipos está transcrita aquí. Las rutas
`src/…` y `Orientaciones/…` que se citan más abajo se refieren a ese repositorio privado
y quedan como procedencia de cada dato, no como archivos de este repositorio.

---

## 1. Objetivo pedagógico

El estudiante debe **componer mensajes Modbus a mano** (estación, función, dirección,
cantidad, datos — todo en hexadecimal), enviarlos, y observar simultáneamente:

1. la **trama cruda** que sale y la que entra, byte a byte;
2. el **efecto sobre el dispositivo**, en monitores en tiempo real (LEDs del PLC,
   instrumentos de aguja del analizador).

Todo lo demás es accesorio. Cualquier decisión de diseño que oculte la trama o que
"ayude" al estudiante a construirla correctamente destruye el objetivo del laboratorio.

---

## 2. Decisiones de arquitectura (ya tomadas)

| Decisión | Elección | Consecuencia |
|---|---|---|
| Dónde corre la simulación | **Solo cliente, en un Web Worker** | Cero backend, cero estado en servidor, funciona sin conexión tras la primera carga. El Worker de Cloudflare sólo sirve activos estáticos. |
| Aislamiento | **Sandbox individual** | Cada pestaña del navegador tiene su propio PLC y su propio analizador. Sin bus compartido, sin panel del profesor. |
| Encuadres soportados | **RTU + ASCII + TCP** | Tres codecs sobre un mismo núcleo de PDU. |
| Identidad / evaluación | **Número de lista (1–44) + informe descargable** | Sin login, sin base de datos. La variante se carga de una tabla embebida; las tareas se verifican en cliente; el informe se descarga. |

### 2.1 Por qué el Web Worker y no simular en el hilo principal

No es por rendimiento. Es por **fidelidad de frontera**: `postMessage` obliga a que el
único acoplamiento entre UI y dispositivo sea un `Uint8Array` de bytes. Impide que un
componente Svelte lea el estado del PLC "por atrás" en lugar de pedirlo con una trama.
Además permite simular retardo, timeout y corrupción de trama sin bloquear la interfaz.

**Regla dura:** la UI nunca importa el módulo de dispositivos. Sólo importa el codec
(para decodificar lo que ve) y el cliente del Worker.

### 2.2 Qué significa "TCP" en un simulador sin sockets

No hay socket. El modo TCP significa **encapsulación MBAP**: la trama que se muestra y
que se pasa al Worker lleva la cabecera de 7 bytes (transaction id, protocol id, length,
unit id) en lugar de dirección + CRC. Documéntalo así en la UI para no mentirle al
estudiante: rótulo "Encuadre: RTU / ASCII / TCP (MBAP)" y una nota de que el transporte
está simulado.

---

## 3. Stack

- SvelteKit 2 + Svelte 5 (runes: `$state`, `$derived`, `$effect`).
- TypeScript estricto (`"strict": true`, sin `any` en el núcleo del protocolo).
- Tailwind v4 (configuración CSS-first, sin `tailwind.config.js`).
- `@sveltejs/adapter-cloudflare`.
- Vitest para pruebas unitarias del protocolo.
- Sin librería Modbus de terceros. El codec se escribe a mano: es el contenido docente.

### 3.1 Estructura de archivos

```
src/
  lib/
    modbus/                 # NÚCLEO PURO — sin DOM, sin Svelte, 100% testeable
      pdu.ts                # construcción y parseo de PDUs por función
      codec-rtu.ts          # encuadre RTU + CRC16
      codec-ascii.ts        # encuadre ASCII + LRC
      codec-tcp.ts          # encuadre MBAP
      codec.ts              # interfaz común Codec + selector
      checksum.ts           # crc16(), lrc()
      exceptions.ts         # códigos y nombres de excepción
      types.ts              # Frame, Pdu, FunctionCode, ModbusError
      hex.ts                # helpers de formato hex/decimal
    devices/                # SÓLO se importa desde el Web Worker
      memory.ts             # modelo de memoria por áreas
      slave.ts              # despachador genérico de funciones -> memoria
      plc-masterk.ts        # Master-K120S virtual (estación 2)
      analyzer-wm14.ts      # WM14 virtual (estación 1)
      process.ts            # simulación física (proceso del PLC + carga trifásica)
      bus.ts               # bus virtual: enruta por estación, aplica retardo/errores
    worker/
      device.worker.ts      # entry del Web Worker
      client.ts             # wrapper con promesas sobre postMessage
    lab/
      variants.ts           # tabla de las 44 variantes
      tasks.ts              # definición y verificación de tareas
      report.ts             # generación del informe
      log.ts                # bitácora de tramas
    components/
      MessageEditor.svelte
      HexInput.svelte
      DataInputDialog.svelte
      LinkConfig.svelte
      FrameConsole.svelte
      PlcMonitor.svelte
      DigitalPoint.svelte
      PlcConfigDialog.svelte
      AnalyzerMonitor.svelte
      AnalogInstrument.svelte
      DigitalInstrument.svelte
      LoadBank.svelte
      TaskChecklist.svelte
  routes/
    +layout.svelte
    +page.svelte            # portada: número de lista
    lab/+page.svelte        # laboratorio (pestañas Bits / Registros)
    informe/+page.svelte    # vista previa del informe
```

---

## 4. Núcleo del protocolo

### 4.1 Sumas de verificación

```ts
// checksum.ts
export function crc16(buf: Uint8Array): number {
  let crc = 0xffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
  }
  return crc; // se transmite LSB primero
}

export function lrc(buf: Uint8Array): number {
  let sum = 0;
  for (const b of buf) sum = (sum + b) & 0xff;
  return (-sum) & 0xff;
}
```

**Vectores de prueba reales**, extraídos del log del laboratorio de 2012
(`src/salida.txt`) y verificados:

| Trama (decimal) | Significado | CRC |
|---|---|---|
| `01 03 02 98 00 01` + `04 5D` | estación 1, fn 03, dir `0298h`, 1 registro | `0x5D04` |
| `01 03 02 00 E0` + `B9 CC` | respuesta: 1 registro = `0x00E0` = 224 | `0xCCB9` |

Ese intercambio lee `VL-L ∑` del analizador y devuelve 224 V. Úsalo como prueba de
regresión del codec RTU *y* como validación de la escala del analizador.

### 4.2 Encuadres

**RTU:** `[dir][fn][datos…][CRC lo][CRC hi]`

**ASCII:** `':'` + hex ASCII mayúscula de `[dir][fn][datos…][LRC]` + `CR LF`.
El LRC se calcula sobre los bytes binarios, no sobre los caracteres.

**TCP (MBAP):** `[tid hi][tid lo][0x00][0x00][len hi][len lo][unit id]` + PDU.
`len` = bytes que siguen al campo de longitud, es decir `1 + longitud del PDU`.
`tid` se incrementa por petición y la respuesta debe repetirlo; si no coincide, la UI
debe reportarlo como error de transacción (no descartarlo en silencio).

Interfaz común:

```ts
export interface Codec {
  readonly name: 'rtu' | 'ascii' | 'tcp';
  encode(unit: number, pdu: Uint8Array, ctx: EncodeCtx): Uint8Array;
  decode(frame: Uint8Array): { unit: number; pdu: Uint8Array };  // lanza ChecksumError
}
```

### 4.3 Funciones soportadas

El selector de función reproduce **exactamente** la lista del original
(`MainWidget.py`, `MessageEditor.__init__`), incluidos sus rótulos en español:

| Código | Rótulo en el selector |
|---|---|
| 0 | Control de estaciones esclavas |
| 1 | Lectura de n bits de salida o internos |
| 2 | Lectura de n bits de entradas |
| 3 | Lectura de n palabras de salidas o internos |
| 4 | Lectura de n palabras de entradas |
| 5 | Escritura de un bit |
| 6 | Escritura de una palabra |
| 7 | Lectura rápida de 8 bits |
| 8 | Control de contadores de diagnósticos número 1 a 8 |
| 11 | Control del contador de diagnósticos número 9 |
| 15 | Escritura de n bits |
| 16 | Escritura de n palabras |

> **Nota sobre la función 0.** No es una función Modbus válida. Un esclavo real
> responde excepción 01 (ILLEGAL FUNCTION). **Consérvala en el selector**: es la única
> forma barata de que el estudiante vea una respuesta de excepción y aprenda a leerla.
> El dispositivo virtual debe responder `[0x80][0x01]` y la consola debe destacarlo en
> rojo con el nombre del código.

Formatos de PDU:

```
01 Read Coils              req [fn][ini hi][ini lo][cant hi][cant lo]     cant 1..2000
                           res [fn][n bytes][datos…]        empaquetado LSB primero
02 Read Discrete Inputs    idéntico a 01
03 Read Holding Registers  req [fn][ini hi][ini lo][cant hi][cant lo]     cant 1..125
                           res [fn][n bytes = 2*cant][reg hi][reg lo]…
04 Read Input Registers    idéntico a 03
05 Write Single Coil       req [fn][dir hi][dir lo][0xFF 0x00 | 0x00 0x00]
                           res eco de la petición
06 Write Single Register   req [fn][dir hi][dir lo][val hi][val lo]
                           res eco de la petición
07 Read Exception Status   req [fn]
                           res [fn][byte de estado]
08 Diagnostics             req [fn][subfn hi][subfn lo][dato hi][dato lo]
                           res eco para subfn 0x0000 (Return Query Data);
                               contadores para subfn 0x000B..0x0012
11 Get Comm Event Counter  req [fn]
                           res [fn][estado hi][estado lo][cuenta hi][cuenta lo]
15 Write Multiple Coils    req [fn][ini hi][ini lo][cant hi][cant lo][n bytes][datos…]
                           res [fn][ini hi][ini lo][cant hi][cant lo]
16 Write Multiple Registers req [fn][ini hi][ini lo][cant hi][cant lo][n bytes=2*cant][datos…]
                           res [fn][ini hi][ini lo][cant hi][cant lo]
```

Excepción: `[fn | 0x80][código]`.

| Código | Nombre | Cuándo lo emite el dispositivo virtual |
|---|---|---|
| 01 | ILLEGAL FUNCTION | Función no implementada por ese esclavo (p. ej. fn 0, o fn 05 al analizador). |
| 02 | ILLEGAL DATA ADDRESS | Dirección o rango fuera del área mapeada. |
| 03 | ILLEGAL DATA VALUE | Cantidad fuera de rango, `n bytes` incoherente con la cantidad, o valor de coil distinto de `FF00`/`0000` en fn 05. |
| 04 | SLAVE DEVICE FAILURE | Reservado para inyección de fallos. |
| 06 | SLAVE DEVICE BUSY | Reservado para inyección de fallos. |

**No silencies excepciones.** El original las tragaba con `except: pass` en
`RTUMonitor.run` y `sendMessage`; eso impedía que el estudiante viera el error. Aquí la
excepción es una respuesta legítima que se muestra decodificada.

---

## 5. Dispositivos virtuales

### 5.1 PLC virtual — LS Master-K120S, estación 2

Mapa de memoria (manual `Orientaciones/Master-k-Comm.pdf`, p. 8-59):

| Nibble alto | Área bits | Área palabras |
|---|---|---|
| `0` | P | P |
| `1` | M | M |
| `2` | L | L |
| `3` | K | K |
| `4` | F | F |
| `5` | T | T (valor actual) |
| `6` | C | C (valor actual) |
| `7` | — | S |
| `8` | — | D |

Reglas de direccionamiento:

- La dirección empieza en 0 (la dirección `n` del K120S corresponde a la `n+1` de
  Modicon). **No apliques desplazamiento +1.**
- El paso entre registros consecutivos es **1** (a diferencia del analizador, ver 5.2).
- **Bits y palabras comparten memoria.** El bit `n` de un área es el bit `n & 0x0F` de la
  palabra `n >> 4` de esa misma área. Notación Master-K `Pxxy` = palabra `xx`, bit `y`
  (hex). Ejemplo: `P4C` → dirección de bit `0x004C` → palabra `P004`, bit 12.
  Esto es obligatorio: si el estudiante enciende `P40` con fn 05 y luego lee la palabra
  `0x0004` con fn 03, debe ver el bit 0 puesto. Implementa la memoria como `Uint16Array`
  por área y expón vistas de bit sobre ella.
- El área F es de sólo lectura: escrituras devuelven excepción 02.

Configuración de E/S por defecto (idéntica al original, `MainWidget.py` línea del
constructor `PLCdigitalIO(self,18,12,0,64,…)`):

- 18 entradas desde dirección de bit `0x0000` → `P000`…`P011`.
- 12 salidas desde dirección de bit `0x0040` → `P040`…`P04B`.
- Ambos parámetros configurables en el diálogo "Configurar PLC" (cantidad de entradas,
  cantidad de salidas, dirección base de cada grupo en decimal o hexadecimal, color de
  los LEDs rojo/verde). Reproduce ese diálogo tal cual (`PLC_digital_IO.py`, `PLCDialog`).

**Funciones aceptadas por el PLC:** 01, 02, 03, 04, 05, 06, 07, 08, 11, 15, 16.
Las funciones 01 y 02 acceden **a la misma área de bits** (el manual mapea `0XXXX` y
`1XXXX` sobre el área P). Así se comportaba el original, que sondeaba entradas *y*
salidas con fn 01. Mantén esa equivalencia; es la conducta del equipo real.

#### Proceso simulado

El PLC debe estar vivo, si no el laboratorio es un editor de memoria. Modelo:

- **Entradas (`P000`…`P011`)**: gobernadas por un panel de interruptores virtuales en la
  UI. El estudiante los acciona con el ratón. Las escrituras Modbus a direcciones de
  entrada devuelven excepción 02 (son físicas).
- **Salidas (`P040`…`P04B`)**: por defecto **libres**, escribibles por Modbus (fn 05/15) y
  persistentes. Este es el modo del laboratorio.
- **Programa de escalera opcional** (interruptor "Ejecutar programa" en el diálogo de
  configuración): una tabla declarativa de reglas que *toma posesión* de las salidas que
  menciona. Una salida poseída por el programa se dibuja con borde punteado en la UI y
  las escrituras Modbus sobre ella se aceptan pero son sobreescritas en el siguiente
  ciclo — exactamente lo que pasa con un PLC real, y vale la pena que el estudiante lo
  descubra.

  ```ts
  type Rule =
    | { out: number; op: 'copy'; in: number }
    | { out: number; op: 'and'; in: [number, number] }
    | { out: number; op: 'or'; in: [number, number] }
    | { out: number; op: 'not'; in: number }
    | { out: number; op: 'blink'; periodMs: number };
  ```

  Programa por defecto: `O1=I1`, `O2=I2 AND I3`, `O3=NOT I4`, `O12=blink 1000ms`, el
  resto libres.
- Ciclo de scan: 50 ms.

### 5.2 Analizador virtual — Carlo Gavazzi WM14, estación 1

Mapa RAM (manual `Orientaciones/WM14BXCPv2r0ENG0804.pdf`, p. 7):

| Dir. | Variable | Tipo | Dir. | Variable | Tipo |
|---|---|---|---|---|---|
| `0280` | V L1-N | VN | `02A6` | VA ∑ | P∑ |
| `0282` | A L1 | A | `02A8` | var L1 | P |
| `0284` | W L1 | P | `02AA` | var L2 | P |
| `0286` | V L2-N | VN | `02AC` | var L3 | P |
| `0288` | A L2 | A | `02AE` | var ∑ | P∑ |
| `028A` | W L2 | P | `02B0` | W dmd | P∑ |
| `028C` | V L3-N | VN | `02B2` | VA dmd | P∑ |
| `028E` | A L3 | A | `02B4` | W dmd MAX | P∑ |
| `0290` | W L3 | P | `02B6` | (reservado, 0) | — |
| `0292` | V L1-L2 | VC | `02B8` | Hz | H |
| `0294` | V L2-L3 | VC | `02BA` | A dmd max | A |
| `0296` | V L3-L1 | VC | `02BC` | PF L1 / PF L2 | PF |
| `0298` | VL-L ∑ | VC | `02BE` | PF L3 / PF ∑ | PF |
| `029A` | A max | A | `02C0` | A L1 dmd | A |
| `029C` | A n | A | `02C2` | A L2 dmd | A |
| `029E` | W ∑ | P∑ | `02C4` | A L3 dmd | A |
| `02A0` | VA L1 | P | `02C6` | kWh (4 bytes) | E |
| `02A2` | VA L2 | P | `02CA` | varh (4 bytes) | E |
| `02A4` | VA L3 | P | `02CE` | Hourmeter (4 bytes) | HM |

Alarma (sólo lectura), `027Eh`, 1 byte: bit 0 = alarma de tensión, bit 1 = alarma de
corriente.

EEPROM de parámetros, misma convención de dirección de byte (paso 2 por registro):

| Dir. | Parámetro | Formato | Valor inicial | Escribible | Efecto de la escritura |
|---|---|---|---|---|---|
| `1080` | Password | 111 | `0x0000` | sí | Candado de programación (ver 5.2.1). |
| `1082` | Vt_ratio | 11.1 | `0x000A` (=1.0) | **sí** | Reescala en vivo todas las variables de tipo VN, VC, P y P∑. |
| `1084` | Ct_ratio | 111 | `0x0019` (=25) | **sí** | Reescala en vivo todas las variables de tipo A, P y P∑. |
| `1086` | P_int | 111 min | `0x000F` (=15) | sí | Ventana de integración de las variables `dmd`. |
| `1088` | Filter_rng | 111 % f.s. | `0x0002` | sí | Amplitud del filtro de las lecturas. |
| `108A` | Filter_coe | 111 | `0x0001` | sí | Coeficiente del filtro. |
| `108C` | Address | 111 | `0x0001` | **sí** | Cambia la estación en la que responde el analizador (ver 5.2.2). |
| `108E` | Set_vup | 111 V | `0x00F0` (=240) | sí | Umbral superior de tensión; dispara el bit 0 de la alarma en `027Eh`. |

Nota de formato: `Vt_ratio` tiene un decimal, así que el registro vale `VT * 10`.
`Ct_ratio` es entero, el registro vale `CT`. De ahí los valores iniciales `0x000A` y
`0x0019`, que reproducen el CT=25 / VT=1 del laboratorio original.

#### ⚠ Direccionamiento del WM14 — el detalle que rompe implementaciones ingenuas

**El campo de dirección del WM14 es una dirección de byte. Cada registro ocupa dos
direcciones.** Una lectura de `N` registros desde `A` devuelve los registros situados en
`A, A+2, A+4, …, A+2(N-1)`.

Está confirmado por el código original (`Analyzer.py`), que lee 12 registros desde
`BASE_ADDRESS` (=640=`0x280`), 12 desde `BASE+24` (=`0x298`) y 8 desde `BASE+48`
(=`0x2B0`), y mapea exactamente las variables de la tabla. Y por el ejemplo de las
orientaciones: "Leer la energía del analizador → 1 / 04 / 02C6 / 1".

La dirección debe ser par. Una dirección impar devuelve excepción 02.

El PLC **no** hace esto: allí el paso es 1. Son dos esclavos con convenios distintos en
el mismo bus, y esa asimetría es parte de lo que hay que enseñar.

#### Funciones aceptadas por el analizador

Lectura: **03 y 04** (el manual las trata igual en su fórmula de temporización), más
07, 08 y 11.

Escritura: **06 y 16, restringidas al área de parámetros EEPROM** (`1080h`–`108Eh`).
El manual reserva la escritura al fabricante "excepto las instrucciones de reset"; tratar
la EEPROM de parámetros como escribible es coherente con esa excepción y es lo que
sostiene el ejercicio de reescalado.

- fn 06 o fn 16 sobre `1080h`–`108Eh`, dirección par, valor en rango → **se acepta**.
- fn 06 o fn 16 sobre la RAM de medidas (`027Eh`, `0280h`–`02D1h`) → **excepción 02**
  (la función existe en este esclavo, pero esa dirección no es escribible).
- fn 05 o fn 15 en cualquier dirección → **excepción 01**: el WM14 no tiene bits.
- Valor fuera del rango del formato del parámetro → **excepción 03**. Rangos:
  `Vt_ratio` 1..999 (es decir 0.1..99.9), `Ct_ratio` 1..999, `Address` 1..247,
  `P_int` 1..60, `Set_vup` 1..999.

#### 5.2.1 Candado de contraseña (opcional, desactivado por defecto)

El registro `1080h` es la contraseña de acceso a programación del equipo real. Impleméntalo
como interruptor del instructor, **apagado por defecto**:

- Apagado (por defecto): cualquier escritura válida a la EEPROM se acepta directamente.
- Encendido: las escrituras a `1082h`–`108Eh` devuelven **excepción 06 (SLAVE DEVICE BUSY)**
  hasta que se escriba la contraseña correcta en `1080h`. El candado se vuelve a cerrar a
  los 120 s de inactividad. Convierte el ejercicio en una secuencia de dos tramas con
  estado en el dispositivo, que es un salto de dificultad real.

No inventes la contraseña en la UI: el instructor la fija en la configuración y se la da a
la clase.

#### 5.2.2 Escritura de `108Ch` (Address)

Escribir la dirección de estación **funciona y tiene consecuencias**: el analizador deja de
responder en la estación 1 y responde en la nueva. Es fiel al equipo y es una lección
sobre escrituras de configuración. Mitigaciones obligatorias en la UI, no en el
dispositivo:

- La respuesta de eco a esa fn 06 se emite con la dirección **antigua** (el cambio se
  aplica después de responder), como haría un equipo real.
- El monitor del analizador detecta la pérdida de respuesta y muestra un aviso:
  *"El analizador ya no responde en la estación 1. Escribiste 108Ch. Comprueba en qué
  estación responde ahora."* — sin decir el número.
- El botón "Reiniciar laboratorio" de la sección 9 restaura la EEPROM a sus valores
  iniciales.

#### Codificación de valores

Todas las variables excepto PF son **enteros con signo en complemento a 2** de 16 bits
(32 para tipos E y HM). El valor de ingeniería se obtiene aplicando el punto decimal y
las razones CT/VT:

| Tipo | Punto decimal | Unidad | Registro → magnitud |
|---|---|---|---|
| VN | 111.1 | V | `V = reg / 10 * VT` |
| VC | 111 | V | `V = reg * VT` |
| A | 111 | mA | `I = reg / 1000 * CT` |
| P | 111.1 | W/VA/var | `P = reg / 10 * CT * VT` |
| P∑ | 111 | W/VA/var | `P = reg * CT * VT` |
| H | 111.1 | Hz | `f = reg / 10` (sin CT/VT) |
| PF | 1.11 | — | `pf = (byte & 0x7F) / 100`, signo en bit 7 |
| E | 111.1 | kWh / kvarh | `E = reg32 / 10` (sin CT/VT) |
| HM | 11.11 | h | `h = reg32 / 100` (sin CT/VT) |

Empaquetado de PF (parámetro `dat = "A"`, LSB-MSB):
`0x02BC` → LSB = PF L1, MSB = PF L2. `0x02BE` → LSB = PF L3, MSB = PF ∑.
En cada byte: bits 0-6 = `|pf| * 100`, bit 7 = 0 inductivo (L), 1 capacitivo (C).

CT y VT **no se codifican en el cliente**. El dispositivo los guarda en la EEPROM
(`1084h` y `1082h`) y el monitor de la UI los obtiene **leyéndolos con una trama Modbus**,
igual que cualquier otro dato. Ver 7.3. El original los tenía cableados a 25 y 1 en
`Analyzer.py`; ese es el estado inicial de la EEPROM, no una constante del programa.

Consecuencia buscada: si el estudiante escribe `0x0032` (=50) en `1084h` con fn 06, el
amperímetro y los vatímetros del monitor **duplican su lectura en el ciclo siguiente**, sin
que los registros de medida hayan cambiado. Ahí se ve que un registro de configuración
reescala todo el instrumento.

#### Simulación de la carga trifásica

Estado físico interno (no es memoria Modbus; se codifica a registros en cada ciclo):

- `V[k]` tensión fase-neutro, nominal 220 V, `k = 0,1,2`.
- `I[k]` corriente de línea.
- `phi[k]` ángulo de desfase.
- `f` frecuencia, nominal 60 Hz.

Evolución: paseo aleatorio lento acotado (±2 % en V, ±0.1 Hz en f) más el efecto del
**banco de cargas** que el estudiante controla en la UI (`LoadBank.svelte`): tres cargas
por fase, cada una con potencia y factor de potencia, conmutables. Sin banco de cargas el
analizador muestra tres números fijos y el laboratorio se vuelve inerte.

Derivados, con los fasores separados 120°:

```
VA[k]  = V[k] * I[k]
W[k]   = V[k] * I[k] * cos(phi[k])
var[k] = V[k] * I[k] * sin(phi[k])
V_LL[k] = |Vph[k] - Vph[(k+1)%3]|          (suma fasorial, no V*sqrt(3))
VLL_sum = media de V_LL
A_n     = |I1 + I2 + I3|                   (suma fasorial; 0 si está equilibrado)
A_max   = máximo de I[k] en la ventana de demanda
W_sum, VA_sum, var_sum = sumas de fase
kWh    += W_sum * dt / 3.6e6
```

Ciclo de actualización: 200 ms internamente; el monitor de la UI sondea con tramas
Modbus reales cada 1000 ms, como el original.

### 5.3 Bus virtual

`bus.ts` recibe una trama, la decodifica, enruta por dirección de estación y devuelve la
respuesta codificada. Responsabilidades:

- Estación 1 → analizador. Estación 2 → PLC. Otras estaciones (0, 3, 4, 5) →
  **sin respuesta**, con timeout. El selector de estación del original ofrece 0..5;
  mantenlo, porque enviar a una estación inexistente y ver el timeout es una lección.
- Dirección 0 = broadcast: se ejecuta la escritura, no hay respuesta.
- Retardo simulado configurable, por defecto 40 ms (el "T response típico" del manual del
  WM14). Timeout por defecto 300 ms (el "max answering time" del mismo manual).
- **Inyección de fallos**, en un panel plegable "Condiciones del enlace":
  `probabilidad de pérdida de trama`, `probabilidad de corrupción de CRC`,
  `retardo extra`. Por defecto todo en 0. Es lo que reproduce la experiencia del cable
  RS-485 real y enseña por qué existe el CRC.

---

## 6. Protocolo del Web Worker

```ts
// petición al worker
type Req =
  | { id: number; t: 'tx'; frame: Uint8Array; codec: 'rtu'|'ascii'|'tcp';
      timeoutMs: number; origin: 'student' | 'monitor' }
  | { id: number; t: 'setInput'; bit: number; value: boolean }
  | { id: number; t: 'setLoad'; phase: 0|1|2; slot: number; on: boolean; kw: number; pf: number }
  | { id: number; t: 'config'; patch: Partial<SimConfig> }
  | { id: number; t: 'snapshot' };   // sólo para depuración e informe final

// respuesta
type Res =
  | { id: number; t: 'rx'; frame: Uint8Array; elapsedMs: number }
  | { id: number; t: 'timeout'; elapsedMs: number }
  | { id: number; t: 'snapshot'; data: DeviceSnapshot }
  | { id: number; t: 'error'; message: string };
```

`snapshot` **no** se usa para pintar los monitores. Los monitores se alimentan de
respuestas a tramas reales, igual que el original. `snapshot` sólo alimenta el anexo de
estado final del informe.

`client.ts` envuelve esto en `send(frame): Promise<Result>` con un mapa de `id` →
`resolve`.

---

## 7. Interfaz

Reproduce la disposición del original (figuras 1–8 de
`Orientaciones/Orientaciones_para_el_laboratorio.html`), porque las orientaciones del
laboratorio se refieren a ella. Dos pestañas verticales a la izquierda:

- **Bits operations** → editor de mensajes + configuración del enlace + consola +
  monitor del PLC.
- **Registers operations** → editor de mensajes + configuración del enlace + consola +
  monitor del analizador.

Cada pestaña tiene **su propio** editor de mensajes y su propia consola, como el
original. Al cambiar de pestaña se detienen ambos monitores (conducta de
`MyMainWidget.disableLogger`).

### 7.1 Editor de mensajes

Campos: Estación (0–5), Función (selector con los 12 rótulos), SubFunción, Dirección,
Número, Octetos, Datos, botón Enviar.

Todas las entradas numéricas son **hexadecimales con máscara de longitud fija**, y
muestran el valor decimal en un tooltip (`HexInput.svelte`, equivalente de la clase
`HexInput` del original). Máscara `HHHH` (4 dígitos) salvo Octetos, que es `HH`.

Habilitación de campos por función — **cópialo literal del original**, es parte de lo que
el estudiante memoriza:

```ts
export const FIELD_ENABLE: Record<number, {
  subfn: boolean; addr: boolean; count: boolean; bytes: boolean; data: boolean;
  dataMask: 'HHHH' | 'BB';
}> = {
   0: { subfn: true,  addr: false, count: false, bytes: false, data: true,  dataMask: 'HHHH' },
   1: { subfn: false, addr: true,  count: true,  bytes: false, data: false, dataMask: 'HHHH' },
   2: { subfn: false, addr: true,  count: true,  bytes: false, data: false, dataMask: 'HHHH' },
   3: { subfn: false, addr: true,  count: true,  bytes: false, data: false, dataMask: 'HHHH' },
   4: { subfn: false, addr: true,  count: true,  bytes: false, data: false, dataMask: 'HHHH' },
   5: { subfn: false, addr: true,  count: false, bytes: false, data: true,  dataMask: 'HHHH' },
   6: { subfn: false, addr: true,  count: false, bytes: false, data: true,  dataMask: 'HHHH' },
   7: { subfn: false, addr: false, count: false, bytes: false, data: false, dataMask: 'HHHH' },
   8: { subfn: true,  addr: false, count: false, bytes: false, data: true,  dataMask: 'HHHH' },
  11: { subfn: false, addr: false, count: false, bytes: false, data: false, dataMask: 'HHHH' },
  15: { subfn: false, addr: true,  count: true,  bytes: true,  data: true,  dataMask: 'BB'   },
  16: { subfn: false, addr: true,  count: true,  bytes: true,  data: true,  dataMask: 'HHHH' },
};
```

(En el original la máscara de la fn 15 era `BBBBBBBB`, una máscara binaria de 8 bits por
elemento. Consérvala como entrada binaria de 8 bits: el estudiante teclea `10110010`.
El nombre `BB` de arriba es sólo la etiqueta del tipo; impleméntala como 8 dígitos
binarios.)

El diálogo de datos (`DataInputDialog.svelte`) abre `N` campos con esa máscara, donde
`N` = valor del campo Número, salvo para fn 15 donde `N` = valor del campo Octetos.

#### Cuatro defectos del original que NO debes reproducir

1. **Mensaje obsoleto.** `MessageEditor.isReady()` sólo asignaba `self.Message` cuando la
   validación pasaba; si el estudiante editaba un campo y lo dejaba inválido, el botón
   Enviar quedaba habilitado con el mensaje **anterior**. Está anotado en
   `src/errores.txt`: *"si los mensajes no se actualizan se envia el anterior"*.
   → Deriva el mensaje del estado con `$derived` y deshabilita Enviar cuando sea `null`.
2. **Redirección de `sys.stdout`** para capturar el log de `modbus-tk`, con carreras entre
   hilos. → La consola se alimenta de un `EventTarget`/store tipado.
3. **`except: pass`** en los sondeos y en el envío. → Toda excepción Modbus y todo
   timeout se muestran.
4. **Conversión oculta de `FF00` → 1** en `DataWidget.getValue` (por exigencia de
   `modbus-tk`). → Aquí se construyen las tramas a mano: `FF00` viaja literal, y un valor
   distinto de `FF00`/`0000` en fn 05 devuelve excepción 03. Es más fiel y más
   didáctico.

### 7.2 Consola de tramas

Sustituye a `ConsoleWidget`. Por cada intercambio, una fila expandible:

```
11:43:44.761  →  01 03 02 98 00 01 04 5D          fn 03 · est 1 · dir 0298h · cant 1
11:43:44.801  ←  01 03 02 00 E0 B9 CC             1 registro: 00E0h = 224  (VL-L ∑ = 224 V)   40 ms
```

Al expandir: desglose campo a campo con offsets de byte, verificación del CRC/LRC
mostrando el valor calculado y el recibido, y la interpretación de ingeniería cuando el
esclavo y la dirección la tengan definida.

Mantén también un **modo crudo** que imprima exactamente en el formato del original
(`-> 1-3-2-152-0-1-4-93`), para que las orientaciones antiguas sigan siendo legibles.

### 7.3 Monitores

**PLC** (`PlcMonitor.svelte`): dos filas de LEDs, entradas arriba (18 por defecto,
rotuladas `I1`…`I18`) y salidas abajo (12, `O1`…`O12`), con la dirección de bit en
hexadecimal bajo cada uno. Color rojo o verde según configuración. Usa SVG, no los GIFs
de `src/img/`; reprodúcelos como círculo con degradado radial y halo cuando está
encendido. Un interruptor "Iniciar/Detener monitor" que arranca el sondeo periódico
(fn 01 sobre las entradas y otro sobre las salidas, cada 1000 ms) — y esas tramas
**aparecen en la consola**, igual que en el original.

Clic sobre un LED de entrada = accionar el interruptor físico virtual. Clic sobre un LED
de salida = nada (hay que escribirla con una trama; ese es el ejercicio).

**Analizador** (`AnalyzerMonitor.svelte`): pestañas Sistema / Fase 1 / Fase 2 / Fase 3.
Cada panel: voltímetro y amperímetro de aguja (SVG, arco de 270° comenzando en 135°,
como `Qwt.QwtDial` en el original), con campo de escala máxima editable; y tres lecturas
digitales tipo LCD para `Pa` (W), `Q` (VAR) y `pf`. En la pestaña Sistema los
instrumentos se rotulan "Tensión de Línea" y "Corriente de Neutro".

Sondeo idéntico al original: tres lecturas fn 04 por ciclo — 12 registros desde `0280h`,
12 desde `0298h`, 8 desde `02B0h` — cada 1000 ms.

**Más una cuarta lectura**, que el original no hacía: fn 03 de 2 registros desde `1082h`
para obtener `Vt_ratio` y `Ct_ratio`. Se emite al arrancar el monitor y luego **cada
5 ciclos** (5 s). Esa trama aparece en la consola como todas las demás. Mientras el monitor
esté detenido, la UI usa el último par CT/VT leído y lo marca como caducado.

#### Rótulo de procedencia de la escala: oculto hasta que el estudiante lo descubra

Junto a cada instrumento hay un rótulo pequeño con la procedencia de su escala —
`CT = 25 (leído de 1084h)` / `VT = 1.0 (leído de 1082h)` —, pero **arranca oculto**. Sólo
se revela cuando el estudiante lee ese parámetro **con una trama que compuso él**. Una vez
revelado, permanece visible el resto de la sesión y se actualiza solo cuando el parámetro
cambia.

Condición de revelado, precisa:

- Se revela el rótulo de CT cuando existe en la bitácora un intercambio con
  `origin === 'student'`, fn 03 o 04, estación del analizador, respuesta correcta, y cuyo
  rango de direcciones **cubre `1084h`**. Igual para VT con `1082h`. Una lectura de
  2 registros desde `1082h` revela los dos a la vez, y está bien: el estudiante los pidió.
- **El sondeo automático del monitor no revela nada.** Ese sondeo lee `1082h` cada 5 s
  desde el primer segundo; si contara, el rótulo estaría visible siempre y la pregunta
  nunca se plantearía. Por eso el campo `origin` del apartado 6 no es opcional: es lo que
  separa lo que hizo el estudiante de lo que hizo el programa.
- Mientras esté oculto, el hueco no queda vacío ni anuncia que hay algo escondido con un
  candado o un "?": simplemente no está. El estudiante debe llegar a preguntarse de dónde
  sale la escala porque **ve el amperímetro moverse tras escribir `1084h`**, no porque la
  interfaz le insinúe que mire ahí.

Consecuencia deliberada: un estudiante que nunca lea `1084h` termina el laboratorio sin
saber que existe el reescalado. Es aceptable — la tarea 10 es opcional. Lo que no es
aceptable es regalársela.

**No pongas un campo de UI que edite CT o VT directamente.** Si quieres un atajo, que sea
un botón rotulado "Escribir Ct_ratio…" que **componga y envíe una fn 06 real** a `1084h` y
la registre en la consola. Un control que modifique la escala por detrás del protocolo
rompe el objetivo del laboratorio.

El campo editable de escala máxima de las agujas (el del original) es otra cosa y se queda:
sólo cambia el fondo de escala del dibujo, no la interpretación del registro.

> Corrige de paso dos errores del original: `Analyzer.py` desempaquetaba el PF con
> `PF1/0xff` en vez de `>> 8`, y extraía el signo con `pf/0x7f` en vez de `& 0x80`.
> Ambos dan resultados incorrectos. Además rotulaba el 11º y 12º registro de la primera
> lectura como `VL31`/`VL23` cuando el mapa dice `V L2-L3` / `V L3-L1`.

---

## 8. Variantes y verificación de tareas

### 8.1 Tabla de variantes

De `Orientaciones/Variantes.pdf`. Cinco columnas: bit a encender/apagar, rango de
entradas a leer, dirección base para escribir `5555h`, magnitudes a leer individualmente
en el analizador, dirección base del analizador.

```ts
// variants.ts
export interface Variant {
  n: number;
  toggleBit: string;        // notación Master-K, p. ej. "P40"
  readInputs: [string, string]; // rango inclusivo, p. ej. ["P00", "P04"]
  plcBase: number;          // dirección de palabra donde escribir 5555h
  analyzerVars: string[];   // nombres del mapa del WM14
  analyzerBase: number;     // dirección de byte, lectura de 4 registros
}
```

| # | Encender/Apagar | Leer Entradas | Dir. Base PLC | Lecturas individuales | Dir. Base analizador |
|---|---|---|---|---|---|
| 1 | P40 | P00–P04 | 2000h | V L1-N, VA ∑, Hz | 0280h |
| 2 | P41 | P01–P05 | 2001h | A L1, VA L1, A n | 0282h |
| 3 | P42 | P02–P06 | 2002h | V L2-N, VA ∑, Hz | 0284h |
| 4 | P43 | P03–P07 | 2003h | A L2, VA L2, A n | 0286h |
| 5 | P44 | P04–P08 | 2004h | V L3-N, VA ∑, Hz | 0288h |
| 6 | P45 | P05–P09 | 2005h | A L3, VA L3, A n | 028Ah |
| 7 | P46 | P06–P0A | 2006h | W L1, A max, VL-L ∑ | 028Ch |
| 8 | P47 | P07–P0B | 2007h | V L1-L2, A L1, Hz | 028Eh |
| 9 | P40 | P00–P04 | 2008h | W L2, A max, VL-L ∑ | 0290h |
| 10 | P41 | P01–P05 | 2009h | V L2-L3, A L2, Hz | 0292h |
| 11 | P42 | P02–P06 | 200Ah | W L3, A max, VL-L ∑ | 0294h |
| 12 | P43 | P03–P07 | 200Bh | V L3-L1, A L3, Hz | 0296h |
| 13 | P40 | P04–P08 | 200Ch | V L3-N, var L1, A n | 0298h |
| 14 | P41 | P05–P09 | 200Dh | V L1-N, var L3, A L2 | 029Ah |
| 15 | P42 | P06–P0A | 200Eh | V L2-N, var L2, A n | 029Ch |
| 16 | P43 | P07–P0B | 200Fh | A L3, VA L3, A n | 029Eh |
| 17 | P44 | P02–P06 | 2010h | W L1, A max, VL-L ∑ | 02A0h |
| 18 | P45 | P03–P07 | 2011h | V L1-L2, A L1, Hz | 02A2h |
| 19 | P46 | P04–P08 | 2012h | W L2, A max, VL-L ∑ | 02A4h |
| 20 | P47 | P05–P09 | 2013h | V L2-L3, A L2, Hz | 0286h |
| 21 | P40 | P06–P0A | 2014h | W L3, A max, VL-L ∑ | 0288h |
| 22 | P41 | P07–P0B | 2015h | V L3-L1, A L3, Hz | 028Ah |
| 23 | P42 | P00–P04 | 2016h | V L3-N, var L1, A n | 028Ch |
| 24 | P43 | P01–P05 | 2017h | V L1-N, var L3, A L2 | 028Eh |
| 25 | P40 | P02–P06 | 2018h | V L2-N, var L2, A n | 0290h |
| 26 | P41 | P03–P07 | 2019h | A L3, VA L3, A n | 0292h |
| 27 | P42 | P04–P08 | 201Ah | W L1, A max, VL-L ∑ | 029Ah |
| 28 | P43 | P05–P09 | 201Bh | V L1-L2, A L1, Hz | 029Ch |
| 29 | P44 | P06–P0A | 201Ch | W L2, A max, VL-L ∑ | 029Eh |
| 30 | P45 | P07–P0B | 201Dh | V L2-L3, A L2, Hz | 02A0h |
| 31 | P46 | P02–P06 | 201Eh | W L3, A max, VL-L ∑ | 02A2h |
| 32 | P47 | P03–P07 | 201Fh | V L3-L1, A L3, Hz | 02A4h |
| 33 | P40 | P04–P08 | 2020h | V L3-N, var L1, A n | 0286h |
| 34 | P42 | P05–P09 | 2021h | V L3-L1, A L3, Hz | 0288h |
| 35 | P40 | P00–P04 | 2000h | V L3-N, var L1, A n | 028Ah |
| 36 | P41 | P01–P05 | 2001h | V L1-N, var L3, A L2 | 028Ch |
| 37 | P42 | P02–P06 | 2002h | V L2-N, var L2, A n | 028Eh |
| 38 | P43 | P03–P07 | 2003h | A L3, VA L3, A n | 0290h |
| 39 | P44 | P04–P08 | 2004h | W L1, A max, VL-L ∑ | 0292h |
| 40 | P45 | P05–P09 | 2005h | V L1-L2, A L1, Hz | 029Ah |
| 41 | P46 | P06–P0A | 2006h | W L2, A max, VL-L ∑ | 029Ch |
| 42 | P47 | P07–P0B | 2007h | V L2-L3, A L2, Hz | 029Eh |
| 43 | P40 | P00–P04 | 2008h | W L3, A max, VL-L ∑ | 02A0h |
| 44 | P41 | P01–P05 | 2009h | V L3-L1, A L3, Hz | 02A2h |

Conversión de notación: `Pxy` → dirección de bit `0x00` + `xy` interpretado en hex.
`P40` → `0x0040`. `P0B` → `0x000B`.

### 8.2 Tareas

Nueve tareas por variante, tomadas literalmente de las orientaciones:

**PLC**
1. Escribir 1 en el bit de la variante.
2. Leer ese bit.
3. Escribir 0 en ese bit.
4. Leer ese bit.
5. Leer varias entradas en una sola lectura (el rango de la variante).
6. Escribir el valor `5555h` a partir de la dirección base de la variante.
7. Leer un registro de salida en la dirección `P00`.

**Analizador**

8. Leer, en lecturas individuales, cada una de las magnitudes de la variante.
9. Leer 4 registros a partir de la dirección base del analizador de la variante.

**Tarea 10 — opcional (`optional: true`), no altera las nueve canónicas**

10. Leer `Ct_ratio` en `1084h`, escribir `0x0032` (=50) con fn 06 y volver a leer la
    corriente de fase para comprobar que la lectura del amperímetro se ha duplicado sin que
    el registro de medida haya cambiado.

    Predicado: existe una fn 03 sobre `1084h` con respuesta correcta, **antes** de una fn 06
    sobre `1084h` con valor `0x0032` y respuesta correcta, y **después** de esa escritura hay
    al menos una lectura de la corriente de la fase de la variante. El orden importa: es lo
    que demuestra que el estudiante observó el antes y el después.

Verificador: cada tarea es un predicado sobre una entrada de la bitácora
`{ origin: 'student' | 'monitor', req: DecodedPdu, res: DecodedPdu | Timeout | Exception }`.
Una tarea se marca cumplida cuando existe **al menos un intercambio con
`origin === 'student'` y respuesta no excepcional** que la satisfaga.

> **La comprobación de `origin` es obligatoria, no cosmética.** Sin ella, el sondeo
> automático del monitor del PLC —fn 01, dirección `0x0000`, cantidad 18, cada segundo—
> satisface por sí solo la **tarea 5** en todas las variantes cuyo rango de entradas empieza
> en `P00`: las variantes 1, 9, 23, 35 y 43. Esos cinco estudiantes verían la tarea marcada
> como cumplida sin haber enviado una sola trama. Filtra por `origin` en **todos** los
> predicados, incluidos los que hoy parezcan inmunes: cualquier cambio futuro en el periodo
> o el rango del sondeo puede volver spoofable otra tarea.

```ts
export interface Task {
  id: string;
  group: 'plc' | 'analyzer';
  label: string;                                  // texto que ve el estudiante
  optional?: boolean;                             // no cuenta para el total de la variante
  matches(x: Exchange, v: Variant): boolean;
}
```

Ejemplo de la tarea 1:

```ts
{
  id: 'plc-set',
  group: 'plc',
  label: `Escribir 1 en ${v.toggleBit}`,
  matches: (x, v) =>
    x.req.unit === 2 && x.req.fn === 0x05 &&
    x.req.addr === bitAddr(v.toggleBit) &&
    x.req.value === 0xff00 && x.ok,
}
```

La tarea 5 acepta fn 01 o fn 02 con `addr === bitAddr(inicio)` y
`count >= (fin - inicio + 1)`. La 6 acepta fn 06 con `value === 0x5555`, o fn 16 con
`0x5555` como primer dato. La 8 exige una lectura por magnitud, con `count === 1`
(dos registros si la magnitud es de 4 bytes) — el punto es que sean *individuales*.

`TaskChecklist.svelte` muestra la lista con su estado en vivo. **No muestra la trama
correcta**: sólo dice si la tarea está cumplida o no. Si le das la respuesta, no hay
laboratorio.

---

## 9. Informe

Botón "Generar informe" (equivale al menú `Archivo → Informe` del original). Produce un
**Markdown descargable** y una vista imprimible en `/informe`:

```
# Informe de laboratorio — ModbusLab
Estudiante nº __  ·  Variante __  ·  Fecha __  ·  Duración de la sesión __

## Resultado de las tareas
[tabla: tarea | estado | trama que la cumplió | respuesta]

## Bitácora completa
[toda la bitácora, formato crudo y decodificado, con marcas de tiempo]

## Estado final de los dispositivos
[PLC: mapa de bits P000-P04B; analizador: valores de ingeniería por fase]

## Configuración del enlace
[encuadre, retardo, timeout, CT, VT, configuración de E/S del PLC]
```

Descarga por `Blob` + `URL.createObjectURL`. Sin backend.

**Persistencia de sesión:** guarda bitácora, número de lista y configuración en
`localStorage` bajo la clave `modbuslab.session.v1`, envolviendo cada lectura y escritura
en `try/catch` (modo privado, almacenamiento bloqueado). Botón "Reiniciar laboratorio"
que la borra. Sin esto, una recarga accidental pierde el trabajo de dos horas.

---

## 10. Despliegue

`@sveltejs/adapter-cloudflare`. La aplicación no tiene rutas de servidor: marca todo como
prerenderizado en `src/routes/+layout.ts`:

```ts
export const prerender = true;
export const ssr = true;   // el shell se prerenderiza; la simulación es sólo cliente
```

El Web Worker se instancia únicamente en `onMount`/`$effect`, nunca durante SSR.

```jsonc
// wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "modbuslab",
  "main": ".svelte-kit/cloudflare/_worker.js",
  "compatibility_date": "2025-09-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".svelte-kit/cloudflare", "binding": "ASSETS" },
  "observability": { "enabled": true }
}
```

> Verifica las rutas de salida y el nombre del binding contra la versión de
> `@sveltejs/adapter-cloudflare` que instales; han cambiado entre versiones. Consulta la
> documentación vigente de Cloudflare antes de fijar este archivo.

Sin KV, sin D1, sin Durable Objects, sin secretos. `wrangler deploy` y ya.

---

## 11. Pruebas

Vitest, sobre el núcleo puro. Mínimo exigible:

**Codec**
- Los dos vectores de la sección 4.1, ida y vuelta.
- LRC del mismo PDU: `0x61`.
- MBAP: longitud correcta, `tid` preservado, rechazo de `tid` no coincidente.
- CRC corrupto → `ChecksumError`.

**PLC**
- fn 05 en `0x004C` con `FF00`; luego fn 03 en `0x0004` devuelve bit 12 puesto.
- fn 05 con valor `0x1234` → excepción 03.
- fn 06 sobre área F → excepción 02.
- fn 01 con cantidad 2001 → excepción 03.
- fn 01 desde `0x0000` cantidad 18 → 3 bytes, empaquetado LSB primero, bits correctos.
- fn 0 → excepción 01.
- Escritura a una dirección de entrada → excepción 02.

**Analizador**
- Lectura de 12 registros desde `0x0280` devuelve, en orden, `V L1-N, A L1, W L1,
  V L2-N, A L2, W L2, V L3-N, A L3, W L3, V L1-L2, V L2-L3, V L3-L1`.
- Lectura desde `0x0281` (impar) → excepción 02.
- Con carga conocida (V=220, I=5 A, pf=0.9 en las tres fases, CT=25, VT=1), los registros
  codificados vuelven a decodificarse a los valores de ingeniería con error < 1 LSB.
- PF: `pf = -0.85` capacitivo → byte `0xD5`; empaquetado en el nibble correcto de
  `0x02BC`.
- fn 05 y fn 15 al analizador, cualquier dirección → excepción 01.
- fn 06 sobre `0280h` (RAM de medidas) → excepción 02.
- fn 06 sobre `1083h` (impar) → excepción 02.
- fn 06 sobre `1084h` con `0x0000` o `0x03E8` (=1000, fuera de rango) → excepción 03.
- fn 03 de 2 registros desde `1082h` en estado inicial → `[0x000A, 0x0019]`.
- fn 06 `1084h` = `0x0032`, luego lectura de `0282h`: **el registro no cambia**, pero la
  magnitud decodificada con el nuevo CT es exactamente el doble.
- fn 16 de 2 registros desde `1082h` escribe `Vt_ratio` y `Ct_ratio` en una sola trama.
- Candado activado: fn 06 sobre `1084h` sin contraseña → excepción 06; tras escribir la
  contraseña correcta en `1080h` → se acepta; a los 120 s simulados → excepción 06 de nuevo.
- fn 06 `108Ch` = `0x0003`: la respuesta de eco llega con dirección de estación 1, y la
  petición siguiente a la estación 1 da timeout mientras la estación 3 responde.

**Verificador de tareas**
- Para las 44 variantes, una secuencia sintética de intercambios correctos marca las 9
  tareas; una secuencia con la dirección desplazada en 1 no marca ninguna.

---

## 12. Supuestos que hay que confirmar antes de dar por buena la implementación

1. **El ejemplo `04C0` de las orientaciones.** El documento
   `Orientaciones_para_el_laboratorio.html` muestra "Activar la salida P4C → 2 / 05 /
   04C0 / FF00". Por la regla de direccionamiento del Master-K, `P4C` es la dirección de
   bit `0x004C`, no `0x04C0`. Lo más probable es una errata en la tabla original (o un
   artefacto de la exportación a HTML, donde las celdas están rodeadas de GIF). El
   dispositivo virtual debe implementar `0x004C`; hay que **corregir la errata en las
   orientaciones** o el estudiante recibirá excepción 02 y culpará al simulador.
2. **Fila 20 de las variantes.** La secuencia de direcciones base del analizador avanza
   `0280h`…`02A4h` y en la fila 20 vuelve a `0286h`. Puede ser deliberado (para no salir
   del mapa) o un error de la tabla. Confirmar con el autor antes de basar la evaluación
   en ese valor.
3. **CT = 25, VT = 1 como estado inicial de la EEPROM.** Son los valores cableados en
   `Analyzer.py` del laboratorio real. Si el banco usaba otro transformador de corriente, el
   analizador virtual mostrará magnitudes distintas a las que recuerdan los estudiantes
   veteranos. Confirmar. Confirmar también los valores iniciales de `P_int`, `Filter_rng`,
   `Filter_coe` y `Set_vup`, que el original nunca leía y que aquí están **inventados como
   valores plausibles**: no salen de ningún documento del repositorio.
4. **Frecuencia nominal 60 Hz.** Asumido por la red cubana. Confirmar.
5. **Área L como destino del `5555h`.** Las direcciones base `2000h`–`2021h` de las
   variantes caen en el área L (memoria de enlace). Escribir ahí con fn 06/16 es válido y
   no tiene efecto sobre el proceso; es un ejercicio puro de escritura de palabra.
   Confirmar que era esa la intención y no el área P de palabras.

---

## 13. Orden de implementación sugerido

1. `checksum.ts` + `codec-rtu.ts` + pruebas con los vectores de 2012. Nada más hasta que
   pasen.
2. `pdu.ts` con las 12 funciones y las excepciones.
3. `memory.ts` + `slave.ts` + `plc-masterk.ts` + pruebas del PLC.
4. `analyzer-wm14.ts` + `process.ts` + pruebas del analizador, **incluida la EEPROM
   escribible y el reescalado en vivo**. Esta parte es la que más se rompe en silencio:
   escríbele pruebas antes que UI.
5. `codec-ascii.ts` y `codec-tcp.ts`.
6. Web Worker y cliente.
7. UI: `HexInput`, `MessageEditor`, `FrameConsole`. Con eso ya se puede hacer el
   laboratorio completo aunque no haya monitores.
8. `PlcMonitor` + `DigitalPoint` + `PlcConfigDialog`.
9. `AnalyzerMonitor` + `AnalogInstrument` + `DigitalInstrument` + `LoadBank`.
10. `variants.ts`, `tasks.ts`, `TaskChecklist`, `report.ts`.
11. Inyección de fallos y panel de condiciones del enlace.
12. Despliegue.

Los pasos 1–5 no tocan Svelte y se pueden desarrollar y probar íntegramente con Vitest.
