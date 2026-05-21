// Run extraction then patch mock.js with real data
const XLSX = require('../node_modules/xlsx')
const fs = require('fs')
const path = require('path')

const XL_FILE = 'C:\\Users\\sitti\\Downloads\\Key Account Team (1).xlsx'
const MOCK_FILE = path.join(__dirname, '..', 'src', 'lib', 'mock.js')

const statusMap = (s) => {
  if (!s) return 'pending'
  const t = String(s).trim()
  if (t === 'ส่งเรียบร้อย') return 'delivered'
  if (t === 'พร้อมส่ง') return 'shipped'
  return 'pending'
}
function xlDateToISO(v) {
  if (!v) return null
  if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) return v.slice(0, 10)
  if (typeof v === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000)
    return d.toISOString().slice(0, 10)
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return null
}

const wb = XLSX.readFile(XL_FILE, { cellDates: false, raw: true })
const ws = wb.Sheets['รายการสั่งผลิต']
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })

const C = { AR: 1, COMPANY: 2, BRAND: 3, DOC: 4, SKU: 5, DATE: 6, CAT: 7, FORMULA: 8, DESC: 9, VOL: 10, QTY: 11, PRICE: 12, TOTAL: 13, DUE: 14, STATUS: 16 }

const customersMap = {}
const productsMap = {}
const ordersMap = {}
const monthlyMap = {}

for (let i = 3; i < rows.length; i++) {
  const r = rows[i]
  if (!r || !r[C.DOC] || !r[C.SKU]) continue

  const customerId = String(r[C.AR] || '').trim()
  const companyName = String(r[C.COMPANY] || '').trim()
  const brand = String(r[C.BRAND] || '').trim()
  const doc = String(r[C.DOC] || '').trim()
  const sku = String(r[C.SKU] || '').trim()
  const orderDate = xlDateToISO(r[C.DATE])
  const dueDate = xlDateToISO(r[C.DUE])
  const category = String(r[C.CAT] || '').trim()
  const formula = String(r[C.FORMULA] || '').trim()
  const desc = String(r[C.DESC] || '').trim()
  const vol = r[C.VOL] ? Number(r[C.VOL]) : null
  const qty = r[C.QTY] ? Number(r[C.QTY]) : 0
  const price = r[C.PRICE] ? Number(r[C.PRICE]) : 0
  const total = r[C.TOTAL] ? Number(r[C.TOTAL]) : qty * price
  const status = statusMap(r[C.STATUS])

  if (customerId && !customersMap[customerId]) {
    customersMap[customerId] = { id: customerId, name: companyName, brand, contact: null, phone: null, email: null, city: null, address: null, credit: null, note: null }
  }
  if (sku) {
    if (!productsMap[sku]) {
      productsMap[sku] = { sku, name: desc || formula || sku, formula: formula || null, brand: brand || null, category: category || null, uom: 'PC', price, note: null }
    } else {
      productsMap[sku].price = price || productsMap[sku].price
      if (desc && !productsMap[sku].name) productsMap[sku].name = desc
    }
  }
  if (!ordersMap[doc]) {
    ordersMap[doc] = { doc, date: orderDate, dueDate, customer: customerId, customerName: companyName, status, note: null, items: [] }
  }
  ordersMap[doc].items.push({ sku, type: category || null, formula: formula || null, desc: desc || null, vol, qty, price, total, actualShip: null, note: null })
  if (orderDate) {
    const m = orderDate.slice(0, 7)
    monthlyMap[m] = (monthlyMap[m] || 0) + total
  }
}

const orders = Object.values(ordersMap).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
const customers = Object.values(customersMap).sort((a, b) => a.id.localeCompare(b.id))
const products = Object.values(productsMap).sort((a, b) => a.sku.localeCompare(b.sku))
const monthly = Object.entries(monthlyMap).map(([m, rev]) => ({ m, rev: Math.round(rev) })).sort((a, b) => a.m.localeCompare(b.m))

console.error(`Extracted: ${customers.length} customers, ${products.length} products, ${orders.length} orders, ${monthly.length} months`)

// Read mock.js
let src = fs.readFileSync(MOCK_FILE, 'utf8')

// Find and parse the existing RAW object to preserve categories + mainNames
const rawMatch = src.match(/const RAW = (\{[\s\S]*?\});/)
if (!rawMatch) throw new Error('Could not find RAW object in mock.js')
const existingRaw = eval('(' + rawMatch[1] + ')')
const { categories, mainNames } = existingRaw

// Build new RAW with real data
const newRaw = { customers, products, orders, monthly, categories, mainNames }
const newRawStr = 'const RAW = ' + JSON.stringify(newRaw) + ';'

// Replace the RAW definition
src = src.replace(/const RAW = \{[\s\S]*?\};/, newRawStr)

// Remove the 4 clearing lines
src = src.replace(/\s*\/\/ Clear transactional data[^\n]*\n/, '\n')
src = src.replace(/\s*RAW\.customers = \[\];\n/, '')
src = src.replace(/\s*RAW\.products\s*= \[\];\n/, '')
src = src.replace(/\s*RAW\.orders\s*= \[\];\n/, '')
src = src.replace(/\s*RAW\.monthly\s*= \[\];\n/, '')

fs.writeFileSync(MOCK_FILE, src, 'utf8')
console.error('mock.js updated successfully')
