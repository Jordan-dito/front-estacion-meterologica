# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2026-03-04]

### Changed

- **ProfesoresView – Pestaña "Datos"**: Se reemplazó el filtro de fecha única (`filtroFecha`) por un filtro de rango de fechas (Inicio / Fin), reutilizando los estados `filtroInicio` / `filtroFin` ya utilizados en el Dashboard. ([PR #1](https://github.com/Jordan-dito/front-estacion-meterologica/pull/1))
  - Eliminado el estado `filtroFecha` y su lógica de coincidencia exacta (`d.date === filtroFecha`).
  - La tabla en la pestaña "Datos" ahora usa `datosFiltrados` (el `useMemo` compartido con el Dashboard), garantizando un filtrado consistente.
  - El encabezado de la tabla muestra el conteo filtrado: `N de M registros`.
  - El botón **Limpiar** reinicia ambas fechas (`filtroInicio` y `filtroFin`) y vuelve a la página 1.
  - La paginación (`totalPaginas`) se calcula sobre `datosFiltrados.length`.
  - La exportación a PDF (`ModalDescargarPDF`) recibe `datosFiltrados` en lugar de todos los `datos`.
  - Se eliminaron las variables intermedias no utilizadas `datosInvertidos` y `datosPaginados`.
