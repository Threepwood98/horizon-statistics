"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FilterIcon, Undo2Icon } from "lucide-react";

import { type ShiftParam } from "@/lib/shift";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ScopeUser {
  id: string;
  name: string;
  teamName: string | null;
}

interface ScopeFiltersProps {
  teams: { id: string; name: string }[];
  users: ScopeUser[];
  equipo?: string;
  usuario?: string;
  turno?: ShiftParam;
}

const BASE = "flex items-center gap-1.5 rounded-full px-3";

export function ScopeFilters({
  teams,
  users,
  equipo,
  usuario,
  turno,
}: ScopeFiltersProps) {
  const router = useRouter();

  const route = (patch: { key: string; value?: string }) => {
    const params = new URLSearchParams(window.location.search);
    if (patch.value) params.set(patch.key, patch.value);
    else params.delete(patch.key);
    router.replace(`?${params.toString()}`);
  };

  const filteredUsers =
    equipo && !usuario
      ? users.filter((u) => u.teamName === teams.find((t) => t.id === equipo)?.name)
      : users;

  const hasFilters = Boolean(equipo || usuario || turno);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <FilterIcon className="size-4" />
        Filtros
      </span>

      <Select value={equipo} onValueChange={(v) => route({ key: "equipo", value: v ?? undefined })}>
        <SelectTrigger className="w-40 h-9">
          <SelectValue placeholder="Equipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {teams.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select value={usuario} onValueChange={(v) => route({ key: "usuario", value: v ?? undefined })}>
        <SelectTrigger className="w-44 h-9">
          <SelectValue placeholder="Usuario" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {filteredUsers.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
                {u.teamName ? ` · ${u.teamName}` : ""}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1 rounded-full border p-1">
        <button
          type="button"
          className={cn(
            BASE,
            !turno ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
          onClick={() => route({ key: "turno" })}
        >
          Todos
        </button>
        <button
          type="button"
          className={cn(
            BASE,
            turno === "manana"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground",
          )}
          onClick={() => route({ key: "turno", value: "manana" })}
        >
          Mañana
        </button>
        <button
          type="button"
          className={cn(
            BASE,
            turno === "tarde"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground",
          )}
          onClick={() => route({ key: "turno", value: "tarde" })}
        >
          Tarde
        </button>
      </div>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            params.delete("equipo");
            params.delete("usuario");
            params.delete("turno");
            router.replace(`?${params.toString()}`);
          }}
        >
          <Undo2Icon />
          Quitar filtros
        </Button>
      )}
    </div>
  );
}