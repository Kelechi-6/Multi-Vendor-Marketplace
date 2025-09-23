"use client"

import Header from "../../../components/Header"
import styles from "./page.module.css"

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <Header />
      <div className="container">
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>About Us</h1>
            <p className={styles.subtitle}>Learn more about Keecee Collection and how to reach us.</p>
          </div>

          <div className={`${styles.section} ${styles.grid}`}>
            <p>
              Keecee Collection is a modern multi-vendor marketplace connecting customers to trusted vendors across the world.
              We focus on quality, transparency, and a seamless buying experience.
            </p>
          </div>

          <div className={styles.twoCol} style={{marginTop: '1rem'}}>
            <div className={styles.section}>
              <h2>Contact</h2>
              <p>Have questions or need support? Reach out:</p>
              <ul>
                <li>Email: kcboytimo@gmail.com</li>
                <li>Phone: +234 803 328 2350</li>
              </ul>
            </div>
            <div className={styles.section}>
              <h2>Help Center</h2>
              <p>Find quick answers to common questions in our Help Center and FAQ.</p>
              <ul>
                <li>Help Center topics: Ordering, Payments, Shipping, Returns</li>
                <li>See also: <a href="/faq">FAQ</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
