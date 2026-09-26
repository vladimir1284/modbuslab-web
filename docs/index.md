# ModbusLab — Laboratorio Virtual Modbus

Bienvenido a la documentación oficial del **Laboratorio Virtual ModbusLab**.

ModbusLab es un entorno interactivo de aprendizaje diseñado para la enseñanza del protocolo industrial **Modbus** (RTU, ASCII y TCP/MBAP). La aplicación simula dispositivos industriales reales (un PLC **LS Master-K120S** y un Analizador de Redes **Carlo Gavazzi WM14**) mediante **dispositivos virtuales** ejecutados localmente en un Web Worker dentro del navegador del usuario.

<div style="text-align: center; margin: 2rem 0; padding: 2.5rem 1.5rem; background: linear-gradient(135deg, #3f51b5 0%, #1a237e 100%); border-radius: 12px; color: white; box-shadow: 0 8px 20px rgba(0,0,0,0.15);">
  <h2 style="color: white; margin-top: 0; font-size: 1.8rem; font-weight: 700; border-bottom: none;">🚀 Accede al Laboratorio Virtual</h2>
  <p style="font-size: 1.15rem; margin-bottom: 1.8rem; opacity: 0.95; max-width: 650px; margin-left: auto; margin-right: auto;">
    Inicia el simulador interactivo para trabajar con el PLC y el Analizador de Redes en tiempo real.
  </p>
  <a href="https://modbuslab.ladetec.com" target="_blank" rel="noopener noreferrer" style="font-size: 1.3rem; padding: 0.9rem 2.5rem; background-color: #00e676; color: #0d1117; font-weight: bold; border-radius: 8px; text-decoration: none; display: inline-block; box-shadow: 0 4px 14px rgba(0,230,118,0.4); text-transform: uppercase; letter-spacing: 0.5px;">
    ⚡ IR AL LABORATORIO VIRTUAL (modbuslab.ladetec.com) ➔
  </a>
</div>

---

## 🎯 Objetivo Pedagógico

El propósito fundamental del laboratorio es que el estudiante aprenda a **componer tramas Modbus a mano en hexadecimal** (estación, función, dirección, cantidad/datos), las envíe a los dispositivos virtuales y observe simultáneamente:

1. **La trama cruda** enviada y recibida byte a byte, con desglose del protocolo y validación de sumas de verificación (CRC-16 / LRC).
2. **El efecto físico inmediato** sobre los monitores en tiempo real (indicadores LED del PLC, instrumentos analógicos de aguja y monitores digitales del analizador de redes).

??? tip "Principio docente"
    En ModbusLab, la interfaz no "oculta" la trama ni la construye automáticamente por el estudiante. El contenido pedagógico principal reside en la construcción manual de la PDU y en la comprensión de los mapas de memoria y encuadre del protocolo.

---

## 🏛️ Arquitectura General

```
+-------------------------------------------------------------------+
|                        Navegador del Usuario                      |
|                                                                   |
|  +-------------------------------------------------------------+  |
|  |                     Hilo Principal (UI)                     |  |
|  |  • SvelteKit 2 + Svelte 5 (Runes: $state, $derived)           |  |
|  |  • Editor de Mensajes Hexadecimal                             |  |
|  |  • Consola de Tramas con descomposicion byte a byte          |  |
|  |  • Monitores de PLC y Analizador de Redes WM14                |  |
|  +------------------------------+------------------------------+  |
|                                 |                                 |
|                   postMessage (Uint8Array)                        |
|                                 |                                 |
|  +------------------------------v------------------------------+  |
|  |                   Web Worker (Simulacion)                   |  |
|  |  • Bus Virtual Modbus (Enrutamiento por Estacion)             |  |
|  |  • Estacion 2: PLC LS Master-K120S Virtual                     |  |
|  |  • Estacion 1: Analizador Carlo Gavazzi WM14 Virtual          |  |
|  |  • Proceso Fisico y Banco de Cargas Trifasico                 |  |
|  +-------------------------------------------------------------+  |
+-------------------------------------------------------------------+
```

- **Ejecución 100% en Cliente:** Toda la simulación ocurre en un Web Worker en el navegador. No requiere servidores backend, bases de datos ni conexión continua tras la carga inicial.
- **Aislamiento Total:** El único punto de acoplamiento entre la interfaz gráfica y el simulador es el intercambio de bytes binarios (`Uint8Array`) a través de la API `postMessage`.
- **Despliegue en Cloudflare Pages:** La aplicación y esta documentación están desplegadas como activos estáticos y serverless en **Cloudflare Pages**.

---

## 📚 Estructura de la Documentación

Esta documentación está organizada en las siguientes secciones principales:

<div class="grid cards" markdown>

-   :fontawesome-solid-graduation-cap: **[Orientaciones al Estudiante](orientaciones/index.md)**

    ---

    Guía paso a paso para realizar el laboratorio, composición de tramas hexadecimales, explicación detallada de tareas (1 a 10) y solución de problemas.

-   :fontawesome-solid-table-list: **[Tabla de Variantes (1–44)](orientaciones/variantes.md)**

    ---

    Tabla completa con los datos asignados a cada número de lista (bits, direcciones de memoria, magnitudes a medir).

-   :fontawesome-solid-gears: **[Especificación del Protocolo](especificacion/protocolo.md)**

    ---

    Detalle técnico de los modos RTU, ASCII y TCP (MBAP), sumas de verificación CRC-16 y LRC, funciones Modbus (0 a 16) y respuestas de excepción.

-   :fontawesome-solid-microchip: **[PLC Master-K120S Virtual](especificacion/plc.md)**

    ---

    Mapa de memoria (P, M, L, K, F, T, C, S, D), mapeo compartido entre bits y palabras, entradas/salidas físicas y simulación de programa de escalera.

-   :fontawesome-solid-bolt: **[Analizador WM14 Virtual](especificacion/analizador.md)**

    ---

    Mapa RAM de medidas, EEPROM de parámetros (`Vt_ratio`, `Ct_ratio`, `Address`), direccionamiento por byte, candado de programación y banco de cargas trifásico.

-   :fontawesome-solid-cloud: **[Guía de Despliegue](despliegue/cloudflare.md)**

    ---

    Instrucciones completas para construir y desplegar tanto la aplicación SvelteKit como este sitio de documentación MkDocs en **Cloudflare Pages**.

</div>
