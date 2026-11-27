/**
 * MOHAN TRADERS - SHOP & INVENTORY MANAGEMENT SYSTEM
 * Single Page Application Controller (Vanilla JS + LocalStorage + Google Sheets Sync)
 */

// Application State
const state = {
  currentTab: 'overview',
  activeRoute: 'All', // 'All' | 'Tollgate' | 'Samayapuram' | 'Manachanallur'
  products: [],
  shops: [],
  dailyTaken: [],
  sales: [],
  payments: [],
  suppliers: [],
  cart: [],
  currentShopId: '',
  syncStatus: 'idle', // 'idle' | 'syncing' | 'online' | 'offline' | 'error'
  settings: {
    googleSheetUrl: '',
    shopName: 'Mohan Traders',
    phone: '9677353982',
    address: 'Wholesale Beverage & FMCG Distribution, Tollgate / Samayapuram',
    lastSync: null
  }
};

// Storage Key
const STORAGE_KEY = 'mohan_traders_store_v1';

// Initialize Application
function initApp() {
  loadFromStorage();
  setupEventListeners();
  renderCurrentTab();
  updateSyncStatusBadge();

  // Initialize Lucide icons if available
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Load state from localStorage or seedData
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.products = parsed.products || [];
      state.shops = parsed.shops || [];
      state.dailyTaken = parsed.dailyTaken || [];
      state.sales = parsed.sales || [];
      state.payments = parsed.payments || [];
      state.suppliers = parsed.suppliers || [];
      state.settings = { ...state.settings, ...(parsed.settings || {}) };
    }
  } catch (err) {
    console.error('Failed to parse local storage:', err);
  }

  // Fallback to seedData if empty
  if (!state.shops || state.shops.length === 0) {
    state.shops = typeof INITIAL_SHOPS !== 'undefined' ? [...INITIAL_SHOPS] : [];
  }
  if (!state.products || state.products.length === 0) {
    state.products = typeof INITIAL_PRODUCTS !== 'undefined' ? [...INITIAL_PRODUCTS] : [];
  }
  if (!state.dailyTaken || state.dailyTaken.length === 0) {
    state.dailyTaken = typeof INITIAL_DAILY_TAKEN !== 'undefined' ? [...INITIAL_DAILY_TAKEN] : [];
  }
  if (!state.suppliers || state.suppliers.length === 0) {
    state.suppliers = typeof INITIAL_SUPPLIERS !== 'undefined' ? [...INITIAL_SUPPLIERS] : [];
  }

  saveToStorage();
}

