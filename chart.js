// 3인 전체 총운용 명식 계산 — 사주·자미두수·베딕을 라이브러리로 계산한다 (추측 금지).
// 방문자 브라우저에서 돌린다: 서버(Cloudflare 무료)는 요청당 CPU 10ms라 천문 계산을 맡기기 어렵다.
import { Solar } from 'https://cdn.jsdelivr.net/npm/lunar-javascript@1.7.7/+esm';
import { astro } from 'https://cdn.jsdelivr.net/npm/iztro@2.6.1/+esm';
import * as A from 'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/+esm';

/* ---------- 공통 ---------- */
const GAN_KO = { 甲:'갑',乙:'을',丙:'병',丁:'정',戊:'무',己:'기',庚:'경',辛:'신',壬:'임',癸:'계' };
const ZHI_KO = { 子:'자',丑:'축',寅:'인',卯:'묘',辰:'진',巳:'사',午:'오',未:'미',申:'신',酉:'유',戌:'술',亥:'해' };
const GAN_WX = { 甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수' };
const ZHI_WX = { 子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수' };
const ZHI_MAIN = { 子:'癸',丑:'己',寅:'甲',卯:'乙',辰:'戊',巳:'丙',午:'丁',未:'己',申:'庚',酉:'辛',戌:'戊',亥:'壬' }; // 지장간 본기
const YANG = new Set(['甲','丙','戊','庚','壬']);
const WX = ['목','화','토','금','수'];
const WX_GEN = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };   // 생
const WX_CTRL = { 목:'토', 토:'수', 수:'화', 화:'금', 금:'목' };  // 극
const JIE_KO = { 立春:'입춘',惊蛰:'경칩',驚蟄:'경칩',清明:'청명',立夏:'입하',芒种:'망종',芒種:'망종',小暑:'소서',立秋:'입추',白露:'백로',寒露:'한로',立冬:'입동',大雪:'대설',小寒:'소한' };
const pad = n => String(n).padStart(2,'0');
const ko = gz => (GAN_KO[gz[0]]||'') + (ZHI_KO[gz[1]]||'');
const hourBranch = h => '子丑丑寅寅卯卯辰辰巳巳午午未未申申酉酉戌戌亥亥子'[h];

// 벽시계 시각(해당 지역 기준 연월일시분)을 UTC 필드에 담아 다루는 도우미
const wall = ms => { const d = new Date(ms); return { y:d.getUTCFullYear(), m:d.getUTCMonth()+1, d:d.getUTCDate(), h:d.getUTCHours(), mi:d.getUTCMinutes() }; };
const wallStr = w => `${w.y}-${pad(w.m)}-${pad(w.d)} ${pad(w.h)}:${pad(w.mi)}`;
const toSolar = w => Solar.fromYmdHms(w.y, w.m, w.d, w.h, w.mi, 0);

// 균시차(분): 9.87·sin(2B) − 7.53·cos(B) − 1.5·sin(B), B = 2π(일수−81)/364
function equationOfTime(w){
  const n = Math.round((Date.UTC(w.y, w.m-1, w.d) - Date.UTC(w.y, 0, 0)) / 864e5);
  const B = 2*Math.PI*(n-81)/364;
  return 9.87*Math.sin(2*B) - 7.53*Math.cos(B) - 1.5*Math.sin(B);
}

/* ---------- 사주 ---------- */
function shishen(dm, stem){
  const a = GAN_WX[dm], b = GAN_WX[stem], same = YANG.has(dm) === YANG.has(stem);
  if (a === b) return same ? '비견' : '겁재';
  if (WX_GEN[a] === b) return same ? '식신' : '상관';
  if (WX_CTRL[a] === b) return same ? '편재' : '정재';
  if (WX_CTRL[b] === a) return same ? '편관' : '정관';
  return same ? '편인' : '정인';
}
const SHISHEN_ALL = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];
const LIUHE = ['子丑','寅亥','卯戌','辰酉','巳申','午未'], CHONG = ['子午','丑未','寅申','卯酉','辰戌','巳亥'];
const SANHE = [['申子辰','수'],['亥卯未','목'],['寅午戌','화'],['巳酉丑','금']];
const FANGHE = [['寅卯辰','목'],['巳午未','화'],['申酉戌','금'],['亥子丑','수']];
const SANXING = ['寅巳申','丑戌未'];
function relations(zhis){
  const out = [], has = z => zhis.includes(z);
  const pairs = (list, name) => list.forEach(p => { if (has(p[0]) && has(p[1])) out.push(`${name}: ${ZHI_KO[p[0]]}${ZHI_KO[p[1]]}`); });
  pairs(LIUHE, '육합'); pairs(CHONG, '충');
  SANHE.forEach(([set, wx]) => { const n = [...set].filter(has).length; if (n === 3) out.push(`삼합(${wx}국): ${[...set].map(z=>ZHI_KO[z]).join('')}`); else if (n === 2 && has(set[1])) out.push(`반합(${wx}): ${[...set].filter(has).map(z=>ZHI_KO[z]).join('')}`); });
  FANGHE.forEach(([set, wx]) => { if ([...set].every(has)) out.push(`방합(${wx}): ${[...set].map(z=>ZHI_KO[z]).join('')}`); });
  SANXING.forEach(set => { const n = [...set].filter(has).length; if (n >= 2) out.push(`${n===3?'삼형':'형'}: ${[...set].filter(has).map(z=>ZHI_KO[z]).join('')}`); });
  if (has('子') && has('卯')) out.push('상형: 자묘');
  ['辰','午','酉','亥'].forEach(z => { if (zhis.filter(x => x === z).length >= 2) out.push(`자형: ${ZHI_KO[z]}${ZHI_KO[z]}`); });
  return out;
}

