import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authenticate, getUser, registerUser } from "@/lib/db/repositories/users";
import type { PublicUser } from "@/types";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type AuthStatus = "unknown" | "authenticated" | "anonymous";

interface AuthState {
  /** Persisted: only an opaque pointer to the user, never credentials. */
  session: { userId: string; expiresAt: number } | null;
  user: PublicUser | null;
  status: AuthStatus;
  /** True right after an explicit sign-out (guards send users home, not to login). */
  signedOut: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (input: Parameters<typeof registerUser>[0]) => Promise<PublicUser>;
  logout: () => void;
  /** Resolves the persisted session against IndexedDB. */
  restore: () => Promise<void>;
  setUser: (user: PublicUser) => void;
}

/**
 * SIMULATED auth for a frontend-only demo. The "session" is a user id in localStorage,
 * which anyone with devtools could edit. Production apps need server-issued,
 * httpOnly session cookies and server-side authorisation checks.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      status: "unknown",
      signedOut: false,
      async login(email, password) {
        const user = await authenticate(email, password);
        set({ user, status: "authenticated", signedOut: false, session: { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS } });
        return user;
      },
      async register(input) {
        const user = await registerUser(input);
        set({ user, status: "authenticated", signedOut: false, session: { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS } });
        return user;
      },
      logout() {
        set({ user: null, status: "anonymous", session: null, signedOut: true });
      },
      async restore() {
        const { session } = get();
        if (!session || session.expiresAt < Date.now()) {
          set({ user: null, status: "anonymous", session: null });
          return;
        }
        const user = await getUser(session.userId);
        set(user ? { user, status: "authenticated" } : { user: null, status: "anonymous", session: null });
      },
      setUser(user) {
        set({ user });
      },
    }),
    {
      name: "railyatra-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ session: s.session }),
      skipHydration: true,
    },
  ),
);

export const useCurrentUser = () => useAuthStore((s) => s.user);
