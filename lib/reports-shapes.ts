import type { Shift } from "@/lib/shift";

export interface SiteOption {
  id: number;
  name: string;
  balanceInicio: number;
  blocked?: boolean;
  warning?: string;
  note?: string;
}

export interface RejectedRow {
  id: number;
  websiteId: number;
  site: string;
  amount: number;
  rejectionNote: string | null;
  marked: boolean;
  originalAmount: number | null;
  originalSite: string | null;
}

export interface RejectedGroup {
  id: string;
  userName: string;
  teamName: string;
  dateKey: string;
  shift: Shift;
  totalAmount: number;
  rows: RejectedRow[];
}

export interface ApprovalRow {
  site: string;
  originalSite: string | null;
  amount: number;
  originalAmount: number | null;
  rectified: boolean;
}

export interface ApprovalGroup {
  id: number;
  reportIds: number[];
  userName: string;
  teamName: string;
  dateKey: string;
  shift: Shift;
  closed: boolean;
  rectified: boolean;
  rows: ApprovalRow[];
}

export interface TeamGroup {
  id: string;
  teamName: string;
  subtotal: number;
  groups: ApprovalGroup[];
}