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

  get: function () {
    try { return localStorage.getItem(Theme.KEY) || 'light'; } catch (e) { return 'light'; }
  },

  set: function (name) {
    try { localStorage.setItem(Theme.KEY, name); } catch (e) {}
    Theme.apply(name);
    Theme.paintButtons(name);
  },

  apply: function (name) {
    document.documentElement.setAttribute('data-theme', name);
  },

  paintButtons: function (name) {
    var btns = document.querySelectorAll('.theme-pick button');
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
  { f: 'live.html',   t: 'จอแสดงผล',      s: 'ฉายที่หอประชุม' },
  { f: 'booth.html',  t: 'คูหา',          s: 'สแกนบัตร ตรวจใบหน้า' },
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
    html += '<div class="theme-pick">' +
      '<button data-theme="light">สว่าง</button>' +
      '<button data-theme="dark">มืด</button>' +
      '<button data-theme="auto">อัตโนมัติ</button></div>';
    html += '<div class="side-foot">ปีการศึกษา 2569<br>สพป.ศรีสะเกษ เขต 3</div>';
    side.innerHTML = html;

    var picks = side.querySelectorAll('.theme-pick button');
    for (var p = 0; p < picks.length; p++) {
      picks[p].onclick = function () { Theme.set(this.getAttribute('data-theme')); };
    }
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

/* ================= กล่องโหลดแบบหมุน (ใช้ร่วมทุกหน้า) ================= */

function spinnerHtml() {
  return '<div class="el-spin" aria-hidden="true">' +
    '<svg viewBox="0 0 50 50" width="64" height="64">' +
    '<circle cx="25" cy="25" r="20" fill="none" stroke="var(--violet-soft)" stroke-width="5"/>' +
    '<circle cx="25" cy="25" r="20" fill="none" stroke="var(--violet)" stroke-width="5" ' +
    'stroke-linecap="round" stroke-dasharray="90 150" transform="rotate(-90 25 25)"/>' +
    '</svg></div>';
}

/* เปิดกล่องโหลดหมุน คืน promise ปิดด้วย Swal.close() */
function showLoading(title, sub) {
  if (typeof Swal === 'undefined') { return; }
  Swal.fire({
    title: title || 'กำลังโหลด',
    html: spinnerHtml() + (sub ? '<div class="el-spin-sub">' + sub + '</div>' : ''),
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false
  });
}

/* ฉีด CSS ของ spinner ครั้งเดียว */
(function injectSpinnerCss() {
  if (document.getElementById('el-spin-css')) { return; }
  var st = document.createElement('style');
  st.id = 'el-spin-css';
  st.textContent =
    '.el-spin{display:flex;justify-content:center;padding:14px 0 6px}' +
    '.el-spin svg{animation:el-rot 1s linear infinite}' +
    '.el-spin-sub{font-family:"Bai Jamjuree",sans-serif;font-size:.9rem;color:var(--ink-soft);margin-top:6px}' +
    '@keyframes el-rot{to{transform:rotate(360deg)}}';
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

/* ================= เริ่มทำงาน ================= */

window.onerror = function (msg) {
  if (typeof Swal !== 'undefined' && !window.__errShown) {
    window.__errShown = true;
    toastError('หน้านี้ทำงานผิดพลาด กรุณารีเฟรชหน้าใหม่');
  }
  return false;
};

document.addEventListener('DOMContentLoaded', function () {
  buildShell();
  watchNet();
  initReveal();
  Voice.init();
});
