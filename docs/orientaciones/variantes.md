# Tabla Completa de Variantes (1 al 44)

Cada estudiante tiene asignado un **Número de Lista (1 al 44)** que determina los parámetros exactos de memoria para sus tareas de laboratorio.

---

## 📌 Explicación de las Columnas

1. **Variante (#):** Número de lista del estudiante (1 a 44).
2. **Bit Encender/Apagar (PLC):** Dirección del bit de salida de la variante en notación Master-K (p. ej. `P40` = dirección de bit `0040h`). Utilizado en las **Tareas 1, 2, 3 y 4**.
3. **Rango de Entradas (PLC):** Bloque inclusivo de bits de entradas a leer en una sola trama. Utilizado en la **Tarea 5**.
4. **Dir. Base PLC:** Dirección hexadecimal de palabra en la memoria de enlace (área L) donde se debe escribir el valor `5555h`. Utilizada en la **Tarea 6**.
5. **Magnitudes Individuales (WM14):** Las tres variables físicas del analizador de redes a leer en lecturas individuales. Utilizadas en la **Tarea 8**.
6. **Dir. Base Analizador:** Dirección hexadecimal de byte en la memoria del WM14 a partir de la cual se deben leer 4 registros continuos. Utilizada en la **Tarea 9**.

---

## 📊 Tabla de Consulta de Variantes

| # | Bit Encender/Apagar | Rango de Entradas | Dir. Base PLC | Magnitudes a leer individualmente (WM14) | Dir. Base Analizador |
|:---:|:---:|:---:|:---:|:---|:---:|
| **1** | P40 (`0040h`) | P00–P04 (`0000h`–`0004h`) | `2000h` | V L1-N, VA ∑, Hz | `0280h` |
| **2** | P41 (`0041h`) | P01–P05 (`0001h`–`0005h`) | `2001h` | A L1, VA L1, A n | `0282h` |
| **3** | P42 (`0042h`) | P02–P06 (`0002h`–`0006h`) | `2002h` | V L2-N, VA ∑, Hz | `0284h` |
| **4** | P43 (`0043h`) | P03–P07 (`0003h`–`0007h`) | `2003h` | A L2, VA L2, A n | `0286h` |
| **5** | P44 (`0044h`) | P04–P08 (`0004h`–`0008h`) | `2004h` | V L3-N, VA ∑, Hz | `0288h` |
| **6** | P45 (`0045h`) | P05–P09 (`0005h`–`0009h`) | `2005h` | A L3, VA L3, A n | `028Ah` |
| **7** | P46 (`0046h`) | P06–P0A (`0006h`–`000Ah`) | `2006h` | W L1, A max, VL-L ∑ | `028Ch` |
| **8** | P47 (`0047h`) | P07–P0B (`0007h`–`000Bh`) | `2007h` | V L1-L2, A L1, Hz | `028Eh` |
| **9** | P40 (`0040h`) | P00–P04 (`0000h`–`0004h`) | `2008h` | W L2, A max, VL-L ∑ | `0290h` |
| **10** | P41 (`0041h`) | P01–P05 (`0001h`–`0005h`) | `2009h` | V L2-L3, A L2, Hz | `0292h` |
| **11** | P42 (`0042h`) | P02–P06 (`0002h`–`0006h`) | `200Ah` | W L3, A max, VL-L ∑ | `0294h` |
| **12** | P43 (`0043h`) | P03–P07 (`0003h`–`0007h`) | `200Bh` | V L3-L1, A L3, Hz | `0296h` |
| **13** | P40 (`0040h`) | P04–P08 (`0004h`–`0008h`) | `200Ch` | V L3-N, var L1, A n | `0298h` |
| **14** | P41 (`0041h`) | P05–P09 (`0005h`–`0009h`) | `200Dh` | V L1-N, var L3, A L2 | `029Ah` |
| **15** | P42 (`0042h`) | P06–P0A (`0006h`–`000Ah`) | `200Eh` | V L2-N, var L2, A n | `029Ch` |
| **16** | P43 (`0043h`) | P07–P0B (`0007h`–`000Bh`) | `200Fh` | A L3, VA L3, A n | `029Eh` |
| **17** | P44 (`0044h`) | P02–P06 (`0002h`–`0006h`) | `2010h` | W L1, A max, VL-L ∑ | `02A0h` |
| **18** | P45 (`0045h`) | P03–P07 (`0003h`–`0007h`) | `2011h` | V L1-L2, A L1, Hz | `02A2h` |
| **19** | P46 (`0046h`) | P04–P08 (`0004h`–`0008h`) | `2012h` | W L2, A max, VL-L ∑ | `02A4h` |
| **20** | P47 (`0047h`) | P05–P09 (`0005h`–`0009h`) | `2013h` | V L2-L3, A L2, Hz | `0286h` |
| **21** | P40 (`0040h`) | P06–P0A (`0006h`–`000Ah`) | `2014h` | W L3, A max, VL-L ∑ | `0288h` |
| **22** | P41 (`0041h`) | P07–P0B (`0007h`–`000Bh`) | `2015h` | V L3-L1, A L3, Hz | `028Ah` |
| **23** | P42 (`0042h`) | P00–P04 (`0000h`–`0004h`) | `2016h` | V L3-N, var L1, A n | `028Ch` |
| **24** | P43 (`0043h`) | P01–P05 (`0001h`–`0005h`) | `2017h` | V L1-N, var L3, A L2 | `028Eh` |
| **25** | P40 (`0040h`) | P02–P06 (`0002h`–`0006h`) | `2018h` | V L2-N, var L2, A n | `0290h` |
| **26** | P41 (`0041h`) | P03–P07 (`0003h`–`0007h`) | `2019h` | A L3, VA L3, A n | `0292h` |
| **27** | P42 (`0042h`) | P04–P08 (`0004h`–`0008h`) | `201Ah` | W L1, A max, VL-L ∑ | `029Ah` |
| **28** | P43 (`0043h`) | P05–P09 (`0005h`–`0009h`) | `201Bh` | V L1-L2, A L1, Hz | `029Ch` |
| **29** | P44 (`0044h`) | P06–P0A (`0006h`–`000Ah`) | `201Ch` | W L2, A max, VL-L ∑ | `029Eh` |
| **30** | P45 (`0045h`) | P07–P0B (`0007h`–`000Bh`) | `201Dh` | V L2-L3, A L2, Hz | `02A0h` |
| **31** | P46 (`0046h`) | P02–P06 (`0002h`–`0006h`) | `201Eh` | W L3, A max, VL-L ∑ | `02A2h` |
| **32** | P47 (`0047h`) | P03–P07 (`0003h`–`0007h`) | `201Fh` | V L3-L1, A L3, Hz | `02A4h` |
| **33** | P40 (`0040h`) | P04–P08 (`0004h`–`0008h`) | `2020h` | V L3-N, var L1, A n | `0286h` |
| **34** | P42 (`0042h`) | P05–P09 (`0005h`–`0009h`) | `2021h` | V L3-L1, A L3, Hz | `0288h` |
| **35** | P40 (`0040h`) | P00–P04 (`0000h`–`0004h`) | `2000h` | V L3-N, var L1, A n | `028Ah` |
| **36** | P41 (`0041h`) | P01–P05 (`0001h`–`0005h`) | `2001h` | V L1-N, var L3, A L2 | `028Ch` |
| **37** | P42 (`0042h`) | P02–P06 (`0002h`–`0006h`) | `2002h` | V L2-N, var L2, A n | `028Eh` |
| **38** | P43 (`0043h`) | P03–P07 (`0003h`–`0007h`) | `2003h` | A L3, VA L3, A n | `0290h` |
| **39** | P44 (`0044h`) | P04–P08 (`0004h`–`0008h`) | `2004h` | W L1, A max, VL-L ∑ | `0292h` |
| **40** | P45 (`0045h`) | P05–P09 (`0005h`–`0009h`) | `2005h` | V L1-L2, A L1, Hz | `029Ah` |
| **41** | P46 (`0046h`) | P06–P0A (`0006h`–`000Ah`) | `2006h` | W L2, A max, VL-L ∑ | `029Ch` |
| **42** | P47 (`0047h`) | P07–P0B (`0007h`–`000Bh`) | `2007h` | V L2-L3, A L2, Hz | `029Eh` |
| **43** | P40 (`0040h`) | P00–P04 (`0000h`–`0004h`) | `2008h` | W L3, A max, VL-L ∑ | `02A0h` |
| **44** | P41 (`0041h`) | P01–P05 (`0001h`–`0005h`) | `2009h` | V L3-L1, A L3, Hz | `02A2h` |
