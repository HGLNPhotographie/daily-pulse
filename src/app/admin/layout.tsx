"use client";

import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { useAdminSession } from "@/hooks/useAdminSession";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { status, error, signIn, signOut } = useAdminSession();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary"
        />
      </div>
    );
  }

  if (status === "signed-out") {
    return <AdminLoginForm onSubmit={signIn} error={error} />;
  }

  if (status === "unconfigured") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="font-display text-2xl tracking-wide">BACKEND NON CONFIGURÉ</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Renseigne <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
          <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> puis redémarre le serveur.
          Voir <code className="text-xs">docs/SUPABASE_SETUP.md</code>.
        </p>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="font-display text-2xl tracking-wide">ACCÈS REFUSÉ</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ce compte n&apos;a pas les droits administrateur. Demande à un admin d&apos;exécuter :
          <code className="mt-2 block rounded-lg bg-black/40 p-2 text-xs">
            update public.users set is_admin = true where email = &apos;ton@email.com&apos;;
          </code>
        </p>
        <Button variant="outline" onClick={signOut}>
          Se déconnecter
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col sm:flex-row">
      <AdminSidebar onSignOut={signOut} demoMode={status === "demo"} />
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">{children}</div>
    </div>
  );
}
