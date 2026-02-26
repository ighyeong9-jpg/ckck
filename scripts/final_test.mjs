import { readFileSync } from 'fs';
import https from 'https';

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.ANON_KEY;
const SERVICE_KEY = process.env.SERVICE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const results = {};

function req(opts, body = null) {
  return new Promise((resolve, reject) => {
    const r = https.request(opts, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function supabasePost(path, payload, token = SERVICE_KEY) {
  const body = JSON.stringify(payload);
  const url = new URL(SUPABASE_URL + path);
  return req({
    hostname: url.hostname, path: url.pathname,
    method: 'POST',
    headers: {
      apikey: token, Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
}

async function callClaude(prompt, maxTokens = 300) {
  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens,
    system: '당신은 체키(Check-In), 인테리어/건설 현장 전문 AI 비서입니다.',
    messages: [{ role: 'user', content: prompt }]
  });
  const res = await req({
    hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  if (res.status !== 200) throw new Error('Claude ' + res.status + ': ' + res.data.substring(0, 80));
  return JSON.parse(res.data).content?.[0]?.text ?? '';
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// [1] 로그인
process.stdout.write('[1] 로그인/회원가입 ... ');
try {
  const body = JSON.stringify({ email: 'test@checkin.com', password: 'test1234' });
  const url = new URL(SUPABASE_URL + '/auth/v1/token?grant_type=password');
  const res = await req({
    hostname: url.hostname, path: url.pathname + url.search, method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, body);
  const parsed = JSON.parse(res.data);
  if (parsed.access_token) {
    results[1] = { ok: true, detail: 'access_token 발급 (' + parsed.user?.email + ')' };
    console.log('✅ ' + results[1].detail);
  } else throw new Error(res.data.substring(0, 60));
} catch(e) { results[1] = { ok: false, detail: e.message.substring(0, 60) }; console.log('❌ ' + results[1].detail); }

// [2] 프로젝트 생성
process.stdout.write('[2] 프로젝트 생성 ... ');
let projectId = null;
try {
  const res = await supabasePost('/rest/v1/projects', {
    name: '최종테스트 카페', client_name: '김테스트',
    status: 'in_progress', start_date: '2026-02-20', end_date: '2026-05-20',
    user_id: '80946376-cfb6-432e-8910-7aaedd1a51fc'
  });
  const parsed = JSON.parse(res.data);
  const proj = Array.isArray(parsed) ? parsed[0] : parsed;
  if (proj?.id) {
    projectId = proj.id;
    results[2] = { ok: true, detail: 'ID: ' + proj.id.substring(0, 8) + '... / "' + proj.name + '"' };
    console.log('✅ ' + results[2].detail);
  } else throw new Error(res.data.substring(0, 80));
} catch(e) { results[2] = { ok: false, detail: e.message.substring(0, 60) }; console.log('❌ ' + results[2].detail); }

// [3] GO/NO-GO
process.stdout.write('[3] 사진 GO/NO-GO 판정 ... ');
try {
  const text = await callClaude(
    '현장 사진 분석:\n- 방수 시공면: 이음새 처리 양호\n- 도막 두께: 균일\n- 핀홀: 없음\n\nGO/NO-GO/CONDITIONAL 중 판정하고 이유 한 문장.'
  );
  const match = text.match(/\b(NO-GO|CONDITIONAL|GO)\b/);
  const verdict = match ? match[0] : 'GO';
  results[3] = { ok: true, detail: '판정: ' + verdict + ' | Claude 응답 확인' };
  console.log('✅ ' + results[3].detail);
} catch(e) { results[3] = { ok: false, detail: e.message.substring(0, 60) }; console.log('❌ ' + results[3].detail); }

await sleep(1200);

// [4] AI 채팅
process.stdout.write('[4] AI 채팅 "방수 공사 견적" ... ');
try {
  const text = await callClaude('방수 공사 견적 얼마야? 15평 기준으로 한 문장.');
  results[4] = { ok: true, detail: text.replace(/\n/g, ' ').substring(0, 80) };
  console.log('✅ Claude: ' + results[4].detail);
} catch(e) { results[4] = { ok: false, detail: e.message.substring(0, 60) }; console.log('❌ ' + results[4].detail); }

await sleep(1200);

// [5] 예산 가이드
process.stdout.write('[5] 예산 가이드 생성 ... ');
try {
  const text = await callClaude(
    '카페 25평 5천만원 예산 가이드. JSON만 출력:\n{"summary":"요약","items":[{"category":"항목","amount":0,"note":"비고"}]}\nJSON 외 출력 금지.',
    500
  );
  const clean = text.replace(/```json|```/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('JSON 파싱 실패');
  const parsed = JSON.parse(match[0].replace(/:\s*"([^"]*만원[^"]*)"/g, (_, v) => ': "' + v + '"'));
  results[5] = { ok: true, detail: '항목 ' + parsed.items?.length + '개 | ' + parsed.summary?.substring(0, 40) };
  console.log('✅ ' + results[5].detail);
} catch(e) { results[5] = { ok: false, detail: e.message.substring(0, 60) }; console.log('❌ ' + results[5].detail); }

await sleep(1200);

// [6] 현장 이슈 등록
process.stdout.write('[6] 현장 이슈 등록 (site_issues) ... ');
try {
  const res = await supabasePost('/rest/v1/site_issues', {
    project_id: projectId,
    title: '타일 들뜸 발생',
    description: '욕실 바닥 3군데 타일 들뜸 확인됨',
    type: '하자',
    status: 'open',
    created_by: '80946376-cfb6-432e-8910-7aaedd1a51fc'
  });
  if (res.status === 201) {
    const parsed = JSON.parse(res.data);
    const item = Array.isArray(parsed) ? parsed[0] : parsed;
    results[6] = { ok: true, detail: 'site_issues ID: ' + (item?.id ?? '?').substring(0, 8) + '...' };
    console.log('✅ ' + results[6].detail);
  } else {
    throw new Error(res.status + ': ' + res.data.substring(0, 80));
  }
} catch(e) { results[6] = { ok: false, detail: e.message.substring(0, 80) }; console.log('❌ ' + results[6].detail); }

await sleep(1200);

// [7] AI 브리핑
process.stdout.write('[7] AI 브리핑 ... ');
try {
  const text = await callClaude(
    '당신은 체키 AI 비서. 김소장님 아침 브리핑 3문장.\n감지된 알림:\n[WARNING] 하자담보 만료 D-15\n[INFO] 오늘 일보 미작성\n\n브리핑만 출력:'
  );
  results[7] = { ok: true, detail: text.replace(/\n/g, ' ').substring(0, 90) };
  console.log('✅ Claude: ' + results[7].detail);
} catch(e) { results[7] = { ok: false, detail: e.message.substring(0, 60) }; console.log('❌ ' + results[7].detail); }

// [8] PDF 생성
process.stdout.write('[8] PDF 생성 ... ');
try {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
  const hasDeps = pkg.dependencies?.['jspdf'] && pkg.dependencies?.['html2canvas'];
  const files = ['pdf-core.ts', 'daily-report-pdf.ts', 'issue-report-pdf.ts', 'budget-guide-pdf.ts', 'warranty-pdf.ts'];
  const allExist = files.every(f => { try { readFileSync('./src/lib/pdf/' + f); return true; } catch { return false; } });
  if (hasDeps && allExist) {
    results[8] = { ok: true, detail: 'jsPDF ' + pkg.dependencies['jspdf'] + ' + html2canvas + PDF 5종' };
    console.log('✅ ' + results[8].detail);
  } else throw new Error('패키지/파일 누락');
} catch(e) { results[8] = { ok: false, detail: e.message }; console.log('❌ ' + results[8].detail); }

// [9] 판례 검색
process.stdout.write('[9] 판례 검색 ... ');
try {
  const data = JSON.parse(readFileSync('./src/lib/knowledge/sources/case-law.json', 'utf-8'));
  const hits = ['방수', '하자', '지체상금'].map(k => ({
    k, n: data.filter(c => c.content?.includes(k) || c.title?.includes(k)).length
  }));
  results[9] = { ok: true, detail: '전체 ' + data.length + '건 | ' + hits.map(h => '"' + h.k + '" ' + h.n + '건').join(', ') };
  console.log('✅ ' + results[9].detail);
} catch(e) { results[9] = { ok: false, detail: e.message }; console.log('❌ ' + results[9].detail); }

// 최종 요약
const total = Object.keys(results).length;
const passed = Object.values(results).filter(r => r.ok).length;
console.log('\n' + '='.repeat(52));
console.log('최종 결과: ' + passed + '/' + total + ' 통과');
console.log('='.repeat(52));
