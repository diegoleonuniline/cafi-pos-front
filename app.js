// ============================================
// CAFI POS - JAVASCRIPT
// ============================================

// URL del backend
const API_URL = 'https://cafi-pos-tuempresa-a6a27d63c301.herokuapp.com/api';

// Estado global
const State = {
  usuario: null,
  productos: [],
  clientes: [],
  metodosPago: [],
  proveedores: [],
  carrito: [],
  clienteSeleccionado: null,
  metodoPagoSeleccionado: null,
  ticketNum: 1,
  tipoVenta: 'CONTADO',
  tipoPrecioActual: 1,
  ventasEnEspera: [],
  ventaActualID: null,
  ultimaVenta: null
};

// Utilidades
const Utils = {
  $(id) { return document.getElementById(id); },
  formatMoney(n) { return '$' + (parseFloat(n) || 0).toFixed(2); },
  getIniciales(n) {
    if (!n) return 'US';
    return n.split(' ').slice(0, 2).map(p => p[0] || '').join('').toUpperCase();
  },
  buscarEnArray(arr, campo, valor) {
    return arr.find(item => item[campo] === valor) || null;
  }
};

// ============================================
// API
// ============================================
const API = {
  async call(endpoint, method = 'GET', data = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);
    
    const res = await fetch(API_URL + endpoint, options);
    return res.json();
  },

  async login(email, password) {
    const res = await this.call('/login', 'POST', { email, password });
    if (res.success) {
      State.usuario = res.usuario;
      localStorage.setItem('cafi_usuario', JSON.stringify(State.usuario));
      return true;
    }
    throw new Error(res.error || 'Error de conexión');
  },

  async cargarDatos() {
    const res = await this.call('/datos/' + State.usuario.empresaID);
    if (res.success) {
      State.productos = res.productos || [];
      State.clientes = res.clientes || [];
      State.metodosPago = res.metodosPago || [];
      State.proveedores = res.proveedores || [];
      UI.mostrarApp();
    } else {
      Toast.error('Error al cargar datos');
      Auth.logout();
    }
  },

  async crearVenta(data) {
    return this.call('/ventas', 'POST', data);
  },

  async getVentasEnEspera() {
    return this.call('/ventas/espera/' + State.usuario.empresaID + '/' + State.usuario.sucursalID);
  },

  async getSiguienteTicket() {
    const res = await this.call('/ventas/ticket/' + State.usuario.empresaID + '/' + State.usuario.sucursalID);
    return res.ticket || 1;
  },

  async actualizarEstatusVenta(ventaID, estatus) {
    return this.call('/ventas/' + ventaID + '/estatus', 'PUT', { estatus });
  },

  async crearProducto(data) {
    return this.call('/productos', 'POST', data);
  },

  async editarProducto(id, data) {
    return this.call('/productos/' + id, 'PUT', data);
  },

  async eliminarProducto(id) {
    return this.call('/productos/' + id, 'DELETE');
  },

  async crearCliente(data) {
    return this.call('/clientes', 'POST', data);
  },

  async editarCliente(id, data) {
    return this.call('/clientes/' + id, 'PUT', data);
  },

  async eliminarCliente(id) {
    return this.call('/clientes/' + id, 'DELETE');
  }
};

