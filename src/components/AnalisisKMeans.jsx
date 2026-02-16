import React from 'react';
import { BarChart3, Info } from 'lucide-react';

/**
 * AnálisisKMeans - Componente educativo CON IMÁGENES
 * 
 * Muestra las gráficas de:
 * 1. Visualización de Clusters K=3 (PCA)
 * 2. Método del Codo para encontrar K óptimo
 * 
 * Se usa en DashboardProfesor (variante="profesor")
 */

const AnalisisKMeans = ({ 
  variante = 'profesor',
  imagenClusters = null,
  imagenCodo = null
}) => {
  return (
    <div className="space-y-6">
      {/* ╔══════════════════════════════════════════════════════════════╗ */}
      {/* ║ SECCIÓN 1: QUÉ ES K-MEANS Y POR QUÉ LO USAMOS             ║ */}
      {/* ╚══════════════════════════════════════════════════════════════╝ */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-300">
        <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
          <Info className="text-blue-600" size={24} />
          📚 ¿Qué es K-Means y Por Qué Lo Usamos?
        </h3>

        <div className="bg-white p-4 rounded-lg text-sm text-gray-700 space-y-3 leading-relaxed">
          <p>
            <strong>K-Means</strong> es un algoritmo de clustering (agrupamiento) que divide los datos en K grupos basándose en características similares. 
            En nuestro caso, identificamos <strong>3 perfiles climáticos</strong> diferentes en el historial de datos.
          </p>

          <p>
            <strong>¿Por qué lo usamos?</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>🎯 <strong>Clasificar perfiles climáticos:</strong> Agrupa días con condiciones similares</li>
            <li>📊 <strong>Contexto para predicciones:</strong> Sabe qué cultivos son óptimos para cada perfil</li>
            <li>🌾 <strong>Recomendaciones educadas:</strong> No solo predice viabilidad, sino que contextualiza</li>
            <li>📈 <strong>Patrón temporal:</strong> Identifica cuáles perfil ocurre con qué frecuencia</li>
          </ul>

          <p>
            <strong>Los 3 Clusters que identificamos:</strong>
          </p>
          <div className="grid md:grid-cols-3 gap-3 mt-2">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded border-l-4 border-blue-600">
              <strong>🌧️ Cluster 0: Exceso de Lluvia</strong>
              <p className="text-xs mt-1">Precipitación alta, humedad elevada. Óptimo para: Tomate, Banana</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded border-l-4 border-green-600">
              <strong>☁️ Cluster 1: Moderado</strong>
              <p className="text-xs mt-1">Balance entre variables. Óptimo para: Banana, Cacao</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded border-l-4 border-yellow-600">
              <strong>☀️ Cluster 2: Seco</strong>
              <p className="text-xs mt-1">Precipitación baja, humedad reducida. Óptimo para: Maíz, Arroz</p>
            </div>
          </div>
        </div>
      </div>

      {/* ╔══════════════════════════════════════════════════════════════╗ */}
      {/* ║ SECCIÓN 2: VISUALIZACIÓN DE CLUSTERS                        ║ */}
      {/* ╚══════════════════════════════════════════════════════════════╝ */}
      {variante === 'profesor' && (
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="text-purple-600" />
            🎯 Visualización de Clusters K=3 (Reducido por PCA)
          </h4>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {/* IMAGEN DE CLUSTERS */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-300 shadow">
                {imagenClusters ? (
                  <img 
                    src={imagenClusters}
                    alt="Visualización de Clusters K=3"
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="bg-gray-100 p-8 text-center h-80 flex items-center justify-center">
                    <div className="text-gray-500">
                      <p className="text-sm">📊 Gráfica de dispersión (2D)</p>
                      <p className="text-xs mt-2">[Imagen de clusters no disponible]</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                CP1: 47.9% explicada | CP2: % explicada | Cada punto = 1 día del historial
              </p>
            </div>

            {/* DESCRIPCIÓN DE LA GRÁFICA */}
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
              <h5 className="font-semibold text-blue-900 mb-3">📖 ¿Qué ves en esta gráfica?</h5>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">●</span>
                  <div>
                    <strong>Púrpura:</strong> Cluster 0 - Exceso de lluvia
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">●</span>
                  <div>
                    <strong>Azul/Cian:</strong> Cluster 1 - Condiciones moderadas
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-500 font-bold">●</span>
                  <div>
                    <strong>Amarillo:</strong> Cluster 2 - Condiciones secas
                  </div>
                </div>
                <hr className="my-2" />
                <p className="text-xs">
                  <strong>📍 Cada punto</strong> representa un día del historial meteorológico
                </p>
                <p className="text-xs">
                  <strong>📐 Ejes:</strong> Componentes principales (2D de 5D)
                </p>
                <p className="text-xs text-green-700 bg-green-50 p-2 rounded">
                  ✓ La separación clara indica que K=3 es buena elección
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded text-sm text-gray-700">
            <strong>💡 ¿Por qué usamos PCA (Análisis de Componentes Principales)?</strong>
            <p className="mt-2">
              Nuestros datos tienen 5 características (Temperatura, Radiación, Humedad Suelo, Humedad Relativa, Precipitación). 
              PCA reduce esto a 2 dimensiones para poder visualizar en una gráfica 2D sin perder información importante (47.9% + X% de varianza explicada).
            </p>
          </div>
        </div>
      )}

      {/* ╔══════════════════════════════════════════════════════════════╗ */}
      {/* ║ SECCIÓN 3: MÉTODO DEL CODO                                  ║ */}
      {/* ╚══════════════════════════════════════════════════════════════╝ */}
      {variante === 'profesor' && (
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="text-green-600" />
            📊 Método del Codo: ¿Cómo Elegimos K=3?
          </h4>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            {/* IMAGEN DEL CODO */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-300 shadow">
                {imagenCodo ? (
                  <img 
                    src={imagenCodo}
                    alt="Método del Codo"
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="bg-gray-100 p-8 text-center h-80 flex items-center justify-center">
                    <div className="text-gray-500">
                      <p className="text-sm">📈 Método del Codo (Elbow)</p>
                      <p className="text-xs mt-2">[Imagen no disponible]</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                WCSS (Within-Cluster Sum of Squares) vs Número de Clusters (K)
              </p>
            </div>

            {/* DESCRIPCIÓN DEL MÉTODO */}
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
              <h5 className="font-semibold text-green-900 mb-3">📖 ¿Por qué K=3?</h5>
              <div className="space-y-2 text-sm text-gray-700">
                <div>
                  <strong>K=1:</strong> WCSS = 3400 (máxima dispersión)
                </div>
                <div>
                  <strong>K=2:</strong> WCSS = 2200 (mejora)
                </div>
                <div className="bg-green-100 p-2 rounded border-2 border-green-600">
                  <strong>K=3:</strong> WCSS = 1080 <br/>
                  <span className="text-green-700">✓ "El codo" - Punto de inflexión</span>
                </div>
                <div>
                  <strong>K=4:</strong> WCSS = 1050 (poca mejora)
                </div>
                <div>
                  <strong>K=9:</strong> WCSS = 600 (poca mejora)
                </div>
                <hr className="my-2" />
                <p className="text-xs text-green-700 bg-green-50 p-2 rounded">
                  ✓ Después de K=3, mejorar es mínimo pero añade complejidad
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded text-sm text-gray-700">
            <strong>💡 ¿Qué es el Método del Codo?</strong>
            <p className="mt-2">
              Es una técnica para encontrar el K óptimo en K-Means. Graficamos WCSS (varianza dentro de clusters) vs K. 
              Buscamos el punto donde la curva hace un "codo" (cambio de pendiente). En nuestro caso, ese codo está claramente en K=3.
            </p>
            <p className="mt-2 text-green-700 font-semibold">
              📊 Conclusión: K=3 es el balance perfecto entre precisión y simplicidad.
            </p>
          </div>
        </div>
      )}

      {/* ╔══════════════════════════════════════════════════════════════╗ */}
      {/* ║ SECCIÓN 4: RESUMEN Y BENEFICIOS                            ║ */}
      {/* ╚══════════════════════════════════════════════════════════════╝ */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-300">
        <h3 className="text-lg font-bold text-green-900 mb-4">
          ✨ Beneficios del Análisis K-Means en Nuestro Sistema
        </h3>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <strong className="text-green-700 flex items-center gap-2 mb-3">
              👨‍🏫 Para Profesores:
            </strong>
            <ul className="text-gray-700 space-y-2 text-sm">
              <li>✓ <strong>Enseñanza práctica de ML:</strong> Clustering en datos reales</li>
              <li>✓ <strong>PCA explicado:</strong> Reducción de dimensionalidad visual</li>
              <li>✓ <strong>Método del codo:</strong> Selección de hiperparámetros</li>
              <li>✓ <strong>Caso de uso agrícola:</strong> Contexto práctico y relevante</li>
            </ul>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <strong className="text-green-700 flex items-center gap-2 mb-3">
              👨‍🌾 Para Estudiantes:
            </strong>
            <ul className="text-gray-700 space-y-2 text-sm">
              <li>✓ <strong>Predicciones contextualizadas:</strong> No solo sí/no, sino por qué</li>
              <li>✓ <strong>Comprensión del modelo:</strong> Entienden cómo se eligió K=3</li>
              <li>✓ <strong>Análisis de datos real:</strong> Trabajan con datos meteorológicos reales</li>
              <li>✓ <strong>ML accesible:</strong> Aprenden algoritmos avanzados de forma práctica</li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-3 rounded text-sm text-gray-700">
          <strong>📌 Resumen del modelo:</strong> Usamos K-Means con K=3 (seleccionado por método del codo) 
          para clasificar 365 días de datos meteorológicos en 3 perfiles climáticos. Esto permite dar predicciones 
          contextualizadas de viabilidad de cultivos, mejorando la experiencia educativa y la precisión del modelo.
        </div>
      </div>
    </div>
  );
};

export default AnalisisKMeans;