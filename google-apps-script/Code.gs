/**
 * SS Database — Google Apps Script Web App
 * รองรับ ?sheet=customers | products | orders | all (default)
 */

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = (e && e.parameter && e.parameter.sheet) || 'all';
    let result;

    if (sheet === 'customers') {
      result = { customers: parseCustomers(ss) };
    } else if (sheet === 'products') {
      result = { products: parseProducts(ss) };
    } else if (sheet === 'orders') {
      const { orders, monthly } = parseOrders(ss, parseCustomers(ss));
      result = { orders, monthly };
    } else {
      result = buildAll(ss);
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Parsers ────────────────────────────────────────────────

function parseSheet(ss, sheetName, fields) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  return sheet.getRange(3, 1, lastRow - 2, fields.length).getValues()
    .filter(r => r[0] !== '' && r[0] !== null)
    .map(r => {
      const obj = {};
      fields.forEach((f, i) => {
        if (!f) return;
        let v = r[i];
        if (v instanceof Date) v = Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
        obj[f] = (v === '' || v === undefined) ? null : v;
      });
      return obj;
    });
}

function parseCustomers(ss) {
  return parseSheet(ss, '1_ลูกค้า',
    ['id','name','brand','contact','phone','email','city','address','credit','note']);
}

function parseProducts(ss) {
  const products = parseSheet(ss, '2_สินค้า',
    ['sku','name','formula','brand','category','uom','price','note']);
  products.forEach(p => { p.price = Number(p.price) || 0; });
  return products;
}

function parseOrders(ss, customers) {
  const customerMap = {};
  (customers || []).forEach(c => { customerMap[c.id] = c; });

  const orderHeaders = parseSheet(ss, '3_ออเดอร์',
    ['doc','date','dueDate','customer','status','note']);

  const lineItems = parseSheet(ss, '4_รายการสินค้า',
    ['doc','sku','desc','qty','price','total','note']);
  lineItems.forEach(i => {
    i.qty   = Number(i.qty)   || 0;
    i.price = Number(i.price) || 0;
    i.total = Number(i.total) || (i.qty * i.price);
  });

  const itemsByDoc = {};
  lineItems.forEach(i => {
    if (!itemsByDoc[i.doc]) itemsByDoc[i.doc] = [];
    itemsByDoc[i.doc].push({ sku: i.sku, desc: i.desc || i.sku, qty: i.qty, price: i.price, total: i.total });
  });

  const orders = orderHeaders.map(o => ({
    doc:          o.doc,
    date:         o.date,
    dueDate:      o.dueDate || null,
    customer:     o.customer,
    customerName: (customerMap[o.customer] || {}).name || o.customer,
    status:       o.status,
    note:         o.note || null,
    items:        itemsByDoc[o.doc] || [],
  }));
  orders.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const monthlyMap = {};
  orders.forEach(o => {
    const m = String(o.date || '').slice(0, 7);
    if (m.length < 7) return;
    const rev = (o.items || []).reduce((s, i) => s + (i.total || 0), 0);
    monthlyMap[m] = (monthlyMap[m] || 0) + rev;
  });
  const monthly = Object.entries(monthlyMap).sort().map(([m, rev]) => ({ m, rev }));

  return { orders, monthly };
}

function buildAll(ss) {
  const customers = parseCustomers(ss);
  const products  = parseProducts(ss);
  const { orders, monthly } = parseOrders(ss, customers);
  return { customers, products, orders, monthly };
}
