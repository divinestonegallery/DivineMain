// @ts-nocheck
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./ui.module.css";

export function Pagination({ currentPage, totalPages, basePath }: { currentPage: number; totalPages: number; basePath: string }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return (
    <nav className={styles.pagination} aria-label="Product pages">
      <Link aria-disabled={currentPage === 1} href={`${basePath}?page=${Math.max(1, currentPage - 1)}`} aria-label="Previous page">
        <ChevronLeft aria-hidden="true" size={18} />
      </Link>
      {pages.map((page) => (
        <Link key={page} href={`${basePath}?page=${page}`} aria-current={page === currentPage ? "page" : undefined}>
          {page}
        </Link>
      ))}
      <Link aria-disabled={currentPage === totalPages} href={`${basePath}?page=${Math.min(totalPages, currentPage + 1)}`} aria-label="Next page">
        <ChevronRight aria-hidden="true" size={18} />
      </Link>
    </nav>
  );
}
