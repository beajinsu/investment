// js/crypto.js - CORS 프록시를 사용한 코인 시세 관리

class CryptoManager {
  constructor() {
    this.tbody = document.getElementById('crypto-table-body');
    this.updatedElem = document.getElementById('crypto-last-updated');
    this.tableController = null;
    this.updateInterval = null;
    this.sortDirections = { 
      coin: 'asc', 
      global_price: 'desc', 
      upbit_price: 'desc', 
      kimchi_premium: 'desc', 
      change_24h: 'desc' 
    };
    
    // CORS 프록시 사용
    this.CORS_PROXY = 'https://api.allorigins.win/raw?url=';
    this.COINGECKO_API = 'https://api.coingecko.com/api/v3';
    this.UPBIT_API = 'https://api.upbit.com/v1';
    this.EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
    
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
    
    // 2분마다 자동 갱신 (API 부하 고려)
    this.updateInterval = setInterval(() => {
      this.loadData();
    }, 120000);
  }
  
  async loadData() {
    try {
      // 순차적으로 API 호출 (프록시 서버 부하 고려)
      console.log('글로벌 시세 조회 중...');
      const globalData = await this.fetchGlobalPrices();
      
      console.log('업비트 시세 조회 중...');
      const upbitData = await this.fetchUpbitPrices();
      
      console.log('환율 정보 조회 중...');
      const exchangeRate = await this.fetchExchangeRate();
      
      this.processRealData(globalData, upbitData, exchangeRate);
    } catch (error) {
      console.error('코인 데이터 로드 실패:', error);
      this.showAPIError(error.message);
    }
  }
  