// 한 후보(기준 시각·자시 처리)의 여덟 글자
function pillarsFor(bjWall, localWall, sect){
  const ecb = toSolar(bjWall).getLunar().getEightChar();       // 연·월: 절기 실시각 기준 (라이브러리는 UTC+8 기준)
  const ecl = toSolar(localWall).getLunar().getEightChar();    // 일·시: 선택한 기준 시각
  ecl.setSect(sect);
  return { year: ecb.getYear(), month: ecb.getMonth(), day: ecl.getDay(), time: ecl.getTime(), ecb };
}

/* ---------- 경계 검증 + 후보 ---------- */
// input: { birth:'YYYY-MM-DD', time:'HH:MM', gender:'여성'|'남성', lat, lon }
export function candidates(input){
  const [y,m,d] = input.birth.split('-').map(Number), [h,mi] = input.time.split(':').map(Number);
  const utc = Date.UTC(y, m-1, d, h, mi) - 9*3600e3;          // KST → UTC
  const kst = wall(utc + 9*3600e3), bj = wall(utc + 8*3600e3);
  const eot = equationOfTime(kst), offset = (input.lon - 135)*4 + eot;
  const tst = wall(utc + 9*3600e3 + offset*60e3);

  const flags = [];
  if (hourBranch(kst.h) !== hourBranch(tst.h)) flags.push({ code:'hour', text:`시계 시각(${pad(kst.h)}:${pad(kst.mi)})과 진태양시(${pad(tst.h)}:${pad(tst.mi)})가 서로 다른 시진이에요 (${ZHI_KO[hourBranch(kst.h)]}시 / ${ZHI_KO[hourBranch(tst.h)]}시).` });
  if (kst.h === 23 || tst.h === 23) flags.push({ code:'zi', text:'23시대 출생이라 자시에 날짜를 바꿀지(자시 시작) 자정에 바꿀지(야자시)에 따라 일주가 달라질 수 있어요.' });
  const lunar = toSolar(bj).getLunar();
  const near = [lunar.getPrevJie(), lunar.getNextJie()].map(j => ({ name: JIE_KO[j.getName()] || j.getName(), s: j.getSolar() }))
    .map(j => ({ ...j, ms: Date.UTC(j.s.getYear(), j.s.getMonth()-1, j.s.getDay(), j.s.getHour(), j.s.getMinute()) - 8*3600e3 }))
    .map(j => ({ ...j, days: (j.ms - utc)/864e5 }))
    .filter(j => Math.abs(j.days) <= 3);
  near.forEach(j => flags.push({ code:'jieqi', text:`절기 ${j.name}(${wallStr(wall(j.ms + 9*3600e3))} KST)와 ${Math.abs(j.days).toFixed(1)}일 차이라 월주가 경계에 있어요.`, jieMs: j.ms }));

  const list = [];
  const add = (id, label, bjW, locW, sect) => {
    const p = pillarsFor(bjW, locW, sect);
    list.push({ id, label, pillars: [p.year, p.month, p.day, p.time], dayMaster: p.day[0], localWall: locW, sect });
  };
  const sects = w => w.h === 23 ? [[2,'자정에 날짜 변경(야자시)'],[1,'23시(자시 시작)에 날짜 변경']] : [[2,'']];
  for (const [sect, sl] of sects(tst)) add(`tst${sect}`, `진태양시 ${pad(tst.h)}:${pad(tst.mi)}${sl?' · '+sl:''}`, bj, tst, sect);
  for (const [sect, sl] of sects(kst)) add(`clock${sect}`, `시계 시각 ${pad(kst.h)}:${pad(kst.mi)}${sl?' · '+sl:''}`, bj, kst, sect);
  for (const j of near) {                                       // 절기 반대편이었다면
    const other = j.ms > utc ? j.ms + 60e3 : j.ms - 60e3;
    const p = pillarsFor(wall(other + 8*3600e3), tst, 2);
    list.push({ id:'jie', label:`절기 ${j.name} 반대편으로 본 경우 (출생 시각 기록이 틀렸다면)`, pillars:[p.year, p.month, list[0].pillars[2], list[0].pillars[3]], dayMaster:list[0].dayMaster, localWall: tst, sect:2, jieOther: other });
  }
  // 같은 여덟 글자는 하나로
  const seen = new Set(), uniq = list.filter(c => { const k = c.pillars.join(''); if (seen.has(k)) return false; seen.add(k); return true; });
  uniq.forEach(c => { c.hangul = c.pillars.map(ko).join(' '); c.dayMasterKo = GAN_KO[c.dayMaster]; });
  return { ask: flags.length > 0, flags, list: uniq, kst: wallStr(kst), tst: wallStr(tst), offsetMin: Math.round(offset), eotMin: +eot.toFixed(1) };
}

