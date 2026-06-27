import { Link, Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Leaf, LayoutDashboard, Package, ListTree, ShoppingBag, Users, Settings, ArrowLeft, MapPin, Ticket, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — FreshCart" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const ADMIN_EMAILS = ["isalonikashyap@gmail.com", "anu783512@gmail.com"];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { setChecked(true); return; }
      const email = (u.email ?? u.user_metadata?.email ?? "").toLowerCase();
      if (ADMIN_EMAILS.some(e => e.toLowerCase() === email)) {
        setAllowed(true);
        setChecked(true);
        return;
      }
      supabase.from("user_roles").select("role").eq("user_id", u.id).eq("role", "admin").maybeSingle()
        .then(({ data }) => { setAllowed(!!data); setChecked(true); });
    });
  }, []);

  if (!checked) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Checking access…</div>;
  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl font-bold">Admin access required</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your account doesn't have admin privileges.</p>
          <Button className="mt-4" onClick={() => nav({ to: "/" })}>Back to shop</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen md:grid-cols-[240px_minmax(0,1fr)] bg-secondary/30">
      <aside className="hidden border-r bg-card md:block">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Leaf className="h-4 w-4" /></div>
          <div className="font-extrabold">Admin</div>
        </div>
        <nav className="space-y-1 p-3 text-sm">
          <NavItem to="/admin" exact icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavItem>
          <NavItem to="/admin/products" icon={<Package className="h-4 w-4" />}>Products</NavItem>
          <NavItem to="/admin/categories" icon={<ListTree className="h-4 w-4" />}>Categories</NavItem>
          <NavItem to="/admin/orders" icon={<ShoppingBag className="h-4 w-4" />}>Orders</NavItem>
          <NavItem to="/admin/customers" icon={<Users className="h-4 w-4" />}>Customers</NavItem>
          <NavItem to="/admin/coupons" icon={<Ticket className="h-4 w-4" />}>Coupons</NavItem>
          <NavItem to="/admin/delivery-areas" icon={<MapPin className="h-4 w-4" />}>Delivery areas</NavItem>
          <NavItem to="/admin/reports" icon={<BarChart3 className="h-4 w-4" />}>Reports</NavItem>
          <NavItem to="/admin/settings" icon={<Settings className="h-4 w-4" />}>Settings</NavItem>
        </nav>
        <div className="p-3">
          <Link to="/" className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-secondary">
            <ArrowLeft className="h-3 w-3" /> Back to store
          </Link>
        </div>
      </aside>
      <div>
        <div className="md:hidden sticky top-0 z-20 flex gap-2 overflow-x-auto border-b bg-card p-2">
          {[
            ["/admin", "Dashboard"], ["/admin/products", "Products"], ["/admin/categories", "Categories"],
            ["/admin/orders", "Orders"], ["/admin/customers", "Customers"],
            ["/admin/coupons", "Coupons"], ["/admin/delivery-areas", "Areas"], ["/admin/reports", "Reports"],
            ["/admin/settings", "Settings"],
          ].map(([to, label]) => (
            <Link key={to} to={to} className="shrink-0 rounded-md px-3 py-1.5 text-xs hover:bg-secondary" activeProps={{ className: "bg-primary text-primary-foreground" }} activeOptions={{ exact: to === "/admin" }}>
              {label}
            </Link>
          ))}
        </div>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, exact, children }: { to: string; icon: ReactNode; exact?: boolean; children: ReactNode }) {
  const loc = useLocation();
  const active = exact ? loc.pathname === to : loc.pathname.startsWith(to);
  return (
    <Link to={to} className={`flex items-center gap-2 rounded-md px-3 py-2 ${active ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary"}`}>
      {icon} {children}
    </Link>
  );
}
