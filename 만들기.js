// 지원금헌터 사이트 만들기 — 월별 '지원금 총정리' 정적 사이트 (GitHub Pages 등 무료 호스팅용)
//   node 만들기.js            → 결과/ 에 사이트를 만든다 (자료/월별/*.json)
//   SITE_DEMO=1 node 만들기.js → 자료/예시/*.json 도 포함, 모든 페이지 noindex + '예시' 띠 (화면 확인용, 공개 금지)
// 원칙: 원문을 확인한 항목만 싣는다. 모든 항목에 원문 링크와 확인 날짜를 붙인다.
const fs = require('fs');
const path = require('path');

const 뿌리 = __dirname;
const 결과 = process.env.SITE_OUT ? path.resolve(process.env.SITE_OUT) : path.join(뿌리, '결과');
const 시연 = process.env.SITE_DEMO === '1';
const 비공개 = process.env.SITE_NOINDEX === '1';   // 영감 확인 전 미리보기: 검색 노출 막기(공개할 때 값을 비운다)
const 읽기 = (f, 기본) => { try { return JSON.parse(fs.readFileSync(path.join(뿌리, '자료', f), 'utf8')); } catch (e) { return 기본; } };
const 설정 = 읽기('사이트.json', {});
const 광고 = 읽기('광고.json', {});
const 주소 = String(process.env.SITE_URL || 설정.주소 || '').replace(/\/+$/, '');
const 기준 = process.env.SITE_BASE ? '/' + process.env.SITE_BASE.replace(/^\/|\/$/g, '') : '';   // 프로젝트 주소(github.io/이름)로 올릴 때만
const 길 = (p) => 기준 + p;
const 막기 = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const 운영 = 설정.운영자 || {};
const 준비중 = !운영.상호;
const 메일없음 = !운영.이메일;   // 전용 메일 주소가 생기기 전에는 문의를 인스타그램 메시지로 안내   // 운영자 정보가 정해지기 전에는 '준비 중'으로 보인다(공개·광고 신청 전에 채울 것)

fs.rmSync(결과, { recursive: true, force: true });
const 쓰기 = (상대, 내용) => { const p = path.join(결과, 상대); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, 내용); };