/* ---------- 전체 명식 ---------- */
export function buildChart(input, cand, cands){
  const [y,m,d] = input.birth.split('-').map(Number), [h,mi] = input.time.split(':').map(Number);
  const utc = Date.UTC(y, m-1, d, h, mi) - 9*3600e3;
  const male = input.gender === '남성';
  const today = new Date(), thisYear = today.getFullYear();

  // 사주
  const bjMs = cand.jieOther ?? utc;
  const ecb = toSolar(wall(bjMs + 8*3600e3)).getLunar().getEightChar();
  const [yp, mp, dp, tp] = cand.pillars, dm = dp[0];
  const pos = ['연주','월주','일주','시주'];
  const pillars = cand.pillars.map((gz, i) => ({
    pos: pos[i], gz, ko: ko(gz), ganWx: GAN_WX[gz[0]], zhiWx: ZHI_WX[gz[1]],
    ganShishen: i === 2 ? '일간(나)' : shishen(dm, gz[0]), zhiShishen: shishen(dm, ZHI_MAIN[gz[1]]),
  }));
  const wuxing = Object.fromEntries(WX.map(w => [w, 0]));
  cand.pillars.forEach(gz => { wuxing[GAN_WX[gz[0]]]++; wuxing[ZHI_WX[gz[1]]]++; });
  const ssCount = Object.fromEntries(SHISHEN_ALL.map(s => [s, 0]));
  pillars.forEach((p, i) => { if (i !== 2) ssCount[p.ganShishen]++; ssCount[p.zhiShishen]++; });
  const yun = ecb.getYun(male ? 1 : 0);
  const daeun = yun.getDaYun(10).slice(1, 9).map(dy => ({ age: dy.getStartAge(), year: dy.getStartYear(), gz: dy.getGanZhi(), ko: ko(dy.getGanZhi()) }));
  const seun = Array.from({ length: 5 }, (_, k) => { const gz = Solar.fromYmd(thisYear + k, 7, 1).getLunar().getYearInGanZhiExact(); return { year: thisYear + k, gz, ko: ko(gz) }; });
  const yearStemYang = YANG.has(yp[0]);
  const saju = {
    pillars, dayMaster: `${GAN_KO[dm]}${GAN_WX[dm]}(${dm})`, wuxing,
    wuxingZero: WX.filter(w => wuxing[w] === 0), shishen: ssCount, shishenZero: SHISHEN_ALL.filter(s => ssCount[s] === 0),
    relations: relations(cand.pillars.map(p => p[1])),
    daeunDirection: (yearStemYang === male) ? '순행' : '역행',
    daeunStart: `${yun.getStartYear()}년 ${yun.getStartMonth()}개월 ${yun.getStartDay()}일 뒤`,
    daeun, seun, lunar: (L => `${L.getYear()}년 ${L.getMonth()<0?"윤":""}${Math.abs(L.getMonth())}월 ${L.getDay()}일`)(toSolar(wall(utc + 9*3600e3)).getLunar()),
  };

  // 자미두수 (iztro): 시진 인덱스 자0 축1 … 해11, 만자12
  const lw = cand.localWall, idx = lw.h === 23 ? 12 : Math.floor((lw.h + 1) / 2);
  const dateStr = `${lw.y}-${lw.m}-${lw.d}`, g = male ? '男' : '女';
  const a = astro.bySolar(dateStr, idx, g, true, 'ko-KR'), az = astro.bySolar(dateStr, idx, g, true, 'zh-CN');
  const star = (s, sz) => ({ name: s.name, bright: sz?.brightness || '', mutagen: s.mutagen || '' });
  const palaces = a.palaces.map((p, i) => ({
    name: p.name, gz: `${p.heavenlyStem}${p.earthlyBranch}`, body: p.isBodyPalace, soul: i === a.palaces.findIndex(x => x.name === '명궁'),
    major: p.majorStars.map((s, k) => star(s, az.palaces[i].majorStars[k])),
    minor: p.minorStars.map((s, k) => star(s, az.palaces[i].minorStars[k])),
    decadal: p.decadal.range,
  }));
  const hz = a.horoscope(`${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`);
  const yearly = Array.from({ length: 5 }, (_, k) => { const hy = a.horoscope(`${thisYear+k}-7-1`).yearly; return { year: thisYear + k, gz: hy.heavenlyStem + hy.earthlyBranch, palace: a.palaces[hy.index]?.name, mutagen: hy.mutagen }; });
  const cd = a.chineseDate.split(' ');
  const verify = { year: cd[0] === pillars[0].ko, day: cd[2] === pillars[2].ko, hour: cd[3] === pillars[3].ko, monthNote: `자미두수는 음력 달로 ${cd[1]}월, 사주는 절기로 ${pillars[1].ko}월` };
  const jami = {
    soulStar: a.soul, bodyStar: a.body, fiveElements: a.fiveElementsClass, lunar: a.lunarDate, palaces,
    currentDecadal: { palace: a.palaces[hz.decadal.index]?.name, gz: hz.decadal.heavenlyStem + hz.decadal.earthlyBranch, mutagen: hz.decadal.mutagen },
    yearly, verify,
  };

  // 베딕 (Lahiri, 사이더리얼, 홀사인 하우스)
  const vedic = vedicChart(utc, input.lat, input.lon);

  return {
    person: { name: input.name, birth: input.birth, time: input.time, gender: input.gender, place: input.place, lat: input.lat, lon: input.lon },
    basis: { id: cand.id, label: cand.label, kst: cands.kst, tst: cands.tst, offsetMin: cands.offsetMin, eotMin: cands.eotMin, flags: cands.flags.map(f => f.text), stable: !cands.ask },
    saju, jami, vedic,
  };
}

