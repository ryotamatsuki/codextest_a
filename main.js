const API_BASE = "https://www.googleapis.com/youtube/v3";
const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const apiKeyInput = document.querySelector("#apiKey");
const channelInput = document.querySelector("#channelInput");
const maxVideosSelect = document.querySelector("#maxVideos");
const loadButton = document.querySelector("#loadButton");
const statusEl = document.querySelector("#status");
const summaryEl = document.querySelector("#summary");
const insightsPanel = document.querySelector("#insightsPanel");
const insightsEl = document.querySelector("#insights");
const chartsPanel = document.querySelector("#chartsPanel");
const monthlyChartEl = document.querySelector("#monthlyChart");
const weekdayChartEl = document.querySelector("#weekdayChart");
const videosPanel = document.querySelector("#videosPanel");
const videosTableEl = document.querySelector("#videosTable");

loadButton.addEventListener("click", loadDashboard);

async function loadDashboard() {
  const apiKey = apiKeyInput.value.trim();
  const channelIdentifier = channelInput.value.trim();
  const maxVideos = Number(maxVideosSelect.value);

  if (!apiKey) {
    setStatus("APIキーを入力してください。", true);
    return;
  }

  setStatus("チャンネル情報を取得しています...");
  hidePanels();

  try {
    const channelId = await resolveChannelId(channelIdentifier, apiKey);
    const channel = await fetchChannel(channelId, apiKey);
    const uploadsPlaylist = channel.contentDetails.relatedPlaylists.uploads;
    const videoIds = await fetchUploadVideoIds(uploadsPlaylist, maxVideos, apiKey);

    if (!videoIds.length) {
      setStatus("動画が見つかりませんでした。", true);
      return;
    }

    setStatus("動画統計を分析しています...");
    const videos = await fetchVideos(videoIds, apiKey);
    const analysis = buildAnalysis(videos, channel.snippet.title);

    renderSummary(analysis);
    renderInsights(analysis);
    renderCharts(analysis);
    renderTable(analysis.videos);

    setStatus(`${analysis.channelTitle} の動画 ${analysis.videos.length} 本を分析しました。`);
  } catch (error) {
    console.error(error);
    setStatus(`取得に失敗しました: ${error.message}`, true);
  }
}

async function resolveChannelId(identifier, key) {
  if (!identifier) {
    throw new Error("チャンネル識別子を入力してください");
  }
  if (identifier.startsWith("UC")) {
    return identifier;
  }

  if (identifier.startsWith("@")) {
    const handle = identifier.slice(1);
    const data = await fetchJson(`${API_BASE}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${key}`);
    if (data.items?.[0]?.id) {
      return data.items[0].id;
    }
  }

  const searchData = await fetchJson(
    `${API_BASE}/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(identifier)}&key=${key}`,
  );
  const id = searchData.items?.[0]?.snippet?.channelId;
  if (!id) {
    throw new Error("チャンネルIDを特定できませんでした");
  }
  return id;
}

async function fetchChannel(channelId, key) {
  const data = await fetchJson(
    `${API_BASE}/channels?part=snippet,contentDetails,statistics&id=${channelId}&key=${key}`,
  );
  if (!data.items?.length) {
    throw new Error("チャンネル情報を取得できませんでした");
  }
  return data.items[0];
}

async function fetchUploadVideoIds(playlistId, maxVideos, key) {
  let pageToken = "";
  const ids = [];

  while (ids.length < maxVideos) {
    const pageSize = Math.min(50, maxVideos - ids.length);
    const url = `${API_BASE}/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=${pageSize}${pageToken ? `&pageToken=${pageToken}` : ""}&key=${key}`;
    const data = await fetchJson(url);

    for (const item of data.items || []) {
      if (item.contentDetails?.videoId) {
        ids.push(item.contentDetails.videoId);
      }
    }

    pageToken = data.nextPageToken;
    if (!pageToken || !data.items?.length) {
      break;
    }
  }

  return ids;
}

async function fetchVideos(videoIds, key) {
  const chunks = chunk(videoIds, 50);
  const videos = [];

  for (const ids of chunks) {
    const data = await fetchJson(
      `${API_BASE}/videos?part=snippet,statistics,contentDetails&id=${ids.join(",")}&key=${key}`,
    );
    videos.push(...(data.items || []));
  }

  return videos;
}

function buildAnalysis(videos, channelTitle) {
  const normalized = videos
    .map((video) => {
      const views = Number(video.statistics?.viewCount || 0);
      const likes = Number(video.statistics?.likeCount || 0);
      const comments = Number(video.statistics?.commentCount || 0);
      const publishedAt = new Date(video.snippet.publishedAt);
      return {
        id: video.id,
        title: video.snippet.title,
        publishedAt,
        views,
        likes,
        comments,
        durationSec: parseISO8601Duration(video.contentDetails.duration),
      };
    })
    .sort((a, b) => b.views - a.views);

  const totalViews = sum(normalized.map((v) => v.views));
  const averageViews = Math.round(totalViews / Math.max(normalized.length, 1));
  const medianViews = median(normalized.map((v) => v.views));
  const avgLikes = Math.round(sum(normalized.map((v) => v.likes)) / Math.max(normalized.length, 1));

  const monthly = aggregateBy(normalized, (video) => `${video.publishedAt.getFullYear()}-${String(video.publishedAt.getMonth() + 1).padStart(2, "0")}`);
  const weekday = aggregateBy(normalized, (video) => DAY_LABELS[video.publishedAt.getDay()]);

  return {
    channelTitle,
    videos: normalized,
    totalViews,
    averageViews,
    medianViews,
    avgLikes,
    topVideo: normalized[0],
    monthly,
    weekday,
  };
}

