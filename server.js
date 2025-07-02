require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

const app = express();

// HABILITAR CORS
app.use(cors({
  origin: [
    'http://localhost:5500',
    'https://legumbres-duplicado.netlify.app'
  ]
}));

app.use(express.json());

// CONFIGURACIÓN DE MULTER PARA UPLOADS
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.use('/uploads', express.static('uploads'));

// CONEXIÓN MYSQL
async function getConnection() {
  return mysql.createConnection({
    host: 'switchback.proxy.rlwy.net',
    port: 23913,
    user: 'root',
    password: 'fbWSlkVjuwEenRRhbylSEXrzDkhPmTNE',
    database: 'railway'
  });
}

// ==============================
// RUTAS API
// ==============================

// ------------------------------
// MATERIAS PRIMAS
// ------------------------------

app.get('/materias', async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT * FROM materias_primas;');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/materias', async (req, res) => {
  try {
    const { nombre, cantidad_kg, precio_costo, fecha_ingreso } = req.body;
    const conn = await getConnection();
    const sql = fecha_ingreso
      ? `INSERT INTO materias_primas (nombre, cantidad_kg, precio_costo, fecha_ingreso) VALUES (?, ?, ?, ?)`
      : `INSERT INTO materias_primas (nombre, cantidad_kg, precio_costo) VALUES (?, ?, ?)`;

    const params = fecha_ingreso
      ? [nombre, cantidad_kg, precio_costo, fecha_ingreso]
      : [nombre, cantidad_kg, precio_costo];

    await conn.query(sql, params);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/materias/:id', async (req, res) => {
  try {
    const conn = await getConnection();
    await conn.query('DELETE FROM materias_primas WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------
// PEDIDOS
// ------------------------------

app.get('/pedidos', async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT * FROM pedidos;');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/pedidos/:id', async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/pedidos', async (req, res) => {
  try {
    const { nombre_comprador, numero_pedido, pago, fecha_entrega, estado } = req.body;
    const conn = await getConnection();
    await conn.query(`
      INSERT INTO pedidos (nombre_comprador, numero_pedido, pago, fecha_entrega, estado)
      VALUES (?, ?, ?, ?, ?)`,
      [nombre_comprador, numero_pedido, pago, fecha_entrega, estado]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------
// PRODUCTOS DE UN PEDIDO
// ------------------------------

app.get('/pedidos/:id/productos', async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query(
      'SELECT * FROM pedido_productos WHERE pedido_id = ?',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/pedidos/:id/productos', async (req, res) => {
  try {
    const { stock_id, producto, cantidad_kg, costo_unitario, subtotal } = req.body;
    const conn = await getConnection();

    let productoNombre = producto;

    if (stock_id) {
      const [stockRows] = await conn.query(
        'SELECT producto_terminado, cantidad_pack FROM stock WHERE id = ?',
        [stock_id]
      );

      if (stockRows.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado en stock.' });
      }

      const stockItem = stockRows[0];
      if (stockItem.cantidad_pack < cantidad_kg) {
        return res.status(400).json({
          error: `Stock insuficiente. Disponible: ${stockItem.cantidad_pack}, pedido: ${cantidad_kg}`
        });
      }

      productoNombre = stockItem.producto_terminado;

      await conn.query(
        'UPDATE stock SET cantidad_pack = cantidad_pack - ? WHERE id = ?',
        [cantidad_kg, stock_id]
      );
    }

    await conn.query(`
      INSERT INTO pedido_productos (pedido_id, stock_id, producto, cantidad_kg, costo_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, stock_id, productoNombre, cantidad_kg, costo_unitario, subtotal]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/pedidos/:pedidoId/productos/:prodId', async (req, res) => {
  try {
    const conn = await getConnection();
    await conn.query(
      'DELETE FROM pedido_productos WHERE id = ? AND pedido_id = ?',
      [req.params.prodId, req.params.pedidoId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------
// STOCK
// ------------------------------

app.get('/stock', async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT * FROM stock;');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/stock', upload.single('imagen'), async (req, res) => {
  try {
    const { producto_terminado, cantidad_pack, precio } = req.body;
    const imagen_url = req.file ? req.file.path : null;

    const conn = await getConnection();
    await conn.query(`
      INSERT INTO stock (producto_terminado, cantidad_pack, imagen_url, precio)
      VALUES (?, ?, ?, ?)`,
      [producto_terminado, cantidad_pack, imagen_url, precio]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/stock/:id', upload.single('imagen'), async (req, res) => {
  try {
    const { cantidad_pack, precio } = req.body;
    const imagen_url = req.file ? '/uploads/' + req.file.filename : null;

    const conn = await getConnection();

    const [rows] = await conn.query(
      'SELECT * FROM stock WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const finalImagen = imagen_url || rows[0].imagen_url;

    await conn.query(`
      UPDATE stock
      SET cantidad_pack = ?, precio = ?, imagen_url = ?
      WHERE id = ?`,
      [cantidad_pack, precio, finalImagen, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/descontar-stock', async (req, res) => {
  try {
    const conn = await getConnection();
    const items = req.body;
    const errores = [];

    for (const item of items) {
      const [rows] = await conn.query(
        'SELECT cantidad_pack FROM stock WHERE id = ?',
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

      await conn.query(
        'UPDATE stock SET cantidad_pack = cantidad_pack - ? WHERE id = ?',
        [item.cantidad, item.id]
      );
    }

    if (errores.length > 0) {
      return res.status(400).json({ errores });
    }

    res.json({ message: 'Stock descontado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// START SERVER
app.listen(3000, () => {
  console.log('✅ Servidor corriendo en http://localhost:3000');
});