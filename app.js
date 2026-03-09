const state = {
    data: null,
};

const nodes = {
    metaVersion: document.querySelector("#metaVersion"),
    metaStatus: document.querySelector("#metaStatus"),
    metaEnvironment: document.querySelector("#metaEnvironment"),
    metaSync: document.querySelector("#metaSync"),
    metaNote: document.querySelector("#metaNote"),
    heroUptime: document.querySelector("#heroUptime"),
    heroNodes: document.querySelector("#heroNodes"),
    heroLatency: document.querySelector("#heroLatency"),
    heroAutomation: document.querySelector("#heroAutomation"),
    heroAlerts: document.querySelector("#heroAlerts"),
    metricsGrid: document.querySelector("#metricsGrid"),
    trendChart: document.querySelector("#trendChart"),
    trendLabels: document.querySelector("#trendLabels"),
    trendSummary: document.querySelector("#trendSummary"),
    pipelineList: document.querySelector("#pipelineList"),
    nodesGrid: document.querySelector("#nodesGrid"),
    nodeSummary: document.querySelector("#nodeSummary"),
    alertsList: document.querySelector("#alertsList"),
    timelineList: document.querySelector("#timelineList"),
    releaseList: document.querySelector("#releaseList"),
    refreshButton: document.querySelector("#refreshButton"),
};

async function loadDashboardData(forceRefresh = false) {
    const url = new URL("./data/lobster-metrics.json", window.location.href);

    if (forceRefresh) {
        url.searchParams.set("ts", Date.now().toString());
    }

    const response = await fetch(url, {
        cache: forceRefresh ? "no-store" : "default",
    });

    if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
    }

    return response.json();
}

function formatMetricValue(metric) {
    return `${metric.value}${metric.unit ?? ""}`;
}

function setMetricNumber(element, nextValue) {
    if (!element) {
        return;
    }

    const text = String(nextValue);
    const match = text.match(/^([^\d-]*)(-?[\d,.]+)(.*)$/);

    if (!match) {
        element.textContent = nextValue;
        return;
    }

    const [, prefix, numericPart, suffix] = match;
    const decimals = numericPart.includes(".") ? numericPart.split(".")[1].length : 0;
    const plainNumber = Number.parseFloat(numericPart.replace(/,/g, ""));

    if (Number.isNaN(plainNumber)) {
        element.textContent = nextValue;
        return;
    }

    const duration = 650;
    const start = performance.now();

    function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        const current = plainNumber * progress;
        const formattedValue = current.toLocaleString("zh-CN", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
        element.textContent = `${prefix}${formattedValue}${suffix}`;

        if (progress < 1) {
            requestAnimationFrame(frame);
        }
    }

    requestAnimationFrame(frame);
}

function renderMeta(meta, metrics) {
    nodes.metaVersion.textContent = meta.version;
    nodes.metaStatus.textContent = meta.status;
    nodes.metaEnvironment.textContent = meta.environment;
    nodes.metaSync.textContent = `最近同步 ${meta.lastSync}`;
    nodes.metaNote.textContent = meta.note;

    setMetricNumber(nodes.heroUptime, metrics.hero.uptime);
    nodes.heroNodes.textContent = metrics.hero.nodes;
    nodes.heroLatency.textContent = metrics.hero.latency;
    nodes.heroAutomation.textContent = metrics.hero.automationSuccess;
    nodes.heroAlerts.textContent = metrics.hero.pendingAlerts;
}

function renderMetrics(metrics) {
    nodes.metricsGrid.innerHTML = metrics.items
        .map((metric) => {
            const directionClass = metric.direction === "down" ? "down" : "up";
            const arrow = metric.direction === "down" ? "↓" : "↑";

            return `
                <article class="metric-card reveal">
                    <div class="metric-head">
                        <div class="metric-label">${metric.label}</div>
                        <span class="metric-delta ${directionClass}">${arrow} ${metric.delta}</span>
                    </div>
                    <div class="metric-value" data-metric-value="${metric.label}">${formatMetricValue(metric)}</div>
                    <div class="metric-footnote">${metric.description}</div>
                </article>
            `;
        })
        .join("");

    metrics.items.forEach((metric) => {
        const valueNode = document.querySelector(`[data-metric-value="${metric.label}"]`);
        setMetricNumber(valueNode, formatMetricValue(metric));
    });
}

