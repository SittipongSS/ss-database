/**
 * SS Database — Google Apps Script Web App
 * อ่านข้อมูลจาก 4 sheets ที่ process แล้ว:
 *   1_ลูกค้า  2_สินค้า  3_ออเดอร์  4_รายการสินค้า
 *
 * รองรับ ?sheet=customers | products | orders | all (default)
 */

// ── Column finder helpers ────────────────────────────────────

/**
 * สร้าง map จาก header row → index (0-based)
 * lowercase + trim เพื่อให้ match แบบ case-insensitive
 */
function buildHeaderMap(headerRow) {
  var map = {};
  for (var i = 0; i < headerRow.length; i++) {
    var h = String(headerRow[i] || '').trim().toLowerCase();
    if (h) map[h] = i;
  }
  return map;
}

/**
 * หา index ของ column จากชื่อที่เป็นไปได้หลายชื่อ
 * คืน -1 ถ้าไม่พบ
 */
function col(map /*, ...candidates */) {
  for (var i = 1; i < arguments.length; i++) {
    var c = String(arguments[i]).toLowerCase();
    if (map[c] !== undefined) return map[c];
  }
  return -1;
}

function str(row, idx) {
  return idx >= 0 ? String(row[idx] || '').trim() : '';
}
function num(row, idx) {
  return idx >= 0 ? (Number(row[idx]) || 0) : 0;
}
function numOrNull(row, idx) {
  if (idx < 0) return null;
  var v = Number(row[idx]);
  return isNaN(v) || v === 0 ? null : v;
}

// ── Date formatter ───────────────────────────────────────────

