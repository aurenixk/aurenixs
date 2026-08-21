import { products } from "/data/products.js";

const state = {
  products,
  category: "All",
  query: "",
  cart: readStorage("aurenix_cart", []),
  wishlist: readStorage("aurenix_wishlist", []),
  current: null,
  option: "Standard",
  quantity: 1
};

const $ = (selector) => document.querySelector(selector);
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}
function persist() {
  localStorage.setItem("aurenix_cart", JSON.stringify(state.cart));
  localStorage.setItem("aurenix_wishlist", JSON.stringify(state.wishlist));
}
function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  window.setTimeout(() => node.classList.remove("show"), 2400);
}
function visibleProducts() {
  return state.products.filter((product) => {
    const categoryMatch = state.category === "All" || product.category === state.category;
    const query = state.query.trim().toLowerCase();
    const queryMatch = !query || `${product.title} ${product.category} ${product.description}`.toLowerCase().includes(query);
    return categoryMatch && queryMatch;
  });
}
function renderProducts() {
  const items = visibleProducts();
  $("#resultText").textContent = `${items.length} product${items.length === 1 ? "" : "s"} in the current collection.`;
  $("#productGrid").innerHTML = items.map((product) => `
    <article class="product-card">
      <div class="product-image" data-product="${product.id}"><img src="${product.images[0]}" alt="${product.title}"><span class="product-tag">${product.tag}</span></div>
      <div class="product-info"><p class="eyebrow">AURENIX · ${product.category.toUpperCase()}</p><h3>${product.title}</h3><p>${product.description}</p><div class="price">${money(product.price)}<span class="compare">${money(product.compareAt)}</span></div><div class="card-actions"><button class="button button-gold" data-product="${product.id}">View product</button><button class="button button-dark" data-add="${product.id}">Add</button></div></div>
    </article>`).join("") || '<p class="muted">No products match this collection.</p>';
}
function renderCart() {
  const validItems = state.cart.filter((item) => state.products.some((product) => product.id === item.id));
  state.cart = validItems;
  const totalQuantity = state.cart.reduce((total, item) => total + item.quantity, 0);
  const total = state.cart.reduce((sum, item) => sum + (state.products.find((product) => product.id === item.id).price * item.quantity), 0);
  $("#cartCount").textContent = totalQuantity;
  $("#cartTotal").textContent = money(total);
  $("#cartItems").innerHTML = state.cart.length ? state.cart.map((item) => {
    const product = state.products.find((entry) => entry.id === item.id);
    return `<div class="cart-item"><img src="${product.images[0]}" alt="${product.title}"><div><strong>${product.title}</strong><small>Option: ${item.option}</small><small>${money(product.price)} × ${item.quantity}</small></div><div><button data-cart-minus="${product.id}">−</button><button data-cart-plus="${product.id}">+</button></div></div>`;
  }).join("") : '<p class="muted">Your cart is ready for something extraordinary.</p>';
  persist();
}
function openDialog(id) { const dialog = $(`#${id}`); dialog.classList.add("open"); dialog.setAttribute("aria-hidden", "false"); }
function closeDialog(id) { const dialog = $(`#${id}`); dialog.classList.remove("open"); dialog.setAttribute("aria-hidden", "true"); }
function openProduct(id) {
  const product = state.products.find((entry) => entry.id === id);
  if (!product) return;
  state.current = product;
  state.option = product.options[0] || "Standard";
  state.quantity = 1;
  $("#detailCategory").textContent = `AURENIX · ${product.category.toUpperCase()}`;
  $("#detailTitle").textContent = product.title;
  $("#detailDescription").textContent = product.description;
  $("#detailPrice").textContent = money(product.price);
  $("#quantityValue").textContent = "1";
  $("#detailSpecs").innerHTML = product.specifications.map((specification) => `• ${specification}`).join("<br>");
  $("#detailOptions").innerHTML = product.options.map((option, index) => `<button class="option ${index === 0 ? "active" : ""}" data-option="${option}">${option}</button>`).join("");
  renderGallery(0);
  openDialog("productDialog");
}
function renderGallery(index) {
  const product = state.current;
  $("#detailImage").src = product.images[index];
  $("#detailThumbs").innerHTML = product.images.map((image, imageIndex) => `<button class="thumb ${index === imageIndex ? "active" : ""}" data-image-index="${imageIndex}"><img src="${image}" alt="${product.title} view ${imageIndex + 1}"></button>`).join("");
}
function addToCart(id, quantity = 1, option = "Standard") {
  const existing = state.cart.find((item) => item.id === id && item.option === option);
  if (existing) existing.quantity += quantity;
  else state.cart.push({ id, quantity, option });
  renderCart();
  toast("Added to cart");
}
function addCurrent(buyNow = false) {
  if (!state.current) return;
  addToCart(state.current.id, state.quantity, state.option);
  closeDialog("productDialog");
  if (buyNow) openDialog("checkoutDialog");
}
async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
}
async function pay(event) {
  event.preventDefault();
  if (!state.cart.length) return toast("Your cart is empty");
  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Preparing payment...";
  const customer = { name: $("#customerName").value.trim(), email: $("#customerEmail").value.trim(), phone: $("#customerPhone").value.trim() };
  try {
    const response = await fetch("/api/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: state.cart.map((item) => ({ id: item.id, qty: item.quantity, selectedSize: item.option })), customer, currency: "INR" }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not create payment order.");
    await loadRazorpay();
    const razorpay = new window.Razorpay({ key: data.keyId, amount: data.order.amount, currency: data.order.currency, name: "AURENIX", description: "AURENIX technology order", order_id: data.order.id, prefill: customer, theme: { color: "#d1a15d" }, handler: async (payment) => {
      const verification = await fetch("/api/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payment, items: data.items, customer }) });
      const result = await verification.json();
      if (!verification.ok) throw new Error(result.error || "Payment verification failed.");
      state.cart = [];
      persist();
      renderCart();
      closeDialog("checkoutDialog");
      toast("Payment verified. Thank you!");
    } });
    razorpay.on("payment.failed", () => toast("Payment failed. Please try again."));
    razorpay.open();
  } catch (error) { toast(error.message || "Payment could not start."); } finally { button.disabled = false; button.textContent = "Continue to payment"; }
}

document.addEventListener("click", (event) => {
  const productTarget = event.target.closest("[data-product]");
  if (productTarget) openProduct(productTarget.dataset.product);
  const addTarget = event.target.closest("[data-add]");
  if (addTarget) { const product = state.products.find((entry) => entry.id === addTarget.dataset.add); addToCart(product.id, 1, product.options[0]); }
  const categoryTarget = event.target.closest("[data-category]");
  if (categoryTarget) { state.category = categoryTarget.dataset.category; document.querySelectorAll(".filter").forEach((filter) => filter.classList.toggle("active", filter.dataset.category === state.category)); renderProducts(); $("#shop").scrollIntoView({ behavior: "smooth" }); }
  const optionTarget = event.target.closest("[data-option]");
  if (optionTarget) { state.option = optionTarget.dataset.option; document.querySelectorAll("[data-option]").forEach((option) => option.classList.toggle("active", option === optionTarget)); }
  const imageTarget = event.target.closest("[data-image-index]");
  if (imageTarget) renderGallery(Number(imageTarget.dataset.imageIndex));
  const plus = event.target.closest("[data-cart-plus]");
  if (plus) { const item = state.cart.find((entry) => entry.id === plus.dataset.cartPlus); item.quantity += 1; renderCart(); }
  const minus = event.target.closest("[data-cart-minus]");
  if (minus) { const item = state.cart.find((entry) => entry.id === minus.dataset.cartMinus); item.quantity -= 1; if (item.quantity < 1) state.cart = state.cart.filter((entry) => entry !== item); renderCart(); }
  const closeTarget = event.target.closest("[data-close]");
  if (closeTarget) closeDialog(closeTarget.dataset.close);
});
$("#filters").addEventListener("click", (event) => { const filter = event.target.closest(".filter"); if (!filter) return; state.category = filter.dataset.category; document.querySelectorAll(".filter").forEach((entry) => entry.classList.toggle("active", entry === filter)); renderProducts(); });
$("#searchButton").addEventListener("click", () => $("#searchForm").classList.toggle("open"));
$("#searchInput").addEventListener("input", (event) => { state.query = event.target.value; renderProducts(); });
$("#wishlistButton").addEventListener("click", () => { state.query = ""; state.category = "All"; renderProducts(); toast("Wishlist is available from product cards"); });
$("#cartButton").addEventListener("click", () => openDialog("cartDrawer"));
$("#quantityDown").addEventListener("click", () => { state.quantity = Math.max(1, state.quantity - 1); $("#quantityValue").textContent = state.quantity; });
$("#quantityUp").addEventListener("click", () => { state.quantity += 1; $("#quantityValue").textContent = state.quantity; });
$("#detailAdd").addEventListener("click", () => addCurrent());
$("#detailBuy").addEventListener("click", () => addCurrent(true));
$("#checkoutButton").addEventListener("click", () => state.cart.length ? (closeDialog("cartDrawer"), openDialog("checkoutDialog")) : toast("Your cart is empty"));
$("#checkoutForm").addEventListener("submit", pay);
renderProducts();
renderCart();
