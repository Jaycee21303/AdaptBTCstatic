const STATIC_MODE = Boolean(document.documentElement?.dataset?.staticMode || window.isStaticSite);
const PROGRESS_KEY = 'adaptbtc_portal_progress';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch (error) {
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function renderProgressBadges(progress) {
  document.querySelectorAll('[data-lesson-item]').forEach(item => {
    const courseId = item.dataset.courseId;
    const lessonOrder = Number(item.dataset.lessonOrder);
    const pill = item.querySelector('[data-complete-pill]');
    const completed = progress?.[courseId]?.includes(lessonOrder);
    if (pill) {
      pill.hidden = !completed;
    }
  });
}

function markLessonComplete(formId, courseId, lessonOrder) {
  const form = document.getElementById(formId);
  if (!form) return;

  if (STATIC_MODE) {
    const progress = loadProgress();
    const existing = new Set(progress[courseId] || []);
    existing.add(Number(lessonOrder));
    progress[courseId] = Array.from(existing);
    saveProgress(progress);
    renderProgressBadges(progress);
    const banner = document.querySelector('[data-portal-status]');
    if (banner) {
      banner.textContent = 'Progress saved to this browser.';
      banner.classList.add('positive');
    }
    return;
  }

  form.submit();
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

  // Apply client-side progress in static mode
  if (STATIC_MODE) {
    renderProgressBadges(loadProgress());
  }

  // Static quiz grading
  document.querySelectorAll('[data-quiz-payload]').forEach(form => {
    const raw = form.dataset.quizPayload || '[]';
    let questions = [];
    try {
      questions = JSON.parse(raw);
    } catch (error) {
      questions = [];
    }

    if (!questions.length) return;

    form.addEventListener('submit', event => {
      if (!STATIC_MODE) return;
      event.preventDefault();
      const answers = questions.map((_, idx) => Number(form.querySelector(`input[name="q${idx}"]:checked`)?.value ?? -1));
      const graded = questions.map((question, idx) => {
        const isCorrect = answers[idx] === question.answer;
        return {
          prompt: question.prompt,
          options: question.options,
          explanation: question.explanation,
          correctAnswer: question.answer,
          isCorrect,
          userAnswer: answers[idx],
        };
      });

      const correct = graded.filter(item => item.isCorrect).length;
      const total = graded.length || 1;
      const score = correct / total;
      const resultsEl = document.getElementById('quiz-results');
      if (resultsEl) {
        resultsEl.innerHTML = `
          <div class="quiz-results">
            <h3>Your score: ${(score * 100).toFixed(1)}%</h3>
            <p class="muted">${correct} of ${total} correct. Answers are stored locally only.</p>
            <div class="graded-list">
              ${graded
                .map(
                  (item, idx) => `
                    <div class="graded-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                      <p><strong>Q${idx + 1}.</strong> ${item.prompt}</p>
                      <p class="muted">Correct: ${'ABCD'[item.correctAnswer] || '?'} · You chose ${
                        item.userAnswer >= 0 ? 'ABCD'[item.userAnswer] : '—'
                      }</p>
                      <p class="small muted">${item.explanation || ''}</p>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>
        `;
        resultsEl.hidden = false;
        resultsEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
