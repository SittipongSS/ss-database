import React from 'react'
import MOCK from '../lib/mock.js'
import { Icon } from './icons.jsx'
import { StatusBadge, BackToList, Pagination, SortTh } from './ui.jsx'

function OrdersList({ setRoute }) {
  const M = MOCK
  const [status, setStatus] = React.useState("all")
  const [q, setQ] = React.useState("")
  const [datePreset, setDatePreset] = React.useState("all")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(25)
  const [sort, setSort] = React.useState({ col: "date", dir: "desc" })

  const toggleSort = (col) => {
    const numCols = new Set(["date", "dueDate", "qty", "total"])
    setSort(s => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: numCols.has(col) ? "desc" : "asc" })
    setPage(1)
  }

  const statuses = ["all", "delivered", "shipped", "pending"]
  const labels = { all: "ทั้งหมด", delivered: "ส่งเรียบร้อย", shipped: "พร้อมส่ง", pending: "รอดำเนินการ" }

  function shiftDate(daysBack) {
    const d = new Date(M.today)
    d.setDate(d.getDate() - daysBack)
    return d.toISOString().slice(0, 10)
  }
  const presets = [
    { id: "all", label: "ทั้งหมด" },
    { id: "day", label: "รายวัน", from: M.today, to: M.today },
    { id: "week", label: "รายสัปดาห์", from: shiftDate(6) },
    { id: "month", label: "รายเดือน", from: shiftDate(29) },
    { id: "year", label: "รายปี", from: shiftDate(364) },
    { id: "custom", label: "กำหนดเอง" },
  ]

  const effective = React.useMemo(() => {
    if (datePreset === "custom") return { from: dateFrom || null, to: dateTo || null }
    const p = presets.find(x => x.id === datePreset)
    return { from: p?.from || null, to: p?.to || null }
  }, [datePreset, dateFrom, dateTo])

  const filtered = React.useMemo(() => {
    const f = M.orders.filter(o => {
      if (status !== "all" && o.status !== status) return false
      if (effective.from && o.date < effective.from) return false
      if (effective.to && o.date > effective.to) return false
      if (q) {
        const ql = q.toLowerCase()
        const c = M.customerOf(o.customer)
        const hay = [o.doc, o.customer, c?.short, c?.name, ...o.items.map(i => i.sku)]
          .filter(Boolean).join(" ").toLowerCase()
        if (!hay.includes(ql)) return false
      }
      return true
    })
    const mul = sort.dir === "asc" ? 1 : -1
    return [...f].sort((a, b) => {
      switch (sort.col) {
        case "doc":          return mul * (a.doc || "").localeCompare(b.doc || "")
        case "dueDate":      return mul * (a.dueDate || "").localeCompare(b.dueDate || "")
        case "customer":     return mul * (a.customer || "").localeCompare(b.customer || "")
        case "customerName": return mul * ((a.customerName || M.customerOf(a.customer)?.name || "").localeCompare(b.customerName || M.customerOf(b.customer)?.name || ""))
        case "qty":          return mul * (a.items.length - b.items.length)
        case "total":        return mul * (M.orderTotal(a) - M.orderTotal(b))
        case "status":       return mul * (a.status || "").localeCompare(b.status || "")
        default:             return mul * (a.date || "").localeCompare(b.date || "")
      }
    })
  }, [M.orders, M.customers, status, effective, q, sort])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">คำสั่งซื้อ · Orders</h1>
          <p className="page-sub">{M.num(M.orders.length)} เอกสารทั้งหมด · เรียงตามวันที่ล่าสุด</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
        </div>
      </div>

      <div className="table-wrap">
        <div className="toolbar">
          <div className="search-bar" style={{ maxWidth: 280, margin: 0 }}>
            <Icon name="search" className="icon-l" />
            <input placeholder="เลขเอกสาร · รหัส SKU · ลูกค้า…" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} />
          </div>
          {statuses.map(s => (
            <button key={s} className={"filter-chip " + (status === s ? "active" : "")} onClick={() => { setStatus(s); setPage(1) }}>
              {labels[s]}
            </button>
          ))}
          <div className="spacer" />
          <span className="dim mono" style={{ fontSize: 12 }}>{M.num(filtered.length)} / {M.num(M.orders.length)}</span>
        </div>

        <div className="toolbar" style={{ borderTop: "1px solid var(--border)" }}>
          <Icon name="calendar" className="ico" style={{ color: "var(--text-3)" }} />
          <span className="dim" style={{ fontSize: 12 }}>ช่วงวันที่:</span>
          {presets.map(p => (
            <button key={p.id} className={"filter-chip " + (datePreset === p.id ? "active" : "")} onClick={() => { setDatePreset(p.id); setPage(1) }}>
              {p.label}
            </button>
          ))}
          {datePreset === "custom" && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="date-input"
              />
              <span className="dim">ถึง</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="date-input"
              />
            </>
          )}
        </div>

        <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <SortTh col="doc" sort={sort} onSort={toggleSort}>เลขเอกสาร</SortTh>
              <SortTh col="date" sort={sort} onSort={toggleSort}>วันที่สั่ง</SortTh>
              <SortTh col="customer" sort={sort} onSort={toggleSort}>รหัสลูกค้า</SortTh>
              <SortTh col="customerName" sort={sort} onSort={toggleSort}>ชื่อลูกค้า</SortTh>
              <SortTh col="qty" sort={sort} onSort={toggleSort} className="num">จำนวน SKU</SortTh>
              <SortTh col="total" sort={sort} onSort={toggleSort} className="num">ยอดรวม</SortTh>
              <SortTh col="dueDate" sort={sort} onSort={toggleSort}>กำหนดส่ง</SortTh>
              <SortTh col="status" sort={sort} onSort={toggleSort}>สถานะ</SortTh>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8}><div className="empty">ไม่พบคำสั่งซื้อตามเงื่อนไข</div></td></tr>
            ) : filtered.slice((page - 1) * pageSize, page * pageSize).map((o, idx) => {
              const c = M.customerOf(o.customer)
              return (
                <tr key={o.doc + "|" + o.customer + "|" + idx} onClick={() => setRoute("orders:" + o.doc)}>
                  <td className="code">{o.doc}</td>
                  <td>{M.fmtDate(o.date)}</td>
                  <td className="code">{o.customer}</td>
                  <td style={{ maxWidth: 240 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c?.name || o.customerName || o.customer}</div>
                  </td>
                  <td className="num">{M.num(o.items.length)}</td>
                  <td className="num"><strong>{M.thb(M.orderTotal(o))}</strong></td>
                  <td>{o.dueDate ? M.fmtDate(o.dueDate) : <span className="dim">—</span>}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        <Pagination
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </div>
    </div>
  )
}

function InvoiceDetail({ doc, setRoute, goBack, canGoBack }) {
  const M = MOCK
  const order = M.orderOf(doc)
  if (!order) return <div className="page"><div className="empty">ไม่พบเอกสาร {doc}</div></div>
  const c = M.customerOf(order.customer)
  const subtotal = M.orderTotal(order)
  const vat = subtotal * 0.07
  const total = subtotal + vat

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 12, justifyContent: "space-between" }}>
        {canGoBack ? (
          <span style={{ cursor: "pointer", color: "var(--text-2)", fontSize: 13 }} onClick={goBack}>
            ← ย้อนกลับ
          </span>
        ) : <span />}
        <div className="row" style={{ gap: 8 }}>
        </div>
      </div>

      <div className="invoice">
        <div className="invoice-head">
          <div>
            <h1>คำสั่งซื้อ / Sales Order</h1>
            <div className="mono dim" style={{ fontSize: 13, marginTop: 4 }}>{order.doc}</div>
            <div style={{ marginTop: 14 }}><StatusBadge status={order.status} /></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>Scent And Sense Laboratory Co., Ltd.</div>
            <div className="dim" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>
              2/4 Soi Phetkasem 35/1, Phetkasem Road,<br/>Bang Wa, Phasi Charoen, Bangkok 10160
            </div>
          </div>
        </div>

        <div className="invoice-meta">
          <div>
            <div className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>ลูกค้า · Customer</div>
            <div style={{ fontWeight: 600 }}>{c?.name}</div>
            <div className="dim mono" style={{ fontSize: 12, marginTop: 2, cursor: "pointer" }} onClick={() => setRoute("customers:" + c.id)}>{c?.id}</div>
            <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.55 }}>
              {c?.taxId && <>เลขประจำตัวผู้เสียภาษี: {c.taxId}<br/></>}
              {c?.contact}<br/>
              {c?.email}<br/>
              {c?.phone}
            </div>
          </div>
          <div>
            <div className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>วันที่ · Date</div>
            <div style={{ fontWeight: 600 }}>{M.fmtDate(order.date)}</div>
            <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>วันกำหนดส่ง · Due Date</div>
            <div style={{ fontSize: 12 }}>{order.dueDate ? M.fmtDate(order.dueDate) : "—"}</div>
          </div>
          <div>
            <div className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>ยอดรวม · Total</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{M.thb(total)}</div>
            <div className="dim" style={{ fontSize: 12 }}>รวม VAT 7%</div>
          </div>
        </div>

        <div className="invoice-tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>รหัส SKU</th>
              <th>รายการสินค้า</th>
              <th className="num">จำนวน</th>
              <th>หน่วย</th>
              <th className="num">ราคา/หน่วย</th>
              <th className="num">รวม</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => {
              const p = M.productOf(it.sku)
              return (
                <tr key={i} onClick={() => setRoute("products:" + it.sku)}>
                  <td className="dim">{i + 1}</td>
                  <td className="code">{it.sku}</td>
                  <td>
                    <div>{it.desc || p?.name || p?.formula || it.sku}</div>
                  </td>
                  <td className="num">{M.num(it.qty)}</td>
                  <td className="dim">{p?.uom}</td>
                  <td className="num mono">{M.thbDec(it.price)}</td>
                  <td className="num"><strong>{M.thb(it.qty * it.price)}</strong></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <div className="invoice-totals">
            <div className="row-between" style={{ padding: "6px 0", fontSize: 13 }}>
              <span className="muted">Subtotal</span>
              <span className="mono">{M.thb(subtotal)}</span>
            </div>
            <div className="row-between" style={{ padding: "6px 0", fontSize: 13 }}>
              <span className="muted">VAT 7%</span>
              <span className="mono">{M.thb(vat)}</span>
            </div>
            <hr className="hr" style={{ margin: "8px 0" }} />
            <div className="row-between" style={{ padding: "6px 0", fontSize: 16, fontWeight: 600 }}>
              <span>ยอดรวมสุทธิ</span>
              <span className="mono">{M.thb(total)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 36, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
        </div>
      </div>

      <BackToList setRoute={setRoute} target="orders" label="กลับไปยังคำสั่งซื้อทั้งหมด" />
    </div>
  )
}

export { OrdersList, InvoiceDetail }
