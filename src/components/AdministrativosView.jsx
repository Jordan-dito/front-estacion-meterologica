import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Users, BarChart3, TrendingUp, Thermometer, Droplets,
  Sun, CloudRain, Wind, Activity, RefreshCw, Database
} from 'lucide-react';
import axios from 'axios';
import Papa from 'papaparse';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import PredictorCultivos from './PredictorCultivos';
import AnalisisKMeans from './AnalisisKMeans';

// ============================================================================
// URL DE FIREBASE
// ============================================================================
const FIREBASE_URL = "https://bdclimatico-cdb27-default-rtdb.firebaseio.com/sensores.json";

// ============================================================================
// MODAL EDITAR USUARIO (CON CÉDULA)
// ============================================================================
const ModalEditarUsuario = ({ usuario, onClose, onSave, loading }) => {
  const [form, setForm] = useState({
    first_name: usuario.first_name || "",
    email: usuario.email || "",
    rol: usuario.rol || "estudiante",
    cedula: usuario.cedula || "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validar que la cédula no esté vacía si es requerida
    if (!form.cedula.trim()) {
      alert("La cédula es requerida");
      return;
    }
    
    onSave(usuario.id, form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
        <h2 className="text-xl font-bold mb-4">✏️ Editar Usuario</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              placeholder="Nombre"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Cédula */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Cédula de Identidad
            </label>
            <input
              type="text"
              name="cedula"
              value={form.cedula}
              onChange={handleChange}
              placeholder="1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Rol
            </label>
            <select
              name="rol"
              value={form.rol}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="estudiante">Estudiante</option>
              <option value="profesor">Profesor</option>
              <option value="administrativo">Administrativo</option>
            </select>
          </div>

          {/* Botones */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 font-semibold transition"
          >
            {loading ? "Guardando..." : "✅ Guardar Cambios"}
          </button>
        </form>

        <button
          onClick={onClose}
          className="w-full mt-3 text-gray-600 hover:text-gray-800 underline"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTES EXTRAÍDOS
// ============================================================================

const CrearUsuarioTab = ({ formData, handleInputChange, handleSubmit, loading, error, success }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl">
    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
      <UserPlus className="text-blue-600" size={28} />
      ➕ Crear Nuevo Usuario
    </h2>

    {error && (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    )}

    {success && (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        {success}
      </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="nombre"
          placeholder="Nombre Completo"
          value={formData.nombre}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Correo Electrónico"
          value={formData.email}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
<input
  type="text"
  name="cedula"
  placeholder="Cédula de Identidad (Opcional)"
  value={formData.cedula}
  onChange={handleInputChange}
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
        <input
          type="password"
          name="password"
          placeholder="Contraseña (mín 8 caracteres)"
          value={formData.password}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <input
          type="password"
          name="password_confirm"
          placeholder="Confirmar Contraseña"
          value={formData.password_confirm}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />

        <select
          name="rol"
          value={formData.rol}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="estudiante">Estudiante</option>
          <option value="profesor">Profesor</option>
          <option value="administrativo">Administrativo</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-6 py-2 rounded-lg transition"
      >
        {loading ? 'Creando...' : '✅ Crear Usuario'}
      </button>
    </form>
  </div>
);
const DashboardEstudiante = ({ 
  ultimoRegistro, stats, datos, mockCropRecommendations, ultimoFirebase, datosCSV, datosFirebaseArray,
  prediccionesML, onPredicciones
}) => (

  <div className="space-y-6">
    {/* ⭐ FIREBASE TIEMPO REAL */}
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
{(ultimoFirebase || ultimoRegistro) && (
  <PredictorCultivos
    temperatura={ultimoFirebase?.temperatura || ultimoRegistro?.temperatura || 0}
    radiacion={ultimoFirebase ? (ultimoFirebase.uvIndex / 10) : (ultimoRegistro?.radiacion_solar || 0)}
    humedadSuelo={ultimoFirebase?.humedad_suelo || ultimoRegistro?.humedad_suelo || 0}
    humedadRelativa={ultimoFirebase?.humedad || ultimoRegistro?.humedad || 0}
    pluviometria={ultimoFirebase ? (ultimoFirebase.lluvia / 10) : (ultimoRegistro?.precipitacion || 0)}
    onPrediccionesChange={onPredicciones}
  />
)}


    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">🌾 Recomendaciones de Cultivo</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {
prediccionesML.map((crop, idx) => (
  <div
    key={idx}
    className={`p-4 rounded-lg border-2 ${
      crop.esViable ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
    }`}
  >
    <div className="flex justify-between items-center mb-2">
      <h4 className="font-bold text-gray-800">{crop.nombre}</h4>
      {crop.esViable && (
        <span className="text-green-600 text-sm font-semibold">✓ ÓPTIMO</span>
      )}
    </div>

    <div className="mb-2">
      <div className="bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full ${crop.esViable ? 'bg-green-600' : 'bg-red-500'}`}
          style={{ width: `${crop.viabilidad}%` }}
        />
      </div>
    </div>

    <p className="text-sm text-gray-600">Confianza: {crop.viabilidad}%</p>
  </div>
))

        
        
        }
      </div>
    </div>
  </div>
);
const DashboardProfesor = ({ mockHistoricalData, stats, ultimoRegistro, datos, ultimoFirebase, onPredicciones, prediccionesML }) => (


  <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-lg p-6">


      {stats && (
        <div className="grid md:grid-cols-1 gap-6">

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Estadísticas</h3>
            <div className="space-y-4">
              <div className="flex justify-between bg-white p-3 rounded">
                <span className="text-gray-700">Temperatura Promedio:</span>
                <span className="font-bold text-gray-900">{stats.tempPromedio}°C</span>
              </div>
              <div className="flex justify-between bg-white p-3 rounded">
                <span className="text-gray-700">Humedad Promedio:</span>
                <span className="font-bold text-gray-900">{stats.humedadPromedio}%</span>
              </div>
              <div className="flex justify-between bg-white p-3 rounded">
                <span className="text-gray-700">Total Registros:</span>
                <span className="font-bold text-gray-900">{datos.length}</span>
              </div>
              <div className="flex justify-between bg-white p-3 rounded">
                <span className="text-gray-700">Período:</span>
                <span className="font-bold text-gray-900 text-sm">
                  {datos.length > 0 ? `${datos[0].date} a ${datos[datos.length - 1].date}` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  </div>
);

// ============================================================================
// TABLA DE USUARIOS CON CÉDULA
// ============================================================================
const GestionUsuarios = ({ usuarios, apiBaseUrl, onRefresh }) => {
  const [eliminando, setEliminando] = useState(false);
  const [mensajeEliminar, setMensajeEliminar] = useState(null);
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [editando, setEditando] = useState(false);

  const handleGuardarEdicion = async (id, data) => {
    try {
      setEditando(true);
      await axios.put(`${apiBaseUrl}/usuarios/${id}/`, data);
      setUsuarioEditar(null);
      if (onRefresh) await onRefresh();
      alert("✅ Usuario actualizado correctamente");
    } catch (err) {
      alert("❌ Error al actualizar usuario: " + (err.response?.data?.error || err.message));
    } finally {
      setEditando(false);
    }
  };

  const handleEliminarUsuario = async (usuarioId, usuarioNombre) => {
    const confirmar = window.confirm(
      `¿Estás seguro de que quieres eliminar a ${usuarioNombre}? Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    try {
      setEliminando(true);
      setMensajeEliminar(null);
      await axios.delete(`${apiBaseUrl}/usuarios/${usuarioId}/`);
      setMensajeEliminar({ tipo: 'success', mensaje: `✅ ${usuarioNombre} eliminado exitosamente` });
      if (onRefresh) await onRefresh();
      setTimeout(() => setMensajeEliminar(null), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Error al eliminar usuario';
      setMensajeEliminar({ tipo: 'error', mensaje: `❌ ${errorMsg}` });
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Users className="text-green-600" size={28} />
        👥 Usuarios del Sistema
      </h2>

      {mensajeEliminar && (
        <div className={`mb-4 px-4 py-3 rounded border ${
          mensajeEliminar.tipo === 'success'
            ? 'bg-green-100 border-green-400 text-green-700'
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {mensajeEliminar.mensaje}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Username</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cédula</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rol</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Creado</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{usuario.username}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{usuario.email}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{usuario.first_name || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                  {usuario.cedula ? (
                    <span className="bg-blue-50 px-2 py-1 rounded">{usuario.cedula}</span>
                  ) : (
                    <span className="text-gray-400">Sin registrar</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${
                    usuario.rol_display === 'Administrativo'
                      ? 'bg-red-100 text-red-800'
                      : usuario.rol_display === 'Profesor'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {usuario.rol_display}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(usuario.created_at).toLocaleDateString('es-ES')}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => setUsuarioEditar(usuario)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs font-semibold transition"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleEliminarUsuario(usuario.id, usuario.first_name || usuario.username)}
                    disabled={eliminando}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-xs font-semibold rounded transition"
                  >
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {usuarios.length === 0 && (
        <p className="text-center text-gray-500 mt-4">No hay usuarios todavía</p>
      )}
      
      {usuarioEditar && (
        <ModalEditarUsuario
          usuario={usuarioEditar}
          loading={editando}
          onClose={() => setUsuarioEditar(null)}
          onSave={handleGuardarEdicion}
        />
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const AdministrativosView = ({ user, apiBaseUrl, onLogout }) => {
  const [prediccionesML, setPrediccionesML] = useState([]);

  const [activeTab, setActiveTab] = useState('crear-usuario');
  const [usuarios, setUsuarios] = useState([]);
  
  // ⭐ Estados para datos COMBINADOS
  const [datos, setDatos] = useState([]);
  const [datosCSV, setDatosCSV] = useState([]);
  const [datosFirebaseArray, setDatosFirebaseArray] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Estado para Firebase tiempo real
  const [ultimoFirebase, setUltimoFirebase] = useState(null);
  const [loadingFirebase, setLoadingFirebase] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    cedula: '',
    password: '',
    password_confirm: '',
    rol: 'estudiante',
  });

const handlePrediccionesActualizadas = useCallback((predicciones) => {
  if (predicciones && predicciones.length > 0) {

    const formateadas = predicciones.map(pred => ({
      nombre: pred.cultivo,
      viabilidad: pred.confianza,
      esViable: pred.viabilidad || pred.es_optimo_en_cluster,
      esOptimoEnCluster: Boolean(pred.es_optimo_en_cluster)
    }))
    .sort((a, b) => {
      if (a.esViable !== b.esViable) return a.esViable ? -1 : 1;
      return b.viabilidad - a.viabilidad;
    });

    setPrediccionesML(formateadas);
  }
}, []);


  // ========================================================================
  // FUNCIÓN PARA CALCULAR VIABILIDAD
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
  // ⭐ CARGAR FIREBASE
  // ========================================================================
  const fetchFirebase = useCallback(async () => {
    try {
      setLoadingFirebase(true);
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


        // ⭐ CONVERTIR Firebase al formato del CSV
        const firebaseComoCSV = registros.map((r) => {
          const temp = r.temperatura || 0;
          const humedad = r.humedad || 0;
          const humedadSuelo = r.humedad_suelo || 0;
          const lluvia = r.lluvia < 0 ? 0 : r.lluvia || 0;
          const uvIndex = r.uvIndex || 0;
          
          // ⭐ PARSEAR TIMESTAMP - puede ser número o string "YY/MM/DD"
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


          const viabilidad = calcularViabilidad(temp, humedad, lluvia/10);

          return {
            date: fecha,
            temperatura: temp,
            radiacion_solar:uvIndex,
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
    } finally {
      setLoadingFirebase(false);
    }
  }, []);

  // ========================================================================
  // CARGAR USUARIOS
  // ========================================================================
  const fetchUsuarios = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/usuarios/`);
      setUsuarios(response.data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  };

  // ========================================================================
  // CARGAR CSV
  // ========================================================================
  const fetchDatos = async () => {
    try {
      const response = await fetch('/cultivos_viabilidad_FINAL.csv');
      const csvText = await response.text();

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const datosParseados = results.data.map((row) => ({
            date: row.date || '',
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

        },
        error: (error) => {
          console.error('❌ Error parsing CSV:', error);
        }
      });
    } catch (err) {
      console.error('Error cargando CSV:', err);
    }
  };

  // ========================================================================
  // ⭐ COMBINAR CSV + FIREBASE
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
    fetchUsuarios();
    fetchDatos();
    fetchFirebase();

    const intervalFirebase = setInterval(fetchFirebase, 30000);
    return () => clearInterval(intervalFirebase);
  }, [fetchFirebase]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.nombre || !formData.email || !formData.password) {
      setError('Todos los campos son requeridos');
      return;
    }

    if (formData.password !== formData.password_confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener mínimo 8 caracteres');
      return;
    }
    // ⭐ AGREGA ESTO:
    console.log('📤 Datos que se envían:', {
      nombre: formData.nombre,
      email: formData.email,
      cedula: formData.cedula,
      password: formData.password,
      rol: formData.rol,
    });
    try {
      setLoading(true);
      const response = await axios.post(`${apiBaseUrl}/crear-usuario/`, {
        nombre: formData.nombre,
        email: formData.email,
        cedula: formData.cedula,
        password: formData.password,
        password_confirm: formData.password_confirm,
        rol: formData.rol,
      });

      setSuccess(`✅ ${response.data.mensaje}`);
      setFormData({
        nombre: '',
        email: '',
        cedula: '',
        password: '',
        password_confirm: '',
        rol: 'estudiante',
      });

      await fetchUsuarios();
      setTimeout(() => setActiveTab('usuarios'), 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Error al crear usuario';
      setError(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const ultimoRegistro = datos.length > 0 ? datos[datos.length - 1] : null;

  const calcularStats = () => {
    if (datos.length === 0) return null;
    const temps = datos.map((d) => d.temperatura);
    const humeds = datos.map((d) => d.humedad);
    const radiaciones = datos.map((d) => d.radiacion_solar);
    const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      temperature: ultimoFirebase?.temperatura || ultimoRegistro?.temperatura || 0,
      humidity: ultimoFirebase?.humedad || ultimoRegistro?.humedad || 0,
      soilMoisture: ultimoFirebase?.humedad_suelo || ultimoRegistro?.humedad_suelo || 0,
      solarRadiation: ultimoRegistro?.radiacion_solar || 0,
      precipitation: ultimoFirebase?.lluvia || ultimoRegistro?.precipitacion || 0,
      tempPromedio: average(temps).toFixed(2),
      humedadPromedio: average(humeds).toFixed(2),
      radiacionPromedio: average(radiaciones).toFixed(0),
    };
  };

  const stats = calcularStats();

  const mockHistoricalData = datos.slice(-30).map((d) => ({
    fecha: d.date,
    temp: d.temperatura,
    hum: d.humedad,
    rad: Math.round(d.radiacion_solar / 100),
    precip: d.precipitacion,
  }));

  const obtenerRecomendaciones = () => {
    const temp = ultimoFirebase?.temperatura || ultimoRegistro?.temperatura || 0;
    const lluvia = ultimoFirebase?.lluvia || ultimoRegistro?.precipitacion || 0;
    const humedad = ultimoFirebase?.humedad || ultimoRegistro?.humedad || 0;

    const viabilidad = calcularViabilidad(temp, humedad, lluvia);

    return [
      { cultivo: 'Arroz', viabilidad: viabilidad.arroz === 'Sí' ? 85 : 40, optimo: viabilidad.arroz === 'Sí' },
      { cultivo: 'Maíz', viabilidad: viabilidad.maiz === 'Sí' ? 78 : 45, optimo: viabilidad.maiz === 'Sí' },
      { cultivo: 'Cacao', viabilidad: viabilidad.cacao === 'Sí' ? 92 : 30, optimo: viabilidad.cacao === 'Sí' },
      { cultivo: 'Banana', viabilidad: viabilidad.banana === 'Sí' ? 88 : 35, optimo: viabilidad.banana === 'Sí' },
    ];
  };

  const mockCropRecommendations = obtenerRecomendaciones();

  return (
    <div className="space-y-6">
      {/* HEADER CON BOTONES */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">🏛️ Panel Administrativo</h2>
          <div className="flex gap-2">
            <button
              onClick={fetchFirebase}
              disabled={loadingFirebase}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <Database size={18} className={loadingFirebase ? 'animate-pulse' : ''} />
              Firebase
            </button>
            <button
              onClick={() => { fetchDatos(); fetchFirebase(); }}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refrescar
            </button>
          </div>
        </div>

        <div className="flex gap-2 border-b overflow-x-auto">
          {['crear-usuario', 'dashboard', 'analisis', 'analisis-kmeans', 'usuarios'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 font-semibold transition whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-4 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab === 'crear-usuario' && '➕ Crear Usuario'}
              {tab === 'dashboard' && '📊 Dashboard'}
              {tab === 'analisis' && '📈 Análisis'}
              {tab === 'analisis-kmeans' && '📚 K-Means'}
              {tab === 'usuarios' && '👥 Usuarios'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'crear-usuario' && (
        <CrearUsuarioTab 
          formData={formData}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          loading={loading}
          error={error}
          success={success}
        />
      )}
      
{activeTab === 'dashboard' && (
  <DashboardEstudiante 
    ultimoRegistro={ultimoRegistro}
    stats={stats}
    datos={datos}
    mockCropRecommendations={mockCropRecommendations}
    ultimoFirebase={ultimoFirebase}
    datosCSV={datosCSV}
    datosFirebaseArray={datosFirebaseArray}
    prediccionesML={prediccionesML}
    onPredicciones={handlePrediccionesActualizadas}
  />
)}

      {activeTab === 'analisis' && (
        <DashboardProfesor 
          mockHistoricalData={mockHistoricalData}
          stats={stats}
          mockCropRecommendations={mockCropRecommendations}
          ultimoRegistro={ultimoRegistro}
          datos={datos}
          ultimoFirebase={ultimoFirebase}
          onPredicciones={handlePrediccionesActualizadas}
          prediccionesML={prediccionesML}
        />
      )}
      
      {activeTab === 'analisis-kmeans' && (
        <AnalisisKMeans 
          variante="profesor"
          imagenClusters="/centroides.png"
          imagenCodo="/codo.png"
            ultimoFirebase={ultimoFirebase}
  ultimoRegistro={ultimoRegistro}
        />
      )}
      
      {activeTab === 'usuarios' && (
        <GestionUsuarios 
          usuarios={usuarios}
          apiBaseUrl={apiBaseUrl}
          onRefresh={fetchUsuarios}
        />
      )}
    </div>
  );
};

export default AdministrativosView;