// ───────── 자료 읽기 ─────────
const 월파일들 = [];
const 폴더읽기 = (폴더) => { const d = path.join(뿌리, '자료', 폴더); if (fs.existsSync(d)) fs.readdirSync(d).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).forEach((f) => 월파일들.push(JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')))); };
폴더읽기('월별'); if (시연) 폴더읽기('예시');
const 월들 = 월파일들.sort((a, b) => b.월.localeCompare(a.월));
const 안전한가 = (x) => /^[A-Za-z0-9_-]+$/.test(x.id || '') && /^https?:\/\//.test(x.링크 || '') && x.확인일 && x.이름;
월들.forEach((m) => { m.항목 = (m.항목 || []).filter((x) => { if (!안전한가(x)) { console.log(`  건너뜀: ${m.월} 항목 '${x.id || x.이름}' — id·원문 링크·확인일·이름이 모두 있어야 합니다`); return false; } return true; }); });
const 월글 = (m) => { const [y, mm] = m.월.split('-'); return `${y}년 ${Number(mm)}월`; };
const 날짜글 = (d) => { if (!d || d === '상시') return '상시'; const [y, m, dd] = d.split('-').map(Number); return `${m}월 ${dd}일`; };
const 확인글 = (d) => { const [, m, dd] = d.split('-').map(Number); return `${m}/${dd}`; };

// ───────── 가이드 자료 읽기 (자료/가이드/*.json — '정리 가이드' 페이지 /g/<slug>/) ─────────
// 월별 총정리(카드 목록)와 별개로, 인스타 DM 링크로 줄 '한 편짜리 정리 자료'. 항목마다 공식 원문 링크가 있어야 실린다.
const 가이드들 = [];
{
  const d = path.join(뿌리, '자료', '가이드');
  if (fs.existsSync(d)) fs.readdirSync(d).filter((f) => /\.json$/i.test(f) && !f.startsWith('_')).sort().forEach((f) => {
    let g; try { g = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); } catch (e) { console.log(`  건너뜀: 가이드 ${f} — JSON 형식 오류`); return; }
    if (!/^[a-z0-9-]+$/.test(g.slug || '') || !g.제목 || !/^\d{4}-\d{2}-\d{2}$/.test(g.확인일 || '')) { console.log(`  건너뜀: 가이드 ${f} — slug(영문 소문자·숫자·-)·제목·확인일(YYYY-MM-DD)이 필요합니다`); return; }
    if (가이드들.some((x) => x.slug === g.slug)) { console.log(`  건너뜀: 가이드 ${f} — slug '${g.slug}' 중복`); return; }
    g.항목 = (g.항목 || []).filter((x) => {
      x.원문 = (x.원문 || []).filter((w) => w && /^https?:\/\//.test(w.url || ''));
      if (!x.제목 || !x.원문.length) { console.log(`  건너뜀: 가이드 ${g.slug} 항목 '${x.제목 || x.번호}' — 제목과 공식 원문 링크(https)가 있어야 합니다`); return false; }
      return true;
    });
    if (!g.항목.length) { console.log(`  건너뜀: 가이드 ${f} — 실을 수 있는 항목이 없습니다`); return; }
    가이드들.push(g);
  });
  가이드들.sort((a, b) => b.확인일.localeCompare(a.확인일));
}
const 동그라미 = '①②③④⑤⑥⑦⑧⑨⑩';
const 항목번호 = (g, i) => (g.한눈에 && g.한눈에[i] && g.한눈에[i].번호) || 동그라미[i] || String(i + 1);
const 가이드날짜 = (d) => { const [y, m, dd] = d.split('-').map(Number); return `${y}년 ${m}월 ${dd}일`; };

// ───────── 도구(연말정산 계산기) 읽기 — 자료/도구/yeonmal.json · 페이지 조각은 도구페이지.js ─────────
const 도구페이지 = require('./도구페이지.js');
const 연말정산 = 도구페이지.읽기(뿌리);

// ───────── 스타일 (모바일 우선, 남색 #14213D · 종이 #F7F5EF · 형광 연두 #C6F135 · 도장 #D94A2B) ─────────
const 스타일 = `
:root{--남:#14213D;--종이:#F7F5EF;--연두:#C6F135;--도장:#D94A2B;--선:#E3DFD3;--흐림:#5B6275;--카드:#fff}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--종이);color:var(--남);font:16px/1.65 Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;word-break:keep-all}
a{color:inherit}
.틀{max-width:720px;margin:0 auto;padding:0 18px}
.머리{background:var(--남);color:#fff;position:sticky;top:0;z-index:5}
.머리 .틀{display:flex;align-items:center;justify-content:space-between;height:56px}
.로고줄{display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff;font-weight:900;font-size:18px}
.로고줄 img{width:32px;height:32px;border-radius:50%}
.머리 nav{display:flex;gap:12px;font-size:14px;white-space:nowrap}.머리 nav a{text-decoration:none;color:#D8DCE8}.머리 nav a[aria-current]{color:var(--연두);font-weight:800}
.시연띠{background:var(--도장);color:#fff;text-align:center;font-size:13px;font-weight:800;padding:6px}
h1{font-size:28px;line-height:1.3;margin:26px 0 8px;letter-spacing:-.5px}
h1 mark,.형광{background:linear-gradient(transparent 58%,var(--연두) 58%);color:inherit;padding:0 2px}
h2{font-size:20px;margin:34px 0 12px}
.부제{color:var(--흐림);font-size:14px;margin:0 0 18px}
.요약줄{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 6px}
.칩{display:inline-flex;align-items:center;font-size:13px;font-weight:800;padding:7px 13px;border-radius:99px;border:1.5px solid var(--남);background:#fff;cursor:pointer;font-family:inherit;color:var(--남)}
.칩[aria-pressed="true"]{background:var(--남);color:var(--연두)}
.카드{display:block;background:var(--카드);border:1.5px solid var(--선);border-radius:18px;padding:18px 18px 16px;margin:14px 0;text-decoration:none;position:relative}
.카드:hover{border-color:var(--남)}
.딱지{display:inline-block;font-size:12px;font-weight:900;background:var(--남);color:var(--연두);border-radius:7px;padding:3px 9px}
.카드 .이름{font-size:19px;font-weight:900;line-height:1.4;margin:8px 0 2px;display:block}
.카드 .기관{font-size:13px;color:var(--흐림)}
.금액{font-size:24px;font-weight:900;margin:10px 0 4px;letter-spacing:-.5px}
.금액 span{background:linear-gradient(transparent 62%,var(--연두) 62%)}
.줄정보{font-size:14px;margin:2px 0}.줄정보 b{display:inline-block;min-width:44px;color:var(--흐림);font-weight:700}
.도장{position:absolute;right:14px;top:14px;border:2px solid var(--도장);color:var(--도장);border-radius:9px;font-size:11px;font-weight:900;line-height:1.2;padding:4px 7px;text-align:center;transform:rotate(-6deg);background:#fff}
.단추{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:var(--남);color:#fff;font:inherit;font-weight:900;font-size:17px;padding:16px;border-radius:14px;text-decoration:none;margin:18px 0 8px}
.단추.연두{background:var(--연두);color:var(--남)}
.작은,.안내{font-size:13px;color:var(--흐림)}
.상세 dl{margin:18px 0;display:grid;gap:10px}.상세 dl div{background:#fff;border:1.5px solid var(--선);border-radius:14px;padding:12px 15px}
.상세 dt{font-size:12px;font-weight:800;color:var(--흐림)}.상세 dd{margin:2px 0 0;font-size:16px;font-weight:700}
.글{background:#fff;border:1.5px solid var(--선);border-radius:18px;padding:6px 20px 20px;margin:20px 0}
.글 p,.글 li{font-size:15px}
.목록 a{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1.5px solid var(--선);border-radius:14px;padding:15px 17px;margin:10px 0;text-decoration:none;font-weight:800}
.목록 small{color:var(--흐림);font-weight:600}
.빈 {background:#fff;border:1.5px dashed var(--선);border-radius:16px;padding:26px 20px;text-align:center;color:var(--흐림)}
.광고칸{margin:20px 0;min-height:60px;text-align:center}
.바닥{margin-top:46px;padding:28px 0 60px;border-top:1.5px solid var(--선);font-size:13px;color:var(--흐림)}
.바닥 .법링크{display:flex;gap:14px;flex-wrap:wrap;margin:8px 0}.바닥 a{color:var(--남)}
.숨김{display:none!important}
/* ── 가이드 페이지 ── */
.가이드머리{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:26px 0 4px}
.가이드머리 h2{margin:0;font-size:19px}.가이드머리 a{font-size:13px;color:var(--흐림)}
.가이드카드{border-color:var(--남);box-shadow:4px 4px 0 var(--연두)}
.가이드카드 .이름{font-size:20px}
.확인도장{display:inline-block;border:2px solid var(--도장);color:var(--도장);border-radius:9px;font-size:13px;font-weight:900;padding:4px 10px;transform:rotate(-2deg);background:#fff;margin:2px 0 14px}
.가이드 h1{font-size:30px;margin-top:22px}
.가이드 .머리말 p{font-size:17px;margin:0 0 12px}
.점프{position:sticky;top:56px;z-index:4;background:var(--종이);margin:18px -18px 0;padding:10px 18px;border-bottom:1.5px solid var(--선);display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.점프 a{flex:0 0 auto;min-width:44px;height:40px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;text-decoration:none;border:1.5px solid var(--남);border-radius:99px;background:#fff;padding:0 12px}
.점프 a:active,.점프 a:focus{background:var(--남);color:var(--연두)}
.한눈 h2{margin-top:28px}
.한눈 table{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:1.5px solid var(--선);border-radius:16px;overflow:hidden}
.한눈 th,.한눈 td{padding:12px;text-align:left;vertical-align:top;font-size:15px;border-bottom:1px solid var(--선)}
.한눈 tr:last-child td{border-bottom:0}
.한눈 thead th{font-size:12px;font-weight:800;color:var(--흐림);background:#FAF9F4}
.한눈 td.번호{font-size:22px;font-weight:900;color:var(--도장);width:46px;line-height:1.2}
.한눈 td.이름 a{font-weight:900;text-decoration:none;border-bottom:2px solid var(--연두)}
.한눈 td.핵심{font-weight:800}
.공통{background:#fff;border:1.5px solid var(--선);border-left:6px solid var(--연두);border-radius:14px;padding:4px 18px 8px;margin:22px 0}
.공통 h3{font-size:15px;margin:12px 0 4px}.공통 li{font-size:16px}
.항목구역{margin:44px 0 0;scroll-margin-top:118px;padding-top:6px;border-top:3px solid var(--남)}
.번호줄{display:flex;gap:12px;align-items:flex-start;margin:14px 0 6px}
.큰번호{font-size:52px;line-height:1;font-weight:900;color:var(--도장);flex:0 0 auto;min-width:46px}
.번호줄 h2{margin:4px 0 0;font-size:23px;line-height:1.35}
.한줄{font-size:18px;font-weight:700;margin:6px 0 16px;line-height:1.6}
.블록{background:#fff;border:1.5px solid var(--선);border-radius:16px;padding:6px 18px 12px;margin:12px 0}
.블록 h3{font-size:13px;font-weight:900;margin:12px 0 6px;color:var(--흐림);letter-spacing:.3px}
.블록 ul,.블록 ol{margin:4px 0 4px;padding-left:20px}.블록 li{font-size:17px;margin:5px 0}
.블록 p{font-size:17px;margin:4px 0}
.블록.얼마{border-color:var(--남);background:#fff}
.블록.얼마 li:first-child{font-size:20px;font-weight:900;line-height:1.5}
.블록.얼마 li:first-child span{background:linear-gradient(transparent 62%,var(--연두) 62%)}
.블록.예시{background:#FBFFE9;border-color:#C9DA7E}
.블록.단계 ol{list-style:none;counter-reset:s;padding-left:0}
.블록.단계 li{counter-increment:s;position:relative;padding-left:38px;margin:10px 0}
.블록.단계 li::before{content:counter(s);position:absolute;left:0;top:1px;width:26px;height:26px;border-radius:50%;background:var(--남);color:var(--연두);font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:center}
.블록.준비 ul{list-style:none;padding-left:0}.블록.준비 li{position:relative;padding-left:28px}
.블록.준비 li::before{content:"";position:absolute;left:0;top:6px;width:16px;height:16px;border:2px solid var(--남);border-radius:4px;background:#fff}
.주의박스{background:#FFF1EC;border:2px solid var(--도장);border-radius:16px;padding:6px 18px 12px;margin:12px 0}
.주의박스 h3{font-size:14px;font-weight:900;margin:12px 0 6px;color:var(--도장)}
.주의박스 h3::before{content:"!";display:inline-flex;width:20px;height:20px;border-radius:50%;background:var(--도장);color:#fff;align-items:center;justify-content:center;font-size:13px;margin-right:7px}
.주의박스 ul{margin:4px 0;padding-left:20px}.주의박스 li{font-size:16px;margin:5px 0;font-weight:700}
.원문줄{margin:12px 0 4px}
.원문줄 .단추{justify-content:space-between;text-align:left;font-size:15px;padding:14px 16px;margin:8px 0}
.원문줄 .단추 small{font-size:12px;font-weight:700;color:var(--연두);display:block}
.맺음{background:var(--남);color:#fff;border-radius:18px;padding:20px 20px 8px;margin:40px 0 16px}
.맺음 p{font-size:16px}.맺음 .면책{font-size:13px;color:#C8CDDC}
.맺음 .단추{margin:14px 0}
@media (max-width:560px){
 .한눈 thead{display:none}
 .한눈 tr{display:grid;grid-template-columns:42px 1fr;padding:12px 14px;border-bottom:1px solid var(--선)}
 .한눈 tr:last-child{border-bottom:0}
 .한눈 td{padding:0;border:0;grid-column:2}
 .한눈 td.번호{grid-column:1;grid-row:1/4;width:auto}
 .한눈 td.핵심,.한눈 td.대상{font-size:14px;margin-top:3px}
 .한눈 td[data-l]::before{content:attr(data-l) " ";font-weight:700;color:var(--흐림);font-size:12px}
 .가이드 h1{font-size:26px}
 .큰번호{font-size:44px;min-width:40px}
}
@media (min-width:640px){.가이드 h1{font-size:36px}}
@media (min-width:640px){h1{font-size:34px}.머리 nav{gap:20px;font-size:15px}}
`;

// ───────── 광고 자리 (코드가 없으면 아무것도 만들지 않는다) ─────────
const 광고켜짐 = /^ca-pub-\d+$/.test(광고.애드센스 || '');
const 광고칸 = (이름) => { const 슬롯 = (광고.슬롯 || {})[이름]; return 광고켜짐 && /^\d+$/.test(슬롯 || '') ? `<div class="광고칸"><ins class="adsbygoogle" style="display:block" data-ad-client="${막기(광고.애드센스)}" data-ad-slot="${슬롯}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>` : ''; };

// ───────── 공통 틀 ─────────
const 틀 = ({ 제목, 설명, 경로, 본문, 현재 = '', 색인 = true, 구조 = '' }) => `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${막기(제목)}</title>
<meta name="description" content="${막기(설명)}">
<meta name="theme-color" content="#14213D">
${색인 && !시연 && !비공개 ? '' : '<meta name="robots" content="noindex, nofollow">'}
${주소 ? `<link rel="canonical" href="${주소}${경로}">` : ''}
<link rel="icon" href="${길('/logo.png')}" type="image/png">
<link rel="apple-touch-icon" href="${길('/logo.png')}">
<meta property="og:type" content="website"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="${막기(설정.이름)}">
<meta property="og:title" content="${막기(제목)}"><meta property="og:description" content="${막기(설명)}">
${주소 ? `<meta property="og:url" content="${주소}${경로}"><meta property="og:image" content="${주소}/logo.png">` : ''}
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="${길('/style.css')}">
${광고켜짐 && !시연 && !비공개 ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${막기(광고.애드센스)}" crossorigin="anonymous"></script>` : ''}
${구조 ? `<script type="application/ld+json">${구조.replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
${시연 ? '<div class="시연띠">예시 화면입니다 · 공개하지 마세요</div>' : ''}
<header class="머리"><div class="틀">
  <a class="로고줄" href="${길('/')}"><img src="${길('/logo.png')}" alt="" width="32" height="32"><span>${막기(설정.이름)}</span></a>
  <nav><a href="${길('/')}"${현재 === '홈' ? ' aria-current="page"' : ''}>이번 달</a>${가이드들.length ? `<a href="${길('/g/')}"${현재 === '가이드' ? ' aria-current="page"' : ''}>가이드</a>` : ''}<a href="${길('/archive/')}"${현재 === '지난' ? ' aria-current="page"' : ''}>지난 총정리</a><a href="${길('/about/')}"${현재 === '소개' ? ' aria-current="page"' : ''}>소개</a></nav>
</div></header>
<main class="틀">
${본문}
</main>
<footer class="틀 바닥">
  <div><b>${막기(설정.이름)}</b> · ${막기(설정.한줄)} · <a href="${막기(설정.인스타)}" target="_blank" rel="noopener">인스타그램 @jiwongeum_hunter</a></div>
  <div>금액·대상·기간은 바뀔 수 있어요. 신청 전에는 꼭 원문(기관 공고)에서 다시 확인해 주세요. 이 사이트는 정부·지자체의 공식 사이트가 아니며 신청을 대행하지 않습니다.</div>
  <div class="법링크"><a href="${길('/about/')}">소개</a><a href="${길('/privacy/')}">개인정보처리방침</a><a href="${길('/contact/')}">문의·정정 요청</a></div>
  <div>${준비중 ? '운영자 정보 준비 중' : `운영 ${막기(운영.상호)}${운영.대표자 ? ' · 대표자 ' + 막기(운영.대표자) : ''}${메일없음 ? ' · 문의는 인스타그램 메시지' : ' · ' + 막기(운영.이메일)}`}</div>
</footer>
</body>
</html>`;

// ───────── 항목 카드 · 월별 화면 ─────────
const 카드 = (x, m) => `<a class="카드" href="${길(`/i/${x.id}/`)}" data-분류="${막기(x.분류 || '')}">
  <span class="도장" aria-label="원문 확인 ${확인글(x.확인일)}">원문확인<br>${확인글(x.확인일)}</span>
  <span class="딱지">${막기(x.분류 || '지원금')}</span>
  <span class="이름">${막기(x.이름)}</span><span class="기관">${막기(x.기관 || '')}</span>
  ${x.금액 ? `<div class="금액"><span>${막기(x.금액)}</span></div>` : ''}
  ${x.대상 ? `<div class="줄정보"><b>대상</b> ${막기(x.대상)}</div>` : ''}
  <div class="줄정보"><b>기간</b> ${x.기간 && x.기간 !== '상시' ? '~ ' : ''}${막기(날짜글(x.기간))}</div>
</a>`;

const 월본문 = (m, 정식경로) => {
  const 분류들 = [...new Set(m.항목.map((x) => x.분류).filter(Boolean))];
  return `<h1><mark>${막기(월글(m))}</mark> 지원금 총정리</h1>
<p class="부제">${막기(m.머리말 || '')}${m.머리말 ? '<br>' : ''}원문을 확인한 ${m.항목.length}개 · 마지막 확인 ${막기(날짜글(m.확인일))}</p>
${m === 최신 ? 가이드구역() + 도구구역() : ''}
${분류들.length > 1 ? `<div class="요약줄" role="group" aria-label="분류"><button type="button" class="칩" data-f="" aria-pressed="true">전체</button>${분류들.map((c) => `<button type="button" class="칩" data-f="${막기(c)}" aria-pressed="false">${막기(c)}</button>`).join('')}</div>` : ''}
${광고칸('상단')}
<div id="목록">
${m.항목.length ? m.항목.map((x, i) => 카드(x, m) + (i === 2 ? 광고칸('중간') : '')).join('\n') : '<div class="빈">아직 이 달의 총정리를 준비하고 있어요.<br>원문을 확인한 항목부터 채웁니다.</div>'}
</div>
${광고칸('하단')}
<a class="단추 연두" href="${막기(설정.인스타)}" target="_blank" rel="noopener">인스타그램에서 매일 새 지원금 보기</a>
<script>(function(){var c=document.querySelectorAll('.칩');if(!c.length)return;c.forEach(function(b){b.addEventListener('click',function(){var f=b.getAttribute('data-f');c.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});document.querySelectorAll('#목록 .카드').forEach(function(k){k.classList.toggle('숨김',!!f&&k.getAttribute('data-분류')!==f)})})})})();</script>`;
};

// ───────── 가이드 화면 ─────────
const 목록줄 = (arr, tag = 'ul') => (arr && arr.length ? `<${tag}>${arr.map((v) => `<li>${막기(v)}</li>`).join('')}</${tag}>` : '');
const 가이드카드 = (g) => `<a class="카드 가이드카드" href="${길(`/g/${g.slug}/`)}">
  <span class="딱지">${막기(g.분류 || '가이드')}</span>
  <span class="이름">${막기(g.제목)}</span><span class="기관">${막기(g.부제 || '')}</span>
  <div class="줄정보"><b>구성</b> ${g.항목.length}가지 · 공식 원문 확인 ${막기(확인글(g.확인일))}</div>
</a>`;
const 도구구역 = () => (연말정산 ? `<div class="가이드머리"><h2>계산기</h2></div>\n<a class="카드 가이드카드" href="${길('/tools/yeonmal/')}"><span class="딱지">${연말정산.R.귀속연도}년 귀속</span><span class="이름">${막기(연말정산.R.제목)}</span><span class="기관">월세·의료비·교육비·카드·연금저축 — 내 공제 어림하기 (입력값은 서버로 안 보내요)</span></a>` : '');
const 가이드구역 = () => (가이드들.length ? `<div class="가이드머리"><h2>정리 가이드</h2>${가이드들.length > 1 ? `<a href="${길('/g/')}">전체 보기</a>` : ''}</div>\n${가이드들.slice(0, 3).map(가이드카드).join('\n')}` : '');

const 가이드본문 = (g) => {
  const 한눈 = g.항목.map((x, i) => ({ 번호: 항목번호(g, i), 이름: (g.한눈에 && g.한눈에[i] && g.한눈에[i].이름) || x.제목, 핵심: (g.한눈에 && g.한눈에[i] && g.한눈에[i].핵심) || '', 대상: (g.한눈에 && g.한눈에[i] && g.한눈에[i].대상) || '' }));
  const 머리말 = [].concat(g.머리말 || []);
  const 구역 = (x, i) => `<section class="항목구역" id="g${i + 1}" aria-labelledby="g${i + 1}t">
  <div class="번호줄"><span class="큰번호" aria-hidden="true">${막기(항목번호(g, i))}</span><h2 id="g${i + 1}t">${막기(x.제목)}</h2></div>
  ${x.한줄 ? `<p class="한줄">${막기(x.한줄)}</p>` : ''}
  ${x.얼마 && x.얼마.length ? `<div class="블록 얼마"><h3>얼마</h3><ul>${x.얼마.map((v, k) => `<li>${k === 0 ? `<span>${막기(v)}</span>` : 막기(v)}</li>`).join('')}</ul></div>` : ''}
  ${x.누가 && x.누가.length ? `<div class="블록"><h3>누가</h3>${목록줄(x.누가)}</div>` : ''}
  ${x.예시 ? `<div class="블록 예시"><h3>예시</h3><p>${막기(x.예시)}</p></div>` : ''}
  ${x.준비물 && x.준비물.length ? `<div class="블록 준비"><h3>준비물</h3>${목록줄(x.준비물)}</div>` : ''}
  ${x.신청 && x.신청.length ? `<div class="블록 단계"><h3>신청 방법</h3>${목록줄([].concat(x.신청), 'ol')}</div>` : ''}
  ${x.주의 && x.주의.length ? `<div class="주의박스" role="note"><h3>꼭 확인하세요</h3>${목록줄([].concat(x.주의))}</div>` : ''}
  <div class="원문줄">${x.원문.map((w) => `<a class="단추" href="${막기(w.url)}" target="_blank" rel="noopener noreferrer"><span><small>공식 원문 ${막기(확인글(g.확인일))} 확인</small>${막기(w.이름 || '원문 보러 가기')}</span><span aria-hidden="true">→</span></a>`).join('')}</div>
  ${i === 1 ? 광고칸('중간') : ''}
</section>`;
  return `<article class="가이드">
  <p class="작은" style="margin:20px 0 0"><a href="${길('/')}">← 이번 달 총정리</a></p>
  <span class="딱지">${막기(g.분류 || '가이드')}</span>
  <h1>${막기(g.제목)}</h1>
  ${g.부제 ? `<p class="부제" style="font-size:16px">${막기(g.부제)}</p>` : ''}
  <span class="확인도장">공식 원문 확인 · ${막기(가이드날짜(g.확인일))}</span>
  ${머리말.length ? `<div class="머리말">${머리말.map((p) => `<p>${막기(p)}</p>`).join('')}</div>` : ''}
  <nav class="점프" aria-label="항목으로 바로가기">${g.항목.map((x, i) => `<a href="#g${i + 1}" aria-label="${막기(항목번호(g, i))} ${막기(x.제목)}">${막기(항목번호(g, i))}</a>`).join('')}</nav>
  <section class="한눈">
    <h2>한눈에 보기</h2>
    <table><thead><tr><th scope="col">번호</th><th scope="col">이름</th><th scope="col">핵심</th><th scope="col">대상</th></tr></thead>
    <tbody>${한눈.map((r, i) => `<tr><td class="번호">${막기(r.번호)}</td><td class="이름"><a href="#g${i + 1}">${막기(r.이름)}</a></td><td class="핵심"${r.핵심 ? ' data-l="핵심"' : ''}>${막기(r.핵심)}</td><td class="대상"${r.대상 ? ' data-l="대상"' : ''}>${막기(r.대상)}</td></tr>`).join('')}</tbody></table>
  </section>
  ${광고칸('상단')}
  ${g.공통준비 && g.공통준비.length ? `<aside class="공통"><h3>공통으로 먼저 준비하세요</h3>${목록줄(g.공통준비)}</aside>` : ''}
  ${g.항목.map(구역).join('\n')}
  ${광고칸('하단')}
  <div class="맺음">
    ${g.맺음말 ? `<p>${막기(g.맺음말)}</p>` : ''}
    ${g.면책 ? `<p class="면책">${막기(g.면책)}</p>` : ''}
    <a class="단추 연두" href="${막기(설정.인스타)}" target="_blank" rel="noopener">인스타그램 @jiwongeum_hunter에서 매일 새 지원금 보기</a>
  </div>
  <a class="단추" href="${길('/')}">이번 달 지원금 총정리 보기</a>
</article>`;
};
const 가이드구조 = (g, 경로) => JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', headline: g.제목, description: [g.부제, ...[].concat(g.머리말 || []).slice(0, 1)].filter(Boolean).join('. ').slice(0, 200), inLanguage: 'ko', datePublished: g.확인일, dateModified: g.확인일, author: { '@type': 'Organization', name: 설정.이름 }, publisher: { '@type': 'Organization', name: 설정.이름, ...(주소 ? { logo: { '@type': 'ImageObject', url: `${주소}/logo.png` } } : {}) }, ...(주소 ? { mainEntityOfPage: `${주소}${경로}`, image: `${주소}/logo.png` } : {}) },
    { '@type': 'ItemList', name: g.제목, numberOfItems: g.항목.length, itemListElement: g.항목.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.제목, ...(주소 ? { url: `${주소}${경로}#g${i + 1}` } : {}) })) },
  ],
});

