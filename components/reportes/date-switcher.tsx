"use client";

import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";

export function DateSwitcher({ value }: { value: string }) {
  const router = useRouter();

  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => {
        if (e.target.value) router.push(`/reportes?date=${e.target.value}`);
      }}
      className="w-fit"
      aria-label="Fecha del parte"
    />
  );
}