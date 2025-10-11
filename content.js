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
      border: 1px solid var(--gray-300, #374151);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      margin: 1.5rem auto;
      background: var(--app-bg, #1f2937);
      color: var(--app-fg, #f9fafb);
      line-height: 1.6;
      max-width: 65ch;
      width: 100%;
      box-sizing: border-box;
      animation: fadeIn 0.35s ease-out forwards;
    }

    .ai-summary-box.fade-out {
      animation: fadeOut 0.3s ease-in forwards;
    }

    html.light .ai-summary-box {
      background: var(--app-bg, #f9fafb);
      color: var(--app-fg, #111827);
      border-color: var(--gray-200, #d1d5db);
    }

    html.dark .ai-summary-box {
      background: var(--app-bg, #1f2937);
      color: var(--app-fg, #f9fafb);
      border-color: var(--gray-700, #374151);
    }

    .ai-summary-box h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid var(--gray-600, #4b5563);
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
      width: 100%;
      max-width: 65ch;
      margin: 1.5rem auto 0.75rem; /* Increased top and bottom margins */
      padding-top: 0.5rem; /* Adds space between the line and the button */
    }

    #ai-summarize-btn {
      display: block;
      width: 100%;
      max-width: 65ch;
      text-align: center;
      font-size: 0.9rem;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--gray-500, #6b7280);
      background: var(--app-bg, #111827);
      color: var(--app-fg, #f9fafb);
      cursor: pointer;
      transition: background 0.25s, color 0.25s, transform 0.25s ease;
      box-sizing: border-box;
      margin-top: 1.5rem;
    }

    html.light #ai-summarize-btn {
      background: var(--gray-100, #f9fafb);
      color: var(--gray-800, #1f2937);
      border-color: var(--gray-300, #d1d5db);
    }

    html.dark #ai-summarize-btn {
      background: var(--gray-800, #1f2937);
      color: var(--gray-100, #f9fafb);
      border-color: var(--gray-600, #4b5563);
    }

    #ai-summarize-btn:hover {
      background: var(--gray-200, #e5e7eb);
      color: var(--gray-900, #111827);
      transform: translateY(-1px);
    }

    html.dark #ai-summarize-btn:hover {
      background: var(--gray-700, #374151);
      color: var(--gray-100, #f3f4f6);
      transform: translateY(-1px);
    }

    #ai-summarize-btn[disabled] {
      opacity: 0.6;
      cursor: wait;
      transform: none;
    }
  `;


  function addStyle() {
    if (document.getElementById("readeck-ai-style")) return;
    const el = document.createElement("style");
    el.id = "readeck-ai-style";
    el.textContent = styles;
    document.documentElement.appendChild(el);
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
    container.className = "ai-summary-container";

    const btn = document.createElement("button");
    btn.id = "ai-summarize-btn";
    btn.textContent = "AI Summary";
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
      btn.textContent = "AI Summary";
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
      btn.textContent = "Hide Summary";
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
      btn.textContent = "Summarizing…";
      const res = await chrome.runtime.sendMessage({
        type: "SUMMARIZE",
        payload: { title, text, style: "concise", bullets: false }
      });
      if (!res?.ok) throw new Error(res?.error || "Unknown error");
      sessionStorage.setItem(cacheKey, JSON.stringify(res));
      renderSummary(res, box);
      btn.textContent = "Hide Summary";
    } catch (err) {
      box.innerHTML = `<div class="ai-muted" style="color:#b91c1c;">Summary failed: ${String(err.message || err)}</div>`;
    } finally {
      btn.disabled = false;
    }
  }

  function renderSummary(data, box) {
    const summary = (data && data.summary) ? data.summary.trim() : "";
    const meta = [];
    if (data?.model) meta.push(data.model);
    if (data?.chunks) meta.push(`${data.chunks} chunk${data.chunks > 1 ? "s" : ""}`);
    if (data?.tokensIn || data?.tokensOut)
      meta.push(`${data.tokensIn || 0}/${data.tokensOut || 0} tok`);

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
