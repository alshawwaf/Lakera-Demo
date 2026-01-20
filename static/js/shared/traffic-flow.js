// ============================================
// Traffic Flow Visualization Module
// ============================================

import { getAttackColor } from "./utils.js";

/**
 * Display analysis results in modal
 * @param {Object} data - Analysis result data
 */
export function displayResults(data) {
  const modal = document.getElementById("result-modal");
  const modalHeader = modal.querySelector(".modal-header");
  const flagsContainer = document.getElementById("flags-container");
  const statsContainer = document.getElementById("result-stats");

  // Reset content
  flagsContainer.innerHTML = "";
  if (statsContainer) statsContainer.innerHTML = "";

  const lakeraResult = data.lakera_result;
  const lakeraOutboundResult = data.lakera_outbound_result;
  const isFlagged = data.flagged;
  const isOutboundFlagged =
    lakeraOutboundResult && lakeraOutboundResult.flagged;

  // --- Compact Header Logic ---
  let headerClass, statusIcon, statusText, statusColor;

  if (!lakeraResult) {
    headerClass = "neutral";
    statusIcon = "○";
    statusText = "Not Scanned";
    statusColor = "var(--text-secondary)";
  } else if (isFlagged) {
    headerClass = "danger";
    statusIcon = "⛔";
    statusText = "Threat Blocked";
    statusColor = "#ef4444";
  } else if (isOutboundFlagged) {
    headerClass = "warning";
    statusIcon = "⚠️";
    statusText = "Outbound Threat";
    statusColor = "#f97316";
  } else {
    headerClass = "success";
    statusIcon = "✓";
    statusText = "Safe";
    statusColor = "#22c55e";
  }

  // Provider label
  let providerLabel = "OpenAI";
  if (data.model_provider === "azure") providerLabel = "Azure";
  else if (data.model_provider === "gemini") providerLabel = "Gemini";
  else if (data.model_provider === "ollama") providerLabel = "Ollama";

  const modelDisplay = data.model_name ? `${providerLabel} · ${data.model_name}` : providerLabel;

  modalHeader.className = `modal-header compact-header ${headerClass}`;
  modalHeader.innerHTML = `
    <div class="compact-header-left">
      <span class="compact-status-badge" style="--status-color: ${statusColor}">
        <span class="status-icon">${statusIcon}</span>
        <span class="status-text">${statusText}</span>
      </span>
      <span class="compact-model-badge">${modelDisplay}</span>
    </div>
    <button class="close-modal-btn" id="close-result-modal">&times;</button>
  `;

  // --- Traffic Flow Section ---
  const flowCard = document.createElement("div");
  flowCard.className = "modal-card compact-flow-card";

  const useLakera = document.getElementById("lakera-scan-checkbox").checked;
  const useLakeraOutbound = document.getElementById(
    "lakera-outbound-checkbox"
  ).checked;

  const flowDiagram = renderTrafficFlow(data, useLakera, useLakeraOutbound);
  flowCard.appendChild(flowDiagram);
  flagsContainer.appendChild(flowCard);

  // --- Threats Section (Compact Pills) ---
  const inboundVectors =
    lakeraResult && lakeraResult.attack_vectors
      ? lakeraResult.attack_vectors
      : [];
  const outboundVectors = [];

  if (lakeraOutboundResult && lakeraOutboundResult.breakdown) {
    lakeraOutboundResult.breakdown.forEach((r) => {
      if (r.detected && r.detector_type) {
        const vectorName = r.detector_type.split("/").pop();
        if (!outboundVectors.includes(vectorName)) {
          outboundVectors.push(vectorName);
        }
      }
    });
  }

  if (inboundVectors.length > 0 || outboundVectors.length > 0) {
    const threatSection = document.createElement("div");
    threatSection.className = "compact-threat-section";

    const threatLabel = document.createElement("span");
    threatLabel.className = "threat-section-label";
    threatLabel.textContent = "Detected:";
    threatSection.appendChild(threatLabel);

    const pillContainer = document.createElement("div");
    pillContainer.className = "threat-pills";

    [...inboundVectors, ...outboundVectors].forEach((vector) => {
      const pill = document.createElement("span");
      pill.className = "threat-pill";
      const color = getAttackColor(vector);
      pill.style.setProperty("--pill-color", color);
      pill.textContent = vector.replace(/_/g, " ");
      pillContainer.appendChild(pill);
    });

    threatSection.appendChild(pillContainer);
    flagsContainer.appendChild(threatSection);
  }

  // Add Details Pane Container
  const detailsPane = document.createElement("div");
  detailsPane.id = "flow-details-pane";
  detailsPane.className = "hidden";
  flagsContainer.appendChild(detailsPane);

  // --- LLM Response Section ---
  if (data.openai_response) {
    const responseSection = document.createElement("div");
    responseSection.className = "compact-response-section";

    const responseHeader = document.createElement("div");
    responseHeader.className = "response-header";
    responseHeader.innerHTML = `<span class="response-label">${providerLabel} Response</span>`;
    responseSection.appendChild(responseHeader);

    const responseBox = document.createElement("div");
    responseBox.className = "compact-response-box";
    responseBox.textContent = data.openai_response;
    responseSection.appendChild(responseBox);

    flagsContainer.appendChild(responseSection);
  }

  // Re-attach close handler
  const closeBtn = document.getElementById("close-result-modal");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  modal.classList.remove("hidden");
}

