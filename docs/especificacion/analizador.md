# Analizador Virtual — Carlo Gavazzi WM14 (Estación 1)

El **Analizador de Redes Virtual** simula un instrumento multifunción **Carlo Gavazzi WM14** que responde inicialmente en la **Estación 1**.

---

## ⚠️ Direccionamiento por Byte (Regla del WM14)

El campo de dirección en los mensajes Modbus destinados al WM14 es una **dirección de byte**.

- **Cada registro de 16 bits ocupa 2 direcciones de memoria.**
- Una lectura de $N$ registros desde la dirección $A$ devuelve los registros situados en las direcciones: $A$, $A+2$, $A+4$, $\dots$, $A+2(N-1)$.
- **Las direcciones deben ser estrictamente pares.** Cualquier petición a una dirección impar devuelve **Excepción 02 (`ILLEGAL DATA ADDRESS`)**.

---

## 📊 Mapa RAM de Medidas (`0280h` – `02CEh`)

| Dir. Hex | Variable | Tipo | Unidad / Descripción |
|:---:|:---|:---:|:---|
| `0280h` | V L1-N | VN | Tensión Fase 1 a Neutro |
| `0282h` | A L1 | A | Corriente de Línea Fase 1 |
| `0284h` | W L1 | P | Potencia Activa Fase 1 |
| `0286h` | V L2-N | VN | Tensión Fase 2 a Neutro |
| `0288h` | A L2 | A | Corriente de Línea Fase 2 |
| `028Ah` | W L2 | P | Potencia Activa Fase 2 |
| `028Ch` | V L3-N | VN | Tensión Fase 3 a Neutro |
| `028Eh` | A L3 | A | Corriente de Línea Fase 3 |
| `0290h` | W L3 | P | Potencia Activa Fase 3 |
| `0292h` | V L1-L2 | VC | Tensión Compuesta Fase 1 - Fase 2 |
| `0294h` | V L2-L3 | VC | Tensión Compuesta Fase 2 - Fase 3 |
| `0296h` | V L3-L1 | VC | Tensión Compuesta Fase 3 - Fase 1 |
| `0298h` | VL-L ∑ | VC | Promedio de Tensiones Compuestas |
| `029Ah` | A max | A | Corriente Máxima de Demanda |
| `029Ch` | A n | A | Corriente del Neutro |
| `029Eh` | W ∑ | P∑ | Potencia Activa Trifásica Total |
| `02A0h` | VA L1 | P | Potencia Aparente Fase 1 |
| `02A2h` | VA L2 | P | Potencia Aparente Fase 2 |
| `02A4h` | VA L3 | P | Potencia Aparente Fase 3 |
| `02A6h` | VA ∑ | P∑ | Potencia Aparente Trifásica Total |
| `02A8h` | var L1 | P | Potencia Reactiva Fase 1 |
| `02AAh` | var L2 | P | Potencia Reactiva Fase 2 |
| `02ACh` | var L3 | P | Potencia Reactiva Fase 3 |
| `02AEh` | var ∑ | P∑ | Potencia Reactiva Trifásica Total |
| `02B0h` | W dmd | P∑ | Demanda de Potencia Activa |
| `02B2h` | VA dmd | P∑ | Demanda de Potencia Aparente |
| `02B4h` | W dmd MAX | P∑ | Máxima Demanda de Potencia Activa |
| `02B8h` | Hz | H | Frecuencia de Red |
| `02BAh` | A dmd max | A | Máxima Demanda de Corriente |
| `02BCh` | PF L1 / PF L2 | PF | Factor de Potencia Fase 1 (LSB) y Fase 2 (MSB) |
| `02BEh` | PF L3 / PF ∑ | PF | Factor de Potencia Fase 3 (LSB) y Total (MSB) |
| `02C6h` | kWh | E (4B) | Energía Activa Acumulada (2 registros) |
| `02CAh` | varh | E (4B) | Energía Reactiva Acumulada (2 registros) |
| `02CEh` | Hourmeter | HM (4B) | Horas de Funcionamiento (2 registros) |

---

## ⚙️ EEPROM de Parámetros (`1080h` – `108Eh`)

El área EEPROM almacena la configuración de transformación y comunicación del analizador. Es **escribible mediante Fn 06 y Fn 16**:

| Dir. Hex | Parámetro | Formato | Valor Inicial | Rango Permitido | Descripción / Efecto de Escritura |
|:---:|:---|:---:|:---:|:---:|:---|
| `1080h` | Password | 111 | `0000h` | `0000h`–`FFFFh` | Contraseña para desensamblar el candado de seguridad. |
| `1082h` | `Vt_ratio` | 11.1 | `000Ah` (=1.0) | 1–999 (0.1 a 99.9) | **Relación de Transformación de Tensión (VT).** Reescala en vivo las lecturas de tipo VN, VC, P y P∑. |
| `1084h` | `Ct_ratio` | 111 | `0019h` (=25) | 1–999 (1 a 999) | **Relación de Transformación de Corriente (CT).** Reescala en vivo las lecturas de tipo A, P y P∑. |
| `1086h` | `P_int` | 111 min | `000Fh` (=15) | 1–60 | Ventana de integración para la demanda. |
| `1088h` | `Filter_rng` | 111 % | `0002h` | 1–100 | Filtro de estabilidad de lectura. |
| `108Ah` | `Filter_coe` | 111 | `0001h` | 1–100 | Coeficiente del filtro. |
| `108Ch` | `Address` | 111 | `0001h` | 1–247 | **Dirección de Estación Modbus.** Modifica la dirección en la que responde el esclavo. |
| `108Eh` | `Set_vup` | 111 V | `00F0h` (=240) | 1–999 | Umbral de sobretensión para activar la alarma. |

---

## 📐 Fórmulas de Conversión a Magnitudes Físicas

| Tipo | Punto Decimal | Unidad | Fórmula de Ingeniería |
|:---:|:---:|:---:|:---|
| **VN** | `111.1` | V | $V = \frac{\text{reg}}{10} \times \text{VT}$ |
| **VC** | `111` | V | $V = \text{reg} \times \text{VT}$ |
| **A** | `111` | A | $I = \frac{\text{reg}}{1000} \times \text{CT}$ |
| **P** | `111.1` | W / VA / var | $P = \frac{\text{reg}}{10} \times \text{CT} \times \text{VT}$ |
| **P∑** | `111` | W / VA / var | $P = \text{reg} \times \text{CT} \times \text{VT}$ |
| **H** | `111.1` | Hz | $f = \frac{\text{reg}}{10}$ |
| **PF** | `1.11` | — | $|pf| = \frac{\text{byte} \ \& \ \text{0x7F}}{100}$ (Bit 7: 0 = Inductivo, 1 = Capacitivo) |
| **E** | `111.1` | kWh / kvarh | $E = \frac{\text{reg32}}{10}$ |

---

## 🔒 Candado de Seguridad y Cambio de Dirección

### Candado de Programación (Opcional)
- Si el candado está activo en las opciones del instructor, cualquier intento de escritura a las direcciones `1082h`–`108Eh` sin autenticación previa devolverá **Excepción 06 (`SLAVE DEVICE BUSY`)**.
- Para desbloquear, el estudiante debe enviar una Fn 06 a la dirección `1080h` con la contraseña correcta.

### Cambio Dinámico de Dirección (`108Ch`)
Si el estudiante escribe una nueva dirección $S$ en `108Ch`:
1. El WM14 emite la respuesta de eco en la dirección **antigua** (Estación 1).
2. A partir del ciclo siguiente, el analizador deja de responder en la Estación 1 y responderá únicamente en la nueva estación $S$.
