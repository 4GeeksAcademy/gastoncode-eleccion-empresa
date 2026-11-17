📊 Informe de Auditoría de Rendimiento — Website / (Brasaland Platform)
🔍 Resumen Ejecutivo
El website (/) es una landing page estática con 3 secciones (Nosotros, Beneficios, Contacto) que usa Next.js 16 (Turbopack). El servidor responde muy rápido (TTFB ~3ms local) y el HTML es generado estáticamente. Sin embargo, hay múltiples oportunidades de optimización significativas, especialmente en JS bundles, imágenes y CSS.

🚩 Hallazgos Detallados
1. 🟥 JavaScript excesivo para una página estática — 555 KB sin comprimir (crítico)
Chunk	Tamaño	Propósito probable
3e4keds9ktjdu.js	229 KB	React runtime + Next.js framework
2gefo9ja1l2mo.js	166 KB	Next.js framework chunks
0cz1d0mv5g_q7.js	113 KB	Polyfills / compat
19mx3mg6lkumu.js	29 KB	App router
3fntmmi971322.js	14 KB	Client components bootstrap
4012f8sf_25pd.js	12 KB	SiteHeader (cliente)
310vm2bl3xxpt.js	5 KB	Script loader
Problema: La página es puramente estática (sin interactividad del lado del usuario que no sea el menú mobile y los hash links), pero envía ~555 KB de JavaScript (sin comprimir). El menú mobile es el único componente "use client".

Recomendación:

Considerar migrar a SSG puro (ya lo es en parte) pero eliminando el client component del SiteHeader usando display: none / CSS-only para el menú mobile, o moviendo el JS del menú a un dynamic() con ssr: false.
Habilitar compresión Brotli o Gzip a nivel de reverse proxy (Nginx, Caddy) — actualmente no hay compresión, los assets se sirven sin encoding.
Con compresión, los ~555 KB JS se reducirían a ~150-170 KB (estimado).
2. 🟥 CSS Bundle sobredimensionado — 68 KB (alto impacto)
El único archivo CSS (0aru9ao0wue0t.css) contiene 69 KB de CSS sin comprimir e incluye:

Todo el theme de Tailwind con todos los colores, spacing, etc.
Todos los estilos @scope de los 4 módulos del backoffice (analyzer, manager, inventory, talent) que NO se usan en el website público
Capa de @property para variables CSS personalizadas
Versiones duplicadas de colores en formato oklab y srgb
Problema: De los ~69 KB de CSS, aproximadamente 21 KB corresponden a estilos de módulos de backoffice (analyzer.css 4.3 KB, manager.css 9.9 KB, inventory.css 5.2 KB, talent.css 1.8 KB) que se cargan en la página pública pero nunca se aplican por estar scoped a [data-platform-module].

Recomendación:

Separar el CSS del backoffice del CSS del website público usando rutas de entrada separadas en Next.js o eliminando los @import de módulos backoffice de globals.css.
Optimizar generando el CSS del website como bundle independiente.
Activar compresión Brotli.
3. 🟡 Imágenes sin optimizar — ~537 KB total visitando la homepage
Imagen	Tamaño	Formato	Nota
Hero (Unsplash)	402 KB	JPEG	No usa next/image
Contacto (Unsplash)	133 KB	JPEG	No usa next/image
Logo SVG	2 KB	SVG	✓ Bien
Problemas:

Las imágenes usan <img> nativo en vez de <Image> de Next.js (deshabilitado explícitamente con eslint-disable-next-line @next/next/no-img-element).
No tienen fetchpriority="high" en la hero image que es el probable LCP.
No tienen loading="lazy" en imágenes below-the-fold (como la de contacto).
La hero image (402 KB) es el probable LCP y debería optimizarse a WebP o AVIF.
Recomendación:

