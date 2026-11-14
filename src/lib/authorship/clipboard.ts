import { isLlmEscaped } from "../utils/llm";
import type { AuthorType, PasteDetectionResult } from "./types";

/**
 * Checks clipboard event data (HTML, text, origin) to detect if pasted text originated from an AI source.
 */
export function detectClipboardAuthor(
  event: { clipboardData: DataTransfer | null } | ClipboardEvent,
  defaultAuthor: AuthorType = "ai"
): PasteDetectionResult {
  const clipboardData = "clipboardData" in event ? event.clipboardData : null;
  if (!clipboardData) {
    return { author: defaultAuthor, source: "default", isAi: defaultAuthor === "ai", confidence: "default" };
  }

  const html = clipboardData.getData("text/html") || "";
  const text = clipboardData.getData("text/plain") || "";

  // 1. Check HTML markers from well-known AI web apps
  if (html) {
    const lowerHtml = html.toLowerCase();

    // ChatGPT web
    if (
      lowerHtml.includes("chatgpt.com") ||
      lowerHtml.includes('data-message-author-role="assistant"') ||
      lowerHtml.includes('class="markdown prose') ||
      lowerHtml.includes("agent-turn")
    ) {
      return { author: "ai", source: "ChatGPT", isAi: true, confidence: "high" };
    }

    // Claude web
    if (
      lowerHtml.includes("claude.ai") ||
      lowerHtml.includes("font-claude-message") ||
      lowerHtml.includes("data-is-streaming")
    ) {
      return { author: "ai", source: "Claude", isAi: true, confidence: "high" };
    }

    // Google Gemini / Bard
    if (
      lowerHtml.includes("gemini.google.com") ||
      lowerHtml.includes("bard.google.com") ||
      lowerHtml.includes("model-response") ||
      lowerHtml.includes("response-container")
    ) {
      return { author: "ai", source: "Google Gemini", isAi: true, confidence: "high" };
    }

    // Microsoft Copilot / Bing Chat
    if (
      lowerHtml.includes("copilot.microsoft.com") ||
      lowerHtml.includes("bing.com/chat") ||
      lowerHtml.includes("cib-message")
    ) {
      return { author: "ai", source: "Microsoft Copilot", isAi: true, confidence: "high" };
    }

    // Perplexity AI
    if (lowerHtml.includes("perplexity.ai") || lowerHtml.includes("pplx")) {
      return { author: "ai", source: "Perplexity", isAi: true, confidence: "high" };
    }

    // DeepSeek web
    if (lowerHtml.includes("chat.deepseek.com") || lowerHtml.includes("deepseek")) {
      return { author: "ai", source: "DeepSeek", isAi: true, confidence: "high" };
    }

    // Mistral Le Chat
    if (lowerHtml.includes("chat.mistral.ai")) {
      return { author: "ai", source: "Mistral", isAi: true, confidence: "high" };
    }

    // macOS Writing Tools & Windows Copilot clipboard metadata
    if (
      lowerHtml.includes("apple-writing-tools") ||
      lowerHtml.includes("com.apple.writingtools") ||
      lowerHtml.includes("powertoys.advancedpaste") ||
      lowerHtml.includes("windows-ai-paste")
    ) {
      return { author: "ai", source: "OS Writing Tools", isAi: true, confidence: "high" };
    }
  }

  // 2. Check plain text heuristics
  if (text) {
    // Check if text has escaped LLM sequences
    if (isLlmEscaped(text)) {
      return { author: "ai", source: "LLM Output", isAi: true, confidence: "heuristic" };
    }

    // Heuristics for typical AI markers in text
    if (
      text.startsWith("Here is the ") ||
      text.startsWith("Certainly! Here is ") ||
      text.startsWith("As an AI language model") ||
      /\b(Here is a breakdown|Hope this helps!|Let me know if you need)\b/i.test(text)
    ) {
      return { author: "ai", source: "AI Assistant", isAi: true, confidence: "heuristic" };
    }
  }

  // 3. Fallback to user's configured default (which defaults to "ai" as requested)
  return {
    author: defaultAuthor,
    source: defaultAuthor === "ai" ? "Default (AI)" : defaultAuthor,
    isAi: defaultAuthor === "ai",
    confidence: "default",
  };
}
