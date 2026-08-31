"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PlusIcon } from "lucide-react";

import { addReport } from "@/lib/actions/reportes";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

interface ReportFormProps {
  websites: { id: number; name: string }[];
  date: string;
  onSuccess?: () => void;
}

export function ReportForm({ websites, date, onSuccess }: ReportFormProps) {
  const router = useRouter();
  const [websiteId, setWebsiteId] = React.useState<string | null>(null);
  const [startAmount, setStartAmount] = React.useState("");
  const [endAmount, setEndAmount] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await addReport({
        date,
        websiteId: Number(websiteId),
        startAmount: Number(startAmount),
        endAmount: Number(endAmount),
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setStartAmount("");
      setEndAmount("");
      setWebsiteId(null);
      onSuccess?.();
      router.refresh();
    });
  };

  const ready = Boolean(websiteId) && startAmount !== "" && endAmount !== "";

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="report-site">Sitio</FieldLabel>
          <Select value={websiteId} onValueChange={setWebsiteId}>
            <SelectTrigger id="report-site" className="w-full">
              <SelectValue placeholder="Elegir sitio" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {websites.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="report-start">Inicio</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                $
              </InputGroupAddon>
              <InputGroupInput
                id="report-start"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={startAmount}
                onChange={(e) => setStartAmount(e.target.value)}
              />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="report-end">Final</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                $
              </InputGroupAddon>
              <InputGroupInput
                id="report-end"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={endAmount}
                onChange={(e) => setEndAmount(e.target.value)}
              />
            </InputGroup>
          </Field>
        </div>
      </FieldGroup>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={!ready || isPending}>
        {isPending ? <Spinner /> : <PlusIcon data-icon="inline-start" />}
        {isPending ? "Agregando…" : "Agregar"}
      </Button>
    </form>
  );
}