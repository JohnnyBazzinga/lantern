// Minimal typings for Chrome's built-in Prompt API (global `LanguageModel`).
// Firebase AI Logic wraps this API for hybrid inference; Lantern only touches it directly
// to check availability *before* passing any user data (see src/ai/capability.ts).

type LanguageModelAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface LanguageModelExpectedIO {
  type: 'text' | 'image' | 'audio';
  languages?: string[];
}

interface LanguageModelCoreOptions {
  expectedInputs?: LanguageModelExpectedIO[];
  expectedOutputs?: LanguageModelExpectedIO[];
}

interface LanguageModelSession {
  readonly contextUsage?: number;
  readonly contextWindow?: number;
  measureContextUsage?(input: string): Promise<number>;
  prompt(input: string, options?: { responseConstraint?: object; signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}

interface LanguageModelStatic {
  availability(options?: LanguageModelCoreOptions): Promise<LanguageModelAvailability>;
  create(
    options?: LanguageModelCoreOptions & {
      initialPrompts?: { role: 'system' | 'user' | 'assistant'; content: string }[];
      signal?: AbortSignal;
    },
  ): Promise<LanguageModelSession>;
}

declare var LanguageModel: LanguageModelStatic | undefined;
