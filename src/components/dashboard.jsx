import React from 'react'
import MOCK from '../lib/mock.js'
import { Icon } from './icons.jsx'
import { BarChart } from './charts.jsx'
import { StatusBadge } from './ui.jsx'

const PERIOD_LABELS = { all: "ทั้งหมด", day: "รายวัน", week: "รายสัปดาห์", month: "รายเดือน", year: "รายปี" }
const TH_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]

function shiftIsoDate(today, daysBack) {
  const d = new Date(today)
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().slice(0, 10)
}

function periodLabel(period, today) {
  const t = new Date(today)
  const day = t.getDate()
  const mShort = TH_MONTHS[t.getMonth()]
  const beShort = String((t.getFullYear() + 543) % 100).padStart(2, "0")
  const beFull = t.getFullYear() + 543
  if (period === "day") return `รายวัน · ${day} ${mShort} ${beShort}`
  if (period === "week") {
    const start = new Date(t); start.setDate(start.getDate() - 6)
    return `รายสัปดาห์ · ${start.getDate()} ${TH_MONTHS[start.getMonth()]} – ${day} ${mShort} ${beShort}`
  }
  if (period === "month") return `รายเดือน · ${mShort} ${beShort}`
  if (period === "year") return `รายปี · ${beFull}`
  return `ทั้งหมด · ล่าสุด ${day} ${mShort} ${beShort}`
}

function filterOrdersByPeriod(orders, period, today) {
  if (period === "all") return orders
  if (period === "day") return orders.filter(o => o.date === today)
  if (period === "week") { const from = shiftIsoDate(today, 6); return orders.filter(o => o.date >= from && o.date <= today) }
  if (period === "month") { const from = shiftIsoDate(today, 29); return orders.filter(o => o.date >= from && o.date <= today) }
  if (period === "year") { const from = shiftIsoDate(today, 364); return orders.filter(o => o.date >= from && o.date <= today) }
  return orders
}

function bucketOrdersByPeriod(orders, period, today) {
  const t = new Date(today)
  const months = TH_MONTHS
  if (period === "day") {
    const buckets = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(t); d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      buckets.push({ x: `${d.getDate()}/${d.getMonth() + 1}`, y: orders.filter(o => o.date === iso).length, highlight: i === 0 })
    }
    return buckets
  }
  if (period === "week") {
    const buckets = []
    for (let i = 7; i >= 0; i--) {
      const wEnd = new Date(t); wEnd.setDate(wEnd.getDate() - i * 7)
      const wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6)
      const sStart = wStart.toISOString().slice(0, 10), sEnd = wEnd.toISOString().slice(0, 10)
      buckets.push({ x: `${wStart.getDate()}/${wStart.getMonth() + 1}`, y: orders.filter(o => o.date >= sStart && o.date <= sEnd).length, highlight: i === 0 })
    }
    return buckets
  }
  if (period === "year") {
    const buckets = []
    const curYear = t.getFullYear()
    for (let i = 4; i >= 0; i--) {
      const y = curYear - i
      buckets.push({ x: String((y + 543) % 100).padStart(2, "0"), y: orders.filter(o => o.date.startsWith(String(y))).length, highlight: i === 0 })
    }
    return buckets
  }
  const monthMap = {}
  for (const o of orders) { const m = o.date.slice(0, 7); monthMap[m] = (monthMap[m] || 0) + 1 }
  let keys = Object.keys(monthMap).sort()
  if (period === "month") keys = keys.slice(-12)
  const lastKey = keys[keys.length - 1]
  return keys.map(k => {
    const [yy, mm] = k.split("-")
    return { x: `${months[+mm - 1]} ${String((+yy + 543) % 100).padStart(2, "0")}`, y: monthMap[k] || 0, highlight: k === lastKey }
  })
}

