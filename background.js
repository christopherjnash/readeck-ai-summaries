// background.js (MV3 service worker)
const DEFAULT_MODEL = "gpt-4o-mini";

// Simple char-based chunking to keep prompts manageable
function chunkText(s, max = 16000) {
  const parts = [];
  for (let i = 0; i < s.length; i += max) parts.push(s.slice(i, i + max));
  return parts;
}

async function loadConfig() {
  const { openai_api_key, openai_model } = await chrome.storage.local.get({
    openai_api_key: "",
    openai_model: DEFAULT_MODEL
  });
  return { apiKey: openai_api_key, model: openai_model || DEFAULT_MODEL };
}

async function summarizeBlock({ apiKey, model, title, text, style = "concise", bullets = false }) {
  const goal   = style === "detailed" ? "Detailed" : "Concise";
  const format = bullets ? "Bullet points" : "Short paragraphs";
  const system = `You are an expert summarizer. ${goal} summary. ${format}. Avoid fluff; keep key facts and context.`;
  const user   = `${title ? `Title: ${title}\n\n` : ""}Article:\n${text}`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user }
      ],
      temperature: 0.2,
      max_tokens: 600
    })
  });

  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${r.status} ${r.statusText} – ${body}`);
  }
  const data = await r.json();
  const content = data?.choices?.[0]?.message?.content?.trim() || "";
  const usage = data?.usage || {};
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
    tokensIn  += usage?.prompt_tokens      || 0;
    tokensOut += usage?.completion_tokens  || 0;
  }

  let final = partials.join("\n\n");
  if (partials.length > 1) {
    // Merge pass (summarize the summaries)
    const { content, usage } = await summarizeBlock({
      apiKey, model, title,
      text: final, style, bullets
    });
    final = content;
    tokensIn  += usage?.prompt_tokens     || 0;
    tokensOut += usage?.completion_tokens || 0;
  }

  return { summary: final, model, chunks: parts.length, tokensIn, tokensOut };
}

// Message bridge: content.js → background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "PING") {
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === "GET_CONFIG") {
        const { apiKey, model } = await loadConfig();
        sendResponse({ ok: true, hasKey: !!apiKey, model });
        return;
      }
      if (msg?.type === "SET_CONFIG") {
        await chrome.storage.local.set({
          openai_api_key: msg.apiKey || "",
          openai_model: msg.model || DEFAULT_MODEL
        });
        sendResponse({ ok: true });
        return;
      }
      if (msg?.type === "SUMMARIZE") {
        const { title, text, style, bullets } = msg.payload || {};
        const result = await summarizeFull({ title, text, style, bullets });
        sendResponse({ ok: true, ...result });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  })();

  // Keep the channel open for async response
  return true;
});

// Open Options on first install
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") chrome.runtime.openOptionsPage();
});
