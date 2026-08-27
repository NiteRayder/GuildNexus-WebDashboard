document.addEventListener("DOMContentLoaded", () => {
    const sensitivitySlider = document.getElementById("ai-sensitivity");
    const sensitivityDisplay = document.getElementById("sensitivity-val");
    const saveAiBtn = document.getElementById("save-ai-settings");

    if (sensitivitySlider && sensitivityDisplay) {
        sensitivitySlider.addEventListener("input", (e) => {
            sensitivityDisplay.textContent = `${e.target.value}%`;
        });
    }

    if (saveAiBtn) {
        saveAiBtn.addEventListener("click", () => {
            showToast("AI Assistant filter thresholds updated!");
        });
    }
});
