// Date "di calendario" (senza ore), salvate come stringhe ISO yyyy-mm-dd.
export const DAY = 864e5

export function parse(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m) return null
  return new Date(y, m - 1, d || 1)
}

export function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Come DATA.MESE di Excel: 31/08 + 6 mesi = 28/02 (non 03/03)
export function addMonths(d, n) {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
  t.setDate(Math.min(d.getDate(), last))
  return t
}

export const endOfMonth = d => new Date(d.getFullYear(), d.getMonth() + 1, 0)

export function today(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export const daysBetween = (from, to) => Math.round((to - from) / DAY)

export const fmtDate = d => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtMonth = d => d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
export const eur = n => (Number(n) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
