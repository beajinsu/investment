import yfinance as yf

ticker = yf.Ticker("005930.KS")  # 삼성전자
info = ticker.info

print("현재가:", info.get("currentPrice"))
print("배당수익률:", info.get("dividendYield"))  # 비율(예: 0.025)
print("최근 12개월 배당금:", info.get("dividendRate"))  # 단위: 원화 금액 추정