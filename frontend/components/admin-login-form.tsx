"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminLogin } from "@/lib/auth";

interface APIError {
    response?: {
        data?: {
            error?: string;
            message?: string;
        };
    };
    message?: string;
}


export function AdminLoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    const handleCredentialsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await adminLogin(email, password);
            if (res.success) {
                toast.success("Admin login successful");
                router.push(`/admin/dashboard`);
            } else {
                toast.message(res.message || "Failed to login");
                setError(res.message || "Failed to login");
            }
        } catch (err: unknown) {
            let errorMessage = "Login failed";
            if (err && typeof err === 'object' && 'response' in err) {
                errorMessage = (err as APIError).response?.data?.error || (err as APIError).message || errorMessage;
                if ((err as APIError).response?.data?.message) errorMessage = (err as APIError).response!.data!.message!;
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
                Xerocare Admin
            </h1>

            <form onSubmit={handleCredentialsSubmit}>
                <FieldGroup>
                    <div className="flex flex-col items-center text-center">
                        <h1 className="text-xl text-muted-foreground">
                            Sign in to Dashboard
                        </h1>
                    </div>

                    <Field>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            placeholder="admin@xerocare.com"
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
                    </Field>

                    {error && (
                        <p className="text-sm text-red-500 text-center">
                            {error}
                        </p>
                    )}

                    <Field>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Processing..." : "Login"}
                        </Button>
                    </Field>
                </FieldGroup>
            </form>
        </div>
    );
}
