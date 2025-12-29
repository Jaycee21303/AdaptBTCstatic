const feedContainer = document.getElementById('live-feed-stream');
const feedStatus = document.getElementById('feed-status');
const mempoolSizeEl = document.getElementById('mempool-size');
const recommendedFeeEl = document.getElementById('recommended-fee');
const lastBlockHeightEl = document.getElementById('last-block-height');
const pendingTxCountEl = document.getElementById('pending-tx-count');
const estimatedHashrateEl = document.getElementById('estimated-hashrate');

let livePriceUsd = null;
let lastBlockTimestamp = null;
let socket;

function formatBtcFromSats(sats) {
  if (!sats && sats !== 0) return '—';
  return (sats / 100000000).toFixed(8).replace(/0+$/, '').replace(/\.$/, '') + ' BTC';
}

function formatCurrency(amount) {
  return amount?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }) || '—';
}

function addFeedEntry({ icon, title, detail, meta, tone }) {
  const entry = document.createElement('div');
  entry.className = `feed-entry ${tone}`;

  entry.innerHTML = `
    <div class="icon">${icon}</div>
    <div class="content">
      <div class="row">
        <h4>${title}</h4>
        <span class="meta">${meta}</span>
      </div>
      <p class="detail">${detail}</p>
    </div>
  `;

  feedContainer.prepend(entry);

  if (feedContainer.children.length > 100) {
    feedContainer.removeChild(feedContainer.lastElementChild);
  }
}

function addMempoolTxToFeed(tx) {
  if (!tx) return;

  const valueBtc = formatBtcFromSats(tx.value || tx.fee || 0);
  const usd = livePriceUsd && tx.value ? ` · ${formatCurrency((tx.value / 100000000) * livePriceUsd)}` : '';
  const meta = `${(tx.vsize || tx.size || 0).toLocaleString()} vBytes`;

  addFeedEntry({
    icon: 'TX',
    title: 'New transaction',
    detail: `${valueBtc}${usd} • ${tx.txid ? tx.txid.slice(0, 10) + '…' : 'Pending tx'}`,
    meta,
    tone: 'tx'
  });
}

function addNewBlockToFeed(block) {
  if (!block) return;

  lastBlockTimestamp = block.timestamp || Date.now() / 1000;
  const height = block.height || block.blockHeight || '—';
  const txCount = block.tx_count || block.txCount || block.nTx || '—';

  addFeedEntry({
    icon: 'BLK',
    title: `New block ${height}`,
    detail: `${txCount} transactions • ${block.id ? block.id.slice(0, 10) + '…' : 'Block received'}`,
    meta: block.timestamp ? new Date(block.timestamp * 1000).toLocaleTimeString() : 'Now',
    tone: 'block'
  });

  lastBlockHeightEl.textContent = height;
  updateHashrateEstimate();
}

function updateHashrateEstimate() {
  if (!lastBlockTimestamp) return;
  const now = Date.now() / 1000;
  const interval = Math.max(now - lastBlockTimestamp, 1);
  const targetInterval = 600;
  const estimate = (targetInterval / interval) * 100;
  estimatedHashrateEl.textContent = `${estimate.toFixed(1)}% of target pace`;
}

function updateNetworkHealth(data) {
  const mempoolBlocks = data['mempool-blocks'];
  if (!Array.isArray(mempoolBlocks) || !mempoolBlocks.length) return;

  const totalVSize = mempoolBlocks.reduce((sum, block) => sum + (block.blockVSize || block.vSize || block.blockSize || 0), 0);
  const mempoolMb = totalVSize / 1_000_000;
  mempoolSizeEl.textContent = mempoolMb ? `${mempoolMb.toFixed(2)} MB` : '—';

  const tip = mempoolBlocks[0];
  const fee = tip.medianFee || (Array.isArray(tip.feeRange) ? tip.feeRange[Math.floor(tip.feeRange.length / 2)] : null);
  recommendedFeeEl.textContent = fee ? `${fee} sat/vByte` : '—';

  const pendingTx = mempoolBlocks.reduce((sum, block) => sum + (block.tx_count || block.nTx || 0), 0);
  pendingTxCountEl.textContent = pendingTx ? pendingTx.toLocaleString() : '—';

  const height = tip.blockHeight || tip.height;
  if (height) {
    lastBlockHeightEl.textContent = height;
  }
}

function connectWebSocket() {
  socket = new WebSocket('wss://mempool.space/api/v1/ws');

  socket.onopen = () => {
    feedStatus.textContent = 'Live';
    feedStatus.classList.add('online');

    socket.send(
      JSON.stringify({
        action: 'want',
        data: ['blocks', 'mempool-blocks', 'transactions'],
      })
    );
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data['mempool-blocks']) {
        updateNetworkHealth(data);
      }

      if (data['transaction']) {
        addMempoolTxToFeed(data['transaction']);
      }

      if (data['block']) {
        addNewBlockToFeed(data['block']);
      }
    } catch (err) {
      console.error('Live feed parse error', err);
    }
  };

  socket.onerror = () => {
    feedStatus.textContent = 'Reconnecting…';
    feedStatus.classList.remove('online');
  };

  socket.onclose = () => {
    feedStatus.textContent = 'Reconnecting…';
    feedStatus.classList.remove('online');
    setTimeout(connectWebSocket, 2000);
  };
}

async function fetchLivePrice() {
  try {
    const res = await fetch('https://api.coindesk.com/v1/bpi/currentprice/USD.json');
    const json = await res.json();
    livePriceUsd = json?.bpi?.USD?.rate_float || null;
  } catch (err) {
    console.warn('Price fetch skipped', err);
  }
}

async function fetchNetworkSnapshot() {
  try {
    const [mempoolRes, blocksRes, recentTxRes] = await Promise.all([
      fetch('https://mempool.space/api/v1/fees/mempool-blocks'),
      fetch('https://mempool.space/api/blocks'),
      fetch('https://mempool.space/api/mempool/recent'),
    ]);

    const mempoolBlocks = await mempoolRes.json();
    updateNetworkHealth({ 'mempool-blocks': mempoolBlocks });

    const blocks = await blocksRes.json();
    if (Array.isArray(blocks) && blocks.length) {
      addNewBlockToFeed(blocks[0]);
    }

    const txs = await recentTxRes.json();
    if (Array.isArray(txs)) {
      txs
        .slice(0, 10)
        .reverse()
        .forEach(addMempoolTxToFeed);
    }
  } catch (err) {
    console.warn('Initial network snapshot unavailable', err);
  }
}

(function init() {
  if (!feedContainer) return;
  fetchLivePrice();
  fetchNetworkSnapshot();
  connectWebSocket();
})();
