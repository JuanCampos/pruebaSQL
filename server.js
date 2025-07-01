const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Database } = require('@sqlitecloud/drivers');

const app = express();
app.use(cors({
    origin: [
      'http://localhost:5500',
      'https://legumbres-duplicado.netlify.app'
]

}));
app.use(express.json());

// =======================
// CONEXIÓN SQLITE CLOUD
// =======================

// ⚠️ PEGÁ TU CONNECTION STRING ACÁ:
const db = new Database("sqlitecloud://co9bc0wynk.g2.sqlite.cloud:8860/cerealera.db?apikey=w0YHz5nqVIxLisyiVuDAZ55sVWCF2dXX3JQt6XSgGEs");

// =======================
// CARGA DE IMÁGENES
// =======================

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.use('/uploads', express.static('uploads'));

// =======================
// RUTAS API
// =======================

// -----------------------
// Materias primas
// -----------------------

app.get('/materias', async (req, res) => {
    try {
        const result = await db.sql('SELECT * FROM materias_primas;');
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/materias', async (req, res) => {
    try {
        const { nombre, cantidad_kg, precio_costo, fecha_ingreso } = req.body;

        let sql, params;

        if (fecha_ingreso) {
            sql = `INSERT INTO materias_primas (nombre, cantidad_kg, precio_costo, fecha_ingreso) VALUES (?, ?, ?, ?)`;
            params = [nombre, cantidad_kg, precio_costo, fecha_ingreso];
        } else {
            sql = `INSERT INTO materias_primas (nombre, cantidad_kg, precio_costo) VALUES (?, ?, ?)`;
            params = [nombre, cantidad_kg, precio_costo];
        }

        await db.sql(sql, params);

        res.json({
            nombre,
            cantidad_kg,
            precio_costo,
            fecha_ingreso: fecha_ingreso || new Date().toISOString()
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/materias/:id', async (req, res) => {
    try {
        await db.sql(`DELETE FROM materias_primas WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// -----------------------
// Pedidos
// -----------------------

app.get('/pedidos', async (req, res) => {
    try {
        const result = await db.sql(`SELECT * FROM pedidos;`);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/pedidos/:id', async (req, res) => {
    try {
        const result = await db.sql(`SELECT * FROM pedidos WHERE id = ?;`, [req.params.id]);
        res.json(result[0] || null);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/pedidos', async (req, res) => {
    try {
        const { nombre_comprador, numero_pedido, pago, fecha_entrega, estado } = req.body;
        await db.sql(`
            INSERT INTO pedidos (nombre_comprador, numero_pedido, pago, fecha_entrega, estado)
            VALUES (?, ?, ?, ?, ?)
    `, [nombre_comprador, numero_pedido, pago, fecha_entrega, estado]);

        res.json({ message: "Pedido creado correctamente" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Productos de un pedido
app.get('/pedidos/:id/productos', async (req, res) => {
    try {
        const result = await db.sql(`SELECT * FROM pedido_productos WHERE pedido_id = ?;`, [req.params.id]);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/pedidos/:id/productos', async (req, res) => {
    try {
        const pedidoId = req.params.id;
        const { stock_id, producto, cantidad_kg, costo_unitario, subtotal } = req.body;

        if (stock_id) {
            const rows = await db.sql(
                `SELECT producto_terminado, cantidad_pack FROM stock WHERE id = ?`,
                [stock_id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Producto no encontrado en stock.' });
            }

            const row = rows[0];

            if (row.cantidad_pack < cantidad_kg) {
                return res.status(400).json({
                    error: `Stock insuficiente. Disponible: ${row.cantidad_pack}, pedido: ${cantidad_kg}`
                });
            }

            await insertarProductoPedido(pedidoId, stock_id, row.producto_terminado, cantidad_kg, costo_unitario, subtotal, res);

        } else {
            await insertarProductoPedido(pedidoId, null, producto, cantidad_kg, costo_unitario, subtotal, res);
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

async function insertarProductoPedido(pedidoId, stock_id, producto, cantidad_kg, costo_unitario, subtotal, res) {
    try {
        await db.sql(
            `INSERT INTO pedido_productos (pedido_id, stock_id, producto, cantidad_kg, costo_unitario, subtotal)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [pedidoId, stock_id, producto, cantidad_kg, costo_unitario, subtotal]
        );

        if (stock_id) {
            await db.sql(
                `UPDATE stock SET cantidad_pack = cantidad_pack - ? WHERE id = ?`,
                [cantidad_kg, stock_id]
            );
            res.json({ message: 'Producto agregado y stock actualizado.' });
        } else {
            res.json({ message: 'Producto agregado sin stock.' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}

app.delete('/pedidos/:pedidoId/productos/:prodId', async (req, res) => {
    try {
        await db.sql(
            `DELETE FROM pedido_productos WHERE id = ? AND pedido_id = ?`,
            [req.params.prodId, req.params.pedidoId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// -----------------------
// Stock
// -----------------------

app.get('/stock', async (req, res) => {
    try {
        const result = await db.sql(`SELECT * FROM stock;`);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/stock', upload.single('imagen'), async (req, res) => {
    try {
        const { producto_terminado, cantidad_pack, precio } = req.body;
        const imagen_url = req.file ? req.file.path : null;

        await db.sql(
            `INSERT INTO stock (producto_terminado, cantidad_pack, imagen_url, precio)
            VALUES (?, ?, ?, ?)`,
            [producto_terminado, cantidad_pack, imagen_url, precio]
        );

        res.json({
            producto_terminado,
            cantidad_pack,
            imagen_url,
            precio
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/stock/:id', upload.single('imagen'), async (req, res) => {
    try {
        const { cantidad_pack, precio } = req.body;
        const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

        const rows = await db.sql(`SELECT * FROM stock WHERE id = ?`, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        const row = rows[0];
        const finalImagen = imagen_url || row.imagen_url;

        await db.sql(
            `UPDATE stock
            SET cantidad_pack = ?, precio = ?, imagen_url = ?
            WHERE id = ?`,
            [cantidad_pack, precio, finalImagen, req.params.id]
        );

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/descontar-stock', async (req, res) => {
    try {
        const items = req.body;
        const errores = [];

        for (const item of items) {
            const rows = await db.sql(
                `SELECT cantidad_pack FROM stock WHERE id = ?`,
                [item.id]
            );

            if (rows.length === 0) {
                errores.push({ id: item.id, error: 'Producto no encontrado' });
                continue;
            }

            const disponible = rows[0].cantidad_pack;

            if (disponible < item.cantidad) {
                errores.push({
                    id: item.id,
                    error: `Stock insuficiente. Disponible: ${disponible}, pedido: ${item.cantidad}`
                });
                continue;
            }

            await db.sql(
                `UPDATE stock SET cantidad_pack = cantidad_pack - ? WHERE id = ?`,
                [item.cantidad, item.id]
            );
        }

        if (errores.length > 0) {
            return res.status(400).json({ errores });
        }

        res.json({ message: "Stock descontado correctamente" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// =======================
// START SERVER
// =======================

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});
