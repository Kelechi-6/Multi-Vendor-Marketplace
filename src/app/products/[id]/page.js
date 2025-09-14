"use client"

import { useEffect, useState } from "react"
import Header from "../../../../components/Header"
import styles from "./page.module.css"
import supabase from "../../../../lib/supabaseClient"
import { useCart } from "../../../../contexts/CartContext"
import FullPageLoader from "../../../../components/FullPageLoader"

export default function ProductDetailPage({ params }) {
  const id = params.id
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { addToCart } = useCart()
  const [wishLoading, setWishLoading] = useState(false)
  const [wished, setWished] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .select("id, name, price, image_url, description, categories_id, stock, status")
          .eq("id", id)
          .maybeSingle()
        if (prodErr) throw prodErr
        if (!prod) {
          setError("Product not found")
          setLoading(false)
          return
        }
        const normalized = {
          id: prod.id,
          name: prod.name,
          price: prod.price,
          image_url: prod.image_url,
          description: prod.description,
          categories_id: prod.categories_id,
          inStock: (prod.stock ?? 0) > 0 && prod.status === 'active',
        }
        setProduct(normalized)

        if (prod.categories_id) {
          const { data: rel } = await supabase
            .from("products")
            .select("id, name, price, image_url, categories_id, stock, status")
            .eq("categories_id", prod.categories_id)
            .neq("id", prod.id)
            .eq("status", "active")
            .limit(4)
          setRelated((rel || []).map(p => ({
            id: p.id, name: p.name, price: p.price, image_url: p.image_url,
            inStock: (p.stock ?? 0) > 0, categories_id: p.categories_id,
          })))
        }
      } catch (e) {
        setError(e.message || "Failed to load product")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  return (
    <div className={styles.productDetailPage}>
      <Header />
      <div className="container">
        {loading ? (
          <FullPageLoader message="Loading product..." />
        ) : error ? (
          <div style={{ padding: "2rem", color: "#b00020" }}>{error}</div>
        ) : product ? (
          <>
            <nav className={styles.breadcrumb}>
              <a href="/">Home</a>
              <span>/</span>
              <a href="/products">Products</a>
              <span>/</span>
              <span>{product.name}</span>
            </nav>

            <div className={styles.productDetail}>
              <div className={styles.productImages}>
                <div className={styles.mainImage}>
                  <img src={product.image_url || "/placeholder.svg"} alt={product.name} />
                </div>
              </div>

              <div className={styles.productInfo}>
                <h1 className={styles.productTitle}>{product.name}</h1>
                <div className={styles.productPrice}>
                  <span className={styles.price}>₦{Number(product.price || 0).toLocaleString()}</span>
                </div>
                {product.description && (
                  <p className={styles.productDescription}>{product.description}</p>
                )}
                <div className={styles.stockInfo}>
                  {product.inStock ? (
                    <span className={styles.inStock}>✓ In Stock</span>
                  ) : (
                    <span className={styles.outOfStock}>Out of Stock</span>
                  )}
                </div>
                <div className={styles.productActions}>
                  <button
                    className={`btn btn-primary ${styles.addToCartBtn}`}
                    disabled={!product.inStock}
                    onClick={() => addToCart(product)}
                  >
                    Add to Cart - ₦{Number(product.price || 0).toLocaleString()}
                  </button>
                  <button
                    className={`btn btn-secondary ${styles.wishlistBtn}`}
                    disabled={wishLoading}
                    onClick={async () => {
                      if (wishLoading) return
                      setWishLoading(true)
                      try {
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) { setWishLoading(false); return }
                        if (!wished) {
                          await supabase.from('wishlist').insert({ user_id: user.id, product_id: product.id })
                          setWished(true)
                        } else {
                          await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', product.id)
                          setWished(false)
                        }
                      } catch (_) {} finally { setWishLoading(false) }
                    }}
                    aria-label="Toggle wishlist"
                    title={wished ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    {wished ? "♥ Saved" : "♡ Wishlist"}
                  </button>
                </div>
              </div>
            </div>

            {related.length > 0 && (
              <div className={styles.relatedProducts}>
                <h2>Related Products</h2>
                <div className={styles.relatedGrid}>
                  {related.map((rp) => (
                    <div key={rp.id} className={styles.relatedCard}>
                      <img src={rp.image_url || "/placeholder.svg"} alt={rp.name} />
                      <h4>{rp.name}</h4>
                      <div className={styles.relatedPrice}>₦{Number(rp.price || 0).toLocaleString()}</div>
                      <a href={`/products/${rp.id}`} className="btn btn-primary">View Product</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
