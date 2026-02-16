import Papa from 'papaparse';

/**
 * MLService - VERSIÓN 3.0 CORREGIDA
 * 
 * CORRECCIONES PRINCIPALES:
 * 1. ✅ Confianza INDIVIDUAL por cultivo (no la misma para todos)
 * 2. ✅ Sincronización entre K-Means y viabilidad calculada
 * 3. ✅ Resumen que refleja TODOS los cultivos viables
 * 4. ✅ Lógica de viabilidad mejorada con rangos óptimos por cultivo
 */

class MLService {
  constructor() {
    this.cultivosData = [];
    this.isLoaded = false;
    this.cultivos = ['Tomate', 'Banana', 'Cacao', 'Arroz', 'Maiz'];
    this.datosExternos = [];

    // Centroides del modelo K-Means (K=3)
    this.centroides = [
      {
        id: 0,
        nombre: '🌧️ Exceso de Lluvias',
        descripcion: 'Días con precipitación alta y humedad elevada',
        cultivos_optimos: ['Tomate', 'Banana'],
        temperatura: 25.14,
        radiacion: 4.94,
        humedad_suelo: 84.42,
        humedad_relativa: 84.41,
        pluviometria: 35.86,
        tipo_cultivo_optimo: 1.27,
        tamaño: 64,
        color: '#3b82f6'
      },
      {
        id: 1,
        nombre: '☁️ Condiciones Moderadas',
        descripcion: 'Días con balance entre temperatura, humedad y radiación',
        cultivos_optimos: ['Banana', 'Cacao'],
        temperatura: 26.25,
        radiacion: 4.89,
        humedad_suelo: 83.84,
        humedad_relativa: 83.87,
        pluviometria: 7.01,
        tipo_cultivo_optimo: 2.10,
        tamaño: 241,
        color: '#10b981'
      },
      {
        id: 2,
        nombre: '☀️ Condiciones Secas',
        descripcion: 'Días con baja precipitación y humedad reducida',
        cultivos_optimos: ['Maiz', 'Arroz', 'Cacao'],
        temperatura: 26.29,
        radiacion: 4.50,
        humedad_suelo: 78.45,
        humedad_relativa: 75.38,
        pluviometria: 1.32,
        tipo_cultivo_optimo: 2.46,
        tamaño: 261,
        color: '#f59e0b'
      }
    ];

    // ⭐ NUEVO: Rangos óptimos por cultivo para calcular confianza individual
    this.rangosOptimos = {
      Tomate: {
        temp: { min: 20, max: 32, optimo: 26 },
        humedad: { min: 50, max: 85, optimo: 70 },
        lluvia: { min: 1, max: 15, optimo: 8 }
      },
      Banana: {
        temp: { min: 20, max: 32, optimo: 27 },
        humedad: { min: 60, max: 90, optimo: 80 },
        lluvia: { min: 2, max: 35, optimo: 15 }
      },
      Cacao: {
        temp: { min: 21, max: 32, optimo: 25 },
        humedad: { min: 70, max: 95, optimo: 85 },
        lluvia: { min: 0, max: 45, optimo: 10 }
      },
      Arroz: {
        temp: { min: 22, max: 32, optimo: 28 },
        humedad: { min: 70, max: 95, optimo: 85 },
        lluvia: { min: 2, max: 30, optimo: 12 }
      },
      Maiz: {
        temp: { min: 20, max: 32, optimo: 26 },
        humedad: { min: 50, max: 80, optimo: 65 },
        lluvia: { min: 1, max: 20, optimo: 8 }
      }
    };
  }

  // ========================================================================
  // ⭐ CALCULAR VIABILIDAD (Sí/No) - Rangos actualizados para Milagro, Ecuador
  // ========================================================================
  calcularViabilidad(temp, humedad, lluvia) {
    return {
      Tomate: (temp >= 20 && temp <= 32 && lluvia >= 1 && lluvia <= 15 && humedad >= 50 && humedad <= 85) ? 'Sí' : 'No',
      Banana: (temp >= 20 && temp <= 32 && lluvia >= 2 && lluvia <= 35) ? 'Sí' : 'No',
      Cacao: (temp >= 21 && temp <= 32 && lluvia < 45) ? 'Sí' : 'No',
      Arroz: (temp >= 22 && temp <= 32 && lluvia >= 2 && lluvia <= 30) ? 'Sí' : 'No',
      Maiz: (temp >= 20 && temp <= 32 && lluvia >= 1 && lluvia <= 20) ? 'Sí' : 'No',
    };
  }

