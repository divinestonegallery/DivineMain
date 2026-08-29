// @ts-nocheck
import { apiRequest } from "./client";

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  display_order: number;
}

export type FAQGroups = Record<string, FAQItem[]>;

export function getFAQs() {
  return apiRequest<FAQGroups>("/api/v1/faqs");
}
