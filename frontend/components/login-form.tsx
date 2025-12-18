"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestLoginOtp, verifyLoginOtp } from "@/lib/auth";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await requestLoginOtp(email, password);
      if (res.success) {
        toast.success(res.message);
        setStep("otp");
      } else {
        toast.message(res.message || "Failed to send OTP");
        setError(res.message || "Failed to send OTP");
      }
    } catch (err: unknown) {
      let errorMessage = "Login failed";
      if (err && typeof err === 'object' && 'response' in err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMessage = (err as any).response?.data?.error || (err as any).message || errorMessage; // Modified to access error message correctly from axios error if possible
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((err as any).response?.data?.message) errorMessage = (err as any).response.data.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await verifyLoginOtp(email, otp);
      if (res.success) {
        toast.success(res.message);
        // Store token logic is already in verifyLoginOtp via setAuthTokens
        localStorage.setItem("accessToken", res.accessToken); // Keeping this for consistency with previous code if needed elsewhere, though axios-jwt handles it usually.
        router.push(`/dashboard`);
      } else {
        toast.error(res.message);
        setError(res.message);
      }
    } catch (err: unknown) {
      let errorMessage = "Verification failed";
      if (err && typeof err === 'object' && 'response' in err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMessage = (err as any).response?.data?.error || (err as any).message || errorMessage;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((err as any).response?.data?.message) errorMessage = (err as any).response.data.message;

      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <h1 className="text-3xl font-bold text-primary drop-shadow-sm">
        Xerocare
      </h1>

      <form onSubmit={step === "credentials" ? handleCredentialsSubmit : handleOtpSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl text-muted-foreground">
              {step === "credentials" ? "Login to your account" : "Enter Verification Code"}
            </h1>
            {step === "otp" && <p className="text-sm text-muted-foreground">Sent to {email}</p>}
          </div>

          {step === "credentials" && (
            <>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="mm@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <a
                  href="#"
                  className="ml-auto flex justify-end text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </Field>
            </>
          )}

          {step === "otp" && (
            <Field>
              <FieldLabel htmlFor="otp">One-Time Password</FieldLabel>
              <Input
                id="otp"
                type="text"
                placeholder="123456"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="text-center text-lg tracking-widest"
              />
            </Field>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center">
              {error}
            </p>
          )}

          <Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Processing..."
                : step === "credentials"
                  ? "Next"
                  : "Verify & Login"}
            </Button>
          </Field>

          {step === "otp" && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => setStep("credentials")}
              className="w-full mt-2"
            >
              Back to Login
            </Button>
          )}
        </FieldGroup>
      </form>
    </div>
  );
}
