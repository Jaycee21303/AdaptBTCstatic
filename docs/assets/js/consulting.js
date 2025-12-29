const form = document.getElementById('consulting-form');
const statusEl = document.getElementById('consulting-status');

function setStatus(message, tone) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.remove('success', 'error');
  if (tone) statusEl.classList.add(tone);
}

async function submitConsultingForm(event) {
  event.preventDefault();
  if (!form) return;

  setStatus('Sending…');
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const subject = encodeURIComponent('AdaptBTC consulting request');
    const bodyLines = [
      `Name: ${payload.name || 'N/A'}`,
      `Email: ${payload.email || 'N/A'}`,
      `Engagement: ${payload.engagement || 'N/A'}`,
      `Team size: ${payload.team_size || 'N/A'}`,
      '',
      'Details:',
      payload.details || '(no additional details)',
    ];
    const mailto = `mailto:support@adaptbtc.com?subject=${subject}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
    window.location.href = mailto;
    form.reset();
    setStatus('Opening your email client to finish the request…', 'success');
  } catch (err) {
    setStatus(err.message || 'Something went wrong. Please try again.', 'error');
  }
}

if (form) {
  form.addEventListener('submit', submitConsultingForm);
}
