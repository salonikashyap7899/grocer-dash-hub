import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — FreshCart" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const go = () => nav({ to: (redirect as string) || "/" });

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    go();
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created!");
    go();
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-brand/30 to-primary/10 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <div className="font-extrabold">FreshCart</div>
            <div className="text-xs text-muted-foreground">Sign in to continue shopping</div>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-3 pt-4">
            <Field id="email" label="Email" type="email" value={email} onChange={setEmail} />
            <Field id="password" label="Password" type="password" value={password} onChange={setPassword} />
            <Button onClick={signIn} disabled={loading || !email || !password} className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-3 pt-4">
            <Field id="name" label="Full name" value={name} onChange={setName} />
            <Field id="emailS" label="Email" type="email" value={email} onChange={setEmail} />
            <Field id="passwordS" label="Password (min 6 chars)" type="password" value={password} onChange={setPassword} />
            <Button onClick={signUp} disabled={loading || !email || password.length < 6} className="w-full">
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Field({ id, label, type = "text", value, onChange }: { id: string; label: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
