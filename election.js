/* ระบบเลือกตั้งสภานักเรียน โรงเรียนบ้านละลม
   สคริปต์ร่วมทุกหน้า — ES5 เท่านั้น (ห้าม let/const/arrow/template literal) */

/* ================= ระบบเสียงประกาศ (Web Speech API) ================= */

var Voice = {
  ready: false,
  thVoice: null,
  enabled: true,

  init: function () {
    if (!('speechSynthesis' in window)) { return; }
    Voice.ready = true;
    Voice.pickVoice();
    /* เสียงบางเครื่องโหลดช้า ต้องรอ event */
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = Voice.pickVoice;
    }
    try { Voice.enabled = localStorage.getItem('el_voice') !== 'off'; } catch (e) {}
  },

  pickVoice: function () {
    if (!Voice.ready) { return; }
    var voices = speechSynthesis.getVoices();
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].lang && voices[i].lang.indexOf('th') === 0) { Voice.thVoice = voices[i]; return; }
    }
  },

  /* พูดข้อความ ถ้าปิดเสียงไว้จะข้าม opts.onend เรียกเมื่อพูดจบ (ใช้กับโหมดอัตโนมัติ) */
  say: function (text, opts) {
    opts = opts || {};
    if (!Voice.ready || !Voice.enabled) {
      /* ถ้าปิดเสียง ยังต้องเรียก onend เพื่อให้โหมดอัตโนมัติเดินต่อได้ ประมาณเวลาจากความยาว */
      if (opts.onend) { setTimeout(opts.onend, Math.max(text.length * 90, 800)); }
      return;
    }
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      if (Voice.thVoice) { u.voice = Voice.thVoice; }
      u.lang = 'th-TH';
      u.rate = opts.rate || 0.75;
      u.pitch = opts.pitch || 1;
      u.volume = opts.volume || 1;
      if (opts.onend) {
        u.onend = opts.onend;
        u.onerror = opts.onend;
      }
      speechSynthesis.speak(u);
    } catch (e) { if (opts.onend) { setTimeout(opts.onend, 1200); } }
  },

  /* ขานผลบัตรแบบกรรมการ เว้นจังหวะแบบขานสลาก — ใช้เฉพาะตอนนับคะแนนหลังปิดหีบ
     ใส่จุดไข่ปลาให้เสียงหยุดเป็นช่วง จะฟังเป็นทางการและจดตามทัน */
  callBallot: function (choice, partyName) {
    if (choice === '0' || choice === 0) {
      Voice.say('บัตรเสีย ... ไม่ประสงค์ลงคะแนน', { rate: 0.6 });
    } else {
      var msg = 'บัตรดี ... หมายเลข ... ' + choice;
      if (partyName) { msg += ' ... ' + partyName; }
      Voice.say(msg, { rate: 0.6 });
    }
  },

  toggle: function () {
    Voice.enabled = !Voice.enabled;
    try { localStorage.setItem('el_voice', Voice.enabled ? 'on' : 'off'); } catch (e) {}
    if (Voice.enabled) { Voice.say('เปิดเสียงประกาศ'); }
    else { try { speechSynthesis.cancel(); } catch (e) {} }
    return Voice.enabled;
  }
};

/* ================= ระบบธีม สว่าง/มืด/อัตโนมัติ ================= */

