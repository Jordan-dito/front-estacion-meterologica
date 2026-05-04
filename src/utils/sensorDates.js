/**
 * Parseo unificado de fechas desde Firebase/sensores.
 * Soporta timestamp Unix (segundos o ms) y cadenas tipo DD/MM/YY, DD/MM/YYYY o YYYY/MM/DD.
 */

const INVALID = { isoDate: null, dateDisplay: 'Sin fecha', sortMs: 0 };

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * @param {unknown} timestamp — número Unix o string con fecha
 * @returns {{ isoDate: string | null, dateDisplay: string, sortMs: number }}
 */
export function parseFirebaseTimestamp(timestamp) {
  if (timestamp == null || timestamp === '') {
    return { ...INVALID };
  }

  if (typeof timestamp === 'number' && timestamp > 0) {
    const ts = timestamp > 10000000000 ? timestamp / 1000 : timestamp;
    const dateObj = new Date(ts * 1000);
    if (Number.isNaN(dateObj.getTime())) return { ...INVALID };
    const isoDate = dateObj.toISOString().slice(0, 10);
    const dateDisplay =
      dateObj.toLocaleDateString('es-EC') +
      ' ' +
      dateObj.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    return { isoDate, dateDisplay, sortMs: ts * 1000 };
  }

  if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}/.test(timestamp.trim())) {
    const d = new Date(timestamp.trim());
    if (Number.isNaN(d.getTime())) return { ...INVALID };
    const isoDate = d.toISOString().slice(0, 10);
    const dateDisplay =
      d.toLocaleDateString('es-EC') +
      ' ' +
      d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    return { isoDate, dateDisplay, sortMs: d.getTime() };
  }

  if (typeof timestamp === 'string' && timestamp.includes('/')) {
    const trimmed = timestamp.trim();
    const [soloFecha, ...horaParts] = trimmed.split(/\s+/);
    const soloHora = horaParts.join(' ');
    const partes = soloFecha.split('/');
    if (partes.length !== 3) return { ...INVALID };

    const p0 = partes[0].trim();
    const p1 = partes[1].trim();
    const p2 = partes[2].trim();

    let year;
    let month;
    let day;

    if (p2.length === 4) {
      // DD/MM/YYYY (prioridad Ecuador)
      day = parseInt(p0, 10);
      month = parseInt(p1, 10);
      year = parseInt(p2, 10);
    } else if (p0.length === 4) {
      // YYYY/MM/DD
      year = parseInt(p0, 10);
      month = parseInt(p1, 10);
      day = parseInt(p2, 10);
    } else {
      // Cortos: DD/MM/YY
      day = parseInt(p0, 10);
      month = parseInt(p1, 10);
      const yShort = parseInt(p2, 10);
      year = yShort < 100 ? 2000 + yShort : yShort;
    }

    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return { ...INVALID };
    }

    const isoDate = `${year}-${pad(month)}-${pad(day)}`;
    let sortMs = new Date(`${isoDate}T00:00:00`).getTime();
    if (soloHora) {
      const sortStr = `${isoDate}T${soloHora}:00`;
      const t = new Date(sortStr).getTime();
      if (!Number.isNaN(t)) sortMs = t;
    }

    const dateDisplay = soloHora
      ? `${pad(day)}/${pad(month)}/${year} ${soloHora}`
      : `${pad(day)}/${pad(month)}/${year}`;

    return { isoDate, dateDisplay, sortMs: Number.isNaN(sortMs) ? 0 : sortMs };
  }

  return { ...INVALID };
}

/**
 * Para filtros PDF: obtiene YYYY-MM-DD desde una fila del dataset.
 */
export function fechaISOparaFiltro(row) {
  if (!row) return null;
  if (row.date && /^\d{4}-\d{2}-\d{2}/.test(String(row.date))) {
    return String(row.date).slice(0, 10);
  }
  const parsed = parseFirebaseTimestamp(row.dateDisplay);
  return parsed.isoDate;
}
