# Brasaland Digital: resumen del proyecto

## El negocio

Brasaland es una cadena de restaurantes de cocina a la brasa fundada en Medellín en 2008. El caso de negocio describe 14 restaurantes propios en Colombia y Florida, Estados Unidos, alrededor de 115 empleados y una facturación anual aproximada de 6 millones de dólares. La empresa opera con unos 20 proveedores y atiende dos mercados con monedas, idiomas y marcos laborales distintos.

Su propuesta de valor depende de ofrecer comida consistente entre locales, un servicio cálido y una operación ágil. El crecimiento desde un restaurante familiar hasta una cadena internacional amplió la complejidad de coordinar locales, personas, compras y datos sin perder esos estándares.

## Propósito del proyecto

Brasaland Digital es la iniciativa interna para modernizar las herramientas y procesos de la cadena. El proyecto busca conectar la información de sus locales y departamentos para que las operaciones puedan coordinarse con datos oportunos, reducir el trabajo manual y sostener el crecimiento en ambos países.

La solución debe servir a los equipos de operaciones, compras, personas, formación, marketing, tecnología y dirección. No es únicamente una aplicación: es un conjunto de interfaces, servicios y automatizaciones orientado a resolver necesidades concretas del negocio.

## Problemas que resuelve

- **Operación sin visibilidad común:** los locales gestionan ventas, turnos e inventario de forma aislada. La sede depende de llamadas e informes periódicos para entender qué sucede y detectar problemas.
- **Compras e inventario reactivos:** los pedidos se hacen por teléfono o WhatsApp sin datos consolidados de existencias y consumo. Esto contribuye tanto al exceso de stock como a faltantes, y dificulta comparar precios y gasto por proveedor, local y país.
- **Información fragmentada:** los sistemas de punto de venta no están integrados entre mercados y numerosos procesos dependen de hojas de cálculo, correos, documentos o registros manuales. Cuesta obtener cifras consistentes y responder preguntas del negocio a tiempo.
- **Gestión de personas con alta carga manual:** administrar horarios, ausencias, contratos y onboarding de unas 115 personas en dos marcos laborales distintos consume tiempo y hace difícil comparar indicadores entre locales.
- **Formación y calidad difíciles de mantener:** recetas y materiales están dispersos; distribuir cambios a todos los locales es lento y puede producir diferencias en la preparación y el servicio.
- **Experiencia digital y conocimiento del cliente limitados:** la web y la aplicación están desactualizadas, no hay un canal integrado de pedidos digitales y el programa de fidelización basado en tarjetas físicas genera poca información útil sobre clientes y preferencias.
- **Decisiones ejecutivas con datos tardíos:** la dirección recibe informes semanales y depende de la experiencia o de consultas manuales para conocer ventas, desempeño y diferencias entre locales.
- **Complejidad entre países:** los procesos deben contemplar Colombia y Estados Unidos, incluyendo monedas, horarios, idiomas y requisitos operativos y laborales diferentes.

## Objetivos

1. **Centralizar y hacer accesibles los datos operativos** de locales, ventas, inventario, compras, personas, clientes y proveedores, reduciendo duplicación y reconciliación manual.
2. **Mejorar el control de ventas y operaciones** con indicadores comparables por local, periodo y país, además de alertas para situaciones que requieran atención.
3. **Optimizar abastecimiento y compras** mediante visibilidad de existencias, consumo, pedidos, costos e historial de precios, con propuestas de reposición sujetas a revisión responsable.
4. **Facilitar la gestión de personas y talento** con procesos más consistentes para onboarding, seguimiento y análisis de indicadores de RR. HH.
5. **Estandarizar formación y calidad** para mantener recetas y procedimientos actualizados y disponibles para todos los locales.
6. **Preparar mejores experiencias digitales para clientes**, habilitando canales de pedido y fidelización que permitan conocer preferencias con datos útiles.
7. **Dar a la dirección información oportuna y confiable** para tomar decisiones basadas en el desempeño de toda la cadena.
8. **Diseñar para la operación multinacional**, contemplando desde el inicio los contextos de Colombia y Florida y la evolución gradual de la plataforma.

## Enfoque y estructura del repositorio

El repositorio organiza el trabajo en varias áreas, no en una única aplicación:

- `uis/backoffice/` reúne interfaces para el dashboard ejecutivo, la gestión de proveedores, el análisis de incidencias y el seguimiento de talento.
- `services/` contiene servicios de API, incluidos los dominios de autenticación, incidencias y proveedores.
- `packages/`, `src/` y `shared/` alojan tipos, utilidades y convenciones compartidas.
- `data/`, `scripts/`, `skills/`, `agents/`, `mcps/` y `workflows/` proporcionan espacio para análisis de datos, automatización y capacidades de IA.
- `docs/` y `memory-bank/` documentan la arquitectura, el contexto y el avance del proyecto.

Estos módulos reflejan las áreas de trabajo presentes en el repositorio; su existencia no implica por sí sola que todos los objetivos de negocio estén ya implementados o integrados. La evolución debe priorizar entregables verificables que reduzcan los problemas operativos de Brasaland y permitan ampliar la plataforma por etapas.

## Criterios de éxito

- La dirección puede consultar indicadores coherentes de ventas y operación por local y país sin recopilar informes manualmente.
- Los responsables de compras pueden revisar de forma consolidada proveedores, precios y necesidades de abastecimiento.
- Los equipos reducen tareas repetitivas y errores asociados a registros dispersos y procesos manuales.
- La información y los flujos esenciales se pueden usar en ambos mercados, con sus diferencias operativas explícitas.
- Los sistemas evolucionan de forma incremental y comparten datos y definiciones consistentes entre módulos.
