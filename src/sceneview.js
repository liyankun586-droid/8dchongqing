/* 渝你有约 — V1.1 房间场景渲染
 *
 * 一个 SVG 房间底图 + 可点击物件。
 * 物件坐标来自 scene.js 的 slots（房间百分比坐标）。
 *
 * 视觉方向：不是卡通像素风，是"剖面插画"——
 * 跟已有的 8D 剖面图同一套语言（深蓝夜空、青灰建筑、暖黄灯光）。
 * 房间是玩家自己的那一格，窗外是重庆。
 */
(function (root) {
  'use strict';

  var W = 360, H = 260;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- 物件图标：每个物件画得不一样 ---------- */
  function icon(id, x, y, label, sub) {
    var g = [];
    g.push('<g class="scene-obj" data-obj="' + id + '" tabindex="0" role="button" ' +
           'aria-label="' + esc(label) + '">');
    // 命中区（透明大块，方便手机点）
    g.push('<circle cx="' + x + '" cy="' + y + '" r="17" fill="transparent" class="hit"/>');

    var body = '';
    switch (id) {
      case 'bed':
        body = '<rect x="-13" y="-6" width="26" height="13" rx="2.5" fill="#7a6a58" stroke="#c9b79c" stroke-width="1.2"/>' +
               '<rect x="-11" y="-4" width="9" height="9" rx="1.5" fill="#d9cdb8"/>';
        break;
      case 'window':
        body = '<rect x="-10" y="-10" width="20" height="19" rx="1.5" fill="#1d3557" stroke="#8fb8d8" stroke-width="1.4"/>' +
               '<line x1="0" y1="-10" x2="0" y2="9" stroke="#8fb8d8" stroke-width="0.9"/>' +
               '<line x1="-10" y1="-1" x2="10" y2="-1" stroke="#8fb8d8" stroke-width="0.9"/>' +
               '<circle cx="5" cy="-5" r="2" fill="#f4d58d"/>';
        break;
      case 'stairs':
        body = '<path d="M-12 8 L-12 4 L-5 4 L-5 0 L2 0 L2 -4 L9 -4 L9 -8" ' +
               'fill="none" stroke="#a8b8c8" stroke-width="2.4" stroke-linejoin="round"/>';
        break;
      case 'lift':
        body = '<rect x="-9" y="-12" width="18" height="24" rx="1.5" fill="#243447" stroke="#7fa8c4" stroke-width="1.3"/>' +
               '<line x1="0" y1="-12" x2="0" y2="12" stroke="#7fa8c4" stroke-width="0.8"/>' +
               '<path d="M-4 2 L0 -2 L4 2" fill="none" stroke="#f4d58d" stroke-width="1.6"/>';
        break;
      case 'stove':
        body = '<rect x="-11" y="-8" width="22" height="16" rx="2" fill="#5a4a3c" stroke="#c9a87c" stroke-width="1.2"/>' +
               '<circle cx="-4" cy="0" r="3.4" fill="none" stroke="#e08a4a" stroke-width="1.6"/>' +
               '<circle cx="5" cy="0" r="3.4" fill="none" stroke="#e08a4a" stroke-width="1.6"/>';
        break;
      case 'balcony':
        body = '<rect x="-13" y="-4" width="26" height="9" rx="1.5" fill="none" stroke="#9ab0c4" stroke-width="1.3"/>' +
               '<line x1="-9" y1="-4" x2="-9" y2="5" stroke="#9ab0c4" stroke-width="1"/>' +
               '<line x1="0" y1="-4" x2="0" y2="5" stroke="#9ab0c4" stroke-width="1"/>' +
               '<line x1="9" y1="-4" x2="9" y2="5" stroke="#9ab0c4" stroke-width="1"/>';
        break;
      case 'phone':
        body = '<rect x="-6" y="-10" width="12" height="20" rx="2" fill="#1a2634" stroke="#7fa8c4" stroke-width="1.2"/>' +
               '<rect x="-4" y="-7" width="8" height="13" fill="#3d6b8a" opacity="0.7"/>';
        break;
      case 'gate':
        body = '<path d="M-11 9 L-11 -3 L-4 -9 L4 -9 L11 -3 L11 9" fill="none" stroke="#a8b8c8" stroke-width="1.8"/>' +
               '<circle cx="0" cy="1" r="1.6" fill="#f4d58d"/>';
        break;
      case 'corridor':
        body = '<rect x="-14" y="-7" width="28" height="14" rx="1.5" fill="none" stroke="#8fa8bc" stroke-width="1.3"/>' +
               '<line x1="-14" y1="-7" x2="-14" y2="7" stroke="#8fa8bc" stroke-width="1"/>' +
               '<line x1="-5" y1="-7" x2="-5" y2="7" stroke="#8fa8bc" stroke-width="1"/>' +
               '<line x1="5" y1="-7" x2="5" y2="7" stroke="#8fa8bc" stroke-width="1"/>' +
               '<line x1="14" y1="-7" x2="14" y2="7" stroke="#8fa8bc" stroke-width="1"/>';
        break;
      case 'bunk':
        body = '<rect x="-11" y="-10" width="22" height="8" rx="1.5" fill="#6b5a48" stroke="#c9b79c" stroke-width="1.1"/>' +
               '<rect x="-11" y="2" width="22" height="8" rx="1.5" fill="#6b5a48" stroke="#c9b79c" stroke-width="1.1"/>' +
               '<line x1="-11" y1="-1" x2="11" y2="-1" stroke="#8a7862" stroke-width="1"/>';
        break;
      case 'sharedkitchen':
        body = '<rect x="-12" y="-9" width="24" height="18" rx="1.5" fill="#4d3f33" stroke="#c9a87c" stroke-width="1.2"/>' +
               '<circle cx="-5" cy="-2" r="3" fill="none" stroke="#e08a4a" stroke-width="1.5"/>' +
               '<circle cx="5" cy="-2" r="3" fill="none" stroke="#e08a4a" stroke-width="1.5"/>' +
               '<path d="M-9 6 L9 6" stroke="#8a7862" stroke-width="1"/>';
        break;
      case 'neighbour':
        body = '<circle cx="0" cy="-6" r="5" fill="#d9b48a" stroke="#a87c50" stroke-width="1.1"/>' +
               '<path d="M-8 9 Q0 -1 8 9" fill="#5b7d9a" stroke="#a87c50" stroke-width="1.1"/>';
        break;
      case 'raisedfloor':
        body = '<path d="M-13 6 L-13 -2 L-6 -8 L6 -8 L13 -2 L13 6 Z" fill="none" stroke="#9ab0c4" stroke-width="1.5"/>' +
               '<line x1="-6" y1="6" x2="-6" y2="-2" stroke="#9ab0c4" stroke-width="1"/>' +
               '<line x1="6" y1="6" x2="6" y2="-2" stroke="#9ab0c4" stroke-width="1"/>';
        break;
      case 'rooftop':
        body = '<path d="M-13 6 L0 -8 L13 6 Z" fill="none" stroke="#a8b8c8" stroke-width="1.6"/>' +
               '<circle cx="0" cy="-11" r="3.4" fill="#f4d58d" opacity="0.85"/>';
        break;
      case 'dryingrack':
        body = '<line x1="-13" y1="-6" x2="13" y2="-6" stroke="#9ab0c4" stroke-width="1.3"/>' +
               '<rect x="-9" y="-6" width="6" height="10" rx="1" fill="#6b8fa8" opacity="0.75"/>' +
               '<rect x="0" y="-6" width="6" height="8" rx="1" fill="#c98f7a" opacity="0.7"/>' +
               '<rect x="7" y="-6" width="5" height="11" rx="1" fill="#8fa87a" opacity="0.7"/>';
        break;
      case 'fields':
        body = '<path d="M-13 7 L-13 2 L-6 -2 L-6 7 M-2 7 L-2 0 L5 -4 L5 7 M8 7 L8 2" ' +
               'fill="none" stroke="#8fa87a" stroke-width="1.5" stroke-linejoin="round"/>';
        break;
      default:
        body = '<circle cx="0" cy="0" r="8" fill="none" stroke="#c9b79c" stroke-width="1.5"/>';
    }
    g.push('<g transform="translate(' + x + ',' + y + ')">' + body + '</g>');

    // 标签
    if (label) {
      g.push('<text x="' + x + '" y="' + (y + 26) + '" class="scene-label" text-anchor="middle">' +
             esc(label) + '</text>');
    }
    g.push('</g>');
    return g.join('');
  }

  /* ---------- 翻译：找不到就退回英文/中文，绝不显示另一种语言 ---------- */
  function tr(lang, group, key, zh, en) {
    if (lang === 'zh') return zh;
    if (lang === 'en') return en;
    var id = 'scene:' + group + ':' + key;
    var I = (typeof window !== 'undefined' && window.CQI18N) ? window.CQI18N : null;
    if (!I || !I.PACKS) return en;
    var packs = I.PACKS;
    var chain = (I.FALLBACK && I.FALLBACK[lang]) || [lang, 'en'];
    for (var i = 0; i < chain.length; i++) {
      var p = packs[chain[i]];
      if (!p) continue;
      var v = p[id];
      /* 翻译包有两种形状：{title, body} 和扁平字符串。都要认。 */
      if (v === undefined || v === null || v === '') continue;
      if (typeof v === 'object') {
        if (v.body) return v.body;
        if (v.title) return v.title;
      } else {
        return String(v);
      }
    }
    return en;
  }

  /* ---------- 人生痕迹的图标 ---------- */
  /* 这些不是可点的，是「这些年攒下了什么」的物证。 */
  function traceIcon(key, x, y, label) {
    var body = '';
    switch (key) {
      case 'weddingPhoto':
        body = '<rect x="-6" y="-8" width="12" height="12" rx="1.5" fill="#d9cdb8" stroke="#8a7a62" stroke-width="1.1"/>' +
               '<circle cx="-2" cy="-3" r="2" fill="#b8849a"/><path d="M-6 3 Q-2 -1 2 3 L6 3 L6 2 L-6 2 Z" fill="#7d92a8"/>';
        break;
      case 'childToy':
        body = '<circle cx="0" cy="0" r="5" fill="#e0a05a" stroke="#b87a3a" stroke-width="1"/>' +
               '<circle cx="-2" cy="-2" r="1.2" fill="#5a3a20"/><circle cx="2" cy="-2" r="1.2" fill="#5a3a20"/>';
        break;
      case 'schoolBag':
        body = '<path d="M-6 6 L-6 -2 Q0 -8 6 -2 L6 6 Z" fill="#8a6a4a" stroke="#c9a87c" stroke-width="1.1"/>' +
               '<path d="M-4 -4 Q0 -7 4 -4" fill="none" stroke="#c9a87c" stroke-width="1"/>';
        break;
      case 'pole':
        body = '<line x1="-9" y1="5" x2="9" y2="-5" stroke="#a87c50" stroke-width="2.2"/>' +
               '<line x1="-7" y1="-3" x2="7" y2="3" stroke="#c9a87c" stroke-width="1.4"/>';
        break;
      case 'books':
        body = '<rect x="-7" y="-6" width="14" height="3" rx="0.8" fill="#8a6a4a"/>' +
               '<rect x="-6" y="-3" width="13" height="3" rx="0.8" fill="#6a8a9a"/>' +
               '<rect x="-5" y="0" width="12" height="3" rx="0.8" fill="#a8896a"/>';
        break;
      case 'labcoat':
        body = '<path d="M-5 -7 L0 -4 L5 -7 L6 6 L-6 6 Z" fill="#dfe8f0" stroke="#8fa8bc" stroke-width="1"/>' +
               '<line x1="0" y1="-4" x2="0" y2="6" stroke="#8fa8bc" stroke-width="0.9"/>';
        break;
      case 'lorryKeys':
        body = '<circle cx="0" cy="2" r="3.4" fill="none" stroke="#c9a87c" stroke-width="1.6"/>' +
               '<line x1="0" y1="-2" x2="0" y2="-7" stroke="#c9a87c" stroke-width="1.6"/>' +
               '<line x1="0" y1="-7" x2="3" y2="-5" stroke="#c9a87c" stroke-width="1.4"/>';
        break;
      case 'desk':
        body = '<rect x="-10" y="-2" width="20" height="2.6" rx="0.8" fill="#8a6a4a" stroke="#c9a87c" stroke-width="1"/>' +
               '<line x1="-7" y1="0" x2="-7" y2="6" stroke="#6a5238" stroke-width="1.4"/>' +
               '<line x1="7" y1="0" x2="7" y2="6" stroke="#6a5238" stroke-width="1.4"/>';
        break;
      case 'diploma':
        body = '<rect x="-8" y="-5" width="16" height="10" rx="1" fill="#e8dfc8" stroke="#a89878" stroke-width="1"/>' +
               '<line x1="-5" y1="-1" x2="5" y2="-1" stroke="#a89878" stroke-width="0.8"/>' +
               '<line x1="-5" y1="2" x2="3" y2="2" stroke="#a89878" stroke-width="0.8"/>';
        break;
      case 'walker':
        body = '<path d="M-4 6 L-2 -6 L2 -6 L4 6" fill="none" stroke="#b0a08a" stroke-width="1.6"/>' +
               '<line x1="-2" y1="-6" x2="2" y2="-6" stroke="#b0a08a" stroke-width="1.6"/>';
        break;
      case 'photoAlbum':
        body = '<rect x="-8" y="-6" width="16" height="12" rx="1.2" fill="#6a4a3a" stroke="#c9a87c" stroke-width="1.1"/>' +
               '<rect x="-5" y="-4" width="10" height="7" rx="0.6" fill="#d9cdb8"/>';
        break;
      case 'medicine':
        body = '<rect x="-7" y="-5" width="14" height="10" rx="1.2" fill="#e8e0d0" stroke="#b04848" stroke-width="1.1"/>' +
               '<line x1="-3" y1="0" x2="3" y2="0" stroke="#b04848" stroke-width="1.8"/>' +
               '<line x1="0" y1="-3" x2="0" y2="3" stroke="#b04848" stroke-width="1.8"/>';
        break;
      case 'tv':
        body = '<rect x="-9" y="-7" width="18" height="13" rx="1.5" fill="#2a3646" stroke="#8fa8bc" stroke-width="1.2"/>' +
               '<rect x="-7" y="-5" width="14" height="9" fill="#4a7a9a" opacity="0.55"/>';
        break;
      case 'rentNotice':
        body = '<rect x="-7" y="-8" width="14" height="15" rx="1" fill="#e8e2d4" stroke="#b0a898" stroke-width="1"/>' +
               '<line x1="-4" y1="-4" x2="4" y2="-4" stroke="#a89878" stroke-width="0.9"/>' +
               '<line x1="-4" y1="-1" x2="4" y2="-1" stroke="#a89878" stroke-width="0.9"/>' +
               '<line x1="-4" y1="2" x2="1" y2="2" stroke="#a89878" stroke-width="0.9"/>';
        break;
      case 'neighbourGift':
        body = '<path d="M-5 6 L-5 0 L5 0 L5 6 Z" fill="#8a6a4a" stroke="#c9a87c" stroke-width="1"/>' +
               '<circle cx="0" cy="-4" r="5" fill="#5f8a5a" stroke="#8fbf8a" stroke-width="1"/>';
        break;
      case 'emptyChairs':
        body = '<path d="M-8 6 L-8 -2 L-4 -2 L-4 6 M-4 6 L-4 -4 L4 -4 L4 6 M4 6 L4 -2 L8 -2 L8 6" ' +
               'fill="none" stroke="#6a7a8a" stroke-width="1.3"/>';
        break;
      default:
        body = '<circle cx="0" cy="0" r="4" fill="#8a7a62"/>';
    }
    return '<g class="scene-trace" transform="translate(' + x + ',' + y + ')">' + body +
           (label ? '<title>' + esc(label) + '</title>' : '') + '</g>';
  }

  /* ---------- 主渲染 ---------- */
  /* opts: {slots, lang, floor, form, roomName, disabledIds, usedIds} */
  function drawRoom(opts) {
    var lang = opts.lang || 'en';
    var slots = opts.slots || [];
    var out = [];

    out.push('<svg class="sceneroom" viewBox="0 0 ' + W + ' ' + H + '" ' +
             'xmlns="http://www.w3.org/2000/svg" role="img" ' +
             'aria-label="' + esc(opts.roomName || '') + '">');

    out.push('<defs>' +
      '<linearGradient id="rmsky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#0a1420"/><stop offset="60%" stop-color="#16293d"/>' +
      '<stop offset="100%" stop-color="#243b52"/></linearGradient>' +
      '<linearGradient id="rmfloor" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#3a2f24"/><stop offset="100%" stop-color="#241c14"/></linearGradient>' +
      '<radialGradient id="rmlamp" cx="50%" cy="0%" r="70%">' +
      '<stop offset="0%" stop-color="#f4d58d" stop-opacity="0.30"/>' +
      '<stop offset="100%" stop-color="#f4d58d" stop-opacity="0"/></radialGradient>' +
      '</defs>');

    // 背景墙
    out.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#rmsky)"/>');
    // 顶部灯光
    out.push('<ellipse cx="' + (W / 2) + '" cy="10" rx="120" ry="62" fill="url(#rmlamp)"/>');

    // 后墙分隔线（左右两片墙）
    out.push('<path d="M0 ' + (H - 46) + ' L' + W + ' ' + (H - 46) + ' L' + W + ' ' + H + ' L0 ' + H + ' Z" fill="url(#rmfloor)"/>');
    out.push('<line x1="0" y1="' + (H - 46) + '" x2="' + W + '" y2="' + (H - 46) + '" stroke="#5a4636" stroke-width="1.4"/>');

    // 窗外的重庆剪影（远景）
    out.push('<g opacity="0.5" transform="translate(0,26)">');
    var skyline = [[6,44],[22,30],[34,52],[52,26],[64,46],[84,34],[100,50],[124,28],[142,44],[162,32],[186,48],[206,30],[228,44],[250,34],[274,50],[296,28],[318,42],[342,32],[356,46]];
    skyline.forEach(function (b, i) {
      out.push('<rect x="' + b[0] + '" y="' + (140 - b[1]) + '" width="' + (12 + (i % 3) * 3) +
               '" height="' + b[1] + '" fill="#1b2f42"/>');
      // 零星窗灯
      for (var k = 0; k < 2; k++) {
        if ((i + k) % 3 === 0) {
          out.push('<rect x="' + (b[0] + 3 + k * 6) + '" y="' + (146 - b[1] + k * 9) +
                   '" width="2.4" height="2.4" fill="#f4d58d" opacity="0.75"/>');
        }
      }
    });
    out.push('</g>');

    // 房间四壁（示意）
    out.push('<line x1="0" y1="' + (H - 46) + '" x2="0" y2="20" stroke="#2f4a63" stroke-width="2"/>');
    out.push('<line x1="' + W + '" y1="' + (H - 46) + '" x2="' + W + '" y2="20" stroke="#2f4a63" stroke-width="2"/>');

    // 人生痕迹（不可点，只是房间里的物证）
    (opts.traces || []).forEach(function (t) {
      var label = tr(lang, 'trace', t.key, t.zh, t.en);
      out.push(traceIcon(t.key, (t.x / 100) * W, (t.y / 100) * H, label));
    });

    // 物件
    var disabled = opts.disabledIds || {};
    var used = opts.usedIds || {};
    slots.forEach(function (s) {
      var label = tr(lang, 'obj', s.id, s.zh, s.en);
      var cls = 'scene-obj';
      if (disabled[s.id]) cls += ' disabled';
      if (used[s.id]) cls += ' used';
      var g = icon(s.id, (s.x / 100) * W, (s.y / 100) * H, label);
      g = g.replace('class="scene-obj"', 'class="' + cls + '"');
      out.push(g);
    });

    out.push('</svg>');
    return out.join('');
  }

  root.CQSCENEVIEW = {
    tr: tr, drawRoom: drawRoom };
})(typeof window !== 'undefined' ? window : globalThis);