/* ---------- 베딕 ---------- */
const SIGNS = ['양자리(메샤)','황소자리(브리샤바)','쌍둥이자리(미투나)','게자리(카르카)','사자자리(심하)','처녀자리(칸야)','천칭자리(툴라)','전갈자리(브리슈치카)','궁수자리(다누)','염소자리(마카라)','물병자리(쿰바)','물고기자리(미나)'];
const NAK = ['아슈위니','바라니','크리티카','로히니','므리가시라','아르드라','푸나르바수','푸쉬야','아슐레샤','마가','푸르바 팔구니','우타라 팔구니','하스타','치트라','스와티','비샤카','아누라다','지예슈타','물라','푸르바 아샤다','우타라 아샤다','슈라바나','다니슈타','샤타비샤','푸르바 바드라파다','우타라 바드라파다','레바티'];
const PLANETS = [['Sun','태양'],['Moon','달'],['Mars','화성'],['Mercury','수성'],['Jupiter','목성'],['Venus','금성'],['Saturn','토성']];
const RULER = ['화성','금성','수성','달','태양','수성','금성','화성','목성','토성','토성','목성'];
const EXALT = { 태양:0, 달:1, 화성:9, 수성:5, 목성:3, 금성:11, 토성:6 };
const OWN = { 태양:[4], 달:[3], 화성:[0,7], 수성:[2,5], 목성:[8,11], 금성:[1,6], 토성:[9,10] };
const DASHA = [['케투',7],['금성',20],['태양',6],['달',10],['화성',7],['라후',18],['목성',16],['토성',19],['수성',17]];
const norm = x => ((x % 360) + 360) % 360;
const ayanamsa = t => 23.85306 + (t.tt / 365.25) * 0.0139552;           // Lahiri 근사 (J2000 기준 + 세차)
const precess = t => (t.tt / 36525) * 1.3969713;                         // J2000 황도 → 당일 황도
function tropical(name, t){
  if (name === 'Sun') return A.SunPosition(t).elon;
  if (name === 'Moon') return A.EclipticGeoMoon(t).lon;
  return norm(A.Ecliptic(A.GeoVector(name, t, true)).elon + precess(t));
}
const sidereal = (name, t) => norm(tropical(name, t) - ayanamsa(t));
function ascendant(t, lat, lon){
  const T = t.tt / 36525, eps = (23.4392911 - 0.0130042*T) * Math.PI/180;
  const th = norm(A.SiderealTime(t)*15 + lon) * Math.PI/180, phi = lat*Math.PI/180;
  return norm(Math.atan2(Math.cos(th), -(Math.sin(th)*Math.cos(eps) + Math.tan(phi)*Math.sin(eps))) * 180/Math.PI);
}
const meanNode = t => { const T = t.tt/36525; return norm(125.04452 - 1934.136261*T + 0.0020708*T*T); };
const place = lon => { const n = Math.floor(lon / (40/3)); return { sign: Math.floor(lon/30), deg: +(lon % 30).toFixed(2), nak: NAK[n], pada: Math.floor((lon % (40/3)) / (10/3)) + 1, nakIndex: n }; };

