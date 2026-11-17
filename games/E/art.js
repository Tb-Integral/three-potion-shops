"use strict";

const Art = (() => {
  const svg = (content, box = "0 0 48 48") => `<svg viewBox="${box}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
  const glyphs = {
    brand: '<path d="M18 9h12M20 10v11l-9 14c-2 3 0 5 4 5h18c4 0 6-2 4-5l-9-14V10M16 30c4-4 7 4 12 0 2-1 3-2 5-1M13 9l-4 4 4 4m25-2-3 3 3 3 3-3z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="34" r="1.6" fill="currentColor"/>',
    coin: '<circle cx="24" cy="24" r="20" fill="#a06635" stroke="#41291c" stroke-width="2"/><circle cx="24" cy="22" r="17" fill="#f1c475" stroke="#805025" stroke-width="2"/><circle cx="24" cy="22" r="12" fill="#dba157" stroke="#9c612e" stroke-width="1.5"/><path d="M24 12l3 7 6 3-6 3-3 7-3-7-6-3 6-3z" fill="#ffe4a1"/>',
    market: '<path d="M5 18h38v5a5 5 0 0 1-9 2 6 6 0 0 1-10 0 6 6 0 0 1-10 0 5 5 0 0 1-9-2z" fill="#a47751" stroke="currentColor" stroke-width="1.5"/><path d="m5 18 6-8h26l6 8H5ZM16 18l3-8h10l3 8" fill="#684536" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 28v10h28V28M7 38h34M18 38v-8h12v8" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>',
    brew: '<path d="M11 22c-2 10 3 17 13 17s15-7 13-17z" fill="#8b6d55" stroke="currentColor" stroke-width="2"/><ellipse cx="24" cy="22" rx="15" ry="4" fill="#5f7057" stroke="currentColor" stroke-width="2"/><path d="M13 37l-2 4m24-4 2 4M10 26H6m32 0h4M20 15c-5-4 4-6 0-10m9 10c-5-4 4-6 0-10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    hint: '<path d="M23.5 3 28 19l16 5-16 4.5L23.5 45 19 28.5 3 24l16-5z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    ledger: '<path d="M11 10h18a7 7 0 0 1 7 7v22H16a5 5 0 0 1-5-5V10Zm4 29v-5a3 3 0 0 1 3-3h17M20 17c7 5 8 9 8 9m-9-10c-3 6 2 11 9 10 2-7-3-11-9-10Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  };

  const bottleStyles = {
    vigor: {
      liquid: "#8fa85a", light: "#d9e69b", glass: "#c5dcaa", rim: "#42522f",
      silhouette: "M22 17h20v11l8 12c10 16 5 27-4 29H18c-9-2-14-13-4-29l8-12z",
      fluid: "M15 48c10-6 17 4 27 0 4-2 7-2 9-2 4 10 1 19-6 20H19c-7-1-10-8-4-18z",
      label: '<path d="M25 54c1-7 8-9 13-10 0 9-4 14-11 11l-3 3m4-5 6-4" fill="none" stroke="#415331" stroke-width="1.8" stroke-linecap="round"/>',
    },
    sleep: {
      liquid: "#866294", light: "#dfb9e6", glass: "#d3add9", rim: "#5b3a60",
      silhouette: "M23 17h18v12c0 3 2 5 7 8 8 6 9 13 5 23-3 8-12 10-21 10s-18-2-21-10c-4-10-3-17 5-23 5-3 7-5 7-8z",
      fluid: "M13 48c12 4 16-4 27-3l11 2c2 5 1 8-1 13-3 6-9 7-18 7s-15-1-18-7c-2-4-3-8-1-12z",
      label: '<path d="M34 44a8 8 0 1 0 7 11c-6 3-10-4-7-11z" fill="#693e76"/><path d="M39 43v6m-3-3h6" stroke="#693e76" stroke-width="1.5" stroke-linecap="round"/>',
    },
    light: {
      liquid: "#c67b37", light: "#ffd990", glass: "#edbe79", rim: "#714327",
      silhouette: "M23 17h18v13l11 8 1 23-8 8H19l-8-8 1-23 11-8z",
      fluid: "M14 48c8 3 14-4 22-3 6 1 7 1 14 0l1 15-7 6H20l-6-6z",
      label: '<path d="M32 43l2.7 5.5L40 51l-5.3 2.5L32 59l-2.7-5.5L24 51l5.3-2.5z" fill="#965122"/>',
    },
  };

  function bottle(key) {
    const b = bottleStyles[key];
    return svg(`<ellipse cx="32" cy="70" rx="21" ry="3" fill="#29190e" opacity=".17"/>
      <path d="M23 7h18l-2 14H25z" fill="#b58558" stroke="#583524" stroke-width="2"/>
      <path d="M26 11h12m-10 4h7" opacity=".65" stroke="#eed3a0" stroke-width="1.6" stroke-linecap="round"/>
      <path d="${b.silhouette}" fill="${b.glass}" stroke="${b.rim}" stroke-width="3" stroke-linejoin="round"/>
      <path d="${b.fluid}" fill="${b.liquid}"/>
      <path d="M20 17h24v5H20z" fill="${b.light}" stroke="${b.rim}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M22 36c-5 5-7 11-7 15m28 10 4-4" fill="none" stroke="#fff6d7" opacity=".7" stroke-width="2.7" stroke-linecap="round"/>
      <rect x="22" y="41" width="22" height="21" rx="5" fill="#fbe5b5" stroke="${b.rim}" stroke-width="1.2"/>
      ${b.label}`, "8 2 48 74");
  }

  const ingredients = {
    mint: '<path d="M14 42c4-13 14-21 25-30M25 28c-11 1-16-5-16-15 10 1 16 5 16 15Zm-6 7C11 34 6 30 7 23c8 1 14 7 12 12Zm11-14c-2-9 3-16 14-16 0 8-3 13-14 16Zm-3 7c8-6 15-5 19 2-8 6-16 5-19-2z" fill="#72845c" stroke="#b9ce92" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
    dew: '<path d="M24 5c-6 10-15 19-15 27 0 8 6 13 15 13s15-5 15-13c0-8-9-17-15-27z" fill="#759796" stroke="#cfe5dc" stroke-width="1.7"/><path d="M19 23c-4 5-5 9-2 13m11-6-1 4-4 1 4 1 1 4 1-4 4-1-4-1z" fill="none" stroke="#e1eddf" stroke-width="2" stroke-linecap="round"/>',
    amber: '<path d="m11 20 11-12 12 4 9 16-6 13-23 2-9-11z" fill="#c58449" stroke="#f3bd77" stroke-width="1.7" stroke-linejoin="round"/><path d="m11 20 11 5 12-13M22 25l-4 17m4-17 14 7 7-4M36 32l1 9" fill="none" stroke="#f7c780" stroke-width="1.5" opacity=".9"/><path d="M25 18l3 2m3 13 3 2" stroke="#996037" stroke-width="2" stroke-linecap="round"/>',
    berry: '<path d="M24 22c-7-10 2-14 12-15-1 7-6 11-12 15Zm-3-4c-10 3-14-3-15-8 8-2 14 2 15 8z" fill="#7f9364" stroke="#bad08a" stroke-width="1.6"/><path d="M24 21c-3-5-2-9-1-15" fill="none" stroke="#adbd83" stroke-width="2" stroke-linecap="round"/><g fill="#956c92" stroke="#d5afd2" stroke-width="1.5"><circle cx="15" cy="29" r="8"/><circle cx="32" cy="26" r="8"/><circle cx="26" cy="37" r="8"/></g><path d="m13 26 2-1m14 0 2-2m-8 12 2-2" stroke="#f8d4ed" stroke-width="2" stroke-linecap="round"/>',
  };

  function displayBottle(x, y, size, color, shape) {
    const outlines = [
      "M-5-42H5v11C5-25 16-21 17-10Q19 0 10 0H-10Q-19 0-17-10c1-11 12-15 12-21z",
      "M-7-43H7v13L13-24l2 17Q16 0 10 0H-10q-6 0-5-7l2-17 6-6z",
      "M-8-40H8v9c0 4 6 5 8 8L19-12Q21-2 14 0h-28q-7-2-5-12l3-11c2-3 8-4 8-8z",
    ];
    return `<g transform="translate(${x} ${y}) scale(${size})">
      <ellipse cy="1" rx="19" ry="3" fill="#281912" opacity=".65"/>
      <path d="M-7-47H7l-2 12H-5z" fill="#a8835d" stroke="#674532" stroke-width="1.6"/>
      <path d="${outlines[shape]}" fill="${color}" stroke="#a58863" stroke-width="1.2"/>
      <path d="M-5-24c-4 3-6 8-6 11M-3-38H3" stroke="#eed9a9" stroke-opacity=".46" stroke-width="2" stroke-linecap="round" fill="none"/>
      <rect x="-8" y="-16" width="16" height="9" rx="2" fill="#ddc298" opacity=".74"/>
      <path d="M-4-12h8" stroke="#805b44" opacity=".75" stroke-linecap="round"/>
    </g>`;
  }

  function herbSprig(x, y, scale, rotation, color) {
    return `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${rotation})" fill="${color}" stroke="#b29d6f" stroke-width="1">
      <path d="M0 50 0-26" fill="none" stroke="#b19a6c" stroke-width="2"/>
      <path d="M0 34C-16 33-17 14-17 14-6 18 0 25 0 34zm0-14C14 20 21 3 21 3 7 3 2 13 0 20zM0 6C-13 6-18-9-18-9-6-8-1-2 0 6zm0-15C11-12 12-24 12-24 5-22 1-17 0-9zm0-9c-9-3-10-14-10-14 9 3 13 10 10 14z"/>
    </g>`;
  }

  function shop() {
    const bottles = [
      [71,197,.82,"#80684e",1], [98,198,.62,"#a48a5e",0], [135,197,1.05,"#75675f",2], [175,197,.88,"#786c48",0], [209,197,.72,"#68554d",1],
      [80,309,1,"#6c7860",2], [121,308,.8,"#aa7c4f",0], [155,308,.92,"#8a715a",1], [196,308,1.12,"#8b6557",0],
      [684,321,.87,"#857061",0], [718,321,1.12,"#6f7556",2], [764,321,.84,"#a27354",1],
    ].map(args => displayBottle(...args)).join("");
    const grain = Array.from({length: 47}, (_, index) => {
      const x = 18 + (index * 137) % 800;
      const y = 40 + (index * 73) % 420;
      return `<path d="M${x} ${y}q12 -2 ${11 + index % 31} 0" stroke="#f6cc92" opacity=".16" stroke-linecap="round"/>`;
    }).join("");
    return svg(`
      <defs>
        <linearGradient id="wall" x2="0" y2="1"><stop stop-color="#4a3124"/><stop offset=".5" stop-color="#815a3b"/><stop offset="1" stop-color="#3e281e"/></linearGradient>
        <radialGradient id="vignette" cx=".51" cy=".52" r=".64"><stop offset=".45" stop-color="#2e1c11" stop-opacity="0"/><stop offset="1" stop-color="#1b110e" stop-opacity=".69"/></radialGradient>
        <linearGradient id="sky" x2="0" y2="1"><stop id="sky-base" stop-color="#dab996"/><stop id="sky-light" offset="1" stop-color="#f5e2b1"/></linearGradient>
        <linearGradient id="oak" x2="0" y2="1"><stop stop-color="#a87652"/><stop offset=".2" stop-color="#85573e"/><stop offset=".76" stop-color="#69412b"/><stop offset="1" stop-color="#4a2f23"/></linearGradient>
        <linearGradient id="side-oak"><stop stop-color="#563728"/><stop offset=".45" stop-color="#85583b"/><stop offset="1" stop-color="#4a2e21"/></linearGradient>
        <linearGradient id="shade" x2="0" y2="1"><stop stop-color="#251710"/><stop offset="1" stop-color="#513621"/></linearGradient>
        <linearGradient id="forest" x2="0" y2="1"><stop stop-color="#8b9876"/><stop offset="1" stop-color="#5b7156"/></linearGradient>
        <radialGradient id="lamp-glow"><stop stop-color="#ffd292" stop-opacity=".62"/><stop offset="1" stop-color="#ffb353" stop-opacity="0"/></radialGradient>
        <pattern id="bricks" width="140" height="63" patternUnits="userSpaceOnUse"><path d="M0 1h140M0 33h140M27 1v32m65 0v30" fill="none" stroke="#bd8d61" stroke-opacity=".23"/><path d="M0 4h140M0 36h140M30 4v31m65 1v27" fill="none" stroke="#39241a" stroke-opacity=".3" stroke-width="2"/></pattern>
        <clipPath id="window-clip"><path d="M266 410V220c0-88 70-160 157-160s156 72 156 160v190z"/></clipPath>
      </defs>
      <rect width="840" height="488" fill="url(#wall)"/>
      <rect width="840" height="488" fill="url(#bricks)"/>
      ${grain}
      <path d="M0 71 205 45l439 1L840 70v27L644 62H205L0 102z" fill="#4a2e20" opacity=".6"/>
      <path d="M0 0h840v29H0z" fill="#493022"/>
      <path d="M0 29h840v6H0z" fill="#352218"/>
      <path d="M0 25h840M0 9h840" fill="none" stroke="#b07d55" stroke-opacity=".54" stroke-width="2"/>
      <path d="M248 421V221c0-100 77-179 175-179s175 79 175 179v200z" fill="#352319" stroke="#b38353" stroke-width="3"/>
      <path d="M258 421V222c0-92 74-168 165-168s164 76 164 168v199z" fill="url(#side-oak)" stroke="#231b13" stroke-width="2.5"/>
      <g clip-path="url(#window-clip)">
        <rect x="259" y="53" width="326" height="362" fill="url(#sky)"/>
        <circle cx="461" cy="147" r="43" fill="#fbebca" opacity=".72"/>
        <path d="M263 170c30-9 73-10 107 0-35-1-52 4-76 4zm158 29c66-13 122-28 174-18v7c-60 0-95 11-174 11z" fill="#fbebcc" opacity=".65"/>
        <path d="M254 256c47-27 68-28 101-42 15-6 32-24 68-24 41 0 50 36 82 37 39 2 56-4 96 21v171H254z" fill="#c6bc94"/>
        <path d="M253 282c37-35 86-41 149-27 34 8 60 5 116-15 32-11 62-13 86-8v186H253z" fill="#a8ab85"/>
        <path d="M246 351c58-52 93-62 125-61 38 0 69 27 111 9 52-22 74-52 124-37v157H246z" fill="url(#forest)"/>
        <g fill="#65795f" opacity=".82">
          <path d="M296 240l14 33h-5l17 23h-11l17 25h-22v20h-19v-20h-19l17-25h-11l17-23h-6z"/>
          <path d="m325 264 12 20h-5l13 20h-8l12 19h-20v20h-9v-20h-19l14-19h-9l13-20h-5z"/>
          <path d="m554 203 15 34h-6l16 27h-9l17 27h-28v37h-9v-37h-27l17-27h-8l17-27h-8z"/>
          <path d="m520 268 10 21h-6l14 19h-25v33h-6v-33h-17l13-20h-5l14-20z"/>
        </g>
        <path d="M243 370c53-42 87-35 131-28 53 7 70 51 128 28 41-16 58-34 100-35v81H243z" fill="#667659"/>
        <path d="m262 140 135-91h25L259 190m117 226 190-235 28 20-166 216" fill="#fff2cb" fill-opacity=".17"/>
        <path d="M266 408V221c0-88 71-161 157-161s157 73 157 161v187" fill="none" stroke="#62442b" stroke-opacity=".41" stroke-width="8"/>
      </g>
      <path d="M259 232h329M423 56v358" fill="none" stroke="#4e3423" stroke-width="11"/>
      <path d="M259 229h329M420 57v356" fill="none" stroke="#b68459" stroke-width="2" opacity=".82"/>
      <path d="M244 407h359v16l-9 9H254l-10-9z" fill="url(#oak)" stroke="#493122" stroke-width="2"/>
      <path d="M246 410h353" stroke="#cf9b65" stroke-width="2"/>
      <path d="M10 441h820v48H10z" fill="#5a3929"/>
      <path d="M9 447h821m-824 21h823" stroke="#926446" stroke-opacity=".7" stroke-width="2"/>
      <path d="M25 98h216v243H25z" fill="#40281c" stroke="#35221a" stroke-width="3"/>
      <path d="M37 111h191v204H37z" fill="url(#shade)" stroke="#6b4732" stroke-width="2"/>
      <path d="M37 112h190v197H37z" fill="url(#bricks)" opacity=".38"/>
      <path d="M26 99h214v13H26zM26 199h214v15H26zM26 309h214v17H26z" fill="url(#oak)" stroke="#45291f" stroke-width="2"/>
      <path d="M30 102h206M30 202h206M30 312h206" stroke="#cd9b70" stroke-width="1.5"/>
      <path d="M36 327h15l-7 16H33zm172 0h15l3 16h-11z" fill="#71482d" stroke="#362318" stroke-width="1.5"/>
      <path d="M654 123h137v219H654z" fill="url(#oak)" stroke="#412a1e" stroke-width="3"/>
      <path d="M662 131h121v185H662z" fill="url(#shade)" stroke="#a07454" stroke-width="1.7"/>
      <path d="M643 117h159v13H643zm0 205h159v16H643z" fill="url(#oak)" stroke="#462d22" stroke-width="2"/>
      <path d="M646 120h154m-154 205h152" stroke="#cc986a" stroke-width="1.5"/>
      <path d="M664 142h117" stroke="#926b4e" stroke-width="2"/>
      ${herbSprig(682, 188, .88, 168, "#7e815c")}
      ${herbSprig(720, 192, .93, 192, "#9c795b")}
      ${herbSprig(753, 196, 1, 173, "#8b8660")}
      <path d="M681 143l-1 11m40-13 1 12m33-12-1 15" stroke="#c2a678" stroke-width="2.5"/>
      ${bottles}
      <g transform="translate(147 408)">
        <path d="M-54 21v-18h66v18z" fill="#945945" stroke="#4e3223" stroke-width="2"/>
        <path d="M-52 7h43v10h-43z" fill="#d4bb91"/>
        <path d="M-42 10h25m-28 4h27" stroke="#9f835f"/>
        <path d="M-38 2v-16h65V2z" fill="#697352" stroke="#443723" stroke-width="2"/>
        <path d="M-34-11h41v9h-41z" fill="#d6bc91"/>
        <path d="M-24-8h25m-28 3h27" stroke="#9f835f"/>
        <path d="M-69 20h106v10H-69z" fill="url(#oak)" stroke="#4d3323" stroke-width="2"/>
        <path d="M-63 31h9l-5 20h-10zm89 0h9l6 20H30z" fill="#68442f" stroke="#4d3323" stroke-width="2"/>
      </g>
      <g transform="translate(734 410)">
        <ellipse cx="1" cy="22" rx="57" ry="7" fill="#2a1913" opacity=".52"/>
        <path d="M-32-16c1 14 6 29 18 32h29c12-3 17-18 18-32z" fill="#847566" stroke="#493625" stroke-width="3"/>
        <ellipse cy="-17" rx="33" ry="8" fill="#594b38" stroke="#ad9073" stroke-width="2"/>
        <path d="M3-14-13-57c-3-10 6-12 10-3l12 45" fill="#ae997e" stroke="#574530" stroke-width="2.5"/>
        <path d="M-24-5c2 7 6 12 11 13m28 1 5-4" fill="none" stroke="#d0ab82" stroke-width="1.6" stroke-linecap="round"/>
        <ellipse cy="18" rx="21" ry="4" fill="#796451" stroke="#492f21" stroke-width="1.5"/>
      </g>
      <path d="M6 0h17v488H6zm811 0h17v488h-17z" fill="url(#side-oak)" stroke="#432a21" stroke-width="2"/>
      <path d="M16 2v485m812-485v485" stroke="#a77651" stroke-opacity=".48" stroke-width="2"/>
      <rect width="840" height="488" fill="url(#vignette)"/>
      <ellipse cx="612" cy="119" rx="113" ry="113" fill="url(#lamp-glow)"/>
      <g transform="translate(612 72)">
        <path d="M0-42v38" stroke="#3f2a20" stroke-width="3"/>
        <path d="M-10 7V3a10 10 0 0 1 20 0v4" fill="none" stroke="#513523" stroke-width="3"/>
        <path d="M-19 18-10 7h20l9 11-6 44h-26z" fill="#715039" stroke="#3c281d" stroke-width="2.2"/>
        <path d="M-13 23h26l-4 34H-9z" fill="#eec177" stroke="#7d5431" stroke-width="2"/>
        <path d="M-5 47c-2-5 1-9 5-16 4 7 7 11 5 16-3 3-7 3-10 0z" fill="#fff1bf"/>
        <path d="M0 21v38m-17 4h34" fill="none" stroke="#805637" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M-11 13h22m-19 54H8" fill="none" stroke="#aa7c4f" stroke-width="2.4" stroke-linecap="round"/>
      </g>
      <path d="M0 482h840v8H0z" fill="#4a2a20"/>
      <path d="M0 482h840" stroke="#ae7750" stroke-width="2"/>`, "0 0 840 488");
  }

  const looks = {
    marta: {skin: "#d9a37e", light: "#edc09a", shade: "#925c48", hair: "#654331", dark: "#493124", coat: "#718262", cloth: "#9ca57b", scarf: "#b98461", detail: "herbalist"},
    ilya: {skin: "#b9805b", light: "#ddb08a", shade: "#81533e", hair: "#44382d", dark: "#32291e", coat: "#566a6d", cloth: "#85918b", scarf: "#9e7154", detail: "guard"},
    mira: {skin: "#a56e53", light: "#d69e73", shade: "#754b3d", hair: "#4a352e", dark: "#342823", coat: "#ad7958", cloth: "#d4a378", scarf: "#746b83", detail: "courier"},
    rodion: {skin: "#ca9371", light: "#e7b78f", shade: "#8a5c46", hair: "#8a7e72", dark: "#564b44", coat: "#76617a", cloth: "#a28da0", scarf: "#bba077", detail: "glasses"},
    olya: {skin: "#e3ab84", light: "#f4c49d", shade: "#ac7154", hair: "#91583f", dark: "#623727", coat: "#8a655d", cloth: "#b98c80", scarf: "#82784f", detail: "weaver"},
    nika: {skin: "#996548", light: "#cc9368", shade: "#654437", hair: "#514338", dark: "#392e27", coat: "#76734c", cloth: "#aaa17a", scarf: "#895e60", detail: "keeper"},
  };

  function portrait(key) {
    const p = looks[key];
    const older = p.detail === "guard" || p.detail === "glasses";
    const longHair = ["herbalist", "weaver", "courier"].includes(p.detail);
    const darkHair = longHair
      ? '<path d="M83 66c1-32 29-51 51-49 32 1 51 24 55 57l7 63c4 25-4 42-24 51H83c-16-13-22-40-15-62z" fill="url(#hair-tone)" stroke="#523528" stroke-width="2.5"/>'
      : '<path d="M82 65C82 18 120 17 135 17c27 0 55 20 58 49l-7 64H82z" fill="url(#hair-tone)" stroke="#4a342a" stroke-width="2.5"/>';
    const headwear = {
      herbalist: '<path d="M78 78c-7-38 11-69 46-75 31-5 56 12 67 42 3 9 5 22 3 33l-11-5c-6-18-17-40-37-51-27-5-54 20-58 53z" fill="#77825c" stroke="#4f573c" stroke-width="2.5"/><path d="M82 56c13-36 43-51 70-39 22 9 32 25 39 48" fill="none" stroke="#bdba88" opacity=".64" stroke-width="3"/><path d="M163 24c-5-10-4-16 0-23 6 7 8 13 2 24 7-6 13-6 21-4-4 7-13 10-21 6" fill="#a1a66a" stroke="#4e5537" stroke-width="1.7"/>',
      guard: '<path d="M76 63c1-26 23-42 31-53 17 3 33 3 52-2 8 12 27 22 33 54z" fill="#788a87" stroke="#414d4a" stroke-width="2.7"/><path d="M75 61h120v13H75z" fill="#a6a699" stroke="#4a564e" stroke-width="2"/><path d="M110 14c4 12 11 23 25 36 13-12 20-23 23-36" fill="none" stroke="#c3c2a8" stroke-width="2.3"/>',
      courier: '<path d="M76 66c-2-22 14-51 31-59 24-9 53-8 72 14 10 10 15 25 16 42-23-6-29-23-51-29-24 6-48 14-68 32z" fill="#a66a4f" stroke="#674437" stroke-width="2.5"/><path d="M75 67c21-11 54-25 93-24 15 0 33 8 36 16-20 5-43 7-57 1l-51 15z" fill="#cb986c" stroke="#674437" stroke-width="2.5"/>',
      weaver: '<path d="M78 75c3-21 11-40 27-53 19-17 39-17 58-5 23 14 26 37 27 56l-10-4c-2-17-3-25-14-36-21 6-42 8-61 3-10 9-14 23-18 39z" fill="#c49579" stroke="#915d47" stroke-width="2.4"/><path d="M101 27c18 6 48 4 66-5m-17 9 5-7m-17 8 4-8m-17 7 4-7" fill="none" stroke="#f4d1a8" stroke-width="1.4"/>',
      keeper: '<path d="M77 68C70 49 86 11 111 11c24 2 30 2 53-2 17-1 33 29 30 57-34-17-79-18-117 2z" fill="#8d8f64" stroke="#5d573d" stroke-width="2.6"/><path d="M73 64c43-20 91-19 125-3v11c-41-13-82-13-125 5z" fill="#b4a679" stroke="#645b40" stroke-width="2.2"/>',
    };
    const hairLock = older
      ? `<path d="M85 81c0-37 17-54 44-55-4 9-16 15-24 20l-9 34zm94 2-9-29c-8-5-20-8-26-23 21 2 38 15 41 38z" fill="${p.hair}"/>`
      : `<path d="M86 84c-3-32 11-49 34-57 19-5 34 0 47 14 13 7 17 25 17 42-9-13-16-26-21-36-17 8-30 15-55 12L91 80z" fill="url(#hair-tone)" stroke="${p.dark}" stroke-width="1.5"/>`;
    const faceDetails = p.detail === "glasses"
      ? '<g fill="none" stroke="#73523c" stroke-width="2"><circle cx="109" cy="87" r="15"/><circle cx="155" cy="87" r="15"/><path d="M124 87q7-6 16 0m-45-6-12-4m87 3 12-4"/></g><path d="M122 119q10-7 21 0" fill="none" stroke="#795645" stroke-width="3" stroke-linecap="round"/>'
      : p.detail === "guard"
        ? `<path d="M92 111c7 6 15 10 19 21 7 3 15 7 22 7 7 0 16-3 23-7 8-11 15-14 22-22-2 33-23 54-44 55-20 1-41-21-42-54z" fill="${p.hair}" opacity=".84"/><path d="M120 126q14 8 24-2" fill="none" stroke="${p.dark}" stroke-width="2" stroke-linecap="round"/>`
        : '<path d="M118 122q14 11 27-2" fill="none" stroke="#754638" stroke-width="2.2" stroke-linecap="round"/><path d="M121 124q11 7 20-2" fill="none" stroke="#f6c499" stroke-width="1.1" opacity=".7"/>';
    const accessories = {
      herbalist: '<path d="m88 113-3 12m100-12 3 11" stroke="#d7b876" stroke-width="2"/><circle cx="84" cy="128" r="4" fill="#cbab68"/><circle cx="189" cy="127" r="4" fill="#cbab68"/><path d="M105 212c-5-12 1-23 14-31 1 14-3 25-14 31zm-7 4c-12-4-13-17-12-24 11 8 13 15 12 24z" fill="#b1b388" stroke="#5e6347" stroke-width="1.4"/>',
      guard: '<path d="M69 180 50 194l21 34 21-17-12-29zm126 0 21 14-19 34-21-17 9-29z" fill="#89988e" stroke="#4b5850" stroke-width="2"/><path d="m52 200 23 26m140-26-23 26" stroke="#b2b6a0" stroke-width="2"/>',
      courier: '<path d="m179 175 18 9-86 120H93z" fill="#7c5039" stroke="#573a2e" stroke-width="2.6"/><path d="m173 189 10 6-15 21-10-7z" fill="none" stroke="#dfb67b" stroke-width="3"/>',
      glasses: '<path d="M104 175q-24 76-14 125m71-125q24 70 15 125" fill="none" stroke="#4a3748" stroke-width="7"/><path d="M158 252c14-1 20-12 20-22" fill="none" stroke="#d5b77f" stroke-width="2"/><circle cx="159" cy="251" r="5" fill="#d5b77f"/>',
      weaver: '<path d="M84 185c8 29 13 33 10 57-16-13-25-38-20-61zM179 182c-5 26-4 38 1 56 13-14 16-30 9-56z" fill="#90583e" stroke="#633a29" stroke-width="2"/><path d="M77 224l15-6m82 0 15 6" stroke="#dfac81" stroke-width="3"/>',
      keeper: '<path d="M104 201h59v82h-59z" fill="#908260" stroke="#4e492f" stroke-width="2"/><path d="M107 213h53m-49 50h45" stroke="#c4ad78" stroke-width="1.7"/><path d="M132 234v15m5-12-10 8m10 0-10-8" stroke="#e1c48b" stroke-width="2" stroke-linecap="round"/>',
    };

    return svg(`<defs>
      <linearGradient id="coat-tone" x1="0" x2="1" y1=".1" y2=".8"><stop stop-color="${p.cloth}"/><stop offset=".47" stop-color="${p.coat}"/><stop offset="1" stop-color="#453c31"/></linearGradient>
      <linearGradient id="skin-tone" x1="0" x2="1" y1=".18" y2=".62"><stop stop-color="${p.light}"/><stop offset=".56" stop-color="${p.skin}"/><stop offset="1" stop-color="${p.shade}"/></linearGradient>
      <linearGradient id="hair-tone" x2=".85" y2="1"><stop stop-color="${p.hair}"/><stop offset="1" stop-color="${p.dark}"/></linearGradient>
      <linearGradient id="scarf-tone" x2="1" y2="1"><stop stop-color="${p.scarf}"/><stop offset="1" stop-color="#584638"/></linearGradient>
    </defs>
    <g transform="translate(259 102) scale(1.25)">
    <g class="portrait">
      ${darkHair}
      <path d="M113 124h44l1 39c7 9 12 10 23 15l-15 30h-64l-11-32c11-5 18-7 23-17z" fill="url(#skin-tone)" stroke="${p.shade}" stroke-width="2"/>
      <path d="M34 310c4-36 10-71 19-91 8-19 30-38 58-50l22 12 28-12c29 12 49 31 57 51 8 22 14 56 17 90z" fill="url(#coat-tone)" stroke="#42382d" stroke-width="3"/>
      <path d="M48 299c2-41 17-72 29-90m142 90c-2-30-11-61-27-84M78 240c-4 16-5 38-2 64m116-65c5 17 5 43 2 65" fill="none" stroke="#463b31" stroke-opacity=".65" stroke-width="3" stroke-linecap="round"/>
      <path d="M53 284c3-19 8-38 15-58m145 60c-3-15-6-25-13-41M86 266l-2 29m101-27 2 21" fill="none" stroke="${p.cloth}" stroke-opacity=".59" stroke-width="2" stroke-linecap="round"/>
      <path d="M107 164q24 16 53 1l16 12c-7 14-14 26-37 30l-22 12-3-22c-12-7-17-15-18-23z" fill="url(#scarf-tone)" stroke="#614637" stroke-width="2.3"/>
      <path d="M106 174c24 13 45 10 61 1m-48 17c13 3 25 2 36-2" fill="none" stroke="#edc99b" stroke-opacity=".52" stroke-width="2"/>
      ${accessories[p.detail]}
      <path d="M81 80c-4-8-13-7-14 5-1 12 8 24 18 22m99-27c4-8 13-7 14 5 1 12-8 23-17 22" fill="url(#skin-tone)" stroke="${p.shade}" stroke-width="2.1"/>
      <path d="M76 86q5 0 9 9m103-9q-5 2-8 9" fill="none" stroke="${p.shade}" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M85 73c0-27 17-44 47-46 32-2 49 16 51 43l1 30c-2 19-11 35-25 47-8 7-17 11-26 11s-16-4-24-11c-15-13-24-30-25-49z" fill="url(#skin-tone)" stroke="${p.shade}" stroke-width="2.7"/>
      <path d="M92 102c8 24 22 42 38 47m32-6c12-14 20-37 20-51" fill="none" stroke="${p.light}" opacity=".54" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="101" cy="109" rx="9" ry="4" fill="#bd755d" opacity=".5"/><ellipse cx="165" cy="109" rx="9" ry="4" fill="#bd755d" opacity=".5"/>
      <path d="M97 75q10-7 22-2m27 0q10-5 21 1" fill="none" stroke="${p.hair}" stroke-width="3" stroke-linecap="round"/>
      <path d="M98 87q11-7 22 0m26 0q11-7 22 0" fill="none" stroke="#49322a" stroke-width="1.9" stroke-linecap="round"/>
      <ellipse cx="110" cy="87" rx="3.5" ry="4" fill="#362920"/><ellipse cx="156" cy="87" rx="3.5" ry="4" fill="#362920"/>
      <circle cx="111" cy="86" r="1.15" fill="#fff0cc"/><circle cx="157" cy="86" r="1.15" fill="#fff0cc"/>
      <path d="M133 89c-2 7-6 16-5 19 3 4 8 4 12 1" fill="none" stroke="${p.shade}" stroke-width="1.9" stroke-linecap="round"/>
      ${faceDetails}
      ${hairLock}
      ${headwear[p.detail] ?? ""}
      <path d="M57 306c5-12 14-17 22-18 10-1 19 8 24 18m46 0c3-9 14-16 24-17 9-1 17 5 24 17" fill="url(#skin-tone)" stroke="${p.shade}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="m69 305 6-9m4 9 6-9m77 9 6-10m4 10 6-9" fill="none" stroke="${p.shade}" stroke-width="1.4" stroke-linecap="round"/>
    </g></g>`, "0 0 840 488");
  }

  return { icon: key => svg(glyphs[key]), bottle, ingredient: key => svg(ingredients[key]), shop, portrait };
})();
