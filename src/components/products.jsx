import React from 'react'
import { createPortal } from 'react-dom'
import MOCK from '../lib/mock.js'
import { Icon } from './icons.jsx'
import { LineChart, fmtChartDate } from './charts.jsx'
import { StatusBadge, BackToList, Pagination, SortTh } from './ui.jsx'

function ProductsList({ setRoute }) {
  const M = MOCK
  const [catSel, setCatSel] = React.useState([])
  const [q, setQ] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(25)
  const [sort, setSort] = React.useState({ col: null, dir: "desc" }) // null = default by sales

  const toggleSort = (col) => {
    setSort(s => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: col === "price" ? "desc" : "asc" })
    setPage(1)
  }

  const cache = React.useMemo(() => {
    const sales = {}, lastPriceMove = {}, sparkVals = {}, latestPrices = {}
    for (const o of M.orders) {          // orders sorted newest-first
      for (const it of o.items) {
        sales[it.sku] = (sales[it.sku] || 0) + (it.qty || 0)
        if (it.price && !latestPrices[it.sku]) latestPrices[it.sku] = it.price  // first = newest
        if (!sparkVals[it.sku]) sparkVals[it.sku] = []
        if (it.price) sparkVals[it.sku].push(it.price)
      }
    }
    for (const sku in sparkVals) {
      const v = sparkVals[sku]
      if (v.length >= 2) lastPriceMove[sku] = ((v[v.length-1] - v[0]) / v[0]) * 100
    }
    return { sales, lastPriceMove, sparkVals, latestPrices }
  }, [M.orders])

  const mainNames = M.mainNames || { "01": "ODM", "02": "Service", "03": "Design", "04": "อื่นๆ" }

  const hierarchy = React.useMemo(() => {
    const map = {}
    for (const p of M.products) {
      const code = M.mainOf(p.sku)
      if (!code) continue
      if (!map[code]) map[code] = { code, name: mainNames[code] || code, count: 0, subs: {} }
      map[code].count += 1
      if (p.category) map[code].subs[p.category] = (map[code].subs[p.category] || 0) + 1
    }
    return Object.values(map)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(m => ({
        ...m,
        subs: Object.entries(m.subs)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count })),
      }))
  }, [M.products])

  const { filtered, sorted } = React.useMemo(() => {
    const ql = q.toLowerCase()
    const filtered = M.products.filter(p => {
      if (catSel.length > 0) {
        const main = M.mainOf(p.sku)
        if (!main) return false
        if (!catSel.some(tok => tok === `main:${main}` || tok === `sub:${main}:${p.category || ""}`))
          return false
      }
      if (q && !(
        (p.name || "").toLowerCase().includes(ql) ||
        (p.sku || "").toLowerCase().includes(ql) ||
        (p.brand || "").toLowerCase().includes(ql)
      )) return false
      return true
    })
    const sorted = [...filtered].sort((a, b) => {
      if (!sort.col) {
        const sa = cache.sales[a.sku] || 0, sb = cache.sales[b.sku] || 0
        if (sa !== sb) return sb - sa
        return (b.price || 0) - (a.price || 0)
      }
      const mul = sort.dir === "asc" ? 1 : -1
      switch (sort.col) {
        case "sku":      return mul * (a.sku || "").localeCompare(b.sku || "")
        case "name":     return mul * (a.name || a.formula || "").localeCompare(b.name || b.formula || "")
        case "category": return mul * (a.category || "").localeCompare(b.category || "")
        case "price":    return mul * ((cache.latestPrices[a.sku] || a.price || 0) - (cache.latestPrices[b.sku] || b.price || 0))
        default: return 0
      }
    })
    return { filtered, sorted }
  }, [M.products, catSel, q, cache, sort])

  const startIdx = (page - 1) * pageSize
  const shown = sorted.slice(startIdx, startIdx + pageSize)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">สินค้า · Products</h1>
          <p className="page-sub">{M.num(M.products.length)} SKU ทั้งหมด</p>
        </div>
        <div className="row" style={{ gap: 8, flexShrink: 0 }}>
        </div>
      </div>

      <div className="table-wrap">
        <div className="toolbar">
          <div className="search-bar" style={{ maxWidth: 280, margin: 0 }}>
            <Icon name="search" className="icon-l" />
            <input placeholder="ค้นหารหัส / ชื่อ / แบรนด์…" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} />
          </div>
          <CategoryFilterDropdown
            hierarchy={hierarchy}
            selected={catSel}
            onChange={(v) => { setCatSel(v); setPage(1) }}
          />
          <div className="spacer" />
          <span className="dim mono" style={{ fontSize: 12 }}>{M.num(shown.length)} / {M.num(sorted.length)}</span>
        </div>
        <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <SortTh col="sku" sort={sort} onSort={toggleSort}>รหัส SKU</SortTh>
              <SortTh col="name" sort={sort} onSort={toggleSort}>ชื่อสินค้า / สูตร</SortTh>
              <SortTh col="category" sort={sort} onSort={toggleSort}>หมวด</SortTh>
              <SortTh col="price" sort={sort} onSort={toggleSort} className="num">ราคา</SortTh>
            </tr>
          </thead>
          <tbody>
            {shown.map(p => {
              const displayName = M.productDisplayName(p.sku)
              const showFormula = p.formula && p.formula !== displayName
              const latestPrice = cache.latestPrices[p.sku] || p.price
              return (
                <tr key={p.sku} onClick={() => setRoute("products:" + p.sku)}>
                  <td className="code">{p.sku}</td>
                  <td style={{ maxWidth: 360 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
                    {showFormula && <div className="dim" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>สูตร: {p.formula}</div>}
                  </td>
                  <td>{p.category ? <span className="badge">{p.category}</span> : <span className="dim">—</span>}</td>
                  <td className="num">
                    {latestPrice ? <><strong>{M.thb(latestPrice)}</strong> <span className="dim mono" style={{ fontSize: 11 }}>/ {p.uom}</span></> : <span className="dim">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        <Pagination
          total={sorted.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        />
      </div>
    </div>
  )
}

function ProductDetail({ sku, setRoute, goBack, canGoBack }) {
  const M = MOCK
  const p = M.productOf(sku)
  const [tab, setTab] = React.useState("info")
  const [pricePage, setPricePage] = React.useState(1)
  const [priceSize, setPriceSize] = React.useState(10)
  const [ordPage, setOrdPage] = React.useState(1)
  const [ordSize, setOrdSize] = React.useState(10)
  const [custPage, setCustPage] = React.useState(1)
  const [custSize, setCustSize] = React.useState(10)

  if (!p) return <div className="page"><div className="empty">ไม่พบสินค้ารหัส {sku}</div></div>

  const history = M.priceHistoryOf(sku)
  const ordersOfSku = M.ordersBySku(sku).sort((a,b) => b.date.localeCompare(a.date))
  const customers = M.customersOfSku(sku)
  const totalSold = ordersOfSku.reduce((s, o) => s + o.items.reduce((ss, i) => ss + (i.qty || 0), 0), 0)
  const totalRev = ordersOfSku.reduce((s, o) => s + o.items.reduce((ss, i) => ss + (i.total || i.qty * i.price || 0), 0), 0)

  // ราคาล่าสุดจาก order history (history เรียง asc → ตัวท้ายสุด = ล่าสุด)
  const latestPrice = history.length > 0 ? history[history.length - 1].price : p.price
  const latestPriceDate = history.length > 0 ? history[history.length - 1].date : null

  const chartData = history.map(h => ({ x: h.date, y: h.price }))
  const minPrice = history.length ? Math.min(...history.map(h => h.price)) : null
  const maxPrice = history.length ? Math.max(...history.map(h => h.price)) : null
  const avgPrice = history.length ? history.reduce((s,h) => s + h.price, 0) / history.length : null

  const sampleLineItem = ordersOfSku[0]?.items[0]

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 12, fontSize: 13 }}>
        {canGoBack && (
          <span style={{ cursor: "pointer", color: "var(--text-2)" }} onClick={goBack}>
            ← ย้อนกลับ
          </span>
        )}
      </div>

      <div className="detail-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 10, marginBottom: 6 }}>
            {p.category && <span className="badge">{p.category}</span>}
            {!latestPrice && <span className="badge red"><span className="dot" />ยังไม่มีราคา</span>}
          </div>
          <h1 className="detail-title">{M.productDisplayName(p.sku)}</h1>
          {p.formula && p.formula !== M.productDisplayName(p.sku) && (
            <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>ชื่อสูตร: {p.formula}</div>
          )}
          <div className="detail-code" style={{ marginTop: 8 }}>SKU · {p.sku}</div>
        </div>
        <div className="detail-kpi-grid">
          <div className="rail-stat">
            <div className="stat-label">ราคาขายปัจจุบัน</div>
            <div className="stat-value">{latestPrice ? M.thb(latestPrice) : "—"}</div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
              {p.uom ? `ต่อ ${p.uom}` : "—"}
              {latestPriceDate && <> · {M.fmtDate(latestPriceDate)}</>}
            </div>
          </div>
          <div className="rail-stat">
            <div className="stat-label">ช่วงราคาในประวัติ</div>
            <div className="stat-value" style={{ fontSize: 14 }}>{history.length ? `${M.thb(minPrice)} – ${M.thb(maxPrice)}` : "—"}</div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{history.length ? `เฉลี่ย ${M.thb(avgPrice)} · ${history.length} ครั้ง` : "—"}</div>
          </div>
          <div className="rail-stat">
            <div className="stat-label">ขายรวม (ตลอดประวัติ)</div>
            <div className="stat-value">{totalSold ? M.num(totalSold) : "—"}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4, color: "var(--text-2)" }}>{p.uom || ""}</span></div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{ordersOfSku.length} ออเดอร์</div>
          </div>
          <div className="rail-stat">
            <div className="stat-label">รายได้รวม</div>
            <div className="stat-value">{totalRev ? M.thb(totalRev) : "—"}</div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{ordersOfSku[0]?.date ? `สั่งล่าสุด ${M.fmtDate(ordersOfSku[0].date)}` : "—"}</div>
          </div>
        </div>
      </div>

      <div>
          <div className="tabs">
            <div className={"tab " + (tab === "info" ? "active" : "")} onClick={() => setTab("info")}>ข้อมูลสินค้า</div>
            <div className={"tab " + (tab === "price" ? "active" : "")} onClick={() => setTab("price")}>ประวัติราคา ({history.length})</div>
            <div className={"tab " + (tab === "orders" ? "active" : "")} onClick={() => setTab("orders")}>ออเดอร์ ({ordersOfSku.length})</div>
            <div className={"tab " + (tab === "customers" ? "active" : "")} onClick={() => setTab("customers")}>ลูกค้า ({customers.length})</div>
          </div>

          {tab === "info" && (
            <>
              <div className="card card-pad" style={{ marginBottom: 16 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 13 }}>ข้อมูลสินค้า · Product Information</h3>
                <dl className="kv-list" style={{ gridTemplateColumns: "160px minmax(0, 1fr)" }}>
                  <dt>รหัส SKU</dt><dd className="mono">{p.sku}</dd>
                  {p.name && p.name !== p.formula && <><dt>ชื่อสินค้า</dt><dd style={{ wordBreak: "break-word" }}>{p.name}</dd></>}
                  {p.formula && <><dt>ชื่อสูตร</dt><dd style={{ wordBreak: "break-word" }}>{p.formula}</dd></>}
                  {p.category && <><dt>หมวดสินค้า</dt><dd>
                    {(() => {
                      const code = M.mainOf(p.sku)
                      const mainName = code ? (M.mainNames?.[code] || code) : null
                      return (
                        <span className="badge">{mainName ? `${mainName} / ${p.category}` : p.category}</span>
                      )
                    })()}
                  </dd></>}
                  <dt>ราคาขาย</dt><dd className="mono">
                    {latestPrice
                      ? <><strong>{M.thbDec(latestPrice)}</strong>{p.uom && ` / ${p.uom}`}{latestPriceDate && <span className="dim" style={{ fontSize: 11, marginLeft: 8 }}>ล่าสุด {M.fmtDate(latestPriceDate)}</span>}</>
                      : <span className="dim">ยังไม่มีราคา</span>}
                  </dd>
                  {sampleLineItem?.vol && <><dt>ปริมาตร</dt><dd>{sampleLineItem.vol}</dd></>}
                  {history.length > 0 && <><dt>ขายครั้งแรก</dt><dd>{M.fmtDate(history[0].date)}</dd></>}
                  {history.length > 0 && <><dt>ขายล่าสุด</dt><dd>{M.fmtDate(history[history.length - 1].date)}</dd></>}
                </dl>
              </div>

              {chartData.length >= 2 && (
                <div className="card">
                  <div className="card-head">
                    <h3>ประวัติราคา · Price Timeline</h3>
                    <span className="more" style={{ cursor: "pointer" }} onClick={() => setTab("price")}>ดูทั้งหมด</span>
                  </div>
                  <div className="chart-wrap">
                    <LineChart data={chartData} height={200} formatY={v => "฿" + v.toFixed(v >= 100 ? 0 : 2)} formatX={fmtChartDate} />
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "price" && (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-head">
                  <h3>ประวัติราคา · Price Timeline</h3>
                  <span className="more">{history.length} ครั้งที่ขาย</span>
                </div>
                <div className="chart-wrap">
                  {chartData.length >= 2
                    ? <LineChart data={chartData} height={260} formatY={v => "฿" + v.toFixed(v >= 100 ? 0 : 2)} formatX={fmtChartDate} />
                    : <div className="empty">ยังไม่มีประวัติราคาเพียงพอ</div>}
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h3>การเปลี่ยนแปลงราคา · Price Points</h3></div>
                <div className="tbl-scroll">
                <table className="tbl">
                  <thead><tr><th>วันที่</th><th>เอกสาร</th><th>รหัสลูกค้า</th><th>ชื่อบริษัท</th><th className="num">ราคา</th><th className="num">เทียบครั้งก่อน</th></tr></thead>
                  <tbody>
                    {[...history].reverse().slice((pricePage-1)*priceSize, pricePage*priceSize).map((h, i, arr) => {
                      const globalIdx = (pricePage-1)*priceSize + i
                      const revHistory = [...history].reverse()
                      const next = revHistory[globalIdx + 1]
                      const diff = next ? ((h.price - next.price) / next.price) * 100 : null
                      const cust = M.customerOf(h.customer)
                      return (
                        <tr key={globalIdx} onClick={() => h.doc && setRoute("orders:" + h.doc)}>
                          <td>{M.fmtDate(h.date)}</td>
                          <td className="code">{h.doc || "—"}</td>
                          <td className="code" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setRoute("customers:" + h.customer) }}>{h.customer}</td>
                          <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cust?.name || <span className="dim">—</span>}</td>
                          <td className="num mono"><strong>{M.thbDec(h.price)}</strong></td>
                          <td className="num">
                            {diff != null && diff !== 0
                              ? <span className={"badge " + (diff > 0 ? "amber" : "green")}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}%</span>
                              : (diff === 0 ? <span className="dim">เท่าเดิม</span> : <span className="dim">เริ่มต้น</span>)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
                <Pagination total={history.length} page={pricePage} pageSize={priceSize} onPageChange={setPricePage} onPageSizeChange={s => { setPriceSize(s); setPricePage(1) }} />
              </div>
            </>
          )}

          {tab === "orders" && (
            <div className="card">
              <div className="tbl-scroll">
              <table className="tbl">
                <thead><tr><th>เลขเอกสาร</th><th>วันที่</th><th>ลูกค้า</th><th className="num">จำนวน</th><th className="num">ราคา/หน่วย</th><th className="num">รวม</th><th>สถานะ</th></tr></thead>
                <tbody>
                  {ordersOfSku.slice((ordPage-1)*ordSize, ordPage*ordSize).map(o => {
                    const it = o.items[0]
                    return (
                      <tr key={o.doc} onClick={() => setRoute("orders:" + o.doc)}>
                        <td className="code">{o.doc}</td>
                        <td>{M.fmtDate(o.date)}</td>
                        <td>{M.customerOf(o.customer)?.name || o.customerName}</td>
                        <td className="num">{M.num(it.qty)}</td>
                        <td className="num mono">{M.thbDec(it.price)}</td>
                        <td className="num"><strong>{M.thb(it.total || it.qty * it.price)}</strong></td>
                        <td><StatusBadge status={o.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
              <Pagination total={ordersOfSku.length} page={ordPage} pageSize={ordSize} onPageChange={setOrdPage} onPageSizeChange={s => { setOrdSize(s); setOrdPage(1) }} />
            </div>
          )}

          {tab === "customers" && (
            <div className="card">
              <div className="tbl-scroll">
              <table className="tbl">
                <thead><tr><th>รหัส</th><th>ลูกค้า</th><th className="num">จำนวนรวม</th><th className="num">รายได้รวม</th><th className="num">ครั้ง</th><th className="num">ราคาล่าสุด</th><th>สั่งล่าสุด</th></tr></thead>
                <tbody>
                  {customers.slice((custPage-1)*custSize, custPage*custSize).map(c => {
                    const cust = M.customerOf(c.id)
                    return (
                      <tr key={c.id} onClick={() => setRoute("customers:" + c.id)}>
                        <td className="code">{c.id}</td>
                        <td>{cust?.name || c.id}</td>
                        <td className="num">{M.num(c.qty)}</td>
                        <td className="num"><strong>{M.thb(c.revenue)}</strong></td>
                        <td className="num">{c.count}</td>
                        <td className="num mono">{M.thbDec(c.lastPrice)}</td>
                        <td>{c.last}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
              <Pagination total={customers.length} page={custPage} pageSize={custSize} onPageChange={setCustPage} onPageSizeChange={s => { setCustSize(s); setCustPage(1) }} />
            </div>
          )}
      </div>

      <BackToList setRoute={setRoute} target="products" label="กลับไปยังสินค้าทั้งหมด" />
    </div>
  )
}

function MultiSelectDropdown({ label, options, selected, onChange }) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [pos, setPos] = React.useState(null)
  const triggerRef = React.useRef(null)
  const panelRef = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect()
      if (!r) return
      const panelW = 280
      const margin = 8
      const left = Math.min(r.left, window.innerWidth - panelW - margin)
      setPos({ top: r.bottom + 4, left: Math.max(margin, left) })
    }
    place()
    const onMove = () => place()
    window.addEventListener("scroll", onMove, true)
    window.addEventListener("resize", onMove)
    const onClick = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => {
      window.removeEventListener("scroll", onMove, true)
      window.removeEventListener("resize", onMove)
      document.removeEventListener("mousedown", onClick)
    }
  }, [open])

  const valOf = (o) => o.value != null ? o.value : o.label
  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options
  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }

  return (
    <>
      <button ref={triggerRef} className={"filter-chip " + (selected.length > 0 ? "active" : "")} onClick={() => setOpen(!open)}>
        {label}
        {selected.length > 0 && <span className="ms-dd-count">{selected.length}</span>}
        <Icon name="chevronDown" className="ico" />
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="ms-dd-panel"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: 280 }}
        >
          <div className="ms-dd-search">
            <Icon name="search" className="icon-l" />
            <input
              placeholder="ค้นหา…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {selected.length > 0 && (
            <div className="ms-dd-header">
              <span className="dim" style={{ fontSize: 12 }}>เลือก {selected.length} รายการ</span>
              <button className="btn ghost" style={{ height: 24, padding: "0 8px", fontSize: 12 }} onClick={() => onChange([])}>
                ล้าง
              </button>
            </div>
          )}
          <div className="ms-dd-list">
            {filtered.length === 0 ? (
              <div className="empty" style={{ padding: "16px" }}>ไม่พบ</div>
            ) : filtered.map(o => {
              const v = valOf(o)
              const active = selected.includes(v)
              return (
                <div key={v} className={"ms-dd-row " + (active ? "active" : "")} onClick={() => toggle(v)}>
                  <div className="ms-dd-check">
                    {active && <Icon name="check" className="ico" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</div>
                  {o.count != null && <div className="dim mono" style={{ fontSize: 11 }}>{o.count}</div>}
                </div>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function CategoryFilterDropdown({ hierarchy, selected, onChange }) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [pos, setPos] = React.useState(null)
  const triggerRef = React.useRef(null)
  const panelRef = React.useRef(null)

  React.useEffect(() => {
    if (!open) return
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect()
      if (!r) return
      const panelW = 320
      const margin = 8
      const left = Math.min(r.left, window.innerWidth - panelW - margin)
      setPos({ top: r.bottom + 4, left: Math.max(margin, left) })
    }
    place()
    const onMove = () => place()
    window.addEventListener("scroll", onMove, true)
    window.addEventListener("resize", onMove)
    const onClick = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => {
      window.removeEventListener("scroll", onMove, true)
      window.removeEventListener("resize", onMove)
      document.removeEventListener("mousedown", onClick)
    }
  }, [open])

  const isMainSel = (code) => selected.includes(`main:${code}`)
  const isSubSel = (code, name) => selected.includes(`sub:${code}:${name}`)

  const toggleMain = (code) => {
    if (isMainSel(code)) {
      onChange(selected.filter(t => t !== `main:${code}`))
    } else {
      onChange([...selected.filter(t => !t.startsWith(`sub:${code}:`)), `main:${code}`])
    }
  }
  const toggleSub = (code, name) => {
    if (isMainSel(code)) return
    const tok = `sub:${code}:${name}`
    if (isSubSel(code, name)) {
      onChange(selected.filter(t => t !== tok))
    } else {
      onChange([...selected, tok])
    }
  }

  const visibleHierarchy = React.useMemo(() => {
    if (!search) return hierarchy
    const q = search.toLowerCase()
    return hierarchy
      .map(m => {
        const mainMatch = m.name.toLowerCase().includes(q) || m.code.includes(q)
        const matchSubs = m.subs.filter(s => s.name.toLowerCase().includes(q))
        if (mainMatch) return m
        if (matchSubs.length) return { ...m, subs: matchSubs }
        return null
      })
      .filter(Boolean)
  }, [hierarchy, search])

  return (
    <>
      <button ref={triggerRef} className={"filter-chip " + (selected.length > 0 ? "active" : "")} onClick={() => setOpen(!open)}>
        หมวดสินค้า
        {selected.length > 0 && <span className="ms-dd-count">{selected.length}</span>}
        <Icon name="chevronDown" className="ico" />
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className="ms-dd-panel"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: 320, maxHeight: "min(70vh, 520px)", display: "flex", flexDirection: "column" }}
        >
          <div className="ms-dd-search">
            <Icon name="search" className="icon-l" />
            <input
              placeholder="ค้นหาหมวด…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {selected.length > 0 && (
            <div className="ms-dd-header">
              <span className="dim" style={{ fontSize: 12 }}>เลือก {selected.length} รายการ</span>
              <button className="btn ghost" style={{ height: 24, padding: "0 8px", fontSize: 12 }} onClick={() => onChange([])}>
                ล้าง
              </button>
            </div>
          )}
          <div className="ms-dd-list" style={{ flex: 1 }}>
            {visibleHierarchy.length === 0 ? (
              <div className="empty" style={{ padding: 16 }}>ไม่พบ</div>
            ) : visibleHierarchy.map(m => {
              const mainActive = isMainSel(m.code)
              return (
                <div key={m.code}>
                  <div
                    className={"ms-dd-row " + (mainActive ? "active" : "")}
                    onClick={() => toggleMain(m.code)}
                    style={{ fontWeight: 500 }}
                  >
                    <div className="ms-dd-check">
                      {mainActive && <Icon name="check" className="ico" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.name} <span className="dim mono" style={{ fontSize: 10, marginLeft: 4 }}>({m.code})</span>
                    </div>
                    <div className="dim mono" style={{ fontSize: 11 }}>{m.count}</div>
                  </div>
                  {m.subs.map(s => {
                    const subActive = mainActive || isSubSel(m.code, s.name)
                    return (
                      <div
                        key={m.code + ":" + s.name}
                        className={"ms-dd-row sub " + (subActive ? "active" : "") + (mainActive ? " implicit" : "")}
                        onClick={() => toggleSub(m.code, s.name)}
                        style={{ paddingLeft: 28, cursor: mainActive ? "default" : "pointer" }}
                      >
                        <div className="ms-dd-check">
                          {subActive && <Icon name="check" className="ico" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5 }}>
                          {s.name}
                        </div>
                        <div className="dim mono" style={{ fontSize: 11 }}>{s.count}</div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export { ProductsList, ProductDetail, MultiSelectDropdown, CategoryFilterDropdown }
