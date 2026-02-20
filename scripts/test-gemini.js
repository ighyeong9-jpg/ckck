const fs = require('fs');
const path = require('path');

// .env.local 수동 파싱
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
});

const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('[실패] GEMINI_API_KEY가 .env.local에 없습니다.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

console.log('[테스트] gemini-2.5-flash 에 "안녕" 전송 중...');

model.generateContent('안녕').then(result => {
  console.log('[성공] 응답:', result.response.text());
}).catch(err => {
  console.error('[실패]', err.message);
});
