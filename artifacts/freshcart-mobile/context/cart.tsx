import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth";

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

async function loadLocalCart(): Promise<CartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalCart(items: CartItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {}
}

async function loadSupabaseCart(userId: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      "id, product_id, quantity, products(name, price_cents, mrp_cents, image_url, unit)"
    )
    .eq("user_id", userId);

  if (error || !data) return [];

  return data
    .map((row: any) => {
      const p = row.products;
      if (!p) return null;
      return {
        id: row.id,
        product_id: row.product_id,
        name: p.name,
        price_cents: p.price_cents,
        mrp_cents: p.mrp_cents ?? p.price_cents,
        image_url: p.image_url ?? null,
        unit: p.unit ?? "",
        quantity: row.quantity,
      } as CartItem;
    })
    .filter(Boolean) as CartItem[];
}

async function upsertSupabaseItem(
  userId: string,
  product_id: string,
  quantity: number
): Promise<boolean> {
  const { error } = await supabase.from("cart_items").upsert(
    { user_id: userId, product_id, quantity },
    { onConflict: "user_id,product_id" }
  );
  return !error;
}

async function deleteSupabaseItem(
  userId: string,
  product_id: string
): Promise<boolean> {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", product_id);
  return !error;
}

async function clearSupabaseCart(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId);
  return !error;
}

/**
 * Merges local AsyncStorage cart into the Supabase cart on login.
 * Conflict strategy: keep the higher quantity when a product exists on
 * both sides so no items are silently dropped.
 * AsyncStorage is only cleared after all upserts succeed.
 */
async function mergeAndLoadCart(userId: string): Promise<CartItem[]> {
  const [localItems, remoteItems] = await Promise.all([
    loadLocalCart(),
    loadSupabaseCart(userId),
  ]);

  if (localItems.length === 0) {
    return remoteItems;
  }

  const remoteQtyByProductId = new Map(
    remoteItems.map((i) => [i.product_id, i.quantity])
  );

  const itemsToUpsert = localItems
    .map((local) => {
      const remoteQty = remoteQtyByProductId.get(local.product_id);
      if (remoteQty !== undefined) {
        const mergedQty = Math.max(local.quantity, remoteQty);
        return mergedQty !== remoteQty
          ? { product_id: local.product_id, quantity: mergedQty }
          : null;
      }
      return { product_id: local.product_id, quantity: local.quantity };
    })
    .filter(Boolean) as { product_id: string; quantity: number }[];

  if (itemsToUpsert.length > 0) {
    const results = await Promise.all(
      itemsToUpsert.map((i) =>
        upsertSupabaseItem(userId, i.product_id, i.quantity)
      )
    );
    if (!results.every(Boolean)) {
      return remoteItems;
    }
  }

  await AsyncStorage.removeItem(CART_KEY);
  return loadSupabaseCart(userId);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const prevUserIdRef = useRef<string | undefined>(undefined);
  /**
   * Monotonically increasing counter. Incremented on every auth transition.
   * Each async cart load captures the value at launch time and checks it
   * before calling setItems, so stale results from a previous user are
   * silently discarded instead of overwriting the current cart.
   */
  const loadGenRef = useRef(0);

  useEffect(() => {
    if (authLoading) return;

    const prevUserId = prevUserIdRef.current;
    const currUserId = user?.id ?? null;

    if (currUserId === prevUserId) return;

    prevUserIdRef.current = currUserId ?? undefined;

    const gen = ++loadGenRef.current;
    const load = currUserId
      ? mergeAndLoadCart(currUserId)
      : loadLocalCart();

    load.then((result) => {
      if (gen === loadGenRef.current) {
        setItems(result);
      }
    });
  }, [user, authLoading]);

  /**
   * Re-fetches the cart from the source of truth and applies it only if
   * the auth context hasn't changed since the call was initiated.
   * Used to recover from failed mutations instead of reverting to a
   * stale closure.
   */
  const resyncCart = useCallback(
    (userId: string | null) => {
      const gen = loadGenRef.current;
      const load = userId ? loadSupabaseCart(userId) : loadLocalCart();
      load.then((result) => {
        if (gen === loadGenRef.current) {
          setItems(result);
        }
      });
    },
    []
  );

  const addItem = useCallback(
    (product: Omit<CartItem, "id" | "quantity">) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const userId = user?.id ?? null;

      setItems((prev) => {
        const existing = prev.find((i) => i.product_id === product.product_id);
        const newQty = existing ? existing.quantity + 1 : 1;
        const next = existing
          ? prev.map((i) =>
              i.product_id === product.product_id
                ? { ...i, quantity: newQty }
                : i
            )
          : [...prev, { ...product, id: Date.now().toString(), quantity: 1 }];

        if (userId) {
          upsertSupabaseItem(userId, product.product_id, newQty).then((ok) => {
            if (!ok) resyncCart(userId);
          });
        } else {
          saveLocalCart(next);
        }

        return next;
      });
    },
    [user, resyncCart]
  );

  const removeItem = useCallback(
    (product_id: string) => {
      const userId = user?.id ?? null;

      setItems((prev) => {
        const next = prev.filter((i) => i.product_id !== product_id);

        if (userId) {
          deleteSupabaseItem(userId, product_id).then((ok) => {
            if (!ok) resyncCart(userId);
          });
        } else {
          saveLocalCart(next);
        }

        return next;
      });
    },
    [user, resyncCart]
  );

  const updateQty = useCallback(
    (product_id: string, qty: number) => {
      if (qty <= 0) {
        removeItem(product_id);
        return;
      }
      const userId = user?.id ?? null;

      setItems((prev) => {
        const next = prev.map((i) =>
          i.product_id === product_id ? { ...i, quantity: qty } : i
        );

        if (userId) {
          upsertSupabaseItem(userId, product_id, qty).then((ok) => {
            if (!ok) resyncCart(userId);
          });
        } else {
          saveLocalCart(next);
        }

        return next;
      });
    },
    [user, removeItem, resyncCart]
  );

  const clearCart = useCallback(() => {
    const userId = user?.id ?? null;

    setItems([]);

    if (userId) {
      clearSupabaseCart(userId).then((ok) => {
        if (!ok) resyncCart(userId);
      });
    } else {
      saveLocalCart([]);
    }
  }, [user, resyncCart]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalCents = items.reduce((s, i) => s + i.price_cents * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        totalItems,
        totalCents,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
