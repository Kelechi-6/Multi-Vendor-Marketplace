"use client"

import styles from "./VendorSidebar.module.css"

export default function VendorSidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: "overview", label: "Dashboard", icon: "📊" },
    { id: "products", label: "Products", icon: "📦" },
    { id: "orders", label: "Orders", icon: "🛒" },
    { id: "analytics", label: "Analytics", icon: "📈" },
    { id: "profile", label: "Profile", icon: "👤" },
  ]

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2>Vendor Panel</h2>
      </div>

      <nav className={styles.sidebarNav}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`${styles.navItem} ${activeTab === item.id ? styles.active : ""}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <button className={styles.logoutBtn}>
          <span className={styles.navIcon}>🚪</span>
          <span className={styles.navLabel}>Logout</span>
        </button>
      </div>
    </aside>
  )
}
