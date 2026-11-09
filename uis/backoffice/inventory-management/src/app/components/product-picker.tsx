"use client";

import type { InventoryProduct } from "@brasaland/inventory-api";

export function ProductPicker({
  products,
  value,
  onChange,
  id = "product",
}: {
  products: InventoryProduct[];
  value: number | "";
  onChange: (productId: number | "") => void;
  id?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>Producto</label>
      <select id={id} value={value} required onChange={(event) => onChange(event.target.value ? Number(event.target.value) : "")}>
        <option value="">Selecciona un producto</option>
        {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.current_stock} {product.unit}</option>)}
      </select>
    </div>
  );
}
