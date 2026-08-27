document.addEventListener("DOMContentLoaded", () => {
    const modForm = document.getElementById("moderation-settings-form");

    if (modForm) {
        modForm.addEventListener("submit", (e) => {
            e.preventDefault();
            
            const warnLimit = document.getElementById("warn-limit")?.value || 3;
            const autoMute = document.getElementById("auto-mute-toggle")?.checked;

            // Save local simulation settings
            localStorage.setItem("nyx_mod_config", JSON.stringify({ warnLimit, autoMute }));
            showToast("Moderation rules saved successfully!");
        });
    }
});
