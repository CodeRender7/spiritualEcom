"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { Product } from "@/lib/medusa";

export interface CartItem {
  product: Product;
  variantId: string;
  quantity: number;
}

export interface CartLine {
  id: string;
  title: string;
  handle: string;
  thumbnail?: string;
  unitPrice: number;
  quantity: number;
}

interface CartContextValue {
  items: CartLine[];
  count: number;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "divinekart_cart_v1";
const FREE_SHIPPING_THRESHOLD = 499;
const BASE_SHIPPING = 49;

function getUnitPrice(product: Product): number {
  return product.variants?.[0]?.prices?.[0]?.amount ?? 0;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota errors
    }
  }, [items]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          handle: product.handle,
          thumbnail: product.thumbnail,
          unitPrice: getUnitPrice(product),
          quantity,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.id !== productId)
        : prev.map((i) => (i.id === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
    const shipping = items.length === 0 || subtotal > FREE_SHIPPING_THRESHOLD ? 0 : BASE_SHIPPING;
    const discount = subtotal >= 499 ? 100 : 0;
    const count = items.reduce((acc, i) => acc + i.quantity, 0);
    return {
      items,
      count,
      subtotal,
      shipping,
      discount,
      total: Math.max(subtotal + shipping - discount, 0),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    };
  }, [items, isOpen, addItem, removeItem, updateQuantity, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}