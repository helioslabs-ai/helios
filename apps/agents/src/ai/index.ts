import { createOpenAI } from "@ai-sdk/openai";
import type { Tool } from "ai";
import { generateText as aiGenerateText, stepCountIs } from "ai";

const MODEL_ID = "gpt-4o" as const;

export function createModel(apiKey: string) {
  const openai = createOpenAI({ apiKey });
  return openai(MODEL_ID);
}

export async function generateText(params: {
  apiKey: string;
  system: string;
  prompt: string;
  tools?: Record<string, Tool>;
  maxSteps?: number;
}) {
  const model = createModel(params.apiKey);
  return aiGenerateText({
    model,
    system: params.system,
    prompt: params.prompt,
    tools: params.tools,
    stopWhen: stepCountIs(params.maxSteps ?? 10),
  });
}
