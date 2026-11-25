// Vérifie la banque de questions : node tools/validate.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..', 'js', 'questions');
const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
const files = ['_base.js', ...fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== '_base.js').sort()];
for (const f of files) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
const Q = ctx.OUH.Q; let errs = 0; const ids = new Set(), qs = new Set(), stat = {};
const err = (q, m) => { errs++; console.log(`✗ ${q.id || '?'} : ${m}`); };
for (const q of Q) {
  if (!q.id || ids.has(q.id)) err(q, 'id manquant ou en double'); ids.add(q.id);
  if (![1, 2, 3].includes(q.d)) err(q, 'd doit valoir 1, 2 ou 3');
  if (typeof q.q !== 'string' || q.q.length < 12) err(q, 'question trop courte');
  if (q.q.length > 150) err(q, `question trop longue (${q.q.length})`);
  if (qs.has(q.q)) err(q, 'question en double'); qs.add(q.q);
  if (!Array.isArray(q.a) || q.a.length !== 4) err(q, 'il faut 4 réponses');
  else {
    if (new Set(q.a.map(s => String(s).toLowerCase().trim())).size !== 4) err(q, 'réponses en double');
    q.a.forEach(s => { if (typeof s !== 'string' || !s.length) err(q, 'réponse vide'); else if (s.length > 44) err(q, `réponse trop longue (${s.length}) : ${s}`); });
  }
  if (typeof q.e !== 'string' || q.e.length < 30) err(q, 'explication trop courte');
  else if (q.e.length > 330) err(q, `explication trop longue (${q.e.length})`);
  (stat[q.t] = stat[q.t] || [0, 0, 0, 0])[q.d]++; stat[q.t][0]++;
}
console.log('\nThème            total  d1  d2  d3');
for (const t in stat) console.log(t.padEnd(16), String(stat[t][0]).padStart(5), ...stat[t].slice(1).map(n => String(n).padStart(3)));
console.log(`\n${Q.length} questions, ${errs} erreur(s)`);
process.exit(errs ? 1 : 0);
