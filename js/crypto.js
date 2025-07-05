// js/crypto.js
// 실시간 코인 시세: CoinGecko 글로벌가 + Upbit KRW가 + 김치프리미엄

(() => {
  // 테이블 바디 엘리먼트를 클로저 내부 변수로 선언
  const cryptoTbody = document.getElementById('crypto-table-body');

  // 조회할 코인과 Upbit 마켓 코드 매핑
  const COINS = [
    { id: 'bitcoin',  name: '비트코인',  market: 'KRW-BTC' },
    { id: 'ethereum', name: '이더리움',  market: 'KRW-ETH' },
    { id: 'ripple',   name: '리플',      market: 'KRW-XRP' }
  ];

  async function loadCrypto() {
    try {
      // 1) 글로벌 가격 + 24h 변동 (CoinGecko)
      const ids = COINS.map(c => c.id).join(',');
      const geoUrl =
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}` +
        `&vs_currencies=krw&include_24hr_change=true`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      // 2) 업비트 시세 (KRW) - CORS 우회용 AllOrigins 프록시 사용
      const markets = COINS.map(c => c.market).join(',');
      const upbitUrl = `https://api.upbit.com/v1/ticker?markets=${markets}`;
      const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(upbitUrl);
      const upRes = await fetch(proxyUrl);
      const upData = await upRes.json();

      // 3) 테이블 렌더링
      cryptoTbody.innerHTML = '';
      COINS.forEach((coin, i) => {
        const globalPrice = geoData[coin.id].krw;
        const change24    = geoData[coin.id].krw_24h_change;
        const upbitPrice  = upData[i].trade_price;
        const kimchi = ((upbitPrice - globalPrice) / globalPrice) * 100;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${coin.name}</td>
          <td>${globalPrice.toLocaleString()}원</td>
          <td>${upbitPrice.toLocaleString()}원</td>
          <td>${kimchi.toFixed(2)}%</td>
          <td>${change24 != null ? change24.toFixed(2) + '%' : 'N/A'}</td>
        `;
        cryptoTbody.appendChild(tr);
      });
    } catch (e) {
      console.error('Crypto load error:', e);
      cryptoTbody.innerHTML = '<tr><td colspan="5">코인 시세 로드 실패</td></tr>';
    }
  }

  // 초기 로드 및 1분마다 갱신
  loadCrypto();
  setInterval(loadCrypto, 60 * 1000);
})();
