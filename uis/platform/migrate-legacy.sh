#!/bin/bash
# Script para migrar todos los módulos legacy al proyecto platform
# Elimina referencias a auth-shared y otros proyectos legacy
set -euo pipefail

ROOT="/workspaces/gastoncode-eleccion-empresa"
PLATFORM="$ROOT/uis/platform"
DASHBOARD="$ROOT/uis/backoffice/dashboard-backoffice/src"
WEBSITE="$ROOT/uis/website"
SUPPLIERS="$ROOT/uis/backoffice/suppliers-management/src"
ANALYZER="$ROOT/uis/backoffice/incidents-analyzer/src"
MANAGER="$ROOT/uis/backoffice/incidents-manager/src"
INVENTORY="$ROOT/uis/backoffice/inventory-management/src"
TALENT="$ROOT/uis/backoffice/talent-pipeline-tracker"

cd "$PLATFORM"

echo "=== 1. MIGRANDO DASHBOARD-BACKOFFICE ==="

# Dashboard pages
cp "$DASHBOARD/app/login/page.tsx" src/backoffice/login/
cp "$DASHBOARD/app/register/page.tsx" src/backoffice/register/
cp "$DASHBOARD/app/forgot-password/page.tsx" src/backoffice/forgot-password/
cp "$DASHBOARD/app/reset-password/page.tsx" src/backoffice/reset-password/
cp "$DASHBOARD/app/account/profile/page.tsx" src/backoffice/account/profile/
cp "$DASHBOARD/app/account/change-password/page.tsx" src/backoffice/account/change-password/
cp "$DASHBOARD/app/account/page.tsx" src/backoffice/account/

# Dashboard components - skip auth-context.tsx and auth-guard.tsx (re-exports)
cp "$DASHBOARD/app/components/dashboard-home.tsx" src/backoffice/components/
cp "$DASHBOARD/app/components/service-card.tsx" src/backoffice/components/
cp "$DASHBOARD/app/components/site-header.tsx" src/backoffice/components/
cp "$DASHBOARD/app/components/stat-card.tsx" src/backoffice/components/
cp "$DASHBOARD/app/components/ui/badge.tsx" src/backoffice/components/ui/
cp "$DASHBOARD/app/components/ui/card.tsx" src/backoffice/components/ui/
cp "$DASHBOARD/app/components/ui/icon-tile.tsx" src/backoffice/components/ui/
cp "$DASHBOARD/app/components/ui/section-heading.tsx" src/backoffice/components/ui/
cp "$DASHBOARD/app/catalog/services.ts" src/backoffice/catalog/

# Copy auth-api.ts and auth-form.tsx with sed transforms for imports
# auth-api.ts: imports from ../../../../auth-shared/auth-api → needs to be @/lib/auth/auth-api
# But we can just make the dashboard's auth-api.ts import from local lib
cp "$DASHBOARD/app/components/auth-api.ts" src/backoffice/components/
cp "$DASHBOARD/app/components/auth-form.tsx" src/backoffice/components/

echo "=== 2. MIGRANDO WEBSITE ==="

cp "$WEBSITE/app/page.tsx" src/website/
cp "$WEBSITE/app/application/page.tsx" src/website/application/
cp "$WEBSITE/components/application-form.tsx" src/website/components/
cp "$WEBSITE/components/benefit-card.tsx" src/website/components/
cp "$WEBSITE/components/brand-logo.tsx" src/website/components/
cp "$WEBSITE/components/form-field.tsx" src/website/components/
cp "$WEBSITE/components/site-footer.tsx" src/website/components/
cp "$WEBSITE/components/site-header.tsx" src/website/components/
cp "$WEBSITE/lib/site-metadata.ts" src/website/lib/

echo "=== 3. MIGRANDO SUPPLIERS ==="

cp "$SUPPLIERS/app/suppliers/page.tsx" src/modules/suppliers/suppliers/
cp "$SUPPLIERS/app/login/page.tsx" src/modules/suppliers/login/
cp "$SUPPLIERS/app/register/page.tsx" src/modules/suppliers/register/

# Skip auth-context.tsx, auth-guard.tsx (re-exports)
for comp in api.ts auth-api.ts category-picker.tsx country-currency-fields.tsx delete-dialog.tsx form-actions.tsx form-field.tsx form-select.tsx form-textarea.tsx rate-dialog.tsx search-bar.tsx status-badge.tsx supplier-card.tsx supplier-form.tsx supplier-list.tsx; do
  cp "$SUPPLIERS/app/components/$comp" src/modules/suppliers/components/
done

echo "=== 4. MIGRANDO INCIDENTS-ANALYZER ==="

cp "$ANALYZER/app/page.tsx" src/modules/incidents-analyzer/
cp "$ANALYZER/app/incidents/page.tsx" src/modules/incidents-analyzer/incidents/
cp "$ANALYZER/lib/incidents-api.ts" src/modules/incidents-analyzer/lib/

echo "=== 5. MIGRANDO INCIDENTS-MANAGER ==="