function renderSummary(analysis) {
  const cards = [
    ["分析動画数", `${analysis.videos.length} 本`],
    ["総再生数", formatNumber(analysis.totalViews)],
    ["平均再生数", formatNumber(analysis.averageViews)],
    ["中央値再生数", formatNumber(analysis.medianViews)],
    ["動画あたり平均高評価", formatNumber(analysis.avgLikes)],
    ["最高再生動画", analysis.topVideo ? formatNumber(analysis.topVideo.views) : "-"],
  ];

  summaryEl.innerHTML = cards
    .map(
      ([label, value]) => `
      <article class="summary-card">
        <h3>${label}</h3>
        <p>${value}</p>
      </article>
    `,
    )
    .join("");

  summaryEl.classList.remove("hidden");
}

function renderInsights(analysis) {
  const monthlyBest = [...analysis.monthly.entries()].sort((a, b) => b[1].avgViews - a[1].avgViews)[0];
  const weekdayBest = [...analysis.weekday.entries()].sort((a, b) => b[1].avgViews - a[1].avgViews)[0];
  const longVideos = analysis.videos.filter((video) => video.durationSec >= 600);
  const shortVideos = analysis.videos.filter((video) => video.durationSec < 60);
  const avgLongViews = Math.round(sum(longVideos.map((v) => v.views)) / Math.max(longVideos.length, 1));
  const avgShortViews = Math.round(sum(shortVideos.map((v) => v.views)) / Math.max(shortVideos.length, 1));

  const items = [
    `最も再生される傾向が強い公開月は ${monthlyBest?.[0] || "-"}（平均 ${formatNumber(monthlyBest?.[1]?.avgViews || 0)} 回）です。`,
    `曜日別では ${weekdayBest?.[0] || "-"}曜日投稿が最も高パフォーマンス（平均 ${formatNumber(weekdayBest?.[1]?.avgViews || 0)} 回）です。`,
    `10分以上動画の平均再生数は ${formatNumber(avgLongViews)} 回、60秒未満動画は ${formatNumber(avgShortViews)} 回です。尺の設計見直しに活用できます。`,
    analysis.topVideo
      ? `最も再生された動画は「${analysis.topVideo.title}」（${formatNumber(analysis.topVideo.views)} 回）です。類似テーマのシリーズ化を検討してください。`
      : "トップ動画情報は取得できませんでした。",
  ];

  insightsEl.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
  insightsPanel.classList.remove("hidden");
}

function renderCharts(analysis) {
  renderBarChart(monthlyChartEl, [...analysis.monthly.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  const weekdaySorted = DAY_LABELS.map((day) => [day, analysis.weekday.get(day) || { avgViews: 0 }]);
  renderBarChart(weekdayChartEl, weekdaySorted);
  chartsPanel.classList.remove("hidden");
}

function renderBarChart(targetEl, rows) {
  const max = Math.max(...rows.map(([, stat]) => stat.avgViews), 1);
  targetEl.innerHTML = rows
    .map(([label, stat]) => {
      const width = Math.max((stat.avgViews / max) * 100, 1);
      return `
        <div class="bar-row">
          <span>${label}</span>
          <div class="bar" style="width:${width}%"></div>
          <span>${formatNumber(Math.round(stat.avgViews))}</span>
        </div>
      `;
    })
    .join("");
}

function renderTable(videos) {
  videosTableEl.innerHTML = videos
    .map(
      (video) => `
      <tr>
        <td><a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noreferrer">${video.title}</a></td>
        <td>${video.publishedAt.toLocaleDateString("ja-JP")}</td>
        <td>${formatNumber(video.views)}</td>
        <td>${formatNumber(video.likes)}</td>
        <td>${formatNumber(video.comments)}</td>
        <td>${formatDuration(video.durationSec)}</td>
      </tr>
    `,
    )
    .join("");
  videosPanel.classList.remove("hidden");
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    const message = data.error?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function aggregateBy(videos, keyFn) {
  const map = new Map();
  for (const video of videos) {
    const key = keyFn(video);
    const current = map.get(key) || { totalViews: 0, count: 0, avgViews: 0 };
    current.totalViews += video.views;
    current.count += 1;
    current.avgViews = current.totalViews / current.count;
    map.set(key, current);
  }
  return map;
}

function parseISO8601Duration(iso) {
  const matched = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matched) return 0;
  const hours = Number(matched[1] || 0);
  const minutes = Number(matched[2] || 0);
  const seconds = Number(matched[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ja-JP").format(value || 0);
}

function sum(values) {
  return values.reduce((acc, value) => acc + value, 0);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function hidePanels() {
  [summaryEl, insightsPanel, chartsPanel, videosPanel].forEach((el) => el.classList.add("hidden"));
}
