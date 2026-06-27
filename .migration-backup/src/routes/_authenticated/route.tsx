import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // First, check if we have a session in memory/local storage
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // If no session, double check with getUser() to be sure
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        throw redirect({
          to: "/auth",
          search: {
            redirect: location.pathname,
          },
        });
      }
      return { user };
    }
    
    return { user: session.user };
  },
  component: () => <Outlet />,
});
