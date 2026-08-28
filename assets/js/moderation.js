document.addEventListener("DOMContentLoaded", () => {
  const spamToggle = document.getElementById("spam-toggle");
  const spamBadge = document.getElementById("spam-status-badge");
  const spamDesc = document.getElementById("spam-desc");
  const linkToggle = document.getElementById("link-toggle");
  const linkBadge = document.getElementById("link-status-badge");
  const linkDesc = document.getElementById("link-desc");

  function updateToggle(toggle, badge, desc, activeText, inactiveText) {
    if (!toggle || !badge || !desc) return;
    const active = toggle.checked;
    badge.classList.toggle("active", active);
    badge.classList.toggle("paused", !active);
    badge.textContent = active ? "Active" : "Disabled";
    desc.textContent = active ? activeText : inactiveText;
  }

  spamToggle?.addEventListener("change", () =>
    updateToggle(spamToggle, spamBadge, spamDesc, "Active — Rate limiting 5 messages per 3 sec.", "Disabled — Anti-spam is currently off.")
  );

  linkToggle?.addEventListener("change", () =>
    updateToggle(linkToggle, linkBadge, linkDesc, "Active — Restricts unauthorized invite links.", "Disabled — Link validation is currently off.")
  );

  document.getElementById("configure-spam-btn")?.addEventListener("click", () =>
    showToast("Anti-spam configuration will be connected to NyxEclipse.", "success")
  );

  document.getElementById("configure-link-btn")?.addEventListener("click", () =>
    showToast("Link validation configuration will be connected to NyxEclipse.", "success")
  );

  document.getElementById("view-logs-btn")?.addEventListener("click", () => {
    const section = document.getElementById("audit-log-section");
    const body = document.getElementById("log-table-body");
    if (!section || !body) return;
    section.style.display = section.style.display === "none" ? "block" : "none";
    if (body.children.length === 0) {
      body.innerHTML = "<tr><td colspan='4' style='padding:10px;'>No audit events loaded yet.</td></tr>";
    }
  });
});
