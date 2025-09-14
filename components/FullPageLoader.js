"use client"

import styles from "./FullPageLoader.module.css"

export default function FullPageLoader({ message = "Loading..." }) {
  return (
    <div className={styles.overlay} aria-live="polite" aria-busy="true" role="status">
      <div className={styles.loader}>
        <div className={styles.spinner} />
        <span>{message}</span>
      </div>
    </div>
  )
}
