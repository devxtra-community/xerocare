"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestLoginOtp, verifyLoginOtp, requestMagicLink } from "@/lib/auth";
import Link from "next/link";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [loginMethod, setLoginMethod] = useState<"password" | "magic-link">("password");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
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

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await requestMagicLink(email);
      if (res.success) {
        setMagicLinkSent(true);
        toast.success(res.message);
      } else {
        setError(res.message);
        toast.error(res.message);
      }
    } catch (err: unknown) {
      let errorMessage = "Failed to send magic link";
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

      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          onClick={() => { setLoginMethod("password"); setStep("credentials"); setError(null); }}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-all",
            loginMethod === "password" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Password
        </button>
        <button
          onClick={() => { setLoginMethod("magic-link"); setError(null); }}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-all",
            loginMethod === "magic-link" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Magic Link
        </button>
      </div>

      {loginMethod === "password" ? (
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
                  <Link
                    href="/forgot-password"
                    className="ml-auto flex justify-end text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
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
      ) : (
        <form onSubmit={handleMagicLinkSubmit}>
          <FieldGroup>
            <div className="flex flex-col items-center text-center">
              <h1 className="text-xl text-muted-foreground">
                Passwordless Login
              </h1>
              <p className="text-sm text-muted-foreground">
                We&apos;ll send a magic link to your email
              </p>
            </div>

            {!magicLinkSent ? (
              <>
                <Field>
                  <FieldLabel htmlFor="magic-email">Email</FieldLabel>
                  <Input
                    id="magic-email"
                    type="email"
                    placeholder="mm@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>

                <Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Magic Link"}
                  </Button>
                </Field>
              </>
            ) : (
              <div className="p-4 text-center bg-green-50 text-green-700 rounded-lg">
                <p>Magic link sent! Check your inbox.</p>
                <Button
                  variant="link"
                  type="button"
                  onClick={() => setMagicLinkSent(false)}
                  className="mt-2"
                >
                  Try another email
                </Button>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 text-center">
                {error}
              </p>
            )}
          </FieldGroup>
        </form>
      )}
    </div>
  );
}
