const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('cerealera.db', (err) => {
    if (err) {
        console.error('Error conectando a SQLite:', err.message);
    } else {
        console.log('Conectado a SQLite');
    }
});

// =======================
// CARGA DE IMAGENES
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
// CREACIÓN DE TABLAS
// =======================

// Materias primas
db.run(`
    CREATE TABLE IF NOT EXISTS materias_primas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        cantidad_kg REAL NOT NULL DEFAULT 0,
        precio_costo REAL NOT NULL,
        fecha_ingreso TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// Pedidos
db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_comprador TEXT NOT NULL,
        numero_pedido TEXT NOT NULL,
        pago TEXT,
        fecha_entrega TEXT,
        estado TEXT
    )
`);

// Productos de cada pedido (detalle)
db.run(`
    CREATE TABLE IF NOT EXISTS pedido_productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER,
        stock_id INTEGER,
        producto TEXT,
        cantidad_kg REAL,
        costo_unitario REAL,
        subtotal REAL,
        FOREIGN KEY(pedido_id) REFERENCES pedidos(id)
    )
`);

// Stock de productos terminados
db.run(`
    CREATE TABLE IF NOT EXISTS stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto_terminado TEXT NOT NULL,
        cantidad_pack INTEGER DEFAULT 0,
        imagen_url TEXT,
        precio REAL DEFAULT 0
    )
`);

// =======================
// RUTAS API
// =======================

