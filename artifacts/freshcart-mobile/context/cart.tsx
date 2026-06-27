import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price_cents: number;
  mrp_cents: number;
  image_url: string | null;
  unit: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Omit<CartItem, "id" | "quantity">) => void;
  removeItem: (product_id: string) => void;
  updateQty: (product_id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalCents: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQty: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalCents: 0,
});

const CART_KEY = "freshcart_mobile_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then((raw) => {
      if (raw) setItems(JSON.parse(raw));
    });
  }, []);

  const save = (next: CartItem[]) => {
    setItems(next);
    AsyncStorage.setItem(CART_KEY, JSON.stringify(next));
  };

  const addItem = (product: Omit<CartItem, "id" | "quantity">) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.product_id);
      const next = existing
        ? prev.map((i) => i.product_id === product.product_id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...product, id: Date.now().toString(), quantity: 1 }];
      AsyncStorage.setItem(CART_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeItem = (product_id: string) => {
    save(items.filter((i) => i.product_id !== product_id));
  };

  const updateQty = (product_id: string, qty: number) => {
    if (qty <= 0) { removeItem(product_id); return; }
    save(items.map((i) => i.product_id === product_id ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => save([]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalCents = items.reduce((s, i) => s + i.price_cents * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalItems, totalCents }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
