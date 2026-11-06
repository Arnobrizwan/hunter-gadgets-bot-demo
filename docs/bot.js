// Hunter Gadgets support bot (demo, browser build).\n// The AI key is restricted to this page's address and to the Gemini API only.
// Hunter Gadgets support bot (demo).
// Hybrid: fixed rules answer the common questions for free; only what the rules
// can't answer goes to the AI (Gemini Flash-Lite), and the AI only sees our own
// product list. Hard problems, photos, voice and video go to a human.
let catalog = [];
const GEMINI_KEY = 'AIzaSyBrIQjcQO7tKZ5VUQSeO76pEcF2IlG6Ag8';

const MODELS = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const toBn = (n) => String(n).replace(/\d/g, (d) => BN_DIGITS[d]);
const fromBn = (s) => s.replace(/[০-৯]/g, (d) => BN_DIGITS.indexOf(d));
const tk = (n) => `৳${toBn(Number(n).toLocaleString('en-IN'))}`;

const norm = (s) => fromBn(String(s || '')).toLowerCase().replace(/[^a-z0-9\u0980-\u09ff ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Words that say nothing about which product.
const STOP = new Set(['price', 'dam', 'koto', 'ache', 'ase', 'stock', 'er', 'ki', 'the', 'a', 'vai', 'bhai', 'vaiya', 'bro', 'phone', 'gaming', 'pro', 'koto', 'tk', 'taka', 'দাম', 'কত', 'আছে', 'ভাই', 'স্টক']);

function findProducts(text, limit = 5) {
  const q = norm(text).split(' ').filter((w) => w.length > 1 && !STOP.has(w));
  if (!q.length) return [];
  const scored = catalog.map((p) => {
    const name = norm(p.name);
    const words = name.split(' ');
    let score = 0;
    for (const w of q) {
      if (words.includes(w)) score += /\d/.test(w) ? 6 : 3; // model codes (cx12, k6) count most
      else if (name.includes(w) && w.length >= 3) score += 1;
      if (norm(p.category).includes(w)) score += 1;
    }
    return { p, score };
  }).filter((x) => x.score >= 3).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.p);
}

const stockText = (p) => {
  if (!p.stock) return 'স্টক কনফার্ম করে জানানো হবে';
  if (/পাওয়া যাচ্ছে না/.test(p.stock)) return '❌ এখন স্টকে নেই';
  return `✅ ${p.stock}`;
};

const productLine = (p) =>
  `• *${p.name}* — ${tk(p.price)}${p.regular ? ` (আগে ${tk(p.regular)})` : ''}\n  ${stockText(p)}\n  ${p.url}`;

const has = (t, re) => re.test(t);

const HANDOVER =
  'বুঝতে পেরেছি 🙏 এই বিষয়টা আমাদের টিমের একজন নিজে দেখবেন। আপনার মেসেজ টিমের কাছে পাঠিয়ে দিয়েছি — সকাল ৮টা থেকে রাত ১২টার মধ্যে উত্তর পাবেন।\n\n_(ডেমো: আসল বটে এখানে টিমের WhatsApp/Telegram গ্রুপে নোটিফিকেশন যাবে)_';

function rules(text) {
  const t = norm(text);
  if (!t) return null;

  if (has(t, /^(hi|hello|hey|salam|assalam|aslam|আসসালাম|সালাম|হাই|হ্যালো|hlw|hlo)/)) {
    return 'ওয়ালাইকুম আসসালাম 👋 Hunter Gadgets এ স্বাগতম!\n\nআমি অর্ডার, দাম, স্টক, ডেলিভারি আর পেমেন্ট নিয়ে সাহায্য করতে পারি। যেমন লিখুন:\n• "CX12 er dam koto?"\n• "phone cooler dekhan"\n• "order korbo"';
  }
  if (has(t, /(human|manush|মানুষ|agent|complain|অভিযোগ|problem|সমস্যা|nosto|noshto|নষ্ট|kaj ?kor(e|te|tese|teche|che|ce|ena)? ?na|কাজ কর(ে|ছে|তেছে) ?না|damage|broken|vanga|ভাঙা|fault|defect|warranty|ওয়ারেন্টি|return|ফেরত|refund|রিফান্ড|replace)/)) {
    return { handover: true, reply: HANDOVER };
  }
  if (has(t, /(delivery|ডেলিভারি|cod|cash on|কত দিনে|koto dine|courier|কুরিয়ার|shipping)/)) {
    return '🚚 সারা বাংলাদেশে ডেলিভারি দেওয়া হয়, *ক্যাশ অন ডেলিভারি* — পণ্য হাতে পেয়ে টাকা দেবেন।\n\nডেলিভারি চার্জ ও সময়: _[ডেমো — আপনার আসল রেট এখানে বসানো হবে]_';
  }
  if (has(t, /(bkash|bikash|বিকাশ|nagad|নগদ|payment|পেমেন্ট|advance|অ্যাডভান্স|trx|transaction)/)) {
    return '💳 পেমেন্ট দুইভাবে:\n1. ক্যাশ অন ডেলিভারি\n2. bKash / Nagad — Send Money করে TrxID এখানে পাঠান, টিম মিলিয়ে কনফার্ম করবে।\n\nনম্বর: _[ডেমো — আপনার bKash/Nagad নম্বর বসানো হবে]_';
  }
  if (has(t, /(time|somoy|সময়|open|khola|খোলা|kokhon|কখন)/) && has(t, /(support|office|reply|উত্তর|khola|open|কখন)/)) {
    return '🕗 আমাদের টিম সকাল ৮টা থেকে রাত ১২টা পর্যন্ত আছে। বট ২৪ ঘণ্টা উত্তর দেয়।';
  }
  if (has(t, /(website|site|ওয়েবসাইট|link|লিংক)/)) {
    return '🌐 সব পণ্য দেখুন: https://huntergadgets.com/';
  }

  // Price / stock lookup straight from the product list — no AI needed.
  const found = findProducts(text, 4);
  if (found.length && (found.length <= 4) && has(t, /(dam|দাম|price|koto|কত|stock|স্টক|ache|আছে|available|pawa|পাওয়া)/)) {
    return `এগুলো পেলাম 👇\n\n${found.map(productLine).join('\n\n')}\n\nঅর্ডার করতে লিখুন "order korbo"।`;
  }
  return null;
}

// ── Order flow: product → name → phone → address → confirm ─────────────────
const ORDER_START = /(order|অর্ডার|kinbo|কিনবো|nibo|নিবো|nite chai|নিতে চাই|buy)/;

function orderStep(text, state) {
  const o = state.order || { step: 'product' };
  const t = text.trim();
  if (/^(cancel|batil|বাতিল|na thak|থাক)/i.test(t)) return { reply: 'ঠিক আছে, অর্ডার বাতিল করা হলো।', state: {} };

  if (o.step === 'product') {
    const found = findProducts(t, 3);
    if (found.length === 1 || (found.length && norm(found[0].name) === norm(t))) {
      const p = found[0];
      if (/পাওয়া যাচ্ছে না/.test(p.stock)) return { reply: `দুঃখিত, *${p.name}* এখন স্টকে নেই। অন্য কোন পণ্য নিতে চান?`, state: { order: o } };
      return { reply: `*${p.name}* — ${tk(p.price)} ✅\n\nআপনার নাম লিখুন:`, state: { order: { step: 'name', product: p.name, price: p.price } } };
    }
    if (found.length > 1) return { reply: `কোনটা নিতে চান? পুরো নাম/মডেল লিখুন:\n\n${found.map((p) => `• ${p.name} — ${tk(p.price)}`).join('\n')}`, state: { order: o } };
    return { reply: '🛒 কোন পণ্যটা নিতে চান? মডেল লিখুন (যেমন: MEMO CX12)।', state: { order: o } };
  }
  if (o.step === 'name') return { reply: `ধন্যবাদ ${t}! আপনার মোবাইল নম্বর দিন (01XXXXXXXXX):`, state: { order: { ...o, step: 'phone', name: t } } };
  if (o.step === 'phone') {
    const phone = fromBn(t).replace(/[^\d]/g, '').replace(/^88/, '');
    if (!/^01[3-9]\d{8}$/.test(phone)) return { reply: 'নম্বরটা ঠিক মনে হচ্ছে না। ১১ সংখ্যার নম্বর দিন, যেমন 017XXXXXXXX', state: { order: o } };
    return { reply: 'ডেলিভারির পুরো ঠিকানা লিখুন (জেলা, থানা, এলাকা):', state: { order: { ...o, step: 'address', phone } } };
  }
  if (o.step === 'address') {
    const s = { ...o, step: 'confirm', address: t };
    return {
      reply: `অর্ডারটা মিলিয়ে নিন 📝\n\nপণ্য: *${s.product}*\nদাম: ${tk(s.price)} + ডেলিভারি চার্জ\nনাম: ${s.name}\nফোন: ${s.phone}\nঠিকানা: ${s.address}\nপেমেন্ট: ক্যাশ অন ডেলিভারি\n\nঠিক থাকলে লিখুন *হ্যাঁ*, বাতিল করতে *বাতিল*।`,
      state: { order: s },
    };
  }
  if (o.step === 'confirm') {
    if (/^(ha|hya|haa|yes|ok|হ্যাঁ|হা|জি|ji|confirm|ঠিক)/i.test(t)) {
      const id = 'HG' + Date.now().toString().slice(-6);
      return {
        reply: `✅ অর্ডার নেওয়া হয়েছে! অর্ডার নম্বর: *${id}*\n\nটিম শীঘ্রই কল করে কনফার্ম করবে। ধন্যবাদ Hunter Gadgets থেকে কেনার জন্য 🫰\n\n_(ডেমো: আসল বটে অর্ডারটা আপনার ওয়েবসাইট/শীটে যাবে আর টিমকে নোটিফাই করবে)_`,
        state: {},
        order: { id, ...o },
      };
    }
    return { reply: 'কনফার্ম করতে *হ্যাঁ* লিখুন, বাতিল করতে *বাতিল*।', state: { order: o } };
  }
  return { reply: 'আবার চেষ্টা করুন।', state: {} };
}

async function askAI(history, text) {
  const key = GEMINI_KEY;
  if (!key) return null;
  const ctx = norm(text + ' ' + history.slice(-2).map((m) => m.text).join(' '));
  const catHit = [...new Set(catalog.map((p) => p.category))].filter((c) => norm(c).split(' ').some((w) => w.length > 3 && ctx.includes(w.replace(/s$/, ''))));
  const budgetM = fromBn(text).match(/(\d{2,6})\s*(tk|taka|টাকা|৳)?\s*(er|এর)?\s*(moddhe|moddhe|modhe|মধ্যে|niche|nice|নিচে|kom|কম|under|below|within)|(under|below|within)\s*৳?\s*(\d{2,6})/i);
  const budget = budgetM ? Number(budgetM[1] || budgetM[6]) : null;
  const relevant = [...new Map([...catalog.filter((p) => catHit.includes(p.category)), ...findProducts(ctx, 15)].map((p) => [p.name, p])).values()].filter((p) => !budget || p.price <= budget).slice(0, 45);
  const pool = (relevant.length ? relevant : catalog.slice(0, 40))
    .map((p) => `${p.name} | ${p.category} | ৳${p.price}${p.regular ? ` (আগে ৳${p.regular})` : ''} | ${p.stock || ''} | ${p.url}`)
    .join('\n');
  const categories = [...new Set(catalog.map((p) => p.category))].join(', ');
  const system = `তুমি "Hunter Gadgets" (huntergadgets.com, মোবাইল গেমিং গ্যাজেটের দোকান, বাংলাদেশ) এর কাস্টমার সাপোর্ট বট।
নিয়ম:
- কাস্টমার যে ভাষায় লেখে (বাংলা, English, বা Banglish) সেই ভাষায় ছোট, বন্ধুসুলভ উত্তর দাও। ৪-৫ লাইনের বেশি না।
- শুধু নিচের পণ্যের তালিকা থেকে নাম, দাম, স্টক বলবে। তালিকায় না থাকলে বানিয়ে বলবে না — বলবে টিম জানাবে।
- কখনো ডিসকাউন্ট, রিফান্ড, ডেলিভারির তারিখ বা স্টকের প্রতিশ্রুতি দেবে না।
- জটিল সমস্যা, অভিযোগ, ওয়ারেন্টি, রিটার্ন হলে বলবে টিমের কাছে পাঠানো হচ্ছে।
- ডেলিভারি: সারা বাংলাদেশে ক্যাশ অন ডেলিভারি। পেমেন্ট: COD বা bKash/Nagad (TrxID দিতে হয়)। সাপোর্ট টাইম: সকাল ৮টা–রাত ১২টা।
- দাম সবসময় টাকায় (৳)। কাস্টমারের লেখা সংখ্যা ঠিক যেমন আছে তেমন পড়বে (300 মানে ৩০০, ৩০০০ না)। দাম ও সব সংখ্যা ইংরেজি অঙ্কে লিখবে (যেমন ৳1,390, 300) — বাংলা অঙ্কে রূপান্তর করবে না। বাজেটের মধ্যে থাকা পণ্যগুলো দাম মিলিয়ে বেছে দেবে।
- অর্ডার করতে চাইলে বলবে "order korbo" লিখতে।
- দোকানের বাইরের বিষয় (রাজনীতি, অন্য দোকান, সাধারণ প্রশ্ন) হলে ভদ্রভাবে বলবে তুমি শুধু Hunter Gadgets এর পণ্য নিয়ে সাহায্য করো।
ক্যাটাগরি: ${categories}
পণ্যের তালিকা (নাম | ক্যাটাগরি | দাম | স্টক | লিংক):
${pool}`;
  const contents = history.slice(-8).map((m) => ({ role: m.role === 'bot' ? 'model' : 'user', parts: [{ text: m.text }] }));
  contents.push({ role: 'user', parts: [{ text: budget ? `${text}\n(বাজেট: ৳${budget} — নিচের তালিকা আগেই এই বাজেট দিয়ে ছাঁকা, বাজেটের সংখ্যা উত্তরে আবার লিখবে না)` : text }] });
  let d = null;
  for (const model of MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.3, maxOutputTokens: 400 } }),
    });
    if (r.ok) { d = await r.json(); break; }
  }
  if (!d) return null;
  return d?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim() || null;
}

