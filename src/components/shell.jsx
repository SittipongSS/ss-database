import React from 'react'
import MOCK from '../lib/mock.js'
import { Icon } from './icons.jsx'

export function Sidebar({ route, setRoute, sidebarMode, setSidebarMode, onSearch, query, onClose, theme, onToggleTheme }) {
  const M = MOCK
  const items = [
    { id: "dashboard", label: "แดชบอร์ด", labelEn: "Dashboard", icon: "dashboard" },
    { type: "section", label: "Data" },
    { id: "products", label: "สินค้า", labelEn: "Products", icon: "products", count: M.products.length },
    { id: "customers", label: "ลูกค้า", labelEn: "Customers", icon: "customers", count: M.customers.length },
    { id: "orders", label: "คำสั่งซื้อ", labelEn: "Orders", icon: "orders", count: M.orders.length },
    { type: "section", label: "Insights" },
    { id: "prices", label: "ประวัติราคา", labelEn: "Price History", icon: "trending" },
  ]

  const collapsed = sidebarMode === "icon"

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1000px)").matches) {
      onClose && onClose()
    } else {
      setSidebarMode(collapsed ? "expanded" : "icon")
    }
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">SS</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="brand-name">SS Database</div>
          <div className="brand-sub">Scent &amp; Sense Co.</div>
        </div>
        <button className="sidebar-toggle" onClick={handleToggle} title={collapsed ? "ขยาย" : "ย่อ"}>
          <Icon name={collapsed ? "menu" : "x"} className="ico sidebar-toggle-icon-desktop" />
          <Icon name="x" className="ico sidebar-toggle-icon-mobile" />
        </button>
      </div>
      <div className="sidebar-search">
        <div className="search-bar" style={{ margin: 0, maxWidth: "100%" }}>
          <Icon name="search" className="icon-l" />
          <input placeholder="ค้นหา…" value={query || ""} onChange={e => onSearch(e.target.value)} style={{ height: 30 }} />
        </div>
      </div>
      <div className="nav">
        {items.map((it, idx) => {
          if (it.type === "section") return <div key={idx} className="nav-section">{it.label}</div>
          const route0 = (route || "").split(":")[0]
          const active = route0 === it.id
          return (
            <div key={it.id} className={"nav-item " + (active ? "active" : "")} onClick={() => setRoute(it.id)}>
              <Icon name={it.icon} className="ico" />
              <span className="nav-label">{it.label}</span>
              {it.count != null && <span className="nav-count">{it.count}</span>}
            </div>
          )
        })}
      </div>
      <div className="sidebar-footer">
        <button
          className="btn ghost icon-only sidebar-theme-btn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "เปลี่ยนเป็น Light mode" : "เปลี่ยนเป็น Dark mode"}
        >
          <Icon name="contrast" className="ico" />
        </button>
        <span className="sidebar-footer-label">{theme === "dark" ? "Dark" : "Light"}</span>
      </div>
    </aside>
  )
}

export function Topbar({ crumbs, setRoute, onSearch, query, onMenuClick, onBack, canGoBack }) {
  return (
    <div className="topbar">
      <button className="btn ghost icon-only menu-btn" onClick={onMenuClick} title="เมนู" style={{ display: "none" }}>
        <Icon name="menu" className="ico" />
      </button>
      <div style={{ flex: 1 }} />
      <div className="search-bar">
        <Icon name="search" className="icon-l" />
        <input
          placeholder="ค้นหารหัสสินค้า · เลขเอกสาร · ลูกค้า…"
          value={query || ""}
          onChange={e => onSearch(e.target.value)}
        />
      </div>
    </div>
  )
}