function PeriodChips({ value, onChange, options = ["all", "month", "year"] }) {
  return (
    <div className="period-chips">
      {options.map(o => (
        <button key={o} className={"period-chip " + (value === o ? "active" : "")} onClick={() => onChange(o)}>
          {PERIOD_LABELS[o]}
        </button>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function AlertCard({ count, label, sub, tone, icon }) {
  return (
    <div className="stat" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 8, background: `var(--${tone}-soft)`, color: `var(--${tone})`, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} className="ico" style={{ width: 18, height: 18 }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{count}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</div>
        <div className="dim" style={{ fontSize: 11 }}>{sub}</div>
      </div>
    </div>
  )
}

function OrdersKpiCard() {
  const M = MOCK
  const [period, setPeriod] = React.useState("all")
  const filtered = React.useMemo(() => filterOrdersByPeriod(M.orders, period, M.today), [period])
  const count = filtered.length
  const total = filtered.reduce((s, o) => s + M.orderTotal(o), 0)
  const avg = count ? total / count : 0
  return (
    <div className="stat">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <div className="stat-label" style={{ margin: 0 }}>คำสั่งซื้อทั้งหมด</div>
        <PeriodChips value={period} onChange={setPeriod} options={["all", "month", "year"]} />
      </div>
      <div className="stat-value">{M.num(count)}</div>
      <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{periodLabel(period, M.today)}</div>
      <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>
        {count ? `รวม ${M.thb(total)} · เฉลี่ย ${M.thb(avg)}/ออเดอร์` : "ไม่มีคำสั่งซื้อในช่วงนี้"}
      </div>
    </div>
  )
}

function SalesKpiCard() {
  const M = MOCK
  const [period, setPeriod] = React.useState("month")
  const filtered = React.useMemo(() => filterOrdersByPeriod(M.orders, period, M.today), [period])
  const total = filtered.reduce((s, o) => s + M.orderTotal(o), 0)
  const count = filtered.length
  return (
    <div className="stat">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <div className="stat-label" style={{ margin: 0 }}>ยอดขาย</div>
        <PeriodChips value={period} onChange={setPeriod} options={["all", "month", "year"]} />
      </div>
      <div className="stat-value">{total ? M.thb(total) : "—"}</div>
      <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>{periodLabel(period, M.today)}</div>
      <div className="dim" style={{ fontSize: 11, marginTop: 2 }}>
        {count ? `${M.num(count)} ออเดอร์` : "ไม่มียอดขายในช่วงนี้"}
      </div>
    </div>
  )
}

function OrdersTrendChart() {
  const M = MOCK
  const [period, setPeriod] = React.useState("month")
  const buckets = React.useMemo(() => bucketOrdersByPeriod(M.orders, period, M.today), [period])
  const total = buckets.reduce((s, b) => s + b.y, 0)
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-head">
        <h3>ออเดอร์ตามช่วงเวลา · Orders Trend</h3>
        <PeriodChips value={period} onChange={setPeriod} options={["all", "day", "week", "month", "year"]} />
      </div>
      <div className="dim" style={{ padding: "8px 18px 0", fontSize: 11 }}>{periodLabel(period, M.today)}</div>
      <div className="chart-wrap">
        {buckets.length === 0 ? <div className="empty">ไม่มีข้อมูล</div> : <BarChart data={buckets} height={240} valueLabels />}
      </div>
      <div className="dim" style={{ padding: "10px 18px", fontSize: 11, borderTop: "1px solid var(--border)" }}>
        รวม {M.num(total)} ออเดอร์ในช่วงเวลานี้
      </div>
    </div>
  )
}

function TopCategoriesCard({ setRoute }) {
  const M = MOCK
  const [period, setPeriod] = React.useState("all")
  const items = React.useMemo(() => {
    const src = filterOrdersByPeriod(M.orders, period, M.today)
    const totals = {}
    for (const o of src) for (const it of o.items) {
      const cat = it.type || (M.productOf(it.sku)?.category) || "อื่น ๆ"
      totals[cat] = (totals[cat] || 0) + (it.total || it.qty * it.price || 0)
    }
    return Object.entries(totals).map(([cat, total]) => ({ cat, total })).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [period])
  const max = items[0]?.total || 1
  return (
    <div className="card">
      <div className="card-head">
        <h3>หมวดสินค้าหลัก · Top Categories</h3>
        <PeriodChips value={period} onChange={setPeriod} options={["all", "month", "year"]} />
      </div>
      <div className="dim" style={{ padding: "8px 18px 0", fontSize: 11 }}>{periodLabel(period, M.today)}</div>
      {items.length === 0 ? <div className="empty">ไม่มีข้อมูลในช่วงเวลานี้</div> : (
        <div style={{ padding: "8px 0" }}>
          {items.map((it, i) => (
            <div key={it.cat} style={{ padding: "10px 18px", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.cat}</div>
                </div>
                <div className="mono" style={{ fontWeight: 500 }}>{M.thb(it.total)}</div>
              </div>
              <div style={{ height: 4, background: "var(--panel-2)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(it.total / max) * 100}%`, background: "var(--accent)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TopCustomersCard({ setRoute }) {
  const M = MOCK
  const [period, setPeriod] = React.useState("all")
  const items = React.useMemo(() => {
    const src = filterOrdersByPeriod(M.orders, period, M.today)
    const totals = {}
    for (const o of src) totals[o.customer] = (totals[o.customer] || 0) + M.orderTotal(o)
    return Object.entries(totals).map(([id, total]) => ({ id, total, customer: M.customerOf(id) })).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [period])
  const max = items[0]?.total || 1
  return (
    <div className="card">
      <div className="card-head">
        <h3>ลูกค้าหลัก · Top Customers</h3>
        <PeriodChips value={period} onChange={setPeriod} options={["all", "month", "year"]} />
      </div>
      <div className="dim" style={{ padding: "8px 18px 0", fontSize: 11 }}>{periodLabel(period, M.today)}</div>
      {items.length === 0 ? <div className="empty">ไม่มีข้อมูลในช่วงเวลานี้</div> : (
        <div style={{ padding: "8px 0" }}>
          {items.map((it, i) => (
            <div key={it.id} style={{ padding: "10px 18px", borderBottom: i < items.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }} onClick={() => setRoute("customers:" + it.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.customer?.name || it.id}</div>
                  <div className="mono dim" style={{ fontSize: 11, marginTop: 1 }}>{it.id}{it.customer?.brand ? ` · ${it.customer.brand}` : ""}</div>
                </div>
                <div className="mono" style={{ fontWeight: 500 }}>{M.thb(it.total)}</div>
              </div>
              <div style={{ height: 4, background: "var(--panel-2)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(it.total / max) * 100}%`, background: "var(--accent)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PriceChangesCard({ items, setRoute }) {
  const M = MOCK
  return (
    <div className="card">
      <div className="card-head"><h3>ราคาเปลี่ยนแปลงล่าสุด · Recent Price Changes</h3></div>
      <div className="tbl-scroll">
      <table className="tbl">
        <thead><tr><th>SKU</th><th>สินค้า</th><th className="num">ราคาเก่า</th><th className="num">ราคาใหม่</th><th className="num">เปลี่ยน</th><th>วันที่</th></tr></thead>
        <tbody>
          {items.map((it, i) => {
            const diff = ((it.newPrice - it.oldPrice) / it.oldPrice) * 100
            return (
              <tr key={it.sku + "|" + it.date + "|" + i} onClick={() => setRoute("prices:" + it.sku)}>
                <td className="code">{it.sku}</td>
                <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.product?.name}</td>
                <td className="num mono dim">{M.thbDec(it.oldPrice)}</td>
                <td className="num mono"><strong>{M.thbDec(it.newPrice)}</strong></td>
                <td className="num"><span className={"badge " + (diff > 0 ? "amber" : "green")}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}%</span></td>
                <td className="dim">{M.fmtDate(it.date)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function DashV1(props) {
  const { M, totalRev, prevYearRev, lastMonth, lastMonthLabel, prevMonth, recentOrders, setRoute } = props
  return (
    <>
      <div className="kpi-row">
        <KpiCard label="ยอดขาย 12 เดือน" value={M.thb(totalRev)} sub={prevYearRev ? `vs ปีก่อน ${M.thb(prevYearRev)}` : null} />
        <KpiCard label={`เดือนล่าสุด · ${lastMonthLabel}`} value={M.thb(lastMonth.rev)} sub={prevMonth ? `vs เดือนก่อน ${M.thb(prevMonth.rev)}` : null} />
        <OrdersKpiCard />
        <SalesKpiCard />
      </div>
      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <TopCategoriesCard setRoute={setRoute} />
        <TopCustomersCard setRoute={setRoute} />
      </div>
      <div className="card">
        <div className="card-head">
          <h3>คำสั่งซื้อล่าสุด · Recent Orders</h3>
          <span className="more" style={{ cursor: "pointer" }} onClick={() => setRoute("orders")}>ดูทั้งหมด</span>
        </div>
        <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>เลขเอกสาร</th><th>วันที่</th><th>ลูกค้า</th><th className="num">ยอดรวม</th><th>สถานะ</th></tr></thead>
          <tbody>
            {recentOrders.slice(0, 8).map(o => {
              const c = M.customerOf(o.customer)
              return (
                <tr key={o.doc + o.customer} onClick={() => setRoute("orders:" + o.doc)}>
                  <td className="code">{o.doc}</td>
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
    </>
  )
}

function DashV2(props) {
  const { M, totalRev, prevYearRev, lastMonthLabel, recentOrders, setRoute } = props
  return (
    <>
      <div className="grid dash-hero-grid" style={{ marginBottom: 20 }}>
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 180 }}>
          <div>
            <div className="stat-label">ยอดขายรวม 12 เดือน</div>
            <div style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-0.03em", marginTop: 6 }}>{M.thb(totalRev)}</div>
            {prevYearRev > 0 && <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>vs ปีก่อน {M.thb(prevYearRev)}</div>}
          </div>
        </div>
        <OrdersKpiCard />
      </div>
      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <TopCategoriesCard setRoute={setRoute} />
        <TopCustomersCard setRoute={setRoute} />
      </div>
      <div className="card">
        <div className="card-head">
          <h3>คำสั่งซื้อล่าสุด · Recent Orders</h3>
          <span className="more" style={{ cursor: "pointer" }} onClick={() => setRoute("orders")}>ดูทั้งหมด</span>
        </div>
        <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>เลขเอกสาร</th><th>วันที่</th><th>ลูกค้า</th><th className="num">ยอดรวม</th><th>สถานะ</th></tr></thead>
          <tbody>
            {recentOrders.slice(0, 5).map(o => {
              const c = M.customerOf(o.customer)
              return (
                <tr key={o.doc} onClick={() => setRoute("orders:" + o.doc)}>
                  <td className="code">{o.doc}</td>
                  <td>{M.fmtDate(o.date)}</td>
                  <td>{c?.name}</td>
                  <td className="num"><strong>{M.thb(M.orderTotal(o))}</strong></td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </>
  )
}

function DashV3(props) {
  const { M, lastMonth, lastMonthLabel, prevMonth, priceChanges, inactive, recentOrders, setRoute } = props
  const pending = M.orders.filter(o => o.status === "pending").length
  const shipped = M.orders.filter(o => o.status === "shipped").length
  return (
    <>
      <div className="kpi-row">
        <AlertCard count={pending} label="รอดำเนินการ" sub="Pending Orders" tone="amber" icon="clock" />
        <AlertCard count={shipped} label="พร้อมส่ง" sub="Ready to Ship" tone="blue" icon="package" />
        <KpiCard label={`ยอดขายเดือนล่าสุด · ${lastMonthLabel}`} value={M.thb(lastMonth.rev)} sub={prevMonth ? `vs เดือนก่อน ${M.thb(prevMonth.rev)}` : null} />
        <OrdersKpiCard />
        <SalesKpiCard />
      </div>
      <OrdersTrendChart />
      <div className="card">
        <div className="card-head">
          <h3>ออเดอร์ที่ต้องดู · Needs Attention</h3>
          <span className="more">Pending / Ready to Ship</span>
        </div>
        <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>เลขเอกสาร</th><th>ลูกค้า</th><th>วันที่</th><th className="num">ยอดรวม</th><th>สถานะ</th></tr></thead>
          <tbody>
            {M.orders.filter(o => o.status === "pending" || o.status === "shipped").slice(0, 12).map(o => (
              <tr key={o.doc + o.customer} onClick={() => setRoute("orders:" + o.doc)}>
                <td className="code">{o.doc}</td>
                <td>{M.customerOf(o.customer)?.name || o.customerName}</td>
                <td>{M.fmtDate(o.date)}</td>
                <td className="num"><strong>{M.thb(M.orderTotal(o))}</strong></td>
                <td><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  )
}

export function Dashboard({ variant, setVariant, setRoute }) {
  const M = MOCK
  const last12 = M.monthly.slice(-13, -1)
  const totalRev = last12.reduce((s, m) => s + m.rev, 0)
  const prevYearRev = M.monthly.slice(-25, -13).reduce((s, m) => s + m.rev, 0)
  const lastMonth = M.monthly[M.monthly.length - 2] || { m: "—", rev: 0 }
  const prevMonth = M.monthly[M.monthly.length - 3]
  const moMGrowth = prevMonth ? ((lastMonth.rev - prevMonth.rev) / prevMonth.rev) * 100 : 0
  const lastMonthYoY = (() => {
    if (!lastMonth.m || lastMonth.m === "—") return null
    const yago = M.monthly.find(m => m.m === lastMonth.m.replace(/^(\d{4})/, (_, y) => String(+y - 1)))
    if (!yago || !yago.rev) return null
    return ((lastMonth.rev - yago.rev) / yago.rev) * 100
  })()
  const monthNames = TH_MONTHS
  const lastMonthLabel = (() => {
    if (!lastMonth.m || lastMonth.m === "—") return "—"
    const parts = lastMonth.m.split("-")
    if (parts.length < 2) return "—"
    const [y, mo] = parts
    return `${monthNames[+mo-1]} ${(+y + 543).toString().slice(-2)}`
  })()
  const priceChanges = M.recentPriceChanges(5)
  const inactive = M.inactiveCustomers(60).slice(0, 5)
  const recentOrders = M.orders.slice(0, 6)
  const orderCount = M.orders.length
  const avgOrder = orderCount ? M.orders.reduce((s, o) => s + M.orderTotal(o), 0) / orderCount : 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">แดชบอร์ด · Overview</h1>
          <p className="page-sub">
            วันที่ {M.fmtDate(M.today)} · ภาพรวมยอดขาย คำสั่งซื้อ และความเคลื่อนไหวล่าสุด
            {M.lastUpdated && (
              <span className="dim" style={{ marginLeft: 8 }}>
                · อัพเดทล่าสุด {M.lastUpdated.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })} น.
              </span>
            )}
          </p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <div className="variant-switch">
            <button className={variant === "v1" ? "active" : ""} onClick={() => setVariant("v1")}>Overview</button>
            <button className={variant === "v2" ? "active" : ""} onClick={() => setVariant("v2")}>Sales Focus</button>
            <button className={variant === "v3" ? "active" : ""} onClick={() => setVariant("v3")}>Operations</button>
          </div>
        </div>
      </div>
      {variant === "v1" && <DashV1 {...{ M, totalRev, prevYearRev, lastMonth, lastMonthLabel, prevMonth, recentOrders, setRoute }} />}
      {variant === "v2" && <DashV2 {...{ M, totalRev, prevYearRev, lastMonthLabel, recentOrders, setRoute }} />}
      {variant === "v3" && <DashV3 {...{ M, lastMonth, lastMonthLabel, prevMonth, priceChanges, inactive, recentOrders, setRoute }} />}
    </div>
  )
}
