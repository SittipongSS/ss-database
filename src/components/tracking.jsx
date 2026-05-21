import React from 'react'
import MOCK from '../lib/mock.js'
import { Icon } from './icons.jsx'
import { LineChart } from './charts.jsx'
import { StatusBadge } from './ui.jsx'

function Tracking({ initialQuery, setRoute }) {
  const M = MOCK
  const [q, setQ] = React.useState(initialQuery || "")
  const [pivot, setPivot] = React.useState("all")

  const matches = React.useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return { products: [], customers: [], orders: [] }
    const products = M.products.filter(p =>
      (p.sku || "").toLowerCase().includes(query) ||
      (p.name || "").toLowerCase().includes(query) ||
      (p.category || "").toLowerCase().includes(query) ||
      (p.brand || "").toLowerCase().includes(query) ||
      (p.customerAR || "").toLowerCase().includes(query)
    )
    const customers = M.customers.filter(c =>
      (c.id || "").toLowerCase().includes(query) ||
      (c.name || "").toLowerCase().includes(query) ||
      (c.short || "").toLowerCase().includes(query) ||
      (c.brand || "").toLowerCase().includes(query) ||
      (c.contact || "").toLowerCase().includes(query) ||
      (c.city || "").toLowerCase().includes(query)
    )
    const orders = M.orders.filter(o =>
      (o.doc || "").toLowerCase().includes(query) ||
      (o.customer || "").toLowerCase().includes(query) ||
      o.items.some(i => (i.sku || "").toLowerCase().includes(query)) ||
      (M.customerOf(o.customer)?.short || "").toLowerCase().includes(query) ||
      (o.brand || "").toLowerCase().includes(query)
    )
    return { products, customers, orders }
  }, [q])

  const total = matches.products.length + matches.customers.length + matches.orders.length

  const examples = (() => {
    const firstSku = M.products.find(p => p.price)?.sku
    const firstAR = M.topCustomers(1)[0]?.id
    const firstDoc = M.orders[0]?.doc
    return [firstSku, firstAR, firstDoc, "BODY PERFUME", "Scent Studio", "AR-002"].filter(Boolean)
  })()

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">ค้นหา &amp; Tracking</h1>
          <p className="page-sub">ค้นหาจากรหัสสินค้า · เลขที่เอกสาร · รหัสลูกค้า หรือ ชื่อใด ๆ ในระบบ</p>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="search-bar" style={{ maxWidth: "100%", margin: 0 }}>
          <Icon name="search" className="icon-l" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="พิมพ์รหัสสินค้า เลขเอกสาร รหัสลูกค้า ชื่อ หรือกลุ่มกลิ่น…"
            style={{ height: 44, fontSize: 15, paddingLeft: 40 }}
          />
        </div>
        {!q && (
          <div style={{ marginTop: 14 }}>
            <div className="dim" style={{ fontSize: 12, marginBottom: 8 }}>ลองค้นหาด้วยตัวอย่าง:</div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {examples.map(ex => (
                <button key={ex} className="filter-chip" onClick={() => setQ(ex)}>
                  <span className="mono">{ex}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {q && (
        <>
          <div className="pivot-row">
            <button className={"pivot " + (pivot === "all" ? "active" : "")} onClick={() => setPivot("all")}>
              ทั้งหมด <span className="mono">{total}</span>
            </button>
            <button className={"pivot " + (pivot === "products" ? "active" : "")} onClick={() => setPivot("products")}>
              <Icon name="products" className="ico" /> สินค้า <span className="mono">{matches.products.length}</span>
            </button>
            <button className={"pivot " + (pivot === "customers" ? "active" : "")} onClick={() => setPivot("customers")}>
              <Icon name="customers" className="ico" /> ลูกค้า <span className="mono">{matches.customers.length}</span>
            </button>
            <button className={"pivot " + (pivot === "orders" ? "active" : "")} onClick={() => setPivot("orders")}>
              <Icon name="orders" className="ico" /> เอกสาร <span className="mono">{matches.orders.length}</span>
            </button>
          </div>

          {total === 0 && (
            <div className="card"><div className="empty">ไม่พบผลลัพธ์สำหรับ "{q}"</div></div>
          )}

          {(pivot === "all" || pivot === "products") && matches.products.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-head">
                <h3><Icon name="products" className="ico" style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }}/>สินค้า · Products ({matches.products.length})</h3>
              </div>
              <table className="tbl">
                <thead><tr><th>SKU</th><th>ชื่อ</th><th>หมวด</th><th>กลุ่มกลิ่น</th><th className="num">ราคา</th><th className="num">สต็อก</th></tr></thead>
                <tbody>
                  {matches.products.slice(0, pivot === "products" ? 100 : 5).map(p => (
                    <tr key={p.sku} onClick={() => setRoute("products:" + p.sku)}>
                      <td className="code">{Highlight(p.sku, q)}</td>
                      <td>{Highlight(p.name, q)}</td>
                      <td><span className="badge">{p.category}</span></td>
                      <td className="dim">{p.family}</td>
                      <td className="num"><strong>{M.thb(p.price)}</strong></td>
                      <td className="num">{M.num(p.stock)} {p.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(pivot === "all" || pivot === "customers") && matches.customers.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-head">
                <h3><Icon name="customers" className="ico" style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }}/>ลูกค้า · Customers ({matches.customers.length})</h3>
              </div>
              <table className="tbl">
                <thead><tr><th>รหัส</th><th>ชื่อ</th><th>Tier</th><th>เมือง</th><th>ผู้ติดต่อ</th></tr></thead>
                <tbody>
                  {matches.customers.slice(0, pivot === "customers" ? 100 : 5).map(c => (
                    <tr key={c.id} onClick={() => setRoute("customers:" + c.id)}>
                      <td className="code">{Highlight(c.id, q)}</td>
                      <td>
                        <div>{Highlight(c.name, q)}</div>
                      </td>
                      <td><span className="badge">{c.tier}</span></td>
                      <td className="dim">{c.city}</td>
                      <td>{c.contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(pivot === "all" || pivot === "orders") && matches.orders.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h3><Icon name="orders" className="ico" style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }}/>คำสั่งซื้อ · Orders ({matches.orders.length})</h3>
              </div>
              <table className="tbl">
                <thead><tr><th>เลขเอกสาร</th><th>วันที่</th><th>ลูกค้า</th><th>SKUs</th><th className="num">ยอดรวม</th><th>สถานะ</th></tr></thead>
                <tbody>
                  {matches.orders.slice(0, pivot === "orders" ? 200 : 10).map(o => {
                    const c = M.customerOf(o.customer)
                    return (
                      <tr key={o.doc} onClick={() => setRoute("orders:" + o.doc)}>
                        <td className="code">{Highlight(o.doc, q)}</td>
                        <td>{M.fmtDate(o.date)}</td>
                        <td>{c?.name}</td>
                        <td className="mono dim" style={{ fontSize: 11 }}>{o.items.map(i => i.sku).join(", ")}</td>
                        <td className="num"><strong>{M.thb(M.orderTotal(o))}</strong></td>
                        <td><StatusBadge status={o.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Highlight(text, q) {
  if (!q || !text) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "0 2px", borderRadius: 2 }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  )
}

function PriceHistoryPage({ initialSku, setRoute }) {
  const M = MOCK
  const skusWithHistory = React.useMemo(() => M.skusWithPriceHistory(), [])
  const [selected, setSelected] = React.useState(initialSku && skusWithHistory.includes(initialSku) ? initialSku : skusWithHistory[0])
  const [q, setQ] = React.useState("")

  const visibleSkus = React.useMemo(() => {
    if (!q.trim()) return skusWithHistory.slice(0, 200)
    const qq = q.toLowerCase()
    return skusWithHistory.filter(sku => {
      const p = M.productOf(sku)
      return sku.toLowerCase().includes(qq) || (p?.name || "").toLowerCase().includes(qq) || (p?.brand || "").toLowerCase().includes(qq)
    }).slice(0, 200)
  }, [q, skusWithHistory])

  const p = M.productOf(selected)
  const history = selected ? M.priceHistoryOf(selected) : []
  const chartData = history.map(h => ({ x: h.date.slice(2), y: h.price, raw: h }))
  const distinctChanges = []
  for (let i = 0; i < history.length; i++) {
    if (i === 0 || history[i].price !== history[i-1].price) distinctChanges.push(history[i])
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">ประวัติราคา · Price History</h1>
          <p className="page-sub">ติดตามการเปลี่ยนแปลงราคาที่ขายจริงในแต่ละครั้ง · ดึงจากออเดอร์ทั้งหมด</p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "320px minmax(0, 1fr)", gap: 16 }}>
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="card-head"><h3>SKU ที่มีประวัติราคา ({skusWithHistory.length})</h3></div>
          <div style={{ padding: 10, borderBottom: "1px solid var(--border)" }}>
            <div className="search-bar" style={{ margin: 0, maxWidth: "100%" }}>
              <Icon name="search" className="icon-l" />
              <input placeholder="กรอง SKU / สินค้า…" value={q} onChange={e => setQ(e.target.value)} style={{ height: 30 }} />
            </div>
          </div>
          <div style={{ maxHeight: 580, overflowY: "auto" }}>
            {visibleSkus.map(sku => {
              const pp = M.productOf(sku)
              const h = M.priceHistoryOf(sku)
              const latest = h[h.length - 1]
              const earliest = h[0]
              const move = (earliest && latest && earliest.price !== latest.price)
                ? ((latest.price - earliest.price) / earliest.price) * 100 : 0
              return (
                <div key={sku}
                  onClick={() => setSelected(sku)}
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: selected === sku ? "var(--panel-2)" : "transparent",
                    borderLeft: selected === sku ? "2px solid var(--accent)" : "2px solid transparent",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div className="mono" style={{ fontSize: 11, fontWeight: 500 }}>{sku}</div>
                    {move !== 0 && (
                      <span className={"badge " + (move > 0 ? "amber" : "green")} style={{ height: 18, padding: "0 6px", fontSize: 10 }}>
                        {move > 0 ? "+" : ""}{move.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pp?.name || sku}</div>
                  <div className="mono" style={{ fontSize: 11, marginTop: 4 }}>{M.thbDec(latest?.price)} / {pp?.uom}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <div>
                <h3>{p?.name || selected}</h3>
                <div className="mono dim" style={{ fontSize: 12, marginTop: 2 }}>{selected} · {p?.category} · {p?.brand}</div>
              </div>
              <button className="btn ghost" onClick={() => setRoute("products:" + selected)}>เปิดสินค้า <Icon name="chevronRight" className="ico" /></button>
            </div>
            <div className="chart-wrap">
              {chartData.length >= 2
                ? <LineChart data={chartData} height={260} formatY={v => "฿" + v.toFixed(v >= 100 ? 0 : 2)} />
                : <div className="empty">ยังไม่มีประวัติราคาเพียงพอ</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>การเปลี่ยนแปลงราคา · Price Points</h3>
              <span className="more">{distinctChanges.length} จุดเปลี่ยน · {history.length} ครั้งที่ขาย</span>
            </div>
            {history.length === 0
              ? <div className="empty">ยังไม่มีประวัติราคา</div>
              : (
                <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead><tr><th>วันที่</th><th>เอกสาร</th><th>รหัสลูกค้า</th><th>ชื่อบริษัท</th><th className="num">ราคา</th><th className="num">เปลี่ยน</th></tr></thead>
                  <tbody>
                    {[...history].reverse().map((h, i, arr) => {
                      const next = arr[i + 1]
                      const diff = next ? ((h.price - next.price) / next.price) * 100 : null
                      const cust = M.customerOf(h.customer)
                      return (
                        <tr key={i} onClick={() => h.doc && setRoute("orders:" + h.doc)}>
                          <td>{M.fmtDate(h.date)}</td>
                          <td className="code">{h.doc || "—"}</td>
                          <td className="code">{h.customer}</td>
                          <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cust?.name || <span className="dim">—</span>}</td>
                          <td className="num mono"><strong>{M.thbDec(h.price)}</strong></td>
                          <td className="num">
                            {diff != null && diff !== 0
                              ? <span className={"badge " + (diff > 0 ? "amber" : "green")}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}%</span>
                              : (diff === 0 ? <span className="dim">—</span> : <span className="dim">เริ่มต้น</span>)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { Tracking, PriceHistoryPage }
