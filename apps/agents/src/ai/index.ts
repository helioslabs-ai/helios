import { createAnthropic } from "@ai-sdk/anthropic";
import type { CoreTool } from "ai";
import { generateText as aiGenerateText } from "ai";

const MODEL_ID = "claude-sonnet-4-6" as const;

export function createModel(apiKey: string) {
  const anthropic = createAnthropic({ apiKey });
  return anthropic(MODEL_ID);
}

export async function generateText(params: {
  apiKey: string;
  system: string;
  prompt: string;
  tools?: Record<string, CoreTool>;
  maxSteps?: number;
}) {
  const model = createModel(params.apiKey);
  return aiGenerateText({
    model,
    system: params.system,
    prompt: params.prompt,
    tools: params.tools,
    maxSteps: params.maxSteps ?? 10,
  });
}
