import { Suspense } from "react";

export default function CompteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
