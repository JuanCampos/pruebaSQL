// -----------------------------------------
// MENU LATERAL
// -----------------------------------------

const sideMenu = document.querySelector('aside');
const menuBtn = document.querySelector('#menu_bar');
const closeBtn = document.querySelector('#close_btn');

menuBtn?.addEventListener('click', () => {
    sideMenu.style.display = "block";
});

closeBtn?.addEventListener('click', () => {
    sideMenu.style.display = "none";
});

// -----------------------------------------
// DOMContentLoaded principal
// -----------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    obtenerMaterias();

    const formMateria = document.getElementById('form-materia');
    if (formMateria) {
        formMateria.addEventListener('submit', agregarMateria);
    }

    fetchPedidos();

    const formPedido = document.getElementById('form-pedido');
    if (formPedido) {
        formPedido.addEventListener('submit', handlePedidoSubmit);
    }

    cargarSelectStock();
    cargarStock();
});

// -----------------------------------------
// MATERIAS PRIMAS
// -----------------------------------------

function obtenerMaterias() {
    fetch('${API_BASE_URL}/descontar-stockias')
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#tabla-materias tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            data.forEach(materia => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${materia.id}</td>
                    <td>${materia.nombre}</td>
                    <td>${materia.cantidad_kg}</td>
                    <td>$${materia.precio_costo}</td>
                    <td>${materia.fecha_ingreso || ''}</td>
                    <td>
                        <button onclick="eliminarMateria(${materia.id})">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => console.error(err));
}

function agregarMateria(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const cantidad = parseFloat(document.getElementById('cantidad').value);
    const precio = parseFloat(document.getElementById('precio').value);
    const fecha = document.getElementById('fecha').value || null;

    fetch('${API_BASE_URL}/descontar-stockias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre,
            cantidad_kg: cantidad,
            precio_costo: precio,
            fecha_ingreso: fecha
        })
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('form-materia').reset();
            obtenerMaterias();
        })
        .catch(err => console.error(err));
}

function eliminarMateria(id) {
    if (confirm('¿Estás seguro de eliminar esta materia prima?')) {
        fetch(`${API_BASE_URL}/descontar-stockias/${id}`, { method: 'DELETE' })
            .then(() => {
                obtenerMaterias();
            })
            .catch(err => console.error(err));
    }
}

// -----------------------------------------
// PEDIDOS
// -----------------------------------------

function fetchPedidos() {
    fetch('${API_BASE_URL}/descontar-stockos')
        .then(res => res.json())
        .then(pedidos => {
            const hoy = new Date().toISOString().split('T')[0];

            const pedidosVigentes = pedidos.filter(p => p.fecha_entrega >= hoy);
            const pedidosVencidos = pedidos.filter(p => p.fecha_entrega < hoy);

            renderPedidos(pedidosVigentes, "#tabla-pedidos tbody");
            renderPedidos(pedidosVencidos, "#tabla-historial tbody");
        })
        .catch(err => console.error(err));
}

function renderPedidos(pedidos, selectorTbody) {
    const tbody = document.querySelector(selectorTbody);
    tbody.innerHTML = '';

    pedidos.forEach(pedido => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${pedido.nombre_comprador}</td>
            <td>${pedido.numero_pedido}</td>
            <td>${pedido.pago}</td>
            <td>${pedido.fecha_entrega}</td>
            <td>${pedido.estado}</td>
            <td><button class="btn-detalles" data-id="${pedido.id}">Detalles</button></td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-detalles').forEach(btn => {
        btn.addEventListener('click', () => {
            abrirModal(btn.dataset.id);
        });
    });
}

// -----------------------------------------
// MODAL PEDIDO DETALLES
// -----------------------------------------

let productosPedidoActual = [];

const modal = document.getElementById('modal');
const closeModalBtn = document.querySelector('.close-modal');
const pedidoInfo = document.getElementById('pedido-info');
const tablaProductos = document.querySelector('#tabla-productos tbody');
const formProducto = document.getElementById('form-producto');

function abrirModal(pedidoId) {
    modal?.classList.remove('hidden');

    fetch(`${API_BASE_URL}/descontar-stockos/${pedidoId}`)
        .then(res => res.json())
        .then(pedido => {
            pedidoInfo.innerHTML = `
                <p><strong>Cliente:</strong> ${pedido.nombre_comprador}</p>
                <p><strong>N° Pedido:</strong> ${pedido.numero_pedido}</p>
                <p><strong>Fecha Entrega:</strong> ${pedido.fecha_entrega}</p>
                <p><strong>Estado:</strong> ${pedido.estado}</p>
            `;
        });

    fetch(`${API_BASE_URL}/descontar-stockos/${pedidoId}/productos`)
        .then(res => res.json())
        .then(productos => {
            productosPedidoActual = productos;
            mostrarProductos(pedidoId);
        });

    modal.dataset.pedidoId = pedidoId;
}

