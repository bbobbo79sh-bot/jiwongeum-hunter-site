// 연말정산 계산기 페이지 조각 (만들기.js 가 불러 쓴다) — 화면 틀·입력 칸·스타일·브라우저 스크립트
// 규칙 숫자: 자료/도구/yeonmal.json · 계산 순서: 자료/도구/yeonmal-계산.js · 검산: node 검산_연말정산.js
const fs = require('fs');
const path = require('path');

const 막기 = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function 읽기(뿌리) {
  const d = path.join(뿌리, '자료', '도구');
  let R;
  try { R = JSON.parse(fs.readFileSync(path.join(d, 'yeonmal.json'), 'utf8')); } catch (e) { return null; }
  if (!R.제목 || !R.규칙 || !R.항목 || !/^\d{4}-\d{2}-\d{2}$/.test(R.확인일 || '')) { console.log('  건너뜀: 연말정산 계산기 — yeonmal.json 에 제목·규칙·항목·확인일이 필요합니다'); return null; }
  // 공개 전에는 실제 빌드에 넣지 않는다(미리보기: SITE_TOOLS=1). 공개할 때 yeonmal.json 의 "공개" 를 true 로.
  if (!R.공개 && process.env.SITE_TOOLS !== '1' && process.env.SITE_DEMO !== '1') { console.log('  연말정산 계산기: 공개 전이라 이번 빌드에는 넣지 않았습니다 (미리보기는 SITE_TOOLS=1)'); return null; }
  for (const [id, h] of Object.entries(R.항목)) {
    if (!h.원문 || !/^https:\/\//.test(h.원문.url || '')) { console.log(`  건너뜀: 연말정산 계산기 — 항목 '${id}' 에 공식 원문 링크(https)가 없습니다`); return null; }
  }
  return { R, 계산소스: fs.readFileSync(path.join(d, 'yeonmal-계산.js'), 'utf8'), 화면소스: fs.readFileSync(path.join(d, 'yeonmal-화면.js'), 'utf8') };
}

const 칸 = (k, 이름, 도움, 예 = '') => `<label class="칸"><span class="칸이름">${막기(이름)}</span><span class="입력줄"><input type="text" inputmode="decimal" autocomplete="off" data-k="${k}" placeholder="${막기(예)}" aria-label="${막기(이름)} (만원)"><em>만원</em></span>${도움 ? `<small>${막기(도움)}</small>` : ''}</label>`;

function 구역(R, id, 칸들, 열림 = false, 추가 = '') {
  const h = R.항목[id];
  return `<details class="입력구역"${열림 ? ' open' : ''} data-id="${id}"><summary><span class="구역이름">${막기(h.이름)}</span><span class="구역값" data-r="${id}"></span></summary>
<div class="구역안">${h.안내 ? `<p class="구역안내">${막기(h.안내)}</p>` : ''}${칸들}${추가}<a class="원문링크" href="${막기(h.원문.url)}" target="_blank" rel="noopener">공식 원문: ${막기(h.원문.이름)} ↗</a></div></details>`;
}

function 본문(도구, 길) {
  const R = 도구.R;
  const 기본 = `<details class="입력구역" open data-id="기본"><summary><span class="구역이름">먼저 내 기본 정보</span></summary><div class="구역안">
${칸('총급여', '총급여 (연봉에서 식대 등 비과세를 뺀 금액)', '급여명세서·원천징수영수증의 총급여예요. 모르면 세전 연봉을 넣어도 어림은 돼요.', '예: 4000')}
<label class="칸"><span class="칸이름">자녀·손자녀 수 (카드 공제 한도용)</span><select data-k="자녀수"><option value="0">없음</option><option value="1">1명</option><option value="2">2명 이상</option></select><small>자녀로 인정되는 범위는 시행령 기준이라, 본인 판단으로 골라 주세요.</small></label>
<label class="체크"><input type="checkbox" data-k="무주택"> <span>무주택 세대주예요 <small>(월세·주택대출 공제는 무주택 세대주만 받아요)</small></span></label>
</div></details>`;

  const 자녀 = `<div class="자녀구역"><div class="칸이름">자녀·가족 교육비 (한 명씩 따로 넣어요)</div><div id="자녀줄"></div><button type="button" class="칩" id="자녀추가">+ 자녀 추가</button><small>취학 전 아동·초중고는 1명당 연 300만원, 대학생은 1명당 연 900만원까지 공제 대상이에요.</small></div>`;

  return `<div class="도구">
<h1><mark>연말정산</mark> 계산기</h1>
<p class="부제">${막기(R.부제)}</p>
<span class="확인도장">${R.귀속연도}년 귀속 · 조문 확인 ${Number(R.확인일.slice(5, 7))}/${Number(R.확인일.slice(8, 10))}</span>
<div class="안심줄"><b>입력한 숫자는 이 기기 안에서만 계산돼요.</b> 서버로 보내지 않고, 저장하지도 않아요. 새로고침하면 사라져요. 금액은 모두 <b>만원 단위</b>(예: 350만원 → 350, 12만 5천원 → 12.5)로 넣어 주세요.</div>
<noscript><div class="주의박스"><h3>자바스크립트가 필요해요</h3><ul><li>계산은 브라우저에서 이뤄져서, 자바스크립트를 켜 주셔야 해요.</li></ul></div></noscript>
${기본}
${구역(R, '월세', 칸('월세', '1년 동안 낸 월세 합계', '월세 × 낸 개월 수', '예: 600'))}
${구역(R, '의료비', 칸('의료일반', '일반 의료비 (그 밖의 부양가족)', '', '예: 100') + 칸('의료특정', '본인·6세 이하·65세 이상·장애인·중증질환자 의료비', '이 의료비는 공제 한도가 없어요.', '예: 300') + 칸('의료미숙아', '미숙아·선천성 이상아 의료비', '', '') + 칸('의료난임', '난임시술비', '', ''))}
${구역(R, '교육비', 칸('교육본인', '본인 교육비 (대학원·직업훈련 포함)', '한도가 없어요.', '예: 200') + 칸('교육특수', '장애인 특수교육비', '', '') + 자녀)}
${구역(R, '보험료', 칸('보장성', '보장성 보험료 (연 납입액)', '연 100만원까지 인정돼요.', '예: 80') + 칸('장애인보험', '장애인전용 보장성 보험료', '연 100만원까지, 15%예요.', ''))}
${구역(R, '연금', 칸('연금저축', '연금저축 연 납입액', '연금저축은 연 600만원까지예요.', '예: 400') + 칸('irp', '퇴직연금(IRP) 연 납입액', '연금저축과 합쳐 연 900만원까지 인정돼요.', ''))}
${구역(R, '기부금', 칸('기부금', '공제 대상 기부금 합계', '한도를 넘는 금액은 빼고 넣어 주세요.', ''))}
${구역(R, '카드', 칸('카드신용', '신용카드 사용액', '아래 전통시장·대중교통·문화체육은 여기서 빼고 따로 넣어 주세요.', '예: 1500') + 칸('카드직불', '체크카드·현금영수증·기명 선불카드 사용액', '', '') + 칸('카드전통시장', '전통시장 사용액', '카드 종류와 관계없이 전부 여기에 넣어요.', '') + 칸('카드대중교통', '대중교통 사용액', '카드 종류와 관계없이 전부 여기에 넣어요.', '') + 칸('카드문화체육', '문화체육 사용액 (도서·공연·영화·박물관·체육시설)', '총급여 7천만원 이하일 때만 따로 계산돼요.', ''))}
${구역(R, '주택대출', 칸('주택상환', '주택임차차입금 원리금 상환액 (연)', '전월세 보증금 대출 원금+이자예요.', '예: 600') + 칸('주택청약', '주택청약저축 소득공제액 (모르면 비워 두세요)', '이미 받는 청약저축 공제가 있으면 한도 400만원을 같이 써요.', ''))}
<section class="결과" id="결과" aria-live="polite"><h2>내 결과</h2><div id="결과몸"><div class="빈">위 칸에 입력하면 여기에 결과가 나와요.</div></div>
<div class="결과주의"><b>두 합계를 더하지 마세요.</b> 세액공제는 낼 세금에서 바로 빠지고, 소득공제는 세금을 매기는 소득을 줄이는 금액이에요. 줄어드는 세금은 소득 구간별 세율을 곱해야 해서 계산하지 않았어요.</div></section>
<div class="맺음 도구맺음"><p class="면책">${막기(R.면책)}</p><a class="단추 연두" href="${길('/g/')}">연말정산 가이드 보러 가기</a></div>
</div>
<div class="결과띠" id="결과띠" role="status"><div><small>세액공제 (낼 세금에서 바로 빠져요)</small><b id="띠세액">0원</b></div><div><small>소득공제 (공제 금액)</small><b id="띠소득">0원</b></div></div>
<script>window.YM_RULES=${JSON.stringify(R).replace(/</g, '\\u003c')};</script>
<script>${도구.계산소스}</script>
<script>${도구.화면소스}</script>`;
}

const 스타일 = `
/* ── 연말정산 계산기 ── */
.도구{padding-bottom:84px}
.안심줄{background:#FBFFE9;border:1.5px solid #C9DA7E;border-radius:14px;padding:12px 15px;font-size:14px;margin:6px 0 18px;line-height:1.6}
.입력구역{background:#fff;border:1.5px solid var(--선);border-radius:16px;margin:12px 0;overflow:hidden}
.입력구역[open]{border-color:var(--남)}
.입력구역 summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:15px 17px;cursor:pointer;font-weight:900;font-size:17px;min-height:52px}
.입력구역 summary::-webkit-details-marker{display:none}
.입력구역 summary::after{content:"＋";font-size:18px;color:var(--흐림);margin-left:auto;padding-left:8px}
.입력구역[open] summary::after{content:"－"}
.구역값{font-size:14px;color:var(--도장);font-weight:900;white-space:nowrap}
.구역값:empty{display:none}
.구역안{padding:2px 17px 16px}
.구역안내{font-size:13px;color:var(--흐림);margin:2px 0 8px;line-height:1.6}
.칸{display:block;margin:14px 0}
.칸이름{display:block;font-size:14px;font-weight:800;margin-bottom:5px}
.입력줄{display:flex;align-items:center;gap:8px}
.입력줄 input,.칸 select{width:100%;font:inherit;font-size:18px;font-weight:700;padding:12px 14px;border:1.5px solid var(--선);border-radius:12px;background:#FDFCF8;color:var(--남);min-height:48px}
.입력줄 input:focus,.칸 select:focus{outline:none;border-color:var(--남);background:#fff;box-shadow:0 0 0 3px var(--연두)}
.입력줄 em{font-style:normal;font-weight:800;color:var(--흐림);font-size:15px;flex:0 0 auto}
.칸 small,.자녀구역 small,.체크 small{display:block;font-size:12px;color:var(--흐림);margin-top:4px;line-height:1.55}
.체크{display:flex;gap:10px;align-items:flex-start;margin:16px 0 4px;font-weight:800;font-size:15px;cursor:pointer}
.체크 input{width:22px;height:22px;margin:1px 0 0;flex:0 0 auto;accent-color:var(--남)}
.원문링크{display:inline-block;margin-top:10px;font-size:13px;font-weight:800;color:var(--남);border-bottom:2px solid var(--연두);text-decoration:none}
.자녀구역{margin:14px 0}
.자녀행{display:grid;grid-template-columns:104px 1fr 40px;gap:8px;align-items:center;margin:8px 0}
.자녀행 select,.자녀행 input{width:100%;font:inherit;font-size:16px;font-weight:700;padding:11px 10px;border:1.5px solid var(--선);border-radius:12px;background:#FDFCF8;color:var(--남);min-height:46px}
.자녀행 button{height:46px;border:1.5px solid var(--선);border-radius:12px;background:#fff;font-size:18px;cursor:pointer;color:var(--흐림)}
.결과 h2{margin-top:30px}
.결과줄{background:#fff;border:1.5px solid var(--선);border-radius:14px;padding:13px 16px;margin:10px 0}
.결과줄 .윗줄{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.결과줄 .이름{font-weight:900;font-size:16px}
.결과줄 .값{font-weight:900;font-size:18px;white-space:nowrap}
.결과줄 .메모{font-size:12.5px;color:var(--흐림);margin-top:3px;line-height:1.55}
.결과줄.알림{border-color:var(--도장);background:#FFF1EC}
.결과줄.알림 .값{color:var(--도장)}
.결과줄 .종류{display:inline-block;font-size:11px;font-weight:900;border-radius:6px;padding:2px 7px;margin-right:6px;background:var(--남);color:var(--연두)}
.결과줄 .종류.소득{background:#fff;color:var(--남);border:1.5px solid var(--남);padding:1px 6px}
.합계카드{background:var(--남);color:#fff;border-radius:16px;padding:16px 18px;margin:14px 0}
.합계카드 div{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:6px 0}
.합계카드 small{font-size:12.5px;color:#C8CDDC;display:block}
.합계카드 b{font-size:22px;color:var(--연두);white-space:nowrap}
.결과주의{background:#FFF1EC;border:2px solid var(--도장);border-radius:14px;padding:12px 15px;font-size:14px;margin:14px 0;line-height:1.6}
.도구맺음{margin-top:30px}
.결과띠{position:fixed;left:0;right:0;bottom:0;z-index:6;background:var(--남);color:#fff;display:grid;grid-template-columns:1fr 1fr;gap:1px;padding:8px 14px calc(8px + env(safe-area-inset-bottom));box-shadow:0 -4px 14px rgba(20,33,61,.25)}
.결과띠 div{padding:2px 6px;min-width:0}
.결과띠 small{display:block;font-size:11px;color:#C8CDDC;line-height:1.35}
.결과띠 b{display:block;font-size:19px;color:var(--연두);font-weight:900;white-space:nowrap}
@media (min-width:640px){.결과띠{left:50%;right:auto;width:720px;transform:translateX(-50%);border-radius:16px 16px 0 0}}
`;

module.exports = { 읽기, 본문, 스타일 };
