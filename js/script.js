const getApiBase = () => {
  if (window.SMART_FARM_API_BASE) return window.SMART_FARM_API_BASE;
  if (localStorage.getItem("smartFarmApiBase")) return localStorage.getItem("smartFarmApiBase");
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "") {
    return "http://localhost:5002";
  }
  return "https://sworn-nutmeg-deceiving.ngrok-free.dev";
};
const API_BASE = getApiBase().replace(/\/$/, "");
const TOKEN_KEY = "token";
const USER_KEY = "user";
const GUEST_CART_KEY = "cart";

let slideTimer = null;
let slideIndex = 0;

function explore() {
  alert("Welcome to Smart Farm Marketplace");
}

function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function readJson(value, fallback = null) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `Rs ${Number.isFinite(amount) ? amount.toFixed(0) : "0"}`;
}

function money(value) {
  return formatMoney(value);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getCurrentUser() {
  return readJson(localStorage.getItem(USER_KEY), null);
}

function getUser() {
  return getCurrentUser();
}

function getRole() {
  return getCurrentUser()?.role || "";
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function apiFetch(path, { method = "GET", auth = false, body, headers = {} } = {}) {
  const requestHeaders = { 
    Accept: "application/json", 
    "ngrok-skip-browser-warning": "true",
    ...headers 
  };
  let requestBody = body;

  if (body !== undefined && body !== null && typeof body === "object" && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  if (auth && getToken()) {
    requestHeaders.Authorization = `Bearer ${getToken()}`;
  }

  const response = await fetch(apiUrl(path), {
    method,
    headers: requestHeaders,
    body: requestBody,
  });

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = data && typeof data === "object" && data.message ? data.message : typeof data === "string" ? data : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

function notify(message) {
  alert(message);
}

function ensureMessage(container, message, tone = "info") {
  if (!container) return;
  let box = container.querySelector("[data-message-box]");
  if (!box) {
    box = document.createElement("div");
    box.dataset.messageBox = "true";
    box.style.margin = "12px 0";
    box.style.padding = "12px 16px";
    box.style.borderRadius = "8px";
    box.style.fontSize = "0.95rem";
    box.style.fontWeight = "500";
    container.prepend(box);
  }
  box.textContent = message;
  
  if (tone === "error") {
    box.style.background = "rgba(239, 68, 68, 0.1)";
    box.style.color = "#ef4444";
    box.style.border = "1px solid rgba(239, 68, 68, 0.2)";
  } else if (tone === "success") {
    box.style.background = "rgba(16, 185, 129, 0.1)";
    box.style.color = "#10b981";
    box.style.border = "1px solid rgba(16, 185, 129, 0.2)";
  } else {
    box.style.background = "rgba(59, 130, 246, 0.1)";
    box.style.color = "#3b82f6";
    box.style.border = "1px solid rgba(59, 130, 246, 0.2)";
  }
}

function guessCategory(text = "") {
  const lower = String(text).toLowerCase();
  if (lower.includes("dairy") || lower.includes("milk") || lower.includes("egg") || lower.includes("chicken")) return "dairy";
  if (lower.includes("grain") || lower.includes("wheat") || lower.includes("rice") || lower.includes("flour")) return "Grains";
  if (lower.includes("fruit")) return "fruits";
  if (lower.includes("sea") || lower.includes("fish")) return "Sea food";
  if (lower.includes("spice")) return "spices";
  if (lower.includes("veg") || lower.includes("tomato") || lower.includes("carrot") || lower.includes("spinach")) return "vegetables";
  return "vegetables";
}

function getFarmIdFromUrl() {
  const queryId = new URLSearchParams(window.location.search).get("id");
  return queryId ? Number(queryId) : null;
}

function updateCartCount(remoteItems = null) {
  const cartCount = document.getElementById("cart-count");
  if (!cartCount) return;

  if (Array.isArray(remoteItems)) {
    cartCount.textContent = String(remoteItems.reduce((sum, item) => sum + toNumber(item.quantity, 0), 0));
    return;
  }

  if (getToken()) {
    apiFetch("/api/cart", { auth: true })
      .then((data) => {
        const items = Array.isArray(data.items) ? data.items : [];
        cartCount.textContent = String(items.reduce((sum, item) => sum + toNumber(item.quantity, 0), 0));
      })
      .catch(() => {
        cartCount.textContent = "0";
      });
    return;
  }

  const cart = readJson(localStorage.getItem(GUEST_CART_KEY), []);
  cartCount.textContent = String(cart.reduce((sum, item) => sum + toNumber(item.quantity, 0), 0));
}

function showSlides(index) {
  const slides = document.querySelectorAll(".slide");
  const dots = document.querySelectorAll(".dot");
  if (!slides.length || !dots.length) return;

  slides.forEach((slide) => slide.classList.remove("active"));
  dots.forEach((dot) => dot.classList.remove("active"));

  let nextIndex = index;
  if (nextIndex >= slides.length) nextIndex = 0;
  if (nextIndex < 0) nextIndex = slides.length - 1;

  slides[nextIndex].classList.add("active");
  if (dots[nextIndex]) dots[nextIndex].classList.add("active");
  slideIndex = nextIndex;
}

function currentSlide(index) {
  showSlides(index);
}

function startCarousel() {
  const slides = document.querySelectorAll(".slide");
  if (!slides.length) return;

  showSlides(0);
  window.clearInterval(slideTimer);
  slideTimer = window.setInterval(() => {
    showSlides(slideIndex + 1);
  }, 5000);
}

function farmCardTemplate(farm) {
  const card = document.createElement("div");
  card.className = "farm-card";
  card.dataset.category = guessCategory(`${farm.farm_name || ""} ${farm.description || ""}`);
  card.dataset.search = `${farm.farm_name || ""} ${farm.location || ""} ${farm.description || ""}`.toLowerCase();
  card.innerHTML = `
    <img src="${escapeHtml(farm.image || "images/farm.jpg")}" alt="${escapeHtml(farm.farm_name || "Farm")}">
    <h3>${escapeHtml(farm.farm_name || "Farm")}</h3>
    <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(farm.location || "")}</p>
    <a href="farm1.html?id=${farm.id}"><button type="button">View Products</button></a>
  `;
  return card;
}

function productCardTemplate(product) {
  const card = document.createElement("div");
  card.className = "product";
  card.innerHTML = `
    <img src="${escapeHtml(product.image || "images/farm.jpg")}" alt="${escapeHtml(product.product_name || "Product")}">
    <h3>${escapeHtml(product.product_name || "Product")}</h3>
    <p>${escapeHtml(product.description || product.category || "")}</p>
    <p class="price">${formatMoney(product.price)}</p>
  `;
  return card;
}

function renderCartItem(item, itemRef, remote = false) {
  const li = document.createElement("li");
  li.innerHTML = `
    <div class="cart-details">
      <strong>${escapeHtml(item.product_name || item.product || "Item")}</strong>
      <div class="cart-pricing">${formatMoney(item.price)} x ${toNumber(item.quantity, 1)} = ${formatMoney(toNumber(item.price) * toNumber(item.quantity, 1))}</div>
    </div>
    <div class="cart-actions"></div>
  `;

  const actions = li.querySelector(".cart-actions");
  
  const plus = document.createElement("button");
  plus.type = "button";
  plus.className = "qty-btn";
  plus.textContent = "+";
  plus.addEventListener("click", () => increaseQty(itemRef, item.quantity, item.stock, remote));

  const minus = document.createElement("button");
  minus.type = "button";
  minus.className = "qty-btn";
  minus.textContent = "-";
  minus.addEventListener("click", () => decreaseQty(itemRef, item.quantity, remote));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-btn";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => removeItem(itemRef, remote));

  actions.append(minus, plus, remove);
  return li;
}

function bindAuthForms() {
  const loginForm = document.querySelector(".login-page form");
  if (loginForm && !loginForm.dataset.bound) {
    loginForm.dataset.bound = "true";
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = await apiFetch("/api/auth/login", {
          method: "POST",
          body: {
            email: loginForm.querySelector('input[type="email"]')?.value.trim() || "",
            password: loginForm.querySelector('input[type="password"]')?.value || "",
          },
        });
        saveSession(data.token, data.user);
        if (data.user?.role === "Admin") window.location.href = "admin.html";
        else if (data.user?.role === "Farmer") window.location.href = "create-farm.html";
        else if (data.user?.role === "Dealer") window.location.href = "pesticides.html";
        else window.location.href = "index.html";
      } catch (error) {
        ensureMessage(loginForm, error.message, "error");
      }
    });
  }

  const registerForm = document.querySelector(".register-page form");
  if (registerForm && !registerForm.dataset.bound) {
    registerForm.dataset.bound = "true";
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const fields = registerForm.querySelectorAll("input");
      try {
        await apiFetch("/api/auth/register", {
          method: "POST",
          body: {
            name: fields[0]?.value.trim() || "",
            email: fields[1]?.value.trim() || "",
            password: fields[2]?.value || "",
            role: registerForm.querySelector("#role")?.value || "buyer",
          },
        });
        ensureMessage(registerForm, "Account created successfully. Redirecting to login...", "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      } catch (error) {
        ensureMessage(registerForm, error.message, "error");
      }
    });
  }
}

