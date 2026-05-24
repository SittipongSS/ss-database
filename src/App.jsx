import React, { useState, useEffect, useMemo, useCallback } from 'react'
import MOCK from './lib/mock.js'
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect } from './components/tweaks.jsx'
import { Sidebar, Topbar } from './components/shell.jsx'
import { Dashboard } from './components/dashboard.jsx'
import { Tracking, PriceHistoryPage } from './components/tracking.jsx'
import { ProductsList, ProductDetail } from './components/products.jsx'
import { CustomersList, CustomerDetail } from './components/customers.jsx'
import { OrdersList, InvoiceDetail } from './components/orders.jsx'

const TWEAK_DEFAULTS = {
  theme: "light",
  density: "comfortable",
  sidebar: "expanded",
  dashboardVariant: "v1",
}

const SHEETS_URL = import.meta.env.VITE_SHEETS_URL

// Bump this when the API schema changes to clear stale localStorage cache
const CACHE_VERSION = 'v4'
;(() => {
  try {
    if (localStorage.getItem('ss_cache_ver') !== CACHE_VERSION) {
      ['ss_all', 'ss_customers', 'ss_products', 'ss_orders', 'ss_data'].forEach(k => localStorage.removeItem(k))
      localStorage.setItem('ss_cache_ver', CACHE_VERSION)
    }
  } catch(e) {}
})()

