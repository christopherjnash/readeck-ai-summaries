/*
  Readeck AI Summaries Extension
  © 2025 Christopher J. Nash — Licensed under CC BY-NC 4.0
  https://creativecommons.org/licenses/by-nc/4.0/
*/

(async function() {
  const els = {
    key: document.getElementById("key"),
    model: document.getElementById("model"),
    save: document.getElementById("save"),
    clear: document.getElementById("clear")
  };

  // Load saved values
  chrome.storage.local.get(
    { openai_api_key: "", openai_model: "gpt-4o-mini" },
    cfg => {
      els.key.value = cfg.openai_api_key || "";
      els.model.value = cfg.openai_model || "gpt-4o-mini";
    }
  );

  // Save handler
  els.save.addEventListener("click", async () => {
    const key = els.key.value.trim();
    const model = els.model.value;
    await chrome.storage.local.set({ openai_api_key: key, openai_model: model });
    toast("✅ Saved successfully!");
  });

  // Clear key
  els.clear.addEventListener("click", async () => {
    await chrome.storage.local.set({ openai_api_key: "" });
    els.key.value = "";
    toast("🔒 Key cleared.");
  });

  // Simple toast feedback
  function toast(msg) {
    const el = document.createElement("div");
    el.textContent = msg;
    Object.assign(el.style, {
      position: "fixed",
      bottom: "1.5rem",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#0093A4",
      color: "white",
      padding: "0.6rem 1rem",
      borderRadius: "8px",
      boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
      fontSize: "0.9rem",
      zIndex: "9999",
      opacity: "0",
      transition: "opacity 0.3s"
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => (el.style.opacity = "1"));
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, 1800);
  }
})();