function saveToStorage() {
  try {
    const payload = {
      products: state.products,
      shops: state.shops,
      dailyTaken: state.dailyTaken,
      sales: state.sales,
      payments: state.payments,
      suppliers: state.suppliers,
      settings: state.settings
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save to local storage:', err);
  }
}

// Navigation Tab Switcher
function switchTab(tabName) {
  state.currentTab = tabName;
  
  // Update desktop nav pills
  document.querySelectorAll('[data-nav-tab]').forEach(el => {
    const tab = el.getAttribute('data-nav-tab');
    if (tab === tabName) {
      el.className = 'flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white shadow-sm';
    } else {
      el.className = 'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition';
    }
  });

  // Update mobile bottom nav
  document.querySelectorAll('[data-mobile-tab]').forEach(el => {
    const tab = el.getAttribute('data-mobile-tab');
    if (tab === tabName) {
      el.className = 'flex flex-col items-center justify-center text-blue-600 font-semibold text-xs py-1';
    } else {
      el.className = 'flex flex-col items-center justify-center text-slate-500 text-xs py-1 hover:text-slate-900';
    }
  });

  renderCurrentTab();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Render active tab view
function renderCurrentTab() {
  const container = document.getElementById('main-content');
  if (!container) return;

  switch (state.currentTab) {
    case 'overview':
      container.innerHTML = renderOverviewView();
      break;
    case 'pos':
      container.innerHTML = renderPOSView();
      setupPOSEvents();
      break;
    case 'daily-load':
      container.innerHTML = renderDailyLoadView();
      break;
    case 'products':
      container.innerHTML = renderProductsView();
      break;
    case 'shops':
      container.innerHTML = renderShopsView();
      break;
    case 'suppliers':
      container.innerHTML = renderSuppliersView();
      break;
    case 'settings':
      container.innerHTML = renderSettingsView();
      break;
    default:
      container.innerHTML = renderOverviewView();
  }
}

// -------------------------------------------------------------
// 1. OVERVIEW / DASHBOARD VIEW
// -------------------------------------------------------------
function renderOverviewView() {
  // Calculate today's sales
  const today = new Date().toDateString();
  const todaySalesList = state.sales.filter(s => new Date(s.date).toDateString() === today);
  const todayRevenue = todaySalesList.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);
  const todayCash = todaySalesList.reduce((acc, s) => acc + (Number(s.amountPaid) || 0), 0);
  
  // Total pending balance across all shops
  const totalOutstanding = state.shops.reduce((acc, s) => acc + (Number(s.previousBalance) || 0), 0);

  // Low stock products (< 10 units)
  const lowStockCount = state.products.filter(p => (Number(p.stock) || 0) < 15).length;

  // Breakdown by Route
  const routeStats = {
    Tollgate: { count: 0, balance: 0, sales: 0 },
    Samayapuram: { count: 0, balance: 0, sales: 0 },
    Manachanallur: { count: 0, balance: 0, sales: 0 }
  };

  state.shops.forEach(s => {
    const area = s.area || 'Tollgate';
    if (!routeStats[area]) routeStats[area] = { count: 0, balance: 0, sales: 0 };
    routeStats[area].count++;
    routeStats[area].balance += (Number(s.previousBalance) || 0);
  });

  todaySalesList.forEach(s => {
    const area = s.area || 'Tollgate';
    if (routeStats[area]) {
      routeStats[area].sales += (Number(s.totalAmount) || 0);
    }
  });

  return `
    <div class="space-y-6">
      <!-- Quick Hero Banner -->
      <div class="bg-gradient-to-r from-slate-900 to-blue-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 mb-2 border border-blue-400/30">
            Wholesale Route Operations
          </span>
          <h1 class="text-2xl md:text-3xl font-bold tracking-tight">Mohan Traders Dashboard</h1>
          <p class="text-slate-300 text-sm mt-1">Managing 212 customer shops, 52 products & daily vehicle dispatches across Tollgate, Samayapuram & Manachanallur.</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="openQuickSale()" class="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow transition transform active:scale-95">
            <i data-lucide="plus-circle" class="w-5 h-5"></i>
            <span>New Delivery Bill</span>
          </button>
          <button onclick="switchTab('daily-load')" class="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-xl border border-white/20 transition">
            <i data-lucide="truck" class="w-5 h-5"></i>
            <span>Daily Van Load</span>
          </button>
        </div>
      </div>

      <!-- KPI Metric Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500 mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider">Today's Sales</span>
            <div class="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <i data-lucide="trending-up" class="w-5 h-5"></i>
            </div>
          </div>
          <div>
            <div class="text-2xl md:text-3xl font-bold text-slate-900">₹${formatCurrency(todayRevenue)}</div>
            <div class="text-xs text-slate-500 mt-1">${todaySalesList.length} orders delivered today</div>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500 mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider">Cash Collected</span>
            <div class="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <i data-lucide="check-circle-2" class="w-5 h-5"></i>
            </div>
          </div>
          <div>
            <div class="text-2xl md:text-3xl font-bold text-emerald-600">₹${formatCurrency(todayCash)}</div>
            <div class="text-xs text-slate-500 mt-1">Paid in cash / UPI</div>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500 mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider">Total Customer Dues</span>
            <div class="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <i data-lucide="wallet" class="w-5 h-5"></i>
            </div>
          </div>
          <div>
            <div class="text-2xl md:text-3xl font-bold text-amber-600">₹${formatCurrency(totalOutstanding)}</div>
            <div class="text-xs text-slate-500 mt-1">Pending ledger balance</div>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between text-slate-500 mb-2">
            <span class="text-xs font-semibold uppercase tracking-wider">Active Shops</span>
            <div class="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <i data-lucide="store" class="w-5 h-5"></i>
            </div>
          </div>
          <div>
            <div class="text-2xl md:text-3xl font-bold text-slate-900">${state.shops.length}</div>
            <div class="text-xs text-slate-500 mt-1">3 Distribution Routes</div>
          </div>
        </div>
      </div>

      <!-- Route Cards Breakdown -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <h2 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <i data-lucide="map-pin" class="w-5 h-5 text-blue-600"></i>
          <span>Delivery Route Performance</span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${Object.entries(routeStats).map(([route, stats]) => `
            <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition">
              <div class="flex items-center justify-between mb-2">
                <span class="font-bold text-slate-900 text-base">${route}</span>
                <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">${stats.count} Shops</span>
              </div>
              <div class="space-y-1.5 text-xs text-slate-600">
                <div class="flex justify-between">
                  <span>Today's Dispatched:</span>
                  <span class="font-semibold text-slate-900">₹${formatCurrency(stats.sales)}</span>
                </div>
                <div class="flex justify-between">
                  <span>Outstanding Credit:</span>
                  <span class="font-semibold text-amber-600">₹${formatCurrency(stats.balance)}</span>
                </div>
              </div>
              <button onclick="filterRouteAndOpenShops('${route}')" class="mt-3 w-full py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-white border border-slate-200 rounded-lg transition text-center">
                View Route Shops &rarr;
              </button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Recent Transactions Activity -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <i data-lucide="receipt" class="w-5 h-5 text-emerald-600"></i>
            <span>Recent Delivery Sales</span>
          </h2>
          <span class="text-xs text-slate-500">${state.sales.length} total recorded</span>
        </div>

        ${state.sales.length === 0 ? `
          <div class="text-center py-10 text-slate-400">
            <i data-lucide="shopping-bag" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
            <p class="text-sm">No sales recorded yet today.</p>
            <button onclick="openQuickSale()" class="mt-3 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700">
              Create First Sale
            </button>
          </div>
        ` : `
          <div class="table-wrapper" tabindex="0" role="region" aria-label="Recent Sales Table">
            <table>
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Shop Name</th>
                  <th>Route</th>
                  <th>Items</th>
                  <th>Total (₹)</th>
                  <th>Paid (₹)</th>
                  <th>Balance Left (₹)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${state.sales.slice(-8).reverse().map(sale => `
                  <tr>
                    <td class="text-slate-500 text-xs">${new Date(sale.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td class="font-semibold text-slate-900">${escapeHtml(sale.shopName)}</td>
                    <td><span class="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-medium">${escapeHtml(sale.area || 'Tollgate')}</span></td>
                    <td class="text-xs text-slate-600">${sale.items ? sale.items.length : 0} items</td>
                    <td class="font-bold text-slate-900">₹${formatCurrency(sale.totalAmount)}</td>
                    <td class="font-semibold text-emerald-600">₹${formatCurrency(sale.amountPaid)}</td>
                    <td class="font-semibold ${(Number(sale.remainingBalance) || 0) > 0 ? 'text-amber-600' : 'text-slate-500'}">
                      ₹${formatCurrency(sale.remainingBalance)}
                    </td>
                    <td>
                      <div class="flex items-center gap-1">
                        <button onclick="viewReceipt('${sale.id}')" title="Print/View Bill" class="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg">
                          <i data-lucide="printer" class="w-4 h-4"></i>
                        </button>
                        <button onclick="shareViaWhatsApp('${sale.id}')" title="Share WhatsApp Bill" class="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg">
                          <i data-lucide="share-2" class="w-4 h-4"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 2. ROUTE DELIVERY POS & BILLING VIEW
// -------------------------------------------------------------
function renderPOSView() {
  const currentShop = state.shops.find(s => s.id === state.currentShopId);
  const filteredShops = state.activeRoute === 'All'
    ? state.shops
    : state.shops.filter(s => s.area === state.activeRoute);

  const cartSubtotal = state.cart.reduce((acc, item) => acc + (item.qty * item.rate), 0);
  const shopPrevBalance = currentShop ? (Number(currentShop.previousBalance) || 0) : 0;
  const netTotalPayable = cartSubtotal + shopPrevBalance;

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Column: Customer & Product Selector -->
      <div class="lg:col-span-7 space-y-5">
        <!-- Customer Selection Box -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-bold text-slate-900 flex items-center gap-2">
              <i data-lucide="user-check" class="w-5 h-5 text-blue-600"></i>
              <span>Select Customer / Shop</span>
            </h2>
            <!-- Route Filter -->
            <div class="flex gap-1 text-xs">
              ${['All', 'Tollgate', 'Samayapuram', 'Manachanallur'].map(r => `
                <button onclick="setPOSRoute('${r}')" class="px-2.5 py-1 rounded-lg font-medium transition ${state.activeRoute === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                  ${r}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="relative">
            <label for="pos-shop-search" class="block text-xs font-semibold text-slate-500 mb-1">Search or Choose from ${filteredShops.length} Shops</label>
            <select id="pos-shop-select" onchange="onSelectPOSShop(this.value)" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium">
              <option value="">-- Choose a Shop --</option>
              ${filteredShops.map(s => `
                <option value="${s.id}" ${s.id === state.currentShopId ? 'selected' : ''}>
                  ${s.name} (${s.area}) ${Number(s.previousBalance) > 0 ? ' • Due: ₹' + s.previousBalance : ''}
                </option>
              `).join('')}
            </select>
          </div>

          ${currentShop ? `
            <div class="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span class="font-bold text-slate-900 text-sm">${escapeHtml(currentShop.name)}</span>
                <span class="text-slate-500 ml-2">(${currentShop.area})</span>
              </div>
              <div class="text-right">
                <span class="text-slate-500 block">Previous Balance:</span>
                <span class="font-bold text-sm ${Number(currentShop.previousBalance) > 0 ? 'text-amber-600' : 'text-emerald-600'}">
                  ₹${formatCurrency(currentShop.previousBalance)}
                </span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Product Picker -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 class="font-bold text-slate-900 flex items-center gap-2">
              <i data-lucide="package" class="w-5 h-5 text-emerald-600"></i>
              <span>Products Catalog (Tap to Add)</span>
            </h2>
            <input type="text" id="pos-product-search" oninput="filterPOSProducts(this.value)" placeholder="Search product..." class="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <!-- Product Category Filter -->
          <div class="flex flex-wrap gap-1 text-xs" id="pos-category-filters">
            <button onclick="filterPOSCategory('All')" class="px-2.5 py-1 rounded-md font-medium bg-slate-900 text-white" data-cat-btn="All">All</button>
            <button onclick="filterPOSCategory('Tea')" class="px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat-btn="Tea">Tea</button>
            <button onclick="filterPOSCategory('Health Drink')" class="px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat-btn="Health Drink">Health Drink</button>
            <button onclick="filterPOSCategory('Milk Drink')" class="px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat-btn="Milk Drink">Milk Drink</button>
            <button onclick="filterPOSCategory('Coffee')" class="px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat-btn="Coffee">Coffee</button>
            <button onclick="filterPOSCategory('Other')" class="px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat-btn="Other">Other</button>
          </div>

          <!-- Product Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1" id="pos-product-grid">
            ${renderPOSProductCards(state.products)}
          </div>
        </div>
      </div>

      <!-- Right Column: Cart & Billing Screen -->
      <div class="lg:col-span-5 space-y-5">
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 sticky top-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 class="font-bold text-slate-900 flex items-center gap-2">
              <i data-lucide="shopping-cart" class="w-5 h-5 text-blue-600"></i>
              <span>Current Order Bill</span>
            </h2>
            ${state.cart.length > 0 ? `
              <button onclick="clearCart()" class="text-xs text-rose-600 hover:text-rose-800 font-medium">Clear All</button>
            ` : ''}
          </div>

          <!-- Cart Item List -->
          <div class="space-y-2 min-h-[160px] max-h-[260px] overflow-y-auto pr-1">
            ${state.cart.length === 0 ? `
              <div class="text-center py-10 text-slate-400">
                <i data-lucide="shopping-bag" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
                <p class="text-xs">No items added yet. Click any product to add.</p>
              </div>
            ` : state.cart.map(item => `
              <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                <div class="flex-1 pr-2">
                  <div class="font-bold text-slate-900">${escapeHtml(item.name)}</div>
                  <div class="text-slate-500">₹${item.rate} / ${item.unit || 'pkt'}</div>
                </div>
                <div class="flex items-center gap-1.5">
                  <button onclick="updateCartQty('${item.productId}', ${item.qty - 1})" class="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 active:scale-95">-</button>
                  <span class="w-8 text-center font-bold text-slate-900 text-sm">${item.qty}</span>
                  <button onclick="updateCartQty('${item.productId}', ${item.qty + 1})" class="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 active:scale-95">+</button>
                </div>
                <div class="w-20 text-right font-bold text-slate-900 text-sm">
                  ₹${formatCurrency(item.qty * item.rate)}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Billing Calculation Summary -->
          <div class="border-t border-slate-200 pt-3 space-y-2 text-xs">
            <div class="flex justify-between text-slate-600">
              <span>Today's Items Subtotal:</span>
              <span class="font-bold text-slate-900 text-sm">₹${formatCurrency(cartSubtotal)}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>Shop Previous Due:</span>
              <span class="font-bold text-amber-600 text-sm">₹${formatCurrency(shopPrevBalance)}</span>
            </div>
            <div class="flex justify-between text-slate-900 font-extrabold text-base border-t border-slate-100 pt-2">
              <span>Total Payable:</span>
              <span class="text-blue-600">₹${formatCurrency(netTotalPayable)}</span>
            </div>
          </div>

          <!-- Payment Input Section -->
          <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div>
              <label for="pos-amount-paid" class="block text-xs font-bold text-slate-700 mb-1">Amount Paid (₹)</label>
              <div class="flex gap-2">
                <input type="number" id="pos-amount-paid" oninput="updateChangeCalculation()" placeholder="Enter amount received" value="${cartSubtotal > 0 ? cartSubtotal : ''}" class="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <button type="button" onclick="setFullPayment(${netTotalPayable})" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-semibold text-slate-700">Full</button>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-600">Payment Mode:</span>
              <div class="flex gap-2">
                <label class="inline-flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="pos-payment-mode" value="Cash" checked class="text-blue-600">
                  <span>Cash</span>
                </label>
                <label class="inline-flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="pos-payment-mode" value="UPI" class="text-blue-600">
                  <span>UPI</span>
                </label>
                <label class="inline-flex items-center gap-1 cursor-pointer">
                  <input type="radio" name="pos-payment-mode" value="Credit" class="text-blue-600">
                  <span>Credit</span>
                </label>
              </div>
            </div>

            <div class="flex justify-between items-center text-xs pt-1 border-t border-slate-200" id="pos-balance-display">
              <span class="text-slate-600">Remaining Balance:</span>
              <span class="font-bold text-amber-600 text-sm" id="pos-remaining-bal-text">
                ₹${formatCurrency(Math.max(0, netTotalPayable - (cartSubtotal > 0 ? cartSubtotal : 0)))}
              </span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-2 pt-1">
            <button onclick="completeSale('print')" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2 active:scale-98">
              <i data-lucide="printer" class="w-5 h-5"></i>
              <span>Save & Print Bill</span>
            </button>
            <button onclick="completeSale('whatsapp')" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 active:scale-98 text-sm">
              <i data-lucide="message-circle" class="w-5 h-5"></i>
              <span>Save & Share via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPOSProductCards(productsList) {
  if (!productsList || productsList.length === 0) {
    return `<div class="col-span-3 text-center py-6 text-slate-400 text-xs">No matching products</div>`;
  }
  return productsList.map(p => `
    <div onclick="addToCart('${p.id}')" class="p-3 bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-300 rounded-xl cursor-pointer transition select-none flex flex-col justify-between group">
      <div>
        <div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">${escapeHtml(p.category)}</div>
        <div class="font-bold text-slate-900 text-xs mt-0.5 line-clamp-2 group-hover:text-blue-700">${escapeHtml(p.name)}</div>
      </div>
      <div class="mt-2 flex items-center justify-between">
        <span class="text-xs font-extrabold text-blue-600">₹${p.rate}</span>
        <span class="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-200 group-hover:bg-blue-600 group-hover:text-white transition text-xs font-bold">+</span>
      </div>
    </div>
  `).join('');
}

function setupPOSEvents() {
  // Listeners if needed
}

function setPOSRoute(route) {
  state.activeRoute = route;
  renderCurrentTab();
  if (window.lucide) window.lucide.createIcons();
}

function onSelectPOSShop(shopId) {
  state.currentShopId = shopId;
  renderCurrentTab();
  if (window.lucide) window.lucide.createIcons();
}

function addToCart(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  const existing = state.cart.find(c => c.productId === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({
      productId: prod.id,
      name: prod.name,
      rate: prod.rate,
      unit: prod.unit || 'pkt',
      qty: 1
    });
  }
  renderCurrentTab();
  if (window.lucide) window.lucide.createIcons();
}

function updateCartQty(productId, qty) {
  if (qty <= 0) {
    state.cart = state.cart.filter(c => c.productId !== productId);
  } else {
    const item = state.cart.find(c => c.productId === productId);
    if (item) item.qty = qty;
  }
  renderCurrentTab();
  if (window.lucide) window.lucide.createIcons();
}

function clearCart() {
  state.cart = [];
  renderCurrentTab();
  if (window.lucide) window.lucide.createIcons();
}

function setFullPayment(amount) {
  const input = document.getElementById('pos-amount-paid');
  if (input) {
    input.value = amount;
    updateChangeCalculation();
  }
}

function updateChangeCalculation() {
  const currentShop = state.shops.find(s => s.id === state.currentShopId);
  const cartSubtotal = state.cart.reduce((acc, item) => acc + (item.qty * item.rate), 0);
  const shopPrevBalance = currentShop ? (Number(currentShop.previousBalance) || 0) : 0;
  const netTotalPayable = cartSubtotal + shopPrevBalance;

  const paidInput = document.getElementById('pos-amount-paid');
  const paid = Number(paidInput ? paidInput.value : 0) || 0;
  const rem = Math.max(0, netTotalPayable - paid);

  const display = document.getElementById('pos-remaining-bal-text');
  if (display) {
    display.textContent = '₹' + formatCurrency(rem);
  }
}

function filterPOSCategory(cat) {
  document.querySelectorAll('[data-cat-btn]').forEach(btn => {
    if (btn.getAttribute('data-cat-btn') === cat) {
      btn.className = 'px-2.5 py-1 rounded-md font-medium bg-slate-900 text-white';
    } else {
      btn.className = 'px-2.5 py-1 rounded-md font-medium bg-slate-100 text-slate-600 hover:bg-slate-200';
    }
  });

  const list = cat === 'All' ? state.products : state.products.filter(p => p.category === cat);
  const grid = document.getElementById('pos-product-grid');
  if (grid) {
    grid.innerHTML = renderPOSProductCards(list);
  }
}

function filterPOSProducts(searchStr) {
  const query = searchStr.toLowerCase().trim();
  const list = state.products.filter(p => 
    p.name.toLowerCase().includes(query) || (p.category && p.category.toLowerCase().includes(query))
  );
  const grid = document.getElementById('pos-product-grid');
  if (grid) {
    grid.innerHTML = renderPOSProductCards(list);
  }
}

// -------------------------------------------------------------
// 3. DAILY LOAD SHEET ("DAILY TAKEN" & RECONCILIATION)
// -------------------------------------------------------------
function renderDailyLoadView() {
  // Aggregate sales by product from today's sales
  const today = new Date().toDateString();
  const todaySales = state.sales.filter(s => new Date(s.date).toDateString() === today);
  const soldMap = {};

  todaySales.forEach(s => {
    if (s.items) {
      s.items.forEach(it => {
        soldMap[it.name] = (soldMap[it.name] || 0) + it.qty;
      });
    }
  });

  let totalTakenValue = 0;
  let totalSoldValue = 0;

  return `
    <div class="space-y-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Daily Van Load (Taken & Returns)</h1>
          <p class="text-sm text-slate-500">Record morning vehicle loading, track live dispatches on route, and reconcile end-of-day returns.</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="saveDailyLoadSheet()" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow transition">
            <i data-lucide="save" class="w-4 h-4"></i>
            <span>Save & Sync Load</span>
          </button>
          <button onclick="resetDailyLoad()" class="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-2 rounded-xl text-sm transition">
            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
            <span>Reset for Tomorrow</span>
          </button>
        </div>
      </div>

      <!-- Quick summary cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200">
          <div class="text-xs text-slate-500 font-semibold uppercase">Total Products</div>
          <div class="text-xl font-bold text-slate-900 mt-1">${state.products.length} Items</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200">
          <div class="text-xs text-slate-500 font-semibold uppercase">Total Items Dispatched</div>
          <div class="text-xl font-bold text-emerald-600 mt-1" id="daily-total-sold-count">
            ${Object.values(soldMap).reduce((a, b) => a + b, 0)} Units
          </div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200">
          <div class="text-xs text-slate-500 font-semibold uppercase">Today's Sales Revenue</div>
          <div class="text-xl font-bold text-blue-600 mt-1">
            ₹${formatCurrency(todaySales.reduce((a, s) => a + (Number(s.totalAmount) || 0), 0))}
          </div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200">
          <div class="text-xs text-slate-500 font-semibold uppercase">Active Route</div>
          <div class="text-xl font-bold text-purple-600 mt-1">Tollgate & Samayapuram</div>
        </div>
      </div>

      <!-- Main Daily Taken Table -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div class="text-sm font-bold text-slate-900">Van Inventory Reconciliation Table</div>
          <input type="text" oninput="filterDailyLoadTable(this.value)" placeholder="Filter brand/product..." class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs w-full sm:w-64">
        </div>

        <div class="table-wrapper" tabindex="0" role="region" aria-label="Daily Load Reconciliation">
          <table id="daily-load-table">
            <thead>
              <tr>
                <th>Sl.</th>
                <th>Brand / Product</th>
                <th>Rate (₹)</th>
                <th>Morning Taken (Qty)</th>
                <th>Today's Sold (Qty)</th>
                <th>Remaining / Return</th>
                <th>Sales Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${state.products.map((p, idx) => {
                const dt = state.dailyTaken.find(d => d.productName === p.name) || { taken: 0, sales: 0, return: 0 };
                const actualSold = soldMap[p.name] !== undefined ? soldMap[p.name] : (dt.sales || 0);
                const morningTaken = dt.taken || 0;
                const remReturn = Math.max(0, morningTaken - actualSold);
                const salesValue = actualSold * p.rate;

                totalTakenValue += morningTaken * p.rate;
                totalSoldValue += salesValue;

                return `
                  <tr data-brand="${escapeHtml(p.name.toLowerCase())}">
                    <td class="text-slate-400 text-xs">${idx + 1}</td>
                    <td class="font-bold text-slate-900">${escapeHtml(p.name)}</td>
                    <td class="text-slate-700">₹${p.rate}</td>
                    <td>
                      <input type="number" min="0" value="${morningTaken}" onchange="updateDailyTakenItem('${escapeHtml(p.name)}', this.value)" class="w-20 px-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </td>
                    <td class="font-bold text-emerald-600">${actualSold}</td>
                    <td class="font-semibold ${remReturn > 0 ? 'text-amber-600' : 'text-slate-400'}">${remReturn}</td>
                    <td class="font-bold text-slate-900">₹${formatCurrency(salesValue)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function updateDailyTakenItem(brandName, val) {
  const takenQty = Number(val) || 0;
  let item = state.dailyTaken.find(d => d.productName === brandName);
  if (item) {
    item.taken = takenQty;
  } else {
    state.dailyTaken.push({
      productName: brandName,
      rate: 0,
      taken: takenQty,
      sales: 0,
      return: 0,
      salesPrice: 0
    });
  }
  saveToStorage();
}

function saveDailyLoadSheet() {
  saveToStorage();
  syncWithGoogleSheet({ action: 'UPDATE_DAILY_TAKEN', items: state.dailyTaken });
  showToast('Daily load saved and syncing with Google Sheet!');
}

function resetDailyLoad() {
  if (confirm('Reset all Morning Taken quantities to 0 for tomorrow?')) {
    state.dailyTaken.forEach(d => {
      d.taken = 0;
      d.sales = 0;
      d.return = 0;
      d.salesPrice = 0;
    });
    saveToStorage();
    renderCurrentTab();
    if (window.lucide) window.lucide.createIcons();
    showToast('Daily load reset for new day.');
  }
}

function filterDailyLoadTable(val) {
  const query = val.toLowerCase().trim();
  const rows = document.querySelectorAll('#daily-load-table tbody tr');
  rows.forEach(r => {
    const brand = r.getAttribute('data-brand') || '';
    r.style.display = brand.includes(query) ? '' : 'none';
  });
}

// -------------------------------------------------------------
// 4. PRODUCTS & PRICING CATALOG VIEW
// -------------------------------------------------------------
function renderProductsView() {
  return `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Products & Pricing Catalog</h1>
          <p class="text-sm text-slate-500">Manage 52 beverages, FMCG brands, wholesale prices and stock inventory.</p>
        </div>
        <button onclick="openAddProductModal()" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow transition">
          <i data-lucide="plus-circle" class="w-4 h-4"></i>
          <span>Add New Product</span>
        </button>
      </div>

      <!-- Product Search & Filter Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div class="relative w-full md:w-80">
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
          <input type="text" id="product-search-input" oninput="filterProductCatalog(this.value)" placeholder="Search product name or category..." class="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div class="flex flex-wrap gap-1 text-xs w-full md:w-auto">
          <button onclick="filterProductCatPill('All')" class="px-3 py-1.5 rounded-lg font-medium bg-slate-900 text-white" data-prod-pill="All">All</button>
          <button onclick="filterProductCatPill('Tea')" class="px-3 py-1.5 rounded-lg font-medium bg-slate-100 text-slate-600 hover:bg-slate-200" data-prod-pill="Tea">Tea</button>
          <button onclick="filterProductCatPill('Health Drink')" class="px-3 py-1.5 rounded-lg font-medium bg-slate-100 text-slate-600 hover:bg-slate-200" data-prod-pill="Health Drink">Health Drink</button>
          <button onclick="filterProductCatPill('Milk Drink')" class="px-3 py-1.5 rounded-lg font-medium bg-slate-100 text-slate-600 hover:bg-slate-200" data-prod-pill="Milk Drink">Milk Drink</button>
          <button onclick="filterProductCatPill('Coffee')" class="px-3 py-1.5 rounded-lg font-medium bg-slate-100 text-slate-600 hover:bg-slate-200" data-prod-pill="Coffee">Coffee</button>
          <button onclick="filterProductCatPill('Other')" class="px-3 py-1.5 rounded-lg font-medium bg-slate-100 text-slate-600 hover:bg-slate-200" data-prod-pill="Other">Other</button>
        </div>
      </div>

      <!-- Products Table -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="table-wrapper" tabindex="0" role="region" aria-label="Product Catalog">
          <table id="products-catalog-table">
            <thead>
              <tr>
                <th>Sl.</th>
                <th>Brand Name</th>
                <th>Category</th>
                <th>Wholesale Rate (₹)</th>
                <th>Unit</th>
                <th>Warehouse Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${state.products.map((p, idx) => `
                <tr data-prod-name="${escapeHtml(p.name.toLowerCase())}" data-prod-cat="${escapeHtml(p.category)}">
                  <td class="text-slate-400 text-xs">${idx + 1}</td>
                  <td class="font-bold text-slate-900">${escapeHtml(p.name)}</td>
                  <td><span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">${escapeHtml(p.category)}</span></td>
                  <td class="font-extrabold text-blue-600 text-sm">₹${p.rate}</td>
                  <td class="text-slate-500 text-xs">${p.unit || 'pkt'}</td>
                  <td>
                    <span class="font-semibold ${(Number(p.stock) || 0) < 15 ? 'text-amber-600' : 'text-slate-700'}">
                      ${p.stock || 50}
                    </span>
                  </td>
                  <td>
                    <button onclick="openEditPriceModal('${p.id}')" class="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                      Edit Rate
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function filterProductCatalog(query) {
  const q = query.toLowerCase().trim();
  const rows = document.querySelectorAll('#products-catalog-table tbody tr');
  rows.forEach(r => {
    const name = r.getAttribute('data-prod-name') || '';
    const cat = r.getAttribute('data-prod-cat') || '';
    r.style.display = (name.includes(q) || cat.toLowerCase().includes(q)) ? '' : 'none';
  });
}

function filterProductCatPill(cat) {
  document.querySelectorAll('[data-prod-pill]').forEach(btn => {
    if (btn.getAttribute('data-prod-pill') === cat) {
      btn.className = 'px-3 py-1.5 rounded-lg font-medium bg-slate-900 text-white';
    } else {
      btn.className = 'px-3 py-1.5 rounded-lg font-medium bg-slate-100 text-slate-600 hover:bg-slate-200';
    }
  });

  const rows = document.querySelectorAll('#products-catalog-table tbody tr');
  rows.forEach(r => {
    const c = r.getAttribute('data-prod-cat') || '';
    r.style.display = (cat === 'All' || c === cat) ? '' : 'none';
  });
}

// -------------------------------------------------------------
// 5. CUSTOMER SHOPS (212 SHOPS) & LEDGER
// -------------------------------------------------------------
function renderShopsView() {
  const counts = {
    All: state.shops.length,
    Tollgate: state.shops.filter(s => s.area === 'Tollgate').length,
    Samayapuram: state.shops.filter(s => s.area === 'Samayapuram').length,
    Manachanallur: state.shops.filter(s => s.area === 'Manachanallur').length
  };

  const currentRoute = state.activeRoute;
  const list = currentRoute === 'All' ? state.shops : state.shops.filter(s => s.area === currentRoute);

  return `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Customer Shops Directory (212 Shops)</h1>
          <p class="text-sm text-slate-500">Tea stalls, bakeries, and coffee bars across delivery routes.</p>
        </div>
        <button onclick="openAddShopModal()" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow transition">
          <i data-lucide="plus-circle" class="w-4 h-4"></i>
          <span>Add New Shop</span>
        </button>
      </div>

      <!-- Route Tabs & Search -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <!-- Route Tabs -->
        <div class="flex flex-wrap gap-1 text-xs w-full md:w-auto">
          ${['All', 'Tollgate', 'Samayapuram', 'Manachanallur'].map(r => `
            <button onclick="setShopTabRoute('${r}')" class="px-3 py-1.5 rounded-lg font-semibold transition ${currentRoute === r ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
              ${r} (${counts[r]})
            </button>
          `).join('')}
        </div>

        <!-- Search Input -->
        <div class="relative w-full md:w-80">
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
          <input type="text" oninput="filterShopsDirectory(this.value)" placeholder="Search shop name or phone..." class="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>
      </div>

      <!-- Shops Table -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div class="table-wrapper" tabindex="0" role="region" aria-label="Customer Shops Table">
          <table id="shops-directory-table">
            <thead>
              <tr>
                <th>Sl.</th>
                <th>Shop / Bakery Name</th>
                <th>Route / Area</th>
                <th>Contact</th>
                <th>Outstanding Dues (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map((s, idx) => `
                <tr data-shop-name="${escapeHtml(s.name.toLowerCase())}">
                  <td class="text-slate-400 text-xs">${s.slNo || idx + 1}</td>
                  <td class="font-bold text-slate-900">${escapeHtml(s.name)}</td>
                  <td><span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">${escapeHtml(s.area)}</span></td>
                  <td class="text-slate-500 text-xs">${s.phone ? escapeHtml(s.phone) : '—'}</td>
                  <td>
                    <span class="font-bold ${(Number(s.previousBalance) || 0) > 0 ? 'text-amber-600' : 'text-slate-500'}">
                      ₹${formatCurrency(s.previousBalance)}
                    </span>
                  </td>
                  <td>
                    <div class="flex items-center gap-1.5">
                      <button onclick="startSaleForShop('${s.id}')" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs transition">
                        Bill
                      </button>
                      <button onclick="openCollectPaymentModal('${s.id}')" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs transition">
                        Pay Dues
                      </button>
                      <button onclick="openShopLedger('${s.id}')" class="p-1 hover:bg-slate-100 text-slate-600 rounded-lg" title="Ledger History">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function setShopTabRoute(route) {
  state.activeRoute = route;
  renderCurrentTab();
  if (window.lucide) window.lucide.createIcons();
}

function filterShopsDirectory(val) {
  const query = val.toLowerCase().trim();
  const rows = document.querySelectorAll('#shops-directory-table tbody tr');
  rows.forEach(r => {
    const name = r.getAttribute('data-shop-name') || '';
    r.style.display = name.includes(query) ? '' : 'none';
  });
}

function startSaleForShop(shopId) {
  state.currentShopId = shopId;
  switchTab('pos');
}

function filterRouteAndOpenShops(route) {
  state.activeRoute = route;
  switchTab('shops');
}

// -------------------------------------------------------------
// 6. SUPPLIERS & STOCK PURCHASES
// -------------------------------------------------------------
function renderSuppliersView() {
  return `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Suppliers & Inward Purchases</h1>
          <p class="text-sm text-slate-500">Manage beverage manufacturers, tea estates, and record restock shipments.</p>
        </div>
        <button onclick="openAddSupplierModal()" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow transition">
          <i data-lucide="plus-circle" class="w-4 h-4"></i>
          <span>Add New Supplier</span>
        </button>
      </div>

      <!-- Supplier List -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${state.suppliers.map(sup => `
          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Supplier</span>
              <span class="text-xs text-slate-400">${sup.id}</span>
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-base">${escapeHtml(sup.name)}</h3>
              <p class="text-xs text-slate-500 mt-0.5">${escapeHtml(sup.contactPerson || '')}</p>
            </div>
            <div class="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
              <div class="flex items-center gap-1.5">
                <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400"></i>
                <span>${escapeHtml(sup.phone || '—')}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
                <span>${escapeHtml(sup.address || '—')}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <i data-lucide="package" class="w-3.5 h-3.5 text-slate-400"></i>
                <span>${escapeHtml(sup.productsSupplied || 'All')}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// 7. GOOGLE SHEET SYNC & SETTINGS
// -------------------------------------------------------------
function renderSettingsView() {
  return `
    <div class="max-w-4xl space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Google Sheet Sync & System Settings</h1>
        <p class="text-sm text-slate-500">Connect directly with your Google Sheet for 100% free, two-way automated data storage.</p>
      </div>

      <!-- Google Sheet Connection Box -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <i data-lucide="sheet" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="font-bold text-slate-900 text-base">Google Apps Script Web App Connection</h2>
              <p class="text-xs text-slate-500">Live database link to Google Spreadsheet: 153Y1QbapMUz5MnoBZAN2B0qNMjlByzEp</p>
            </div>
          </div>
          <span id="settings-status-pill" class="px-3 py-1 rounded-full text-xs font-bold ${state.syncStatus === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">
            ${state.syncStatus === 'online' ? 'Connected' : 'Offline / Local Cache'}
          </span>
        </div>

        <div class="space-y-3">
          <label for="google-sheet-url-input" class="block text-xs font-bold text-slate-700">Google Apps Script Web App URL</label>
          <div class="flex flex-col sm:flex-row gap-2">
            <input type="url" id="google-sheet-url-input" value="${escapeHtml(state.settings.googleSheetUrl || '')}" placeholder="https://script.google.com/macros/s/.../exec" class="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono">
            <button onclick="saveAndTestConnection()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow transition whitespace-nowrap">
              Save & Test Connection
            </button>
          </div>
          <p class="text-xs text-slate-400">Paste your Web App URL after deploying <code>google-apps-script/Code.gs</code> in your Google Sheet.</p>
        </div>

        <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button onclick="syncAllFromSheet()" class="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-xs hover:bg-emerald-100 transition">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            <span>Pull Latest from Sheet</span>
          </button>
          <button onclick="pushAllToSheet()" class="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg text-xs hover:bg-blue-100 transition">
            <i data-lucide="upload-cloud" class="w-3.5 h-3.5"></i>
            <span>Push All Local Data to Sheet</span>
          </button>
        </div>
      </div>

      <!-- Deployment Guide Box -->
      <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-4">
        <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
          <i data-lucide="help-circle" class="w-4 h-4 text-blue-600"></i>
          <span>How to connect your Google Sheet (1-time 2-minute setup):</span>
        </h3>
        <ol class="list-decimal list-inside space-y-1.5 text-xs text-slate-600">
          <li>Open your Google Sheet: <a href="https://docs.google.com/spreadsheets/d/153Y1QbapMUz5MnoBZAN2B0qNMjlByzEp/edit" target="_blank" class="text-blue-600 underline font-medium">Mohan Traders Sheet</a></li>
          <li>Click <strong>Extensions &gt; Apps Script</strong> in the top menu.</li>
          <li>Delete any existing code and copy-paste the code from <a href="file:///c:/Users/asus/Documents/Mohan%20traders%20shop/google-apps-script/Code.gs" class="text-blue-600 font-mono font-bold">google-apps-script/Code.gs</a>.</li>
          <li>Click <strong>Deploy &gt; New deployment</strong>.</li>
          <li>Select type: <strong>Web app</strong>, set Execute as: <strong>Me</strong>, and Who has access: <strong>Anyone</strong>.</li>
          <li>Click <strong>Deploy</strong>, authorize the permissions, and copy the <strong>Web app URL</strong> (ends in <code>/exec</code>).</li>
          <li>Paste the URL above and click <strong>Save & Test Connection</strong>!</li>
        </ol>
      </div>

      <!-- Local Backup & Export -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
          <i data-lucide="database" class="w-4 h-4 text-purple-600"></i>
          <span>Local Backup & Data Export</span>
        </h3>
        <div class="flex flex-wrap gap-2">
          <button onclick="exportJSONBackup()" class="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-200 transition">
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span>Export Full JSON Backup</span>
          </button>
          <button onclick="exportSalesCSV()" class="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-200 transition">
            <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
            <span>Export Sales CSV</span>
          </button>
          <button onclick="exportShopsCSV()" class="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-200 transition">
            <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
            <span>Export Shops Balance CSV</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// SALE COMPLETION & BILLING HANDLERS
// -------------------------------------------------------------
function completeSale(actionType) {
  if (!state.currentShopId) {
    alert('Please select a customer / shop first!');
    return;
  }
  if (state.cart.length === 0) {
    alert('Please add at least one product to the bill!');
    return;
  }

  const shop = state.shops.find(s => s.id === state.currentShopId);
  const cartSubtotal = state.cart.reduce((acc, item) => acc + (item.qty * item.rate), 0);
  const prevBal = shop ? (Number(shop.previousBalance) || 0) : 0;
  const netTotal = cartSubtotal + prevBal;

  const paidInput = document.getElementById('pos-amount-paid');
  const amountPaid = Number(paidInput ? paidInput.value : 0) || 0;
  const remainingBalance = Math.max(0, netTotal - amountPaid);

  const modeRadios = document.getElementsByName('pos-payment-mode');
  let paymentMode = 'Cash';
  for (const r of modeRadios) {
    if (r.checked) paymentMode = r.value;
  }

  const saleRecord = {
    id: 'BILL-' + Date.now().toString().slice(-6),
    date: new Date().toISOString(),
    shopId: shop.id,
    shopName: shop.name,
    area: shop.area,
    items: [...state.cart],
    subtotal: cartSubtotal,
    previousBalance: prevBal,
    totalAmount: netTotal,
    amountPaid: amountPaid,
    remainingBalance: remainingBalance,
    paymentMode: paymentMode
  };

  // Update state
  state.sales.push(saleRecord);

  // Update shop record
  if (shop) {
    shop.previousBalance = remainingBalance;
    shop.totalPurchased = (Number(shop.totalPurchased) || 0) + cartSubtotal;
    shop.totalPaid = (Number(shop.totalPaid) || 0) + amountPaid;
  }

  // Update product warehouse stock & daily taken
  state.cart.forEach(item => {
    const prod = state.products.find(p => p.id === item.productId);
    if (prod) {
      prod.stock = Math.max(0, (Number(prod.stock) || 50) - item.qty);
    }
    const dt = state.dailyTaken.find(d => d.productName === item.name);
    if (dt) {
      dt.sales = (Number(dt.sales) || 0) + item.qty;
      dt.return = Math.max(0, (Number(dt.taken) || 0) - dt.sales);
      dt.salesPrice = dt.sales * dt.rate;
    }
  });

  saveToStorage();

  // Clear cart
  state.cart = [];

  // Sync to Google Sheet asynchronously
  syncWithGoogleSheet({ action: 'RECORD_SALE', sale: saleRecord });

  showToast(`Bill ${saleRecord.id} generated successfully!`);

  if (actionType === 'print') {
    viewReceipt(saleRecord.id);
  } else if (actionType === 'whatsapp') {
    shareViaWhatsApp(saleRecord.id);
    switchTab('pos');
  } else {
    switchTab('pos');
  }
}

// -------------------------------------------------------------
// RECEIPT MODAL & WHATSAPP GENERATION
// -------------------------------------------------------------
function viewReceipt(saleId) {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  const modalContainer = document.getElementById('modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        <!-- Close Button -->
        <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <!-- Printable Bill Content -->
        <div id="printable-receipt" class="receipt-paper p-4 text-xs font-mono text-slate-800 space-y-2">
          <div class="text-center pb-2 border-b border-dashed border-slate-300">
            <h2 class="text-base font-extrabold uppercase tracking-wide">MOHAN TRADERS</h2>
            <p class="text-[10px] text-slate-600">Wholesale FMCG & Beverage Distribution</p>
            <p class="text-[10px] text-slate-500">Tollgate / Samayapuram • Ph: 9677353982</p>
          </div>

          <div class="flex justify-between text-[11px] py-1 border-b border-dashed border-slate-300">
            <div>
              <span class="block font-bold">To: ${escapeHtml(sale.shopName)}</span>
              <span class="text-slate-500">Route: ${escapeHtml(sale.area)}</span>
            </div>
            <div class="text-right">
              <span class="block">Bill #: ${sale.id}</span>
              <span class="text-slate-500">${new Date(sale.date).toLocaleDateString()}</span>
            </div>
          </div>

          <!-- Items Table -->
          <table class="w-full text-left my-2 text-[11px]">
            <thead>
              <tr class="border-b border-slate-300">
                <th class="py-1">Item</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${(sale.items || []).map(it => `
                <tr class="border-b border-slate-100">
                  <td class="py-1">${escapeHtml(it.name)}</td>
                  <td class="text-center font-bold">${it.qty}</td>
                  <td class="text-right">₹${it.rate}</td>
                  <td class="text-right font-bold">₹${formatCurrency(it.qty * it.rate)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Financial Summary -->
          <div class="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
            <div class="flex justify-between">
              <span>Items Total:</span>
              <span class="font-bold">₹${formatCurrency(sale.subtotal)}</span>
            </div>
            ${Number(sale.previousBalance) > 0 ? `
              <div class="flex justify-between text-amber-700">
                <span>Previous Balance:</span>
                <span>₹${formatCurrency(sale.previousBalance)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between font-extrabold text-sm border-t border-slate-200 pt-1">
              <span>Net Payable:</span>
              <span>₹${formatCurrency(sale.totalAmount)}</span>
            </div>
            <div class="flex justify-between text-emerald-700 font-bold">
              <span>Amount Paid (${sale.paymentMode || 'Cash'}):</span>
              <span>₹${formatCurrency(sale.amountPaid)}</span>
            </div>
            <div class="flex justify-between font-bold border-t border-dashed border-slate-300 pt-1 text-slate-900">
              <span>Balance Remaining:</span>
              <span>₹${formatCurrency(sale.remainingBalance)}</span>
            </div>
          </div>

          <div class="text-center pt-3 text-[10px] text-slate-500 border-t border-dashed border-slate-300">
            <p>Thank you for your business!</p>
            <p>Mohan Traders • Wholesale & Retail Delivery</p>
          </div>
        </div>

        <!-- Dialog Action Buttons -->
        <div class="flex gap-2 pt-2 no-print">
          <button onclick="window.print()" class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow">
            <i data-lucide="printer" class="w-4 h-4"></i>
            <span>Print Receipt</span>
          </button>
          <button onclick="shareViaWhatsApp('${sale.id}')" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow">
            <i data-lucide="share-2" class="w-4 h-4"></i>
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

function shareViaWhatsApp(saleId) {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;

  const dateStr = new Date(sale.date).toLocaleDateString();
  let text = `🧾 *MOHAN TRADERS - DELIVERY BILL*\n`;
  text += `Shop: *${sale.shopName}* (${sale.area})\n`;
  text += `Bill #: ${sale.id} | Date: ${dateStr}\n`;
  text += `------------------------------------\n`;

  (sale.items || []).forEach((it, idx) => {
    text += `${idx + 1}. ${it.name} x ${it.qty} = ₹${(it.qty * it.rate).toFixed(2)}\n`;
  });

  text += `------------------------------------\n`;
  text += `Today's Bill: ₹${sale.subtotal.toFixed(2)}\n`;
  if (Number(sale.previousBalance) > 0) {
    text += `Previous Balance: ₹${sale.previousBalance.toFixed(2)}\n`;
    text += `*Total Amount:* ₹${sale.totalAmount.toFixed(2)}\n`;
  }
  text += `Amount Paid: ₹${sale.amountPaid.toFixed(2)} (${sale.paymentMode || 'Cash'})\n`;
  text += `*Remaining Balance: ₹${sale.remainingBalance.toFixed(2)}*\n`;
  text += `------------------------------------\n`;
  text += `Thank you for your business!\nMohan Traders - Ph: 9677353982`;

  const encoded = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank');
}

// -------------------------------------------------------------
// MODALS: ADD PRODUCT, EDIT PRICE, ADD SHOP, COLLECT PAYMENT
// -------------------------------------------------------------
function openAddProductModal() {
  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="package-plus" class="w-5 h-5 text-blue-600"></i>
          <span>Add New Product Brand</span>
        </h2>

        <form id="add-product-form" onsubmit="handleAddProductSubmit(event)" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Brand / Product Name *</label>
            <input type="text" id="new-prod-name" required placeholder="e.g. 500GM HORLICKS REFILL" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Category *</label>
              <select id="new-prod-cat" required class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Tea">Tea</option>
                <option value="Health Drink">Health Drink</option>
                <option value="Milk Drink">Milk Drink</option>
                <option value="Coffee">Coffee</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Wholesale Rate (₹) *</label>
              <input type="number" step="0.01" id="new-prod-rate" required placeholder="e.g. 120.50" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Unit</label>
              <input type="text" id="new-prod-unit" placeholder="pkt / btl" value="pkt" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Initial Stock</label>
              <input type="number" id="new-prod-stock" value="50" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
          </div>

          <div class="pt-3 flex gap-2">
            <button type="button" onclick="closeModal()" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition">Cancel</button>
            <button type="submit" class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow transition">Save Product</button>
          </div>
        </form>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function handleAddProductSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('new-prod-name').value.trim();
  const category = document.getElementById('new-prod-cat').value;
  const rate = Number(document.getElementById('new-prod-rate').value) || 0;
  const unit = document.getElementById('new-prod-unit').value.trim() || 'pkt';
  const stock = Number(document.getElementById('new-prod-stock').value) || 50;

  const newProd = {
    id: 'PRD-' + (state.products.length + 1).toString().padStart(3, '0'),
    slNo: state.products.length + 1,
    name: name,
    category: category,
    rate: rate,
    unit: unit,
    stock: stock
  };

  state.products.push(newProd);

  // Add entry to dailyTaken
  state.dailyTaken.push({
    productName: name,
    rate: rate,
    taken: 0,
    sales: 0,
    return: 0,
    salesPrice: 0
  });

  saveToStorage();
  syncWithGoogleSheet({ action: 'ADD_PRODUCT', product: newProd });
  closeModal();
  renderCurrentTab();
  showToast(`Product ${name} added successfully!`);
}

function openEditPriceModal(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="edit-3" class="w-5 h-5 text-blue-600"></i>
          <span>Update Wholesale Rate</span>
        </h2>

        <div>
          <span class="text-xs text-slate-500">Product:</span>
          <div class="font-bold text-slate-900 text-sm">${escapeHtml(prod.name)}</div>
        </div>

        <form id="edit-price-form" onsubmit="handleEditPriceSubmit(event, '${prod.id}')" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">New Rate (₹) *</label>
            <input type="number" step="0.01" id="edit-prod-rate" value="${prod.rate}" required class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="pt-3 flex gap-2">
            <button type="button" onclick="closeModal()" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition">Cancel</button>
            <button type="submit" class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow transition">Update Rate</button>
          </div>
        </form>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function handleEditPriceSubmit(e, productId) {
  e.preventDefault();
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;

  const newRate = Number(document.getElementById('edit-prod-rate').value) || 0;
  prod.rate = newRate;

  // Update in dailyTaken as well
  const dt = state.dailyTaken.find(d => d.productName === prod.name);
  if (dt) dt.rate = newRate;

  saveToStorage();
  syncWithGoogleSheet({ action: 'UPDATE_PRODUCT_PRICE', productId: prod.id, name: prod.name, rate: newRate });
  closeModal();
  renderCurrentTab();
  showToast(`Rate for ${prod.name} updated to ₹${newRate}!`);
}

function openAddShopModal() {
  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="store" class="w-5 h-5 text-blue-600"></i>
          <span>Add New Customer Shop</span>
        </h2>

        <form id="add-shop-form" onsubmit="handleAddShopSubmit(event)" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Shop / Bakery Name *</label>
            <input type="text" id="new-shop-name" required placeholder="e.g. ANNAPOORNA TEA STALL" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Route / Area *</label>
              <select id="new-shop-area" required class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Tollgate">Tollgate</option>
                <option value="Samayapuram">Samayapuram</option>
                <option value="Manachanallur">Manachanallur</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input type="tel" id="new-shop-phone" placeholder="9876543210" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Initial Outstanding Balance (₹)</label>
            <input type="number" step="0.01" id="new-shop-balance" value="0" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="pt-3 flex gap-2">
            <button type="button" onclick="closeModal()" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition">Cancel</button>
            <button type="submit" class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow transition">Save Shop</button>
          </div>
        </form>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function handleAddShopSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('new-shop-name').value.trim();
  const area = document.getElementById('new-shop-area').value;
  const phone = document.getElementById('new-shop-phone').value.trim();
  const balance = Number(document.getElementById('new-shop-balance').value) || 0;

  const newShop = {
    id: 'SHP-' + (state.shops.length + 1).toString().padStart(3, '0'),
    slNo: state.shops.length + 1,
    name: name,
    area: area,
    phone: phone,
    previousBalance: balance,
    totalPurchased: 0,
    totalPaid: 0
  };

  state.shops.push(newShop);
  saveToStorage();
  syncWithGoogleSheet({ action: 'ADD_SHOP', shop: newShop });
  closeModal();
  renderCurrentTab();
  showToast(`Shop ${name} added to ${area}!`);
}

function openCollectPaymentModal(shopId) {
  const shop = state.shops.find(s => s.id === shopId);
  if (!shop) return;

  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="wallet" class="w-5 h-5 text-emerald-600"></i>
          <span>Collect Outstanding Payment</span>
        </h2>

        <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div class="font-bold text-slate-900 text-sm">${escapeHtml(shop.name)}</div>
          <div class="text-slate-500">${escapeHtml(shop.area)}</div>
          <div class="mt-2 flex justify-between font-bold">
            <span class="text-slate-600">Current Outstanding:</span>
            <span class="text-amber-600 text-sm">₹${formatCurrency(shop.previousBalance)}</span>
          </div>
        </div>

        <form id="collect-payment-form" onsubmit="handleCollectPaymentSubmit(event, '${shop.id}')" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Amount Collected (₹) *</label>
            <input type="number" step="0.01" id="payment-amount" required placeholder="Enter amount" value="${shop.previousBalance > 0 ? shop.previousBalance : ''}" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Payment Mode</label>
            <select id="payment-mode" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / GPay</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Notes / Remark</label>
            <input type="text" id="payment-notes" placeholder="e.g. Cleared past week balance" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="pt-3 flex gap-2">
            <button type="button" onclick="closeModal()" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition">Cancel</button>
            <button type="submit" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow transition">Save Payment</button>
          </div>
        </form>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function handleCollectPaymentSubmit(e, shopId) {
  e.preventDefault();
  const shop = state.shops.find(s => s.id === shopId);
  if (!shop) return;

  const amount = Number(document.getElementById('payment-amount').value) || 0;
  const mode = document.getElementById('payment-mode').value;
  const notes = document.getElementById('payment-notes').value.trim();

  shop.previousBalance = Math.max(0, (Number(shop.previousBalance) || 0) - amount);
  shop.totalPaid = (Number(shop.totalPaid) || 0) + amount;

  const paymentRecord = {
    id: 'PAY-' + Date.now().toString().slice(-6),
    date: new Date().toISOString(),
    shopId: shop.id,
    shopName: shop.name,
    amount: amount,
    mode: mode,
    notes: notes
  };

  state.payments.push(paymentRecord);
  saveToStorage();
  syncWithGoogleSheet({ action: 'RECORD_PAYMENT', payment: paymentRecord });
  closeModal();
  renderCurrentTab();
  showToast(`Payment of ₹${amount} recorded for ${shop.name}!`);
}

function openShopLedger(shopId) {
  const shop = state.shops.find(s => s.id === shopId);
  if (!shop) return;

  const shopSales = state.sales.filter(s => s.shopId === shop.id);
  const shopPayments = state.payments.filter(p => p.shopId === shop.id);

  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-4 max-h-[85vh] overflow-y-auto">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-slate-900">${escapeHtml(shop.name)}</h2>
            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">${escapeHtml(shop.area)}</span>
          </div>
          <p class="text-xs text-slate-500">Contact: ${shop.phone || 'Not specified'}</p>
        </div>

        <div class="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <div>
            <span class="text-[10px] text-slate-500 uppercase font-semibold">Total Purchases</span>
            <div class="font-bold text-slate-900 text-sm mt-0.5">₹${formatCurrency(shop.totalPurchased)}</div>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 uppercase font-semibold">Total Paid</span>
            <div class="font-bold text-emerald-600 text-sm mt-0.5">₹${formatCurrency(shop.totalPaid)}</div>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 uppercase font-semibold">Current Due</span>
            <div class="font-bold ${(Number(shop.previousBalance) || 0) > 0 ? 'text-amber-600' : 'text-slate-500'} text-sm mt-0.5">
              ₹${formatCurrency(shop.previousBalance)}
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <h3 class="font-bold text-slate-900 text-xs">Past Delivery Bills (${shopSales.length})</h3>
          ${shopSales.length === 0 ? `
            <p class="text-xs text-slate-400 py-3 text-center">No bills recorded yet.</p>
          ` : `
            <div class="space-y-1.5 max-h-48 overflow-y-auto">
              ${shopSales.slice().reverse().map(s => `
                <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                  <div>
                    <span class="font-semibold text-slate-900">${s.id}</span>
                    <span class="text-slate-500 text-[10px] block">${new Date(s.date).toLocaleDateString()}</span>
                  </div>
                  <div class="text-right">
                    <span class="font-bold text-slate-900">₹${formatCurrency(s.totalAmount)}</span>
                    <span class="text-emerald-600 text-[10px] block">Paid: ₹${formatCurrency(s.amountPaid)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="pt-3 flex gap-2 border-t border-slate-100">
          <button onclick="startSaleForShop('${shop.id}'); closeModal();" class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition">
            Create New Bill
          </button>
          <button onclick="openCollectPaymentModal('${shop.id}')" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition">
            Record Payment
          </button>
        </div>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function openAddSupplierModal() {
  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
          <i data-lucide="truck" class="w-5 h-5 text-blue-600"></i>
          <span>Add New Supplier</span>
        </h2>

        <form id="add-supplier-form" onsubmit="handleAddSupplierSubmit(event)" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
            <input type="text" id="new-sup-name" required placeholder="e.g. Tata Consumer Products Depot" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Contact Person</label>
              <input type="text" id="new-sup-contact" placeholder="Area Sales Executive" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input type="tel" id="new-sup-phone" placeholder="9876543210" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Products Supplied</label>
            <input type="text" id="new-sup-prods" placeholder="e.g. Tea Dust, Boost, Horlicks" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          </div>

          <div class="pt-3 flex gap-2">
            <button type="button" onclick="closeModal()" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition">Cancel</button>
            <button type="submit" class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow transition">Save Supplier</button>
          </div>
        </form>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function handleAddSupplierSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('new-sup-name').value.trim();
  const contact = document.getElementById('new-sup-contact').value.trim();
  const phone = document.getElementById('new-sup-phone').value.trim();
  const prods = document.getElementById('new-sup-prods').value.trim();

  const newSup = {
    id: 'SUP-' + (state.suppliers.length + 1).toString().padStart(3, '0'),
    name: name,
    contactPerson: contact,
    phone: phone,
    productsSupplied: prods
  };

  state.suppliers.push(newSup);
  saveToStorage();
  closeModal();
  renderCurrentTab();
  showToast(`Supplier ${name} added!`);
}

function openQuickSale() {
  switchTab('pos');
}

function closeModal() {
  const container = document.getElementById('modal-container');
  if (container) container.innerHTML = '';
}

// -------------------------------------------------------------
// GOOGLE APPS SCRIPT WEB APP SYNC ENGINE
// -------------------------------------------------------------
async function saveAndTestConnection() {
  const input = document.getElementById('google-sheet-url-input');
  if (!input) return;

  const url = input.value.trim();
  state.settings.googleSheetUrl = url;
  saveToStorage();

  if (!url) {
    state.syncStatus = 'offline';
    updateSyncStatusBadge();
    showToast('Cleared Web App URL. Operating in Local Cache mode.');
    return;
  }

  state.syncStatus = 'syncing';
  updateSyncStatusBadge();

  try {
    const testUrl = url + (url.includes('?') ? '&' : '?') + 'action=PING';
    const res = await fetch(testUrl, { method: 'GET', mode: 'cors' });
    const data = await res.json();

    if (data.status === 'success') {
      state.syncStatus = 'online';
      state.settings.lastSync = new Date().toISOString();
      saveToStorage();
      updateSyncStatusBadge();
      showToast('Successfully connected to Mohan Traders Google Sheet!');
    } else {
      throw new Error(data.message || 'Unknown response');
    }
  } catch (err) {
    console.warn('Sync test failed:', err);
    state.syncStatus = 'offline';
    updateSyncStatusBadge();
    alert('Could not verify Google Apps Script connection.\nPlease make sure your Web App is deployed with "Who has access: Anyone".\nLocal mode remains active.');
  }
}

async function syncWithGoogleSheet(payload) {
  const url = state.settings.googleSheetUrl;
  if (!url) return;

  try {
    state.syncStatus = 'syncing';
    updateSyncStatusBadge();

    // Send payload using POST
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Standard Apps Script POST handling
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    state.syncStatus = 'online';
    state.settings.lastSync = new Date().toISOString();
    saveToStorage();
    updateSyncStatusBadge();
  } catch (err) {
    console.error('Google Sheet push error:', err);
    state.syncStatus = 'offline';
    updateSyncStatusBadge();
  }
}

async function syncAllFromSheet() {
  const url = state.settings.googleSheetUrl;
  if (!url) {
    alert('Please configure your Google Apps Script Web App URL first.');
    return;
  }

  state.syncStatus = 'syncing';
  updateSyncStatusBadge();

  try {
    const fetchUrl = url + (url.includes('?') ? '&' : '?') + 'action=GET_ALL';
    const res = await fetch(fetchUrl);
    const result = await res.json();

    if (result.status === 'success') {
      if (result.products && result.products.length > 0) state.products = result.products;
      if (result.shops && result.shops.length > 0) state.shops = result.shops;
      if (result.dailyTaken && result.dailyTaken.length > 0) state.dailyTaken = result.dailyTaken;

      state.syncStatus = 'online';
      state.settings.lastSync = new Date().toISOString();
      saveToStorage();
      updateSyncStatusBadge();
      renderCurrentTab();
      showToast('Successfully refreshed all data from Google Sheet!');
    } else {
      throw new Error(result.message || 'Fetch failed');
    }
  } catch (err) {
    console.error('Failed to sync from sheet:', err);
    state.syncStatus = 'offline';
    updateSyncStatusBadge();
    alert('Error syncing from sheet. Please check your Web App URL.');
  }
}

function pushAllToSheet() {
  syncWithGoogleSheet({
    action: 'SYNC_ALL',
    products: state.products,
    shops: state.shops,
    dailyTaken: state.dailyTaken
  });
  showToast('Push command initiated to Google Sheet!');
}

function updateSyncStatusBadge() {
  const pill = document.getElementById('live-sync-pill');
  if (!pill) return;

  if (state.syncStatus === 'online') {
    pill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
    pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span>Sheet Synced</span>`;
  } else if (state.syncStatus === 'syncing') {
    pill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200';
    pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-500 animate-sync"></span><span>Syncing...</span>`;
  } else {
    pill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200';
    pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span><span>Offline (Local)</span>`;
  }
}

// -------------------------------------------------------------
// DATA BACKUP & EXPORTS
// -------------------------------------------------------------
function exportJSONBackup() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(localStorage.getItem(STORAGE_KEY) || '{}');
  const dl = document.createElement('a');
  dl.setAttribute('href', dataStr);
  dl.setAttribute('download', `mohan_traders_backup_${new Date().toISOString().slice(0, 10)}.json`);
  dl.click();
}

function exportSalesCSV() {
  let csv = 'Sale ID,Date,Shop Name,Route,Total (INR),Paid (INR),Balance (INR),Payment Mode\n';
  state.sales.forEach(s => {
    csv += `"${s.id}","${s.date}","${s.shopName.replace(/"/g, '""')}","${s.area}","${s.totalAmount}","${s.amountPaid}","${s.remainingBalance}","${s.paymentMode || 'Cash'}"\n`;
  });
  downloadCSV(csv, 'mohan_traders_sales.csv');
}

function exportShopsCSV() {
  let csv = 'Sl,Shop Name,Route,Phone,Outstanding Balance (INR)\n';
  state.shops.forEach((s, idx) => {
    csv += `"${s.slNo || idx + 1}","${s.name.replace(/"/g, '""')}","${s.area}","${s.phone || ''}","${s.previousBalance || 0}"\n`;
  });
  downloadCSV(csv, 'mohan_traders_shops_ledger.csv');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  a.click();
}

// Helper Utilities
function formatCurrency(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'fixed bottom-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 transform transition duration-300 translate-y-10 opacity-0 pointer-events-none';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i data-lucide="info" class="w-4 h-4 text-emerald-400"></i><span>${escapeHtml(msg)}</span>`;
  if (window.lucide) window.lucide.createIcons();
  toast.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
  }, 3500);
}

function setupEventListeners() {
  // ESC to close modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// Start app on DOMContentLoaded
window.addEventListener('DOMContentLoaded', initApp);
