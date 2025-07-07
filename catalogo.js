document.addEventListener('DOMContentLoaded', () => {
    fetch(`https://pruebasql-production.up.railway.app/stock`)
        .then(res => res.json())
        .then(data => {
            renderCatalogo(data);
        })
        .catch(err => console.error('Error al cargar productos:', err));
});

function renderCatalogo(productos) {
    const catalogo = document.getElementById('catalogo');
    catalogo.innerHTML = '';

    const cantidad = Number(prod.cantidad_pack);
    
    productos.forEach(item => {
        let estado = '';
        let clase = '';

        if (cantidad === 0) {
            estado = 'Agotado';
            clase = 'agotado';
        } else if (cantidad >= 1 && cantidad <= 10) {
            estado = 'Por agotarse';
            clase = 'agotandose';
        } else {
            estado = 'Disponible';
            clase = 'disponible';
        }

        const card = document.createElement('div');
        let botonCarrito = "";

        if (item.cantidad_pack > 0) {
            botonCarrito = `
              <button 
                class="btn-agregar-carrito"
                data-id="${item.id}"
                data-nombre="${item.producto_terminado}"
                data-precio="${item.precio}"
                data-stock="${cantidad}">
                Agregar al carrito
              </button>`;
        }

        card.className = 'card';
        card.innerHTML = `
            <img src="${item.imagen_url ? '/uploads/' + item.imagen_url : 'https://via.placeholder.com/150'}" alt="${item.producto_terminado}" width="100%">
            <h3>${item.producto_terminado}</h3>
            <p>Cantidad disponible: ${item.cantidad_pack}</p>
            <p>Precio: $${item.precio}</p>
            <p class="estado ${clase}">${estado}</p>
            ${botonCarrito}
        `;
        catalogo.appendChild(card);
    });

    document.querySelectorAll('.btn-agregar-carrito').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const nombre = btn.dataset.nombre;
            const precio = parseFloat(btn.dataset.precio);
            const stock = parseInt(btn.dataset.stock);

            agregarAlCarrito({
                id,
                nombre,
                precio,
                stock,
                cantidad: 1
            });
        });
    });
}

document.getElementById('abrir-carrito').addEventListener('click', mostrarCarrito);
document.getElementById('cerrar-carrito').addEventListener('click', () => {
    document.getElementById('carrito-modal').classList.add('hidden');
});

function mostrarCarrito() {
    const lista = document.getElementById('carrito-lista');
    const totalTag = document.getElementById('carrito-total');
    const carritoItems = document.getElementById('carrito-items');
    if (carritoItems) {
        lista.innerHTML = '';
    }
    let total = 0;
    carrito.forEach(item => {
        total += item.precio * item.cantidad;
        lista.innerHTML += `
            <li>${item.nombre} - $${item.precio} x ${item.cantidad}</li>
        `;
    });

    totalTag.textContent = `Total: $${total}`;

    document.getElementById('carrito-modal').classList.remove('hidden');
}
