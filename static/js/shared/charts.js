/**
 * Chart initialization and management
 */

export function createChart(ctx, config) {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return null;
    }
    return new Chart(ctx, config);
}

export function updateChart(chart, data) {
    if (!chart) return;
    chart.data = data;
    chart.update();
}

export function getChartDefaults() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        }
    };
}
