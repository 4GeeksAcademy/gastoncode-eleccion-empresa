"use client";

import { useCallback, useEffect, useState } from "react";
import { listOrders } from "@brasaland/inventory-api";
import type { InventoryOrder } from "@brasaland/inventory-api";
import { EmptyState, ErrorState, LoadingState } from "../components/feedback";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<InventoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setOrders(await listOrders()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  return <main className="container">
    <header className="pageHeader"><span className="eyebrow">Auditoría</span><h1>Historial de órdenes</h1><p>Consulta las entradas y salidas registradas, su producto y la persona que las creó.</p></header>
    {loading ? <LoadingState label="Cargando órdenes…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : orders.length === 0 ? <EmptyState title="Aún no hay órdenes" message="Las entradas y salidas registradas aparecerán en este historial." /> : <div className="card tableWrap"><table><thead><tr><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Local</th><th>Creada por</th><th>ID de usuario</th><th>Fecha</th><th>Nota</th></tr></thead><tbody>
      {orders.map((order) => <tr key={`${order.type}-${order.id}`}><td><span className={`typeBadge type-${order.type}`}>{order.type === "inbound" ? "Entrada" : "Salida"}</span></td><td>{order.ingredient_name}</td><td>{order.quantity}</td><td>Local {order.location_id}</td><td>{order.user_name || "Usuario sin nombre"}</td><td>{order.user_uuid}</td><td>{formatDate(order.created_at)}</td><td>{order.supplier_name || order.reason || "—"}</td></tr>)}
    </tbody></table></div>}
  </main>;
}
