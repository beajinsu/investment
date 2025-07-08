import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timezone

# 파일 위치: 프로젝트 루트의 scripts 디렉터리에 `fetch_scolkg_snippet.py` 이름으로 저장하세요.
# 예: `your-project/scripts/fetch_scolkg_snippet.py`

# 1) 외부 사이트 HTML 가져오기
#    scolkg.com 메인페이지에서 원하는 부분의 CSS 셀렉터를 확인한 뒤 아래 URL과 selector를 수정하세요.
url = 'https://scolkg.com/'
res = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
res.raise_for_status()

# 2) BeautifulSoup으로 파싱
soup = BeautifulSoup(res.text, 'html.parser')

# 3) 필요한 부분 추출: 예시로 클래스명이 'crypto-widget'인 요소를 가져옵니다.
#    실제로는 개발자 도구로 확인한 selector로 변경하세요.
snippet = soup.select_one('.crypto-widget')  # ⚠️ 여기를 scolkg에서 캡쳐하려는 요소의 CSS 선택자로 바꾸세요

if snippet is None:
    raise RuntimeError('요소를 찾을 수 없습니다: .crypto-widget')

# HTML 조각 문자열화
html_snippet = str(snippet)

# 4) JSON 파일에 저장 (HTML 조각 + 타임스탬프)
data = {
    'updated_at': datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    'snippet': html_snippet
}
with open('data/scolkg_snippet.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('✅ scolkg_snippet.json updated')