// ============================================
// UI
// ============================================
const UI = {
  mostrarLoading() {
    Utils.$('login-screen').style.display = 'none';
    Utils.$('loading-screen').style.display = 'flex';
    Utils.$('app').style.display = 'none';
  },

  mostrarApp() {
    Utils.$('loading-screen').style.display = 'none';
    Utils.$('app').style.display = 'grid';
    
    Utils.$('user-name').textContent = State.usuario.nombre || 'Usuario';
    Utils.$('user-sucursal').textContent = State.usuario.sucursalNombre || '';
    Utils.$('user-avatar').textContent = Utils.getIniciales(State.usuario.nombre);
    
    this.renderMetodosPago();
    Cart.render();
    Venta.obtenerTicket();
    Venta.cargarEnEspera();
    
    setTimeout(() => Utils.$('barcode')?.focus(), 200);
  },

  renderMetodosPago() {
    const iconos = { 'Efectivo': 'fa-money-bill-wave', 'Tarjeta': 'fa-credit-card', 'Transferencia': 'fa-mobile-alt' };
    const html = State.metodosPago.map((m, i) => `
      <button class="method-btn ${i === 0 ? 'active' : ''}" data-id="${m.MetodoPagoID}" onclick="UI.seleccionarMetodo(this)">
        <i class="fas ${iconos[m.Nombre] || 'fa-wallet'}"></i>
        <span>${m.Nombre}</span>
      </button>
    `).join('');
    
    Utils.$('metodos-pago-grid').innerHTML = html;
    if (State.metodosPago.length) State.metodoPagoSeleccionado = State.metodosPago[0].MetodoPagoID;
  },

  seleccionarMetodo(btn) {
    document.querySelectorAll('#metodos-pago-grid .method-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    State.metodoPagoSeleccionado = btn.dataset.id;
  }
};

// ============================================
// AUTENTICACIÓN
// ============================================
const Auth = {
  async login(e) {
    e.preventDefault();
    const email = Utils.$('login-email').value.trim();
    const password = Utils.$('login-password').value;
    const errorDiv = Utils.$('login-error');
    const btn = Utils.$('login-btn');
    
    if (!email || !password) {
      errorDiv.textContent = 'Ingresa email y contraseña';
      return;
    }
    
    btn.disabled = true;
    btn.classList.add('loading');
    errorDiv.textContent = '';
    
    try {
      await API.login(email, password);
      UI.mostrarLoading();
      await API.cargarDatos();
    } catch (err) {
      errorDiv.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  },

  async logout() {
    const confirmed = await Confirm.show('¿Cerrar sesión?', 'Saldrás del sistema', 'warning');
    if (confirmed) {
      localStorage.removeItem('cafi_usuario');
      State.usuario = null;
      State.productos = [];
      State.clientes = [];
      State.metodosPago = [];
      State.carrito = [];
      State.clienteSeleccionado = null;
      
      Modal.cerrarTodos();
      Utils.$('app').style.display = 'none';
      Utils.$('loading-screen').style.display = 'none';
      Utils.$('login-screen').style.display = 'flex';
      Utils.$('login-email').value = '';
      Utils.$('login-password').value = '';
      Utils.$('login-error').textContent = '';
    }
  }
};

// ============================================
// CARRITO
// ============================================
const Cart = {
  calcularTotal() {
    return State.carrito.reduce((sum, item) => sum + item.subtotal, 0);
  },

  calcularItems() {
    return State.carrito.reduce((sum, item) => sum + item.cantidad, 0);
  },

  calcularDescuentos() {
    return State.carrito.reduce((sum, item) => sum + (item.descuentoMonto || 0), 0);
  },

  render() {
    const tbody = Utils.$('cart-body');
    const empty = Utils.$('cart-empty');
    
    if (!State.carrito.length) {
      tbody.innerHTML = '';
      empty.style.display = 'flex';
    } else {
      empty.style.display = 'none';
      tbody.innerHTML = State.carrito.map((item, i) => `
        <tr>
          <td class="col-name">${item.PuntoVentaNombre || item.NombreProducto}</td>
          <td class="col-price">
            <span class="price-editable" onclick="event.stopPropagation(); solicitarCambioPrecio(${i})">
              ${Utils.formatMoney(item.precioUnitario)}
              <i class="fas fa-pencil-alt"></i>
            </span>
          </td>
          <td class="col-qty">
            <div class="qty-inline">
              <button onclick="Cart.cambiarCantidad(${i}, -1)">−</button>
              <span>${item.cantidad}</span>
              <button onclick="Cart.cambiarCantidad(${i}, 1)">+</button>
            </div>
          </td>
          <td class="col-unit">${item.UnidadVenta || 'PZ'}</td>
          <td class="col-total">${Utils.formatMoney(item.subtotal)}</td>
          <td class="col-actions">
            <button class="btn-icon danger" onclick="solicitarAccionAdmin('eliminar-item', ${i})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    }
    this.actualizarTotales();
  },

  actualizarTotales() {
    const total = this.calcularTotal();
    const items = this.calcularItems();
    const descuentos = this.calcularDescuentos();
    
    const totalAmount = Utils.$('total-amount');
    if (totalAmount) totalAmount.value = total;
    
    const totalDisplay = Utils.$('total-display');
    if (totalDisplay) totalDisplay.textContent = Utils.formatMoney(total);
    
    const rSubtotal = Utils.$('r-subtotal');
    if (rSubtotal) rSubtotal.textContent = Utils.formatMoney(total + descuentos);
    
    const rItems = Utils.$('r-items');
    if (rItems) rItems.textContent = items;
    
    const rDescuentos = Utils.$('r-descuentos');
    if (rDescuentos) rDescuentos.textContent = '-' + Utils.formatMoney(descuentos);
    
    const rCliente = Utils.$('r-cliente');
    if (rCliente) rCliente.textContent = State.clienteSeleccionado ? State.clienteSeleccionado.Nombre : 'Público General';
  },

  agregar(producto, cantidad = null) {
    cantidad = cantidad || parseInt(Utils.$('busqueda-cantidad')?.value) || 1;
    cantidad = Math.round(cantidad);
    const precio = parseFloat(producto['Precio' + State.tipoPrecioActual]) || parseFloat(producto.Precio1) || 0;
    
    const existe = State.carrito.find(item => item.ProductoID === producto.ProductoID);
    
    if (existe) {
      existe.cantidad += cantidad;
      existe.subtotal = existe.cantidad * existe.precioUnitario;
    } else {
      State.carrito.push({
        ProductoID: producto.ProductoID,
        NombreProducto: producto.NombreProducto,
        PuntoVentaNombre: producto.PuntoVentaNombre,
        UnidadVenta: producto.UnidadVenta || 'PZ',
        cantidad,
        precioUnitario: precio,
        subtotal: cantidad * precio
      });
    }
    
    Modal.cerrar('modal-busqueda');
    this.render();
    Toast.success('Producto agregado');
    Utils.$('barcode')?.focus();
  },

  agregarPorID(id) {
    const p = Utils.buscarEnArray(State.productos, 'ProductoID', id);
    if (p) this.agregar(p);
  },

  buscarPorCodigo(codigo) {
    if (!codigo) return;
    const p = State.productos.find(prod => String(prod.CodigoBarras || '').trim() === codigo.trim());
    if (p) this.agregar(p, 1);
    else Toast.error('Producto no encontrado');
  },

  cambiarCantidad(i, delta) {
    const nueva = Math.round(State.carrito[i].cantidad + delta);
    if (nueva <= 0) {
      this.eliminar(i);
    } else {
      State.carrito[i].cantidad = nueva;
      State.carrito[i].subtotal = nueva * State.carrito[i].precioUnitario;
      this.render();
    }
  },

  eliminar(i) {
    State.carrito.splice(i, 1);
    this.render();
  },

  recalcularPrecios() {
    State.carrito.forEach(item => {
      const p = Utils.buscarEnArray(State.productos, 'ProductoID', item.ProductoID);
      if (p) {
        item.precioUnitario = parseFloat(p['Precio' + State.tipoPrecioActual]) || parseFloat(p.Precio1) || 0;
        item.subtotal = item.cantidad * item.precioUnitario;
      }
    });
    this.render();
  },

  reset() {
    State.carrito = [];
    State.clienteSeleccionado = null;
    State.tipoVenta = 'CONTADO';
    State.tipoPrecioActual = 1;
    State.ventaActualID = null;
    
    Utils.$('cliente-nombre').textContent = 'Público General';
    Utils.$('btn-contado').classList.add('active');
    Utils.$('btn-credito').classList.remove('active');
    Utils.$('r-tipo').textContent = 'Contado';
    Utils.$('precio-tipo-select').value = '1';
    
    const rCliente = Utils.$('r-cliente');
    if (rCliente) rCliente.textContent = 'Público General';
    
    this.render();
  }
};

// ============================================
// VENTA
// ============================================
const Venta = {
  setTipo(tipo) {
    State.tipoVenta = tipo;
    Utils.$('btn-contado').classList.toggle('active', tipo === 'CONTADO');
    Utils.$('btn-credito').classList.toggle('active', tipo === 'CREDITO');
    Utils.$('r-tipo').textContent = tipo === 'CONTADO' ? 'Contado' : 'Crédito';
    
    if (tipo === 'CREDITO' && !State.clienteSeleccionado) {
      Toast.warning('Selecciona un cliente para crédito');
      Modal.abrir('modal-seleccionar-cliente');
    }
  },

  cambiarPrecio(tipo) {
    State.tipoPrecioActual = parseInt(tipo);
    Cart.recalcularPrecios();
  },

  async obtenerTicket() {
    State.ticketNum = await API.getSiguienteTicket() || 1;
    Utils.$('ticket-num').textContent = '#' + String(State.ticketNum).padStart(4, '0');
  },

  async cancelar() {
    if (!State.carrito.length) return;
    const confirmed = await Confirm.show('¿Cancelar venta?', 'Se eliminarán todos los productos', 'warning');
    if (confirmed) {
      Cart.reset();
      Toast.info('Venta cancelada');
    }
  },

  cancelarConfirmado() {
    Cart.reset();
    Toast.info('Venta cancelada');
  },

  nueva() {
    Cart.reset();
    this.obtenerTicket();
    Utils.$('barcode')?.focus();
  },

  async ponerEnEspera() {
    if (!State.carrito.length) {
      Toast.error('El carrito está vacío');
      return;
    }
    
    Toast.loading('Guardando...');
    
    const data = {
      empresaID: State.usuario.empresaID,
      sucursalID: State.usuario.sucursalID,
      clienteID: State.clienteSeleccionado?.ClienteID || '',
      usuarioEmail: State.usuario.email,
      tipoPrecio: State.tipoPrecioActual,
      total: Cart.calcularTotal(),
      tipoVenta: State.tipoVenta,
      estatus: 'EN_ESPERA',
      items: State.carrito.map(item => ({
        productoID: item.ProductoID,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal
      })),
      pagos: []
    };
    
    try {
      const res = await API.crearVenta(data);
      if (res.success) {
        Toast.success('Venta en espera');
        this.cargarEnEspera();
        this.nueva();
      } else {
        Toast.error(res.error || 'Error');
      }
    } catch (e) {
      Toast.error('Error de conexión');
    }
  },

  async cargarEnEspera() {
    try {
      const res = await API.getVentasEnEspera();
      State.ventasEnEspera = res.ventas || [];
      const badge = Utils.$('espera-badge');
      badge.textContent = State.ventasEnEspera.length || '';
      badge.style.display = State.ventasEnEspera.length ? 'flex' : 'none';
    } catch (e) {}
  },

  renderEnEspera() {
    const container = Utils.$('espera-lista');
    if (!container) return;
    
    if (!State.ventasEnEspera.length) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>No hay ventas en espera</p></div>`;
      return;
    }
    
    container.innerHTML = State.ventasEnEspera.map(v => {
      const fecha = new Date(v.FechaHora);
      const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="espera-card" onclick="Venta.recuperar('${v.VentaID}')">
          <div class="espera-header">
            <span class="ticket">${v.VentaID}</span>
            <span class="hora">${hora}</span>
          </div>
          <div class="espera-cliente">${v.ClienteID || 'Público General'}</div>
          <div class="espera-total">${Utils.formatMoney(v.Total)}</div>
        </div>
      `;
    }).join('');
  },

  recuperar(ventaID) {
    const v = Utils.buscarEnArray(State.ventasEnEspera, 'VentaID', ventaID);
    if (!v) return;
    
    State.carrito = (v.items || []).map(item => {
      const p = Utils.buscarEnArray(State.productos, 'ProductoID', item.ProductoID);
      return p ? {
        ProductoID: item.ProductoID,
        NombreProducto: p.NombreProducto,
        PuntoVentaNombre: p.PuntoVentaNombre,
        UnidadVenta: p.UnidadVenta || 'PZ',
        cantidad: item.Cantidad || item.cantidad,
        precioUnitario: item.PrecioUnitario || item.precioUnitario,
        subtotal: item.Subtotal || item.subtotal
      } : null;
    }).filter(Boolean);
    
    State.ventaActualID = ventaID;
    State.tipoVenta = v.TipoVenta || 'CONTADO';
    State.tipoPrecioActual = v.TipoPrecio || 1;
    
    if (v.ClienteID) {
      const cli = Utils.buscarEnArray(State.clientes, 'ClienteID', v.ClienteID);
      if (cli) {
        State.clienteSeleccionado = cli;
        Utils.$('cliente-nombre').textContent = cli.Nombre;
      }
    }
    
    this.setTipo(State.tipoVenta);
    Utils.$('precio-tipo-select').value = State.tipoPrecioActual;
    Modal.cerrar('modal-espera');
    Cart.render();
    Toast.success('Venta recuperada');
  }
};

// ============================================
// COBRO
// ============================================
const Cobro = {
  calcularCambioCobro() {
    const total = Cart.calcularTotal();
    const efectivo = parseFloat((Utils.$('cobro-efectivo')?.value || '0').replace(/[^0-9.]/g, '')) || 0;
    const cambio = efectivo - total;
    
    const box = Utils.$('cobro-cambio-box');
    const span = Utils.$('cobro-cambio');
    
    if (box && span) {
      box.classList.toggle('negative', cambio < 0);
      span.textContent = cambio >= 0 ? Utils.formatMoney(cambio) : '-' + Utils.formatMoney(Math.abs(cambio));
    }
  },

  addEfectivoCobro(v) {
    const input = Utils.$('cobro-efectivo');
    const actual = parseFloat((input?.value || '0').replace(/[^0-9.]/g, '')) || 0;
    if (input) input.value = (actual + v).toFixed(2);
    this.calcularCambioCobro();
  },

  setExactoCobro() {
    const input = Utils.$('cobro-efectivo');
    if (input) input.value = Cart.calcularTotal().toFixed(2);
    this.calcularCambioCobro();
  },

  limpiarCobro() {
    const input = Utils.$('cobro-efectivo');
    if (input) input.value = '';
    this.calcularCambioCobro();
  },

  abrirModal() {
    if (!State.carrito.length) {
      Toast.error('El carrito está vacío');
      return;
    }
    
    const total = Cart.calcularTotal();
    Utils.$('cobro-total').textContent = Utils.formatMoney(total);
    Utils.$('cobro-tipo-badge').textContent = State.tipoVenta;
    Utils.$('cobro-efectivo').value = '';
    
    const iconos = { 'Efectivo': 'fa-money-bill-wave', 'Tarjeta': 'fa-credit-card', 'Transferencia': 'fa-mobile-alt' };
    Utils.$('cobro-metodos').innerHTML = State.metodosPago.map((m, i) => `
      <button class="${i === 0 ? 'active' : ''}" data-id="${m.MetodoPagoID}" onclick="Cobro.seleccionarMetodo(this)">
        <i class="fas ${iconos[m.Nombre] || 'fa-wallet'}"></i>
        <span>${m.Nombre}</span>
      </button>
    `).join('');
    
    if (State.metodosPago.length) State.metodoPagoSeleccionado = State.metodosPago[0].MetodoPagoID;
    this.calcularCambioCobro();
    Modal.abrir('modal-cobro');
  },

  seleccionarMetodo(btn) {
    document.querySelectorAll('#cobro-metodos button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    State.metodoPagoSeleccionado = btn.dataset.id;
  },

  async confirmar() {
    const total = Cart.calcularTotal();
    const efectivo = parseFloat((Utils.$('cobro-efectivo')?.value || '0').replace(/[^0-9.]/g, '')) || 0;
    
    if (State.tipoVenta === 'CONTADO' && efectivo < total) {
      Toast.error('Efectivo insuficiente');
      return;
    }
    
    if (State.tipoVenta === 'CREDITO' && !State.clienteSeleccionado) {
      Toast.error('Selecciona un cliente para crédito');
      return;
    }
    
    const btn = Utils.$('btn-confirmar-venta');
    btn.disabled = true;
    btn.classList.add('loading');
    Toast.loading('Procesando...');
    
    const data = {
      empresaID: State.usuario.empresaID,
      sucursalID: State.usuario.sucursalID,
      clienteID: State.clienteSeleccionado?.ClienteID || '',
      usuarioEmail: State.usuario.email,
      tipoPrecio: State.tipoPrecioActual,
      total,
      tipoVenta: State.tipoVenta,
      estatus: State.tipoVenta === 'CREDITO' ? 'PENDIENTE' : 'PAGADA',
      items: State.carrito.map(item => ({
        productoID: item.ProductoID,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal
      })),
      pagos: State.tipoVenta === 'CONTADO' ? [{ metodoPagoID: State.metodoPagoSeleccionado, monto: total }] : []
    };
    
    try {
      const res = await API.crearVenta(data);
      
      if (res.success) {
        if (State.ventaActualID) {
          API.actualizarEstatusVenta(State.ventaActualID, 'COMPLETADA');
          Venta.cargarEnEspera();
        }
        
        State.ultimaVenta = {
          ticket: State.ticketNum,
          fecha: new Date(),
          items: [...State.carrito],
          total: total,
          descuentos: Cart.calcularDescuentos(),
          cliente: State.clienteSeleccionado?.Nombre || 'Público General',
          tipoVenta: State.tipoVenta,
          efectivo: efectivo,
          cambio: Math.max(0, efectivo - total)
        };
        
        Modal.cerrar('modal-cobro');
        Utils.$('exito-ticket').textContent = '#' + String(State.ticketNum).padStart(4, '0');
        Utils.$('exito-total').textContent = Utils.formatMoney(total);
        Utils.$('exito-cambio').textContent = Utils.formatMoney(Math.max(0, efectivo - total));
        Modal.abrir('modal-exito');
        
        const autoPrint = Utils.$('auto-print');
        if (autoPrint && autoPrint.checked) {
          setTimeout(() => imprimirTicket(), 500);
        }
      } else {
        Toast.error(res.error || 'Error al procesar');
      }
    } catch (e) {
      Toast.error('Error de conexión');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      Toast.hide();
    }
  },

  cerrarExito() {
    Modal.cerrar('modal-exito');
    Venta.nueva();
  }
};

// ============================================
// CLIENTE
// ============================================
const Cliente = {
  renderSeleccion(lista = State.clientes) {
    const container = Utils.$('lista-clientes-sel');
    if (!container) return;
    container.innerHTML = lista.map(c => `
      <div class="client-item" onclick="Cliente.seleccionar('${c.ClienteID}')">
        <div class="avatar">${Utils.getIniciales(c.Nombre)}</div>
        <div class="info">
          <strong>${c.Nombre}</strong>
          <small>P${c.TipoPrecio || 1} • ${c.Telefono || '-'}</small>
        </div>
        ${c.Credito ? '<span class="badge warning">Crédito</span>' : ''}
      </div>
    `).join('');
  },

  filtrarSeleccion(texto) {
    const filtrado = State.clientes.filter(c => c.Nombre.toLowerCase().includes(texto.toLowerCase()));
    this.renderSeleccion(filtrado);
  },

  seleccionar(id) {
    if (id) {
      const c = Utils.buscarEnArray(State.clientes, 'ClienteID', id);
      if (c) {
        State.clienteSeleccionado = c;
        Utils.$('cliente-nombre').textContent = c.Nombre;
        State.tipoPrecioActual = c.TipoPrecio || 1;
        Utils.$('precio-tipo-select').value = State.tipoPrecioActual;
        const rCliente = Utils.$('r-cliente');
        if (rCliente) rCliente.textContent = c.Nombre;
        Cart.recalcularPrecios();
        Toast.success('Cliente: ' + c.Nombre);
      }
    } else {
      State.clienteSeleccionado = null;
      Utils.$('cliente-nombre').textContent = 'Público General';
      State.tipoPrecioActual = 1;
      Utils.$('precio-tipo-select').value = '1';
      const rCliente = Utils.$('r-cliente');
      if (rCliente) rCliente.textContent = 'Público General';
      Cart.recalcularPrecios();
    }
    Modal.cerrar('modal-seleccionar-cliente');
  },

  abrirSeleccion() {
    const input = Utils.$('buscar-cliente-sel');
    if (input) input.value = '';
    this.renderSeleccion();
    Modal.abrir('modal-seleccionar-cliente');
  }
};

// ============================================
// MODAL
// ============================================
const Modal = {
  abrir(id) {
    const modal = Utils.$(id);
    if (!modal) return;
    modal.classList.add('active');
    
    if (id === 'modal-productos') CRUDProductos.render();
    if (id === 'modal-clientes') CRUDClientes.render();
    if (id === 'modal-espera') Venta.renderEnEspera();
    if (id === 'modal-busqueda') {
      const searchInput = Utils.$('search-producto');
      if (searchInput) searchInput.value = '';
      const qtyInput = Utils.$('busqueda-cantidad');
      if (qtyInput) qtyInput.value = '1';
      const priceSelect = Utils.$('busqueda-precio-tipo');
      if (priceSelect) priceSelect.value = State.tipoPrecioActual;
      renderListaProductos(State.productos);
      setTimeout(() => Utils.$('search-producto')?.focus(), 100);
    }
    if (id === 'modal-seleccionar-cliente') Cliente.renderSeleccion();
  },

  cerrar(id) {
    const modal = Utils.$(id);
    if (modal) modal.classList.remove('active');
  },

  cerrarTodos() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }
};

// ============================================
// TOAST
// ============================================
const Toast = {
  show(msg, type = 'info') {
    const t = Utils.$('toast');
    const iconos = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-exclamation-circle"></i>',
      info: '<i class="fas fa-info-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>'
    };
    t.innerHTML = `${iconos[type] || iconos.info}<span>${msg}</span>`;
    t.className = `toast show ${type}`;
    setTimeout(() => t.classList.remove('show'), 3000);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  info(msg) { this.show(msg, 'info'); },
  warning(msg) { this.show(msg, 'warning'); },
  loading(msg) {
    const t = Utils.$('toast');
    t.innerHTML = `<div class="spinner small"></div><span>${msg}</span>`;
    t.className = 'toast show info';
  },
  hide() { Utils.$('toast').classList.remove('show'); }
};

// ============================================
// CONFIRM
// ============================================
const Confirm = {
  resolveCallback: null,
  
  show(titulo, mensaje, tipo = 'danger') {
    return new Promise(resolve => {
      this.resolveCallback = resolve;
      Utils.$('confirm-titulo').textContent = titulo;
      Utils.$('confirm-mensaje').textContent = mensaje;
      
      const icon = Utils.$('confirm-icon');
      const btnOk = Utils.$('btn-confirm-ok');
      
      if (tipo === 'warning') {
        icon.className = 'confirm-icon warning';
        icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        btnOk.className = 'btn btn-warning';
      } else {
        icon.className = 'confirm-icon';
        icon.innerHTML = '<i class="fas fa-question-circle"></i>';
        btnOk.className = 'btn btn-danger';
      }
      
      Modal.abrir('modal-confirm');
    });
  },
  
  close(result) {
    Modal.cerrar('modal-confirm');
    if (this.resolveCallback) {
      this.resolveCallback(result);
      this.resolveCallback = null;
    }
  }
};

// ============================================
// CRUD PRODUCTOS
// ============================================
const CRUDProductos = {
  render(lista = State.productos) {
    const tbody = Utils.$('tbody-productos');
    if (!tbody) return;
    tbody.innerHTML = lista.map(p => `
      <tr>
        <td>${p.CodigoBarras || '-'}</td>
        <td>${p.NombreProducto}</td>
        <td>${Utils.formatMoney(p.Precio1)}</td>
        <td>${Utils.formatMoney(p.Precio2)}</td>
        <td>${Utils.formatMoney(p.Precio3)}</td>
        <td>${Utils.formatMoney(p.Precio4)}</td>
        <td>${Utils.formatMoney(p.Precio5)}</td>
        <td>${Utils.formatMoney(p.Precio6)}</td>
        <td>${p.UnidadVenta || 'PZ'}</td>
        <td class="actions">
          <button class="btn-icon" onclick="CRUDProductos.editar('${p.ProductoID}')"><i class="fas fa-pen"></i></button>
          <button class="btn-icon danger" onclick="CRUDProductos.eliminar('${p.ProductoID}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  },

  filtrar(texto) {
    const filtrado = State.productos.filter(p => 
      (p.NombreProducto || '').toLowerCase().includes(texto.toLowerCase()) ||
      String(p.CodigoBarras || '').includes(texto)
    );
    this.render(filtrado);
  },

  mostrarForm(id = null) {
    const form = Utils.$('form-producto');
    if (form) form.reset();
    Utils.$('prod-id').value = '';
    
    if (id) {
      const p = Utils.buscarEnArray(State.productos, 'ProductoID', id);
      if (p) {
        Utils.$('form-producto-titulo').innerHTML = '<i class="fas fa-box"></i> Editar Producto';
        Utils.$('prod-id').value = id;
        Utils.$('prod-nombre').value = p.NombreProducto || '';
        Utils.$('prod-pv-nombre').value = p.PuntoVentaNombre || '';
        Utils.$('prod-codigo').value = p.CodigoBarras || '';
        Utils.$('prod-unidad').value = p.UnidadVenta || 'PZ';
        for (let i = 1; i <= 6; i++) Utils.$('prod-precio' + i).value = p['Precio' + i] || '';
      }
    } else {
      Utils.$('form-producto-titulo').innerHTML = '<i class="fas fa-box"></i> Nuevo Producto';
    }
    Modal.abrir('modal-form-producto');
  },

  editar(id) { this.mostrarForm(id); },

  async guardar() {
    const id = Utils.$('prod-id').value;
    const nombre = Utils.$('prod-nombre').value;
    if (!nombre) { Toast.error('Nombre requerido'); return; }
    
    const btn = Utils.$('btn-guardar-producto');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    const data = {
      empresaID: State.usuario.empresaID,
      nombreProducto: nombre,
      puntoVentaNombre: Utils.$('prod-pv-nombre').value,
      codigoBarras: Utils.$('prod-codigo').value,
      unidadVenta: Utils.$('prod-unidad').value
    };
    for (let i = 1; i <= 6; i++) data['precio' + i] = parseFloat(Utils.$('prod-precio' + i).value) || 0;
    
    try {
      let res;
      if (id) {
        const updateData = {
          NombreProducto: data.nombreProducto,
          PuntoVentaNombre: data.puntoVentaNombre,
          CodigoBarras: data.codigoBarras,
          UnidadVenta: data.unidadVenta
        };
        for (let i = 1; i <= 6; i++) updateData['Precio' + i] = data['precio' + i];
        res = await API.editarProducto(id, updateData);
      } else {
        res = await API.crearProducto(data);
      }
      
      if (res.success) {
        Modal.cerrar('modal-form-producto');
        Toast.success(id ? 'Producto actualizado' : 'Producto guardado');
        sincronizar();
      } else {
        Toast.error(res.error || 'Error');
      }
    } catch (e) {
      Toast.error('Error de conexión');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar Producto';
    }
  },

  async eliminar(id) {
    const confirmed = await Confirm.show('¿Eliminar producto?', 'Esta acción no se puede deshacer');
    if (!confirmed) return;
    Toast.loading('Eliminando...');
    try {
      const res = await API.eliminarProducto(id);
      if (res.success) {
        Toast.success('Eliminado');
        sincronizar();
      } else {
        Toast.error(res.error || 'Error');
      }
    } catch (e) {
      Toast.error('Error de conexión');
    }
  }
};

// ============================================
// CRUD CLIENTES
// ============================================
const CRUDClientes = {
  render(lista = State.clientes) {
    const tbody = Utils.$('tbody-clientes');
    if (!tbody) return;
    tbody.innerHTML = lista.map(c => `
      <tr>
        <td>${c.Nombre}</td>
        <td>${c.Telefono || '-'}</td>
        <td>P${c.TipoPrecio || 1}</td>
        <td>${c.Credito ? 'Sí' : 'No'}</td>
        <td>${c.Credito ? Utils.formatMoney(c.LimiteCredito) : '-'}</td>
        <td class="actions">
          <button class="btn-icon" onclick="CRUDClientes.editar('${c.ClienteID}')"><i class="fas fa-pen"></i></button>
          <button class="btn-icon danger" onclick="CRUDClientes.eliminar('${c.ClienteID}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  },

  filtrar(texto) {
    const filtrado = State.clientes.filter(c => c.Nombre.toLowerCase().includes(texto.toLowerCase()));
    this.render(filtrado);
  },

  mostrarForm(id = null) {
    const form = Utils.$('form-cliente');
    if (form) form.reset();
    Utils.$('cli-id').value = '';
    Utils.$('grupo-limite').style.display = 'none';
    
    if (id) {
      const c = Utils.buscarEnArray(State.clientes, 'ClienteID', id);
      if (c) {
        Utils.$('form-cliente-titulo').innerHTML = '<i class="fas fa-user"></i> Editar Cliente';
        Utils.$('cli-id').value = id;
        Utils.$('cli-nombre').value = c.Nombre || '';
        Utils.$('cli-telefono').value = c.Telefono || '';
        const tipoPrecio = c.TipoPrecio || 1;
        const radioPrice = document.querySelector(`input[name="cli-precio"][value="${tipoPrecio}"]`);
        if (radioPrice) radioPrice.checked = true;
        Utils.$('cli-credito').checked = c.Credito || false;
        Utils.$('cli-limite').value = c.LimiteCredito || '';
        toggleCredito();
      }
    } else {
      Utils.$('form-cliente-titulo').innerHTML = '<i class="fas fa-user-plus"></i> Nuevo Cliente';
    }
    Modal.abrir('modal-form-cliente');
  },

  editar(id) { this.mostrarForm(id); },

  async guardar() {
    const id = Utils.$('cli-id').value;
    const nombre = Utils.$('cli-nombre').value;
    if (!nombre) { Toast.error('Nombre requerido'); return; }
    
    const btn = Utils.$('btn-guardar-cliente');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    const precioRadio = document.querySelector('input[name="cli-precio"]:checked');
    const tipoPrecio = precioRadio ? parseInt(precioRadio.value) : 1;
    
    const data = {
      empresaID: State.usuario.empresaID,
      nombre,
      telefono: Utils.$('cli-telefono')?.value || '',
      tipoPrecio: tipoPrecio,
      credito: Utils.$('cli-credito').checked,
      limiteCredito: parseFloat(Utils.$('cli-limite').value) || 0
    };
    
    try {
      let res;
      if (id) {
        const updateData = {
          Nombre: data.nombre,
          Telefono: data.telefono,
          TipoPrecio: data.tipoPrecio,
          Credito: data.credito,
          LimiteCredito: data.limiteCredito
        };
        res = await API.editarCliente(id, updateData);
      } else {
        res = await API.crearCliente(data);
      }
      
      if (res.success) {
        Modal.cerrar('modal-form-cliente');
        Toast.success(id ? 'Cliente actualizado' : 'Cliente guardado');
        sincronizar();
      } else {
        Toast.error(res.error || 'Error');
      }
    } catch (e) {
      Toast.error('Error de conexión');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar Cliente';
    }
  },

  async eliminar(id) {
    const confirmed = await Confirm.show('¿Eliminar cliente?', 'Esta acción no se puede deshacer');
    if (!confirmed) return;
    Toast.loading('Eliminando...');
    try {
      const res = await API.eliminarCliente(id);
      if (res.success) {
        Toast.success('Eliminado');
        sincronizar();
      } else {
        Toast.error(res.error || 'Error');
      }
    } catch (e) {
      Toast.error('Error de conexión');
    }
  }
};

// ============================================
// FUNCIONES GLOBALES
// ============================================
function cerrarSesion() { Auth.logout(); }
function nuevaVenta() { Venta.nueva(); }
function ponerEnEspera() { Venta.ponerEnEspera(); }
function setTipoVenta(tipo) { Venta.setTipo(tipo); }
function cambiarTipoPrecio(tipo) { Venta.cambiarPrecio(tipo); }
function abrirModal(id) { Modal.abrir(id); }
function cerrarModal(id) { Modal.cerrar(id); }
function abrirModalBusqueda() { Modal.abrir('modal-busqueda'); }
function abrirModalCobro() { Cobro.abrirModal(); }
function abrirVentasEnEspera() { Modal.abrir('modal-espera'); }
function abrirModalSeleccionarCliente() { Cliente.abrirSeleccion(); }
function confirmarVenta() { Cobro.confirmar(); }
function cerrarExito() { Cobro.cerrarExito(); }
function cerrarConfirm(result) { Confirm.close(result); }

function addEfectivoCobro(v) { Cobro.addEfectivoCobro(v); }
function setExactoCobro() { Cobro.setExactoCobro(); }
function limpiarEfectivoCobro() { Cobro.limpiarCobro(); }
function calcularCambioCobro() { Cobro.calcularCambioCobro(); }

function seleccionarCliente(id) { Cliente.seleccionar(id); }
function filtrarClientesSeleccion(t) { Cliente.filtrarSeleccion(t); }

function agregarProductoPorID(id) { Cart.agregarPorID(id); }
function cambiarCantidadBusqueda(d) {
  const input = Utils.$('busqueda-cantidad');
  if (input) input.value = Math.max(1, Math.round((parseFloat(input.value) || 1) + d));
}

function renderListaProductos(lista) {
  const tp = parseInt(Utils.$('busqueda-precio-tipo')?.value) || State.tipoPrecioActual;
  const tbody = Utils.$('productos-tbody');
  if (!tbody) return;
  
  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--gray-400);">No se encontraron productos</td></tr>`;
    return;
  }
  
  tbody.innerHTML = lista.map(p => {
    const precio = parseFloat(p['Precio' + tp]) || parseFloat(p.Precio1) || 0;
    return `
      <tr onclick="agregarProductoPorID('${p.ProductoID}')">
        <td class="col-code">${p.CodigoBarras || '---'}</td>
        <td class="col-name">${p.NombreProducto}</td>
        <td class="col-desc">${p.PuntoVentaNombre || '-'}</td>
        <td class="col-unit"><span class="unit-badge">${p.UnidadVenta || 'PZ'}</span></td>
        <td class="col-discount">-</td>
        <td class="col-price">${Utils.formatMoney(precio)}</td>
      </tr>
    `;
  }).join('');
}

function filtrarProductos(t) {
  const texto = t.toLowerCase();
  const filtrado = State.productos.filter(p => 
    (p.NombreProducto || '').toLowerCase().includes(texto) ||
    (p.PuntoVentaNombre || '').toLowerCase().includes(texto) ||
    String(p.CodigoBarras || '').includes(texto)
  );
  renderListaProductos(filtrado);
}

function mostrarFormProducto(id) { CRUDProductos.mostrarForm(id); }
function guardarProducto() { CRUDProductos.guardar(); }
function filtrarProductosCRUD(t) { CRUDProductos.filtrar(t); }

function mostrarFormCliente(id) { CRUDClientes.mostrarForm(id); }
function guardarCliente() { CRUDClientes.guardar(); }
function filtrarClientesCRUD(t) { CRUDClientes.filtrar(t); }

function toggleCredito() {
  const grupoLimite = Utils.$('grupo-limite');
  if (grupoLimite) grupoLimite.style.display = Utils.$('cli-credito')?.checked ? 'block' : 'none';
}

function mostrarInfoUsuario() {
  Utils.$('usuario-avatar-grande').textContent = Utils.getIniciales(State.usuario.nombre);
  Utils.$('usuario-nombre-completo').textContent = State.usuario.nombre || '';
  Utils.$('usuario-email-info').textContent = State.usuario.email || '';
  Utils.$('usuario-empresa').textContent = State.usuario.empresaNombre || '';
  Utils.$('usuario-sucursal-info').textContent = State.usuario.sucursalNombre || '';
  Utils.$('usuario-rol').textContent = State.usuario.rol || '';
  Modal.abrir('modal-usuario');
}

function solicitarAccionAdmin(accion, datos = null) {
  switch (accion) {
    case 'cancelar':
      Venta.cancelar();
      break;
    case 'eliminar-item':
      Cart.eliminar(datos);
      break;
  }
}

function solicitarCambioPrecio(index) {
  abrirModalCambiarPrecio(index);
}

function abrirModalCambiarPrecio(index) {
  const item = State.carrito[index];
  if (!item) return;
  
  const producto = Utils.buscarEnArray(State.productos, 'ProductoID', item.ProductoID);
  
  Utils.$('cambio-precio-index').value = index;
  Utils.$('cambio-precio-producto').textContent = item.PuntoVentaNombre || item.NombreProducto;
  Utils.$('cambio-precio-actual').textContent = Utils.formatMoney(item.precioUnitario);
  Utils.$('nuevo-precio').value = item.precioUnitario;
  
  const preciosDiv = Utils.$('precios-disponibles');
  if (producto && preciosDiv) {
    let btns = '';
    for (let i = 1; i <= 6; i++) {
      const precio = parseFloat(producto['Precio' + i]);
      if (precio && precio > 0) {
        btns += `<button onclick="Utils.$('nuevo-precio').value='${precio}'">P${i}: ${Utils.formatMoney(precio)}</button>`;
      }
    }
    preciosDiv.innerHTML = btns || '<span style="color:var(--gray-400)">No hay precios configurados</span>';
  }
  
  Modal.abrir('modal-cambiar-precio');
}

function aplicarNuevoPrecio() {
  const index = parseInt(Utils.$('cambio-precio-index').value);
  const nuevoPrecio = parseFloat(Utils.$('nuevo-precio').value) || 0;
  
  if (nuevoPrecio <= 0) {
    Toast.error('El precio debe ser mayor a 0');
    return;
  }
  
  if (State.carrito[index]) {
    State.carrito[index].precioUnitario = nuevoPrecio;
    State.carrito[index].subtotal = State.carrito[index].cantidad * nuevoPrecio;
    Cart.render();
    Toast.success('Precio actualizado');
  }
  
  Modal.cerrar('modal-cambiar-precio');
}

function imprimirTicket() {
  Toast.info('Imprimiendo ticket...');
}

async function sincronizar() {
  try {
    const res = await API.call('/datos/' + State.usuario.empresaID);
    if (res.success) {
      State.productos = res.productos || [];
      State.clientes = res.clientes || [];
      State.metodosPago = res.metodosPago || [];
      State.proveedores = res.proveedores || [];
      UI.renderMetodosPago();
      if (Utils.$('modal-productos')?.classList.contains('active')) CRUDProductos.render();
      if (Utils.$('modal-clientes')?.classList.contains('active')) CRUDClientes.render();
      // Actualizar vistas si están abiertas
      if (Utils.$('vista-productos')?.classList.contains('active')) renderVistaProductos();
      if (Utils.$('vista-clientes')?.classList.contains('active')) renderVistaClientes();
    }
  } catch (e) {}
}

async function sincronizarManual() {
  Toast.loading('Sincronizando...');
  await sincronizar();
  Toast.success('Datos actualizados');
}

// ============================================
// DROPDOWN Y VISTAS
// ============================================

function toggleDropdown(id) {
  const dropdown = document.getElementById(id).parentElement;
  const wasActive = dropdown.classList.contains('active');
  
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
  
  if (!wasActive) {
    dropdown.classList.add('active');
  }
}

function abrirVista(vista) {
  document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
  
  const vistaEl = Utils.$('vista-' + vista);
  if (vistaEl) {
    vistaEl.classList.add('active');
    
    switch(vista) {
      case 'productos':
        renderVistaProductos();
        break;
      case 'clientes':
        renderVistaClientes();
        break;
      case 'proveedores':
        renderVistaProveedores();
        break;
      case 'metodos-pago':
        renderVistaMetodos();
        break;
    }
  }
}

function cerrarVista(vista) {
  const vistaEl = Utils.$('vista-' + vista);
  if (vistaEl) {
    vistaEl.classList.remove('active');
  }
}

// ============================================
// VISTA PRODUCTOS
// ============================================

function renderVistaProductos(lista = State.productos) {
  const tbody = Utils.$('vista-productos-tbody');
  if (!tbody) return;
  
  Utils.$('stat-productos-total').textContent = State.productos.length;
  Utils.$('stat-productos-activos').textContent = State.productos.filter(p => p.Activo == 1).length;
  
  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12">
          <div class="empty-vista">
            <i class="fas fa-box-open"></i>
            <p>No hay productos registrados</p>
            <small>Haz clic en "Nuevo Producto" para agregar uno</small>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td><code>${p.CodigoBarras || '---'}</code></td>
      <td><strong>${p.NombreProducto}</strong></td>
      <td>${p.PuntoVentaNombre || '-'}</td>
      <td><span class="unit-badge">${p.UnidadVenta || 'PZ'}</span></td>
      <td>${Utils.formatMoney(p.Precio1)}</td>
      <td>${Utils.formatMoney(p.Precio2)}</td>
      <td>${Utils.formatMoney(p.Precio3)}</td>
      <td>${Utils.formatMoney(p.Precio4)}</td>
      <td>${Utils.formatMoney(p.Precio5)}</td>
      <td>${Utils.formatMoney(p.Precio6)}</td>
      <td>${p.Activo == 1 ? '<span class="badge-activo">Activo</span>' : '<span class="badge-inactivo">Inactivo</span>'}</td>
      <td class="col-actions">
        <button class="btn-icon" onclick="editarProductoVista('${p.ProductoID}')" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="btn-icon danger" onclick="eliminarProductoVista('${p.ProductoID}')" title="Eliminar"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function filtrarVistaProductos(texto) {
  const filtrado = State.productos.filter(p => 
    (p.NombreProducto || '').toLowerCase().includes(texto.toLowerCase()) ||
    (p.PuntoVentaNombre || '').toLowerCase().includes(texto.toLowerCase()) ||
    String(p.CodigoBarras || '').includes(texto)
  );
  renderVistaProductos(filtrado);
}

function editarProductoVista(id) {
  CRUDProductos.editar(id);
}

async function eliminarProductoVista(id) {
  await CRUDProductos.eliminar(id);
  renderVistaProductos();
}

// ============================================
// VISTA CLIENTES
// ============================================

function renderVistaClientes(lista = State.clientes) {
  const tbody = Utils.$('vista-clientes-tbody');
  if (!tbody) return;
  
  Utils.$('stat-clientes-total').textContent = State.clientes.length;
  Utils.$('stat-clientes-credito').textContent = State.clientes.filter(c => c.Credito).length;
  
  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-vista">
            <i class="fas fa-users"></i>
            <p>No hay clientes registrados</p>
            <small>Haz clic en "Nuevo Cliente" para agregar uno</small>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = lista.map(c => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="avatar">${Utils.getIniciales(c.Nombre)}</div>
          <strong>${c.Nombre}</strong>
        </div>
      </td>
      <td>${c.Telefono || '-'}</td>
      <td><span class="badge">P${c.TipoPrecio || 1}</span></td>
      <td>${c.Credito ? '<span class="badge-credito">Sí</span>' : '<span class="badge">No</span>'}</td>
      <td>${c.Credito ? Utils.formatMoney(c.LimiteCredito) : '-'}</td>
      <td>${c.Activo == 1 ? '<span class="badge-activo">Activo</span>' : '<span class="badge-inactivo">Inactivo</span>'}</td>
      <td class="col-actions">
        <button class="btn-icon" onclick="editarClienteVista('${c.ClienteID}')" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="btn-icon danger" onclick="eliminarClienteVista('${c.ClienteID}')" title="Eliminar"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function filtrarVistaClientes(texto) {
  const filtrado = State.clientes.filter(c => 
    (c.Nombre || '').toLowerCase().includes(texto.toLowerCase()) ||
    (c.Telefono || '').includes(texto)
  );
  renderVistaClientes(filtrado);
}

function editarClienteVista(id) {
  CRUDClientes.editar(id);
}

async function eliminarClienteVista(id) {
  await CRUDClientes.eliminar(id);
  renderVistaClientes();
}

// ============================================
// VISTA PROVEEDORES
// ============================================

function renderVistaProveedores(lista = State.proveedores) {
  const tbody = Utils.$('vista-proveedores-tbody');
  if (!tbody) return;
  
  Utils.$('stat-proveedores-total').textContent = State.proveedores.length;
  
  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-vista">
            <i class="fas fa-truck"></i>
            <p>No hay proveedores registrados</p>
            <small>Haz clic en "Nuevo Proveedor" para agregar uno</small>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td><strong>${p.NombreProveedor || p.Nombre || '-'}</strong></td>
      <td>${p.Contacto || '-'}</td>
      <td>${p.Telefono || '-'}</td>
      <td>${p.Email || '-'}</td>
      <td>${p.Activo == 1 ? '<span class="badge-activo">Activo</span>' : '<span class="badge-inactivo">Inactivo</span>'}</td>
      <td class="col-actions">
        <button class="btn-icon" onclick="editarProveedorVista('${p.ProveedorID}')" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="btn-icon danger" onclick="eliminarProveedorVista('${p.ProveedorID}')" title="Eliminar"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function filtrarVistaProveedores(texto) {
  const filtrado = State.proveedores.filter(p => 
    (p.NombreProveedor || p.Nombre || '').toLowerCase().includes(texto.toLowerCase())
  );
  renderVistaProveedores(filtrado);
}

function mostrarFormProveedor() {
  Toast.info('Función de proveedores próximamente');
}

function editarProveedorVista(id) {
  Toast.info('Función de proveedores próximamente');
}

function eliminarProveedorVista(id) {
  Toast.info('Función de proveedores próximamente');
}

// ============================================
// VISTA MÉTODOS DE PAGO
// ============================================

function renderVistaMetodos(lista = State.metodosPago) {
  const tbody = Utils.$('vista-metodos-tbody');
  if (!tbody) return;
  
  Utils.$('stat-metodos-total').textContent = State.metodosPago.length;
  
  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3">
          <div class="empty-vista">
            <i class="fas fa-credit-card"></i>
            <p>No hay métodos de pago registrados</p>
            <small>Haz clic en "Nuevo Método" para agregar uno</small>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  const iconos = {
    'Efectivo': 'fa-money-bill-wave',
    'Tarjeta': 'fa-credit-card',
    'Transferencia': 'fa-mobile-alt'
  };
  
  tbody.innerHTML = lista.map(m => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="fas ${iconos[m.Nombre] || 'fa-wallet'}" style="color:var(--primary);font-size:18px;"></i>
          <strong>${m.Nombre}</strong>
        </div>
      </td>
      <td>${m.Activo == 1 ? '<span class="badge-activo">Activo</span>' : '<span class="badge-inactivo">Inactivo</span>'}</td>
      <td class="col-actions">
        <button class="btn-icon" onclick="editarMetodoVista('${m.MetodoPagoID}')" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="btn-icon danger" onclick="eliminarMetodoVista('${m.MetodoPagoID}')" title="Eliminar"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function filtrarVistaMetodos(texto) {
  const filtrado = State.metodosPago.filter(m => 
    (m.Nombre || '').toLowerCase().includes(texto.toLowerCase())
  );
  renderVistaMetodos(filtrado);
}

function mostrarFormMetodoPago() {
  Toast.info('Función de métodos de pago próximamente');
}

function editarMetodoVista(id) {
  Toast.info('Función de métodos de pago próximamente');
}

function eliminarMetodoVista(id) {
  Toast.info('Función de métodos de pago próximamente');
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const sesion = localStorage.getItem('cafi_usuario');
  if (sesion) {
    try {
      const usuario = JSON.parse(sesion);
      if (usuario) {
        State.usuario = usuario;
        UI.mostrarLoading();
        API.cargarDatos();
      }
    } catch (e) {
      localStorage.removeItem('cafi_usuario');
    }
  }
  
  // Login form
  Utils.$('login-form')?.addEventListener('submit', Auth.login);
  
  // Barcode
  Utils.$('barcode')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      Cart.buscarPorCodigo(e.target.value);
      e.target.value = '';
    }
  });
  
  // Atajos de teclado
  document.addEventListener('keydown', e => {
    if (Utils.$('app').style.display !== 'grid') return;
    
    const shortcuts = {
      'F2': () => Modal.abrir('modal-busqueda'),
      'F4': () => { if (State.carrito.length) Venta.cancelar(); },
      'F8': () => Venta.ponerEnEspera(),
      'F12': () => Cobro.abrirModal(),
      'Escape': () => Modal.cerrarTodos()
    };
    
    if (shortcuts[e.key]) {
      e.preventDefault();
      shortcuts[e.key]();
    }
  });
});

// Cerrar dropdown al hacer click afuera
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('active'));
  }
});
