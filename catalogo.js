document.addEventListener('DOMContentLoaded', () => {
    fetch('http://localhost:3000/stock')
        .then(res => res.json())
        .then(data => {
            const catalogo = document.getElementById('catalogo');
            catalogo.innerHTML = '';

            data.forEach(item => {
                let estado = '';
                let clase = '';

                if (item.cantidad_pack === 0) {
                    estado = 'Agotado';
                    clase = 'agotado';
                } else if (item.cantidad_pack < 10) {
                    estado = 'Por agotarse';
                    clase = 'agotandose';
                } else {
                    estado = 'Disponible';
                    clase = 'disponible';
                }

                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <img src="${item.imagen_url || 'https://via.placeholder.com/150'}" alt="${item.producto_terminado}" width="100%">
                    <h3>${item.producto_terminado}</h3>
                    <p>Cantidad disponible: ${item.cantidad_pack}</p>
                    <p>Precio: ${item.precio}</p>
                    <p class="estado ${clase}">${estado}</p>
                    <button 
                        class="btn-agregar-carrito"
                        data-id="${item.id}"
                        data-nombre="${item.producto_terminado}"
                        data-precio="${item.precio}"
                        data-stock="${item.cantidad_pack}">
                        Agregar al carrito
                    </button>
                `;
                catalogo.appendChild(card);
            });

            // Activar botones
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
        })
        .catch(err => console.error('Error al cargar productos:', err));
});

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