document.addEventListener("DOMContentLoaded", () => {
    // Toggle Bot Server Status
    const serverCards = document.querySelectorAll(".card");
    
    serverCards.forEach(card => {
        const toggleBtn = card.querySelector(".btn-toggle-server");
        const statusBadge = card.querySelector(".status");

        if (toggleBtn && statusBadge) {
            toggleBtn.addEventListener("click", () => {
                const isActive = statusBadge.classList.contains("active");

                if (isActive) {
                    statusBadge.classList.remove("active");
                    statusBadge.classList.add("paused");
                    statusBadge.textContent = "Offline / Paused";
                    toggleBtn.textContent = "Enable Bot";
                    showToast("NyxEclipse paused for this server.", "error");
                } else {
                    statusBadge.classList.remove("paused");
                    statusBadge.classList.add("active");
                    statusBadge.textContent = "Online";
                    toggleBtn.textContent = "Disable Bot";
                    showToast("NyxEclipse activated successfully!", "success");
                }
            });
        }
    });
});