// ───────── 쓰기 ─────────
const 최신 = 월들[0];
const 월구조 = (m) => JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: `${월글(m)} 지원금 총정리`, numberOfItems: m.항목.length, itemListElement: m.항목.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.이름, url: `${주소}/i/${x.id}/` })) });

if (최신) {
  쓰기('index.html', 틀({ 제목: `${월글(최신)} 지원금 총정리 · ${설정.이름}`, 설명: `${월글(최신)} 신청할 수 있는 지원금을 원문 확인한 것만 금액·대상·기간 순으로 정리했어요.`, 경로: '/', 현재: '홈', 본문: 월본문(최신), 구조: 월구조(최신) }));
} else {
  쓰기('index.html', 틀({ 제목: `${설정.이름} · 지원금 총정리`, 설명: '원문을 확인한 지원금만 정리합니다.', 경로: '/', 현재: '홈', 색인: false, 본문: `<h1><mark>지원금</mark> 총정리</h1><div class="빈">첫 총정리를 준비하고 있어요.</div>` }));
}
월들.forEach((m) => {
  쓰기(`m/${m.월}/index.html`, 틀({ 제목: `${월글(m)} 지원금 총정리 · ${설정.이름}`, 설명: `${월글(m)} 지원금 ${m.항목.length}개를 금액·대상·기간 순으로 정리했어요. 모두 원문을 확인했어요.`, 경로: `/m/${m.월}/`, 현재: m === 최신 ? '홈' : '지난', 본문: 월본문(m), 구조: 월구조(m) }));
  m.항목.forEach((x) => {
    const 정보 = [['금액', x.금액], ['대상', x.대상], ['기간', x.기간 && x.기간 !== '상시' ? `~ ${날짜글(x.기간)}` : x.기간 ? '상시 접수' : ''], ['신청', x.신청], ['주의', x.주의]].filter(([, v]) => v);
    쓰기(`i/${x.id}/index.html`, 틀({
      제목: `${x.이름} 대상·금액·신청방법 (${월글(m)} 확인) · ${설정.이름}`,
      설명: `${x.기관 ? x.기관 + ' · ' : ''}${x.금액 ? x.금액 + ' · ' : ''}${x.요약 || x.이름}`.slice(0, 150), 경로: `/i/${x.id}/`,
      본문: `<article class="상세">
  <p class="작은" style="margin-top:20px"><a href="${길(`/m/${m.월}/`)}">← ${막기(월글(m))} 총정리</a></p>
  <span class="딱지">${막기(x.분류 || '지원금')}</span>
  <h1>${막기(x.이름)}</h1>
  <p class="부제">${막기(x.기관 || '')} · 원문 확인 ${막기(확인글(x.확인일))}</p>
  ${x.요약 ? `<p>${막기(x.요약)}</p>` : ''}
  <dl>${정보.map(([k, v]) => `<div><dt>${k}</dt><dd>${막기(v)}</dd></div>`).join('')}</dl>
  ${광고칸('상단')}
  <a class="단추" href="${막기(x.링크)}" target="_blank" rel="noopener noreferrer">원문 보러 가기 →</a>
  <p class="안내">금액·대상·기간은 ${막기(확인글(x.확인일))}에 원문에서 확인한 내용이에요. 바뀔 수 있으니 신청 전에 원문에서 다시 확인해 주세요.</p>
  ${광고칸('하단')}
</article>`,
    }));
  });
});