var Theme = {
  KEY: 'el_theme',
  ACCENT: 'el_accent',

  get: function () {
    try { return localStorage.getItem(Theme.KEY) || 'light'; } catch (e) { return 'light'; }
  },

  getAccent: function () {
    try { return localStorage.getItem(Theme.ACCENT) || '#6D4FE0'; } catch (e) { return '#6D4FE0'; }
  },

  set: function (name) {
    try { localStorage.setItem(Theme.KEY, name); } catch (e) {}
    Theme.apply(name);
    Theme.paintButtons(name);
  },

  setAccent: function (hex) {
    try { localStorage.setItem(Theme.ACCENT, hex); } catch (e) {}
    Theme.set('custom');
  },

  /* รายการตัวแปรที่ธีม custom เข้าไปบังคับ ใช้ตอนล้างเมื่อสลับกลับ */
  CUSTOM_VARS: ['--violet', '--violet-soft', '--sidebar', '--sidebar-hover',
    '--sidebar-rule', '--sidebar-faint', '--screen-bg'],

  apply: function (name) {
    document.documentElement.setAttribute('data-theme', name);
    var root = document.documentElement, i;
    if (name === 'custom') {
      /* กำหนดสีเอง: ไล่สีทั้งระบบจากสีหลักที่เลือก ไม่ใช่เปลี่ยนแค่ปุ่ม */
      var hex = Theme.getAccent();
      root.style.setProperty('--violet', hex);
      root.style.setProperty('--violet-soft', Theme.tint(hex, 0.12));
      /* แถบเมนูซ้าย + จอฉาย ใช้เฉดเข้มของสีเดียวกัน ให้เป็นโทนเดียวทั้งระบบ */
      root.style.setProperty('--sidebar', Theme.mix(hex, 0, 0.80));
      root.style.setProperty('--sidebar-hover', Theme.mix(hex, 0, 0.70));
      root.style.setProperty('--sidebar-rule', Theme.mix(hex, 0, 0.58));
      root.style.setProperty('--sidebar-faint', Theme.mix(hex, 255, 0.60));
      root.style.setProperty('--screen-bg', Theme.mix(hex, 0, 0.82));
    } else {
      /* เลิกบังคับทุกตัวเมื่อกลับไปธีมสำเร็จรูป */
      for (i = 0; i < Theme.CUSTOM_VARS.length; i++) {
        root.style.removeProperty(Theme.CUSTOM_VARS[i]);
      }
    }
  },

  /* ผสมสี hex เข้าหาค่าเป้าหมายต่อช่อง (0 = ดำ, 255 = ขาว) ตามสัดส่วน amt 0..1 */
  mix: function (hex, target, amt) {
    var h = hex.replace('#', '');
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    var m = function (c) { return Math.round(c + (target - c) * amt); };
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  },

  /* ผสมกับขาวให้ได้พื้นอ่อนทึบ (--violet-soft) อ่านตัวอักษรเข้มทับได้ */
  tint: function (hex, alpha) {
    return Theme.mix(hex, 255, Math.max(0, Math.min(1, 1 - alpha * 2.2)));
  },

  paintButtons: function (name) {
    var btns = document.querySelectorAll('.theme-pick [data-theme]');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-theme') === name) { btns[i].classList.add('on'); }
      else { btns[i].classList.remove('on'); }
    }
  }
};

/* ตั้งธีมทันทีก่อนหน้าจะ render กันกระพริบขาว */
Theme.apply(Theme.get());

var API_URL = (typeof CONFIG !== 'undefined' && CONFIG.API_URL) ? CONFIG.API_URL : '';
var SCHOOL_LOGO = 'https://img2.pic.in.th/pic/Logo-7aecb8e321ff2955.png';

var PAGES = [
  { f: 'index.html',  t: 'หน้าหลัก',      s: 'ข้อมูลสำหรับทุกคน' },
  { f: 'stats.html',  t: 'ผลและสถิติ',    s: 'ผลคะแนนและย้อนหลัง' },
  { f: 'live.html',   t: 'จอแสดงผล',      s: 'ฉายที่หอประชุม' },
  { f: 'booth.html',  t: 'คูหา',          s: 'สแกนบัตร ตรวจใบหน้า' },
  { f: 'enroll.html', t: 'ลงทะเบียนใบหน้า', s: 'ทำก่อนวันเลือกตั้ง' },
  { f: 'vote.html',   t: 'บัตรลงคะแนน',   s: 'กาบัตรในคูหา' },
  { f: 'admin.html',  t: 'แอดมิน',        s: 'แผงควบคุมระบบ' },
  { f: 'count.html',  t: 'ขานคะแนน',      s: 'นับหลังปิดหีบ' },
  { f: 'login.html',  t: 'เข้าสู่ระบบ',   s: 'สำหรับเจ้าหน้าที่' }
];

/* ================= โครงเมนูด้านซ้าย ================= */

