import React from 'react'
import MOCK from '../lib/mock.js'
import { Icon } from './icons.jsx'
import { LineChart, fmtChartDate } from './charts.jsx'
import { StatusBadge, Pagination } from './ui.jsx'

// ── Price History Page ───────────────────────────────────────

function SkuBrowser({ skusWithHistory, selected, q, setQ, onSelect }) {
  const M = MOCK
  const visibleSkus = React.useMemo(() => {
    const qq = q.toLowerCase().trim()
    const list = qq
      ? skusWithHistory.filter(sku => {
          const p = M.productOf(sku)
          return sku.toLowerCase().includes(qq) ||
            (p?.name || "").toLowerCase().includes(qq) ||
            (p?.brand || "").toLowerCase().includes(qq) ||
            (p?.category || "").toLowerCase().includes(qq)
        })
      : skusWithHistory
    return list.slice(0, 200)
  }, [q, skusWithHistory])

  return (
    <>
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <div className="search-bar mobile-show" style={{ margin: 0, maxWidth: "100%" }}>
            <Icon name="search" className="icon-l" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="ค้นหา SKU · ชื่อสินค้า · หมวด…"
              style={{ height: 38, fontSize: 16 }}
            />
          </div>
        </div>

        <div style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
        {visibleSkus.length === 0
          ? <div className="empty">ไม่พบ SKU ที่ตรงกัน</div>
          : visibleSkus.map(sku => {
              const pp = M.productOf(sku)
              const h  = M.priceHistoryOf(sku)
              const latest   = h[h.length - 1]
              const earliest = h[0]
              const move = (earliest && latest && earliest.price !== latest.price)
                ? ((latest.price - earliest.price) / earliest.price) * 100 : 0
              return (
                <div
                  key={sku}
                  onClick={() => onSelect(sku)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 16px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: selected === sku ? "var(--panel-2)" : "transparent",
                    borderLeft: selected === sku ? "3px solid var(--accent)" : "3px solid transparent",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {M.productDisplayName(sku)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      <span className="mono dim" style={{ fontSize: 11 }}>{sku}</span>
                      {pp?.category && <span className="badge" style={{ height: 16, fontSize: 10, padding: "0 5px" }}>{M.categoryLabel(sku, pp.category)}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{M.thb(latest?.price)}</div>
                    {move !== 0 && (
                      <span className={"badge " + (move > 0 ? "amber" : "green")} style={{ height: 18, fontSize: 10, padding: "0 6px" }}>
                        {move > 0 ? "+" : ""}{move.toFixed(1)}%
                      </span>
                    )}
                    <div className="dim" style={{ fontSize: 10, marginTop: 2 }}>{h.length} ครั้ง</div>
                  </div>
                </div>
              )
            })
        }
        </div>
      </div>
    </>
  )
}

function SkuDetail({ sku, setRoute, onBack }) {
  const M = MOCK
  const product  = M.productOf(sku)
  const history  = M.priceHistoryOf(sku)
  const chartData = history.map(h => ({ x: h.date, y: h.price, raw: h }))
  const [histPage, setHistPage] = React.useState(1)
  const [histSize, setHistSize] = React.useState(10)

  const latestPrice = history.length ? history[history.length - 1].price : null
  const minPrice    = history.length ? Math.min(...history.map(h => h.price)) : null
  const maxPrice    = history.length ? Math.max(...history.map(h => h.price)) : null
  const firstPrice  = history.length ? history[0].price : null
  const totalMove   = (firstPrice && latestPrice) ? ((latestPrice - firstPrice) / firstPrice) * 100 : null

  return (
    <>
      {/* Back + Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <button className="btn ghost" onClick={onBack} style={{ marginTop: 2, gap: 4, flexShrink: 0 }}>
            <Icon name="chevronLeft" className="ico" /> กลับ
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{M.productDisplayName(sku)}</div>
            <div className="dim" style={{ fontSize: 12, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className="mono">{sku}</span>
              {product?.category && <span>· {product.category}</span>}
              {product?.brand && <span>· {product.brand}</span>}
            </div>
          </div>
        </div>
        <button className="btn" onClick={() => setRoute("products:" + sku)}>
          เปิดหน้าสินค้า <Icon name="chevronRight" className="ico" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-row" style={{ marginBottom: 20 }}>
        <div className="stat">
          <div className="stat-label">ราคาล่าสุด</div>
          <div className="stat-value">{latestPrice != null ? M.thb(latestPrice) : "—"}</div>
          <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
            {history.length > 0 ? M.fmtDate(history[history.length - 1].date) : ""}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">เปลี่ยนแปลงรวม</div>
          <div className="stat-value" style={{ color: totalMove == null ? undefined : totalMove > 0 ? "var(--amber)" : totalMove < 0 ? "var(--green)" : undefined }}>
            {totalMove != null ? `${totalMove > 0 ? "+" : ""}${totalMove.toFixed(1)}%` : "—"}
          </div>
          <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
            {firstPrice != null ? `${M.thb(firstPrice)} → ${M.thb(latestPrice)}` : ""}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">ราคาต่ำสุด / สูงสุด</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{minPrice != null ? M.thb(minPrice) : "—"}</div>
          <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>สูงสุด {maxPrice != null ? M.thb(maxPrice) : "—"}</div>
        </div>
        <div className="stat">
          <div className="stat-label">จำนวนครั้งที่ขาย</div>
          <div className="stat-value">{M.num(history.length)}</div>
          <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
            {history.length > 0 ? `${M.fmtDate(history[0].date)} – ${M.fmtDate(history[history.length - 1].date)}` : ""}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <h3>กราฟราคาตามเวลา · Price Trend</h3>
          <span className="more">{history.length} จุดข้อมูล</span>
        </div>
        <div className="chart-wrap">
          {chartData.length >= 2
            ? <LineChart data={chartData} height={280} formatY={v => "฿" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} formatX={fmtChartDate} />
            : <div className="empty">ต้องมีข้อมูลอย่างน้อย 2 จุดเพื่อแสดงกราฟ</div>}
        </div>
      </div>

      {/* History Table */}
      <div className="card">
        <div className="card-head">
          <h3>ประวัติราคาขายทั้งหมด</h3>
          <span className="more">{history.length} รายการ</span>
        </div>
        {history.length === 0
          ? <div className="empty">ยังไม่มีประวัติราคา</div>
          : (() => {
              const reversed = [...history].reverse()
              return (
                <>
                  <div className="tbl-scroll">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>วันที่</th>
                          <th>เลขเอกสาร</th>
                          <th>รหัสลูกค้า</th>
                          <th>ชื่อบริษัท</th>
                          <th className="num">ราคา</th>
                          <th className="num">เปลี่ยน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reversed.slice((histPage-1)*histSize, histPage*histSize).map((h, i) => {
                          const globalIdx = (histPage-1)*histSize + i
                          const prev = reversed[globalIdx + 1]
                          const diff = prev ? ((h.price - prev.price) / prev.price) * 100 : null
                          const cust = M.customerOf(h.customer)
                          return (
                            <tr key={globalIdx} onClick={() => h.doc && setRoute("orders:" + h.doc)}>
                              <td>{M.fmtDate(h.date)}</td>
                              <td className="code">{h.doc || "—"}</td>
                              <td className="code dim">{h.customer}</td>
                              <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {cust?.name || <span className="dim">—</span>}
                              </td>
                              <td className="num mono"><strong>{M.thb(h.price)}</strong></td>
                              <td className="num">
                                {diff != null && Math.abs(diff) > 0.01
                                  ? <span className={"badge " + (diff > 0 ? "amber" : "green")}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}%</span>
                                  : diff === null
                                    ? <span className="dim" style={{ fontSize: 11 }}>เริ่มต้น</span>
                                    : <span className="dim">—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination total={history.length} page={histPage} pageSize={histSize} onPageChange={setHistPage} onPageSizeChange={s => { setHistSize(s); setHistPage(1) }} />
                </>
              )
            })()
        }
      </div>
    </>
  )
}

function PriceHistoryPage({ initialSku, setRoute }) {
  const M = MOCK
  const skusWithHistory = React.useMemo(() => M.skusWithPriceHistory(), [M.orders])
  const [selected, setSelected] = React.useState(
    initialSku && skusWithHistory.includes(initialSku) ? initialSku : null
  )
  const [q, setQ] = React.useState("")

  if (skusWithHistory.length === 0) {
    return (
      <div className="page">
        <div className="page-head">
          <h1 className="page-title">ประวัติราคา · Price History</h1>
        </div>
        <div className="card"><div className="empty">ยังไม่มีข้อมูลประวัติราคา</div></div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">ประวัติราคา · Price History</h1>
          <p className="page-sub">
            {selected
              ? "เลือก SKU อื่น กด กลับ"
              : `${skusWithHistory.length} SKU · ติดตามราคาขายจริงจากออเดอร์ทั้งหมด`}
          </p>
        </div>
      </div>

      {selected
        ? <SkuDetail
            sku={selected}
            setRoute={setRoute}
            onBack={() => { setSelected(null); setQ("") }}
          />
        : <SkuBrowser
            skusWithHistory={skusWithHistory}
            selected={selected}
            q={q}
            setQ={setQ}
            onSelect={sku => { setSelected(sku); setQ("") }}
          />
      }
    </div>
  )
}

// ── Global Search / Tracking ─────────────────────────────────

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
      (p.brand || "").toLowerCase().includes(query)
    )
    const customers = M.customers.filter(c =>
      (c.id || "").toLowerCase().includes(query) ||
      (c.name || "").toLowerCase().includes(query) ||
      (c.brand || "").toLowerCase().includes(query) ||
      (c.contact || "").toLowerCase().includes(query)
    )
    const orders = M.orders.filter(o =>
      (o.doc || "").toLowerCase().includes(query) ||
      (o.customer || "").toLowerCase().includes(query) ||
      o.items.some(i => (i.sku || "").toLowerCase().includes(query)) ||
      (M.customerOf(o.customer)?.name || "").toLowerCase().includes(query)
    )
    return { products, customers, orders }
  }, [q])

  const total = matches.products.length + matches.customers.length + matches.orders.length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">ค้นหา · Search</h1>
          <p className="page-sub">ค้นหาจากรหัสสินค้า · เลขที่เอกสาร · รหัสลูกค้า หรือชื่อใดก็ได้ในระบบ</p>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="search-bar" style={{ maxWidth: "100%", margin: 0 }}>
          <Icon name="search" className="icon-l" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="พิมพ์รหัสสินค้า · เลขเอกสาร · รหัสลูกค้า · ชื่อบริษัท…"
            style={{ height: 44, fontSize: 15, paddingLeft: 40 }}
          />
        </div>
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
                <h3>สินค้า · Products ({matches.products.length})</h3>
              </div>
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead><tr><th>SKU</th><th>ชื่อ</th><th>หมวด</th><th className="num">ราคา</th></tr></thead>
                  <tbody>
                    {matches.products.slice(0, pivot === "products" ? 100 : 5).map(p => (
                      <tr key={p.sku} onClick={() => setRoute("products:" + p.sku)}>
                        <td className="code">{Highlight(p.sku, q)}</td>
                        <td>{Highlight(p.name, q)}</td>
                        <td>{p.category ? <span className="badge">{M.categoryLabel(p.sku, p.category)}</span> : <span className="dim">—</span>}</td>
                        <td className="num"><strong>{M.thb(p.price)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(pivot === "all" || pivot === "customers") && matches.customers.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-head">
                <h3>ลูกค้า · Customers ({matches.customers.length})</h3>
              </div>
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead><tr><th>รหัส</th><th>ชื่อ</th><th>แบรนด์</th><th>ผู้ติดต่อ</th></tr></thead>
                  <tbody>
                    {matches.customers.slice(0, pivot === "customers" ? 100 : 5).map(c => (
                      <tr key={c.id} onClick={() => setRoute("customers:" + c.id)}>
                        <td className="code">{Highlight(c.id, q)}</td>
                        <td>{Highlight(c.name, q)}</td>
                        <td className="dim">{c.brand}</td>
                        <td>{c.contact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(pivot === "all" || pivot === "orders") && matches.orders.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h3>คำสั่งซื้อ · Orders ({matches.orders.length})</h3>
              </div>
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead><tr><th>เลขเอกสาร</th><th>วันที่</th><th>ลูกค้า</th><th className="num">ยอดรวม</th><th>สถานะ</th></tr></thead>
                  <tbody>
                    {matches.orders.slice(0, pivot === "orders" ? 200 : 10).map(o => {
                      const c = M.customerOf(o.customer)
                      return (
                        <tr key={o.doc} onClick={() => setRoute("orders:" + o.doc)}>
                          <td className="code">{Highlight(o.doc, q)}</td>
                          <td>{M.fmtDate(o.date)}</td>
                          <td>{c?.name || o.customer}</td>
                          <td className="num"><strong>{M.thb(M.orderTotal(o))}</strong></td>
                          <td><StatusBadge status={o.status} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
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

export { Tracking, PriceHistoryPage }
