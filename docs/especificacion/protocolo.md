# Núcleo del Protocolo Modbus

El núcleo del protocolo en ModbusLab está implementado de forma pura en TypeScript en `src/lib/modbus/`. No utiliza librerías de terceros y es 100% independiente del entorno de interfaz gráfica o DOM.

---

## 🔀 Modos de Encuadre (Codecs)

ModbusLab soporta los tres encuadres estándar del protocolo Modbus: **RTU**, **ASCII** y **TCP (MBAP)**.

### 1. Modbus RTU (Serial Binario)
- **Estructura de trama:** `[Dirección (1B)] [PDU] [CRC16 Lo (1B)] [CRC16 Hi (1B)]`
- **Sumas de verificación:** CRC-16 (transmitido LSB primero).
- **Ejemplo:** `01 03 02 98 00 01 04 5D` (Lee 1 registro en `0298h` de la Estación 1).

### 2. Modbus ASCII (Serial Texto)
- **Estructura de trama:** `':'` + `HexASCII([Dirección] [PDU] [LRC])` + `CR LF`
- **Sumas de verificación:** LRC calculado sobre los bytes binarios antes de la conversión a ASCII hex.
- **Ejemplo:** `:01030298000161\r\n`

### 3. Modbus TCP (MBAP)
- **Estructura de trama:** `[TID Hi] [TID Lo] [0x00] [0x00] [LEN Hi] [LEN Lo] [Unit ID] [PDU]`
- **Cabecera MBAP (7 bytes):**
    - `TID` (Transaction Identifier): Contador de transacción incrementado por el cliente.
    - `PID` (Protocol Identifier): `0x0000` para Modbus TCP.
    - `LEN` (Length): Longitud de bytes restantes (`1 + longitud del PDU`).
    - `Unit ID` (Dirección de estación): Identificador del esclavo (`1` o `2`).

---

## 🧮 Sumas de Verificación

```ts
// src/lib/modbus/checksum.ts

/** Algoritmo CRC-16 Modbus (Polinomio 0xA001) */
export function crc16(buf: Uint8Array): number {
  let crc = 0xffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
  }
  return crc; // LSB primero en la trama
}

/** Algoritmo LRC Modbus (Longitudinal Redundancy Check) */
export function lrc(buf: Uint8Array): number {
  let sum = 0;
  for (const b of buf) sum = (sum + b) & 0xff;
  return (-sum) & 0xff;
}
```

---

## 📜 Funciones Modbus Soportadas

ModbusLab implementa las siguientes 12 funciones Modbus con sus etiquetas en español:

| Código | Rótulo en el Selector | Tipo de PDU |
|:---:|:---|:---|
| **0** | Control de estaciones esclavas | *Función especial (Genera Excepción 01 para fines docentes)* |
| **1** | Lectura de n bits de salida o internos | Solicitud: `[01] [Ini Hi] [Ini Lo] [Cant Hi] [Cant Lo]`<br>Respuesta: `[01] [N Bytes] [Datos...]` (LSB primero) |
| **2** | Lectura de n bits de entradas | Solicitud: `[02] [Ini Hi] [Ini Lo] [Cant Hi] [Cant Lo]`<br>Respuesta: `[02] [N Bytes] [Datos...]` |
| **3** | Lectura de n palabras de salidas o internos | Solicitud: `[03] [Ini Hi] [Ini Lo] [Cant Hi] [Cant Lo]`<br>Respuesta: `[03] [2*Cant] [Reg Hi] [Reg Lo]...` |
| **4** | Lectura de n palabras de entradas | Solicitud: `[04] [Ini Hi] [Ini Lo] [Cant Hi] [Cant Lo]`<br>Respuesta: `[04] [2*Cant] [Reg Hi] [Reg Lo]...` |
| **5** | Escritura de un bit | Solicitud: `[05] [Dir Hi] [Dir Lo] [FF 00 | 00 00]`<br>Respuesta: Eco de la petición |
| **6** | Escritura de una palabra | Solicitud: `[06] [Dir Hi] [Dir Lo] [Val Hi] [Val Lo]`<br>Respuesta: Eco de la petición |
| **7** | Lectura rápida de 8 bits | Solicitud: `[07]`<br>Respuesta: `[07] [Byte Estado]` |
| **8** | Control de contadores de diagnósticos (1–8) | Solicitud: `[08] [SubFn Hi] [SubFn Lo] [Dato Hi] [Dato Lo]`<br>Respuesta: Eco (SubFn 0000h) o Contadores (000Bh–0012h) |
| **11** | Control del contador de diagnósticos (9) | Solicitud: `[11]`<br>Respuesta: `[11] [Status Hi] [Status Lo] [EventCnt Hi] [EventCnt Lo]` |
| **15** | Escritura de n bits | Solicitud: `[15] [Ini Hi] [Ini Lo] [Cant Hi] [Cant Lo] [N Bytes] [Datos...]`<br>Respuesta: `[15] [Ini Hi] [Ini Lo] [Cant Hi] [Cant Lo]` |
| **16** | Escritura de n palabras | Solicitud: `[16] [Ini Hi] [Ini Lo] [Cant Hi] [Cant Lo] [2*Cant] [Datos...]`<br>Respuesta: `[16] [Ini Hi] [Ini Lo] [Cant Hi] [Cant Lo]` |

---

## 🚨 Respuestas de Excepción Modbus

Cuando un dispositivo virtual recibe una petición no válida, emite una PDU de excepción con la estructura: `[Función | 0x80] [Código Excepción]`.

| Código | Nombre Excepción | Causa en el Dispositivo Virtual |
|:---:|:---|:---|
| **01** | `ILLEGAL FUNCTION` | Función no soportada por el esclavo (p. ej. Fn 0 en cualquier esclavo, o Fn 05 al analizador WM14). |
| **02** | `ILLEGAL DATA ADDRESS` | Dirección o rango fuera del mapa de memoria, dirección impar en el analizador WM14, o intento de escritura en área de solo lectura (como área F del PLC o RAM de medidas del WM14). |
| **03** | `ILLEGAL DATA VALUE` | Cantidad fuera de rango (`count` > 125 palabras o > 2000 bits), `n bytes` incoherente con la cantidad, o valor de coil en Fn 05 distinto de `FF00h` / `0000h`. |
| **04** | `SLAVE DEVICE FAILURE` | Error interno simulado en el dispositivo esclavo. |
| **06** | `SLAVE DEVICE BUSY` | Intento de escritura en la EEPROM de parámetros del WM14 cuando el candado de seguridad está activo sin haber autenticado previamente con la contraseña en `1080h`. |
