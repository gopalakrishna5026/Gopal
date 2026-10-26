"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InfoIcon, LogInIcon, ShieldCheckIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/shared/password-input";
import { DEMO_CREDENTIALS } from "@/lib/constants";
import { errorMessage } from "@/lib/errors";
import { loginSchema, type LoginValues } from "@/lib/validations";
import { useAppReady } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";

function safeNext(): string | null {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function LoginForm() {
  const ready = useAppReady();
  const login = useAuthStore((s) => s.login);
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.fullName.split(" ")[0]}!`);
      router.replace(safeNext() ?? (user.role === "admin" ? "/admin/dashboard" : "/"));
    } catch (error) {
      form.setError("root", { message: errorMessage(error) });
    }
  });

  const fillDemo = (kind: keyof typeof DEMO_CREDENTIALS) => {
    form.setValue("email", DEMO_CREDENTIALS[kind].email, { shouldValidate: true });
    form.setValue("password", DEMO_CREDENTIALS[kind].password, { shouldValidate: true });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {errors.root && (
        <Alert variant="destructive">
          <AlertTitle>Sign in failed</AlertTitle>
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={!!errors.password || undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <Button type="submit" size="lg" disabled={isSubmitting || !ready}>
          {isSubmitting ? <Spinner data-icon="inline-start" /> : <LogInIcon data-icon="inline-start" />}
          Sign in
        </Button>
      </FieldGroup>

      <Alert>
        <InfoIcon />
        <AlertTitle>Demo accounts</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>Use these to explore without registering. Passwords are hashed locally (demo only).</span>
          <span className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fillDemo("user")}>
              <UserIcon data-icon="inline-start" />
              Fill traveller
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fillDemo("admin")}>
              <ShieldCheckIcon data-icon="inline-start" />
              Fill admin
            </Button>
          </span>
        </AlertDescription>
      </Alert>

      <p className="text-center text-sm text-muted-foreground">
        New to RailYatra?{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