cp "$MANAGER/app/page.tsx" src/modules/incidents-manager/
cp "$MANAGER/app/incidents/page.tsx" src/modules/incidents-manager/incidents/
cp "$MANAGER/app/summary/page.tsx" src/modules/incidents-manager/summary/
cp "$MANAGER/app/components/incident-form.tsx" src/modules/incidents-manager/components/
cp "$MANAGER/app/components/incidents-panel.tsx" src/modules/incidents-manager/components/
cp "$MANAGER/app/components/session-menu.tsx" src/modules/incidents-manager/components/
cp "$MANAGER/app/components/summary-panel.tsx" src/modules/incidents-manager/components/
cp "$MANAGER/lib/incidents-api.ts" src/modules/incidents-manager/lib/
cp "$MANAGER/lib/incidents.ts" src/modules/incidents-manager/lib/

echo "=== 6. MIGRANDO INVENTORY ==="

cp "$INVENTORY/app/page.tsx" src/modules/inventory/
cp "$INVENTORY/app/products/page.tsx" src/modules/inventory/products/
cp "$INVENTORY/app/orders/page.tsx" src/modules/inventory/orders/
cp "$INVENTORY/app/inbound/page.tsx" src/modules/inventory/inbound/
cp "$INVENTORY/app/outbound/page.tsx" src/modules/inventory/outbound/
cp "$INVENTORY/app/components/inventory-shell.tsx" src/modules/inventory/components/
cp "$INVENTORY/app/components/session-menu.tsx" src/modules/inventory/components/
cp "$INVENTORY/app/components/product-picker.tsx" src/modules/inventory/components/
cp "$INVENTORY/app/components/location-picker.tsx" src/modules/inventory/components/
cp "$INVENTORY/app/components/feedback.tsx" src/modules/inventory/components/

echo "=== 7. MIGRANDO TALENT ==="

cp "$TALENT/app/page.tsx" src/modules/talent/
cp "$TALENT/app/error.tsx" src/modules/talent/
cp "$TALENT/app/loading.tsx" src/modules/talent/
cp "$TALENT/app/candidates/[id]/page.tsx" src/modules/talent/candidates/[id]/
cp "$TALENT/app/candidates/[id]/error.tsx" src/modules/talent/candidates/[id]/
cp "$TALENT/app/candidates/[id]/loading.tsx" src/modules/talent/candidates/[id]/
cp "$TALENT/components/talent-shell.tsx" src/modules/talent/components/
cp "$TALENT/components/session-controls.tsx" src/modules/talent/components/
cp "$TALENT/components/candidate-detail/actions-card.tsx" src/modules/talent/components/candidate-detail/
cp "$TALENT/components/candidate-detail/date-label.ts" src/modules/talent/components/candidate-detail/
cp "$TALENT/components/candidate-detail/detail-topbar.tsx" src/modules/talent/components/candidate-detail/
cp "$TALENT/components/candidate-detail/general-info.tsx" src/modules/talent/components/candidate-detail/
cp "$TALENT/components/candidate-detail/hero-card.tsx" src/modules/talent/components/candidate-detail/
cp "$TALENT/components/candidate-detail/notes-section.tsx" src/modules/talent/components/candidate-detail/
cp "$TALENT/components/candidate-detail/process-info.tsx" src/modules/talent/components/candidate-detail/
cp "$TALENT/components/candidate-detail/section-card.tsx" src/modules/talent/components/candidate-detail/
cp "$TALENT/components/candidates/candidate-card.tsx" src/modules/talent/components/candidates/
cp "$TALENT/components/candidates/candidate-grid.tsx" src/modules/talent/components/candidates/
cp "$TALENT/components/candidates/chip-class.ts" src/modules/talent/components/candidates/
cp "$TALENT/components/candidates/labels.ts" src/modules/talent/components/candidates/
cp "$TALENT/components/candidates/new-candidate-section.tsx" src/modules/talent/components/candidates/
cp "$TALENT/components/candidates/page-header.tsx" src/modules/talent/components/candidates/
cp "$TALENT/components/candidates/query-updater.ts" src/modules/talent/components/candidates/
cp "$TALENT/components/candidates/status-pill.tsx" src/modules/talent/components/candidates/
cp "$TALENT/components/candidates/top-bar.tsx" src/modules/talent/components/candidates/
cp "$TALENT/utils/api.ts" src/modules/talent/utils/
cp "$TALENT/utils/use-tracker-theme.ts" src/modules/talent/utils/
cp "$TALENT/utils/candidates/filter-bar.tsx" src/modules/talent/utils/candidates/
cp "$TALENT/utils/candidates/pagination-params.ts" src/modules/talent/utils/candidates/
cp "$TALENT/utils/candidates/pagination.tsx" src/modules/talent/utils/candidates/
cp "$TALENT/types/candidate-detail.ts" src/modules/talent/types/
cp "$TALENT/types/candidates.ts" src/modules/talent/types/

echo "=== COPIA COMPLETADA ==="
echo "Archivos copiados. Ahora hay que actualizar los imports en TODOS los archivos copiados."