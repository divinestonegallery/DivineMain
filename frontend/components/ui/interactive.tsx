// @ts-nocheck
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface TabsProps {
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
  defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] px-4 border-0 border-b-2 text-nowrap cursor-pointer transition-colors duration-160 ${
              activeTab === tab.id
                ? "border-b-gold text-foreground"
                : "border-b-transparent text-ink-muted hover:text-foreground"
            }`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="py-5">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}

export interface AccordionProps {
  items: Array<{ id: string; title: string; content: React.ReactNode }>;
}

export function Accordion({ items }: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div>
      {items.map((item) => (
        <section key={item.id} className="border-b border-border">
          <button
            onClick={() => toggleItem(item.id)}
            className="w-full flex min-h-[54px] items-center justify-between gap-4 p-0 border-0 bg-transparent text-left text-foreground cursor-pointer"
            aria-expanded={openItems.has(item.id)}
          >
            {item.title}
            <ChevronDown
              size={20}
              className={`flex-shrink-0 transition-transform duration-160 ${
                openItems.has(item.id) ? "rotate-180" : ""
              }`}
            />
          </button>
          {openItems.has(item.id) && (
            <div className="pb-4 text-ink-muted text-[0.86rem] leading-relaxed">
              {item.content}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-[0.35rem]">
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`grid w-[40px] h-[40px] place-items-center border rounded-full text-[0.78rem] transition-colors duration-160 ${
            currentPage === page
              ? "border-foreground bg-foreground text-white"
              : "border-border text-ink-muted hover:border-foreground"
          }`}
          aria-current={currentPage === page ? "page" : undefined}
        >
          {page}
        </button>
      ))}
    </div>
  );
}
