import requests
import json
from datetime import datetime

API_KEY = "d1cl6p1r01qic6led760d1cl6p1r01qic6led76g"
STOCKS = {
    "SCHD": "SCHD",
    "TLT": "TLT",
    "하나금융지주": "086790.KQ",
    "우리금융지주": "316140.KQ",
    "삼성카드": "029780.KQ",
    "현대차2우B": "005387.KQ",
    "SK텔레콤": "017670.KQ",
    "삼섬화재우": "000815.KQ",
    "BNK 금융지주": "138930.KQ",
    "NH투자증권우": "005945.KQ",
    "삼성생명": "032830.KQ",
    "LG유플러스": "032640.KQ",
    "HD현대": "267250.KQ",
    "KT": "030200.KQ",
    "im금융지주": "279130.KQ",
    "KT&G": "033780.KQ",
    "삼성증권": "016360.KQ",
    "삼성전자": "005930.KQ"
}

def fetch_dividend_yield(symbol):
    url = f"https://finnhub.io/api/v1/stock/metric?symbol={symbol}&metric=all&token={API_KEY}"
    try:
        res = requests.get(url)
        res.raise_for_status()
        data = res.json()
        yield_val = data.get("metric", {}).get("dividendYieldTTM")
        if yield_val is not None:
            return f"{(yield_val * 100):.2f}%"
        else:
            return "N/A"
    except:
        return "N/A"

results = {}
for name, symbol in STOCKS.items():
    results[name] = fetch_dividend_yield(symbol)

with open("data/dividends.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("✅ dividends.json updated at", datetime.now().isoformat())
