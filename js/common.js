// js/common.js - 공통 유틸리티 함수들 (테마 매니저 연동)

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

// 테마 인식 유틸리티 함수들
const CommonUtils = {
  // 현재 테마 확인
  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  },
  
  // 다크모드 여부 확인
  isDarkMode() {
    return this.getCurrentTheme() === 'dark';
  },
  
  // 테마별 조건부 값 반환
  getThemeValue(lightValue, darkValue) {
    return this.isDarkMode() ? darkValue : lightValue;
  },
  
  // CSS 변수 값 가져오기
  getCSSVariable(varName) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName).trim();
  },
  
  // 테마별 색상 팔레트 반환
  getColorPalette() {
    const isDark = this.isDarkMode();
    return {
      primary: isDark ? '#4da6ff' : '#007bff',
      success: isDark ? '#2ecc71' : '#27ae60',
      warning: isDark ? '#f39c12' : '#e67e22',
      danger: isDark ? '#e74c3c' : '#c0392b',
      text: this.getCSSVariable('--text-color'),
      background: this.getCSSVariable('--bg-color'),
      border: this.getCSSVariable('--border-color')
    };
  }
};

// 전역 테마 변경 감지 (다른 모듈에서 사용 가능)
function onGlobalThemeChange(callback) {
  window.addEventListener('themeChanged', (event) => {
    callback(event.detail.theme);
  });
}

// 페이지 로드 시 공통 기능 초기화
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  
  // 전역 테마 변경 감지 설정
  onGlobalThemeChange((theme) => {
    console.log('Common.js: 테마 변경 감지됨:', theme);
    
    // 여기에 테마 변경 시 공통으로 처리할 로직 추가
    // 예: 차트 라이브러리 테마 업데이트, 커스텀 컴포넌트 색상 변경 등
  });
});