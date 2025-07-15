// js/dividends.js - 배당수익률 관련 기능

class DividendManager {
  constructor() {
    this.tbody = document.getElementById('dividend-table');
    this.updatedElem = document.getElementById('dividend-last-updated');
    this.tableController = null;
    this.sortDirections = { 
      name: 'asc', 
      price: 'asc', 
      dividend_yield: 'desc', 
      dividend_rate: 'asc', 
      real_time_yield: 'desc', 
      price_change_percent: 'asc' 
    };
    
    this.init();
  }
  
  init() {
    // 컬럼 토글 초기화
    initializeColumnToggle('dividend-column-toggles', 'dividend-table-wrapper');
    
    // 정렬 가능한 테이블 초기화
    this.tableController = createSortableTable('dividend-table-wrapper', this.sortDirections);
    
    // 테이블 정렬 이벤트 리스너
    const table = document.getElementById('dividend-table-wrapper');
    table.addEventListener('tableSorted', (e) => {
      this.renderTable(e.detail.data);
    });
    
    // 데이터 로드
    this.loadData();
  }
  
  async loadData() {
    try {
      const response = await fetch('data/dividends.json');
      if (!response.ok) throw new Error('네트워크 오류');
      
      const data = await response.json();
      this.processData(data);
    } catch (error) {
      console.error('배당 데이터 로드 실패:', error);
      this.showError('데이터 로드 실패');
    }
  }
  
  processData(data) {
    const stockEntries = Object.entries(data).filter(([key]) => key !== 'updated_at');
    
    const tableData = stockEntries.map(([name, info]) => ({
      name,
      price: info.price,
      dividend_yield: parseFloat(info.dividend_yield) || 0,
      dividend_rate: info.dividend_rate,
      real_time_yield: parseFloat(info.real_time_yield) || 0,
      price_change_percent: parseFloat(info.price_change_percent) || 0,
      raw: info
    }));
    
    // 테이블 컨트롤러에 데이터 설정
    this.tableController.setData(tableData);
    
    // 기본 정렬 (실시간 배당수익률 기준 내림차순)
    const sortedData = this.tableController.sortBy('real_time_yield');
    this.renderTable(sortedData);
    
    // 업데이트 시간 표시
    this.updateTimestamp(data.updated_at);
  }
  
  renderTable(data) {
    if (!this.tbody) return;
    
    const fragment = document.createDocumentFragment();
    
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.name}</td>
        <td>${this.formatPrice(row.raw.price)}</td>
        <td>${this.formatPrice(row.raw.dividend_rate)}</td>
        <td>${this.formatPercentage(row.dividend_yield)}</td>
        <td>${this.formatPercentage(row.real_time_yield)}</td>
        <td>${this.formatChangePercentage(row.raw.price_change_percent)}</td>
      `;
      fragment.appendChild(tr);
    });
    
    this.tbody.innerHTML = '';
    this.tbody.appendChild(fragment);
  }
  
  formatPrice(value) {
    return value != null ? value.toLocaleString() : 'N/A';
  }
  
  formatPercentage(value) {
    return value ? value.toFixed(2) + '%' : 'N/A';
  }
  
  formatChangePercentage(value) {
    if (value == null) return 'N/A';
    
    const num = parseFloat(value);
    const color = num > 0 ? 'red' : num < 0 ? 'blue' : 'black';
    const sign = num > 0 ? '+' : '';
    
    return `<span style="color: ${color};">${sign}${num.toFixed(2)}%</span>`;
  }
  
  updateTimestamp(timestamp) {
    if (!this.updatedElem) return;
    
    try {
      const ts = timestamp.replace(/\.\d+/, '');
      const updatedAt = new Date(ts);
      
      this.updatedElem.textContent = isNaN(updatedAt)
        ? '마지막 업데이트: 알 수 없음'
        : `마지막 업데이트: ${updatedAt.toLocaleString('ko-KR')}`;
    } catch (error) {
      this.updatedElem.textContent = '업데이트 시간 파싱 실패';
    }
  }
  
  showError(message) {
    if (this.tbody) {
      this.tbody.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
    }
    if (this.updatedElem) {
      this.updatedElem.textContent = '업데이트 실패';
    }
  }
}

// 페이지 로드 시 배당 매니저 초기화
document.addEventListener('DOMContentLoaded', () => {
  new DividendManager();
});