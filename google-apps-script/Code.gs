/**
 * SS Database — Google Apps Script Web App
 * อ่านข้อมูลจากชีต "รายการสั่งผลิต" (denormalized)
 * รองรับ ?sheet=customers | products | orders | all (default)
 *
 * โครงสร้างชีต:
 *   Row 1 = หัวข้อกลุ่ม  Row 2 = หัวข้อย่อย  Row 3 = ชื่อฟิลด์  Row 4+ = ข้อมูล
 *   B=รหัส AR  C=ชื่อบริษัท  D=แบรนด์  E=เลขเอกสาร  F=SKU
 *   G=วันที่สั่ง  H=ประเภทสินค้า  I=ชื่อสูตร  J=รายละเอียด
 *   K=ปริมาตร  L=จำนวน  M=ราคา/หน่วย  N=มูลค่า  O=กำหนดส่ง  Q=สถานะ
 */

var SHEET_NAME = 'รายการสั่งผลิต';
var DATA_START_ROW = 4;   // row 4 = first data row
var NUM_COLS = 17;         // A–Q

// Column positions (1-indexed for Apps Script getRange)
var COL = {
  AR:      2,   // B
  COMPANY: 3,   // C
  BRAND:   4,   // D
  DOC:     5,   // E
  SKU:     6,   // F
  DATE:    7,   // G
  CAT:     8,   // H
  FORMULA: 9,   // I
  DESC:    10,  // J
  VOL:     11,  // K
  QTY:     12,  // L
  PRICE:   13,  // M
  TOTAL:   14,  // N
  DUE:     15,  // O
  STATUS:  17   // Q
};

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetParam = (e && e.parameter && e.parameter.sheet) || 'all';
    var allData = extractAllData(ss);
    var result;

    if (sheetParam === 'customers') {
      result = { customers: allData.customers };
    } else if (sheetParam === 'products') {
      result = { products: allData.products };
    } else if (sheetParam === 'orders') {
      result = { orders: allData.orders, monthly: allData.monthly };
    } else {
      result = allData;
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

// ── Helpers ─────────────────────────────────────────────────

function fmtDate(v) {
  if (!v) return null;
  var d;
  if (v instanceof Date) {
    d = v;
  } else {
    var s = String(v).trim();
    if (!s) return null;
    // Try YYYY-MM-DD directly
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    d = new Date(s);
    if (isNaN(d.getTime())) return null;
  }
  return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
}

function mapStatus(s) {
  if (!s) return 'pending';
  var t = String(s).trim();
  if (t === 'ส่งเรียบร้อย') return 'delivered';
  if (t === 'พร้อมส่ง')    return 'shipped';
  return 'pending';
}

// ── Main extractor ───────────────────────────────────────────

function extractAllData(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบชีต "' + SHEET_NAME + '"');

  var lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) {
    return { customers: [], products: [], orders: [], monthly: [] };
  }

  var numRows = lastRow - DATA_START_ROW + 1;
  var values  = sheet.getRange(DATA_START_ROW, 1, numRows, NUM_COLS).getValues();

  var customersMap = {};
  var productsMap  = {};
  var ordersMap    = {};
  var monthlyMap   = {};

  for (var i = 0; i < values.length; i++) {
    var r = values[i];

    var customerId  = String(r[COL.AR - 1]      || '').trim();
    var companyName = String(r[COL.COMPANY - 1] || '').trim();
    var brand       = String(r[COL.BRAND - 1]   || '').trim();
    var doc         = String(r[COL.DOC - 1]     || '').trim();
    var sku         = String(r[COL.SKU - 1]     || '').trim();

    if (!doc || !sku) continue; // skip empty rows

    var orderDate = fmtDate(r[COL.DATE - 1]);
    var dueDate   = fmtDate(r[COL.DUE - 1]);
    var category  = String(r[COL.CAT - 1]     || '').trim();
    var formula   = String(r[COL.FORMULA - 1] || '').trim();
    var desc      = String(r[COL.DESC - 1]    || '').trim();
    var vol       = r[COL.VOL - 1]   ? Number(r[COL.VOL - 1])   : null;
    var qty       = Number(r[COL.QTY - 1])   || 0;
    var price     = Number(r[COL.PRICE - 1]) || 0;
    var total     = Number(r[COL.TOTAL - 1]) || (qty * price);
    var status    = mapStatus(r[COL.STATUS - 1]);

    // ── Customers ──
    if (customerId && !customersMap[customerId]) {
      customersMap[customerId] = {
        id: customerId, name: companyName, brand: brand,
        contact: null, phone: null, email: null,
        city: null, address: null, credit: null, note: null
      };
    }

    // ── Products (last price seen = most recent row) ──
    if (sku) {
      if (!productsMap[sku]) {
        productsMap[sku] = {
          sku: sku,
          name: desc || formula || sku,
          formula: formula || null,
          brand: brand || null,
          category: category || null,
          uom: 'PC',
          price: price,
          note: null
        };
      } else {
        if (price) productsMap[sku].price = price;
        if (desc && !productsMap[sku].name) productsMap[sku].name = desc;
      }
    }

    // ── Orders ──
    if (!ordersMap[doc]) {
      ordersMap[doc] = {
        doc: doc, date: orderDate, dueDate: dueDate,
        customer: customerId, customerName: companyName,
        status: status, note: null, items: []
      };
    }
    ordersMap[doc].items.push({
      sku: sku, type: category || null,
      formula: formula || null, desc: desc || null,
      vol: vol, qty: qty, price: price, total: total,
      actualShip: null, note: null
    });

    // ── Monthly revenue ──
    if (orderDate && orderDate.length >= 7) {
      var m = orderDate.slice(0, 7);
      monthlyMap[m] = (monthlyMap[m] || 0) + total;
    }
  }

  // Sort orders newest-first
  var orders = Object.keys(ordersMap).map(function(k) { return ordersMap[k]; });
  orders.sort(function(a, b) {
    return String(b.date || '').localeCompare(String(a.date || ''));
  });

  var customers = Object.keys(customersMap).map(function(k) { return customersMap[k]; });
  customers.sort(function(a, b) { return a.id.localeCompare(b.id); });

  var products = Object.keys(productsMap).map(function(k) { return productsMap[k]; });
  products.sort(function(a, b) { return a.sku.localeCompare(b.sku); });

  var monthKeys = Object.keys(monthlyMap).sort();
  var monthly = monthKeys.map(function(m) {
    return { m: m, rev: Math.round(monthlyMap[m]) };
  });

  return { customers: customers, products: products, orders: orders, monthly: monthly };
}
