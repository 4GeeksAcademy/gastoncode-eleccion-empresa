"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createInboundOrder, listProducts } from "@brasaland/inventory-api";
import type { InventoryProduct } from "@brasaland/inventory-api";
import { EmptyState, ErrorState, LoadingState } from "../components/feedback";
import { LocationPicker } from "../components/location-picker";
import { ProductPicker } from "../components/product-picker";

export default function InboundPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [productId, setProductId] = useState<number | "">("");
  const [locationId, setLocationId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const loadProducts = useCallback(async (refresh = false) => {
    if (!refresh) setLoading(true);
    setLoadError("");
    try { setProducts(await listProducts()); }
    catch (cause) {
      const loadMessage = cause instanceof Error ? cause.message : "No se pudieron cargar los productos.";
      if (refresh) setError(`Entrada registrada, pero no se pudo actualizar el catálogo: ${loadMessage}`);
      else setLoadError(loadMessage);
    }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(() => loadProducts()); }, [loadProducts]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const amount = Number(quantity);
    if (!productId || !locationId || !Number.isFinite(amount) || amount <= 0) { setError("Selecciona producto y local e indica una cantidad mayor que cero."); return; }
    if (!supplierName.trim()) { setError("Indica el nombre del proveedor."); return; }
    setSubmitting(true);
    try {
      await createInboundOrder({ ingredient_id: productId, location_id: locationId, quantity: amount, supplier_name: supplierName.trim() });
      setMessage("Entrada registrada correctamente."); setQuantity(""); setSupplierName("");
      await loadProducts(true);
    } catch (cause) {
      setMessage("");
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la entrada.");
    } finally { setSubmitting(false); }
  }

  return <main className="container">
    <header className="pageHeader"><span className="eyebrow">Movimientos</span><h1>Registrar entrada</h1><p>Registra una entrega recibida para actualizar las existencias.</p></header>
    {loading ? <LoadingState label="Cargando productos…" /> : loadError ? <ErrorState message={loadError} onRetry={() => void loadProducts()} /> : products.length === 0 ? <EmptyState title="No hay productos disponibles" message="Añade productos al catálogo antes de registrar una entrada." /> : <form className="card inventoryForm" onSubmit={handleSubmit}>
      {message && <p className="notice" role="status">{message}</p>}{error && <p className="notice noticeError" role="alert">{error}</p>}
      <ProductPicker products={products} value={productId} onChange={setProductId} />
      <LocationPicker value={locationId} onChange={setLocationId} />
      <div className="field"><label htmlFor="quantity">Cantidad recibida</label><input id="quantity" type="number" min="0.001" step="any" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /><p className="fieldHint">La unidad aplicable depende del producto seleccionado.</p></div>
      <div className="field"><label htmlFor="supplier">Proveedor y referencia de entrega</label><input id="supplier" maxLength={200} required value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Proveedor (y referencia opcional)" /><p className="fieldHint">El servicio requiere un proveedor y no admite una nota separada.</p></div>
      <div className="formActions"><button type="submit" disabled={submitting}>{submitting ? "Registrando…" : "Registrar entrada"}</button></div>
    </form>}
  </main>;
}
