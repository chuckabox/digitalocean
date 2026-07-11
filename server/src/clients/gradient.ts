import OpenAI from 'openai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { loadEnv } from '../config/env.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';

/**
 * Typed wrapper over DigitalOcean Gradient (OpenAI-compatible). The one place the
 * app talks to an LLM. Services call chat/stream/structured; nothing else imports the
 * OpenAI SDK.
 */

export type ModelTier = 'fast' | 'smart';
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type SdkMessages = OpenAI.Chat.Completions.ChatCompletionMessageParam[];

let cached: OpenAI | null = null;
function client(): OpenAI {
  if (cached) return cached;
  const env = loadEnv();
  if (!env.DIGITAL_OCEAN_MODEL_ACCESS_KEY) {
    throw AppError.upstream('DIGITAL_OCEAN_MODEL_ACCESS_KEY not configured');
  }
  cached = new OpenAI({
    apiKey: env.DIGITAL_OCEAN_MODEL_ACCESS_KEY,
    baseURL: env.DO_INFERENCE_BASE_URL,
    maxRetries: 2, // SDK retries transient network/5xx errors
    timeout: 30_000,
  });
  return cached;
}

function modelFor(tier: ModelTier): string {
  const env = loadEnv();
  return tier === 'smart' ? env.MODEL_SMART : env.MODEL_FAST;
}

/** Per-request options — omit entirely when no timeout is set (the SDK rejects undefined). */
function reqOpts(opts: ChatOptions): { timeout: number } | undefined {
  return opts.timeoutMs !== undefined ? { timeout: opts.timeoutMs } : undefined;
}

export interface ChatOptions {
  tier?: ModelTier;
  system?: string;
  prompt?: string;
  messages?: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

function buildMessages(opts: ChatOptions): SdkMessages {
  if (opts.messages) return opts.messages as SdkMessages;
  const msgs: ChatMessage[] = [];
  if (opts.system) msgs.push({ role: 'system', content: opts.system });
  if (opts.prompt) msgs.push({ role: 'user', content: opts.prompt });
  return msgs as SdkMessages;
}

/** Timing wrapper — never logs prompts, messages, or secrets. */
async function withInferenceLog<T>(
  op: string,
  tier: ModelTier,
  fn: () => Promise<T>,
): Promise<T> {
  const model = modelFor(tier);
  const started = Date.now();
  try {
    const result = await fn();
    logger.info({ op, tier, model, ms: Date.now() - started }, 'Gradient ok');
    return result;
  } catch (err) {
    logger.warn(
      {
        op,
        tier,
        model,
        ms: Date.now() - started,
        err: err instanceof Error ? err.message : String(err),
      },
      'Gradient failed',
    );
    throw err;
  }
}

/** Non-streaming completion — returns the assistant text. */
export async function chat(opts: ChatOptions): Promise<string> {
  const tier = opts.tier ?? 'fast';
  return withInferenceLog('chat', tier, async () => {
    const res = await client().chat.completions.create(
      {
        model: modelFor(tier),
        messages: buildMessages(opts),
        max_completion_tokens: opts.maxTokens ?? 512,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      },
      reqOpts(opts),
    );
    return res.choices[0]?.message?.content ?? '';
  });
}

/** Streaming completion — yields text deltas (drives the debrief SSE). */
export async function* stream(opts: ChatOptions): AsyncGenerator<string> {
  const tier = opts.tier ?? 'smart';
  const model = modelFor(tier);
  const started = Date.now();
  let s;
  try {
    s = await client().chat.completions.create(
      {
        model,
        messages: buildMessages(opts),
        max_completion_tokens: opts.maxTokens ?? 1024,
        stream: true,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      },
      reqOpts(opts),
    );
  } catch (err) {
    logger.warn(
      {
        op: 'stream',
        tier,
        model,
        ms: Date.now() - started,
        err: err instanceof Error ? err.message : String(err),
      },
      'Gradient failed',
    );
    throw err;
  }
  try {
    for await (const chunk of s) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
    logger.info({ op: 'stream', tier, model, ms: Date.now() - started }, 'Gradient ok');
  } catch (err) {
    logger.warn(
      {
        op: 'stream',
        tier,
        model,
        ms: Date.now() - started,
        err: err instanceof Error ? err.message : String(err),
      },
      'Gradient failed',
    );
    throw err;
  }
}

export interface StructuredOptions extends ChatOptions {
  /** function name the model is forced to call */
  toolName: string;
  toolDescription: string;
  /** how many total attempts (1 initial + repairs). Default 2. */
  maxAttempts?: number;
}

/**
 * Validate one raw JSON string against a schema, re-attempting with a correction
 * message on failure. Extracted from `structured` so the repair loop is unit-testable
 * without the network. `attempt(correction)` returns the model's raw JSON arguments.
 */
export async function extractValidJson<T>(
  schema: z.ZodType<T>,
  attempt: (correction: string | null) => Promise<string>,
  maxAttempts = 2,
): Promise<T> {
  let lastError = '';
  for (let i = 0; i < maxAttempts; i++) {
    const correction =
      i === 0
        ? null
        : `Your previous output was invalid: ${lastError}. Emit corrected arguments that satisfy the schema.`;
    const raw = await attempt(correction);
    try {
      return schema.parse(JSON.parse(raw));
    } catch (e) {
      lastError =
        e instanceof z.ZodError ? JSON.stringify(e.issues) : (e as Error).message;
    }
  }
  throw AppError.upstream(
    `Structured output failed schema validation after ${maxAttempts} attempt(s): ${lastError}`,
  );
}

/** Forced tool-call → schema-validated object. Our reliable structured-output path. */
export async function structured<T>(schema: z.ZodType<T>, opts: StructuredOptions): Promise<T> {
  const tier = opts.tier ?? 'fast';
  return withInferenceLog('structured', tier, async () => {
    const model = modelFor(tier);
    const baseMessages = buildMessages(opts);
    const parameters = zodToJsonSchema(schema, {
      target: 'openApi3',
      $refStrategy: 'none',
    }) as Record<string, unknown>;
    delete parameters['$schema'];

    const attempt = async (correction: string | null): Promise<string> => {
      const messages: SdkMessages = correction
        ? [...baseMessages, { role: 'user', content: correction }]
        : baseMessages;
      const res = await client().chat.completions.create(
        {
          model,
          messages,
          tools: [
            {
              type: 'function',
              function: {
                name: opts.toolName,
                description: opts.toolDescription,
                parameters,
              },
            },
          ],
          tool_choice: { type: 'function', function: { name: opts.toolName } },
          max_completion_tokens: opts.maxTokens ?? 800,
        },
        reqOpts(opts),
      );
      const call = res.choices[0]?.message?.tool_calls?.[0];
      if (!call || call.type !== 'function') throw AppError.upstream('Model returned no tool call');
      return call.function.arguments;
    };

    return extractValidJson(schema, attempt, opts.maxAttempts ?? 2);
  });
}

export async function listModels(): Promise<string[]> {
  const res = await client().models.list();
  return res.data.map((m) => m.id);
}