function buildShell() {
  var body = document.body;
  var here = body.getAttribute('data-page') || 'index.html';
  var side = document.getElementById('side');
  var top = document.getElementById('top');
  var i, html;

  if (side) {
    html = '<div class="side-brand">' +
      '<img src="' + SCHOOL_LOGO + '" alt="ตราโรงเรียนบ้านละลม" id="side-logo">' +
      '<div><strong>เลือกตั้งสภานักเรียน</strong><span>โรงเรียนบ้านละลม</span></div></div>' +
      '<nav class="side-nav" aria-label="เมนูหลัก">';

    for (i = 0; i < PAGES.length; i++) {
      html += '<a href="' + PAGES[i].f + '"' + (PAGES[i].f === here ? ' class="on" aria-current="page"' : '') + '>' +
              PAGES[i].t + '<small>' + PAGES[i].s + '</small></a>';
    }

    html += '</nav>';
    html += '<div class="theme-lbl">ธีมการแสดงผล</div>';
    var SW = [
      ['light', 'สว่าง', '#EEEDF4', '#6D4FE0'],
      ['dark', 'มืด', '#1E1830', '#8B6FF0'],
      ['pastel', 'พาสเทล', '#F7F3FB', '#9B7FD4'],
      ['ocean', 'ทางการ', '#EDF3F9', '#1C6DB5'],
      ['auto', 'อัตโนมัติ', 'linear-gradient(135deg,#EEEDF4 50%,#1E1830 50%)', '#6D4FE0']
    ];
    html += '<div class="theme-pick">';
    for (var sw = 0; sw < SW.length; sw++) {
      html += '<button data-theme="' + SW[sw][0] + '" title="' + SW[sw][1] + '" aria-label="' + SW[sw][1] + '">' +
        '<span class="sw" style="background:' + SW[sw][2] + '"><em style="background:' + SW[sw][3] + '"></em></span>' +
        SW[sw][1] + '</button>';
    }
    html += '</div>';
    html += '<div class="theme-custom"><label for="accentPick">กำหนดสีเอง</label>' +
      '<input type="color" id="accentPick" value="' + Theme.getAccent() + '"></div>';
    html += '<div class="side-foot">ปีการศึกษา 2569<br>สพป.ศรีสะเกษ เขต 3</div>';
    side.innerHTML = html;

    var picks = side.querySelectorAll('.theme-pick [data-theme]');
    for (var p = 0; p < picks.length; p++) {
      picks[p].onclick = function () { Theme.set(this.getAttribute('data-theme')); };
    }
    var acc = document.getElementById('accentPick');
    if (acc) { acc.oninput = function () { Theme.setAccent(this.value); }; }
    Theme.paintButtons(Theme.get());
  }

  if (top) {
    top.innerHTML = '<div class="netbar" id="netbar">ขาดการเชื่อมต่ออินเทอร์เน็ต ระบบจะลองส่งใหม่ให้อัตโนมัติ</div>' +
      '<header class="masthead"><div class="masthead-in"><div>' +
      '<h1>' + (body.getAttribute('data-title') || '') + '</h1>' +
      '<div class="sub">' + (body.getAttribute('data-sub') || '') + '</div></div>' +
      '<div class="doc-no">' + (body.getAttribute('data-doc') || '') + '</div></div></header>';
  }
}

/* ================= ชั้นเรียก API ที่ทนต่อความผิดพลาด ================= */

var API = {
  timeout: 15000,
  retries: 2,

  call: function (action, data, ok, fail) {
    if (!API_URL) {
      if (fail) { fail('ยังไม่ได้ตั้งค่า API_URL ในไฟล์ config.js'); }
      return;
    }
    if (navigator.onLine === false) {
      if (fail) { fail('ไม่มีสัญญาณอินเทอร์เน็ต'); }
      return;
    }
    API._try(action, data, ok, fail, 0);
  },

  _try: function (action, data, ok, fail, attempt) {
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) { ctrl.abort(); } }, API.timeout);

    var opts = {
      method: 'POST',
      /* ใช้ text/plain เพื่อเลี่ยง preflight ของ CORS — GAS อ่านจาก e.postData.contents ได้ปกติ */
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: Session.get(), data: data || {} })
    };
    if (ctrl) { opts.signal = ctrl.signal; }

    fetch(API_URL, opts)
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) { throw new Error('เซิร์ฟเวอร์ตอบกลับรหัส ' + r.status); }
        return r.text();
      })
      .then(function (txt) {
        var res;
        try { res = JSON.parse(txt); }
        catch (e) { throw new Error('รูปแบบข้อมูลที่ได้รับไม่ถูกต้อง'); }

        if (res.ok === false) {
          if (res.code === 'AUTH') { Session.clear(); window.location.href = 'login.html'; return; }
          throw new Error(res.error || 'ทำรายการไม่สำเร็จ');
        }
        if (ok) { ok(res.data); }
      })
      .catch(function (err) {
        clearTimeout(timer);
        var msg = (err && err.name === 'AbortError') ? 'เซิร์ฟเวอร์ตอบช้าเกินไป' : (err.message || 'เกิดข้อผิดพลาด');

        if (attempt < API.retries) {
          setTimeout(function () {
            API._try(action, data, ok, fail, attempt + 1);
          }, 700 * Math.pow(2, attempt));
          return;
        }
        if (fail) { fail(msg); } else { toastError(msg); }
      });
  }
};

