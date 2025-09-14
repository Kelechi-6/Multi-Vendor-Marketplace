"use client"

import { useCart } from "../../../contexts/CartContext"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import supabase from "../../../lib/supabaseClient"
import FullPageLoader from "../../../components/FullPageLoader"
import styles from "./page.module.css"

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user || null)
    }
    loadUser()
  }, [])

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
    } else {
      updateQuantity(productId, newQuantity)
    }
  }

  const handleCheckout = async () => {
    // Ensure latest auth state
    const { data: { user: current } } = await supabase.auth.getUser()
    if (!current) {
      router.push("/login?redirect=/cart")
      return
    }
    setIsCheckingOut(true)
    try {
      // TODO: create order via API/supabase if needed
      await new Promise((res) => setTimeout(res, 1500))
      clearCart()
      router.push("/profile?tab=orders")
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container">
        <div className={styles.emptyCart}>
          <h1>Your Cart is Empty</h1>
          <p>Looks like you haven't added any items to your cart yet.</p>
          <Link href="/products" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {isCheckingOut && <FullPageLoader message="Placing your order..." />}
      <div className={styles.cartPage}>
        <h1>Shopping Cart</h1>

        <div className={styles.cartContent}>
          <div className={styles.cartItems}>
            {items.map((item) => (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.itemImage}>
                  <img src={item.image_url || item.image || "/placeholder.svg"} alt={item.name} />
                </div>

                <div className={styles.itemDetails}>
                  <h3>{item.name}</h3>
                  <p className={styles.itemVendor}>by {item.vendor}</p>
                  <p className={styles.itemPrice}>₦{Number(item.price || 0).toLocaleString()}</p>
                </div>

                <div className={styles.itemControls}>
                  <div className={styles.quantityControls}>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className={styles.quantityBtn}
                    >
                      -
                    </button>
                    <span className={styles.quantity}>{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className={styles.quantityBtn}
                    >
                      +
                    </button>
                  </div>

                  <div className={styles.itemTotal}>₦{Number(item.price * item.quantity || 0).toLocaleString()}</div>

                  <button onClick={() => removeFromCart(item.id)} className={styles.removeBtn}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.cartSummary}>
            <h2>Order Summary</h2>

            <div className={styles.summaryRow}>
              <span>Subtotal:</span>
              <span>₦{Number(getCartTotal() || 0).toLocaleString()}</span>
            </div>

            <div className={styles.summaryRow}>
              <span>Shipping:</span>
              <span>₦0</span>
            </div>

            <div className={styles.summaryRow}>
              <span>Tax:</span>
              <span>₦0</span>
            </div>

            <div className={`${styles.summaryRow} ${styles.total}`}>
              <span>Total:</span>
              <span>₦{Number(getCartTotal() || 0).toLocaleString()}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className={`btn btn-primary ${styles.checkoutBtn}`}
            >
              {isCheckingOut ? "Processing..." : "Proceed to Checkout"}
            </button>

            <Link href="/products" className={styles.continueShoppingLink}>
              Continue Shopping
            </Link>
            <Link href="/profile?tab=orders" className={styles.continueShoppingLink}>
              View my orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
