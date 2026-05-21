import React from 'react'

export function StatusBadge({ status }) {
  const map = {
    delivered: { cls: "green", label: "ส่งเรียบร้อย" },
    shipped: { cls: "blue", label: "พร้อมส่ง" },
    pending: { cls: "amber", label: "รอดำเนินการ" },
    cancelled: { cls: "red", label: "ยกเลิก" },
  }
  const s = map[status] || { cls: "", label: status || "—" }
  return <span className={"badge " + s.cls}><span className="dot" />{s.label}</span>
}

export function BackToList({ setRoute, target, label }) {
  return (
    <div className="row" style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ cursor: "pointer", color: "var(--text-2)" }} onClick={() => setRoute(target)}>
        ← {label}
      </span>
    </div>
  )
}

export function SortTh({ col, sort, onSort, children, className }) {
  const active = sort.col === col
  return (
    <th className={className} style={{ cursor: "pointer", userSelect: "none" }} onClick={() => onSort(col)}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
        {children}
        <span style={{ opacity: active ? 0.85 : 0.18, fontSize: 9, lineHeight: 1 }}>
          {active && sort.dir === "asc" ? "↑" : "↓"}
        </span>
      </span>
    </th>
  )
}

export function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange, sizes = [10, 25, 50] }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const cur = Math.min(Math.max(1, page), totalPages)
  const start = total === 0 ? 0 : (cur - 1) * pageSize + 1
  const end = Math.min(total, cur * pageSize)
  return (
    <div className="pagination">
      <div className="pagination-info">
        {total === 0 ? "ไม่มีรายการ" : `แสดง ${start}-${end} จาก ${total} รายการ`}
      </div>
      <div className="pagination-nav">
        <button onClick={() => onPageChange(1)} disabled={cur === 1} title="หน้าแรก">«</button>
        <button onClick={() => onPageChange(cur - 1)} disabled={cur === 1} title="ก่อนหน้า">‹</button>
        <span className="page-info">หน้า {cur} / {totalPages}</span>
        <button onClick={() => onPageChange(cur + 1)} disabled={cur === totalPages} title="ถัดไป">›</button>
        <button onClick={() => onPageChange(totalPages)} disabled={cur === totalPages} title="หน้าสุดท้าย">»</button>
      </div>
      <div className="pagination-size">
        <select value={pageSize} onChange={e => onPageSizeChange(+e.target.value)}>
          {sizes.map(s => <option key={s} value={s}>{s} / หน้า</option>)}
        </select>
      </div>
    </div>
  )
}
