function markLessonComplete(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.submit();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('[data-pill-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  const renderChart = (canvas, points, labels, color) => {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.clientWidth;
    const height = canvas.height = canvas.clientHeight;
    const barWidth = Math.max(24, (width / points.length) - 12);
    const max = Math.max(...points, 1);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, width, height);
    points.forEach((val, idx) => {
      const x = idx * (barWidth + 12) + 10;
      const barHeight = (val / max) * (height - 50);
      ctx.fillStyle = color;
      ctx.roundRect(x, height - barHeight - 20, barWidth, barHeight, 8);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillText(labels[idx] || `Item ${idx + 1}`, x, height - 6);
    });
  };

  const hydrateCharts = () => {
    document.querySelectorAll('[data-chart]').forEach(card => {
      const canvas = card.querySelector('canvas');
      if (!canvas) return;
      const points = (card.dataset.points || '').split(',').map(n => parseInt(n.trim(), 10)).filter(Boolean);
      const labels = (card.dataset.labels || '').split('|');
      const color = card.dataset.color || '#2563eb';
      if (points.length) {
        renderChart(canvas, points, labels, color);
      }
    });

    document.querySelectorAll('.lesson-chart').forEach(canvas => {
      if (canvas.dataset.rendered) return;
      const points = (canvas.dataset.points || '').split(',').map(n => parseInt(n.trim(), 10)).filter(Boolean);
      const labels = (canvas.dataset.labels || '').split('|');
      const color = canvas.dataset.color || '#2563eb';
      if (points.length) {
        renderChart(canvas, points, labels, color);
        canvas.dataset.rendered = 'true';
      }
    });
  };

  if (typeof HTMLCanvasElement.prototype.roundRect !== 'function') {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const radius = typeof r === 'number' ? r : 8;
      this.beginPath();
      this.moveTo(x + radius, y);
      this.lineTo(x + w - radius, y);
      this.quadraticCurveTo(x + w, y, x + w, y + radius);
      this.lineTo(x + w, y + h - radius);
      this.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      this.lineTo(x + radius, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - radius);
      this.lineTo(x, y + radius);
      this.quadraticCurveTo(x, y, x + radius, y);
      this.closePath();
    };
  }

  hydrateCharts();
});
