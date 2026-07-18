// API Client with automatic backend detection and client-side LocalStorage fallback.
// This allows the ERP to function completely in mock offline mode if the FastAPI server is offline.
const API_BASE = '/api';
// Helper to check if token exists
export const getToken = () => localStorage.getItem('token');
export const setToken = (token) => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};
// Check if backend is alive
let isBackendOnline = false;
try {
  const res = await fetch(`${API_BASE}/`, { method: 'GET', signal: AbortSignal.timeout(1000) });
  if (res.ok) isBackendOnline = true;
} catch (e) {
  isBackendOnline = false;
  console.warn("Backend API not detected. Falling back to LocalStorage offline sandbox mode.");
}
// Initial mock database values for seeding LocalStorage
const DEFAULT_SETTINGS = {
  id: 1,
  currency: '₹',
  units: 'units',
  low_stock_limit: 10,
  expiry_warning_days: 30,
  theme: 'dark',
  language: 'English'
};
const DEFAULT_WAREHOUSES = [
  { id: 1, name: 'Warehouse A', location: 'Central Zone' },
  { id: 2, name: 'Factory 1', location: 'Industrial Area' },
  { id: 3, name: 'Cold Storage', location: 'North Sector' },
  { id: 4, name: 'Branch Hyderabad', location: 'Madhapur' }
];
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    sku: 'PROD-001',
    name: 'Organic Red Apples 1kg',
    category: 'Fresh Produce',
    min_stock: 100,
    max_stock: 1000,
    supplier: 'Green Farms Ltd',
    purchase_price: 80,
    selling_price: 130,
    expiry_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    last_updated: new Date().toISOString(),
    stocks: [
      { warehouse_id: 1, warehouse_name: 'Warehouse A', quantity: 80 },
      { warehouse_id: 3, warehouse_name: 'Cold Storage', quantity: 250 }
    ],
    total_quantity: 330
  },
  {
    id: 2,
    sku: 'PROD-002',
    name: 'Whole Milk 1L Box',
    category: 'Dairy',
    min_stock: 50,
    max_stock: 300,
    supplier: 'Dairy Farms Co',
    purchase_price: 45,
    selling_price: 60,
    expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    last_updated: new Date().toISOString(),
    stocks: [
      { warehouse_id: 3, warehouse_name: 'Cold Storage', quantity: 45 }
    ],
    total_quantity: 45
  },
  {
    id: 3,
    sku: 'PROD-003',
    name: 'Premium Wheat Flour 5kg',
    category: 'Pantry Essentials',
    min_stock: 40,
    max_stock: 500,
    supplier: 'Apex Millers',
    purchase_price: 180,
    selling_price: 240,
    expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    last_updated: new Date().toISOString(),
    stocks: [
      { warehouse_id: 1, warehouse_name: 'Warehouse A', quantity: 200 },
      { warehouse_id: 4, warehouse_name: 'Branch Hyderabad', quantity: 120 }
    ],
    total_quantity: 320
  },
  {
    id: 4,
    sku: 'PROD-004',
    name: 'Fresh Tomato Ketchup 1kg',
    category: 'Sauces & Spreads',
    min_stock: 30,
    max_stock: 200,
    supplier: 'Green Farms Ltd',
    purchase_price: 90,
    selling_price: 125,
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    last_updated: new Date().toISOString(),
    stocks: [
      { warehouse_id: 1, warehouse_name: 'Warehouse A', quantity: 8 }
    ],
    total_quantity: 8
  },
  {
    id: 5,
    sku: 'PROD-005',
    name: 'Basmati Rice 10kg Bag',
    category: 'Pantry Essentials',
    min_stock: 50,
    max_stock: 400,
    supplier: 'Apex Millers',
    purchase_price: 750,
    selling_price: 1100,
    expiry_date: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    last_updated: new Date().toISOString(),
    stocks: [
      { warehouse_id: 2, warehouse_name: 'Factory 1', quantity: 900 }
    ],
    total_quantity: 900
  },
  {
    id: 6,
    sku: 'PROD-006',
    name: 'Canned Sweet Corn 400g',
    category: 'Canned Goods',
    min_stock: 40,
    max_stock: 300,
    supplier: 'Green Farms Ltd',
    purchase_price: 35,
    selling_price: 55,
    expiry_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    last_updated: new Date().toISOString(),
    stocks: [],
    total_quantity: 0
  },
  {
    id: 7,
    sku: 'PROD-007',
    name: 'Salted Butter 500g Pack',
    category: 'Dairy',
    min_stock: 30,
    max_stock: 200,
    supplier: 'Dairy Farms Co',
    purchase_price: 220,
    selling_price: 290,
    expiry_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    last_updated: new Date().toISOString(),
    stocks: [
      { warehouse_id: 3, warehouse_name: 'Cold Storage', quantity: 65 }
    ],
    total_quantity: 65
  }
];
const DEFAULT_MOVEMENTS = [
  {
    id: 1,
    product_id: 1,
    product_sku: 'PROD-001',
    product_name: 'Organic Red Apples 1kg',
    from_warehouse_name: null,
    to_warehouse_name: 'Cold Storage',
    quantity: 300,
    reason: 'Purchase Invoice: MOCK-PUR-01',
    transfer_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    product_id: 1,
    product_sku: 'PROD-001',
    product_name: 'Organic Red Apples 1kg',
    from_warehouse_name: 'Cold Storage',
    to_warehouse_name: null,
    quantity: 50,
    reason: 'Sale Invoice: MOCK-SAL-01',
    transfer_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];
const DEFAULT_INVOICES = [
  {
    id: 1,
    invoice_number: 'INV-2026-0001',
    type: 'sale',
    partner_name: 'Reliance Fresh Mart',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    total_amount: 6300,
    status: 'paid',
    items: [
      { id: 1, product_sku: 'PROD-001', product_name: 'Organic Red Apples 1kg', quantity: 30, price: 130, warehouse_name: 'Warehouse A' },
      { id: 2, product_sku: 'PROD-003', product_name: 'Premium Wheat Flour 5kg', quantity: 10, price: 240, warehouse_name: 'Warehouse A' }
    ]
  },
  {
    id: 2,
    invoice_number: 'INV-2026-0002',
    type: 'purchase',
    partner_name: 'Green Farms Ltd',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    total_amount: 3550,
    status: 'paid',
    items: [
      { id: 3, product_sku: 'PROD-004', product_name: 'Fresh Tomato Ketchup 1kg', quantity: 20, price: 90, warehouse_name: 'Warehouse A' },
      { id: 4, product_sku: 'PROD-006', product_name: 'Canned Sweet Corn 400g', quantity: 50, price: 35, warehouse_name: 'Warehouse A' }
    ]
  }
];
const DEFAULT_NOTIFICATIONS = [
  {
    id: 1,
    type: 'success',
    title: 'Welcome to Smart ERP',
    message: 'Loaded sample data sandbox. The dashboard and AI Insights are ready to use.',
    is_read: false,
    timestamp: new Date().toISOString()
  }
];
// Helper to seed localStorage
const seedLocalStorage = (force = false) => {
  if (!localStorage.getItem('seeding_done') || force) {
    localStorage.setItem('settings', JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem('warehouses', JSON.stringify(DEFAULT_WAREHOUSES));
    localStorage.setItem('products', JSON.stringify(DEFAULT_PRODUCTS));
    localStorage.setItem('movements', JSON.stringify(DEFAULT_MOVEMENTS));
    localStorage.setItem('invoices', JSON.stringify(DEFAULT_INVOICES));
    localStorage.setItem('notifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
    localStorage.setItem('purchase_orders', JSON.stringify([]));
    localStorage.setItem('seeding_done', 'true');
  }
};
seedLocalStorage();
// Offline Sandboxed database handler
const mockDb = {
  getSettings: () => JSON.parse(localStorage.getItem('settings')),
  saveSettings: (s) => localStorage.setItem('settings', JSON.stringify(s)),
  getWarehouses: () => JSON.parse(localStorage.getItem('warehouses')),
  saveWarehouses: (w) => localStorage.setItem('warehouses', JSON.stringify(w)),
  getProducts: () => JSON.parse(localStorage.getItem('products')),
  saveProducts: (p) => localStorage.setItem('products', JSON.stringify(p)),
  getMovements: () => JSON.parse(localStorage.getItem('movements')),
  saveMovements: (m) => localStorage.setItem('movements', JSON.stringify(m)),
  getInvoices: () => JSON.parse(localStorage.getItem('invoices')),
  saveInvoices: (i) => localStorage.setItem('invoices', JSON.stringify(i)),
  getNotifications: () => JSON.parse(localStorage.getItem('notifications')),
  saveNotifications: (n) => localStorage.setItem('notifications', JSON.stringify(n)),
  getPurchaseOrders: () => JSON.parse(localStorage.getItem('purchase_orders')),
  savePurchaseOrders: (p) => localStorage.setItem('purchase_orders', JSON.stringify(p))
};
// Client-side AI Engine simulator
const runClientSideAi = () => {
  const products = mockDb.getProducts();
  const settings = mockDb.getSettings();
  const warehouses = mockDb.getWarehouses();
  const movements = mockDb.getMovements();
  const notifications = mockDb.getNotifications();
  
  let healthScore = 100;
  let unhealthyCount = 0;
  const recommendations = [];
  const insights = [];
  let estimatedPurchaseCost = 0;
  products.forEach(p => {
    const totalQty = p.total_quantity;
    let isHealthy = true;
    if (totalQty === 0) {
      isHealthy = false;
      unhealthyCount++;
      const suggested = Math.max(p.min_stock + 10, 15);
      recommendations.append({
        product_sku: p.sku,
        product_name: p.name,
        current_stock: 0,
        required_stock: p.min_stock,
        suggested_action: `Order ${suggested} units immediately.`,
        reason: "Product is out of stock, causing lost sales."
      });
      estimatedPurchaseCost += suggested * p.purchase_price;
    } else if (totalQty <= p.min_stock) {
      isHealthy = false;
      unhealthyCount++;
      const suggested = p.max_stock - totalQty;
      recommendations.push({
        product_sku: p.sku,
        product_name: p.name,
        current_stock: totalQty,
        required_stock: p.min_stock,
        suggested_action: `Purchase ${suggested} more units.`,
        reason: "Stock level fell below the minimum configured limit."
      });
      estimatedPurchaseCost += suggested * p.purchase_price;
    } else if (totalQty >= p.max_stock) {
      isHealthy = false;
      unhealthyCount++;
      recommendations.push({
        product_sku: p.sku,
        product_name: p.name,
        current_stock: totalQty,
        required_stock: p.max_stock,
        suggested_action: "Pause purchasing.",
        reason: "Stock exceeds maximum capacity target."
      });
    }
    if (p.expiry_date) {
      const days = Math.ceil((new Date(p.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (days < 0) {
        isHealthy = false;
        unhealthyCount++;
        recommendations.push({
          product_sku: p.sku,
          product_name: p.name,
          current_stock: totalQty,
          required_stock: 0,
          suggested_action: "Dispose expired stock.",
          reason: `Expired on ${p.expiry_date}.`
        });
      } else if (days <= settings.expiry_warning_days) {
        isHealthy = false;
        unhealthyCount++;
        recommendations.push({
          product_sku: p.sku,
          product_name: p.name,
          current_stock: totalQty,
          required_stock: totalQty,
          suggested_action: "Run clearance promotion.",
          reason: `Expires in ${days} days.`
        });
      }
    }
  });
  if (products.length > 0) {
    healthScore = Math.max(0, Math.round(100 - (unhealthyCount / products.length) * 100));
  }
  insights.push(`Overall inventory health is ${healthScore}%.`);
  const lowCount = recommendations.filter(r => r.suggested_action.includes("Purchase") || r.suggested_action.includes("Order")).length;
  const overCount = recommendations.filter(r => r.suggested_action.includes("Pause")).length;
  
  if (lowCount > 0) insights.push(`${lowCount} products need restocking.`);
  if (overCount > 0) insights.push(`${overCount} products are overstocked.`);
  
  return {
    health_score: healthScore,
    recommendations,
    insights,
    estimated_purchase_cost: estimatedPurchaseCost
  };
};
// Central fetch router to catch backend requests or fallback to mock sandbox
export const request = async (url, options = {}) => {
  const method = options.method || 'GET';
  const headers = options.headers || {};
  
  // Set Auth token if present
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  options.headers = headers;
  // 1. If backend is alive, use real backend APIs!
  if (isBackendOnline) {
    try {
      const response = await fetch(`${API_BASE}${url}`, options);
      if (response.status === 401) {
        setToken(null);
      }
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "API Request Failed");
      }
      return await response.json();
    } catch (e) {
      console.warn("Backend request failed, executing fallback: ", e);
      // Fallback on request crash
    }
  }
  // 2. Client-Side Sandbox Mock Implementation
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Mock Router logic
      if (url.startsWith('/auth/login')) {
        // Resolve form data
        const body = options.body;
        let username = "admin";
        if (body instanceof FormData) {
          username = body.get('username') || "admin";
        }
        setToken("mock-jwt-token-for-" + username);
        resolve({ access_token: "mock-jwt-token-for-" + username, token_type: "bearer" });
        return;
      }
      
      if (url.startsWith('/auth/me')) {
        if (!token) return reject(new Error("Unauthorized"));
        const username = token.replace("mock-jwt-token-for-", "");
        resolve({ id: 1, username });
        return;
      }
      if (url.startsWith('/settings')) {
        if (method === 'GET') {
          resolve(mockDb.getSettings());
        } else if (method === 'PUT') {
          const body = JSON.parse(options.body);
          const current = mockDb.getSettings();
          const updated = { ...current, ...body };
          mockDb.saveSettings(updated);
          resolve(updated);
        } else if (url.includes('/clear-demo')) {
          mockDb.saveProducts([]);
          mockDb.saveWarehouses([]);
          mockDb.saveMovements([]);
          mockDb.saveInvoices([]);
          mockDb.saveNotifications([]);
          mockDb.savePurchaseOrders([]);
          resolve({ message: "Cleared sandbox database." });
        } else if (url.includes('/load-demo')) {
          seedLocalStorage(true);
          resolve({ message: "Loaded default sandbox data." });
        }
        return;
      }
      if (url.startsWith('/warehouses')) {
        const whs = mockDb.getWarehouses();
        if (method === 'GET') {
          resolve(whs);
        } else if (method === 'POST') {
          const body = JSON.parse(options.body);
          const newWh = { id: Date.now(), name: body.name, location: body.location };
          whs.push(newWh);
          mockDb.saveWarehouses(whs);
          resolve(newWh);
        } else if (method === 'PUT') {
          const id = parseInt(url.split('/').pop());
          const body = JSON.parse(options.body);
          const updated = whs.map(w => w.id === id ? { ...w, name: body.name, location: body.location } : w);
          mockDb.saveWarehouses(updated);
          resolve({ id, name: body.name, location: body.location });
        } else if (method === 'DELETE') {
          const id = parseInt(url.split('/').pop());
          const filtered = whs.filter(w => w.id !== id);
          mockDb.saveWarehouses(filtered);
          resolve({ message: "Deleted" });
        }
        return;
      }
      if (url.startsWith('/products')) {
        const prods = mockDb.getProducts();
        if (method === 'GET') {
          // simple search
          const params = new URLSearchParams(url.split('?')[1]);
          const search = params.get('search');
          const status = params.get('stock_status');
          
          let filtered = [...prods];
          if (search) {
            filtered = filtered.filter(p => 
              p.name.toLowerCase().includes(search.toLowerCase()) || 
              p.sku.toLowerCase().includes(search.toLowerCase())
            );
          }
          if (status) {
            filtered = filtered.filter(p => {
              if (status === 'out_of_stock') return p.total_quantity === 0;
              if (status === 'low_stock') return p.total_quantity <= p.min_stock;
              if (status === 'overstock') return p.total_quantity >= p.max_stock;
              return true;
            });
          }
          resolve(filtered);
        } else if (method === 'POST') {
          const body = JSON.parse(options.body);
          const newProd = {
            id: Date.now(),
            sku: body.sku,
            name: body.name,
            category: body.category || "General",
            min_stock: body.min_stock || 10,
            max_stock: body.max_stock || 100,
            supplier: body.supplier || "",
            purchase_price: body.purchase_price || 0,
            selling_price: body.selling_price || 0,
            expiry_date: body.expiry_date || null,
            last_updated: new Date().toISOString(),
            stocks: [],
            total_quantity: 0
          };
          prods.push(newProd);
          mockDb.saveProducts(prods);
          resolve(newProd);
        } else if (method === 'PUT') {
          const id = parseInt(url.split('/').pop());
          const body = JSON.parse(options.body);
          const updated = prods.map(p => p.id === id ? { 
            ...p, 
            sku: body.sku, 
            name: body.name, 
            category: body.category, 
            min_stock: body.min_stock,
            max_stock: body.max_stock,
            supplier: body.supplier,
            purchase_price: body.purchase_price,
            selling_price: body.selling_price,
            expiry_date: body.expiry_date,
            last_updated: new Date().toISOString()
          } : p);
          mockDb.saveProducts(updated);
          resolve(updated.find(p => p.id === id));
        } else if (method === 'DELETE') {
          const id = parseInt(url.split('/').pop());
          const filtered = prods.filter(p => p.id !== id);
          mockDb.saveProducts(filtered);
          resolve({ message: "Deleted" });
        }
        return;
      }
      if (url.startsWith('/movements')) {
        const moves = mockDb.getMovements();
        if (method === 'GET') {
          resolve(moves);
        } else if (method === 'POST') {
          const body = JSON.parse(options.body);
          // Transfer stock
          const prods = mockDb.getProducts();
          const target = prods.find(p => p.sku === body.product_sku);
          if (!target) return reject(new Error("Product SKU not found"));
          // Adjust mock stocks array
          let fromStock = target.stocks.find(s => s.warehouse_name === body.from_warehouse_name);
          let toStock = target.stocks.find(s => s.warehouse_name === body.to_warehouse_name);
          if (body.from_warehouse_name) {
            if (!fromStock || fromStock.quantity < body.quantity) {
              return reject(new Error("Insufficient stock in source warehouse"));
            }
            fromStock.quantity -= body.quantity;
          }
          if (body.to_warehouse_name) {
            if (!toStock) {
              toStock = { warehouse_id: Date.now(), warehouse_name: body.to_warehouse_name, quantity: 0 };
              target.stocks.push(toStock);
            }
            toStock.quantity += body.quantity;
          }
          
          target.total_quantity = target.stocks.reduce((acc, curr) => acc + curr.quantity, 0);
          mockDb.saveProducts(prods);
          const newMove = {
            id: Date.now(),
            product_id: target.id,
            product_sku: target.sku,
            product_name: target.name,
            from_warehouse_name: body.from_warehouse_name || null,
            to_warehouse_name: body.to_warehouse_name || null,
            quantity: body.quantity,
            reason: body.reason,
            transfer_date: body.transfer_date || new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString()
          };
          moves.unshift(newMove);
          mockDb.saveMovements(moves);
          resolve(newMove);
        }
        return;
      }
      if (url.startsWith('/notifications')) {
        if (url.includes('/ai-insights')) {
          resolve(runClientSideAi());
        } else {
          const notifs = mockDb.getNotifications();
          if (method === 'GET') {
            resolve(notifs);
          } else if (method === 'POST') {
            const id = parseInt(url.split('/')[2]);
            const updated = notifs.map(n => n.id === id ? { ...n, is_read: true } : n);
            mockDb.saveNotifications(updated);
            resolve({ message: "read" });
          } else if (url.includes('/read-all')) {
            const updated = notifs.map(n => ({ ...n, is_read: true }));
            mockDb.saveNotifications(updated);
            resolve({ message: "read all" });
          } else if (method === 'DELETE') {
            mockDb.saveNotifications([]);
            resolve({ message: "cleared" });
          }
        }
        return;
      }
      if (url.startsWith('/procurement')) {
        const pos = mockDb.getPurchaseOrders();
        if (url.includes('/suggestions')) {
          const suggestions = [];
          const prods = mockDb.getProducts();
          prods.forEach(p => {
            if (p.total_quantity <= p.min_stock) {
              const suggested = p.max_stock - p.total_quantity + 10;
              suggestions.push({
                product_sku: p.sku,
                product_name: p.name,
                supplier: p.supplier || "Green Farms Ltd",
                suggested_quantity: suggested,
                reason: `Stock level ${p.total_quantity} is low. replenishment suggested.`,
                expected_demand: 12
              });
            }
          });
          resolve(suggestions);
        } else if (url.includes('/orders')) {
          if (method === 'GET') {
            resolve(pos);
          } else if (method === 'POST') {
            if (url.endsWith('/status')) {
              const parts = url.split('/');
              const poId = parseInt(parts[3]);
              const body = JSON.parse(options.body);
              const po = pos.find(p => p.id === poId);
              if (po) {
                po.status = body.status;
                mockDb.savePurchaseOrders(pos);
                
                // Add stock if approved
                if (body.status === 'approved') {
                  const prods = mockDb.getProducts();
                  const target = prods.find(p => p.sku === po.product_sku);
                  if (target) {
                    let stock = target.stocks.find(s => s.warehouse_name === "Warehouse A");
                    if (!stock) {
                      stock = { warehouse_id: 1, warehouse_name: "Warehouse A", quantity: 0 };
                      target.stocks.push(stock);
                    }
                    stock.quantity += po.quantity;
                    target.total_quantity = target.stocks.reduce((acc, curr) => acc + curr.quantity, 0);
                    mockDb.saveProducts(prods);
                  }
                }
              }
              resolve({ message: "status updated" });
            } else {
              const body = JSON.parse(options.body);
              const newPo = {
                id: Date.now(),
                supplier: body.supplier,
                product_id: Date.now() + 1,
                product_sku: body.product_sku,
                product_name: "Requested Product",
                quantity: body.quantity,
                reason: body.reason,
                expected_demand: body.expected_demand || 10,
                status: "pending",
                created_at: new Date().toISOString()
              };
              pos.unshift(newPo);
              mockDb.savePurchaseOrders(pos);
              resolve(newPo);
            }
          }
        }
        return;
      }
      if (url.startsWith('/reports/data')) {
        const params = new URLSearchParams(url.split('?')[1]);
        const type = params.get('report_type');
        
        if (type === 'inventory') {
          const prods = mockDb.getProducts();
          resolve(prods.map(p => ({
            "Product SKU": p.sku,
            "Product Name": p.name,
            "Category": p.category,
            "Supplier": p.supplier,
            "Purchase Price": p.purchase_price,
            "Selling Price": p.selling_price,
            "Total Stock": p.total_quantity,
            "Valuation": p.total_quantity * p.purchase_price
          })));
        } else if (type === 'warehouse') {
          const whs = mockDb.getWarehouses();
          resolve(whs.map(w => ({
            "Warehouse Name": w.name,
            "Location": w.location,
            "Total Quantity": 120,
            "Valuation": 15000
          })));
        } else {
          resolve([]);
        }
        return;
      }
      // Default reject if unhandled mock route
      reject(new Error(`API Path ${url} not implemented in Sandbox.`));
    }, 150);
  });
};
