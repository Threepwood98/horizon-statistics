export type Shift = "AM" | "PM";

export type ShiftParam = "am" | "pm";

export function shiftFromDate(date: Date): Shift {
  return date.getHours() < 14 ? "AM" : "PM";
}

export function shiftParamFromDate(date: Date): ShiftParam {
  return date.getHours() < 14 ? "am" : "pm";
}

export function shiftLabel(shift: Shift): string {
  return shift === "AM" ? "AM" : "PM";
}

export function shiftSpanish(shift: Shift): string {
  return shift === "AM" ? "MAÑANA" : "TARDE";
}

export function shiftParamFromParam(value: string | undefined): ShiftParam {
  return isShiftParam(value) ? value : "am";
}

export function shiftFromParam(param: ShiftParam | undefined): Shift {
  return param === "pm" ? "PM" : "AM";
}

export function isShiftParam(value: string | undefined): value is ShiftParam {
  return value === "am" || value === "pm";
}