// ============================================
// CAFI POS - MODALES
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('modals-container');
  if (container) {
    container.innerHTML = `
    
    <!-- MODAL: BÚSQUEDA PRODUCTOS -->
    <div id="modal-busqueda" class="modal-overlay">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h3><i class="fas fa-search"></i> Buscar Producto</h3>
          <button class="btn-close" onclick="cerrarModal('modal-busqueda')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-toolbar">
          <div class="search-field large">
            <i class="fas fa-search"></i>
            <input type="text" id="search-producto" placeholder="Buscar por nombre, código..." oninput="filtrarProductos(this.value)" autofocus>
          </div>
          <div class="toolbar-controls">
            <div class="qty-control">
              <label>Cantidad:</label>
              <button onclick="cambiarCantidadBusqueda(-1)">−</button>
              <input type="number" id="busqueda-cantidad" value="1" min="1">
              <button onclick="cambiarCantidadBusqueda(1)">+</button>
            </div>
            <div class="price-select">
              <label>Precio:</label>
              <select id="busqueda-precio-tipo" onchange="renderListaProductos(State.productos)">
                <option value="1">P1</option>
                <option value="2">P2</option>
                <option value="3">P3</option>
                <option value="4">P4</option>
                <option value="5">P5</option>
                <option value="6">P6</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-body no-padding">
          <table class="productos-table-large">
            <thead>
              <tr>
                <th class="col-code">Código</th>
                <th class="col-name">Producto</th>
                <th class="col-desc">Descripción</th>
                <th class="col-unit">Unidad</th>
                <th class="col-discount">Descuento</th>
                <th class="col-price">Precio</th>
              </tr>
            </thead>
            <tbody id="productos-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- MODAL: COBRO -->
    <div id="modal-cobro" class="modal-overlay">
      <div class="modal modal-sm modal-cobro">
        <div class="cobro-header">
          <small>Total a Pagar</small>
          <h2 id="cobro-total">$0.00</h2>
          <span class="badge" id="cobro-tipo-badge">CONTADO</span>
        </div>
        <div class="cobro-body">
          <div class="cobro-metodos" id="cobro-metodos"></div>
          <div class="cobro-field">
            <label>Efectivo recibido</label>
            <input type="text" id="cobro-efectivo" placeholder="$0.00" oninput="calcularCambioCobro()">
          </div>
          <div class="cobro-denoms">
            <button onclick="addEfectivoCobro(50)">$50</button>
            <button onclick="addEfectivoCobro(100)">$100</button>
            <button onclick="addEfectivoCobro(200)">$200</button>
            <button onclick="addEfectivoCobro(500)">$500</button>
            <button onclick="addEfectivoCobro(1000)">$1000</button>
            <button onclick="setExactoCobro()">Exacto</button>
            <button onclick="limpiarEfectivoCobro()">Limpiar</button>
          </div>
          <div class="cobro-cambio" id="cobro-cambio-box">
            <span>Cambio</span>
            <strong id="cobro-cambio">$0.00</strong>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="cerrarModal('modal-cobro')">Cancelar</button>
          <button class="btn btn-success" id="btn-confirmar-venta" onclick="confirmarVenta()">
            <i class="fas fa-check"></i>
            <span>Confirmar Venta</span>
            <div class="spinner"></div>
          </button>
        </div>
      </div>
    </div>
    
    <!-- MODAL: ÉXITO -->
    <div id="modal-exito" class="modal-overlay">
      <div class="modal modal-sm modal-success">
        <div class="success-content">
          <div class="success-icon"><i class="fas fa-check"></i></div>
          <h2>¡Venta Exitosa!</h2>
          <div class="success-details">
            <p>Ticket: <strong id="exito-ticket">#0001</strong></p>
            <p>Total: <strong id="exito-total">$0.00</strong></p>
            <p>Cambio: <strong id="exito-cambio">$0.00</strong></p>
          </div>
          <div class="print-options">
            <label class="checkbox-print">
              <input type="checkbox" id="auto-print" checked>
              <span>Imprimir ticket automáticamente</span>
            </label>
          </div>
          <div class="success-actions">
            <button class="btn btn-outline" onclick="imprimirTicket()"><i class="fas fa-print"></i> Imprimir</button>
            <button class="btn btn-primary" onclick="cerrarExito()"><i class="fas fa-plus"></i> Nueva Venta</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- MODAL: VENTAS EN ESPERA -->
    <div id="modal-espera" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3><i class="fas fa-clock"></i> Ventas en Espera</h3>
          <button class="btn-close" onclick="cerrarModal('modal-espera')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" id="espera-lista"></div>
      </div>
    </div>
    
    <!-- MODAL: CRUD PRODUCTOS -->
    <div id="modal-productos" class="modal-overlay">
      <div class="modal modal-xl">
        <div class="modal-header">
          <h3><i class="fas fa-box"></i> Productos</h3>
          <button class="btn-close" onclick="cerrarModal('modal-productos')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-toolbar">
          <div class="search-field">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Buscar producto..." oninput="filtrarProductosCRUD(this.value)">
          </div>
          <button class="btn btn-primary" onclick="mostrarFormProducto()"><i class="fas fa-plus"></i> Nuevo</button>
        </div>
        <div class="modal-body no-padding">
          <table class="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>P1</th>
                <th>P2</th>
                <th>P3</th>
                <th>P4</th>
                <th>P5</th>
                <th>P6</th>
                <th>Und</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="tbody-productos"></tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- MODAL: FORM PRODUCTO -->
    <div id="modal-form-producto" class="modal-overlay">
      <div class="modal modal-form-large">
        <div class="modal-header gradient">
          <h3 id="form-producto-titulo"><i class="fas fa-box"></i> Nuevo Producto</h3>
          <button class="btn-close light" onclick="cerrarModal('modal-form-producto')"><i class="fas fa-times"></i></button>
        </div>
        <form id="form-producto" onsubmit="event.preventDefault(); guardarProducto();">
          <input type="hidden" id="prod-id">
          <div class="modal-body-scroll">
            <div class="form-section-title"><i class="fas fa-info-circle"></i> Información General</div>
            <div class="form-grid-2">
              <div class="form-field span-2">
                <label>Nombre del Producto *</label>
                <input type="text" id="prod-nombre" placeholder="Ej: Coca Cola 600ml" required>
              </div>
              <div class="form-field">
                <label>Nombre en POS</label>
                <input type="text" id="prod-pv-nombre" placeholder="Nombre corto">
              </div>
              <div class="form-field">
                <label>Código de Barras</label>
                <input type="text" id="prod-codigo" placeholder="Escanea o escribe">
              </div>
              <div class="form-field">
                <label>Unidad de Venta</label>
                <select id="prod-unidad">
                  <option value="PZ">Pieza (PZ)</option>
                  <option value="KG">Kilogramo (KG)</option>
                  <option value="LT">Litro (LT)</option>
                  <option value="MT">Metro (MT)</option>
                  <option value="CJ">Caja (CJ)</option>
                  <option value="PQ">Paquete (PQ)</option>
                </select>
              </div>
            </div>
            <div class="form-section-title"><i class="fas fa-dollar-sign"></i> Precios de Venta</div>
            <div class="form-grid-3">
              <div class="form-field">
                <label>Precio 1 (Principal)</label>
                <div class="input-with-prefix"><span>$</span><input type="number" id="prod-precio1" step="0.01" placeholder="0.00"></div>
              </div>
              <div class="form-field">
                <label>Precio 2 (Mayoreo)</label>
                <div class="input-with-prefix"><span>$</span><input type="number" id="prod-precio2" step="0.01" placeholder="0.00"></div>
              </div>
              <div class="form-field">
                <label>Precio 3 (Especial)</label>
                <div class="input-with-prefix"><span>$</span><input type="number" id="prod-precio3" step="0.01" placeholder="0.00"></div>
              </div>
              <div class="form-field">
                <label>Precio 4</label>
                <div class="input-with-prefix"><span>$</span><input type="number" id="prod-precio4" step="0.01" placeholder="0.00"></div>
              </div>
              <div class="form-field">
                <label>Precio 5</label>
                <div class="input-with-prefix"><span>$</span><input type="number" id="prod-precio5" step="0.01" placeholder="0.00"></div>
              </div>
              <div class="form-field">
                <label>Precio 6</label>
                <div class="input-with-prefix"><span>$</span><input type="number" id="prod-precio6" step="0.01" placeholder="0.00"></div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="cerrarModal('modal-form-producto')"><i class="fas fa-times"></i> Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-guardar-producto"><i class="fas fa-save"></i> Guardar Producto</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- MODAL: CRUD CLIENTES -->
    <div id="modal-clientes" class="modal-overlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3><i class="fas fa-users"></i> Clientes</h3>
          <button class="btn-close" onclick="cerrarModal('modal-clientes')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-toolbar">
          <div class="search-field">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Buscar cliente..." oninput="filtrarClientesCRUD(this.value)">
          </div>
          <button class="btn btn-primary" onclick="mostrarFormCliente()"><i class="fas fa-plus"></i> Nuevo</button>
        </div>
        <div class="modal-body">
          <table class="data-table">
            <thead>
              <tr><th>Nombre</th><th>Teléfono</th><th>Precio</th><th>Crédito</th><th>Límite</th><th></th></tr>
            </thead>
            <tbody id="tbody-clientes"></tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- MODAL: FORM CLIENTE -->
    <div id="modal-form-cliente" class="modal-overlay">
      <div class="modal modal-form-medium">
        <div class="modal-header gradient">
          <h3 id="form-cliente-titulo"><i class="fas fa-user-plus"></i> Nuevo Cliente</h3>
          <button class="btn-close light" onclick="cerrarModal('modal-form-cliente')"><i class="fas fa-times"></i></button>
        </div>
        <form id="form-cliente" onsubmit="event.preventDefault(); guardarCliente();">
          <input type="hidden" id="cli-id">
          <div class="modal-body-scroll">
            <div class="form-section-title"><i class="fas fa-user"></i> Datos del Cliente</div>
            <div class="form-grid-2">
              <div class="form-field span-2">
                <label>Nombre Completo *</label>
                <input type="text" id="cli-nombre" placeholder="Nombre del cliente" required>
              </div>
              <div class="form-field">
                <label>Teléfono</label>
                <input type="tel" id="cli-telefono" placeholder="10 dígitos">
              </div>
            </div>
            <div class="form-section-title"><i class="fas fa-tags"></i> Tipo de Precio</div>
            <div class="price-selector">
              <label class="price-radio"><input type="radio" name="cli-precio" value="1" checked><span>P1<small>Principal</small></span></label>
              <label class="price-radio"><input type="radio" name="cli-precio" value="2"><span>P2<small>Mayoreo</small></span></label>
              <label class="price-radio"><input type="radio" name="cli-precio" value="3"><span>P3<small>Especial</small></span></label>
              <label class="price-radio"><input type="radio" name="cli-precio" value="4"><span>P4</span></label>
              <label class="price-radio"><input type="radio" name="cli-precio" value="5"><span>P5</span></label>
              <label class="price-radio"><input type="radio" name="cli-precio" value="6"><span>P6</span></label>
            </div>
            <div class="form-section-title"><i class="fas fa-credit-card"></i> Crédito</div>
            <div class="form-grid-2">
              <div class="form-field">
                <label class="checkbox-inline"><input type="checkbox" id="cli-credito" onchange="toggleCredito()"><span>Permitir ventas a crédito</span></label>
              </div>
              <div class="form-field" id="grupo-limite" style="display:none">
                <label>Límite de Crédito</label>
                <div class="input-with-prefix"><span>$</span><input type="number" id="cli-limite" step="0.01" placeholder="0.00"></div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="cerrarModal('modal-form-cliente')"><i class="fas fa-times"></i> Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btn-guardar-cliente"><i class="fas fa-save"></i> Guardar Cliente</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- MODAL: SELECCIONAR CLIENTE -->
    <div id="modal-seleccionar-cliente" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3><i class="fas fa-user-check"></i> Seleccionar Cliente</h3>
          <button class="btn-close" onclick="cerrarModal('modal-seleccionar-cliente')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-toolbar">
          <div class="search-field">
            <i class="fas fa-search"></i>
            <input type="text" id="buscar-cliente-sel" placeholder="Buscar cliente..." oninput="filtrarClientesSeleccion(this.value)">
          </div>
          <button class="btn btn-primary" onclick="cerrarModal('modal-seleccionar-cliente'); mostrarFormCliente();"><i class="fas fa-plus"></i> Nuevo</button>
        </div>
        <div class="modal-body">
          <div class="client-list">
            <div class="client-item" onclick="seleccionarCliente(null)">
              <div class="avatar neutral"><i class="fas fa-user-slash"></i></div>
              <div class="info"><strong>Público General</strong><small>Sin cliente asignado</small></div>
            </div>
            <div id="lista-clientes-sel"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- MODAL: INFO USUARIO -->
    <div id="modal-usuario" class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3><i class="fas fa-user-circle"></i> Mi Cuenta</h3>
          <button class="btn-close" onclick="cerrarModal('modal-usuario')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <div class="user-profile">
            <div class="avatar large" id="usuario-avatar-grande">US</div>
            <h3 id="usuario-nombre-completo">Usuario</h3>
            <p id="usuario-email-info">email@ejemplo.com</p>
          </div>
          <div class="user-details">
            <div class="detail"><i class="fas fa-building"></i><span id="usuario-empresa">Empresa</span></div>
            <div class="detail"><i class="fas fa-store"></i><span id="usuario-sucursal-info">Sucursal</span></div>
            <div class="detail"><i class="fas fa-id-badge"></i><span id="usuario-rol">Rol</span></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger btn-block" onclick="cerrarSesion()"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</button>
        </div>
      </div>
    </div>
    
    <!-- MODAL: CAMBIAR PRECIO -->
    <div id="modal-cambiar-precio" class="modal-overlay">
      <div class="modal modal-sm">
        <div class="modal-header">
          <h3><i class="fas fa-dollar-sign"></i> Cambiar Precio</h3>
          <button class="btn-close" onclick="cerrarModal('modal-cambiar-precio')"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="cambio-precio-index">
          <div class="producto-info-cambio">
            <strong id="cambio-precio-producto">Producto</strong>
            <small>Precio actual: <span id="cambio-precio-actual">$0.00</span></small>
          </div>
          <div class="field">
            <label>Nuevo Precio</label>
            <div class="input-with-prefix"><span>$</span><input type="number" id="nuevo-precio" step="0.01" placeholder="0.00"></div>
          </div>
          <div class="precios-rapidos">
            <span>Precios disponibles:</span>
            <div class="precios-btns" id="precios-disponibles"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="cerrarModal('modal-cambiar-precio')">Cancelar</button>
          <button class="btn btn-primary" onclick="aplicarNuevoPrecio()"><i class="fas fa-check"></i> Aplicar</button>
        </div>
      </div>
    </div>
    
    <!-- MODAL: CONFIRMACIÓN -->
    <div id="modal-confirm" class="modal-overlay">
      <div class="modal modal-confirm">
        <div class="confirm-icon" id="confirm-icon"><i class="fas fa-question-circle"></i></div>
        <h3 id="confirm-titulo">¿Estás seguro?</h3>
        <p id="confirm-mensaje">Esta acción no se puede deshacer.</p>
        <div class="confirm-buttons">
          <button class="btn btn-outline" onclick="cerrarConfirm(false)"><i class="fas fa-times"></i> Cancelar</button>
          <button class="btn btn-danger" id="btn-confirm-ok" onclick="cerrarConfirm(true)"><i class="fas fa-check"></i> Confirmar</button>
        </div>
      </div>
    </div>
    
    `;
  }
});
