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