function vedicChart(utc, lat, lon){
  const t = A.MakeTime(new Date(utc)), tp = A.MakeTime(new Date(utc + 864e5)), tm = A.MakeTime(new Date(utc - 864e5));
  const asc = norm(ascendant(t, lat, lon) - ayanamsa(t)), lagna = Math.floor(asc / 30);
  const planets = PLANETS.map(([en, name]) => {
    const L = sidereal(en, t), P = place(L);
    const retro = !['Sun','Moon'].includes(en) && (((sidereal(en, tp) - sidereal(en, tm) + 540) % 360) - 180) < 0;
    const dignity = EXALT[name] === P.sign ? '고양' : (EXALT[name] + 6) % 12 === P.sign ? '쇠약' : OWN[name].includes(P.sign) ? '자기 별자리' : '';
    return { name, lon: +L.toFixed(2), signName: SIGNS[P.sign], ...P, house: (P.sign - lagna + 12) % 12 + 1, retro, dignity };
  });
  const rahuL = norm(meanNode(t) - ayanamsa(t)), ketuL = norm(rahuL + 180);
  [['라후', rahuL], ['케투', ketuL]].forEach(([name, L]) => { const P = place(L); planets.push({ name, lon: +L.toFixed(2), signName: SIGNS[P.sign], ...P, house: (P.sign - lagna + 12) % 12 + 1, retro: true, dignity: '' }); });
  const houses = Array.from({ length: 12 }, (_, i) => {
    const sign = (lagna + i) % 12, lord = RULER[sign], lp = planets.find(p => p.name === lord);
    return { house: i + 1, signName: SIGNS[sign], lord, lordHouse: lp.house, lordInOwn: OWN[lord].includes(lp.sign), occupants: planets.filter(p => p.house === i + 1).map(p => p.name) };
  });

  // 빔쇼타리 다샤: 달 나크샤트라 기준
  const moon = planets.find(p => p.name === '달'), span = 40/3;
  const start = moon.nakIndex % 9, frac = (moon.lon % span) / span, YEAR = 365.25*864e5;
  const dashas = []; let at = utc - frac * DASHA[start][1] * YEAR;
  for (let k = 0; k < 18; k++) { const [lord, yrs] = DASHA[(start + k) % 9]; dashas.push({ lord, from: at, to: at + yrs*YEAR, yrs }); at += yrs*YEAR; }
  const now = Date.now(), fmt = ms => new Date(ms).toISOString().slice(0, 7);
  const cur = dashas.find(d => d.from <= now && now < d.to);
  const ci = DASHA.findIndex(x => x[0] === cur.lord), antar = []; let a2 = cur.from;
  for (let k = 0; k < 9; k++) { const [lord, yrs] = DASHA[(ci + k) % 9], len = yrs * cur.yrs / 120 * YEAR; antar.push({ lord, from: fmt(a2), to: fmt(a2 + len), now: a2 <= now && now < a2 + len }); a2 += len; }
  const mahadasha = dashas.filter(d => d.to > utc).slice(0, 9).map(d => ({ lord: d.lord, from: fmt(Math.max(d.from, utc)), to: fmt(d.to), now: d === cur }));

  // 트랜짓: 올해부터 5년, 매년 7월 1일의 목성·토성 + 사데 사티(토성이 달 별자리의 12·1·2번째)
  const thisYear = new Date().getFullYear();
  const transits = Array.from({ length: 5 }, (_, k) => {
    const tt = A.MakeTime(new Date(Date.UTC(thisYear + k, 6, 1)));
    const ju = Math.floor(sidereal('Jupiter', tt) / 30), sa = Math.floor(sidereal('Saturn', tt) / 30);
    const fromMoon = (sa - moon.sign + 12) % 12;
    return { year: thisYear + k, jupiter: SIGNS[ju], jupiterHouse: (ju - lagna + 12) % 12 + 1, saturn: SIGNS[sa], saturnHouse: (sa - lagna + 12) % 12 + 1, sadeSati: [11, 0, 1].includes(fromMoon) ? ['시작', '한가운데', '마무리'][[11, 0, 1].indexOf(fromMoon)] : '' };
  });

  return { ayanamsa: +ayanamsa(t).toFixed(3), lagna: { signName: SIGNS[lagna], deg: +(asc % 30).toFixed(2), nak: place(asc).nak }, moonSign: SIGNS[moon.sign], moonNak: `${moon.nak} ${moon.pada}파다`, planets, houses, mahadasha, antardasha: antar, transits };
}

