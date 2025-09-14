"use client"

import Link from "next/link"
import styles from "./ProductCard.module.css"
import { useCart } from "../contexts/CartContext"
import supabase from "../lib/supabaseClient"
import { useState } from "react"

export default function ProductCard({ product }) {
  const { addToCart } = useCart()
  const [wishLoading, setWishLoading] = useState(false)
  const [wished, setWished] = useState(false)

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Normalize minimal fields used by cart persistence
    const normalized = {
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url || product.image,
      categories_id: product.categories_id,
    }
    addToCart(normalized)
  }

  const toggleWishlist = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (wishLoading) return
    setWishLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Silently ignore or navigate to login in future
        setWishLoading(false)
        return
      }
      if (!wished) {
        await supabase.from("wishlist").insert({ user_id: user.id, product_id: product.id })
        setWished(true)
      } else {
        await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", product.id)
        setWished(false)
      }
    } catch (_e) {
      // ignore for now
    } finally {
      setWishLoading(false)
    }
  }

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
      <>
        {"★".repeat(fullStars)}
        {hasHalfStar && "☆"}
        {"☆".repeat(emptyStars)}
      </>
    )
  }

  return (
    <div className={styles.productCard}>
      <Link href={`/products/${product.id}`} className={styles.productLink}>
        <div className={styles.productImage}>
          <img src={product.image_url || product.image || "/placeholder.svg"} alt={product.name} />
          {product.inStock === false && <div className={styles.outOfStock}>Out of Stock</div>}
        </div>

        <div className={styles.productInfo}>
          <h3 className={styles.productName}>{product.name}</h3>
          {product.vendor && <p className={styles.productVendor}>by {product.vendor}</p>}

          {typeof product.rating === "number" && (
            <div className={styles.productRating}>
              <span className={styles.stars}>{renderStars(product.rating)}</span>
              {typeof product.reviews === "number" && (
                <span className={styles.ratingValue}>({product.reviews})</span>
              )}
            </div>
          )}

          {product.description && (
            <p className={styles.productDescription}>{product.description}</p>
          )}

          <div className={styles.productFooter}>
            <div className={styles.productPrice}>₦{Number(product.price || 0).toLocaleString()}</div>
            <button
              className={`btn btn-primary ${styles.addToCartBtn} ${product.inStock === false ? styles.disabled : ""}`}
              disabled={product.inStock === false}
              onClick={handleAddToCart}
            >
              {product.inStock === false ? "Out of Stock" : "Add to Cart"}
            </button>
            <button
              className={`btn ${styles.addToCartBtn}`}
              onClick={toggleWishlist}
              disabled={wishLoading}
              aria-label="Toggle wishlist"
              title={wished ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              {wished ? "♥" : "♡"}
            </button>
          </div>
        </div>
      </Link>
    </div>
  )
}
