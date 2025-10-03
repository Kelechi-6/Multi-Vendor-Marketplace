"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Header from "../../../components/Header"
import ProductCard from "../../../components/ProductCard"
import styles from "./page.module.css"
import supabase from "../../../lib/supabaseClient"
import FullPageLoader from "../../../components/FullPageLoader"

export default function ProductsPage() {
  const params = useSearchParams()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [priceRange, setPriceRange] = useState([0, 1000000])
  const [currentPage, setCurrentPage] = useState(1)
  const [allProducts, setAllProducts] = useState([])
  const [categories, setCategories] = useState([{ value: "all", label: "All Categories" }])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const productsPerPage = 12

  useEffect(() => {
    const load = async () => {
      try {
        const { data: catData, error: catErr } = await supabase
          .from("categories")
          .select("id, name")
          .order("name")
        if (catErr) throw catErr

        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("id, name, price, image_url, categories_id, status, stock, description")
          .eq("status", "active")
          .order("name")
        if (prodErr) throw prodErr

        setCategories([{ value: "all", label: "All Categories" }, ...(catData || []).map(c => ({ value: c.id, label: c.name }))])
        // Map to shape ProductCard expects
        const mapped = (prodData || []).map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image_url: p.image_url,
          categories_id: p.categories_id,
          inStock: (p.stock ?? 0) > 0,
          description: p.description || "",
        }))
        setAllProducts(mapped)
      } catch (e) {
        setError(e.message || "Failed to load products")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Sync searchTerm with ?q= param
  useEffect(() => {
    const q = params.get('q') || ""
    setSearchTerm(q)
    // reset to first page when search term via URL changes
    setCurrentPage(1)
  }, [params])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase()
    const filtered = allProducts.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(term)
      const matchesCategory = selectedCategory === "all" || product.categories_id === selectedCategory
      const matchesPrice = (product.price || 0) >= priceRange[0] && (product.price || 0) <= priceRange[1]
      return matchesSearch && matchesCategory && matchesPrice
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return (a.price || 0) - (b.price || 0)
        case "price-high":
          return (b.price || 0) - (a.price || 0)
        case "name":
        default:
          return a.name.localeCompare(b.name)
      }
    })

    return filtered
  }, [searchTerm, selectedCategory, sortBy, priceRange, allProducts])

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)
  const startIndex = (currentPage - 1) * productsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage)

  return (
    <div className={styles.productsPage}>
      <Header />
      {loading && <FullPageLoader message="Loading products..." />}

      <div className="container">
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>All Products</h1>
          {loading ? (
            <p className={styles.resultsCount}></p>
          ) : error ? (
            <p className={styles.resultsCount} style={{ color: "#b00020" }}>{error}</p>
          ) : (
            <p className={styles.resultsCount}>
              Showing {startIndex + 1}-{Math.min(startIndex + productsPerPage, filteredProducts.length)} of {filteredProducts.length} products
            </p>
          )}
        </div>

        <div className={styles.productsContainer}>
          {/* Filters Sidebar */}
          <aside className={styles.filtersSidebar}>
            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Search</h3>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Category</h3>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={styles.categorySelect}
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Price Range</h3>
              <div className={styles.priceRange}>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([0, Number.parseInt(e.target.value)])}
                  className={styles.priceSlider}
                />
                <div className={styles.priceLabels}>
                  <span>$0</span>
                  <span>${priceRange[1]}</span>
                </div>
              </div>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Sort By</h3>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.sortSelect}>
                <option value="name">Name (A-Z)</option>
                <option value="price-low">Price (Low to High)</option>
                <option value="price-high">Price (High to Low)</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </aside>

          {/* Products Grid */}
          <main className={styles.productsMain}>
            {loading ? (
              <div className={styles.noResults} />
            ) : error ? (
              <div className={styles.noResults} style={{ color: "#b00020" }}>{error}</div>
            ) : paginatedProducts.length > 0 ? (
              <>
                <div className={styles.productsGrid}>
                  {paginatedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={styles.paginationBtn}
                    >
                      Previous
                    </button>

                    <div className={styles.pageNumbers}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`${styles.pageNumber} ${currentPage === page ? styles.active : ""}`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={styles.paginationBtn}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noResults}>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
