# Orientaciones para el Estudiante

Esta guía proporciona las instrucciones paso a paso para llevar a cabo la práctica de laboratorio virtual **ModbusLab**.

---

## 🚀 1. Primeros Pasos e Identificación

1. **Ingreso a la aplicación:** Abra la aplicación web de ModbusLab en su navegador.
2. **Selección de Variante:** En la pantalla de inicio, ingrese su **Número de Lista (1 al 44)** asignado por el profesor.
3. **Carga de Datos:** Al ingresar su número, el sistema cargará automáticamente los parámetros correspondientes a su variante en la barra superior y en el panel de tareas.

!!! info "Persistencia de Datos"
    Su sesión, la bitácora de tramas y el avance de sus tareas se guardan automáticamente en su navegador (`localStorage`). Si recarga la página o cierra la pestaña, no perderá su trabajo.

---

## 🛠️ 2. Estructura de la Interfaz

La interfaz principal consta de dos pestañas de trabajo en la columna izquierda:

- **Bits operations:** Destinada a la interacción con el **PLC virtual LS Master-K120S (Estación 2)**.
- **Registers operations:** Destinada a la interacción con el **Analizador de Redes Carlo Gavazzi WM14 (Estación 1)**.

Cada pestaña contiene su propio **Editor de Mensajes**, su **Configuración del Enlace**, su **Consola de Tramas** y su **Monitor en Tiempo Real**.

---

## ✍️ 3. Composición de Tramas Modbus a Mano

El objetivo central del laboratorio es que usted mismo construya las tramas Modbus especificando sus campos en formato hexadecimal.

### Campos del Editor de Mensajes

| Campo | Rango / Formato | Descripción |
|---|---|---|
| **Estación (Unit ID)** | `0` – `5` | Dirección del esclavo en el bus (`1` = Analizador WM14, `2` = PLC Master-K, `0` = Broadcast). |
| **Función** | Selector | Código de función Modbus (0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 15, 16). |
| **SubFunción** | Hex `HHHH` | Subcódigo para funciones de diagnóstico (p. ej. Fn 08). |
| **Dirección** | Hex `HHHH` | Dirección inicial de memoria en hexadecimal (4 dígitos). |
| **Número / Cantidad** | Hex `HHHH` | Cantidad de bits o palabras a leer o escribir. |
| **Octetos (Bytes)** | Hex `HH` | Número de bytes de datos (utilizado en Fn 15 y Fn 16). |
| **Datos** | Hex `HHHH` / Bin `BB` | Valor o valores a escribir. En Fn 15 es una secuencia de 8 bits binarios (`10110010`). |

---

### Habilitación de Campos según la Función

Dependiendo de la función Modbus seleccionada, el editor habilitará únicamente los campos requeridos:

```
+--------+-----------+-----------+------------+-----------+-----------+
| Función| Subfunción| Dirección | Cant./Num. |  Octetos  |   Datos   |
+--------+-----------+-----------+------------+-----------+-----------+
|   01   |     -     |     X     |     X      |     -     |     -     |
|   02   |     -     |     X     |     X      |     -     |     -     |
|   03   |     -     |     X     |     X      |     -     |     -     |
|   04   |     -     |     X     |     X      |     -     |     -     |
|   05   |     -     |     X     |     -      |     -     |     X     |
|   06   |     -     |     X     |     -      |     -     |     X     |
|   15   |     -     |     X     |     X      |     X     |  X (Bin)  |
|   16   |     -     |     X     |     X      |     X     |  X (Hex)  |
+--------+-----------+-----------+------------+-----------+-----------+
```

---

## 📋 4. Guía Detallada de Tareas del Laboratorio

Para completar el laboratorio debe cumplir **9 Tareas Obligatorias** más **1 Tarea Opcional** adaptadas a su variante.

---

### Tareas del PLC (Estación 2)

#### 🔹 Tarea 1: Escribir 1 en el bit de la variante
- **Objetivo:** Encender la salida especificada en su variante (p. ej., `P40` = dirección `0040h`).
- **Estación:** `2`
- **Función:** `05` (Escritura de un bit)
- **Dirección:** Dirección hex del bit (p. ej., `0040`)
- **Dato:** `FF00` (Valor estándar Modbus para encender un bit)

#### 🔹 Tarea 2: Leer el bit encendido
- **Objetivo:** Comprobar mediante lectura que el bit fue encendido.
- **Estación:** `2`
- **Función:** `01` o `02` (Lectura de bits)
- **Dirección:** Dirección hex del bit (p. ej., `0040`)
- **Número:** `0001` (1 bit)

#### 🔹 Tarea 3: Escribir 0 en el bit de la variante
- **Objetivo:** Apagar el bit de la variante.
- **Estación:** `2`
- **Función:** `05`
- **Dirección:** Dirección hex del bit (p. ej., `0040`)
- **Dato:** `0000` (Valor estándar Modbus para apagar un bit)

#### 🔹 Tarea 4: Leer el bit apagado
- **Objetivo:** Verificar mediante lectura que el bit se apagó.
- **Estación:** `2`
- **Función:** `01` o `02`
- **Dirección:** Dirección hex del bit
- **Número:** `0001`

#### 🔹 Tarea 5: Leer un rango de entradas en una sola lectura
- **Objetivo:** Leer el grupo de entradas asignado en su variante (p. ej., `P00` a `P04`).
- **Estación:** `2`
- **Función:** `01` o `02`
- **Dirección:** Dirección de la primera entrada (p. ej., `P00` -> `0000`)
- **Número:** Cantidad de entradas del rango (p. ej., de P00 a P04 son 5 entradas -> `0005`)

