export type Shift = "MANANA" | "TARDE";

const SHIFT_PARAM = ["manana", "tarde"] as const;
export type ShiftParam = (typeof SHIFT_PARAM)[number];

export function shiftFromDate(date: Date): Shift {
  return date.getHours() < 14 ? "MANANA" : "TARDE";
}

export function shiftParamFromDate(date: Date): ShiftParam {
  return date.getHours() < 14 ? "manana" : "tarde";
}

export function shiftLabel(shift: Shift): string {
  return shift === "MANANA" ? "Mañana" : "Tarde";
}

export function shiftParamFromParam(value: string | undefined): ShiftParam {
  return isShiftParam(value) ? value : "manana";
}

export function shiftFromParam(param: ShiftParam | undefined): Shift {
  return param === "tarde" ? "TARDE" : "MANANA";
}

export function isShiftParam(value: string | undefined): value is ShiftParam {
  return value === "manana" || value === "tarde";
}