가이드들.forEach((g) => {
  const 경로 = `/g/${g.slug}/`;
  쓰기(`g/${g.slug}/index.html`, 틀({
    제목: `${g.제목} — 금액·조건·준비물·신청 방법 (${확인글(g.확인일)} 확인) · ${설정.이름}`,
    설명: [g.부제, ...[].concat(g.머리말 || []).slice(0, 1)].filter(Boolean).join(' ').slice(0, 150),
    경로, 본문: 가이드본문(g), 구조: 가이드구조(g, 경로),
  }));
});
if (가이드들.length) 쓰기('g/index.html', 틀({ 제목: `정리 가이드 · ${설정.이름}`, 설명: '공식 원문을 확인해 금액·조건·준비물·신청 방법까지 한 편으로 정리한 가이드 모음', 경로: '/g/', 현재: '가이드', 본문: `<h1><mark>정리</mark> 가이드</h1><p class="부제">공식 원문을 확인해 금액·조건·준비물·신청 방법까지 한 편으로 정리했어요.</p>${가이드들.map(가이드카드).join('\n')}` }));

쓰기('archive/index.html', 틀({ 제목: `지난 지원금 총정리 · ${설정.이름}`, 설명: '월별 지원금 총정리 모음', 경로: '/archive/', 현재: '지난', 본문: `<h1><mark>지난</mark> 총정리</h1><p class="부제">월별로 원문을 확인한 지원금 모음이에요.</p>${가이드들.length ? `<div class="가이드머리"><h2>정리 가이드</h2></div>${가이드들.map(가이드카드).join('\n')}<div class="가이드머리"><h2>월별 총정리</h2></div>` : ''}<div class="목록">${월들.length ? 월들.map((m) => `<a href="${길(`/m/${m.월}/`)}"><span>${막기(월글(m))} 지원금 총정리</span><small>${m.항목.length}개</small></a>`).join('') : '<div class="빈">아직 올라온 총정리가 없어요.</div>'}</div>` }));

