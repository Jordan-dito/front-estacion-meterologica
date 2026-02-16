import React from 'react';
import { LogOut } from 'lucide-react';

/**
 * Dashboard - Componente principal después de login
 * Renderiza diferentes vistas según el rol del usuario
 */
const Dashboard = ({ user, onLogout, apiBaseUrl }) => {
  console.log('Dashboard cargado con usuario:', user);
  console.log('API Base URL:', apiBaseUrl);

  // Validar que el usuario existe
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando usuario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <header className="bg-green-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🌾 Sistema Meteorológico - Campus Milagro</h1>
            <p className="text-sm text-green-100">Universidad Agraria del Ecuador</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{user?.nombre || user?.first_name || user?.username || 'Usuario'}</p>
              <p className="text-xs text-green-100">{user?.rol_display || user?.rol || 'Sin rol'}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-green-600 hover:bg-green-800 px-4 py-2 rounded-lg flex items-center gap-2 transition duration-200"
            >
              <LogOut size={18} />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            ✅ ¡BIENVENIDO AL SISTEMA METEOROLÓGICO!
          </h2>

          {/* INFO DEL USUARIO */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-gray-600 text-sm font-semibold">Nombre</p>
              <p className="text-lg font-bold text-blue-600">
                {user?.nombre || user?.first_name || user?.username}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-gray-600 text-sm font-semibold">Email</p>
              <p className="text-lg font-bold text-green-600">{user?.email || 'N/A'}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-gray-600 text-sm font-semibold">Rol</p>
              <p className="text-lg font-bold text-purple-600">
                {user?.rol_display || user?.rol}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-gray-600 text-sm font-semibold">Estado</p>
              <p className="text-lg font-bold text-orange-600">Autenticado</p>
            </div>
          </div>

          {/* CONTENIDO POR ROL */}
          <div className="space-y-6">
            {/* ESTUDIANTE */}
            {user?.rol === 'estudiante' && (
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-8 rounded-lg border-2 border-blue-300">
                <div className="flex items-start gap-4">
                  <span className="text-5xl">👨‍🎓</span>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-900 mb-2">Vista de Estudiante</h3>
                    <p className="text-blue-800 mb-4">
                      Como estudiante, tienes acceso a:
                    </p>
                    <ul className="space-y-2 text-blue-800">
                      <li>✓ Visualizar datos meteorológicos en tiempo real</li>
                      <li>✓ Ver gráficas y estadísticas del campus</li>
                      <li>✓ Consultar datos históricos</li>
                      <li>✓ Descargar reportes en CSV</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* PROFESOR */}
            {user?.rol === 'profesor' && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-8 rounded-lg border-2 border-green-300">
                <div className="flex items-start gap-4">
                  <span className="text-5xl">👨‍🏫</span>
                  <div>
                    <h3 className="text-2xl font-bold text-green-900 mb-2">Vista de Profesor</h3>
                    <p className="text-green-800 mb-4">
                      Como profesor, tienes acceso a:
                    </p>
                    <ul className="space-y-2 text-green-800">
                      <li>✓ Ver todos los datos meteorológicos con análisis detallados</li>
                      <li>✓ Acceder a predicciones generadas por el modelo ML</li>
                      <li>✓ Ver estadísticas avanzadas por periodo</li>
                      <li>✓ Exportar datos para investigación</li>
                      <li>✓ Crear reportes personalizados</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* ADMINISTRATIVO */}
            {user?.rol === 'administrativo' && (
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-8 rounded-lg border-2 border-purple-300">
                <div className="flex items-start gap-4">
                  <span className="text-5xl">👨‍💼</span>
                  <div>
                    <h3 className="text-2xl font-bold text-purple-900 mb-2">Panel Administrativo</h3>
                    <p className="text-purple-800 mb-4">
                      Como administrador, tienes acceso completo a:
                    </p>
                    <ul className="space-y-2 text-purple-800">
                      <li>✓ Gestionar usuarios (crear, editar, eliminar)</li>
                      <li>✓ Ver estadísticas generales del sistema</li>
                      <li>✓ Configurar parámetros de temperatura, humedad, etc.</li>
                      <li>✓ Acceder a datos meteorológicos completos</li>
                      <li>✓ Ver predicciones ML</li>
                      <li>✓ Generar reportes administrativos</li>
                      <li>✓ Gestionar la BD del sistema</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* BACKEND CONNECTION */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
              <h4 className="font-bold text-yellow-900 mb-3">🔌 Estado de Conexión</h4>
              <div className="space-y-2 text-yellow-800">
                <p>
                  <span className="font-semibold">Backend URL:</span>{' '}
                  <code className="bg-white px-2 py-1 rounded font-mono text-sm">
                    {apiBaseUrl}
                  </code>
                </p>
                <p>
                  <span className="font-semibold">Autenticación:</span> ✅ JWT Token Activo
                </p>
                <p>
                  <span className="font-semibold">Estado:</span> ✅ Conectado al Backend
                </p>
              </div>
            </div>
          </div>

          {/* NEXT STEPS */}
          <div className="mt-8 bg-green-50 border-2 border-green-300 rounded-lg p-6">
            <h4 className="font-bold text-green-900 mb-3">📝 Próximos Pasos</h4>
            <ol className="list-decimal list-inside space-y-2 text-green-800">
              <li>Navega usando los tabs o menús disponibles</li>
              <li>Consulta los datos meteorológicos</li>
              <li>{user?.rol === 'administrativo' ? 'Gestiona usuarios y configuración del sistema' : 'Genera reportes según necesites'}</li>
              <li>Usa el botón "Salir" cuando termines</li>
            </ol>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">© 2025 Universidad Agraria del Ecuador - Campus Milagro</p>
          <p className="text-xs text-gray-400 mt-1">
            Prototipo de Estación Meteorológica Experimental
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;