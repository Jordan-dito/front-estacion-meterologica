import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, RefreshCw, Thermometer, Droplets, Wind, Sun, Activity, CloudRain, Database, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PredictorCultivos from './PredictorCultivos';
import Papa from 'papaparse';

// ============================================================================
// URL DE FIREBASE
// ============================================================================
const FIREBASE_URL = "https://bdclimatico-cdb27-default-rtdb.firebaseio.com/sensores.json";

const EstudiantesView = ({ user, apiBaseUrl, onLogout }) => {
  // ⭐ Estados para datos combinados (CSV + Firebase)
  const [datos, setDatos] = useState([]);
  const [datosCSV, setDatosCSV] = useState([]);
  const [datosFirebaseArray, setDatosFirebaseArray] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para el último registro de Firebase (tiempo real)
  const [ultimoFirebase, setUltimoFirebase] = useState(null);
  const [loadingFirebase, setLoadingFirebase] = useState(false);
  const [errorFirebase, setErrorFirebase] = useState(null);

  // ========================================================================
  // FUNCIÓN PARA CALCULAR VIABILIDAD DE CULTIVOS
  // ========================================================================
  const calcularViabilidad = (temp, humedad, lluvia) => {
    return {
      // Tomate: 20-32°C, humedad 50-85%, lluvia moderada
      tomate: (temp >= 20 && temp <= 32 && lluvia >= 1 && lluvia <= 15 && humedad >= 50 && humedad <= 85) ? 'Sí' : 'No',
      
      // Banana: 20-32°C, lluvia moderada-alta
      banana: (temp >= 20 && temp <= 32 && lluvia >= 2 && lluvia <= 35) ? 'Sí' : 'No',
      
      // Cacao: 21-32°C, lluvia < 45mm (muy tolerante)
      cacao: (temp >= 21 && temp <= 32 && lluvia < 45) ? 'Sí' : 'No',
      
      // Arroz: 22-32°C, necesita más agua
      arroz: (temp >= 22 && temp <= 32 && lluvia >= 2 && lluvia <= 30) ? 'Sí' : 'No',
      
      // Maíz: 20-32°C, lluvia moderada
      maiz: (temp >= 20 && temp <= 32 && lluvia >= 1 && lluvia <= 20) ? 'Sí' : 'No',
    };
  };

  // ========================================================================
  // CARGAR DATOS DE FIREBASE
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

        const registrosObj = data;

        // Obtener última key insertada (Firebase las ordena por tiempo)
        const keys = Object.keys(registrosObj);

        if (keys.length > 0) {
          const lastKey = keys[keys.length - 1];
          const ultimo = registrosObj[lastKey];

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

        const firebaseComoCSV = registros.map((r) => {
          const temp = r.temperatura || 0;
          const humedad = r.humedad || 0;
          const humedadSuelo = r.humedad_suelo || 0;
          const lluvia = r.lluvia < 0 ? 0 : r.lluvia || 0;
          const uvIndex = r.uvIndex || 0;
          
          // Parseo de fecha
          let fecha = new Date().toISOString().slice(0, 10);
          if (r.timestamp) {
            if (typeof r.timestamp === 'string') {
              const partes = r.timestamp.split('/');
              if (partes.length === 3) {
                const año = partes[0].length === 2 ? '20' + partes[0] : partes[0];
                fecha = `${año}-${partes[1].padStart(2, '0')}-${partes[2].padStart(2, '0')}`;
              }
            } else if (typeof r.timestamp === 'number') {
              const ts = r.timestamp > 10000000000 ? r.timestamp / 1000 : r.timestamp;
              fecha = new Date(ts * 1000).toISOString().slice(0, 10);
            }
          }

          const viabilidad = calcularViabilidad(temp, humedad, lluvia / 10);

          return {
            date: fecha,
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
  const fetchDatosCSV = useCallback(async () => {
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
            temperatura: parseFloat(row.Temperatura) || 0,
            radiacion_solar: parseFloat(row.RadiacionsolarpromediokWm2) || 0,
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
        },
        error: (error) => {
          console.error('❌ Error parsing CSV:', error);
          setError('Error al cargar CSV');
        }
      });
    } catch (err) {
      console.error('Error cargando CSV:', err);
      setError('Error al cargar datos históricos');
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================================================
  // COMBINAR CSV + FIREBASE
  // ========================================================================
  useEffect(() => {
    const fechasCSV = new Set(datosCSV.map(d => d.date));
    const firebaseNuevos = datosFirebaseArray.filter(d => !fechasCSV.has(d.date));
    const combinados = [...datosCSV, ...firebaseNuevos];
    combinados.sort((a, b) => new Date(a.date) - new Date(b.date));
    setDatos(combinados);
  }, [datosCSV, datosFirebaseArray]);

  // ========================================================================
  // EFECTOS
  // ========================================================================
  useEffect(() => {
    fetchDatosCSV();
    fetchFirebase();
    const intervalFirebase = setInterval(fetchFirebase, 30000);
    return () => clearInterval(intervalFirebase);
  }, [fetchDatosCSV, fetchFirebase]);

  // ========================================================================
  // ESTADÍSTICAS
  // ========================================================================
  const ultimoRegistro = datos.length > 0 ? datos[datos.length - 1] : null;

  const calcularEstadisticas = () => {
    if (datos.length === 0) return null;

    const temps = datos.map((d) => d.temperatura);
    const humeds = datos.map((d) => d.humedad);
    const radiaciones = datos.map((d) => d.radiacion_solar);
    const precips = datos.map((d) => d.precipitacion);

    const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      temperatura: {
        actual: temps[temps.length - 1],
        max: Math.max(...temps),
        min: Math.min(...temps),
        promedio: average(temps).toFixed(2),
      },
      humedad: {
        actual: humeds[humeds.length - 1],
        max: Math.max(...humeds),
        min: Math.min(...humeds),
        promedio: average(humeds).toFixed(2),
      },
      radiacion: {
        actual: radiaciones[radiaciones.length - 1],
        max: Math.max(...radiaciones),
        min: Math.min(...radiaciones),
        promedio: average(radiaciones).toFixed(2),
      },
      precipitacion: {
        total: precips.reduce((a, b) => a + b, 0).toFixed(2),
        promedio: average(precips).toFixed(2),
      },
    };
  };

  const stats = calcularEstadisticas();

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

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-green-600" size={28} />
            📊 Datos Meteorológicos
          </h2>
          <div className="flex gap-2">
            <button
              onClick={fetchFirebase}
              disabled={loadingFirebase}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <Database size={18} className={loadingFirebase ? 'animate-pulse' : ''} />
              {loadingFirebase ? 'Cargando...' : 'Firebase'}
            </button>
            <button
              onClick={() => { fetchDatosCSV(); fetchFirebase(); }}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
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

      {/* TIEMPO REAL FIREBASE */}
      {ultimoFirebase && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Database size={24} />
            🔥 Sensores en Tiempo Real
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer size={20} />
                <span className="text-sm">Temperatura</span>
              </div>
              <p className="text-3xl font-bold">{ultimoFirebase.temperatura}°C</p>
            </div>

            <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Droplets size={20} />
                <span className="text-sm">Humedad</span>
              </div>
              <p className="text-3xl font-bold">{ultimoFirebase.humedad}%</p>
            </div>

            <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={20} />
                <span className="text-sm">Hum. Suelo</span>
              </div>
              <p className="text-3xl font-bold">{ultimoFirebase.humedad_suelo}%</p>
            </div>

            <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CloudRain size={20} />
                <span className="text-sm">Lluvia</span>
              </div>
              <p className="text-3xl font-bold">{(ultimoFirebase.lluvia / 10).toFixed(2)} mm</p>
            </div>

            <div className="bg-white/20 backdrop-blur p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sun size={20} />
                <span className="text-sm">UV Index</span>
              </div>
              <p className="text-3xl font-bold">{(ultimoFirebase.uvIndex / 10).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* PREDICTOR */}
      {(ultimoFirebase || ultimoRegistro) && (
        <PredictorCultivos
          temperatura={ultimoFirebase?.temperatura || ultimoRegistro?.temperatura || 0}
          radiacion={ultimoFirebase ? (ultimoFirebase.uvIndex / 10) : (ultimoRegistro?.radiacion_solar || 0)}
          humedadSuelo={ultimoFirebase?.humedad_suelo || ultimoRegistro?.humedad_suelo || 0}
          humedadRelativa={ultimoFirebase?.humedad || ultimoRegistro?.humedad || 0}
          pluviometria={ultimoFirebase ? (ultimoFirebase.lluvia / 10) : (ultimoRegistro?.precipitacion || 0)}
        />
      )}
    </div>
  );
};

export default EstudiantesView;