쓰기('about/index.html', 틀({ 제목: `소개 · ${설정.이름}`, 설명: '지원금헌터는 원문을 확인한 지원금만 정리합니다.', 경로: '/about/', 현재: '소개', 본문: `<h1><mark>원문</mark>을 확인한 것만</h1>
<div class="글"><h2>지원금헌터는</h2>
<p>정부·지자체·공공기관이 낸 지원금 정보를 매달 한곳에 정리합니다. 인스타그램 <a href="${막기(설정.인스타)}" target="_blank" rel="noopener">@jiwongeum_hunter</a>에서 소개한 내용을 월별로 모아 볼 수 있어요.</p>
<h2>이렇게 정리해요</h2>
<ul><li>금액·대상·기간은 <b>기관의 원문</b>을 읽고 확인한 것만 적어요. 확인하지 못한 값은 비워 둬요.</li><li>모든 항목에 원문 링크와 확인한 날짜를 달아요.</li><li>다른 사이트의 요약을 옮기지 않아요.</li><li>지원금 신청을 대행하거나 수수료를 받지 않아요.</li></ul>
<h2>정보가 달라졌다면</h2>
<p>금액·기간이 원문과 다르면 <a href="${길('/contact/')}">문의·정정 요청</a>으로 알려 주세요. 확인해서 고쳐요.</p>
${준비중 ? '' : `<h2>운영</h2><p>${막기(운영.상호)}${운영.대표자 ? ' (대표 ' + 막기(운영.대표자) + ')' : ''}가 운영합니다.</p>`}</div>` }));

