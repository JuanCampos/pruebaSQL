document.addEventListener('DOMContentLoaded', () => {
    fetchHistorial();

    const closeModalBtn = document.querySelector('.close-modal');
    closeModalBtn?.addEventListener('click', () => {
        document.getElementById('modal').classList.add('hidden');
        limpiarModal();
    });
});

function fetchHistorial() {
    fetch('http://localhost:3000/pedidos')
        .then(res => res.json())
        .then(pedidos => {
            const hoy = new Date().toISOString().split('T')[0];
            const pedidosVencidos = pedidos.filter(pedido => pedido.fecha_entrega < hoy);
            renderHistorial(pedidosVencidos);
        })
        .catch(err => console.error('Error al obtener historial:', err));
}

function renderHistorial(pedidos) {
    const tbody = document.querySelector('#tabla-historial tbody');
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
            const id = btn.dataset.id;
            abrirModal(id);
        });
    });
}

function abrirModal(pedidoId) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');

    const pedidoInfo = document.getElementById('pedido-info');
    const tablaProductos = document.querySelector('#tabla-productos tbody');

    pedidoInfo.innerHTML = '';
    tablaProductos.innerHTML = '';

    fetch(`http://localhost:3000/pedidos/${pedidoId}`)
        .then(res => res.json())
        .then(pedido => {
            pedidoInfo.innerHTML = `
                <p><strong>Cliente:</strong> ${pedido.nombre_comprador}</p>
                <p><strong>N° Pedido:</strong> ${pedido.numero_pedido}</p>
                <p><strong>Fecha Entrega:</strong> ${pedido.fecha_entrega}</p>
                <p><strong>Estado:</strong> ${pedido.estado}</p>
            `;
        });

    fetch(`http://localhost:3000/pedidos/${pedidoId}/productos`)
        .then(res => res.json())
        .then(productos => {
            productos.forEach(prod => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${prod.producto}</td>
                    <td>${prod.cantidad_kg}</td>
                    <td>$${prod.costo_unitario.toFixed(2)}</td>
                    <td>$${prod.subtotal.toFixed(2)}</td>
                    <td></td>
                `;
                tablaProductos.appendChild(tr);
            });
        });
}

function limpiarModal() {
    document.getElementById('pedido-info').innerHTML = '';
    document.querySelector('#tabla-productos tbody').innerHTML = '';
}
