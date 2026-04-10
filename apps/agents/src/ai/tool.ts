import type { Tool } from "ai";
import { tool as aiTool, zodSchema } from "ai";
import type { infer as ZodInfer, ZodTypeAny } from "zod";

export function tool<TSchema extends ZodTypeAny, TOutput>({
  description,
  parameters,
  execute,
}: {
  description: string;
  parameters: TSchema;
  execute: (input: ZodInfer<TSchema>) => Promise<TOutput>;
}): Tool {
  return aiTool({
    description,
    inputSchema: zodSchema(parameters),
    execute: execute as (input: Record<string, unknown>) => Promise<TOutput>,
  });
}
