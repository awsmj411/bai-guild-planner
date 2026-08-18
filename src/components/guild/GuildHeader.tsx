import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SignInDialog } from "@/components/guild/SignInDialog";
import baiLogo from "@/assets/bai-logo.png.asset.json";

/** Tracks whether the fixed admin account is signed in. */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAdmin(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return isAdmin;
}

const NAV = [
  { to: "/", label: "Roster & Parties" },
  { to: "/bidding", label: "Bidding" },
] as const;

export function GuildHeader({ isAdmin, tagline }: { isAdmin: boolean; tagline: string }) {
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <header className="border-b border-border bg-guild-team text-guild-team-foreground">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={baiLogo.url} alt="BAI Guild logo" className="h-11 w-auto" />
          <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] opacity-85 sm:block">
            {tagline}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 rounded-full bg-black/20 p-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10 data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {isAdmin ? (
            <Button size="sm" variant="secondary" onClick={() => supabase.auth.signOut()}>
              Sign out
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setSignInOpen(true)}>
              Sign in
            </Button>
          )}
        </div>
      </div>
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </header>
  );
}
