import yfinance as yf
import json
from datetime import datetime, timezone

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
        dy = info.get("dividendYield")
        dr = info.get("dividendRate", "N/A")

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
            "price_change_percent": change_str,
            # ▶ 실시간 배당수익 = (연간 배당금 ÷ 현재가) × 100
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
with open("data/dividends.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"✅ dividends.json updated at {results['updated_at']}")