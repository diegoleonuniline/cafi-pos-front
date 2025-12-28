// ============================================
// CAFI POS - API CLIENT (Heroku Backend)
// ============================================

const API = {
  // Método base para hacer requests
  async request(endpoint, options = {}) {
    const url = CONFIG.API_URL + endpoint;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await fetch(url, finalOptions);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error en la solicitud');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // ========== AUTH ==========
  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
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
    return this.request('/api/productos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async editarProducto(id, data) {
    return this.request(`/api/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async eliminarProducto(id) {
    return this.request(`/api/productos/${id}`, {
      method: 'DELETE'
    });
  },

  // ========== CLIENTES ==========
  async getClientes(empresaID) {
    return this.request(`/api/clientes/${empresaID}`);
  },

  async crearCliente(data) {
    return this.request('/api/clientes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async editarCliente(id, data) {
    return this.request(`/api/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async eliminarCliente(id) {
    return this.request(`/api/clientes/${id}`, {
      method: 'DELETE'
    });
  },

  // ========== VENTAS ==========
  async crearVenta(data) {
    return this.request('/api/ventas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
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
    return this.request(`/api/ventas/${ventaID}/estatus`, {
      method: 'PUT',
      body: JSON.stringify({ estatus })
    });
  },

  async actualizarVentaEnEspera(data) {
    return this.request(`/api/ventas/${data.ventaID}/espera`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async agregarAbono(data) {
    return this.request('/api/ventas/abono', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async cancelarDetalleVenta(detalleID) {
    return this.request(`/api/ventas/detalle/${detalleID}/cancelar`, {
      method: 'PUT'
    });
  },

  // ========== TURNOS ==========
  async verificarTurno(empresaID, sucursalID, usuarioEmail) {
    return this.request(`/api/turnos/verificar/${empresaID}/${sucursalID}/${encodeURIComponent(usuarioEmail)}`);
  },

  async abrirTurno(data) {
    return this.request('/api/turnos/abrir', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async cerrarTurno(data) {
    return this.request('/api/turnos/cerrar', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async registrarMovimiento(data) {
    return this.request('/api/turnos/movimiento', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async calcularResumenTurno(turnoID, empresaID, sucursalID, usuarioEmail) {
    return this.request('/api/turnos/resumen', {
      method: 'POST',
      body: JSON.stringify({ turnoID, empresaID, sucursalID, usuarioEmail })
    });
  },

  // ========== CATÁLOGOS ==========
  async getProveedores(empresaID) {
    return this.request(`/api/catalogos/proveedores/${empresaID}`);
  },

  async getMetodosPago(empresaID) {
    return this.request(`/api/catalogos/metodos-pago/${empresaID}`);
  },

  // ========== TICKETS ==========
  async getSiguienteTicket(empresaID, sucursalID) {
    try {
      const res = await this.getVentasHoy(empresaID, sucursalID);
      return (res.ventas?.length || 0) + 1;
    } catch {
      return 1;
    }
  }
};