/* ================= รหัสเข้าใช้งาน ================= */

var Session = {
  get: function () {
    try { return sessionStorage.getItem('el_token') || ''; } catch (e) { return ''; }
  },
  set: function (t) {
    try { sessionStorage.setItem('el_token', t); } catch (e) {}
  },
  clear: function () {
    try { sessionStorage.removeItem('el_token'); } catch (e) {}
  },
  /* เรียกที่ต้นหน้าที่ต้องล็อกอิน */
  guard: function () {
    if (!Session.get()) {
      window.location.replace('login.html');
      return false;
    }
    return true;
  }
};

/* ================= กันกดซ้ำ ================= */

function lockBtn(btn, label) {
  if (!btn || btn.disabled) { return false; }
  btn.setAttribute('data-label', btn.textContent);
  btn.disabled = true;
  btn.classList.add('busy');
  btn.textContent = label || 'กำลังทำงาน…';
  return true;
}

function unlockBtn(btn) {
  if (!btn) { return; }
  btn.disabled = false;
  btn.classList.remove('busy');
  var l = btn.getAttribute('data-label');
  if (l) { btn.textContent = l; }
}

/* ================= กล่องโหลด: โลโก้ในวงแหวนไตรรงค์หมุน (ใช้ร่วมทุกหน้า) ================= */

function spinnerHtml() {
  /* วงแหวนสามสีหมุนรอบตราโรงเรียนที่เต้นเป็นจังหวะ สื่อการเลือกตั้ง/ประชาธิปไตย */
  return '<div class="el-loader" aria-hidden="true">' +
    '<div class="el-loader-ring"></div>' +
    '<div class="el-loader-core"></div>' +
    '<div class="el-loader-ping"></div>' +
    '</div>';
}

/* เปิดกล่องโหลด คืน promise ปิดด้วย Swal.close() */
function showLoading(title, sub) {
  if (typeof Swal === 'undefined') { return; }
  Swal.fire({
    title: title || 'กำลังดำเนินการ',
    html: spinnerHtml() +
      '<div class="el-loader-cap">' + (sub || 'โปรดรอสักครู่') +
      '<span class="el-loader-dot">.</span><span class="el-loader-dot">.</span><span class="el-loader-dot">.</span></div>',
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    customClass: { popup: 'el-loading' }
  });
}

