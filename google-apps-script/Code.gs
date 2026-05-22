/**
 * SS Database — Google Apps Script Web App
 * อ่านข้อมูลจาก 4 sheets:
 *   1_ลูกค้า  2_สินค้า  3_ออเดอร์  4_รายการสินค้า
 *
 * ?sheet=customers | products | orders | all (default)
 */

// ── Header map ───────────────────────────────────────────────
// แตก header เป็น token ย่อยด้วย space เพื่อ match ได้แม้ header เป็น
// แบบผสม เช่น "เลขเอกสาร doc", "รหัส SKU sku", "ยอดรวม total (=qty*price)"

function buildHeaderMap(headerRow) {
  var map = {};
  for (var i = 0; i < headerRow.length; i++) {
    var h = String(headerRow[i] || '').trim().toLowerCase();
    if (!h) continue;
    if (map[h] === undefined) map[h] = i;          // full header
    h.split(/[\s()=*]+/).forEach(function(tok) {   // each token
      tok = tok.trim();
      if (tok.length > 1 && map[tok] === undefined) map[tok] = i;
    });
  }
  return map;
}

function col(map /*, ...candidates */) {
  for (var i = 1; i < arguments.length; i++) {
    var c = String(arguments[i]).toLowerCase().trim();
    if (map[c] !== undefined) return map[c];
  }
  return -1;
}

function str(row, idx)       { return idx >= 0 ? String(row[idx] || '').trim() : ''; }
function num(row, idx)       { return idx >= 0 ? (Number(row[idx]) || 0) : 0; }
function numOrNull(row, idx) {
  if (idx < 0) return null;
  var v = Number(row[idx]);
  return (isNaN(v) || v === 0) ? null : v;
}

// ── Date formatter ───────────────────────────────────────────
// รองรับ: Date object, YYYY-MM-DD, DD/MM/YYYY, D/M/YYYY, D/M/YY

function fmtDate(v) {
  if (!v) return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  if (!s) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // D/M/YYYY or DD/MM/YYYY  (Thai style)
  var dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    var dd = dmy[1].padStart(2, '0');
    var mm = dmy[2].padStart(2, '0');
    return dmy[3] + '-' + mm + '-' + dd;
  }

  // D/M/YY
  var dmy2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (dmy2) {
    var yy = parseInt(dmy2[3], 10);
    var yyyy = yy < 70 ? 2000 + yy : 1900 + yy;
    return yyyy + '-' + dmy2[2].padStart(2, '0') + '-' + dmy2[1].padStart(2, '0');
  }

  var d = new Date(s);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
  return null;
}

// รองรับทั้งภาษาไทยและ English
function mapStatus(s) {
  if (!s) return 'pending';
  var t = String(s).trim().toLowerCase();
  if (t === 'delivered'   || t === 'ส่งเรียบร้อย') return 'delivered';
  if (t === 'shipped'     || t === 'พร้อมส่ง')    return 'shipped';
  if (t === 'cancelled'   || t === 'ยกเลิก')       return 'cancelled';
  return 'pending';
}

// ── Sheet reader ─────────────────────────────────────────────

