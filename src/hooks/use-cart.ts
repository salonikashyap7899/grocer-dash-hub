import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export type CartRow = {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    unit: string;
    price_cents: number;
    mrp_cents: number | null;
    image_url: string | null;
    stock: number;
  };
};

export function useCart() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CartRow[]> => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, product_id, quantity, product:products(id,name,slug,unit,price_cents,mrp_cents,image_url,stock)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as CartRow[]) ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      if (!user) throw new Error("Please sign in to add items");
      if (quantity <= 0) {
        const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", productId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("cart_items")
        .upsert(
          { user_id: user.id, product_id: productId, quantity },
          { onConflict: "user_id,product_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });

  const items = query.data ?? [];
  const subtotal = items.reduce((s, i) => s + i.product.price_cents * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const qtyOf = (productId: string) => items.find((i) => i.product_id === productId)?.quantity ?? 0;

  return { items, subtotal, count, qtyOf, upsert, clear, isLoading: query.isLoading };
}
