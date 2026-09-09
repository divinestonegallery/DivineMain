// @ts-nocheck
export interface LocalCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

const CART_KEY = "dsg_cart";

export function getCartItems(): LocalCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveCartItems(items: LocalCartItem[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addCartItem(item: Omit<LocalCartItem, "quantity">, quantity = 1) {
  const items = getCartItems();
  const existing = items.find((cartItem) => cartItem.id === item.id);
  if (existing) existing.quantity += quantity;
  else items.push({ ...item, quantity });
  saveCartItems(items);
}