/* ฉีด CSS ของ loader ครั้งเดียว */
(function injectSpinnerCss() {
  if (document.getElementById('el-spin-css')) { return; }
  var st = document.createElement('style');
  st.id = 'el-spin-css';
  st.textContent =
    '.el-loader{position:relative;width:112px;height:112px;margin:10px auto 2px}' +
    '.el-loader-ring{position:absolute;inset:0;border-radius:50%;' +
      'background:conic-gradient(from 0deg,var(--violet),var(--verify),var(--stamp),var(--amber),var(--violet));' +
      '-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 10px),#000 calc(100% - 9px));' +
      'mask:radial-gradient(farthest-side,transparent calc(100% - 10px),#000 calc(100% - 9px));' +
      'animation:el-rot 1.15s linear infinite}' +
    '.el-loader-ping{position:absolute;inset:4px;border-radius:50%;border:2px solid var(--violet);' +
      'opacity:0;animation:el-ping 1.8s cubic-bezier(.2,.7,.4,1) infinite}' +
    '.el-loader-core{position:absolute;inset:18px;border-radius:50%;background:#fff;' +
      'background-image:var(--el-logo,none);background-size:70%;background-position:center;background-repeat:no-repeat;' +
      'box-shadow:0 3px 12px rgba(20,16,42,.22);animation:el-beat 1.6s ease-in-out infinite}' +
    '.el-loader-cap{text-align:center;font-family:"Bai Jamjuree",sans-serif;font-weight:500;' +
      'color:var(--ink-soft);margin-top:12px;font-size:.96rem;letter-spacing:.01em}' +
    '.el-loader-dot{animation:el-blink 1.4s infinite;opacity:.2}' +
    '.el-loader-dot:nth-child(2){animation-delay:.2s}.el-loader-dot:nth-child(3){animation-delay:.4s}' +
    '.swal2-popup.el-loading{padding-top:30px!important}' +
    '.swal2-popup.el-loading::after{display:none}' +
    '@keyframes el-rot{to{transform:rotate(360deg)}}' +
    '@keyframes el-beat{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}' +
    '@keyframes el-ping{0%{transform:scale(.7);opacity:.7}70%,100%{transform:scale(1.25);opacity:0}}' +
    '@keyframes el-blink{0%,100%{opacity:.2}50%{opacity:1}}' +
    '@media (prefers-reduced-motion:reduce){.el-loader-ring,.el-loader-core,.el-loader-ping,.el-loader-dot{animation:none}}';
  document.head.appendChild(st);
})();

/* ================= แจ้งเตือน ================= */

function toastError(msg) {
  if (typeof Swal === 'undefined') { return; }
  Swal.fire({
    icon: 'error',
    title: 'ทำรายการไม่สำเร็จ',
    html: msg + '<br><span class="mono" style="color:#8B849F">ลองใหม่อีกครั้ง หากยังไม่ได้ให้แจ้งครูผู้ดูแลระบบ</span>',
    confirmButtonText: 'ปิด'
  });
}

function demoNote(msg) {
  Swal.fire({ icon: 'info', title: 'หน้าสาธิต', html: msg, confirmButtonText: 'เข้าใจแล้ว' });
}

/* ================= เฝ้าสัญญาณเน็ต ================= */

function watchNet() {
  function paint() {
    var b = document.getElementById('netbar');
    if (!b) { return; }
    if (navigator.onLine === false) { b.classList.add('show'); }
    else { b.classList.remove('show'); }
  }
  window.addEventListener('online', paint);
  window.addEventListener('offline', paint);
  paint();
}

/* ================= เอฟเฟกต์เลื่อนขึ้น ================= */

