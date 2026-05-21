/**
 * SS Database — Google Apps Script Web App
 *
 * วิธีใช้งาน / Setup:
 * 1. เปิด Google Sheet แล้วไปที่ Extensions → Apps Script
 * 2. วางโค้ดนี้ใน Code.gs แทนที่ของเดิม
 * 3. กด Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. คัดลอก Web app URL ไปใส่ใน .env.local ของโปรเจกต์:
 *    VITE_SHEETS_URL=https://script.google.com/macros/s/xxxxx/exec
 * 5. Deploy ใหม่บน Vercel (หรือ git push)
 *
 * โครงสร้าง Sheet ที่รองรับ:
 *   1_ลูกค้า        — id, name, brand, contact, phone, email, city, address, credit, note
 *   2_สินค้า        — sku, name, formula, brand, category, uom, price, note
 *   3_ออเดอร์       — doc, date, dueDate, customer, status, note
 *   4_รายการสินค้า  — doc, sku, desc, qty, price, total, note
 *
 * แต่ละ Sheet มี 2 แถว header (แถว 1 = ชื่อภาษาไทย, แถว 2 = ชื่อ field)
 * ข้อมูลเริ่มตั้งแต่แถวที่ 3
 */

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = buildData(ss);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function buildData(ss) {
  // Helper: parse sheet into array of objects, skipping 2 header rows
  function parseSheet(sheetName, fields) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow < 3) return [];
    const values = sheet.getRange(3, 1, lastRow - 2, fields.length).getValues();
    return values
      .filter(r => r[0] !== '' && r[0] !== null && r[0] !== undefined)
      .map(r => {
        const obj = {};
        fields.forEach((f, i) => {
          if (!f) return;
          let v = r[i];
          // Convert Date objects to ISO string (YYYY-MM-DD)
          if (v instanceof Date) {
            v = Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
          }
          obj[f] = (v === '' || v === undefined) ? null : v;
        });
        return obj;
      });
  }

  // ---- 1. Customers ----
  const customers = parseSheet('1_ลูกค้า',
    ['id', 'name', 'brand', 'contact', 'phone', 'email', 'city', 'address', 'credit', 'note']);

  // ---- 2. Products ----
  const products = parseSheet('2_สินค้า',
    ['sku', 'name', 'formula', 'brand', 'category', 'uom', 'price', 'note']);
  products.forEach(p => { p.price = Number(p.price) || 0; });

  // ---- 3. Order headers ----
  const orderHeaders = parseSheet('3_ออเดอร์',
    ['doc', 'date', 'dueDate', 'customer', 'status', 'note']);

  // ---- 4. Order line items ----
  const lineItems = parseSheet('4_รายการสินค้า',
    ['doc', 'sku', 'desc', 'qty', 'price', 'total', 'note']);
  lineItems.forEach(i => {
    i.qty   = Number(i.qty)   || 0;
    i.price = Number(i.price) || 0;
    i.total = Number(i.total) || (i.qty * i.price);
  });

  // Group line items by order doc
  const itemsByDoc = {};
  lineItems.forEach(i => {
    if (!itemsByDoc[i.doc]) itemsByDoc[i.doc] = [];
    itemsByDoc[i.doc].push({ sku: i.sku, desc: i.desc || i.sku, qty: i.qty, price: i.price, total: i.total });
  });

  // Customer lookup for customerName
  const customerMap = {};
  customers.forEach(c => { customerMap[c.id] = c; });

  // Assemble orders with embedded items array
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

  // Sort orders newest first
  orders.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  // Calculate monthly revenue from orders (for dashboard charts)
  const monthlyMap = {};
  orders.forEach(o => {
    const m = String(o.date || '').slice(0, 7);
    if (m.length < 7) return;
    const rev = (o.items || []).reduce((s, i) => s + (i.total || 0), 0);
    monthlyMap[m] = (monthlyMap[m] || 0) + rev;
  });
  const monthly = Object.entries(monthlyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([m, rev]) => ({ m, rev }));

  return { customers, products, orders, monthly };
}
