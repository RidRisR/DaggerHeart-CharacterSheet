import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import getConfig from "next/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
