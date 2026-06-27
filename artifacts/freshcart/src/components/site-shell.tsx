import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingCart, User, LogOut, Clock, Zap, MapPin, ChevronDown, LayoutDashboard } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
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
  const { count, subtotal } = useCart();
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
      {/* Blinkit-style dark green header */}
      <header className="sticky top-0 z-40 bg-[#0c831f] text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center gap-3">
            {/* Logo */}
            <Link to="/" className="flex shrink-0 items-center gap-2 mr-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <Zap className="h-5 w-5 text-yellow-300 fill-yellow-300" />
              </div>
              <div className="hidden sm:block">
                <div className="text-base font-extrabold leading-tight text-white">{settings?.store_name ?? "FreshCart"}</div>
                <div className="flex items-center gap-1 text-[11px] text-green-200">
                  <Clock className="h-3 w-3" /> {settings?.delivery_eta ?? "10 min delivery"}
                </div>
              </div>
            </Link>

            {/* Delivery location pill */}
            <button className="hidden md:flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-sm text-white">
              <MapPin className="h-4 w-4 text-yellow-300" />
              <span className="font-medium">Deliver to home</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {/* Search bar */}
            <form onSubmit={onSearch} className="flex flex-1 min-w-0">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder='Search "milk", "bread", "fruits"…'
                  className="w-full rounded-lg bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </form>

            {/* Right actions */}
            <div className="flex shrink-0 items-center gap-2">
              {isAdmin && (
                <Link to="/admin" className="hidden md:flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-sm text-white font-medium">
                  <LayoutDashboard className="h-4 w-4" />
                  Admin
                </Link>
              )}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-sm text-white font-medium">
                      <User className="h-4 w-4" />
                      <span className="hidden md:inline">Account</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="truncate text-xs">{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/orders">My orders</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/account">Profile & addresses</Link></DropdownMenuItem>
                    {isAdmin && <DropdownMenuItem asChild><Link to="/admin">Admin panel</Link></DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }}>
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/auth" className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition px-3 py-1.5 text-sm text-white font-medium">
                  <User className="h-4 w-4" />
                  Login
                </Link>
              )}

              <Link to="/cart" className="relative flex items-center gap-2 rounded-lg bg-white text-[#0c831f] hover:bg-gray-50 transition px-4 py-2 text-sm font-bold shadow-sm">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {count > 0 ? `₹${(subtotal / 100).toFixed(0)}` : "Cart"}
                </span>
                {count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0c831f] text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile search row */}
          <form onSubmit={onSearch} className="pb-3 md:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Search "milk", "bread"…'
                className="w-full rounded-lg bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>
          </form>
        </div>
      </header>

      {/* Delivery speed ribbon */}
      <div className="bg-[#f0fdf4] border-b border-green-100">
        <div className="mx-auto max-w-7xl px-4 py-1.5 flex items-center gap-6 text-xs text-green-800 font-medium overflow-x-auto">
          <span className="flex items-center gap-1 shrink-0"><Zap className="h-3.5 w-3.5 text-[#0c831f]" /> Delivery in {settings?.delivery_eta ?? "10 min"}</span>
          <span className="flex items-center gap-1 shrink-0">🛡️ 100% fresh guarantee</span>
          <span className="flex items-center gap-1 shrink-0">🚚 Free delivery over ₹{((settings?.free_delivery_threshold_cents ?? 49900) / 100).toFixed(0)}</span>
          <span className="flex items-center gap-1 shrink-0">⭐ 5000+ products</span>
        </div>
      </div>

      <main className="flex-1">{children}</main>

      <footer className="mt-12 border-t bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-gray-500">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="font-bold text-gray-900 text-base">{settings?.store_name ?? "FreshCart"}</div>
              <p className="mt-1">Groceries delivered in {settings?.delivery_eta ?? "10 minutes"}.</p>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Quick links</div>
              <div className="mt-2 flex flex-col gap-1">
                <Link to="/" className="hover:text-[#0c831f]">Home</Link>
                <Link to="/cart" className="hover:text-[#0c831f]">Cart</Link>
                <Link to="/orders" className="hover:text-[#0c831f]">My orders</Link>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Help</div>
              <div className="mt-2">support@freshcart.app</div>
            </div>
          </div>
          <div className="mt-6 border-t pt-4">© {new Date().getFullYear()} {settings?.store_name ?? "FreshCart"}. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