closeModalBtn?.addEventListener('click', () => {
    modal?.classList.add('hidden');
    limpiarModal();
});

formProducto?.addEventListener('submit', e => {
    e.preventDefault();
    const pedidoId = modal.dataset.pedidoId;
    const stock_id = document.getElementById('stock_id').value || null;
    const producto = document.getElementById('producto').value;
    const cantidad = parseFloat(document.getElementById('cantidad').value);
    const costo = parseFloat(document.getElementById('costo').value);
    const subtotal = cantidad * costo;

    const payload = {
        stock_id: stock_id ? parseInt(stock_id) : null,
        producto,
        cantidad_kg: cantidad,
        costo_unitario: costo,
        subtotal
    };

    fetch(`${API_BASE_URL}/descontar-stockos/${pedidoId}/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(() => {
            fetch(`${API_BASE_URL}/descontar-stockos/${pedidoId}/productos`)
                .then(res => res.json())
                .then(productos => {
                    productosPedidoActual = productos;
                    mostrarProductos(pedidoId);
                    formProducto.reset();
                });
        });
});

function mostrarProductos(pedidoId) {
    tablaProductos.innerHTML = '';
    productosPedidoActual.forEach(prod => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${prod.producto}</td>
            <td>${prod.cantidad_kg}</td>
            <td>$${prod.costo_unitario.toFixed(2)}</td>
            <td>$${prod.subtotal.toFixed(2)}</td>
            <td><button onclick="eliminarProducto(${prod.id}, ${pedidoId})">Eliminar</button></td>
        `;
        tablaProductos.appendChild(tr);
    });
}

window.eliminarProducto = (prodId, pedidoId) => {
    fetch(`${API_BASE_URL}/descontar-stockos/${pedidoId}/productos/${prodId}`, {
        method: 'DELETE'
    })
        .then(res => res.json())
        .then(() => {
            return fetch(`${API_BASE_URL}/descontar-stockos/${pedidoId}/productos`);
        })
        .then(res => res.json())
        .then(productos => {
            productosPedidoActual = productos;
            mostrarProductos(pedidoId);
        })
        .catch(err => console.error(err));
};


function limpiarModal() {
    pedidoInfo.innerHTML = '';
    tablaProductos.innerHTML = '';
}

// -----------------------------------------
// CREAR NUEVO PEDIDO
// -----------------------------------------

function handlePedidoSubmit(e) {
    e.preventDefault();

    const nombre = document.getElementById('nombre_comprador').value;
    const numero = document.getElementById('numero_pedido').value;
    const pago = document.getElementById('pago').value;
    const fecha = document.getElementById('fecha_entrega').value;
    const estado = document.getElementById('estado').value;

    fetch('${API_BASE_URL}/descontar-stockos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre_comprador: nombre,
            numero_pedido: numero,
            pago,
            fecha_entrega: fecha,
            estado
        })
    })
        .then(res => res.json())
        .then(data => {
            alert("Pedido agregado correctamente!");
            document.getElementById('form-pedido').reset();
            fetchPedidos();
        })
        .catch(err => {
            console.error(err);
            alert("Error al guardar el pedido.");
        });
}

// -----------------------------------------
// STOCK
// -----------------------------------------

function cargarSelectStock() {
    fetch('${API_BASE_URL}/descontar-stock')
        .then(res => res.json())
        .then(stock => {
            const select = document.getElementById('stock_id');
            if (!select) return;

            select.innerHTML = '<option value="">-- Seleccionar producto --</option>';
            stock.forEach(item => {
                let estado = 'OK';
                if (item.cantidad_pack === 0) estado = 'AGOTADO';
                else if (item.cantidad_pack < 10) estado = 'POCO STOCK';

                select.innerHTML += `
                    <option value="${item.id}">
                        ${item.producto_terminado} (${item.cantidad_pack} packs) - ${estado}
                    </option>`;
            });
        });
}

function cargarStock() {
    fetch('${API_BASE_URL}/descontar-stock')
        .then(res => res.json())
        .then(data => {
            const catalogo = document.getElementById('catalogo');
            if (!catalogo) return;

            catalogo.innerHTML = '';
            data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <img src="${item.imagen_url || 'https://via.placeholder.com/150'}" alt="${item.producto_terminado}" />
                    <h3>${item.producto_terminado}</h3>
                    <p>Cantidad en stock: ${item.cantidad_pack}</p>
                    <p>Precio: $${item.precio}</p>
                    <button 
                        class="btn-editar-stock"
                        data-id="${item.id}"
                        data-cantidad="${item.cantidad_pack}"
                        data-precio="${item.precio}">
                    Editar
                    </button>
                `;
                catalogo.appendChild(card);
            });
        });
}