async function logout() {
  try {
    if (getToken()) {
      await apiFetch("/api/auth/logout", { method: "POST", auth: true });
    }
  } catch {
    // ignore logout failure and clear session
  }
  clearSession();
  window.location.href = "index.html";
}

function bindLogoutLinks() {
  document.querySelectorAll('[onclick="logout()"]').forEach((node) => {
    if (node.dataset.boundLogout) return;
    node.dataset.boundLogout = "true";
    node.addEventListener("click", (event) => {
      event.preventDefault();
      logout();
    });
  });
}

function redirectAfterLoginIfNeeded() {
  const user = getCurrentUser();
  if (!user) return;

  const path = window.location.pathname.split("/").pop();
  if (path === "login.html" || path === "register.html") {
    if (user.role === "Admin") window.location.href = "admin.html";
    else if (user.role === "Farmer") window.location.href = "create-farm.html";
    else if (user.role === "Dealer") window.location.href = "pesticides.html";
    else window.location.href = "index.html";
  }
}

async function loadHomePage() {
  const container = document.querySelector(".top-farms .farms-container");
  if (!container) return;
  try {
    const data = await apiFetch("/api/farms");
    const farms = Array.isArray(data.farms) ? data.farms.slice(0, 3) : [];
    if (!farms.length) return;
    container.innerHTML = "";
    farms.forEach((farm) => container.appendChild(farmCardTemplate(farm)));
  } catch {
    // keep static fallback
  }
}

async function loadFarmsPage() {
  const page = document.querySelector(".farms-page");
  const grid = document.querySelector(".farms-page .farms-grid");
  if (!page || !grid) return;
  try {
    const data = await apiFetch("/api/farms");
    grid.innerHTML = "";
    (data.farms || []).forEach((farm) => grid.appendChild(farmCardTemplate(farm)));
    searchItems();
  } catch (error) {
    ensureMessage(page, error.message, "error");
  }
}

async function loadFarmDetailPage() {
  const farmId = getFarmIdFromUrl();
  const profile = document.querySelector(".farm-profile");
  const productsSection = document.querySelector(".products");
  if (!farmId || !profile || !productsSection) return;

  try {
    const data = await apiFetch(`/api/farms/${farmId}`);
    const farm = data.farm;
    if (!farm) return;

    document.title = `${farm.farm_name} - Smart Farm Marketplace`;
    profile.innerHTML = `
      <img src="${escapeHtml(farm.image || "images/farm.jpg")}" alt="${escapeHtml(farm.farm_name || "Farm")}">
      <div class="farm-info">
        <h1>${escapeHtml(farm.farm_name || "Farm")}</h1>
        <p><strong><i class="fas fa-user-circle"></i> Farmer:</strong> ${escapeHtml(farm.farmer_name || "")}</p>
        <p><strong><i class="fas fa-map-marker-alt"></i> Location:</strong> ${escapeHtml(farm.location || "")}</p>
        <p>${escapeHtml(farm.description || "")}</p>
      </div>
    `;

    productsSection.innerHTML = "<h2>Products from this Farm</h2>";
    const container = document.createElement("div");
    container.className = "product-container";
    (data.products || []).forEach((product) => {
      const card = productCardTemplate(product);
      
      const detailsDiv = document.createElement("div");
      detailsDiv.className = "stock-status";
      detailsDiv.innerHTML = `<p>Stock: ${escapeHtml(product.stock ?? 0)}</p>`;
      card.appendChild(detailsDiv);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Add to Cart";
      button.className = "btn-add-cart";
      if (toNumber(product.stock) <= 0) {
        button.textContent = "Out of Stock";
        button.disabled = true;
        button.style.background = "#94a3b8";
        button.style.cursor = "not-allowed";
      } else {
        button.addEventListener("click", () => addToCart(product.id, "Farm", 1, product));
      }
      card.appendChild(button);
      container.appendChild(card);
    });
    productsSection.appendChild(container);
  } catch (error) {
    ensureMessage(profile, error.message, "error");
  }
}

