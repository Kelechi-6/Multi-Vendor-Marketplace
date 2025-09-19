"use client"

import Header from "../../../components/Header"
import styles from "./page.module.css"

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <Header />
      <div className="container">
        <div className={styles.container}>
          <h1 className={styles.title}>Terms of Service</h1>
          <div className={styles.card}>
            <p>These Terms of Service (&quot;Terms&quot;) govern your use of Keecee Collection. By accessing or using our services, you agree to these Terms.</p>
            <h2>1. Accounts</h2>
            <p>Users are responsible for maintaining the security of their account and password.</p>
            <h2>2. Orders & Payments</h2>
            <p>Orders placed via our platform are facilitated by our payment partners. Refunds and chargebacks follow our policy and applicable law.</p>
            <h2>3. Shipping & Returns</h2>
            <p>Shipping timelines depend on the destination and vendor. See <a href="/shipping-returns">Shipping & Returns</a>.</p>
            <h2>4. Vendor Responsibilities</h2>
            <p>Vendors must comply with our policies and local regulations. See our <a href="/faq#vendor-help">Vendor Help</a>.</p>
            <h2>5. Changes</h2>
            <p>We may update these Terms from time to time. Continued use constitutes acceptance of the revised Terms.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
