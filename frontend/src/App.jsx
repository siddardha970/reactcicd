import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
const API_BASE = import.meta.env.VITE_API_BASE || '';

const CartContext = createContext(null);
function useCart() {
  return useContext(CartContext);
}

function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('cart');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.product.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === product.id ? { ...it, quantity: it.quantity + quantity } : it
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId));
  };

  const updateQty = (productId, quantity) => {
    setItems((prev) =>
      prev.map((it) => (it.product.id === productId ? { ...it, quantity: Math.max(1, quantity) } : it))
    );
  };

  const clear = () => setItems([]);

  const totalCents = useMemo(
    () => items.reduce((sum, it) => sum + it.product.price_cents * it.quantity, 0),
    [items]
  );

  const value = { items, addItem, removeItem, updateQty, clear, totalCents };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function currency(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function Layout({ children }) {
  const { items, totalCents } = useCart();
  const count = items.reduce((n, it) => n + it.quantity, 0);
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 16, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'black' }}>
          <h1 style={{ margin: 0 }}>Shop</h1>
        </Link>
        <Link to="/cart" style={{ textDecoration: 'none' }}>
          Cart ({count}) · {currency(totalCents)}
        </Link>
      </header>
      {children}
      <footer style={{ marginTop: 48, fontSize: 12, color: '#777' }}>
        <a href="https://example.com" target="_blank" rel="noreferrer">Demo store</a>
      </footer>
    </div>
  );
}

function ProductsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const { addItem } = useCart();

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE}/api/products`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) {
          setProducts(data);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <div>Loading products…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
      {products.map((p) => (
        <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          <img src={p.image} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
          <div style={{ padding: 12 }}>
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: '#666', margin: '4px 0 8px' }}>{p.description}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>{currency(p.price_cents)}</span>
              <button onClick={() => addItem(p, 1)}>Add to cart</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CartPage() {
  const { items, removeItem, updateQty, totalCents } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div>
        <p>Your cart is empty.</p>
        <button onClick={() => navigate('/')}>Go shopping</button>
      </div>
    );
  }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
            <th>Product</th>
            <th>Qty</th>
            <th>Each</th>
            <th>Line</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ product, quantity }) => (
            <tr key={product.id} style={{ borderBottom: '1px solid #f4f4f4' }}>
              <td style={{ padding: '8px 0' }}>{product.name}</td>
              <td>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => updateQty(product.id, Number(e.target.value))}
                  style={{ width: 64 }}
                />
              </td>
              <td>{currency(product.price_cents)}</td>
              <td>{currency(product.price_cents * quantity)}</td>
              <td>
                <button onClick={() => removeItem(product.id)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700 }}>Total: {currency(totalCents)}</div>
        <button onClick={() => navigate('/checkout')}>Checkout</button>
      </div>
    </div>
  );
}

function CheckoutPage() {
  const { items, clear, totalCents } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const placeOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((it) => ({ productId: it.product.id, quantity: it.quantity })),
          customer: { name: form.name, email: form.email, address: form.address }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Order failed');
      clear();
      alert(`Order #${data.orderId} placed. Total ${currency(data.total_cents)}.`);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div>
        <p>No items to checkout.</p>
        <button onClick={() => navigate('/')}>Back to store</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Checkout</h2>
      <p>Order total: <strong>{currency(totalCents)}</strong></p>
      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
      <form onSubmit={placeOrder} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
        <input
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
        <textarea
          placeholder="Shipping address"
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          required
          rows={4}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Placing order…' : 'Place order'}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </Layout>
    </CartProvider>
  );
}

