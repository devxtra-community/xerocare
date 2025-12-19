"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestForgotPasswordOtp, resetPassword } from "@/lib/auth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<"request" | "reset">("request");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await requestForgotPasswordOtp(email);
            if (res.success) {
                toast.success(res.message);
                setStep("reset");
            } else {
                toast.error(res.message);
            }
        } catch (err: unknown) {
            let msg = "Failed to send OTP";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((err as any).response?.data?.message) msg = (err as any).response.data.message;
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleResetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await resetPassword(email, otp, newPassword);
            if (res.success) {
                toast.success("Password reset successfully! Please login.");
                router.push("/login");
            } else {
                toast.error(res.message);
            }
        } catch (err: unknown) {
            let msg = "Failed to reset password";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((err as any).response?.data?.message) msg = (err as any).response.data.message;
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Reset Password</CardTitle>
                    <CardDescription>
                        {step === "request"
                            ? "Enter your email to receive a reset code."
                            : "Enter the code sent to your email and your new password."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === "request" ? (
                        <form onSubmit={handleRequestSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Sending..." : "Send Reset Code"}
                            </Button>
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => router.push("/login")}
                                className="w-full"
                            >
                                Back to Login
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetSubmit} className="space-y-4">
                            <div className="p-3 bg-muted rounded-md text-sm text-center mb-4">
                                Code sent to <strong>{email}</strong>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="otp">One-Time Password (OTP)</Label>
                                <Input
                                    id="otp"
                                    placeholder="123456"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="tracking-widest"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Resetting..." : "Reset Password"}
                            </Button>
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={() => setStep("request")}
                                className="w-full"
                            >
                                Change Email
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}