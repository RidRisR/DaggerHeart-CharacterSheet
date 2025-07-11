import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 公共图片前缀，硬编码为 /DaggerHeart-CharacterSheet
export const PUBLIC_IMAGE_PREFIX = "/DaggerHeart-CharacterSheet";
