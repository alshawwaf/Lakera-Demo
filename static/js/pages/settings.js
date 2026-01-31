export function initSettings() {
    console.log("Initializing Settings Page logic...");

    // Global toggle function for cards
    window.toggleCard = (cardId) => {
        const card = document.getElementById(cardId);
        if (!card) return;

        const isCollapsed = card.classList.contains('collapsed');

        // Optionally: close other cards if you want accordion style
        /*
        document.querySelectorAll('.widget-card').forEach(c => {
            if (c.id !== cardId) {
                c.classList.add('collapsed');
                c.classList.remove('expanded');
            }
        });
        */

        if (isCollapsed) {
            card.classList.remove('collapsed');
            card.classList.add('expanded');
        } else {
            card.classList.add('collapsed');
            card.classList.remove('expanded');
        }
    };
}