  // ========================================================================
  // ⭐ NUEVO: Calcular confianza INDIVIDUAL por cultivo
  // ========================================================================
  calcularConfianzaIndividual(cultivo, temp, humedad, lluvia) {
    const rangos = this.rangosOptimos[cultivo];
    if (!rangos) return 50;

    // Calcular qué tan cerca está cada variable del óptimo
    const calcularPuntuacion = (valor, rango) => {
      if (valor < rango.min || valor > rango.max) {
        // Fuera del rango: calcular penalización
        const distancia = valor < rango.min 
          ? rango.min - valor 
          : valor - rango.max;
        const rangoTotal = rango.max - rango.min;
        const penalizacion = Math.min(distancia / rangoTotal, 1);
        return Math.max(0, 50 - (penalizacion * 50));
      }
      
      // Dentro del rango: calcular cercanía al óptimo
      const distanciaAlOptimo = Math.abs(valor - rango.optimo);
      const maxDistancia = Math.max(rango.optimo - rango.min, rango.max - rango.optimo);
      const cercania = 1 - (distanciaAlOptimo / maxDistancia);
      return 50 + (cercania * 50);
    };

    const puntuacionTemp = calcularPuntuacion(temp, rangos.temp);
    const puntuacionHumedad = calcularPuntuacion(humedad, rangos.humedad);
    const puntuacionLluvia = calcularPuntuacion(lluvia, rangos.lluvia);

    // Promedio ponderado (temperatura y lluvia son más críticos)
    const confianza = (puntuacionTemp * 0.35) + (puntuacionHumedad * 0.25) + (puntuacionLluvia * 0.40);
    
    return Math.min(100, Math.max(0, confianza));
  }

  // ========================================================================
  // ⭐ NUEVO: Obtener razón de NO viabilidad
  // ========================================================================
  obtenerRazonNoViable(cultivo, temp, humedad, lluvia) {
    const rangos = this.rangosOptimos[cultivo];
    const razones = [];

    if (temp < rangos.temp.min) razones.push(`Temp. muy baja (${temp}°C < ${rangos.temp.min}°C)`);
    if (temp > rangos.temp.max) razones.push(`Temp. muy alta (${temp}°C > ${rangos.temp.max}°C)`);
    if (humedad < rangos.humedad.min) razones.push(`Humedad baja (${humedad}% < ${rangos.humedad.min}%)`);
    if (humedad > rangos.humedad.max) razones.push(`Humedad alta (${humedad}% > ${rangos.humedad.max}%)`);
    if (lluvia < rangos.lluvia.min) razones.push(`Lluvia insuficiente (${lluvia}mm < ${rangos.lluvia.min}mm)`);
    if (lluvia > rangos.lluvia.max) razones.push(`Lluvia excesiva (${lluvia}mm > ${rangos.lluvia.max}mm)`);

    return razones.length > 0 ? razones.join(', ') : 'Condiciones no óptimas';
  }

