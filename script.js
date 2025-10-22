/* global Papa, Chart */
(function () {
  const DEFAULT_CSV_PATH = 'IMDB Dataset.csv';

  const elements = {
    loadDefaultBtn: document.getElementById('loadDefaultBtn'),
    fileInput: document.getElementById('fileInput'),
    fileName: document.getElementById('fileName'),
    loadStatus: document.getElementById('loadStatus'),
    summarySection: document.getElementById('summarySection'),
    chartsSection: document.getElementById('chartsSection'),
    totalReviews: document.getElementById('totalReviews'),
    avgLengthOverall: document.getElementById('avgLengthOverall'),
    avgLengthPos: document.getElementById('avgLengthPos'),
    avgLengthNeg: document.getElementById('avgLengthNeg'),
    sentimentChart: document.getElementById('sentimentChart'),
    posWordsChart: document.getElementById('posWordsChart'),
    negWordsChart: document.getElementById('negWordsChart'),
    topNPos: document.getElementById('topNPos'),
    topNNeg: document.getElementById('topNNeg'),
  };

  let charts = { sentiment: null, pos: null, neg: null };
  let dataset = [];

  const ENGLISH_STOPWORDS = new Set([
    'a','an','the','and','or','but','if','then','else','when','at','by','for','with','about','against','between','into','through','during','before','after','to','from','up','down','in','out','on','off','over','under','again','further','once','here','there','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','can','will','just','don','should','now','is','am','are','was','were','be','been','being','do','does','did','having','have','has','i','me','my','myself','we','our','ours','ourselves','you','your','yours','yourself','yourselves','he','him','his','himself','she','her','hers','herself','it','its','itself','they','them','their','theirs','themselves','what','which','who','whom','this','that','these','those','because','why','how'
  ]);

  function setStatus(message, isError) {
    elements.loadStatus.textContent = message;
    elements.loadStatus.style.color = isError ? '#ff6b6b' : '#a9b2c3';
  }

  function sanitizeText(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(text) {
    const clean = sanitizeText(text);
    if (!clean) return [];
    const tokens = clean.split(' ');
    return tokens.filter(w => w && !ENGLISH_STOPWORDS.has(w));
  }

  function computeMetrics(rows) {
    const result = {
      total: rows.length,
      lengthsOverall: [],
      lengthsPos: [],
      lengthsNeg: [],
      posCount: 0,
      negCount: 0,
      posFreq: new Map(),
      negFreq: new Map(),
    };

    for (const row of rows) {
      const review = row.review ?? row.text ?? row.content ?? '';
      const sentiment = String(row.sentiment ?? row.label ?? '').toLowerCase();
      const tokens = tokenize(review);
      const length = tokens.length;
      result.lengthsOverall.push(length);

      if (sentiment === 'positive' || sentiment === 'pos') {
        result.posCount++;
        result.lengthsPos.push(length);
        for (const t of tokens) result.posFreq.set(t, (result.posFreq.get(t) || 0) + 1);
      } else if (sentiment === 'negative' || sentiment === 'neg') {
        result.negCount++;
        result.lengthsNeg.push(length);
        for (const t of tokens) result.negFreq.set(t, (result.negFreq.get(t) || 0) + 1);
      }
    }

    const avg = arr => (arr.length ? (arr.reduce((a,b)=>a+b,0) / arr.length) : 0);
    return {
      ...result,
      avgOverall: avg(result.lengthsOverall),
      avgPos: avg(result.lengthsPos),
      avgNeg: avg(result.lengthsNeg),
    };
  }

  function topEntries(map, n) {
    const arr = Array.from(map.entries());
    arr.sort((a,b) => b[1] - a[1]);
    return arr.slice(0, n);
  }

  function numberFormat(x) {
    return new Intl.NumberFormat().format(Math.round(x));
  }

  function renderSummary(metrics) {
    elements.totalReviews.textContent = numberFormat(metrics.total);
    elements.avgLengthOverall.textContent = numberFormat(metrics.avgOverall);
    elements.avgLengthPos.textContent = numberFormat(metrics.avgPos);
    elements.avgLengthNeg.textContent = numberFormat(metrics.avgNeg);
    elements.summarySection.hidden = false;
  }

  function renderSentimentChart(metrics) {
    const ctx = elements.sentimentChart.getContext('2d');
    if (charts.sentiment) charts.sentiment.destroy();
    charts.sentiment = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Positive', 'Negative'],
        datasets: [{
          label: 'Count',
          data: [metrics.posCount, metrics.negCount],
          backgroundColor: ['#36d399', '#ff6b6b'],
          borderColor: ['#28b581', '#ff5252'],
          borderWidth: 1,
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  function renderWordChart(canvasEl, chartKey, entries, color) {
    const labels = entries.map(e => e[0]);
    const values = entries.map(e => e[1]);
    const ctx = canvasEl.getContext('2d');
    if (charts[chartKey]) charts[chartKey].destroy();
    charts[chartKey] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Frequency',
          data: values,
          backgroundColor: color,
        }]
      },
      options: {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true }
        }
      }
    });
  }

  function renderWordCharts(metrics) {
    const nPos = parseInt(elements.topNPos.value, 10);
    const nNeg = parseInt(elements.topNNeg.value, 10);
    renderWordChart(elements.posWordsChart, 'pos', topEntries(metrics.posFreq, nPos), '#36d399');
    renderWordChart(elements.negWordsChart, 'neg', topEntries(metrics.negFreq, nNeg), '#ff6b6b');
    elements.chartsSection.hidden = false;
  }

  function handleData(rows) {
    dataset = rows;
    const metrics = computeMetrics(rows);
    renderSummary(metrics);
    renderSentimentChart(metrics);
    renderWordCharts(metrics);

    elements.topNPos.addEventListener('change', () => renderWordCharts(metrics));
    elements.topNNeg.addEventListener('change', () => renderWordCharts(metrics));
  }

  async function loadDefaultCsv() {
    setStatus('Loading bundled CSV…');
    try {
      const response = await fetch(DEFAULT_CSV_PATH, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const text = await response.text();
      parseCsvText(text);
      elements.fileName.textContent = 'IMDB Dataset.csv';
      setStatus('Loaded.');
    } catch (err) {
      console.error(err);
      setStatus('Failed to load IMDB Dataset.csv. If using GitHub Pages, ensure the CSV is committed at the site root or upload a CSV.', true);
    }
  }

  function parseCsvText(text) {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      complete: (res) => {
        const rows = res.data
          .map(r => ({ review: r.review ?? r.text ?? r.content, sentiment: r.sentiment ?? r.label }))
          .filter(r => typeof r.review === 'string' && r.review.length > 0 && r.sentiment);
        if (!rows.length) {
          setStatus('CSV parsed but found no usable rows. Expect headers like "review" and "sentiment".', true);
          return;
        }
        handleData(rows);
      },
      error: (err) => {
        console.error(err);
        setStatus('Failed to parse CSV: ' + err.message, true);
      }
    });
  }

  function parseCsvFile(file) {
    setStatus('Parsing uploaded CSV…');
    const reader = new FileReader();
    reader.onload = (e) => parseCsvText(e.target.result);
    reader.onerror = () => setStatus('Failed to read file', true);
    reader.readAsText(file);
  }

  function setupEvents() {
    elements.loadDefaultBtn.addEventListener('click', loadDefaultCsv);
    elements.fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      elements.fileName.textContent = file.name;
      parseCsvFile(file);
    });
  }

  setupEvents();
})();


