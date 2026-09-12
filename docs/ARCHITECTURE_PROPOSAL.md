# Propuesta de Arquitectura Backend — Brasaland

> **Basado en FastAPI · Arquitectura en Capas**
>
> Proyecto: Brasaland Digital — Cadena de restaurantes (14 locales, Colombia y USA)
> Documento generado para el equipo de ingeniería de Brasaland Digital

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Justificación de la Elección Tecnológica](#2-justificación-de-la-elección-tecnológica)
3. [Arquitectura en Capas](#3-arquitectura-en-capas)
4. [Estructura de Carpetas y Archivos](#4-estructura-de-carpetas-y-archivos)
5. [Routers y Endpoints por Dominio](#5-routers-y-endpoints-por-dominio)
6. [Fundamentación de Cada Dominio](#6-fundamentación-de-cada-dominio)
7. [Flujo de Datos Transversal](#7-flujo-de-datos-transversal)
8. [Consideraciones Multi-país](#8-consideraciones-multi-país)
9. [Próximos Pasos](#9-próximos-pasos)

---

## 1. Resumen Ejecutivo

Brasaland opera 14 restaurantes en dos países (Colombia y Estados Unidos) con una facturación anual de ~6 millones USD y ~115 empleados. Actualmente, la operación se gestiona con herramientas mínimas: hojas de cálculo, llamadas telefónicas e informes PDF. El equipo **Brasaland Digital** tiene el mandato de construir la plataforma tecnológica que permita escalar la operación sin perder la calidad del servicio.

Esta propuesta define un **backend basado en FastAPI con arquitectura en capas**, diseñado para servir como la API central de Brasaland. La arquitectura se organiza en **ocho dominios de negocio** que reflejan la estructura real de la empresa, cada uno con su propio conjunto de routers, servicios y repositorios.

---

## 2. Justificación de la Elección Tecnológica

### ¿Por qué FastAPI?

| Requisito de Brasaland | Cómo lo satisface FastAPI |
|---|---|
| **Dos monedas y dos países** | Tipado estricto con Pydantic permite modelar `Price` con USD/COP de forma nativa y segura |
| **Ventas en tiempo real** | Soporte nativo de async/await para operaciones I/O concurrentes sin bloqueo |
| **Dashboard ejecutivo con IA** | Fácil integración con librerías de machine learning y NLP (LangChain, OpenAI, etc.) |
| **Telemetría desde cada local** | WebSockets integrados para streaming de datos en tiempo real |
| **Multi-idioma (ES/EN)** | Schemas de Pydantic extensibles con campos localizados |
| **Equipo pequeño de tecnología** | Productividad alta: menos código boilerplate, documentación automática (Swagger/OpenAPI) |
| **Crecimiento futuro** | Escalabilidad horizontal con Uvicorn + Gunicorn; compatible con contenedores Docker |

### Decisión técnica

FastAPI es la opción óptima porque combina:

- **Rendimiento** — Comparable con Node.js y Go gracias a Starlette y async nativo.
- **Documentación automática** — OpenAPI/Swagger generado desde los tipos Pydantic, facilitando la integración con el frontend (Next.js) y los agentes de IA.
- **Validación robusta** — Pydantic valida datos en tiempo real, crítico para una operación con dos monedas y regulaciones distintas.
- **Ecosistema maduro** — SQLAlchemy para ORM, Alembic para migraciones, pytest para testing.

---

## 3. Arquitectura en Capas

La propuesta sigue una **arquitectura hexagonal adaptada** con cuatro capas bien definidas, más una capa transversal de configuración:

```
┌─────────────────────────────────────────────────────┐
│                    API LAYER                         │
│  (Routers / Controllers — FastAPI)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ Locations│ │   Sales  │ │   Menu   │ │  ...   │  │
│  │  Router  │ │  Router  │ │  Router  │ │Routers │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬───┘  │
├───────┴──────────────┴──────────────┴──────────┴────┤
│                  SERVICE LAYER                       │
│  (Business Logic — Use Cases / Servicios)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │Location  │ │   Sales  │ │   Menu   │ │  ...   │  │
│  │ Service  │ │  Service │ │  Service │ │Services│  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬───┘  │
├───────┴──────────────┴──────────────┴──────────┴────┤
│                REPOSITORY LAYER                      │
│  (Data Access — SQLAlchemy / External APIs)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │Location  │ │   Sales  │ │   Menu   │ │  ...   │  │
│  │ Repo     │ │   Repo   │ │   Repo   │ │ Repos  │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
├─────────────────────────────────────────────────────┤
│                 DOMAIN / MODELS LAYER                │
│  (Pydantic Schemas + SQLAlchemy Entities)            │
├─────────────────────────────────────────────────────┤
│                   CORE LAYER                         │
│  (Config, Middleware, Database, Auth, Exceptions)    │
└─────────────────────────────────────────────────────┘
```

### 3.1 API Layer (Routers)

- **Responsabilidad**: Recibir peticiones HTTP, delegar en servicios, devolver respuestas.
- **Reglas**: Sin lógica de negocio. Solo orquestación, validación de entrada (Pydantic) y formateo de salida.
- **Sufijo**: `*_router.py`

### 3.2 Service Layer (Business Logic)

- **Responsabilidad**: Contener todas las reglas de negocio y casos de uso.
- **Reglas**: Independiente del framework HTTP. Puede ser reutilizado por workers, tareas programadas o scripts.
- **Sufijo**: `*_service.py`

### 3.3 Repository Layer (Data Access)

- **Responsabilidad**: Abstraer el acceso a datos (SQL, APIs externas, caché, archivos).
- **Reglas**: Cada repositorio se inyecta en los servicios mediante dependencias. Facilita testing con mocks.
- **Sufijo**: `*_repository.py`

### 3.4 Domain / Models Layer

- **Responsabilidad**: Definir los esquemas de datos con Pydantic (schemas de entrada/salida) y SQLAlchemy (modelos de base de datos).
- **Separación**: Los modelos de BD (`models/`) son distintos de los schemas de API (`schemas/`), evitando exponer detalles internos.

### 3.5 Core Layer

- **Responsabilidad**: Configuración global, conexión a base de datos, middleware (CORS, autenticación, logging), utilidades compartidas y manejo de excepciones.

---

## 4. Estructura de Carpetas y Archivos

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                          # Punto de entrada FastAPI
│   ├── dependencies.py                  # Dependencias compartidas (db session, auth)
│   ├── exceptions.py                    # Manejo global de excepciones
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                    # Configuración (Settings) con pydantic-settings
│   │   ├── database.py                  # Conexión SQLAlchemy asíncrona
│   │   ├── security.py                  # JWT, hashing, autenticación
│   │   └── middleware.py                # Middleware corporativo (logging, CORS, metrics)
│   │
│   ├── models/                          # SQLAlchemy ORM models (base de datos)
│   │   ├── __init__.py
│   │   ├── base.py                      # Modelo base con id, created_at, updated_at
│   │   ├── location.py
│   │   ├── menu.py                      # MenuItem, MenuCategory
│   │   ├── sale.py                      # SaleTransaction
│   │   ├── waste.py                     # WasteRecord
│   │   ├── supplier.py                  # Supplier, PurchaseOrder
│   │   ├── customer.py                  # Customer, LoyaltyPoints
│   │   ├── employee.py                  # Employee, Attendance
│   │   └── training.py                  # Recipe, TrainingMaterial
│   │
│   ├── schemas/                         # Pydantic schemas (API request/response)
│   │   ├── __init__.py
│   │   ├── common.py                    # Price, Country, Address (compartidos)
│   │   ├── location.py
│   │   ├── menu.py
│   │   ├── sale.py
│   │   ├── waste.py
│   │   ├── supplier.py
│   │   ├── customer.py
│   │   ├── employee.py
│   │   ├── training.py
│   │   └── executive.py
│   │
│   ├── routers/                         # FastAPI routers (API endpoints)
│   │   ├── __init__.py
│   │   ├── locations.py                 # /api/v1/locations
│   │   ├── menu.py                      # /api/v1/menu
│   │   ├── sales.py                     # /api/v1/sales
│   │   ├── waste.py                     # /api/v1/waste
│   │   ├── suppliers.py                 # /api/v1/suppliers
│   │   ├── customers.py                 # /api/v1/customers
│   │   ├── employees.py                 # /api/v1/employees
│   │   ├── training.py                  # /api/v1/training
│   │   └── executive.py                 # /api/v1/executive
│   │
│   ├── services/                        # Business logic layer
│   │   ├── __init__.py
│   │   ├── location_service.py
│   │   ├── menu_service.py
│   │   ├── sales_service.py
│   │   ├── waste_service.py
│   │   ├── supplier_service.py
│   │   ├── customer_service.py
│   │   ├── employee_service.py
│   │   ├── training_service.py
│   │   └── executive_service.py
│   │
│   ├── repositories/                    # Data access layer
│   │   ├── __init__.py
│   │   ├── base.py                      # Repositorio base CRUD genérico
│   │   ├── location_repository.py
│   │   ├── menu_repository.py
│   │   ├── sales_repository.py
│   │   ├── waste_repository.py
│   │   ├── supplier_repository.py
│   │   ├── customer_repository.py
│   │   ├── employee_repository.py
│   │   └── training_repository.py
│   │
│   └── utils/                           # Utilidades transversales
│       ├── __init__.py
│       ├── currency.py                  # Conversión USD/COP, tasas de cambio
│       ├── date_utils.py                # Fechas, zonas horarias Colombia/USA
│       └── reporting.py                 # Generación de informes PDF/CSV
│
├── alembic/                             # Migraciones de base de datos
│   ├── env.py
│   └── versions/
│
├── tests/                               # Tests
│   ├── conftest.py                      # Fixtures y config de testing
│   ├── test_routers/
│   ├── test_services/
│   └── test_repositories/
│
├── scripts/                             # Scripts de utilidad
│   ├── seed_data.py                     # Poblado de datos de prueba
│   └── generate_reports.py              # Generación programada de informes
│
├── alembic.ini
├── Dockerfile
├── docker-compose.yml                   # App + PostgreSQL + Redis
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## 5. Routers y Endpoints por Dominio

### 5.1 🏪 Locations — `/api/v1/locations`

Gestiona los 14 locales de Brasaland en Colombia y USA.

**Endpoints:**

| Método | Ruta | Descripción | Servicio asociado |
|--------|------|-------------|-------------------|
| `GET` | `/` | Listar todos los locales (filtro por país, ciudad, estado) | `LocationService.get_all()` |
| `GET` | `/{location_id}` | Obtener detalle de un local | `LocationService.get_by_id()` |
| `POST` | `/` | Crear un nuevo local | `LocationService.create()` |
| `PUT` | `/{location_id}` | Actualizar datos del local | `LocationService.update()` |
| `DELETE` | `/{location_id}` | Desactivar / eliminar local | `LocationService.deactivate()` |
| `GET` | `/{location_id}/metrics` | Métricas de rendimiento del local | `LocationService.get_metrics()` |
| `GET` | `/rankings` | Ranking de locales por rendimiento | `LocationService.get_rankings()` |

**Fundamentación:** Felipe Guerrero (Director de Operaciones) necesita visibilidad en tiempo real de los 14 locales. Cada local opera de forma aislada actualmente; este router unifica la gestión y permite filtrar por país, ciudad y estado operativo.

---

### 5.2 🍔 Menu — `/api/v1/menu`

Catálogo completo de productos de Brasaland con precios en USD y COP.

**Endpoints:**

| Método | Ruta | Descripción | Servicio asociado |
|--------|------|-------------|-------------------|
| `GET` | `/` | Listar ítems del menú (filtro por categoría, estado, país) | `MenuService.get_all()` |
| `GET` | `/{item_id}` | Obtener detalle de un ítem | `MenuService.get_by_id()` |
| `POST` | `/` | Crear un nuevo ítem en el menú | `MenuService.create()` |
| `PUT` | `/{item_id}` | Actualizar ítem (precios, disponibilidad, alérgenos) | `MenuService.update()` |
| `DELETE` | `/{item_id}` | Descontinuar ítem | `MenuService.discontinue()` |
| `GET` | `/categories` | Listar categorías del menú | `MenuService.get_categories()` |
| `GET` | `/by-location/{location_id}` | Menú disponible en un local específico | `MenuService.get_by_location()` |

**Fundamentación:** El menú es el catálogo de productos que se venden en todos los locales. Los precios varían por país (USD/COP), y algunos productos solo están disponibles en Colombia o USA. Este router permite a Operaciones y Marketing gestionar el catálogo de forma centralizada.

---

### 5.3 💰 Sales — `/api/v1/sales`

Transacciones de venta en tiempo real desde todos los locales.

**Endpoints:**

| Método | Ruta | Descripción | Servicio asociado |
|--------|------|-------------|-------------------|
| `GET` | `/` | Listar ventas (filtro por local, fecha, método de pago) | `SalesService.get_all()` |
| `GET` | `/{sale_id}` | Obtener detalle de una venta | `SalesService.get_by_id()` |
| `POST` | `/` | Registrar una nueva venta | `SalesService.create()` |
| `POST` | `/batch` | Registrar ventas en lote (desde POS) | `SalesService.create_batch()` |
| `GET` | `/daily-summary` | Resumen de ventas del día (agrupado por local) | `SalesService.get_daily_summary()` |
| `GET` | `/revenue` | Ingresos totales en USD y COP (por rango de fechas) | `SalesService.get_revenue()` |
| `GET` | `/trends` | Tendencia de ventas (semanal, mensual, anual) | `SalesService.get_trends()` |
| `GET` | `/by-product` | Ventas agrupadas por producto | `SalesService.get_by_product()` |

**Fundamentación:** Es el core del negocio. Felipe necesita saber en tiempo real cuánto se vendió hoy en cada local. Este router recibe datos desde los POS de cada local (batch), los consolida y permite consultas agregadas. Es la base de todos los dashboards operativos y ejecutivos.

---

### 5.4 🗑️ Waste — `/api/v1/waste`

Registro de desperdicio de alimentos por local.

**Endpoints:**

| Método | Ruta | Descripción | Servicio asociado |
|--------|------|-------------|-------------------|
| `GET` | `/` | Listar registros de desperdicio (filtro por local, fecha, razón) | `WasteService.get_all()` |
| `POST` | `/` | Registrar desperdicio | `WasteService.create()` |
| `GET` | `/by-location/{location_id}` | Desperdicios de un local específico | `WasteService.get_by_location()` |
| `GET` | `/costs` | Costos totales de desperdicio (USD/COP) | `WasteService.get_costs()` |
| `GET` | `/analysis` | Análisis de patrones de desperdicio | `WasteService.get_analysis()` |

**Fundamentación:** El desperdicio impacta directamente en la rentabilidad. Este router permite a Operaciones rastrear por qué se desperdicia comida (caducidad, error de cocina, devolución) y en qué locales, habilitando decisiones correctivas basadas en datos.

---

### 5.5 🛒 Suppliers — `/api/v1/suppliers`

Gestión de proveedores, precios y pedidos.

**Endpoints:**

| Método | Ruta | Descripción | Servicio asociado |
|--------|------|-------------|-------------------|
| `GET` | `/` | Listar proveedores (filtro por país, categoría) | `SupplierService.get_all()` |
| `GET` | `/{supplier_id}` | Detalle de proveedor | `SupplierService.get_by_id()` |
| `POST` | `/` | Registrar nuevo proveedor | `SupplierService.create()` |
| `PUT` | `/{supplier_id}` | Actualizar datos del proveedor | `SupplierService.update()` |
| `GET` | `/{supplier_id}/price-history` | Historial de precios del proveedor | `SupplierService.get_price_history()` |
| `POST` | `/{supplier_id}/prices` | Actualizar precios del proveedor | `SupplierService.update_prices()` |
| `GET` | `/purchase-orders` | Listar órdenes de compra | `SupplierService.get_purchase_orders()` |
| `POST` | `/purchase-orders` | Crear orden de compra | `SupplierService.create_purchase_order()` |
| `GET` | `/consolidated` | Gasto consolidado por proveedor y categoría | `SupplierService.get_consolidated_spending()` |
| `GET` | `/alerts` | Alertas de cambios de precio | `SupplierService.get_price_alerts()` |

**Fundamentación:** Lucía Fernández (Compras) negocia con ~20 proveedores sin datos consolidados. Este router le da visibilidad del gasto por proveedor en ambos países, historial de precios para negociaciones centralizadas, y alertas automáticas de cambios de precio.

---

### 5.6 👥 Customers — `/api/v1/customers`

Programa de fidelización, CRM y perfiles de cliente.

**Endpoints:**

| Método | Ruta | Descripción | Servicio asociado |
|--------|------|-------------|-------------------|
| `GET` | `/` | Listar clientes (filtro por país, fecha registro) | `CustomerService.get_all()` |
| `GET` | `/{customer_id}` | Perfil completo del cliente | `CustomerService.get_by_id()` |
| `POST` | `/` | Registrar nuevo cliente (digital o presencial) | `CustomerService.create()` |
| `PUT` | `/{customer_id}` | Actualizar perfil del cliente | `CustomerService.update()` |
| `GET` | `/{customer_id}/purchase-history` | Historial de pedidos del cliente | `CustomerService.get_purchase_history()` |
| `GET` | `/{customer_id}/preferences` | Preferencias del cliente | `CustomerService.get_preferences()` |
| `GET` | `/loyalty` | Estado del programa de fidelización | `CustomerService.get_loyalty_status()` |
| `POST` | `/loyalty/redeem` | Canjear puntos de fidelización | `CustomerService.redeem_points()` |
| `GET` | `/segmentation` | Segmentación de clientes (por frecuencia, ticket medio) | `CustomerService.get_segmentation()` |

**Fundamentación:** Camila Ospina (Marketing) necesita datos de clientes para el programa de fidelización digital. Actualmente, el 60% de los clientes no usa las tarjetas físicas de "Brasa Points" y no se genera ningún dato. Este router es la base del CRM, permitiendo personalización de ofertas y campañas segmentadas.

---

### 5.7 🧑‍🤝‍🧑 Employees — `/api/v1/employees`

Gestión de personal, nómina, turnos y onboarding.

**Endpoints:**

| Método | Ruta | Descripción | Servicio asociado |
|--------|------|-------------|-------------------|
| `GET` | `/` | Listar empleados (filtro por local, país, rol) | `EmployeeService.get_all()` |
| `GET` | `/{employee_id}` | Perfil del empleado | `EmployeeService.get_by_id()` |
| `POST` | `/` | Registrar nuevo empleado | `EmployeeService.create()` |
| `PUT` | `/{employee_id}` | Actualizar datos del empleado | `EmployeeService.update()` |
| `POST` | `/onboarding` | Iniciar proceso de onboarding | `EmployeeService.start_onboarding()` |
| `GET` | `/onboarding/{task_id}` | Estado del onboarding | `EmployeeService.get_onboarding_status()` |
| `GET` | `/attendance` | Registro de asistencia por local/fecha | `EmployeeService.get_attendance()` |
| `POST` | `/leave-requests` | Solicitar vacaciones / ausencia | `EmployeeService.request_leave()` |
| `GET` | `/kpis` | KPIs de RRHH (rotación, absentismo, cobertura) | `EmployeeService.get_kpis()` |

**Fundamentación:** Ashley Turner (Personas y Cultura) gestiona 115 personas en dos países con legislaciones laborales distintas. Este router digitaliza procesos manuales (onboarding, vacaciones) y proporciona dashboards de RRHH segmentados por país, reduciendo la carga administrativa.

---

### 5.8 🎓 Training — `/api/v1/training`

Catálogo de recetas, materiales de formación y estándares de calidad.

**Endpoints:**

| Método | Ruta | Descripción | Servicio asociado |
|--------|------|-------------|-------------------|
| `GET` | `/recipes` | Listar recetas (filtro por categoría, búsqueda textual) | `TrainingService.get_recipes()` |
| `GET` | `/recipes/{recipe_id}` | Detalle de receta (ingredientes, pasos, tiempos) | `TrainingService.get_recipe_by_id()` |
| `POST` | `/recipes` | Crear nueva receta | `TrainingService.create_recipe()` |
| `PUT` | `/recipes/{recipe_id}` | Actualizar receta | `TrainingService.update_recipe()` |
| `POST` | `/recipes/{recipe_id}/publish` | Publicar actualización a todos los locales | `TrainingService.publish_recipe_update()` |
| `GET` | `/materials` | Listar materiales de formación | `TrainingService.get_materials()` |
| `POST` | `/materials` | Subir material de formación | `TrainingService.upload_material()` |
| `GET` | `/onboarding` | Itinerarios de incorporación | `TrainingService.get_onboarding_paths()` |
| `GET` | `/search` | Búsqueda global en recetas y materiales | `TrainingService.search()` |

**Fundamentación:** Jake Morrison (Formación) necesita que una hamburguesa se prepare igual en Medellín y Miami. Este router centraliza el catálogo de recetas con búsqueda, control de versiones y publicación simultánea a los 14 locales. El soporte multi-idioma se puede añadir como campo adicional en cada receta.

---

### 5.9 📊 Executive — `/api/v1/executive`

Dashboard ejecutivo, informes y asistente de IA.

**Endpoints:**

| Método | Ruta | Descripción | Servicio asociado |
|--------|------|-------------|-------------------|
| `GET` | `/dashboard` | Dashboard unificado (ventas totales USD/COP, locales, tendencias) | `ExecutiveService.get_dashboard()` |
| `GET` | `/reports/weekly` | Informe semanal generado (última semana) | `ExecutiveService.get_weekly_report()` |
| `POST` | `/reports/generate` | Generar informe personalizado (rango de fechas, métricas) | `ExecutiveService.generate_report()` |
| `POST` | `/ai/query` | Consulta en lenguaje natural al asistente de IA | `ExecutiveService.ai_query()` |
| `GET` | `/alerts` | Alertas ejecutivas (locales sin ventas, umbrales críticos) | `ExecutiveService.get_alerts()` |
| `GET` | `/comparison` | Comparativa entre países (Colombia vs USA) | `ExecutiveService.get_country_comparison()` |

**Fundamentación:** Mariana Restrepo (CEO) toma decisiones estratégicas basadas en intuición y PDFs semanales. Este router unifica todas las métricas de la cadena en un solo endpoint, proporciona un asistente de IA para consultas en lenguaje natural y genera informes automatizados. El endpoint `/ai/query` es la puerta de entrada para integrar agentes de IA conversacional.

---

### 5.10 🔐 Auth — `/api/v1/auth`

Autenticación, autorización y gestión de usuarios del sistema.

**Endpoints:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/login` | Iniciar sesión (JWT) |
| `POST` | `/refresh` | Renovar token de acceso |
| `POST` | `/logout` | Cerrar sesión |
| `GET` | `/me` | Perfil del usuario autenticado |

**Fundamentación:** El sistema será utilizado por roles muy distintos (gerentes de local, supervisores, dirección, RRHH). Es necesario un sistema de autenticación JWT con control de acceso basado en roles (RBAC) para garantizar que cada usuario acceda solo a los datos y operaciones que le corresponden.

---

## 6. Fundamentación de Cada Dominio

### 6.1 Criterios de Diseño

Cada dominio se ha definido siguiendo tres criterios:

1. **Alineación con la estructura organizacional** — Cada dominio corresponde a un departamento real de Brasaland y a un responsable identificado en el briefing.
2. **Acoplamiento mínimo** — Los dominios se comunican a través de la capa de servicios, no directamente entre routers. Cada dominio puede evolucionar de forma independiente.
3. **Cohesión por entidad de negocio** — Cada router opera sobre una o dos entidades principales, manteniendo el alcance acotado.

### 6.2 Tabla de Correspondencia

| Dominio | Router | Departamento | Responsable | Entidades principales |
|---------|--------|-------------|-------------|----------------------|
| Locations | `locations.py` | Operaciones | Felipe Guerrero | `Location` |
| Menu | `menu.py` | Operaciones / Marketing | Felipe / Camila | `MenuItem`, `MenuCategory` |
| Sales | `sales.py` | Operaciones | Felipe Guerrero | `SaleTransaction` |
| Waste | `waste.py` | Operaciones | Felipe Guerrero | `WasteRecord` |
| Suppliers | `suppliers.py` | Compras | Lucía Fernández | `Supplier`, `PurchaseOrder` |
| Customers | `customers.py` | Marketing | Camila Ospina | `Customer`, `LoyaltyPoints` |
| Employees | `employees.py` | Personas y Cultura | Ashley Turner | `Employee`, `Attendance` |
| Training | `training.py` | Formación | Jake Morrison | `Recipe`, `TrainingMaterial` |
| Executive | `executive.py` | Dirección | Mariana Restrepo | (Agregaciones) |
| Auth | `auth.py` | Tecnología | Nicolás Park | `User`, `Role` |

### 6.3 Justificación de la Separación por Dominio

**¿Por qué no un solo router monolítico?**

Brasaland tiene 14 locales, ~20 proveedores, 115 empleados y opera en 2 países. Un API monolítica con un solo router sería inmantenible:

| Aspecto | Monolito | Separado por dominio |
|---------|----------|---------------------|
| **Mantenibilidad** | Un archivo de +2000 líneas | 10 archivos de ~100-200 líneas cada uno |
| **Responsabilidad** | Mezcla lógica de operaciones, RRHH y marketing | Cada dominio con su responsabilidad clara |
| **Evolución** | Cambiar un endpoint de ventas puede romper RRHH | Cambios encapsulados por dominio |
| **Pruebas** | Suite de tests monolítica y lenta | Tests por dominio, independientes y rápidos |
| **Escalabilidad del equipo** | Un solo developer puede tocarlo, pero genera conflictos | Varios developers trabajan en paralelo sin conflictos |

**¿Por qué esta separación específica y no otra?**

La separación refleja la **estructura orgánica real de Brasaland**. Cada router se corresponde con un departamento y un responsable directivo, lo que permite:

- **Atribución clara**: Cada responsable sabe qué endpoints le pertenecen.
- **Priorización independiente**: Si Compras necesita una funcionalidad urgente, se desarrolla sin afectar a Marketing.
- **Evolución orgánica**: A medida que Brasaland crezca (nuevos locales, nuevos departamentos), se añaden nuevos routers sin reestructurar los existentes.

---

## 7. Flujo de Datos Transversal

### 7.1 Pipeline de Datos desde los Locales

```
POS Local (Colombia) ─┐
                       ├─> API Gateway (ngrok/cloud) ─> FastAPI ─> Sales Router
POS Local (USA) ──────┘                                             │
                                                                    v
                                                              Sales Service
                                                                    │
                                                                    v
                                                              Sales Repository
                                                                    │
                                                                    v
                                                              PostgreSQL
                                                                    │
                                    ┌───────────────────────────────┘
                                    v
                              Redis (caché en tiempo real)
                                    │
                                    v
                          WebSocket ─> Dashboard en vivo
```

### 7.2 Integración con el Frontend Existente

El frontend actual (Next.js en `uis/talent-pipeline-tracker/`) se comunica con el backend FastAPI a través de llamadas HTTP REST. La documentación OpenAPI generada automáticamente por FastAPI permite generar clientes TypeScript tipados automáticamente.

### 7.3 Integración con Agentes de IA

Los agentes en `agents/` pueden consumir la API directamente:

- **Agente de consulta ejecutiva**: Llama a `POST /api/v1/executive/ai/query`
- **Agente de predicción de demanda**: Consume `GET /api/v1/sales/trends` + datos históricos de inventario
- **Agente de onboarding**: Consume `POST /api/v1/employees/onboarding`

---

## 8. Consideraciones Multi-país

### 8.1 Moneda y Precios

Todos los esquemas que involucran dinero implementan el tipo `Price` con dos campos:

```python
class Price(BaseModel):
    usd: float  # Precio en Dólares Estadounidenses
    cop: float  # Precio en Pesos Colombianos
```

El servicio `currency.py` maneja conversiones con tasa de cambio configurable y actualizable diariamente.

### 8.2 Zonas Horarias

- **Colombia**: UTC-5 (COT)
- **Florida, USA**: UTC-4/UTC-5 (ET, según horario de verano)

Todos los timestamps se almacenan en UTC y se convierten a la zona horaria del local al presentarlos.

### 8.3 Idioma

Los endpoints aceptan un header `Accept-Language: es | en` para:

- Mensajes de error localizados
- Descripciones de productos con soporte multi-idioma en el menú
- Contenido de formación (recetas, materiales)

---

## 9. Próximos Pasos

### Fase 1 — Fundación (Sprint 1-2)
1. ⚙️ Configurar el proyecto FastAPI con estructura de carpetas
2. 🗄️ Configurar base de datos PostgreSQL + Alembic
3. 🔐 Implementar autenticación JWT y RBAC
4. 🏪 Implementar `Locations` router completo (CRUD + metrics)
5. 🍔 Implementar `Menu` router completo

### Fase 2 — Core Operativo (Sprint 3-4)
1. 💰 Implementar `Sales` router con endpoints de ventas y batch desde POS
2. 🗑️ Implementar `Waste` router con análisis de patrones
3. 🛒 Implementar `Suppliers` router con historial de precios

### Fase 3 — Personas y Clientes (Sprint 5-6)
1. 👥 Implementar `Customers` router con CRM y fidelización
2. 🧑‍🤝‍🧑 Implementar `Employees` router con onboarding y RRHH
3. 🎓 Implementar `Training` router con recetas y búsqueda

### Fase 4 — Ejecutivo e IA (Sprint 7-8)
1. 📊 Implementar `Executive` router con dashboard e informes
2. 🤖 Integrar asistente de IA para consultas en lenguaje natural
3. 📬 Automatizar informe semanal (lunes 7:00 AM)
4. 🔔 Implementar sistema de alertas en tiempo real

---

## Anexo: Correspondencia con el Código TypeScript Existente

El proyecto ya cuenta con una capa de lógica implementada en TypeScript (`src/types/models.ts`, `src/utils/collections.ts`, `src/utils/search.ts`, `src/utils/transformations.ts`, `src/utils/validations.ts`). Esta propuesta de backend en FastAPI **no reemplaza** ese código, sino que lo complementa:

| TypeScript (cliente/frontend) | Python FastAPI (backend) |
|------------------------------|--------------------------|
| `models.ts` (interfaces) | `schemas/` (Pydantic) + `models/` (SQLAlchemy) |
| `collections.ts` (filtros) | `repositories/` + `services/` (consultas SQL) |
| `search.ts` (búsquedas) | `services/` (búsqueda en DB) |
| `transformations.ts` (cálculos) | `services/` (lógica de negocio) |
| `validations.ts` (validación) | Pydantic (validación automática en schemas) |

La capa TypeScript existente puede mantenerse como **validación del lado del cliente** y para operaciones offline, mientras que el backend FastAPI se convierte en la **fuente de verdad** del lado del servidor.

---

> **Documento generado para Brasaland Digital — 4Geeks Academy · AI Engineering Track**
> 
> *Este documento describe la arquitectura propuesta para el backend de Brasaland. Las decisiones aquí reflejan los requisitos operativos, la estructura organizacional y los desafíos multi-país identificados en el briefing de empresa.*