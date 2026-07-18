import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, Warehouse, Users, Tag, FileText, X } from 'lucide-react';
import { request } from '../utils/api';
export default function GlobalSearch({ setCurrentPage, setSelectedProduct, setSelectedWarehouse }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({
    products: [],
    warehouses: [],
    categories: [],
    suppliers: [],
    invoices: []
  });
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  // Load database lists for matching
  const performSearch = async (txt) => {
    if (!txt.trim()) {
      setResults({ products: [], warehouses: [], categories: [], suppliers: [], invoices: [] });
      return;
    }
    
    const searchTxt = txt.toLowerCase();
    try {
      // 1. Fetch matching lists
      const products = await request(`/products?search=${txt}`);
      const warehouses = await request('/warehouses');
      const invoices = await request('/invoices'); // invoices handles custom search
      // Filter warehouses
      const matchedWh = warehouses.filter(w => w.name.toLowerCase().includes(searchTxt));
      // Filter invoices
      const matchedInv = invoices.filter(i => 
        i.invoice_number.toLowerCase().includes(searchTxt) || 
        i.partner_name.toLowerCase().includes(searchTxt)
      );
      // Extract unique categories & suppliers matching from products
      const categories = [...new Set(products.map(p => p.category))].filter(c => c && c.toLowerCase().includes(searchTxt));
      const suppliers = [...new Set(products.map(p => p.supplier))].filter(s => s && s.toLowerCase().includes(searchTxt));
      setResults({
        products: products.slice(0, 4),
        warehouses: matchedWh.slice(0, 3),
        categories: categories.slice(0, 3),
        suppliers: suppliers.slice(0, 3),
        invoices: matchedInv.slice(0, 3)
      });
    } catch (e) {
      // Offline fallback search
      const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
      const localWarehouses = JSON.parse(localStorage.getItem('warehouses') || '[]');
      const localInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
      const matchedProd = localProducts.filter(p => 
        p.name.toLowerCase().includes(searchTxt) || 
        p.sku.toLowerCase().includes(searchTxt)
      );
      
      const matchedWh = localWarehouses.filter(w => w.name.toLowerCase().includes(searchTxt));
      const matchedInv = localInvoices.filter(i => 
        i.invoice_number.toLowerCase().includes(searchTxt) || 
        i.partner_name.toLowerCase().includes(searchTxt)
      );
      const categories = [...new Set(localProducts.map(p => p.category))].filter(c => c && c.toLowerCase().includes(searchTxt));
      const suppliers = [...new Set(localProducts.map(p => p.supplier))].filter(s => s && s.toLowerCase().includes(searchTxt));
      setResults({
        products: matchedProd.slice(0, 4),
        warehouses: matchedWh.slice(0, 3),
        categories: categories.slice(0, 3),
        suppliers: suppliers.slice(0, 3),
        invoices: matchedInv.slice(0, 3)
      });
    }
  };
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      performSearch(query);
    }, 150);
    return () => clearTimeout(delayDebounce);
  }, [query]);
  // Outside click close
  useEffect(() => {
    function clickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);
  const hasResults = Object.values(results).some(arr => arr.length > 0);
  const handleSelect = (type, item) => {
    setIsOpen(false);
    setQuery('');
    
    if (type === 'product') {
      setCurrentPage('products');
      if (setSelectedProduct) setSelectedProduct(item);
    } else if (type === 'warehouse') {
      setCurrentPage('warehouses');
      if (setSelectedWarehouse) setSelectedWarehouse(item);
    } else if (type === 'category' || type === 'supplier') {
      setCurrentPage('products');
    } else if (type === 'invoice') {
      setCurrentPage('reports');
    }
  };
  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
          <Search size={18} />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Global Search (Products, Warehouses, Categories, Suppliers, Invoices)..."
          className="w-full pl-10 pr-10 py-2.5 bg-slate-800/60 hover:bg-slate-800/80 focus:bg-slate-800 text-slate-100 rounded-xl border border-slate-700/50 focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20 placeholder-slate-500 text-sm outline-none transition-all"
        />
        {query && (
          <button 
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {/* Floating Results Panel */}
      {isOpen && query.trim() && (
        <div className="absolute left-0 mt-3 w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50 glass-panel max-h-96 overflow-y-auto">
          {!hasResults ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No matching records found for "{query}"
            </div>
          ) : (
            <div className="p-2 space-y-3">
              {/* Products Section */}
              {results.products.length > 0 && (
                <div>
                  <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                    <Package size={12} />
                    Products
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.products.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelect('product', p)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800/60 rounded-lg flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{p.name}</p>
                          <p className="text-[10px] text-slate-500">ID: {p.sku} | Supplier: {p.supplier || 'N/A'}</p>
                        </div>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700/50">
                          {p.total_quantity} qty
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Warehouses Section */}
              {results.warehouses.length > 0 && (
                <div>
                  <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    <Warehouse size={12} />
                    Warehouses
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.warehouses.map(w => (
                      <button
                        key={w.id}
                        onClick={() => handleSelect('warehouse', w)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800/60 rounded-lg transition-colors"
                      >
                        <p className="text-xs font-semibold text-slate-200">{w.name}</p>
                        <p className="text-[10px] text-slate-500">Location: {w.location || 'N/A'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Categories Section */}
              {results.categories.length > 0 && (
                <div>
                  <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    <Tag size={12} />
                    Categories
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 p-2">
                    {results.categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => handleSelect('category', cat)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700/50 transition-colors"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Suppliers Section */}
              {results.suppliers.length > 0 && (
                <div>
                  <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                    <Users size={12} />
                    Suppliers
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 p-2">
                    {results.suppliers.map(sup => (
                      <button
                        key={sup}
                        onClick={() => handleSelect('supplier', sup)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700/50 transition-colors"
                      >
                        {sup}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Invoices Section */}
              {results.invoices.length > 0 && (
                <div>
                  <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                    <FileText size={12} />
                    Invoices
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.invoices.map(inv => (
                      <button
                        key={inv.id}
                        onClick={() => handleSelect('invoice', inv)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-800/60 rounded-lg flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{inv.invoice_number}</p>
                          <p className="text-[10px] text-slate-500">{inv.type === 'sale' ? 'Sale to' : 'Purchase from'} {inv.partner_name}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-300">
                          {inv.total_amount}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
