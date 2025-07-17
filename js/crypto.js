// js/crypto.js - 로컬 JSON 파일 우선 사용

class CryptoManager {
  constructor() {
    this.tbody = document.getElementById('crypto-table-body');
    this.updatedElem = document.getElementById('crypto-last-updated');
    this.exchangeRateElem = document.getElementById('crypto-exchange-rate');
    this.tableController = null;
    this.updateInterval = null;
    this.sortDirections = { 
      coin: 'asc', 
      global_price_usd: 'desc',
      global_price_krw: 'desc', 
      upbit_price: 'desc',
      kimchi_premium: 'desc', 
      change_24h: 'desc' 
    };
    
    this.init();
  }
  
  init() {
    // 컬럼 토글 초기화
    initializeColumnToggle('crypto-column-toggles', 'crypto-table-wrapper');
    
    // 정렬 가능한 테이블 초기화
    this.tableController = createSortableTable('crypto-table-wrapper', this.sortDirections);
    
    // 테이블 정렬 이벤트 리스너
    const table = document.getElementById('crypto-table-wrapper');
    table.addEventListener('tableSorted', (e) => {
      this.renderTable(e.detail.data);
    });
    
    // 초기 데이터 로드
    this.loadData();
  }
  
  async loadData() {
    try {
      // 먼저 로컬 JSON 파일 시도
      const response = await fetch(`data/crypto.json?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('JSON 파일을 찾을 수 없습니다');
      }
      
      const data = await response.json();
      
      // exchange_rate_cache.json도 로드
      try {
        const cacheResponse = await fetch(`data/exchange_rate_cache.json?t=${Date.now()}`);
        if (cacheResponse.ok) {
          const cacheData = await cacheResponse.json();
          data.exchange_rate.cache_timestamp = cacheData.timestamp;
        }
      } catch (error) {
        console.warn('환율 캐시 파일 로드 실패:', error);
      }
      
      this.processJSONData(data);
    } catch (error) {
      console.error('로컬 JSON 파일 로드 실패:', error);
      this.showJSONError();
    }
  }
  
  processJSONData(data) {
    if (!data.coins || !Array.isArray(data.coins)) {
      throw new Error('잘못된 데이터 형식');
    }
    
    // 테이블 컨트롤러에 데이터 설정
    this.tableController.setData(data.coins);
    
    // 기본 정렬 (김치프리미엄 기준 내림차순)
    const sortedData = this.tableController.sortBy('kimchi_premium');
    this.renderTable(sortedData);
    
    // 업데이트 시간 표시
    this.updateTimestamp(data.updated_at);
    
    // 환율 정보 표시
    this.updateExchangeRate(data.exchange_rate);
  }
  
  renderTable(data) {
    if (!this.tbody) return;
    
    const fragment = document.createDocumentFragment();
    
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.coin}</td>
        <td>${this.formatUSD(row.global_price_usd)}</td>
        <td>${this.formatKRW(row.global_price_krw)}</td>
        <td>${this.formatKRW(row.upbit_price)}</td>
        <td>${this.formatKimchiPremium(row.kimchi_premium)}</td>
        <td>${this.formatChange24h(row.change_24h)}</td>
      `;
      fragment.appendChild(tr);
    });
    
    this.tbody.innerHTML = '';
    this.tbody.appendChild(fragment);
  }
  
