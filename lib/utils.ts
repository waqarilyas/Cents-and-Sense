import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatDate(date: number | Date): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function formatDateLong(date: number | Date): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getMonthName(monthIndex: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthIndex];
}

export function getCurrentMonthRange(): { start: number; end: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  ).getTime();
  return { start, end };
}

export function getYearRange(): { start: number; end: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59).getTime();
  return { start, end };
}

export function getDaysUntil(date: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
