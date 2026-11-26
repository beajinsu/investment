import yfinance as yf
import json
import os
import statistics
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

# ── 배당 계산 ──────────────────────────────────────────────
# info["dividendRate"]·["dividendYield"] 는 "가장 최근 배당 × 연간 횟수" 로 연환산한 값이다.
# 특별배당이 한 번 나오면 그게 4배로 부풀려진다.
# (2026-11 삼성전자 Q3 특별배당 4,601원 → dividendRate 18,404원, 우선주 수익률 13% 로 표시됐다)
# 그래서 실제로 지급된 배당(Ticker.dividends, 배당락일 기준)을 최근 365일 동안 더해 쓴다.
TTM_DAYS        = 365
SPECIAL_MULT    = 3.0   # 중앙값의 3배를 넘는 배당은 특별배당으로 본다
SPECIAL_LOOKBACK_DAYS = 730  # 중앙값은 최근 2년 배당으로 잡는다 (특별배당 하나에 휘둘리지 않게)


def summarize_dividends(divs, price, now=None):
    """divs: [(datetime(tz-aware), 금액), ...] — 배당락일 기준.

    돌려주는 값
      ttm_dividend   최근 365일 실제 지급 배당 합계
      ttm_yield      ttm_dividend / price × 100
      regular_dividend / regular_yield
                     특별배당을 빼고, 그 자리에 평소 배당(중앙값)을 채운 연간 배당.
                     특별배당 회차에도 정규 배당분은 들어 있었다고 보는 것이다.
      special_dividends  최근 365일 안의 특별배당 목록
      ttm_count      최근 365일 배당 횟수 (상장 1년 미만이면 작게 나온다)
      last_dividend_date / last_dividend
    """
    now = now or datetime.now(timezone.utc)
    divs = sorted((d, float(a)) for d, a in divs if a and a > 0)
    out = {"ttm_dividend": None, "ttm_yield": None, "regular_dividend": None,
           "regular_yield": None, "special_dividends": [], "ttm_count": 0,
           "last_dividend_date": None, "last_dividend": None}
    if not divs:
        return out

    ttm = [(d, a) for d, a in divs if (now - d).days < TTM_DAYS]
    recent = [a for d, a in divs if (now - d).days < SPECIAL_LOOKBACK_DAYS]
    med = statistics.median(recent) if recent else None

    regular, specials = [], []
    for d, a in ttm:
        # 배당이 2번 이상 있어야 "평소" 를 말할 수 있다
        if med and len(recent) >= 3 and a > SPECIAL_MULT * med:
            specials.append((d, a))
        else:
            regular.append(a)

    ttm_sum = sum(a for _, a in ttm)
    reg_sum = sum(regular) + (med or 0) * len(specials)

    out["last_dividend_date"] = divs[-1][0].date().isoformat()
    out["last_dividend"] = divs[-1][1]
    out["ttm_count"] = len(ttm)
    out["special_dividends"] = [{"date": d.date().isoformat(), "amount": a} for d, a in specials]
    if ttm:
        out["ttm_dividend"] = ttm_sum
        out["regular_dividend"] = reg_sum
        if price:
            out["ttm_yield"] = ttm_sum / price * 100
            out["regular_yield"] = reg_sum / price * 100
    return out


def fmt_pct(x):
    return f"{x:.2f}%" if isinstance(x, (int, float)) else "N/A"


def fmt_amt(x, krw):
    if not isinstance(x, (int, float)):
        return "N/A"
    return int(round(x)) if krw else round(x, 4)


def build_row(symbol, info, divs, now=None):
    krw = symbol.endswith(".KS")
    price = info.get("currentPrice") or info.get("previousClose") or None
    prev_close = info.get("previousClose") or None
    api_dy = info.get("dividendYield")
    api_dr = info.get("dividendRate")

    if price and prev_close:
        change_str = f"{(price - prev_close) / prev_close * 100:.2f}%"
    else:
        change_str = "N/A"

    s = summarize_dividends(divs, price, now)
    return {
        "price": int(price) if krw and price else price,
        "price_change_percent": change_str,
        # ▶ 기준 지표: 최근 365일 실제 지급 배당 ÷ 현재가
        "yield_basis": "TTM",
        "dividend_rate": fmt_amt(s["ttm_dividend"], krw),
        "real_time_yield": fmt_pct(s["ttm_yield"]),
        # ▶ 특별배당을 평소 배당으로 바꿔 넣은 수익률
        "regular_dividend": fmt_amt(s["regular_dividend"], krw),
        "regular_yield": fmt_pct(s["regular_yield"]),
        "special_dividends": [{"date": x["date"], "amount": fmt_amt(x["amount"], krw)}
                              for x in s["special_dividends"]],
        "ttm_count": s["ttm_count"],
        "last_dividend_date": s["last_dividend_date"],
        "last_dividend": fmt_amt(s["last_dividend"], krw),
        # ▶ 참고용: yfinance info 값 (최근 배당 연환산 — 특별배당이 있으면 부풀려진다)
        "dividend_yield": fmt_pct(api_dy),
        "dividend_rate_api": fmt_amt(api_dr, krw),
    }


def fetch_divs(ticker):
    ser = ticker.dividends
    out = []
    for ts, amt in ser.items():
        d = ts.to_pydatetime()
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        out.append((d, float(amt)))
    return out


if __name__ == "__main__":
    results = {}
    for name, symbol in STOCKS.items():
        try:
            ticker = yf.Ticker(symbol)
            results[name] = build_row(symbol, ticker.info, fetch_divs(ticker))
            sp = results[name]["special_dividends"]
            if sp:
                print(f"⚠️ {name}: 특별배당 {sp} — TTM {results[name]['real_time_yield']}, "
                      f"정규 {results[name]['regular_yield']}, API {results[name]['dividend_yield']}")
        except Exception as e:
            results[name] = {"error": str(e)}

    # UTC 기준 현재 시각을 ISO 8601 형식으로 만들어 넣습니다.
    results["updated_at"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    # main 에는 data/ 가 없다 (data 브랜치로 옮김). 체크아웃 직후엔 폴더부터 만들어야 한다.
    os.makedirs("data", exist_ok=True)
    with open("data/dividends.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"✅ dividends.json updated at {results['updated_at']}")