/* ---------- 출생지 (경도 보정용) ---------- */
export const PLACES = [
  ['서울',37.5665,126.978],['부산',35.1796,129.0756],['대구',35.8714,128.6014],['인천',37.4563,126.7052],['광주',35.1595,126.8526],
  ['대전',36.3504,127.3845],['울산',35.5384,129.3114],['세종',36.4800,127.2890],['수원',37.2636,127.0286],['성남',37.4200,127.1267],
  ['고양',37.6584,126.8320],['용인',37.2411,127.1776],['의정부',37.7381,127.0337],['춘천',37.8813,127.7298],['원주',37.3422,127.9202],
  ['강릉',37.7519,128.8761],['청주',36.6424,127.4890],['충주',36.9910,127.9259],['천안',36.8151,127.1139],['전주',35.8242,127.1480],
  ['군산',35.9676,126.7369],['익산',35.9483,126.9577],['목포',34.8118,126.3922],['여수',34.7604,127.6622],['순천',34.9507,127.4872],
  ['포항',36.0190,129.3435],['경주',35.8562,129.2247],['안동',36.5684,128.7294],['구미',36.1195,128.3446],['창원',35.2281,128.6811],
  ['마산',35.2139,128.5829],['진주',35.1800,128.1076],['김해',35.2285,128.8894],['통영',34.8544,128.4331],['제주',33.4996,126.5312],
  ['서귀포',33.2541,126.5601],['평양',39.0392,125.7625],
];
