/**
 * dividends.js
 * '배당수익률' 탭의 모든 기능을 담당합니다.
 */
document.addEventListener('DOMContentLoaded', () => {
  // 필요한 DOM 요소들을 선택합니다.
  const dividendTableBody = document.getElementById('dividend-table-body');
  const headers = document.querySelectorAll('#dividends th[data-key]');
  const columnToggles = document.querySelectorAll('#column-toggles input[type="checkbox"]');
  const lastUpdatedElem = document.getElementById('last-updated');

  // 데이터 저장 및 정렬 방향 상태 변수
  let tableData = [];
  const sortDirections = {}; // 각 키의 정렬 방향을 저장 (asc/desc)

  /**
   * 데이터를 가져와 테이블을 초기화하는 함수
   */
  function initializeDividendTable() {
    fetch('data/dividends.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // 'updated_at'을 제외한 주식 데이터만 추출하여 가공
        tableData = Object.entries(data)
          .filter(([key]) => key !== 'updated_at')
          .map(([name, info]) => ({
            name,
            price: parseFloat(info.price) || 0,
            dividend_yield: parseFloat(info.dividend_yield) || 0,
            dividend_rate: parseFloat(info.dividend_rate) || 0,
            real_time_yield: parseFloat(info.real_time_yield) || 0,
            price_change_percent: parseFloat(info.price_change_percent) || 0,
            raw: info // 원본 데이터 보존
          }));

        // 최초 로드 시 '실시간 배당수익률' 기준으로 내림차순 정렬
        sortBy('real_time_yield', 'desc');
        updateLastUpdated(data.updated_at);
        renderTable();
        updateColumnVisibility();
      })
      .catch(error => {
        console.error("배당 데이터 로드 실패:", error);
        dividendTableBody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;">데이터를 불러오는 데 실패했습니다.</td></tr>`;
        lastUpdatedElem.textContent = '업데이트 실패';
      });
  }

  /**
   * 테이블을 다시 그리는 함수
   */
  function renderTable() {
    // DocumentFragment를 사용하여 DOM 조작 성능 최적화
    const fragment = document.createDocumentFragment();
    tableData.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-key="name">${row.name}</td>
        <td data-key="price">${row.price.toLocaleString()}</td>
        <td data-key="dividend_rate">${row.dividend_rate.toLocaleString()}</td>
        <td data-key="dividend_yield">${row.dividend_yield.toFixed(2)}%</td>
        <td data-key="real_time_yield">${row.real_time_yield.toFixed(2)}%</td>
        <td data-key="price_change_percent">${row.price_change_percent.toFixed(2)}%</td>
      `;
      fragment.appendChild(tr);
    });
    dividendTableBody.innerHTML = ''; // 기존 내용 비우기
    dividendTableBody.appendChild(fragment);
    updateColumnVisibility(); // 테이블을 다시 그릴 때마다 컬럼 가시성 업데이트
  }

  /**
   * 특정 키를 기준으로 테이블 데이터를 정렬하는 함수
   * @param {string} key - 정렬 기준이 될 데이터의 키
   * @param {string} [forcedDirection] - 강제할 정렬 방향 ('asc' 또는 'desc')
   */
  function sortBy(key, forcedDirection) {
    const direction = forcedDirection || (sortDirections[key] === 'asc' ? 'desc' : 'asc');
    
    tableData.sort((a, b) => {
      if (key === 'name') {
        return direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
    });

    sortDirections[key] = direction;

    // 헤더의 정렬 상태 표시 업데이트
    headers.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
    const activeHeader = document.querySelector(`#dividends th[data-key="${key}"]`);
    if (activeHeader) {
      activeHeader.classList.add(direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  }

  /**
   * 마지막 업데이트 시간을 표시하는 함수
   * @param {string} timestamp - 업데이트 시간 문자열
   */
  function updateLastUpdated(timestamp) {
    const date = new Date(timestamp.replace(/\.\d+/, ''));
    lastUpdatedElem.textContent = isNaN(date)
      ? '마지막 업데이트: 알 수 없음'
      : `마지막 업데이트: ${date.toLocaleString('ko-KR')}`;
  }

  /**
   * 체크박스 상태에 따라 테이블 컬럼의 가시성을 조절하는 함수
   */
  function updateColumnVisibility() {
    columnToggles.forEach(toggle => {
      const key = toggle.dataset.key;
      const display = toggle.checked ? '' : 'none';
      document.querySelectorAll(`#dividends [data-key="${key}"]`).forEach(el => {
        el.style.display = display;
      });
    });
  }

  // 이벤트 리스너 등록
  headers.forEach(th => {
    th.addEventListener('click', () => {
      sortBy(th.dataset.key);
      renderTable();
    });
  });

  columnToggles.forEach(toggle => {
    toggle.addEventListener('change', updateColumnVisibility);
  });

  // 초기 데이터 로드 실행
  initializeDividendTable();
});
