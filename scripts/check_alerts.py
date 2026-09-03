# -*- coding: utf-8 -*-
"""
조건이 맞을 때만 알린다.

대시보드를 매번 열어보지 않아도 되게 하는 것이 목적이다.
평소엔 아무 일도 하지 않고, 아래 셋 중 하나에 걸릴 때만 GitHub Issue 를 연다.

  · 김치프리미엄이 ±3% 밖
  · 코인이 하루 ±5% 밖
  · 배당주가 하루 -3% 이상 급락 (배당수익률과 최근 뉴스를 함께 싣는다)

같은 종목으로 하루에 한 번만 알린다. 3시간마다 같은 알림이 오면
알림 자체가 무시당하기 때문이다. 기록은 data 브랜치의 alert_state.json 에 둔다.
"""
import io, json, os, re, sys
from datetime import datetime, timezone, timedelta

# ── 기준값 ────────────────────────────────────────────────
KIMCHI_ABS   = 3.0    # 김프 ±3% 밖
COIN_CHANGE  = 5.0    # 코인 하루 ±5% 밖
STOCK_DROP   = -3.0   # 배당주 하루 -3% 이하
COOLDOWN_H   = 20     # 같은 항목 재알림까지 최소 시간

KST = timezone(timedelta(hours=9))

def load(path, default=None):
    try:
        return json.load(io.open(path, encoding="utf-8"))
    except Exception:
        return default

def pct(s):
    """'4.75%' → 4.75, None → None"""
    m = re.match(r'(-?[\d.]+)\s*%', str(s or ""))
    return float(m.group(1)) if m else None

def news_for(symbol, n=2):
    """급락 이유의 실마리. 확정된 원인이 아니라 참고용 제목이다."""
    try:
        import yfinance as yf
        out = []
        for item in (yf.Ticker(symbol).news or [])[:n]:
            c = item.get("content", item)
            title = c.get("title")
            link = (c.get("canonicalUrl") or {}).get("url") or c.get("link") or ""
            if title:
                out.append((str(title).strip(), link))
        return out
    except Exception:
        return []

def read_stocks_map():
    """fetch_dividends.py 의 STOCKS 만 읽는다.

    import 하면 모듈 최상위 코드가 그대로 실행돼 배당 데이터를 다시 받아온다.
    실행 없이 딕셔너리 리터럴만 떼어낸다.
    """
    import ast
    try:
        src = io.open("scripts/fetch_dividends.py", encoding="utf-8").read()
        tree = ast.parse(src)
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for t in node.targets:
                    if isinstance(t, ast.Name) and t.id == "STOCKS":
                        return ast.literal_eval(node.value)
    except Exception:
        pass
    return {}


# ── 판정 ──────────────────────────────────────────────────
def check(crypto, dividends, stocks_map):
    hits = []

    for c in (crypto or {}).get("coins", []):
        name = c.get("coin", "?")
        kp = c.get("kimchi_premium")
        ch = c.get("change_24h")
        if kp is not None and abs(kp) >= KIMCHI_ABS:
            hits.append({
                "key": "kimchi:" + name,
                "head": "%s 김치프리미엄 %+.2f%%" % (name, kp),
                "body": "업비트 %s원 · 해외 %s원 (환율 %s)" % (
                    format(round(c.get("upbit_price", 0)), ","),
                    format(round(c.get("global_price_krw", 0)), ","),
                    format(round((c.get("raw") or {}).get("exchange_rate", 0), 1), ",")),
            })
        if ch is not None and abs(ch) >= COIN_CHANGE:
            hits.append({
                "key": "coin:" + name,
                "head": "%s 24시간 %+.2f%%" % (name, ch),
                "body": "현재 업비트 %s원" % format(round(c.get("upbit_price", 0)), ","),
            })

    for name, v in (dividends or {}).items():
        if not isinstance(v, dict):
            continue
        chg = pct(v.get("price_change_percent"))
        if chg is None or chg > STOCK_DROP:
            continue
        y = pct(v.get("dividend_yield"))
        sym = stocks_map.get(name, "")
        lines = ["가격 %s (%+.2f%%)" % (v.get("price"), chg)]
        if y is not None:
            lines.append("배당수익률 **%.2f%%**" % y)
        arts = news_for(sym)
        if arts:
            lines.append("")
            lines.append("최근 뉴스 — 급락 원인인지는 확인이 필요합니다:")
            for t, u in arts:
                lines.append("- [%s](%s)" % (t, u) if u else "- %s" % t)
        hits.append({
            "key": "stock:" + name,
            "head": "%s %+.2f%%%s" % (name, chg, " 급락" if chg < 0 else ""),
            "body": "\n".join(lines),
        })
    return hits

# ── 재알림 억제 ────────────────────────────────────────────
def filter_recent(hits, state, now):
    keep, seen = [], dict(state.get("last", {}))
    for h in hits:
        prev = seen.get(h["key"])
        if prev:
            try:
                if (now - datetime.fromisoformat(prev)).total_seconds() < COOLDOWN_H * 3600:
                    continue
            except Exception:
                pass
        seen[h["key"]] = now.isoformat()
        keep.append(h)
    return keep, {"last": seen}

def main():
    crypto = load("data/crypto.json", {})
    div    = load("data/dividends.json", {})
    state  = load("data/alert_state.json", {"last": {}})

    STOCKS = read_stocks_map()

    now = datetime.now(timezone.utc)
    hits = check(crypto, div, STOCKS)
    hits, state = filter_recent(hits, state, now)

    io.open("data/alert_state.json", "w", encoding="utf-8", newline="\n").write(
        json.dumps(state, ensure_ascii=False, indent=2))

    if not hits:
        print("조건에 걸린 항목 없음")
        return

    title = "%s · %d건" % (now.astimezone(KST).strftime("%m/%d %H:%M"), len(hits))
    body = ["기준: 김프 ±%s%% · 코인 24h ±%s%% · 배당주 %s%% 이하\n"
            % (KIMCHI_ABS, COIN_CHANGE, STOCK_DROP)]
    for h in hits:
        body.append("### %s" % h["head"])
        body.append(h["body"])
        body.append("")
    body.append("---")
    body.append("[시장 정보 페이지](https://beajinsu.github.io/investment/) · "
                "%s (KST)" % now.astimezone(KST).strftime("%Y-%m-%d %H:%M"))

    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with io.open(out, "a", encoding="utf-8") as f:
            f.write("has_alert=true\n")
            f.write("title=%s\n" % title)
            f.write("body<<ALERT_EOF\n%s\nALERT_EOF\n" % "\n".join(body))
    print(title)
    print("\n".join(body))

if __name__ == "__main__":
    main()
