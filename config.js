// ============================================
// CAFI POS - CONFIGURACIÓN
// ============================================

const CONFIG = {
  // URL del backend en Heroku
  API_URL: 'https://cafi-pos-api-931181c1d00b.herokuapp.com',
  
  // Versión
  VERSION: '2.0.0',
  
  // Tiempo de espera para requests (ms)
  TIMEOUT: 30000,
  
  // Reintentos en caso de error
  RETRIES: 3
};

// No modificar - se usa para verificar conectividad
CONFIG.HEALTH_URL = CONFIG.API_URL + '/health';
