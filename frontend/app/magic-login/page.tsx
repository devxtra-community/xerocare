"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyMagicLink } from "@/lib/auth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function MagicLoginContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get("email");
    const token = searchParams.get("token");
    const router = useRouter();
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!email || !token) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStatus("error");
            setErrorMessage("Invalid link parameters.");
            return;
        }

        const verify = async () => {
            try {
                const res = await verifyMagicLink(email, token);
                if (res.success) {
                    setStatus("success");
                    toast.success("Login successful!");
                    // Token storage is handled in verifyMagicLink (if axios-jwt is used) or manual storage there
                    localStorage.setItem("accessToken", res.accessToken);
                    setTimeout(() => {
                        router.push("/dashboard");
                    }, 1000);
                } else {
                    setStatus("error");
                    setErrorMessage(res.message || "Verification failed");
                }
            } catch (err: unknown) {
                setStatus("error");
                let msg = "An error occurred";
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((err as any).response?.data?.message) msg = (err as any).response.data.message;
                else if (err instanceof Error) msg = err.message;
                setErrorMessage(msg);
            }
        };

        verify();
    }, [email, token, router]);

    return (
        <Card className="w-full max-w-md mx-auto mt-20">
            <CardHeader>
                <CardTitle className="text-center">Magic Link Login</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                {status === "verifying" && (
                    <p className="text-muted-foreground animate-pulse">Verifying your link...</p>
                )}
                {status === "success" && (
                    <div className="text-green-600 text-center">
                        <p className="font-medium">Verified!</p>
                        <p className="text-sm">Redirecting you to dashboard...</p>
                    </div>
                )}
                {status === "error" && (
                    <div className="text-red-500 text-center space-y-4">
                        <p>Login failed: {errorMessage}</p>
                        <Button onClick={() => router.push("/login")}>
                            Back to Login
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function MagicLoginPage() {
    return (
        <Suspense fallback={<p className="text-center mt-10">Loading...</p>}>
            <MagicLoginContent />
        </Suspense>
    )
<<<<<<< HEAD
}
=======
}
>>>>>>> riyas
