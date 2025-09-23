"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCart } from "../contexts/CartContext"
import supabase from "../lib/supabaseClient"
import styles from "./Header.module.css"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState(null) // auth user
  const [profile, setProfile] = useState(null) // row from users table
  const [hasVendor, setHasVendor] = useState(false)
  const [hasAdmin, setHasAdmin] = useState(false)
  const [theme, setTheme] = useState("light")
  const { getCartItemsCount } = useCart()
  const cartCount = getCartItemsCount()
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  // ✅ Load session & subscribe to auth changes
  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setUser(data.session.user)
      }
    }
    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  // ✅ Initialize theme from localStorage and apply to document
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
    const initial = saved === 'dark' ? 'dark' : 'light'
    setTheme(initial)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', initial)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next)
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', next)
    }
  }

  // ✅ Fetch profile from users table
  useEffect(() => {
    const getProfile = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from("users")
        .select("username, phone, email")
        .eq("id", user.id)
        .maybeSingle()

      if (!error) {
        setProfile(data)
      }
    }
    getProfile()
  }, [user])

  // ✅ Check if the logged-in user is a vendor
  useEffect(() => {
    const checkVendor = async () => {
      if (!user) {
        setHasVendor(false)
        setHasAdmin(false)
        return
      }
      const { data } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
      setHasVendor(!!data)
    }
    checkVendor()
  }, [user])

  // ✅ Check if the logged-in user is a super user (admin)
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) { setHasAdmin(false); return }
      const { data } = await supabase
        .from("users")
        .select("super_user")
        .eq("id", user.id)
        .maybeSingle()
      setHasAdmin(!!data?.super_user)
    }
    checkAdmin()
  }, [user])

  // ✅ Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setIsMenuOpen(false)
  }

  // ✅ Decide what to display as name
  const displayName =
    profile?.username || user?.user_metadata?.username || user?.user_metadata?.full_name || profile?.email || user?.email || "Guest"

  return (
    <header className={`${styles.header} ${isAdminRoute ? styles.admin : ''}`}>
      <div className="container">
        <div className={styles.headerContent}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <h1>Keecee Collection</h1>
          </Link>

          {/* Search Bar */}
          <SearchBar />

          {/* Navigation */}
          <NavLinks />

          {/* Theme Toggle */}
          <div className={styles.themeToggle}>
            <button
              onClick={toggleTheme}
              className={styles.toggle}
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              <span className={styles.thumb}>
                {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
              </span>
            </button>
          </div>

          {/* User Actions */}
          <UserActions
            user={user}
            cartCount={cartCount}
            onLogout={handleLogout}
            displayName={displayName}
            hasVendor={hasVendor}
            hasAdmin={hasAdmin}
          />

          {/* Mobile Menu Toggle */}
          <button
            className={styles.mobileMenuButton}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <MenuIcon />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <MobileMenu user={user} onLogout={handleLogout} displayName={displayName} hasVendor={hasVendor} hasAdmin={hasAdmin} />
        )}
      </div>
    </header>
  )
}

function SearchBar() {
  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        placeholder="Search products, vendors..."
        className={styles.searchInput}
      />
      <button className={styles.searchButton}>
        <SearchIcon />
      </button>
    </div>
  )
}

function NavLinks() {
  return (
    <nav className={styles.nav}>
      <Link href="/products" className={styles.navLink}>
        Products
      </Link>
    </nav>
  )
}

function UserActions({ user, cartCount, onLogout, displayName, hasVendor, hasAdmin }) {
  return (
    <div className={styles.userActions}>
      {user ? (
        <div className={styles.userMenu}>
          <Link href="/profile" className={styles.userLink}>
            <img
              src={user.user_metadata?.avatar_url || "/user-avatar.png"}
              alt="User Avatar"
              className={styles.userAvatar}
            />
            <span>{displayName}</span>
          </Link>
          {hasVendor ? (
            <Link href="/vendors" className={styles.authLink}>
              Vendor Dashboard
            </Link>
          ) : (
            <Link href="/vendors/register" className={styles.authLink}>
              Become a Vendor
            </Link>
          )}
          {hasAdmin && (
            <Link href="/admin/dashboard" className={styles.authLink}>
              Admin
            </Link>
          )}
          <button onClick={onLogout} className={styles.logoutLink}>
            Logout
          </button>
        </div>
      ) : (
        <>
          <Link href="/login" className={styles.authLink}>
            Login
          </Link>
          <Link href="/register" className={styles.authLink}>
            Register
          </Link>
        </>
      )}
      <Link href="/cart" className={styles.cartLink}>
        <CartIcon />
        {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
      </Link>
    </div>
  )
}

function MobileMenu({ user, onLogout, displayName, hasVendor, hasAdmin }) {
  return (
    <div className={styles.mobileMenu}>
      <Link href="/products" className={styles.mobileNavLink}>
        Products
      </Link>
      <Link href="/vendors" className={styles.mobileNavLink}>
        Vendors
      </Link>
      {user ? (
        <>
          <Link href="/profile" className={styles.mobileNavLink}>
            {displayName}
          </Link>
          {hasVendor ? (
            <Link href="/vendors" className={styles.mobileNavLink}>
              Vendor Dashboard
            </Link>
          ) : (
            <Link href="/vendors/register" className={styles.mobileNavLink}>
              Become a Vendor
            </Link>
          )}
          {hasAdmin && (
            <Link href="/admin/dashboard" className={styles.mobileNavLink}>
              Admin
            </Link>
          )}
          <button onClick={onLogout} className={styles.mobileNavLink}>
            Logout
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className={styles.mobileNavLink}>
            Login
          </Link>
          <Link href="/register" className={styles.mobileNavLink}>
            Register
          </Link>
        </>
      )}
    </div>
  )
}

/* --- SVG ICONS --- */
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364-1.414 1.414M6.05 17.95l-1.414 1.414m12.728 0-1.414-1.414M6.05 6.05 4.636 4.636"></path>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  )
}