/**
 * Create attack card element
 * @param {string} vector - Attack vector name
 * @returns {HTMLElement} Card element
 */
function createAttackCard(vector) {
  const card = document.createElement("div");
  card.className = "attack-type-card";
  card.style.display = "flex";
  card.style.flexDirection = "row";
  card.style.alignItems = "center";

  const color = getAttackColor(vector);

  card.style.setProperty("--attack-color", color);
  card.style.background = `${color}15`;
  card.style.borderColor = `${color}40`;
  card.style.borderLeft = `3px solid ${color}`;

  card.innerHTML = `
        <span class="attack-name" style="margin-left: 0;">${vector.replace(
    /_/g,
    " "
  )}</span>
    `;
  return card;
}

/**
 * Render traffic flow diagram
 * @param {Object} data - Analysis result data
 * @param {boolean} useLakera - Whether inbound scan is enabled
 * @param {boolean} useLakeraOutbound - Whether outbound scan is enabled
 * @returns {HTMLElement} Traffic flow container
 */
function renderTrafficFlow(data, useLakera, useLakeraOutbound) {
  const container = document.createElement("div");
  container.className = "traffic-flow-container";

  const inboundBlocked = data.lakera_result && data.lakera_result.flagged;
  const outboundBlocked =
    data.lakera_outbound_result && data.lakera_outbound_result.flagged;

  const userStatus = "active";

  let inboundStatus = "skipped";
  if (useLakera) {
    inboundStatus = inboundBlocked ? "danger" : "success";
  } else {
    inboundStatus = "neutral";
  }

  let openaiStatus = "skipped";
  if (!inboundBlocked) {
    openaiStatus = data.openai_response ? "active" : "skipped";
  }

  let outboundStatus = "skipped";
  if (useLakeraOutbound && openaiStatus === "active") {
    outboundStatus = outboundBlocked ? "danger" : "success";
  } else if (!useLakeraOutbound && openaiStatus === "active") {
    outboundStatus = "neutral";
  }

  const userIcon = "👤";
  const lakeraIcon = `<img src="/static/lakera-logo.png" alt="Lakera" style="width: 28px; height: 28px; object-fit: contain;">`;
  const openaiIcon = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>`;

  const azureIcon = `<img src="/static/azure-openai.png" alt="Azure" style="width: 28px; height: 28px; object-fit: contain;">`;
  const geminiIcon = `<img src="/static/gemini-logo.png" alt="Gemini" style="width: 28px; height: 28px; object-fit: contain;">`;
  const ollamaIcon = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h2v2H6zm4-4h8v2h-8zm0 4h5v2h-5z"/></svg>`;

  let llmIcon = openaiIcon;
  let llmLabel = "OpenAI";

  if (data.model_provider === "azure") {
    llmIcon = azureIcon;
    llmLabel = `Azure OpenAI (${data.model_name})`;
  } else if (data.model_provider === "gemini") {
    llmIcon = geminiIcon;
    llmLabel = `Google Gemini (${data.model_name})`;
  } else if (data.model_provider === "ollama") {
    llmIcon = ollamaIcon;
    llmLabel = `Ollama (${data.model_name})`;
  } else {
    llmLabel = `OpenAI (${data.model_name || "gpt-4o-mini"})`;
  }

  const createStep = (id, icon, label, status) => `
        <div class="flow-step ${status}" data-step="${id}">
            <div class="flow-icon">${icon}</div>
            <div class="flow-label">${label}</div>
        </div>
    `;

  const createArrow = (status) => `
        <div class="flow-arrow ${status}"></div>
    `;

  let html = "";

  html += createStep("user", userIcon, "User", userStatus);

  // Arrow 1: User -> Inbound
  let arrow1Status =
    inboundStatus === "danger" || outboundStatus === "danger"
      ? "danger"
      : "active";
  html += createArrow(arrow1Status);

  html += createStep("inbound", lakeraIcon, "Lakera Inbound", inboundStatus);

  // Arrow 2: Inbound -> LLM
  let arrow2Status = "";
  if (outboundStatus === "danger") {
    arrow2Status = "danger";
  } else if (!inboundBlocked && openaiStatus === "active") {
    arrow2Status = "active";
  }
  html += createArrow(arrow2Status);

  html += createStep("llm", llmIcon, llmLabel, openaiStatus);

  // Arrow 3: LLM -> Outbound (or User Response if outbound disabled)
  let arrow3Status = "";
  if (useLakeraOutbound && openaiStatus === "active") {
    arrow3Status = outboundStatus === "danger" ? "danger" : "active";
  } else if (!useLakeraOutbound && openaiStatus === "active") {
    arrow3Status = "active";
  }
  html += createArrow(arrow3Status);

  // Only show outbound step if outbound scanning is enabled
  if (useLakeraOutbound) {
    html += createStep(
      "outbound",
      lakeraIcon,
      "Lakera Outbound",
      outboundStatus
    );

    // Arrow 4: Outbound -> User Response
    let arrow4Status = "";
    if (outboundStatus === "success") {
      arrow4Status = "active";
    }
    html += createArrow(arrow4Status);
  }

  // Final step: User receives response
  const userResponseIcon = "👤";
  let userResponseStatus = "skipped";

  if (openaiStatus === "active" && !inboundBlocked && !outboundBlocked) {
    userResponseStatus = "success";
  }

  html += createStep(
    "user-response",
    userResponseIcon,
    "User Response",
    userResponseStatus
  );

  container.innerHTML = html;

  const steps = container.querySelectorAll(".flow-step");
  steps.forEach((step) => {
    const stepStatus =
      step.classList.contains("skipped") || step.classList.contains("neutral");

    // Only add click handler to active steps
    if (!stepStatus) {
      step.style.cursor = "pointer";
      step.addEventListener("click", () => {
        const isAlreadySelected = step.classList.contains("selected");

        steps.forEach((s) => s.classList.remove("selected"));
        const pane = document.getElementById("flow-details-pane");

        if (isAlreadySelected) {
          if (pane) pane.classList.add("hidden");

          const allChildren = Array.from(container.children);
          allChildren.forEach((child) => {
            if (child.classList.contains("flow-arrow")) {
              child.classList.remove("path-selected");
            }
          });
        } else {
          step.classList.add("selected");

          const stepId = step.getAttribute("data-step");
          if (!data.prompt && document.getElementById("prompt")) {
            data.prompt = document.getElementById("prompt").value;
          }

          const allChildren = Array.from(container.children);
          const stepIndex = allChildren.indexOf(step);

          allChildren.forEach((child, index) => {
            if (child.classList.contains("flow-arrow")) {
              if (index < stepIndex) {
                child.classList.add("path-selected");
              } else {
                child.classList.remove("path-selected");
              }
            }
          });

          showStepDetails(stepId, data);
        }
      });
    } else {
      // Make skipped/neutral steps visually non-interactive
      step.style.cursor = "not-allowed";
      step.style.opacity = "0.6";
    }
  });

  return container;
}

