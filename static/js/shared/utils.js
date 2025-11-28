// ============================================
// Shared Utilities
// ============================================

/**
 * Get color for a specific attack type
 * @param {string} attackType - The type of attack
 * @returns {string} Hex color code
 */
export function getAttackColor(attackType) {
  const colorMap = {
    crime: "#ef4444", // red
    violence: "#dc2626", // dark red
    weapons: "#f97316", // orange
    hate: "#fb923c", // light orange
    profanity: "#fbbf24", // amber
    sexual: "#facc15", // yellow
    prompt_attack: "#a855f7", // purple
    jailbreak: "#8b5cf6", // violet
    pii: "#06b6d4", // cyan
    address: "#0891b2", // dark cyan
    email: "#22d3ee", // light cyan
    phone_number: "#0ea5e9", // sky blue
    credit_card: "#3b82f6", // blue
    us_social_security_number: "#2563eb", // dark blue
    name: "#14b8a6", // teal
    ip_address: "#10b981", // green
    iban_code: "#059669", // emerald
    unknown_links: "#eab308", // gold
    default: "#64748b", // slate gray
  };
  return colorMap[attackType] || colorMap["default"];
}

/**
 * Set loading state on a button
 * @param {boolean} isLoading - Whether to show loading state
 * @param {HTMLElement} btn - The button element
 */
export function setLoading(isLoading, btn) {
  if (!btn) return;
  
  const btnText = btn.querySelector(".btn-text");
  const loader = btn.querySelector(".loader");
  
  if (isLoading) {
    btn.disabled = true;
    if (btnText) btnText.style.opacity = "0";
    if (loader) loader.classList.remove("hidden");
  } else {
    btn.disabled = false;
    if (btnText) btnText.style.opacity = "1";
    if (loader) loader.classList.add("hidden");
  }
}

/**
 * Show a notification toast
 * @param {string} message - The message to display
 * @param {string} type - 'error', 'success', or 'warning'
 */
export function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getIconForType(type)}</span>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Auto remove
    const timeout = setTimeout(() => {
        removeNotification(notification);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        clearTimeout(timeout);
        removeNotification(notification);
    });
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
    return container;
}

function removeNotification(notification) {
    notification.classList.remove('show');
    notification.addEventListener('transitionend', () => {
        notification.remove();
    });
}

function getIconForType(type) {
    switch(type) {
        case 'error': return '❌';
        case 'success': return '✅';
        case 'warning': return '⚠️';
        default: return 'ℹ️';
    }
}
