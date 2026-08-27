"use client";

import { useActionState } from "react";
import { cn } from "@/lib/utils";
import { createUser, type RegisterState } from "@/app/register/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: RegisterState = {};

export function RegisterForm({
  isFirstUser,
  className,
  ...props
}: { isFirstUser: boolean } & React.ComponentProps<"div">) {
  const [state, formAction, pending] = useActionState(
    createUser,
    initialState,
  );

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isFirstUser ? "Crear administrador" : "Registrar usuario"}
          </CardTitle>
          <CardDescription>
            {isFirstUser
              ? "No hay usuarios todavía. El primero será el administrador."
              : "Crea una nueva cuenta de usuario."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Nombre</FieldLabel>
                <Input id="name" name="name" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="username">Usuario</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  autoComplete="off"
                  pattern="[A-Za-z0-9_.]+"
                  title="Solo letras, números, guion bajo y punto"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Rol</FieldLabel>
                <Select
                  name="role"
                  defaultValue={isFirstUser ? "admin" : "user"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {!isFirstUser && (
                <FieldDescription>
                  El email interno se genera automáticamente; no se usa para
                  iniciar sesión.
                </FieldDescription>
              )}
              {state.error && (
                <FieldDescription data-invalid>
                  {state.error}
                </FieldDescription>
              )}
              {state.success && (
                <FieldDescription>{state.success}</FieldDescription>
              )}
              <Field>
                <Button type="submit" disabled={pending} className="w-full">
                  {pending ? "Creando..." : "Crear usuario"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
