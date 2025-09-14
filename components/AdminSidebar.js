"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import styles from "./AdminSidebar.module.css"

export default function AdminSidebar() {
  const [activeItem, setActiveItem] = useState("dashboard")
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("adminAuth")
    router.push("/admin/login")
  }

  const menuItems = [
    { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: "📊" },
    { id: "users", label: "Users", href: "/admin/users", icon: "👥" },
    { id: "vendors", label: "Vendors", href: "/admin/vendors", icon: "🏪" },
    { id: "products", label: "Products", href: "/admin/products", icon: "📦" },
    { id: "orders", label: "Orders", href: "/admin/orders", icon: "🛒" },
    { id: "analytics", label: "Analytics", href: "/admin/analytics", icon: "📈" },
    { id: "settings", label: "Settings", href: "/admin/settings", icon: "⚙️" },
  ]

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <Link href="/admin/dashboard" className={styles.logo}>
          <h2>Keecee Admin</h2>
        </Link>
      </div>

      <nav className={styles.sidebarNav}>
        {menuItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`${styles.navItem} ${activeItem === item.id ? styles.active : ""}`}
            onClick={() => setActiveItem(item.id)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <span className={styles.navIcon}>🚪</span>
          <span className={styles.navLabel}>Logout</span>
        </button>
      </div>
    </aside>
  )
}