function buildPath(values, width, height, padding) {
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const drawableWidth = width - padding * 2;
    const drawableHeight = height - padding * 2;

    return values
        .map((value, index) => {
            const x = padding + (drawableWidth / (values.length - 1 || 1)) * index;
            const ratio = (value - minValue) / Math.max(maxValue - minValue, 1);
            const y = height - padding - ratio * drawableHeight;
            return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");
}

function renderTrend(trend) {
    const width = 760;
    const height = 320;
    const padding = 36;
    const path = buildPath(trend.values, width, height, padding);
    const areaPath = `${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
    const peak = Math.max(...trend.values);
    const latest = trend.values.at(-1);
    const average = Math.round(trend.values.reduce((sum, value) => sum + value, 0) / trend.values.length);
    const minValue = Math.min(...trend.values);

    nodes.trendSummary.textContent = `峰值 ${peak.toLocaleString()} · 日均 ${average.toLocaleString()}`;

    nodes.trendChart.innerHTML = `
        <defs>
            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#ff7847" stop-opacity="0.34"></stop>
                <stop offset="100%" stop-color="#ff7847" stop-opacity="0.02"></stop>
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stop-color="#ff7847"></stop>
                <stop offset="100%" stop-color="#2ec4b6"></stop>
            </linearGradient>
        </defs>
        ${[0.25, 0.5, 0.75].map((level) => {
            const y = (height - padding * 2) * level + padding;
            return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="6 10" />`;
        }).join("")}
        <path d="${areaPath}" fill="url(#areaGradient)"></path>
        <path d="${path}" fill="none" stroke="url(#lineGradient)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
        ${trend.values.map((value, index) => {
            const x = padding + ((width - padding * 2) / (trend.values.length - 1 || 1)) * index;
            const ratio = (value - minValue) / Math.max(maxValue - minValue, 1);
            const y = height - padding - ratio * (height - padding * 2);
            const isLatest = index === trend.values.length - 1;
            return `
                <circle cx="${x}" cy="${y}" r="${isLatest ? 7 : 5}" fill="${isLatest ? "#ffd166" : "#ff7847"}"></circle>
            `;
        }).join("")}
        <text x="${width - padding}" y="${padding - 8}" text-anchor="end" fill="#9fb0c8" font-size="14">${latest.toLocaleString()} 最新</text>
    `;

    nodes.trendLabels.innerHTML = trend.labels
        .map((label) => `<span>${label}</span>`)
        .join("");
}

function renderPipeline(pipeline) {
    nodes.pipelineList.innerHTML = pipeline
        .map((step) => `
            <div class="pipeline-row">
                <div class="pipeline-label">
                    <strong>${step.label}</strong>
                    <span>${step.value}</span>
                </div>
                <div class="pipeline-bar">
                    <span class="pipeline-fill" style="width: ${step.rate}%"></span>
                </div>
                <div class="pipeline-meta">${step.description}</div>
            </div>
        `)
        .join("");
}

function renderNodes(nodeList) {
    const online = nodeList.filter((node) => node.status === "ok").length;
    nodes.nodeSummary.textContent = `${online}/${nodeList.length} 节点健康`;

    nodes.nodesGrid.innerHTML = nodeList
        .map((node) => `
            <article class="node-card">
                <div class="node-top">
                    <div>
                        <div class="node-name">${node.name}</div>
                        <div class="node-status ${node.status}">${node.statusLabel}</div>
                    </div>
                    <span class="metric-delta ${node.status === "error" ? "down" : "up"}">${node.region}</span>
                </div>
                <span class="node-value">${node.latency}</span>
                <div class="node-meta">
                    <span>CPU ${node.cpu}</span>
                    <span>内存 ${node.memory}</span>
                    <span>队列 ${node.queue}</span>
                </div>
            </article>
        `)
        .join("");
}

function renderAlerts(alerts) {
    const maxValue = Math.max(...alerts.map((alert) => alert.value), 1);

    nodes.alertsList.innerHTML = alerts
        .map((alert) => `
            <div class="alert-row">
                <div class="alert-label">
                    <strong>${alert.label}</strong>
                    <span>${alert.value} 条</span>
                </div>
                <div class="alert-track">
                    <span class="alert-fill ${alert.level}" style="width: ${(alert.value / maxValue) * 100}%"></span>
                </div>
            </div>
        `)
        .join("");
}

function renderTimeline(timeline) {
    nodes.timelineList.innerHTML = timeline
        .map((item) => `
            <article class="timeline-item">
                <div class="timeline-time">${item.time}</div>
                <div class="timeline-content">
                    <strong>${item.title}</strong>
                    <p>${item.description}</p>
                </div>
            </article>
        `)
        .join("");
}

function renderReleases(releases) {
    nodes.releaseList.innerHTML = releases
        .map((release) => `
            <article class="release-card">
                <strong>
                    <span>${release.version}</span>
                    <span>${release.window}</span>
                </strong>
                <p>${release.focus}</p>
            </article>
        `)
        .join("");
}

function renderDashboard(data) {
    state.data = data;
    renderMeta(data.meta, data.metrics);
    renderMetrics(data.metrics);
    renderTrend(data.trend);
    renderPipeline(data.pipeline);
    renderNodes(data.nodes);
    renderAlerts(data.alerts);
    renderTimeline(data.timeline);
    renderReleases(data.releases);
}

async function initializeDashboard(forceRefresh = false) {
    nodes.refreshButton.disabled = true;
    nodes.refreshButton.textContent = forceRefresh ? "刷新中..." : "刷新示例数据";

    try {
        const data = await loadDashboardData(forceRefresh);
        renderDashboard(data);
    } catch (error) {
        nodes.metaNote.textContent = "数据加载失败，请确认本地静态服务或 GitHub Pages 已正常提供 JSON 文件。";
        console.error(error);
    } finally {
        nodes.refreshButton.disabled = false;
        nodes.refreshButton.textContent = "刷新示例数据";
    }
}

nodes.refreshButton.addEventListener("click", () => {
    initializeDashboard(true);
});

initializeDashboard();
