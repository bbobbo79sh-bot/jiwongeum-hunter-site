// 연말정산 계산 (2026년 귀속). 금액은 모두 '만원' 단위 숫자. 브라우저·노드 양쪽에서 같은 코드로 돈다.
// 규칙 숫자는 yeonmal.json 의 "규칙" 에 있고, 여기에는 계산 순서만 있다.
// 출처: 지원금헌터 방 '연말정산_계산규칙_2026-11-12.md' (소득세법 52·59조의3·59조의4, 조특법 95조의2·126조의2 직접 확인)
(function (root) {
  const 숫자 = (v) => { const n = Number(String(v == null ? '' : v).replace(/,/g, '').trim()); return isFinite(n) && n > 0 ? n : 0; };
  const 글 = (n) => { const r = Math.round(n * 100) / 100; return String(r); };   // 0.01만원(100원) 단위까지
  const 반올림 = (n) => Math.round(n * 100) / 100;

  function 월세(R, x) {
    const r = R.월세, 급 = x.총급여, 월 = x.월세;
    if (!월) return { 금액: 0, 메모: '' };
    if (!x.무주택) return { 금액: 0, 메모: '무주택 세대주만 받을 수 있어요(위에서 체크해 주세요)', 알림: true };
    if (급 > r.총급여상한) return { 금액: 0, 메모: `총급여 ${글(r.총급여상한)}만원 이하만 받을 수 있어요`, 알림: true };
    const 율 = 급 <= r.고율기준 ? r.고율 : r.저율, 대상 = Math.min(월, r.한도);
    return { 금액: 반올림(대상 * 율), 메모: `${글(대상)}만원 × ${글(율 * 100)}%${월 > r.한도 ? ` (한도 ${글(r.한도)}만원 넘는 ${글(월 - r.한도)}만원 제외)` : ''}` };
  }

  function 의료비(R, x) {
    const r = R.의료비, A = x.의료일반, B = x.의료특정, C = x.의료미숙아, D = x.의료난임;
    if (!(A || B || C || D)) return { 금액: 0, 메모: '' };
    const T = x.총급여 * r.기준율;
    const X1 = Math.min(Math.max(A - T, 0), r.일반한도);
    const X2 = Math.max(B - Math.max(T - A, 0), 0);
    const X3 = Math.max(C - Math.max(T - (A + B), 0), 0);
    const X4 = Math.max(D - Math.max(T - (A + B + C), 0), 0);
    const 금액 = (X1 + X2) * r.일반율 + X3 * r.미숙아율 + X4 * r.난임율;
    return { 금액: 반올림(금액), 메모: 금액 > 0 ? `총급여의 3%(${글(T)}만원)를 넘은 부분 기준` : `총급여의 3%(${글(T)}만원)를 넘지 않아 공제가 없어요` };
  }

  function 교육비(R, x) {
    const r = R.교육비;
    const 아이 = (x.자녀교육 || []);
    let 합 = x.교육본인 + x.교육특수;
    let 한도넘음 = 0;
    아이.forEach((a) => {
      const 한 = a.대학 ? r.대학한도 : r.초중고한도, 금 = 숫자(a.금액);
      합 += Math.min(금, 한); 한도넘음 += Math.max(금 - 한, 0);
    });
    if (!합) return { 금액: 0, 메모: '' };
    return { 금액: 반올림(합 * r.율), 메모: `공제 대상 ${글(합)}만원 × 15%${한도넘음 ? ` (자녀 한도를 넘는 ${글(한도넘음)}만원 제외)` : ''}` };
  }

  function 보험료(R, x) {
    const r = R.보험료, a = Math.min(x.보장성, r.한도), b = Math.min(x.장애인보험, r.한도);
    if (!(a || b)) return { 금액: 0, 메모: '' };
    return { 금액: 반올림(a * r.일반율 + b * r.장애인율), 메모: `보장성 ${글(a)}만원 × 12%${b ? ` + 장애인전용 ${글(b)}만원 × 15%` : ''}` };
  }

  function 연금(R, x) {
    const r = R.연금, 저 = x.연금저축, 퇴 = x.irp;
    if (!(저 || 퇴)) return { 금액: 0, 메모: '' };
    if (x.총급여 > r.총급여상한) return { 금액: 0, 메모: `총급여 ${글(r.총급여상한)}만원을 넘으면 한도가 달라 계산하지 않아요. 원문에서 확인하세요`, 알림: true };
    const 율 = x.총급여 <= r.고율기준 ? r.고율 : r.저율;
    const 대상 = Math.min(Math.min(저, r.연금저축한도) + 퇴, r.합산한도);
    return { 금액: 반올림(대상 * 율), 메모: `공제 대상 ${글(대상)}만원 × ${글(율 * 100)}% (연금저축 ${글(r.연금저축한도)}만원·합산 ${글(r.합산한도)}만원 한도)` };
  }

  function 기부금(R, x) {
    const r = R.기부금, 기 = x.기부금;
    if (!기) return { 금액: 0, 메모: '' };
    const 금액 = r.저율 * Math.min(기, r.고율기준) + r.고율 * Math.max(기 - r.고율기준, 0);
    return { 금액: 반올림(금액), 메모: `${글(Math.min(기, r.고율기준))}만원 × 15%${기 > r.고율기준 ? ` + ${글(기 - r.고율기준)}만원 × 30%` : ''}` };
  }

  function 카드(R, x) {
    const r = R.카드, 급 = x.총급여;
    let CC = x.카드신용, DD = x.카드직불, T = x.카드전통시장, B = x.카드대중교통, L = x.카드문화체육;
    if (!(CC || DD || T || B || L)) return { 금액: 0, 메모: '' };
    const 낮음 = 급 <= r.문화체육총급여상한;
    if (!낮음) { CC += L; L = 0; }   // 문화체육 30%는 총급여 7천만원 이하만. 초과면 일반 신용카드로 본다
    const S = CC + DD + T + B + L, M = 급 * r.최저율;
    if (!급) return { 금액: 0, 메모: '총급여를 먼저 입력해 주세요', 알림: true };
    if (S <= M) return { 금액: 0, 메모: `쓴 금액 ${글(S)}만원이 총급여의 25%(${글(M)}만원) 이하라 공제가 없어요` };
    const gross = r.신용 * CC + r.직불 * DD + r.전통시장대중교통 * (T + B) + r.문화체육 * L;
    let sub;
    if (M <= CC) sub = r.신용 * M;
    else if (M <= CC + DD + L) sub = r.신용 * CC + r.직불 * (M - CC);
    else sub = r.신용 * CC + r.직불 * (DD + L) + r.전통시장대중교통 * (M - CC - DD - L);
    const base = Math.max(gross - sub, 0);
    const 한 = (낮음 ? r.한도.이하 : r.한도.초과)[Math.min(x.자녀수, 2)];
    let extra = 0;
    if (base > 한) {
      const Y = Math.min(r.전통시장대중교통 * (T + B) + (낮음 ? r.문화체육 * L : 0), 낮음 ? r.추가상한.이하 : r.추가상한.초과);
      extra = Math.min(base - 한, Y);
    }
    const 금액 = Math.min(base, 한) + extra;
    return { 금액: 반올림(금액), 메모: `기본 한도 ${글(한)}만원${extra ? ` + 전통시장·대중교통${낮음 && L ? '·문화체육' : ''} 추가 ${글(반올림(extra))}만원` : ''}${base > 한 + extra ? ' (한도 적용)' : ''}` };
  }

  function 주택대출(R, x) {
    const r = R.주택차입, 상 = x.주택상환;
    if (!상) return { 금액: 0, 메모: '' };
    if (!x.무주택) return { 금액: 0, 메모: '무주택 세대주만 받을 수 있어요(위에서 체크해 주세요)', 알림: true };
    const 금액 = Math.max(Math.min(상 * r.율, r.한도 - x.주택청약), 0);
    return { 금액: 반올림(금액), 메모: `상환액 ${글(상)}만원 × 40%, 청약저축 공제와 합쳐 ${글(r.한도)}만원 한도` };
  }

  const 순서 = [['월세', 월세], ['의료비', 의료비], ['교육비', 교육비], ['보험료', 보험료], ['연금', 연금], ['기부금', 기부금], ['카드', 카드], ['주택대출', 주택대출]];

  function 정리(입력) {
    const 키 = ['총급여', '월세', '의료일반', '의료특정', '의료미숙아', '의료난임', '교육본인', '교육특수', '보장성', '장애인보험', '연금저축', 'irp', '기부금', '카드신용', '카드직불', '카드전통시장', '카드대중교통', '카드문화체육', '주택상환', '주택청약'];
    const x = {};
    키.forEach((k) => { x[k] = 숫자(입력[k]); });
    x.무주택 = !!입력.무주택;
    x.자녀수 = Math.max(0, Math.min(2, Math.floor(Number(입력.자녀수) || 0)));
    x.자녀교육 = Array.isArray(입력.자녀교육) ? 입력.자녀교육.map((a) => ({ 대학: !!a.대학, 금액: 숫자(a.금액) })) : [];
    return x;
  }

  function calc(R규칙, 입력) {
    const R = R규칙.규칙 || R규칙, x = 정리(입력 || {});
    const 항목 = {};
    let 세액 = 0, 소득 = 0;
    순서.forEach(([id, f]) => {
      const 값 = f(R, x);
      항목[id] = 값;
      if (id === '카드' || id === '주택대출') 소득 += 값.금액; else 세액 += 값.금액;
    });
    return { 항목, 세액합: 반올림(세액), 소득합: 반올림(소득) };
  }

  const 공개 = { calc, 숫자, 글 };
  if (typeof module !== 'undefined' && module.exports) module.exports = 공개; else root.연말정산 = 공개;
})(typeof window !== 'undefined' ? window : globalThis);
