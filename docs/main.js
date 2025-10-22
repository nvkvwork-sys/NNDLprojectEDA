async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function renderSummary(summary) {
  const el = document.getElementById('summary');
  const cls = summary.class_counts || {};
  el.innerHTML = `
    <div class="grid">
      <div><strong>Total reviews</strong><div>${summary.n_reviews.toLocaleString()}</div></div>
      <div><strong>Positive</strong><div>${(cls.positive||0).toLocaleString()}</div></div>
      <div><strong>Negative</strong><div>${(cls.negative||0).toLocaleString()}</div></div>
      <div><strong>Vocab size</strong><div>${summary.vocab_size.toLocaleString()}</div></div>
      <div><strong>Avg tokens (pos)</strong><div>${summary.avg_length_tokens.positive}</div></div>
      <div><strong>Avg tokens (neg)</strong><div>${summary.avg_length_tokens.negative}</div></div>
    </div>
  `;
}

function toBarSpec(values, title, color) {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    background: 'transparent',
    width: 'container',
    height: 300,
    data: { values },
    mark: { type: 'bar', tooltip: true, cornerRadiusTopLeft: 2, cornerRadiusTopRight: 2 },
    title: { text: title, color: '#e5e9f0', anchor: 'start', fontSize: 14, subtitleColor: '#9aa4b2' },
    encoding: {
      y: { field: 'term', type: 'nominal', sort: '-x', axis: { labelColor: '#e5e9f0', title: null } },
      x: { field: 'count', type: 'quantitative', axis: { labelColor: '#e5e9f0', title: null } },
      color: { value: color }
    },
    config: { axis: { labelColor: '#e5e9f0' } }
  };
}

function toAssocSpec(values, title, color) {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    background: 'transparent',
    width: 'container',
    height: 300,
    data: { values },
    mark: { type: 'bar', tooltip: true, cornerRadiusTopLeft: 2, cornerRadiusTopRight: 2 },
    title: { text: title, color: '#e5e9f0', anchor: 'start', fontSize: 14 },
    encoding: {
      y: { field: 'term', type: 'nominal', sort: '-x', axis: { labelColor: '#e5e9f0', title: null } },
      x: { field: 'log_odds', type: 'quantitative', axis: { labelColor: '#e5e9f0', title: 'log-odds' } },
      color: { value: color }
    },
    config: { axis: { labelColor: '#e5e9f0' } }
  };
}

function bindTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const parent = tab.parentElement;
      parent.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const card = parent.parentElement;
      const targetId = tab.dataset.target;
      card.querySelectorAll('.chart').forEach((c) => c.classList.add('hidden'));
      document.getElementById(targetId).classList.remove('hidden');
    });
  });
}

async function main() {
  bindTabs();

  const [summary, words, bigrams, assoc] = await Promise.all([
    loadJSON('assets/summary.json'),
    loadJSON('assets/top_words.json'),
    loadJSON('assets/bigrams.json'),
    loadJSON('assets/log_odds.json'),
  ]);

  renderSummary(summary);

  // Top words
  await vegaEmbed('#tw-overall', toBarSpec(words.overall, 'Top words (overall)', '#7aa2f7'), { actions: false });
  await vegaEmbed('#tw-positive', toBarSpec(words.positive, 'Top words (positive)', '#8bd5ca'), { actions: false });
  await vegaEmbed('#tw-negative', toBarSpec(words.negative, 'Top words (negative)', '#f7768e'), { actions: false });

  // Bigrams
  await vegaEmbed('#bg-overall', toBarSpec(bigrams.overall, 'Top bigrams (overall)', '#7dcfff'), { actions: false });
  await vegaEmbed('#bg-positive', toBarSpec(bigrams.positive, 'Top bigrams (positive)', '#a6e3a1'), { actions: false });
  await vegaEmbed('#bg-negative', toBarSpec(bigrams.negative, 'Top bigrams (negative)', '#f38ba8'), { actions: false });

  // Associations
  await vegaEmbed('#assoc-positive', toAssocSpec(assoc.positive, 'Most distinctive (positive)', '#8bd5ca'), { actions: false });
  await vegaEmbed('#assoc-negative', toAssocSpec(assoc.negative, 'Most distinctive (negative)', '#f7768e'), { actions: false });
}

main().catch((err) => {
  console.error(err);
  const el = document.getElementById('summary');
  if (el) el.innerHTML = `<span style="color:#f7768e">Error: ${err.message}</span>`;
});


