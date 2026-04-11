import type { Tool, ToolExecutionOptions } from "ai";
import { zodSchema } from "ai";
import type { infer as ZodInfer, ZodTypeAny } from "zod";

export function tool<TSchema extends ZodTypeAny, TOutput>({
  description,
  parameters,
  execute,
}: {
  description: string;
  parameters: TSchema;
  execute: (input: ZodInfer<TSchema>) => Promise<TOutput>;
}): Tool<ZodInfer<TSchema>, TOutput> {
  return {
    description,
    inputSchema: zodSchema<ZodInfer<TSchema>>(parameters),
    execute: (_input: ZodInfer<TSchema>, _options: ToolExecutionOptions) => execute(_input),
  } as unknown as Tool<ZodInfer<TSchema>, TOutput>;
}
