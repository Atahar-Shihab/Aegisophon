import { ProviderType } from '../types';
import { DeterministicSimulator, ProviderExecutionResult } from './simulator';

export interface ProviderRequestOptions {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export class ProviderAdapterRegistry {
  /**
   * Executes completion against the designated provider or simulator
   */
  public static async execute(
    provider: ProviderType,
    options: ProviderRequestOptions
  ): Promise<ProviderExecutionResult> {
    switch (provider) {
      case 'gemini':
        return this.executeGemini(options);
      case 'openai':
        return this.executeOpenAI(options);
      case 'anthropic':
        return this.executeAnthropic(options);
      case 'simulator':
      default:
        return DeterministicSimulator.execute({
          prompt: options.prompt,
          model: options.model,
        });
    }
  }

  private static async executeGemini(
    options: ProviderRequestOptions
  ): Promise<ProviderExecutionResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Graceful fallback to deterministic simulator
      return DeterministicSimulator.execute({
        prompt: options.prompt,
        model: options.model,
      });
    }

    const startTime = performance.now();
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: options.prompt }] }],
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const promptTokens = data.usageMetadata?.promptTokenCount || Math.ceil(options.prompt.length / 4);
      const completionTokens = data.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);
      const latencyMs = Number((performance.now() - startTime).toFixed(1));

      return { text, promptTokens, completionTokens, latencyMs };
    } catch {
      // Fallback to simulator on API error
      return DeterministicSimulator.execute({
        prompt: options.prompt,
        model: options.model,
      });
    }
  }

  private static async executeOpenAI(
    options: ProviderRequestOptions
  ): Promise<ProviderExecutionResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return DeterministicSimulator.execute({
        prompt: options.prompt,
        model: options.model,
      });
    }

    const startTime = performance.now();
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: options.model,
          messages: [{ role: 'user', content: options.prompt }],
          temperature: options.temperature ?? 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      const promptTokens = data.usage?.prompt_tokens || Math.ceil(options.prompt.length / 4);
      const completionTokens = data.usage?.completion_tokens || Math.ceil(text.length / 4);
      const latencyMs = Number((performance.now() - startTime).toFixed(1));

      return { text, promptTokens, completionTokens, latencyMs };
    } catch {
      return DeterministicSimulator.execute({
        prompt: options.prompt,
        model: options.model,
      });
    }
  }

  private static async executeAnthropic(
    options: ProviderRequestOptions
  ): Promise<ProviderExecutionResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return DeterministicSimulator.execute({
        prompt: options.prompt,
        model: options.model,
      });
    }

    const startTime = performance.now();
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: options.model,
          max_tokens: options.maxTokens ?? 1024,
          messages: [{ role: 'user', content: options.prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const promptTokens = data.usage?.input_tokens || Math.ceil(options.prompt.length / 4);
      const completionTokens = data.usage?.output_tokens || Math.ceil(text.length / 4);
      const latencyMs = Number((performance.now() - startTime).toFixed(1));

      return { text, promptTokens, completionTokens, latencyMs };
    } catch {
      return DeterministicSimulator.execute({
        prompt: options.prompt,
        model: options.model,
      });
    }
  }
}
