/**
 * 数据层：优先走 Supabase RPC，未配置时降级为浏览器本地存储。
 * 对外统一暴露 PI_API.claim(name, studentNo) / PI_API.adminList(password)。
 */
(function () {
  'use strict';

  var cfg = window.PI_CONFIG || {};
  var cloud = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  var baseUrl = String(cfg.SUPABASE_URL || '').replace(/\/+$/, '');
  var localKey = 'pi_lucky_local_v1';

  /* FNV-1a：把学号稳定映射到 π 小数位中的某一位置 */
  function hash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  function normalizeNo(no) {
    return String(no == null ? '' : no).trim().toUpperCase();
  }

  function positionFor(studentNo) {
    var salt = cfg.EVENT_SALT || 'PI';
    var span = window.PI_DIGITS.length - 4;
    return (hash(salt + '::' + normalizeNo(studentNo)) % span) + 1;
  }

  function codeFor(studentNo) {
    var p = positionFor(studentNo);
    return window.PI_DIGITS.substr(p - 1, 4);
  }

  /* ── 云端 RPC ───────────────────────────── */

  function rpc(fn, body) {
    var key = cfg.SUPABASE_ANON_KEY;
    var headers = {
      'Content-Type': 'application/json',
      apikey: key
    };
    // 旧版 anon key 是 JWT，需要同时放进 Authorization；新版 sb_publishable_ 密钥只走 apikey
    if (key.indexOf('eyJ') === 0) {
      headers.Authorization = 'Bearer ' + key;
    }
    return fetch(baseUrl + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
        if (!res.ok) {
          var msg = (data && (data.message || data.hint || data.details)) || ('HTTP ' + res.status);
          var err = new Error(msg);
          err.code = msg;
          throw err;
        }
        return data;
      });
    });
  }

  function cloudClaim(name, studentNo) {
    var no = normalizeNo(studentNo);
    return rpc('pi_claim', {
      p_name: name,
      p_no: no,
      p_code: codeFor(no),
      p_pos: positionFor(no)
    }).then(function (d) {
      if (!d || !d.ok) throw new Error('CLAIM_FAILED');
      return {
        name: d.name,
        student_no: d.student_no,
        code: d.code,
        position: d.position,
        created_at: d.created_at,
        duplicate: !!d.duplicate
      };
    });
  }

  function cloudAdminList(password) {
    return rpc('pi_admin_list', { p_password: password }).then(function (d) {
      return { total: (d && d.total) || 0, rows: (d && d.rows) || [] };
    });
  }

  /* ── 本地演示 ───────────────────────────── */

  function readLocal() {
    try {
      var raw = localStorage.getItem(localKey);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeLocal(rows) {
    try { localStorage.setItem(localKey, JSON.stringify(rows)); } catch (e) { /* 忽略 */ }
  }

  function localClaim(name, studentNo) {
    var no = normalizeNo(studentNo);
    var rows = readLocal();
    var found = rows.find(function (r) { return r.student_no === no; });
    if (found) {
      return Promise.resolve({
        name: found.name,
        student_no: found.student_no,
        code: found.code,
        position: found.position,
        created_at: found.created_at,
        duplicate: true
      });
    }
    var row = {
      name: name,
      student_no: no,
      code: codeFor(no),
      position: positionFor(no),
      created_at: new Date().toISOString()
    };
    rows.push(row);
    writeLocal(rows);
    return Promise.resolve({
      name: row.name,
      student_no: row.student_no,
      code: row.code,
      position: row.position,
      created_at: row.created_at,
      duplicate: false
    });
  }

  function localAdminList(password) {
    if (String(password || '') !== String(cfg.DEMO_ADMIN_PASSWORD || 'pi2026')) {
      var err = new Error('AUTH_FAILED');
      err.code = 'AUTH_FAILED';
      return Promise.reject(err);
    }
    var rows = readLocal().slice().sort(function (a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return Promise.resolve({ total: rows.length, rows: rows });
  }

  window.PI_API = {
    cloud: cloud,
    claim: cloud ? cloudClaim : localClaim,
    adminList: cloud ? cloudAdminList : localAdminList,
    codeFor: codeFor,
    positionFor: positionFor
  };
})();