  /**
   * Cargar CSV desde la carpeta public
   */
  async cargarCSV() {
    return new Promise((resolve, reject) => {
      if (this.isLoaded) {
        resolve(this.cultivosData);
        return;
      }

      fetch('/cultivos_viabilidad_FINAL.csv')
        .then(response => response.text())
        .then(csvText => {
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              this.cultivosData = results.data;
              this.isLoaded = true;
              resolve(this.cultivosData);
            },
            error: (error) => {
              console.error('❌ Error parsing CSV:', error);
              reject(error);
            }
          });
        })
        .catch(error => reject(error));
    });
  }

  /**
   * CLASIFICAR CONDICIONES EN UN CLUSTER (K-Means)
   */
  clasificarCluster(temperatura, radiacion, humedadSuelo, humedadRelativa, pluviometria) {
    let mejorCluster = null;
    let menorDistancia = Infinity;

    this.centroides.forEach(centroide => {
      const distancia = Math.sqrt(
        Math.pow((centroide.temperatura - temperatura) / 10, 2) +
        Math.pow((centroide.radiacion - radiacion) / 5, 2) +
        Math.pow((centroide.humedad_suelo - humedadSuelo) / 100, 2) +
        Math.pow((centroide.humedad_relativa - humedadRelativa) / 100, 2) +
        Math.pow((centroide.pluviometria - pluviometria) / 50, 2)
      );

      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        mejorCluster = centroide;
      }
    });

    const confianza = Math.max(0, 100 - menorDistancia * 100);

    return {
      cluster_id: mejorCluster.id,
      cluster_nombre: mejorCluster.nombre,
      cluster_descripcion: mejorCluster.descripcion,
      cultivos_optimos: mejorCluster.cultivos_optimos,
      distancia: parseFloat(menorDistancia.toFixed(3)),
      confianza: parseFloat(confianza.toFixed(1)),
      color: mejorCluster.color,
      tamaño_cluster: mejorCluster.tamaño
    };
  }

  /**
   * ⭐ PREDICCIÓN MEJORADA CON CONFIANZA INDIVIDUAL
   */
  async predecirCultivos(temperatura, radiacion, humedadSuelo, humedadRelativa, pluviometria) {
    if (!this.isLoaded) {
      await this.cargarCSV();
    }

    // 1. Clasificar el cluster
    const clusterInfo = this.clasificarCluster(
      temperatura,
      radiacion,
      humedadSuelo,
      humedadRelativa,
      pluviometria
    );

    // 2. Calcular viabilidad binaria (Sí/No)
    const viabilidadCalculada = this.calcularViabilidad(temperatura, humedadRelativa, pluviometria);

    // 3. ⭐ Generar predicciones con CONFIANZA INDIVIDUAL
    const predicciones = this.cultivos.map(cultivo => {
      const esViable = viabilidadCalculada[cultivo] === 'Sí';
      const esOptimoEnCluster = clusterInfo.cultivos_optimos.includes(cultivo);
      
      // ⭐ Calcular confianza ESPECÍFICA para este cultivo
      const confianzaIndividual = this.calcularConfianzaIndividual(
        cultivo, 
        temperatura, 
        humedadRelativa, 
        pluviometria
      );

      // Si no es viable, obtener la razón
      const razonNoViable = !esViable 
        ? this.obtenerRazonNoViable(cultivo, temperatura, humedadRelativa, pluviometria)
        : null;

      return {
        cultivo,
        viabilidad: esViable,
        confianza: parseFloat(confianzaIndividual.toFixed(1)),
        es_optimo_en_cluster: esOptimoEnCluster,
        razon_no_viable: razonNoViable,
        prediccion_temperatura: parseFloat(temperatura.toFixed(1)),
        prediccion_humedad: parseFloat(humedadRelativa.toFixed(1)),
        prediccion_precipitacion: parseFloat(pluviometria.toFixed(1)),
        modelo_version: '3.0',
        generado_en: new Date().toISOString(),
      };
    });

    // 4. Calcular distancia mínima al CSV para referencia
    let menorDistancia = Infinity;
    this.cultivosData.forEach(row => {
      if (!row.Temperatura) return;

      const rowTemp = parseFloat(row.Temperatura) || 0;
      const rowRad = parseFloat(row.RadiacionsolarpromediokWm2) || 0;
      const rowHumedadSuelo = parseFloat(row.HumedadSuelo) || 0;
      const rowHumedadRel = parseFloat(row.Humedadrelativa) || 0;
      const rowPluv = parseFloat(row.Pluviometria) || 0;

      const distancia = Math.sqrt(
        Math.pow((rowTemp - temperatura) / 10, 2) +
        Math.pow((rowRad - radiacion) / 5, 2) +
        Math.pow((rowHumedadSuelo - humedadSuelo) / 100, 2) +
        Math.pow((rowHumedadRel - humedadRelativa) / 100, 2) +
        Math.pow((rowPluv - pluviometria) / 50, 2)
      );

      if (distancia < menorDistancia) {
        menorDistancia = distancia;
      }
    });

    return {
      success: true,
      cluster: clusterInfo,
      predicciones,
      distanciaMinima: parseFloat(menorDistancia.toFixed(3)),
      resumen: this.generarResumen(clusterInfo, predicciones)
    };
  }

  /**
   * ⭐ RESUMEN MEJORADO - Muestra TODOS los cultivos viables
   */
  generarResumen(clusterInfo, predicciones) {
    const viables = predicciones.filter(p => p.viabilidad);
    const noViables = predicciones.filter(p => !p.viabilidad);
    const optimosEnCluster = predicciones.filter(p => p.es_optimo_en_cluster);

    let resumen = `Perfil: ${clusterInfo.cluster_nombre} (${clusterInfo.confianza.toFixed(0)}% confianza)\n`;

    if (viables.length === 0) {
      resumen += `⚠️ Ningún cultivo es viable con las condiciones actuales.\n`;
      if (noViables.length > 0) {
        resumen += `\n❌ Razones:\n`;
        noViables.slice(0, 3).forEach(p => {
          resumen += `  • ${p.cultivo}: ${p.razon_no_viable}\n`;
        });
      }
    } else {
      // ⭐ MOSTRAR TODOS los cultivos viables
      const viablesConConfianza = viables
        .map(p => `${p.cultivo} (${p.confianza.toFixed(0)}%)`)
        .join(', ');
      resumen += `✅ Cultivos viables: ${viablesConConfianza}\n`;

      // Destacar los óptimos del cluster que son viables
      const optimosViables = viables.filter(p => p.es_optimo_en_cluster);
      if (optimosViables.length > 0) {
        resumen += `⭐ Recomendados para este perfil: ${optimosViables.map(p => p.cultivo).join(', ')}\n`;
      }
    }

    return resumen;
  }

  /**
   * Obtener estadísticas del CSV
   */
  async obtenerEstadisticas() {
    if (!this.isLoaded) {
      await this.cargarCSV();
    }

    const stats = {
      totalRegistros: this.cultivosData.length,
      temperaturaRango: { min: Infinity, max: -Infinity },
      humedadRango: { min: Infinity, max: -Infinity },
      radiacionRango: { min: Infinity, max: -Infinity },
      clusters: this.centroides.map(c => ({
        nombre: c.nombre,
        tamaño: c.tamaño,
        porcentaje: ((c.tamaño / this.cultivosData.length) * 100).toFixed(1) + '%'
      }))
    };

    this.cultivosData.forEach(row => {
      if (!row.Temperatura) return;

      const temp = parseFloat(row.Temperatura) || 0;
      const hum = parseFloat(row.Humedadrelativa) || 0;
      const rad = parseFloat(row.RadiacionsolarpromediokWm2) || 0;

      if (temp < stats.temperaturaRango.min) stats.temperaturaRango.min = temp;
      if (temp > stats.temperaturaRango.max) stats.temperaturaRango.max = temp;
      if (hum < stats.humedadRango.min) stats.humedadRango.min = hum;
      if (hum > stats.humedadRango.max) stats.humedadRango.max = hum;
      if (rad < stats.radiacionRango.min) stats.radiacionRango.min = rad;
      if (rad > stats.radiacionRango.max) stats.radiacionRango.max = rad;
    });

    return stats;
  }

  obtenerCluster(clusterId) {
    return this.centroides.find(c => c.id === clusterId);
  }

  obtenerTodosClusters() {
    return this.centroides;
  }

  obtenerDatosExternos() {
    return this.datosExternos;
  }

  obtenerUltimoDatoExterno() {
    if (this.datosExternos.length === 0) return null;
    return this.datosExternos[this.datosExternos.length - 1];
  }
}

export default new MLService();