function initReveal() {
  var items = document.querySelectorAll('.reveal:not(.in)');
  var i;

  if (!('IntersectionObserver' in window)) {
    for (i = 0; i < items.length; i++) { items[i].classList.add('in'); }
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    for (var k = 0; k < entries.length; k++) {
      if (entries[k].isIntersecting) {
        entries[k].target.classList.add('in');
        io.unobserve(entries[k].target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  for (i = 0; i < items.length; i++) { io.observe(items[i]); }
}

function stagger(selector, step) {
  var kids = document.querySelectorAll(selector);
  for (var i = 0; i < kids.length; i++) {
    kids[i].style.setProperty('--d', (i * (step || 90)) + 'ms');
  }
}

/* ================= เครื่องมือทั่วไป ================= */

function countUp(el, target, ms) {
  if (!el) { return; }
  var start = null;
  var from = parseInt(el.getAttribute('data-from') || '0', 10);
  var dur = ms || 1100;

  function frame(ts) {
    if (start === null) { start = ts; }
    var p = Math.min((ts - start) / dur, 1);
    var eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (target - from) * eased));
    if (p < 1) { requestAnimationFrame(frame); }
  }
  requestAnimationFrame(frame);
}

function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function pad(n) { return n < 10 ? '0' + n : String(n); }

function randCode(len) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var out = '';
  for (var i = 0; i < len; i++) { out += chars.charAt(Math.floor(Math.random() * chars.length)); }
  return out;
}

function randHex(len) {
  var out = '';
  for (var i = 0; i < len; i++) { out += '0123456789abcdef'.charAt(Math.floor(Math.random() * 16)); }
  return out;
}

/* แปลง File เป็น base64 สำหรับส่งขึ้น Drive */
function fileToBase64(file, cb, err) {
  var r = new FileReader();
  r.onload = function () {
    var s = String(r.result);
    cb(s.substring(s.indexOf(',') + 1));
  };
  r.onerror = function () { if (err) { err('อ่านไฟล์ไม่สำเร็จ'); } };
  r.readAsDataURL(file);
}

/* ================= กล้องถ่ายใบหน้า (getUserMedia) ================= */

var Camera = {
  stream: null,

  /* เปิดกล้องแล้วแสดงใน element video ที่ให้มา คืน true ถ้าสำเร็จ */
  open: function (videoEl, ok, fail) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (fail) { fail('อุปกรณ์นี้ไม่รองรับการใช้กล้อง'); }
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 360 }, audio: false })
      .then(function (st) {
        Camera.stream = st;
        videoEl.srcObject = st;
        videoEl.play();
        if (ok) { ok(); }
      })
      .catch(function (e) {
        var msg = 'เปิดกล้องไม่ได้';
        if (e && e.name === 'NotAllowedError') { msg = 'ยังไม่ได้อนุญาตให้ใช้กล้อง กดอนุญาตแล้วลองใหม่'; }
        else if (e && e.name === 'NotFoundError') { msg = 'ไม่พบกล้องบนอุปกรณ์นี้'; }
        if (fail) { fail(msg); }
      });
  },

  /* จับภาพนิ่งจาก video คืน base64 jpeg (ไม่มีส่วนหัว data:) */
  snap: function (videoEl) {
    var cv = document.createElement('canvas');
    cv.width = videoEl.videoWidth || 480;
    cv.height = videoEl.videoHeight || 360;
    cv.getContext('2d').drawImage(videoEl, 0, 0, cv.width, cv.height);
    var url = cv.toDataURL('image/jpeg', 0.82);
    return url.substring(url.indexOf(',') + 1);
  },

  /* ปิดกล้อง คืนทรัพยากร */
  close: function () {
    if (Camera.stream) {
      var tracks = Camera.stream.getTracks();
      for (var i = 0; i < tracks.length; i++) { tracks[i].stop(); }
      Camera.stream = null;
    }
  }
};

/* ================= เริ่มทำงาน ================= */

window.onerror = function (msg) {
  if (typeof Swal !== 'undefined' && !window.__errShown) {
    window.__errShown = true;
    toastError('หน้านี้ทำงานผิดพลาด กรุณารีเฟรชหน้าใหม่');
  }
  return false;
};

/* ดึงตราโรงเรียนล่าสุดจาก backend มาแสดง (cache ไว้กันกระพริบ) */
function loadLogo() {
  var cached = '';
  try { cached = localStorage.getItem('el_logo') || ''; } catch (e) {}
  if (cached) { setLogoEverywhere(cached); }

  if (!API_URL) { return; }
  API.call('getLogo', {}, function (data) {
    if (data && data.url) {
      setLogoEverywhere(data.url);
      try { localStorage.setItem('el_logo', data.url); } catch (e) {}
    }
  }, function () {});
}

function setLogoEverywhere(url) {
  var el = document.getElementById('side-logo');
  if (el) { el.src = url; }
  var now = document.getElementById('lgnow');
  if (now) { now.src = url; }
  /* ใส่โลโก้ลงกล่องแจ้งเตือน SweetAlert ผ่านตัวแปร CSS */
  try { document.documentElement.style.setProperty('--el-logo', 'url("' + url + '")'); } catch (e) {}
}

document.addEventListener('DOMContentLoaded', function () {
  /* ตั้งโลโก้เริ่มต้นให้กล่องแจ้งเตือนมีตราทันที ก่อน loadLogo จะดึงของจริง */
  try { document.documentElement.style.setProperty('--el-logo', 'url("' + SCHOOL_LOGO + '")'); } catch (e) {}
  buildShell();
  watchNet();
  initReveal();
  Voice.init();
  loadLogo();
});
