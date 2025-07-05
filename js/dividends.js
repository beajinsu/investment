    const tbody = document.getElementById('dividend-table');
    const headers = document.querySelectorAll('th[data-key]');
    let tableData = [];
    const sortDirections = { name: 'asc', price: 'asc', dividend_yield: 'desc', dividend_rate: 'asc', price_change_percent: 'asc' };

    headers.forEach(th => th.addEventListener('click', () => sortTable(th)));

    fetch('data/dividends.json')
      .then(res => res.json())
      .then(data => {
        const stockEntries = Object.entries(data).filter(([key]) => key !== 'updated_at');
        tableData = stockEntries.map(([name, info]) => ({
          name,
          price: info.price,
          dividend_yield: parseFloat(info.dividend_yield) || 0,
          dividend_rate: info.dividend_rate,
          price_change_percent: parseFloat(info.price_change_percent) || 0,
          raw: info
        }));
        tableData.sort((a, b) => b.dividend_yield - a.dividend_yield);
        headers.forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));
        document.querySelector('th[data-key="dividend_yield"]').classList.add('sorted-desc');
        renderTable(tableData);

        // 업데이트 시각 표시
        const updatedElem = document.getElementById('last-updated');
        const ts = data.updated_at.replace(/\.\d+/, '');
        const updatedAt = new Date(ts);
        updatedElem.textContent = isNaN(updatedAt)
          ? '마지막 업데이트: 알 수 없음'
          : `마지막 업데이트: ${updatedAt.toLocaleString('ko-KR')}`;
      })
      .catch(err => {
        tbody.innerHTML = "<tr><td colspan='5'>데이터 로드 실패</td></tr>";
        document.getElementById('last-updated').textContent = '업데이트 실패';
      });

    function renderTable(data) {
      const frag = document.createDocumentFragment();
      data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${row.name}</td>
          <td>${row.raw.price != null ? row.raw.price.toLocaleString() : 'N/A'}</td>
          <td>${row.dividend_yield ? row.dividend_yield.toFixed(2) + '%' : 'N/A'}</td>
          <td>${row.raw.dividend_rate != null ? row.raw.dividend_rate.toLocaleString() : 'N/A'}</td>
          <td>${row.raw.price_change_percent ?? 'N/A'}</td>
        `;
        frag.appendChild(tr);
      });
      tbody.innerHTML = '';
      tbody.appendChild(frag);
    }

    function sortTable(th) {
      const key = th.dataset.key;
      const dir = sortDirections[key];
      tableData.sort((a, b) => {
        if (key === 'name') return dir === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
        return dir === 'asc' ? a[key] - b[key] : b[key] - a[key];
      });
      sortDirections[key] = dir === 'asc' ? 'desc' : 'asc';
      headers.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
      th.classList.add(dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      renderTable(tableData);
    }