Usar <Image> de Next.js donde sea práctico, o al menos cambiar al <picture> tag con soporte WebP/AVIF.
Añadir fetchpriority="high" a la hero image.
Usar tamaños más pequeños (el hero se renderiza a ~600px, no necesita 1200px width).
Con imágenes optimizadas se podría reducir de 535 KB → ~120 KB.
4. 🟡 Render-blocking CSS — 68 KB bloquean el renderizado
El CSS se carga como render-blocking mediante <link rel="stylesheet"> antes de que el body se renderice. Con 69 KB sin comprimir, esto añade latencia al First Paint y LCP.

Recomendación:

Extraer el Critical CSS (above-the-fold: header + hero section) e inlinearlo en el <head>.
Cargar el CSS restante de forma asíncrona con media="print" + onload swap o con rel="preload".
Esto mejoraría significativamente el LCP.
5. 🟡 Sin compresión de contenido (gzip/brotli) estática — ningún contenido se comprime
Ni el HTML, ni los JS chunks, ni el CSS se sirven comprimidos. Next.js standalone no aplica compresión por defectos en producción (eso lo haría un reverse proxy).

Impacto:

~650 KB de base (HTML+CSS+JS) se transfieren sin comprimir → con Brotli sería ~180-220 KB.
Las imágenes (537 KB) no se benefician de compresión de texto, pero sí de formatos modernos.
Recomendación:

Añadir un reverse proxy (Nginx, Caddy, Cloudflare) frente al puerto 3007 que aplique compresión Brotli.
También serviría para cacheo y headers de seguridad.
6. 🟢 Sin problemas de TTFB — Excelente
TTFB local de ~3ms. Cache-Control configurado correctamente con s-maxage=31536000. Esto es bueno.

7. 🟢 Meta tags y SEO básico — Correcto
Open Graph tags, structured data (JSON-LD), y skip-to-content link están presentes. No hay problemas aquí.

8. 🟢 Logo SVG inline — Bueno
El logo se sirve como SVG estático (2 KB), preload, y con dimensiones responsive. Correcto.

📋 Prioridad de Acciones Recomendadas
Prioridad	Acción	Impacto estimado
🔴 Crítica	Separar CSS de backoffice del website público	-20 KB CSS (30% del CSS)
🔴 Crítica	Migrar imágenes a <Image> o WebP con tamaños adecuados y lazy loading	-400 KB imágenes (75%)
🔴 Crítica	Habilitar compresión Brotli/Gzip (Nginx o similar)	-65% en JS/CSS/HTML
🟡 Alta	Extraer Critical CSS e inline en <head>	Mejora LCP notablemente
🟡 Alta	Añadir fetchpriority="high" a hero image	Mejora LCP
🟡 Media	Convertir menú mobile a CSS-only o lazy-load con dynamic()	-12 KB JS inicial
🟢 Baja	Considerar migrar a generación totalmente estática	Sin impacto medible ahora
🟢 Baja	Prerender páginas siguientes con Speculation Rules API	Mejora navegación a /application
📊 Budget de Rendimiento vs. Estado Actual
Recurso	Budget recomendado	Actual	Diferencia
Peso total página	< 1.5 MB	1.19 MB (sin compresión)	✓ OK (con compresión ~450 KB)
JavaScript (comprimido)	< 300 KB	555 KB (sin comprimir)	✗ Excede (~170 KB estimado comprimido)
CSS (comprimido)	< 100 KB	69 KB (sin comprimir)	✓ OK (~20 KB comprimido)
Imágenes above-fold	< 500 KB	~402 KB (solo hero)	✓ OK, pero se puede mejorar
TTFB	< 800ms	~3ms	✓ Excelente
Third-party	< 200 KB	~0 KB (solo Unsplash images)	✓ Excelente
Conclusión: La página tiene una base técnica sólida (TTFB excelente, Next.js moderno, diseño responsive, structured data), pero deja mucho rendimiento sobre la mesa por tres razones principales: 1) JS bundle inflado con runtime innecesario para una página estática, 2) CSS que incluye estilos de backoffice no utilizados, y 3) imágenes sin optimización moderna. Con las correcciones sugeridas, se podría reducir el peso de la página de ~1.19 MB a ~250-350 KB en total, mejorando el LCP de forma significativa.