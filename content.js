/*
  Readeck AI Summaries Extension
  © 2025 Christopher J. Nash — Licensed under CC BY-NC 4.0
  https://creativecommons.org/licenses/by-nc/4.0/
*/

// content.js — Readeck AI Summaries

(function() {
  const STATE = { injecting: false };

  const styles = `
    /* Readeck AI Summary Styling */

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-6px);
      }
    }

    /* Shared centered layout for button + summary */
    .ai-summary-container {
      display: flex;
      justify-content: center;
      width: 100%;
      max-width: 65ch;
      margin: 0 auto;
    }

    /* Summary box */
    .ai-summary-box {
      border: 1px solid rgb(var(--color-btn-default, 156, 163, 175));
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin: 1.5rem auto;
      background: transparent;
      color: inherit;
      line-height: 1.6;
      max-width: 65ch;
      width: 100%;
      box-sizing: border-box;
      animation: fadeIn 0.35s ease-out forwards;
    }

    .ai-summary-box.fade-out {
      animation: fadeOut 0.3s ease-in forwards;
    }

    .ai-summary-box h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid currentColor;
      padding-bottom: 0.25rem;
    }

    .ai-summary-box p {
      margin: 0.5rem 0;
    }

    .ai-summary-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 0.75rem;
      flex-wrap: wrap;
    }

    .ai-btn {
      padding: 4px 10px;
      border: 1px solid var(--gray-400, #9ca3af);
      border-radius: 9999px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      transition: background 0.25s, color 0.25s, transform 0.2s ease;
      font-size: 0.85rem;
    }

    .ai-btn:hover {
      background: var(--gray-200, #e5e7eb);
      color: var(--gray-900, #111827);
      transform: translateY(-1px);
    }

    html.dark .ai-btn:hover {
      background: var(--gray-700, #374151);
      color: var(--gray-100, #f3f4f6);
    }

    .ai-btn[disabled] {
      opacity: 0.6;
      cursor: wait;
      transform: none;
    }

    .ai-muted {
      color: var(--gray-500, #6b7280);
      font-size: 0.75rem;
    }

    /* Centered button styling */
    .ai-summary-button-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      width: 100%;
      max-width: 65ch;
      margin: 1.5rem auto 0.75rem;
      padding-top: 0.5rem;
    }

    .ai-summary-button-container #ai-summarize-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      font-size: 0.95rem;
      font-weight: 500;
      padding: 0.55rem 1.5rem;
    }

    .ai-summary-button-container #ai-summarize-btn[disabled] {
      opacity: 0.65;
      cursor: wait;
    }

    .ai-summary-icon svg {
      width: 1rem;
      height: 1rem;
    }

    .ai-summary-label {
      display: inline-flex;
      align-items: center;
    }
  `;


  function addStyle() {
    if (document.getElementById("readeck-ai-style")) return;
    const el = document.createElement("style");
    el.id = "readeck-ai-style";
    el.textContent = styles;
    document.documentElement.appendChild(el);
  }

  function createAiIcon() {
    const span = document.createElement("span");
    span.className = "svgicon ai-summary-icon";
    span.setAttribute("aria-hidden", "true");
    span.innerHTML = `
      <svg viewBox="0 0 24 24" role="presentation" class="inline-block w-4 h-4">
        <path fill="currentColor" d="M19.864 8.465a3.505 3.505 0 0 0-3.03-4.449A3.005 3.005 0 0 0 14 2a2.98 2.98 0 0 0-2 .78A2.98 2.98 0 0 0 10 2c-1.301 0-2.41.831-2.825 2.015a3.505 3.505 0 0 0-3.039 4.45A4.028 4.028 0 0 0 2 12c0 1.075.428 2.086 1.172 2.832A4.067 4.067 0 0 0 3 16c0 1.957 1.412 3.59 3.306 3.934A3.515 3.515 0 0 0 9.5 22c.979 0 1.864-.407 2.5-1.059A3.484 3.484 0 0 0 14.5 22a3.51 3.51 0 0 0 3.19-2.06 4.006 4.006 0 0 0 3.138-5.108A4.003 4.003 0 0 0 22 12a4.028 4.028 0 0 0-2.136-3.535zM9.5 20c-.711 0-1.33-.504-1.47-1.198L7.818 18H7c-1.103 0-2-.897-2-2 0-.352.085-.682.253-.981l.456-.816-.784-.51A2.019 2.019 0 0 1 4 12c0-.977.723-1.824 1.682-1.972l1.693-.26-1.059-1.346a1.502 1.502 0 0 1 1.498-2.39L9 6.207V5a1 1 0 0 1 2 0v13.5c0 .827-.673 1.5-1.5 1.5zm9.575-6.308-.784.51.456.816c.168.3.253.63.253.982 0 1.103-.897 2-2.05 2h-.818l-.162.802A1.502 1.502 0 0 1 14.5 20c-.827 0-1.5-.673-1.5-1.5V5c0-.552.448-1 1-1s1 .448 1 1.05v1.207l1.186-.225a1.502 1.502 0 0 1 1.498 2.39l-1.059 1.347 1.693.26A2.002 2.002 0 0 1 20 12c0 .683-.346 1.315-.925 1.692z" />
      </svg>
    `;
    return span;
  }

  function setButtonLabel(text, btn = document.querySelector("#ai-summarize-btn")) {
    const label = btn?.querySelector(".ai-summary-label");
    if (label) label.textContent = text;
  }

  function onBookmarkPage() {
    return /^\/[^?#]*bookmarks\/[A-Za-z0-9_-]+/.test(location.pathname);
  }

  function getBookmarkId() {
    const m = location.pathname.match(/bookmarks\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  }

  function selectTopbar() {
    return document.querySelector(".bookmark-content .bookmark-topbar");
  }

  function selectArticleNode() {
    // works with latest Readeck layout
    return (
      document.querySelector(".bookmark-article .prose") ||
      document.querySelector(".bookmark-content .prose")
    );
  }

  function ensureSummaryBox() {
    const root = document.querySelector(".bookmark-content");
    if (!root) return null;
    let box = root.querySelector("#ai-summary-box");
    if (!box) {
      box = document.createElement("section");
      box.id = "ai-summary-box";
      box.className = "ai-summary-box";
      const topbar = selectTopbar();
      if (topbar && topbar.parentElement) {
        topbar.parentElement.insertBefore(box, topbar.nextSibling);
      } else {
        root.prepend(box);
      }
    }
    return box;
  }

  function injectButton() {
    if (!onBookmarkPage()) return;

    // Avoid reinjecting
    if (document.querySelector("#ai-summarize-btn")) return;

    const topbar = selectTopbar();
    if (!topbar) return;

    // Reuse the same centered container as the summary
    const container = document.createElement("div");
    container.className = "ai-summary-container ai-summary-button-container";

    const btn = document.createElement("button");
    btn.id = "ai-summarize-btn";
    btn.type = "button";
    btn.classList.add(
      "btn-outlined",
      "btn-primary",
      "rounded-full",
      "whitespace-nowrap"
    );
    const label = document.createElement("span");
    label.className = "ai-summary-label";
    label.textContent = "AI Summary";

    btn.append(createAiIcon(), label);
    btn.addEventListener("click", toggleSummary);

    container.appendChild(btn);
    topbar.parentElement.insertBefore(container, topbar.nextSibling);
  }

  async function toggleSummary() {
    const box = document.querySelector("#ai-summary-box");
    const btn = document.querySelector("#ai-summarize-btn");

    // If summary box already visible, remove it
    if (box) {
      box.remove();
      if (btn) setButtonLabel("AI Summary", btn);
      return;
    }

    // Otherwise, generate the summary
    await summarizeNow();
  }

  async function summarizeNow() {
    const btn = document.querySelector("#ai-summarize-btn");
    const article = selectArticleNode();
    if (!article) return;

    let box = document.createElement("section");
    box.id = "ai-summary-box";
    box.className = "ai-summary-box";
    box.innerHTML = `<div class="ai-muted">Summarizing…</div>`;

    // Insert the summary box just below the button
    const buttonContainer = btn.closest(".ai-summary-container");
    buttonContainer.parentElement.insertBefore(box, buttonContainer.nextSibling);

    let text = article.innerText?.trim() || "";
    if (!text) {
      box.innerHTML = `<div class="ai-muted">No article text found.</div>`;
      return;
    }

    const MAX_CHARS = 120000;
    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);

    const id = getBookmarkId();
    const cacheKey = `readeck:summary:${id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      renderSummary(JSON.parse(cached), box);
      if (btn) setButtonLabel("Hide Summary", btn);
      return;
    }

    const title = document.title.replace(/ - Bookmarks.*/,'').trim();

    const cfg = await chrome.runtime.sendMessage({ type: "GET_CONFIG" });
    if (!cfg?.ok || !cfg?.hasKey) {
      box.innerHTML = `<div class="ai-muted">OpenAI key not set. Click the extension → Options to add your key.</div>`;
      return;
    }

    try {
      btn.disabled = true;
      setButtonLabel("Request in progress...", btn);
      const res = await chrome.runtime.sendMessage({
        type: "SUMMARIZE",
        payload: { title, text, style: "concise", bullets: false }
      });
      if (!res?.ok) throw new Error(res?.error || "Unknown error");
      sessionStorage.setItem(cacheKey, JSON.stringify(res));
      renderSummary(res, box);
      setButtonLabel("Hide Summary", btn);
    } catch (err) {
      box.innerHTML = `<div class="ai-muted" style="color:#b91c1c;">Summary failed: ${String(err.message || err)}</div>`;
      setButtonLabel("AI Summary", btn);
    } finally {
      btn.disabled = false;
    }
  }

  function renderSummary(data, box) {
    const summary = (data && data.summary) ? data.summary.trim() : "";
    const meta = [];
    if (data?.model) meta.push(`Model: ${data.model}`);
if (data?.tokensIn || data?.tokensOut) {
  const sent = data.tokensIn || 0;
  const received = data.tokensOut || 0;
  meta.push(`Tokens Sent: ${sent} • Tokens Received: ${received}`);
}

    box.innerHTML = `
      <div class="prose">
        <h3>AI Summary</h3>
        ${summary ? summary.replace(/\n/g, "<br>") : "<em>No summary returned.</em>"}
      </div>
      <div class="ai-summary-actions">
        <button class="ai-btn" id="ai-copy">Copy</button>
        <button class="ai-btn" id="ai-regenerate">Regenerate</button>
        <span class="ai-muted">${meta.join(" • ")}</span>
      </div>
    `;
    box.querySelector("#ai-copy")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(summary);
        const c = box.querySelector("#ai-copy");
        c.textContent = "Copied!";
        setTimeout(() => (c.textContent = "Copy"), 1200);
      } catch {}
    });
    box.querySelector("#ai-regenerate")?.addEventListener("click", () => {
      const id = getBookmarkId();
      sessionStorage.removeItem(`readeck:summary:${id}`);
      summarizeNow();
    });
  }

  // Wait until the article frame has loaded before injecting
  async function waitForArticle(timeout = 7000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const node = selectArticleNode();
      if (node) return node;
      await new Promise(r => setTimeout(r, 200));
    }
    return null;
  }

  async function tryInject() {
    if (!onBookmarkPage()) return;
    if (STATE.injecting) return;
    STATE.injecting = true;

    addStyle();
    const node = await waitForArticle();
    if (!node) {
      console.warn("Readeck AI: could not find article node after wait");
      STATE.injecting = false;
      return;
    }

    injectButton();
    STATE.injecting = false;
  }

  // Handle Turbo / Mutation-driven reloads
  window.addEventListener("load", tryInject);
  document.addEventListener("turbo:load", tryInject);
  document.addEventListener("turbo:frame-load", tryInject);
  const mo = new MutationObserver(() => tryInject());
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
