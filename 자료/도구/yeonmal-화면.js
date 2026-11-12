// 연말정산 계산기 화면 동작 — 입력을 읽어 계산하고 결과를 그린다. 아무것도 서버로 보내거나 저장하지 않는다.
(function () {
  const R = window.YM_RULES, Y = window.연말정산;
  if (!R || !Y) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const 원 = (만원) => {
    const w = Math.round(만원 * 10000);
    if (!w) return '0원';
    const 만 = Math.floor(w / 10000), 나머지 = w % 10000;
    return (만 ? 만.toLocaleString('ko-KR') + '만' + (나머지 ? ' ' + 나머지.toLocaleString('ko-KR') : '') : 나머지.toLocaleString('ko-KR')) + '원';
  };
  const 막기 = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const 줄 = $('#자녀줄');
  function 자녀행추가() {
    const d = document.createElement('div'); d.className = '자녀행';
    d.innerHTML = '<select aria-label="학교 구분"><option value="0">초·중·고·취학 전</option><option value="1">대학생</option></select><input type="text" inputmode="decimal" autocomplete="off" placeholder="교육비 (만원)" aria-label="교육비 (만원)"><button type="button" aria-label="이 줄 지우기">✕</button>';
    d.querySelector('button').addEventListener('click', () => { d.remove(); 계산(); });
    줄.appendChild(d);
  }
  $('#자녀추가').addEventListener('click', () => { 자녀행추가(); const 마지막 = 줄.lastChild.querySelector('input'); if (마지막) 마지막.focus(); });

  function 읽기() {
    const 입력 = {};
    $$('[data-k]').forEach((el) => { 입력[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value; });
    입력.자녀교육 = $$('.자녀행').map((r) => ({ 대학: r.querySelector('select').value === '1', 금액: r.querySelector('input').value }));
    return 입력;
  }

  function 계산() {
    const 결과 = Y.calc(R, 읽기());
    $$('[data-r]').forEach((el) => { const v = 결과.항목[el.dataset.r]; el.textContent = v && v.금액 > 0 ? '− ' + 원(v.금액) : ''; });
    $('#띠세액').textContent = 원(결과.세액합);
    $('#띠소득').textContent = 원(결과.소득합);
    const 몸 = $('#결과몸');
    const 줄들 = Object.entries(결과.항목).filter(([, v]) => v.금액 > 0 || v.알림);
    if (!줄들.length) { 몸.innerHTML = '<div class="빈">위 칸에 입력하면 여기에 결과가 나와요.</div>'; return; }
    const 항목글 = (id, v) => {
      const h = R.항목[id];
      return `<div class="결과줄${v.알림 ? ' 알림' : ''}"><div class="윗줄"><span class="이름"><span class="종류 ${h.종류 === '소득' ? '소득' : ''}">${h.종류 === '소득' ? '소득공제' : '세액공제'}</span>${막기(h.이름)}</span><span class="값">${v.알림 && !v.금액 ? '계산 안 됨' : 원(v.금액)}</span></div>${v.메모 ? `<div class="메모">${막기(v.메모)}</div>` : ''}</div>`;
    };
    몸.innerHTML = `<div class="합계카드"><div><span>세액공제 합계<small>낼 세금에서 바로 줄어드는 금액</small></span><b>${원(결과.세액합)}</b></div><div><span>소득공제 합계<small>세금을 매기는 소득에서 빼는 금액</small></span><b>${원(결과.소득합)}</b></div></div>` + 줄들.map(([id, v]) => 항목글(id, v)).join('');
  }

  document.addEventListener('input', (e) => { if (e.target.closest('.도구')) 계산(); });
  document.addEventListener('change', (e) => { if (e.target.closest('.도구')) 계산(); });
  자녀행추가();
  계산();
})();
