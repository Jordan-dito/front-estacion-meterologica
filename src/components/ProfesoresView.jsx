import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, Zap, RefreshCw, BarChart3, ChevronLeft, ChevronRight, Database, Thermometer, Droplets, CloudRain, Sun, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts';
import PredictorCultivos from './PredictorCultivos';
import ModalDescargarPDF from './Modaldescargarpdf';
// import AnalisisKMeans from './AnalisisKMeans';
import Papa from 'papaparse';

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

  let fechaParaFiltro = null;   // null = timestamp inválido, no pasa filtros de fecha
  let fechaParaMostrar = 'Sin fecha';

  if (r.timestamp) {
    if (typeof r.timestamp === 'string' && r.timestamp.includes('/')) {
      // Formato del sensor: "26/04/07 09:52"
      const [soloFecha, soloHora] = r.timestamp.trim().split(' ');
      const partes = soloFecha.split('/');
      if (partes.length === 3) {
        let [año, mes, dia] = partes;
        if (año.length === 2) año = '20' + año;
        dia = dia.padStart(2, '0');
        mes = mes.padStart(2, '0');
        fechaParaFiltro = `${año}-${mes}-${dia}`;
        fechaParaMostrar = soloHora ? `${dia}/${mes}/${año} ${soloHora}` : `${dia}/${mes}/${año}`;
      }
    } else if (typeof r.timestamp === 'number' && r.timestamp > 0) {
      const ts = r.timestamp > 10000000000 ? r.timestamp / 1000 : r.timestamp;
      const dateObj = new Date(ts * 1000);
      fechaParaFiltro = dateObj.toISOString().slice(0, 10);
      fechaParaMostrar = dateObj.toLocaleDateString('es-EC') + ' ' + dateObj.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    }
  }

  const viabilidad = calcularViabilidad(temp, humedad, lluvia);

  return {
    date: fechaParaFiltro,
    dateDisplay: fechaParaMostrar,
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
            dateDisplay: row.date || '',
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
// ⭐ COMBINAR CSV + FIREBASE (SIN FILTRAR)
// ========================================================================
useEffect(() => {
  // Agregar dateDisplay al CSV si no tiene
  const csvConDisplay = datosCSV.map(d => ({
    ...d,
    dateDisplay: d.date // CSV solo tiene fecha
  }));

  // ⭐ NO FILTRAR - COMBINAR TODO
  const combinados = [...csvConDisplay, ...datosFirebaseArray];
  
  // Ordenar por fecha
  combinados.sort((a, b) => new Date(a.date) - new Date(b.date));
  
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



  // ========================================================================
  // CONTEO DE CULTIVOS VIABLES
  // ========================================================================
  const contarCultivosViables = () => {
    return {
      tomate: datos.filter(d => d.tomate === 'Sí').length,
      banana: datos.filter(d => d.banana === 'Sí').length,
      cacao: datos.filter(d => d.cacao === 'Sí').length,
      arroz: datos.filter(d => d.arroz === 'Sí').length,
      maiz: datos.filter(d => d.maiz === 'Sí').length,
    };
  };

  const cultivosViables = contarCultivosViables();

  const COLORS = ['#ef4444', '#f59e0b', '#8B4513', '#22c55e', '#eab308'];

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
    
    const viabilidadCultivos = {
      tomate: { dias: cultivosViables.tomate, porcentaje: ((cultivosViables.tomate / totalDias) * 100).toFixed(1) },
      banana: { dias: cultivosViables.banana, porcentaje: ((cultivosViables.banana / totalDias) * 100).toFixed(1) },
      cacao: { dias: cultivosViables.cacao, porcentaje: ((cultivosViables.cacao / totalDias) * 100).toFixed(1) },
      arroz: { dias: cultivosViables.arroz, porcentaje: ((cultivosViables.arroz / totalDias) * 100).toFixed(1) },
      maiz: { dias: cultivosViables.maiz, porcentaje: ((cultivosViables.maiz / totalDias) * 100).toFixed(1) },
    };

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
      mejorMesPorCultivo
    };
  }, [datos, cultivosViables]);

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
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 shadow-sm">
              <label className="text-gray-700 font-medium text-sm">Filtrar por fecha:</label>
              <input
                type="date"
                max={today}
                className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                value={filtroInicio}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setFiltroInicio(e.target.value)}
              />
              <span className="text-gray-500">a</span>
              <input
                type="date"
                max={today}
                className="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                value={filtroFin}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setFiltroFin(e.target.value)}
              />
              <button
                onClick={() => { setFiltroInicio(''); setFiltroFin(''); }}
                className="ml-2 px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs transition"
                disabled={!filtroInicio && !filtroFin}
              >Limpiar</button>
            </div>
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

      {/* DASHBOARD RESUMEN - Gráficas debajo de los filtros */}
      {datosDashboardResumen && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 text-center">
              📊 DASHBOARD: Análisis de Viabilidad de Cultivos
            </h2>
            <p className="text-center text-gray-500 mt-2">
              Análisis completo de {datosDashboardResumen.totalDias} días de datos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Viabilidad Promedio General (%)
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={datosDashboardResumen.datosViabilidadPie}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {datosDashboardResumen.datosViabilidadPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Total de Datos Viables
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={datosDashboardResumen.datosBarra}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cultivo" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="dias" name="Días Viables">
                    {datosDashboardResumen.datosBarra.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Distribución de Perfiles Climáticos
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={datosDashboardResumen.datosPerfilClimatico}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ porcentaje }) => `${porcentaje}%`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {datosDashboardResumen.datosPerfilClimatico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORES_CLIMA[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} días (${props.payload.porcentaje}%)`, props.payload.name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Tendencia de Viabilidad
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={datosDashboardResumen.tendenciaMensual}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="tomate" stroke="#ef4444" name="Tomate" strokeWidth={2} />
                  <Line type="monotone" dataKey="banana" stroke="#f59e0b" name="Banana" strokeWidth={2} />
                  <Line type="monotone" dataKey="cacao" stroke="#8B4513" name="Cacao" strokeWidth={2} />
                  <Line type="monotone" dataKey="arroz" stroke="#22c55e" name="Arroz" strokeWidth={2} />
                  <Line type="monotone" dataKey="maiz" stroke="#eab308" name="Maíz" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                📋 Resumen Estadístico
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-3 text-left">Cultivo</th>
                      <th className="border border-gray-300 px-4 py-3 text-center">% Viabilidad</th>
                      <th className="border border-gray-300 px-4 py-3 text-center">Mejor Mes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['tomate', 'banana', 'cacao', 'arroz', 'maiz'].map((cultivo) => (
                      <tr key={cultivo} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-3 capitalize font-medium">
                          <span className="flex items-center gap-2">
                            {cultivo === 'tomate' && '🍅'}
                            {cultivo === 'banana' && '🍌'}
                            {cultivo === 'cacao' && '🌰'}
                            {cultivo === 'arroz' && '🌾'}
                            {cultivo === 'maiz' && '🌽'}
                            {cultivo.charAt(0).toUpperCase() + cultivo.slice(1)}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <span
                            className="font-bold px-2 py-1 rounded"
                            style={{
                              backgroundColor: `${COLORES_CULTIVOS[cultivo]}20`,
                              color: COLORES_CULTIVOS[cultivo]
                            }}
                          >
                            {datosDashboardResumen.viabilidadCultivos[cultivo].porcentaje}%
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3 text-center">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                            {datosDashboardResumen.mejorMesPorCultivo[cultivo]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-4">💡 Insights Clave</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
                <p className="text-sm opacity-90">Cultivo más viable</p>
                <p className="text-2xl font-bold">🌰 Cacao</p>
                <p className="text-sm">{datosDashboardResumen.viabilidadCultivos.cacao.porcentaje}% de los días</p>
              </div>
              <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
                <p className="text-sm opacity-90">Condición climática dominante</p>
                <p className="text-2xl font-bold">
                  {datosDashboardResumen.datosPerfilClimatico.reduce((max, p) =>
                    p.value > max.value ? p : max
                  ).name}
                </p>
                <p className="text-sm">
                  {datosDashboardResumen.datosPerfilClimatico.reduce((max, p) =>
                    p.value > max.value ? p : max
                  ).porcentaje}% del período
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
                <p className="text-sm opacity-90">Total datos analizados</p>
                <p className="text-2xl font-bold">{datosDashboardResumen.totalDias}</p>
                <p className="text-sm">registros procesados</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
          {['datos', 'predictor'].map((tab) => (
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
                  .sort((a, b) => ordenFechaAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))
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
                        <td className="px-4 py-3 font-mono text-sm">{d.dateDisplay}</td>
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
