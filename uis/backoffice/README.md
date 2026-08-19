# Brasaland — Backoffice de Proveedores (Frontend)

Panel de administración de proveedores para **Brasaland**, cadena de restaurantes de parrilla con locales en Colombia y Estados Unidos. Consume la [Suppliers API](../../services/api/README.md) y permite gestionar el catálogo completo de proveedores desde una única vista.

---

## Índice

- [Tecnologías](#tecnologías)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Ejecución](#ejecución)
- [Proxy de API](#proxy-de-api)
- [Componentes](#componentes)
  - [Vista principal: `page.tsx`](#vista-principal-pagetsx)
  - [api.ts](#apits)
  - [search-bar.tsx](#search-bartsx)
  - [supplier-list.tsx](#supplier-listsx)
  - [supplier-card.tsx](#supplier-cardsx)
  - [status-badge.tsx](#status-badgetsx)
  - [supplier-form.tsx](#supplier-formtsx)
  - [rate-dialog.tsx](#rate-dialogtsx)
  - [delete-dialog.tsx](#delete-dialogtsx)
  - [category-picker.tsx](#category-pickertsx)
  - [country-currency-fields.tsx](#country-currency-fieldstsx)
  - [form-field.tsx / form-select.tsx / form-textarea.tsx / form-actions.tsx](#componentes-genéricos-de-formulario)
- [Flujo de datos](#flujo-de-datos)
- [Responsive design](#responsive-design)
- [Estética](#estética)

---

## Tecnologías

| Tecnología     | Versión | Propósito                        |
| -------------- | ------- | -------------------------------- |
| Next.js        | 15+     | Framework React con App Router   |
| React          | 19+     | Librería de UI                   |
| TypeScript     | 6+      | Tipado estático                  |
| Tailwind CSS   | 4+      | Estilos utilitarios              |
| Fetch API      | nativa  | Llamadas HTTP al backend         |

---

## Estructura del proyecto

```
uis/backoffice/
├── next.config.ts          # Proxy /api/* → API REST
├── package.json
├── tsconfig.json
├── postcss.config.mjs
├── public/                 # Assets estáticos (favicon, SVGs)
├── src/
│   └── app/
│       ├── layout.tsx      # Layout raíz (metadatos, fuentes, fondo)
│       ├── globals.css     # Estilos base Tailwind
│       ├── page.tsx        # Vista única con toda la lógica de estado
│       └── components/
│           ├── api.ts                   # Cliente HTTP tipado
│           ├── search-bar.tsx           # Filtros de búsqueda
│           ├── supplier-list.tsx        # Grid de tarjetas
│           ├── supplier-card.tsx        # Tarjeta de proveedor
│           ├── status-badge.tsx         # Badge activo/suspendido
│           ├── supplier-form.tsx        # Formulario de alta
│           ├── category-picker.tsx      # Selector de categorías
│           ├── country-currency-fields.tsx # Campos país + moneda
│           ├── rate-dialog.tsx          # Modal de tarifa
│           ├── delete-dialog.tsx        # Modal de eliminación
│           ├── form-field.tsx           # Input genérico
│           ├── form-select.tsx          # Select genérico
│           ├── form-textarea.tsx        # Textarea genérico
│           └── form-actions.tsx         # Botonera genérica
```

---

## Ejecución

```bash
# 1. Asegúrate de que la API esté corriendo en otro terminal
cd /workspaces/gastoncode-eleccion-empresa
python -m uvicorn services.api.main:app --reload

# 2. Inicia el frontend
cd /workspaces/gastoncode-eleccion-empresa/uis/backoffice
npm run dev
```

El frontend queda disponible en [http://localhost:3000](http://localhost:3000). Las peticiones a `/api/*` se redirigen automáticamente a la API en `http://localhost:8000`.

---

## Proxy de API

El archivo `next.config.ts` define un **rewrite** que evita problemas de CORS en desarrollo:

```ts
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: "http://localhost:8000/:path*",
    },
  ];
}
```

Esto significa que el frontend llama a `/api/suppliers` y Next.js lo traduce internamente a `http://localhost:8000/suppliers`. El navegador solo ve peticiones al mismo origen.

---

## Componentes

### Vista principal: `page.tsx`

**Propósito:** Orquestador de toda la aplicación. Maneja el estado global (lista de proveedores, modales, mensajes flash) y conecta los componentes hijos.

**Estados que maneja:**

| Estado       | Visualización                                      |
| ------------ | -------------------------------------------------- |
| Carga inicial | Spinner animado (`animate-spin`)                  |
| Error        | Banner rojo con mensaje                            |
| Vacío        | Mensaje "No se encontraron proveedores" (en `SupplierList`) |
| Éxito        | Banner verde con auto-dismiss a 3 segundos         |
| Búsqueda     | Spinner en botón de búsqueda                       |

**Funciones principales:**

| Función             | Disparador                        | Qué hace                                                   |
| ------------------- | --------------------------------- | ---------------------------------------------------------- |
| `loadAll()`         | `useEffect` al montar             | `GET /api/suppliers` → `setSuppliers(data)`               |
| `handleSearch()`    | Formulario de búsqueda            | `GET /api/suppliers/search?country=X&categories=Y`         |
| `handleCreate()`    | Modal de nuevo proveedor          | `POST /api/suppliers` → recarga lista                      |
| `handleRate()`      | Modal de tarifa                   | `PATCH /api/suppliers/{id}/rate` → recarga lista           |
| `handleToggleStatus()` | Botón en tarjeta                | `PATCH /api/suppliers/{id}/status` → recarga lista         |
| `handleDelete()`    | Modal de eliminación              | `DELETE /api/suppliers/{id}` → recarga lista               |

**Sin recarga de página:** todas las operaciones usan `fetch` asíncrono y actualizan el estado local sin recargar el navegador.

---

### api.ts

**Propósito:** Cliente HTTP tipado con una función exportada por cada endpoint de la API.

**Interfaces exportadas:**

| Interfaz             | Uso                            |
| -------------------- | ------------------------------ |
| `Supplier`           | Respuesta completa del backend |
| `CreateSupplierInput`| Payload para crear proveedor   |

**Funciones exportadas:**

| Función             | Método  | Endpoint                          |
| ------------------- | ------- | --------------------------------- |
| `fetchSuppliers()`  | GET     | `/api/suppliers`                  |
| `searchSuppliers()` | GET     | `/api/suppliers/search?country=&categories=` |
| `createSupplier()`  | POST    | `/api/suppliers`                  |
| `updateRate()`      | PATCH   | `/api/suppliers/{id}/rate`        |
| `updateStatus()`    | PATCH   | `/api/suppliers/{id}/status`      |
| `deleteSupplier()`  | DELETE  | `/api/suppliers/{id}`             |

Todas lanzan `Error` si el status HTTP no es OK, y el error se captura en `page.tsx` para mostrar el banner rojo.

---

### search-bar.tsx

**Propósito:** Filtros de búsqueda por país y categoría.

| Elemento       | Comportamiento                                              |
| -------------- | ----------------------------------------------------------- |
| Select "País"  | Opciones: Todos, Colombia, USA                              |
| Select "Categoría" | 8 categorías de insumos Brasaland                      |
| Botón "Buscar" | Ejecuta `handleSearch(country, categories)`                 |
| Botón "Limpiar" | Resetea selects y recarga lista completa                   |

El botón "Buscar" muestra "Buscando…" con `disabled` mientras la petición está en curso.

---

### supplier-list.tsx

**Propósito:** Grid responsivo de tarjetas de proveedor.

| Estado          | Renderizado                                      |
| --------------- | ------------------------------------------------ |
| Con proveedores | `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`       |
| Sin proveedores | Mensaje centrado "No se encontraron proveedores." |

---

### supplier-card.tsx

**Propósito:** Tarjeta individual con datos y acciones de un proveedor.

**Datos mostrados:**

- Nombre + badge de estado
- País, categorías, tarifa formateada, email de contacto, notas

**Acciones (3 botones):**

| Botón              | Acción                      |
| ------------------ | --------------------------- |
| Actualizar tarifa  | Abre `RateDialog`           |
| Suspender / Activar | Toggle `updateStatus()`     |
| Eliminar           | Abre `DeleteDialog`         |

La tarifa se formatea con `toLocaleString()` para mostrar separadores de miles y 2 decimales. El símbolo de moneda cambia según `currency`.

---

### status-badge.tsx

**Propósito:** Indicador visual de estado del proveedor.

| Estado      | Color          | Elementos visuales                    |
| ----------- | -------------- | ------------------------------------- |
| `active`    | Verde esmeralda | Bolitas verde + texto "ACTIVE"        |
| `suspended` | Rojo           | Bolitas roja + texto "SUSPENDED"      |

Usa un `span` con `rounded-full` y una bolita `<span>` de 6px con `rounded-full` para el indicador luminoso.

---

### supplier-form.tsx

**Propósito:** Formulario completo para registrar un nuevo proveedor.

**Campos:**

| Campo            | Tipo           | Componente        |
| ---------------- | -------------- | ----------------- |
| Nombre           | texto          | `FormField`       |
| País             | select         | `CountryCurrencyFields` |
| Moneda           | select         | `CountryCurrencyFields` |
| Tarifa por unidad| número         | `FormField`       |
| Categorías       | pills toggle   | `CategoryPicker`  |
| Email contacto   | email          | `FormField`       |
| Notas            | textarea       | `FormTextarea`    |
| Botones          | cancel/guardar | `FormActions`     |

El botón "Crear proveedor" se deshabilita si no hay al menos una categoría seleccionada.

---

### rate-dialog.tsx

**Propósito:** Modal para actualizar la tarifa de un proveedor.

**Comportamiento:**

1. Se abre al hacer clic en "Actualizar tarifa" en una tarjeta
2. Muestra el nombre del proveedor como referencia
3. Input numérico precargado con la tarifa actual
4. Al confirmar: llama `PATCH /suppliers/{id}/rate`
5. Se cierra al hacer clic en el fondo oscuro, en "Cancelar", o tras guardar
6. `stopPropagation()` evita que clicks dentro del modal lo cierren

---

### delete-dialog.tsx

**Propósito:** Modal de confirmación antes de eliminar un proveedor.

**Comportamiento:**

1. Se abre al hacer clic en "Eliminar" en una tarjeta
2. Muestra el nombre del proveedor y advertencia "Esta acción no se puede deshacer"
3. Al confirmar: llama `DELETE /suppliers/{id}`
4. Igual que RateDialog: se puede cerrar por fondo, botón o tras guardar

---

### category-picker.tsx

**Propósito:** Selector visual de categorías tipo pills toggle.

**Categorías disponibles** (8):

| Valor                      | Etiqueta                |
| -------------------------- | ----------------------- |
| `carne`                    | carne                   |
| `verduras_y_hortalizas`    | verduras y hortalizas   |
| `salsas_y_condimentos`     | salsas y condimentos    |
| `bebidas`                  | bebidas                 |
| `lacteos`                  | lácteos                 |
| `packaging`                | packaging               |
| `productos_limpieza`       | productos limpieza      |
| `carbon_y_combustible`     | carbón y combustible    |

Cada pill cambia de color (ámbar seleccionado / gris no seleccionado) al hacer clic. Múltiples selecciones simultáneas permitidas.

---

### country-currency-fields.tsx

**Propósito:** Par de selects para país y moneda, usados en el formulario de alta.

Agrupa dos `FormSelect` en un contenedor `flex gap-3`, y propaga los cambios hacia arriba mediante `onChange`.

| Select  | Opciones              |
| ------- | --------------------- |
| País    | Colombia, USA         |
| Moneda  | COP ($), USD (US$)    |

---

### Componentes genéricos de formulario

Cuatro componentes reutilizables que abstraen el markup repetitivo de Tailwind:

| Componente       | Líneas | Props principales                  |
| ---------------- | ------ | ---------------------------------- |
| `form-field.tsx` | 39     | `label`, `value`, `onChange`, `type`, `required` |
| `form-select.tsx`| 43     | `label`, `value`, `onChange`, `options[]`        |
| `form-textarea.tsx` | 33  | `label`, `value`, `onChange`, `rows`             |
| `form-actions.tsx`  | 33  | `saving`, `disabled`, `onCancel`, `submitLabel`  |

Todos generan un `id` único a partir del label para la relación `htmlFor`/`id` de accesibilidad.

---

## Flujo de datos

```
Navegador                  Next.js (proxy)              API (uvicorn)
    │                          │                           │
    ├── GET  /api/suppliers ───┼──→ localhost:8000/suppliers ──→ TinyDB
    │                          │                           │
    ├── POST /api/suppliers ───┼──→ localhost:8000/suppliers ──→ insert
    │                          │                           │
    ├── PATCH .../rate ────────┼──→ localhost:8000/.../rate ───→ update
    │                          │                           │
    ├── PATCH .../status ──────┼──→ localhost:8000/.../status → update
    │                          │                           │
    └── DELETE .../{id} ───────┼──→ localhost:8000/.../{id} ──→ remove
                               │
        (sin CORS — mismo origen gracias al rewrite)
```

---

## Responsive design

La vista es mobile-first y se adapta en 3 puntos de quiebre:

| Breakpoint   | Ancho     | Grid de tarjetas | SearchBar         | Header        |
| ------------ | --------- | ---------------- | ----------------- | ------------- |
| Mobile       | < 640px   | 1 columna        | Apilado vertical  | Botón solo "+"|
| Tablet       | ≥ 640px   | 2 columnas       | Botones en fila   | Texto completo|
| Desktop      | ≥ 1024px  | 3 columnas       | Botones en fila   | Texto completo|

Detalles de implementación:

- `flex-wrap` + `w-full` + `sm:w-auto` en botones de búsqueda
- `flex-col sm:flex-row` en contenedor de botones
- `sm:hidden` / `hidden sm:inline` en etiqueta del botón "+ Nuevo proveedor"
- Modales centrados con `overflow-y-auto` para scroll en pantallas pequeñas

---

## Estética

La interfaz está diseñada para una parrilla, con una paleta oscura cálida:

- **Fondo base:** `stone-950` (negro carbón)
- **Superficies:** `stone-900` / `stone-800` (gris ceniza)
- **Texto:** `stone-200` / `stone-400` / `stone-500`
- **Acento principal:** `amber-600` → `amber-400` (llama/brasas)
- **Acento éxito:** `emerald-400` (verde)
- **Acento error/peligro:** `red-400`
- **Ícono en header:** 🔥 (llama)
- **Spinner:** borde `amber-500`

---

## Consideraciones

- **Sin recarga de página:** todas las mutaciones usan `fetch` + actualización de estado local.
- **Sin dependencias externas de UI:** todos los componentes son hechos a medida con Tailwind.
- **Tipado completo:** todas las funciones y props tienen tipos explícitos.
- **Componentes pequeños:** ninguno supera las 100 líneas, con responsabilidades claras y separadas.
- **Sin páginas adicionales:** la aplicación consta de una sola vista (single-page App Router).
- **Accesibilidad:** cada input tiene su `label` con `htmlFor` vinculado, y los modales tienen `role="dialog"` implícito.