async function createFarm() {
  const farmName = document.getElementById("farmName")?.value.trim() || "";
  const farmDescription = document.getElementById("farmDescription")?.value.trim() || "";
  const farmLocation = document.getElementById("farmLocation")?.value.trim() || "";
  const farmImage = document.getElementById("farmImage")?.value.trim() || "";
  
  if (!farmName || !farmLocation) {
    notify("Farm Name and Location are required.");
    return;
  }

  try {
    const data = await apiFetch("/api/farms", {
      method: "POST",
      auth: true,
      body: {
        farm_name: farmName,
        location: farmLocation,
        description: farmDescription,
        image: farmImage,
      },
    });
    notify(data.message || "Farm created successfully");
    
    // Clear inputs
    document.getElementById("farmName").value = "";
    document.getElementById("farmDescription").value = "";
    document.getElementById("farmLocation").value = "";
    document.getElementById("farmImage").value = "";
    
    await displayFarms();
  } catch (error) {
    ensureMessage(document.querySelector(".dashboard"), error.message, "error");
  }
}

async function displayFarms() {
  const container = document.getElementById("farm-list");
  if (!container) return;
  try {
    const data = await apiFetch("/api/farms", { auth: true });
    const user = getCurrentUser();
    const farms = Array.isArray(data.farms) ? data.farms : [];
    const visible = user ? farms.filter((farm) => Number(farm.farmer_id) === Number(user.id) || user.role === "Admin") : farms;
    
    container.innerHTML = "";
    if (!visible.length) {
      container.innerHTML = "<p>No farms registered yet. Please fill the form above to create one.</p>";
      return;
    }
    
    visible.forEach((farm) => {
      const card = document.createElement("div");
      card.className = "product";
      card.innerHTML = `
        <img src="${escapeHtml(farm.image || "images/farm.jpg")}" alt="${escapeHtml(farm.farm_name || "Farm")}">
        <h3>${escapeHtml(farm.farm_name || "Farm")}</h3>
        <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(farm.location || "")}</p>
        <p>${escapeHtml(farm.description || "")}</p>
        <div class="farm-actions" style="margin-top: 15px; display: flex; flex-direction: column; gap: 8px; padding: 10px;"></div>
      `;
      
      const actionsDiv = card.querySelector(".farm-actions");

      const manageBtn = document.createElement("button");
      manageBtn.type = "button";
      manageBtn.className = "action-btn manage-btn";
      manageBtn.innerHTML = '<i class="fas fa-tasks"></i> Manage Products';
      manageBtn.style.background = "#3b82f6";
      manageBtn.addEventListener("click", () => {
        localStorage.setItem("currentFarm", String(farm.id));
        window.location.href = "manage-farm.html";
      });

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "action-btn edit-btn";
      edit.innerHTML = '<i class="fas fa-edit"></i> Edit Details';
      edit.style.background = "#10b981";
      edit.addEventListener("click", () => editFarm(farm));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "action-btn delete-btn";
      del.innerHTML = '<i class="fas fa-trash-alt"></i> Delete Farm';
      del.style.background = "#ef4444";
      del.addEventListener("click", () => deleteFarm(farm.id, farm.farm_name));

      actionsDiv.append(manageBtn, edit, del);
      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

async function editFarm(farm) {
  const farm_name = window.prompt("Farm name", farm.farm_name || "");
  if (farm_name === null) return;
  const location = window.prompt("Location", farm.location || "");
  if (location === null) return;
  const description = window.prompt("Description", farm.description || "");
  if (description === null) return;
  const image = window.prompt("Image URL", farm.image || "");
  if (image === null) return;
  try {
    await apiFetch(`/api/farms/${farm.id}`, {
      method: "PUT",
      auth: true,
      body: { farm_name, location, description, image },
    });
    await displayFarms();
  } catch (error) {
    notify(error.message);
  }
}

async function deleteFarm(farmId, farmName) {
  if (!window.confirm(`Are you sure you want to delete "${farmName || "this farm"}"? This will delete all products associated with it.`)) return;
  try {
    await apiFetch(`/api/farms/${farmId}`, { method: "DELETE", auth: true });
    await displayFarms();
  } catch (error) {
    notify(error.message);
  }
}

async function addProduct() {
  const productName = document.getElementById("productName")?.value.trim() || "";
  const productPrice = document.getElementById("productPrice")?.value || "";
  const productCategory = document.getElementById("productCategory")?.value.trim() || "General";
  const productStock = document.getElementById("productStock")?.value || "0";
  const productImage = document.getElementById("productImage")?.value.trim() || "";
  
  if (!productName || !productPrice) {
    notify("Product Name and Price are required.");
    return;
  }

  try {
    const data = await apiFetch("/api/products", {
      method: "POST",
      auth: true,
      body: {
        product_name: productName,
        price: toNumber(productPrice),
        category: productCategory,
        image: productImage,
        stock: toNumber(productStock),
      },
    });
    notify(data.message || "Product created successfully");
    
    // Clear inputs
    document.getElementById("productName").value = "";
    document.getElementById("productPrice").value = "";
    document.getElementById("productCategory").value = "General";
    document.getElementById("productStock").value = "0";
    document.getElementById("productImage").value = "";
    
    await displayFarmProducts();
  } catch (error) {
    const dashboard = document.querySelector(".dashboard");
    ensureMessage(dashboard, error.message, "error");
  }
}

async function displayFarmProducts() {
  const container = document.getElementById("product-list");
  if (!container) return;
  try {
    const data = await apiFetch("/api/farmer/products", { auth: true });
    const products = Array.isArray(data.products) ? data.products : [];
    
    container.innerHTML = "";
    if (!products.length) {
      container.innerHTML = "<p>No products added to this farm yet. Use the form above to add products.</p>";
      return;
    }
    
    products.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product";
      card.innerHTML = `
        <img src="${escapeHtml(product.image || "images/farm.jpg")}" alt="${escapeHtml(product.product_name || "Product")}">
        <h3>${escapeHtml(product.product_name || "Product")}</h3>
        <p class="price">${formatMoney(product.price)}</p>
        <p>Category: ${escapeHtml(product.category || "General")}</p>
        <p>Stock: ${escapeHtml(product.stock ?? 0)}</p>
        <div class="product-actions" style="margin-top: 10px; display: flex; gap: 8px; justify-content: center; padding: 10px;"></div>
      `;
      
      const actionsDiv = card.querySelector(".product-actions");

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "action-btn edit-btn";
      edit.style.background = "#10b981";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editProduct(product));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "action-btn delete-btn";
      del.style.background = "#ef4444";
      del.textContent = "Delete";
      del.addEventListener("click", () => deleteProduct(product.id, product.product_name));

      actionsDiv.append(edit, del);
      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

async function editProduct(product) {
  const product_name = window.prompt("Product name", product.product_name || "");
  if (product_name === null) return;
  const price = window.prompt("Price", String(product.price ?? 0));
  if (price === null) return;
  const category = window.prompt("Category", product.category || "General");
  if (category === null) return;
  const image = window.prompt("Image URL", product.image || "");
  if (image === null) return;
  const stock = window.prompt("Stock", String(product.stock ?? 0));
  if (stock === null) return;
  try {
    await apiFetch(`/api/products/${product.id}`, {
      method: "PUT",
      auth: true,
      body: {
        product_name,
        price: toNumber(price),
        category,
        image,
        stock: toNumber(stock),
      },
    });
    await displayFarmProducts();
  } catch (error) {
    notify(error.message);
  }
}

async function deleteProduct(productId, productName) {
  if (!window.confirm(`Are you sure you want to delete "${productName || "this product"}"?`)) return;
  try {
    await apiFetch(`/api/products/${productId}`, { method: "DELETE", auth: true });
    await displayFarmProducts();
  } catch (error) {
    notify(error.message);
  }
}

function getLocalCart() {
  return readJson(localStorage.getItem(GUEST_CART_KEY), []);
}

function setLocalCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

async function addToCart(productOrId, secondArg, quantity = 1, productMeta = null) {
  const productType = secondArg === "Farm" || secondArg === "Pesticide" ? secondArg : null;

  if (getToken() && productType) {
    try {
      const data = await apiFetch("/api/cart", {
        method: "POST",
        auth: true,
        body: {
          product_id: productOrId,
          product_type: productType,
          quantity,
        },
      });
      updateCartCount();
      notify(data.message || `${productMeta?.product_name || "Item"} added to cart`);
      return;
    } catch (error) {
      notify(error.message);
      return;
    }
  }

  // Local storage cart for guests
  const cart = getLocalCart();
  const productName = productMeta?.product_name || String(productOrId || "Item");
  const price = productType ? toNumber(productMeta?.price) : toNumber(secondArg);
  const existing = cart.find((item) => item.product === productName);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ product: productName, price, quantity });
  }
  setLocalCart(cart);
  updateCartCount();
  notify(`${productName} added to cart`);
}

async function loadCartFromApi() {
  const list = document.getElementById("cart-items");
  if (!list) return false;
  try {
    const data = await apiFetch("/api/cart", { auth: true });
    const items = Array.isArray(data.items) ? data.items : [];
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = "<li>Your cart is empty.</li>";
    } else {
      items.forEach((item) => list.appendChild(renderCartItem(item, item.id, true)));
    }
    const totalPrice = document.getElementById("total-price");
    if (totalPrice) totalPrice.textContent = `Total: ${formatMoney(data.total_amount || 0)}`;
    updateCartCount(items);
    return true;
  } catch (error) {
    ensureMessage(list.parentElement || list, error.message, "error");
    return false;
  }
}

function loadCartFromLocal() {
  const list = document.getElementById("cart-items");
  if (!list) return;
  const cart = getLocalCart();
  list.innerHTML = "";
  let total = 0;
  if (!cart.length) {
    list.innerHTML = "<li>Your cart is empty.</li>";
  } else {
    cart.forEach((item, index) => {
      total += toNumber(item.price) * toNumber(item.quantity, 1);
      list.appendChild(renderCartItem({ product: item.product, price: item.price, quantity: item.quantity }, index, false));
    });
  }
  const totalPrice = document.getElementById("total-price");
  if (totalPrice) totalPrice.textContent = `Total: ${formatMoney(total)}`;
  updateCartCount();
}

async function loadCart() {
  if (getToken()) {
    const loaded = await loadCartFromApi();
    if (loaded) return;
  }
  loadCartFromLocal();
}

async function increaseQty(itemRef, currentQuantity, stock, remote = false) {
  if (remote || (typeof itemRef === "number" && getToken())) {
    const nextQuantity = toNumber(currentQuantity, 1) + 1;
    if (stock != null && nextQuantity > toNumber(stock)) {
      notify("Requested quantity exceeds stock");
      return;
    }
    try {
      await apiFetch(`/api/cart/${itemRef}`, { method: "PUT", auth: true, body: { quantity: nextQuantity } });
      await loadCart();
    } catch (error) {
      notify(error.message);
    }
    return;
  }

  const cart = getLocalCart();
  if (!cart[itemRef]) return;
  cart[itemRef].quantity += 1;
  setLocalCart(cart);
  loadCartFromLocal();
}

async function decreaseQty(itemRef, currentQuantity, remote = false) {
  if (remote || (typeof itemRef === "number" && getToken())) {
    const nextQuantity = toNumber(currentQuantity, 1) - 1;
    if (nextQuantity < 1) {
      await removeItem(itemRef, true);
      return;
    }
    try {
      await apiFetch(`/api/cart/${itemRef}`, { method: "PUT", auth: true, body: { quantity: nextQuantity } });
      await loadCart();
    } catch (error) {
      notify(error.message);
    }
    return;
  }

  const cart = getLocalCart();
  if (!cart[itemRef]) return;
  if (cart[itemRef].quantity > 1) {
    cart[itemRef].quantity -= 1;
  } else {
    cart.splice(itemRef, 1);
  }
  setLocalCart(cart);
  loadCartFromLocal();
}

async function removeItem(itemRef, remote = false) {
  if (remote || (typeof itemRef === "number" && getToken())) {
    try {
      await apiFetch(`/api/cart/${itemRef}`, { method: "DELETE", auth: true });
      await loadCart();
    } catch (error) {
      notify(error.message);
    }
    return;
  }

  const cart = getLocalCart();
  cart.splice(itemRef, 1);
  setLocalCart(cart);
  loadCartFromLocal();
}

async function clearCart() {
  if (getToken()) {
    try {
      const data = await apiFetch("/api/cart", { auth: true });
      const items = Array.isArray(data.items) ? data.items : [];
      await Promise.all(items.map((item) => apiFetch(`/api/cart/${item.id}`, { method: "DELETE", auth: true })));
    } catch {
      // ignore failures and clear local storage anyway
    }
  }
  localStorage.removeItem(GUEST_CART_KEY);
  await loadCart();
}

async function handleCheckout(event) {
  event.preventDefault();
  if (!getToken()) {
    notify("Please log in before placing an order.");
    window.location.href = "login.html";
    return;
  }
  try {
    const data = await apiFetch("/api/orders", { method: "POST", auth: true });
    ensureMessage(document.getElementById("checkout-form"), data.message || "Order placed successfully", "success");
    await clearCart();
    await loadOrdersSection();
  } catch (error) {
    ensureMessage(document.getElementById("checkout-form"), error.message, "error");
  }
}

function renderOrders(parent, orders) {
  if (!parent) return;
  parent.innerHTML = "";
  if (!orders.length) {
    parent.innerHTML = "<li>No orders found.</li>";
    return;
  }

  orders.forEach((order) => {
    const card = document.createElement("div");
    card.className = "product";
    card.style.width = "100%";
    card.style.textAlign = "left";
    card.style.padding = "20px";
    card.style.boxSizing = "border-box";
    
    const items = Array.isArray(order.items) && order.items.length
      ? `<ul class="order-items-list" style="margin-top: 10px; padding-left: 20px;">${order.items.map((item) => `<li>${escapeHtml(item.product_name)} x ${escapeHtml(item.quantity)} (${formatMoney(item.price)})</li>`).join("")}</ul>`
      : "";
      
    card.innerHTML = `
      <h3>Order #${escapeHtml(order.id)}</h3>
      <p><strong>Status:</strong> <span class="order-status-badge status-${String(order.status).toLowerCase()}">${escapeHtml(order.status)}</span></p>
      <p><strong>Total Amount:</strong> <span class="price">${formatMoney(order.total_amount)}</span></p>
      <p><strong>Order Date:</strong> ${escapeHtml(new Date(order.created_at).toLocaleDateString() || "")}</p>
      ${order.buyer_name ? `<p><strong>Buyer Name:</strong> ${escapeHtml(order.buyer_name)}</p>` : ""}
      ${items}
      <div class="order-controls" style="margin-top: 15px; display: flex; gap: 10px;"></div>
    `;

    const controls = card.querySelector(".order-controls");

    if (getRole() === "Farmer" || getRole() === "Admin" || getRole() === "Dealer") {
      const select = document.createElement("select");
      select.id = `order-status-${order.id}`;
      select.style.padding = "8px 12px";
      select.style.borderRadius = "6px";
      select.style.border = "1px solid #ccc";
      
      ["Pending", "Shipped", "Delivered"].forEach((status) => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        if (status === order.status) option.selected = true;
        select.appendChild(option);
      });
      
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Update Status";
      button.style.padding = "8px 16px";
      button.style.borderRadius = "6px";
      button.style.border = "none";
      button.style.background = "#2e7d32";
      button.style.color = "white";
      button.style.cursor = "pointer";
      button.addEventListener("click", () => updateOrderStatus(order.id));
      
      controls.append(select, button);
    }
    
    parent.appendChild(card);
  });
}

