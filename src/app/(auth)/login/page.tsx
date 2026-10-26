import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Sign in</h1>
        <p className="text-sm text-muted-foreground">Access your bookings, passengers and saved payments.</p>
      </div>
      <LoginForm />
    </div>
  );
}
