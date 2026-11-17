export function SiteFooter() {
  return (
    <footer id="pie-principal" className="border-t border-stone-800 bg-stone-950">
      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 text-sm text-stone-400 sm:px-6 md:grid-cols-2 md:items-end">
        <div className="space-y-1">
          <p>© 2026 Brasaland. Todos los derechos reservados.</p>
          <p>Sede principal: Medellín, Colombia | Operación USA: Miami, Florida</p>
        </div>
        <div className="space-y-1 break-words md:text-right">
          <p><span className="text-stone-300">Correo:</span> contacto@brasaland.com</p>
          <p><span className="text-stone-300">Teléfono:</span> +57 604 555 0198</p>
          <p><span className="text-stone-300">Dirección:</span> Av. El Poblado 14-32, Medellín</p>
        </div>
      </div>
    </footer>
  );
}
