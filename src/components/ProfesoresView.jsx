import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, Zap, RefreshCw, BarChart3, ChevronLeft, ChevronRight, Database, Thermometer, Droplets, CloudRain, Sun, Activity, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts';
import PredictorCultivos from './PredictorCultivos';
import ModalDescargarPDF from './Modaldescargarpdf';
// import AnalisisKMeans from './AnalisisKMeans';
import Papa from 'papaparse';
import { parseFirebaseTimestamp, formatDateDisplayForRow } from '../utils/sensorDates';

// ============================================================================
// URL DE FIREBASE
// ============================================================================
const FIREBASE_URL = "https://bdclimatico-cdb27-default-rtdb.firebaseio.com/sensores.json";

const ProfesoresView = ({ user, apiBaseUrl, onLogout }) => {
  const [activeTab, setActiveTab] = useState('datos');
  
  // ⭐ Estados para datos COMBINADOS
  const [datos, setDatos] = useState([]);
  const [datosCSV, setDatosCSV] = useState([]);
  const [datosFirebaseArray, setDatosFirebaseArray] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalDescargaOpen, setModalDescargaOpen] = useState(false);
  

  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 20;
  // Orden ascendente/descendente para la tabla de registros
  const [ordenFechaAsc, setOrdenFechaAsc] = useState(false);

  // Estado para el último registro de Firebase (tiempo real)
  const [ultimoFirebase, setUltimoFirebase] = useState(null);
  const [loadingFirebase, setLoadingFirebase] = useState(false);
  const [errorFirebase, setErrorFirebase] = useState(null);

  // ========================================================================
  // FUNCIÓN PARA CALCULAR VIABILIDAD
  // ========================================================================
  const calcularViabilidad = (temp, humedad, lluvia) => {
    return {
      tomate: (temp >= 20 && temp <= 32 && lluvia >= 1 && lluvia <= 15 && humedad >= 50 && humedad <= 85) ? 'Sí' : 'No',
      banana: (temp >= 20 && temp <= 32 && lluvia >= 2 && lluvia <= 35) ? 'Sí' : 'No',
      cacao: (temp >= 21 && temp <= 32 && lluvia < 45) ? 'Sí' : 'No',
      arroz: (temp >= 22 && temp <= 32 && lluvia >= 2 && lluvia <= 30) ? 'Sí' : 'No',
      maiz: (temp >= 20 && temp <= 32 && lluvia >= 1 && lluvia <= 20) ? 'Sí' : 'No',
    };
  };

  // ========================================================================
  // ⭐ CARGAR DATOS DE FIREBASE
  // ========================================================================
  const fetchFirebase = useCallback(async () => {
    try {
      setLoadingFirebase(true);
      setErrorFirebase(null);

      const response = await fetch(FIREBASE_URL);
      const data = await response.json();

      if (data) {
        const registros = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));

        // ⭐ Obtener ÚLTIMO registro
        const keys = Object.keys(data);
        if (keys.length > 0) {
          const lastKey = keys[keys.length - 1];
          const ultimo = data[lastKey];

          setUltimoFirebase({
            temperatura: ultimo.temperatura || 0,
            humedad: ultimo.humedad || 0,
            humedad_suelo: ultimo.humedad_suelo || 0,
            lluvia: ultimo.lluvia < 0 ? 0 : ultimo.lluvia || 0,
            uvIndex: ultimo.uvIndex || 0,
            timestamp: ultimo.timestamp || '',
            totalRegistros: keys.length
          });
        }
// ⭐ CONVERTIR Firebase al formato del CSV
const firebaseComoCSV = registros.map((r) => {
  const temp = r.temperatura || 0;
  const humedad = r.humedad || 0;
  const humedadSuelo = r.humedad_suelo || 0;
  const lluvia = r.lluvia < 0 ? 0 : r.lluvia || 0;
  const uvIndex = r.uvIndex || 0;

  const parsed = parseFirebaseTimestamp(r.timestamp);
  const fechaParaFiltro = parsed.isoDate;
  const fechaParaMostrar = parsed.dateDisplay;
  const dateSortValue = parsed.sortMs;

  const viabilidad = calcularViabilidad(temp, humedad, lluvia);

  return {
    date: fechaParaFiltro,
    dateDisplay: fechaParaMostrar,
    dateSort: dateSortValue,
    temperatura: temp,
    radiacion_solar: uvIndex,
    humedad_suelo: humedadSuelo,
    humedad: humedad,
    precipitacion: lluvia,
    tomate: viabilidad.tomate,
    banana: viabilidad.banana,
    cacao: viabilidad.cacao,
    arroz: viabilidad.arroz,
    maiz: viabilidad.maiz,
    fuente: 'firebase'
  };
});


        setDatosFirebaseArray(firebaseComoCSV);
      }
    } catch (err) {
      console.error('Error Firebase:', err);
      setErrorFirebase('Error al conectar con sensores');
    } finally {
      setLoadingFirebase(false);
    }
  }, []);

  // ========================================================================
  // CARGAR CSV
  // ========================================================================
  const fetchCSV = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/cultivos_viabilidad_FINAL.csv');
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const datosParseados = results.data.map((row) => ({
            date: row.date || '',
            dateDisplay: formatDateDisplayForRow({ date: row.date || '', dateDisplay: row.date || '' }),
            dateSort: row.date ? new Date(row.date).getTime() || 0 : 0,
            temperatura: parseFloat(row.Temperatura) || 0,
            radiacion_solar: (parseFloat(row.RadiacionsolarpromediokWm2) || 0),
            humedad_suelo: parseFloat(row.HumedadSuelo) || 0,
            humedad: parseFloat(row.Humedadrelativa) || 0,
            precipitacion: parseFloat(row.Pluviometria) || 0,
            tomate: row.Tomate || 'No',
            banana: row.Banana || 'No',
            cacao: row.Cacao || 'No',
            arroz: row.Arroz || 'No',
            maiz: row.Maiz || 'No',
            fuente: 'csv'
          }));

          setDatosCSV(datosParseados);
          setError(null);
          setPaginaActual(1);
        },
        error: (error) => {
          console.error('❌ Error parsing CSV:', error);
          setError('Error al cargar CSV');
        }
      });
    } catch (err) {
      console.error('Error cargando CSV:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

// ========================================================================
// ⭐ COMBINAR CSV + FIREBASE (misma regla que administración: sin duplicar por fecha)
// ========================================================================
useEffect(() => {
  const csvConDisplay = datosCSV.map((d) => ({
    ...d,
    dateDisplay: formatDateDisplayForRow(d),
  }));
  const fechasCSV = new Set(datosCSV.map((d) => d.date).filter(Boolean));
  const minCsvDate = Array.from(fechasCSV).sort()[0] || null;
  const firebaseNuevos = datosFirebaseArray.filter((d) => {
    if (!d.date) return false;
    if (fechasCSV.has(d.date)) return false;
    // Evitar que lecturas antiguas del sensor (p.ej. 2016) contaminen el rango/tabla
    if (minCsvDate && d.date < minCsvDate) return false;
    return true;
  });
  const combinados = [...csvConDisplay, ...firebaseNuevos];
  combinados.sort((a, b) => (a.dateSort || 0) - (b.dateSort || 0));
  setDatos(combinados);
}, [datosCSV, datosFirebaseArray]);

  // ========================================================================
  // EFECTOS
  // ========================================================================
  useEffect(() => {
    fetchCSV();
    fetchFirebase();

    const intervalFirebase = setInterval(fetchFirebase, 30000);
    return () => clearInterval(intervalFirebase);
  }, [fetchCSV, fetchFirebase]);
const normalizarDatosFirebase = (firebaseData) => {
  if (!firebaseData || typeof firebaseData !== "object") return [];

  return Object.values(firebaseData).map(d => ({
    temperatura: typeof d.temperatura === "number" ? d.temperatura : null,
    humedad: typeof d.humedad === "number" ? d.humedad : null,
    uvIndex: typeof d.uvIndex === "number" ? d.uvIndex : null,
    lluvia: typeof d.lluvia === "number" ? d.lluvia : null,
    date: d.timestamp ? d.timestamp.split(" ")[0] : null
  }));
};
const calcularEstadisticas = () => {
  if (!Array.isArray(datos) || datos.length === 0) return null;

  // 🔥 FECHA YYYY-MM-DD
  const fechas = datos
    .map(d => d.date?.split(" ")[0])
    .filter(Boolean)
    .sort();

  const ultimaFecha = fechas.at(-1);
  if (!ultimaFecha) return null;

  const datosUltimoDia = datos.filter(d =>
    d.date?.startsWith(ultimaFecha)
  );

  const promedio = arr =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const numeros = arr =>
    arr.filter(v => typeof v === "number" && !isNaN(v));

  const temperaturas = numeros(datosUltimoDia.map(d => d.temperatura));
  const humedades = numeros(datosUltimoDia.map(d => d.humedad));
  const radiaciones = numeros(datosUltimoDia.map(d => d.radiacion_solar));
  const lluvias = numeros(datosUltimoDia.map(d => d.precipitacion));

  const lluviaMin = lluvias.length ? Math.min(...lluvias) : 0;
  const lluviaMax = lluvias.length ? Math.max(...lluvias) : 0;
  const precipitacionTotal =
    lluvias.length > 1 ? lluviaMax - lluviaMin : 0;

  return {
    fecha: ultimaFecha,
    totalRegistros: datosUltimoDia.length,

    tempMax: Math.max(...temperaturas).toFixed(1),
    tempMin: Math.min(...temperaturas).toFixed(1),
    tempPromedio: promedio(temperaturas).toFixed(1),

    humedadMax: Math.max(...humedades).toFixed(1),
    humedadMin: Math.min(...humedades).toFixed(1),
    humedadPromedio: promedio(humedades).toFixed(1),

    radiacionMax: Math.max(...radiaciones).toFixed(1),
    radiacionMin: Math.min(...radiaciones).toFixed(1),
    radiacionPromedio: promedio(radiaciones).toFixed(1),

    precipitacionTotal: precipitacionTotal.toFixed(3),
    precipitacionMin: lluviaMin.toFixed(3),
    precipitacionMax: lluviaMax.toFixed(3),
  };
};



const stats = useMemo(() => calcularEstadisticas(datos), [datos]);



  const COLORS = ['#ef4444', '#f59e0b', '#8B4513', '#22c55e', '#eab308'];
  const COLORES_CULTIVOS_ADMIN = { tomate: '#ef4444', banana: '#f59e0b', cacao: '#8B4513', arroz: '#22c55e', maiz: '#eab308' };
  const COLORES_CLIMA_ADMIN = ['#f59e0b', '#22c55e', '#3b82f6'];

  // ========================================================================
  // ⭐ FILTRO DE FECHAS PARA DASHBOARD
  // ========================================================================
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFin, setFiltroFin] = useState('');

  // Filtrar datos por rango de fechas
  const datosFiltrados = useMemo(() => {
    if (!filtroInicio && !filtroFin) return datos;
    return datos.filter(d => {
      if (!d.date) return false;
      if (filtroInicio && d.date < filtroInicio) return false;
      if (filtroFin && d.date > filtroFin) return false;
      return true;
    });
  }, [datos, filtroInicio, filtroFin]);

  // ========================================================================
  // ⭐ DATOS PARA DASHBOARD RESUMEN
  // ========================================================================
  const datosDashboardResumen = useMemo(() => {
    if (datosFiltrados.length === 0) return null;

    const totalDias = datosFiltrados.length;

    const cultivosViables = {
      tomate: datosFiltrados.filter((d) => d.tomate === 'Sí').length,
      banana: datosFiltrados.filter((d) => d.banana === 'Sí').length,
      cacao: datosFiltrados.filter((d) => d.cacao === 'Sí').length,
      arroz: datosFiltrados.filter((d) => d.arroz === 'Sí').length,
      maiz: datosFiltrados.filter((d) => d.maiz === 'Sí').length,
    };

    const viabilidadCultivos = {
      tomate: { dias: cultivosViables.tomate, porcentaje: ((cultivosViables.tomate / totalDias) * 100).toFixed(1) },
      banana: { dias: cultivosViables.banana, porcentaje: ((cultivosViables.banana / totalDias) * 100).toFixed(1) },
      cacao: { dias: cultivosViables.cacao, porcentaje: ((cultivosViables.cacao / totalDias) * 100).toFixed(1) },
      arroz: { dias: cultivosViables.arroz, porcentaje: ((cultivosViables.arroz / totalDias) * 100).toFixed(1) },
      maiz: { dias: cultivosViables.maiz, porcentaje: ((cultivosViables.maiz / totalDias) * 100).toFixed(1) },
    };

    const fechasOrd = datosFiltrados.map((d) => d.date).filter(Boolean).sort();
    const periodoDataset =
      fechasOrd.length > 0 ? `${fechasOrd[0]} → ${fechasOrd[fechasOrd.length - 1]}` : '';
    const años = [
      ...new Set(
        datosFiltrados
          .map((d) => (d.date ? new Date(d.date + 'T12:00:00').getFullYear() : null))
          .filter((y) => y != null && !Number.isNaN(y))
      ),
    ].sort((a, b) => a - b);
    let etiquetaAñosEnTendencia = '';
    if (años.length === 1) etiquetaAñosEnTendencia = ` (${años[0]})`;
    else if (años.length > 1) etiquetaAñosEnTendencia = ` (${años[0]}–${años[años.length - 1]})`;

    const datosViabilidadPie = [
      { name: 'Tomate', value: parseFloat(viabilidadCultivos.tomate.porcentaje), color: '#ef4444' },
      { name: 'Banana', value: parseFloat(viabilidadCultivos.banana.porcentaje), color: '#f59e0b' },
      { name: 'Cacao', value: parseFloat(viabilidadCultivos.cacao.porcentaje), color: '#8B4513' },
      { name: 'Arroz', value: parseFloat(viabilidadCultivos.arroz.porcentaje), color: '#22c55e' },
      { name: 'Maíz', value: parseFloat(viabilidadCultivos.maiz.porcentaje), color: '#eab308' },
    ];

    const datosBarra = [
      { cultivo: 'Tomate', dias: cultivosViables.tomate, color: '#ef4444' },
      { cultivo: 'Banana', dias: cultivosViables.banana, color: '#f59e0b' },
      { cultivo: 'Cacao', dias: cultivosViables.cacao, color: '#8B4513' },
      { cultivo: 'Arroz', dias: cultivosViables.arroz, color: '#22c55e' },
      { cultivo: 'Maíz', dias: cultivosViables.maiz, color: '#eab308' },
    ];

    let condicionesSecas = 0;
    let condicionesModeradas = 0;
    let excesoLluvias = 0;

    datosFiltrados.forEach(d => {
      if (d.precipitacion < 5) condicionesSecas++;
      else if (d.precipitacion >= 5 && d.precipitacion <= 20) condicionesModeradas++;
      else excesoLluvias++;
    });

    const datosPerfilClimatico = [
      { name: 'Condiciones Secas', value: condicionesSecas, porcentaje: ((condicionesSecas / totalDias) * 100).toFixed(1), color: '#f59e0b' },
      { name: 'Condiciones Moderadas', value: condicionesModeradas, porcentaje: ((condicionesModeradas / totalDias) * 100).toFixed(1), color: '#22c55e' },
      { name: 'Exceso de Lluvias', value: excesoLluvias, porcentaje: ((excesoLluvias / totalDias) * 100).toFixed(1), color: '#3b82f6' },
    ];

    const datosPorMes = {};
    datosFiltrados.forEach(d => {
      const fecha = new Date(d.date);
      const mes = fecha.getMonth();
      if (!datosPorMes[mes]) {
        datosPorMes[mes] = { total: 0, tomate: 0, banana: 0, cacao: 0, arroz: 0, maiz: 0 };
      }
      datosPorMes[mes].total++;
      if (d.tomate === 'Sí') datosPorMes[mes].tomate++;
      if (d.banana === 'Sí') datosPorMes[mes].banana++;
      if (d.cacao === 'Sí') datosPorMes[mes].cacao++;
      if (d.arroz === 'Sí') datosPorMes[mes].arroz++;
      if (d.maiz === 'Sí') datosPorMes[mes].maiz++;
    });

    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const tendenciaMensual = Object.entries(datosPorMes).map(([mes, data]) => ({
      mes: nombresMeses[parseInt(mes)],
      mesNum: parseInt(mes),
      tomate: data.total > 0 ? ((data.tomate / data.total) * 100).toFixed(1) : 0,
      banana: data.total > 0 ? ((data.banana / data.total) * 100).toFixed(1) : 0,
      cacao: data.total > 0 ? ((data.cacao / data.total) * 100).toFixed(1) : 0,
      arroz: data.total > 0 ? ((data.arroz / data.total) * 100).toFixed(1) : 0,
      maiz: data.total > 0 ? ((data.maiz / data.total) * 100).toFixed(1) : 0,
    })).sort((a, b) => a.mesNum - b.mesNum);

    const mejorMesPorCultivo = {};
    ['tomate', 'banana', 'cacao', 'arroz', 'maiz'].forEach(cultivo => {
      let mejorMes = tendenciaMensual[0];
      tendenciaMensual.forEach(m => {
        if (parseFloat(m[cultivo]) > parseFloat(mejorMes[cultivo])) {
          mejorMes = m;
        }
      });
      mejorMesPorCultivo[cultivo] = mejorMes?.mes || 'N/A';
    });

    return {
      totalDias,
      viabilidadCultivos,
      datosViabilidadPie,
      datosBarra,
      datosPerfilClimatico,
      tendenciaMensual,
      mejorMesPorCultivo,
      periodoDataset,
      etiquetaAñosEnTendencia,
    };
  }, [datosFiltrados]);

  // ========================================================================
  // PAGINACIÓN
  // ========================================================================
  const totalPaginas = Math.ceil(datosFiltrados.length / registrosPorPagina);

  const irPaginaAnterior = () => {
    if (paginaActual > 1) setPaginaActual(paginaActual - 1);
  };

  const irPaginaSiguiente = () => {
    if (paginaActual < totalPaginas) setPaginaActual(paginaActual + 1);
  };

  // ========================================================================
  // COLORES
  // ========================================================================
  const COLORES_CULTIVOS = {
    tomate: '#ef4444',
    banana: '#f59e0b', 
    cacao: '#8B4513',
    arroz: '#22c55e',
    maiz: '#eab308'
  };

  const COLORES_CLIMA = ['#f59e0b', '#22c55e', '#3b82f6'];

  // ========================================================================
  // RENDER
  // ========================================================================
  if (loading && datos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="text-gray-600 mt-4">Cargando datos...</p>
      </div>
    );
  }

  if (error && datos.length === 0) {
    return (
      <div className="bg-red-100 border-2 border-red-400 text-red-700 px-6 py-4 rounded-xl">
        {error}
        <button onClick={fetchCSV} className="ml-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
          Reintentar
        </button>
      </div>
    );
  }


  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
          <h2 className="text-2xl font-bold text-gray-800">👨‍🏫 Panel Avanzado de Profesor</h2>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={fetchFirebase}
              disabled={loadingFirebase}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <Database size={18} className={loadingFirebase ? 'animate-pulse' : ''} />
              {loadingFirebase ? 'Cargando...' : 'Firebase'}
            </button>
            <button
              onClick={() => { fetchCSV(); fetchFirebase(); }}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refrescar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className={`flex items-center gap-1 ${ultimoFirebase ? 'text-green-600' : 'text-gray-400'}`}>
            <span className={`w-2 h-2 rounded-full ${ultimoFirebase ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            {ultimoFirebase ? '🔴 EN VIVO' : 'Sin conexión'}
          </span>
          <span className="text-gray-500">📁 {datosCSV.length} CSV</span>
          <span className="text-gray-500">🔥 {datosFirebaseArray.length} Firebase</span>
          <span className="text-purple-600 font-bold">📊 {datos.length} TOTAL</span>
        </div>
      </div>

      {/* FIREBASE TIEMPO REAL */}
      {ultimoFirebase && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Database size={24} />
            🔥 Sensores en Tiempo Real
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
              <Thermometer size={20} />
              <p className="text-3xl font-bold mt-2">{ultimoFirebase.temperatura}°C</p>
              <span className="text-sm">Temperatura</span>
            </div>
            <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
              <Droplets size={20} />
              <p className="text-3xl font-bold mt-2">{ultimoFirebase.humedad}%</p>
              <span className="text-sm">Humedad</span>
            </div>
            <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
              <Activity size={20} />
              <p className="text-3xl font-bold mt-2">{ultimoFirebase.humedad_suelo}%</p>
              <span className="text-sm">Hum. Suelo</span>
            </div>
            <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
              <CloudRain size={20} />
              <p className="text-3xl font-bold mt-2">{ultimoFirebase.lluvia} mm</p>
              <span className="text-sm">Lluvia</span>
            </div>
            <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
              <Sun size={20} />
              <p className="text-3xl font-bold mt-2">{ultimoFirebase.uvIndex}</p>
              <span className="text-sm">UV</span>
            </div>
          </div>
        </div>
      )}

      {/* ESTADÍSTICAS */}
      {stats && (
        <div className="grid md:grid-cols-3 gap-6">

          <div className="bg-red-100 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-red-600 mb-4">🌡️ Temperatura</h3>
            <p className="text-4xl font-bold text-red-600 mb-4">{stats.tempPromedio}°C</p>
            <p className="text-xs text-gray-500 mb-2">Promedio diario</p>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Máx. diaria:</span>
                <span className="font-semibold text-red-600">{stats.tempMax}°C</span>
              </div>
              <div className="flex justify-between">
                <span>Mín. diaria:</span>
                <span className="font-semibold text-blue-600">{stats.tempMin}°C</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-100 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-purple-600 mb-4">💧 Humedad</h3>
            <p className="text-4xl font-bold text-purple-600 mb-4">{stats.humedadPromedio}%</p>
            <p className="text-xs text-gray-500 mb-2">Promedio diario</p>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Máx. diaria:</span>
                <span className="font-semibold text-purple-600">{stats.humedadMax}%</span>
              </div>
              <div className="flex justify-between">
                <span>Mín. diaria:</span>
                <span className="font-semibold text-blue-600">{stats.humedadMin}%</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-100 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-yellow-600 mb-4">☀️ Radiación</h3>
            <p className="text-4xl font-bold text-yellow-600 mb-4">{stats.radiacionPromedio}</p>
            <p className="text-xs text-gray-500 mb-2">Promedio diario</p>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Máx. diaria:</span>
                <span className="font-semibold text-yellow-600">{stats.radiacionMax}</span>
              </div>
              <div className="flex justify-between">
                <span>Mín. diaria:</span>
                <span className="font-semibold text-blue-600">{stats.radiacionMin}</span>
              </div>
            </div>
          </div>

          <div className="bg-cyan-100 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-cyan-600 mb-4">🌧️ Precipitación</h3>
            <p className="text-4xl font-bold text-cyan-600 mb-4">{stats.precipitacionTotal} mm</p>
            <p className="text-xs text-gray-500 mb-2">Total acumulado</p>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Máx. diaria:</span>
                <span className="font-semibold text-cyan-600">{stats.precipitacionMax} mm</span>
              </div>
              <div className="flex justify-between">
                <span>Mín. diaria:</span>
                <span className="font-semibold text-blue-600">{stats.precipitacionMin} mm</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TABS */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex gap-2 border-b overflow-x-auto">
          {['datos', 'graficos', 'predictor'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 font-semibold transition whitespace-nowrap ${
                activeTab === tab
                  ? 'text-blue-600 border-b-4 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab === 'datos' && '📋 Datos'}
              {tab === 'graficos' && '📊 Gráficos'}
              {tab === 'predictor' && '🌾 Predictor'}
            </button>
          ))}
        </div>
      </div>


      {/* TAB: DATOS */}
      {activeTab === 'datos' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
            <h3 className="text-lg font-semibold text-gray-800">📋 Registros ({datosFiltrados.length} de {datos.length})</h3>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 shadow-sm">
                <label className="text-gray-700 font-medium text-sm">Inicio:</label>
                <input
                  type="date"
                  max={today}
                  className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                  value={filtroInicio}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => { setFiltroInicio(e.target.value); setPaginaActual(1); }}
                />
                <label className="text-gray-700 font-medium text-sm">Fin:</label>
                <input
                  type="date"
                  max={today}
                  className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                  value={filtroFin}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => { setFiltroFin(e.target.value); setPaginaActual(1); }}
                />
                <button
                  onClick={() => { setFiltroInicio(''); setFiltroFin(''); setPaginaActual(1); }}
                  className="ml-2 px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs transition"
                  disabled={!filtroInicio && !filtroFin}
                >Limpiar</button>
              </div>
              <button
                onClick={() => setModalDescargaOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg"
              >
                📥 Descargar PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Temp</th>
                  <th className="px-4 py-3 text-left">Humedad</th>
                  <th className="px-4 py-3 text-left">Radiación</th>
                  <th className="px-4 py-3 text-left">Precip.</th>
                  <th className="px-4 py-3 text-left">Viables</th>
                  <th className="px-4 py-3 text-left">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {/* Botón de orden asc/desc */}
                <tr>
                  <td colSpan="7" className="pb-2">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setOrdenFechaAsc(v => !v)}
                        className="flex items-center gap-1 px-3 py-1 rounded bg-gray-100 hover:bg-blue-100 text-gray-700 text-xs font-semibold border border-gray-200 shadow-sm transition"
                        title={ordenFechaAsc ? 'Orden descendente' : 'Orden ascendente'}
                      >
                        Ordenar por fecha
                        <span className="ml-1">
                          {ordenFechaAsc ? '▲' : '▼'}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
                {datosFiltrados
                  .slice()
                  .sort((a, b) => {
                    const dateA = a.dateSort || 0;
                    const dateB = b.dateSort || 0;
                    return ordenFechaAsc ? dateA - dateB : dateB - dateA;
                  })
                  .slice((paginaActual - 1) * registrosPorPagina, paginaActual * registrosPorPagina)
                  .map((d, idx) => {
                    const viables = [
                      d.tomate === 'Sí' && '🍅',
                      d.banana === 'Sí' && '🍌',
                      d.cacao === 'Sí' && '🌰',
                      d.arroz === 'Sí' && '🌾',
                      d.maiz === 'Sí' && '🌽',
                    ].filter(Boolean).join(' ');
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{formatDateDisplayForRow(d)}</td>
                        <td className="px-4 py-3 text-red-600 font-semibold">{d.temperatura}°C</td>
                        <td className="px-4 py-3 text-blue-600">{d.humedad}%</td>
                        <td className="px-4 py-3 text-yellow-600">{typeof d.radiacion_solar === 'number' ? d.radiacion_solar.toFixed(1) : d.radiacion_solar} kW/m²</td>
                        <td className="px-4 py-3 text-cyan-600">{d.precipitacion} mm</td>
                        <td className="px-4 py-3 text-lg">{viables || '❌'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${d.fuente === 'firebase' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                            {d.fuente === 'firebase' ? '🔥' : '📁'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6">
            <button onClick={irPaginaAnterior} disabled={paginaActual === 1}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <ChevronLeft size={18} /> Anterior
            </button>
            <span className="text-gray-600">Página {paginaActual} de {totalPaginas}</span>
            <button onClick={irPaginaSiguiente} disabled={paginaActual === totalPaginas}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              Siguiente <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* TAB: GRÁFICOS */}
      {activeTab === 'graficos' && datosDashboardResumen && (
        <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #bae6fd 0%, #a5f3fc 50%, #cffafe 100%)' }}>
          <div className="p-6 space-y-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-sky-600 mb-1">Panel de Análisis</p>
                <h2 className="text-3xl font-extrabold text-slate-800">Viabilidad de Cultivos</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {filtroInicio || filtroFin
                    ? `Período filtrado: ${filtroInicio || '—'} → ${filtroFin || '—'}`
                    : `${datosFiltrados.length.toLocaleString()} registros analizados`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white/70 rounded-xl px-4 py-2.5 border border-sky-200">
                  <label className="text-sky-600 text-xs font-semibold uppercase tracking-wide">Desde</label>
                  <input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)}
                    max={today} className="bg-transparent text-slate-700 text-sm focus:outline-none" style={{ colorScheme: 'light' }} />
                </div>
                <div className="flex items-center gap-2 bg-white/70 rounded-xl px-4 py-2.5 border border-sky-200">
                  <label className="text-sky-600 text-xs font-semibold uppercase tracking-wide">Hasta</label>
                  <input type="date" value={filtroFin} onChange={e => setFiltroFin(e.target.value)}
                    max={today} className="bg-transparent text-slate-700 text-sm focus:outline-none" style={{ colorScheme: 'light' }} />
                </div>
                {(filtroInicio || filtroFin) && (
                  <button onClick={() => { setFiltroInicio(''); setFiltroFin(''); }}
                    className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-600 text-sm font-semibold px-4 py-2.5 rounded-xl transition border border-red-500/30">
                    <X size={14} /> Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* KPI PILLS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { c: 'tomate', emoji: '🍅', label: 'Tomate' },
                { c: 'banana', emoji: '🍌', label: 'Banana' },
                { c: 'cacao',  emoji: '🌰', label: 'Cacao'  },
                { c: 'arroz',  emoji: '🌾', label: 'Arroz'  },
                { c: 'maiz',   emoji: '🌽', label: 'Maíz'   },
              ].map(({ c, emoji, label }) => (
                <div key={c} className="rounded-2xl p-4 border border-sky-200 text-center"
                  style={{ background: 'rgba(255,255,255,0.7)' }}>
                  <p className="text-2xl mb-1">{emoji}</p>
                  <p className="text-2xl font-extrabold text-slate-800">{datosDashboardResumen.viabilidadCultivos[c].porcentaje}%</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: COLORES_CULTIVOS_ADMIN[c] }}>{label}</p>
                </div>
              ))}
            </div>

            {/* FILA 1: 3 GRÁFICAS */}
            <div className="grid md:grid-cols-3 gap-5">

              {/* DONUT: Viabilidad */}
              <div className="rounded-2xl overflow-hidden border border-sky-200" style={{ background: 'rgba(255,255,255,0.75)' }}>
                <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#818cf8' }}>Viabilidad</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Porcentaje por Cultivo</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Promedio general del período</p>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={270}>
                    <PieChart>
                      <Pie data={datosDashboardResumen.datosViabilidadPie} cx="50%" cy="50%"
                        innerRadius={62} outerRadius={98} paddingAngle={4} dataKey="value">
                        {datosDashboardResumen.datosViabilidadPie.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v}%`, n]}
                        contentStyle={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: '12px', color: '#1e293b', fontSize: '13px' }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#475569' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* BAR: Días viables */}
              <div className="rounded-2xl overflow-hidden border border-sky-200" style={{ background: 'rgba(255,255,255,0.75)' }}>
                <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34d399' }}>Producción</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Total de Datos Viables</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Registros favorables por cultivo</p>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={270}>
                    <BarChart data={datosDashboardResumen.datosBarra} barCategoryGap="28%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.15)" vertical={false} />
                      <XAxis dataKey="cultivo" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => [`${v.toLocaleString()} días`, 'Viables']}
                        contentStyle={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: '12px', color: '#1e293b', fontSize: '13px' }}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Bar dataKey="dias" radius={[8, 8, 0, 0]}>
                        {datosDashboardResumen.datosBarra.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* DONUT: Perfil climático */}
              <div className="rounded-2xl overflow-hidden border border-sky-200" style={{ background: 'rgba(255,255,255,0.75)' }}>
                <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fbbf24' }}>Clima</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Perfil Climático</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Distribución de condiciones</p>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={270}>
                    <PieChart>
                      <Pie data={datosDashboardResumen.datosPerfilClimatico} cx="50%" cy="50%"
                        innerRadius={62} outerRadius={98} paddingAngle={4} dataKey="value">
                        {datosDashboardResumen.datosPerfilClimatico.map((entry, i) => (
                          <Cell key={i} fill={COLORES_CLIMA_ADMIN[i]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n, p) => [`${v} días (${p.payload.porcentaje}%)`, p.payload.name]}
                        contentStyle={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: '12px', color: '#1e293b', fontSize: '13px' }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#475569' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* FILA 2: LÍNEA + RANKING */}
            <div className="grid md:grid-cols-2 gap-5">

              {/* LINE CHART */}
              <div className="rounded-2xl overflow-hidden border border-sky-200" style={{ background: 'rgba(255,255,255,0.75)' }}>
                <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#c084fc' }}>Tendencia</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Tendencia mensual de viabilidad (%){datosDashboardResumen.etiquetaAñosEnTendencia || ''}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {datosDashboardResumen.periodoDataset
                      ? `Periodo: ${datosDashboardResumen.periodoDataset}`
                      : 'Evolución porcentual por mes'}
                  </p>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={datosDashboardResumen.tendenciaMensual}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,165,233,0.15)" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip formatter={(v) => [`${v}%`]}
                        contentStyle={{ background: '#fff', border: '1px solid #bae6fd', borderRadius: '12px', color: '#1e293b', fontSize: '13px' }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#475569' }} />
                      <Line type="monotone" dataKey="tomate" stroke="#ef4444" name="Tomate" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="banana" stroke="#f59e0b" name="Banana" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="cacao"  stroke="#a78bfa" name="Cacao"  strokeWidth={2.5} dot={{ r: 3, fill: '#a78bfa' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="arroz"  stroke="#34d399" name="Arroz"  strokeWidth={2.5} dot={{ r: 3, fill: '#34d399' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      <Line type="monotone" dataKey="maiz"   stroke="#fde047" name="Maíz"   strokeWidth={2.5} dot={{ r: 3, fill: '#fde047' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RANKING */}
              <div className="rounded-2xl overflow-hidden border border-sky-200" style={{ background: 'rgba(255,255,255,0.75)' }}>
                <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#38bdf8' }}>Ranking</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">Viabilidad por Cultivo</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ordenado de mayor a menor</p>
                </div>
                <div className="p-6 space-y-5">
                  {['tomate','banana','cacao','arroz','maiz']
                    .map(c => ({ c, pct: parseFloat(datosDashboardResumen.viabilidadCultivos[c].porcentaje) }))
                    .sort((a, b) => b.pct - a.pct)
                    .map(({ c, pct }, i) => (
                      <div key={c}>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold text-slate-600 w-4">#{i+1}</span>
                            <span className="text-base">
                              {c === 'tomate' ? '🍅' : c === 'banana' ? '🍌' : c === 'cacao' ? '🌰' : c === 'arroz' ? '🌾' : '🌽'}
                            </span>
                            <span className="text-sm font-semibold text-slate-700">{c.charAt(0).toUpperCase() + c.slice(1)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: `${COLORES_CULTIVOS_ADMIN[c]}22`, color: COLORES_CULTIVOS_ADMIN[c] }}>
                              {datosDashboardResumen.mejorMesPorCultivo[c]}
                            </span>
                            <span className="text-base font-extrabold" style={{ color: COLORES_CULTIVOS_ADMIN[c] }}>{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(14,165,233,0.15)' }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${COLORES_CULTIVOS_ADMIN[c]}cc, ${COLORES_CULTIVOS_ADMIN[c]})` }} />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* INSIGHTS */}
            <div className="grid md:grid-cols-3 gap-5">
              <div className="rounded-2xl p-6 border border-emerald-400" style={{ background: 'rgba(255,255,255,0.85)' }}>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Top Cultivo</span>
                <p className="text-4xl mt-3 mb-1">🌰</p>
                <p className="text-2xl font-extrabold text-slate-800">Cacao</p>
                <p className="text-emerald-600 text-sm mt-1">{datosDashboardResumen.viabilidadCultivos.cacao.porcentaje}% de días viables</p>
              </div>
              <div className="rounded-2xl p-6 border border-amber-400" style={{ background: 'rgba(255,255,255,0.85)' }}>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Clima</span>
                <div className="mt-3 mb-1"><CloudRain size={28} className="text-amber-500" /></div>
                <p className="text-xl font-extrabold text-slate-800 leading-tight">
                  {datosDashboardResumen.datosPerfilClimatico.reduce((max, p) => p.value > max.value ? p : max).name}
                </p>
                <p className="text-amber-600 text-sm mt-1">
                  {datosDashboardResumen.datosPerfilClimatico.reduce((max, p) => p.value > max.value ? p : max).porcentaje}% del período
                </p>
              </div>
              <div className="rounded-2xl p-6 border border-blue-400" style={{ background: 'rgba(255,255,255,0.85)' }}>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Dataset</span>
                <div className="mt-3 mb-1"><Database size={28} className="text-blue-500" /></div>
                <p className="text-3xl font-extrabold text-slate-800">{datosDashboardResumen.totalDias.toLocaleString()}</p>
                <p className="text-blue-600 text-sm mt-1">registros procesados</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB: PREDICTOR */}
      {activeTab === 'predictor' && (
        <PredictorCultivos
          temperatura={ultimoFirebase?.temperatura || datos[datos.length - 1]?.temperatura || 0}
          radiacion={ultimoFirebase ? (ultimoFirebase.uvIndex / 10) : (datos[datos.length - 1]?.radiacion_solar || 0)}
          humedadSuelo={ultimoFirebase?.humedad_suelo || datos[datos.length - 1]?.humedad_suelo || 0}
          humedadRelativa={ultimoFirebase?.humedad || datos[datos.length - 1]?.humedad || 0}
          pluviometria={ultimoFirebase ? (ultimoFirebase.lluvia / 10) : (datos[datos.length - 1]?.precipitacion || 0)}
        />
      )}



      {/* MODAL PDF */}
      <ModalDescargarPDF
        isOpen={modalDescargaOpen}
        onClose={() => setModalDescargaOpen(false)}
        datos={datosFiltrados}
      />
    </div>
  );
};

export default ProfesoresView;