async function loadOrdersSection() {
  const cartPage = document.querySelector(".cart-page");
  if (!cartPage || !getToken()) return;
  let section = document.getElementById("orders-section");
  if (!section) {
    section = document.createElement("section");
    section.id = "orders-section";
    section.className = "orders-history-section";
    section.style.marginTop = "40px";
    section.innerHTML = "<h2>Your Order History</h2><div id='orders-list' class='products' style='display:flex; flex-direction:column; gap:20px; align-items:center;'></div>";
    cartPage.appendChild(section);
  }
  try {
    const data = await apiFetch("/api/orders", { auth: true });
    renderOrders(document.getElementById("orders-list"), data.orders || []);
  } catch (error) {
    ensureMessage(section, error.message, "error");
  }
}

async function loadOrders() {
  await loadOrdersSection();
}

async function updateOrderStatus(orderId) {
  const select = document.getElementById(`order-status-${orderId}`);
  if (!select) return;
  try {
    await apiFetch(`/api/orders/${orderId}`, { method: "PUT", auth: true, body: { status: select.value } });
    notify("Order status updated successfully");
    const adminPanel = document.querySelector(".admin-panel");
    if (adminPanel) {
      await loadAdminPanel();
    } else {
      await loadOrdersSection();
    }
  } catch (error) {
    notify(error.message);
  }
}

