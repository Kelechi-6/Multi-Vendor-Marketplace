"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Header from "../../../components/Header"
import supabase from "../../../lib/supabaseClient"
import styles from "./page.module.css"
import FullPageLoader from "../../../components/FullPageLoader"
import Link from "next/link"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null) 
  const [profile, setProfile] = useState(null) 
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")
  const [orders, setOrders] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [addresses, setAddresses] = useState([])

  // ✅ Fetch current auth user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) console.error("Error fetching user:", error.message)
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  // ✅ Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // ✅ Fetch profile from `users` table
  useEffect(() => {
    const getProfile = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from("users")
        .select("username, phone, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle()

      if (error) {
        console.error("Error fetching profile:", error.message)
      } else {
        setProfile(data)
      }
    }
    getProfile()
  }, [user])

  // ✅ Fetch orders, wishlist, addresses
  useEffect(() => {
    const loadExtras = async () => {
      if (!user) return

      // Orders
      const { data: orderRows } = await supabase
        .from("orders")
        .select("id, created_at, products, delete")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      setOrders(orderRows || [])

      // Wishlist (table to be created via SQL below)
      const { data: wishlistRows } = await supabase
        .from("wishlist")
        .select("id, product_id, created_at, products(name, price, image_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      setWishlist(wishlistRows || [])

      // Addresses (table to be created via SQL below)
      const { data: addressRows } = await supabase
        .from("addresses")
        .select("id, full_name, phone, line1, line2, city, state, postal_code, country, is_default, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      setAddresses(addressRows || [])
    }
    loadExtras()
  }, [user])

  // ✅ Centralized display info
  const displayName = profile?.username || user?.user_metadata?.username || user?.user_metadata?.full_name || "No Name"
  const displayEmail = profile?.email || user?.email
  const displayPhone = profile?.phone || user?.user_metadata?.phone || "Not set"
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || "/user-avatar.png"

  // ✅ Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <>
        <Header />
        <FullPageLoader message="Loading profile..." />
      </>
    )
  }

  if (!user) return null

  return (
    <div className={styles.profilePage}>
      <Header />
      <div className="container">
        <div className={styles.profileContainer}>
          {/* Sidebar */}
          <div className={styles.profileSidebar}>
            <div className={styles.userInfo}>
              <img src={avatarUrl} alt="User Avatar" />
              <h2>{displayName}</h2>
              <p>{displayEmail}</p>
              <p className={styles.joinDate}>
                Member since {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>

            <nav className={styles.profileNav}>
              <button onClick={() => setActiveTab("profile")} className={`${styles.navItem} ${activeTab === "profile" ? styles.active : ""}`}>
                👤 Profile Information
              </button>
              <button onClick={() => setActiveTab("orders")} className={`${styles.navItem} ${activeTab === "orders" ? styles.active : ""}`}>
                📦 Order History
              </button>
              <button onClick={() => setActiveTab("wishlist")} className={`${styles.navItem} ${activeTab === "wishlist" ? styles.active : ""}`}>
                ❤️ Wishlist
              </button>
              <button onClick={() => setActiveTab("addresses")} className={`${styles.navItem} ${activeTab === "addresses" ? styles.active : ""}`}>
                📍 Addresses
              </button>
            </nav>

            <button onClick={handleLogout} className={styles.logoutBtn}>🚪 Logout</button>
          </div>

          {/* Main Content */}
          <main className={styles.profileMain}>
            {activeTab === "profile" && (
              <div className={styles.profileContent}>
                <div className={styles.sectionHeader}>
                  <h1>Profile Information</h1>
                  <button className="btn btn-primary" onClick={() => router.push("/profile/edit")}>Edit Profile</button>
                </div>

                <div className={styles.profileCard}>
                  <div className={styles.profileField}>
                    <label>Full Name</label>
                    <span>{displayName}</span>
                  </div>
                  <div className={styles.profileField}>
                    <label>Email Address</label>
                    <span>{displayEmail}</span>
                  </div>
                  <div className={styles.profileField}>
                    <label>Phone Number</label>
                    <span>{displayPhone}</span>
                  </div>
                  <div className={styles.profileField}>
                    <label>Member Since</label>
                    <span>{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div>
                <div className={styles.sectionHeader}>
                  <h1>Order History</h1>
                  <p>Your recent orders and their statuses</p>
                </div>
                {(!orders || orders.length === 0) ? (
                  <div className={styles.emptyState}>
                    <h3>No orders yet</h3>
                    <p>When you place orders, they will appear here.</p>
                    <Link className="btn btn-primary" href="/products">Start Shopping</Link>
                  </div>
                ) : (
                  <div className={styles.ordersList}>
                    {orders.map((o) => {
                      let parsed = []
                      try {
                        parsed = typeof o.products === 'string' ? JSON.parse(o.products) : (o.products || [])
                      } catch (_e) { parsed = [] }
                      return (
                        <div key={o.id} className={styles.orderCard}>
                          <div className={styles.orderHeader}>
                            <div className={styles.orderInfo}>
                              <h3>Order #{o.id.slice(0,8)}</h3>
                              <p>{new Date(o.created_at).toLocaleString()}</p>
                            </div>
                            <div className={styles.orderStatus}>
                              <span className={`${styles.status} ${styles.statusPending}`}>{o.delete ? 'Cancelled' : 'Processing'}</span>
                            </div>
                          </div>
                          <div className={styles.orderItems}>
                            {parsed.map((item, idx) => (
                              <div key={idx} className={styles.orderItem}>
                                <img src={item.image_url || "/placeholder.svg"} alt={item.name} />
                                <div className={styles.itemInfo}>
                                  <h4>{item.name}</h4>
                                  <p>₦{Number(item.price || 0).toLocaleString()} {item.quantity ? `• x${item.quantity}` : ''}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "wishlist" && (
              <div>
                <div className={styles.sectionHeader}>
                  <h1>Wishlist</h1>
                  <p>Products you saved for later</p>
                </div>
                {(!wishlist || wishlist.length === 0) ? (
                  <div className={styles.emptyState}>
                    <h3>Your wishlist is empty</h3>
                    <p>Browse products and add items to your wishlist.</p>
                    <Link className="btn btn-primary" href="/products">Browse Products</Link>
                  </div>
                ) : (
                  <div className={styles.ordersList}>
                    {wishlist.map((w) => (
                      <div key={w.id} className={styles.orderItem}>
                        <img src={w.products?.image_url || "/placeholder.svg"} alt={w.products?.name || 'Product'} />
                        <div className={styles.itemInfo}>
                          <h4>{w.products?.name}</h4>
                          <p>₦{Number(w.products?.price || 0).toLocaleString()}</p>
                        </div>
                        <div className={styles.orderActions}>
                          <Link href={`/products/${w.product_id}`} className="btn btn-secondary">View</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "addresses" && (
              <div>
                <div className={styles.sectionHeader}>
                  <h1>Addresses</h1>
                  <p>Your saved shipping addresses</p>
                </div>
                {(!addresses || addresses.length === 0) ? (
                  <div className={styles.emptyState}>
                    <h3>No addresses saved</h3>
                    <p>Add your shipping address for faster checkout.</p>
                  </div>
                ) : (
                  <div className={styles.addressesList}>
                    {addresses.map((a) => (
                      <div key={a.id} className={styles.addressCard}>
                        <div className={styles.addressHeader}>
                          <h3>{a.full_name || displayName}</h3>
                          {a.is_default && <span className={styles.defaultBadge}>Default</span>}
                        </div>
                        <div className={styles.addressInfo}>
                          <p>{a.line1}</p>
                          {a.line2 && <p>{a.line2}</p>}
                          <p>{a.city}, {a.state} {a.postal_code}</p>
                          <p>{a.country}</p>
                          {a.phone && <p>{a.phone}</p>}
                        </div>
                        <div className={styles.addressActions}>
                          <button className="btn btn-secondary" disabled>Edit</button>
                          <button className="btn btn-secondary" disabled>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
