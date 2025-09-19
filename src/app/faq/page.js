"use client"

import Header from "../../../components/Header"
import styles from "./page.module.css"

export default function FAQPage() {
  return (
    <div className={styles.page}>
      <Header />
      <div className="container">
        <div className={styles.container}>
          <h1 className={styles.title}>Frequently Asked Questions</h1>

          <section className={styles.section}>
            <div className={styles.qa}>
              <h3>How long does shipping take?</h3>
              <p>Shipping times vary by destination and vendor. At checkout, you can see destination-based fees. See <a href="/shipping-returns">Shipping & Returns</a>.</p>
              <h3>What payment methods do you accept?</h3>
              <p>We support secure online payments through our payment partner.</p>
            </div>
          </section>

          <section id="vendor-help" className={styles.section}>
            <h2>Vendor Help</h2>
            <div className={styles.qa}>
              <h3>How do I become a vendor?</h3>
              <p>Register via <a href="/vendors/register">Become a Vendor</a>. Complete your profile and start listing products.</p>
              <h3>How do I manage my products?</h3>
              <p>Use the Vendor dashboard to add, edit, or remove products, track orders, and update your profile.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
