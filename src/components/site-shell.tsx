import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingCart, User, LogOut, Clock, Leaf } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteShell({ children }: { children: ReactNode }) {
  const { count } = useCart();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { data: settings } = useSettings();
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav({ to: "/search", search: { q: q.trim() } });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center gap-3 md:gap-6">
            <Link to="/" className="flex shrink-0 items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Leaf className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <div className="text-base font-extrabold leading-tight">{settings?.store_name ?? "FreshCart"}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {settings?.delivery_eta ?? "10–15 min"}
                </div>
              </div>
            </Link>

            <form onSubmit={onSearch} className="flex-1 min-w-0 max-w-2xl">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder='Search "milk", "bread"…'
                  className="pl-9 bg-secondary/50 border-transparent focus-visible:bg-background"
                />
              </div>
            </form>

            <div className="flex shrink-0 items-center gap-2">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <User className="h-4 w-4" />
                      <span className="hidden md:inline">Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/orders">My orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account">Profile & addresses</Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin">Admin panel</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={async () => {
                        await supabase.auth.signOut();
                        nav({ to: "/" });
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth">Login</Link>
                </Button>
              )}

              <Button asChild className="gap-2 relative">
                <Link to="/cart">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Cart</span>
                  {count > 0 && (
                    <Badge className="ml-1 bg-brand text-brand-foreground hover:bg-brand">{count}</Badge>
                  )}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-12 border-t bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="font-semibold text-foreground">{settings?.store_name ?? "FreshCart"}</div>
              <p className="mt-1">Groceries delivered in {settings?.delivery_eta ?? "minutes"}.</p>
            </div>
            <div>
              <div className="font-semibold text-foreground">Shop</div>
              <div className="mt-1 flex flex-col gap-1">
                <Link to="/" className="hover:text-foreground">Home</Link>
                <Link to="/cart" className="hover:text-foreground">Cart</Link>
                <Link to="/orders" className="hover:text-foreground">My orders</Link>
              </div>
            </div>
            <div>
              <div className="font-semibold text-foreground">Help</div>
              <div className="mt-1">Contact: support@freshcart.app</div>
            </div>
          </div>
          <div className="mt-6 border-t pt-4">© {new Date().getFullYear()} {settings?.store_name ?? "FreshCart"}. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
