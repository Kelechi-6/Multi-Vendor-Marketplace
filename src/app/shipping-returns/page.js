"use client"

import Header from "../../../components/Header"
import styles from "./page.module.css"

export default function ShippingReturnsPage() {
  return (
    <div className={styles.page}>
      <Header />
      <div className="container">
        <div className={styles.container}>
          <h1 className={styles.title}>Shipping & Returns</h1>
          <div className={styles.card}>
            <h2>Shipping</h2>
            <p>Destination-based shipping fees are calculated at checkout. Timelines depend on your location and the vendor.</p>
            <h2>Returns</h2>
            <p>Items may be returned within 7 days of delivery if they meet our return policy. Contact support for assistance.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
