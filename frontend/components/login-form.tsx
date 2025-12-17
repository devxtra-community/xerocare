"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // submit logic
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <h1 className="text-3xl font-bold text-primary drop-shadow-sm">
        Xerocare
      </h1>

      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl text-muted-foreground">
            Login to your account
          </h1>
        </div>

        <Field>
          <FieldLabel htmlFor="email" className="text-muted-foreground">
            Email
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password" className="text-muted-foreground">
              Password
            </FieldLabel>
            <a
              href="#"
              className="ml-auto text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" type="password" required />
        </Field>

        <Field>
          <Button onClick={handleSubmit} className="w-full relative z-0">
            Login
          </Button>
        </Field>
      </FieldGroup>
    </div>
  )
}
