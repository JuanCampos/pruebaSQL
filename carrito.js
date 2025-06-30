const carrito = [];
const carritoContainer = document.getElementById('carrito-container');
const abrirCarritoBtn = document.getElementById('abrir-carrito');
const cerrarCarritoBtn = document.getElementById('cerrar-carrito');
const carritoItems = document.getElementById('carrito-items');
const carritoCantidad = document.getElementById('carrito-cantidad');
const carritoTotal = document.getElementById('carrito-total');

abrirCarritoBtn.addEventListener('click', () => {
    carritoContainer.classList.toggle('hidden');
    renderCarrito();
});

cerrarCarritoBtn.addEventListener('click', () => {
    carritoContainer.classList.add('hidden');
});

function agregarAlCarrito(producto) {
    const existente = carrito.find(p => p.id === producto.id);
    const max = producto.stock ?? 9999;

    if (existente) {
        if (existente.cantidad + 1 > producto.stock) {
            alert(`No puedes agregar más de ${producto.stock} unidades de ${producto.nombre}.`);
            return;
        }
        existente.cantidad += 1;
    } else {
        producto.cantidad = 1;
        producto.stock = max;
        carrito.push(producto);
    }
    actualizarCarrito();
}

function eliminarDelCarrito(id) {
    const index = carrito.findIndex(p => p.id === id);
    if (index !== -1) {
        carrito.splice(index, 1);
    }
    actualizarCarrito();
}

function renderCarrito() {
    const carritoItems = document.getElementById('carrito-items');
    const carritoTotal = document.getElementById('carrito-total');

    if (!carritoItems || !carritoTotal) {
        console.warn('⚠ No se encontró el contenedor del carrito en el HTML.');
        return;
    }

    carritoItems.innerHTML = '';
    let total = 0;

    carrito.forEach(item => {
        total += item.precio * item.cantidad;

        const div = document.createElement('div');
        div.classList.add('carrito-item');

        const span = document.createElement('span');
        span.textContent = `${item.nombre} (x${item.cantidad}) - $${item.precio * item.cantidad} / Stock máx: ${item.stock}`;

        const controls = document.createElement('div');

        const btnSumar = document.createElement('button');
        btnSumar.textContent = '+';
        btnSumar.addEventListener('click', () => {
            sumar(item.id);
        });

        const btnRestar = document.createElement('button');
        btnRestar.textContent = '-';
        btnRestar.addEventListener('click', () => {
            restar(item.id);
        });

        const btnEliminar = document.createElement('button');
        btnEliminar.textContent = 'x';
        btnEliminar.addEventListener('click', () => {
            eliminarDelCarrito(item.id);
        });

        controls.appendChild(btnSumar);
        controls.appendChild(btnRestar);
        controls.appendChild(btnEliminar);

        div.appendChild(span);
        div.appendChild(controls);

        carritoItems.appendChild(div);
    });

    carritoTotal.textContent = total;
}


function actualizarCarrito() {
    carritoCantidad.textContent = carrito.reduce((sum, p) => sum + p.cantidad, 0);
    renderCarrito();
}

function sumar(id) {
    const prod = carrito.find(p => p.id === id);
    if (prod) {
        const max = prod.stock ?? 9999; // fallback alto si por error falta el stock
        if (prod.cantidad + 1 > max) {
            alert(`No puedes agregar más de ${max} unidades de ${prod.nombre}.`);
            return;
        }
        prod.cantidad += 1;
        actualizarCarrito();
    }
}

function restar(id) {
    const prod = carrito.find(p => p.id === id);
    if (prod) {
        prod.cantidad -= 1;
        if (prod.cantidad <= 0) {
            eliminarDelCarrito(id);
        } else {
            actualizarCarrito();
        }
    }
}

function enviarPedidoWhatsApp() {
    let mensaje = "Hola, les encargo:\n";
    carrito.forEach(item => {
        mensaje += `- ${item.nombre}: ${item.cantidad} packs\n`;
    });

    mensaje += `\nTotal: $${carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0)}`;
    mensaje += "\nGracias.";

    const telefono = "+5491158718826";
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
}


// ENVIAR POR WHATSAPP
document.getElementById('enviar-whatsapp').addEventListener('click', () => {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    // ✅ ENVIAR PEDIDO primero
    enviarPedidoWhatsApp();

    // ✅ Intentar descontar stock después
    descontarStockDespuesDelPedido();

    // Vaciar carrito para evitar doble envío
    carrito.length = 0;
    actualizarCarrito();
    cargarStock();
});

function descontarStockDespuesDelPedido() {
    if (carrito.length === 0) return;

    const itemsParaDescontar = carrito.map(item => ({
        id: item.id,
        cantidad: item.cantidad
    }));

    fetch('http://localhost:3000/descontar-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsParaDescontar)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => {
                alert("⚠ Ocurrió un error al descontar stock:\n" + JSON.stringify(err.errores, null, 2));
            });
        }
        return res.json();
    })
    .then(data => {
        if (data?.message) {
            console.log("✅ Stock descontado:", data.message);
        }
        // Podés refrescar catálogo
        cargarStock();
    })
    .catch(err => {
        console.error(err);
        alert("Error técnico al descontar stock. Revisar consola.");
    });
}
