document.addEventListener('DOMContentLoaded', () => {
    const formStock = document.getElementById('form-stock');

    if (formStock) {
        formStock.addEventListener('submit', (e) => {
            e.preventDefault();

            const producto = document.getElementById('producto_terminado').value;
            const cantidad = parseInt(document.getElementById('cantidad_pack').value);
            const precio = parseFloat(document.getElementById('precio').value);
            const imagenInput = document.getElementById('imagen_file');
            const formData = new FormData();

            formData.append('producto_terminado', producto);
            formData.append('cantidad_pack', cantidad);
            formData.append('precio', precio);

            if (imagenInput && imagenInput.files.length > 0) {
                formData.append('imagen', imagenInput.files[0]);
            }

            fetch(`https://pruebasql-production.up.railway.app/stock`, {
                method: 'POST',
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    alert('Producto agregado!');
                    formStock.reset();
                    cargarStock();
                })
                .catch(err => console.error('Error al guardar producto:', err));
        });
    }
    cargarStock();
});
function renderStock(productos) {
    const grid = document.getElementById('catalogo');
    grid.innerHTML = '';

    productos.forEach(prod => {
        let stockClass = '';
        let estado = '';

        if (prod.cantidad_pack === 0) {
            stockClass = 'stock-out';
            estado = 'Agotado ❌';
        } else if (prod.cantidad_pack <= 10) {
            stockClass = 'stock-low';
            estado = 'Stock bajo ⚠️';
        } else {
            stockClass = 'stock-ok';
            estado = 'Disponible ✅';
        }

        const div = document.createElement('div');
        div.classList.add('card-stock');
        div.innerHTML = `
            <img src="${prod.imagen_url ? '/uploads/' + prod.imagen_url : 'https://via.placeholder.com/150'}" alt="${prod.producto_terminado}" width="100%">
            <h3>${prod.producto_terminado}</h3>
            <p>Stock: <span class="${stockClass}">${prod.cantidad_pack} packs</span></p>
            <p>Estado: <span class="${stockClass}">${estado}</span></p>
            
            <button class="btn-editar-stock" 
                data-id="${prod.id}" 
                data-producto="${prod.producto_terminado}" 
                data-cantidad="${prod.cantidad_pack}" 
                data-precio="${prod.precio}"
                data-imagen="${prod.imagen_url || ''}">
                Editar
            </button>
            <button class="btn-eliminar-stock" data-id="${prod.id}">
                Eliminar
            </button>
            <button 
                class="btn-agregar-carrito" 
                data-id="${prod.id}"
                data-nombre="${prod.producto_terminado}"
                data-precio="${prod.precio}"
                data-stock="${prod.cantidad_pack}">
                Agregar al carrito
            </button>
        `;
        grid.appendChild(div);
    });

    // ✅ ASIGNAR EVENTOS AQUÍ, SOLO UNA VEZ
    document.querySelectorAll('.btn-eliminar-stock').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            if (confirm('¿Seguro que querés eliminar este producto?')) {
                fetch(`https://pruebasql-production.up.railway.app/stock/${id}`, {
                    method: 'DELETE'
                })
                    .then(res => res.json())
                    .then(() => {
                        alert('Producto eliminado.');
                        cargarStock();
                    })
                    .catch(err => {
                        console.error(err);
                        alert('Error eliminando producto.');
                    });
            }
        });
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

let productoEditandoId = null;

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-editar-stock')) {
        const btn = e.target;

        productoEditandoId = btn.dataset.id;
        document.getElementById('edit-cantidad').value = btn.dataset.cantidad;
        document.getElementById('edit-precio').value = btn.dataset.precio;

        document.getElementById('modal-editar').classList.remove('hidden');
    }
});

function cargarStock() {
    fetch('https://pruebasql-production.up.railway.app/stock')
        .then(res => res.json())
        .then(data => {
            renderStock(data);
        })
        .catch(err => {
            console.error(err);
            alert('Error cargando el stock.');
        });
}

document.getElementById('cerrar-modal-editar').addEventListener('click', () => {
    document.getElementById('modal-editar').classList.add('hidden');
});

document.getElementById('form-editar-stock').addEventListener('submit', (e) => {
    e.preventDefault();

    const cantidad_pack = parseInt(document.getElementById('edit-cantidad').value, 10);
    const precio = parseFloat(document.getElementById('edit-precio').value);

    const formData = new FormData();
    formData.append('cantidad_pack', cantidad_pack);
    formData.append('precio', precio);

    fetch(`https://pruebasql-production.up.railway.app/stock/${productoEditandoId}`, {
        method: 'PUT',
        body: formData
    })
        .then(res => res.json())
        .then(() => {
            document.getElementById('modal-editar').classList.add('hidden');
            cargarStock();
        })
        .catch(err => console.error(err));
});
