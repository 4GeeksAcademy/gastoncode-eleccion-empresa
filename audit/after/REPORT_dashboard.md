✅ Implementación completada — Optimizaciones de prioridad alta
Las 4 optimizaciones se han aplicado, compilado (Next.js build exitoso), desplegado en Docker y verificado con mediciones reales contra localhost:3007.

📊 Comparativa Antes vs Después
Métrica	Antes	Después	Mejora
Hero preload en /backoffice	✅ presente (127 KB innecesarios)	❌ eliminado	-127 KB
Geist_Mono en backoffice	✅ cargado (23 KB font)	❌ eliminado	-23 KB
CSS de módulos en bundle backoffice	5 CSS imports (analyzer, manager, inventory, talent, module-base)	0 — cada módulo carga su propio CSS	aislamiento total
@scope rules en CSS backoffice	4 reglas	0	CSS más ligero
data-platform-module en CSS	21 referencias	0	sin fuga de estilos
TTFB /backoffice	45 ms	12.8 ms	-71%
HTML descargado /backoffice	~30 KB	24.4 KB	-19%
JS total	585 KB	587 KB (similar, ver nota)	—
CSS total	~60 KB	54 KB	-10%
Payload total (HTML+CSS+JS)	~675 KB	666 KB	-1.3%
Nota sobre JS: El tamaño total de JS se mantiene similar porque Next.js con Turbopack no separó StatCard/ServiceCard en chunks independientes visibles en el HTML inicial — los modules se cargan bajo demanda cuando el usuario hace scroll. La principal ganancia de los dynamic imports es diferir la ejecución, no reducir el tamaño descargado inicial en esta medición. Para ver el impacto real, haría falta una medición con Lighthouse/PageSpeed Insights que mida el JS ejecutado vs descargado.

🔧 Detalle de cambios aplicados
1️⃣ Mover hero preload al layout público
Archivos: app/layout.tsx → app/(public)/layout.tsx
Impacto: El HTML de /backoffice ya no contiene referencias a hero-800w
Verificado: ✅ grep -c "hero-800w" /backoffice = 0; website = 4 (correcto)
2️⃣ Dynamic imports para ServiceCard y StatCard
Archivo: src/backoffice/components/dashboard-home.tsx
Cambio: import estático → next/dynamic con lazy loading
Impacto: Los componentes se cargan cuando se renderizan (scroll), no en el bundle inicial
3️⃣ Mover CSS de módulos a layouts específicos
Archivos:
app/(backoffice)/layout.tsx — eliminados los 5 import de CSS de módulos
Cada app/(backoffice)/(modules)/*/layout.tsx — ahora importa module-base.css + su CSS propio
Impacto: El bundle CSS de backoffice ya no contiene reglas @scope ni referencias a data-platform-module
4️⃣ Eliminar Geist Mono del layout backoffice
Archivo: app/(backoffice)/layout.tsx
Cambio: Eliminado Geist_Mono de next/font/google y su variable CSS
Impacto: -23 KB de descarga de fuente; usa fallback font-mono del sistema
Nota: El font-mono en stat-card.tsx usará la fuente mono del navegador (mayoría: Menlo, Consolas, monospace)
