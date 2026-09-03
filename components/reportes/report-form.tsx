"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PlusIcon, SaveIcon } from "lucide-react";

import { addReport, updateReport } from "@/lib/actions/reportes";
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
  sites: { id: number; name: string; balanceInicio: number }[];
  date: string;
  reportId?: number;
  initial?: { websiteId: number; amount: number };
  onSuccess?: () => void;
}

export function ReportForm({
  sites,
  date,
  reportId,
  initial,
  onSuccess,
}: ReportFormProps) {
  const router = useRouter();
  const [websiteId, setWebsiteId] = React.useState<string | null>(
    initial ? String(initial.websiteId) : null,
  );
  const [amount, setAmount] = React.useState(initial ? String(initial.amount) : "");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSite = sites.find((s) => websiteId != null && String(s.id) === websiteId);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = reportId
        ? await updateReport(reportId, {
            websiteId: Number(websiteId),
            amount: Number(amount),
          })
        : await addReport({
            date,
            websiteId: Number(websiteId),
            amount: Number(amount),
          });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setAmount("");
      onSuccess?.();
      router.refresh();
    });
  };

  const ready = Boolean(websiteId) && amount !== "";

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
                {sites.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
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
                value={
                  selectedSite ? selectedSite.balanceInicio.toFixed(2) : ""
                }
                placeholder="0.00"
                readOnly
              />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="report-amount">Monto</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                $
              </InputGroupAddon>
              <InputGroupInput
                id="report-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </InputGroup>
          </Field>
        </div>
      </FieldGroup>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={!ready || isPending}>
        {isPending ? (
          <Spinner />
        ) : reportId ? (
          <SaveIcon data-icon="inline-start" />
        ) : (
          <PlusIcon data-icon="inline-start" />
        )}
        {isPending
          ? reportId
            ? "Guardando…"
            : "Agregando…"
          : reportId
            ? "Guardar"
            : "Agregar"}
      </Button>
    </form>
  );
}