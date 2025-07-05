const tabs = document.querySelectorAll('.sidebar li');
const panels = document.querySelectorAll('.tab-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    panels.forEach(p => p.classList.remove('active'));
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});