import { useState, useEffect, useCallback } from "react";

const CART_KEY = "senstock_cart";
const PROMO_KEY = "senstock_cart_promo";

export interface CartItem {
  cartKey: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  variant?: string;
  quantity: number;
}

export interface PromoCode {
  code: string;
  type: "pourcentage" | "fixe";
  value: number;
  discount: number;
}

function loadCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-updated"));
}

function loadPromo(): PromoCode | null {
  try {
    const raw = localStorage.getItem(PROMO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [promo, setPromoState] = useState<PromoCode | null>(loadPromo);

  // Sync across tabs / components
  useEffect(() => {
    function onUpdate() {
      setItems(loadCart());
      setPromoState(loadPromo());
    }
    window.addEventListener("cart-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("cart-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "cartKey" | "quantity"> & { quantity?: number }) => {
      const key = item.variant ? `${item.productId}-${item.variant}` : item.productId;
      const qty = item.quantity || 1;
      const current = loadCart();
      const idx = current.findIndex((c) => c.cartKey === key);
      if (idx >= 0) {
        current[idx].quantity += qty;
      } else {
        current.push({ ...item, cartKey: key, quantity: qty });
      }
      saveCart(current);
      setItems(current);
    },
    []
  );

  const removeItem = useCallback((cartKey: string) => {
    const current = loadCart().filter((c) => c.cartKey !== cartKey);
    saveCart(current);
    setItems(current);
  }, []);

  const updateQuantity = useCallback((cartKey: string, quantity: number) => {
    if (quantity < 1) return;
    const current = loadCart();
    const idx = current.findIndex((c) => c.cartKey === cartKey);
    if (idx >= 0) {
      current[idx].quantity = quantity;
      saveCart(current);
      setItems(current);
    }
  }, []);

  const clearCart = useCallback(() => {
    saveCart([]);
    setItems([]);
    localStorage.removeItem(PROMO_KEY);
    setPromoState(null);
  }, []);

  const setPromo = useCallback((p: PromoCode | null) => {
    if (p) {
      localStorage.setItem(PROMO_KEY, JSON.stringify(p));
    } else {
      localStorage.removeItem(PROMO_KEY);
    }
    setPromoState(p);
    window.dispatchEvent(new Event("cart-updated"));
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = promo?.discount || 0;
  const total = Math.max(0, subtotal - discount);

  return {
    items,
    itemCount,
    subtotal,
    discount,
    total,
    promo,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setPromo,
  };
}
