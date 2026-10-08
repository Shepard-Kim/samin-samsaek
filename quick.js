// 심사용 간이 명식: 사주 원국(시각 보정 전)과, 태어난 시각을 알면 자미두수 명반 요약.
// 서버에 함께 보내면 심사위원이 명식을 직접 계산하지 않아 판정이 빨라진다 (사주 13초 → 2초, 자미 느린 꼬리 제거).
// 서버가 형식(간지·한글 이름)을 다시 검사한다. 정밀 계산(진태양시·절기 경계)은 3인 총운의 chart.js가 맡는다.
import { Solar } from 'https://cdn.jsdelivr.net/npm/lunar-javascript@1.7.7/+esm';
import { astro } from 'https://cdn.jsdelivr.net/npm/iztro@2.6.1/+esm';

const WX = { 甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수',
  子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수' };

// p: {birth:'YYYY-MM-DD', time:'HH:MM'|'', gender:'여성'|'남성'}, today: KST 'YYYY-MM-DD'
export function quickChart(p, today) {
  const [y, m, d] = p.birth.split('-').map(Number);
  const [h, mi] = (p.time || '12:00').split(':').map(Number);
  const ec = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar();
  const pillars = [ec.getYear(), ec.getMonth(), ec.getDay(), ...(p.time ? [ec.getTime()] : [])];
  const wuxing = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  pillars.forEach(s => { wuxing[WX[s[0]]]++; wuxing[WX[s[1]]]++; });
  const [ty, tm, td] = today.split('-').map(Number);
  const seun = Solar.fromYmd(ty, tm, td).getLunar().getYearInGanZhiExact(); // 오늘 기준 (입춘 전이면 지난해 간지)
  const out = { saju: { pillars, wuxing, seun } };
  if (p.time) { // 명궁이 시각에 따라 바뀌므로 시각을 알 때만
    const idx = h === 23 ? 12 : Math.floor((h + 1) / 2);
    const a = astro.bySolar(`${y}-${m}-${d}`, idx, p.gender === '남성' ? '男' : '女', true, 'ko-KR');
    const palaces = ['명궁', '관록', '재백', '부처', '천이'].map(n => a.palaces.find(x => x.name === n)).filter(Boolean)
      .map(pl => ({ name: pl.name, stars: pl.majorStars.map(s => s.name + (s.mutagen ? `(화${s.mutagen})` : '')) }));
    const hy = a.horoscope(today).yearly;
    out.jami = { fiveElements: a.fiveElementsClass, soul: a.soul, body: a.body, palaces,
      yearly: { palace: a.palaces[hy.index]?.name, mutagen: hy.mutagen } };
  }
  return out;
}
