/**
 * Parseo unificado de fechas desde Firebase/sensores.
 *
 * Problema histórico: al recibir fechas con año de 2 dígitos (p.ej. "01/01/31"),
 * interpretarlas como DD/MM/YY produce 2031, lo cual contamina rangos en UI/PDF.
 *
 * Solución: soportar varios formatos y aceptar solo años plausibles para la app.
 */

const INVALID = { isoDate: null, dateDisplay: 'Sin fecha', sortMs: 0 };

// Rango de años aceptados para los datos del sistema
const MIN_YEAR = 2015;
const MAX_YEAR_FUTURE_OFFSET = 1; // año actual + 1

function pad(n) {
  return String(n).padStart(2, '0');
}

function isPlausibleYear(year) {
  const current = new Date().getFullYear();
  return year >= MIN_YEAR && year <= current + MAX_YEAR_FUTURE_OFFSET;
}

function expandTwoDigitYear(yShort) {
  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;
  // Ventana deslizante: 00..(YY actual + offset) => 2000+, el resto => 1900+
  return yShort <= currentYY + MAX_YEAR_FUTURE_OFFSET ? 2000 + yShort : 1900 + yShort;
}

function buildFromParts({ year, month, day, hourStr }) {
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    !isPlausibleYear(year)
  ) {
    return null;
  }

  const isoDate = `${year}-${pad(month)}-${pad(day)}`;

  // Validación fuerte (evita fechas como 31/02)
  const noon = new Date(`${isoDate}T12:00:00`);
  if (
    Number.isNaN(noon.getTime()) ||
    noon.getFullYear() !== year ||
    noon.getMonth() + 1 !== month ||
    noon.getDate() !== day
  ) {
    return null;
  }

  let sortMs = noon.getTime();
  if (hourStr) {
    const t = new Date(`${isoDate}T${hourStr}:00`).getTime();
    if (!Number.isNaN(t)) sortMs = t;
  }

  const dateDisplay = hourStr
    ? `${pad(day)}/${pad(month)}/${year} ${hourStr}`
    : `${pad(day)}/${pad(month)}/${year}`;

  return { isoDate, dateDisplay, sortMs };
}

function parseSlashDate(soloFecha, soloHora) {
  const partes = soloFecha.split('/');
  if (partes.length !== 3) return null;

  const p0 = partes[0].trim();
  const p1 = partes[1].trim();
  const p2 = partes[2].trim();

  // DD/MM/YYYY
  if (p2.length === 4) {
    const day = parseInt(p0, 10);
    const month = parseInt(p1, 10);
    const year = parseInt(p2, 10);
    return buildFromParts({ year, month, day, hourStr: soloHora });
  }

  // YYYY/MM/DD
  if (p0.length === 4) {
    const year = parseInt(p0, 10);
    const month = parseInt(p1, 10);
    const day = parseInt(p2, 10);
    return buildFromParts({ year, month, day, hourStr: soloHora });
  }

  // Ambiguo con año de 2 dígitos: probar DD/MM/YY y YY/MM/DD
  const a = parseInt(p0, 10);
  const b = parseInt(p1, 10);
  const c = parseInt(p2, 10);
  if ([a, b, c].some((x) => Number.isNaN(x))) return null;

  // DD/MM/YY (Ecuador)
  {
    const day = a;
    const month = b;
    const year = c < 100 ? expandTwoDigitYear(c) : c;
    const built = buildFromParts({ year, month, day, hourStr: soloHora });
    if (built) return built;
  }

  // YY/MM/DD (sensores que envían año primero)
  {
    const year = a < 100 ? expandTwoDigitYear(a) : a;
    const month = b;
    const day = c;
    const built = buildFromParts({ year, month, day, hourStr: soloHora });
    if (built) return built;
  }

  return null;
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
    if (!isPlausibleYear(dateObj.getFullYear())) return { ...INVALID };
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
    if (!isPlausibleYear(d.getFullYear())) return { ...INVALID };
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
    const parsed = parseSlashDate(soloFecha, soloHora);
    return parsed ?? { ...INVALID };
  }

  return { ...INVALID };
}

/**
 * Para filtros PDF: obtiene YYYY-MM-DD desde una fila del dataset.
 */
export function fechaISOparaFiltro(row) {
  if (!row) return null;
  // IMPORTANTE: no usar `row.date` directo sin validar año; si no,
  // fechas ya contaminadas (p.ej. 2031-...) siguen apareciendo en el rango "Disponible".
  const fromDate = parseFirebaseTimestamp(row.date);
  if (fromDate.isoDate) return fromDate.isoDate;

  const fromDisplay = parseFirebaseTimestamp(row.dateDisplay);
  return fromDisplay.isoDate;
}

/**
 * Texto para columnas "Fecha": mantiene hora si existe (Firebase); si solo hay día (CSV),
 * muestra DD/MM/YYYY 00:00 para no perder el formato con hora que espera el cliente.
 */
export function formatDateDisplayForRow(row) {
  if (!row) return 'Sin fecha';
  const disp = row.dateDisplay;
  if (disp && /\d{1,2}:\d{2}/.test(String(disp))) {
    return String(disp);
  }
  const iso = row.date;
  if (iso && /^\d{4}-\d{2}-\d{2}/.test(String(iso))) {
    const s = String(iso).slice(0, 10);
    const [y, m, d] = s.split('-');
    if (y && m && d) {
      return `${d}/${m}/${y} 00:00`;
    }
  }
  if (disp) return String(disp);
  if (iso) return String(iso);
  return 'Sin fecha';
}
