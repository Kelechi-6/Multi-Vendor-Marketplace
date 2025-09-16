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

  // Modal state
  const [modal, setModal] = useState({ open: false, title: "", message: "", status: "" })

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user || null)
    }
    loadUser()
  }, [])

  // Dynamically load Paystack inline script when on cart page
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.PaystackPop) return
    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    document.body.appendChild(script)
    return () => {
      // Keep script for navigation; no cleanup needed
    }
  }, [])

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
    } else {
      updateQuantity(productId, newQuantity)
    }
  }

  const openModal = (title, message, status) => {
    setModal({ open: true, title, message, status })
  }
  const closeModal = () => setModal(m => ({ ...m, open: false }))

  const verifyAndSaveOrder = async (reference, userId) => {
    try {
      const total = Number(getCartTotal() || 0)
      const payload = {
        reference,
        total,
        items,
        user_id: userId,
      }
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const ct = res.headers.get("content-type") || ""
      let data
      if (ct.includes("application/json")) {
        data = await res.json()
      } else {
        const text = await res.text()
        throw new Error(`Server responded with ${res.status}. ${text.slice(0, 160)}`)
      }
      if (!res.ok) throw new Error(data?.error || "Verification failed")
      return data
    } catch (e) {
      throw e
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
      const total = Number(getCartTotal() || 0)
      if (!total || total <= 0) {
        openModal("Cart Empty", "Your cart total must be greater than 0.", "error")
        return
      }
      const key = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
      if (typeof window === "undefined" || !window.PaystackPop) {
        openModal("Payment Error", "Payment library not loaded. Please try again.", "error")
        return
      }
      if (!key) {
        openModal("Config Error", "Missing Paystack public key. Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in .env.local", "error")
        return
      }

      // Create unique reference
      const reference = `KC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const pop = window.PaystackPop.setup({
        key,
        email: current.email,
        amount: Math.round(total * 100), // kobo
        currency: "NGN",
        ref: reference,
        callback: function (response) {
          // response.reference is provided by Paystack
          (async () => {
            try {
              const result = await verifyAndSaveOrder(response?.reference || reference, current.id)
              const status = result?.status || "pending"
              if (status === "paid") {
                openModal("Payment Successful", "Your order has been placed successfully.", "success")
                clearCart()
              } else if (status === "pending") {
                openModal("Payment Pending", "We couldn\'t confirm payment yet. Please check your orders later.", "warning")
              } else {
                openModal("Payment Failed", "Your payment was not successful.", "error")
              }
            } catch (e) {
              openModal("Verification Error", e.message || "Failed to verify payment.", "error")
            }
          })()
        },
        onClose: function () {
          // User closed the payment modal
          openModal("Payment Cancelled", "You closed the payment window. If money was deducted, it will be verified shortly.", "warning")
        },
      })
      pop.openIframe()
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container">
        <div className={styles.emptyCart}>
          <h1>Your Cart is Empty</h1>
          <p>Looks like you haven&apos;t added any items to your cart yet.</p>
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
      {/* Modal */}
      {modal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 20, borderRadius: 8, width: "min(480px, 92vw)" }}>
            <h2 style={{ marginTop: 0 }}>{modal.title}</h2>
            <p style={{ color: modal.status === "success" ? "#065f46" : modal.status === "warning" ? "#92400e" : "#991b1b" }}>{modal.message}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {modal.status === "success" ? (
                <Link href="/profile?tab=orders" className="btn btn-primary" onClick={closeModal}>View Orders</Link>
              ) : null}
              <button className="btn" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

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