function App() {
  const [history, setHistory] = useState(["dashboard"])
  const route = history[history.length - 1]
  const [, forceUpdate] = useState(0)
  const setRoute = useCallback((r) => {
    setHistory(h => h[h.length - 1] === r ? h : [...h, r])
  }, [])
  const goBack = useCallback(() => {
    setHistory(h => h.length > 1 ? h.slice(0, -1) : h)
  }, [])
  const canGoBack = history.length > 1

  const [query, setQuery] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS)
  // true once data is available (from cache or API) — used for loading bar
  const [ready, setReady] = useState(() => {
    try { return !!localStorage.getItem('ss_all') } catch(e) { return false }
  })

  // page derived early — used in effects deps AND in render
  const [page, param] = route.split(":")

  const reloadMock = useCallback((data) => {
    MOCK.reload(data)
    setReady(true)
    forceUpdate(v => v + 1)
  }, [])

  // Fetch sheets: try ?sheet=all first, fall back to 3 parallel calls
  const fetchSheet = useCallback(async () => {
    try {
      const cached = localStorage.getItem('ss_all')
      if (cached) reloadMock(JSON.parse(cached))
    } catch(e) {}
    try {
      const r = await fetch('/api/sheets?sheet=all')
      const data = await r.json()
      // If GAS returns all keys, use it directly
      if (data && !data.error && data.customers && data.orders && data.products) {
        reloadMock(data)
        try { localStorage.setItem('ss_all', JSON.stringify(data)) } catch(e) {}
        return
      }
    } catch(e) {}
    // Fallback: 3 parallel calls (works with old GAS that doesn't support ?sheet=all)
    try {
      const [cRes, pRes, oRes] = await Promise.all([
        fetch('/api/sheets?sheet=customers'),
        fetch('/api/sheets?sheet=products'),
        fetch('/api/sheets?sheet=orders'),
      ])
      const [cData, pData, oData] = await Promise.all([cRes.json(), pRes.json(), oRes.json()])
      const merged = {
        ...cData,
        ...pData,
        ...oData,
      }
      if (merged.customers || merged.orders || merged.products) {
        reloadMock(merged)
        try { localStorage.setItem('ss_all', JSON.stringify(merged)) } catch(e) {}
      }
    } catch(e) { console.error('[sheets] fetch failed', e) }
  }, [reloadMock])

  // On mount: fetch all data in one request
  useEffect(() => {
    if (!SHEETS_URL) return
    fetchSheet()
  }, [fetchSheet])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!SHEETS_URL) return
    const id = setInterval(fetchSheet, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchSheet])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute("data-theme", tweaks.theme)
    root.setAttribute("data-density", tweaks.density)
    root.setAttribute("data-sidebar", tweaks.sidebar)
  }, [tweaks.theme, tweaks.density, tweaks.sidebar])

  useEffect(() => {
    document.documentElement.setAttribute("data-mobile-open", mobileOpen ? "true" : "false")
  }, [mobileOpen])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    const main = document.querySelector(".main")
    if (main) main.scrollTop = 0
  }, [route])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setRoute("tracking")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [setRoute])

  const handleSearch = useCallback((v) => {
    setQuery(v)
    if (v && !route.startsWith("tracking")) {
      setRoute("tracking")
    }
  }, [route, setRoute])

  const M = MOCK

  const crumbs = useMemo(() => {
    const map = {
      dashboard: [{ label: "แดชบอร์ด" }],
      tracking: [{ label: "ค้นหา / Tracking" }],
      products: param
        ? [{ label: "สินค้า", route: "products" }, { label: param + " · " + (M.productOf(param)?.name || "") }]
        : [{ label: "สินค้า" }],
      customers: param
        ? [{ label: "ลูกค้า", route: "customers" }, { label: param + " · " + (M.customerOf(param)?.name || "") }]
        : [{ label: "ลูกค้า" }],
      orders: param
        ? [{ label: "คำสั่งซื้อ", route: "orders" }, { label: param }]
        : [{ label: "คำสั่งซื้อ" }],
      prices: param
        ? [{ label: "ประวัติราคา", route: "prices" }, { label: param }]
        : [{ label: "ประวัติราคา" }],
    }
    return map[page] || [{ label: page }]
  }, [route, page, param])

  return (
    <div className="app">
      <Sidebar
        route={route}
        setRoute={(r) => { setRoute(r); setQuery(""); setMobileOpen(false) }}
        sidebarMode={tweaks.sidebar}
        setSidebarMode={(v) => setTweak("sidebar", v)}
        onSearch={handleSearch}
        query={query}
        onClose={() => setMobileOpen(false)}
        theme={tweaks.theme}
        onToggleTheme={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}
      />
      <div className="scrim" onClick={() => setMobileOpen(false)} />
      <div className="main">
        {SHEETS_URL && !ready && (
          <div className="loading-bar"><div className="loading-bar-fill" /></div>
        )}
        <Topbar
          crumbs={crumbs}
          setRoute={setRoute}
          onSearch={handleSearch}
          query={query}
          onMenuClick={() => setMobileOpen(true)}
          onBack={goBack}
          canGoBack={canGoBack}
        />

        {page === "dashboard" && (
          <Dashboard
            variant={tweaks.dashboardVariant}
            setVariant={(v) => setTweak("dashboardVariant", v)}
            setRoute={setRoute}
          />
        )}
        {page === "tracking" && (
          <Tracking key={query} initialQuery={query} setRoute={setRoute} />
        )}
        {page === "products" && !param && <ProductsList setRoute={setRoute} goBack={goBack} canGoBack={canGoBack} />}
        {page === "products" && param && <ProductDetail sku={param} setRoute={setRoute} goBack={goBack} canGoBack={canGoBack} />}
        {page === "customers" && !param && <CustomersList setRoute={setRoute} goBack={goBack} canGoBack={canGoBack} />}
        {page === "customers" && param && <CustomerDetail id={param} setRoute={setRoute} goBack={goBack} canGoBack={canGoBack} />}
        {page === "orders" && !param && <OrdersList setRoute={setRoute} goBack={goBack} canGoBack={canGoBack} />}
        {page === "orders" && param && <InvoiceDetail doc={param} setRoute={setRoute} goBack={goBack} canGoBack={canGoBack} />}
        {page === "prices" && <PriceHistoryPage initialSku={param} setRoute={setRoute} goBack={goBack} canGoBack={canGoBack} />}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Appearance" />
        <TweakRadio label="Theme" value={tweaks.theme} options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]} onChange={(v) => setTweak("theme", v)} />
        <TweakRadio label="Density" value={tweaks.density} options={[
          { value: "comfortable", label: "Comfortable" },
          { value: "compact", label: "Compact" },
        ]} onChange={(v) => setTweak("density", v)} />
        <TweakRadio label="Sidebar" value={tweaks.sidebar} options={[
          { value: "expanded", label: "Expanded" },
          { value: "icon", label: "Icon only" },
        ]} onChange={(v) => setTweak("sidebar", v)} />
        <TweakSection label="Dashboard" />
        <TweakSelect label="Variant" value={tweaks.dashboardVariant}
          options={[
            { value: "v1", label: "Overview (Balanced)" },
            { value: "v2", label: "Sales Focus" },
            { value: "v3", label: "Operations" },
          ]}
          onChange={(v) => setTweak("dashboardVariant", v)}
        />
      </TweaksPanel>
    </div>
  )
}

export default App
