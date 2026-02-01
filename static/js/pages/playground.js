// ============================================
// Playground Page Module
// ============================================

import { setLoading, showNotification } from '../shared/utils.js';
import { displayResults } from '../shared/traffic-flow.js';

/**
 * Initialize playground page
 */
export function initPlayground() {
    const promptInput = document.getElementById("prompt");
    const analyzeBtn = document.getElementById("analyze-btn");
    const resultsSection = document.getElementById("results-section");
    const charCount = document.querySelector(".char-count");
    const examplesContainer = document.getElementById("examples-container");
    const providerSelect = document.getElementById("provider-select");
    const modelSelect = document.getElementById("model-select");
    const setDefaultBtn = document.getElementById("set-default-btn");

    // Helper to populate models
    function populateModels() {
        if (!providerSelect || !modelSelect || !window.llmData) return;

        const provider = providerSelect.value;
        const data = window.llmData[provider];
        const modelList = document.getElementById("model-datalist");
        
        if (modelList) modelList.innerHTML = "";
        modelSelect.value = "";

        if (provider === 'azure') {
            // Azure has fixed deployment
            modelSelect.value = data.deployment;
            modelSelect.disabled = true;
        } else {
            modelSelect.disabled = false;

            if (Array.isArray(data) && data.length > 0) {
                data.forEach(model => {
                    const option = document.createElement("option");
                    option.value = model;
                    if (modelList) modelList.appendChild(option);
                });

                // Select logic: 
                // 1. Force OpenAI to gpt-3.5-turbo
                // 2. Force Gemini to gemini-flash-lite-latest
                // 3. Fallback to saved model if it exists
                // 4. Default to first item
                const savedModel = localStorage.getItem("default_model");

                if (provider === 'openai' && data.includes('gpt-3.5-turbo')) {
                    modelSelect.value = 'gpt-3.5-turbo';
                } else if (provider === 'gemini' && data.includes('gemini-flash-lite-latest')) {
                    modelSelect.value = 'gemini-flash-lite-latest';
                } else if (savedModel && data.includes(savedModel)) {
                    modelSelect.value = savedModel;
                } else {
                    modelSelect.value = data[0];
                }
            } else {
                modelSelect.placeholder = provider === 'ollama' ? "No connection to server" : "No models available";
                modelSelect.disabled = true;
            }
        }
    }

    // Initial Load & Event Listeners
    if (providerSelect) {
        providerSelect.addEventListener("change", populateModels);
        populateModels(); // Initial population

        // Load defaults
        const savedProvider = localStorage.getItem("default_provider");
        const savedModel = localStorage.getItem("default_model");

        if (savedProvider) {
            providerSelect.value = savedProvider;
            populateModels(); // This now handles the specific defaults for OpenAI/Gemini

            // Only override if the provider isn't one of the 'forced default' ones
            const isForcedDefault = savedProvider === 'openai' || savedProvider === 'gemini';
            if (savedModel && providerSelect.value !== 'azure' && !isForcedDefault && modelSelect.querySelector(`option[value="${savedModel}"]`)) {
                modelSelect.value = savedModel;
            }
        } else {
            providerSelect.value = "azure";
            populateModels();
        }
    }

    // Set Default Button Handler
    if (setDefaultBtn && providerSelect && modelSelect) {
        setDefaultBtn.addEventListener("click", () => {
            localStorage.setItem("default_provider", providerSelect.value);
            if (providerSelect.value !== 'azure') {
                localStorage.setItem("default_model", modelSelect.value);
            }

            const originalText = setDefaultBtn.textContent;
            setDefaultBtn.textContent = "Saved!";
            setTimeout(() => {
                setDefaultBtn.textContent = originalText;
            }, 2000);
        });
    }

    // Character count
    if (promptInput && charCount) {
        promptInput.addEventListener("input", () => {
            charCount.textContent = `${promptInput.value.length} characters`;
        });
    }

    // Enter key to submit (Ctrl+Enter for new line)
    if (promptInput) {
        promptInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                analyzeBtn.click();
            }
        });
    }

    if (analyzeBtn) {
        analyzeBtn.addEventListener("click", async () => {
            const prompt = promptInput.value.trim();
            const useLakera = document.getElementById("lakera-scan-checkbox").checked;
            const useLakeraOutbound = document.getElementById("lakera-outbound-checkbox").checked;

            if (!prompt) return;

            setLoading(true, analyzeBtn);

            try {
                // Standard scan logic
                const modelProvider = providerSelect ? providerSelect.value : 'openai';
                const modelName = modelSelect ? modelSelect.value : '';

                const response = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt,
                        use_lakera: useLakera,
                        use_lakera_outbound: useLakeraOutbound,
                        model_provider: modelProvider,
                        model_name: modelName
                    }),
                });
                const data = await response.json();

                if (!response.ok) throw new Error(data.error || "Analysis failed");

                data.model_provider = modelProvider;
                data.model_name = modelName;
                displayResults(data);

                if (data.openai_response && (
                    data.openai_response.includes("not configured") ||
                    data.openai_response.includes("API Key not configured")
                )) {
                    showNotification(data.openai_response, 'warning');
                }
            } catch (error) {
                showNotification(error.message, 'error');
            } finally {
                setLoading(false, analyzeBtn);
            }
        });
    }

    // Modal close handlers
    const resultModal = document.getElementById("result-modal");
    const closeModalBtn = document.getElementById("close-result-modal");

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            resultModal.classList.add("hidden");
        });
    }

    // Close on outside click
    window.addEventListener("click", (e) => {
        if (e.target === resultModal) {
            resultModal.classList.add("hidden");
        }
    });

    // --- New Logic for Triggers and Batch Running ---
    const triggersList = document.getElementById("examples-list");
    const searchInput = document.getElementById("example-search");
    const runAllBtn = document.getElementById("run-all-btn");
    let allTriggers = [];

    // Load triggers on init
    loadTriggers();

    async function loadTriggers() {
        try {
            const response = await fetch("/api/triggers");
            allTriggers = await response.json();
            renderTriggers(allTriggers);
        } catch (error) {
            console.error("Failed to load triggers:", error);
            if (triggersList) {
                triggersList.innerHTML = '<div class="error-message">Failed to load triggers</div>';
            }
        }
    }

    function renderTriggers(triggers) {
        if (!triggersList) return;
        triggersList.innerHTML = "";

        if (triggers.length === 0) {
            triggersList.innerHTML = '<div class="no-results">No triggers found</div>';
            return;
        }

        // Group by category
        const categorized = {};
        triggers.forEach(trigger => {
            if (!categorized[trigger.category]) categorized[trigger.category] = [];
            categorized[trigger.category].push(trigger);
        });

        // Render categories
        Object.keys(categorized).sort().forEach(category => {
            const section = document.createElement("div");
            section.className = "example-category";
            section.innerHTML = `<h4>${category}</h4>`;

            const grid = document.createElement("div");
            grid.className = "example-grid-small";

            categorized[category].forEach(trigger => {
                const card = document.createElement("div");
                card.className = "mini-card";
                card.innerHTML = `
                    <div class="card-content">
                        <span class="card-icon">←</span>
                        ${trigger.prompt}
                    </div>
                `;
                card.title = "Click to use this trigger in the playground";

                card.addEventListener("click", () => {
                    if (promptInput) {
                        promptInput.value = trigger.prompt;
                        promptInput.dispatchEvent(new Event('input'));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                });

                grid.appendChild(card);
            });

            section.appendChild(grid);
            triggersList.appendChild(section);
        });
    }

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allTriggers.filter(ex =>
                ex.prompt.toLowerCase().includes(term) ||
                ex.category.toLowerCase().includes(term)
            );
            renderTriggers(filtered);
        });
    }

    // Batch Runner Logic
    if (runAllBtn) {
        runAllBtn.addEventListener("click", () => {
            const batchModal = document.getElementById("batch-modal");
            if (batchModal) {
                batchModal.classList.remove("hidden");
                runBatchScan(allTriggers);
            }
        });
    }

    // Batch Modal Controls
    const batchModal = document.getElementById("batch-modal");
    const closeBatchBtn = document.getElementById("close-batch-modal");
    const cancelBatchBtn = document.getElementById("batch-cancel-btn");
    const pauseBatchBtn = document.getElementById("batch-pause-btn");

    let isBatchRunning = false;
    let isBatchPaused = false;
    let batchController = null;

    if (closeBatchBtn) {
        closeBatchBtn.addEventListener("click", () => stopBatchScan());
    }

    if (cancelBatchBtn) {
        cancelBatchBtn.addEventListener("click", () => stopBatchScan());
    }

    if (pauseBatchBtn) {
        pauseBatchBtn.addEventListener("click", () => {
            isBatchPaused = !isBatchPaused;
            pauseBatchBtn.innerHTML = isBatchPaused
                ? '<span class="icon">▶️</span> Resume'
                : '<span class="icon">⏸️</span> Pause';
        });
    }

    async function runBatchScan(examples) {
        if (isBatchRunning) return;
        isBatchRunning = true;
        isBatchPaused = false;
        batchController = new AbortController();

        const progressBar = document.getElementById("batch-progress-bar");
        const counter = document.getElementById("batch-counter");
        const statusText = document.getElementById("batch-status-text");
        const currentPrompt = document.getElementById("batch-current-prompt");
        const logList = document.getElementById("batch-log-list");

        // Reset UI
        if (logList) logList.innerHTML = "";
        if (progressBar) progressBar.style.width = "0%";
        if (counter) counter.textContent = `0/${examples.length}`;
        if (statusText) statusText.textContent = "Scanning...";
        if (pauseBatchBtn) {
            pauseBatchBtn.innerHTML = '<span class="icon">⏸️</span> Pause';
            pauseBatchBtn.disabled = false;
        }

        let completed = 0;
        const total = examples.length;

        // Get current settings for the batch run
        const useLakera = document.getElementById("lakera-scan-checkbox").checked;
        const useLakeraOutbound = document.getElementById("lakera-outbound-checkbox").checked;
        const modelProvider = providerSelect ? providerSelect.value : 'openai';
        const modelName = modelSelect ? modelSelect.value : '';

        for (const example of examples) {
            if (!isBatchRunning) break;

            // Handle Pause
            while (isBatchPaused) {
                if (!isBatchRunning) break;
                await new Promise(r => setTimeout(r, 100));
            }

            // Update Current Item
            if (currentPrompt) currentPrompt.textContent = example.prompt;

            try {
                const response = await fetch("/api/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: example.prompt,
                        use_lakera: useLakera,
                        use_lakera_outbound: useLakeraOutbound,
                        model_provider: modelProvider,
                        model_name: modelName
                    }),
                    signal: batchController.signal
                });

                const result = await response.json();

                // Add to log
                if (logList) {
                    const logItem = document.createElement("div");
                    logItem.className = "batch-log-item clickable";

                    const isFlagged = result.flagged || (result.attack_vectors && result.attack_vectors.length > 0);
                    const statusIcon = isFlagged ? "⚠️" : "✅";
                    const statusClass = isFlagged ? "status-danger" : "status-safe";

                    logItem.innerHTML = `
                        <span class="batch-log-icon">${statusIcon}</span>
                        <div class="batch-log-content">
                            <div class="batch-log-prompt">${example.prompt}</div>
                            <div class="batch-log-result ${statusClass}">
                                ${isFlagged ? "Threat Detected" : "Safe"}
                            </div>
                        </div>
                        <span class="batch-log-view">View →</span>
                    `;

                    // Store the result data for click handler
                    const resultData = {
                        ...result,
                        prompt: example.prompt,
                        model_provider: modelProvider,
                        model_name: modelName
                    };

                    logItem.addEventListener("click", () => {
                        // Show result modal on top (don't hide batch modal)
                        displayResults(resultData);
                    });

                    logList.insertBefore(logItem, logList.firstChild);
                }

            } catch (err) {
                if (err.name === 'AbortError') break;
                console.error("Batch scan error:", err);
            }

            completed++;
            if (counter) counter.textContent = `${completed}/${total}`;
            if (progressBar) progressBar.style.width = `${(completed / total) * 100}%`;

            // Add delay to prevent rate limiting (OpenAI Tier 0 is very strict)
            if (completed < total && isBatchRunning) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        isBatchRunning = false;
        if (statusText) statusText.textContent = "Scan Complete";
        if (pauseBatchBtn) pauseBatchBtn.disabled = true;
    }

    function stopBatchScan() {
        isBatchRunning = false;
        if (batchController) batchController.abort();
        if (batchModal) batchModal.classList.add("hidden");
    }
}

// Export for potential standalone use
export { setLoading, displayResults };
