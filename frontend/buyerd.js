// buyerd.js — Buyer Dashboard logic (creates orders on checkout)

document.addEventListener("DOMContentLoaded", () => {
  const productGrid = document.getElementById("productGrid");
  const cartBtn = document.getElementById("cartBtn");
  const cartModal = document.getElementById("cartModal");
  const closeCart = document.getElementById("closeCart");
  const cartItemsDiv = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const cartCountEl = document.getElementById("cartCount");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const searchBox = document.getElementById("searchBox");

  // products (text-only)
  const products = [
    { id: 1, name: "Rice", price: 50 },
    { id: 2, name: "Corn", price: 30 },
    { id: 3, name: "Barley", price: 40 },
    { id: 4, name: "Cashew", price: 120 },
    { id: 5, name: "Peanuts", price: 70 },
    { id: 6, name: "Wheat", price: 45 },
  ];

  // keys
  const CART_KEY = 'buyerCart';
  const ORDERS_KEY = 'buyerOrders';

  let cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];

  function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  function loadOrders() { try { return JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch(e){ return []; } }
  function saveOrders(arr) { localStorage.setItem(ORDERS_KEY, JSON.stringify(arr)); }

  function renderProducts(filter = "") {
    productGrid.innerHTML = "";
    const filtered = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));
    filtered.forEach(p => {
      const div = document.createElement("div");
      div.className = "product";
      div.innerHTML = `
        <h4>${p.name}</h4>
        <p class="price">₹${p.price} / kg</p>
        <div style="display:flex;gap:8px">
          <input class="qty" type="number" min="1" value="1" style="width:80px;padding:6px;border-radius:6px;border:1px solid #ddd;">
          <button class="btn add" data-id="${p.id}">Add to Cart</button>
        </div>
      `;
      productGrid.appendChild(div);
    });

    document.querySelectorAll(".add").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.id);
        const qtyInput = btn.parentElement.querySelector('.qty');
        let qty = Number(qtyInput.value) || 1;
        addToCart(id, qty);
      });
    });
  }

  function addToCart(id, qty = 1) {
    const item = products.find(p => p.id === id);
    if (!item) return;
    const existing = cart.find(c => c.id === id);
    if (existing) existing.qty += qty;
    else cart.push({ id: item.id, name: item.name, price: item.price, qty });
    saveCart();
    updateCartUI();
    flash('Added to cart');
  }

  function updateCartUI() {
    const totalItems = cart.reduce((s,c) => s + c.qty, 0);
    const totalPrice = cart.reduce((s,c) => s + c.price*c.qty, 0);
    cartCountEl.textContent = totalItems;
    cartTotalEl.textContent = `₹${totalPrice.toFixed(2)}`;

    cartItemsDiv.innerHTML = cart.length ? cart.map(c => `
      <div class="cart-item">
        <div style="flex:1;">
          <strong>${c.name}</strong><br>
          ₹${c.price} × ${c.qty}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="number" min="1" value="${c.qty}" class="cart-qty" data-id="${c.id}" style="width:72px;padding:6px;">
          <button class="btn danger remove" data-id="${c.id}">Remove</button>
        </div>
      </div>
    `).join('') : `<div class="empty">Your cart is empty</div>`;

    // qty change
    document.querySelectorAll('.cart-qty').forEach(inp => {
      inp.addEventListener('change', () => {
        const id = Number(inp.dataset.id);
        let v = Number(inp.value) || 1;
        if (v < 1) v = 1;
        const it = cart.find(x => x.id === id);
        if (it) { it.qty = v; saveCart(); updateCartUI(); }
      });
    });

    // remove
    document.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        cart = cart.filter(x => x.id !== id);
        saveCart(); updateCartUI();
      });
    });
  }

  function openCart(){ cartModal.style.display = 'flex'; }
  function closeCartModal(){ cartModal.style.display = 'none'; }

  // Checkout: create an order record, save to buyerOrders, clear cart
  function checkout() {
    if (cart.length === 0) { alert('Cart is empty'); return; }
    const orders = loadOrders();
    const total = cart.reduce((s,c)=> s + c.price*c.qty, 0);
    const order = {
      id: 'O' + Date.now().toString().slice(-8),
      created_at: new Date().toISOString(),
      items: cart.map(c => ({ id:c.id, name:c.name, price:c.price, qty:c.qty })),
      total,
      status: 'pending'
    };
    orders.unshift(order);
    saveOrders(orders);
    // clear cart
    cart = [];
    saveCart();
    updateCartUI();
    closeCartModal();
    alert('Order placed successfully — Order ID: ' + order.id);
  }

  function flash(msg){
    const el = document.createElement('div');
    el.textContent = msg;
    el.style = 'position:fixed;right:18px;bottom:18px;background:#2b6b2b;color:#fff;padding:10px 14px;border-radius:8px;z-index:9999';
    document.body.appendChild(el);
    setTimeout(()=> el.remove(),1500);
  }

  // Event listeners
  cartBtn.addEventListener('click', openCart);
  closeCart.addEventListener('click', closeCartModal);
  checkoutBtn.addEventListener('click', checkout);
  searchBox.addEventListener('input', () => renderProducts(searchBox.value));

  // keyboard ESC closes modal
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCartModal(); } });

  // init
  renderProducts();
  updateCartUI();
});
