---
name: replenishment-planner
description: Calcula cantidades sugeridas de reposición por local e insumo a partir de un CSV de inventario validado. No pronostica demanda ni realiza pedidos.
---

# Skill: Reposición de insumos

## Objetivo

Producir una cantidad sugerida de reposición para cada combinación de local e insumo usando existencias, consumo diario promedio, plazo de entrega, stock de seguridad, pedidos entrantes y tamaño de paquete. La recomendación es una ayuda para Compras y requiere aprobación humana.

## Cuándo usarla

Usar esta skill cuando el usuario proporcione un CSV con el esquema de entrada definido aquí y solicite calcular reposición. No usarla para predecir consumo, elegir proveedores, comparar precios ni enviar órdenes de compra.

## Entrada

Un archivo CSV UTF-8 con una fila por combinación única de `location_id` y `sku`, y estas columnas obligatorias:

| Columna | Validación |
| --- | --- |
| `location_id` | Texto obligatorio; se eliminan espacios externos. |
| `sku` | Texto obligatorio; se eliminan espacios externos. |
| `unit` | Texto obligatorio con la unidad común para todas las cantidades de esa fila, por ejemplo `kg` o `unidad`. |
| `stock_on_hand` | Número finito mayor o igual a cero. |
| `avg_daily_usage` | Consumo diario promedio finito mayor o igual a cero, expresado en `unit`. Lo calcula o proporciona una fuente externa; esta skill no lo estima. |
| `lead_time_days` | Días de entrega finitos y mayor o igual a cero. |
| `safety_stock_days` | Días de seguridad finitos y mayor o igual a cero. |
| `incoming_qty` | Cantidad ya pedida y aún no recibida, finita y mayor o igual a cero, en `unit`. |
| `pack_size` | Tamaño de paquete finito y mayor que cero, en `unit`. |

Se aceptan columnas adicionales, pero no se usan. Las claves se comparan después de quitar espacios externos y distinguen mayúsculas de minúsculas. Todas las cantidades de una fila deben usar la misma unidad; la skill no convierte unidades ni monedas.

## Cálculo

Para cada fila válida, usar aritmética decimal y calcular:

$$
\begin{aligned}
\text{target\_stock} &= \text{avg\_daily\_usage} \times (\text{lead\_time\_days} + \text{safety\_stock\_days}) \\
\text{inventory\_position} &= \text{stock\_on\_hand} + \text{incoming\_qty} \\
\text{unrounded\_need} &= \max(0, \text{target\_stock} - \text{inventory\_position}) \\
\text{recommended\_order\_qty} &= \begin{cases}
0 & \text{si unrounded\_need}=0 \\
\lceil \text{unrounded\_need}/\text{pack\_size} \rceil \times \text{pack\_size} & \text{en otro caso}
\end{cases}
\end{aligned}
$$

No redondear importes monetarios: esta skill no recibe ni calcula costos.

## Ejecución

Usar el script determinista incluido, no estimar las cantidades manualmente. Elegir rutas de salida que no sobrescriban archivos existentes; `--overwrite` solo puede usarse si el usuario autorizó reemplazarlos.

```bash
python3 .agents/skills/replenishment-planner/scripts/recommend_replenishment.py \
  --input ruta/inventario.csv \
  --output ruta/recomendaciones.csv \
  --errors ruta/filas-invalidas.csv
```

Para ejecutar la suite de aceptación:

```bash
python3 -m unittest discover -s .agents/skills/replenishment-planner/tests -v
```

## Salidas

- El CSV de recomendaciones contiene una fila por entrada válida: `location_id`, `sku`, `unit`, `target_stock`, `inventory_position`, `unrounded_need`, `recommended_order_qty` y `decision` (`ORDER` o `NO_ORDER`).
- El CSV de errores contiene `row_number`, los campos de entrada y `errors`, con una explicación por cada fila inválida. Todas las filas de una clave local/insumo duplicada se rechazan para evitar recomendaciones ambiguas.
- El comando informa cantidades de filas válidas e inválidas. Sale con código `0` si todas son válidas, `2` si generó resultados parciales por errores de fila y `1` si el archivo o la ejecución completa no se pueden procesar.
- Un archivo vacío, una cabecera ausente o columnas obligatorias ausentes detienen el proceso. Los destinos no se sobrescriben salvo con `--overwrite`; nunca pueden ser el mismo archivo que la entrada ni entre sí.

## Criterios de aceptación

1. El ejemplo siguiente produce exactamente las filas de recomendación esperadas y un CSV de errores con solo su cabecera.
2. Una fila con consumo `5`, plazo `3`, seguridad `2`, existencias `18`, entrada pendiente `4` y paquete `6` produce objetivo `25`, posición `22`, necesidad `3` y pedido sugerido `6`.
3. Existencias suficientes o consumo cero producen recomendación `0` y decisión `NO_ORDER`; las entradas pendientes cuentan en `inventory_position`.
4. Un tamaño de paquete positivo divide exactamente toda cantidad recomendada.
5. Valores vacíos, negativos, no numéricos o no finitos; identificadores vacíos; filas con celdas extra; y claves duplicadas se informan en el CSV de errores y no generan recomendación.
6. Columnas obligatorias ausentes y rutas de salida inseguras fallan sin modificar la entrada.
7. La ejecución solo lee el CSV indicado y escribe los dos resultados solicitados; no accede a servicios externos, no altera datos fuente y no envía órdenes de compra.

### Ejemplo de entrada

```csv
location_id,sku,unit,stock_on_hand,avg_daily_usage,lead_time_days,safety_stock_days,incoming_qty,pack_size
MDE-01,RES-01,kg,18,5,3,2,4,6
MDE-01,VEG-01,kg,50,2,2,1,10,5
MIA-01,BOX-01,unidad,2,0,1,3,0,1
```

### Salida esperada

```csv
location_id,sku,unit,target_stock,inventory_position,unrounded_need,recommended_order_qty,decision
MDE-01,RES-01,kg,25,22,3,6,ORDER
MDE-01,VEG-01,kg,6,60,0,0,NO_ORDER
MIA-01,BOX-01,unidad,0,2,0,0,NO_ORDER
```

## Límites de decisión

La recomendación depende de que el usuario proporcione consumo y existencias correctos. No garantiza disponibilidad del proveedor, vida útil, mínimos contractuales, presupuesto ni cumplimiento de políticas de compra. Presentar los resultados como propuesta para revisión, nunca como orden confirmada.