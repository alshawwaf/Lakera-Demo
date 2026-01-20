// ============================================
// Dashboard Page Module
// ============================================

/**
 * Initialize dashboard page
 */
export function initDashboard() {
  const refreshBtn = document.getElementById("refresh-btn");
  const timelineRange = document.getElementById("timeline-range");
  let timelineChartInstance = null;

  if (refreshBtn) refreshBtn.addEventListener("click", () => loadAnalytics());
  if (timelineRange) timelineRange.addEventListener("change", () => loadAnalytics());

  // PDF Export
  const exportPdfBtn = document.getElementById("export-pdf");
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", () => {
      window.print();
    });
  }

  // Set print date
  const dashboardWrapper = document.querySelector('.dashboard-wrapper');
  if (dashboardWrapper) {
      dashboardWrapper.setAttribute('data-print-date', new Date().toLocaleString());
  }

  // Initial load
  loadAnalytics();
  // Auto-refresh every 30s
  setInterval(() => loadAnalytics(), 30000);

  async function loadAnalytics() {
    try {
      const range = timelineRange ? timelineRange.value : "24h";
      const response = await fetch(`/api/analytics?range=${range}`);
      const data = await response.json();

      console.log("Analytics data loaded:", data);

      // Update stats and feed first (critical info)
      try {
        updateStats(data);
      } catch (e) {
        console.error("Error updating stats:", e);
      }

      try {
        updateFeed(data.recent_logs);
      } catch (e) {
        console.error("Error updating feed:", e);
      }

      // Update charts last (might fail if Chart.js not loaded)
      try {
        if (typeof Chart !== "undefined") {
          updateCharts(data);
        } else {
          console.warn("Chart.js not loaded, skipping charts.");
        }
      } catch (e) {
        console.error("Error updating charts:", e);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
    }
  }

  function updateStats(data) {
    console.log(
      "Updating stats:",
      data.total_scans,
      data.threats_blocked,
      data.success_rate
    );

    const totalScansEl = document.getElementById("total-scans");
    if (totalScansEl) totalScansEl.textContent = data.total_scans;

    const threatsBlockedEl = document.getElementById("threats-blocked");
    if (threatsBlockedEl) threatsBlockedEl.textContent = data.threats_blocked;

    const successRate = document.getElementById("success-rate");
    if (successRate) successRate.textContent = `${data.success_rate}%`;
  }

  function updateCharts(data) {
    // Threat Distribution Chart
    const ctxThreat = document.getElementById("threatChart");
    if (ctxThreat) {
      const ctx = ctxThreat.getContext("2d");
      const threatLabels = Object.keys(data.threat_distribution || {});
      const threatValues = Object.values(data.threat_distribution || {});

      // Generate colors based on attack type
      const threatColors = threatLabels.map((label) =>
        window.getAttackColor(label)
      );

      if (window.threatChartInstance) window.threatChartInstance.destroy();

      window.threatChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: threatLabels.length > 0 ? threatLabels : ["No Data"],
          datasets: [
            {
              label: "Threats",
              data: threatValues.length > 0 ? threatValues : [0],
              backgroundColor:
                threatValues.length > 0
                  ? threatColors
                  : ["rgba(100, 116, 139, 0.3)"],
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: 4,
              barPercentage: 0.6,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(13, 17, 23, 0.9)",
              titleColor: "#fff",
              bodyColor: "#cbd5e1",
              borderColor: "rgba(255,255,255,0.1)",
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              callbacks: {
                label: function (context) {
                  return ` ${context.parsed.x} detected`;
                },
              },
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: "rgba(255, 255, 255, 0.05)" },
              ticks: { color: "#94a3b8", precision: 0 },
            },
            y: {
              grid: { display: false },
              ticks: { color: "#cbd5e1", font: { weight: 500 } },
            },
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const label = threatLabels[index];
              window.location.href = `/logs?filter=${encodeURIComponent(
                label
              )}`;
            }
          },
        },
      });
    }

    // Timeline Chart
    const ctxTimeline = document.getElementById("timelineChart");
    if (ctxTimeline) {
      const ctx = ctxTimeline.getContext("2d");
      const timelineLabels = Object.keys(data.timeline).sort();
      const timelineValues = timelineLabels.map((k) => data.timeline[k]);

      if (timelineChartInstance) timelineChartInstance.destroy();

      timelineChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: timelineLabels,
          datasets: [
            {
              label: "Scans",
              data: timelineValues,
              backgroundColor: "rgba(59, 130, 246, 0.5)",
              borderColor: "#3b82f6",
              borderWidth: 1,
              borderRadius: 4,
              barPercentage: 0.6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: "index",
              intersect: false,
              backgroundColor: "rgba(13, 17, 23, 0.9)",
              titleColor: "#fff",
              bodyColor: "#cbd5e1",
              borderColor: "rgba(255,255,255,0.1)",
              borderWidth: 1,
              padding: 10,
              displayColors: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "rgba(255, 255, 255, 0.05)" },
              ticks: { color: "#94a3b8" },
            },
            x: {
              grid: { display: false },
              ticks: { color: "#94a3b8", maxTicksLimit: 8 },
            },
          },
          interaction: {
            mode: "nearest",
            axis: "x",
            intersect: false,
          },
        },
      });
    }
  }

  function updateFeed(logs) {
    const feedList = document.getElementById("feed-list");
    if (!feedList) return;
    feedList.innerHTML = "";

    if (logs.length === 0) {
      feedList.innerHTML =
        '<p style="color: var(--text-secondary); padding: 2rem; text-align: center;">No recent activity</p>';
      return;
    }

    logs.forEach((log) => {
      const item = document.createElement("div");
      item.className = "feed-item";

      // Make clickable
      item.style.cursor = "pointer";
      item.addEventListener("click", () => {
        window.location.href = "/logs";
      });

      const isFlagged = log.result?.flagged || false;
      const statusClass = isFlagged ? "status-danger" : "status-safe";
      const statusIcon = isFlagged ? "⚠️" : "✅";

      // Create attack vector badges
      let attackBadgesHtml = "";
      if (log.attack_vectors && log.attack_vectors.length > 0) {
        attackBadgesHtml =
          '<div class="feed-vectors">' +
          log.attack_vectors
            .map((v) => {
              const color = window.getAttackColor(v);
              return `<span class="vector-badge" style="background: ${color}20; border-color: ${color}; color: ${color};">${v}</span>`;
            })
            .join(" ") +
          "</div>";
      }

      const promptPreview =
        log.prompt.length > 80
          ? log.prompt.substring(0, 80) + "..."
          : log.prompt;

      item.innerHTML = `
            <div class="feed-icon ${statusClass}">${statusIcon}</div>
            <div class="feed-content">
                <div class="feed-prompt">${promptPreview}</div>
                ${attackBadgesHtml}
                <div class="feed-meta">
                    <span>${log.timestamp}</span>
                    ${
                      isFlagged
                        ? '<span class="feed-badge">Threat Detected</span>'
                        : '<span class="feed-badge-safe">Safe</span>'
                    }
                </div>
            </div>
        `;
      feedList.appendChild(item);
    });
  }
}
