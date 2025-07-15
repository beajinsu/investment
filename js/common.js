// js/common.js - 공통 유틸리티 함수들

// 탭 전환 기능
function initializeTabs() {
  const tabs = document.querySelectorAll('.sidebar li');
  const panels = document.querySelectorAll('.tab-panel');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 사이드바 active 교체
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // 패널 전환
      panels.forEach(p => p.classList.remove('active'));
      const targetPanel = document.getElementById(tab.dataset.tab);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// 컬럼 토글 기능 (범용)
function initializeColumnToggle(containerId, tableId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const toggles = container.querySelectorAll('input[type="checkbox"]');
  const table = document.getElementById(tableId);
  
  toggles.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const key = checkbox.dataset.key;
      const allTh = Array.from(table.querySelectorAll('thead th'));
      const idx = allTh.findIndex(th => th.dataset.key === key);
      
      if (idx === -1) return;
      
      const display = checkbox.checked ? '' : 'none';
      
      // 헤더 토글
      allTh[idx].style.display = display;
      
      // 바디 셀 토글
      table.querySelectorAll('tbody tr').forEach(tr => {
        if (tr.children[idx]) {
          tr.children[idx].style.display = display;
        }
      });
    });
  });
}

// 테이블 정렬 기능 (범용)
function createSortableTable(tableId, sortDirections = {}) {
  const table = document.getElementById(tableId);
  if (!table) return null;
  
  const headers = table.querySelectorAll('th[data-key]');
  let tableData = [];
  
  const sortTable = (th) => {
    const key = th.dataset.key;
    const dir = sortDirections[key] || 'asc';
    
    tableData.sort((a, b) => {
      if (key === 'name' || typeof a[key] === 'string') {
        return dir === 'asc' 
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]);
      }
      return dir === 'asc' ? a[key] - b[key] : b[key] - a[key];
    });
    
    sortDirections[key] = dir === 'asc' ? 'desc' : 'asc';
    
    // 정렬 표시 업데이트
    headers.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
    th.classList.add(dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    
    return tableData;
  };
  
  headers.forEach(th => {
    th.addEventListener('click', () => {
      const sortedData = sortTable(th);
      // 정렬 후 렌더링은 각 모듈에서 처리
      const event = new CustomEvent('tableSorted', { 
        detail: { data: sortedData, key: th.dataset.key }
      });
      table.dispatchEvent(event);
    });
  });
  
  return {
    setData: (data) => { tableData = data; },
    getData: () => tableData,
    sortBy: (key) => {
      const th = table.querySelector(`th[data-key="${key}"]`);
      if (th) {
        return sortTable(th);
      }
      return tableData;
    }
  };
}

// 페이지 로드 시 공통 기능 초기화
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
});