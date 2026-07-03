"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { userIsAdmin } from "@/lib/admin-check";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUserSession } from "@/hooks/useUserSession";

type AuthMode = "signup" | "signin";

export function UserAuthCard() {
  const router = useRouter();
  const { isAnonymous, signUpEmail, signInEmail } = useUserSession();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result =
      mode === "signup" ? await signUpEmail(email, password) : await signInEmail(email, password);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (mode === "signin") {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user && (await userIsAdmin(supabase, session.user.id))) {
        router.replace("/admin");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="neo-border w-full max-w-md space-y-4 rounded-2xl bg-card/90 p-6"
    >
      <div className="text-center">
        <h2 className="font-display text-2xl tracking-wide text-glow-cyan">
          {mode === "signup" ? "CRÉER MON COMPTE" : "SE CONNECTER"}
        </h2>
        {isAnonymous && mode === "signup" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Ta flamme et tes votes seront conservés sur ce compte.
          </p>
        )}
        {mode === "signin" && isAnonymous && (
          <p className="mt-2 text-xs text-amber-300/90">
            Connexion à un compte existant : tu quitteras la session invitée actuelle.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={mode === "signup" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("signup")}
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" /> Créer
        </Button>
        <Button
          type="button"
          variant={mode === "signin" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("signin")}
          className="gap-1.5"
        >
          <LogIn className="h-4 w-4" /> Connexion
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none ring-primary/50 focus:ring-2"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe (6 caractères min.)"
          className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none ring-primary/50 focus:ring-2"
        />
        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
        <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
          <Lock className="h-4 w-4" />
          {isSubmitting ? "..." : mode === "signup" ? "Créer mon compte" : "Se connecter"}
        </Button>
      </form>
    </motion.div>
  );
}
