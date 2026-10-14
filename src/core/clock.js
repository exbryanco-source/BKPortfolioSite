/** Live clock for any [data-clock] element (footer "SGT 09:41"), in Singapore time. */
export function initClock() {
  const clocks = document.querySelectorAll('[data-clock]');
  if (!clocks.length) return;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' });
  const tick = () => clocks.forEach((c) => (c.textContent = fmt.format(new Date())));
  tick();
  setInterval(tick, 30_000);
}
