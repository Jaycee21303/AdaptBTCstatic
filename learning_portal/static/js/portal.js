function markLessonComplete(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.submit();
  }
}
