/* 管理端：统计与 Excel 导出 */
(function () {
  'use strict';

  var gate = document.getElementById('gate');
  var shell = document.getElementById('shell');
  var gateForm = document.getElementById('gate-form');
  var pwdIn = document.getElementById('in-pwd');
  var loginBtn = document.getElementById('btn-login');
  var loginText = document.getElementById('btn-login-text');
  var gateErr = document.getElementById('gate-err');
  var notice = document.getElementById('admin-notice');
  var tbody = document.getElementById('tbody');
  var searchIn = document.getElementById('in-search');
  var tableCount = document.getElementById('table-count');
  var chartCv = document.getElementById('chart');
  var clockEl = document.getElementById('clock');
  var modeLabel = document.getElementById('mode-label');

  var state = { rows: [], keyword: '', password: '' };
  var SESSION_KEY = 'pi_lucky_admin_pw';
  var logging = false;

  /* ── 工具 ───────────────────────────────── */

  function parseTime(v) {
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function pad(n) {
    return ('0' + n).slice(-2);
  }

  function fmtFull(v) {
    var d = parseTime(v);
    if (!d) return '—';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function fmtShort(v) {
    var d = parseTime(v);
    if (!d) return '—';
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fmtNow() {
    var d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function dayKey(d) {
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  /* ── 顶部时钟与模式 ─────────────────────── */

  function tickClock() {
    var now = new Date();
    var txt;
    try {
      txt = now.toLocaleTimeString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
    } catch (e) {
      txt = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    }
    clockEl.textContent = txt;
  }

  function initMode() {
    if (window.PI_API.cloud) {
      document.getElementById('data-source').textContent = 'DATA SOURCE · SUPABASE CLOUD';
      document.getElementById('sys-storage').textContent = 'Supabase / PostgreSQL';
    } else {
      modeLabel.textContent = 'DEMO MODE';
      document.getElementById('data-source').textContent = 'DATA SOURCE · LOCAL DEMO';
      document.getElementById('sys-storage').textContent = '浏览器 localStorage';
    }
  }

  /* ── 登录 ───────────────────────────────── */

  function showGateError(msg) {
    gateErr.textContent = msg;
    gateErr.classList.add('show');
  }

  function clearGateError() {
    gateErr.textContent = '';
    gateErr.classList.remove('show');
  }

  function setLogging(on) {
    logging = on;
    loginBtn.disabled = on;
    loginBtn.classList.toggle('loading', on);
    loginText.textContent = on ? '正在校验' : '进入统计台';
  }

  gateForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (logging) return;
    clearGateError();
    login(pwdIn.value.trim());
  });

  function login(password) {
    if (!password) {
      showGateError('请输入管理密码。');
      return;
    }
    setLogging(true);
    window.PI_API.adminList(password).then(function (data) {
      state.password = password;
      state.rows = sortRows(data.rows || []);
      try { sessionStorage.setItem(SESSION_KEY, password); } catch (e) { /* 忽略 */ }
      setLogging(false);
      clearGateError();
      pwdIn.value = '';
      enterShell();
    }, function (err) {
      setLogging(false);
      showGateError(mapError(err));
    });
  }

  function sortRows(rows) {
    return rows.slice().sort(function (a, b) {
      var ta = parseTime(a.created_at);
      var tb = parseTime(b.created_at);
      return (tb ? tb.getTime() : 0) - (ta ? ta.getTime() : 0);
    });
  }

  function enterShell() {
    gate.classList.add('hidden');
    shell.classList.add('show');
    renderAll();
  }

  function leaveShell() {
    gate.classList.remove('hidden');
    shell.classList.remove('show');
    state.rows = [];
    state.password = '';
    state.keyword = '';
    searchIn.value = '';
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* 忽略 */ }
    clearGateError();
    pwdIn.focus();
  }

  document.getElementById('btn-logout').addEventListener('click', leaveShell);

  /* ── 刷新 ───────────────────────────────── */

  function refresh(silent) {
    if (!state.password) return;
    var btn = document.getElementById('btn-refresh');
    btn.disabled = true;
    if (!silent) hideNotice();
    window.PI_API.adminList(state.password).then(function (data) {
      state.rows = sortRows(data.rows || []);
      renderAll();
      btn.disabled = false;
    }, function (err) {
      btn.disabled = false;
      showNotice(mapError(err));
    });
  }

  document.getElementById('btn-refresh').addEventListener('click', function () {
    refresh(false);
  });

  function showNotice(msg) {
    notice.textContent = msg;
    notice.classList.add('show');
  }

  function hideNotice() {
    notice.textContent = '';
    notice.classList.remove('show');
  }

  /* ── 渲染 ───────────────────────────────── */

  function renderAll() {
    renderStats();
    renderTable();
    drawChart();
    document.getElementById('sys-sync').textContent = fmtNow();
  }

  function renderStats() {
    var rows = state.rows;
    var total = rows.length;
    var today = 0;
    var codes = {};
    var todayKey = dayKey(new Date());

    rows.forEach(function (r) {
      var d = parseTime(r.created_at);
      if (d && dayKey(d) === todayKey) today++;
      if (r.code) codes[r.code] = true;
    });

    var unique = Object.keys(codes).length;
    document.getElementById('st-total').textContent = total;
    document.getElementById('st-today').textContent = today;
    document.getElementById('st-codes').textContent = unique;
    document.getElementById('st-latest').textContent = total ? fmtShort(rows[0].created_at) : '—';
    document.getElementById('sys-codes').textContent = unique + ' / ' + total;
  }

  function filteredRows() {
    var kw = state.keyword.trim().toLowerCase();
    if (!kw) return state.rows;
    return state.rows.filter(function (r) {
      return String(r.name || '').toLowerCase().indexOf(kw) >= 0 ||
        String(r.student_no || '').toLowerCase().indexOf(kw) >= 0 ||
        String(r.code || '').indexOf(kw) >= 0;
    });
  }

  function renderTable() {
    var rows = filteredRows();
    tableCount.textContent = rows.length + ' 条记录';
    tbody.innerHTML = '';

    if (!rows.length) {
      var tr = document.createElement('tr');
      tr.className = 'empty-row';
      var td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = state.rows.length ? 'NO MATCHED RECORD · 没有匹配的记录' : 'NO DATA · 暂无领取记录';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    var frag = document.createDocumentFragment();
    rows.forEach(function (r, i) {
      var tr = document.createElement('tr');

      var tdIdx = document.createElement('td');
      tdIdx.className = 'idx';
      tdIdx.textContent = String(i + 1).padStart(2, '0');

      var tdName = document.createElement('td');
      tdName.className = 'name';
      tdName.textContent = r.name || '—';

      var tdNo = document.createElement('td');
      tdNo.textContent = r.student_no || '—';

      var tdCode = document.createElement('td');
      tdCode.className = 'code';
      tdCode.textContent = r.code || '—';

      var tdPos = document.createElement('td');
      tdPos.className = 'pos';
      tdPos.textContent = r.position ? ('第 ' + r.position + ' 位起') : '—';

      var tdTime = document.createElement('td');
      tdTime.className = 'time';
      tdTime.textContent = fmtFull(r.created_at);

      tr.appendChild(tdIdx);
      tr.appendChild(tdName);
      tr.appendChild(tdNo);
      tr.appendChild(tdCode);
      tr.appendChild(tdPos);
      tr.appendChild(tdTime);
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  }

  searchIn.addEventListener('input', function () {
    state.keyword = searchIn.value;
    renderTable();
  });

  /* ── 时段分布图 ─────────────────────────── */

  function drawChart() {
    if (!chartCv) return;
    var ctx = chartCv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = chartCv.clientWidth || 600;
    var h = 150;
    chartCv.width = Math.round(w * dpr);
    chartCv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var buckets = new Array(24);
    for (var i = 0; i < 24; i++) buckets[i] = 0;
    state.rows.forEach(function (r) {
      var d = parseTime(r.created_at);
      if (d) buckets[d.getHours()]++;
    });

    var max = Math.max.apply(null, buckets);
    if (max < 1) max = 1;

    var padL = 4;
    var padB = 16;
    var plotW = w - padL * 2;
    var plotH = h - padB;
    var gap = Math.max(2, plotW / 24 * 0.22);
    var barW = plotW / 24 - gap;

    ctx.strokeStyle = 'rgba(55, 230, 255, 0.1)';
    ctx.lineWidth = 1;
    for (var g = 0; g <= 3; g++) {
      var y = plotH - (plotH * g) / 3 + 0.5;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padL, y);
      ctx.stroke();
    }

    var grad = ctx.createLinearGradient(0, 0, 0, plotH);
    grad.addColorStop(0, 'rgba(55, 230, 255, 0.95)');
    grad.addColorStop(1, 'rgba(55, 230, 255, 0.14)');

    for (var k = 0; k < 24; k++) {
      var x = padL + k * (barW + gap) + gap / 2;
      var bh = buckets[k] ? Math.max(3, (buckets[k] / max) * (plotH - 6)) : 1;
      ctx.fillStyle = buckets[k] ? grad : 'rgba(55, 230, 255, 0.08)';
      ctx.fillRect(x, plotH - bh, barW, bh);
    }

    if (!state.rows.length) {
      ctx.fillStyle = 'rgba(125, 147, 171, 0.6)';
      ctx.font = '10px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO DATA · 暂无领取记录', w / 2, plotH / 2);
      ctx.textAlign = 'start';
    }
  }

  window.addEventListener('resize', function () {
    if (shell.classList.contains('show')) drawChart();
  });

  /* ── Excel 导出 ─────────────────────────── */

  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
  }

  document.getElementById('btn-export').addEventListener('click', function () {
    if (!state.rows.length) {
      showNotice('暂无可导出的数据。');
      return;
    }
    if (!window.XLSX) {
      showNotice('导出组件加载失败，请刷新页面后重试。');
      return;
    }

    var rows = state.rows;
    var detail = [['序号', '姓名', '学号', '幸运码', 'π 位置（第 N 位起）', '领取时间']];
    rows.forEach(function (r, i) {
      detail.push([
        i + 1,
        r.name || '',
        r.student_no || '',
        r.code || '',
        r.position ? ('第 ' + r.position + ' 位起（共 4 位）') : '',
        fmtFull(r.created_at)
      ]);
    });

    var codes = {};
    var today = 0;
    var todayKey = dayKey(new Date());
    rows.forEach(function (r) {
      if (r.code) codes[r.code] = true;
      var d = parseTime(r.created_at);
      if (d && dayKey(d) === todayKey) today++;
    });

    var summary = [
      ['Π 动嘉年华 · 幸运码统计'],
      ['导出时间', fmtFull(new Date().toISOString())],
      ['数据来源', window.PI_API.cloud ? 'Supabase 云端数据库' : '本地演示模式（localStorage）'],
      [],
      ['指标', '数值'],
      ['领取总数', rows.length],
      ['今日新增', today],
      ['唯一幸运码数', Object.keys(codes).length],
      ['最近领取', rows[0] ? fmtFull(rows[0].created_at) : '—']
    ];

    var wb = XLSX.utils.book_new();

    var ws = XLSX.utils.aoa_to_sheet(detail);
    ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 22 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, '领取明细');

    var ws2 = XLSX.utils.aoa_to_sheet(summary);
    ws2['!cols'] = [{ wch: 20 }, { wch: 34 }];
    XLSX.utils.book_append_sheet(wb, ws2, '统计概览');

    XLSX.writeFile(wb, 'Π动嘉年华-幸运码统计-' + stamp() + '.xlsx');
    hideNotice();
  });

  /* ── 错误文案 ───────────────────────────── */

  function mapError(err) {
    var msg = String((err && (err.code || err.message)) || '');
    if (msg.indexOf('AUTH_FAILED') >= 0) return '密码错误，请重新输入。';
    if (msg.indexOf('Could not find the function') >= 0 || msg.indexOf('schema cache') >= 0) {
      return '云端函数尚未初始化：请先在 Supabase 中执行 supabase.sql。';
    }
    if (msg.indexOf('Failed to fetch') >= 0 || msg.indexOf('NetworkError') >= 0) {
      return '网络连接失败，请检查网络后重试。';
    }
    return '操作失败：' + (msg || '未知错误');
  }

  /* ── 启动 ───────────────────────────────── */

  tickClock();
  setInterval(tickClock, 1000);
  initMode();

  var saved = '';
  try { saved = sessionStorage.getItem(SESSION_KEY) || ''; } catch (e) { saved = ''; }
  if (saved) {
    setLogging(true);
    window.PI_API.adminList(saved).then(function (data) {
      state.password = saved;
      state.rows = sortRows(data.rows || []);
      setLogging(false);
      enterShell();
    }, function () {
      setLogging(false);
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* 忽略 */ }
    });
  }
})();
