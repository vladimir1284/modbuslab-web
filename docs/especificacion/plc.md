# PLC Virtual — LS Master-K120S (Estación 2)

El **PLC Virtual** simula un controlador lógico programable **LS Master-K120S** que responde en la **Estación 2** del bus Modbus.

---

## 🗺️ Mapa de Memoria

El direccionamiento sigue exactamente las especificaciones del manual del LS Master-K120S. La dirección de memoria en hexadecimal está organizada según el **nibble alto**:

| Nibble Alto | Área Bits | Área Palabras | Descripción | Acceso |
|:---:|:---:|:---:|:---|:---:|
| `0` | **P** | **P** | E/S Físicas e Internas | Lectura / Escritura |
| `1` | **M** | **M** | Marcas Internas (Auxiliares) | Lectura / Escritura |
| `2` | **L** | **L** | Memoria de Enlace (*Link*) | Lectura / Escritura |
| `3` | **K** | **K** | Marcas de Mantención (*Keep*) | Lectura / Escritura |
| `4` | **F** | **F** | Flags Especiales del Sistema | **Solo Lectura** (Escritura -> Excepción 02) |
| `5` | **T** | **T** | Temporizadores (Contacto / Valor Actual) | Lectura / Escritura |
| `6` | **C** | **C** | Contadores (Contacto / Valor Actual) | Lectura / Escritura |
| `7` | — | **S** | Registros de Paso (*Step*) | Lectura / Escritura |
| `8` | — | **D** | Registros de Datos | Lectura / Escritura |

---

## 🔄 Relación Compartida entre Bits y Palabras

En el PLC Master-K, **los bits y las palabras comparten la misma memoria física**.

- El **bit `n`** de un área corresponde al bit **`n & 0x0F`** (0 a 15) de la **palabra `n >> 4`** en esa misma área.
- **Ejemplo:** Notación Master-K `P4C` -> Dirección de bit en hex: `004C` -> Corresponde a la Palabra `P0004`, Bit 12 (`C` en hex).

```
Palabra P0004 (16 bits): [B15][B14][B13][B12][B11][B10][B9][B8][B7][B6][B5][B4][B3][B2][B1][B0]
                                          ^
                                     Bit P4C (004C)
```

!!! note "Efecto Práctico"
    Si el estudiante enciende el bit `P40` (`0040h`) mediante la Función 05 y posteriormente lee la palabra `0004h` mediante la Función 03, el valor devuelto contendrá el bit 0 en estado alto (`0001h`).

---

## 🔌 Entradas y Salidas Físicas

Por defecto, el PLC está configurado con la siguiente distribución de puntos digitales:

- **18 Entradas Digitales:** Direcciones de bit `0000h` a `0011h` (`P000` a `P011`).
- **12 Salidas Digitales:** Direcciones de bit `0040h` a `004Bh` (`P040` a `P04B`).

### Diálogo "Configurar PLC"
El usuario puede modificar en tiempo de ejecución:
- Cantidad de entradas y salidas activas.
- Dirección base en hexadecimal o decimal para el grupo de entradas y de salidas.
- Color de los indicadores LED (Rojo o Verde).

---

## ⚡ Programa de Escalera Simulado

El PLC virtual ejecuta un ciclo de scan interno cada **50 ms**. Cuenta con un motor de programa de escalera declarativo que puede habilitarse desde la interfaz:

- **Modo Libre (Por Defecto):** Las salidas no están gobernadas por programa interno. Las escrituras Modbus (Fn 05/15) modifican directamente el estado de las salidas.
- **Modo Programa Ejecutando:** El programa toma posesión de las salidas que gobierna. Si se envía una escritura Modbus a una salida poseída por el programa, el PLC acepta la trama pero el valor es sobreescrito por la lógica de escalera en el ciclo siguiente (50 ms).

### Reglas de Escalera Predefinidas
- `O1 = I1` (Copia el estado de la Entrada 1 a la Salida 1).
- `O2 = I2 AND I3` (Lógica AND).
- `O3 = NOT I4` (Lógica NOT).
- `O12 = Blink 1000ms` (Oscilador periódico de 1 segundo).
