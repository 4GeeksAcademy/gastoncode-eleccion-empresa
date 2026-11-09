"use client";

import { useCallback, useEffect, useState } from "react";
import { getStockStatus, LOW_STOCK_THRESHOLD, listProducts } from "@brasaland/inventory-api";
import type { InventoryProduct } from "@brasaland/inventory-api";
import { EmptyState, ErrorState, LoadingState } from "../components/feedback";

export default function ProductsPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setProducts(await listProducts()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el inventario."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  return <main className="container">
    <header className="pageHeader"><span className="eyebrow">Inventario</span><h1>Productos y existencias</h1><p>Consulta el stock actual por producto. Se marca como bajo cuando llega a {LOW_STOCK_THRESHOLD} unidades o menos.</p></header>
    {loading ? <LoadingState label="Cargando productos…" /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : products.length === 0 ? <EmptyState title="No hay productos" message="Cuando se registren productos, aparecerán aquí." /> : <section className="productGrid" aria-label="Productos">
      {products.map((product) => {
        const status = getStockStatus(product.current_stock);
        const label = status === "empty" ? "Sin stock" : status === "low" ? "Stock bajo" : "Stock suficiente";
        return <article className="card productCard" key={product.id}>
          <div className="productTitle"><h2>{product.name}</h2><span className={`stockBadge stock-${status}`}>{label}</span></div>
          <div><span className="stockValue">{product.current_stock}</span> <span className="muted">{product.unit}</span></div>
          <p className="muted">Stock mínimo de alerta: {LOW_STOCK_THRESHOLD} {product.unit}</p>
        </article>;
      })}
    </section>}
  </main>;
}
