import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserPlus, Users, BarChart3, TrendingUp, Thermometer, Droplets,
  Sun, CloudRain, Wind, Activity, RefreshCw, Database, AlertTriangle, X,
  CheckCircle, Trash2
} from 'lucide-react';
import axios from 'axios';
import Papa from 'papaparse';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import PredictorCultivos from './PredictorCultivos';
import AnalisisKMeans from './AnalisisKMeans';

// ============================================================================
// URL DE FIREBASE
// ============================================================================
const FIREBASE_URL = "https://bdclimatico-cdb27-default-rtdb.firebaseio.com/sensores.json";

// ============================================================================
// VALIDACIÓN DE CÉDULA ECUATORIANA
// ============================================================================
const validarCedulaEcuatoriana = (cedula) => {
  if (!cedula || cedula.trim() === '')
    return { valida: false, mensaje: 'La cédula es requerida.' };

  if (!/^\d+$/.test(cedula))
    return { valida: false, mensaje: 'La cédula debe contener solo números, sin espacios ni letras.' };

  if (cedula.length !== 10)
    return { valida: false, mensaje: `Formato incorrecto: la cédula ecuatoriana debe tener exactamente 10 dígitos (ingresaste ${cedula.length}).` };

  const provincia = parseInt(cedula.substring(0, 2), 10);
  if (provincia < 1 || (provincia > 24 && provincia !== 30))
    return { valida: false, mensaje: 'Esta cédula no es ecuatoriana (código de provincia inválido).' };

  const tercerDigito = parseInt(cedula[2], 10);
  if (tercerDigito > 7)
    return { valida: false, mensaje: 'Esta cédula no es ecuatoriana (tercer dígito fuera de rango).' };

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let val = parseInt(cedula[i], 10) * coeficientes[i];
    if (val >= 10) val -= 9;
    suma += val;
  }
  const digitoEsperado = (10 - (suma % 10)) % 10;
  if (digitoEsperado !== parseInt(cedula[9], 10))
    return { valida: false, mensaje: 'Esta cédula no es válida (dígito verificador incorrecto). Verifica que la hayas ingresado correctamente.' };

  return { valida: true, mensaje: '' };
};

// ============================================================================
// ALERT PERSONALIZADO
// ============================================================================
const CustomAlert = ({ mensaje, onClose }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
    <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-4 animate-fade-in">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
        <AlertTriangle className="text-red-500" size={36} />
      </div>
      <h3 className="text-lg font-bold text-gray-800">Cédula inválida</h3>
      <p className="text-sm text-gray-600 text-center leading-relaxed">{mensaje}</p>
      <button
        onClick={onClose}
        className="mt-1 w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-xl transition"
      >
        Entendido
      </button>
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
      >
        <X size={18} />
      </button>
    </div>
  </div>
);