/**
 * Show details pane for a traffic flow step
 * @param {string} stepId - Step identifier
 * @param {Object} data - Analysis result data
 */
function showStepDetails(stepId, data) {
  const pane = document.getElementById("flow-details-pane");
  if (!pane) return;

  let title = "";
  let content = "";

  switch (stepId) {
    case "user":
      title = "User Input";
      content = data.prompt || "No prompt data available.";
      break;
    case "inbound":
      title = "Lakera Inbound Scan";
      content = data.lakera_result
        ? JSON.stringify(data.lakera_result, null, 2)
        : "No scan performed.";
      break;
    case "llm":
      if (data.model_provider === "azure") {
        title = "Azure OpenAI Response";
      } else if (data.model_provider === "gemini") {
        title = "Google Gemini Response";
      } else if (data.model_provider === "ollama") {
        title = "Ollama Response";
      } else {
        title = "OpenAI Response";
      }
      content = data.openai_response || "No response generated.";
      break;
    case "outbound":
      title = "Lakera Outbound Scan";
      content = data.lakera_outbound_result
        ? JSON.stringify(data.lakera_outbound_result, null, 2)
        : "No scan performed.";
      break;
    case "user-response":
      title = "Response Delivered to User";
      content =
        data.openai_response ||
        "No response was delivered (blocked or not generated).";
      break;
  }

  pane.innerHTML = `
        <div class="flow-details-header">
            <div class="flow-details-title">${title}</div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <button class="copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.parentElement.nextElementSibling.textContent).then(() => { this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy', 2000); })">Copy</button>
                <button class="close-details-btn" onclick="document.getElementById('flow-details-pane').classList.add('hidden'); document.querySelectorAll('.flow-step').forEach(s => s.classList.remove('selected')); document.querySelectorAll('.flow-arrow').forEach(a => a.classList.remove('path-selected'));">&times;</button>
            </div>
        </div>
        <div class="flow-details-content">
            <div class="json-viewer">${content}</div>
        </div>
    `;
  pane.classList.remove("hidden");
}
