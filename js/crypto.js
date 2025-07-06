// js/crypto.js
// 실시간 코인 시세: CoinGecko 글로벌가 + Upbit KRW가 + 김치프리미엄

(() => {
  const cryptoTbody = document.getElementById('crypto-table-body');
  const lastUpdatedElem = document.getElementById('last-updated-crypto');

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

      // 2) 업비트 시세 (KRW) - ThingProxy CORS 프록시 사용
      const markets = COINS.map(c => c.market).join(',');
      const upbitUrl = `https://api.upbit.com/v1/ticker?markets=${markets}`;
      const proxyUrl = 'https://thingproxy.freeboard.io/fetch/' + upbitUrl;
      const upRes = await fetch(proxyUrl);
      if (!upRes.ok) throw new Error(`Upbit proxy error ${upRes.status}`);
      const upData = await upRes.json();

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

      // 업데이트 시각 표시
      if (lastUpdatedElem) {
        lastUpdatedElem.textContent = `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;
      }
    } catch (e) {
      console.error('Crypto load error:', e);
      cryptoTbody.innerHTML = '<tr><td colspan="5">코인 시세 로드 실패</td></tr>';
    }
  }

  loadCrypto();
  setInterval(loadCrypto, 60 * 1000);
})();
