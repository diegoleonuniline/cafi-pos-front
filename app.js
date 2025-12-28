// ============================================
// CAFI POS - APLICACIÓN PRINCIPAL
// ============================================

// Estado global
const State = {
  usuario: null,
  productos: [],
  clientes: [],
  metodosPago: [],
  proveedores: [],
    marcas: [],        // <-- AGREGAR
  categorias: [],    // <-- AGREGAR
  carrito: [],
  clienteSeleccionado: null,
  metodoPagoSeleccionado: null,
  ticketNum: 1,
  tipoVenta: 'CONTADO',
  tipoPrecioActual: 1,
  ventasEnEspera: [],
  ventaActualID: null,
  ultimaVenta: null,
  productoTemporal: null
  
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
    return arr.find(item => String(item[campo]).toLowerCase() === String(valor).toLowerCase()) || null;
  },
  
  esActivo(valor) {
    if (valor === true || valor === 1 || valor === 'Y' || valor === 'y') return true;
    if (typeof valor === 'string') {
      const v = valor.toLowerCase().trim();
      return ['true', '1', 'si', 'sí', 'yes', 'activo', 'y'].includes(v);
    }
    return false;
  }
};

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
        cargarDatosIniciales();
      }
    } catch {
      localStorage.removeItem('cafi_usuario');
    }
  }
  Events.init();
});

