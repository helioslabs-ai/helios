import { tool as aiTool, zodSchema } from "ai";
import type { ZodTypeAny, infer as ZodInfer } from "zod";

export function tool<TSchema extends ZodTypeAny, TOutput>({
  description,
  parameters,
  execute,
}: {
  description: string;
  parameters: TSchema;
  execute: (input: ZodInfer<TSchema>) => Promise<TOutput>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return aiTool({
    description,
    inputSchema: zodSchema(parameters) as any,
    execute: execute as any,
  });
}
