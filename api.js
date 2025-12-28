// ============================================
// CAFI POS - API CLIENT (Heroku Backend)
// ============================================

const API = {
  async request(endpoint, method = 'GET', data = null) {
    const url = CONFIG.API_URL + endpoint;
    
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, options);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // ========== AUTH ==========
  async login(email, password) {
    return this.request('/api/auth/login', 'POST', { email, password });
  },

  // ========== CARGA INICIAL ==========
  async cargarDatos(empresaID) {
    return this.request(`/api/pos/cargar/${empresaID}`);
  },

  // ========== PRODUCTOS ==========
  async getProductos(empresaID) {
    return this.request(`/api/productos/${empresaID}`);
  },

  async crearProducto(data) {
    return this.request('/api/productos', 'POST', data);
  },

  async editarProducto(id, data) {
    return this.request(`/api/productos/${id}`, 'PUT', data);
  },

  async eliminarProducto(id) {
    return this.request(`/api/productos/${id}`, 'DELETE');
  },

  // ========== CLIENTES ==========
  async getClientes(empresaID) {
    return this.request(`/api/clientes/${empresaID}`);
  },

  async crearCliente(data) {
    return this.request('/api/clientes', 'POST', data);
  },

  async editarCliente(id, data) {
    return this.request(`/api/clientes/${id}`, 'PUT', data);
  },

  async eliminarCliente(id) {
    return this.request(`/api/clientes/${id}`, 'DELETE');
  },

  // ========== VENTAS ==========
  async crearVenta(data) {
    return this.request('/api/ventas', 'POST', data);
  },

  async getVentasHoy(empresaID, sucursalID) {
    return this.request(`/api/ventas/hoy/${empresaID}/${sucursalID}`);
  },

  async getVentasEnEspera(empresaID, sucursalID) {
    return this.request(`/api/ventas/espera/${empresaID}/${sucursalID}`);
  },

  async getVentasPendientes(empresaID, sucursalID) {
    return this.request(`/api/ventas/pendientes/${empresaID}/${sucursalID}`);
  },

  async actualizarEstatusVenta(ventaID, estatus) {
    return this.request(`/api/ventas/estatus/${ventaID}`, 'PUT', { estatus });
  },

  async actualizarVentaEnEspera(ventaID, data) {
    return this.request(`/api/ventas/espera/${ventaID}`, 'PUT', data);
  },

  async reabrirVenta(ventaID) {
    return this.request(`/api/ventas/reabrir/${ventaID}`, 'PUT');
  },

  async cancelarVenta(ventaID) {
    return this.request(`/api/ventas/cancelar/${ventaID}`, 'PUT');
  },

  async agregarAbono(data) {
    return this.request('/api/ventas/abono', 'POST', data);
  },

  async cancelarDetalleVenta(detalleID) {
    return this.request(`/api/ventas/detalle/cancelar/${detalleID}`, 'PUT');
  },

  async getSiguienteTicket(empresaID, sucursalID) {
    return this.request(`/api/ventas/ticket/${empresaID}/${sucursalID}`);
  },

  // ========== TURNOS ==========
  async verificarTurno(empresaID, sucursalID, usuarioEmail) {
    return this.request(`/api/turnos/verificar/${empresaID}/${sucursalID}/${encodeURIComponent(usuarioEmail)}`);
  },

  async abrirTurno(data) {
    return this.request('/api/turnos/abrir', 'POST', data);
  },

  async cerrarTurno(data) {
    return this.request('/api/turnos/cerrar', 'POST', data);
  },

  async registrarMovimiento(data) {
    return this.request('/api/turnos/movimiento', 'POST', data);
  },

  async calcularResumenTurno(data) {
    return this.request('/api/turnos/resumen', 'POST', data);
  },

  // ========== CATÁLOGOS ==========
  async getProveedores(empresaID) {
    return this.request(`/api/catalogos/proveedores/${empresaID}`);
  },

  async getMetodosPago(empresaID) {
    return this.request(`/api/catalogos/metodos-pago/${empresaID}`);
  },

  async getMarcas(empresaID) {
    return this.request(`/api/catalogos/marcas/${empresaID}`);
  },

  async getCategorias(empresaID) {
    return this.request(`/api/catalogos/categorias/${empresaID}`);
  }
};
