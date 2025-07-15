/**
 * crypto.js
 * '코인 시세' 탭의 모든 기능을 담당합니다.
 */
document.addEventListener('DOMContentLoaded', () => {
  const cryptoTableBody = document.getElementById('crypto-table-body');
  // 추적할 코인 목록
  const coinIds = ['bitcoin', 'ethereum', 'ripple', 'dogecoin', 'solana'];

  // 이 스크립트에서만 사용할 스타일을 동적으로 생성하여 head에 추가합니다.
  // 이렇게 하면 다른 탭에 영향을 주지 않고 코인 시세표의 스타일만 독립적으로 관리할 수 있습니다.
  const style = document.createElement('style');
  style.textContent = `
    #crypto-table-body td {
      border-bottom: 1px solid #e0e0e0; /* 각 행 아래에 구분선 추가 */
      text-align: center; /* 셀 내용 가운데 정렬 */
      vertical-align: middle;
    }
    #crypto-table-body td:first-child {
      text-align: left; /* 첫 번째 셀(코인 이름)만 왼쪽 정렬 */
    }
    #crypto-table-body tr:last-child td {
      border-bottom: none; /* 테이블의 마지막 행은 하단 선을 제거하여 깔끔하게 보이도록 함 */
    }
  `;
  document.head.appendChild(style);


  /**
   * CoinGecko API를 호출하여 코인 데이터를 가져오는 함수
   */
  async function fetchCryptoData() {
    // API 호출 URL 생성
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=krw,usd&include_24hr_change=true`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }
      const data = await response.json();
      renderCryptoTable(data);
    } catch (error) {
      console.error("코인 데이터 로드 실패:", error);
      const colSpan = cryptoTableBody.previousElementSibling.firstElementChild.cells.length;
      cryptoTableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;">데이터를 불러오는 데 실패했습니다.</td></tr>`;
    }
  }

  /**
   * 가져온 데이터를 바탕으로 코인 시세 테이블을 그리는 함수
   * @param {object} data - CoinGecko API로부터 받은 데이터
   */
  function renderCryptoTable(data) {
    const fragment = document.createDocumentFragment();

    coinIds.forEach(id => {
      const coinData = data[id];
      if (!coinData) return;

      const globalPrice = coinData.krw;
      // '업비트가'는 예시를 위해 글로벌가에 0.5% ~ 1.5%의 프리미엄을 무작위로 적용합니다.
      const upbitPrice = globalPrice * (1 + (Math.random() * 0.01 + 0.005));
      const kimchiPremium = ((upbitPrice / globalPrice) - 1) * 100;
      const change24h = coinData.krw_24h_change;

      const tr = document.createElement('tr');
      const changeColor = change24h > 0 ? 'color: #d23f31;' : 'color: #1e88e5;';
      const premiumColor = kimchiPremium > 0 ? 'color: #d23f31;' : 'color: #1e88e5;';
      
      // 인라인 스타일에서 정렬 부분을 제거하고, 동적으로 추가된 스타일 시트에 의존하도록 수정합니다.
      tr.innerHTML = `
        <td><strong>${id.charAt(0).toUpperCase() + id.slice(1)}</strong></td>
        <td>₩${globalPrice.toLocaleString()}</td>
        <td>₩${upbitPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
        <td style="${premiumColor}">${kimchiPremium.toFixed(2)}%</td>
        <td style="${changeColor}">${change24h.toFixed(2)}%</td>
      `;
      fragment.appendChild(tr);
    });

    cryptoTableBody.innerHTML = '';
    cryptoTableBody.appendChild(fragment);
  }

  // 페이지 로드 시 즉시 데이터를 가져오고,
  fetchCryptoData();
  // 그 후 1분(60000ms)마다 자동으로 데이터를 갱신합니다.
  setInterval(fetchCryptoData, 60000);
});
