/**
 * main.js
 * 공통 UI 로직을 처리합니다. (예: 탭 전환)
 */
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.sidebar li');
  const panels = document.querySelectorAll('.content .tab-panel');

  // 사이드바 탭 클릭 이벤트 처리
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 모든 탭과 패널에서 'active' 클래스 제거
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      // 클릭된 탭과 해당하는 패널에 'active' 클래스 추가
      tab.classList.add('active');
      const targetPanel = document.getElementById(tab.dataset.tab);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
});
