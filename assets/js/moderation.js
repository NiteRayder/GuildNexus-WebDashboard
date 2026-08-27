/* Custom Neon Toggle Switches */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: rgba(255, 255, 255, 0.15);
    transition: .3s;
    border-radius: 24px;
    border: 1px solid var(--border-color);
}

.slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .3s;
    border-radius: 50%;
}

input:checked + .slider {
    background-color: var(--accent);
}

input:checked + .slider:before {
    transform: translateX(20px);
}

/* Badge status overrides */
.status.paused {
    background: rgba(255, 77, 77, 0.15);
    color: #ff4d4d;
    border: 1px solid rgba(255, 77, 77, 0.3);
}
