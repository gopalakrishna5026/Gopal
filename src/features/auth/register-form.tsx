"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/shared/password-input";
import { AppError, errorMessage } from "@/lib/errors";
import { registerSchema, type RegisterValues } from "@/lib/validations";
import { useAppReady } from "@/stores/app-store";
import { useAuthStore } from "@/stores/auth-store";

export function RegisterForm() {
  const ready = useAppReady();
  const register = useAuthStore((s) => s.register);
  const router = useRouter();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", mobile: "", password: "", confirmPassword: "" },
    mode: "onTouched",
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ fullName, email, mobile, password }) => {
    try {
      const user = await register({ fullName, email, mobile, password });
      toast.success(`Account created. Welcome aboard, ${user.fullName.split(" ")[0]}!`);
      router.replace("/profile");
    } catch (error) {
      if (error instanceof AppError && error.code === "DUPLICATE") {
        form.setError("email", { message: error.message }, { shouldFocus: true });
      } else {
        form.setError("root", { message: errorMessage(error) });
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {errors.root && (
        <Alert variant="destructive">
          <AlertTitle>Registration failed</AlertTitle>
          <AlertDescription>{errors.root.message}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field data-invalid={!!errors.fullName || undefined}>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...form.register("fullName")} />
          <FieldError errors={[errors.fullName]} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.email || undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...form.register("email")} />
            <FieldError errors={[errors.email]} />
          </Field>
          <Field data-invalid={!!errors.mobile || undefined}>
            <FieldLabel htmlFor="mobile">Mobile number</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>+91</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="mobile"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                aria-invalid={!!errors.mobile}
                {...form.register("mobile")}
              />
            </InputGroup>
            <FieldError errors={[errors.mobile]} />
          </Field>
        </div>
        <Field data-invalid={!!errors.password || undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!errors.password} {...form.register("password")} />
          <FieldDescription>8+ characters with upper & lower case letters, a number and a symbol.</FieldDescription>
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={!!errors.confirmPassword || undefined}>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...form.register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
        <Button type="submit" size="lg" disabled={isSubmitting || !ready}>
          {isSubmitting ? <Spinner data-icon="inline-start" /> : <UserPlusIcon data-icon="inline-start" />}
          Create account
        </Button>
      </FieldGroup>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
