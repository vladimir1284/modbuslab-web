# Guía de Despliegue en Cloudflare Pages

Esta guía describe el procedimiento para construir y desplegar tanto la **aplicación web SvelteKit** como este **sitio de documentación MkDocs** en **Cloudflare Pages**.

---

## 🛠️ 1. Requisitos Previos

- **Node.js** (v18 o superior) y **npm**.
- **Python** (v3.10 o superior) y **pip**.
- Cuenta en **Cloudflare** con permisos para manejar Cloudflare Pages.
- CLI de Wrangler instalado localmente (`npm install -g wrangler` o mediante `npx wrangler`).

---

## 📚 2. Despliegue del Sitio de Documentación (MkDocs)

El sitio de documentación está construido con MkDocs y el tema Material. Se compila en el directorio estático `site/`.

### Configuración en el Panel de Cloudflare Pages (GitHub/GitLab Integrado)

Si conecta su repositorio directamente en el panel de Cloudflare Pages:

1. Vaya a **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
2. Seleccione el repositorio del proyecto.
3. Ajuste la configuración de Build:
    - **Framework preset:** `None`
    - **Build command:** `pip install -r requirements.txt && mkdocs build`
    - **Build output directory:** `site`
    - **Environment variables:**
        - `PYTHON_VERSION`: `3.12`

### Despliegue Manual mediante CLI (Wrangler)

Si prefiere construir y desplegar el sitio localmente utilizando Wrangler:

```bash
# 1. Instalar dependencias de Python
pip install -r requirements.txt

# 2. Construir el sitio de documentación
npm run docs:build   # Ejecuta: mkdocs build

# 3. Desplegar en Cloudflare Pages
npx wrangler pages deploy site --project-name=modbuslab-docs
```

---

## 🚀 3. Despliegue de la Aplicación Web (SvelteKit)

La aplicación SvelteKit utiliza `@sveltejs/adapter-cloudflare` para ejecutarse eficientemente en la red global de Cloudflare.

### Configuración del Adaptador (`svelte.config.js`)

```js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};

export default config;
```

### Configuración de Wrangler (`wrangler.jsonc`)

```jsonc
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

### Comandos para Compilar y Desplegar la Aplicación

```bash
# 1. Instalar dependencias Node.js
npm install

# 2. Sincronizar y verificar tipos de SvelteKit
npx svelte-kit sync
npm run check

# 3. Ejecutar pruebas unitarias
npm run test

# 4. Construir la aplicación para producción
npm run build

# 5. Desplegar con Wrangler en Cloudflare Pages / Workers
npx wrangler deploy
```

---

## ⚡ 4. Resumen de Comandos de NPM

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo local de SvelteKit. |
| `npm run build` | Compila la aplicación SvelteKit para Cloudflare. |
| `npm run test` | Ejecuta las pruebas unitarias con Vitest. |
| `npm run check` | Valida sintaxis y tipos Svelte / TypeScript. |
| `npm run docs:build` | Compila la documentación MkDocs en el directorio `site/`. |
| `npm run docs:serve` | Inicia el servidor de desarrollo con recarga en vivo de MkDocs en `http://127.0.0.1:8000`. |