쓰기('contact/index.html', 틀({ 제목: `문의·정정 요청 · ${설정.이름}`, 설명: '지원금헌터 문의와 정정 요청', 경로: '/contact/', 본문: `<h1>문의·정정 요청</h1><div class="글"><p>정보가 틀렸거나 궁금한 점이 있으면 이메일로 알려 주세요. 원문 링크와 틀린 내용을 함께 적어 주시면 빨리 확인할 수 있어요.</p>${준비중 || 메일없음 ? '<p><b>문의 창구를 준비하고 있어요.</b> 그동안은 인스타그램 @jiwongeum_hunter 메시지로 알려 주세요.</p>' : `<p><b>${막기(운영.이메일)}</b></p><p class="작은">답변을 위해 보내 주신 이메일 주소와 내용만 받습니다. 영업일 기준 3일 안에 답해 드려요.</p>`}</div>` }));

쓰기('privacy/index.html', 틀({ 제목: `개인정보처리방침 · ${설정.이름}`, 설명: '지원금헌터 개인정보처리방침', 경로: '/privacy/', 본문: `<h1>개인정보처리방침</h1><p class="작은">시행일 ${막기(날짜글(설정.시행일 || ''))}</p>
<div class="글"><p>${준비중 ? '운영자' : 막기(운영.상호)}(이하 "운영자")는 개인정보 보호법 등 관련 법령을 지키며, ${막기(설정.이름)}(이 사이트) 이용자의 개인정보를 소중히 다룹니다.</p>
<h2>1. 이 사이트가 모으는 정보</h2>
<ul><li>회원가입이 없고, 이름이나 연락처를 묻지 않습니다.</li>
${광고켜짐 ? '<li>사이트에는 구글 애드센스(Google AdSense) 광고가 표시됩니다. 광고가 표시되면 구글이 쿠키와 광고 식별자, 접속 기록 등 행태정보를 수집해 맞춤형 광고에 쓸 수 있습니다. 자세한 내용은 구글 광고 정책(policies.google.com/technologies/ads)을 참고하세요. 브라우저 설정에서 쿠키를 차단·삭제할 수 있고, 구글 광고 설정(adssettings.google.com)에서 맞춤형 광고를 끌 수 있습니다.</li>' : '<li>광고나 이용 분석을 위한 쿠키를 쓰지 않습니다.</li>'}
${연말정산 ? '<li>연말정산 계산기에 입력한 금액은 이용자의 기기(브라우저) 안에서만 계산되며, 서버로 전송하거나 저장하지 않습니다.</li>' : ''}
<li>사이트는 GitHub Pages로 운영되며, 접속 기록(IP 주소 등)은 호스팅 사업자(GitHub)가 자체 정책에 따라 처리합니다.</li>
<li>글꼴을 외부 서비스(jsDelivr)에서 불러오기 때문에 페이지를 열 때 이용자의 IP 주소가 그 서비스에 전달될 수 있습니다.</li>
<li>문의하시면 답변을 위해 이메일 주소(또는 인스타그램 계정)와 문의 내용을 받고, 답변을 마치면 지체 없이 파기합니다(분쟁 처리가 필요한 경우 3년).</li></ul>
<h2>2. 제3자 제공</h2><p>이용자의 개인정보를 동의 없이 제3자에게 제공하지 않습니다. 다만 법령에 근거한 요청이 있으면 예외로 합니다.</p>
<h2>3. 이용자의 권리</h2><p>이용자는 언제든 자신의 정보에 대한 열람·정정·삭제를 요청할 수 있습니다. ${준비중 || 메일없음 ? '문의 창구(인스타그램 @jiwongeum_hunter 메시지)' : 막기(운영.이메일)}로 알려 주세요.</p>
<h2>4. 개인정보보호책임자</h2><p>${준비중 ? '준비 중' : 막기(운영.개인정보보호책임자 || 운영.대표자) + (메일없음 ? ' · 연락은 인스타그램 @jiwongeum_hunter 메시지' : ' · ' + 막기(운영.이메일))}</p>
<h2>5. 변경</h2><p>이 방침이 바뀌면 이 페이지에 시행일과 함께 알립니다.</p></div>` }));

