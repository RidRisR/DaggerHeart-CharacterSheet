import { z } from "zod";

/**
 * 自定义卡牌表单数据接口
 */
export interface SheetCustomCardFormData {
  name: string;
  realType: string;
  description?: string;
  imageUrl?: string;
  cardSelectDisplay?: {
    item1?: string;
    item2?: string;
    item3?: string;
    item4?: string;
  };
}

/**
 * 自定义卡牌表单验证 Schema
 */
export const customCardFormSchema = z.object({
  name: z.string().min(1, "卡牌名称不能为空").max(50, "卡牌名称最多50个字符"),
  realType: z.string().min(1, "真实类型不能为空").max(30, "真实类型最多30个字符"),
  description: z.string().max(500, "描述最多500个字符").optional(),
  imageUrl: z
    .string()
    .url("请输入有效的图片URL")
    .optional()
    .or(z.literal("")),
  cardSelectDisplay: z
    .object({
      item1: z.string().max(100, "显示项最多100个字符").optional(),
      item2: z.string().max(100, "显示项最多100个字符").optional(),
      item3: z.string().max(100, "显示项最多100个字符").optional(),
      item4: z.string().max(100, "显示项最多100个字符").optional(),
    })
    .optional(),
});

/**
 * Zod 推断的表单类型
 */
export type CustomCardFormValues = z.infer<typeof customCardFormSchema>;