#### 🔹 Tarea 6: Escribir el valor `5555h` a partir de la dirección base del PLC
- **Objetivo:** Escribir una palabra en la memoria del PLC en la dirección base asignada.
- **Estación:** `2`
- **Función:** `06` (Escritura de una palabra) o `16` (Escritura de múltiples palabras)
- **Dirección:** Dirección base en hexadecimal indicada en su variante (p. ej., `2000`)
- **Dato:** `5555`

#### 🔹 Tarea 7: Leer un registro de salida en la dirección `P00`
- **Objetivo:** Leer la palabra del área P en la dirección `0000h`.
- **Estación:** `2`
- **Función:** `03` o `04` (Lectura de palabras)
- **Dirección:** `0000`
- **Número:** `0001`

---

### Tareas del Analizador WM14 (Estación 1)

!!! warning "¡Atención al Direccionamiento del WM14!"
    En el analizador WM14, **cada registro de 16 bits ocupa 2 direcciones de byte**. Por tanto, la dirección siempre debe ser **par** (`0280h`, `0282h`, `0284h`...).

#### 🔹 Tarea 8: Leer magnitudes en lecturas individuales
- **Objetivo:** Efectuar lecturas individuales (de 1 registro o 2 registros según el tipo) para cada una de las 3 magnitudes asignadas a su variante.
- **Estación:** `1`
- **Función:** `03` o `04`
- **Dirección:** Dirección en hexadecimal correspondiente a la variable.
- **Número:** `0001` (o `0002` para variables de 32 bits como energía o contadores).

#### 🔹 Tarea 9: Leer 4 registros a partir de la dirección base del analizador
- **Objetivo:** Leer un bloque continuo de 4 registros comenzando en la dirección base del analizador asignada a su variante.
- **Estación:** `1`
- **Función:** `03` o `04`
- **Dirección:** Dirección base en hexadecimal indicada en la tabla de variantes (p. ej., `0280`)
- **Número:** `0004` (Leera 4 registros consecutivos de 16 bits).

---

### 🌟 Tarea 10 (Opcional): Reescalado mediante modificación del parámetro `Ct_ratio`

1. **Leer `Ct_ratio`:** Envíe una trama a la Estación `1`, Fn `03`, Dirección `1084h`, Número `0001`. Compruebe que la respuesta devuelve el valor actual (`0019h` = 25).
2. **Modificar `Ct_ratio`:** Envíe Fn `06` a la Dirección `1084h` con el valor `0032h` (50 en decimal).
3. **Observar el efecto:** Vuelva a leer la corriente de fase en el analizador (p. ej., `0282h` para A L1). Compruebe cómo la lectura medida en el amperímetro se ha **duplicado**, aunque el valor bruto del registro del medidor no ha cambiado.

---

## 🖥️ 5. Uso de los Monitores y la Consola

### Consola de Tramas
Muestra la lista de tramas transmitidas ($\rightarrow$) y recibidas ($\leftarrow$). Al hacer clic en cualquier fila, la consola se expande para mostrar:
- Desglose de bytes (Estación, Función, Dirección, Datos, CRC/LRC).
- Verificación del cálculo de CRC-16 o LRC.
- Conversión a magnitudes físicas e interpretación de ingeniería.

### Monitores de Dispositivos
- **PLC Monitor:** Muestra LEDs de Entradas (arriba) y Salidas (abajo). Al hacer clic sobre las entradas virtuales, puede simular el estado de los interruptores físicos.
- **Analizador Monitor:** Muestra voltímetros y amperímetros de aguja e instrumentos digitales LCD. Incluye un **Banco de Cargas Trifásico** conmutable para variar la potencia consumida.

---

## ❓ 6. Preguntas Frecuentes y Diagnóstico

??? question "¿Por qué obtengo una Excepción Modbus?"
    - **Excepción 01 (ILLEGAL FUNCTION):** Ha enviado un código de función no soportado por el dispositivo (p. ej. Fn 05 al analizador o Fn 0 al PLC).
    - **Excepción 02 (ILLEGAL DATA ADDRESS):** La dirección especificada está fuera de rango o ha usado una dirección impar en el analizador WM14.
    - **Excepción 03 (ILLEGAL DATA VALUE):** La cantidad de registros o bits solicitada excede los límites permitidos, o ha enviado un valor diferente de `FF00`/`0000` en Fn 05.
    - **Excepción 06 (SLAVE DEVICE BUSY):** El candado de programación del analizador está activo y requiere introducir primero la contraseña en la dirección `1080h`.

??? question "¿Por qué obtengo un Timeout (Tiempo de espera agotado)?"
    - Ha enviado un mensaje a una dirección de estación inexistente (diferente de 1 y 2).
    - Ha configurado probabilidades de pérdida de trama en el panel de condiciones del enlace.

---

## 📄 7. Generación e Impresión del Informe Final

Al finalizar sus tareas, haga clic en el botón **"Generar informe"** en la barra superior. Se abrirá una vista previa formateada de su informe con:
- Estado de cumplimiento verificado de cada tarea.
- Trama exacta enviada y respuesta obtenida que satisfizo la tarea.
- Bitácora completa codificada y decodificada con marcas de tiempo.
- Estado final de los mapas de memoria de los dispositivos.

Puede descargar su informe en formato Markdown (`.md`) o imprimirlo/guardarlo en PDF directamente desde el navegador.