쓰기('404.html', 틀({ 제목: `페이지를 찾을 수 없어요 · ${설정.이름}`, 설명: '페이지를 찾을 수 없어요', 경로: '/404.html', 색인: false, 본문: `<h1>찾는 페이지가 없어요</h1><p>주소가 바뀌었거나 지난 항목일 수 있어요.</p><a class="단추" href="${길('/')}">이번 달 총정리 보기</a>` }));

if (연말정산) {
  쓰기('tools/yeonmal/index.html', 틀({
    제목: `${연말정산.R.제목} ${연말정산.R.귀속연도}년 귀속 — 월세·의료비·교육비·카드·연금저축 공제 (${확인글(연말정산.R.확인일)} 확인) · ${설정.이름}`,
    설명: `${연말정산.R.귀속연도}년 귀속 연말정산, 월세·의료비·교육비·보험료·연금저축 세액공제와 카드·주택대출 소득공제를 법령 조문 기준으로 어림해 보는 계산기. 입력값은 서버로 보내지 않아요.`,
    경로: '/tools/yeonmal/', 본문: 도구페이지.본문(연말정산, 길),
  }));
}
쓰기('style.css', 스타일.trim() + '\n' + (연말정산 ? 도구페이지.스타일.trim() + '\n' : ''));
if (fs.existsSync(path.join(뿌리, '자료', 'logo.png'))) fs.copyFileSync(path.join(뿌리, '자료', 'logo.png'), path.join(결과, 'logo.png'));
if (광고켜짐 && 광고.애드센스) 쓰기('ads.txt', `google.com, pub-${광고.애드센스.replace('ca-pub-', '')}, DIRECT, f08c47fec0942fa0\n`);
if (설정.도메인 && !시연 && !기준) 쓰기('CNAME', 설정.도메인.trim() + '\n');
쓰기('robots.txt', 시연 || 비공개 || !주소 ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${주소}/sitemap.xml\n`);
const 오늘 = new Date().toISOString().slice(0, 10);
const 경로들 = ['/', '/archive/', '/about/', '/contact/', '/privacy/', ...(가이드들.length ? ['/g/', ...가이드들.map((g) => `/g/${g.slug}/`)] : []), ...(연말정산 ? ['/tools/yeonmal/'] : []), ...월들.map((m) => `/m/${m.월}/`), ...월들.flatMap((m) => m.항목.map((x) => `/i/${x.id}/`))];
쓰기('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${경로들.map((u) => `  <url><loc>${주소}${u}</loc><lastmod>${오늘}</lastmod></url>`).join('\n')}\n</urlset>\n`);

console.log(`\n  지원금헌터 사이트를 만들었습니다 → ${결과}`);
console.log(`  월 ${월들.length}개 · 항목 ${월들.reduce((s, m) => s + m.항목.length, 0)}개 · 가이드 ${가이드들.length}편${시연 ? ' · 예시 포함(noindex)' : ''}${광고켜짐 ? ' · 광고 켜짐' : ' · 광고 자리 없음(승인 뒤 자료/광고.json)'}\n`);
