"use client"
import { useEffect, useState } from "react"
import Header from "../../components/Header"
import styles from "./page.module.css"
import supabase from "../../lib/supabaseClient"
import { useCart } from "../../contexts/CartContext"
import FullPageLoader from "../../components/FullPageLoader"

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [featuredVendors, setFeaturedVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { addToCart } = useCart()

  const categoryIcon = (name = "") => {
    const key = String(name).toLowerCase()
    if (key.includes("electronic") || key.includes("gadg")) return "🔌"
    if (key.includes("fashion") || key.includes("cloth") || key.includes("apparel")) return "👗"
    if (key.includes("beauty") || key.includes("cosmetic")) return "💄"
    if (key.includes("home") || key.includes("furniture") || key.includes("kitchen")) return "🏠"
    if (key.includes("book") || key.includes("literature")) return "📚"
    if (key.includes("sport") || key.includes("fitness")) return "🏀"
    if (key.includes("grocery") || key.includes("food")) return "🛒"
    if (key.includes("toy") || key.includes("kid")) return "🧸"
    if (key.includes("music") || key.includes("audio")) return "🎵"
    if (key.includes("health") || key.includes("wellness")) return "🩺"
    if (key.includes("jewel")) return "💍"
    return "🏷️"
  }

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch categories
        const { data: catData, error: catErr } = await supabase
          .from("categories")
          .select("id, name")
          .order("name")
        if (catErr) throw catErr

        // Fetch featured products (active status), latest 8
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("id, name, price, image_url, status, categories_id")
          .eq("status", "active")
          .order("name")
          .limit(8)
        if (prodErr) throw prodErr

        // Fetch vendors (latest 6)
        const { data: vendData, error: vendErr } = await supabase
          .from("vendors")
          .select("id, shop_name, display_name, bio, business_type")
          .order("created_at", { ascending: false })
          .limit(6)
        if (vendErr) throw vendErr

        setCategories(catData || [])
        setFeaturedProducts(prodData || [])
        setFeaturedVendors(vendData || [])
      } catch (e) {
        setError(e.message || "Failed to load homepage data")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className={styles.homepage}>
      <Header />
      {loading && <FullPageLoader message="Loading homepage..." />}

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <div>
              <h1 className={styles.heroTitle}>
                Welcome to <span>Keecee Collection</span>
              </h1>
              <p className={styles.heroSubtitle}>
                Discover amazing products from trusted vendors around the world. Shop with confidence and find exactly
                what you're looking for.
              </p>
              <div className={styles.heroActions}>
                <a href="/products" className="btn btn-primary">
                  Shop Now
                </a>
                <a href="/vendors/register" className="btn btn-secondary">
                  Become a Vendor
                </a>
              </div>
            </div>
            <div className={styles.heroImage}>
              <img src="/modern-e-commerce-hero-image.png" alt="Keecee Collection Hero" />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className={styles.categories}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Shop by Category</h2>
          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 ${styles.categoryGrid}`}>
            {categories.map((category) => (
              <div key={category.id} className={styles.categoryCard}>
                <div className={styles.categoryIcon}>{categoryIcon(category.name)}</div>
                <h3 className={styles.categoryName}>{category.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className={styles.featuredProducts}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Featured Products</h2>
          {loading && <div className={styles.loading} />}
          {error && <div className={styles.errorMessage}>{error}</div>}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${styles.productGrid}`}>
            {featuredProducts.map((product) => (
              <div key={product.id} className={styles.productCard}>
                <div className={styles.productImage}>
                  <img src={product.image_url || "/placeholder.svg"} alt={product.name} />
                </div>
                <div className={styles.productInfo}>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productPrice}>₦{Number(product.price || 0).toLocaleString()}</div>
                  <button
                    type="button"
                    className={`btn btn-primary ${styles.addToCartBtn}`}
                    onClick={() => addToCart(product)}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Vendors */}
      <section className={styles.featuredVendors}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Featured Vendors</h2>
          {featuredVendors.length === 0 ? (
            <div className={styles.vendorEmpty}>
              <p>No vendors to show yet.</p>
              <div className={styles.vendorCtas}>
                <a href="/stores" className="btn btn-secondary">Browse Vendors</a>
                <a href="/vendors/register" className="btn btn-primary">Become a Vendor</a>
              </div>
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-3 ${styles.vendorGrid}`}>
              {featuredVendors.map((vendor) => (
                <div key={vendor.id} className={styles.vendorCard}>
                  <div className={styles.vendorImage}>
                    <img src={"/user-avatar.png"} alt={vendor.shop_name || vendor.display_name || "Vendor"} />
                  </div>
                  <div className={styles.vendorInfo}>
                    <h3 className={styles.vendorName}>{vendor.display_name || vendor.shop_name || "Vendor"}</h3>
                    {vendor.business_type && (
                      <p className={styles.vendorMeta}>{vendor.business_type}</p>
                    )}
                    <p className={styles.vendorDescription}>{vendor.bio || ""}</p>
                    <a href={`/stores/${vendor.id}`} className="btn btn-primary">View Store</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerContent}>
            <div className={styles.footerSection}>
              <h3>Keecee Collection</h3>
              <p>Your trusted multi-vendor marketplace for quality products from around the world.</p>
            </div>
            <div className={styles.footerSection}>
              <h4>Quick Links</h4>
              <ul>
                <li>
                  <a href="/about">About Us</a>
                </li>
                <li>
                  <a href="/contact">Contact</a>
                </li>
                <li>
                  <a href="/help">Help Center</a>
                </li>
                <li>
                  <a href="/terms">Terms of Service</a>
                </li>
              </ul>
            </div>
            <div className={styles.footerSection}>
              <h4>For Vendors</h4>
              <ul>
                <li>
                  <a href="/vendors/register">Become a Vendor</a>
                </li>
                <li>
                  <a href="/vendors/login">Vendor Login</a>
                </li>
                <li>
                  <a href="/vendors/help">Vendor Help</a>
                </li>
              </ul>
            </div>
            <div className={styles.footerSection}>
              <h4>Customer Service</h4>
              <ul>
                <li>
                  <a href="/shipping">Shipping Info</a>
                </li>
                <li>
                  <a href="/returns">Returns</a>
                </li>
                <li>
                  <a href="/faq">FAQ</a>
                </li>
              </ul>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>&copy; 2024 Keecee Collection. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