// -----------------------
// Materias primas
// -----------------------
app.get('/materias', (req, res) => {
    db.all('SELECT * FROM materias_primas', [], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

app.post('/materias', (req, res) => {
    const { nombre, cantidad_kg, precio_costo, fecha_ingreso } = req.body;

    let sql, params;

    if (fecha_ingreso) {
        sql = `INSERT INTO materias_primas (nombre, cantidad_kg, precio_costo, fecha_ingreso) VALUES (?, ?, ?, ?)`;
        params = [nombre, cantidad_kg, precio_costo, fecha_ingreso];
    } else {
        sql = `INSERT INTO materias_primas (nombre, cantidad_kg, precio_costo) VALUES (?, ?, ?)`;
        params = [nombre, cantidad_kg, precio_costo];
    }

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json(err);
        res.json({
            id: this.lastID,
            nombre,
            cantidad_kg,
            precio_costo,
            fecha_ingreso: fecha_ingreso || new Date().toISOString()
        });
    });
});

app.delete('/materias/:id', (req, res) => {
    const sql = 'DELETE FROM materias_primas WHERE id = ?';
    db.run(sql, [req.params.id], function (err) {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

// -----------------------
// Pedidos
// -----------------------
app.get('/pedidos', (req, res) => {
    db.all('SELECT * FROM pedidos', [], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

app.get('/pedidos/:id', (req, res) => {
    db.get('SELECT * FROM pedidos WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json(err);
        res.json(row);
    });
});

app.post('/pedidos', (req, res) => {
    const { nombre_comprador, numero_pedido, pago, fecha_entrega, estado } = req.body;
    const sql = `
        INSERT INTO pedidos (nombre_comprador, numero_pedido, pago, fecha_entrega, estado)
        VALUES (?, ?, ?, ?, ?)
    `;
    db.run(sql, [nombre_comprador, numero_pedido, pago, fecha_entrega, estado], function (err) {
        if (err) return res.status(500).json(err);
        res.json({ id: this.lastID });
    });
});

// Productos de un pedido
app.get('/pedidos/:id/productos', (req, res) => {
    const sql = `SELECT * FROM pedido_productos WHERE pedido_id = ?`;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

app.post('/pedidos/:id/productos', (req, res) => {
    const pedidoId = req.params.id;
    const { stock_id, producto, cantidad_kg, costo_unitario, subtotal } = req.body;

    if (stock_id) {
        db.get(
            `SELECT producto_terminado, cantidad_pack FROM stock WHERE id = ?`,
            [stock_id],
            (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!row) return res.status(404).json({ error: 'Producto no encontrado en stock.' });

                if (row.cantidad_pack < cantidad_kg) {
                    return res.status(400).json({ error: 'Stock insuficiente.' });
                }

                insertarProductoPedido(pedidoId, stock_id, row.producto_terminado, cantidad_kg, costo_unitario, subtotal, res);
            }
        );
    } else {
        insertarProductoPedido(pedidoId, null, producto, cantidad_kg, costo_unitario, subtotal, res);
    }
});

function insertarProductoPedido(pedidoId, stock_id, producto, cantidad_kg, costo_unitario, subtotal, res) {
    db.run(
        `INSERT INTO pedido_productos (pedido_id, stock_id, producto, cantidad_kg, costo_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [pedidoId, stock_id, producto, cantidad_kg, costo_unitario, subtotal],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            if (stock_id) {
                db.run(
                    `UPDATE stock SET cantidad_pack = cantidad_pack - ? WHERE id = ?`,
                    [cantidad_kg, stock_id],
                    function (err) {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ message: 'Producto agregado y stock actualizado.' });
                    }
                );
            } else {
                res.json({ message: 'Producto agregado sin stock.' });
            }
        }
    );
}

// ✅ RUTA PARA ELIMINAR PRODUCTOS DE UN PEDIDO
app.delete('/pedidos/:pedidoId/productos/:prodId', (req, res) => {
    const pedidoId = req.params.pedidoId;
    const prodId = req.params.prodId;

    db.run(
        "DELETE FROM pedido_productos WHERE id = ? AND pedido_id = ?",
        [prodId, pedidoId],
        function (err) {
            if (err) {
                console.error("ERROR al borrar producto:", err);
                return res.status(500).json({ error: err.message });
            }

            res.json({ success: true });
        }
    );
});

// -----------------------
// Stock
// -----------------------
app.get('/stock', (req, res) => {
    db.all(`SELECT * FROM stock`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al leer stock' });
        }
        res.json(rows);
    });
});

app.post('/stock', upload.single('imagen'), (req, res) => {
    const { producto_terminado, cantidad_pack, precio } = req.body;
    const imagen_url = req.file ? req.file.path : null;

    db.run(
        `INSERT INTO stock (producto_terminado, cantidad_pack, imagen_url, precio)
            VALUES (?, ?, ?, ?)`,
        [producto_terminado, cantidad_pack, imagen_url, precio],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error al guardar producto' });
            }
            res.json({
                id: this.lastID,
                producto_terminado,
                cantidad_pack,
                imagen_url,
                precio
            });
        }
    );
});

app.put('/stock/:id', upload.single('imagen'), (req, res) => {
    const { cantidad_pack, precio } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    db.get(`SELECT * FROM stock WHERE id = ?`, [req.params.id], (err, row) => {
        if (err || !row) {
            console.error(err);
            return res.status(500).json({ error: 'Producto no encontrado.' });
        }

        const finalImagen = imagen_url || row.imagen_url;

        db.run(
            `UPDATE stock
                SET cantidad_pack = ?, precio = ?
                WHERE id = ?`,
            [cantidad_pack, precio, req.params.id],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Error al actualizar producto.' });
                }
                res.json({ success: true });
            }
        );
    });
});

app.post('/descontar-stock', (req, res) => {
    const items = req.body;

    const errores = [];

    const queries = items.map(item => {
        return new Promise((resolve, reject) => {
            db.get(`SELECT cantidad_pack FROM stock WHERE id = ?`, [item.id], (err, row) => {
                if (err) return reject(err);

                if (!row) {
                    errores.push({ id: item.id, error: 'Producto no encontrado' });
                    return resolve();
                }

                if (row.cantidad_pack < item.cantidad) {
                    errores.push({
                        id: item.id,
                        error: `Stock insuficiente. Disponible: ${row.cantidad_pack}, pedido: ${item.cantidad}`
                    });
                    return resolve();
                }

                db.run(
                    `UPDATE stock SET cantidad_pack = cantidad_pack - ? WHERE id = ?`,
                    [item.cantidad, item.id],
                    (err) => {
                        if (err) return reject(err);
                        resolve();
                    }
                );
            });
        });
    });

    Promise.all(queries)
        .then(() => {
            if (errores.length > 0) {
                return res.status(400).json({ errores });
            }
            res.json({ message: "Stock descontado correctamente" });
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'Error descontando stock' });
        });
});

// =======================
// START SERVER
// =======================
app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});

