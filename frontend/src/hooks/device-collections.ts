// @ts-nocheck
import { useState, useEffect } from "react";
import { getCartItems } from "@/api/cart";

export function useEnquiryBag() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const updateCount = () => {
      setCount(getCartItems().reduce((acc, item) => acc + item.quantity, 0));
    };
    
    updateCount();
    
    const handleCartUpdate = () => updateCount();
    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, []);
  
  return { count };
}

export function useSavedWorks() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("dsg_wishlist") ?? "[]");
      setCount(Array.isArray(saved) ? saved.length : 0);
    } catch {
      setCount(0);
    }
    
    const handleWishlistUpdate = () => {
       try {
        const saved = JSON.parse(window.localStorage.getItem("dsg_wishlist") ?? "[]");
        setCount(Array.isArray(saved) ? saved.length : 0);
      } catch {
        setCount(0);
      }
    };
    window.addEventListener("wishlist-updated", handleWishlistUpdate);
    return () => window.removeEventListener("wishlist-updated", handleWishlistUpdate);
  }, []);

  return { count };
}
