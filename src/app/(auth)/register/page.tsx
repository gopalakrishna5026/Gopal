import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Create your account</h1>
        <p className="text-sm text-muted-foreground">It takes less than a minute. Your data stays in this browser.</p>
      </div>
      <RegisterForm />
    </div>
  );
}
