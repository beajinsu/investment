import yfinance as yf
import json
import os
from datetime import datetime, timedelta, timezone


def trailing_dividends(ticker):
    """최근 365일 동안 실제로 지급(배당락)된 주당 배당금 합계와 건별 내역.

    yfinance 의 info["dividendRate"] 는 '가장 최근 배당 × 연간 지급 횟수'인 예상치라서
    특별배당이 한 번 나오면 크게 부풀려진다 (예: 삼성전자 2026년 3분기 4,601원 × 4 = 18,404원).
    그래서 실제 지급 이력(Ticker.dividends)을 더해 쓴다.
    """
    divs = ticker.dividends
    if divs is None or len(divs) == 0:
        return None, []
    cutoff = datetime.now(timezone.utc) - timedelta(days=365)
    idx = divs.index
    if idx.tz is None:
        idx = idx.tz_localize("UTC")
    recent = divs[idx >= cutoff]
    if len(recent) == 0:
        return 0.0, []
    return float(recent.sum()), [float(x) for x in recent.values]


def has_special(amounts):
    """최근 1년 배당 중 중앙값의 3배를 넘는 건이 있으면 특별배당이 섞인 것으로 본다."""
    if len(amounts) < 2:
        return False
    s = sorted(amounts)
    median = s[len(s) // 2] if len(s) % 2 else (s[len(s) // 2 - 1] + s[len(s) // 2]) / 2
    return median > 0 and max(amounts) > 3 * median

STOCKS = {
    # [미국 주식]
    "TLT": "TLT",
    "알트리아": "MO",
    "버라이즌": "VZ",
    "리얼티 인컴": "O",
    "화이자": "PFE",

    # [국내 ETF - 신규 추가]
    "KODEX 금융고배당": "498410.KS", 
    "KODEX 200타겟": "498400.KS",
    "케이카": "381970.KS",    

    # [국내 주식 - 기존 유지]
    "하나금융지주": "086790.KS",
    "우리금융지주": "316140.KS",
    "삼성카드": "029780.KS",
    "현대차2우B": "005387.KS",
    "SK텔레콤": "017670.KS",
    "삼성화재우": "000815.KS",
    "BNK 금융지주": "138930.KS",
    "NH투자증권우": "005945.KS",
    "LG유플러스": "032640.KS",
    "HD현대": "267250.KS",
    "KT": "030200.KS",
    "삼성전자": "005930.KS",
    "삼성전자우": "005935.KS",
}

results = {}
for name, symbol in STOCKS.items():
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        price = info.get("currentPrice") or info.get("previousClose") or None
        prev_close = info.get("previousClose") or None
        dy = info.get("dividendYield")              # 야후 예상 수익률 (최근 배당 × 횟수 기준)
        forward_rate = info.get("dividendRate")
        try:
            ttm, amounts = trailing_dividends(ticker)    # 최근 1년 실제 배당 합계
        except Exception:
            ttm, amounts = None, []
        # 이력을 못 받으면 야후 예상치로 대신한다
        dr = ttm if ttm is not None else (forward_rate if isinstance(forward_rate, (int, float)) else "N/A")

        # 수익률 계산
        if price and prev_close and prev_close != 0:
            change_percent = ((price - prev_close) / prev_close) * 100
            change_str = f"{change_percent:.2f}%"
        else:
            change_str = "N/A"

        results[name] = {
            "price": int(price) if symbol.endswith(".KS") and price else price,
            "dividend_yield": f"{dy:.2f}%" if dy else "N/A",
            "dividend_rate": int(dr) if symbol.endswith(".KS") and isinstance(dr, (int, float)) else dr,
            "forward_dividend_rate": (
                int(forward_rate) if symbol.endswith(".KS") and isinstance(forward_rate, (int, float)) else forward_rate
            ),
            "special_dividend": has_special(amounts),
            "price_change_percent": change_str,
            # ▶ 실시간 배당수익 = (최근 1년 실제 배당금 합계 ÷ 현재가) × 100
            "real_time_yield": (
                f"{(dr/price*100):.2f}%"
                if price and isinstance(dr, (int, float)) and price != 0
                else "N/A"
            )
        }
    except Exception as e:
        results[name] = {"error": str(e)}

# UTC 기준 현재 시각을 ISO 8601 형식으로 만들어 넣습니다.
results["updated_at"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
# main 에는 data/ 가 없다 (data 브랜치로 옮김). 체크아웃 직후엔 폴더부터 만들어야 한다.
os.makedirs("data", exist_ok=True)
with open("data/dividends.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"✅ dividends.json updated at {results['updated_at']}")