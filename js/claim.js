/* 学生端：领取 π 幸运码 */
(function () {
  'use strict';

  var consoleEl = document.getElementById('console');
  var form = document.getElementById('claim-form');
  var nameIn = document.getElementById('in-name');
  var noIn = document.getElementById('in-no');
  var fName = document.getElementById('f-name');
  var fNo = document.getElementById('f-no');
  var btn = document.getElementById('btn-claim');
  var btnText = document.getElementById('btn-text');
  var errEl = document.getElementById('form-err');
  var statusEl = document.getElementById('result-status');
  var dupBadge = document.getElementById('dup-badge');
  var rName = document.getElementById('r-name');
  var rNo = document.getElementById('r-no');
  var rCodes = document.getElementById('r-codes');
  var rPos = document.getElementById('r-pos');
  var rPos2 = document.getElementById('r-pos2');
  var rCtx = document.getElementById('r-ctx');
  var copiedEl = document.getElementById('copied');
  var clockEl = document.getElementById('clock');
  var modeLabel = document.getElementById('mode-label');
  var modeFlag = document.getElementById('mode-flag');
  var syncLabel = document.getElementById('sync-label');
  var tiles = rCodes ? rCodes.getElementsByTagName('span') : [];

  var busy = false;
  var rollTimer = null;
  var copiedTimer = null;
  var currentCode = '';

  /* ── 顶部时钟 ───────────────────────────── */

  function tickClock() {
    var now = new Date();
    var txt = '00:00:00';
    try {
      txt = now.toLocaleTimeString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
    } catch (e) {
      txt = ('0' + now.getHours()).slice(-2) + ':' +
            ('0' + now.getMinutes()).slice(-2) + ':' +
            ('0' + now.getSeconds()).slice(-2);
    }
    clockEl.textContent = txt;
  }

  /* ── 运行模式提示 ───────────────────────── */

  function initMode() {
    if (window.PI_API.cloud) return;
    modeLabel.textContent = 'DEMO MODE';
    syncLabel.textContent = '本地浏览器存储';
    modeFlag.textContent = '当前为本地演示模式：未配置 Supabase，数据只保存在本机浏览器，仅供布展前预览。';
    modeFlag.classList.add('show');
  }

  /* ── 表单交互 ───────────────────────────── */

  function setError(msg) {
    errEl.textContent = msg;
    errEl.classList.add('show');
  }

  function clearError() {
    errEl.textContent = '';
    errEl.classList.remove('show');
  }

  function mark(el, bad) {
    el.classList.toggle('invalid', !!bad);
  }

  nameIn.addEventListener('input', function () {
    mark(fName, false);
    clearError();
  });

  noIn.addEventListener('input', function () {
    mark(fNo, false);
    clearError();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submit();
  });

  function validate(name, no) {
    var nameOk = name.length >= 1 && name.length <= 20 && /^[\u4e00-\u9fa5·A-Za-z\s.]+$/.test(name);
    var noOk = /^[A-Z0-9_-]{4,24}$/.test(no);
    mark(fName, !nameOk);
    mark(fNo, !noOk);
    if (!nameOk || !noOk) {
      setError('请检查输入：姓名为 1–20 个字（中文或字母），学号为 4–24 位字母或数字。');
      return false;
    }
    return true;
  }

  function submit() {
    if (busy) return;
    clearError();

    var name = nameIn.value.trim();
    var no = noIn.value.trim().toUpperCase();
    if (!validate(name, no)) return;

    busy = true;
    btn.disabled = true;
    btn.classList.add('loading');
    btnText.textContent = '正在接入 π 数据流';

    startDecode(name, no);
    var startedAt = Date.now();

    window.PI_API.claim(name, no).then(function (data) {
      var rest = Math.max(0, 900 - (Date.now() - startedAt));
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(data); }, rest);
      });
    }).then(function (data) {
      renderResult(data);
    }, function (err) {
      stopRoll();
      consoleEl.classList.remove('is-result');
      setError(mapError(err));
    }).then(function () {
      busy = false;
      btn.disabled = false;
      btn.classList.remove('loading');
      btnText.textContent = '获取我的 π 幸运码';
    });
  }

  /* ── 解码动画 ───────────────────────────── */

  function startDecode(name, no) {
    consoleEl.classList.add('is-result');
    statusEl.textContent = 'SCANNING π SEQUENCE';
    dupBadge.hidden = true;
    rName.textContent = name;
    rNo.textContent = 'ID · ' + no;
    rPos.textContent = '· ·';
    rPos2.textContent = '· ·';
    rCtx.textContent = 'π 3.14159 26535 89793 23846 …  检索中';
    mark(fName, false);
    mark(fNo, false);

    stopRoll();
    rollTimer = setInterval(function () {
      for (var i = 0; i < tiles.length; i++) {
        tiles[i].textContent = String(Math.floor(Math.random() * 10));
      }
    }, 55);
  }

  function stopRoll() {
    if (rollTimer) {
      clearInterval(rollTimer);
      rollTimer = null;
    }
  }

  /* ── 结果渲染 ───────────────────────────── */

  function renderResult(data) {
    stopRoll();

    var code = String(data.code || '').replace(/\D/g, '');
    code = (code + '0000').slice(0, 4);
    currentCode = code;

    statusEl.textContent = data.duplicate ? 'CODE ALREADY ISSUED' : 'LUCKY CODE CONFIRMED';
    dupBadge.hidden = !data.duplicate;
    rName.textContent = data.name || '—';
    rNo.textContent = 'ID · ' + (data.student_no || '—');

    for (var i = 0; i < tiles.length; i++) {
      tiles[i].textContent = code.charAt(i);
    }

    var pos = Number(data.position) || 1;
    rPos.textContent = pos;
    rPos2.textContent = pos + 3;
    rCtx.innerHTML = buildContext(pos, code);
    centerHighlight();
  }

  // 窄屏时 π 上下文可能超出容器，滚动到让幸运码居中可见
  function centerHighlight() {
    requestAnimationFrame(function () {
      var hl = rCtx.querySelector('.hl');
      if (!hl) return;
      var box = rCtx.getBoundingClientRect();
      var mark = hl.getBoundingClientRect();
      var delta = (mark.left - box.left) - (box.width - mark.width) / 2;
      rCtx.scrollLeft += delta;
    });
  }

  function buildContext(position, code) {
    var digits = window.PI_DIGITS || '';
    var start = Math.max(0, position - 1);
    // 按容器宽度收窄上下文，保证高亮的幸运码始终可见
    var width = rCtx.clientWidth || window.innerWidth;
    var span = width < 420 ? 10 : 26;
    var from = Math.max(0, start - span);
    var before = digits.slice(from, start);
    var after = digits.slice(start + 4, start + 4 + span);

    var html = 'π 3.';
    if (from > 0) html += '<span class="ell">…</span>';
    html += before;
    html += '<span class="hl">' + code + '</span>';
    html += after;
    if (start + 4 + span < digits.length) html += '<span class="ell">…</span>';
    return html;
  }

  /* ── 复制 / 重新查询 ────────────────────── */

  function flashCopied() {
    copiedEl.style.opacity = '1';
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(function () { copiedEl.style.opacity = '0'; }, 1200);
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* 忽略 */ }
    document.body.removeChild(ta);
    flashCopied();
  }

  document.getElementById('btn-copy').addEventListener('click', function () {
    var text = currentCode ? 'π 幸运码：' + currentCode : '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(flashCopied, function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  });

  document.getElementById('btn-again').addEventListener('click', function () {
    stopRoll();
    consoleEl.classList.remove('is-result');
    nameIn.value = '';
    noIn.value = '';
    currentCode = '';
    clearError();
    mark(fName, false);
    mark(fNo, false);
    setTimeout(function () { nameIn.focus(); }, 60);
  });

  /* ── 错误文案 ───────────────────────────── */

  function mapError(err) {
    var msg = String((err && (err.code || err.message)) || '');
    if (msg.indexOf('Could not find the function') >= 0 || msg.indexOf('schema cache') >= 0) {
      return '云端函数尚未初始化：请先在 Supabase 中执行 supabase.sql，再刷新页面。';
    }
    if (msg.indexOf('INVALID_NAME') >= 0) return '姓名格式不正确，请重新输入。';
    if (msg.indexOf('INVALID_NO') >= 0) return '学号格式不正确，请重新输入。';
    if (msg.indexOf('INVALID_CODE') >= 0 || msg.indexOf('INVALID_POS') >= 0) {
      return '幸运码生成异常，请刷新页面后重试。';
    }
    if (msg.indexOf('Failed to fetch') >= 0 || msg.indexOf('NetworkError') >= 0) {
      return '网络连接失败，请检查网络后重试。';
    }
    return '领取失败：' + (msg || '未知错误') + '，请稍后重试。';
  }

  /* ── 启动 ───────────────────────────────── */

  tickClock();
  setInterval(tickClock, 1000);
  initMode();
})();
