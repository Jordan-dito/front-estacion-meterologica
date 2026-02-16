import React, { useState } from 'react';
import ModalOlvideContrasena from './ModalOlvideContrasena';

const Login = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  
  // Estado para el modal de recuperación
  const [modalRecuperarOpen, setModalRecuperarOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    try {
      const success = await onLogin(username, password);
      if (!success) {
        setLocalError(error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setLocalError('Error inesperado');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        {/* HEADER */}
        <div className="text-center mb-8">
          <img 
            src="/logo.jpg" 
            alt="UAE Logo" 
            className="h-20 w-20 rounded-full object-cover mx-auto"
          />
          <h2 className="text-2xl font-bold text-gray-800 mt-2">Estación Meteorológica</h2>
          <p className="text-gray-600 mt-2">Campus Milagro</p>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* USERNAME */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ingrese usuario"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              disabled={loading}
              required
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
              disabled={loading}
              required
            />
          </div>

          {/* LINK OLVIDÉ CONTRASEÑA */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setModalRecuperarOpen(true)}
              className="text-sm text-green-600 hover:text-green-700 hover:underline transition"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* ERRORES */}
          {(localError || error) && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p className="text-sm">{localError || error}</p>
            </div>
          )}

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* FOOTER */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Universidad Agraria del Ecuador - Campus Milagro</p>
          <p>© 2025 - Todos los derechos reservados</p>
        </div>
      </div>

      {/* MODAL DE RECUPERACIÓN */}
      <ModalOlvideContrasena 
        isOpen={modalRecuperarOpen}
        onClose={() => setModalRecuperarOpen(false)}
      />
    </div>
  );
};

export default Login;
