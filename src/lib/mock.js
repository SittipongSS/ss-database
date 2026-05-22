const MOCK = (() => {
  const RAW = {"customers":[],"products":[],"orders":[],"monthly":[],"categories":[],"mainNames":{}};
  // Mutable data — replaced by reload() when live Sheets data arrives
  let customers, products, orders, monthly, categories, mainNames;
  let customerMap, productMap, ordersByCustomer, orderMap;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
  let lastUpdated = null;
  const displayNameCache = {};
  const priceHistoryCache = {};

  function _apply(raw) {
    customers  = raw.customers  ?? customers;
    products   = raw.products   ?? products;
    orders     = raw.orders     ?? orders;
    monthly    = raw.monthly    ?? monthly;
    categories = raw.categories ?? RAW.categories;
    mainNames  = raw.mainNames  ?? RAW.mainNames;
    customerMap = Object.fromEntries(customers.map(c => [c.id, c]));
    productMap  = Object.fromEntries(products.map(p => [p.sku, p]));
    // O(1) lookup indexes
    orderMap = Object.fromEntries(orders.map(o => [o.doc, o]));
    ordersByCustomer = {};
    orders.forEach(o => {
      if (!ordersByCustomer[o.customer]) ordersByCustomer[o.customer] = [];
      ordersByCustomer[o.customer].push(o);
    });
    customers.forEach(c => {
      if (!c.taxId) {
        let h = 0;
        for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff;
        const n = (1000000000000n + BigInt(h) * 7919n % 9000000000000n).toString();
        c.taxId = "0" + n.slice(1);
      }
    });
    Object.keys(displayNameCache).forEach(k => delete displayNameCache[k]);
    Object.keys(priceHistoryCache).forEach(k => delete priceHistoryCache[k]);
  }
  _apply(RAW);

  function productDisplayName(sku) {
    if (displayNameCache[sku] != null) return displayNameCache[sku];
    const p = productMap[sku];
    let found = p?.name || null;
    if (!found) {
      for (const o of orders) for (const it of o.items) {
        if (it.sku === sku && it.desc) { found = it.desc; break; }
      }
    }
    found = found || p?.formula || sku;
    displayNameCache[sku] = found;
    return found;
  }

  function productOf(sku) { return productMap[sku]; }
  function customerOf(id) { return customerMap[id]; }
  function orderOf(doc) { return orderMap[doc] || null; }
  function orderTotal(o) { return (o.items || []).reduce((s, i) => s + (i.total || (i.qty * i.price) || 0), 0); }
  function orderQty(o) { return (o.items || []).reduce((s, i) => s + (i.qty || 0), 0); }
  function ordersOf(customerId) { return ordersByCustomer[customerId] || []; }
  function mainOf(sku) {
    const m = String(sku || "").match(/^FG-[^-]+-(\d{2})-/);
    return m ? m[1] : null;
  }
  function ordersBySku(sku) {
    return orders.filter(o => o.items.some(i => i.sku === sku))
      .map(o => ({ ...o, items: o.items.filter(i => i.sku === sku) }));
  }
  function thb(n) { if (n == null || isNaN(n)) return "—"; return "฿" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function thbDec(n) { if (n == null || isNaN(n)) return "—"; return "฿" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function num(n) { if (n == null || isNaN(n)) return "—"; return Number(n).toLocaleString("en-US"); }
  function fmtDate(iso) {
    if (!iso) return "—";
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    return `${m[3]}/${m[2]}/${+m[1] + 543}`;
  }
  function dayDiff(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
  function lastOrderDate(customerId) { const o = ordersOf(customerId).sort((a,b) => b.date.localeCompare(a.date))[0]; return o ? o.date : null; }
  function customerLifetimeValue(customerId) { return ordersOf(customerId).reduce((s, o) => s + orderTotal(o), 0); }

  function topProducts(n = 5) {
    const totals = {};
    for (const o of orders) for (const it of o.items) totals[it.sku] = (totals[it.sku] || 0) + (it.total || it.qty * it.price || 0);
    return Object.entries(totals).map(([sku, total]) => ({ sku, total, product: productOf(sku) })).sort((a, b) => b.total - a.total).slice(0, n);
  }
  function topCustomers(n = 5) {
    const totals = {};
    for (const o of orders) totals[o.customer] = (totals[o.customer] || 0) + orderTotal(o);
    return Object.entries(totals).map(([id, total]) => ({ id, total, customer: customerOf(id) })).sort((a, b) => b.total - a.total).slice(0, n);
  }
  function priceHistoryOf(sku) {
    if (priceHistoryCache[sku]) return priceHistoryCache[sku];
    const points = [];
    for (const o of orders) for (const it of o.items) if (it.sku === sku && it.price) points.push({ date: o.date, price: it.price, customer: o.customer, doc: o.doc });
    points.sort((a, b) => a.date.localeCompare(b.date));
    priceHistoryCache[sku] = points;
    return points;
  }
  function recentPriceChanges(n = 6) {
    const out = [];
    for (const p of products) {
      const h = priceHistoryOf(p.sku);
      if (h.length < 2) continue;
      let prev = h[0];
      for (let i = 1; i < h.length; i++) {
        if (h[i].price !== prev.price) { out.push({ sku: p.sku, date: h[i].date, oldPrice: prev.price, newPrice: h[i].price, product: p }); prev = h[i]; } else { prev = h[i]; }
      }
    }
    return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
  }
  function skusWithPriceHistory() { return products.filter(p => priceHistoryOf(p.sku).length >= 1).map(p => p.sku); }
  function inactiveCustomers(days = 60) {
    return customers.map(c => {
      const last = lastOrderDate(c.id);
      const ago = last ? dayDiff(last, today) : 9999;
      return { ...c, lastOrder: last, daysAgo: ago };
    }).filter(c => c.lastOrder && c.daysAgo >= days).sort((a, b) => b.daysAgo - a.daysAgo);
  }
  function customersOfSku(sku) {
    const map = {};
    for (const o of orders) for (const it of o.items) {
      if (it.sku !== sku) continue;
      if (!map[o.customer]) map[o.customer] = { id: o.customer, qty: 0, revenue: 0, count: 0, last: o.date, lastPrice: it.price };
      map[o.customer].qty += it.qty || 0;
      map[o.customer].revenue += it.total || (it.qty * it.price) || 0;
      map[o.customer].count += 1;
      if (o.date > map[o.customer].last) { map[o.customer].last = o.date; map[o.customer].lastPrice = it.price; }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }
  function recentActivity() {
    const out = [];
    for (const o of [...orders].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5)) {
      out.push({ when: o.date, msg: `สั่งซื้อ ${o.doc} จาก ${customerOf(o.customer)?.name || o.customerName}`, type: 'order' });
    }
    for (const pc of recentPriceChanges(3)) {
      const diff = ((pc.newPrice - pc.oldPrice) / pc.oldPrice) * 100;
      out.push({ when: pc.date, msg: `ราคา ${pc.sku} ${diff > 0 ? 'ขึ้น' : 'ลง'} ${Math.abs(diff).toFixed(1)}% (${thb(pc.oldPrice)} → ${thb(pc.newPrice)})`, type: 'price' });
    }
    return out.sort((a, b) => b.when.localeCompare(a.when)).slice(0, 8);
  }
  function reload(liveData) {
    lastUpdated = new Date();
    // Merge into current live state so partial tab loads don't wipe other tabs
    _apply({
      customers,
      products,
      orders,
      monthly,
      categories,
      mainNames,
      ...liveData,
    });
  }
  return {
    get customers() { return customers; },
    get products()  { return products;  },
    get orders()    { return orders;    },
    get monthly()   { return monthly;   },
    get categories(){ return categories;},
    get mainNames() { return mainNames; },
    productOf, customerOf, orderOf, orderTotal, orderQty, ordersOf, mainOf, ordersBySku,
    productDisplayName,
    thb, thbDec, num, dayDiff, lastOrderDate, customerLifetimeValue,
    fmtDate,
    topProducts, topCustomers, recentPriceChanges, inactiveCustomers, customersOfSku,
    priceHistoryOf, skusWithPriceHistory, recentActivity,
    reload,
    today,
    get lastUpdated() { return lastUpdated; },
  };
})();

export default MOCK;





