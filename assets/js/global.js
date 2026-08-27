document.addEventListener("DOMContentLoaded", () => {
    // Auto-highlight active nav links based on URL
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("nav a").forEach(link => {
        const href = link.getAttribute("href").split("/").pop();
        if (href === currentPath) {
            link.classList.add("active");
        }
    });
});

// Reusable Toast Notification Component
function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `card fade-in`;
    toast.style.cssText = `padding: 12px 20px; min-width: 220px; border-left: 4px solid ${type === "success" ? "#00ffaa" : "#ff4d4d"}; background: rgba(15, 15, 25, 0.9);`;
    toast.innerHTML = `<p style="margin: 0; font-size: 0.9rem;">${message}</p>`;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