async function loadAdminPanel() {
  const adminPanel = document.querySelector(".admin-panel");
  if (!adminPanel) return;
  if (!getToken() || getRole() !== "Admin") {
    ensureMessage(adminPanel, "Admin access required. Redirecting to home...", "error");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
    return;
  }

  try {
    const [stats, users, farms, products, orders, dealers] = await Promise.all([
      apiFetch("/api/admin/stats", { auth: true }),
      apiFetch("/api/admin/users", { auth: true }),
      apiFetch("/api/admin/farms", { auth: true }),
      apiFetch("/api/admin/products", { auth: true }),
      apiFetch("/api/admin/orders", { auth: true }),
      apiFetch("/api/admin/dealers", { auth: true }),
    ]);

    // Update statistics cards
    const totalUsers = document.getElementById("totalUsers");
    const totalFarms = document.getElementById("totalFarms");
    const totalProducts = document.getElementById("totalProducts");
    const totalOrders = document.getElementById("totalOrders");
    const totalRevenue = document.getElementById("totalRevenue");

    if (totalUsers) totalUsers.textContent = stats.total_users ?? 0;
    if (totalFarms) totalFarms.textContent = stats.total_farms ?? 0;
    if (totalProducts) totalProducts.textContent = stats.total_products ?? 0;
    if (totalOrders) totalOrders.textContent = stats.total_orders ?? 0;
    if (totalRevenue) totalRevenue.textContent = formatMoney(stats.total_revenue ?? 0);

    // Dynamic Lists/Tables Generation
    const usersList = document.getElementById("usersList");
    if (usersList) {
      usersList.innerHTML = "";
      if (!(users.users || []).length) {
        usersList.innerHTML = "<tr><td colspan='5'>No users found</td></tr>";
      } else {
        (users.users || []).forEach((user) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${user.id}</td>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="role-badge role-${String(user.role).toLowerCase()}">${escapeHtml(user.role)}</span></td>
            <td>
              <button class="delete-btn" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fas fa-trash"></i> Delete</button>
            </td>
          `;
          row.querySelector(".delete-btn").addEventListener("click", () => deleteUser(user.id, user.name));
          usersList.appendChild(row);
        });
      }
    }

    const farmsList = document.getElementById("farmsList");
    if (farmsList) {
      farmsList.innerHTML = "";
      if (!(farms.farms || []).length) {
        farmsList.innerHTML = "<tr><td colspan='5'>No farms found</td></tr>";
      } else {
        (farms.farms || []).forEach((farm) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${farm.id}</td>
            <td>${escapeHtml(farm.farm_name)}</td>
            <td>${escapeHtml(farm.farmer_name)}</td>
            <td>${escapeHtml(farm.location)}</td>
            <td>
              <button class="delete-btn" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fas fa-trash"></i> Delete</button>
            </td>
          `;
          row.querySelector(".delete-btn").addEventListener("click", () => {
            if (confirm(`Delete farm "${farm.farm_name}"?`)) {
              apiFetch(`/api/farms/${farm.id}`, { method: "DELETE", auth: true })
                .then(() => loadAdminPanel())
                .catch(err => notify(err.message));
            }
          });
          farmsList.appendChild(row);
        });
      }
    }

    const productsList = document.getElementById("productsList");
    if (productsList) {
      productsList.innerHTML = "";
      if (!(products.products || []).length) {
        productsList.innerHTML = "<tr><td colspan='6'>No products found</td></tr>";
      } else {
        (products.products || []).forEach((product) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${product.id}</td>
            <td>${escapeHtml(product.product_name)}</td>
            <td>${escapeHtml(product.farm_name)}</td>
            <td>${formatMoney(product.price)}</td>
            <td>${product.stock}</td>
            <td>
              <button class="delete-btn" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fas fa-trash"></i> Delete</button>
            </td>
          `;
          row.querySelector(".delete-btn").addEventListener("click", () => {
            if (confirm(`Delete product "${product.product_name}"?`)) {
              apiFetch(`/api/products/${product.id}`, { method: "DELETE", auth: true })
                .then(() => loadAdminPanel())
                .catch(err => notify(err.message));
            }
          });
          productsList.appendChild(row);
        });
      }
    }

    const ordersList = document.getElementById("ordersList");
    if (ordersList) {
      ordersList.innerHTML = "";
      if (!(orders.orders || []).length) {
        ordersList.innerHTML = "<tr><td colspan='6'>No orders found</td></tr>";
      } else {
        (orders.orders || []).forEach((order) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>#${order.id}</td>
            <td>${escapeHtml(order.buyer_name)}</td>
            <td>${formatMoney(order.total_amount)}</td>
            <td>
              <select id="admin-status-${order.id}" style="padding:4px; border-radius:4px; border:1px solid #ccc; font-weight:600;">
                <option value="Pending" ${order.status === "Pending" ? "selected" : ""}>Pending</option>
                <option value="Shipped" ${order.status === "Shipped" ? "selected" : ""}>Shipped</option>
                <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
              </select>
            </td>
            <td>${escapeHtml(new Date(order.created_at).toLocaleDateString())}</td>
            <td>
              <button class="update-btn" style="background:#2e7d32; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">Update</button>
              <button class="delete-btn" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;">Delete</button>
            </td>
          `;
          row.querySelector(".update-btn").addEventListener("click", () => {
            const newStatus = row.querySelector("select").value;
            apiFetch(`/api/orders/${order.id}`, { method: "PUT", auth: true, body: { status: newStatus } })
              .then(() => { notify("Order updated successfully"); loadAdminPanel(); })
              .catch(err => notify(err.message));
          });
          row.querySelector(".delete-btn").addEventListener("click", () => deleteOrder(order.id));
          ordersList.appendChild(row);
        });
      }
    }

    const dealersList = document.getElementById("dealersList");
    if (dealersList) {
      dealersList.innerHTML = "";
      if (!(dealers.dealers || []).length) {
        dealersList.innerHTML = "<tr><td colspan='6'>No dealers found</td></tr>";
      } else {
        (dealers.dealers || []).forEach((dealer) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${dealer.id}</td>
            <td>${escapeHtml(dealer.dealer_name)}</td>
            <td>${escapeHtml(dealer.shop_name)}</td>
            <td>${escapeHtml(dealer.location)}</td>
            <td>${escapeHtml(dealer.phone)}</td>
            <td>
              <button class="delete-btn" style="background:#ef4444; border:none; color:white; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fas fa-trash"></i> Remove</button>
            </td>
          `;
          row.querySelector(".delete-btn").addEventListener("click", () => {
            if (confirm(`Remove dealer profile for "${dealer.dealer_name}"?`)) {
              apiFetch(`/api/admin/users/${dealer.user_id}`, { method: "DELETE", auth: true })
                .then(() => loadAdminPanel())
                .catch(err => notify(err.message));
            }
          });
          dealersList.appendChild(row);
        });
      }
    }
  } catch (error) {
    ensureMessage(adminPanel, error.message, "error");
  }
}

async function deleteUser(userId, userName) {
  if (!window.confirm(`Are you sure you want to delete the user "${userName || "this user"}"? This will delete all their listings, farms, and records.`)) return;
  try {
    await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE", auth: true });
    await loadAdminPanel();
    notify("User deleted successfully.");
  } catch (error) {
    notify(error.message);
  }
}

async function deleteOrder(orderId) {
  if (!window.confirm("Are you sure you want to delete order #" + orderId + "?")) return;
  try {
    await apiFetch(`/api/admin/orders/${orderId}`, { method: "DELETE", auth: true });
    await loadAdminPanel();
    notify("Order deleted successfully.");
  } catch (error) {
    notify(error.message);
  }
}

function ensureManageFarmInputs() {
  // Category and stock input fields are now natively rendered in manage-farm.html
}

function ensureDealerPanel() {
  // Dynamic creation not required if container sections are properly structured in pesticides.html
}

function bindDealerForms() {
  const profileForm = document.getElementById("dealer-profile-form");
  if (profileForm && !profileForm.dataset.bound) {
    profileForm.dataset.bound = "true";
    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = await apiFetch("/api/dealers/profile", {
          method: "POST",
          auth: true,
          body: {
            dealer_name: document.getElementById("dealerName")?.value.trim() || "",
            shop_name: document.getElementById("shopName")?.value.trim() || "",
            location: document.getElementById("dealerLocation")?.value.trim() || "",
            phone: document.getElementById("dealerPhone")?.value.trim() || "",
          },
        });
        ensureMessage(profileForm, data.message || "Dealer profile saved successfully", "success");
      } catch (error) {
        ensureMessage(profileForm, error.message, "error");
      }
    });
  }

  const pesticideForm = document.getElementById("pesticide-form");
  if (pesticideForm && !pesticideForm.dataset.bound) {
    pesticideForm.dataset.bound = "true";
    pesticideForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = await apiFetch("/api/pesticides", {
          method: "POST",
          auth: true,
          body: {
            product_name: document.getElementById("pesticideName")?.value.trim() || "",
            price: toNumber(document.getElementById("pesticidePrice")?.value),
            description: document.getElementById("pesticideDescription")?.value.trim() || "",
            image: document.getElementById("pesticideImage")?.value.trim() || "",
            stock: toNumber(document.getElementById("pesticideStock")?.value),
          },
        });
        ensureMessage(pesticideForm, data.message || "Pesticide listing created", "success");
        
        // Clear listing inputs
        document.getElementById("pesticideName").value = "";
        document.getElementById("pesticidePrice").value = "";
        document.getElementById("pesticideDescription").value = "";
        document.getElementById("pesticideImage").value = "";
        document.getElementById("pesticideStock").value = "0";

        await displayPesticides();
      } catch (error) {
        ensureMessage(pesticideForm, error.message, "error");
      }
    });
  }
}

async function displayPesticides() {
  const container = document.getElementById("pesticide-list");
  if (!container) return;
  try {
    const data = await apiFetch("/api/pesticides");
    const pesticides = Array.isArray(data.pesticides) ? data.pesticides : [];
    container.innerHTML = "";
    
    if (!pesticides.length) {
      container.innerHTML = "<p>No pesticides or fertilizers currently listed.</p>";
      return;
    }
    
    pesticides.forEach((pesticide) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <img src="${escapeHtml(pesticide.image || "images/farm.jpg")}" alt="${escapeHtml(pesticide.product_name || "Pesticide")}">
        <h3>${escapeHtml(pesticide.product_name || "Pesticide")}</h3>
        <p>${escapeHtml(pesticide.description || "")}</p>
        <p class="price">${formatMoney(pesticide.price)}</p>
        <p class="dealer-info"><strong>Shop:</strong> ${escapeHtml(pesticide.shop_name || "")} (${escapeHtml(pesticide.dealer_name || "")})</p>
        <p class="location"><strong>Location:</strong> ${escapeHtml(pesticide.location || "")}</p>
        <p class="stock">Stock: ${escapeHtml(pesticide.stock ?? 0)}</p>
        <div class="pesticide-actions" style="margin-top: 15px; display: flex; gap: 8px; justify-content: center;"></div>
      `;

      const actionsDiv = card.querySelector(".pesticide-actions");

      // Buy button
      const buy = document.createElement("button");
      buy.type = "button";
      buy.textContent = "Buy Now";
      buy.className = "buy-btn";
      
      if (toNumber(pesticide.stock) <= 0) {
        buy.textContent = "Out of Stock";
        buy.disabled = true;
        buy.style.background = "#94a3b8";
        buy.style.cursor = "not-allowed";
      } else {
        buy.addEventListener("click", () => addToCart(pesticide.id, "Pesticide", 1, pesticide));
      }
      actionsDiv.appendChild(buy);

      // Edit/Delete for dealers or admin
      const user = getCurrentUser();
      if (user && (user.role === "Admin" || (user.role === "Dealer" && Number(pesticide.user_id) === Number(user.id)))) {
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Edit";
        edit.className = "edit-btn";
        edit.style.background = "#10b981";
        edit.style.color = "white";
        edit.addEventListener("click", async () => {
          const product_name = window.prompt("Product name", pesticide.product_name || "");
          if (product_name === null) return;
          const price = window.prompt("Price", String(pesticide.price ?? 0));
          if (price === null) return;
          const description = window.prompt("Description", pesticide.description || "");
          if (description === null) return;
          const image = window.prompt("Image URL", pesticide.image || "");
          if (image === null) return;
          const stock = window.prompt("Stock", String(pesticide.stock ?? 0));
          if (stock === null) return;
          try {
            await apiFetch(`/api/pesticides/${pesticide.id}`, {
              method: "PUT",
              auth: true,
              body: {
                product_name,
                price: toNumber(price),
                description,
                image,
                stock: toNumber(stock),
              },
            });
            await displayPesticides();
          } catch (error) {
            notify(error.message);
          }
        });

        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "Delete";
        del.className = "delete-btn";
        del.style.background = "#ef4444";
        del.style.color = "white";
        del.addEventListener("click", async () => {
          if (!window.confirm(`Are you sure you want to delete pesticide "${pesticide.product_name}"?`)) return;
          try {
            await apiFetch(`/api/pesticides/${pesticide.id}`, { method: "DELETE", auth: true });
            await displayPesticides();
          } catch (error) {
            notify(error.message);
          }
        });
        
        actionsDiv.append(edit, del);
      }

      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

async function initPesticidesPage() {
  const user = getCurrentUser();
  const profileSection = document.getElementById("dealer-profile-section");
  const addPesticideSection = document.getElementById("add-pesticide-section");

  if (user && user.role === "Dealer") {
    if (profileSection) profileSection.style.display = "block";
    if (addPesticideSection) addPesticideSection.style.display = "block";
    
    // Check if dealer has profile already
    try {
      const data = await apiFetch("/api/dealers/profile", { auth: true });
      if (data && data.profile) {
        document.getElementById("dealerName").value = data.profile.dealer_name || "";
        document.getElementById("shopName").value = data.profile.shop_name || "";
        document.getElementById("dealerLocation").value = data.profile.location || "";
        document.getElementById("dealerPhone").value = data.profile.phone || "";
      }
    } catch (e) {
      // Profile not set up yet
    }
    
    bindDealerForms();
  } else {
    if (profileSection) profileSection.style.display = "none";
    if (addPesticideSection) addPesticideSection.style.display = "none";
  }
  
  await displayPesticides();
}

async function loadDealerAndPesticidePage() {
  await initPesticidesPage();
}

function searchItems() {
  const input = document.getElementById("searchInput");
  const query = input ? input.value.toLowerCase() : "";
  document.querySelectorAll(".farm-card").forEach((card) => {
    const searchable = card.dataset.search || card.innerText.toLowerCase();
    card.style.display = searchable.includes(query) ? "block" : "none";
  });
}

function filterCategory(category) {
  document.querySelectorAll(".farm-card").forEach((card) => {
    if (category === "all" || card.getAttribute("data-category") === category) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

function openFarm(index) {
  localStorage.setItem("currentFarm", String(index));
  window.location.href = "manage-farm.html";
}

// Router Guards enforcement on page load
function enforceRouteGuards() {
  const user = getCurrentUser();
  const token = getToken();
  const path = window.location.pathname.split("/").pop();

  if (path === "admin.html") {
    if (!token || user?.role !== "Admin") {
      alert("Access Denied: Admin role required.");
      window.location.href = "login.html";
    }
  }

  if (path === "create-farm.html" || path === "manage-farm.html") {
    if (!token || user?.role !== "Farmer") {
      alert("Access Denied: Farmer role required.");
      window.location.href = "login.html";
    }
  }
}

async function checkAndHideAdminOption() {
  const registerForm = document.querySelector(".register-page form");
  if (!registerForm) return;
  try {
    const data = await apiFetch("/api/auth/admin-exists");
    if (data && data.exists) {
      const select = registerForm.querySelector("#role");
      if (select) {
        const adminOption = select.querySelector('option[value="admin"]');
        if (adminOption) {
          adminOption.remove();
        }
      }
    }
  } catch (error) {
    console.error("Error checking if Admin exists:", error);
  }
}

async function initPage() {
  enforceRouteGuards();
  renderNavbar();
  bindAuthForms();
  bindLogoutLinks();
  startCarousel();
  redirectAfterLoginIfNeeded();
  await checkAndHideAdminOption();

  if (document.querySelector(".top-farms .farms-container")) {
    await loadHomePage();
  }

  if (document.querySelector(".farms-page")) {
    await loadFarmsPage();
  }

  if (getFarmIdFromUrl()) {
    await loadFarmDetailPage();
  }

  if (document.getElementById("farm-list")) {
    await displayFarms();
  }

  if (document.getElementById("product-list")) {
    await displayFarmProducts();
  }

  if (document.querySelector(".cart-page")) {
    await loadCart();
    await loadOrdersSection();
  }

  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm && !checkoutForm.dataset.bound) {
    checkoutForm.dataset.bound = "true";
    checkoutForm.addEventListener("submit", handleCheckout);
  }

  if (document.querySelector(".admin-panel")) {
    await loadAdminPanel();
  }

  if (document.querySelector(".products-page")) {
    await loadDealerAndPesticidePage();
  }
}

// Dynamic navbar rendering function
function renderNavbar() {
  const nav = document.querySelector("header nav");
  if (!nav) return;

  const user = getCurrentUser();
  const token = getToken();

  let html = `<a href="index.html">Home</a>`;
  
  if (!token || !user) {
    html += `
      <a href="farms.html">Farms</a>
      <a href="pesticides.html">Pesticides</a>
      <a href="login.html">Login</a>
      <a href="register.html">Register</a>
      <a href="cart.html">🛒 Cart (<span id="cart-count">0</span>)</a>
    `;
  } else {
    const role = user.role;
    if (role === "Admin") {
      html += `
        <a href="admin.html">Admin Panel</a>
        <a href="#" onclick="logout()">Logout</a>
      `;
    } else if (role === "Farmer") {
      html += `
        <a href="create-farm.html">My Farms</a>
        <a href="manage-farm.html">Manage Products</a>
        <a href="farms.html">Browse Farms</a>
        <a href="pesticides.html">Pesticides</a>
        <a href="cart.html">🛒 Cart (<span id="cart-count">0</span>)</a>
        <a href="#" onclick="logout()">Logout</a>
      `;
    } else if (role === "Dealer") {
      html += `
        <a href="pesticides.html">Manage Pesticides</a>
        <a href="farms.html">Farms</a>
        <a href="#" onclick="logout()">Logout</a>
      `;
    } else { // Buyer
      html += `
        <a href="farms.html">Farms</a>
        <a href="pesticides.html">Pesticides</a>
        <a href="cart.html">🛒 Cart (<span id="cart-count">0</span>)</a>
        <a href="#" onclick="logout()">Logout</a>
      `;
    }
  }

  nav.innerHTML = html;
  updateCartCount();
}

// Bind globals for inline HTML event actions
window.explore = explore;
window.showSlides = showSlides;
window.currentSlide = currentSlide;
window.searchItems = searchItems;
window.filterCategory = filterCategory;
window.addToCart = addToCart;
window.loadCart = loadCart;
window.increaseQty = increaseQty;
window.decreaseQty = decreaseQty;
window.removeItem = removeItem;
window.clearCart = clearCart;
window.createFarm = createFarm;
window.displayFarms = displayFarms;
window.openFarm = openFarm;
window.addProduct = addProduct;
window.displayFarmProducts = displayFarmProducts;
window.loadAdminPanel = loadAdminPanel;
window.logout = logout;
window.deleteUser = deleteUser;
window.deleteOrder = deleteOrder;
window.updateOrderStatus = updateOrderStatus;
window.editFarm = editFarm;
window.deleteFarm = deleteFarm;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.addToCartFromPage = addToCart;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initPage().catch((error) => console.error(error));
  });
} else {
  initPage().catch((error) => console.error(error));
}
