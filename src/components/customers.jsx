import React from 'react'
import MOCK from '../lib/mock.js'
import { Icon } from './icons.jsx'
import { LineChart } from './charts.jsx'
import { StatusBadge, BackToList, Pagination, SortTh } from './ui.jsx'

function CustomersList({ setRoute }) {
  const M = MOCK
  const [q, setQ] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(25)
  const [sort, setSort] = React.useState({ col: "lifetime", dir: "desc" })

  const toggleSort = (col) => {
    const numCols = new Set(["ordersCount", "lifetime", "lastDate"])
    setSort(s => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: numCols.has(col) ? "desc" : "asc" })
    setPage(1)
  }

  const enriched = React.useMemo(() => M.customers.map(c => {
    const orders = M.ordersOf(c.id)
    const last = orders[0]
    const lifetime = orders.reduce((s, o) => s + M.orderTotal(o), 0)
    const daysAgo = last ? M.dayDiff(last.date, M.today) : null
    return { ...c, ordersCount: orders.length, lifetime, lastDate: last?.date, daysAgo }
  }), [M.customers, M.orders])

  const filtered = React.useMemo(() => {
    const ql = q.toLowerCase()
    const f = enriched.filter(c =>
      !q ||
      (c.name || "").toLowerCase().includes(ql) ||
      (c.short || "").toLowerCase().includes(ql) ||
      (c.id || "").toLowerCase().includes(ql) ||
      (c.brand || "").toLowerCase().includes(ql)
    )
    const mul = sort.dir === "asc" ? 1 : -1
    return [...f].sort((a, b) => {
      switch (sort.col) {
        case "id":          return mul * (a.id || "").localeCompare(b.id || "")
        case "name":        return mul * (a.name || "").localeCompare(b.name || "")
        case "brand":       return mul * (a.brand || "").localeCompare(b.brand || "")
        case "city":        return mul * (a.city || "").localeCompare(b.city || "")
        case "ordersCount": return mul * ((a.ordersCount || 0) - (b.ordersCount || 0))
        case "lastDate":    return mul * (a.lastDate || "").localeCompare(b.lastDate || "")
        default:            return mul * ((a.lifetime || 0) - (b.lifetime || 0))
      }
    })
  }, [enriched, q, sort])

  const startIdx = (page - 1) * pageSize
  const shown = filtered.slice(startIdx, startIdx + pageSize)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">ลูกค้า · Customers</h1>
          <p className="page-sub">{M.num(M.customers.length)} ลูกค้า</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
        </div>
      </div>

      <div className="table-wrap">
        <div className="toolbar">
          <div className="search-bar" style={{ maxWidth: 280, margin: 0 }}>
            <Icon name="search" className="icon-l" />
            <input placeholder="ค้นหารหัส / ชื่อ / แบรนด์…" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} />
          </div>
          <div className="spacer" />
          <span className="dim mono" style={{ fontSize: 12 }}>{M.num(shown.length)} / {M.num(filtered.length)}</span>
        </div>
        <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <SortTh col="id" sort={sort} onSort={toggleSort}>รหัส</SortTh>
              <SortTh col="name" sort={sort} onSort={toggleSort}>ชื่อลูกค้า</SortTh>
              <SortTh col="brand" sort={sort} onSort={toggleSort}>แบรนด์</SortTh>
              <SortTh col="city" sort={sort} onSort={toggleSort}>จังหวัด</SortTh>
              <SortTh col="ordersCount" sort={sort} onSort={toggleSort} className="num">ออเดอร์</SortTh>
              <SortTh col="lifetime" sort={sort} onSort={toggleSort} className="num">ยอดซื้อรวม</SortTh>
              <SortTh col="lastDate" sort={sort} onSort={toggleSort}>สั่งล่าสุด</SortTh>
            </tr>
          </thead>
          <tbody>
            {shown.map(c => (
              <tr key={c.id} onClick={() => setRoute("customers:" + c.id)}>
                <td className="code">{c.id}</td>
                <td style={{ maxWidth: 320 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                </td>
                <td className="dim">{c.brand || "—"}</td>
                <td className="dim">{c.city || "—"}</td>
                <td className="num">{c.ordersCount || <span className="dim">—</span>}</td>
                <td className="num">{c.lifetime ? <strong>{M.thb(c.lifetime)}</strong> : <span className="dim">—</span>}</td>
                <td>
                  {c.lastDate ? (
                    <div className="row" style={{ gap: 6 }}>
                      <span>{M.fmtDate(c.lastDate)}</span>
                      {c.daysAgo > 90
                        ? <span className="badge red" style={{ fontSize: 10, height: 18, padding: "0 6px" }}>{c.daysAgo}d</span>
                        : c.daysAgo > 60
                        ? <span className="badge amber" style={{ fontSize: 10, height: 18, padding: "0 6px" }}>{c.daysAgo}d</span>
                        : null}
                    </div>
                  ) : <span className="dim">—</span>}
                </td>
              </tr>
            ))}
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

function CustomerDetail({ id, setRoute, goBack, canGoBack }) {
  const M = MOCK
  const c = M.customerOf(id)
  const [tab, setTab] = React.useState("info")
  if (!c) return <div className="page"><div className="empty">ไม่พบลูกค้ารหัส {id}</div></div>

  const orders = M.ordersOf(id)
  const lifetime = orders.reduce((s, o) => s + M.orderTotal(o), 0)
  const totalQty = orders.reduce((s, o) => s + M.orderQty(o), 0)
  const avg = orders.length ? lifetime / orders.length : 0
  const lastDate = orders[0]?.date
  const firstDate = orders[orders.length - 1]?.date
  const daysAgo = lastDate ? M.dayDiff(lastDate, M.today) : null

  const skuMap = {}
  orders.forEach(o => o.items.forEach(i => {
    if (!skuMap[i.sku]) skuMap[i.sku] = { qty: 0, revenue: 0, count: 0, lastPrice: 0, lastDate: o.date }
    skuMap[i.sku].qty += i.qty || 0
    skuMap[i.sku].revenue += i.total || (i.qty * i.price) || 0
    skuMap[i.sku].count += 1
    if (o.date > skuMap[i.sku].lastDate) { skuMap[i.sku].lastDate = o.date; skuMap[i.sku].lastPrice = i.price }
  }))
  const skuList = Object.entries(skuMap).map(([sku, v]) => ({ sku, ...v }))
    .sort((a, b) => b.revenue - a.revenue)

  const monthly = {}
  orders.forEach(o => {
    const m = o.date.slice(0, 7)
    monthly[m] = (monthly[m] || 0) + M.orderTotal(o)
  })
  const chartData = Object.entries(monthly).sort().map(([m, v]) => ({ x: m.slice(2), y: v / 1000 }))

  const displayName = c.name || c.id

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
            {daysAgo != null && daysAgo > 60 && <span className={"badge " + (daysAgo > 90 ? "red" : "amber")}><span className="dot" />หาย {daysAgo} วัน</span>}
          </div>
          <h1 className="detail-title">{displayName}</h1>
          <div className="detail-code" style={{ marginTop: 6 }}>{c.id}{c.name && c.name !== displayName && ` · ${c.name}`}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
        </div>
      </div>

      <div className="page-with-rail">
        <div className="page-main">
          <div className="tabs">
            <div className={"tab " + (tab === "info" ? "active" : "")} onClick={() => setTab("info")}>ข้อมูลลูกค้า</div>
            <div className={"tab " + (tab === "orders" ? "active" : "")} onClick={() => setTab("orders")}>ออเดอร์ ({orders.length})</div>
            <div className={"tab " + (tab === "skus" ? "active" : "")} onClick={() => setTab("skus")}>สินค้าที่ซื้อ ({skuList.length})</div>
          </div>

          {tab === "info" && (
            <>
              <div className="card card-pad" style={{ marginBottom: 16, overflow: "hidden" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 13 }}>ข้อมูลลูกค้า · Customer Information</h3>
                <dl className="kv-list" style={{ gridTemplateColumns: "180px minmax(0, 1fr)" }}>
                  <dt>รหัสลูกค้า</dt><dd className="mono">{c.id}</dd>
                  {c.oldId && c.oldId !== c.id && <><dt>รหัสเดิม</dt><dd className="mono">{c.oldId}</dd></>}
                  <dt>ชื่อบริษัท</dt><dd style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{c.name || "—"}</dd>
                  <dt>เลขประจำตัวผู้เสียภาษี</dt><dd className="mono">{c.taxId || "—"}</dd>
                  {c.brand && <><dt>แบรนด์</dt><dd style={{ wordBreak: "break-word" }}>{c.brand}</dd></>}
                  {c.contact && <><dt>ผู้ติดต่อบัญชี</dt><dd style={{ wordBreak: "break-word" }}>{c.contact}</dd></>}
                  {c.phone && <><dt>โทรศัพท์</dt><dd className="mono" style={{ wordBreak: "break-word" }}>{c.phone}</dd></>}
                  {c.email && <><dt>อีเมล</dt><dd className="mono" style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>{c.email}</dd></>}
                  {c.address && <><dt>ที่อยู่</dt><dd style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{c.address}</dd></>}
                  {c.city && <><dt>จังหวัด</dt><dd>{c.city}</dd></>}
                  {c.credit && <><dt>เงื่อนไขการชำระเงิน</dt><dd>{c.credit}</dd></>}
                  {firstDate && <><dt>เริ่มสั่งซื้อ</dt><dd>{M.fmtDate(firstDate)}</dd></>}
                  {lastDate && <><dt>สั่งล่าสุด</dt><dd>{M.fmtDate(lastDate)}{daysAgo != null && <span className="dim"> · {daysAgo} วันที่แล้ว</span>}</dd></>}
                </dl>
              </div>

              {chartData.length >= 2 && (
                <div className="card">
                  <div className="card-head">
                    <h3>ยอดซื้อรายเดือน · Monthly Spend</h3>
                    <span className="more">หน่วย: พันบาท</span>
                  </div>
                  <div className="chart-wrap">
                    <LineChart data={chartData} height={200} formatY={v => v.toFixed(0) + "K"} />
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "orders" && (
            <div className="card">
              <div className="tbl-scroll">
              <table className="tbl">
                <thead><tr><th>เลขเอกสาร</th><th>วันที่</th><th className="num">ยอดรวม</th><th>สถานะ</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.doc + o.date} onClick={() => setRoute("orders:" + o.doc)}>
                      <td className="code">{o.doc}</td>
                      <td>{M.fmtDate(o.date)}</td>
                      <td className="num"><strong>{M.thb(M.orderTotal(o))}</strong></td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {tab === "skus" && (
            <div className="card">
              <div className="tbl-scroll">
              <table className="tbl">
                <thead><tr><th>SKU</th><th>ชื่อสินค้า / สูตร</th><th>หมวด</th><th className="num">ราคา</th></tr></thead>
                <tbody>
                  {skuList.map(s => {
                    const p = M.productOf(s.sku)
                    return (
                      <tr key={s.sku} onClick={() => setRoute("products:" + s.sku)}>
                        <td className="code">{s.sku}</td>
                        <td style={{ maxWidth: 320 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p?.name || s.sku}</div>
                          {p?.formula && p.formula !== p.name && <div className="dim" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>สูตร: {p.formula}</div>}
                        </td>
                        <td>{p?.category ? <span className="badge">{p.category}</span> : <span className="dim">—</span>}</td>
                        <td className="num">{p?.price ? <><strong>{M.thb(p.price)}</strong> <span className="dim mono" style={{ fontSize: 11 }}>/ {p.uom}</span></> : <span className="dim">—</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        <aside className="page-rail">
          <div className="rail-stat">
            <div className="stat-label">ยอดซื้อตลอดอายุ · LTV</div>
            <div className="stat-value">{lifetime ? M.thb(lifetime) : "—"}</div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{orders.length} ออเดอร์</div>
          </div>
          <div className="rail-stat">
            <div className="stat-label">ค่าเฉลี่ย/ออเดอร์</div>
            <div className="stat-value">{avg ? M.thb(avg) : "—"}</div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{totalQty ? `รวม ${M.num(totalQty)} หน่วย` : "—"}</div>
          </div>
          <div className="rail-stat">
            <div className="stat-label">สั่งล่าสุด</div>
            <div className="stat-value" style={{ fontSize: 14 }}>{lastDate ? M.fmtDate(lastDate) : "—"}</div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{daysAgo != null ? `${daysAgo} วันที่แล้ว` : "ยังไม่มีออเดอร์"}</div>
          </div>
          <div className="rail-stat">
            <div className="stat-label">SKUs ที่ซื้อ</div>
            <div className="stat-value">{skuList.length}<span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4, color: "var(--text-2)" }}>รายการ</span></div>
            <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{firstDate ? `เริ่ม ${M.fmtDate(firstDate)}` : "—"}</div>
          </div>

          {skuList.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h3>สินค้าที่ซื้อบ่อย</h3>
                <span className="more" style={{ cursor: "pointer" }} onClick={() => setTab("skus")}>ดูทั้งหมด</span>
              </div>
              <div style={{ padding: "4px 0" }}>
                {skuList.slice(0, 4).map((s, i) => {
                  const p = M.productOf(s.sku)
                  return (
                    <div key={s.sku} style={{ padding: "10px 14px", borderBottom: i < Math.min(skuList.length - 1, 3) ? "1px solid var(--border)" : "none", cursor: "pointer" }} onClick={() => setRoute("products:" + s.sku)}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p?.name || s.sku}</div>
                      <div className="dim mono" style={{ fontSize: 10.5, marginTop: 2 }}>{s.sku}</div>
                      <div className="dim" style={{ fontSize: 11, marginTop: 1 }}>{s.count} ครั้ง · {M.thb(s.revenue)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      <BackToList setRoute={setRoute} target="customers" label="กลับไปยังลูกค้าทั้งหมด" />
    </div>
  )
}

export { CustomersList, CustomerDetail }
