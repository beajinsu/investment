import yfinance as yf
import requests
import json
import os  
from datetime import datetime, timezone, timedelta

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

# ==========================================
# 2. KIS API 설정 (고배당 자동 수집용)
# ==========================================
APP_KEY = os.environ.get("KIS_APP_KEY")
APP_SECRET = os.environ.get("KIS_APP_SECRET")
BASE_URL = "https://openapi.koreainvestment.com:9443"

def get_kis_top_5():
    """KIS API로 배당률 상위 5개를 가져오는 함수"""
    if not APP_KEY or not APP_SECRET:
        return {} # 키 없으면 빈 딕셔너리 반환 (기존 로직만 실행됨)

    print("🔎 KIS API: 고배당주 Top 5 검색 중...")
    
    # 1. 토큰 발급
    try:
        res = requests.post(f"{BASE_URL}/oauth2/tokenP", 
            headers={"content-type": "application/json"},
            data=json.dumps({"grant_type": "client_credentials", "appkey": APP_KEY, "appsecret": APP_SECRET})
        )
        token = res.json().get('access_token')
        if not token: return {}
    except:
        return {}

    # 2. 배당 순위 조회
    headers = {
        "authorization": f"Bearer {token}",
        "appkey": APP_KEY, "appsecret": APP_SECRET,
        "tr_id": "HHKDB13470100", "custtype": "P"
    }
    # 작년~오늘 기준 조회
    params = {
        "CTS_AREA": "", "GB1": "0", "UPJONG": "0001", "GB2": "6", "GB3": "2", "GB4": "0",
        "F_DT": (datetime.now() - timedelta(days=365)).strftime("%Y%m%d"),
        "T_DT": datetime.now().strftime("%Y%m%d")
    }

    auto_results = {}
    try:
        res = requests.get(f"{BASE_URL}/uapi/domestic-stock/v1/ranking/dividend-rate", headers=headers, params=params)
        data = res.json().get('output1', [])[:5] # 상위 5개만

        for item in data:
            name = f"🏆{item['isin_name']}" # 이름 앞에 트로피 표시
            div_rate = float(item['divi_rate'])
            div_amt = float(item['per_sto_divi_amt'])
            # 현재가 역산 (배당금 / 수익률)
            price = int(div_amt / (div_rate/100)) if div_rate > 0 else 0
            
            auto_results[name] = {
                "price": price,
                "dividend_yield": f"{div_rate:.2f}%",
                "dividend_rate": div_amt,
                "price_change_percent": "-", # 랭킹 API는 등락률 미제공
                "real_time_yield": f"{div_rate:.2f}%"
            }
    except Exception as e:
        print(f"⚠️ KIS API Error: {e}")
        
    return auto_results

# ==========================================
# 3. 메인 실행 (기존 로직 + KIS 병합)
# ==========================================
results = {}

# [Step 1] KIS API로 자동 발굴한 종목 먼저 넣기
results.update(get_kis_top_5())

# [Step 2] 기존 yfinance 로직 (지정 종목들)
print("🚀 yfinance: 지정 종목 업데이트 중...")
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
            change_str = f"{((price - prev_close) / prev_close) * 100:.2f}%"
        else:
            change_str = "N/A"

        # 실시간 배당수익률 계산
        real_time_yield = "N/A"
        if price and isinstance(dr, (int, float)) and price != 0:
             real_time_yield = f"{(dr/price*100):.2f}%"
        elif dy:
             real_time_yield = f"{dy*100:.2f}%"

        results[name] = {
            "price": int(price) if symbol.endswith(".KS") and price else price,
            "dividend_yield": f"{dy*100:.2f}%" if dy else "N/A",
            "dividend_rate": int(dr) if symbol.endswith(".KS") and isinstance(dr, (int, float)) else dr,
            "price_change_percent": change_str,
            "real_time_yield": real_time_yield
        }
    except Exception as e:
        results[name] = {"error": str(e)}

# 결과 저장
results["updated_at"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

# data 폴더가 없으면 생성
if not os.path.exists("data"):
    os.makedirs("data")

with open("data/dividends.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"✅ dividends.json updated at {results['updated_at']}")