// ============================================================================
// TOAST DE NOTIFICACIÓN (éxito / error)
// ============================================================================
const Toast = ({ tipo, mensaje, onClose }) => {
  const esExito = tipo === 'success';
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white
      transition-all duration-300 min-w-[280px] max-w-sm
      ${esExito ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}
    >
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
        ${esExito ? 'bg-white/20' : 'bg-white/20'}`}
      >
        {esExito
          ? <CheckCircle size={20} className="text-white" />
          : <AlertTriangle size={20} className="text-white" />}
      </div>
      <p className="flex-1 text-sm font-semibold leading-tight">{mensaje}</p>
      <button onClick={onClose} className="flex-shrink-0 text-white/70 hover:text-white transition">
        <X size={18} />
      </button>
    </div>
  );
};

// ============================================================================
// MODAL CONFIRMAR ELIMINAR
// ============================================================================
const ModalConfirmarEliminar = ({ nombre, onConfirmar, onCancelar }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancelar} />
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
        <Trash2 className="text-red-500" size={32} />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Eliminar usuario</h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          ¿Estás seguro de que quieres eliminar a <strong className="text-gray-800">{nombre}</strong>?<br />
          Esta acción no se puede deshacer.
        </p>
      </div>
      <div className="flex gap-3 w-full mt-1">
        <button
          onClick={onCancelar}
          className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition flex items-center justify-center gap-2"
        >
          <Trash2 size={16} />
          Eliminar
        </button>
      </div>
      <button onClick={onCancelar} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition">
        <X size={18} />
      </button>
    </div>
  </div>
);

// ============================================================================
// MODAL CREAR USUARIO
// ============================================================================
const ModalCrearUsuario = ({ onClose, onCreate, loading, error, success }) => {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    cedula: '',
    password: '',
    password_confirm: '',
    rol: 'estudiante',
  });
  const [cedulaAlerta, setCedulaAlerta] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'cedula' ? value.replace(/\D/g, '') : value;
    setForm({ ...form, [name]: newValue });
  };

  const handleCedulaBlur = () => {
    if (!form.cedula) return;
    const { valida, mensaje } = validarCedulaEcuatoriana(form.cedula);
    if (!valida) setCedulaAlerta(mensaje);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.cedula) {
      const { valida, mensaje } = validarCedulaEcuatoriana(form.cedula);
      if (!valida) { setCedulaAlerta(mensaje); return; }
    }

    if (form.password !== form.password_confirm) {
      alert("Las contraseñas no coinciden");
      return;
    }

    if (form.password.length < 8) {
      alert("La contraseña debe tener mínimo 8 caracteres");
      return;
    }

    onCreate(form);
  };

  return (
    <>
      {cedulaAlerta && <CustomAlert mensaje={cedulaAlerta} onClose={() => setCedulaAlerta('')} />}
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl w-[500px] shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">➕ Crear Nuevo Usuario</h2>

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
          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Nombre completo"
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
              Cédula de Identidad (Opcional)
            </label>
            <input
              type="text"
              name="cedula"
              value={form.cedula}
              onChange={handleChange}
              onBlur={handleCedulaBlur}
              onKeyDown={e => {
                if (!/\d/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                }
              }}
              placeholder="1234567890"
              maxLength={10}
              inputMode="numeric"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              name="password_confirm"
              value={form.password_confirm}
              onChange={handleChange}
              placeholder="Confirmar contraseña"
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

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-lg transition"
            >
              {loading ? 'Creando...' : '✅ Crear Usuario'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};

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
  const [cedulaAlerta, setCedulaAlerta] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'cedula' ? value.replace(/\D/g, '') : value;
    setForm({ ...form, [name]: newValue });
  };

  const handleCedulaBlur = () => {
    if (!form.cedula) return;
    const { valida, mensaje } = validarCedulaEcuatoriana(form.cedula);
    if (!valida) setCedulaAlerta(mensaje);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const { valida, mensaje } = validarCedulaEcuatoriana(form.cedula);
    if (!valida) { setCedulaAlerta(mensaje); return; }

    onSave(usuario.id, form);
  };

  return (
    <>
      {cedulaAlerta && <CustomAlert mensaje={cedulaAlerta} onClose={() => setCedulaAlerta('')} />}
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
              onBlur={handleCedulaBlur}
              onKeyDown={e => {
                if (!/\d/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                }
              }}
              placeholder="1234567890"
              maxLength={10}
              inputMode="numeric"
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
    </>
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
  onBlur={() => {
    if (!formData.cedula) return;
    const { valida, mensaje } = validarCedulaEcuatoriana(formData.cedula);
    if (!valida) alert(mensaje);
  }}
  onKeyDown={e => {
    if (!/\d/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  }}
  maxLength={10}
  inputMode="numeric"
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
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Database size={24} />
          🔥 Sensores en Tiempo Real
        </h3>
        {ultimoFirebase.timestamp && (
          <p className="text-sm text-white/80 mb-4">🕐 Última lectura: {ultimoFirebase.timestamp}</p>
        )}
        
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
  </div>
);
const DashboardProfesor = ({ mockHistoricalData, stats, ultimoRegistro, datos, ultimoFirebase, onPredicciones, prediccionesML }) => (


  <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-lg p-6">


      {stats && (
        <div className="grid md:grid-cols-1 gap-6">

          <div className="bg-gradient-to-br from-sky-200 to-cyan-300 p-6 rounded-lg">
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
                <span className="text-gray-700">Radiación Solar Promedio:</span>
                <span className="font-bold text-gray-900">{stats.radiacionPromedio} kW/m²</span>
              </div>
              <div className="flex justify-between bg-white p-3 rounded">
                <span className="text-gray-700">Precipitación Promedio:</span>
                <span className="font-bold text-gray-900">{stats.precipitacionPromedio} mm</span>
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
const GestionUsuarios = ({ usuarios, apiBaseUrl, onRefresh, onCrearUsuario, loadingCrear, errorCrear, successCrear }) => {
  const [eliminando, setEliminando] = useState(false);
  const [mensajeEliminar, setMensajeEliminar] = useState(null);
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [editando, setEditando] = useState(false);
  const [mensajeEdicion, setMensajeEdicion] = useState(null);
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // { id, nombre }

  const handleCrearUsuario = async (formData) => {
    const resultado = await onCrearUsuario(formData);
    if (resultado.success) {
      setMostrarModalCrear(false);
    }
  };

  const handleGuardarEdicion = async (id, data) => {
    try {
      setEditando(true);
      await axios.put(`${apiBaseUrl}/usuarios/${id}/`, data);
      setUsuarioEditar(null);
      if (onRefresh) await onRefresh();
      setMensajeEdicion({ tipo: 'success', mensaje: 'Usuario actualizado correctamente' });
      setTimeout(() => setMensajeEdicion(null), 3500);
    } catch (err) {
      const d = err.response?.data;
      let msg = 'Error al actualizar usuario';
      if (d?.error) msg = d.error;
      else if (d?.email) msg = 'El correo electrónico ya está registrado';
      else if (d?.detail) msg = d.detail;
      setMensajeEdicion({ tipo: 'error', mensaje: msg });
      setTimeout(() => setMensajeEdicion(null), 4000);
    } finally {
      setEditando(false);
    }
  };

  const handleEliminarUsuario = (usuarioId, usuarioNombre) => {
    setConfirmarEliminar({ id: usuarioId, nombre: usuarioNombre });
  };

  const confirmarEliminacion = async () => {
    const { id, nombre } = confirmarEliminar;
    setConfirmarEliminar(null);
    try {
      setEliminando(true);
      setMensajeEliminar(null);
      await axios.delete(`${apiBaseUrl}/usuarios/${id}/`);
      setMensajeEliminar({ tipo: 'success', mensaje: `${nombre} eliminado exitosamente` });
      if (onRefresh) await onRefresh();
      setTimeout(() => setMensajeEliminar(null), 3500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al eliminar usuario';
      setMensajeEliminar({ tipo: 'error', mensaje: errorMsg });
      setTimeout(() => setMensajeEliminar(null), 4000);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Toasts */}
      {mensajeEdicion && (
        <Toast tipo={mensajeEdicion.tipo} mensaje={mensajeEdicion.mensaje} onClose={() => setMensajeEdicion(null)} />
      )}
      {mensajeEliminar && (
        <Toast tipo={mensajeEliminar.tipo} mensaje={mensajeEliminar.mensaje} onClose={() => setMensajeEliminar(null)} />
      )}

      {/* Modal confirmar eliminación */}
      {confirmarEliminar && (
        <ModalConfirmarEliminar
          nombre={confirmarEliminar.nombre}
          onConfirmar={confirmarEliminacion}
          onCancelar={() => setConfirmarEliminar(null)}
        />
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="text-green-600" size={28} />
          👥 Usuarios del Sistema
        </h2>
        <button
          onClick={() => setMostrarModalCrear(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <UserPlus size={18} />
          ➕ Crear Usuario
        </button>
      </div>

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

      {mostrarModalCrear && (
        <ModalCrearUsuario
          onClose={() => setMostrarModalCrear(false)}
          onCreate={handleCrearUsuario}
          loading={loadingCrear}
          error={errorCrear}
          success={successCrear}
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

  const [activeTab, setActiveTab] = useState('dashboard');
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

  const [filtroInicioAdmin, setFiltroInicioAdmin] = useState('');
  const [filtroFinAdmin, setFiltroFinAdmin] = useState('');

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
          
          // ⭐ PARSEAR TIMESTAMP - puede ser número o string "YY/MM/DD HH:MM"
          let fecha = new Date().toISOString().slice(0, 10);
          let fechaDisplay = fecha;
          if (r.timestamp) {
            if (typeof r.timestamp === 'string' && r.timestamp.includes('/')) {
              fechaDisplay = r.timestamp;
              const soloFecha = r.timestamp.split(' ')[0];
              const partes = soloFecha.split('/');
              if (partes.length === 3) {
                let [año, mes, dia] = partes;
                if (año.length === 2) año = '20' + año;
                dia = dia.padStart(2, '0');
                mes = mes.padStart(2, '0');
                fecha = `${año}-${mes}-${dia}`;
              }
            } else if (typeof r.timestamp === 'number') {
              const ts = r.timestamp > 10000000000 ? r.timestamp / 1000 : r.timestamp;
              const dateObj = new Date(ts * 1000);
              fecha = dateObj.toISOString().slice(0, 10);
              fechaDisplay = dateObj.toLocaleString('es-ES');
            }
          }


          const viabilidad = calcularViabilidad(temp, humedad, lluvia/10);

          return {
            date: fecha,
            dateDisplay: fechaDisplay,
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
    const newValue = name === 'cedula' ? value.replace(/\D/g, '') : value;
    setFormData({ ...formData, [name]: newValue });
  };

  const handleCrearUsuarioSubmit = async (formData) => {
    setError(null);
    setSuccess(null);

    if (!formData.nombre || !formData.email || !formData.password) {
      setError('Todos los campos son requeridos');
      return { success: false };
    }

    if (formData.cedula) {
      const { valida, mensaje } = validarCedulaEcuatoriana(formData.cedula);
      if (!valida) {
        setError(mensaje);
        return { success: false };
      }
    }

    if (formData.password !== formData.password_confirm) {
      setError('Las contraseñas no coinciden');
      return { success: false };
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener mínimo 8 caracteres');
      return { success: false };
    }

    try {
      setLoading(true);
      const payload = {
        nombre: formData.nombre,
        email: formData.email,
        cedula: formData.cedula,
        password: formData.password,
        password_confirm: formData.password_confirm,
        rol: formData.rol,
      };
      console.log('📤 Creando usuario, payload:', payload);
      const response = await axios.post(`${apiBaseUrl}/crear-usuario/`, payload);
      console.log('✅ Respuesta del servidor:', response.data);

      setSuccess(`✅ Usuario creado exitosamente`);
      await fetchUsuarios();
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return { success: true };
    } catch (err) {
      console.error('❌ Error al crear usuario:', err.response?.status, err.response?.data);
      const data = err.response?.data;
      let errorMsg = 'No se pudo crear el usuario';
      if (data && typeof data === 'object') {
        if (data.error) {
          const e = String(data.error).toLowerCase();
          if (e.includes('username') || e.includes('auth_user.username')) {
            errorMsg = 'El nombre de usuario ya está registrado';
          } else if (e.includes('email')) {
            errorMsg = 'El correo electrónico ya está registrado';
          } else if (e.includes('cedula')) {
            errorMsg = 'La cédula ya está registrada';
          } else if (e.includes('duplicate entry')) {
            errorMsg = 'Ya existe un usuario con esos datos';
          } else {
            errorMsg = data.error;
          }
        } else if (data.email) {
          errorMsg = 'El correo electrónico ya está registrado';
        } else if (data.cedula) {
          errorMsg = 'La cédula ya está registrada';
        } else if (data.username) {
          errorMsg = 'El nombre de usuario ya existe';
        } else if (data.detail) {
          errorMsg = data.detail;
        } else {
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const val = data[firstKey];
            errorMsg = Array.isArray(val) ? val[0] : String(val);
          }
        }
      } else if (typeof data === 'string' && data.length > 0 && data.length < 200) {
        errorMsg = data;
      }
      setError(`❌ ${errorMsg}`);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const ultimoRegistro = datos.length > 0 ? datos[datos.length - 1] : null;

  const calcularStats = (datosParam) => {
    const d = datosParam || datos;
    if (d.length === 0) return null;
    const temps = d.map((r) => r.temperatura);
    const humeds = d.map((r) => r.humedad);
    const radiaciones = d.map((r) => r.radiacion_solar);
    const precipitaciones = d.map((r) => r.precipitacion);
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
      precipitacionPromedio: average(precipitaciones).toFixed(1),
    };
  };

  const stats = calcularStats();

  const datosFiltradosAdmin = useMemo(() => {
    return datos.filter(d => {
      if (filtroInicioAdmin && d.date < filtroInicioAdmin) return false;
      if (filtroFinAdmin && d.date > filtroFinAdmin) return false;
      return true;
    });
  }, [datos, filtroInicioAdmin, filtroFinAdmin]);

  const statsAdmin = calcularStats(datosFiltradosAdmin);

  const mockHistoricalDataAdmin = datosFiltradosAdmin.slice(-30).map((d) => ({
    fecha: d.date,
    temp: d.temperatura,
    hum: d.humedad,
    rad: Math.round(d.radiacion_solar / 100),
    precip: d.precipitacion,
  }));

  const mockHistoricalData = datos.slice(-30).map((d) => ({
    fecha: d.date,
    temp: d.temperatura,
    hum: d.humedad,
    rad: Math.round(d.radiacion_solar / 100),
    precip: d.precipitacion,
  }));

  const COLORES_CLIMA_ADMIN = ['#f59e0b', '#22c55e', '#3b82f6'];
  const COLORES_CULTIVOS_ADMIN = {
    tomate: '#ef4444', banana: '#f59e0b', cacao: '#8B4513', arroz: '#22c55e', maiz: '#eab308'
  };

  const datosDashboardAdmin = useMemo(() => {
    if (datosFiltradosAdmin.length === 0) return null;
    const totalDias = datosFiltradosAdmin.length;
    const cultivosViables = {
      tomate: datosFiltradosAdmin.filter(d => d.tomate === 'Sí').length,
      banana: datosFiltradosAdmin.filter(d => d.banana === 'Sí').length,
      cacao: datosFiltradosAdmin.filter(d => d.cacao === 'Sí').length,
      arroz: datosFiltradosAdmin.filter(d => d.arroz === 'Sí').length,
      maiz: datosFiltradosAdmin.filter(d => d.maiz === 'Sí').length,
    };
    const viabilidadCultivos = {
      tomate: { porcentaje: ((cultivosViables.tomate / totalDias) * 100).toFixed(1) },
      banana: { porcentaje: ((cultivosViables.banana / totalDias) * 100).toFixed(1) },
      cacao:  { porcentaje: ((cultivosViables.cacao  / totalDias) * 100).toFixed(1) },
      arroz:  { porcentaje: ((cultivosViables.arroz  / totalDias) * 100).toFixed(1) },
      maiz:   { porcentaje: ((cultivosViables.maiz   / totalDias) * 100).toFixed(1) },
    };
    const datosViabilidadPie = [
      { name: 'Tomate', value: parseFloat(viabilidadCultivos.tomate.porcentaje), color: '#ef4444' },
      { name: 'Banana', value: parseFloat(viabilidadCultivos.banana.porcentaje), color: '#f59e0b' },
      { name: 'Cacao',  value: parseFloat(viabilidadCultivos.cacao.porcentaje),  color: '#8B4513' },
      { name: 'Arroz',  value: parseFloat(viabilidadCultivos.arroz.porcentaje),  color: '#22c55e' },
      { name: 'Maíz',   value: parseFloat(viabilidadCultivos.maiz.porcentaje),   color: '#eab308' },
    ];
    const datosBarra = [
      { cultivo: 'Tomate', dias: cultivosViables.tomate, color: '#ef4444' },
      { cultivo: 'Banana', dias: cultivosViables.banana, color: '#f59e0b' },
      { cultivo: 'Cacao',  dias: cultivosViables.cacao,  color: '#8B4513' },
      { cultivo: 'Arroz',  dias: cultivosViables.arroz,  color: '#22c55e' },
      { cultivo: 'Maíz',   dias: cultivosViables.maiz,   color: '#eab308' },
    ];
    let condicionesSecas = 0, condicionesModeradas = 0, excesoLluvias = 0;
    datosFiltradosAdmin.forEach(d => {
      if (d.precipitacion < 5) condicionesSecas++;
      else if (d.precipitacion <= 20) condicionesModeradas++;
      else excesoLluvias++;
    });
    const datosPerfilClimatico = [
      { name: 'Condiciones Secas',      value: condicionesSecas,      porcentaje: ((condicionesSecas      / totalDias) * 100).toFixed(1), color: '#f59e0b' },
      { name: 'Condiciones Moderadas',  value: condicionesModeradas,  porcentaje: ((condicionesModeradas  / totalDias) * 100).toFixed(1), color: '#22c55e' },
      { name: 'Exceso de Lluvias',      value: excesoLluvias,         porcentaje: ((excesoLluvias         / totalDias) * 100).toFixed(1), color: '#3b82f6' },
    ];
    const datosPorMes = {};
    datosFiltradosAdmin.forEach(d => {
      const mes = new Date(d.date).getMonth();
      if (!datosPorMes[mes]) datosPorMes[mes] = { total: 0, tomate: 0, banana: 0, cacao: 0, arroz: 0, maiz: 0 };
      datosPorMes[mes].total++;
      if (d.tomate === 'Sí') datosPorMes[mes].tomate++;
      if (d.banana === 'Sí') datosPorMes[mes].banana++;
      if (d.cacao  === 'Sí') datosPorMes[mes].cacao++;
      if (d.arroz  === 'Sí') datosPorMes[mes].arroz++;
      if (d.maiz   === 'Sí') datosPorMes[mes].maiz++;
    });
    const nombresMeses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const tendenciaMensual = Object.entries(datosPorMes).map(([mes, data]) => ({
      mes: nombresMeses[parseInt(mes)],
      mesNum: parseInt(mes),
      tomate: data.total > 0 ? ((data.tomate / data.total) * 100).toFixed(1) : 0,
      banana: data.total > 0 ? ((data.banana / data.total) * 100).toFixed(1) : 0,
      cacao:  data.total > 0 ? ((data.cacao  / data.total) * 100).toFixed(1) : 0,
      arroz:  data.total > 0 ? ((data.arroz  / data.total) * 100).toFixed(1) : 0,
      maiz:   data.total > 0 ? ((data.maiz   / data.total) * 100).toFixed(1) : 0,
    })).sort((a, b) => a.mesNum - b.mesNum);
    const mejorMesPorCultivo = {};
    ['tomate','banana','cacao','arroz','maiz'].forEach(cultivo => {
      let mejorMes = tendenciaMensual[0];
      tendenciaMensual.forEach(m => { if (parseFloat(m[cultivo]) > parseFloat(mejorMes?.[cultivo] || 0)) mejorMes = m; });
      mejorMesPorCultivo[cultivo] = mejorMes?.mes || 'N/A';
    });
    return { totalDias, viabilidadCultivos, datosViabilidadPie, datosBarra, datosPerfilClimatico, tendenciaMensual, mejorMesPorCultivo };
  }, [datosFiltradosAdmin]);

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
          {['dashboard', 'analisis', 'usuarios'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 font-semibold transition whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-4 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab === 'dashboard' && '📊 Dashboard'}
              {tab === 'analisis' && '📈 Análisis'}
              {tab === 'usuarios' && '👥 Usuarios'}
            </button>
          ))}
        </div>
      </div>

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
        <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a1035 50%, #0f1629 100%)' }}>
          <div className="p-6 space-y-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">Panel de Análisis</p>
                <h2 className="text-3xl font-extrabold text-white">Viabilidad de Cultivos</h2>
                <p className="text-slate-400 text-sm mt-1">
                  {filtroInicioAdmin || filtroFinAdmin
                    ? `Período filtrado: ${filtroInicioAdmin || '—'} → ${filtroFinAdmin || '—'}`
                    : `${datosFiltradosAdmin.length.toLocaleString()} registros analizados`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-white/8 rounded-xl px-4 py-2.5 border border-white/10">
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Desde</label>
                  <input type="date" value={filtroInicioAdmin} onChange={e => setFiltroInicioAdmin(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="bg-transparent text-white text-sm focus:outline-none" style={{ colorScheme: 'dark' }} />
                </div>
                <div className="flex items-center gap-2 bg-white/8 rounded-xl px-4 py-2.5 border border-white/10">
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Hasta</label>
                  <input type="date" value={filtroFinAdmin} onChange={e => setFiltroFinAdmin(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="bg-transparent text-white text-sm focus:outline-none" style={{ colorScheme: 'dark' }} />
                </div>
                {(filtroInicioAdmin || filtroFinAdmin) && (
                  <button onClick={() => { setFiltroInicioAdmin(''); setFiltroFinAdmin(''); }}
                    className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold px-4 py-2.5 rounded-xl transition border border-red-500/30">
                    <X size={14} /> Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* KPI PILLS */}
            {datosDashboardAdmin && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { c: 'tomate', emoji: '🍅', label: 'Tomate' },
                  { c: 'banana', emoji: '🍌', label: 'Banana' },
                  { c: 'cacao',  emoji: '🌰', label: 'Cacao'  },
                  { c: 'arroz',  emoji: '🌾', label: 'Arroz'  },
                  { c: 'maiz',   emoji: '🌽', label: 'Maíz'   },
                ].map(({ c, emoji, label }) => (
                  <div key={c} className="rounded-2xl p-4 border border-white/8 text-center"
                    style={{ background: `linear-gradient(135deg, ${COLORES_CULTIVOS_ADMIN[c]}22, ${COLORES_CULTIVOS_ADMIN[c]}08)` }}>
                    <p className="text-2xl mb-1">{emoji}</p>
                    <p className="text-2xl font-extrabold text-white">{datosDashboardAdmin.viabilidadCultivos[c].porcentaje}%</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: COLORES_CULTIVOS_ADMIN[c] }}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            <DashboardProfesor
              mockHistoricalData={mockHistoricalDataAdmin}
              stats={statsAdmin}
              mockCropRecommendations={mockCropRecommendations}
              ultimoRegistro={ultimoRegistro}
              datos={datosFiltradosAdmin}
              ultimoFirebase={ultimoFirebase}
              onPredicciones={handlePrediccionesActualizadas}
              prediccionesML={prediccionesML}
            />

            {datosDashboardAdmin && (
              <>
                {/* FILA 1: 3 GRÁFICAS */}
                <div className="grid md:grid-cols-3 gap-5">

                  {/* DONUT: Viabilidad */}
                  <div className="rounded-2xl overflow-hidden border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#818cf8' }}>Viabilidad</span>
                      <h3 className="text-base font-bold text-white mt-1">Porcentaje por Cultivo</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Promedio general del período</p>
                    </div>
                    <div className="p-4">
                      <ResponsiveContainer width="100%" height={270}>
                        <PieChart>
                          <Pie data={datosDashboardAdmin.datosViabilidadPie} cx="50%" cy="50%"
                            innerRadius={62} outerRadius={98} paddingAngle={4} dataKey="value">
                            {datosDashboardAdmin.datosViabilidadPie.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [`${v}%`, n]}
                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9', fontSize: '13px' }} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* BAR: Días viables */}
                  <div className="rounded-2xl overflow-hidden border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34d399' }}>Producción</span>
                      <h3 className="text-base font-bold text-white mt-1">Días Viables por Cultivo</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Total de registros favorables</p>
                    </div>
                    <div className="p-4">
                      <ResponsiveContainer width="100%" height={270}>
                        <BarChart data={datosDashboardAdmin.datosBarra} barCategoryGap="28%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="cultivo" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(v) => [`${v.toLocaleString()} días`, 'Viables']}
                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9', fontSize: '13px' }}
                            cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                          <Bar dataKey="dias" radius={[8, 8, 0, 0]}>
                            {datosDashboardAdmin.datosBarra.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* DONUT: Perfil climático */}
                  <div className="rounded-2xl overflow-hidden border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fbbf24' }}>Clima</span>
                      <h3 className="text-base font-bold text-white mt-1">Perfil Climático</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Distribución de condiciones</p>
                    </div>
                    <div className="p-4">
                      <ResponsiveContainer width="100%" height={270}>
                        <PieChart>
                          <Pie data={datosDashboardAdmin.datosPerfilClimatico} cx="50%" cy="50%"
                            innerRadius={62} outerRadius={98} paddingAngle={4} dataKey="value">
                            {datosDashboardAdmin.datosPerfilClimatico.map((entry, i) => (
                              <Cell key={i} fill={COLORES_CLIMA_ADMIN[i]} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n, p) => [`${v} días (${p.payload.porcentaje}%)`, p.payload.name]}
                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9', fontSize: '13px' }} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* FILA 2: LÍNEA + RANKING */}
                <div className="grid md:grid-cols-2 gap-5">

                  {/* LINE CHART */}
                  <div className="rounded-2xl overflow-hidden border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#c084fc' }}>Tendencia</span>
                      <h3 className="text-base font-bold text-white mt-1">Viabilidad Mensual</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Evolución porcentual por mes</p>
                    </div>
                    <div className="p-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={datosDashboardAdmin.tendenciaMensual}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip formatter={(v) => [`${v}%`]}
                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9', fontSize: '13px' }} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
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
                  <div className="rounded-2xl overflow-hidden border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#38bdf8' }}>Ranking</span>
                      <h3 className="text-base font-bold text-white mt-1">Viabilidad por Cultivo</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Ordenado de mayor a menor</p>
                    </div>
                    <div className="p-6 space-y-5">
                      {['tomate','banana','cacao','arroz','maiz']
                        .map(c => ({ c, pct: parseFloat(datosDashboardAdmin.viabilidadCultivos[c].porcentaje) }))
                        .sort((a, b) => b.pct - a.pct)
                        .map(({ c, pct }, i) => (
                          <div key={c}>
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs font-bold text-slate-600 w-4">#{i+1}</span>
                                <span className="text-base">
                                  {c === 'tomate' ? '🍅' : c === 'banana' ? '🍌' : c === 'cacao' ? '🌰' : c === 'arroz' ? '🌾' : '🌽'}
                                </span>
                                <span className="text-sm font-semibold text-slate-200">{c.charAt(0).toUpperCase() + c.slice(1)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: `${COLORES_CULTIVOS_ADMIN[c]}22`, color: COLORES_CULTIVOS_ADMIN[c] }}>
                                  {datosDashboardAdmin.mejorMesPorCultivo[c]}
                                </span>
                                <span className="text-base font-extrabold" style={{ color: COLORES_CULTIVOS_ADMIN[c] }}>{pct}%</span>
                              </div>
                            </div>
                            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
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
                  <div className="rounded-2xl p-6 border border-emerald-500/20 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.1) 100%)' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
                      style={{ background: '#10b981', filter: 'blur(40px)', transform: 'translate(30%, -30%)' }} />
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Top Cultivo</span>
                    <p className="text-4xl mt-3 mb-1">🌰</p>
                    <p className="text-2xl font-extrabold text-white">Cacao</p>
                    <p className="text-emerald-300 text-sm mt-1">{datosDashboardAdmin.viabilidadCultivos.cacao.porcentaje}% de días viables</p>
                  </div>

                  <div className="rounded-2xl p-6 border border-amber-500/20 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.1) 100%)' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
                      style={{ background: '#f59e0b', filter: 'blur(40px)', transform: 'translate(30%, -30%)' }} />
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Clima</span>
                    <div className="mt-3 mb-1"><CloudRain size={28} className="text-amber-300" /></div>
                    <p className="text-xl font-extrabold text-white leading-tight">
                      {datosDashboardAdmin.datosPerfilClimatico.reduce((max, p) => p.value > max.value ? p : max).name}
                    </p>
                    <p className="text-amber-300 text-sm mt-1">
                      {datosDashboardAdmin.datosPerfilClimatico.reduce((max, p) => p.value > max.value ? p : max).porcentaje}% del período
                    </p>
                  </div>

                  <div className="rounded-2xl p-6 border border-blue-500/20 relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(99,102,241,0.1) 100%)' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
                      style={{ background: '#3b82f6', filter: 'blur(40px)', transform: 'translate(30%, -30%)' }} />
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Dataset</span>
                    <div className="mt-3 mb-1"><Database size={28} className="text-blue-300" /></div>
                    <p className="text-3xl font-extrabold text-white">{datosDashboardAdmin.totalDias.toLocaleString()}</p>
                    <p className="text-blue-300 text-sm mt-1">registros procesados</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'usuarios' && (
        <GestionUsuarios 
          usuarios={usuarios}
          apiBaseUrl={apiBaseUrl}
          onRefresh={fetchUsuarios}
          onCrearUsuario={handleCrearUsuarioSubmit}
          loadingCrear={loading}
          errorCrear={error}
          successCrear={success}
        />
      )}
    </div>
  );
};

export default AdministrativosView;
