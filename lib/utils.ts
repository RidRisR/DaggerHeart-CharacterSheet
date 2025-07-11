import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import getConfig from "next/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBasePath() {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}
