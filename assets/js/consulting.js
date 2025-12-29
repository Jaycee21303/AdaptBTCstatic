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
    const response = await fetch('/api/consulting/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || 'Unable to send request');
    }

    form.reset();
    setStatus('Request sent! We will respond from support@adaptbtc.com.', 'success');
  } catch (err) {
    setStatus(err.message || 'Something went wrong. Please try again.', 'error');
  }
}

if (form) {
  form.addEventListener('submit', submitConsultingForm);
}
