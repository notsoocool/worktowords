import { z } from "zod";

export const MAX_GENERATE_INPUT_CHARS = 4000;

export const generateBodySchema = z.object({
  userInput: z
    .string()
    .trim()
    .min(1, "userInput is required.")
    .max(
      MAX_GENERATE_INPUT_CHARS,
      `Input too long. Maximum ${MAX_GENERATE_INPUT_CHARS} characters.`
    ),
  mode: z.enum(["help", "write"]),
  goal: z.enum(["job", "growth", "authority"]),
  platforms: z
    .array(z.enum(["linkedin", "instagram", "youtube"]))
    .nonempty()
    .default(["linkedin"]),
});

export const settingsPatchSchema = z.object({
  defaultGoal: z.enum(["job", "growth", "authority"]),
  tone: z.enum(["casual", "professional", "storytelling"]),
});

export const razorpayVerifyBodySchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