async function botReply({ text = '', history = [], state = {}, attachment }) {
  if (!catalog.length) catalog = await (await fetch('catalog.json')).json();
  if (attachment) {
    const what = { image: 'ছবি', voice: 'ভয়েস মেসেজ', video: 'ভিডিও' }[attachment] || 'ফাইল';
    return { reply: `📎 আপনার ${what} পেয়েছি। টিমের একজন দেখে উত্তর দেবেন (সকাল ৮টা–রাত ১২টা)।\n\n_(ডেমো: আসল বটে ভয়েস মেসেজ লেখায় রূপান্তর করে বট নিজেই উত্তর দেবে, আর ছবি/ভিডিও টিমের কাছে যাবে)_`, source: 'handover', state };
  }
  if (String(text).length > 1000) return { reply: 'মেসেজটা একটু ছোট করে লিখুন 🙏', source: 'rule', state };
  if (state.order || ORDER_START.test(norm(text))) {
    const startText = state.order ? text : text.replace(ORDER_START, '').trim();
    const r = state.order ? orderStep(text, state) : orderStep(startText || '', { order: { step: 'product' } });
    return { reply: r.reply, source: 'order', state: r.state || {} };
  }
  const ruled = rules(text);
  if (ruled) return typeof ruled === 'object' ? { reply: ruled.reply, source: 'handover', state } : { reply: ruled, source: 'rule', state };
  try { const ai = await askAI(history, text); if (ai) return { reply: ai, source: 'ai', state }; } catch (e) {}
  return { reply: HANDOVER, source: 'handover', state };
}