  async fetchGlobalPrices() {
    const coins = ['bitcoin', 'ethereum', 'ripple', 'cardano', 'solana'];
    const url = `${this.COINGECKO_API}/simple/price?ids=${coins.join(',')}&vs_currencies=usd&include_24hr_change=true`;
    
    try {
      const response = await fetch(`${this.CORS_PROXY}${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error(`CoinGecko API 오류: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      // 프록시 실패 시 직접 시도
      const directResponse = await fetch(url);
      if (!directResponse.ok) {
        throw new Error(`CoinGecko API 오류: ${directResponse.status}`);
      }
      return await directResponse.json();
    }
  }
  
  async fetchUpbitPrices() {
    const markets = ['KRW-BTC', 'KRW-ETH', 'KRW-XRP', 'KRW-ADA', 'KRW-SOL'];
    const url = `${this.UPBIT_API}/ticker?markets=${markets.join(',')}`;
    
    try {
      const response = await fetch(`${this.CORS_PROXY}${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error(`Upbit API 오류: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      // 프록시 실패 시 직접 시도
      const directResponse = await fetch(url);
      if (!directResponse.ok) {
        throw new Error(`Upbit API 오류: ${directResponse.status}`);
      }
      return await directResponse.json();
    }
  }
  
  async fetchExchangeRate() {
    try {
      const response = await fetch(`${this.CORS_PROXY}${encodeURIComponent(this.EXCHANGE_RATE_API)}`);
      if (!response.ok) {
        throw new Error(`환율 API 오류: ${response.status}`);
      }
      const data = await response.json();
      return data.rates.KRW;
    } catch (error) {
      // 프록시 실패 시 직접 시도
      const directResponse = await fetch(this.EXCHANGE_RATE_API);
      if (!directResponse.ok) {
        throw new Error(`환율 API 오류: ${directResponse.status}`);
      }
      const data = await directResponse.json();
      return data.rates.KRW;
    }
  }
  
  processRealData(globalData, upbitData, exchangeRate) {
    const coinMapping = {
      'bitcoin': { upbit: 'KRW-BTC', name: 'Bitcoin', symbol: 'BTC' },
      'ethereum': { upbit: 'KRW-ETH', name: 'Ethereum', symbol: 'ETH' },
      'ripple': { upbit: 'KRW-XRP', name: 'XRP', symbol: 'XRP' },
      'cardano': { upbit: 'KRW-ADA', name: 'Cardano', symbol: 'ADA' },
      'solana': { upbit: 'KRW-SOL', name: 'Solana', symbol: 'SOL' }
    };
    
    const tableData = Object.entries(coinMapping).map(([coinId, info]) => {
      const globalPrice = globalData[coinId];
      const upbitPrice = upbitData.find(item => item.market === info.upbit);
      
      if (!globalPrice || !upbitPrice) return null;
      
      const globalPriceKRW = globalPrice.usd * exchangeRate;
      const upbitPriceKRW = upbitPrice.trade_price;
      const kimchiPremium = ((upbitPriceKRW - globalPriceKRW) / globalPriceKRW) * 100;
      
      return {
        coin: `${info.name} (${info.symbol})`,
        global_price: globalPriceKRW,
        upbit_price: upbitPriceKRW,
        kimchi_premium: kimchiPremium,
        change_24h: globalPrice.usd_24h_change,
        raw: {
          global: globalPrice,
          upbit: upbitPrice,
          exchange_rate: exchangeRate
        }
      };
    }).filter(Boolean);
    
    // 테이블 컨트롤러에 데이터 설정
    this.tableController.setData(tableData);
    
    // 기본 정렬 (김치프리미엄 기준 내림차순)
    const sortedData = this.tableController.sortBy('kimchi_premium');
    this.renderTable(sortedData);
    
    // 업데이트 시간 표시
    this.updateTimestamp(new Date().toISOString());
  }
  
  renderTable(data) {
    if (!this.tbody) return;
    
    const fragment = document.createDocumentFragment();
    
    data.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.coin}</td>
        <td>${this.formatKRW(row.global_price)}</td>
        <td>${this.formatKRW(row.upbit_price)}</td>
        <td>${this.formatKimchiPremium(row.kimchi_premium)}</td>
        <td>${this.formatChange24h(row.change_24h)}</td>
      `;
      fragment.appendChild(tr);
    });
    
    this.tbody.innerHTML = '';
    this.tbody.appendChild(fragment);
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
    
    const color = value > 0 ? '#e74c3c' : value < 0 ? '#3498db' : '#2c3e50';
    const sign = value > 0 ? '+' : '';
    const fontWeight = Math.abs(value) > 3 ? 'bold' : 'normal';
    
    return `<span style="color: ${color}; font-weight: ${fontWeight};">${sign}${value.toFixed(2)}%</span>`;
  }
  
  formatChange24h(value) {
    if (value == null) return 'N/A';
    
    const color = value > 0 ? '#e74c3c' : value < 0 ? '#3498db' : '#2c3e50';
    const sign = value > 0 ? '+' : '';
    
    return `<span style="color: ${color};">${sign}${value.toFixed(2)}%</span>`;
  }
  
  updateTimestamp(timestamp) {
    if (!this.updatedElem) return;
    
    try {
      const updatedAt = new Date(timestamp);
      this.updatedElem.textContent = isNaN(updatedAt)
        ? '마지막 업데이트: 알 수 없음'
        : `마지막 업데이트: ${updatedAt.toLocaleString('ko-KR')}`;
    } catch (error) {
      this.updatedElem.textContent = '업데이트 시간 파싱 실패';
    }
  }
  
  showAPIError(errorMessage = '') {
    if (this.tbody) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: #e74c3c; font-weight: bold; padding: 30px;">
            ⚠️ API 연결 실패<br>
            <small style="color: #7f8c8d; font-weight: normal;">
              코인 시세 API에 연결할 수 없습니다.<br>
              ${errorMessage ? `오류: ${errorMessage}` : ''}
              <br><br>
              <strong>CORS 정책으로 인한 제한일 수 있습니다.</strong>
            </small><br>
            <button onclick="cryptoManager.retryAPI()" style="margin-top: 15px; padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">
              🔄 다시 시도
            </button>
          </td>
        </tr>
      `;
    }
    if (this.updatedElem) {
      this.updatedElem.textContent = '업데이트 실패 - API 연결 오류';
    }
  }
  
  retryAPI() {
    if (this.tbody) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 30px;">
            🔄 API 재연결 시도 중...<br>
            <small style="color: #7f8c8d;">프록시 서버를 통해 연결을 시도합니다.</small>
          </td>
        </tr>
      `;
    }
    if (this.updatedElem) {
      this.updatedElem.textContent = '재연결 시도 중...';
    }
    this.loadData();
  }
  
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// 페이지 로드 시 코인 매니저 초기화
let cryptoManager;
document.addEventListener('DOMContentLoaded', () => {
  cryptoManager = new CryptoManager();
});