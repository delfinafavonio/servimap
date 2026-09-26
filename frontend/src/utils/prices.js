const formatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

export function formatTradePrice(trade) {
  if (trade.modalidadPrecio === 'RANGO' && trade.precioMinimo != null && trade.precioMaximo != null) {
    return `$${formatter.format(trade.precioMinimo)} – $${formatter.format(trade.precioMaximo)} · orientativo`;
  }
  if (trade.precio != null) return `$${formatter.format(trade.precio)} · orientativo`;
  return 'Consultar precio';
}
