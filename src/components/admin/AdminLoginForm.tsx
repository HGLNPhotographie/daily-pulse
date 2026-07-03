"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: string | null;
}

export function AdminLoginForm({ onSubmit, error }: AdminLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(email, password);
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="neo-border w-full max-w-sm space-y-4 rounded-2xl bg-card/90 p-6"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl tracking-wide">RÉGIE — ACCÈS ADMIN</h1>
          <p className="text-xs text-muted-foreground">Réservé à l&apos;équipe éditoriale de Daily Pulse.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none ring-primary/50 focus:ring-2"
              placeholder="admin@dailypulse.app"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none ring-primary/50 focus:ring-2"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

        <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
          <Lock className="h-4 w-4" />
          {isSubmitting ? "Connexion..." : "Se connecter"}
        </Button>
      </motion.form>
    </div>
  );
}
