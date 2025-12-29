const btcAddress = "bc1qruzxu9vdh7wlh5hnzsufcw8rxt9k6eamel6wmw";
const lightningAddress = "adaptbtcdonate@strike.me";

function renderQr() {
  const qrTarget = document.getElementById("btcQR");
  if (!qrTarget) return;

  new QRious({
    element: qrTarget,
    value: btcAddress,
    size: 240,
  });
}

function attachCopy({ buttonId, text, hintId }) {
  const button = document.getElementById(buttonId);
  const hint = hintId ? document.getElementById(hintId) : null;

  if (!button) return;

  button.addEventListener("click", async () => {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied!";
      if (hint) {
        hint.textContent = "Copied to clipboard.";
      }
    } catch (error) {
      console.error("Copy failed", error);
      if (hint) {
        hint.textContent = "Unable to copy. Please try again.";
      }
    } finally {
      setTimeout(() => {
        button.textContent = original;
        if (hint) hint.textContent = hint.dataset.defaultText || hint.textContent;
      }, 1400);
    }
  });
}

async function checkMempool() {
  const statusElement = document.getElementById("status");
  const confirmationsElement = document.getElementById("confirmations");

  if (!statusElement || !confirmationsElement) return;

  try {
    const res = await fetch(`https://mempool.space/api/address/${btcAddress}`);
    const data = await res.json();
    const txs = (data.chain || []).concat(data.mempool || []).reverse();

    if (txs.length === 0) {
      statusElement.textContent = "No incoming transactions detected yet…";
      confirmationsElement.textContent = "0 / 3 confirmations";
      return;
    }

    const latest = txs[0];

    if (latest.status && latest.status.confirmed) {
      statusElement.textContent = "Transaction confirmed";
      confirmationsElement.textContent = `${latest.status.confirmations} confirmations`;
    } else {
      const count = latest.status?.confirmations || 0;
      statusElement.textContent = "Payment detected — awaiting confirmations";
      confirmationsElement.textContent = `${count} / 3 confirmations`;
    }
  } catch (error) {
    console.error(error);
    statusElement.textContent = "Unable to check status right now.";
    confirmationsElement.textContent = "Retrying…";
  }
}

function bootDonationPage() {
  renderQr();
  attachCopy({
    buttonId: "copy-btc",
    text: btcAddress,
    hintId: "btc-copy-hint",
  });
  attachCopy({
    buttonId: "copy-lightning",
    text: lightningAddress,
    hintId: "lightning-copy-hint",
  });

  checkMempool();
  setInterval(checkMempool, 10000);
}

document.addEventListener("DOMContentLoaded", bootDonationPage);
