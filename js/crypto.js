// js/crypto.js
// 빗썸(Bithumb) vs 바이낸스(Binance) 가격 비교 + 김치 프리미엄

(() => {
  const tbody = document.getElementById('crypto-table-body');
  const lastUpdated = document.getElementById('last-updated-crypto');

  // 비교할 코인 설정
  const COINS = [
    { name: '비트코인',   binSymbol: 'BTCUSDT', bithumbPair: 'BTC_KRW' },
    { name: '이더리움',   binSymbol: 'ETHUSDT', bithumbPair: 'ETH_KRW' },
    { name: '리플',       binSymbol: 'XRPUSDT', bithumbPair: 'XRP_KRW' }
  ];

  // CORS 프록시
  const PROXY = 'https://thingproxy.freeboard.io/fetch/';

  async function loadCrypto() {
    try {
      // 1) USDT → KRW 환율 (CoinGecko, 프록시 우회)
      const rateUrl = 
        'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=krw';
      const rateRes = await fetch(PROXY + rateUrl);
      if (!rateRes.ok) throw new Error(`환율 호출 실패: ${rateRes.status}`);
      const rateData = await rateRes.json();
      const usdtToKrw = rateData.tether.krw;

      // 2) Binance 가격(USDT) 직접 호출
      const binPromises = COINS.map(c =>
        fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${c.binSymbol}`)
          .then(res => {
            if (!res.ok) throw new Error(`Binance ${c.name} 호출 실패`);
            return res.json();
          })
      );

      // 3) Bithumb 가격(KRW) 프록시 우회 호출
      const bithPromises = COINS.map(c => {
        const url = `https://api.bithumb.com/public/ticker/${c.bithumbPair}`;
        return fetch(PROXY + encodeURIComponent(url))
          .then(res => {
            if (!res.ok) throw new Error(`Bithumb ${c.name} 호출 실패`);
            return res.json();
          });
      });

      const binData   = await Promise.all(binPromises);
      const bithData  = await Promise.all(bithPromises);

      // 4) 테이블 렌더링
      tbody.innerHTML = '';
      COINS.forEach((c, i) => {
        const priceUsdt      = parseFloat(binData[i].price);
        const priceBinKrw    = priceUsdt * usdtToKrw;
        const priceBithumb   = parseFloat(bithData[i].data.closing_price);
        const kimchiPremium  = ((priceBithumb - priceBinKrw) / priceBinKrw) * 100;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${c.name}</td>
          <td>${priceBinKrw.toLocaleString(undefined, { maximumFractionDigits: 0 })}원</td>
          <td>${priceBithumb.toLocaleString()}원</td>
          <td>${kimchiPremium.toFixed(2)}%</td>
        `;
        tbody.appendChild(tr);
      });

      // 5) 최종 업데이트 시각
      if (lastUpdated) {
        lastUpdated.textContent = `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;
      }

    } catch (e) {
      console.error('Crypto load error:', e);
      tbody.innerHTML = '<tr><td colspan="4">코인 시세 로드 실패</td></tr>';
    }
  }

  // 초기 로드 + 1분마다 갱신
  loadCrypto();
  setInterval(loadCrypto, 60 * 1000);
})();