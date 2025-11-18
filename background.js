// background.js
const DEFAULT_MODEL = "gpt-5-nano";

// Simple char-based chunking to keep prompts manageable
function chunkText(s, max = 16000) {
  const parts = [];
  for (let i = 0; i < s.length; i += max) parts.push(s.slice(i, i + max));
  return parts;
}

async function loadConfig() {
  const { openai_api_key, openai_model, max_summary_length } = await chrome.storage.local.get({
    openai_api_key: "",
    openai_model: DEFAULT_MODEL,
    max_summary_length: "medium"
  });
  return {
    apiKey: openai_api_key,
    model: openai_model || DEFAULT_MODEL,
    length: max_summary_length || "medium"
  };
}

// Remove Markdown formatting
function stripMarkdown(text) {
  if (!text) return "";
  return text
    // Bold and italics
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    // Inline code
    .replace(/`([^`]+)`/g, "$1")
    // Headings
    .replace(/^#+\s*/gm, "")
    // Links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Blockquotes
    .replace(/^>\s*/gm, "")
    // Horizontal rules or stray underscores
    .replace(/_{3,}|-{3,}/g, "")
    // Trim whitespace
    .trim();
}

async function summarizeBlock({
  apiKey,
  model,
  title,
  text,
  style = "concise",
  bullets = false,
  length = "medium"
}) {
  const goal   = style === "detailed" ? "Detailed" : "Concise";
  const format = bullets ? "Bullet points" : "Short paragraphs";
  const system = `You are an expert summarizer. ${goal} summary. ${format}. Avoid fluff; keep key facts and context.`;
  const user   = `${title ? `Title: ${title}\n\n` : ""}Article:\n${text}`;

  const isFive = model.includes("gpt-5");

  // --- Dynamic token scaling ---
  const lengthScale = { short: 500, medium: 1200, long: 2500 };
  const tokenLimit = lengthScale[length] || 1200;

  // --- Build API request body ---
  const body = isFive
    ? {
        model,
        input: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        max_output_tokens: tokenLimit,
        reasoning: { effort: "low" }
      }
    : {
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.2,
        max_tokens: tokenLimit
      };

  const endpoint = isFive
    ? "https://api.openai.com/v1/responses"
    : "https://api.openai.com/v1/chat/completions";

  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${r.status} ${r.statusText} – ${errText}`);
  }

  const data = await r.json();

  // --- Universal extraction logic ---
  let content = "";
  if (isFive) {
    const allText = [];

    // 1️⃣ Collect from any nested output content
    if (Array.isArray(data.output)) {
      for (const o of data.output) {
        if (Array.isArray(o.content)) {
          for (const c of o.content) {
            if (c.type?.includes("text") && c.text) {
              allText.push(c.text.trim());
            }
          }
        }
      }
    }

    // 2️⃣ Use output_text if provided (often appears for incomplete responses)
    if (data.output_text && typeof data.output_text === "string") {
      allText.push(data.output_text.trim());
    }

    // 3️⃣ Merge and trim
    content = allText.join("\n\n").trim();
  } else {
    content = data?.choices?.[0]?.message?.content?.trim?.() || "";
  }

  const usage = data?.usage || {};

  // --- Debug logging ---
  console.group("🧠 OpenAI Debug");
  console.log("Model:", model);
  console.log("Status:", data.status);
  console.log("Raw data:", data);
  console.log("Extracted content:", content);
  console.log("Usage:", usage);
  console.groupEnd();

  // --- Handle incomplete or empty content ---
  if (!content) {
    if (data.status === "incomplete") {
      content = "[Warning: response incomplete – partial data returned. Try longer token limit.]";
    } else {
      content = "[Warning: no summary text returned – check console for raw data.]";
    }
  }

  // --- Markdown cleanup ---
  content = stripMarkdown(content);

  return { content, usage };
}

async function summarizeFull({ title, text, style, bullets }) {
  const { apiKey, model } = await loadConfig();
  if (!apiKey) throw new Error("Missing OpenAI API key. Open the extension’s Options and paste your key.");

  const parts = chunkText(text, 16000);
  let partials = [];
  let tokensIn = 0, tokensOut = 0;

  for (const p of parts) {
    const { content, usage } = await summarizeBlock({ apiKey, model, title, text: p, style, bullets });
    partials.push(content);
    tokensIn  += usage?.prompt_tokens || usage?.input_tokens || 0;
    tokensOut += usage?.completion_tokens || usage?.output_tokens || 0;
  }

  let final = partials.join("\n\n");
  if (partials.length > 1) {
    const { content, usage } = await summarizeBlock({
      apiKey, model, title,
      text: final, style, bullets
    });
    final = content;
    tokensIn  += usage?.prompt_tokens || usage?.input_tokens || 0;
    tokensOut += usage?.completion_tokens || usage?.output_tokens || 0;
  }

  return { summary: final, model, chunks: parts.length, tokensIn, tokensOut };
}

// Message bridge
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "PING") return sendResponse({ ok: true });
      if (msg?.type === "GET_CONFIG") {
        const { apiKey, model } = await loadConfig();
        return sendResponse({ ok: true, hasKey: !!apiKey, model });
      }
      if (msg?.type === "SET_CONFIG") {
        await chrome.storage.local.set({
          openai_api_key: msg.apiKey || "",
          openai_model: msg.model || DEFAULT_MODEL
        });
        return sendResponse({ ok: true });
      }
      if (msg?.type === "SUMMARIZE") {
        const { title, text, style, bullets } = msg.payload || {};
        const result = await summarizeFull({ title, text, style, bullets });
        return sendResponse({ ok: true, ...result });
      }
      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (err) {
      console.error("❌ summarize error:", err);
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  })();
  return true;
});

// Open Options on first install
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") chrome.runtime.openOptionsPage();
});