async function cargarDatosIniciales() {
  try {
    const res = await API.cargarDatos(State.usuario.empresaID);
    if (res.success) {
      State.productos = res.productos || [];
      State.clientes = res.clientes || [];
      State.metodosPago = res.metodosPago || [];
      State.proveedores = res.proveedores || [];
      State.marcas = res.marcas || [];           // <-- AGREGAR
      State.categorias = res.categorias || [];   // <-- AGREGAR
      console.log('Datos cargados:', {
        productos: State.productos.length,
        marcas: State.marcas.length,
        categorias: State.categorias.length,
        proveedores: State.proveedores.length
      });
      UI.mostrarApp();
    } else {
      Toast.error('Error al cargar datos: ' + (res.error || 'desconocido'));
      Auth.logout(true);
    }
  } catch (e) {
    Toast.error('Error de conexión con el servidor');
    console.error(e);
    Auth.logout(true);
  }
}

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
    
    // Verificar turno al iniciar
    Turno.verificar();
    
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
      const res = await API.login(email, password);
      if (res.success) {
        State.usuario = res.usuario;
        localStorage.setItem('cafi_usuario', JSON.stringify(State.usuario));
        UI.mostrarLoading();
        await cargarDatosIniciales();
      } else {
        errorDiv.textContent = res.error || 'Error de autenticación';
      }
    } catch (err) {
      errorDiv.textContent = err.message || 'Error de conexión';
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  },

  async logout(force = false) {
    if (!force) {
      const confirmed = await Confirm.show('¿Cerrar sesión?', 'Saldrás del sistema de punto de venta', 'warning');
      if (!confirmed) return;
    }
    
    localStorage.removeItem('cafi_usuario');
    State.usuario = null;
    State.productos = [];
    State.clientes = [];
    State.metodosPago = [];
    State.proveedores = [];
    State.carrito = [];
    State.clienteSeleccionado = null;
    State.metodoPagoSeleccionado = null;
    State.ticketNum = 1;
    State.tipoVenta = 'CONTADO';
    State.tipoPrecioActual = 1;
    State.ventasEnEspera = [];
    State.ventaActualID = null;
    State.ultimaVenta = null;
    State.productoTemporal = null;
    Modal.cerrarTodos();
    Utils.$('app').style.display = 'none';
    Utils.$('loading-screen').style.display = 'none';
    Utils.$('login-screen').style.display = 'flex';
    Utils.$('login-email').value = '';
    Utils.$('login-password').value = '';
    Utils.$('login-error').textContent = '';
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

  render() {
    const tbody = Utils.$('cart-body');
    const empty = Utils.$('cart-empty');
    
    if (!State.carrito.length) {
      tbody.innerHTML = '';
      empty.style.display = 'flex';
    } else {
      empty.style.display = 'none';
      tbody.innerHTML = State.carrito.map((item, i) => {
        const esPeso = item.ventaPorPeso;
        const unidad = item.unidadBase || item.UnidadVenta || 'PZ';
        const cantidadDisplay = esPeso ? item.cantidad.toFixed(3) : item.cantidad;
        const step = esPeso ? '0.001' : '1';
        
        return `
        <tr>
          <td class="col-name">
            <div class="cart-product-info">
              ${item.Imagen_URL ? `<img src="${item.Imagen_URL}" class="cart-product-img" onerror="this.style.display='none'">` : ''}
              <span>${item.PuntoVentaNombre || item.NombreProducto}</span>
            </div>
          </td>
          <td class="col-price">
            <span class="price-editable" onclick="event.stopPropagation(); solicitarCambioPrecio(${i})" title="Click para cambiar precio">
              ${Utils.formatMoney(item.precioUnitario)}
              <i class="fas fa-pencil-alt"></i>
            </span>
          </td>
          <td class="col-qty">
            ${esPeso ? `
              <div class="qty-peso">
                <input type="number" value="${cantidadDisplay}" step="${step}" min="0.001" 
                  onchange="Cart.setCantidad(${i}, this.value)" 
                  onclick="this.select()">
                <div class="qty-peso-btns">
                  <button onclick="Cart.cambiarCantidad(${i}, -0.1)" title="-100g">-</button>
                  <button onclick="Cart.cambiarCantidad(${i}, 0.1)" title="+100g">+</button>
                </div>
              </div>
            ` : `
              <div class="qty-inline">
                <button onclick="Cart.cambiarCantidad(${i}, -1)">−</button>
                <span>${item.cantidad}</span>
                <button onclick="Cart.cambiarCantidad(${i}, 1)">+</button>
              </div>
            `}
          </td>
          <td class="col-unit">${unidad}</td>
          <td class="col-total">${Utils.formatMoney(item.subtotal)}</td>
          <td class="col-actions">
            <button class="btn-icon danger" onclick="solicitarAccionAdmin('eliminar-item', ${i})"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `}).join('');
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
    
    const rProductos = Utils.$('r-productos');
    if (rProductos) rProductos.value = items;
    
    const rItems = Utils.$('r-items');
    if (rItems) rItems.textContent = items.toFixed(2);
    
    const rDescuentos = Utils.$('r-descuentos');
    if (rDescuentos) rDescuentos.textContent = '-' + Utils.formatMoney(descuentos);
    
    const rCliente = Utils.$('r-cliente');
    if (rCliente) {
      rCliente.textContent = State.clienteSeleccionado ? State.clienteSeleccionado.Nombre : 'Público General';
    }
    
    Cobro.calcularCambio();
  },

  calcularDescuentos() {
    return State.carrito.reduce((sum, item) => sum + (item.descuentoMonto || 0), 0);
  },

  agregar(producto, cantidad = null) {
    const esPeso = Utils.esActivo(producto.VentaPorPeso);
    const unidadBase = producto.UnidadBase || producto.UnidadVenta || 'PZ';
    
    if (cantidad === null) {
      cantidad = parseFloat(Utils.$('busqueda-cantidad')?.value) || 1;
    }
    
    if (!esPeso) {
      cantidad = Math.round(cantidad);
    }
    
    const precio = parseFloat(producto['Precio' + State.tipoPrecioActual]) || parseFloat(producto.Precio1) || 0;
    
    const existe = State.carrito.find(item => item.ProductoID === producto.ProductoID);
    
    if (existe) {
      existe.cantidad += cantidad;
      existe.subtotal = existe.cantidad * existe.precioUnitario;
    } else {
      State.carrito.unshift({
        ProductoID: producto.ProductoID,
        NombreProducto: producto.NombreProducto,
        PuntoVentaNombre: producto.PuntoVentaNombre,
        UnidadVenta: producto.UnidadVenta || 'PZ',
        Imagen_URL: producto.Imagen_URL || '',
        ventaPorPeso: esPeso,
        unidadBase: unidadBase,
        cantidad,
        precioUnitario: precio,
        subtotal: cantidad * precio
      });
    }
    
    this.render();
    Toast.success('Producto agregado');
    
    const cantidadInput = Utils.$('busqueda-cantidad');
    if (cantidadInput) cantidadInput.value = '1';
    
    const searchInput = Utils.$('search-producto');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
  },

  agregarPorID(id) {
    const p = Utils.buscarEnArray(State.productos, 'ProductoID', id);
    if (p) {
      if (Utils.esActivo(p.VentaPorPeso)) {
        abrirModalCantidadPeso(p);
      } else {
        this.agregar(p);
      }
    }
  },

  buscarPorCodigo(codigo) {
    if (!codigo) return;
    const p = State.productos.find(prod => String(prod.CodigoBarras || '').trim() === codigo.trim());
    if (p) {
      if (Utils.esActivo(p.VentaPorPeso)) {
        abrirModalCantidadPeso(p);
      } else {
        this.agregar(p, 1);
      }
    } else {
      Toast.error('Producto no encontrado');
    }
  },

  setCantidad(i, valor) {
    const nueva = parseFloat(valor) || 0;
    if (nueva <= 0) {
      this.eliminar(i);
    } else {
      State.carrito[i].cantidad = nueva;
      State.carrito[i].subtotal = nueva * parseFloat(State.carrito[i].precioUnitario);
      this.render();
    }
  },

  cambiarCantidad(i, delta) {
    const item = State.carrito[i];
    const nueva = item.cantidad + delta;
    
    if (nueva <= 0) {
      this.eliminar(i);
    } else {
      item.cantidad = item.ventaPorPeso ? parseFloat(nueva.toFixed(3)) : Math.round(nueva);
      item.subtotal = item.cantidad * parseFloat(item.precioUnitario);
      this.render();
    }
  },

  async eliminar(i) {
    const item = State.carrito[i];
    
    if (State.ventaActualID && item.DetalleID) {
      Toast.loading('Cancelando...');
      try {
        await API.cancelarDetalleVenta(item.DetalleID);
        Toast.success('Producto cancelado');
      } catch (e) {
        Toast.error('Error al cancelar');
        return;
      }
    }
    
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
    
    const efectivo = Utils.$('efectivo');
    if (efectivo) efectivo.value = '';
    
    const rCliente = Utils.$('r-cliente');
    if (rCliente) rCliente.textContent = 'Público General';
    
    this.render();
  }
};

// ============================================
// MODAL CANTIDAD PESO
// ============================================
function abrirModalCantidadPeso(producto) {
  State.productoTemporal = producto;
  const unidad = producto.UnidadBase || producto.UnidadVenta || 'KG';
  const precio = parseFloat(producto['Precio' + State.tipoPrecioActual]) || parseFloat(producto.Precio1) || 0;
  
  Utils.$('peso-producto-nombre').textContent = producto.PuntoVentaNombre || producto.NombreProducto;
  Utils.$('peso-producto-precio').textContent = Utils.formatMoney(precio) + ' / ' + unidad;
  Utils.$('peso-unidad').textContent = unidad;
  Utils.$('peso-cantidad').value = '';
  Utils.$('peso-subtotal').textContent = '$0.00';
  
  const btnsContainer = Utils.$('peso-btns-rapidos');
  if (unidad === 'KG' || unidad === 'GR') {
    btnsContainer.innerHTML = `
      <button type="button" onclick="setPesoCantidad(0.100)">100g</button>
      <button type="button" onclick="setPesoCantidad(0.250)">250g</button>
      <button type="button" onclick="setPesoCantidad(0.500)">500g</button>
      <button type="button" onclick="setPesoCantidad(1)">1 kg</button>
      <button type="button" onclick="setPesoCantidad(1.5)">1.5 kg</button>
      <button type="button" onclick="setPesoCantidad(2)">2 kg</button>
    `;
  } else if (unidad === 'LT' || unidad === 'ML') {
    btnsContainer.innerHTML = `
      <button type="button" onclick="setPesoCantidad(0.250)">250ml</button>
      <button type="button" onclick="setPesoCantidad(0.500)">500ml</button>
      <button type="button" onclick="setPesoCantidad(1)">1 Lt</button>
      <button type="button" onclick="setPesoCantidad(1.5)">1.5 Lt</button>
      <button type="button" onclick="setPesoCantidad(2)">2 Lt</button>
      <button type="button" onclick="setPesoCantidad(5)">5 Lt</button>
    `;
  } else {
    btnsContainer.innerHTML = `
      <button type="button" onclick="setPesoCantidad(0.5)">0.5</button>
      <button type="button" onclick="setPesoCantidad(1)">1</button>
      <button type="button" onclick="setPesoCantidad(1.5)">1.5</button>
      <button type="button" onclick="setPesoCantidad(2)">2</button>
    `;
  }
  
  Modal.abrir('modal-cantidad-peso');
  setTimeout(() => Utils.$('peso-cantidad')?.focus(), 100);
}

function setPesoCantidad(valor) {
  const input = Utils.$('peso-cantidad');
  const actual = parseFloat(input.value) || 0;
  input.value = (actual + valor).toFixed(3);
  calcularSubtotalPeso();
}

function limpiarPesoCantidad() {
  Utils.$('peso-cantidad').value = '';
  Utils.$('peso-subtotal').textContent = '$0.00';
}

function calcularSubtotalPeso() {
  if (!State.productoTemporal) return;
  const cantidad = parseFloat(Utils.$('peso-cantidad').value) || 0;
  const precio = parseFloat(State.productoTemporal['Precio' + State.tipoPrecioActual]) || parseFloat(State.productoTemporal.Precio1) || 0;
  Utils.$('peso-subtotal').textContent = Utils.formatMoney(cantidad * precio);
}

function confirmarCantidadPeso() {
  const cantidad = parseFloat(Utils.$('peso-cantidad').value) || 0;
  if (cantidad <= 0) {
    Toast.error('Ingresa una cantidad válida');
    return;
  }
  Cart.agregar(State.productoTemporal, cantidad);
  Modal.cerrar('modal-cantidad-peso');
  State.productoTemporal = null;
}

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
    State.ticketNum = await API.getSiguienteTicket(State.usuario.empresaID, State.usuario.sucursalID) || 1;
    Utils.$('ticket-num').textContent = '#' + String(State.ticketNum).padStart(4, '0');
  },

  async cancelar() {
    if (!State.carrito.length) return;
    const confirmed = await Confirm.show('¿Cancelar venta?', 'Se eliminarán todos los productos del carrito', 'warning');
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
    
    try {
      if (State.ventaActualID) {
        await API.actualizarVentaEnEspera({
          ventaID: State.ventaActualID,
          clienteID: State.clienteSeleccionado?.ClienteID || '',
          tipoPrecio: State.tipoPrecioActual,
          total: Cart.calcularTotal(),
          tipoVenta: State.tipoVenta,
          items: State.carrito.map(item => ({
            productoID: item.ProductoID,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: item.subtotal
          }))
        });
        Toast.success('Venta actualizada');
      } else {
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
        
        const res = await API.crearVenta(data);
        if (!res?.success) {
          Toast.error(res?.error || 'Error');
          return;
        }
        Toast.success('Venta en espera');
      }
      
      await this.cargarEnEspera();
      this.nueva();
    } catch (e) {
      Toast.error('Error de conexión');
    }
  },

  async cargarEnEspera() {
    try {
      const res = await API.getVentasEnEspera(State.usuario.empresaID, State.usuario.sucursalID);
      State.ventasEnEspera = res?.ventas || [];
      const badge = Utils.$('espera-badge');
      badge.textContent = State.ventasEnEspera.length || '';
      badge.style.display = State.ventasEnEspera.length ? 'flex' : 'none';
    } catch {}
  },

  renderEnEspera() {
    const container = Utils.$('espera-lista');
    
    if (!State.ventasEnEspera.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No hay ventas en espera</p>
        </div>
      `;
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
    
    State.carrito = (v.items || [])
      .filter(item => (item.Estado || 'ACTIVO').toUpperCase() !== 'CANCELADO')
      .map(item => {
        const p = Utils.buscarEnArray(State.productos, 'ProductoID', item.ProductoID);
        return p ? {
          DetalleID: item.DetalleID,
          ProductoID: item.ProductoID,
          NombreProducto: p.NombreProducto,
          PuntoVentaNombre: p.PuntoVentaNombre,
          UnidadVenta: p.UnidadVenta || 'PZ',
          Imagen_URL: p.Imagen_URL || '',
          ventaPorPeso: Utils.esActivo(p.VentaPorPeso),
          unidadBase: p.UnidadBase || p.UnidadVenta || 'PZ',
          cantidad: parseFloat(item.Cantidad || item.cantidad) || 1,
          precioUnitario: parseFloat(item.PrecioUnitario || item.precioUnitario) || 0,
          subtotal: parseFloat(item.Subtotal || item.subtotal) || 0
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
  calcularCambio() {
    const total = Cart.calcularTotal();
    const efectivo = parseFloat((Utils.$('efectivo')?.value || '0').replace(/[^0-9.]/g, '')) || 0;
    const cambio = efectivo - total;
    
    const box = Utils.$('cambio-box');
    const span = Utils.$('cambio');
    
    if (box && span) {
      box.classList.toggle('negative', cambio < 0);
      span.textContent = cambio >= 0 ? Utils.formatMoney(cambio) : '-' + Utils.formatMoney(Math.abs(cambio));
    }
  },

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
    const actual = parseFloat((input.value || '0').replace(/[^0-9.]/g, '')) || 0;
    input.value = (actual + v).toFixed(2);
    this.calcularCambioCobro();
  },

  setExactoCobro() {
    Utils.$('cobro-efectivo').value = Cart.calcularTotal().toFixed(2);
    this.calcularCambioCobro();
  },

  limpiarCobro() {
    Utils.$('cobro-efectivo').value = '';
    this.calcularCambioCobro();
  },

  abrirModal() {
    if (!Turno.puedeVender()) return;
    
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
    
    if (State.tipoVenta === 'CREDITO' && State.clienteSeleccionado) {
      const saldoActual = parseFloat(State.clienteSeleccionado.Saldo) || 0;
      const limiteCredito = parseFloat(State.clienteSeleccionado.LimiteCredito) || 0;
      const nuevoSaldo = saldoActual + total;
      
      if (nuevoSaldo > limiteCredito) {
        if (!AdminAuth.esAdmin()) {
          AdminAuth.solicitar('credito-excedido', { saldo: saldoActual, limite: limiteCredito, total: total });
          return;
        }
      }
    }
    
    await this.procesarVenta(total, efectivo);
  },

  async procesarVenta(total, efectivo) {
    const btn = Utils.$('btn-confirmar-venta');
    btn.disabled = true;
    btn.classList.add('loading');
    Toast.loading('Procesando...');
    
    try {
      let res;
      
      if (State.ventaActualID) {
        const nuevoEstatus = State.tipoVenta === 'CREDITO' ? 'PENDIENTE' : 'PAGADA';
        await API.actualizarEstatusVenta(State.ventaActualID, nuevoEstatus);
        
        if (State.tipoVenta === 'CONTADO') {
          await API.agregarAbono({
            ventaID: State.ventaActualID,
            empresaID: State.usuario.empresaID,
            metodoPagoID: State.metodoPagoSeleccionado,
            monto: total,
            usuarioEmail: State.usuario.email
          });
        }
        
        res = { success: true, ventaID: State.ventaActualID };
        await Venta.cargarEnEspera();
      } else {
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
        
        res = await API.crearVenta(data);
      }
      
      if (res?.success) {
        State.ultimaVenta = {
          ticket: State.ticketNum,
          fecha: new Date(),
          items: [...State.carrito],
          total: total,
          descuentos: Cart.calcularDescuentos(),
          cliente: State.clienteSeleccionado?.Nombre || 'Público General',
          tipoVenta: State.tipoVenta,
          efectivo: efectivo,
          cambio: State.tipoVenta === 'CREDITO' ? 0 : Math.max(0, efectivo - total)
        };
        
        Modal.cerrar('modal-cobro');
        Utils.$('exito-ticket').textContent = '#' + String(State.ticketNum).padStart(4, '0');
        Utils.$('exito-total').textContent = Utils.formatMoney(total);
        Utils.$('exito-cambio').textContent = State.tipoVenta === 'CREDITO' ? 'A crédito' : Utils.formatMoney(Math.max(0, efectivo - total));
        Modal.abrir('modal-exito');
        
        const autoPrint = Utils.$('auto-print');
        if (autoPrint && autoPrint.checked) {
          setTimeout(() => imprimirTicket(), 500);
        }
      } else {
        Toast.error(res?.error || 'Error al procesar');
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
    Utils.$('lista-clientes-sel').innerHTML = lista.map(c => `
      <div class="client-item" onclick="Cliente.seleccionar('${c.ClienteID}')">
        <div class="avatar">${Utils.getIniciales(c.Nombre)}</div>
        <div class="info">
          <strong>${c.Nombre}</strong>
          <small>P${c.TipoPrecio || 1} • ${c.Telefono || '-'}</small>
        </div>
        ${Utils.esActivo(c.Credito) ? '<span class="badge warning">Crédito</span>' : ''}
      </div>
    `).join('');
  },

  filtrarSeleccion(texto) {
    const filtrado = State.clientes.filter(c => 
      c.Nombre.toLowerCase().includes(texto.toLowerCase())
    );
    this.renderSeleccion(filtrado);
  },

  seleccionar(id) {
    if (id) {
      const c = Utils.buscarEnArray(State.clientes, 'ClienteID', id);
      if (c) {
        State.clienteSeleccionado = c;
        Utils.$('cliente-nombre').textContent = c.Nombre;
        State.tipoPrecioActual = parseInt(c.TipoPrecio) || 1;
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
    Utils.$('buscar-cliente-sel').value = '';
    this.renderSeleccion();
    Modal.abrir('modal-seleccionar-cliente');
  }
};

// ============================================
// CRUD PRODUCTOS
// ============================================
const CRUDProductos = {
  render(lista = State.productos) {
    Utils.$('tbody-productos').innerHTML = lista.map(p => `
      <tr>
        <td>
          <div class="product-cell-with-img">
            ${p.Imagen_URL ? `<img src="${p.Imagen_URL}" class="product-thumb" onerror="this.style.display='none'">` : '<div class="product-thumb-placeholder"><i class="fas fa-box"></i></div>'}
            <span>${p.CodigoBarras || '-'}</span>
          </div>
        </td>
        <td>${p.PuntoVentaNombre || p.NombreProducto}</td>
        <td>${p.Categoria || '-'}</td>
        <td>${Utils.formatMoney(p.Precio1)}</td>
        <td>${p.UnidadVenta || 'PZ'}</td>
        <td>${Utils.esActivo(p.VentaPorPeso) ? '<span class="badge warning">Sí</span>' : '-'}</td>
        <td>${Utils.esActivo(p.Activo) ? '<span class="badge" style="background:#d1fae5;color:#059669">Activo</span>' : '<span class="badge" style="background:#fee2e2;color:#dc2626">Inactivo</span>'}</td>
        <td class="actions">
          <button class="btn-icon" onclick="CRUDProductos.editar('${p.ProductoID}')"><i class="fas fa-pen"></i></button>
          <button class="btn-icon danger" onclick="CRUDProductos.eliminar('${p.ProductoID}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  },

  filtrar(texto) {
    const filtrado = State.productos.filter(p => 
      (p.PuntoVentaNombre || '').toLowerCase().includes(texto.toLowerCase()) ||
      (p.NombreProducto || '').toLowerCase().includes(texto.toLowerCase()) ||
      (p.Categoria || '').toLowerCase().includes(texto.toLowerCase()) ||
      (p.Marca || '').toLowerCase().includes(texto.toLowerCase()) ||
      String(p.CodigoBarras || '').includes(texto)
    );
    this.render(filtrado);
  },

  cargarProveedores() {
    const select = Utils.$('prod-proveedor');
    select.innerHTML = '<option value="">-- Sin proveedor --</option>' +
      State.proveedores.map(p => `<option value="${p.ProveedorID}">${p.Nombre}</option>`).join('');
  },

  mostrarForm(id = null) {
    const form = Utils.$('form-producto');
    form.reset();
    Utils.$('prod-id').value = '';
    Utils.$('prod-activo').checked = true;
    Utils.$('grupo-unidad-base').style.display = 'none';
    Utils.$('grupo-precio-oferta').style.display = 'none';
    
    this.cargarProveedores();
    
    if (id) {
      const p = Utils.buscarEnArray(State.productos, 'ProductoID', id);
      if (p) {
        Utils.$('form-producto-titulo').innerHTML = '<i class="fas fa-box"></i> Editar Producto';
        Utils.$('prod-id').value = id;
        Utils.$('prod-nombre').value = p.NombreProducto || '';
        Utils.$('prod-pv-nombre').value = p.PuntoVentaNombre || '';
        Utils.$('prod-codigo').value = p.CodigoBarras || '';
        Utils.$('prod-categoria').value = p.Categoria || '';
        Utils.$('prod-marca').value = p.Marca || '';
        Utils.$('prod-proveedor').value = p.ProveedorID || '';
        Utils.$('prod-imagen').value = p.Imagen_URL || p.Imagen || '';
        Utils.$('prod-unidad-compra').value = p.UnidadCompra || 'PZ';
        Utils.$('prod-contenido').value = p.ContenidoUnidadCompra || '';
        Utils.$('prod-unidad').value = p.UnidadVenta || 'PZ';
        Utils.$('prod-venta-peso').checked = Utils.esActivo(p.VentaPorPeso);
        Utils.$('prod-unidad-base').value = p.UnidadBase || 'KG';
        Utils.$('prod-permite-decimales').checked = Utils.esActivo(p.PermiteDecimales);
        Utils.$('prod-permite-descuento').checked = Utils.esActivo(p.PermiteDescuento);
        Utils.$('prod-descuento-max').value = p.DescuentoMax || '';
        Utils.$('prod-destacado').checked = Utils.esActivo(p.Destacado);
        Utils.$('prod-orden-destacado').value = p.OrdenDestacado || '';
        Utils.$('prod-en-oferta').checked = Utils.esActivo(p.EnOferta);
        Utils.$('prod-precio-oferta').value = p.PrecioOferta || '';
        Utils.$('prod-puntos').value = p.Puntos || '';
        Utils.$('prod-valor-puntos').value = p.ValorPuntos || '';
        Utils.$('prod-activo').checked = Utils.esActivo(p.Activo);
        
        for (let i = 1; i <= 6; i++) {
          Utils.$('prod-precio' + i).value = p['Precio' + i] || '';
        }
        
        toggleVentaPeso();
        toggleOferta();
      }
    } else {
      Utils.$('form-producto-titulo').innerHTML = '<i class="fas fa-box"></i> Nuevo Producto';
    }
    Modal.abrir('modal-form-producto');
  },

  editar(id) { this.mostrarForm(id); },

  async guardar() {
    const id = Utils.$('prod-id').value;
    const nombre = Utils.$('prod-nombre').value.trim();
    if (!nombre) { Toast.error('Nombre requerido'); return; }
    
    const btn = Utils.$('btn-guardar-producto');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    const data = {
      empresaID: State.usuario.empresaID,
      proveedorID: Utils.$('prod-proveedor').value || '',
      nombreProducto: nombre,
      puntoVentaNombre: Utils.$('prod-pv-nombre').value.trim() || nombre,
      codigoBarras: Utils.$('prod-codigo').value.trim(),
      imagen: Utils.$('prod-imagen').value.trim(),
      categoria: Utils.$('prod-categoria').value.trim(),
      marca: Utils.$('prod-marca').value.trim(),
      unidadCompra: Utils.$('prod-unidad-compra').value,
      contenidoUnidadCompra: parseInt(Utils.$('prod-contenido').value) || 1,
      unidadVenta: Utils.$('prod-unidad').value,
      ventaPorPeso: Utils.$('prod-venta-peso').checked,
      unidadBase: Utils.$('prod-unidad-base').value,
      permiteDecimales: Utils.$('prod-permite-decimales').checked,
      permiteDescuento: Utils.$('prod-permite-descuento').checked,
      descuentoMax: parseFloat(Utils.$('prod-descuento-max').value) || 0,
      destacado: Utils.$('prod-destacado').checked,
      ordenDestacado: parseInt(Utils.$('prod-orden-destacado').value) || 0,
      enOferta: Utils.$('prod-en-oferta').checked,
      precioOferta: parseFloat(Utils.$('prod-precio-oferta').value) || 0,
      puntos: parseInt(Utils.$('prod-puntos').value) || 0,
      valorPuntos: parseInt(Utils.$('prod-valor-puntos').value) || 0,
      activo: Utils.$('prod-activo').checked
    };
    
    for (let i = 1; i <= 6; i++) {
      data['precio' + i] = parseFloat(Utils.$('prod-precio' + i).value) || 0;
    }
    
    try {
      let res;
      if (id) {
        const updateData = {
          ProveedorID: data.proveedorID,
          NombreProducto: data.nombreProducto,
          PuntoVentaNombre: data.puntoVentaNombre,
          CodigoBarras: data.codigoBarras,
          Imagen: data.imagen,
          Imagen_URL: data.imagen,
          Categoria: data.categoria,
          Marca: data.marca,
          UnidadCompra: data.unidadCompra,
          ContenidoUnidadCompra: data.contenidoUnidadCompra,
          UnidadVenta: data.unidadVenta,
          VentaPorPeso: data.ventaPorPeso ? 'Y' : 'N',
          UnidadBase: data.unidadBase,
          PermiteDecimales: data.permiteDecimales ? 'Y' : 'N',
          PermiteDescuento: data.permiteDescuento ? 'Y' : 'N',
          DescuentoMax: data.descuentoMax,
          Destacado: data.destacado ? 'Y' : 'N',
          OrdenDestacado: data.ordenDestacado,
          EnOferta: data.enOferta ? 'Y' : 'N',
          PrecioOferta: data.precioOferta,
          Puntos: data.puntos,
          ValorPuntos: data.valorPuntos,
          Activo: data.activo ? 'Y' : 'N'
        };
        for (let i = 1; i <= 6; i++) updateData['Precio' + i] = data['precio' + i];
        res = await API.editarProducto(id, updateData);
      } else {
        res = await API.crearProducto(data);
      }
      
      if (res?.success) {
        Modal.cerrar('modal-form-producto');
        Guardado.show(
          id ? '¡Actualizado!' : '¡Producto Guardado!',
          id ? 'El producto se actualizó correctamente' : 'El producto se registró correctamente'
        );
        sincronizar();
      } else {
        Toast.error(res?.error || 'Error');
      }
    } catch {
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
      if (res?.success) {
        Toast.success('Eliminado');
        sincronizar();
      } else {
        Toast.error(res?.error || 'Error');
      }
    } catch {
      Toast.error('Error de conexión');
    }
  }
};

// Funciones toggle para el form
function toggleVentaPeso() {
  const checked = Utils.$('prod-venta-peso').checked;
  Utils.$('grupo-unidad-base').style.display = checked ? 'block' : 'none';
}

function toggleOferta() {
  const checked = Utils.$('prod-en-oferta').checked;
  Utils.$('grupo-precio-oferta').style.display = checked ? 'block' : 'none';
}
// ============================================
// CRUD CLIENTES
// ============================================
const CRUDClientes = {
  render(lista = State.clientes) {
    Utils.$('tbody-clientes').innerHTML = lista.map(c => `
      <tr>
        <td>${c.Nombre}</td>
        <td>${c.Telefono || '-'}</td>
        <td>P${c.TipoPrecio || 1}</td>
        <td>${Utils.esActivo(c.Credito) ? 'Sí' : 'No'}</td>
        <td>${Utils.esActivo(c.Credito) ? Utils.formatMoney(c.LimiteCredito) : '-'}</td>
        <td class="actions">
          <button class="btn-icon" onclick="CRUDClientes.editar('${c.ClienteID}')"><i class="fas fa-pen"></i></button>
          <button class="btn-icon danger" onclick="CRUDClientes.eliminar('${c.ClienteID}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  },

  filtrar(texto) {
    const filtrado = State.clientes.filter(c => 
      c.Nombre.toLowerCase().includes(texto.toLowerCase())
    );
    this.render(filtrado);
  },

  mostrarForm(id = null) {
    const form = Utils.$('form-cliente');
    form.reset();
    Utils.$('cli-id').value = '';
    Utils.$('grupo-limite').style.display = 'none';
    
    const radio1 = document.querySelector('input[name="cli-precio"][value="1"]');
    if (radio1) radio1.checked = true;
    
    const email = Utils.$('cli-email');
    if (email) email.value = '';
    const direccion = Utils.$('cli-direccion');
    if (direccion) direccion.value = '';
    
    if (id) {
      const c = Utils.buscarEnArray(State.clientes, 'ClienteID', id);
      if (c) {
        Utils.$('form-cliente-titulo').innerHTML = '<i class="fas fa-user"></i> Editar Cliente';
        Utils.$('cli-id').value = id;
        Utils.$('cli-nombre').value = c.Nombre || '';
        Utils.$('cli-telefono').value = c.Telefono || '';
        if (email) email.value = c.Email || '';
        if (direccion) direccion.value = c.Direccion || '';
        
        const tipoPrecio = c.TipoPrecio || 1;
        const radioPrice = document.querySelector(`input[name="cli-precio"][value="${tipoPrecio}"]`);
        if (radioPrice) radioPrice.checked = true;
        
        Utils.$('cli-credito').checked = Utils.esActivo(c.Credito);
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
      email: Utils.$('cli-email')?.value || '',
      direccion: Utils.$('cli-direccion')?.value || '',
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
          Email: data.email,
          Direccion: data.direccion,
          TipoPrecio: data.tipoPrecio,
          Credito: data.credito ? 'Y' : 'N',
          LimiteCredito: data.limiteCredito
        };
        res = await API.editarCliente(id, updateData);
      } else {
        res = await API.crearCliente(data);
      }
      
      if (res?.success) {
        Modal.cerrar('modal-form-cliente');
        Guardado.show(
          id ? '¡Actualizado!' : '¡Cliente Guardado!',
          id ? 'El cliente se actualizó correctamente' : 'El cliente se registró correctamente'
        );
        sincronizar();
      } else {
        Toast.error(res?.error || 'Error');
      }
    } catch {
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
      if (res?.success) {
        Toast.success('Eliminado');
        sincronizar();
      } else {
        Toast.error(res?.error || 'Error');
      }
    } catch {
      Toast.error('Error de conexión');
    }
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
      Utils.$('search-producto').value = '';
      Utils.$('busqueda-cantidad').value = '1';
      Utils.$('busqueda-precio-tipo').value = State.tipoPrecioActual;
      const filtroCat = Utils.$('filtro-categoria');
      if (filtroCat) filtroCat.value = '';
      const filtroMarca = Utils.$('filtro-marca');
      if (filtroMarca) filtroMarca.value = '';
      cargarFiltrosProductos();
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

  hide() {
    Utils.$('toast').classList.remove('show');
  }
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

function cerrarConfirm(result) {
  Confirm.close(result);
}

// ============================================
// GUARDADO
// ============================================
const Guardado = {
  show(titulo = '¡Guardado!', mensaje = 'El registro se guardó correctamente') {
    Utils.$('guardado-titulo').textContent = titulo;
    Utils.$('guardado-mensaje').textContent = mensaje;
    Modal.abrir('modal-guardado');
    setTimeout(() => Modal.cerrar('modal-guardado'), 1500);
  }
};

// ============================================
// ADMIN AUTH
// ============================================
const AdminAuth = {
  accionPendiente: null,
  datosPendientes: null,
  
  esAdmin() {
    return State.usuario?.rol?.toLowerCase() === 'admin' || 
           State.usuario?.rol?.toLowerCase() === 'administrador';
  },
  
  solicitar(accion, datos = null) {
    this.accionPendiente = accion;
    this.datosPendientes = datos;
    
    const mensajes = {
      'cancelar': 'Cancelar la venta actual',
      'eliminar-item': 'Eliminar producto del carrito',
      'cambiar-precio': 'Cambiar el precio de un producto',
      'credito-excedido': `Venta a crédito excede el límite. Saldo actual: ${Utils.formatMoney(datos?.saldo || 0)}, Límite: ${Utils.formatMoney(datos?.limite || 0)}, Nueva venta: ${Utils.formatMoney(datos?.total || 0)}`,
      'volver-conteo': 'Modificar el conteo de caja después de calculado'
    };
    
    Utils.$('auth-action-desc').textContent = mensajes[accion] || accion;
    Utils.$('admin-email').value = '';
    Utils.$('admin-password').value = '';
    Utils.$('auth-error').textContent = '';
    
    Modal.abrir('modal-admin-auth');
    setTimeout(() => Utils.$('admin-email')?.focus(), 100);
  },
  
  async verificar() {
    const email = Utils.$('admin-email').value.trim();
    const password = Utils.$('admin-password').value;
    const errorDiv = Utils.$('auth-error');
    const btn = Utils.$('btn-auth-confirm');
    
    if (!email || !password) {
      errorDiv.textContent = 'Ingresa email y contraseña';
      return false;
    }
    
    btn.disabled = true;
    btn.classList.add('loading');
    
    try {
      const res = await API.login(email, password);
      
      if (res?.success) {
        const rol = res.usuario?.rol?.toLowerCase();
        if (rol === 'admin' || rol === 'administrador') {
          btn.disabled = false;
          btn.classList.remove('loading');
          return true;
        } else {
          errorDiv.textContent = 'El usuario no tiene permisos de administrador';
        }
      } else {
        errorDiv.textContent = res?.error || 'Credenciales incorrectas';
      }
    } catch (e) {
      errorDiv.textContent = 'Error de conexión';
    }
    
    btn.disabled = false;
    btn.classList.remove('loading');
    return false;
  },
  
  async ejecutar() {
    const autorizado = await this.verificar();
    if (!autorizado) return;
    
    Modal.cerrar('modal-admin-auth');
    
    switch (this.accionPendiente) {
      case 'cancelar':
        Venta.cancelarConfirmado();
        break;
      case 'eliminar-item':
        Cart.eliminar(this.datosPendientes);
        break;
      case 'cambiar-precio':
        abrirModalCambiarPrecio(this.datosPendientes);
        break;
      case 'credito-excedido':
        const total = Cart.calcularTotal();
        const efectivo = parseFloat((Utils.$('cobro-efectivo')?.value || '0').replace(/[^0-9.]/g, '')) || 0;
        await Cobro.procesarVenta(total, efectivo);
        break;
      case 'volver-conteo':
        Turno.ejecutarVolverConteo();
        break;
    }
    
    this.accionPendiente = null;
    this.datosPendientes = null;
    Toast.success('Acción autorizada');
  }
};

// ============================================
// SISTEMA DE TURNOS
// ============================================
const Turno = {
  actual: null,
  movimientos: [],
  datosCorte: null,
  conteoActual: null,

  async verificar() {
    try {
      const res = await API.verificarTurno(
        State.usuario.empresaID, 
        State.usuario.sucursalID, 
        State.usuario.email
      );
      
      if (res?.success) {
        if (res.turnoAbierto) {
          this.actual = res.turno;
          this.movimientos = res.movimientos || [];
          this.actualizarUI(true);
          return true;
        } else {
          this.actual = null;
          this.movimientos = [];
          this.actualizarUI(false);
          return false;
        }
      }
      return false;
    } catch (e) {
      console.error('Error verificando turno:', e);
      return false;
    }
  },

  actualizarUI(turnoAbierto) {
    const indicador = Utils.$('turno-indicador');
    const btnAbrir = Utils.$('btn-abrir-turno');
    const btnCerrar = Utils.$('btn-cerrar-turno');
    const btnMovimientos = Utils.$('btn-movimientos-caja');
    
    if (turnoAbierto && this.actual) {
      if (indicador) {
        indicador.innerHTML = `<i class="fas fa-cash-register"></i> <span>Turno abierto</span>`;
        indicador.className = 'turno-indicador activo';
      }
      if (btnAbrir) btnAbrir.style.display = 'none';
      if (btnCerrar) btnCerrar.style.display = 'flex';
      if (btnMovimientos) btnMovimientos.style.display = 'flex';
    } else {
      if (indicador) {
        indicador.innerHTML = `<i class="fas fa-lock"></i> <span>Sin turno</span>`;
        indicador.className = 'turno-indicador inactivo';
      }
      if (btnAbrir) btnAbrir.style.display = 'flex';
      if (btnCerrar) btnCerrar.style.display = 'none';
      if (btnMovimientos) btnMovimientos.style.display = 'none';
    }
  },

  abrirModalAbrir() {
    Utils.$('turno-saldo-inicial').value = '';
    Utils.$('turno-error').textContent = '';
    Modal.abrir('modal-abrir-turno');
    setTimeout(() => Utils.$('turno-saldo-inicial')?.focus(), 100);
  },

  async abrir() {
    const saldoInicial = parseFloat(Utils.$('turno-saldo-inicial').value) || 0;
    const errorDiv = Utils.$('turno-error');
    const btn = Utils.$('btn-confirmar-turno');
    
    if (saldoInicial < 0) {
      errorDiv.textContent = 'El saldo inicial no puede ser negativo';
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Abriendo...';
    
    try {
      const res = await API.abrirTurno({
        empresaID: State.usuario.empresaID,
        sucursalID: State.usuario.sucursalID,
        usuarioEmail: State.usuario.email,
        saldoInicial
      });
      
      if (res?.success) {
        this.actual = {
          id: res.turnoID,
          horaInicio: res.horaInicio,
          saldoInicial: res.saldoInicial
        };
        this.movimientos = [];
        this.actualizarUI(true);
        Modal.cerrar('modal-abrir-turno');
        Toast.success('Turno abierto correctamente');
      } else {
        errorDiv.textContent = res?.error || 'Error al abrir turno';
      }
    } catch (e) {
      errorDiv.textContent = 'Error de conexión';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-play"></i> Abrir Turno';
    }
  },

  abrirModalMovimiento(tipo = 'Egreso') {
    Utils.$('mov-tipo').value = tipo;
    Utils.$('mov-categoria').value = '';
    Utils.$('mov-concepto').value = '';
    Utils.$('mov-monto').value = '';
    Utils.$('mov-observaciones').value = '';
    Utils.$('mov-error').textContent = '';
    
    Utils.$('modal-movimiento-titulo').textContent = tipo === 'Ingreso' ? 'Ingreso a Caja' : 'Retiro de Caja';
    Utils.$('modal-movimiento-icon').className = tipo === 'Ingreso' ? 'fas fa-arrow-down' : 'fas fa-arrow-up';
    
    Modal.abrir('modal-movimiento-caja');
    setTimeout(() => Utils.$('mov-monto')?.focus(), 100);
  },

  async registrarMovimiento() {
    const tipo = Utils.$('mov-tipo').value;
    const categoria = Utils.$('mov-categoria').value.trim();
    const concepto = Utils.$('mov-concepto').value.trim();
    const monto = parseFloat(Utils.$('mov-monto').value) || 0;
    const observaciones = Utils.$('mov-observaciones').value.trim();
    const errorDiv = Utils.$('mov-error');
    const btn = Utils.$('btn-confirmar-movimiento');
    
    if (!concepto) {
      errorDiv.textContent = 'Ingresa un concepto';
      return;
    }
    if (monto <= 0) {
      errorDiv.textContent = 'El monto debe ser mayor a 0';
      return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    
    try {
      const res = await API.registrarMovimiento({
        tipo,
        categoria,
        concepto,
        monto,
        observaciones,
        usuarioEmail: State.usuario.email
      });
      
      if (res?.success) {
        this.movimientos.push({
          id: res.movimientoID,
          tipo,
          categoria,
          concepto,
          monto,
          fecha: new Date().toISOString(),
          observaciones
        });
        Modal.cerrar('modal-movimiento-caja');
        Toast.success(tipo === 'Ingreso' ? 'Ingreso registrado' : 'Retiro registrado');
      } else {
        errorDiv.textContent = res?.error || 'Error al registrar';
      }
    } catch (e) {
      errorDiv.textContent = 'Error de conexión';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Guardar';
    }
  },

  abrirModalCerrar() {
    if (!this.actual) {
      Toast.error('No hay turno abierto');
      return;
    }
    
    this.resetearConteo();
    Modal.abrir('modal-cerrar-turno');
  },

  resetearConteo() {
    ['050', '1', '2', '5', '10', '20', '50', '100', '200', '500', '1000'].forEach(d => {
      const input = Utils.$('cont-' + d);
      if (input) input.value = '0';
      const sub = Utils.$('sub-' + d);
      if (sub) sub.textContent = '$0.00';
    });
    
    ['tarjeta', 'transferencia', 'otro'].forEach(m => {
      const input = Utils.$('cont-' + m);
      if (input) input.value = '0';
    });
    
    const totalEfectivo = Utils.$('conteo-total-efectivo');
    if (totalEfectivo) totalEfectivo.textContent = '$0.00';
    
    const totalGeneral = Utils.$('conteo-total-general');
    if (totalGeneral) totalGeneral.textContent = '$0.00';
    
    const obs = Utils.$('corte-observaciones');
    if (obs) obs.value = '';
  },

  calcularConteo() {
    const denominaciones = {
      '050': 0.5, '1': 1, '2': 2, '5': 5, '10': 10,
      '20': 20, '50': 50, '100': 100, '200': 200, '500': 500, '1000': 1000
    };
    
    let totalEfectivo = 0;
    
    Object.keys(denominaciones).forEach(d => {
      const cantidad = parseInt(Utils.$('cont-' + d)?.value) || 0;
      const subtotal = cantidad * denominaciones[d];
      totalEfectivo += subtotal;
      
      const subSpan = Utils.$('sub-' + d);
      if (subSpan) subSpan.textContent = Utils.formatMoney(subtotal);
    });
    
    const tarjeta = parseFloat(Utils.$('cont-tarjeta')?.value) || 0;
    const transferencia = parseFloat(Utils.$('cont-transferencia')?.value) || 0;
    const otro = parseFloat(Utils.$('cont-otro')?.value) || 0;
    
    const totalGeneral = totalEfectivo + tarjeta + transferencia + otro;
    
    const spanEfectivo = Utils.$('conteo-total-efectivo');
    if (spanEfectivo) spanEfectivo.textContent = Utils.formatMoney(totalEfectivo);
    
    const spanGeneral = Utils.$('conteo-total-general');
    if (spanGeneral) spanGeneral.textContent = Utils.formatMoney(totalGeneral);
    
    this.conteoActual = {
      efectivo: totalEfectivo,
      tarjeta,
      transferencia,
      otro,
      total: totalGeneral
    };
  },

  async procesarCorte() {
    this.calcularConteo();
    
    if (!this.conteoActual || this.conteoActual.total === 0) {
      Toast.warning('Ingresa el conteo de caja');
      return;
    }
    
    const btn = Utils.$('btn-confirmar-corte');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando...';
    Toast.loading('Calculando corte...');
    
    try {
      const res = await API.calcularResumenTurno(
        this.actual.id,
        State.usuario.empresaID,
        State.usuario.sucursalID,
        State.usuario.email
      );
      
      Toast.hide();
      
      if (res?.success) {
        this.datosCorte = res.resumen;
        this.mostrarResultado();
      } else {
        Toast.error(res?.error || 'Error al calcular');
      }
    } catch (e) {
      Toast.error('Error de conexión');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-calculator"></i> Calcular Corte';
    }
  },

  mostrarResultado() {
    const r = this.datosCorte;
    const conteo = this.conteoActual;
    
    const diferencia = conteo.efectivo - r.efectivoEsperado;
    
    const header = Utils.$('resultado-corte-header');
    const box = Utils.$('resultado-box');
    const icon = Utils.$('resultado-icon');
    const titulo = Utils.$('resultado-titulo');
    const mensaje = Utils.$('resultado-mensaje');
    
    if (Math.abs(diferencia) < 1) {
      header.className = 'modal-header success';
      box.className = 'resultado-principal success';
      icon.innerHTML = '<i class="fas fa-check-circle"></i>';
      titulo.textContent = '¡Cuadre Perfecto!';
      mensaje.textContent = 'El efectivo en caja coincide con las ventas';
    } else if (diferencia > 0) {
      header.className = 'modal-header warning';
      box.className = 'resultado-principal warning';
      icon.innerHTML = '<i class="fas fa-plus-circle"></i>';
      titulo.textContent = 'Hay un Sobrante';
      mensaje.textContent = `Tienes ${Utils.formatMoney(diferencia)} de más en caja`;
    } else {
      header.className = 'modal-header danger';
      box.className = 'resultado-principal danger';
      icon.innerHTML = '<i class="fas fa-minus-circle"></i>';
      titulo.textContent = 'Hay un Faltante';
      mensaje.textContent = `Faltan ${Utils.formatMoney(Math.abs(diferencia))} en caja`;
    }
    
    Utils.$('res-ventas').textContent = Utils.formatMoney(r.ventasTotales);
    Utils.$('res-esperado').textContent = Utils.formatMoney(r.efectivoEsperado);
    Utils.$('res-contado').textContent = Utils.formatMoney(conteo.efectivo);
    
    const difRow = Utils.$('res-diferencia-row');
    const difSpan = Utils.$('res-diferencia');
    difSpan.textContent = (diferencia >= 0 ? '+' : '') + Utils.formatMoney(diferencia);
    difRow.className = 'resumen-row diferencia ' + (diferencia >= 0 ? 'positivo' : 'negativo');
    
    Utils.$('res-contado-tipo').textContent = Utils.formatMoney(r.contado);
    Utils.$('res-credito').textContent = Utils.formatMoney(r.credito);
    Utils.$('res-canceladas').textContent = Utils.formatMoney(r.canceladas);
    Utils.$('res-efectivo').textContent = Utils.formatMoney(r.efectivo);
    Utils.$('res-tarjeta').textContent = Utils.formatMoney(r.tarjeta);
    Utils.$('res-transferencia').textContent = Utils.formatMoney(r.transferencia);
    Utils.$('res-ingresos').textContent = Utils.formatMoney(r.ingresos || r.depositos || 0);
    Utils.$('res-egresos').textContent = Utils.formatMoney(r.egresos || r.retiros || 0);
    
    Modal.cerrar('modal-cerrar-turno');
    Modal.abrir('modal-resultado-corte');
  },

  volverConteo() {
    if (AdminAuth.esAdmin()) {
      this.ejecutarVolverConteo();
    } else {
      AdminAuth.solicitar('volver-conteo', null);
    }
  },

  ejecutarVolverConteo() {
    Modal.cerrar('modal-resultado-corte');
    Modal.abrir('modal-cerrar-turno');
  },

  async confirmarCierre() {
    const confirmado = await Confirm.show(
      '¿Cerrar turno definitivamente?',
      'Una vez cerrado no podrás modificar este corte',
      'warning'
    );
    
    if (!confirmado) return;
    
    const btn = Utils.$('btn-cerrar-turno-final');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cerrando...';
    Toast.loading('Cerrando turno...');
    
    try {
      const observaciones = Utils.$('corte-observaciones')?.value || '';
      
      const res = await API.cerrarTurno({
        turnoID: this.actual.id,
        empresaID: State.usuario.empresaID,
        sucursalID: State.usuario.sucursalID,
        usuarioEmail: State.usuario.email,
        efectivoReal: this.conteoActual.efectivo,
        tarjetaReal: this.conteoActual.tarjeta,
        transferenciaReal: this.conteoActual.transferencia,
        otroReal: this.conteoActual.otro,
        observaciones
      });
      
      if (res?.success) {
        this.actual = null;
        this.movimientos = [];
        this.datosCorte = null;
        this.conteoActual = null;
        this.actualizarUI(false);
        Modal.cerrar('modal-resultado-corte');
        Toast.success('Turno cerrado correctamente');
      } else {
        Toast.error(res?.error || 'Error al cerrar turno');
      }
    } catch (e) {
      Toast.error('Error de conexión');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-lock"></i> Cerrar Turno';
    }
  },

  puedeVender() {
    if (!this.actual) {
      Toast.warning('Debes abrir un turno para vender');
      this.abrirModalAbrir();
      return false;
    }
    return true;
  }
};

// ============================================
// EVENTOS
// ============================================
const Events = {
  init() {
    Utils.$('login-form')?.addEventListener('submit', (e) => Auth.login(e));
    
    Utils.$('barcode')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        Cart.buscarPorCodigo(e.target.value);
        e.target.value = '';
      }
    });
    
    document.addEventListener('keydown', e => {
      if (Utils.$('app').style.display !== 'grid') return;
      
      const shortcuts = {
        'F2': () => Modal.abrir('modal-busqueda'),
        'F4': () => { if (State.carrito.length) solicitarAccionAdmin('cancelar'); },
        'F8': () => Venta.ponerEnEspera(),
        'F12': () => Cobro.abrirModal(),
        'Escape': () => Modal.cerrarTodos()
      };
      
      if (shortcuts[e.key]) {
        e.preventDefault();
        shortcuts[e.key]();
      }
    });
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

function solicitarAccionAdmin(accion, datos = null) {
  if (AdminAuth.esAdmin()) {
    switch (accion) {
      case 'cancelar': Venta.cancelar(); break;
      case 'eliminar-item': Cart.eliminar(datos); break;
      case 'cambiar-precio': abrirModalCambiarPrecio(datos); break;
    }
  } else {
    AdminAuth.solicitar(accion, datos);
  }
}

function solicitarCambioPrecio(index) {
  if (AdminAuth.esAdmin()) {
    abrirModalCambiarPrecio(index);
  } else {
    AdminAuth.solicitar('cambiar-precio', index);
  }
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
  if (producto) {
    let btns = '';
    for (let i = 1; i <= 6; i++) {
      const precio = parseFloat(producto['Precio' + i]);
      if (precio && precio > 0) {
        btns += `<button onclick="Utils.$('nuevo-precio').value='${precio}'">P${i}: ${Utils.formatMoney(precio)}</button>`;
      }
    }
    preciosDiv.innerHTML = btns || '<span style="color:var(--gray-400)">No hay precios configurados</span>';
  } else {
    preciosDiv.innerHTML = '';
  }
  
  Modal.abrir('modal-cambiar-precio');
  setTimeout(() => Utils.$('nuevo-precio')?.focus(), 100);
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

function confirmarAutorizacionAdmin() {
  AdminAuth.ejecutar();
}

function addEfectivoCobro(v) { Cobro.addEfectivoCobro(v); }
function setExactoCobro() { Cobro.setExactoCobro(); }
function limpiarEfectivoCobro() { Cobro.limpiarCobro(); }
function calcularCambioCobro() { Cobro.calcularCambioCobro(); }

function seleccionarCliente(id) { Cliente.seleccionar(id); }
function filtrarClientesSeleccion(t) { Cliente.filtrarSeleccion(t); }

function agregarProductoPorID(id) { Cart.agregarPorID(id); }
function cambiarCantidadBusqueda(d) {
  const input = Utils.$('busqueda-cantidad');
  input.value = Math.max(1, Math.round((parseFloat(input.value) || 1) + d));
}

function renderListaProductos(lista) {
  const tp = parseInt(Utils.$('busqueda-precio-tipo')?.value) || State.tipoPrecioActual;
  const tbody = Utils.$('productos-tbody');
  
  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty" style="text-align:center;padding:40px;color:var(--gray-400);">
          <i class="fas fa-search" style="font-size:32px;margin-bottom:12px;display:block;opacity:0.3;"></i>
          No se encontraron productos
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = lista.map(p => {
    const precio = parseFloat(p['Precio' + tp]) || parseFloat(p.Precio1) || 0;
    const tieneDescuento = Utils.esActivo(p.PermiteDescuento) && parseFloat(p.DescuentoMax) > 0;
    const imgURL = p.Imagen_URL || '';
    const nombreMostrar = p.PuntoVentaNombre || p.NombreProducto;
    const esPeso = Utils.esActivo(p.VentaPorPeso);
    const unidad = p.UnidadBase || p.UnidadVenta || 'PZ';
    
    return `
      <tr onclick="agregarProductoPorID('${p.ProductoID}')">
        <td class="col-code">
          <div class="product-cell-with-img">
            ${imgURL ? `<img src="${imgURL}" class="product-thumb" onerror="this.style.display='none'">` : '<div class="product-thumb-placeholder"><i class="fas fa-box"></i></div>'}
            <span>${p.CodigoBarras || '---'}</span>
          </div>
        </td>
        <td class="col-name">
          ${nombreMostrar}
          ${esPeso ? '<span class="badge-peso"><i class="fas fa-balance-scale"></i></span>' : ''}
        </td>
        <td class="col-unit"><span class="unit-badge ${esPeso ? 'peso' : ''}">${unidad}</span></td>
        <td class="col-discount">${tieneDescuento ? `<span class="discount-badge"><i class="fas fa-tag"></i> ${p.DescuentoMax}%</span>` : '-'}</td>
        <td class="col-price">${Utils.formatMoney(precio)}${esPeso ? '<small>/' + unidad + '</small>' : ''}</td>
      </tr>
    `;
  }).join('');
}

function filtrarProductos() {
  const texto = (Utils.$('search-producto')?.value || '').toLowerCase();
  const categoria = Utils.$('filtro-categoria')?.value || '';
  const marca = Utils.$('filtro-marca')?.value || '';
  
  const filtrado = State.productos.filter(p => {
    const matchTexto = !texto || 
      (p.PuntoVentaNombre || '').toLowerCase().includes(texto) ||
      (p.NombreProducto || '').toLowerCase().includes(texto) ||
      String(p.CodigoBarras || '').includes(texto);
    
    const matchCategoria = !categoria || (p.Categoria || '') === categoria;
    const matchMarca = !marca || (p.Marca || '') === marca;
    
    return matchTexto && matchCategoria && matchMarca;
  });
  
  renderListaProductos(filtrado);
}

function cargarFiltrosProductos() {
  const categorias = [...new Set(State.productos.map(p => p.Categoria).filter(Boolean))].sort();
  const marcas = [...new Set(State.productos.map(p => p.Marca).filter(Boolean))].sort();
  
  const filtroCat = Utils.$('filtro-categoria');
  if (filtroCat) {
    filtroCat.innerHTML = '<option value="">Todas</option>' + 
      categorias.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  
  const filtroMarca = Utils.$('filtro-marca');
  if (filtroMarca) {
    filtroMarca.innerHTML = '<option value="">Todas</option>' + 
      marcas.map(m => `<option value="${m}">${m}</option>`).join('');
  }
}

function mostrarFormProducto(id) { CRUDProductos.mostrarForm(id); }
function guardarProducto() { CRUDProductos.guardar(); }
function filtrarProductosCRUD(t) { CRUDProductos.filtrar(t); }

function mostrarFormCliente(id) { CRUDClientes.mostrarForm(id); }
function guardarCliente() { CRUDClientes.guardar(); }
function filtrarClientesCRUD(t) { CRUDClientes.filtrar(t); }

function toggleCredito() {
  Utils.$('grupo-limite').style.display = Utils.$('cli-credito').checked ? 'block' : 'none';
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

async function sincronizar() {
  try {
    const res = await API.cargarDatos(State.usuario.empresaID);
    if (res?.success) {
      State.productos = res.productos || [];
      State.clientes = res.clientes || [];
      State.metodosPago = res.metodosPago || [];
      State.proveedores = res.proveedores || [];
      UI.renderMetodosPago();
      if (Utils.$('modal-productos')?.classList.contains('active')) CRUDProductos.render();
      if (Utils.$('modal-clientes')?.classList.contains('active')) CRUDClientes.render();
    }
  } catch {}
}

async function sincronizarManual() {
  Toast.loading('Sincronizando...');
  await sincronizar();
  Toast.success('Datos actualizados');
}

function imprimirTicket() {
  const ticketData = State.ultimaVenta || {
    ticket: State.ticketNum,
    fecha: new Date(),
    items: State.carrito,
    total: Cart.calcularTotal(),
    descuentos: Cart.calcularDescuentos(),
    cliente: State.clienteSeleccionado?.Nombre || 'Público General',
    tipoVenta: State.tipoVenta,
    efectivo: 0,
    cambio: 0
  };
  
  const fechaFormateada = ticketData.fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaFormateada = ticketData.fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  
  const itemsHTML = ticketData.items.map(item => {
    const descuento = item.descuentoMonto || 0;
    const cantidadDisplay = item.ventaPorPeso ? item.cantidad.toFixed(3) : item.cantidad;
    const unidad = item.unidadBase || item.UnidadVenta || 'PZ';
    return `
      <div class="item">
        <span class="item-name">${item.PuntoVentaNombre || item.NombreProducto}</span>
        <span class="item-qty">${cantidadDisplay} ${unidad} x ${Utils.formatMoney(item.precioUnitario)}</span>
        <span class="item-price">${Utils.formatMoney(item.subtotal)}</span>
      </div>
      ${descuento > 0 ? `<div class="item-discount">- Descuento: -${Utils.formatMoney(descuento)}</div>` : ''}
    `;
  }).join('');
  
  const subtotal = ticketData.total + ticketData.descuentos;
  
  const ticketHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:10px;background:#fff;color:#000}.header{text-align:center;border-bottom:1px dashed #000;padding-bottom:10px;margin-bottom:10px}.header h2{font-size:16px;margin-bottom:5px}.info{margin-bottom:10px;font-size:11px}.info p{margin:2px 0}.items{border-top:1px dashed #000;border-bottom:1px dashed #000;padding:10px 0}.item{display:flex;justify-content:space-between;margin-bottom:5px;font-size:11px}.item-name{flex:1;margin-right:10px}.totals{padding:10px 0}.totals .row{display:flex;justify-content:space-between;margin-bottom:3px}.totals .total-final{font-size:14px;font-weight:bold;border-top:1px solid #000;padding-top:5px;margin-top:5px}.footer{text-align:center;border-top:1px dashed #000;padding-top:10px;margin-top:10px;font-size:11px}@media print{body{width:80mm}@page{margin:0;size:80mm auto}}</style>
  </head><body>
    <div class="header"><h2>${State.usuario?.empresaNombre || 'CAFI POS'}</h2><p>${State.usuario?.sucursalNombre || ''}</p></div>
    <div class="info"><p><strong>Ticket:</strong> #${String(ticketData.ticket).padStart(4, '0')}</p><p><strong>Fecha:</strong> ${fechaFormateada}</p><p><strong>Hora:</strong> ${horaFormateada}</p><p><strong>Cliente:</strong> ${ticketData.cliente}</p><p><strong>Atendió:</strong> ${State.usuario?.nombre || 'Usuario'}</p></div>
    <div class="items">${itemsHTML}</div>
    <div class="totals">
      <div class="row"><span>Subtotal:</span><span>${Utils.formatMoney(subtotal)}</span></div>
      ${ticketData.descuentos > 0 ? `<div class="row"><span>Descuentos:</span><span>-${Utils.formatMoney(ticketData.descuentos)}</span></div>` : ''}
      <div class="row total-final"><span>TOTAL:</span><span>${Utils.formatMoney(ticketData.total)}</span></div>
      ${ticketData.efectivo > 0 ? `<div class="row"><span>Efectivo:</span><span>${Utils.formatMoney(ticketData.efectivo)}</span></div><div class="row"><span>Cambio:</span><span>${Utils.formatMoney(ticketData.cambio)}</span></div>` : ''}
    </div>
    <div class="footer"><p>¡Gracias por su compra!</p></div>
  </body></html>`;
  
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (printWindow) {
    printWindow.document.write(ticketHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  } else {
    Toast.error('Habilita las ventanas emergentes para imprimir');
  }
}

// Funciones globales turno
function abrirMenuMovimientos() {
  const menu = Utils.$('menu-movimientos');
  const btn = Utils.$('btn-movimientos-caja');
  const rect = btn.getBoundingClientRect();
  
  menu.style.top = (rect.bottom + 5) + 'px';
  menu.style.left = rect.left + 'px';
  menu.style.display = 'block';
  
  setTimeout(() => {
    document.addEventListener('click', cerrarMenuMovimientosHandler);
  }, 10);
}

function cerrarMenuMovimientos() {
  Utils.$('menu-movimientos').style.display = 'none';
  document.removeEventListener('click', cerrarMenuMovimientosHandler);
}

function cerrarMenuMovimientosHandler(e) {
  if (!e.target.closest('#menu-movimientos') && !e.target.closest('#btn-movimientos-caja')) {
    cerrarMenuMovimientos();
  }
}