function readSheet(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) { Logger.log('ไม่พบ sheet: ' + name); return null; }
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
  if (!data) return [];

  var m = buildHeaderMap(data.headers);
  var iId      = col(m, 'รหัสลูกค้า', 'รหัส ar', 'ar', 'id', 'customer id');
  var iName    = col(m, 'ชื่อบริษัท', 'บริษัท', 'ชื่อ', 'company', 'name');
  var iBrand   = col(m, 'แบรนด์', 'brand');
  var iContact = col(m, 'ผู้ติดต่อ', 'contact');
  var iPhone   = col(m, 'โทรศัพท์', 'เบอร์โทร', 'โทร', 'phone', 'tel');
  var iEmail   = col(m, 'อีเมล', 'อีเมล์', 'email');
  var iCity    = col(m, 'จังหวัด', 'city');
  var iAddr    = col(m, 'ที่อยู่', 'address');
  var iCredit  = col(m, 'เงื่อนไขการชำระ', 'เครดิต', 'credit term', 'credit', 'payment term');
  var iNote    = col(m, 'หมายเหตุ', 'note', 'remark');

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
  if (!data) return [];

  var m = buildHeaderMap(data.headers);
  var iSku     = col(m, 'รหัส sku', 'sku', 'รหัสสินค้า', 'รหัส');
  var iName    = col(m, 'ชื่อสินค้า', 'ชื่อ', 'name');
  var iFormula = col(m, 'ชื่อสูตร', 'สูตร', 'formula');
  var iBrand   = col(m, 'แบรนด์', 'brand');
  var iCat     = col(m, 'หมวดสินค้า', 'หมวด', 'ประเภท', 'category', 'type');
  var iUom     = col(m, 'หน่วยนับ', 'หน่วย', 'uom', 'unit');
  var iPrice   = col(m, 'ราคาขาย', 'ราคา', 'price');
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
  var od = readSheet(ss, '3_ออเดอร์');
  if (!od) return { orders: [], monthly: [] };

  var om = buildHeaderMap(od.headers);
  var oDoc  = col(om, 'เลขเอกสาร', 'doc', 'document', 'order no', 'เลขที่');
  var oDate = col(om, 'วันที่สั่ง', 'วันที่', 'date', 'order date');
  var oAR   = col(om, 'รหัสลูกค้า', 'รหัส ar', 'ar', 'customer id', 'customer');
  var oCustN= col(om, 'ชื่อบริษัท', 'ชื่อลูกค้า', 'บริษัท', 'customer name', 'company');
  var oDue  = col(om, 'วันกำหนดส่ง', 'กำหนดส่ง', 'due date', 'due', 'duedate');
  var oStat = col(om, 'สถานะ', 'status');
  var oNote = col(om, 'หมายเหตุ', 'note', 'remark');

  var ordersMap = {};
  od.rows.forEach(function(r) {
    var doc = str(r, oDoc);
    if (!doc) return;
    ordersMap[doc] = {
      doc:          doc,
      date:         fmtDate(oDate >= 0 ? r[oDate] : null),
      dueDate:      fmtDate(oDue  >= 0 ? r[oDue]  : null),
      customer:     str(r, oAR),
      customerName: str(r, oCustN),
      status:       mapStatus(str(r, oStat)),
      note:         str(r, oNote) || null,
      items:        [],
    };
  });

  // ── 4_รายการสินค้า ──
  var ld = readSheet(ss, '4_รายการสินค้า');
  var monthlyMap = {};

  if (ld) {
    var lm = buildHeaderMap(ld.headers);
    var lDoc   = col(lm, 'เลขเอกสาร', 'doc', 'document', 'order no', 'เลขที่');
    var lSku   = col(lm, 'sku', 'รหัส sku', 'รหัสสินค้า', 'รหัส');
    var lDesc  = col(lm, 'รายการสินค้า', 'desc', 'description', 'ชื่อสินค้า', 'ชื่อ');
    var lQty   = col(lm, 'qty', 'จำนวน', 'quantity');
    var lPrice = col(lm, 'price', 'ราคาต่อหน่วย', 'ราคา/หน่วย', 'ราคา', 'unit price');
    var lTotal = col(lm, 'total', 'ยอดรวม', 'มูลค่า', 'amount', 'รวม');
    var lNote  = col(lm, 'หมายเหตุ', 'note', 'remark');

    ld.rows.forEach(function(r) {
      var doc = str(r, lDoc);
      var sku = str(r, lSku);
      if (!doc || !sku) return;

      var qty   = num(r, lQty);
      var price = num(r, lPrice);
      var total = num(r, lTotal) || (qty * price);

      if (ordersMap[doc]) {
        ordersMap[doc].items.push({
          sku:   sku,
          desc:  str(r, lDesc)  || null,
          qty:   qty,
          price: price,
          total: total,
          note:  str(r, lNote)  || null,
        });

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

  var monthly = Object.keys(monthlyMap).sort().map(function(mo) {
    return { m: mo, rev: Math.round(monthlyMap[mo]) };
  });

  return { orders: orders, monthly: monthly };
}

// ── RAW_หมวดสินค้า ───────────────────────────────────────────
// โครงสร้าง SKU: FG-AAA-BB-CCC-DDDD
//   BB  = รหัสหมวดหลัก  → mainNames { "BB": "ชื่อหมวดหลัก" }
//   CCC = รหัสหมวดรอง   → subNames  { "CCC": "ชื่อหมวดรอง" }

function extractCategories(ss) {
  var data = readSheet(ss, 'RAW_หมวดสินค้า');
  if (!data) return { mainNames: {}, subNames: {} };

  var m = buildHeaderMap(data.headers);

  // หมวดหลัก (BB)
  var iMainCode = col(m, 'รหัสหมวดหลัก', 'รหัสหลัก', 'bb', 'main code', 'รหัส');
  var iMainName = col(m, 'ชื่อหมวดหลัก', 'หมวดหลัก', 'main name', 'main', 'ชื่อหมวด');

  // หมวดรอง (CCC)
  var iSubCode  = col(m, 'รหัสหมวดรอง', 'รหัสรอง', 'ccc', 'sub code', 'รหัสสินค้า');
  var iSubName  = col(m, 'ชื่อหมวดรอง', 'หมวดรอง', 'sub name', 'sub', 'ชื่อสินค้า');

  var mainNames = {}, subNames = {};
  data.rows.forEach(function(r) {
    var mainCode = str(r, iMainCode);
    var mainName = str(r, iMainName);
    if (mainCode && mainName && mainNames[mainCode] === undefined) {
      mainNames[mainCode] = mainName;
    }
    var subCode = str(r, iSubCode);
    var subName = str(r, iSubName);
    if (subCode && subName && subNames[subCode] === undefined) {
      subNames[subCode] = subName;
    }
  });

  return { mainNames: mainNames, subNames: subNames };
}

// ── doGet ────────────────────────────────────────────────────

function doGet(e) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var param = (e && e.parameter && e.parameter.sheet) || 'all';

    var cats = extractCategories(ss);
    if (param === 'customers') return json({ customers: extractCustomers(ss), mainNames: cats.mainNames, subNames: cats.subNames });
    if (param === 'products')  return json({ products:  extractProducts(ss),  mainNames: cats.mainNames, subNames: cats.subNames });
    if (param === 'orders') {
      var od = extractOrdersAndMonthly(ss);
      return json({ orders: od.orders, monthly: od.monthly, mainNames: cats.mainNames, subNames: cats.subNames });
    }
    var od2 = extractOrdersAndMonthly(ss);
    return json({
      customers: extractCustomers(ss),
      products:  extractProducts(ss),
      orders:    od2.orders,
      monthly:   od2.monthly,
      mainNames: cats.mainNames,
      subNames:  cats.subNames,
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
  ['1_ลูกค้า', '2_สินค้า', '3_ออเดอร์', '4_รายการสินค้า', 'RAW_หมวดสินค้า'].forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) { Logger.log(name + ': ไม่พบ'); return; }
    Logger.log('=== ' + name + ' rows=' + sh.getLastRow());
    var h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    Logger.log('headers: ' + JSON.stringify(h));
    if (sh.getLastRow() > 1) {
      var r2 = sh.getRange(2, 1, 1, sh.getLastColumn()).getValues()[0];
      Logger.log('row2: ' + JSON.stringify(r2));
      if (sh.getLastRow() > 2) {
        var r3 = sh.getRange(3, 1, 1, sh.getLastColumn()).getValues()[0];
        Logger.log('row3: ' + JSON.stringify(r3));
      }
    }
  });
}

function testExtract() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var c  = extractCustomers(ss);
  var p  = extractProducts(ss);
  var od = extractOrdersAndMonthly(ss);
  Logger.log('customers: ' + c.length);
  Logger.log('products:  ' + p.length);
  Logger.log('orders:    ' + od.orders.length);
  Logger.log('monthly:   ' + od.monthly.length);
  if (c.length)          Logger.log('customer[0]: ' + JSON.stringify(c[0]));
  if (p.length)          Logger.log('product[0]:  ' + JSON.stringify(p[0]));
  if (od.orders.length)  Logger.log('order[0]:    ' + JSON.stringify(od.orders[0]));
}
