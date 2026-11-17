#!/usr/bin/env node

/**
 * optimize-images.mjs
 *
 * Descarga imágenes desde Unsplash y genera variantes WebP (y AVIF si está
 * disponible) en múltiples tamaños para servir localmente desde el mismo
 * origen, eliminando la dependencia de conexiones externas para el LCP.
 *
 * Uso:
 *   node scripts/optimize-images.mjs
 *
 * Requisitos:
 *   - sharp instalado en node_modules raíz (uso compartido con Next.js)
 *   - Conexión a internet para la descarga inicial
 */

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_IMAGES = path.join(ROOT, "uis/platform/public/images");

// Fuentes Unsplash (licencia: uso comercial permitido, modificación y
// redistribución permitidas – https://unsplash.com/license)
const SOURCES = [
  {
    id: "hero",
    url: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd",
    description: "Hamburguesa gourmet a la parrilla servida en mesa de madera",
  },
  {
    id: "contact",
    url: "https://images.unsplash.com/photo-1550317138-10000687a72b",
    description: "Corte de hamburguesas a la parrilla sobre fuego",
  },
  {
    id: "og",
    url: "https://images.unsplash.com/photo-1551782450-a2132b4ba21d",
    description: "Compartir comida en mesa (Open Graph)",
  },
];

// Tamaños responsive a generar
const SIZES = [400, 800, 1200];

// Calidad para cada formato
const QUALITY = {
  webp: 75,
  avif: 50, // Solo si sharp soporta AVIF
};

// ---------------------------------------------------------------------------
// Funciones
// ---------------------------------------------------------------------------

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function downloadImage(url) {
  const resp = await fetch(url, {
    headers: { "User-Agent": "Brasaland-Image-Optimizer/1.0" },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} descargando ${url}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

async function getSharpFormats() {
  try {
    const sharp = (await import("sharp")).default;
    return { sharp, supportsAvif: Boolean(sharp.format.avif) };
  } catch {
    throw new Error(
      "sharp no está instalado. Ejecuta: npm install sharp --save-dev"
    );
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🔧 Inicializando sharp…");
  const { sharp, supportsAvif } = await getSharpFormats();
  console.log(`   ✓ sharp disponible (AVIF: ${supportsAvif ? "sí" : "no"})`);
  console.log(`   → Directorio salida: ${PUBLIC_IMAGES}`);

  await ensureDir(PUBLIC_IMAGES);

  const formats = ["webp"];
  if (supportsAvif) formats.push("avif");

  const results = [];

  for (const source of SOURCES) {
    console.log(`\n📥 Descargando "${source.id}": ${source.url}`);
    const rawBuffer = await downloadImage(source.url);
    const metadata = await sharp(rawBuffer).metadata();
    console.log(`   Original: ${metadata.width}×${metadata.height}, ${formatBytes(rawBuffer.length)}`);

    for (const width of SIZES) {
      for (const fmt of formats) {
        const quality = QUALITY[fmt];
        const filename = `${source.id}-${width}w.${fmt}`;
        const outputPath = path.join(PUBLIC_IMAGES, filename);

        const buffer = await sharp(rawBuffer)
          .resize({ width, withoutEnlargement: true })
          .toFormat(fmt, { quality })
          .toBuffer();

        await fs.writeFile(outputPath, buffer);
        results.push({ id: source.id, width, fmt, bytes: buffer.length, path: outputPath });
        console.log(`   ✔ ${filename.padEnd(24)} ${formatBytes(buffer.length)}`);
      }
    }

    // También guardamos el original redimensionado a 800w como JPEG de
    // referencia (útil para debugging / fallback legacy).
    const fallbackPath = path.join(PUBLIC_IMAGES, `${source.id}-800w.jpg`);
    const fallbackBuffer = await sharp(rawBuffer)
      .resize({ width: 800, withoutEnlargement: true })
      .toFormat("jpeg", { quality: 80 })
      .toBuffer();
    await fs.writeFile(fallbackPath, fallbackBuffer);
    console.log(`   ✔ ${`${source.id}-800w.jpg`.padEnd(24)} ${formatBytes(fallbackBuffer.length)} (fallback JPEG)`);
  }

  // -----------------------------------------------------------------------
  // Favicon: generar PNG desde el SVG del logo para que estén disponibles
  // en el build de Docker sin depender de un paso manual.
  // -----------------------------------------------------------------------
  {
    const PUBLIC_DIR = path.join(ROOT, "uis/platform/public");
    const svgPath = path.join(PUBLIC_DIR, "favicon.svg");
    let svgExists = false;
    try { await fs.access(svgPath); svgExists = true; } catch { /* no-op */ }

    if (svgExists) {
      console.log("\n🖼️  Generando variantes de favicon desde favicon.svg…");
      const svgBuffer = await fs.readFile(svgPath);
      const faviconSizes = [
        { name: "favicon-16x16.png", size: 16 },
        { name: "favicon-32x32.png", size: 32 },
        { name: "apple-touch-icon.png", size: 180 },
      ];
      for (const { name, size } of faviconSizes) {
        const outputPath = path.join(PUBLIC_DIR, name);
        const buffer = await sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toBuffer();
        await fs.writeFile(outputPath, buffer);
        console.log(`   ✔ ${name.padEnd(24)} ${formatBytes(buffer.length)}`);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Resumen
  // -----------------------------------------------------------------------
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("📊 RESUMEN DE OPTIMIZACIÓN");
  console.log("═══════════════════════════════════════════════════════════");

  const totals = { webp: 0, avif: 0, jpeg: 0 };
  const { webp, avif, jpeg } = totals;

  for (const r of results) {
    totals[r.fmt] = (totals[r.fmt] || 0) + r.bytes;
  }

  for (const source of SOURCES) {
    const files = results.filter((r) => r.id === source.id);
    const totalSize = files.reduce((s, f) => s + f.bytes, 0);
    console.log(`\n  ${source.id}:`);
    for (const f of files) {
      console.log(`    ${f.fmt.toUpperCase().padEnd(6)} ${String(f.width).padStart(4)}w  →  ${formatBytes(f.bytes)}`);
    }
    console.log(`    ${"─".repeat(30)}`);
    console.log(`    Total   ${formatBytes(totalSize)}`);
  }

  console.log("\n  Totales por formato:");
  for (const fmt of formats) {
    const fmtTotal = results.filter((r) => r.fmt === fmt).reduce((s, f) => s + f.bytes, 0);
    console.log(`    ${fmt.toUpperCase().padEnd(6)} ${formatBytes(fmtTotal)}`);
  }
  const grandTotal = results.reduce((s, f) => s + f.bytes, 0);
  console.log(`    ${"─".repeat(30)}`);
  console.log(`    TOTAL   ${formatBytes(grandTotal)}`);
  console.log("═══════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});