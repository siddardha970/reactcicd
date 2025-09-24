import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'shop.sqlite');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

sqlite3.verbose();
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    image TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    total_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price_cents INTEGER NOT NULL
  )`);

  const countRow = await get('SELECT COUNT(*) AS count FROM products');
  if (!countRow || countRow.count === 0) {
    const sample = [
      ['Cotton T-Shirt', 'Soft cotton tee in multiple colors', 1999, 'https://picsum.photos/seed/tee/600/400'],
      ['Denim Jeans', 'Slim fit denim jeans', 4999, 'https://picsum.photos/seed/jeans/600/400'],
      ['Sneakers', 'Lightweight everyday sneakers', 6999, 'https://picsum.photos/seed/sneakers/600/400'],
      ['Backpack', 'Water-resistant daypack', 3999, 'https://picsum.photos/seed/backpack/600/400'],
      ['Hoodie', 'Fleece-lined hoodie', 4499, 'https://picsum.photos/seed/hoodie/600/400'],
      ['Cap', 'Adjustable cotton cap', 1599, 'https://picsum.photos/seed/cap/600/400']
    ];
    for (const [name, description, price, image] of sample) {
      await run(
        'INSERT INTO products (name, description, price_cents, image) VALUES (?, ?, ?, ?)',
        [name, description, price, image]
      );
    }
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/products', async (_req, res) => {
  try {
    const products = await all('SELECT id, name, description, price_cents, image FROM products ORDER BY id ASC');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await get('SELECT id, name, description, price_cents, image FROM products WHERE id = ?', [
      req.params.id
    ]);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items, customer } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items' });
    }
    if (!customer?.name || !customer?.email || !customer?.address) {
      return res.status(400).json({ error: 'Missing customer info' });
    }

    let totalCents = 0;
    const expanded = [];
    for (const item of items) {
      const { productId, quantity } = item || {};
      if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid item' });
      }
      const product = await get('SELECT id, price_cents FROM products WHERE id = ?', [productId]);
      if (!product) return res.status(400).json({ error: `Unknown product ${productId}` });
      const lineTotal = product.price_cents * quantity;
      totalCents += lineTotal;
      expanded.push({ productId: product.id, quantity, price_cents: product.price_cents });
    }

    const orderResult = await run(
      'INSERT INTO orders (customer_name, customer_email, customer_address, total_cents) VALUES (?, ?, ?, ?)',
      [customer.name, customer.email, customer.address, totalCents]
    );
    const orderId = orderResult.lastID;

    for (const line of expanded) {
      await run(
        'INSERT INTO order_items (order_id, product_id, quantity, price_cents) VALUES (?, ?, ?, ?)',
        [orderId, line.productId, line.quantity, line.price_cents]
      );
    }

    res.status(201).json({ orderId, total_cents: totalCents, currency: 'USD' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to place order' });
  }
});

const PORT = process.env.PORT || 4000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database init failed:', err);
    process.exit(1);
  });

