"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createOutboundOrder, getStockStatus, LOW_STOCK_THRESHOLD, listProducts } from "@brasaland/inventory-api";
import type { InventoryProduct } from "@brasaland/inventory-api";
import { EmptyState, ErrorState, LoadingState } from "../components/feedback";
import { LocationPicker } from "../components/location-picker";
import { ProductPicker } from "../components/product-picker";

export default function OutboundPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [productId, setProductId] = useState<number | "">("");
  const [locationId, setLocationId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const loadProducts = useCallback(async () => {
    setLoading(true); setLoadError("");
    try { setProducts(await listProducts()); }
    catch (cause) { setLoadError(cause instanceof Error ? cause.message : "No se pudieron cargar los productos."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(() => loadProducts()); }, [loadProducts]);
  const selectedProduct = useMemo(() => products.find((product) => product.id === productId), [products, productId]);
  const amount = Number(quantity);
  const exceedsStock = quantity !== "" && !!selectedProduct && Number.isFinite(amount) && amount > selectedProduct.current_stock;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (!productId || !locationId || !Number.isFinite(amount) || amount <= 0 || !reason) { setError("Selecciona producto, local y motivo e indica una cantidad mayor que cero."); return; }
    if (!selectedProduct) { setError("El producto seleccionado ya no está disponible. Recarga la lista."); return; }
    if (amount > selectedProduct.current_stock) { setError("La cantidad supera el stock disponible; actualiza la lista antes de continuar."); return; }
    setSubmitting(true);
    try {
      await createOutboundOrder({ ingredient_id: productId, location_id: locationId, quantity: amount, reason: reason as "consumption" | "waste" });
      setMessage("Salida registrada correctamente."); setQuantity(""); setReason(""); await loadProducts();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo registrar la salida."); }
    finally { setSubmitting(false); }
  }

  return <main className="container">
    <header className="pageHeader"><span className="eyebrow">Movimientos</span><h1>Registrar salida</h1><p>Comprueba las existencias antes de registrar un consumo o salida.</p></header>
    {loading ? <LoadingState label="Cargando productos y existencias…" /> : loadError ? <ErrorState message={loadError} onRetry={() => void loadProducts()} /> : products.length === 0 ? <EmptyState title="No hay productos disponibles" message="Añade productos al catálogo antes de registrar una salida." /> : <form className="card inventoryForm" onSubmit={handleSubmit}>
      {message && <p className="notice" role="status">{message}</p>}{error && <p className="notice noticeError" role="alert">{error}</p>}
      <ProductPicker products={products} value={productId} onChange={(value) => { setProductId(value); setError(""); }} />
      {selectedProduct && <div className={`card selectedStock stock-${getStockStatus(selectedProduct.current_stock)}`} aria-live="polite" aria-atomic="true"><strong>Stock disponible de {selectedProduct.name}</strong><div className="stockValue">{selectedProduct.current_stock} <span className="muted">{selectedProduct.unit}</span></div><span>{selectedProduct.current_stock <= 0 ? "Sin stock" : selectedProduct.current_stock <= LOW_STOCK_THRESHOLD ? "Stock bajo" : "Stock suficiente"}</span></div>}
      <LocationPicker value={locationId} onChange={setLocationId} />
      <div className="field"><label htmlFor="quantity">Cantidad a retirar</label><input id="quantity" type="number" min="0.001" step="any" max={selectedProduct?.current_stock} required value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-invalid={exceedsStock} aria-describedby={exceedsStock ? "stock-error" : undefined} /><p className="fieldHint">La unidad aplicable depende del producto seleccionado.</p>{exceedsStock && <p className="fieldError" id="stock-error">La cantidad excede el stock disponible.</p>}</div>
      <div className="field"><label htmlFor="reason">Motivo</label><select id="reason" required value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Selecciona un motivo</option><option value="consumption">Consumo</option><option value="waste">Merma / desperdicio</option></select></div>
      <div className="formActions"><button type="submit" disabled={submitting || exceedsStock}>{submitting ? "Registrando…" : "Registrar salida"}</button></div>
    </form>}
  </main>;
}