function fmtDate(v) {
  if (!v) return null;
  var d;
  if (v instanceof Date) {
    d = v;
  } else {
    var s = String(v).trim();
    if (!s) return null;
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

// ── Sheet readers ────────────────────────────────────────────

function readSheet(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) return null;
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return { headers: [], rows: [] };
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var rows    = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return { headers: headers, rows: rows };
}

// ── 1_ลูกค้า ─────────────────────────────────────────────────

function extractCustomers(ss) {
  var data = readSheet(ss, '1_ลูกค้า');
  if (!data) { Logger.log('ไม่พบ sheet 1_ลูกค้า'); return []; }

  var m = buildHeaderMap(data.headers);
  var iId      = col(m, 'รหัส ar', 'รหัสลูกค้า', 'รหัส', 'ar', 'id', 'customer id', 'ar code');
  var iName    = col(m, 'ชื่อบริษัท', 'บริษัท', 'ชื่อ', 'company', 'name');
  var iBrand   = col(m, 'แบรนด์', 'brand');
  var iContact = col(m, 'ผู้ติดต่อ', 'contact', 'ชื่อผู้ติดต่อ');
  var iPhone   = col(m, 'โทรศัพท์', 'เบอร์โทร', 'โทร', 'phone', 'tel', 'mobile');
  var iEmail   = col(m, 'อีเมล', 'อีเมล์', 'email', 'e-mail');
  var iCity    = col(m, 'จังหวัด', 'city', 'เมือง');
  var iAddr    = col(m, 'ที่อยู่', 'address', 'addr');
  var iCredit  = col(m, 'เครดิต', 'credit', 'credit term', 'เครดิต (วัน)');
  var iNote    = col(m, 'หมายเหตุ', 'note', 'remark', 'notes');

  var customers = [];
  data.rows.forEach(function(r) {
    var id = str(r, iId);
    if (!id) return;
    customers.push({
      id:      id,
      name:    str(r, iName),
      brand:   str(r, iBrand)   || null,
      contact: str(r, iContact) || null,
      phone:   str(r, iPhone)   || null,
      email:   str(r, iEmail)   || null,
      city:    str(r, iCity)    || null,
      address: str(r, iAddr)    || null,
      credit:  str(r, iCredit)  || null,
      note:    str(r, iNote)    || null,
    });
  });

  customers.sort(function(a, b) { return a.id.localeCompare(b.id); });
  return customers;
}

// ── 2_สินค้า ─────────────────────────────────────────────────

function extractProducts(ss) {
  var data = readSheet(ss, '2_สินค้า');
  if (!data) { Logger.log('ไม่พบ sheet 2_สินค้า'); return []; }

  var m = buildHeaderMap(data.headers);
  var iSku     = col(m, 'รหัส sku', 'sku', 'รหัสสินค้า', 'รหัส', 'product id', 'item code');
  var iName    = col(m, 'ชื่อสินค้า', 'ชื่อ', 'name', 'product name');
  var iFormula = col(m, 'ชื่อสูตร', 'สูตร', 'formula', 'formula name');
  var iBrand   = col(m, 'แบรนด์', 'brand');
  var iCat     = col(m, 'ประเภท', 'หมวด', 'หมวดสินค้า', 'category', 'type');
  var iUom     = col(m, 'หน่วย', 'uom', 'unit');
  var iPrice   = col(m, 'ราคา', 'price', 'ราคาขาย', 'unit price');
  var iNote    = col(m, 'หมายเหตุ', 'note', 'remark');

  var products = [];
  data.rows.forEach(function(r) {
    var sku = str(r, iSku);
    if (!sku) return;
    products.push({
      sku:      sku,
      name:     str(r, iName)    || str(r, iFormula) || sku,
      formula:  str(r, iFormula) || null,
      brand:    str(r, iBrand)   || null,
      category: str(r, iCat)     || null,
      uom:      str(r, iUom)     || 'PC',
      price:    num(r, iPrice),
      note:     str(r, iNote)    || null,
    });
  });

  products.sort(function(a, b) { return a.sku.localeCompare(b.sku); });
  return products;
}

// ── 3_ออเดอร์ + 4_รายการสินค้า ──────────────────────────────

function extractOrdersAndMonthly(ss) {
  // ── Orders header ──
  var od = readSheet(ss, '3_ออเดอร์');
  if (!od) { Logger.log('ไม่พบ sheet 3_ออเดอร์'); return { orders: [], monthly: [] }; }

  var om = buildHeaderMap(od.headers);
  var oDoc      = col(om, 'เลขเอกสาร', 'เอกสาร', 'doc', 'document', 'order no', 'เลขที่');
  var oDate     = col(om, 'วันที่สั่ง', 'วันที่', 'date', 'order date');
  var oAR       = col(om, 'รหัส ar', 'รหัสลูกค้า', 'รหัส', 'ar', 'customer id', 'ar code', 'customer');
  var oCustName = col(om, 'ชื่อบริษัท', 'ชื่อลูกค้า', 'บริษัท', 'customer name', 'company');
  var oDue      = col(om, 'กำหนดส่ง', 'due date', 'due', 'วันกำหนดส่ง');
  var oStatus   = col(om, 'สถานะ', 'status');
  var oNote     = col(om, 'หมายเหตุ', 'note', 'remark');

  var ordersMap = {};
  od.rows.forEach(function(r) {
    var doc = str(r, oDoc);
    if (!doc) return;
    ordersMap[doc] = {
      doc:          doc,
      date:         fmtDate(r[oDate] !== undefined ? r[oDate] : null),
      dueDate:      fmtDate(r[oDue]  !== undefined ? r[oDue]  : null),
      customer:     str(r, oAR),
      customerName: str(r, oCustName),
      status:       mapStatus(str(r, oStatus)),
      note:         str(r, oNote) || null,
      items:        [],
    };
  });

  // ── Line items ──
  var ld = readSheet(ss, '4_รายการสินค้า');
  if (!ld) { Logger.log('ไม่พบ sheet 4_รายการสินค้า'); }

  var monthlyMap = {};

  if (ld) {
    var lm = buildHeaderMap(ld.headers);
    var lDoc     = col(lm, 'เลขเอกสาร', 'เอกสาร', 'doc', 'document', 'order no', 'เลขที่');
    var lSku     = col(lm, 'รหัส sku', 'sku', 'รหัสสินค้า', 'รหัส', 'item code');
    var lType    = col(lm, 'ประเภท', 'type', 'category', 'หมวด');
    var lFormula = col(lm, 'ชื่อสูตร', 'สูตร', 'formula');
    var lDesc    = col(lm, 'รายละเอียด', 'description', 'desc', 'ชื่อสินค้า');
    var lVol     = col(lm, 'ปริมาตร', 'volume', 'vol');
    var lQty     = col(lm, 'จำนวน', 'qty', 'quantity');
    var lPrice   = col(lm, 'ราคา/หน่วย', 'ราคา', 'price', 'unit price');
    var lTotal   = col(lm, 'มูลค่า', 'total', 'amount', 'รวม', 'ยอด');
    var lNote    = col(lm, 'หมายเหตุ', 'note', 'remark');

    ld.rows.forEach(function(r) {
      var doc = str(r, lDoc);
      var sku = str(r, lSku);
      if (!doc || !sku) return;

      var qty   = num(r, lQty);
      var price = num(r, lPrice);
      var total = num(r, lTotal) || (qty * price);

      if (ordersMap[doc]) {
        ordersMap[doc].items.push({
          sku:     sku,
          type:    str(r, lType)    || null,
          formula: str(r, lFormula) || null,
          desc:    str(r, lDesc)    || null,
          vol:     numOrNull(r, lVol),
          qty:     qty,
          price:   price,
          total:   total,
          note:    str(r, lNote)    || null,
        });

        // monthly revenue จาก order date
        var orderDate = ordersMap[doc].date;
        if (orderDate && orderDate.length >= 7) {
          var mo = orderDate.slice(0, 7);
          monthlyMap[mo] = (monthlyMap[mo] || 0) + total;
        }
      }
    });
  }

  var orders = Object.keys(ordersMap).map(function(k) { return ordersMap[k]; });
  orders.sort(function(a, b) {
    return String(b.date || '').localeCompare(String(a.date || ''));
  });

  var monthKeys = Object.keys(monthlyMap).sort();
  var monthly = monthKeys.map(function(mo) {
    return { m: mo, rev: Math.round(monthlyMap[mo]) };
  });

  return { orders: orders, monthly: monthly };
}

// ── doGet ────────────────────────────────────────────────────

function doGet(e) {
  try {
    var ss         = SpreadsheetApp.getActiveSpreadsheet();
    var sheetParam = (e && e.parameter && e.parameter.sheet) || 'all';

    if (sheetParam === 'customers') {
      return json({ customers: extractCustomers(ss) });
    }
    if (sheetParam === 'products') {
      return json({ products: extractProducts(ss) });
    }
    if (sheetParam === 'orders') {
      var od = extractOrdersAndMonthly(ss);
      return json({ orders: od.orders, monthly: od.monthly });
    }

    // all
    var od2 = extractOrdersAndMonthly(ss);
    return json({
      customers: extractCustomers(ss),
      products:  extractProducts(ss),
      orders:    od2.orders,
      monthly:   od2.monthly,
    });
  } catch (err) {
    return json({ error: err.message });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Debug ────────────────────────────────────────────────────

function testSheetHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ['1_ลูกค้า', '2_สินค้า', '3_ออเดอร์', '4_รายการสินค้า'].forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) { Logger.log(name + ': ไม่พบ sheet'); return; }
    var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
    Logger.log('=== ' + name + ' === rows=' + lastRow + ' cols=' + lastCol);
    if (lastRow > 0) {
      var rows = sh.getRange(1, 1, Math.min(3, lastRow), lastCol).getValues();
      rows.forEach(function(r, i) { Logger.log('row' + (i+1) + ': ' + JSON.stringify(r)); });
    }
  });
}

function testExtract() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var c = extractCustomers(ss);
  var p = extractProducts(ss);
  var od = extractOrdersAndMonthly(ss);
  Logger.log('customers: ' + c.length);
  Logger.log('products:  ' + p.length);
  Logger.log('orders:    ' + od.orders.length);
  Logger.log('monthly:   ' + od.monthly.length);
  if (c.length)  Logger.log('customer[0]: ' + JSON.stringify(c[0]));
  if (p.length)  Logger.log('product[0]:  ' + JSON.stringify(p[0]));
  if (od.orders.length) Logger.log('order[0]:    ' + JSON.stringify(od.orders[0]));
}
