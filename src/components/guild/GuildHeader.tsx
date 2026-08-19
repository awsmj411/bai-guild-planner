import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SignInDialog } from "@/components/guild/SignInDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  { to: "/", label: "Guild Roster" },
  { to: "/bidding", label: "Bidding" },
] as const;

export function GuildHeader({
  isAdmin,
  tagline,
  onSignOut,
}: {
  isAdmin: boolean;
  tagline: string;
  onSignOut?: () => void;
}) {
  const [signInOpen, setSignInOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeIndex = Math.max(
    0,
    NAV.findIndex((item) => (item.to === "/" ? pathname === "/" : pathname.startsWith(item.to))),
  );

  return (
    <header className="border-b border-border bg-guild-team text-guild-team-foreground">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src={baiLogo.url} alt="BAI Guild logo" className="h-11 w-auto shrink-0" />
          <p className="hidden truncate text-xs font-semibold uppercase tracking-[0.18em] opacity-85 sm:block">
            {tagline}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <nav
            className="relative grid items-center gap-1 rounded-full bg-black/20 p-1"
            style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-primary transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
              style={{
                width: `calc((100% - 0.5rem - ${(NAV.length - 1) * 0.25}rem) / ${NAV.length})`,
                transform: `translateX(calc(${activeIndex} * (100% + 0.25rem)))`,
              }}
            />
            {NAV.map((item, index) => (
              <Link
                key={item.to}
                to={item.to}
                className={`relative z-10 whitespace-nowrap rounded-full px-3 py-1.5 text-center text-xs font-semibold transition-colors duration-200 ${
                  index === activeIndex ? "text-primary-foreground" : "hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          {isAdmin ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => (onSignOut ? onSignOut() : supabase.auth.signOut())}
            >
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