  formatUSD(value) {
    if (value == null) return 'N/A';
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 1 ? 6 : 2
    }).format(value);
  }
  
  formatKRW(value) {
    if (value == null) return 'N/A';
    
    // 1000원 미만은 소수점 표시
    if (value < 1000) {
      return new Intl.NumberFormat('ko-KR', { 
        style: 'currency', 
        currency: 'KRW',
        maximumFractionDigits: 2
      }).format(value);
    }
    
    // 1000원 이상은 정수 표시
    return new Intl.NumberFormat('ko-KR', { 
      style: 'currency', 
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(value);
  }
  
  formatKimchiPremium(value) {
    if (value == null) return 'N/A';
    
    const num = parseFloat(value);
    const color = num > 0 ? 'red' : num < 0 ? 'blue' : 'black';
    const sign = num > 0 ? '+' : '';
    
    return `<span style="color: ${color};">${sign}${num.toFixed(2)}%</span>`;
  }
  
  formatChange24h(value) {
    if (value == null) return 'N/A';
    
    const num = parseFloat(value);
    const color = num > 0 ? 'red' : num < 0 ? 'blue' : 'black';
    const sign = num > 0 ? '+' : '';
    
    return `<span style="color: ${color};">${sign}${num.toFixed(2)}%</span>`;
  }
  
  updateTimestamp(timestamp) {
    if (!this.updatedElem) return;
    
    try {
      const updatedAt = new Date(timestamp);
      const now = new Date();
      const timeDiff = Math.floor((now - updatedAt) / 1000);
      
      let timeAgo = '';
      if (timeDiff < 60) {
        timeAgo = `${timeDiff}초 전`;
      } else if (timeDiff < 3600) {
        timeAgo = `${Math.floor(timeDiff / 60)}분 전`;
      } else {
        timeAgo = `${Math.floor(timeDiff / 3600)}시간 전`;
      }
      
      this.updatedElem.textContent = isNaN(updatedAt)
        ? '마지막 업데이트: 알 수 없음'
        : `마지막 업데이트: ${updatedAt.toLocaleString('ko-KR')} (${timeAgo})`;
    } catch (error) {
      this.updatedElem.textContent = '업데이트 시간 파싱 실패';
    }
  }
  
  updateExchangeRate(exchangeRateInfo) {
    if (!this.exchangeRateElem || !exchangeRateInfo) return;
    
    try {
      const rate = exchangeRateInfo.usd_to_krw;
      const source = exchangeRateInfo.source || 'Unknown';
      
      // 환율 캐시 파일의 실제 타임스탬프 사용
      const timestamp = exchangeRateInfo.cache_timestamp;
      if (timestamp) {
        const lastUpdated = new Date(timestamp);
        const exchangeUpdated = lastUpdated.toLocaleString('ko-KR');
        
        this.exchangeRateElem.textContent = 
          `환율: 1 USD = ${rate.toLocaleString('ko-KR')} KRW (출처: ${source}, 업데이트: ${exchangeUpdated})`;
      } else {
        // 캐시 타임스탬프가 없는 경우
        this.exchangeRateElem.textContent = 
          `환율: 1 USD = ${rate.toLocaleString('ko-KR')} KRW (출처: ${source})`;
      }
    } catch (error) {
      this.exchangeRateElem.textContent = '환율 정보 파싱 실패';
    }
  }
  
  showJSONError() {
    if (this.tbody) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: #e74c3c; font-weight: bold; padding: 30px;">
            📁 데이터 파일 없음<br>
            <small style="color: #7f8c8d; font-weight: normal;">
              <code>data/crypto.json</code> 파일이 없습니다.<br>
              GitHub Actions를 통해 데이터를 생성하거나<br>
              직접 JSON 파일을 생성해주세요.
            </small><br>
            <button onclick="cryptoManager.retryLoad()" style="margin-top: 15px; padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">
              🔄 다시 시도
            </button>
          </td>
        </tr>
      `;
    }
    if (this.updatedElem) {
      this.updatedElem.textContent = '데이터 파일 없음';
    }
    if (this.exchangeRateElem) {
      this.exchangeRateElem.textContent = '환율 정보 없음';
    }
  }
  
  retryLoad() {
    if (this.tbody) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px;">
            🔄 데이터 파일 다시 읽는 중...
          </td>
        </tr>
      `;
    }
    this.loadData();
  }
}

// 페이지 로드 시 코인 매니저 초기화
let cryptoManager;
document.addEventListener('DOMContentLoaded', () => {
  cryptoManager = new CryptoManager();
});