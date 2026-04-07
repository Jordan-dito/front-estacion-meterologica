import React, { useState } from 'react';
import { X, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const today = new Date().toISOString().split('T')[0];

const ModalDescargarPDF = ({ isOpen, onClose, datos }) => {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [descargando, setDescargando] = useState(false);

// ========================================================================
// ⭐ FUNCIÓN PARA NORMALIZAR FECHAS (FORMATO: YY/MM/DD HH:MM)
// ========================================================================
const normalizarFecha = (fechaStr) => {
  if (!fechaStr) return null;
  
  // Si ya está en formato YYYY-MM-DD
  if (fechaStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return fechaStr.slice(0, 10);
  }
  
  // Si está en formato YY/MM/DD o YY/MM/DD HH:MM (Firebase)
  if (fechaStr.includes('/')) {
    const soloFecha = fechaStr.split(' ')[0]; // Quitar hora
    const partes = soloFecha.split('/');
    
    if (partes.length === 3) {
      let [año, mes, dia] = partes; // ⭐ CORREGIDO: AÑO/MES/DÍA
      
      // Si el año tiene 2 dígitos, agregar "20"
      if (año.length === 2) {
        año = '20' + año;
      }
      
      dia = dia.padStart(2, '0');
      mes = mes.padStart(2, '0');
      
      return `${año}-${mes}-${dia}`;
    }
  }
  
  return null;
};

  // ========================================================================
  // ⭐ FUNCIÓN PARA FILTRAR DATOS POR RANGO DE FECHAS
  // ========================================================================
  const filtrarPorFechas = (datos, inicio, fin) => {
    if (!inicio || !fin) return datos;
    
    console.log('🔍 Filtrando desde:', inicio, 'hasta:', fin);
    
    const datosFiltrados = datos.filter((d) => {
      const fechaNormalizada = normalizarFecha(d.date);
      
      if (!fechaNormalizada) {
        return false;
      }
      
      // Comparar solo la parte de la fecha (YYYY-MM-DD)
      return fechaNormalizada >= inicio && fechaNormalizada <= fin;
    });
    
    console.log('✅ Datos filtrados:', datosFiltrados.length);
    
    return datosFiltrados;
  };

  // ========================================================================
  // FUNCIÓN PARA CARGAR EL LOGO COMO BASE64
  // ========================================================================
  const cargarLogo = async () => {
    try {
      const response = await fetch(`${process.env.PUBLIC_URL}/logo.jpg`);
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // ========================================================================
  // FUNCIÓN PARA DESCARGAR PDF
  // ========================================================================
  const descargarPDF = async (tipoDescarga) => {
    try {
      setDescargando(true);

      let datosADescargar = datos;
      let nombreArchivo = 'reporte-cultivos';

      if (tipoDescarga === 'rango') {
        if (!fechaInicio || !fechaFin) {
          alert('Por favor selecciona ambas fechas');
          setDescargando(false);
          return;
        }

        if (new Date(fechaInicio) > new Date(fechaFin)) {
          alert('La fecha inicio debe ser menor que la fecha fin');
          setDescargando(false);
          return;
        }

        datosADescargar = filtrarPorFechas(datos, fechaInicio, fechaFin);
        nombreArchivo = `reporte-cultivos-${fechaInicio}-${fechaFin}`;

        if (datosADescargar.length === 0) {
          alert(`No hay registros entre ${fechaInicio} y ${fechaFin}`);
          setDescargando(false);
          return;
        }
      } else {
        nombreArchivo = `reporte-cultivos-completo-${new Date().toISOString().slice(0, 10)}`;
      }

      // Crear documento PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // LOGO DE LA UNIVERSIDAD
      const logoData = await cargarLogo();
      if (logoData) {
        // Logo en la esquina superior izquierda: x=10, y=5, ancho=35, alto=22
        doc.addImage(logoData, 'JPEG', 10, 5, 35, 22);
      }

      // ENCABEZADO (ajustado para convivir con el logo)
      doc.setFontSize(16);
      doc.text('Reporte de Viabilidad de Cultivos', pageWidth / 2, 14, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, 21, { align: 'center' });

      // Línea separadora debajo del encabezado
      doc.setDrawColor(200, 200, 200);
      doc.line(10, 30, pageWidth - 10, 30);

      // RESUMEN
      doc.setFontSize(10);
      if (tipoDescarga === 'rango') {
        doc.text(`Período: ${fechaInicio} a ${fechaFin}`, 15, 38);
      } else {
        doc.text(`Período: Todos los registros (${datos.length} total)`, 15, 38);
      }
      doc.text(`Registros a mostrar: ${datosADescargar.length}`, 15, 45);

      // TABLA
      const columnasTabla = ['Fecha', 'Temp (°C)', 'Humedad (%)', 'Radiación', 'Precip. (mm)', 'Cultivos Viables'];

      const filasTabla = datosADescargar.map((d) => {
        const viables = [
          d.tomate === 'Sí' && 'Tomate',
          d.banana === 'Sí' && 'Banana',
          d.cacao === 'Sí' && 'Cacao',
          d.arroz === 'Sí' && 'Arroz',
          d.maiz === 'Sí' && 'Maíz',
        ].filter(Boolean).join(', ');

        return [
          d.date, // ⭐ Mantiene la fecha original con hora para mostrar en PDF
          typeof d.temperatura === 'number' ? d.temperatura.toFixed(1) : d.temperatura,
          d.humedad,
          typeof d.radiacion_solar === 'number' ? Math.round(d.radiacion_solar) : d.radiacion_solar,
          d.precipitacion,
          viables || 'Ninguno',
        ];
      });

      autoTable(doc, {
        head: [columnasTabla],
        body: filasTabla,
        startY: 52,
        margin: 10,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 144, 255],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 8,
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [240, 248, 255],
        },
        didDrawPage: (data) => {
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.getHeight();
          const pageWidth = pageSize.getWidth();

          doc.setFontSize(8);
          doc.text(
            `Página ${data.pageNumber}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
        },
      });

      // DESCARGAR
      doc.save(`${nombreArchivo}.pdf`);
      
      setTimeout(() => {
        onClose();
        setFechaInicio('');
        setFechaFin('');
      }, 1000);

    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar PDF. Verifica la consola.');
    } finally {
      setDescargando(false);
    }
  };

  if (!isOpen) return null;

  // ⭐ Calcular rango de fechas disponibles
  const fechasNormalizadas = datos
    .map(d => normalizarFecha(d.date))
    .filter(f => f !== null)
    .sort();
  
  const fechaMinima = fechasNormalizadas[0] || '';
  const fechaMaxima = fechasNormalizadas[fechasNormalizadas.length - 1] || '';

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Download className="text-blue-600" size={28} />
              Descargar PDF
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 transition"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {/* RANGO DE FECHAS */}
            <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
              <h3 className="font-semibold text-gray-800 mb-3">📅 Descargar por Rango</h3>
              
              {fechaMinima && fechaMaxima && (
                <p className="text-xs text-gray-600 mb-3 bg-white p-2 rounded">
                  📆 Disponible: <strong>{fechaMinima}</strong> a <strong>{fechaMaxima}</strong>
                </p>
              )}
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Desde:</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    min={fechaMinima}
                    max={today}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hasta:</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    min={fechaMinima}
                    max={today}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <button
                  onClick={() => descargarPDF('rango')}
                  disabled={descargando || !fechaInicio || !fechaFin}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {descargando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Descargar Rango
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-xs text-gray-500 font-semibold">O</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* DESCARGAR TODO */}
            <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold text-gray-800 mb-3">📊 Descargar Todo</h3>
              
              <p className="text-sm text-gray-600 mb-3">
                Descargar todos los <strong>{datos.length}</strong> registros
              </p>

              <button
                onClick={() => descargarPDF('todo')}
                disabled={descargando}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
              >
                {descargando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Generando...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Descargar Completo
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
};

export default ModalDescargarPDF;
