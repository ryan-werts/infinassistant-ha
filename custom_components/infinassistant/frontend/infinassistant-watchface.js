/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$1 = globalThis, e$2 = t$1.ShadowRoot && (void 0 === t$1.ShadyCSS || t$1.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, s$2 = Symbol(), o$4 = /* @__PURE__ */ new WeakMap();
let n$3 = class n {
  constructor(t2, e2, o2) {
    if (this._$cssResult$ = true, o2 !== s$2) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t2, this.t = e2;
  }
  get styleSheet() {
    let t2 = this.o;
    const s2 = this.t;
    if (e$2 && void 0 === t2) {
      const e2 = void 0 !== s2 && 1 === s2.length;
      e2 && (t2 = o$4.get(s2)), void 0 === t2 && ((this.o = t2 = new CSSStyleSheet()).replaceSync(this.cssText), e2 && o$4.set(s2, t2));
    }
    return t2;
  }
  toString() {
    return this.cssText;
  }
};
const r$4 = (t2) => new n$3("string" == typeof t2 ? t2 : t2 + "", void 0, s$2), i$3 = (t2, ...e2) => {
  const o2 = 1 === t2.length ? t2[0] : e2.reduce((e3, s2, o3) => e3 + ((t3) => {
    if (true === t3._$cssResult$) return t3.cssText;
    if ("number" == typeof t3) return t3;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t3 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s2) + t2[o3 + 1], t2[0]);
  return new n$3(o2, t2, s$2);
}, S$1 = (s2, o2) => {
  if (e$2) s2.adoptedStyleSheets = o2.map((t2) => t2 instanceof CSSStyleSheet ? t2 : t2.styleSheet);
  else for (const e2 of o2) {
    const o3 = document.createElement("style"), n3 = t$1.litNonce;
    void 0 !== n3 && o3.setAttribute("nonce", n3), o3.textContent = e2.cssText, s2.appendChild(o3);
  }
}, c$2 = e$2 ? (t2) => t2 : (t2) => t2 instanceof CSSStyleSheet ? ((t3) => {
  let e2 = "";
  for (const s2 of t3.cssRules) e2 += s2.cssText;
  return r$4(e2);
})(t2) : t2;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: i$2, defineProperty: e$1, getOwnPropertyDescriptor: h$1, getOwnPropertyNames: r$3, getOwnPropertySymbols: o$3, getPrototypeOf: n$2 } = Object, a$1 = globalThis, c$1 = a$1.trustedTypes, l$1 = c$1 ? c$1.emptyScript : "", p$1 = a$1.reactiveElementPolyfillSupport, d$1 = (t2, s2) => t2, u$1 = { toAttribute(t2, s2) {
  switch (s2) {
    case Boolean:
      t2 = t2 ? l$1 : null;
      break;
    case Object:
    case Array:
      t2 = null == t2 ? t2 : JSON.stringify(t2);
  }
  return t2;
}, fromAttribute(t2, s2) {
  let i2 = t2;
  switch (s2) {
    case Boolean:
      i2 = null !== t2;
      break;
    case Number:
      i2 = null === t2 ? null : Number(t2);
      break;
    case Object:
    case Array:
      try {
        i2 = JSON.parse(t2);
      } catch (t3) {
        i2 = null;
      }
  }
  return i2;
} }, f$1 = (t2, s2) => !i$2(t2, s2), b$1 = { attribute: true, type: String, converter: u$1, reflect: false, useDefault: false, hasChanged: f$1 };
Symbol.metadata ??= Symbol("metadata"), a$1.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let y$1 = class y extends HTMLElement {
  static addInitializer(t2) {
    this._$Ei(), (this.l ??= []).push(t2);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t2, s2 = b$1) {
    if (s2.state && (s2.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t2) && ((s2 = Object.create(s2)).wrapped = true), this.elementProperties.set(t2, s2), !s2.noAccessor) {
      const i2 = Symbol(), h2 = this.getPropertyDescriptor(t2, i2, s2);
      void 0 !== h2 && e$1(this.prototype, t2, h2);
    }
  }
  static getPropertyDescriptor(t2, s2, i2) {
    const { get: e2, set: r2 } = h$1(this.prototype, t2) ?? { get() {
      return this[s2];
    }, set(t3) {
      this[s2] = t3;
    } };
    return { get: e2, set(s3) {
      const h2 = e2?.call(this);
      r2?.call(this, s3), this.requestUpdate(t2, h2, i2);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t2) {
    return this.elementProperties.get(t2) ?? b$1;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d$1("elementProperties"))) return;
    const t2 = n$2(this);
    t2.finalize(), void 0 !== t2.l && (this.l = [...t2.l]), this.elementProperties = new Map(t2.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(d$1("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(d$1("properties"))) {
      const t3 = this.properties, s2 = [...r$3(t3), ...o$3(t3)];
      for (const i2 of s2) this.createProperty(i2, t3[i2]);
    }
    const t2 = this[Symbol.metadata];
    if (null !== t2) {
      const s2 = litPropertyMetadata.get(t2);
      if (void 0 !== s2) for (const [t3, i2] of s2) this.elementProperties.set(t3, i2);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t3, s2] of this.elementProperties) {
      const i2 = this._$Eu(t3, s2);
      void 0 !== i2 && this._$Eh.set(i2, t3);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(s2) {
    const i2 = [];
    if (Array.isArray(s2)) {
      const e2 = new Set(s2.flat(1 / 0).reverse());
      for (const s3 of e2) i2.unshift(c$2(s3));
    } else void 0 !== s2 && i2.push(c$2(s2));
    return i2;
  }
  static _$Eu(t2, s2) {
    const i2 = s2.attribute;
    return false === i2 ? void 0 : "string" == typeof i2 ? i2 : "string" == typeof t2 ? t2.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t2) => this.enableUpdating = t2), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t2) => t2(this));
  }
  addController(t2) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t2), void 0 !== this.renderRoot && this.isConnected && t2.hostConnected?.();
  }
  removeController(t2) {
    this._$EO?.delete(t2);
  }
  _$E_() {
    const t2 = /* @__PURE__ */ new Map(), s2 = this.constructor.elementProperties;
    for (const i2 of s2.keys()) this.hasOwnProperty(i2) && (t2.set(i2, this[i2]), delete this[i2]);
    t2.size > 0 && (this._$Ep = t2);
  }
  createRenderRoot() {
    const t2 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S$1(t2, this.constructor.elementStyles), t2;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t2) => t2.hostConnected?.());
  }
  enableUpdating(t2) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t2) => t2.hostDisconnected?.());
  }
  attributeChangedCallback(t2, s2, i2) {
    this._$AK(t2, i2);
  }
  _$ET(t2, s2) {
    const i2 = this.constructor.elementProperties.get(t2), e2 = this.constructor._$Eu(t2, i2);
    if (void 0 !== e2 && true === i2.reflect) {
      const h2 = (void 0 !== i2.converter?.toAttribute ? i2.converter : u$1).toAttribute(s2, i2.type);
      this._$Em = t2, null == h2 ? this.removeAttribute(e2) : this.setAttribute(e2, h2), this._$Em = null;
    }
  }
  _$AK(t2, s2) {
    const i2 = this.constructor, e2 = i2._$Eh.get(t2);
    if (void 0 !== e2 && this._$Em !== e2) {
      const t3 = i2.getPropertyOptions(e2), h2 = "function" == typeof t3.converter ? { fromAttribute: t3.converter } : void 0 !== t3.converter?.fromAttribute ? t3.converter : u$1;
      this._$Em = e2;
      const r2 = h2.fromAttribute(s2, t3.type);
      this[e2] = r2 ?? this._$Ej?.get(e2) ?? r2, this._$Em = null;
    }
  }
  requestUpdate(t2, s2, i2, e2 = false, h2) {
    if (void 0 !== t2) {
      const r2 = this.constructor;
      if (false === e2 && (h2 = this[t2]), i2 ??= r2.getPropertyOptions(t2), !((i2.hasChanged ?? f$1)(h2, s2) || i2.useDefault && i2.reflect && h2 === this._$Ej?.get(t2) && !this.hasAttribute(r2._$Eu(t2, i2)))) return;
      this.C(t2, s2, i2);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t2, s2, { useDefault: i2, reflect: e2, wrapped: h2 }, r2) {
    i2 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t2) && (this._$Ej.set(t2, r2 ?? s2 ?? this[t2]), true !== h2 || void 0 !== r2) || (this._$AL.has(t2) || (this.hasUpdated || i2 || (s2 = void 0), this._$AL.set(t2, s2)), true === e2 && this._$Em !== t2 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t2));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t3) {
      Promise.reject(t3);
    }
    const t2 = this.scheduleUpdate();
    return null != t2 && await t2, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t4, s3] of this._$Ep) this[t4] = s3;
        this._$Ep = void 0;
      }
      const t3 = this.constructor.elementProperties;
      if (t3.size > 0) for (const [s3, i2] of t3) {
        const { wrapped: t4 } = i2, e2 = this[s3];
        true !== t4 || this._$AL.has(s3) || void 0 === e2 || this.C(s3, void 0, i2, e2);
      }
    }
    let t2 = false;
    const s2 = this._$AL;
    try {
      t2 = this.shouldUpdate(s2), t2 ? (this.willUpdate(s2), this._$EO?.forEach((t3) => t3.hostUpdate?.()), this.update(s2)) : this._$EM();
    } catch (s3) {
      throw t2 = false, this._$EM(), s3;
    }
    t2 && this._$AE(s2);
  }
  willUpdate(t2) {
  }
  _$AE(t2) {
    this._$EO?.forEach((t3) => t3.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t2)), this.updated(t2);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t2) {
    return true;
  }
  update(t2) {
    this._$Eq &&= this._$Eq.forEach((t3) => this._$ET(t3, this[t3])), this._$EM();
  }
  updated(t2) {
  }
  firstUpdated(t2) {
  }
};
y$1.elementStyles = [], y$1.shadowRootOptions = { mode: "open" }, y$1[d$1("elementProperties")] = /* @__PURE__ */ new Map(), y$1[d$1("finalized")] = /* @__PURE__ */ new Map(), p$1?.({ ReactiveElement: y$1 }), (a$1.reactiveElementVersions ??= []).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t = globalThis, i$1 = (t2) => t2, s$1 = t.trustedTypes, e = s$1 ? s$1.createPolicy("lit-html", { createHTML: (t2) => t2 }) : void 0, h = "$lit$", o$2 = `lit$${Math.random().toFixed(9).slice(2)}$`, n$1 = "?" + o$2, r$2 = `<${n$1}>`, l = document, c = () => l.createComment(""), a = (t2) => null === t2 || "object" != typeof t2 && "function" != typeof t2, u = Array.isArray, d = (t2) => u(t2) || "function" == typeof t2?.[Symbol.iterator], f = "[ 	\n\f\r]", v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, _ = /-->/g, m = />/g, p = RegExp(`>|${f}(?:([^\\s"'>=/]+)(${f}*=${f}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), g = /'/g, $ = /"/g, y2 = /^(?:script|style|textarea|title)$/i, x = (t2) => (i2, ...s2) => ({ _$litType$: t2, strings: i2, values: s2 }), b = x(1), w = x(2), E = Symbol.for("lit-noChange"), A = Symbol.for("lit-nothing"), C = /* @__PURE__ */ new WeakMap(), P = l.createTreeWalker(l, 129);
function V(t2, i2) {
  if (!u(t2) || !t2.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e ? e.createHTML(i2) : i2;
}
const N = (t2, i2) => {
  const s2 = t2.length - 1, e2 = [];
  let n3, l2 = 2 === i2 ? "<svg>" : 3 === i2 ? "<math>" : "", c2 = v;
  for (let i3 = 0; i3 < s2; i3++) {
    const s3 = t2[i3];
    let a2, u2, d2 = -1, f2 = 0;
    for (; f2 < s3.length && (c2.lastIndex = f2, u2 = c2.exec(s3), null !== u2); ) f2 = c2.lastIndex, c2 === v ? "!--" === u2[1] ? c2 = _ : void 0 !== u2[1] ? c2 = m : void 0 !== u2[2] ? (y2.test(u2[2]) && (n3 = RegExp("</" + u2[2], "g")), c2 = p) : void 0 !== u2[3] && (c2 = p) : c2 === p ? ">" === u2[0] ? (c2 = n3 ?? v, d2 = -1) : void 0 === u2[1] ? d2 = -2 : (d2 = c2.lastIndex - u2[2].length, a2 = u2[1], c2 = void 0 === u2[3] ? p : '"' === u2[3] ? $ : g) : c2 === $ || c2 === g ? c2 = p : c2 === _ || c2 === m ? c2 = v : (c2 = p, n3 = void 0);
    const x2 = c2 === p && t2[i3 + 1].startsWith("/>") ? " " : "";
    l2 += c2 === v ? s3 + r$2 : d2 >= 0 ? (e2.push(a2), s3.slice(0, d2) + h + s3.slice(d2) + o$2 + x2) : s3 + o$2 + (-2 === d2 ? i3 : x2);
  }
  return [V(t2, l2 + (t2[s2] || "<?>") + (2 === i2 ? "</svg>" : 3 === i2 ? "</math>" : "")), e2];
};
class S {
  constructor({ strings: t2, _$litType$: i2 }, e2) {
    let r2;
    this.parts = [];
    let l2 = 0, a2 = 0;
    const u2 = t2.length - 1, d2 = this.parts, [f2, v2] = N(t2, i2);
    if (this.el = S.createElement(f2, e2), P.currentNode = this.el.content, 2 === i2 || 3 === i2) {
      const t3 = this.el.content.firstChild;
      t3.replaceWith(...t3.childNodes);
    }
    for (; null !== (r2 = P.nextNode()) && d2.length < u2; ) {
      if (1 === r2.nodeType) {
        if (r2.hasAttributes()) for (const t3 of r2.getAttributeNames()) if (t3.endsWith(h)) {
          const i3 = v2[a2++], s2 = r2.getAttribute(t3).split(o$2), e3 = /([.?@])?(.*)/.exec(i3);
          d2.push({ type: 1, index: l2, name: e3[2], strings: s2, ctor: "." === e3[1] ? I : "?" === e3[1] ? L : "@" === e3[1] ? z : H }), r2.removeAttribute(t3);
        } else t3.startsWith(o$2) && (d2.push({ type: 6, index: l2 }), r2.removeAttribute(t3));
        if (y2.test(r2.tagName)) {
          const t3 = r2.textContent.split(o$2), i3 = t3.length - 1;
          if (i3 > 0) {
            r2.textContent = s$1 ? s$1.emptyScript : "";
            for (let s2 = 0; s2 < i3; s2++) r2.append(t3[s2], c()), P.nextNode(), d2.push({ type: 2, index: ++l2 });
            r2.append(t3[i3], c());
          }
        }
      } else if (8 === r2.nodeType) if (r2.data === n$1) d2.push({ type: 2, index: l2 });
      else {
        let t3 = -1;
        for (; -1 !== (t3 = r2.data.indexOf(o$2, t3 + 1)); ) d2.push({ type: 7, index: l2 }), t3 += o$2.length - 1;
      }
      l2++;
    }
  }
  static createElement(t2, i2) {
    const s2 = l.createElement("template");
    return s2.innerHTML = t2, s2;
  }
}
function M(t2, i2, s2 = t2, e2) {
  if (i2 === E) return i2;
  let h2 = void 0 !== e2 ? s2._$Co?.[e2] : s2._$Cl;
  const o2 = a(i2) ? void 0 : i2._$litDirective$;
  return h2?.constructor !== o2 && (h2?._$AO?.(false), void 0 === o2 ? h2 = void 0 : (h2 = new o2(t2), h2._$AT(t2, s2, e2)), void 0 !== e2 ? (s2._$Co ??= [])[e2] = h2 : s2._$Cl = h2), void 0 !== h2 && (i2 = M(t2, h2._$AS(t2, i2.values), h2, e2)), i2;
}
class R {
  constructor(t2, i2) {
    this._$AV = [], this._$AN = void 0, this._$AD = t2, this._$AM = i2;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t2) {
    const { el: { content: i2 }, parts: s2 } = this._$AD, e2 = (t2?.creationScope ?? l).importNode(i2, true);
    P.currentNode = e2;
    let h2 = P.nextNode(), o2 = 0, n3 = 0, r2 = s2[0];
    for (; void 0 !== r2; ) {
      if (o2 === r2.index) {
        let i3;
        2 === r2.type ? i3 = new k(h2, h2.nextSibling, this, t2) : 1 === r2.type ? i3 = new r2.ctor(h2, r2.name, r2.strings, this, t2) : 6 === r2.type && (i3 = new Z(h2, this, t2)), this._$AV.push(i3), r2 = s2[++n3];
      }
      o2 !== r2?.index && (h2 = P.nextNode(), o2++);
    }
    return P.currentNode = l, e2;
  }
  p(t2) {
    let i2 = 0;
    for (const s2 of this._$AV) void 0 !== s2 && (void 0 !== s2.strings ? (s2._$AI(t2, s2, i2), i2 += s2.strings.length - 2) : s2._$AI(t2[i2])), i2++;
  }
}
class k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t2, i2, s2, e2) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t2, this._$AB = i2, this._$AM = s2, this.options = e2, this._$Cv = e2?.isConnected ?? true;
  }
  get parentNode() {
    let t2 = this._$AA.parentNode;
    const i2 = this._$AM;
    return void 0 !== i2 && 11 === t2?.nodeType && (t2 = i2.parentNode), t2;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t2, i2 = this) {
    t2 = M(this, t2, i2), a(t2) ? t2 === A || null == t2 || "" === t2 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t2 !== this._$AH && t2 !== E && this._(t2) : void 0 !== t2._$litType$ ? this.$(t2) : void 0 !== t2.nodeType ? this.T(t2) : d(t2) ? this.k(t2) : this._(t2);
  }
  O(t2) {
    return this._$AA.parentNode.insertBefore(t2, this._$AB);
  }
  T(t2) {
    this._$AH !== t2 && (this._$AR(), this._$AH = this.O(t2));
  }
  _(t2) {
    this._$AH !== A && a(this._$AH) ? this._$AA.nextSibling.data = t2 : this.T(l.createTextNode(t2)), this._$AH = t2;
  }
  $(t2) {
    const { values: i2, _$litType$: s2 } = t2, e2 = "number" == typeof s2 ? this._$AC(t2) : (void 0 === s2.el && (s2.el = S.createElement(V(s2.h, s2.h[0]), this.options)), s2);
    if (this._$AH?._$AD === e2) this._$AH.p(i2);
    else {
      const t3 = new R(e2, this), s3 = t3.u(this.options);
      t3.p(i2), this.T(s3), this._$AH = t3;
    }
  }
  _$AC(t2) {
    let i2 = C.get(t2.strings);
    return void 0 === i2 && C.set(t2.strings, i2 = new S(t2)), i2;
  }
  k(t2) {
    u(this._$AH) || (this._$AH = [], this._$AR());
    const i2 = this._$AH;
    let s2, e2 = 0;
    for (const h2 of t2) e2 === i2.length ? i2.push(s2 = new k(this.O(c()), this.O(c()), this, this.options)) : s2 = i2[e2], s2._$AI(h2), e2++;
    e2 < i2.length && (this._$AR(s2 && s2._$AB.nextSibling, e2), i2.length = e2);
  }
  _$AR(t2 = this._$AA.nextSibling, s2) {
    for (this._$AP?.(false, true, s2); t2 !== this._$AB; ) {
      const s3 = i$1(t2).nextSibling;
      i$1(t2).remove(), t2 = s3;
    }
  }
  setConnected(t2) {
    void 0 === this._$AM && (this._$Cv = t2, this._$AP?.(t2));
  }
}
class H {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t2, i2, s2, e2, h2) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t2, this.name = i2, this._$AM = e2, this.options = h2, s2.length > 2 || "" !== s2[0] || "" !== s2[1] ? (this._$AH = Array(s2.length - 1).fill(new String()), this.strings = s2) : this._$AH = A;
  }
  _$AI(t2, i2 = this, s2, e2) {
    const h2 = this.strings;
    let o2 = false;
    if (void 0 === h2) t2 = M(this, t2, i2, 0), o2 = !a(t2) || t2 !== this._$AH && t2 !== E, o2 && (this._$AH = t2);
    else {
      const e3 = t2;
      let n3, r2;
      for (t2 = h2[0], n3 = 0; n3 < h2.length - 1; n3++) r2 = M(this, e3[s2 + n3], i2, n3), r2 === E && (r2 = this._$AH[n3]), o2 ||= !a(r2) || r2 !== this._$AH[n3], r2 === A ? t2 = A : t2 !== A && (t2 += (r2 ?? "") + h2[n3 + 1]), this._$AH[n3] = r2;
    }
    o2 && !e2 && this.j(t2);
  }
  j(t2) {
    t2 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t2 ?? "");
  }
}
class I extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t2) {
    this.element[this.name] = t2 === A ? void 0 : t2;
  }
}
class L extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t2) {
    this.element.toggleAttribute(this.name, !!t2 && t2 !== A);
  }
}
class z extends H {
  constructor(t2, i2, s2, e2, h2) {
    super(t2, i2, s2, e2, h2), this.type = 5;
  }
  _$AI(t2, i2 = this) {
    if ((t2 = M(this, t2, i2, 0) ?? A) === E) return;
    const s2 = this._$AH, e2 = t2 === A && s2 !== A || t2.capture !== s2.capture || t2.once !== s2.once || t2.passive !== s2.passive, h2 = t2 !== A && (s2 === A || e2);
    e2 && this.element.removeEventListener(this.name, this, s2), h2 && this.element.addEventListener(this.name, this, t2), this._$AH = t2;
  }
  handleEvent(t2) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t2) : this._$AH.handleEvent(t2);
  }
}
class Z {
  constructor(t2, i2, s2) {
    this.element = t2, this.type = 6, this._$AN = void 0, this._$AM = i2, this.options = s2;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t2) {
    M(this, t2);
  }
}
const B = t.litHtmlPolyfillSupport;
B?.(S, k), (t.litHtmlVersions ??= []).push("3.3.2");
const D = (t2, i2, s2) => {
  const e2 = s2?.renderBefore ?? i2;
  let h2 = e2._$litPart$;
  if (void 0 === h2) {
    const t3 = s2?.renderBefore ?? null;
    e2._$litPart$ = h2 = new k(i2.insertBefore(c(), t3), t3, void 0, s2 ?? {});
  }
  return h2._$AI(t2), h2;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const s = globalThis;
class i extends y$1 {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t2 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t2.firstChild, t2;
  }
  update(t2) {
    const r2 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t2), this._$Do = D(r2, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
}
i._$litElement$ = true, i["finalized"] = true, s.litElementHydrateSupport?.({ LitElement: i });
const o$1 = s.litElementPolyfillSupport;
o$1?.({ LitElement: i });
(s.litElementVersions ??= []).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const o = { attribute: true, type: String, converter: u$1, reflect: false, hasChanged: f$1 }, r$1 = (t2 = o, e2, r2) => {
  const { kind: n3, metadata: i2 } = r2;
  let s2 = globalThis.litPropertyMetadata.get(i2);
  if (void 0 === s2 && globalThis.litPropertyMetadata.set(i2, s2 = /* @__PURE__ */ new Map()), "setter" === n3 && ((t2 = Object.create(t2)).wrapped = true), s2.set(r2.name, t2), "accessor" === n3) {
    const { name: o2 } = r2;
    return { set(r3) {
      const n4 = e2.get.call(this);
      e2.set.call(this, r3), this.requestUpdate(o2, n4, t2, true, r3);
    }, init(e3) {
      return void 0 !== e3 && this.C(o2, void 0, t2, e3), e3;
    } };
  }
  if ("setter" === n3) {
    const { name: o2 } = r2;
    return function(r3) {
      const n4 = this[o2];
      e2.call(this, r3), this.requestUpdate(o2, n4, t2, true, r3);
    };
  }
  throw Error("Unsupported decorator location: " + n3);
};
function n2(t2) {
  return (e2, o2) => "object" == typeof o2 ? r$1(t2, e2, o2) : ((t3, e3, o3) => {
    const r2 = e3.hasOwnProperty(o3);
    return e3.constructor.createProperty(o3, t3), r2 ? Object.getOwnPropertyDescriptor(e3, o3) : void 0;
  })(t2, e2, o2);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function r(r2) {
  return n2({ ...r2, state: true, attribute: false });
}
const MAX_TILES = 8;
const MAX_ACTIONS = 3;
const MAX_EVENTS$1 = 3;
const MAX_PRESENCE_ICONS = 8;
const MAX_SCREENS = 6;
const MAX_SCREENS_LEGACY_FIRMWARE = 4;
const DASHBOARD_MAX_STATUS_GROUPS = 5;
const DASHBOARD_MIN_GLYPHS_PER_GROUP = 1;
const DASHBOARD_MAX_GLYPHS_PER_GROUP = 10;
const DASHBOARD_MAX_SENSOR_GROUPS = 3;
const DASHBOARD_MAX_SENSORS_PER_GROUP = 7;
const DASHBOARD_STATUS_GROUP_TYPES = ["doors", "garage", "motion", "lights", "media"];
const DASHBOARD_SENSOR_GROUP_TYPES = ["thermostats", "freezers", "beacons"];
const DASHBOARD_GLYPH_DOMAINS = ["binary_sensor", "cover", "light", "switch", "lock", "media_player"];
const DASHBOARD_SENSOR_DOMAINS = ["sensor", "climate", "device_tracker", "person"];
const DEFAULT_DIMMER_STEP = 10;
const THEME_BACKGROUNDS = {
  charcoal: "#1E1E1E",
  black: "#000000"
};
const DEFAULT_ACCENT = "#18A1FF";
const DEFAULT_ACTIVE_COLOR = "#FFD700";
const DEFAULT_INACTIVE_COLOR = "#800080";
const DEFAULT_LONG_AWAY_THRESHOLD = "24:00:00";
const DEFAULT_SOON_WINDOW = "01:00:00";
const DEFAULT_MIN_UPDATE_INTERVAL_MS = 1e3;
const DEFAULT_FULL_REFRESH_MINUTES = 15;
const TILE_TYPE_DOMAINS = {
  count: ["sensor", "counter", "input_number"],
  duration: ["sensor", "timer"],
  state_text: ["sensor", "input_text", "binary_sensor"],
  cover_state: ["cover"],
  media_count: ["sensor"],
  sensor_value: ["sensor", "input_number"]
};
const DEFAULT_CONFIG = {
  type: "custom:infinassistant-watchface",
  version: 1,
  name: "InfinAssistant",
  theme: {
    preset: "charcoal",
    accent: DEFAULT_ACCENT
  },
  header: {
    time: {
      format: "HH:mm",
      align: "left"
    },
    presence: {
      enabled: true,
      home_zone: "zone.home",
      long_away_threshold: DEFAULT_LONG_AWAY_THRESHOLD,
      icons: []
    }
  },
  events: {
    enabled: false,
    calendars: [],
    max_events: 2,
    soon_window: DEFAULT_SOON_WINDOW,
    show_if_empty: false,
    all_day: "show_all_day"
  },
  tiles: [],
  actions: [],
  screens: [],
  status_bar: {
    enabled: true,
    battery: true,
    bluetooth: true,
    steps: true,
    heart_rate: true,
    notifications: true,
    sources: {
      steps_entity: null,
      hr_entity: null,
      notifications_entity: null
    }
  },
  advanced: {
    compression: true,
    min_update_interval_ms: DEFAULT_MIN_UPDATE_INTERVAL_MS,
    full_refresh_minutes: DEFAULT_FULL_REFRESH_MINUTES,
    debug: {
      show_bounds: false,
      show_truncation: false
    }
  },
  logbook_app: {
    entities: [],
    hours_back: 12,
    max_entries: 10
  },
  home_control: {
    devices: []
  }
};
const DEFAULT_TILE_CONFIG = {
  enabled: false,
  label: "",
  icon: "home",
  displayMode: "text",
  type: "sensor_value",
  entity: "",
  color: "auto",
  rules: [],
  tap: "none",
  format: {
    prefix: "",
    suffix: "",
    unit: "",
    uppercase: true
  }
};
const DEFAULT_ACTION_CONFIG = {
  enabled: false,
  label: "",
  icon: "home",
  entity: "",
  action: "toggle",
  state_color: true,
  dimmer: {
    step_percent: DEFAULT_DIMMER_STEP,
    swipe: true,
    longpress_overlay: false,
    on_brightness_default: "last",
    fixed_percent: 50
  }
};
const EDITOR_TABS = [
  { id: "settings", label: "Settings" },
  { id: "screens", label: "Screens" },
  { id: "calendar", label: "Calendar" },
  { id: "logbook", label: "Logbook" },
  { id: "home_control", label: "Home Control" }
];
const CARD_TAG = "infinassistant-watchface";
const EDITOR_TAG = "infinassistant-watchface-editor";
const CARD_BUNDLE = "infinassistant-watchface.js";
const GLYPH_PATHS = {
  // Presence icons
  truck: "M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5m1.5-9H17V12h4.46L19.5 9.5M6 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5M20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.11.89-2 2-2h14v4h3M3 6v9h.76c.55-.61 1.35-1 2.24-1s1.69.39 2.24 1H15V6H3z",
  car: "M5 11l1.5-4.5h11L19 11m-1.5 5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5m-11 0c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5M18.92 6c-.2-.58-.76-1-1.42-1h-11c-.66 0-1.22.42-1.42 1L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-6z",
  person_male: "M12 4a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z",
  person_female: "M12 4a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z",
  // Entity icons
  door: "M8 3h8a2 2 0 012 2v16h-2V5h-6v14H8V5a2 2 0 00-2 2v12H4V7a4 4 0 014-4m8 8a1 1 0 110 2 1 1 0 010-2z",
  garage: "M19 20H5V11l7-7 7 7v9m-2-2v-5.17l-5-5-5 5V18h10m-5-4h2v4h-2v-4z",
  music: "M21 3v12.5a3.5 3.5 0 01-3.5 3.5 3.5 3.5 0 01-3.5-3.5 3.5 3.5 0 013.5-3.5c.54 0 1.05.12 1.5.34V6.47L9 8.6v8.9A3.5 3.5 0 015.5 21 3.5 3.5 0 012 17.5 3.5 3.5 0 015.5 14c.54 0 1.05.12 1.5.34V6l14-3z",
  light: "M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1H9a1 1 0 01-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7m2.85 11.1l.15.2V16h-6v-2.7l.15-.2A5.01 5.01 0 0012 4a5 5 0 00-2.85 9.1M9 18h6v1a1 1 0 01-1 1h-4a1 1 0 01-1-1v-1z",
  tv: "M21 17H3V5h18m0-2H3a2 2 0 00-2 2v12a2 2 0 002 2h5v2h8v-2h5a2 2 0 002-2V5a2 2 0 00-2-2z",
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z",
  fan: "M12 11a1 1 0 110 2 1 1 0 010-2zm0-9c1.66 0 3 1.34 3 3v1.28c1.53.83 3 2.54 3 4.72h-3a3 3 0 00-3-3 3 3 0 00-3 3H6c0-2.18 1.47-3.89 3-4.72V5c0-1.66 1.34-3 3-3zm0 20c-1.66 0-3-1.34-3-3v-1.28C7.47 16.89 6 15.18 6 13h3a3 3 0 003 3 3 3 0 003-3h3c0 2.18-1.47 3.89-3 4.72V19c0 1.66-1.34 3-3 3z",
  fire: "M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z",
  // Status bar icons
  battery: "M16 20H8V6h8m0-2V2H8v2H6v18h12V4h-2m-2 8H10v6h4v-6z",
  bluetooth: "M14.88 16.29L13 18.17v-6.35l1.88 1.88a.996.996 0 101.41-1.41L13.41 9.4l2.88-2.89a.996.996 0 10-1.41-1.41L11 8.98V2.63l1.88 1.88a.996.996 0 101.41-1.41L11.41.22c-.78-.78-2.05-.78-2.83 0L5.7 3.1a.996.996 0 101.41 1.41L9 2.63v6.35L6.12 6.1a.996.996 0 10-1.41 1.41l2.88 2.89-2.88 2.89a.996.996 0 101.41 1.41L9 11.82v6.35l-1.88-1.88a.996.996 0 10-1.41 1.41l2.88 2.88c.78.78 2.05.78 2.83 0l2.88-2.88a.996.996 0 10-1.41-1.41z",
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  steps: "M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2M9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7",
  bell: "M21 19v1H3v-1l2-2v-6c0-3.1 2.03-5.83 5-6.71V4a2 2 0 012-2 2 2 0 012 2v.29c2.97.88 5 3.61 5 6.71v6l2 2m-7 2a2 2 0 01-2 2 2 2 0 01-2-2"
};
const GLYPH_INFO = {
  truck: { name: "Truck", category: "presence", viewBox: "0 0 24 24" },
  car: { name: "Car", category: "presence", viewBox: "0 0 24 24" },
  person_male: { name: "Person (Male)", category: "presence", viewBox: "0 0 24 24" },
  person_female: { name: "Person (Female)", category: "presence", viewBox: "0 0 24 24" },
  door: { name: "Door", category: "entity", viewBox: "0 0 24 24" },
  garage: { name: "Garage", category: "entity", viewBox: "0 0 24 24" },
  music: { name: "Music", category: "entity", viewBox: "0 0 24 24" },
  light: { name: "Light", category: "entity", viewBox: "0 0 24 24" },
  tv: { name: "TV", category: "entity", viewBox: "0 0 24 24" },
  home: { name: "Home", category: "entity", viewBox: "0 0 24 24" },
  fan: { name: "Fan", category: "entity", viewBox: "0 0 24 24" },
  fire: { name: "Fire", category: "entity", viewBox: "0 0 24 24" },
  battery: { name: "Battery", category: "status", viewBox: "0 0 24 24" },
  bluetooth: { name: "Bluetooth", category: "status", viewBox: "0 0 24 24" },
  heart: { name: "Heart Rate", category: "status", viewBox: "0 0 24 24" },
  steps: { name: "Steps", category: "status", viewBox: "0 0 24 24" },
  bell: { name: "Notifications", category: "status", viewBox: "0 0 24 24" }
};
const PRESENCE_GLYPH_IDS = [
  "truck",
  "car",
  "person_male",
  "person_female"
];
const ENTITY_GLYPH_IDS = [
  "door",
  "garage",
  "music",
  "light",
  "tv",
  "home",
  "fan",
  "fire"
];
function isValidGlyph(id) {
  return id in GLYPH_PATHS;
}
function isValidPresenceGlyph(id) {
  return PRESENCE_GLYPH_IDS.includes(id);
}
function getGlyphPath(id) {
  return GLYPH_PATHS[id] || GLYPH_PATHS.home;
}
function getGlyphName(id) {
  return GLYPH_INFO[id]?.name || id;
}
function getPresenceGlyphOptions() {
  return PRESENCE_GLYPH_IDS.map((id) => ({
    value: id,
    label: getGlyphName(id)
  }));
}
function getEntityGlyphOptions() {
  return ENTITY_GLYPH_IDS.map((id) => ({
    value: id,
    label: getGlyphName(id)
  }));
}
const LAYOUT_VERSION = 2;
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength);
}
function exportedGlyphSymbol(symbol) {
  return symbol && symbol.length === 1 ? symbol : "?";
}
function glyphSymbolProblem(symbol) {
  if (!symbol) return "an empty symbol shows as ? on the watch";
  if (symbol !== exportedGlyphSymbol(symbol)) return `'${symbol}' shows as ? on the watch`;
  const code = symbol.charCodeAt(0);
  if (code < 1 || code > 127 || symbol.trim() === "" || symbol === "#") return `the watch can't draw '${symbol}'`;
  return null;
}
function buildPresenceConfig(config) {
  const dashboardPresence = (config.screens || []).find((s2) => s2.screenType === "dashboard" && s2.dashboard?.presence)?.dashboard?.presence;
  const src = dashboardPresence ?? config.header?.presence;
  if (!src?.enabled) {
    return {
      enabled: false,
      homeZone: "",
      longAwayThreshold: "24:00:00",
      icons: []
    };
  }
  const icons = (src.icons || []).map((iconConfig) => ({
    type: iconConfig.icon,
    entity: iconConfig.entity,
    hideIfUnknown: iconConfig.hide_if_unknown
  }));
  return {
    enabled: true,
    homeZone: src.home_zone,
    longAwayThreshold: src.long_away_threshold,
    icons
  };
}
function buildEventsConfig(config) {
  return {
    enabled: config.events.enabled,
    calendars: config.events.calendars,
    maxEvents: config.events.max_events,
    soonWindow: config.events.soon_window,
    showIfEmpty: config.events.show_if_empty,
    allDay: config.events.all_day
  };
}
function buildTiles(tiles) {
  return tiles.filter((tileConfig) => tileConfig.enabled && (tileConfig.entity || tileConfig.device_id)).map((tileConfig) => {
    const tile = {
      label: truncate(tileConfig.label.toUpperCase(), 8),
      icon: tileConfig.icon,
      displayMode: tileConfig.displayMode === "icon" ? 1 : 0,
      device_id: tileConfig.device_id,
      entity: tileConfig.entity,
      type: tileConfig.type,
      colorMode: tileConfig.color,
      rules: tileConfig.rules.map((rule) => ({
        condition: rule.condition,
        color: rule.color
      })),
      tap: tileConfig.tap,
      format: {
        prefix: tileConfig.format.prefix,
        suffix: tileConfig.format.suffix,
        unit: tileConfig.format.unit,
        uppercase: tileConfig.format.uppercase
      }
    };
    return tile;
  });
}
function buildActions(actions) {
  return actions.filter((actionConfig) => actionConfig.enabled).map((actionConfig) => {
    const action = {
      label: truncate(actionConfig.label.toUpperCase(), 10),
      icon: actionConfig.icon,
      entity: actionConfig.entity,
      actionType: actionConfig.action,
      stateColor: actionConfig.state_color,
      dimmer: actionConfig.action === "light.dimmer" ? actionConfig.dimmer : void 0
    };
    if (actionConfig.action === "service_call") {
      action.domain = actionConfig.domain;
      action.service = actionConfig.service;
    }
    if (actionConfig.action === "device_action") {
      action.deviceId = actionConfig.device_id;
      action.deviceAction = actionConfig.device_action;
    }
    return action;
  });
}
function buildStatusBar(config) {
  if (!config.status_bar.enabled) {
    return { enabled: false };
  }
  return {
    enabled: true,
    battery: config.status_bar.battery ? {
      enabled: true,
      entity: null
      // Watch source
    } : void 0,
    bluetooth: config.status_bar.bluetooth ? {
      enabled: true,
      entity: null
      // Watch source
    } : void 0,
    steps: config.status_bar.steps ? {
      enabled: true,
      entity: config.status_bar.sources.steps_entity
    } : void 0,
    heartRate: config.status_bar.heart_rate ? {
      enabled: true,
      entity: config.status_bar.sources.hr_entity
    } : void 0,
    notifications: config.status_bar.notifications ? {
      enabled: true,
      entity: config.status_bar.sources.notifications_entity
    } : void 0
  };
}
function buildDashboard(dashboardConfig) {
  let truncated = false;
  const rawStatusGroups = dashboardConfig.statusGroups || [];
  if (rawStatusGroups.length > DASHBOARD_MAX_STATUS_GROUPS) {
    truncated = true;
  }
  const clampedStatusGroups = rawStatusGroups.slice(0, DASHBOARD_MAX_STATUS_GROUPS);
  const statusGroups = clampedStatusGroups.map((group) => {
    const rawGlyphs = group.glyphs || [];
    if (rawGlyphs.length > DASHBOARD_MAX_GLYPHS_PER_GROUP) {
      truncated = true;
    }
    const clampedGlyphs = rawGlyphs.slice(0, DASHBOARD_MAX_GLYPHS_PER_GROUP);
    return {
      type: group.type,
      glyphs: clampedGlyphs.map((glyph) => ({
        symbol: exportedGlyphSymbol(glyph.symbol),
        entity: glyph.entity
      }))
    };
  });
  const rawSensorGroups = dashboardConfig.sensorGroups || [];
  if (rawSensorGroups.length > DASHBOARD_MAX_SENSOR_GROUPS) {
    truncated = true;
  }
  const clampedSensorGroups = rawSensorGroups.slice(0, DASHBOARD_MAX_SENSOR_GROUPS);
  const sensorGroups = clampedSensorGroups.map((group) => {
    const rawSensors = group.sensors || [];
    if (rawSensors.length > DASHBOARD_MAX_SENSORS_PER_GROUP) {
      truncated = true;
    }
    const clampedSensors = rawSensors.slice(0, DASHBOARD_MAX_SENSORS_PER_GROUP);
    return {
      type: group.type,
      sensors: clampedSensors.map((sensor) => ({
        entity: sensor.entity,
        displayType: sensor.displayType,
        symbol: sensor.symbol
      }))
    };
  });
  if (truncated) {
    console.warn("Configuration exceeds firmware limits — some items were truncated for the watch");
  }
  const configurableValue = dashboardConfig.configurableValue?.entity ? {
    label: truncate(dashboardConfig.configurableValue.label || "", 11),
    entity: dashboardConfig.configurableValue.entity,
    truncateTo: dashboardConfig.configurableValue.truncateTo ?? 19
  } : void 0;
  const rawInlineMetrics = dashboardConfig.inlineMetrics || [];
  const builtInlineMetrics = [];
  for (let i2 = 0; i2 < 2; i2++) {
    const slot = rawInlineMetrics[i2];
    if (slot?.entity) {
      builtInlineMetrics.push({
        label: truncate(slot.label || "", 2),
        entity: slot.entity,
        round: slot.round
      });
    } else {
      builtInlineMetrics.push(null);
    }
  }
  return {
    statusGroups,
    sensorGroups,
    weather: dashboardConfig.weather?.entity ? {
      entity: dashboardConfig.weather.entity
    } : void 0,
    // A list only: YAML can make events anything, and the validator reports what is not a list.
    events: Array.isArray(dashboardConfig.events) ? dashboardConfig.events.map((eventConfig) => ({
      calendar: eventConfig?.calendar
    })) : void 0,
    notifications: dashboardConfig.notifications?.map((notifConfig) => ({
      source: notifConfig.source || "HA"
    })),
    configurableValue,
    inlineMetrics: builtInlineMetrics.some((m2) => m2 !== null) ? builtInlineMetrics : void 0
  };
}
function buildScreens(config) {
  if (!config.screens || config.screens.length === 0) {
    return [];
  }
  return config.screens.map((screenConfig) => {
    const screenType = screenConfig.screenType === "dashboard" ? 0 : 1;
    const screen = {
      screenType,
      name: screenConfig.name
    };
    if (screenType === 0 && screenConfig.dashboard) {
      screen.dashboard = buildDashboard(screenConfig.dashboard);
      screen.tiles = [];
    } else {
      screen.tileLayout = screenConfig.tileLayout ?? 4;
      screen.tiles = buildTiles(screenConfig.tiles || []);
      screen.dashboard = void 0;
    }
    return screen;
  });
}
function exportWatchLayout(config) {
  const accent = config.theme.accent || DEFAULT_ACCENT;
  const screens = buildScreens(config);
  const hasScreens = screens.length > 0;
  return {
    version: LAYOUT_VERSION,
    theme: {
      background: THEME_BACKGROUNDS[config.theme.preset],
      accent
    },
    header: {
      time: {
        format: config.header.time.format,
        align: config.header.time.align
      },
      presence: buildPresenceConfig(config)
    },
    statusBar: buildStatusBar(config),
    events: buildEventsConfig(config),
    screens,
    // Global tile colors for entity-state dynamic coloring
    defaultActiveColor: config.theme.activeColor || DEFAULT_ACTIVE_COLOR,
    defaultInactiveColor: config.theme.inactiveColor || DEFAULT_INACTIVE_COLOR,
    // Logbook app config
    ...config.logbook_app ? {
      logbookApp: {
        entityIds: config.logbook_app.entities.filter((e2) => e2.trim() !== ""),
        maxEntries: config.logbook_app.max_entries,
        hoursBack: config.logbook_app.hours_back
      }
    } : {},
    // Home control config
    ...config.home_control ? {
      homeControl: {
        devices: config.home_control.devices.filter((d2) => d2.entity_id.trim() !== "").map((d2) => ({
          entityId: d2.entity_id,
          name: d2.name || void 0,
          domain: d2.domain || void 0
        }))
      }
    } : {},
    // DEPRECATED v1 fields: only included when no screens are defined (backward compat)
    ...hasScreens ? {} : {
      tiles: buildTiles(config.tiles),
      actions: buildActions(config.actions)
    }
  };
}
function estimatePayloadSize(layout) {
  const json = JSON.stringify(layout);
  return new TextEncoder().encode(json).length;
}
function toCanonicalJSON(layout) {
  return JSON.stringify(layout, Object.keys(layout).sort(), 2);
}
async function copyLayoutToClipboard(layout) {
  try {
    const json = toCanonicalJSON(layout);
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
}
function createMessage(severity, message, tab, field) {
  return { severity, message, tab, field };
}
function isValidEntityFormat(entityId) {
  return /^[a-z0-9_-]+\.[a-z0-9_-]+$/.test(entityId);
}
function getDomain(entityId) {
  return entityId.split(".")[0];
}
function entityExists(hass, entityId) {
  return !!hass?.states[entityId];
}
function isDomainCompatible(entityId, allowedDomains) {
  const domain = getDomain(entityId);
  return allowedDomains.includes(domain);
}
function validateSettings(config, hass, messages) {
  if (!["charcoal", "black"].includes(config.theme.preset)) {
    messages.push(createMessage("error", "Invalid theme preset.", "settings", "theme.preset"));
  }
  if (config.theme.accent) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(config.theme.accent)) {
      messages.push(createMessage("error", "Invalid accent color format. Use #RRGGBB.", "settings", "theme.accent"));
    }
  }
  if (config.version !== 1 && config.version !== 2) {
    messages.push(createMessage("error", "Unsupported config version. Use 1 or 2.", "settings", "version"));
  }
  if (!["HH:mm", "hh:mm"].includes(config.header.time.format)) {
    messages.push(createMessage("error", "Invalid time format. Must be HH:mm or hh:mm.", "settings", "time.format"));
  }
  if (!["left", "center", "right"].includes(config.header.time.align)) {
    messages.push(createMessage("error", "Invalid time alignment.", "settings", "time.align"));
  }
  if (config.header.presence.enabled) {
    if (!config.header.presence.home_zone) {
      messages.push(createMessage("error", "Home zone entity is required.", "settings", "presence.home_zone"));
    } else if (!isValidEntityFormat(config.header.presence.home_zone)) {
      messages.push(createMessage("error", "Invalid home zone entity format.", "settings", "presence.home_zone"));
    } else if (hass && !entityExists(hass, config.header.presence.home_zone)) {
      messages.push(createMessage("warning", `Home zone entity "${config.header.presence.home_zone}" not found.`, "settings", "presence.home_zone"));
    }
    if (!/^\d+:\d{2}:\d{2}$/.test(config.header.presence.long_away_threshold)) {
      messages.push(createMessage("error", "Invalid long-away threshold format. Use HH:mm:ss.", "settings", "presence.long_away_threshold"));
    }
    if (config.header.presence.icons.length > MAX_PRESENCE_ICONS) {
      messages.push(createMessage("error", `Maximum ${MAX_PRESENCE_ICONS} presence icons allowed.`, "settings", "presence.icons"));
    }
    config.header.presence.icons.forEach((icon, index) => {
      if (!isValidPresenceGlyph(icon.icon)) {
        messages.push(createMessage("error", `Invalid presence icon type at position ${index + 1}.`, "settings", `presence.icons[${index}].icon`));
      }
      if (!icon.entity) {
        messages.push(createMessage("error", `Entity required for presence icon ${index + 1}.`, "settings", `presence.icons[${index}].entity`));
      } else if (!isValidEntityFormat(icon.entity)) {
        messages.push(createMessage("error", `Invalid entity format for presence icon ${index + 1}.`, "settings", `presence.icons[${index}].entity`));
      } else {
        const domain = getDomain(icon.entity);
        if (!["person", "device_tracker"].includes(domain)) {
          messages.push(createMessage("warning", `Presence icon ${index + 1} entity should be person.* or device_tracker.*.`, "settings", `presence.icons[${index}].entity`));
        }
        if (hass && !entityExists(hass, icon.entity)) {
          messages.push(createMessage("warning", `Presence icon entity "${icon.entity}" not found.`, "settings", `presence.icons[${index}].entity`));
        }
      }
    });
  }
  const { status_bar } = config;
  if (status_bar.enabled && status_bar.sources) {
    const sources = status_bar.sources;
    if (sources.steps_entity) {
      if (!isValidEntityFormat(sources.steps_entity)) {
        messages.push(createMessage("error", "Invalid steps entity format.", "settings", "sources.steps_entity"));
      } else if (hass && !entityExists(hass, sources.steps_entity)) {
        messages.push(createMessage("warning", `Steps entity "${sources.steps_entity}" not found.`, "settings", "sources.steps_entity"));
      }
    }
    if (sources.hr_entity) {
      if (!isValidEntityFormat(sources.hr_entity)) {
        messages.push(createMessage("error", "Invalid heart rate entity format.", "settings", "sources.hr_entity"));
      } else if (hass && !entityExists(hass, sources.hr_entity)) {
        messages.push(createMessage("warning", `Heart rate entity "${sources.hr_entity}" not found.`, "settings", "sources.hr_entity"));
      }
    }
    if (sources.notifications_entity) {
      if (!isValidEntityFormat(sources.notifications_entity)) {
        messages.push(createMessage("error", "Invalid notifications entity format.", "settings", "sources.notifications_entity"));
      } else if (hass && !entityExists(hass, sources.notifications_entity)) {
        messages.push(createMessage("warning", `Notifications entity "${sources.notifications_entity}" not found.`, "settings", "sources.notifications_entity"));
      }
    }
    const anyEnabled = status_bar.battery || status_bar.bluetooth || status_bar.steps || status_bar.heart_rate || status_bar.notifications;
    if (!anyEnabled) {
      messages.push(createMessage("info", "Status bar enabled but no indicators selected.", "settings"));
    }
  }
  const { advanced } = config;
  if (advanced.min_update_interval_ms < 100) {
    messages.push(createMessage("warning", "Very short update interval may cause performance issues.", "settings", "min_update_interval_ms"));
  }
  if (advanced.min_update_interval_ms > 6e4) {
    messages.push(createMessage("info", "Long update interval may cause stale data.", "settings", "min_update_interval_ms"));
  }
  if (advanced.full_refresh_minutes < 1) {
    messages.push(createMessage("warning", "Very short full refresh interval may cause excessive load.", "settings", "full_refresh_minutes"));
  }
  if (advanced.full_refresh_minutes > 60) {
    messages.push(createMessage("info", "Long full refresh interval may cause stale data.", "settings", "full_refresh_minutes"));
  }
}
function validateCalendar(config, hass, messages) {
  const { events } = config;
  if (events.enabled) {
    if (!events.calendars || events.calendars.length === 0) {
      messages.push(createMessage("error", "At least one calendar is required when events are enabled.", "calendar", "calendars"));
    } else {
      events.calendars.forEach((cal, index) => {
        if (!isValidEntityFormat(cal)) {
          messages.push(createMessage("error", `Invalid calendar entity format at position ${index + 1}.`, "calendar", `calendars[${index}]`));
        } else if (getDomain(cal) !== "calendar") {
          messages.push(createMessage("error", `Entity "${cal}" is not a calendar.`, "calendar", `calendars[${index}]`));
        } else if (hass && !entityExists(hass, cal)) {
          messages.push(createMessage("warning", `Calendar entity "${cal}" not found.`, "calendar", `calendars[${index}]`));
        }
      });
    }
    if (events.max_events < 0 || events.max_events > MAX_EVENTS$1) {
      messages.push(createMessage("error", `Max events must be between 0 and ${MAX_EVENTS$1}.`, "calendar", "max_events"));
    }
    if (!/^\d+:\d{2}:\d{2}$/.test(events.soon_window)) {
      messages.push(createMessage("error", "Invalid soon window format. Use HH:mm:ss.", "calendar", "soon_window"));
    }
    if (!["show_all_day", "hide", "banner"].includes(events.all_day)) {
      messages.push(createMessage("error", "Invalid all-day handling option.", "calendar", "all_day"));
    }
  }
}
function validateTile(tile, index, hass, messages) {
  if (!tile.enabled) return;
  const position = index + 1;
  if (!tile.label || tile.label.trim() === "") {
    messages.push(createMessage("error", `Tile ${position} requires a label.`, "screens", `tiles[${index}].label`));
  } else if (tile.label.length > 8) {
    messages.push(createMessage("warning", `Tile ${position} label may be truncated (max 8 chars).`, "screens", `tiles[${index}].label`));
  }
  if (tile.displayMode !== "text" && !isValidGlyph(tile.icon)) {
    messages.push(createMessage("error", `Invalid icon for tile ${position}.`, "screens", `tiles[${index}].icon`));
  }
  const validTypes = ["count", "duration", "state_text", "cover_state", "media_count", "sensor_value"];
  if (!validTypes.includes(tile.type)) {
    messages.push(createMessage("error", `Invalid type for tile ${position}.`, "screens", `tiles[${index}].type`));
  }
  if (!tile.entity && !tile.device_id) {
    messages.push(createMessage("error", `Tile ${position} requires an entity or device.`, "screens", `tiles[${index}].entity`));
  } else if (tile.entity) {
    if (!isValidEntityFormat(tile.entity)) {
      messages.push(createMessage("error", `Invalid entity format for tile ${position}.`, "screens", `tiles[${index}].entity`));
    } else {
      const allowedDomains = TILE_TYPE_DOMAINS[tile.type];
      if (allowedDomains && !isDomainCompatible(tile.entity, allowedDomains)) {
        messages.push(createMessage("warning", `Tile ${position} entity domain may not be compatible with type "${tile.type}".`, "screens", `tiles[${index}].entity`));
      }
      if (hass && !entityExists(hass, tile.entity)) {
        messages.push(createMessage("warning", `Tile ${position} entity "${tile.entity}" not found.`, "screens", `tiles[${index}].entity`));
      }
    }
  }
  if (!["auto", "manual", "disabled"].includes(tile.color)) {
    messages.push(createMessage("error", `Invalid color mode for tile ${position}.`, "screens", `tiles[${index}].color`));
  }
  if (tile.color !== "disabled" && tile.rules) {
    tile.rules.forEach((rule, ruleIndex) => {
      if (!rule.condition) {
        messages.push(createMessage("error", `Rule ${ruleIndex + 1} for tile ${position} missing condition.`, "screens", `tiles[${index}].rules[${ruleIndex}].condition`));
      }
      const validColors = ["green", "yellow", "red", "gray", "accent", "white"];
      if (!validColors.includes(rule.color)) {
        messages.push(createMessage("error", `Invalid color in rule ${ruleIndex + 1} for tile ${position}.`, "screens", `tiles[${index}].rules[${ruleIndex}].color`));
      }
    });
  }
  if (!["none", "toggle", "more-info", "service"].includes(tile.tap)) {
    messages.push(createMessage("error", `Invalid tap action for tile ${position}.`, "screens", `tiles[${index}].tap`));
  }
}
function validateDashboard(dashboard, screenIndex, hass, messages) {
  const prefix = `Screen ${screenIndex + 1}`;
  const fieldPrefix = `screens[${screenIndex}].dashboard`;
  const statusGroups = dashboard.statusGroups || [];
  const sensorGroups = dashboard.sensorGroups || [];
  const hasWeather = !!dashboard.weather?.entity;
  if (statusGroups.length === 0 && sensorGroups.length === 0 && !hasWeather) {
    messages.push(createMessage(
      "warning",
      `${prefix}: dashboard has no status groups, sensor groups, or weather configured.`,
      "screens",
      `${fieldPrefix}`
    ));
  }
  if (statusGroups.length > DASHBOARD_MAX_STATUS_GROUPS) {
    messages.push(createMessage(
      "error",
      `${prefix}: maximum ${DASHBOARD_MAX_STATUS_GROUPS} status groups allowed (found ${statusGroups.length}).`,
      "screens",
      `${fieldPrefix}.statusGroups`
    ));
  }
  statusGroups.forEach((group, gi) => {
    const groupField = `${fieldPrefix}.statusGroups[${gi}]`;
    if (!DASHBOARD_STATUS_GROUP_TYPES.includes(group.type)) {
      messages.push(createMessage(
        "error",
        `${prefix}: status group ${gi + 1} has invalid type "${group.type}". Must be one of: ${DASHBOARD_STATUS_GROUP_TYPES.join(", ")}.`,
        "screens",
        `${groupField}.type`
      ));
    }
    const glyphs = group.glyphs || [];
    if (glyphs.length < DASHBOARD_MIN_GLYPHS_PER_GROUP) {
      messages.push(createMessage(
        "error",
        `${prefix}: status group ${gi + 1} must have at least ${DASHBOARD_MIN_GLYPHS_PER_GROUP} glyph.`,
        "screens",
        `${groupField}.glyphs`
      ));
    }
    if (glyphs.length > DASHBOARD_MAX_GLYPHS_PER_GROUP) {
      messages.push(createMessage(
        "error",
        `${prefix}: status group ${gi + 1} has ${glyphs.length} glyphs (max ${DASHBOARD_MAX_GLYPHS_PER_GROUP}).`,
        "screens",
        `${groupField}.glyphs`
      ));
    }
    glyphs.forEach((glyph, gIdx) => {
      const glyphField = `${groupField}.glyphs[${gIdx}]`;
      const symbolProblem = glyphSymbolProblem(glyph.symbol);
      if (symbolProblem) {
        messages.push(createMessage(
          "warning",
          `${prefix}: status group ${gi + 1}, glyph ${gIdx + 1}: ${symbolProblem}.`,
          "screens",
          `${glyphField}.symbol`
        ));
      }
      if (!glyph.entity) {
        messages.push(createMessage(
          "error",
          `${prefix}: status group ${gi + 1}, glyph ${gIdx + 1} has no entity.`,
          "screens",
          `${glyphField}.entity`
        ));
        return;
      }
      if (!isValidEntityFormat(glyph.entity)) {
        messages.push(createMessage(
          "error",
          `${prefix}: status group ${gi + 1}, glyph ${gIdx + 1} has invalid entity format "${glyph.entity}".`,
          "screens",
          `${glyphField}.entity`
        ));
        return;
      }
      const domain = getDomain(glyph.entity);
      if (!DASHBOARD_GLYPH_DOMAINS.includes(domain)) {
        messages.push(createMessage(
          "error",
          `${prefix}: glyph entity "${glyph.entity}" has domain "${domain}". Must be one of: ${DASHBOARD_GLYPH_DOMAINS.join(", ")}.`,
          "screens",
          `${glyphField}.entity`
        ));
        return;
      }
      if (!hass) {
        messages.push(createMessage(
          "warning",
          `${prefix}: unable to verify glyph entity "${glyph.entity}" — HA connection not available.`,
          "screens",
          `${glyphField}.entity`
        ));
      } else if (!entityExists(hass, glyph.entity)) {
        messages.push(createMessage(
          "warning",
          `${prefix}: glyph entity "${glyph.entity}" not found in Home Assistant.`,
          "screens",
          `${glyphField}.entity`
        ));
      }
    });
  });
  if (sensorGroups.length > DASHBOARD_MAX_SENSOR_GROUPS) {
    messages.push(createMessage(
      "error",
      `${prefix}: maximum ${DASHBOARD_MAX_SENSOR_GROUPS} sensor groups allowed (found ${sensorGroups.length}).`,
      "screens",
      `${fieldPrefix}.sensorGroups`
    ));
  }
  sensorGroups.forEach((group, gi) => {
    const groupField = `${fieldPrefix}.sensorGroups[${gi}]`;
    if (!DASHBOARD_SENSOR_GROUP_TYPES.includes(group.type)) {
      messages.push(createMessage(
        "error",
        `${prefix}: sensor group ${gi + 1} has invalid type "${group.type}". Must be one of: ${DASHBOARD_SENSOR_GROUP_TYPES.join(", ")}.`,
        "screens",
        `${groupField}.type`
      ));
    }
    const sensors = group.sensors || [];
    if (sensors.length > DASHBOARD_MAX_SENSORS_PER_GROUP) {
      messages.push(createMessage(
        "error",
        `${prefix}: sensor group ${gi + 1} has ${sensors.length} sensors (max ${DASHBOARD_MAX_SENSORS_PER_GROUP}).`,
        "screens",
        `${groupField}.sensors`
      ));
    }
    sensors.forEach((sensor, sIdx) => {
      const sensorField = `${groupField}.sensors[${sIdx}]`;
      if (!sensor.entity) {
        messages.push(createMessage(
          "error",
          `${prefix}: sensor group ${gi + 1}, sensor ${sIdx + 1} has no entity.`,
          "screens",
          `${sensorField}.entity`
        ));
        return;
      }
      if (!isValidEntityFormat(sensor.entity)) {
        messages.push(createMessage(
          "error",
          `${prefix}: sensor group ${gi + 1}, sensor ${sIdx + 1} has invalid entity format "${sensor.entity}".`,
          "screens",
          `${sensorField}.entity`
        ));
        return;
      }
      const domain = getDomain(sensor.entity);
      if (!DASHBOARD_SENSOR_DOMAINS.includes(domain)) {
        messages.push(createMessage(
          "error",
          `${prefix}: sensor entity "${sensor.entity}" has domain "${domain}". Must be one of: ${DASHBOARD_SENSOR_DOMAINS.join(", ")}.`,
          "screens",
          `${sensorField}.entity`
        ));
        return;
      }
      if (!hass) {
        messages.push(createMessage(
          "warning",
          `${prefix}: unable to verify sensor entity "${sensor.entity}" — HA connection not available.`,
          "screens",
          `${sensorField}.entity`
        ));
      } else if (!entityExists(hass, sensor.entity)) {
        messages.push(createMessage(
          "warning",
          `${prefix}: sensor entity "${sensor.entity}" not found in Home Assistant.`,
          "screens",
          `${sensorField}.entity`
        ));
      }
    });
  });
  if (hasWeather) {
    const weatherEntity = dashboard.weather.entity;
    if (!isValidEntityFormat(weatherEntity)) {
      messages.push(createMessage(
        "error",
        `${prefix}: weather entity "${weatherEntity}" has invalid format.`,
        "screens",
        `${fieldPrefix}.weather.entity`
      ));
    } else if (getDomain(weatherEntity) !== "weather") {
      messages.push(createMessage(
        "error",
        `${prefix}: weather entity "${weatherEntity}" must be in the weather.* domain.`,
        "screens",
        `${fieldPrefix}.weather.entity`
      ));
    } else if (!hass) {
      messages.push(createMessage(
        "warning",
        `${prefix}: unable to verify weather entity "${weatherEntity}" — HA connection not available.`,
        "screens",
        `${fieldPrefix}.weather.entity`
      ));
    } else if (!entityExists(hass, weatherEntity)) {
      messages.push(createMessage(
        "warning",
        `${prefix}: weather entity "${weatherEntity}" not found in Home Assistant.`,
        "screens",
        `${fieldPrefix}.weather.entity`
      ));
    }
  }
  const events = dashboard.events;
  if (events != null && !Array.isArray(events)) {
    messages.push(createMessage(
      "error",
      `${prefix}: events must be a list of calendars, such as [{ calendar: calendar.home }].`,
      "screens",
      `${fieldPrefix}.events`
    ));
  }
  (Array.isArray(events) ? events : []).forEach((event, i2) => {
    const field = `${fieldPrefix}.events[${i2}].calendar`;
    const calendar = event?.calendar ?? "";
    if (!isValidEntityFormat(calendar) || getDomain(calendar) !== "calendar") {
      messages.push(createMessage("error", `${prefix}: calendar ${i2 + 1} ("${calendar}") is not a calendar entity.`, "screens", field));
    } else if (!hass) {
      messages.push(createMessage("warning", `${prefix}: unable to verify calendar "${calendar}" — HA connection not available.`, "screens", field));
    } else if (!entityExists(hass, calendar)) {
      messages.push(createMessage("warning", `${prefix}: calendar "${calendar}" not found in Home Assistant.`, "screens", field));
    }
  });
  if (dashboard.configurableValue) {
    const cv = dashboard.configurableValue;
    if (!cv.entity) {
      messages.push(createMessage(
        "error",
        `${prefix}: configurable value has no entity.`,
        "screens",
        `${fieldPrefix}.configurableValue.entity`
      ));
    } else if (!isValidEntityFormat(cv.entity)) {
      messages.push(createMessage(
        "error",
        `${prefix}: configurable value entity "${cv.entity}" has invalid format.`,
        "screens",
        `${fieldPrefix}.configurableValue.entity`
      ));
    } else if (hass && !entityExists(hass, cv.entity)) {
      messages.push(createMessage(
        "warning",
        `${prefix}: configurable value entity "${cv.entity}" not found in Home Assistant.`,
        "screens",
        `${fieldPrefix}.configurableValue.entity`
      ));
    }
    if (cv.label && cv.label.length > 11) {
      messages.push(createMessage(
        "warning",
        `${prefix}: configurable value label "${cv.label}" exceeds 11 characters and will be truncated.`,
        "screens",
        `${fieldPrefix}.configurableValue.label`
      ));
    }
  }
  const inlineMetrics = dashboard.inlineMetrics || [];
  inlineMetrics.forEach((metric, slotIndex) => {
    if (!metric) return;
    const slotField = `${fieldPrefix}.inlineMetrics[${slotIndex}]`;
    if (!metric.entity) {
      messages.push(createMessage(
        "error",
        `${prefix}: inline metric slot ${slotIndex + 1} has no entity.`,
        "screens",
        `${slotField}.entity`
      ));
    } else if (!isValidEntityFormat(metric.entity)) {
      messages.push(createMessage(
        "error",
        `${prefix}: inline metric slot ${slotIndex + 1} entity "${metric.entity}" has invalid format.`,
        "screens",
        `${slotField}.entity`
      ));
    } else if (hass && !entityExists(hass, metric.entity)) {
      messages.push(createMessage(
        "warning",
        `${prefix}: inline metric slot ${slotIndex + 1} entity "${metric.entity}" not found in Home Assistant.`,
        "screens",
        `${slotField}.entity`
      ));
    }
    if (metric.label && metric.label.length > 2) {
      messages.push(createMessage(
        "warning",
        `${prefix}: inline metric slot ${slotIndex + 1} label "${metric.label}" exceeds 2 characters and will be truncated.`,
        "screens",
        `${slotField}.label`
      ));
    }
  });
}
function validateScreens(config, hass, messages) {
  const screens = config.screens || [];
  if (screens.length > MAX_SCREENS) {
    messages.push(createMessage("error", `Maximum ${MAX_SCREENS} screens allowed.`, "screens", "screens"));
  } else if (screens.length > MAX_SCREENS_LEGACY_FIRMWARE) {
    messages.push(createMessage(
      "info",
      `More than ${MAX_SCREENS_LEGACY_FIRMWARE} screens needs watch firmware 2.4.100 or later; older firmware shows only the first ${MAX_SCREENS_LEGACY_FIRMWARE}.`,
      "screens",
      "screens"
    ));
  }
  screens.forEach((screen, screenIndex) => {
    const validScreenTypes = ["dashboard", "tiles"];
    if (!validScreenTypes.includes(screen.screenType)) {
      messages.push(createMessage("error", `Screen ${screenIndex}: invalid screen type "${screen.screenType}". Only dashboard and tiles are allowed.`, "screens", `screens[${screenIndex}].screenType`));
    }
    if (screen.screenType === "dashboard" && !screen.dashboard) {
      messages.push(createMessage("warning", `Screen ${screenIndex + 1}: dashboard screen has no dashboard configuration.`, "screens", `screens[${screenIndex}].dashboard`));
    }
    if (screen.screenType === "dashboard" && screen.dashboard) {
      validateDashboard(screen.dashboard, screenIndex, hass, messages);
    }
    if (screen.screenType === "tiles" && screen.tiles) {
      if (screen.tiles.length > 4) {
        messages.push(createMessage("error", `Screen ${screenIndex + 1}: maximum 4 tiles allowed per screen.`, "screens", `screens[${screenIndex}].tiles`));
      }
      screen.tiles.forEach((tile, tileIndex) => {
        validateTile(tile, tileIndex, hass, messages);
      });
    }
  });
  if (config.tiles && config.tiles.length > 0) {
    const enabledTiles = config.tiles.filter((t2) => t2.enabled).length;
    if (enabledTiles === 0) {
      messages.push(createMessage("info", "No legacy tiles are enabled.", "screens"));
    }
    config.tiles.forEach((tile, index) => {
      validateTile(tile, index, hass, messages);
    });
  }
}
function validateLogbook(config, messages) {
  if (!config.logbook_app) return;
  if (config.logbook_app.hours_back < 1 || config.logbook_app.hours_back > 48) {
    messages.push(createMessage("error", "Hours back must be 1–48", "logbook", "hours_back"));
  }
  if (config.logbook_app.max_entries < 1 || config.logbook_app.max_entries > 15) {
    messages.push(createMessage("error", "Max entries must be 1–15", "logbook", "max_entries"));
  }
  config.logbook_app.entities.forEach((e2, i2) => {
    if (!e2 || e2.trim() === "") {
      messages.push(createMessage("warning", `Logbook entity ${i2 + 1} is empty`, "logbook", `entities[${i2}]`));
    }
  });
}
function validateHomeControl(config, messages) {
  if (!config.home_control) return;
  if (config.home_control.devices.length > 4) {
    messages.push(createMessage("error", "Maximum 4 home control devices", "home_control", "devices"));
  }
  config.home_control.devices.forEach((dev, i2) => {
    if (!dev.entity_id || dev.entity_id.trim() === "") {
      messages.push(createMessage("warning", `Home control device ${i2 + 1} has no entity`, "home_control", `devices[${i2}].entity_id`));
    }
  });
}
function groupByTab(messages) {
  const tabs = ["settings", "screens", "calendar", "logbook", "home_control"];
  const result = {};
  for (const tab of tabs) {
    result[tab] = [];
  }
  for (const msg of messages) {
    if (tabs.includes(msg.tab)) {
      result[msg.tab].push(msg);
    }
  }
  return result;
}
function validateConfig(config, hass) {
  const messages = [];
  validateSettings(config, hass, messages);
  validateCalendar(config, hass, messages);
  validateScreens(config, hass, messages);
  validateLogbook(config, messages);
  validateHomeControl(config, messages);
  const errors = messages.filter((m2) => m2.severity === "error");
  const warnings = messages.filter((m2) => m2.severity === "warning");
  const info = messages.filter((m2) => m2.severity === "info");
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
    byTab: groupByTab(messages)
  };
}
function getTabBadgeCounts(result) {
  const tabs = ["settings", "screens", "calendar", "logbook", "home_control"];
  const counts = {};
  for (const tab of tabs) {
    counts[tab] = { errors: 0, warnings: 0 };
  }
  for (const tab of tabs) {
    const tabMessages = result.byTab[tab] || [];
    counts[tab].errors = tabMessages.filter((m2) => m2.severity === "error").length;
    counts[tab].warnings = tabMessages.filter((m2) => m2.severity === "warning").length;
  }
  return counts;
}
function listedMessages(result) {
  if (!result) return [];
  return [...result.errors, ...result.warnings].map((m2) => ({
    ...m2,
    tabLabel: EDITOR_TABS.find((t2) => t2.id === m2.tab)?.label ?? m2.tab
  }));
}
const sharedStyles = i$3`
  :host {
    display: block;
    --color-green: #00C853;
    --color-yellow: #FFD600;
    --color-red: #FF1744;
    --color-gray: #9E9E9E;
    --color-accent: #18A1FF;
    --color-white: #FFFFFF;
    --bg-charcoal: #1E1E1E;
    --bg-black: #000000;
  }

  .card-content {
    padding: 16px;
  }

  .validation-banner {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 4px;
    margin-bottom: 12px;
    font-size: 14px;
  }

  .validation-banner.valid {
    background: rgba(0, 200, 83, 0.1);
    color: var(--color-green);
    border: 1px solid var(--color-green);
  }

  .validation-banner.invalid {
    background: rgba(255, 23, 68, 0.1);
    color: var(--color-red);
    border: 1px solid var(--color-red);
  }

  .validation-banner .icon {
    font-size: 18px;
  }

  .payload-size {
    margin-left: auto;
    font-size: 12px;
    opacity: 0.7;
  }

  /*
   * With messages to list, the chevron is the button that lists them, and its ::after stretches
   * over the banner, so a tap anywhere on it toggles the list; the summary stays outside the
   * button, as the live region.
   */
  .validation-toggle {
    display: flex;
    align-items: center;
    padding: 0;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .validation-toggle::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    border-radius: 4px;
  }

  .validation-toggle:focus-visible {
    outline: none;
  }

  .validation-toggle:focus-visible::after {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  .validation-chevron {
    font-size: 12px;
  }

  .validation-list {
    list-style: none;
    margin: -8px 0 12px;
    padding: 4px 0;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-top: none;
    border-radius: 0 0 4px 4px;
    max-height: 240px;
    overflow-y: auto;
  }

  .validation-list[hidden] {
    display: none;
  }

  .validation-item {
    display: flex;
    gap: 8px;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--primary-text-color, #212121);
  }

  .validation-item-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .validation-item-where {
    font-size: 11px;
    color: var(--secondary-text-color, #757575);
    overflow-wrap: anywhere;
  }
`;
const previewStyles = i$3`
  .watch-preview {
    width: 240px;
    height: 240px;
    border-radius: 8px;
    overflow: hidden;
    font-family: 'Roboto Mono', 'Courier New', monospace;
    position: relative;
    margin: 0 auto;
  }

  .watch-preview.charcoal {
    background: var(--bg-charcoal);
  }

  .watch-preview.black {
    background: var(--bg-black);
  }

  /* Header section */
  .watch-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 8px 10px;
    height: 48px;
    box-sizing: border-box;
  }

  .watch-time {
    font-size: 48px;
    font-weight: bold;
    color: var(--color-white);
    line-height: 1;
  }

  .watch-time.align-left {
    text-align: left;
  }

  .watch-time.align-center {
    text-align: center;
    flex: 1;
  }

  .watch-time.align-right {
    text-align: right;
  }

  .presence-icons {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    max-width: 80px;
    justify-content: flex-end;
  }

  .presence-icon {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .presence-icon svg {
    width: 12px;
    height: 12px;
  }

  /* Events section */
  .watch-events {
    padding: 2px 10px;
    font-size: 11px;
    color: var(--color-gray);
    height: 28px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    line-height: 1.2;
  }

  .watch-events .event-row {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .watch-events .event-row.soon {
    color: var(--color-yellow);
  }

  /* Tiles grid */
  .watch-tiles {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 2px;
    padding: 2px;
    height: 118px;
  }

  .watch-tile {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px;
    overflow: hidden;
  }

  .tile-value {
    font-size: 22px;
    font-weight: bold;
    line-height: 1;
    text-align: center;
  }

  .tile-label {
    font-size: 9px;
    text-transform: uppercase;
    color: var(--color-gray);
    margin-top: 2px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  /* Actions row */
  .watch-actions {
    display: flex;
    gap: 4px;
    padding: 4px 6px;
    height: 36px;
    justify-content: center;
  }

  .watch-action {
    flex: 1;
    max-width: 76px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s;
  }

  .watch-action:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .watch-action svg {
    width: 14px;
    height: 14px;
  }

  /* Status bar */
  .watch-status-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    padding: 4px 8px;
    height: 20px;
    font-size: 10px;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .status-item svg {
    width: 12px;
    height: 12px;
  }

  /* Debug overlays */
  .debug-bounds .watch-tile,
  .debug-bounds .watch-action {
    outline: 1px dashed rgba(255, 255, 255, 0.3);
  }

  .debug-truncation .tile-label,
  .debug-truncation .tile-value {
    background: rgba(255, 0, 0, 0.2);
  }

  /* Copy and Push buttons */
  .copy-button,
  .push-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--primary-color, #03a9f4);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    margin-top: 12px;
    flex: 1;
    justify-content: center;
  }

  .copy-button:hover,
  .push-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .copy-button.copied,
  .push-button.success {
    background: var(--color-green);
  }

  .push-button.error {
    background: var(--color-red);
  }

  .push-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--disabled-color, #9e9e9e);
  }

  .push-error {
    color: var(--color-red);
    font-size: 12px;
    padding: 8px 16px;
    text-align: center;
    background: rgba(255, 0, 0, 0.1);
    border-radius: 4px;
    margin: 8px 16px 0;
  }

  /* Dashboard screen layout (legacy) */
  .watch-dashboard {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 8px;
    height: 172px;
    overflow-y: auto;
  }

  /* A tile screen as the watch draws it (firmware 2.4.94; tile-preview.ts): 114 x 104 tiles
     with a 2 px frame, the name 16 px from the top and the state below it, 20 px bold mono. */
  .watch-tile-screen {
    position: relative;
    width: 240px;
    height: 240px;
    background: #000;
  }

  .watch-tile2 {
    position: absolute;
    box-sizing: border-box;
    width: 114px;
    height: 104px;
    border: 2px solid;
    border-radius: 10px;
    padding: 0 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 26px;
    font-family: 'JetBrains Mono', 'Roboto Mono', 'Courier New', monospace;
    font-size: 20px;
    font-weight: bold;
    line-height: 23px;
    text-align: center;
    color: #fff;
    overflow: hidden;
  }

  /* A name that wraps: its lines and the state sit close, as on the watch. */
  .watch-tile2.tight {
    gap: 2px;
  }

  /* Wraps at spaces, then inside a word, up to the 3 lines the watch keeps. */
  .watch-tile2-name {
    width: 100%;
    white-space: normal;
    overflow-wrap: anywhere;
    max-height: 69px;
    overflow: hidden;
  }

  .watch-tile2-state {
    white-space: nowrap;
  }

  .watch-tile2-icon {
    --mdc-icon-size: 22px;
    color: #fff;
  }

  .watch-screen-indicator {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 2px;
    text-align: center;
    font-family: 'JetBrains Mono', 'Roboto Mono', 'Courier New', monospace;
    font-size: 20px;
    font-weight: bold;
    line-height: 23px;
    color: #606060;
  }

  /* The arrows under the preview: one screen at a time, as a swipe on the watch. */
  .preview-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-top: 6px;
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
  }

  .preview-nav button {
    width: 28px;
    height: 24px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    background: transparent;
    color: var(--primary-text-color, #212121);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
  }

  .preview-nav button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  /*
   * The dashboard as the watch draws it (firmware 2.4.98, "dashboard v8"; dashboard-preview.ts):
   * the text, pills, bar and rule in an SVG of the watch's 240 x 240 pixels, placed by baseline;
   * the icons over it at their boxes. The fonts are the nearest a browser has to the watch's: a
   * thin monospace for the time (JetBrains Mono Light 76), a small sans for the rest (Montserrat
   * Medium 14 and 18), a bold monospace for the freezer text (JetBrains Mono Bold 20).
   */
  .watch-dash8 {
    position: relative;
    width: 240px;
    height: 240px;
    background: #000;
    overflow: hidden;
  }

  .watch-dash8 svg {
    position: absolute;
    left: 0;
    top: 0;
  }

  .watch-dash8 .m14,
  .watch-dash8 .m18 {
    font-family: Montserrat, Roboto, 'Helvetica Neue', 'Segoe UI', Arial, sans-serif;
    font-weight: 500;
  }

  .watch-dash8 .m14 {
    font-size: 14px;
  }

  .watch-dash8 .m18 {
    font-size: 18px;
  }

  .watch-dash8 .time {
    font-family: 'JetBrains Mono', 'Roboto Mono', 'Cascadia Mono', 'SF Mono', Menlo, Consolas, monospace;
    font-size: 76px;
    font-weight: 300;
  }

  .watch-dash8 .bold {
    font-family: 'JetBrains Mono', 'Roboto Mono', 'Cascadia Mono', 'SF Mono', Menlo, Consolas, monospace;
    font-size: 20px;
    font-weight: bold;
  }

  /*
   * The watch's 20 px icons (Font Awesome in JetBrains Mono Bold 20), grey unless told. An MDI
   * icon keeps about 2 px clear inside its 24 px square, so a 24 px one, 2 px up and left of the
   * watch's box, draws a glyph of the watch's size in its place.
   */
  .dash8-icon {
    position: absolute;
    display: block;
    width: 24px;
    height: 24px;
    margin: -2px 0 0 -2px;
    line-height: 0;
    --mdc-icon-size: 24px;
    color: #8E8E93;
  }

  /* The weather icon (Font Awesome 25), right-aligned to x 180. */
  .dash8-icon.dash8-weather {
    width: 28px;
    height: 28px;
    margin: -2px 0 0 -1px;
    --mdc-icon-size: 28px;
    color: #E5E5EA;
  }

  /* MDI's batteries stand up; the watch's lies down, its tip to the right. */
  .dash8-icon.dash8-battery {
    transform: rotate(90deg);
  }

  /* Over the freezer bar, for its tooltip. */
  .dash8-freezer {
    position: absolute;
    left: 0;
    top: 175px;
    width: 240px;
    height: 20px;
  }
`;
const editorStyles = i$3`
  :host {
    display: block;
  }

  .editor-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  /* Tabs */
  .tabs-header {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    margin-bottom: 16px;
    overflow-x: auto;
  }

  .tab-button {
    padding: 8px 12px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    white-space: nowrap;
    position: relative;
  }

  .tab-button.active {
    color: var(--primary-color, #03a9f4);
    border-bottom-color: var(--primary-color, #03a9f4);
  }

  .tab-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }

  .tab-badge.error {
    background: var(--color-red);
    color: white;
  }

  .tab-badge.warning {
    background: var(--color-yellow);
    color: black;
  }

  /* Tab content */
  .tab-content {
    padding: 8px 0;
  }

  /* Form sections */
  .form-section {
    margin-bottom: 24px;
  }

  .form-section-title {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 12px;
    color: var(--primary-text-color, #212121);
  }

  .form-row {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    align-items: center;
  }

  .form-row.column {
    flex-direction: column;
    align-items: stretch;
  }

  .form-field {
    flex: 1;
    min-width: 0;
  }

  .form-field label {
    display: block;
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
    margin-bottom: 4px;
  }

  .form-field input,
  .form-field select {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    font-size: 14px;
  }

  .form-field input:focus,
  .form-field select:focus {
    outline: none;
    border-color: var(--primary-color, #03a9f4);
  }

  /* Toggle switch */
  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }

  .toggle-label {
    font-size: 14px;
  }

  /* Reorderable list */
  .reorderable-list {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    overflow: hidden;
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--card-background-color, white);
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }

  .list-item:last-child {
    border-bottom: none;
  }

  .list-item.dragging {
    opacity: 0.5;
    background: var(--primary-color, #03a9f4);
    color: white;
  }

  .drag-handle {
    cursor: grab;
    color: var(--secondary-text-color, #757575);
  }

  .list-item-content {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .list-item-actions {
    display: flex;
    gap: 4px;
  }

  .list-item-actions button {
    padding: 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--secondary-text-color, #757575);
  }

  .list-item-actions button:hover {
    color: var(--primary-text-color, #212121);
  }

  .add-item-button {
    width: 100%;
    padding: 8px;
    background: none;
    border: 1px dashed var(--divider-color, #e0e0e0);
    border-radius: 4px;
    cursor: pointer;
    color: var(--secondary-text-color, #757575);
    margin-top: 8px;
  }

  .add-item-button:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  /* Validation messages */
  .validation-messages {
    margin-top: 8px;
  }

  .validation-message {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
    font-size: 13px;
    margin-bottom: 4px;
  }

  .validation-message.error {
    background: rgba(255, 23, 68, 0.1);
    color: var(--color-red);
  }

  .validation-message.warning {
    background: rgba(255, 214, 0, 0.1);
    color: #f57f17;
  }

  .validation-message.info {
    background: rgba(24, 161, 255, 0.1);
    color: var(--color-accent);
  }

  /* Simulator controls */
  .simulator-panel {
    background: var(--secondary-background-color, #f5f5f5);
    border-radius: 4px;
    padding: 12px;
    margin-top: 12px;
  }

  .simulator-title {
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 8px;
    color: var(--secondary-text-color, #757575);
  }

  .simulator-controls {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .simulator-control {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .simulator-control label {
    font-size: 10px;
    color: var(--secondary-text-color, #757575);
  }

  .simulator-control select,
  .simulator-control input {
    padding: 4px;
    font-size: 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 2px;
  }

  /* Grid editor for tiles */
  .tiles-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .tile-slot {
    aspect-ratio: 1;
    border: 1px dashed var(--divider-color, #e0e0e0);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    padding: 4px;
  }

  .tile-slot:hover {
    border-color: var(--primary-color, #03a9f4);
    background: rgba(3, 169, 244, 0.05);
  }

  .tile-slot.active {
    border-color: var(--primary-color, #03a9f4);
    border-style: solid;
    background: rgba(3, 169, 244, 0.1);
  }

  .tile-slot.configured {
    border-style: solid;
    border-color: var(--divider-color, #e0e0e0);
    background: var(--card-background-color, white);
  }

  .tile-slot-number {
    font-size: 10px;
    color: var(--secondary-text-color, #757575);
  }

  .tile-slot-label {
    font-size: 11px;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  /* Searchable entity select */
  .searchable-select {
    position: relative;
    width: 100%;
  }

  .searchable-select input {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    font-size: 13px;
  }

  .entity-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background: var(--card-background-color, white);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    margin-top: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1000;
  }

  .entity-option {
    display: flex;
    flex-direction: column;
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }

  .entity-option:last-child {
    border-bottom: none;
  }

  .entity-option:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .entity-option.selected {
    background: var(--primary-color, #03a9f4);
    color: white;
  }

  .entity-option .entity-name {
    font-size: 12px;
    font-weight: 500;
    font-family: monospace;
  }

  .entity-option .entity-friendly {
    font-size: 11px;
    color: var(--secondary-text-color, #757575);
    margin-top: 2px;
  }

  .entity-option.selected .entity-friendly {
    color: rgba(255, 255, 255, 0.8);
  }

  .entity-option-info {
    padding: 8px 12px;
    font-size: 11px;
    color: var(--secondary-text-color, #757575);
    font-style: italic;
  }

  .device-filter {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
  }

  /* Icon picker */
  .icon-picker-container {
    position: relative;
    display: inline-block;
  }

  .icon-picker-button {
    width: 50px;
    height: 36px;
    font-size: 20px;
    text-align: center;
    cursor: pointer;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    background: var(--card-background-color, white);
    transition: background 0.2s;
  }

  .icon-picker-button:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .icon-picker-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 2000;
    margin-top: 4px;
    background: var(--card-background-color, white);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    width: 320px;
    max-height: 400px;
    display: flex;
    flex-direction: column;
  }

  .icon-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    font-weight: 500;
    font-size: 14px;
  }

  .icon-picker-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .icon-picker-close:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .icon-picker-content {
    overflow-y: auto;
    max-height: 340px;
    padding: 8px;
  }

  .icon-category {
    margin-bottom: 16px;
  }

  .icon-category-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--secondary-text-color, #757575);
    text-transform: uppercase;
    margin-bottom: 8px;
    padding: 0 4px;
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }

  .icon-option {
    width: 100%;
    aspect-ratio: 1;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    background: var(--card-background-color, white);
    transition: all 0.2s;
  }

  .icon-option:hover {
    background: var(--secondary-background-color, #f5f5f5);
    transform: scale(1.1);
  }

  .icon-option.selected {
    background: var(--primary-color, #03a9f4);
    color: white;
    border-color: var(--primary-color, #03a9f4);
  }

  /* Load error banner (L3 fix) */
  .load-error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(255, 23, 68, 0.1);
    border: 1px solid var(--color-red, #FF1744);
    border-radius: 4px;
    margin-bottom: 12px;
  }

  .load-error-banner .error-icon {
    font-size: 16px;
  }

  .load-error-banner .error-message {
    flex: 1;
    font-size: 13px;
    color: var(--color-red, #FF1744);
  }

  .load-error-banner .retry-button {
    padding: 6px 12px;
    background: var(--color-red, #FF1744);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .load-error-banner .retry-button:hover {
    opacity: 0.9;
  }
`;
const TILE_MARGIN = 4;
const TILE_GAP = 4;
const TILE_W = 114;
const TILE_H = 104;
const TILE_LINE_CHARS = 8;
const TILE_GROUND = "#1A1A2E";
const TILE_FRAME = "#333355";
const TILE_STATE_OFF = "#8A8A8A";
const TILE_ACCENT_DEFAULT = "#FFD700";
const ACTIVE_STATES = /* @__PURE__ */ new Set([
  "on",
  "open",
  "home",
  "playing",
  "heat",
  "cool",
  "heat_cool",
  "auto",
  "unlocked",
  "above_horizon",
  "fan_only",
  "dry"
]);
const TILE_ICON_MDI = {
  home: "mdi:home",
  music: "mdi:music",
  bell: "mdi:bell",
  heart: "mdi:heart-pulse",
  bluetooth: "mdi:bluetooth",
  door: "mdi:shield-half-full",
  battery: "mdi:battery-50",
  steps: "mdi:shoe-print",
  tv: "mdi:play",
  fan: "mdi:white-balance-sunny",
  power: "mdi:power-plug",
  car: "mdi:map-marker-radius",
  truck: "mdi:map-marker-radius",
  person_male: "mdi:eye",
  person_female: "mdi:eye"
};
function isActiveState(state) {
  return state != null && ACTIVE_STATES.has(state);
}
function formatTileState(state) {
  const text = state.replace(/_/g, " ");
  if (text.length <= TILE_LINE_CHARS) return text;
  return `${text.slice(0, TILE_LINE_CHARS - 1).trimEnd()}.`;
}
function tilePosition(index) {
  return {
    left: TILE_MARGIN + index % 2 * (TILE_W + TILE_GAP),
    top: TILE_MARGIN + Math.floor(index / 2) * (TILE_H + TILE_GAP)
  };
}
function hexColor(text, fallback) {
  return text !== void 0 && /^#[0-9a-fA-F]{6}$/.test(text) ? text.toUpperCase() : fallback;
}
function litGround(accent) {
  const channel = (offset) => Math.round(parseInt(accent.slice(offset, offset + 2), 16) * 56 / 255).toString(16).padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`.toUpperCase();
}
function nameWraps(name) {
  return name.length > TILE_LINE_CHARS;
}
const DASH_WHITE = "#E5E5EA";
const DASH_GREY = "#8E8E93";
const DASH_FAINT = "#48484A";
const DASH_RULE = "#2C2C2E";
const DASH_CYAN = "#5AC8FA";
const DASH_CALM = "#2F7D4F";
const DASH_RED = "#FF453A";
const DASH_INK = "#000000";
const STALE_PILL = DASH_GREY;
const STALE_CHECK = DASH_FAINT;
const TYPE_ORDER = ["doors", "garage", "lights", "media", "motion"];
const SLOT_COLOR = {
  doors: "#FF9500",
  garage: "#FF453A",
  lights: "#FFCC00",
  media: "#BF5AF2",
  motion: "#5AC8FA"
};
const PILL = { x0: 6, pitch: 23, w: 20, h: 16, y: 155, radius: 8 };
const PILL_SLOTS = 10;
function pillX(slot) {
  return PILL.x0 + PILL.pitch * slot;
}
const TITLE_X = 88;
const TITLE_W = 146;
const DASH_BASE = {
  top: 19,
  hiLo: 36,
  time: 106,
  event: 128,
  pill: 168,
  freezer: 191,
  house: 212,
  watch: 234
};
const DASH_ICON = {
  check: [6, 152],
  home: [180, 196],
  battery: [6, 218],
  steps: [88, 218],
  heart: [180, 218],
  weather: [155, 8]
};
const MAX_STATUS_GROUPS = 5;
const MAX_GLYPHS = 10;
const EVENT_GRACE_SEC = 600;
const MAX_EVENTS = 2;
const MAX_TITLE_BYTES = 24;
const EVENTS_PER_CALENDAR = 8;
const DASH_ACTIVE_STATES = /* @__PURE__ */ new Set([...ACTIVE_STATES, "opening", "closing"]);
function keptGlyphs(glyphs) {
  return glyphs.filter((g2) => typeof g2.symbol === "string" && g2.symbol.length === 1 && g2.symbol.charCodeAt(0) >= 1 && g2.symbol.charCodeAt(0) <= 127).slice(0, MAX_GLYPHS);
}
function slotOf(type) {
  switch (type.toLowerCase()) {
    case "doors":
      return "doors";
    case "garage":
      return "garage";
    case "lights":
      return "lights";
    case "motion":
      return "motion";
    default:
      return "media";
  }
}
function litGlyphs(groups, isOn) {
  const kept = groups.slice(0, MAX_STATUS_GROUPS);
  const lit = [];
  for (const type of TYPE_ORDER) {
    for (const group of kept) {
      if (slotOf(group.type) !== type) continue;
      for (const g2 of keptGlyphs(group.glyphs ?? [])) {
        if (g2.symbol !== "#" && g2.entity && isOn(g2.entity)) lit.push({ letter: g2.symbol, type });
      }
    }
  }
  return lit;
}
function statusStrip(lit, stale) {
  const shown = lit.slice(0, PILL_SLOTS);
  const doorsShut = !lit.some((g2) => g2.type === "doors" || g2.type === "garage");
  const showCheck = doorsShut && shown.length < PILL_SLOTS;
  const first = showCheck ? 1 : 0;
  return {
    check: showCheck ? stale ? STALE_CHECK : DASH_CALM : null,
    pills: shown.map((g2, k2) => ({ letter: g2.letter, slot: first + k2, fill: stale ? STALE_PILL : SLOT_COLOR[g2.type] }))
  };
}
function reading(entityId, state) {
  if (!state) return null;
  if (entityId.startsWith("climate.")) {
    const t2 = Number(state.attributes?.current_temperature);
    if (state.attributes?.current_temperature != null && Number.isFinite(t2)) return Math.round(t2);
  }
  if (state.state.trim() === "") return null;
  const v2 = Number(state.state);
  return Number.isFinite(v2) ? Math.round(v2) : null;
}
function presence(state) {
  const s2 = state?.state?.trim().toLowerCase();
  if (s2 === void 0 || s2 === "" || s2 === "unavailable" || s2 === "unknown") return null;
  if (s2 === "home" || s2 === "on") return 1;
  const v2 = Number(s2);
  if (Number.isFinite(v2)) return v2 > 0 ? 1 : 0;
  return 0;
}
function freezerThreshold(state) {
  const unit = String(state?.attributes?.unit_of_measurement ?? "");
  return unit.includes("C") ? -9 : 15;
}
function weatherIcon(condition) {
  switch (condition) {
    case "sunny":
    case "clear":
    case "clear-night":
      return "mdi:weather-sunny";
    case "partlycloudy":
      return "mdi:weather-partly-cloudy";
    case "cloudy":
    case "windy":
    case "windy-variant":
      return "mdi:weather-cloudy";
    case "rainy":
      return "mdi:weather-partly-rainy";
    case "pouring":
      return "mdi:weather-pouring";
    case "snowy":
    case "snowy-rainy":
      return "mdi:snowflake";
    case "hail":
      return "mdi:weather-hail";
    case "lightning":
    case "lightning-rainy":
      return "mdi:flash";
    case "fog":
      return "mdi:weather-fog";
    case "exceptional":
      return "mdi:cancel";
    default:
      return null;
  }
}
function forecastHiLo(result, entityId) {
  const forecast = result?.response?.[entityId]?.forecast;
  return firstDayHiLo(forecast);
}
function legacyHiLo(state) {
  return firstDayHiLo(state?.attributes?.forecast);
}
function firstDayHiLo(forecast) {
  if (!Array.isArray(forecast) || forecast.length === 0) return null;
  const today = forecast[0];
  const hi = Number(today?.temperature);
  const lo = Number(today?.templow);
  if (today?.temperature == null || today?.templow == null || !Number.isFinite(hi) || !Number.isFinite(lo)) return null;
  return [Math.round(hi), Math.round(lo)];
}
function formatCountdown(startSec, nowSec) {
  if (startSec <= nowSec) return "now";
  const mins = Math.floor((startSec - nowSec) / 60);
  if (mins < 60) return `${mins}m`;
  const tenths = Math.floor(mins * 10 / 60);
  if (tenths < 100) return `${Math.floor(tenths / 10)}.${tenths % 10}h`;
  return `${Math.floor(tenths / 10)}h`;
}
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function formatEventStart(startSec, nowSec) {
  const start = new Date(startSec * 1e3);
  const now = new Date(nowSec * 1e3);
  const today = start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth() && start.getDate() === now.getDate();
  if (startSec <= nowSec || today) return formatCountdown(startSec, nowSec);
  return `${WEEKDAYS[start.getDay()]} ${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}`;
}
function formatHeartRate(bpm) {
  return bpm > 0 ? String(bpm) : "--";
}
function cutUtf8(text, maxBytes) {
  let bytes = 0;
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const n3 = cp < 128 ? 1 : cp < 2048 ? 2 : cp < 65536 ? 3 : 4;
    if (bytes + n3 > maxBytes) break;
    bytes += n3;
    out += ch;
  }
  return out;
}
const M14_ADVANCE = [
  4,
  4,
  6,
  10,
  9,
  12,
  10,
  3,
  5,
  5,
  6,
  8,
  3,
  5,
  3,
  5,
  9,
  5,
  8,
  8,
  9,
  8,
  9,
  8,
  9,
  9,
  3,
  3,
  8,
  8,
  8,
  8,
  15,
  10,
  11,
  10,
  12,
  9,
  9,
  11,
  11,
  4,
  7,
  10,
  8,
  13,
  11,
  12,
  10,
  12,
  10,
  9,
  8,
  11,
  10,
  16,
  9,
  9,
  9,
  5,
  5,
  5,
  8,
  7,
  8,
  8,
  10,
  8,
  10,
  9,
  5,
  10,
  10,
  4,
  4,
  9,
  4,
  15,
  10,
  9,
  10,
  10,
  6,
  7,
  6,
  10,
  8,
  13,
  8,
  8,
  7,
  5,
  4,
  5,
  8
];
function m14Width(text) {
  let w2 = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 32 && cp <= 126) w2 += M14_ADVANCE[cp - 32];
    else if (cp === 176) w2 += 6;
  }
  return w2;
}
function dotTitle(title, width = TITLE_W) {
  if (m14Width(title) <= width) return title;
  const chars = [...title];
  for (let n3 = chars.length; n3 > 0; n3--) {
    const cut = `${chars.slice(0, n3).join("").trimEnd()}...`;
    if (m14Width(cut) <= width) return cut;
  }
  return "...";
}
function formatClock(now, timeFormat) {
  let hour = now.getHours();
  if (timeFormat !== void 0 && timeFormat.startsWith("h")) {
    hour %= 12;
    if (hour === 0) hour = 12;
  }
  return `${String(hour).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
function batteryIcon(percent) {
  if (percent >= 90) return "mdi:battery";
  if (percent >= 60) return "mdi:battery-70";
  if (percent >= 35) return "mdi:battery-50";
  if (percent >= 10) return "mdi:battery-20";
  return "mdi:battery-outline";
}
function dashboardCalendars(dashboard, layout) {
  const named = (ids) => [...new Set(ids.filter((c2) => !!c2 && c2.trim() !== ""))];
  const own = named((dashboard.events ?? []).map((e2) => e2.calendar));
  if (own.length > 0) return own;
  const events = layout.events;
  if (!events?.enabled) return [];
  return named(events.calendars ?? []);
}
function eventStartSec(start) {
  if (typeof start !== "string") return 0;
  const iso = start.trim().replace(" ", "T");
  if (!iso.includes("T")) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1e3) : 0;
}
function calendarEvents(result, calendars) {
  const response = result?.response;
  if (!response) return null;
  let read = false;
  const events = [];
  for (const id of calendars) {
    const list = response[id]?.events;
    if (!Array.isArray(list)) continue;
    read = true;
    for (const e2 of list.slice(0, EVENTS_PER_CALENDAR)) {
      const { start, summary } = e2 ?? {};
      events.push({ startSec: eventStartSec(start), title: String(summary ?? "") });
    }
  }
  return read ? events : null;
}
function attributeEvents(calendars, state) {
  const events = [];
  for (const id of calendars) {
    const attrs = state(id)?.attributes;
    if (!attrs || typeof attrs.start_time !== "string") continue;
    events.push({ startSec: attrs.all_day === true ? 0 : eventStartSec(attrs.start_time), title: String(attrs.message ?? "") });
  }
  return events;
}
function upcomingEvents(events, nowSec) {
  const seen = /* @__PURE__ */ new Set();
  return events.filter((e2) => e2.startSec > 0 && e2.startSec + EVENT_GRACE_SEC > nowSec).filter((e2) => {
    const key = `${e2.startSec}\0${e2.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a2, b2) => a2.startSec - b2.startSec).slice(0, MAX_EVENTS).map((e2) => ({ startSec: e2.startSec, title: cutUtf8(e2.title, MAX_TITLE_BYTES) }));
}
function eventLines(events, nowSec) {
  return events.slice(0, MAX_EVENTS).map((e2, i2) => ({
    start: formatEventStart(e2.startSec, nowSec),
    startColor: i2 === 0 ? DASH_CYAN : DASH_GREY,
    title: dotTitle(e2.title || "event")
  }));
}
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
function dashboardPreview(dashboard, layout, state, now, hiLo, options = {}) {
  const stale = options.stale === true;
  const isOn = (entityId) => DASH_ACTIVE_STATES.has(state(entityId)?.state ?? "");
  const { check, pills } = statusStrip(litGlyphs(dashboard.statusGroups ?? [], isOn), stale);
  const temps = [];
  let home = 0;
  let haveBeacons = false;
  let freezerAlarm = null;
  let deadFreezer = false;
  for (const group of (dashboard.sensorGroups ?? []).slice(0, 3)) {
    for (const sensor of (group.sensors ?? []).slice(0, 7)) {
      const s2 = state(sensor.entity);
      switch (group.type.toLowerCase()) {
        case "thermostats": {
          const v2 = reading(sensor.entity, s2);
          if (v2 !== null) temps.push(v2);
          break;
        }
        case "beacons": {
          const p2 = presence(s2);
          if (p2 !== null) {
            haveBeacons = true;
            home += p2;
          }
          break;
        }
        case "freezers": {
          const v2 = reading(sensor.entity, s2);
          if (v2 === null) deadFreezer = true;
          else if (v2 > freezerThreshold(s2) && (freezerAlarm === null || v2 > freezerAlarm)) freezerAlarm = v2;
          break;
        }
      }
    }
  }
  const weatherState = dashboard.weather?.entity ? state(dashboard.weather.entity) : void 0;
  const icon = weatherState ? weatherIcon(weatherState.state) : null;
  const tempRaw = Number(weatherState?.attributes?.temperature);
  const weatherTemp = icon !== null && weatherState?.attributes?.temperature != null && Number.isFinite(tempRaw) ? Math.round(tempRaw) : null;
  const nowSec = Math.floor(now.getTime() / 1e3);
  const calendars = dashboardCalendars(dashboard, layout);
  const candidates = options.events ?? attributeEvents(calendars, state);
  return {
    date: `${DAYS[now.getDay()]} ${now.getDate()}`,
    weatherIcon: weatherTemp !== null ? icon : null,
    weatherTemp,
    hiLo: weatherTemp !== null && hiLo ? `${hiLo[0]}/${hiLo[1]}` : null,
    clock: formatClock(now, layout.header?.time?.format),
    events: eventLines(upcomingEvents(candidates, nowSec), nowSec),
    check,
    pills,
    freezer: freezerAlarm !== null ? `!${freezerAlarm}°` : deadFreezer ? "!--" : null,
    thermostats: temps.slice(0, 2).map((t2) => `${t2}°`).join(" "),
    thermostatColor: stale ? DASH_GREY : DASH_WHITE,
    home: haveBeacons ? home : null,
    stale
  };
}
var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __decorateClass$1 = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc$1(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp$1(target, key, result);
  return result;
};
const TABS = EDITOR_TABS;
const defineEditor = (tagName) => {
  return (classOrDescriptor) => {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, classOrDescriptor);
    }
    return classOrDescriptor;
  };
};
let InfinassistantWatchfaceEditor = class extends i {
  constructor() {
    super(...arguments);
    this._config = DEFAULT_CONFIG;
    this._activeTab = "settings";
    this._selectedTileIndex = -1;
    this._selectedScreenIndex = 0;
    this._selectedScreenTileIndex = -1;
    this._validation = null;
    this._watchLayout = null;
    this._simulator = {
      garage: "closed",
      media: "idle",
      presence: "home",
      notifications: 0,
      bluetooth: true,
      battery: 75
    };
    this._unsubscribers = [];
    this._searchFilters = {};
    this._deviceFilters = {};
    this._devices = [];
    this._deviceActions = {};
    this._infinassistantDevices = [];
    this._activeIconPicker = null;
    this._isLoadingDevices = false;
    this._isLoadingInfinassistantDevices = false;
    this._loadError = null;
    this._discoveredLogbookCards = [];
    this._isLoadingLogbookCards = false;
    this._showLogbookCardPicker = false;
    this._logbookImportMessage = null;
    this._searchAllDashboards = false;
    this.AVAILABLE_ICONS = {
      "Doors & Windows": ["🚪", "🪟", "🔒", "🔓", "🔐"],
      "Garage & Vehicles": ["🚗", "🚙", "🚕", "🚐", "🏍️", "🚲", "🛻"],
      "People": ["👤", "👥", "🚶", "🚶‍♂️", "🚶‍♀️", "👨", "👩", "👶"],
      "Home & Rooms": ["🏠", "🏡", "🛏️", "🛋️", "🚿", "🧺"],
      "Motion & Security": ["👁️", "📹", "🔔", "🚨", "⚠️"],
      "Lights": ["💡", "🔆", "🔅", "🕯️", "💡"],
      "Media": ["🔊", "📺", "📻", "🎵", "🎶", "🎙️", "📢"],
      "Climate": ["🌡️", "❄️", "🔥", "💨", "💧", "☀️", "🌙"],
      "Appliances": ["🔌", "⚡", "🔋", "📱", "💻", "⌚"],
      "Status": ["✓", "✗", "●", "○", "▪", "▫", "✦", "★"],
      "Letters": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
    };
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribers.forEach((unsub) => unsub());
    this._unsubscribers = [];
  }
  setConfig(config) {
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      theme: { ...DEFAULT_CONFIG.theme, ...config.theme },
      header: {
        ...DEFAULT_CONFIG.header,
        ...config.header,
        time: { ...DEFAULT_CONFIG.header.time, ...config.header?.time },
        presence: {
          ...DEFAULT_CONFIG.header.presence,
          ...config.header?.presence,
          icons: config.header?.presence?.icons || []
        }
      },
      events: { ...DEFAULT_CONFIG.events, ...config.events },
      status_bar: {
        ...DEFAULT_CONFIG.status_bar,
        ...config.status_bar,
        sources: { ...DEFAULT_CONFIG.status_bar.sources, ...config.status_bar?.sources }
      },
      advanced: {
        ...DEFAULT_CONFIG.advanced,
        ...config.advanced,
        debug: { ...DEFAULT_CONFIG.advanced.debug, ...config.advanced?.debug }
      },
      tiles: config.tiles || [],
      actions: config.actions || [],
      screens: config.screens || [],
      logbook_app: config.logbook_app ? { ...config.logbook_app } : void 0,
      home_control: config.home_control ? {
        devices: [...config.home_control.devices || []]
      } : void 0
    };
    const headerPresence = config.header?.presence;
    if (headerPresence && headerPresence.enabled && this._config.screens) {
      const firstDashIdx = this._config.screens.findIndex((s2) => s2.screenType === "dashboard");
      if (firstDashIdx >= 0 && !this._config.screens[firstDashIdx].dashboard?.presence) {
        const screens = [...this._config.screens];
        const s2 = screens[firstDashIdx];
        screens[firstDashIdx] = {
          ...s2,
          dashboard: {
            ...s2.dashboard || { statusGroups: [], sensorGroups: [] },
            presence: { ...headerPresence, icons: [...headerPresence.icons || []] }
          }
        };
        this._config = { ...this._config, screens };
      }
    }
    this._updateValidation();
  }
  updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("hass")) {
      this._updateValidation();
    }
  }
  _updateValidation() {
    this._validation = validateConfig(this._config, this.hass);
    this._watchLayout = exportWatchLayout(this._config);
  }
  _fireConfigChanged() {
    this._updateValidation();
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
  _updateConfig(key, value) {
    this._config = { ...this._config, [key]: value };
    this._fireConfigChanged();
  }
  _getEntities(...domains) {
    if (!this.hass) return [];
    const entities = Object.keys(this.hass.states);
    if (domains.length === 0) {
      return entities;
    }
    return entities.filter((e2) => domains.some((domain) => e2.startsWith(domain + ".")));
  }
  _getEntitiesByDevice(deviceId) {
    if (!this.hass || !deviceId) return [];
    const entities = Object.values(this.hass.states);
    return entities.filter((entity) => {
      const attrs = entity.attributes;
      return attrs.device_id === deviceId;
    }).map((entity) => entity.entity_id);
  }
  _filterEntities(entities, searchText, deviceId) {
    let filtered = entities;
    if (deviceId) {
      const deviceEntities = this._getEntitiesByDevice(deviceId);
      filtered = filtered.filter((e2) => deviceEntities.includes(e2));
    }
    if (searchText && searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter((e2) => {
        const entityName = e2.toLowerCase();
        const friendlyName = this.hass?.states[e2]?.attributes?.friendly_name?.toLowerCase() || "";
        return entityName.includes(search) || friendlyName.includes(search);
      });
    }
    return filtered;
  }
  _renderSearchableEntitySelect(filterId, currentValue, domains, onChange, placeholder = "Select entity...") {
    const searchText = this._searchFilters[filterId] || "";
    const deviceFilter = this._deviceFilters[filterId] || "";
    const allEntities = this._getEntities(...domains);
    const filteredEntities = this._filterEntities(allEntities, searchText, deviceFilter);
    const showDropdown = searchText.length > 0 || deviceFilter.length > 0;
    return b`
      <div class="searchable-select">
        <input
          type="text"
          .value=${currentValue}
          @input=${(e2) => {
      const value = e2.target.value;
      this._searchFilters = { ...this._searchFilters, [filterId]: value };
      this.requestUpdate();
    }}
          @focus=${() => {
      if (!this._searchFilters[filterId]) {
        this._searchFilters = { ...this._searchFilters, [filterId]: "" };
        this.requestUpdate();
      }
    }}
          placeholder=${placeholder}
          autocomplete="off"
        />
        ${showDropdown && filteredEntities.length > 0 ? b`
              <div class="entity-dropdown" role="listbox" aria-label="Entity suggestions">
                ${filteredEntities.slice(0, 50).map(
      (entity) => {
        const friendlyName = this.hass?.states[entity]?.attributes?.friendly_name || entity;
        return b`
                      <div
                        class="entity-option ${entity === currentValue ? "selected" : ""}"
                        role="option"
                        tabindex="0"
                        aria-selected=${entity === currentValue}
                        @click=${() => {
          onChange(entity);
          this._searchFilters = { ...this._searchFilters, [filterId]: "" };
          this.requestUpdate();
        }}
                        @keydown=${(e2) => {
          if (e2.key === "Enter" || e2.key === " ") {
            e2.preventDefault();
            onChange(entity);
            this._searchFilters = { ...this._searchFilters, [filterId]: "" };
            this.requestUpdate();
          }
        }}
                      >
                        <span class="entity-name">${entity}</span>
                        <span class="entity-friendly">${friendlyName}</span>
                      </div>
                    `;
      }
    )}
                ${filteredEntities.length > 50 ? b`<div class="entity-option-info">Showing first 50 of ${filteredEntities.length} results. Refine your search.</div>` : A}
              </div>
            ` : showDropdown ? b`<div class="entity-dropdown"><div class="entity-option-info">No entities found</div></div>` : A}
      </div>
    `;
  }
  _renderDeviceFilter(filterId) {
    if (this._devices.length === 0) {
      this._loadDevices();
    }
    const currentDevice = this._deviceFilters[filterId] || "";
    return b`
      <div class="device-filter">
        <label style="font-size: 11px; color: var(--secondary-text-color);">Filter by device:</label>
        <select
          .value=${currentDevice}
          @change=${(e2) => {
      const value = e2.target.value;
      this._deviceFilters = { ...this._deviceFilters, [filterId]: value };
      this.requestUpdate();
    }}
          style="font-size: 12px; padding: 4px;"
        >
          <option value="">All devices</option>
          ${this._devices.map(
      (device) => b`
              <option value="${device.id}">${device.name}</option>
            `
    )}
        </select>
      </div>
    `;
  }
  _renderIconPicker(filterId, currentValue, onSelect) {
    const isOpen = this._activeIconPicker === filterId;
    return b`
      <div class="icon-picker-container">
        <button
          class="icon-picker-button"
          @click=${() => {
      this._activeIconPicker = isOpen ? null : filterId;
      this.requestUpdate();
    }}
          title="Pick an icon"
          aria-label="Pick an icon"
          aria-expanded=${isOpen}
          aria-haspopup="dialog"
        >
          ${currentValue || "📝"}
        </button>
        ${isOpen ? b`
              <div class="icon-picker-dropdown">
                <div class="icon-picker-header">
                  <span>Select Icon</span>
                  <button
                    class="icon-picker-close"
                    aria-label="Close icon picker"
                    @click=${() => {
      this._activeIconPicker = null;
      this.requestUpdate();
    }}
                  >
                    \u2715
                  </button>
                </div>
                <div class="icon-picker-content">
                  ${Object.entries(this.AVAILABLE_ICONS).map(
      ([category, icons]) => b`
                      <div class="icon-category">
                        <div class="icon-category-label">${category}</div>
                        <div class="icon-grid">
                          ${icons.map(
        (icon) => b`
                              <button
                                class="icon-option ${icon === currentValue ? "selected" : ""}"
                                @click=${() => {
          onSelect(icon);
          this._activeIconPicker = null;
          this.requestUpdate();
        }}
                                title=${icon}
                                aria-label="Select icon ${icon}"
                                aria-pressed=${icon === currentValue}
                              >
                                ${icon}
                              </button>
                            `
      )}
                        </div>
                      </div>
                    `
    )}
                </div>
              </div>
            ` : A}
      </div>
    `;
  }
  async _loadDevices() {
    if (!this.hass) return;
    if (this._isLoadingDevices) return;
    this._isLoadingDevices = true;
    try {
      const conn = this.hass.connection;
      if (!conn) {
        this._isLoadingDevices = false;
        return;
      }
      const result = await conn.sendMessagePromise({
        type: "config/device_registry/list"
      });
      if (result && Array.isArray(result)) {
        this._devices = result.filter((d2) => !d2.disabled_by).map((d2) => ({
          id: d2.id,
          name: d2.name_by_user || d2.name || d2.id
        })).sort((a2, b2) => a2.name.localeCompare(b2.name));
      }
      this._loadError = null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load devices";
      console.warn("Failed to load devices:", err);
      this._loadError = errorMsg;
    } finally {
      this._isLoadingDevices = false;
    }
  }
  async _loadInfinassistantDevices() {
    if (!this.hass) return;
    if (this._isLoadingInfinassistantDevices) return;
    this._isLoadingInfinassistantDevices = true;
    try {
      const conn = this.hass.connection;
      if (!conn) {
        this._isLoadingInfinassistantDevices = false;
        return;
      }
      const devices = await conn.sendMessagePromise({
        type: "config/device_registry/list"
      });
      const infinassistantDevices = [];
      if (devices && Array.isArray(devices)) {
        for (const device of devices) {
          const identifiers = device.identifiers || [];
          for (const [domain, deviceId] of identifiers) {
            if (domain === "infinassistant") {
              const name = device.name || device.name_by_user || deviceId;
              infinassistantDevices.push({ device_id: deviceId, name });
              break;
            }
          }
        }
      }
      this._infinassistantDevices = infinassistantDevices;
      if (infinassistantDevices.length === 1 && !this._config.device_id) {
        this._updateConfig("device_id", infinassistantDevices[0].device_id);
      }
      this._loadError = null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load InfinAssistant devices";
      console.warn("Failed to load InfinAssistant devices:", err);
      this._loadError = errorMsg;
    } finally {
      this._isLoadingInfinassistantDevices = false;
    }
  }
  async _loadDeviceActions(deviceId) {
    if (!this.hass || !deviceId) return;
    try {
      const conn = this.hass.connection;
      if (!conn) return;
      const result = await conn.sendMessagePromise({
        type: "device_automation/action/list",
        device_id: deviceId
      });
      if (result && Array.isArray(result)) {
        this._deviceActions[deviceId] = result.map((da) => ({
          type: da.type,
          subtype: da.subtype,
          description: da.metadata?.name || da.type + (da.subtype ? " - " + da.subtype : "")
        }));
      }
    } catch (err) {
      console.warn("Failed to load device actions:", err);
    }
  }
  _extractLogbookCardsFromConfig(config, dashboardTitle) {
    const results = [];
    if (!config || !Array.isArray(config.views)) return results;
    for (const view of config.views) {
      const viewTitle = view.title || view.path || "Untitled view";
      const cards = view.cards || [];
      this._findLogbookCards(cards, dashboardTitle, viewTitle, results);
    }
    return results;
  }
  _findLogbookCards(cards, dashboardTitle, viewTitle, results) {
    for (const card of cards) {
      if (!card) continue;
      if (card.type === "logbook") {
        const entities = [];
        const targetEntities = card.target?.entity_id;
        if (Array.isArray(targetEntities)) {
          entities.push(...targetEntities.filter((e2) => typeof e2 === "string" && e2.length > 0));
        } else if (typeof targetEntities === "string" && targetEntities.length > 0) {
          entities.push(targetEntities);
        }
        if (entities.length === 0 && Array.isArray(card.entities)) {
          for (const e2 of card.entities) {
            const id = typeof e2 === "string" ? e2 : e2?.entity;
            if (typeof id === "string" && id.length > 0) entities.push(id);
          }
        }
        if (entities.length > 0) {
          results.push({
            title: card.title || "Logbook",
            entities,
            dashboardTitle,
            viewTitle
          });
        }
      }
      if (Array.isArray(card.cards)) {
        this._findLogbookCards(card.cards, dashboardTitle, viewTitle, results);
      }
      if (Array.isArray(card.card?.cards)) {
        this._findLogbookCards(card.card.cards, dashboardTitle, viewTitle, results);
      }
      if (card.card && card.card.type) {
        this._findLogbookCards([card.card], dashboardTitle, viewTitle, results);
      }
    }
  }
  async _loadLogbookCards() {
    if (this._isLoadingLogbookCards) return;
    this._isLoadingLogbookCards = true;
    this._discoveredLogbookCards = [];
    this._logbookImportMessage = null;
    try {
      const allCards = [];
      if (this.lovelace?.config) {
        const local = this._extractLogbookCardsFromConfig(
          this.lovelace.config,
          "Current dashboard"
        );
        allCards.push(...local);
      }
      if (this._searchAllDashboards || allCards.length === 0) {
        const conn = this.hass?.connection;
        if (conn) {
          try {
            const defaultConfig = await conn.sendMessagePromise({
              type: "lovelace/config"
            });
            if (defaultConfig) {
              const cards = this._extractLogbookCardsFromConfig(defaultConfig, "Overview");
              allCards.push(...cards);
            }
          } catch {
          }
          try {
            const dashboards = await conn.sendMessagePromise({
              type: "lovelace/dashboards"
            });
            if (Array.isArray(dashboards)) {
              for (const db of dashboards) {
                if (!db.url_path) continue;
                try {
                  const dbConfig = await conn.sendMessagePromise({
                    type: "lovelace/config",
                    url_path: db.url_path
                  });
                  if (dbConfig) {
                    const title = db.title || db.url_path;
                    const cards = this._extractLogbookCardsFromConfig(dbConfig, title);
                    allCards.push(...cards);
                  }
                } catch {
                }
              }
            }
          } catch {
          }
        }
      }
      const seen = /* @__PURE__ */ new Set();
      const deduped = [];
      for (const card of allCards) {
        const key = [...card.entities].sort().join("|");
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(card);
        }
      }
      this._discoveredLogbookCards = deduped;
    } catch (err) {
      console.warn("Failed to discover logbook cards:", err);
    } finally {
      this._isLoadingLogbookCards = false;
    }
  }
  _importLogbookEntities(card, screenIndex) {
    const screens = this._config.screens || [];
    const screen = screens[screenIndex];
    if (!screen) return;
    const logbook = screen.logbook || { entityIds: [], maxEntries: 15, hoursBack: 12 };
    const existing = new Set(logbook.entityIds);
    const maxEntities = 10;
    let added = 0;
    let duplicates = 0;
    let skipped = 0;
    const newIds = [...logbook.entityIds];
    for (const entityId of card.entities) {
      if (existing.has(entityId)) {
        duplicates++;
        continue;
      }
      if (newIds.length >= maxEntities) {
        skipped++;
        continue;
      }
      newIds.push(entityId);
      existing.add(entityId);
      added++;
    }
    this._updateScreenLogbook(screenIndex, { ...logbook, entityIds: newIds });
    const parts = [];
    if (added > 0) parts.push(`Added ${added} ${added === 1 ? "entity" : "entities"}`);
    if (duplicates > 0) parts.push(`${duplicates} already existed`);
    if (skipped > 0) parts.push(`${skipped} skipped (limit of ${maxEntities})`);
    this._logbookImportMessage = parts.join(", ") || "No entities to add";
    this._showLogbookCardPicker = false;
  }
  _renderEntityInput(value, onChange, domain, placeholder) {
    const entities = this._getEntities(domain ?? "");
    const datalistId = `entities-${domain || "all"}-${Math.random().toString(36).substr(2, 9)}`;
    return b`
      <input
        type="text"
        .value=${value}
        @input=${(e2) => onChange(e2.target.value)}
        list=${datalistId}
        placeholder=${placeholder || "Select entity..."}
        autocomplete="off"
      />
      <datalist id=${datalistId}>
        ${entities.map((entity) => b`<option value=${entity}></option>`)}
      </datalist>
    `;
  }
  render() {
    const tabBadges = this._validation ? getTabBadgeCounts(this._validation) : null;
    return b`
      <div class="editor-container">
        ${this._loadError ? this._renderLoadError() : A}
        ${this._renderTabs(tabBadges)}
        <div class="tab-content" role="tabpanel" aria-label="${this._activeTab} settings">
          ${this._renderActiveTab()}
        </div>
        ${this._renderTabValidation()}
      </div>
    `;
  }
  _renderLoadError() {
    return b`
      <div class="load-error-banner" role="alert">
        <span class="error-icon">\u274C</span>
        <span class="error-message">${this._loadError}</span>
        <button
          class="retry-button"
          aria-label="Retry loading devices"
          @click=${() => {
      this._loadError = null;
      this._loadDevices();
      this._loadInfinassistantDevices();
    }}
        >
          Retry
        </button>
      </div>
    `;
  }
  _renderTabs(badges) {
    return b`
      <div class="tabs-header" role="tablist" aria-label="Editor sections">
        ${TABS.map(
      (tab) => b`
            <button
              class="tab-button ${this._activeTab === tab.id ? "active" : ""}"
              role="tab"
              aria-selected=${this._activeTab === tab.id}
              aria-controls="tab-content"
              tabindex=${this._activeTab === tab.id ? "0" : "-1"}
              @click=${() => this._activeTab = tab.id}
              @keydown=${(e2) => {
        const tabIds = TABS.map((t2) => t2.id);
        const currentIndex = tabIds.indexOf(this._activeTab);
        if (e2.key === "ArrowRight" || e2.key === "ArrowDown") {
          e2.preventDefault();
          const nextIndex = (currentIndex + 1) % tabIds.length;
          this._activeTab = tabIds[nextIndex];
          this.shadowRoot?.querySelector(`[role="tab"][aria-selected="true"]`)?.focus();
        } else if (e2.key === "ArrowLeft" || e2.key === "ArrowUp") {
          e2.preventDefault();
          const prevIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
          this._activeTab = tabIds[prevIndex];
          this.shadowRoot?.querySelector(`[role="tab"][aria-selected="true"]`)?.focus();
        } else if (e2.key === "Home") {
          e2.preventDefault();
          this._activeTab = tabIds[0];
          this.shadowRoot?.querySelector(`[role="tab"][aria-selected="true"]`)?.focus();
        } else if (e2.key === "End") {
          e2.preventDefault();
          this._activeTab = tabIds[tabIds.length - 1];
          this.shadowRoot?.querySelector(`[role="tab"][aria-selected="true"]`)?.focus();
        }
      }}
            >
              ${tab.label}
              ${badges && badges[tab.id] && badges[tab.id].errors > 0 ? b`<span class="tab-badge error">${badges[tab.id].errors}</span>` : badges && badges[tab.id] && badges[tab.id].warnings > 0 ? b`<span class="tab-badge warning">${badges[tab.id].warnings}</span>` : A}
            </button>
          `
    )}
      </div>
    `;
  }
  _renderActiveTab() {
    switch (this._activeTab) {
      case "settings":
        return this._renderSettingsTab();
      case "screens":
        return this._renderScreensTab();
      case "calendar":
        return this._renderEventsTab();
      case "logbook":
        return this._renderLogbookTab();
      case "home_control":
        return this._renderHomeControlTab();
      default:
        return b`<p>Select a tab</p>`;
    }
  }
  _renderTabValidation() {
    if (!this._validation) return b``;
    const messages = this._validation.byTab[this._activeTab] || [];
    if (messages.length === 0) return b``;
    return b`
      <div class="validation-messages" role="status" aria-label="Validation messages for ${this._activeTab} tab">
        ${messages.map(
      (msg) => b`
            <div class="validation-message ${msg.severity}" role="${msg.severity === "error" ? "alert" : "status"}">
              ${msg.severity === "error" ? "❌" : msg.severity === "warning" ? "⚠️" : "ℹ️"}
              ${msg.message}
            </div>
          `
    )}
      </div>
    `;
  }
  // ========== SETTINGS TAB (merged: Layout + Header + Status Bar + Advanced) ==========
  _renderSettingsTab() {
    if (this._infinassistantDevices.length === 0) {
      this._loadInfinassistantDevices();
    }
    return b`
      <div class="form-section">
        <div class="form-section-title">General</div>
        <div class="form-row">
          <div class="form-field">
            <label>Face Name</label>
            <input
              type="text"
              .value=${this._config.name || ""}
              @input=${(e2) => this._updateConfig("name", e2.target.value)}
              placeholder="InfinAssistant"
            />
          </div>
          <div class="form-field">
            <label>Watch Device</label>
            ${this._infinassistantDevices.length > 0 ? b`
                  <select
                    @change=${(e2) => {
      const value = e2.target.value;
      this._updateConfig("device_id", value);
    }}
                  >
                    <option value="" ?selected=${!this._config.device_id}>Select a watch...</option>
                    ${this._infinassistantDevices.map(
      (device) => b`
                        <option value="${device.device_id}" ?selected=${this._config.device_id === device.device_id}>${device.name}</option>
                      `
    )}
                  </select>
                  <p style="font-size: 11px; color: var(--secondary-text-color); margin: 4px 0 0;">
                    Select your PineTime watch to enable "Push to Watch"
                  </p>
                ` : b`
                  <input
                    type="text"
                    .value=${this._config.device_id || ""}
                    @input=${(e2) => this._updateConfig("device_id", e2.target.value)}
                    placeholder="my_pinetime"
                  />
                  <p style="font-size: 11px; color: var(--warning-color, orange); margin: 4px 0 0;">
                    No InfinAssistant watches found. Add the InfinAssistant integration first, or enter device ID manually.
                  </p>
                `}
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Theme Preset</label>
            <select
              .value=${this._config.theme.preset}
              @change=${(e2) => this._updateConfig("theme", {
      ...this._config.theme,
      preset: e2.target.value
    })}
            >
              <option value="charcoal">Charcoal</option>
              <option value="black">Black</option>
            </select>
          </div>
          <div class="form-field">
            <label>Accent Color</label>
            <input
              type="color"
              .value=${this._config.theme.accent || "#18A1FF"}
              @input=${(e2) => this._updateConfig("theme", {
      ...this._config.theme,
      accent: e2.target.value
    })}
            />
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Time Display</div>
        <div class="form-row">
          <div class="form-field">
            <label>Format</label>
            <select
              .value=${this._config.header.time.format}
              @change=${(e2) => this._updateConfig("header", {
      ...this._config.header,
      time: {
        ...this._config.header.time,
        format: e2.target.value
      }
    })}
            >
              <option value="HH:mm">24-hour (HH:mm)</option>
              <option value="hh:mm">12-hour (hh:mm)</option>
            </select>
          </div>
          <div class="form-field">
            <label>Alignment</label>
            <select
              .value=${this._config.header.time.align}
              @change=${(e2) => this._updateConfig("header", {
      ...this._config.header,
      time: {
        ...this._config.header.time,
        align: e2.target.value
      }
    })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Status Bar</div>
        <div class="toggle-row">
          <span class="toggle-label">Enable status bar</span>
          <input
            type="checkbox"
            .checked=${this._config.status_bar.enabled}
            @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      enabled: e2.target.checked
    })}
          />
        </div>

        ${this._config.status_bar.enabled ? b`
              <div class="form-section-title" style="margin-top: 16px">Indicators</div>

              <div class="toggle-row">
                <span class="toggle-label">Battery</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.battery}
                  @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      battery: e2.target.checked
    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Bluetooth</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.bluetooth}
                  @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      bluetooth: e2.target.checked
    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Steps</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.steps}
                  @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      steps: e2.target.checked
    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Heart Rate</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.heart_rate}
                  @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      heart_rate: e2.target.checked
    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Notifications</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.notifications}
                  @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      notifications: e2.target.checked
    })}
                />
              </div>

              <div class="form-section-title" style="margin-top: 16px">Custom Entity Sources (Optional)</div>

              <div class="form-row column">
                <div class="form-field">
                  <label>Steps Entity</label>
                  ${this._renderEntityInput(
      this._config.status_bar.sources.steps_entity || "",
      (value) => this._updateConfig("status_bar", {
        ...this._config.status_bar,
        sources: {
          ...this._config.status_bar.sources,
          steps_entity: value || null
        }
      }),
      "sensor",
      "sensor.steps"
    )}
                </div>
                <div class="form-field">
                  <label>Heart Rate Entity</label>
                  ${this._renderEntityInput(
      this._config.status_bar.sources.hr_entity || "",
      (value) => this._updateConfig("status_bar", {
        ...this._config.status_bar,
        sources: {
          ...this._config.status_bar.sources,
          hr_entity: value || null
        }
      }),
      "sensor",
      "sensor.heart_rate"
    )}
                </div>
                <div class="form-field">
                  <label>Notifications Entity</label>
                  ${this._renderEntityInput(
      this._config.status_bar.sources.notifications_entity || "",
      (value) => this._updateConfig("status_bar", {
        ...this._config.status_bar,
        sources: {
          ...this._config.status_bar.sources,
          notifications_entity: value || null
        }
      }),
      "sensor",
      "sensor.notifications"
    )}
                </div>
              </div>
            ` : A}
      </div>

      <div class="form-section">
        <div class="form-section-title">Advanced</div>

        <div class="toggle-row">
          <span class="toggle-label">Enable compression</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.compression}
            @change=${(e2) => this._updateConfig("advanced", {
      ...this._config.advanced,
      compression: e2.target.checked
    })}
          />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Min Update Interval (ms)</label>
            <input
              type="number"
              min="100"
              max="60000"
              .value=${String(this._config.advanced.min_update_interval_ms)}
              @input=${(e2) => this._updateConfig("advanced", {
      ...this._config.advanced,
      min_update_interval_ms: parseInt(e2.target.value, 10) || 1e3
    })}
            />
          </div>
          <div class="form-field">
            <label>Full Refresh (minutes)</label>
            <input
              type="number"
              min="1"
              max="60"
              .value=${String(this._config.advanced.full_refresh_minutes)}
              @input=${(e2) => this._updateConfig("advanced", {
      ...this._config.advanced,
      full_refresh_minutes: parseInt(e2.target.value, 10) || 15
    })}
            />
          </div>
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Show bounds overlay</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.debug.show_bounds}
            @change=${(e2) => this._updateConfig("advanced", {
      ...this._config.advanced,
      debug: {
        ...this._config.advanced.debug,
        show_bounds: e2.target.checked
      }
    })}
          />
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Show truncation markers</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.debug.show_truncation}
            @change=${(e2) => this._updateConfig("advanced", {
      ...this._config.advanced,
      debug: {
        ...this._config.advanced.debug,
        show_truncation: e2.target.checked
      }
    })}
          />
        </div>

        <p style="font-size: 12px; color: var(--secondary-text-color); margin-top: 8px;">
          Estimated payload size: ${this._watchLayout ? Math.round(estimatePayloadSize(this._watchLayout) / 1024 * 10) / 10 : 0} KB
        </p>
      </div>
    `;
  }
  _applyDefaultTemplate() {
    const newConfig = {
      ...this._config,
      tiles: [
        { ...DEFAULT_TILE_CONFIG, enabled: true, label: "DOORS", icon: "door", type: "count", entity: "" },
        { ...DEFAULT_TILE_CONFIG, enabled: true, label: "GARAGE", icon: "garage", type: "cover_state", entity: "" },
        { ...DEFAULT_TILE_CONFIG, enabled: true, label: "LIGHTS", icon: "light", type: "count", entity: "" },
        { ...DEFAULT_TILE_CONFIG, enabled: true, label: "TEMP", icon: "home", type: "sensor_value", entity: "" }
      ],
      actions: [
        { ...DEFAULT_ACTION_CONFIG, enabled: true, label: "GARAGE", icon: "garage", action: "cover.toggle", entity: "" },
        { ...DEFAULT_ACTION_CONFIG, enabled: true, label: "LIGHTS", icon: "light", action: "toggle", entity: "" },
        { ...DEFAULT_ACTION_CONFIG, enabled: true, label: "MUSIC", icon: "music", action: "media.play_pause", entity: "" }
      ]
    };
    this._config = newConfig;
    this._fireConfigChanged();
  }
  _renderPresenceIconItem(icon, index) {
    return b`
      <div class="list-item">
        <span class="drag-handle" aria-hidden="true">\u2630</span>
        <div class="list-item-content">
          <select
            .value=${icon.icon}
            @change=${(e2) => this._updatePresenceIcon(index, {
      ...icon,
      icon: e2.target.value
    })}
          >
            ${getPresenceGlyphOptions().map(
      (opt) => b`<option value=${opt.value}>${opt.label}</option>`
    )}
          </select>
          <div style="flex: 1">
            ${this._renderEntityInput(
      icon.entity,
      (value) => this._updatePresenceIcon(index, { ...icon, entity: value }),
      void 0,
      "person.john"
    )}
          </div>
        </div>
        <div class="list-item-actions">
          <button aria-label="Remove presence icon ${index + 1}" @click=${() => this._removePresenceIcon(index)}>\u2715</button>
        </div>
      </div>
    `;
  }
  _addPresenceIcon() {
    const icons = [...this._config.header.presence.icons];
    icons.push({
      icon: "person_male",
      entity: "",
      hide_if_unknown: false
    });
    this._updateConfig("header", {
      ...this._config.header,
      presence: { ...this._config.header.presence, icons }
    });
  }
  _updatePresenceIcon(index, icon) {
    const icons = [...this._config.header.presence.icons];
    icons[index] = icon;
    this._updateConfig("header", {
      ...this._config.header,
      presence: { ...this._config.header.presence, icons }
    });
  }
  _removePresenceIcon(index) {
    const icons = this._config.header.presence.icons.filter((_2, i2) => i2 !== index);
    this._updateConfig("header", {
      ...this._config.header,
      presence: { ...this._config.header.presence, icons }
    });
  }
  // ========== SCREENS TAB ==========
  _renderScreensTab() {
    const screens = this._config.screens || [];
    const maxScreens = MAX_SCREENS;
    return b`
      <div class="form-section">
        <div class="form-section-title">Multi-Screen Configuration</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 16px;">
          Configure up to ${maxScreens} swipeable screens. Screen 0 is typically a dashboard, Screens 1-${maxScreens - 1} can be tile/action screens.
        </p>

        ${screens.length === 0 ? b`
              <p style="color: var(--secondary-text-color)">No screens configured. Add a screen to get started.</p>
            ` : b`
              <div class="screens-list" style="margin-bottom: 16px;">
                ${screens.map((screen, index) => this._renderScreenListItem(screen, index))}
              </div>
            `}

        ${screens.length < maxScreens ? b`
              <button class="add-item-button" @click=${this._addScreen}>
                + Add Screen
              </button>
            ` : b`
              <p style="color: var(--warning-color); font-size: 12px;">
                Maximum ${maxScreens} screens reached
              </p>
            `}
      </div>

      ${this._selectedScreenIndex >= 0 && this._selectedScreenIndex < screens.length ? this._renderScreenEditor(screens[this._selectedScreenIndex], this._selectedScreenIndex) : A}
    `;
  }
  _renderScreenListItem(screen, index) {
    const isSelected = this._selectedScreenIndex === index;
    const screenTypeName = screen.screenType === "dashboard" ? "Dashboard" : screen.screenType === "logbook" ? "Tiles" : "Tiles";
    return b`
      <div
        class="list-item ${isSelected ? "selected" : ""}"
        role="button"
        tabindex="0"
        aria-label="Screen ${index}: ${screenTypeName}${screen.name ? " - " + screen.name : ""}"
        aria-pressed=${isSelected}
        @click=${() => this._selectedScreenIndex = index}
        @keydown=${(e2) => {
      if (e2.key === "Enter" || e2.key === " ") {
        e2.preventDefault();
        this._selectedScreenIndex = index;
      }
    }}
        style="cursor: pointer; padding: 12px; margin-bottom: 8px; border-radius: 4px; background: var(--secondary-background-color);"
      >
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-weight: bold; color: var(--primary-text-color);">Screen ${index}</span>
          <span style="color: var(--secondary-text-color); font-size: 12px;">${screenTypeName}</span>
          ${screen.name ? b`<span style="color: var(--secondary-text-color); font-size: 12px;">- ${screen.name}</span>` : A}
        </div>
        <div class="list-item-actions" style="margin-left: auto;">
          ${index > 0 ? b`<button aria-label="Move screen ${index} up" @click=${(e2) => {
      e2.stopPropagation();
      this._moveScreen(index, -1);
    }}>\u2191</button>` : A}
          ${index < (this._config.screens || []).length - 1 ? b`<button aria-label="Move screen ${index} down" @click=${(e2) => {
      e2.stopPropagation();
      this._moveScreen(index, 1);
    }}>\u2193</button>` : A}
          <button aria-label="Remove screen ${index}" @click=${(e2) => {
      e2.stopPropagation();
      this._removeScreen(index);
    }}>\u2715</button>
        </div>
      </div>
    `;
  }
  _renderScreenEditor(screen, index) {
    return b`
      <div class="form-section" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--divider-color);">
        <div class="form-section-title">Screen ${index} Configuration</div>

        <div class="form-row">
          <div class="form-field">
            <label>Screen Type</label>
            <select
              .value=${screen.screenType === "dashboard" ? "dashboard" : "tiles"}
              @change=${(e2) => this._updateScreen(index, {
      ...screen,
      screenType: e2.target.value
    })}
            >
              <option value="dashboard">Dashboard (read-only)</option>
              <option value="tiles">Tiles</option>
            </select>
          </div>
          <div class="form-field">
            <label>Name (optional)</label>
            <input
              type="text"
              .value=${screen.name || ""}
              @input=${(e2) => this._updateScreen(index, {
      ...screen,
      name: e2.target.value || void 0
    })}
              placeholder="Home"
              maxlength="20"
            />
          </div>
        </div>

        ${screen.screenType === "dashboard" ? this._renderDashboardScreenConfig(screen, index) : this._renderTilesActionsScreenConfig(screen, index)}
      </div>
    `;
  }
  _renderDashboardScreenConfig(screen, screenIndex) {
    const dashboard = screen.dashboard || {
      statusGroups: [],
      sensorGroups: [],
      weather: void 0,
      events: [],
      notifications: []
    };
    const weatherFilterId = `weather_${screenIndex}`;
    return b`
      <div class="form-section">
        <div class="form-section-title">Weather</div>
        <div class="form-field">
          <label>Weather Entity</label>
          ${this._renderDeviceFilter(weatherFilterId)}
          ${this._renderSearchableEntitySelect(
      weatherFilterId,
      dashboard.weather?.entity || "",
      ["weather"],
      (entity) => {
        this._updateDashboard(screenIndex, {
          ...dashboard,
          weather: entity ? { entity } : void 0
        });
      },
      "Type to search weather entities..."
    )}
        </div>
      </div>

      ${this._renderDashboardCalendars(dashboard, screenIndex)}

      <div class="form-section">
        <div class="form-section-title">Status Groups</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
          Status groups display binary states (open/closed, on/off) with glyphs. Each glyph has a symbol (letter) and entity.
        </p>

        ${["doors", "garage", "motion", "lights", "media"].map((groupType) => {
      const group = dashboard.statusGroups?.find((g2) => g2.type === groupType);
      const glyphs = group?.glyphs || [];
      return b`
            <div style="margin-bottom: 16px; padding: 12px; background: var(--secondary-background-color); border-radius: 4px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: bold; text-transform: uppercase;">${groupType}</span>
                <button
                  class="add-item-button"
                  style="padding: 4px 8px; font-size: 11px;"
                  @click=${() => this._addStatusGlyph(screenIndex, groupType)}
                >
                  + Add Glyph
                </button>
              </div>

              ${glyphs.length > 0 ? b`
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      ${glyphs.map(
        (glyph, glyphIndex) => this._renderStatusGlyph(screenIndex, groupType, glyph, glyphIndex)
      )}
                    </div>
                  ` : b`<p style="font-size: 11px; color: var(--secondary-text-color); margin: 0;">No glyphs configured</p>`}
            </div>
          `;
    })}
      </div>

      <div class="form-section">
        <div class="form-section-title">Sensor Groups</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
          Sensor groups display numeric values (temperatures, presence). Each sensor has an entity and display type.
        </p>

        ${["thermostats", "freezers", "beacons"].map((groupType) => {
      const group = dashboard.sensorGroups?.find((g2) => g2.type === groupType);
      const sensors = group?.sensors || [];
      return b`
            <div style="margin-bottom: 16px; padding: 12px; background: var(--secondary-background-color); border-radius: 4px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: bold; text-transform: uppercase;">${groupType}</span>
                <button
                  class="add-item-button"
                  style="padding: 4px 8px; font-size: 11px;"
                  @click=${() => this._addSensor(screenIndex, groupType)}
                >
                  + Add Sensor
                </button>
              </div>

              ${sensors.length > 0 ? b`
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      ${sensors.map(
        (sensor, sensorIndex) => this._renderSensor(screenIndex, groupType, sensor, sensorIndex)
      )}
                    </div>
                  ` : b`<p style="font-size: 11px; color: var(--secondary-text-color); margin: 0;">No sensors configured</p>`}
            </div>
          `;
    })}
      </div>

      <div class="form-section">
        <div class="form-section-title">Inline &amp; Headline</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
          Headline value: one entity shown as a prominent row below the meeting rows.
          Inline metrics: two entity values displayed on either side of the clock (2-char label each).
        </p>

        <div style="margin-bottom: 16px; padding: 12px; background: var(--secondary-background-color); border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 8px;">Headline Value</div>
          <div class="form-row">
            <div class="form-field" style="flex: 0 0 120px;">
              <label>Label (max 11)</label>
              <input
                type="text"
                maxlength="11"
                .value=${dashboard.configurableValue?.label || ""}
                placeholder="e.g. AQI"
                @input=${(e2) => {
      const label = e2.target.value.slice(0, 11);
      this._updateDashboard(screenIndex, {
        ...dashboard,
        configurableValue: { ...dashboard.configurableValue || { entity: "" }, label: label || void 0 }
      });
    }}
              />
            </div>
            <div class="form-field" style="flex: 1;">
              <label>Entity</label>
              ${this._renderSearchableEntitySelect(
      `cv_entity_${screenIndex}`,
      dashboard.configurableValue?.entity || "",
      [],
      (entity) => {
        this._updateDashboard(screenIndex, {
          ...dashboard,
          configurableValue: entity ? { ...dashboard.configurableValue || {}, entity } : void 0
        });
      },
      "Type to search entities..."
    )}
            </div>
          </div>
          ${dashboard.configurableValue?.entity ? b`
                <button
                  style="font-size: 11px; color: var(--error-color, #f44336); background: none; border: none; cursor: pointer; padding: 0; margin-top: 4px;"
                  aria-label="Clear headline value"
                  @click=${() => {
      this._updateDashboard(screenIndex, { ...dashboard, configurableValue: void 0 });
    }}
                >Clear headline value</button>
              ` : A}
        </div>

        ${[0, 1].map((slotIndex) => {
      const metric = dashboard.inlineMetrics?.[slotIndex];
      return b`
            <div style="margin-bottom: 12px; padding: 12px; background: var(--secondary-background-color); border-radius: 4px;">
              <div style="font-weight: bold; margin-bottom: 8px;">Inline Metric Slot ${slotIndex + 1} (${slotIndex === 0 ? "left of clock" : "right of clock"})</div>
              <div class="form-row">
                <div class="form-field" style="flex: 0 0 80px;">
                  <label>Label (max 2)</label>
                  <input
                    type="text"
                    maxlength="2"
                    .value=${metric?.label || ""}
                    placeholder="e.g. BR"
                    @input=${(e2) => {
        const label = e2.target.value.slice(0, 2);
        const currentMetrics = [...dashboard.inlineMetrics || [void 0, void 0]];
        currentMetrics[slotIndex] = { ...currentMetrics[slotIndex] || { entity: "" }, label: label || void 0 };
        this._updateDashboard(screenIndex, { ...dashboard, inlineMetrics: currentMetrics });
      }}
                  />
                </div>
                <div class="form-field" style="flex: 1;">
                  <label>Entity</label>
                  ${this._renderSearchableEntitySelect(
        `im${slotIndex}_entity_${screenIndex}`,
        metric?.entity || "",
        [],
        (entity) => {
          const currentMetrics = [...dashboard.inlineMetrics || [void 0, void 0]];
          currentMetrics[slotIndex] = entity ? { ...currentMetrics[slotIndex] || {}, entity } : void 0;
          this._updateDashboard(screenIndex, { ...dashboard, inlineMetrics: currentMetrics });
        },
        "Type to search entities..."
      )}
                </div>
              </div>
              ${metric?.entity ? b`
                    <button
                      style="font-size: 11px; color: var(--error-color, #f44336); background: none; border: none; cursor: pointer; padding: 0; margin-top: 4px;"
                      aria-label="Clear inline metric slot ${slotIndex + 1}"
                      @click=${() => {
        const currentMetrics = [...dashboard.inlineMetrics || [void 0, void 0]];
        currentMetrics[slotIndex] = void 0;
        this._updateDashboard(screenIndex, { ...dashboard, inlineMetrics: currentMetrics });
      }}
                    >Clear slot ${slotIndex + 1}</button>
                  ` : A}
            </div>
          `;
    })}
      </div>
      ${this._renderPresenceSection(dashboard, screenIndex)}
    `;
  }
  /**
   * The calendars a dashboard reads its events from (dashboard.events). None picked: every
   * calendar on the Calendar tab, as the app takes them; that tab's max events is how many events
   * show, not how many calendars are read.
   */
  _renderDashboardCalendars(dashboard, screenIndex) {
    const picked = (Array.isArray(dashboard.events) ? dashboard.events : []).map((e2) => e2?.calendar).filter((c2) => !!c2);
    const face = this._config.events;
    const faceCalendars = face.calendars.filter((c2) => !!c2);
    const byDefault = face.enabled ? faceCalendars : [];
    const offered = [.../* @__PURE__ */ new Set([...faceCalendars, ...this._getEntities("calendar").sort(), ...picked])];
    const pick = (calendar, on) => {
      const events = offered.filter((c2) => c2 === calendar ? on : picked.includes(c2)).map((c2) => ({ calendar: c2 }));
      this._updateDashboard(screenIndex, { ...dashboard, events: events.length > 0 ? events : void 0 });
    };
    const source = picked.length > 0 ? "Only the calendars picked here are read." : byDefault.length > 0 ? `None picked: every calendar on the Calendar tab is read (${byDefault.length}).` : face.enabled ? "None picked, and the Calendar tab has no calendars: the dashboard shows no events." : "None picked, and calendar events are off on the Calendar tab: the dashboard shows no events.";
    return b`
      <div class="form-section">
        <div class="form-section-title">Calendars</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 8px;">
          The dashboard counts down to the next timed event of these calendars; all-day events are left out. ${source}
        </p>
        ${offered.length > 0 ? b`
              <div style="display: flex; flex-direction: column; gap: 6px; padding: 8px 12px; background: var(--secondary-background-color); border-radius: 4px;">
                ${offered.map((calendar) => {
      const name = this.hass?.states[calendar]?.attributes?.friendly_name;
      return b`
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                      <input
                        type="checkbox"
                        .checked=${picked.includes(calendar)}
                        @change=${(e2) => pick(calendar, e2.target.checked)}
                      />
                      ${name ? b`<span>${name}</span>` : A}
                      <span style="font-family: monospace; font-size: 11px; color: var(--secondary-text-color);">${calendar}</span>
                      ${picked.length === 0 && byDefault.includes(calendar) ? b`<span style="font-size: 11px; color: var(--secondary-text-color);">(read by default)</span>` : A}
                    </label>
                  `;
    })}
              </div>
            ` : b`<p style="font-size: 11px; color: var(--secondary-text-color); margin: 0;">No calendars in Home Assistant.</p>`}
      </div>
    `;
  }
  _renderLogbookScreenConfig(screen, screenIndex) {
    const logbook = screen.logbook || { entityIds: [], maxEntries: 15, hoursBack: 12 };
    const allEntities = this.hass ? Object.keys(this.hass.states).sort() : [];
    return b`
      <div class="form-section" style="margin-top: 16px;">
        <div class="form-section-title">Logbook Configuration</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
          Shows recent state changes for selected entities on the watch.
        </p>

        <div class="form-row">
          <div class="form-field">
            <label>Hours Back</label>
            <input
              type="number"
              min="1"
              max="48"
              .value=${String(logbook.hoursBack)}
              @input=${(e2) => {
      const val = parseInt(e2.target.value) || 12;
      this._updateScreenLogbook(screenIndex, { ...logbook, hoursBack: Math.min(Math.max(val, 1), 48) });
    }}
            />
          </div>
          <div class="form-field">
            <label>Max Entries</label>
            <input
              type="number"
              min="1"
              max="15"
              .value=${String(logbook.maxEntries)}
              @input=${(e2) => {
      const val = parseInt(e2.target.value) || 15;
      this._updateScreenLogbook(screenIndex, { ...logbook, maxEntries: Math.min(Math.max(val, 1), 15) });
    }}
            />
          </div>
        </div>

        <div class="form-section-title" style="margin-top: 12px;">Entities (${logbook.entityIds.length})</div>
        ${logbook.entityIds.map((entityId, idx) => b`
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <select
              .value=${entityId}
              @change=${(e2) => {
      const ids = [...logbook.entityIds];
      ids[idx] = e2.target.value;
      this._updateScreenLogbook(screenIndex, { ...logbook, entityIds: ids });
    }}
              style="flex: 1;"
            >
              <option value="">-- Select entity --</option>
              ${allEntities.map((eid) => b`<option value=${eid} ?selected=${eid === entityId}>${eid}</option>`)}
            </select>
            <button aria-label="Remove logbook entity ${idx + 1}" @click=${() => {
      const ids = logbook.entityIds.filter((_2, i2) => i2 !== idx);
      this._updateScreenLogbook(screenIndex, { ...logbook, entityIds: ids });
    }}>\u2715</button>
          </div>
        `)}
        ${logbook.entityIds.length < 10 ? b`
          <button class="add-item-button" @click=${() => {
      this._updateScreenLogbook(screenIndex, { ...logbook, entityIds: [...logbook.entityIds, ""] });
    }}>+ Add Entity</button>
        ` : A}

        <button
          style="margin-top: 8px; padding: 6px 12px; border: 1px solid var(--primary-color); background: transparent; color: var(--primary-color); border-radius: 4px; cursor: pointer; font-size: 12px;"
          aria-label=${this._showLogbookCardPicker ? "Close logbook card picker" : "Copy entities from an existing logbook card"}
          aria-expanded=${this._showLogbookCardPicker}
          @click=${() => {
      this._showLogbookCardPicker = !this._showLogbookCardPicker;
      this._logbookImportMessage = null;
      if (this._showLogbookCardPicker) {
        this._loadLogbookCards();
      }
    }}
        >
          ${this._showLogbookCardPicker ? "Close" : "Copy from Logbook Card"}
        </button>

        ${this._logbookImportMessage ? b`
          <p style="font-size: 12px; color: var(--primary-color); margin-top: 4px;">
            ${this._logbookImportMessage}
          </p>
        ` : A}

        ${this._showLogbookCardPicker ? b`
          <div style="margin-top: 8px; padding: 12px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--card-background-color, #fff);">
            <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 8px; cursor: pointer;">
              <input
                type="checkbox"
                .checked=${this._searchAllDashboards}
                @change=${(e2) => {
      this._searchAllDashboards = e2.target.checked;
      this._loadLogbookCards();
    }}
              />
              Search all dashboards
            </label>

            ${this._isLoadingLogbookCards ? b`
              <p style="font-size: 12px; color: var(--secondary-text-color);">Loading...</p>
            ` : this._discoveredLogbookCards.length === 0 ? b`
              <p style="font-size: 12px; color: var(--secondary-text-color);">
                No logbook cards found.${!this._searchAllDashboards ? ' Try checking "Search all dashboards".' : ""}
              </p>
            ` : b`
              ${this._discoveredLogbookCards.map((card) => b`
                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 8px; margin-bottom: 4px; border: 1px solid var(--divider-color); border-radius: 4px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13px; font-weight: 500;">${card.title}</div>
                    <div style="font-size: 11px; color: var(--secondary-text-color);">
                      ${card.dashboardTitle} / ${card.viewTitle} &middot; ${card.entities.length} ${card.entities.length === 1 ? "entity" : "entities"}
                    </div>
                    <div style="font-size: 11px; color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${card.entities.slice(0, 4).join(", ")}${card.entities.length > 4 ? `, +${card.entities.length - 4} more` : ""}
                    </div>
                  </div>
                  <button
                    style="padding: 4px 10px; border: 1px solid var(--primary-color); background: var(--primary-color); color: white; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap; margin-left: 8px;"
                    aria-label="Copy entities from ${card.title}"
                    @click=${() => this._importLogbookEntities(card, screenIndex)}
                  >Copy</button>
                </div>
              `)}
            `}
          </div>
        ` : A}
      </div>
    `;
  }
  /**
   * Presence-icon editor for a dashboard screen.
   *
   * This block previously sat at the end of _renderLogbookScreenConfig, where
   * `dashboard` is not in scope — every reference threw a ReferenceError at
   * render time and the section could never be used.
   */
  _renderPresenceSection(dashboard, screenIndex) {
    return b`
      <div class="form-section">
        <div class="form-section-title">Presence Icons</div>
        <div class="toggle-row">
          <span class="toggle-label">Enable presence icons</span>
          <input
            type="checkbox"
            .checked=${!!dashboard.presence?.enabled}
            @change=${(e2) => {
      const enabled = e2.target.checked;
      const prev = dashboard.presence || { enabled: false, home_zone: "zone.home", long_away_threshold: "24:00:00", icons: [] };
      this._updateDashboard(screenIndex, { ...dashboard, presence: { ...prev, enabled } });
    }}
          />
        </div>

        ${dashboard.presence?.enabled ? b`
              <div class="form-row">
                <div class="form-field">
                  <label>Home Zone</label>
                  <input
                    type="text"
                    .value=${dashboard.presence.home_zone || ""}
                    @input=${(e2) => this._updateDashboard(screenIndex, {
      ...dashboard,
      presence: { ...dashboard.presence, home_zone: e2.target.value }
    })}
                    placeholder="zone.home"
                  />
                </div>
                <div class="form-field">
                  <label>Long Away Threshold</label>
                  <input
                    type="text"
                    .value=${dashboard.presence.long_away_threshold || "24:00:00"}
                    @input=${(e2) => this._updateDashboard(screenIndex, {
      ...dashboard,
      presence: { ...dashboard.presence, long_away_threshold: e2.target.value }
    })}
                    placeholder="24:00:00"
                  />
                </div>
              </div>

              <div class="reorderable-list">
                ${(dashboard.presence.icons || []).map((icon, idx) => b`
                  <div class="list-item">
                    <span class="drag-handle" aria-hidden="true">&#9776;</span>
                    <div class="list-item-content">
                      <select
                        .value=${icon.icon}
                        @change=${(e2) => {
      const icons = [...dashboard.presence.icons || []];
      icons[idx] = { ...icon, icon: e2.target.value };
      this._updateDashboard(screenIndex, { ...dashboard, presence: { ...dashboard.presence, icons } });
    }}
                      >
                        ${getPresenceGlyphOptions().map((opt) => b`<option value=${opt.value}>${opt.label}</option>`)}
                      </select>
                      <div style="flex: 1">
                        ${this._renderEntityInput(
      icon.entity,
      (value) => {
        const icons = [...dashboard.presence.icons || []];
        icons[idx] = { ...icon, entity: value };
        this._updateDashboard(screenIndex, { ...dashboard, presence: { ...dashboard.presence, icons } });
      },
      void 0,
      "person.john"
    )}
                      </div>
                    </div>
                    <div class="list-item-actions">
                      <button
                        aria-label="Remove presence icon ${idx + 1}"
                        @click=${() => {
      const icons = (dashboard.presence.icons || []).filter((_2, i2) => i2 !== idx);
      this._updateDashboard(screenIndex, { ...dashboard, presence: { ...dashboard.presence, icons } });
    }}
                      >&#10005;</button>
                    </div>
                  </div>
                `)}
              </div>

              ${(dashboard.presence.icons || []).length < MAX_PRESENCE_ICONS ? b`
                    <button
                      class="add-item-button"
                      @click=${() => {
      const icons = [...dashboard.presence.icons || [], { icon: "person_male", entity: "", hide_if_unknown: false }];
      this._updateDashboard(screenIndex, { ...dashboard, presence: { ...dashboard.presence, icons } });
    }}
                    >+ Add Presence Icon</button>
                  ` : A}
            ` : A}
      </div>
    `;
  }
  _updateScreenLogbook(screenIndex, logbook) {
    const screens = [...this._config.screens || []];
    screens[screenIndex] = { ...screens[screenIndex], logbook };
    this._updateConfig("screens", screens);
  }
  _renderTilesActionsScreenConfig(screen, screenIndex) {
    const tiles = screen.tiles || [];
    const tileLayout = screen.tileLayout === 6 ? 6 : 4;
    const maxTiles = tileLayout;
    const gridLabel = tileLayout === 6 ? "3×2" : "2×2";
    const gridCols = tileLayout === 6 ? 3 : 2;
    return b`
      <div class="form-section">
        <div class="form-row" style="margin-bottom: 12px;">
          <div class="form-field">
            <label>Tile Layout</label>
            <select
              .value=${String(tileLayout)}
              @change=${(e2) => this._updateScreen(screenIndex, {
      ...screen,
      tileLayout: parseInt(e2.target.value, 10)
    })}
            >
              <option value="4">4 Tiles (2×2)</option>
              <option value="6">6 Tiles (3×2)</option>
            </select>
          </div>
        </div>

        <div class="form-section-title">Tiles (max ${maxTiles})</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
          ${tiles.length} / ${maxTiles} tiles configured (${gridLabel} grid)
        </p>

        <!-- Quick Add Buttons -->
        ${tiles.length < maxTiles ? b`
              <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                <button class="add-item-button" @click=${() => this._addScreenTile(screenIndex)}>
                  + Add Tile
                </button>
                <button class="add-item-button" style="background: var(--primary-color); color: white;" @click=${() => this._addQuickLightTile(screenIndex)}>
                  Quick Light
                </button>
              </div>
            ` : A}

        <!-- Tile List -->
        ${tiles.length > 0 ? b`
              <div class="tile-grid" style="display: grid; grid-template-columns: repeat(${gridCols}, 1fr); gap: 8px; margin-bottom: 16px;">
                ${tiles.map((tile, idx) => this._renderScreenTileSlot(screenIndex, tile, idx))}
              </div>
            ` : b`<p style="font-size: 12px; color: var(--secondary-text-color); font-style: italic;">No tiles added yet. Click "+ Add Tile" or "Quick Light" to add one.</p>`}

        <!-- Tile Editor -->
        ${this._selectedScreenTileIndex >= 0 && this._selectedScreenTileIndex < tiles.length ? this._renderScreenTileEditor(screenIndex, tiles[this._selectedScreenTileIndex], this._selectedScreenTileIndex) : tiles.length > 0 ? b`<p style="color: var(--secondary-text-color); font-size: 12px;">Click a tile above to configure it</p>` : A}
      </div>

    `;
  }
  _addScreen() {
    const screens = [...this._config.screens || []];
    screens.push({
      screenType: "tiles",
      tiles: []
    });
    this._updateConfig("screens", screens);
    this._selectedScreenIndex = screens.length - 1;
  }
  _updateScreen(index, screen) {
    const screens = [...this._config.screens || []];
    screens[index] = screen;
    this._updateConfig("screens", screens);
  }
  _removeScreen(index) {
    const screens = (this._config.screens || []).filter((_2, i2) => i2 !== index);
    this._updateConfig("screens", screens);
    if (this._selectedScreenIndex >= screens.length) {
      this._selectedScreenIndex = Math.max(0, screens.length - 1);
    }
  }
  _moveScreen(index, direction) {
    const screens = [...this._config.screens || []];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= screens.length) return;
    [screens[index], screens[newIndex]] = [screens[newIndex], screens[index]];
    this._updateConfig("screens", screens);
    this._selectedScreenIndex = newIndex;
  }
  _addScreenTile(screenIndex) {
    const screens = [...this._config.screens || []];
    const screen = screens[screenIndex];
    screen.tiles = [...screen.tiles || [], { ...DEFAULT_TILE_CONFIG }];
    this._updateConfig("screens", screens);
  }
  _addQuickLightTile(screenIndex) {
    const screens = [...this._config.screens || []];
    const screen = screens[screenIndex];
    const lightTile = {
      ...DEFAULT_TILE_CONFIG,
      enabled: true,
      label: "LIGHT",
      icon: "light",
      type: "state_text",
      color: "auto",
      tap: "toggle",
      entity: ""
      // User will select
    };
    screen.tiles = [...screen.tiles || [], lightTile];
    this._updateConfig("screens", screens);
    this._selectedScreenTileIndex = screen.tiles.length - 1;
  }
  _renderTileDeviceSelect(screenIndex, tileIndex, tile) {
    if (this._devices.length === 0) {
      this._loadDevices();
    }
    const filterId = `screen-tile-${screenIndex}-${tileIndex}`;
    const currentDeviceId = tile.device_id || "";
    return b`
      <select
        .value=${currentDeviceId}
        @change=${(e2) => {
      const deviceId = e2.target.value;
      this._updateScreenTile(screenIndex, tileIndex, {
        ...tile,
        device_id: deviceId || void 0,
        // Clear entity if device changes (to avoid invalid entity)
        entity: deviceId !== currentDeviceId ? "" : tile.entity
      });
      this._deviceFilters = { ...this._deviceFilters, [filterId]: deviceId };
      this.requestUpdate();
    }}
        style="width: 100%; padding: 8px; border: 1px solid var(--divider-color); border-radius: 4px;"
      >
        <option value="">No device (all entities)</option>
        ${this._devices.map(
      (device) => b`
            <option value="${device.id}" ?selected=${device.id === currentDeviceId}>
              ${device.name}
            </option>
          `
    )}
      </select>
    `;
  }
  _updateScreenTile(screenIndex, tileIndex, tile) {
    const screens = [...this._config.screens || []];
    const screen = screens[screenIndex];
    const tiles = [...screen.tiles || []];
    tiles[tileIndex] = tile;
    screen.tiles = tiles;
    this._updateConfig("screens", screens);
  }
  _removeScreenTile(screenIndex, tileIndex) {
    const screens = [...this._config.screens || []];
    const screen = screens[screenIndex];
    screen.tiles = (screen.tiles || []).filter((_2, i2) => i2 !== tileIndex);
    this._updateConfig("screens", screens);
    if (this._selectedScreenTileIndex >= screen.tiles.length) {
      this._selectedScreenTileIndex = -1;
    }
  }
  _renderScreenTileSlot(screenIndex, tile, index) {
    const isSelected = this._selectedScreenTileIndex === index;
    const isConfigured = tile.enabled && (tile.entity || tile.device_id);
    return b`
      <div
        class="tile-slot ${isSelected ? "active" : ""} ${isConfigured ? "configured" : ""}"
        role="button"
        tabindex="0"
        aria-label="Tile ${index + 1}: ${tile.label || "Empty"}${isConfigured ? " (configured)" : ""}"
        aria-pressed=${isSelected}
        style="cursor: pointer; padding: 8px; border-radius: 8px; text-align: center; border: 2px solid ${isSelected ? "var(--primary-color)" : isConfigured ? "var(--success-color, #4caf50)" : "var(--divider-color)"}; background: ${isSelected ? "var(--primary-color)" : "transparent"}; color: ${isSelected ? "white" : "inherit"};"
        @click=${() => {
      this._selectedScreenTileIndex = index;
      const filterId = `screen-tile-${screenIndex}-${index}`;
      this._deviceFilters = { ...this._deviceFilters, [filterId]: tile.device_id || "" };
    }}
        @keydown=${(e2) => {
      if (e2.key === "Enter" || e2.key === " ") {
        e2.preventDefault();
        this._selectedScreenTileIndex = index;
        const filterId = `screen-tile-${screenIndex}-${index}`;
        this._deviceFilters = { ...this._deviceFilters, [filterId]: tile.device_id || "" };
      }
    }}
      >
        <div style="font-size: 10px; opacity: 0.7;">${index + 1}</div>
        <div style="font-size: 12px; font-weight: 500;">${tile.label || "Empty"}</div>
        ${tile.entity ? b`<div style="font-size: 9px; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tile.entity.split(".")[1] || tile.entity}</div>` : tile.device_id ? b`<div style="font-size: 9px; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📱 ${this._devices.find((d2) => d2.id === tile.device_id)?.name || "Device"}</div>` : A}
      </div>
    `;
  }
  _renderScreenTileEditor(screenIndex, tile, tileIndex) {
    return b`
      <div class="form-section" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--divider-color)">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div class="form-section-title" style="margin: 0;">Tile ${tileIndex + 1} Configuration</div>
          <button
            style="background: var(--error-color, #f44336); color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
            aria-label="Remove tile ${tileIndex + 1}"
            @click=${() => this._removeScreenTile(screenIndex, tileIndex)}
          >
            Remove
          </button>
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Enabled</span>
          <input
            type="checkbox"
            .checked=${tile.enabled}
            @change=${(e2) => this._updateScreenTile(screenIndex, tileIndex, { ...tile, enabled: e2.target.checked })}
          />
        </div>

        ${tile.enabled ? b`
              <!-- Device Selection (optional, filters entity list) -->
              <div class="form-row">
                <div class="form-field" style="flex: 1">
                  <label>Device (optional)</label>
                  ${this._renderTileDeviceSelect(screenIndex, tileIndex, tile)}
                  <p style="font-size: 10px; color: var(--secondary-text-color); margin-top: 4px;">
                    Select a device to filter entities. Entity is optional if device is set.
                  </p>
                </div>
              </div>

              <!-- Entity Selection -->
              <div class="form-row">
                <div class="form-field" style="flex: 1">
                  <label>Entity ${!tile.device_id ? b`<span style="color: var(--error-color);">*</span>` : "(optional)"}</label>
                  ${this._renderSearchableEntitySelect(
      `screen-tile-${screenIndex}-${tileIndex}`,
      tile.entity,
      ["light", "switch", "sensor", "binary_sensor", "cover", "climate", "media_player", "fan", "lock", "input_boolean"],
      (value) => {
        const domain = value.split(".")[0];
        let updates = { entity: value };
        if (domain === "light" || domain === "switch" || domain === "input_boolean") {
          updates = { ...updates, tap: "toggle", type: "state_text", icon: domain === "light" ? "light" : "power" };
        } else if (domain === "cover") {
          updates = { ...updates, type: "cover_state", icon: "garage", tap: "toggle" };
        } else if (domain === "lock") {
          updates = { ...updates, type: "state_text", icon: "lock", tap: "toggle" };
        } else if (domain === "climate") {
          updates = { ...updates, type: "sensor_value", icon: "temperature", tap: "more-info" };
        } else if (domain === "media_player") {
          updates = { ...updates, type: "media_count", icon: "media", tap: "more-info" };
        } else if (domain === "fan") {
          updates = { ...updates, type: "state_text", icon: "fan", tap: "toggle" };
        } else if (domain === "sensor" || domain === "binary_sensor") {
          updates = { ...updates, type: "sensor_value", tap: "none" };
        }
        this._updateScreenTile(screenIndex, tileIndex, { ...tile, ...updates });
      },
      "Search entities..."
    )}
                  <p style="font-size: 10px; color: var(--secondary-text-color); margin-top: 4px;">
                    Type to search. Settings auto-configure based on entity type.
                  </p>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Label (max 8 chars)</label>
                  <input
                    type="text"
                    .value=${tile.label}
                    @input=${(e2) => this._updateScreenTile(screenIndex, tileIndex, { ...tile, label: e2.target.value.toUpperCase() })}
                    placeholder="LIGHT"
                    maxlength="8"
                  />
                </div>
                <div class="form-field">
                  <label>Label Type</label>
                  <select
                    .value=${tile.displayMode || "text"}
                    @change=${(e2) => this._updateScreenTile(screenIndex, tileIndex, {
      ...tile,
      displayMode: e2.target.value
    })}
                  >
                    <option value="text">Text</option>
                    <option value="icon">Icon</option>
                  </select>
                </div>
              </div>

              <!-- Icon selector (only shown when Label Type == 'icon') -->
              ${(tile.displayMode || "text") === "icon" ? b`
              <div class="form-row">
                    <div class="form-field" style="flex: 1">
                      <label>Icon</label>
                      <select
                        .value=${tile.icon}
                        @change=${(e2) => this._updateScreenTile(screenIndex, tileIndex, {
      ...tile,
      icon: e2.target.value
    })}
                      >
                        ${getEntityGlyphOptions().map(
      (opt) => b`<option value=${opt.value}>${opt.label}</option>`
    )}
                      </select>
                    </div>
              </div>
                ` : b``}
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Display Type</label>
                  <select
                    .value=${tile.type}
                    @change=${(e2) => this._updateScreenTile(screenIndex, tileIndex, {
      ...tile,
      type: e2.target.value
    })}
                  >
                    <option value="state_text">State Text (on/off)</option>
                    <option value="sensor_value">Sensor Value</option>
                    <option value="count">Count</option>
                    <option value="duration">Duration</option>
                    <option value="cover_state">Cover State</option>
                    <option value="media_count">Media State</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Tap Action</label>
                  <select
                    .value=${tile.tap}
                    @change=${(e2) => this._updateScreenTile(screenIndex, tileIndex, {
      ...tile,
      tap: e2.target.value
    })}
                  >
                    <option value="toggle">Toggle (on/off)</option>
                    <option value="more-info">More Info</option>
                    <option value="none">None</option>
                    <option value="service">Service Call</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Color Mode</label>
                  <select
                    .value=${tile.color}
                    @change=${(e2) => this._updateScreenTile(screenIndex, tileIndex, {
      ...tile,
      color: e2.target.value
    })}
                  >
                    <option value="auto">On (color by state)</option>
                    <option value="disabled">Off (static)</option>
                  </select>
                </div>
              </div>
            ` : A}
      </div>
    `;
  }
  // ========== DASHBOARD HELPERS ==========
  _updateDashboard(screenIndex, dashboard) {
    const screens = [...this._config.screens || []];
    screens[screenIndex] = { ...screens[screenIndex], dashboard };
    this._updateConfig("screens", screens);
  }
  _renderStatusGlyph(screenIndex, groupType, glyph, glyphIndex) {
    const filterId = `status_${screenIndex}_${groupType}_${glyphIndex}`;
    const domains = ["binary_sensor", "cover", "light", "media_player", "switch"];
    const symbolProblem = glyphSymbolProblem(glyph.symbol);
    return b`
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px; background: var(--secondary-background-color); border-radius: 4px;">
        ${this._renderDeviceFilter(filterId)}
        <div style="display: flex; gap: 8px; align-items: center;">
          ${this._renderIconPicker(
      `icon_${filterId}`,
      glyph.symbol || "",
      (icon) => {
        this._updateStatusGlyph(screenIndex, groupType, glyphIndex, {
          ...glyph,
          symbol: icon
        });
      }
    )}
          <input
            type="text"
            .value=${glyph.symbol || ""}
            @input=${(e2) => this._updateStatusGlyph(screenIndex, groupType, glyphIndex, {
      ...glyph,
      symbol: e2.target.value
    })}
            placeholder="F"
            maxlength="3"
            style="width: 60px; text-align: center; font-family: monospace; font-weight: bold;"
          />
          ${this._renderSearchableEntitySelect(
      filterId,
      glyph.entity || "",
      domains,
      (entity) => {
        this._updateStatusGlyph(screenIndex, groupType, glyphIndex, {
          ...glyph,
          entity
        });
      },
      "Type to search entities..."
    )}
          <button
            @click=${() => this._removeStatusGlyph(screenIndex, groupType, glyphIndex)}
            aria-label="Remove ${groupType} glyph ${glyphIndex + 1}"
            style="padding: 4px 8px; background: var(--error-color); color: white; border: none; border-radius: 4px; cursor: pointer;"
          >
            \u2715
          </button>
        </div>
        ${symbolProblem ? b`<div class="validation-message warning" role="status">\u26a0\ufe0f ${symbolProblem[0].toUpperCase()}${symbolProblem.slice(1)}.</div>` : A}
      </div>
    `;
  }
  _renderSensor(screenIndex, groupType, sensor, sensorIndex) {
    const domains = groupType === "beacons" ? ["person", "device_tracker"] : ["sensor", "climate"];
    const filterId = `sensor_${screenIndex}_${groupType}_${sensorIndex}`;
    const isBeacon = sensor.displayType === "presence";
    return b`
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px; background: var(--secondary-background-color); border-radius: 4px;">
        ${this._renderDeviceFilter(filterId)}
        <div style="display: flex; gap: 8px; align-items: center;">
          ${isBeacon ? b`
                ${this._renderIconPicker(
      `icon_${filterId}`,
      sensor.symbol || "",
      (icon) => {
        this._updateSensor(screenIndex, groupType, sensorIndex, {
          ...sensor,
          symbol: icon
        });
      }
    )}
                <input
                  type="text"
                  .value=${sensor.symbol || ""}
                  @input=${(e2) => this._updateSensor(screenIndex, groupType, sensorIndex, {
      ...sensor,
      symbol: e2.target.value
    })}
                  placeholder="?"
                  maxlength="3"
                  style="width: 60px; text-align: center; font-family: monospace; font-weight: bold;"
                />
              ` : A}
          ${this._renderSearchableEntitySelect(
      filterId,
      sensor.entity || "",
      domains,
      (entity) => {
        this._updateSensor(screenIndex, groupType, sensorIndex, {
          ...sensor,
          entity
        });
      },
      "Type to search entities..."
    )}
          <select
            .value=${sensor.displayType || "temperature"}
            @change=${(e2) => this._updateSensor(screenIndex, groupType, sensorIndex, {
      ...sensor,
      displayType: e2.target.value
    })}
            style="width: 120px;"
          >
            <option value="temperature">Temperature</option>
            <option value="presence">Presence</option>
          </select>
          <button
            @click=${() => this._removeSensor(screenIndex, groupType, sensorIndex)}
            aria-label="Remove ${groupType} sensor ${sensorIndex + 1}"
            style="padding: 4px 8px; background: var(--error-color); color: white; border: none; border-radius: 4px; cursor: pointer;"
          >
            \u2715
          </button>
        </div>
      </div>
    `;
  }
  _addStatusGlyph(screenIndex, groupType) {
    const screens = [...this._config.screens || []];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };
    let statusGroups = [...dashboard.statusGroups || []];
    let group = statusGroups.find((g2) => g2.type === groupType);
    if (!group) {
      group = { type: groupType, glyphs: [] };
      statusGroups.push(group);
    } else {
      statusGroups = statusGroups.map(
        (g2) => g2.type === groupType ? { ...g2, glyphs: [...g2.glyphs, { symbol: "", entity: "" }] } : g2
      );
    }
    if (!statusGroups.find((g2) => g2.type === groupType)?.glyphs.length) {
      const groupIndex = statusGroups.findIndex((g2) => g2.type === groupType);
      statusGroups[groupIndex] = {
        ...statusGroups[groupIndex],
        glyphs: [{ symbol: "", entity: "" }]
      };
    }
    this._updateDashboard(screenIndex, { ...dashboard, statusGroups });
  }
  _updateStatusGlyph(screenIndex, groupType, glyphIndex, glyph) {
    const screens = [...this._config.screens || []];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };
    const statusGroups = dashboard.statusGroups.map((g2) => {
      if (g2.type === groupType) {
        const glyphs = [...g2.glyphs];
        glyphs[glyphIndex] = glyph;
        return { ...g2, glyphs };
      }
      return g2;
    });
    this._updateDashboard(screenIndex, { ...dashboard, statusGroups });
  }
  _removeStatusGlyph(screenIndex, groupType, glyphIndex) {
    const screens = [...this._config.screens || []];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };
    const statusGroups = dashboard.statusGroups.map((g2) => {
      if (g2.type === groupType) {
        return { ...g2, glyphs: g2.glyphs.filter((_2, i2) => i2 !== glyphIndex) };
      }
      return g2;
    });
    this._updateDashboard(screenIndex, { ...dashboard, statusGroups });
  }
  _addSensor(screenIndex, groupType) {
    const screens = [...this._config.screens || []];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };
    let sensorGroups = [...dashboard.sensorGroups || []];
    let group = sensorGroups.find((g2) => g2.type === groupType);
    if (!group) {
      group = { type: groupType, sensors: [] };
      sensorGroups.push(group);
    } else {
      sensorGroups = sensorGroups.map(
        (g2) => g2.type === groupType ? { ...g2, sensors: [...g2.sensors, { entity: "", displayType: "temperature" }] } : g2
      );
    }
    if (!sensorGroups.find((g2) => g2.type === groupType)?.sensors.length) {
      const groupIndex = sensorGroups.findIndex((g2) => g2.type === groupType);
      sensorGroups[groupIndex] = {
        ...sensorGroups[groupIndex],
        sensors: [{ entity: "", displayType: "temperature" }]
      };
    }
    this._updateDashboard(screenIndex, { ...dashboard, sensorGroups });
  }
  _updateSensor(screenIndex, groupType, sensorIndex, sensor) {
    const screens = [...this._config.screens || []];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };
    const sensorGroups = dashboard.sensorGroups.map((g2) => {
      if (g2.type === groupType) {
        const sensors = [...g2.sensors];
        sensors[sensorIndex] = sensor;
        return { ...g2, sensors };
      }
      return g2;
    });
    this._updateDashboard(screenIndex, { ...dashboard, sensorGroups });
  }
  _removeSensor(screenIndex, groupType, sensorIndex) {
    const screens = [...this._config.screens || []];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };
    const sensorGroups = dashboard.sensorGroups.map((g2) => {
      if (g2.type === groupType) {
        return { ...g2, sensors: g2.sensors.filter((_2, i2) => i2 !== sensorIndex) };
      }
      return g2;
    });
    this._updateDashboard(screenIndex, { ...dashboard, sensorGroups });
  }
  // ========== EVENTS TAB ==========
  _renderCalendarItem(calendar, index) {
    return b`
      <div class="list-item">
        <span class="drag-handle" aria-hidden="true">\u2630</span>
        <div class="list-item-content" style="flex: 1">
          ${this._renderEntityInput(
      calendar,
      (value) => this._updateCalendar(index, value),
      "calendar",
      "calendar.work"
    )}
        </div>
        <div class="list-item-actions">
          <button aria-label="Remove calendar ${index + 1}" @click=${() => this._removeCalendar(index)}>\u2715</button>
        </div>
      </div>
    `;
  }
  _addCalendar() {
    const calendars = [...this._config.events.calendars, ""];
    this._updateConfig("events", {
      ...this._config.events,
      calendars
    });
  }
  _updateCalendar(index, calendar) {
    const calendars = [...this._config.events.calendars];
    calendars[index] = calendar;
    this._updateConfig("events", {
      ...this._config.events,
      calendars
    });
  }
  _removeCalendar(index) {
    const calendars = this._config.events.calendars.filter((_2, i2) => i2 !== index);
    this._updateConfig("events", {
      ...this._config.events,
      calendars
    });
  }
  _renderLogbookTab() {
    const lb = this._config.logbook_app ?? { entities: [], hours_back: 12, max_entries: 10 };
    const updateLb = (patch) => this._updateConfig("logbook_app", { ...lb, ...patch });
    return b`
      <div class="form-section">
        <h3>Logbook App</h3>
        <p style="font-size: 12px; color: var(--secondary-text-color);">
          Configure the standalone Logbook app that appears in the watch app launcher.
        </p>

        <div class="form-row">
          <div class="form-field">
            <label>Hours back (1–48)</label>
            <input type="number" min="1" max="48"
              .value=${lb.hours_back}
              @change=${(e2) => updateLb({ hours_back: Math.min(48, Math.max(1, parseInt(e2.target.value) || 12)) })}
            />
          </div>
          <div class="form-field">
            <label>Max entries (1–15)</label>
            <input type="number" min="1" max="15"
              .value=${lb.max_entries}
              @change=${(e2) => updateLb({ max_entries: Math.min(15, Math.max(1, parseInt(e2.target.value) || 10)) })}
            />
          </div>
        </div>

        <div class="form-row column">
          <label>Entities to track (${lb.entities.length})</label>
          ${lb.entities.map((eid, i2) => b`
            <div class="list-item-row">
              ${this._renderSearchableEntitySelect(
      `logbook-entity-${i2}`,
      eid,
      [],
      (v2) => {
        const updated = [...lb.entities];
        updated[i2] = v2;
        updateLb({ entities: updated });
      },
      "Entity ID"
    )}
              <button class="icon-button" @click=${() => {
      const updated = lb.entities.filter((_2, idx) => idx !== i2);
      updateLb({ entities: updated });
    }}>✕</button>
            </div>
          `)}
          ${lb.entities.length < 15 ? b`
            <button class="add-item-button" @click=${() => updateLb({ entities: [...lb.entities, ""] })}>
              + Add Entity
            </button>
          ` : ""}
        </div>
      </div>
    `;
  }
  _renderHomeControlTab() {
    const hc = this._config.home_control ?? { devices: [] };
    const updateHc = (patch) => this._updateConfig("home_control", { ...hc, ...patch });
    const DOMAINS = ["light", "switch", "cover", "climate", "fan", "lock"];
    return b`
      <div class="form-section">
        <h3>Home Control App</h3>
        <p style="font-size: 12px; color: var(--secondary-text-color);">
          Configure devices shown in the Home Control app in the watch app launcher (max 8).
        </p>

        ${hc.devices.map((dev, i2) => b`
          <div style="padding: 8px; margin-bottom: 8px; background: var(--secondary-background-color); border-radius: 4px;">
            <div class="form-row">
              <div class="form-field" style="flex: 2;">
                ${this._renderSearchableEntitySelect(
      `homecontrol-device-${i2}`,
      dev.entity_id,
      DOMAINS,
      (v2) => {
        const updated = [...hc.devices];
        updated[i2] = { ...dev, entity_id: v2 };
        updateHc({ devices: updated });
      },
      "Entity ID"
    )}
              </div>
              <div class="form-field">
                <input type="text" placeholder="Display name (optional)"
                  .value=${dev.name ?? ""}
                  @input=${(e2) => {
      const updated = [...hc.devices];
      updated[i2] = { ...dev, name: e2.target.value || void 0 };
      updateHc({ devices: updated });
    }}
                />
              </div>
              <button class="icon-button" @click=${() => {
      updateHc({ devices: hc.devices.filter((_2, idx) => idx !== i2) });
    }}>✕</button>
            </div>
          </div>
        `)}

        ${hc.devices.length < 8 ? b`
          <button class="add-item-button" @click=${() => updateHc({ devices: [...hc.devices, { entity_id: "" }] })}>
            + Add Device
          </button>
        ` : ""}
      </div>
    `;
  }
  _renderEventsTab() {
    const allCalendars = this._getEntities("calendar");
    return b`
      <div class="form-section">
        <div class="toggle-row">
          <span class="toggle-label">Enable calendar events</span>
          <input
            type="checkbox"
            .checked=${this._config.events.enabled}
            @change=${(e2) => this._updateConfig("events", {
      ...this._config.events,
      enabled: e2.target.checked
    })}
          />
        </div>

        ${this._config.events.enabled ? b`
              <div style="margin: 12px 0; padding: 12px; background: var(--secondary-background-color); border-radius: 4px;">
                <button
                  class="add-item-button"
                  style="margin-bottom: 8px;"
                  @click=${() => {
      this._updateConfig("events", {
        ...this._config.events,
        calendars: allCalendars
      });
    }}
                >
                  Use All Calendars (${allCalendars.length} found)
                </button>
                <p style="font-size: 11px; color: var(--secondary-text-color); margin: 0;">
                  Click to automatically add all calendar entities from your Home Assistant /calendar page
                </p>
              </div>

              <div class="form-row column">
                <div class="form-field">
                  <label>Selected Calendars (${this._config.events.calendars.length})</label>
                  ${this._config.events.calendars.map(
      (calendar, index) => this._renderCalendarItem(calendar, index)
    )}
                  ${this._config.events.calendars.length < 10 ? b`
                        <button class="add-item-button" @click=${this._addCalendar}>
                          + Add Calendar Manually
                        </button>
                      ` : A}
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Max Events</label>
                  <select
                    .value=${String(this._config.events.max_events)}
                    @change=${(e2) => this._updateConfig("events", {
      ...this._config.events,
      max_events: parseInt(e2.target.value, 10)
    })}
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Soon Window</label>
                  <input
                    type="text"
                    .value=${this._config.events.soon_window}
                    @input=${(e2) => this._updateConfig("events", {
      ...this._config.events,
      soon_window: e2.target.value
    })}
                    placeholder="01:00:00"
                  />
                </div>
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Show "No events" when empty</span>
                <input
                  type="checkbox"
                  .checked=${this._config.events.show_if_empty}
                  @change=${(e2) => this._updateConfig("events", {
      ...this._config.events,
      show_if_empty: e2.target.checked
    })}
                />
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>All-day Events</label>
                  <select
                    .value=${this._config.events.all_day}
                    @change=${(e2) => this._updateConfig("events", {
      ...this._config.events,
      all_day: e2.target.value
    })}
                  >
                    <option value="show_all_day">Show as "All day"</option>
                    <option value="hide">Hide</option>
                    <option value="banner">Show as banner</option>
                  </select>
                </div>
              </div>
            ` : A}
      </div>
    `;
  }
  // ========== TILES TAB ==========
  _renderTilesTab() {
    const tiles = [...this._config.tiles];
    while (tiles.length < MAX_TILES) {
      tiles.push({ ...DEFAULT_TILE_CONFIG });
    }
    return b`
      <div class="form-section">
        <div class="form-section-title">Tile Grid (2\u00D74)</div>
        <div class="tiles-grid">
          ${tiles.slice(0, MAX_TILES).map(
      (tile, index) => this._renderTileSlot(tile, index)
    )}
        </div>
      </div>

      ${this._selectedTileIndex >= 0 ? this._renderTileEditor(tiles[this._selectedTileIndex], this._selectedTileIndex) : b`<p style="color: var(--secondary-text-color)">Click a tile to edit</p>`}
    `;
  }
  _renderTileSlot(tile, index) {
    const isSelected = this._selectedTileIndex === index;
    const isConfigured = tile.enabled && tile.label;
    return b`
      <div
        class="tile-slot ${isSelected ? "active" : ""} ${isConfigured ? "configured" : ""}"
        role="button"
        tabindex="0"
        aria-label="Tile ${index + 1}: ${tile.label || "Empty"}${isConfigured ? " (configured)" : ""}"
        aria-pressed=${isSelected}
        @click=${() => this._selectedTileIndex = index}
        @keydown=${(e2) => {
      if (e2.key === "Enter" || e2.key === " ") {
        e2.preventDefault();
        this._selectedTileIndex = index;
      }
    }}
      >
        <span class="tile-slot-number">${index + 1}</span>
        ${isConfigured ? b`<span class="tile-slot-label">${tile.label}</span>` : b`<span class="tile-slot-label" style="opacity: 0.5">Empty</span>`}
      </div>
    `;
  }
  _renderTileEditor(tile, index) {
    return b`
      <div class="form-section" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--divider-color)">
        <div class="form-section-title">Tile ${index + 1} Configuration</div>

        <div class="toggle-row">
          <span class="toggle-label">Enabled</span>
          <input
            type="checkbox"
            .checked=${tile.enabled}
            @change=${(e2) => this._updateTile(index, { ...tile, enabled: e2.target.checked })}
          />
        </div>

        ${tile.enabled ? b`
              <div class="form-row">
                <div class="form-field">
                  <label>Label</label>
                  <input
                    type="text"
                    .value=${tile.label}
                    @input=${(e2) => this._updateTile(index, { ...tile, label: e2.target.value })}
                    placeholder="DOORS"
                    maxlength="8"
                  />
                </div>
                <div class="form-field">
                  <label>Icon</label>
                  <select
                    .value=${tile.icon}
                    @change=${(e2) => this._updateTile(index, {
      ...tile,
      icon: e2.target.value
    })}
                  >
                    ${getEntityGlyphOptions().map(
      (opt) => b`<option value=${opt.value}>${opt.label}</option>`
    )}
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Type</label>
                  <select
                    .value=${tile.type}
                    @change=${(e2) => this._updateTile(index, {
      ...tile,
      type: e2.target.value
    })}
                  >
                    <option value="count">Count</option>
                    <option value="duration">Duration</option>
                    <option value="state_text">State Text</option>
                    <option value="cover_state">Cover State</option>
                    <option value="media_count">Media State</option>
                    <option value="sensor_value">Sensor Value</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Color Mode</label>
                  <select
                    .value=${tile.color}
                    @change=${(e2) => this._updateTile(index, {
      ...tile,
      color: e2.target.value
    })}
                  >
                    <option value="auto">On (color by state)</option>
                    <option value="disabled">Off (static)</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field" style="flex: 2">
                  <label>Entity</label>
                  ${this._renderEntityInput(
      tile.entity,
      (value) => this._updateTile(index, { ...tile, entity: value }),
      void 0,
      "sensor.temperature"
    )}
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Tap Action</label>
                  <select
                    .value=${tile.tap}
                    @change=${(e2) => this._updateTile(index, {
      ...tile,
      tap: e2.target.value
    })}
                  >
                    <option value="none">None</option>
                    <option value="toggle">Toggle</option>
                    <option value="more-info">More Info</option>
                    <option value="service">Service</option>
                  </select>
                </div>
              </div>
            ` : A}
      </div>
    `;
  }
  _updateTile(index, tile) {
    const tiles = [...this._config.tiles];
    while (tiles.length <= index) {
      tiles.push({ ...DEFAULT_TILE_CONFIG });
    }
    tiles[index] = tile;
    this._updateConfig("tiles", tiles);
  }
  // ========== ACTIONS TAB ==========
  _renderActionsTab() {
    const actions = [...this._config.actions];
    while (actions.length < MAX_ACTIONS) {
      actions.push({ ...DEFAULT_ACTION_CONFIG });
    }
    return b`
      <div class="form-section">
        <div class="form-section-title">Action Buttons (max 3)</div>

        ${actions.slice(0, MAX_ACTIONS).map(
      (action, index) => this._renderActionEditor(action, index)
    )}
      </div>
    `;
  }
  _renderActionEditor(action, index) {
    return b`
      <div class="form-section" style="padding: 12px; background: var(--secondary-background-color); border-radius: 4px; margin-bottom: 12px">
        <div class="toggle-row">
          <span class="toggle-label"><strong>Action ${index + 1}</strong></span>
          <input
            type="checkbox"
            .checked=${action.enabled}
            @change=${(e2) => this._updateAction(index, { ...action, enabled: e2.target.checked })}
          />
        </div>

        ${action.enabled ? b`
              <div class="form-row">
                <div class="form-field">
                  <label>Label</label>
                  <input
                    type="text"
                    .value=${action.label}
                    @input=${(e2) => this._updateAction(index, { ...action, label: e2.target.value })}
                    placeholder="GARAGE"
                    maxlength="10"
                  />
                </div>
                <div class="form-field">
                  <label>Icon</label>
                  <select
                    .value=${action.icon}
                    @change=${(e2) => this._updateAction(index, {
      ...action,
      icon: e2.target.value
    })}
                  >
                    ${getEntityGlyphOptions().map(
      (opt) => b`<option value=${opt.value}>${opt.label}</option>`
    )}
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field" style="flex: 2">
                  <label>Entity</label>
                  ${this._renderEntityInput(
      action.entity,
      (value) => this._updateAction(index, { ...action, entity: value }),
      void 0,
      "light.living_room"
    )}
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Action Type</label>
                  <select
                    .value=${action.action}
                    @change=${(e2) => this._updateAction(index, {
      ...action,
      action: e2.target.value
    })}
                  >
                    <option value="toggle">Toggle</option>
                    <option value="cover.toggle">Cover Toggle</option>
                    <option value="cover.open">Cover Open</option>
                    <option value="cover.close">Cover Close</option>
                    <option value="media.play_pause">Media Play/Pause</option>
                    <option value="script.run">Run Script</option>
                    <option value="scene.activate">Activate Scene</option>
                    <option value="light.dimmer">Light Dimmer</option>
                    <option value="service_call">Service Call</option>
                    <option value="device_action">Device Action</option>
                  </select>
                </div>
              </div>

              ${action.action === "service_call" ? this._renderServiceCallConfig(action, index) : action.action === "device_action" ? this._renderDeviceActionConfig(action, index) : A}

              <div class="toggle-row">
                <span class="toggle-label">State-based coloring</span>
                <input
                  type="checkbox"
                  .checked=${action.state_color}
                  @change=${(e2) => this._updateAction(index, { ...action, state_color: e2.target.checked })}
                />
              </div>

              ${action.action === "light.dimmer" ? this._renderDimmerConfig(action, index) : A}
            ` : A}
      </div>
    `;
  }
  _renderDimmerConfig(action, index) {
    const dimmer = action.dimmer || DEFAULT_ACTION_CONFIG.dimmer;
    return b`
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--divider-color)">
        <div class="form-section-title">Dimmer Settings</div>

        <div class="form-row">
          <div class="form-field">
            <label>Step Size (%)</label>
            <input
              type="number"
              min="1"
              max="25"
              .value=${String(dimmer.step_percent)}
              @input=${(e2) => this._updateAction(index, {
      ...action,
      dimmer: {
        ...dimmer,
        step_percent: parseInt(e2.target.value, 10) || 10
      }
    })}
            />
          </div>
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Enable swipe gestures</span>
          <input
            type="checkbox"
            .checked=${dimmer.swipe}
            @change=${(e2) => this._updateAction(index, {
      ...action,
      dimmer: { ...dimmer, swipe: e2.target.checked }
    })}
          />
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Long-press overlay</span>
          <input
            type="checkbox"
            .checked=${dimmer.longpress_overlay}
            @change=${(e2) => this._updateAction(index, {
      ...action,
      dimmer: { ...dimmer, longpress_overlay: e2.target.checked }
    })}
          />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>On Brightness Default</label>
            <select
              .value=${dimmer.on_brightness_default}
              @change=${(e2) => this._updateAction(index, {
      ...action,
      dimmer: {
        ...dimmer,
        on_brightness_default: e2.target.value
      }
    })}
            >
              <option value="last">Last Known</option>
              <option value="fixed">Fixed Value</option>
            </select>
          </div>

          ${dimmer.on_brightness_default === "fixed" ? b`
                <div class="form-field">
                  <label>Fixed Brightness (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    .value=${String(dimmer.fixed_percent)}
                    @input=${(e2) => this._updateAction(index, {
      ...action,
      dimmer: {
        ...dimmer,
        fixed_percent: parseInt(e2.target.value, 10) || 50
      }
    })}
                  />
                </div>
              ` : A}
        </div>
      </div>
    `;
  }
  _renderServiceCallConfig(action, index) {
    return b`
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--divider-color)">
        <div class="form-section-title">Service Call Settings</div>

        <div class="form-row">
          <div class="form-field">
            <label>Domain</label>
            <input
              type="text"
              .value=${action.domain || ""}
              @input=${(e2) => this._updateAction(index, {
      ...action,
      domain: e2.target.value
    })}
              placeholder="light"
            />
          </div>
          <div class="form-field">
            <label>Service</label>
            <input
              type="text"
              .value=${action.service || ""}
              @input=${(e2) => this._updateAction(index, {
      ...action,
      service: e2.target.value
    })}
              placeholder="turn_on"
            />
          </div>
        </div>
      </div>
    `;
  }
  _renderDeviceActionConfig(action, index) {
    if (this._devices.length === 0) {
      this._loadDevices();
    }
    if (action.device_id && !this._deviceActions[action.device_id]) {
      this._loadDeviceActions(action.device_id);
    }
    const selectedDeviceActions = action.device_id ? this._deviceActions[action.device_id] || [] : [];
    return b`
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--divider-color)">
        <div class="form-section-title">Device Action Settings</div>

        <div class="form-row">
          <div class="form-field">
            <label>Device</label>
            <select
              .value=${action.device_id || ""}
              @change=${(e2) => {
      const deviceId = e2.target.value;
      this._updateAction(index, {
        ...action,
        device_id: deviceId,
        device_action: ""
        // Reset action when device changes
      });
      if (deviceId) {
        this._loadDeviceActions(deviceId);
      }
    }}
            >
              <option value="">Select device...</option>
              ${this._devices.map(
      (device) => b`<option value=${device.id}>${device.name}</option>`
    )}
            </select>
          </div>
        </div>

        ${action.device_id ? b`
              <div class="form-row">
                <div class="form-field">
                  <label>Action</label>
                  <select
                    .value=${action.device_action || ""}
                    @change=${(e2) => this._updateAction(index, {
      ...action,
      device_action: e2.target.value
    })}
                  >
                    <option value="">Select action...</option>
                    ${selectedDeviceActions.map(
      (da) => b`
                        <option value=${da.type + (da.subtype ? "::" + da.subtype : "")}>
                          ${da.description || da.type + (da.subtype ? " - " + da.subtype : "")}
                        </option>
                      `
    )}
                  </select>
                </div>
              </div>
            ` : A}
      </div>
    `;
  }
  _updateAction(index, action) {
    const actions = [...this._config.actions];
    while (actions.length <= index) {
      actions.push({ ...DEFAULT_ACTION_CONFIG });
    }
    actions[index] = action;
    this._updateConfig("actions", actions);
  }
  // ========== STATUS BAR TAB ==========
  _renderStatusBarTab() {
    return b`
      <div class="form-section">
        <div class="toggle-row">
          <span class="toggle-label">Enable status bar</span>
          <input
            type="checkbox"
            .checked=${this._config.status_bar.enabled}
            @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      enabled: e2.target.checked
    })}
          />
        </div>

        ${this._config.status_bar.enabled ? b`
              <div class="form-section-title" style="margin-top: 16px">Indicators</div>

              <div class="toggle-row">
                <span class="toggle-label">Battery</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.battery}
                  @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      battery: e2.target.checked
    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Bluetooth</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.bluetooth}
                  @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      bluetooth: e2.target.checked
    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Steps</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.steps}
                  @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      steps: e2.target.checked
    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Heart Rate</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.heart_rate}
                  @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      heart_rate: e2.target.checked
    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Notifications</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.notifications}
                  @change=${(e2) => this._updateConfig("status_bar", {
      ...this._config.status_bar,
      notifications: e2.target.checked
    })}
                />
              </div>

              <div class="form-section-title" style="margin-top: 16px">Custom Entity Sources (Optional)</div>

              <div class="form-row column">
                <div class="form-field">
                  <label>Steps Entity</label>
                  ${this._renderEntityInput(
      this._config.status_bar.sources.steps_entity || "",
      (value) => this._updateConfig("status_bar", {
        ...this._config.status_bar,
        sources: {
          ...this._config.status_bar.sources,
          steps_entity: value || null
        }
      }),
      "sensor",
      "sensor.steps"
    )}
                </div>
                <div class="form-field">
                  <label>Heart Rate Entity</label>
                  ${this._renderEntityInput(
      this._config.status_bar.sources.hr_entity || "",
      (value) => this._updateConfig("status_bar", {
        ...this._config.status_bar,
        sources: {
          ...this._config.status_bar.sources,
          hr_entity: value || null
        }
      }),
      "sensor",
      "sensor.heart_rate"
    )}
                </div>
                <div class="form-field">
                  <label>Notifications Entity</label>
                  ${this._renderEntityInput(
      this._config.status_bar.sources.notifications_entity || "",
      (value) => this._updateConfig("status_bar", {
        ...this._config.status_bar,
        sources: {
          ...this._config.status_bar.sources,
          notifications_entity: value || null
        }
      }),
      "sensor",
      "sensor.notifications"
    )}
                </div>
              </div>
            ` : A}
      </div>
    `;
  }
  // ========== ADVANCED TAB ==========
  _renderAdvancedTab() {
    return b`
      <div class="form-section">
        <div class="form-section-title">Performance</div>

        <div class="toggle-row">
          <span class="toggle-label">Enable compression</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.compression}
            @change=${(e2) => this._updateConfig("advanced", {
      ...this._config.advanced,
      compression: e2.target.checked
    })}
          />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Min Update Interval (ms)</label>
            <input
              type="number"
              min="100"
              max="60000"
              .value=${String(this._config.advanced.min_update_interval_ms)}
              @input=${(e2) => this._updateConfig("advanced", {
      ...this._config.advanced,
      min_update_interval_ms: parseInt(e2.target.value, 10) || 1e3
    })}
            />
          </div>
          <div class="form-field">
            <label>Full Refresh (minutes)</label>
            <input
              type="number"
              min="1"
              max="60"
              .value=${String(this._config.advanced.full_refresh_minutes)}
              @input=${(e2) => this._updateConfig("advanced", {
      ...this._config.advanced,
      full_refresh_minutes: parseInt(e2.target.value, 10) || 15
    })}
            />
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Debug</div>

        <div class="toggle-row">
          <span class="toggle-label">Show bounds overlay</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.debug.show_bounds}
            @change=${(e2) => this._updateConfig("advanced", {
      ...this._config.advanced,
      debug: {
        ...this._config.advanced.debug,
        show_bounds: e2.target.checked
      }
    })}
          />
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Show truncation markers</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.debug.show_truncation}
            @change=${(e2) => this._updateConfig("advanced", {
      ...this._config.advanced,
      debug: {
        ...this._config.advanced.debug,
        show_truncation: e2.target.checked
      }
    })}
          />
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Payload Info</div>
        <p style="font-size: 12px; color: var(--secondary-text-color)">
          Estimated size: ${this._watchLayout ? Math.round(estimatePayloadSize(this._watchLayout) / 1024 * 10) / 10 : 0} KB
        </p>
      </div>
    `;
  }
};
InfinassistantWatchfaceEditor.styles = [sharedStyles, previewStyles, editorStyles];
__decorateClass$1([
  n2({ attribute: false })
], InfinassistantWatchfaceEditor.prototype, "hass", 2);
__decorateClass$1([
  n2({ attribute: false })
], InfinassistantWatchfaceEditor.prototype, "lovelace", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_config", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_activeTab", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_selectedTileIndex", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_selectedScreenIndex", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_selectedScreenTileIndex", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_validation", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_watchLayout", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_simulator", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_searchFilters", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_deviceFilters", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_devices", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_deviceActions", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_infinassistantDevices", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_activeIconPicker", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_isLoadingDevices", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_isLoadingInfinassistantDevices", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_loadError", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_discoveredLogbookCards", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_isLoadingLogbookCards", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_showLogbookCardPicker", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_logbookImportMessage", 2);
__decorateClass$1([
  r()
], InfinassistantWatchfaceEditor.prototype, "_searchAllDashboards", 2);
InfinassistantWatchfaceEditor = __decorateClass$1([
  defineEditor(EDITOR_TAG)
], InfinassistantWatchfaceEditor);
const describe = (copy) => `${copy.version} (${copy.url})`;
const REMEDY = "Remove the Lovelace resource that adds the card by hand, such as /local/infinassistant-watchface.js: the InfinAssistant integration serves the card itself.";
function noteCopy(loaded, self, defined) {
  const inUse = loaded.copies[0];
  loaded.copies.push(self);
  if (!defined) return null;
  if (inUse === void 0) {
    return `InfinAssistant watch face card: an older copy, which does not record its version, was loaded first and is in use; ${describe(self)} is not. ${REMEDY}`;
  }
  if (inUse.version === self.version) return null;
  return `InfinAssistant watch face card: two versions are loaded. ${describe(inUse)} is in use; ${describe(self)} is not. ${REMEDY}`;
}
function unrecordedCopies(loaded, scriptUrls, bundle) {
  const recorded = new Set(loaded.copies.map((c2) => c2.url));
  return [...new Set(scriptUrls)].filter((url) => {
    if (recorded.has(url)) return false;
    try {
      return new URL(url).pathname.endsWith(`/${bundle}`);
    } catch {
      return false;
    }
  });
}
function unrecordedCopyWarning(self, url) {
  return `InfinAssistant watch face card: another copy is also loaded, from ${url}; ${describe(self)} is in use. ${REMEDY}`;
}
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i2 = decorators.length - 1, decorator; i2 >= 0; i2--)
    if (decorator = decorators[i2])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};
const SELF = { version: "1.0.0+8ba60321", url: import.meta.url };
const LOADED = window.__infinassistantWatchface ??= { copies: [] };
const loadWarning = noteCopy(LOADED, SELF, customElements.get(CARD_TAG) !== void 0);
if (loadWarning) console.warn(loadWarning);
let copiesChecked = false;
const defineCard = (tagName) => {
  return (classOrDescriptor) => {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, classOrDescriptor);
    }
    return classOrDescriptor;
  };
};
let InfinassistantWatchfaceCard = class extends i {
  constructor() {
    super(...arguments);
    this._config = DEFAULT_CONFIG;
    this._validation = null;
    this._watchLayout = null;
    this._copied = false;
    this._showJson = false;
    this._showMessages = false;
    this._simulator = {
      garage: "closed",
      media: "idle",
      presence: "home",
      notifications: 0,
      bluetooth: true,
      battery: 75,
      steps: 5234,
      heartRate: 78
    };
    this._previewScreen = 0;
    this._forecast = {};
    this._forecastPending = /* @__PURE__ */ new Set();
    this._events = {};
    this._eventsPending = /* @__PURE__ */ new Set();
    this._pushSuccess = false;
    this._pushError = null;
    this._copyTimeoutId = null;
    this._pushSuccessTimeoutId = null;
    this._pushErrorTimeoutId = null;
  }
  connectedCallback() {
    super.connectedCallback();
    if (!copiesChecked) {
      copiesChecked = true;
      const scripts = Array.from(document.querySelectorAll("script[src]"), (s2) => s2.src);
      for (const url of unrecordedCopies(LOADED, scripts, CARD_BUNDLE)) console.warn(unrecordedCopyWarning(SELF, url));
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._copyTimeoutId !== null) {
      clearTimeout(this._copyTimeoutId);
      this._copyTimeoutId = null;
    }
    if (this._pushSuccessTimeoutId !== null) {
      clearTimeout(this._pushSuccessTimeoutId);
      this._pushSuccessTimeoutId = null;
    }
    if (this._pushErrorTimeoutId !== null) {
      clearTimeout(this._pushErrorTimeoutId);
      this._pushErrorTimeoutId = null;
    }
  }
  setConfig(config) {
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      theme: { ...DEFAULT_CONFIG.theme, ...config.theme },
      header: {
        ...DEFAULT_CONFIG.header,
        ...config.header,
        time: { ...DEFAULT_CONFIG.header.time, ...config.header?.time },
        presence: {
          ...DEFAULT_CONFIG.header.presence,
          ...config.header?.presence,
          icons: config.header?.presence?.icons || []
        }
      },
      events: { ...DEFAULT_CONFIG.events, ...config.events },
      status_bar: {
        ...DEFAULT_CONFIG.status_bar,
        ...config.status_bar,
        sources: { ...DEFAULT_CONFIG.status_bar.sources, ...config.status_bar?.sources }
      },
      advanced: {
        ...DEFAULT_CONFIG.advanced,
        ...config.advanced,
        debug: { ...DEFAULT_CONFIG.advanced.debug, ...config.advanced?.debug }
      },
      tiles: config.tiles || [],
      actions: config.actions || []
    };
    this._updateLayout();
  }
  getCardSize() {
    return 6;
  }
  updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("hass")) {
      this._updateLayout();
    }
    if (changedProps.has("hass") || changedProps.has("_previewScreen") || changedProps.has("_watchLayout")) {
      this._readForecast();
      this._readEvents();
    }
  }
  /**
   * Reads the dashboard's events on preview, at most every 15 min (the app sends the watch a state
   * at least that often): the next week's, the first eight per calendar, as the app reads them. A
   * calendar entity holds only its next event, so the two the watch shows can be missing from them.
   */
  _readEvents() {
    const layout = this._watchLayout;
    const screens = layout?.screens ?? [];
    const screen = screens[Math.min(this._previewScreen, Math.max(screens.length - 1, 0))];
    const dashboard = screen?.screenType === 0 ? screen.dashboard : void 0;
    const send = this.hass?.connection?.sendMessagePromise;
    if (!layout || !dashboard || !send) return;
    const calendars = dashboardCalendars(dashboard, layout);
    const key = calendars.join(",");
    if (calendars.length === 0 || this._eventsPending.has(key)) return;
    const read = this._events[key];
    if (read && Date.now() - read.at < 15 * 6e4) return;
    this._eventsPending.add(key);
    send.call(this.hass.connection, {
      type: "call_service",
      domain: "calendar",
      service: "get_events",
      service_data: { duration: { days: 7 } },
      target: { entity_id: calendars },
      return_response: true
    }).then((result) => calendarEvents(result, calendars)).catch(() => null).then((events) => {
      this._events = { ...this._events, [key]: { events, at: Date.now() } };
      this._eventsPending.delete(key);
    });
  }
  /**
   * Reads today's high and low for the dashboard on preview, at most every 30 min: HA has given
   * them only through weather.get_forecasts since 2024.4, so a state carries none.
   */
  _readForecast() {
    const screens = this._watchLayout?.screens ?? [];
    const screen = screens[Math.min(this._previewScreen, Math.max(screens.length - 1, 0))];
    const entityId = screen?.screenType === 0 ? screen.dashboard?.weather?.entity : void 0;
    const send = this.hass?.connection?.sendMessagePromise;
    if (!entityId || !send || this._forecastPending.has(entityId)) return;
    const read = this._forecast[entityId];
    if (read && Date.now() - read.at < 30 * 6e4) return;
    this._forecastPending.add(entityId);
    send.call(this.hass.connection, {
      type: "call_service",
      domain: "weather",
      service: "get_forecasts",
      service_data: { type: "daily" },
      target: { entity_id: entityId },
      return_response: true
    }).then((result) => forecastHiLo(result, entityId)).catch(() => null).then((hiLo) => {
      this._forecast = { ...this._forecast, [entityId]: { hiLo, at: Date.now() } };
      this._forecastPending.delete(entityId);
    });
  }
  _updateLayout() {
    try {
      this._validation = validateConfig(this._config, this.hass);
      this._watchLayout = exportWatchLayout(this._config);
    } catch (error) {
      console.error("Error updating watch face layout:", error);
      this._validation = {
        valid: false,
        errors: [],
        warnings: [],
        info: [],
        byTab: {
          settings: [],
          screens: [],
          calendar: [],
          logbook: [],
          home_control: []
        }
      };
      this._watchLayout = null;
    }
    if (listedMessages(this._validation).length === 0) this._showMessages = false;
  }
  async _handleCopyJson() {
    if (!this._watchLayout) return;
    const success = await copyLayoutToClipboard(this._watchLayout);
    if (success) {
      this._copied = true;
      if (this._copyTimeoutId !== null) {
        clearTimeout(this._copyTimeoutId);
      }
      this._copyTimeoutId = setTimeout(() => {
        this._copied = false;
        this._copyTimeoutId = null;
      }, 2e3);
    }
  }
  async _handlePushToWatch() {
    if (!this._watchLayout || !this._config.device_id || !this.hass) return;
    this._pushError = null;
    this._pushSuccess = false;
    try {
      await this.hass.callService("infinassistant", "push_watchface_layout", {
        device_id: this._config.device_id,
        layout: this._watchLayout
      });
      this._pushSuccess = true;
      if (this._pushSuccessTimeoutId !== null) {
        clearTimeout(this._pushSuccessTimeoutId);
      }
      this._pushSuccessTimeoutId = setTimeout(() => {
        this._pushSuccess = false;
        this._pushSuccessTimeoutId = null;
      }, 3e3);
    } catch (err) {
      this._pushError = err instanceof Error ? err.message : "Unknown error";
      if (this._pushErrorTimeoutId !== null) {
        clearTimeout(this._pushErrorTimeoutId);
      }
      this._pushErrorTimeoutId = setTimeout(() => {
        this._pushError = null;
        this._pushErrorTimeoutId = null;
      }, 5e3);
    }
  }
  _toggleJson() {
    this._showJson = !this._showJson;
  }
  static getConfigElement() {
    return document.createElement(EDITOR_TAG);
  }
  static getStubConfig() {
    return {
      type: "custom:infinassistant-watchface",
      version: 1,
      name: "My Watch Face"
    };
  }
  render() {
    const payloadSize = this._watchLayout ? estimatePayloadSize(this._watchLayout) : 0;
    return b`
      <ha-card>
        <div class="card-header">
          <span class="card-title">${this._config.name || "InfinAssistant"}</span>
          <button
            class="toggle-json-btn"
            @click=${this._toggleJson}
            aria-label=${this._showJson ? "Hide JSON output" : "Show JSON output"}
            aria-expanded=${this._showJson}
          >
            ${this._showJson ? "Hide JSON" : "Show JSON"}
          </button>
        </div>

        <div class="card-content">
          ${this._renderValidationBanner(payloadSize)}
          ${this._renderWatchPreview()}
          ${this._renderSimulator()}
        </div>

        ${this._showJson ? this._renderJsonOutput() : A}

        <div class="card-actions">
          <button
            class="copy-button ${this._copied ? "copied" : ""}"
            @click=${this._handleCopyJson}
            aria-label="Copy watch layout JSON to clipboard"
            aria-live="polite"
          >
            ${this._copied ? "Copied!" : "Copy Watch Layout JSON"}
          </button>
          <button
            class="push-button ${this._pushSuccess ? "success" : ""} ${this._pushError ? "error" : ""}"
            @click=${this._handlePushToWatch}
            ?disabled=${!this._config.device_id || !this._watchLayout}
            aria-label="Push watch face layout to watch"
            aria-live="polite"
          >
            ${this._pushSuccess ? "Pushed!" : this._pushError ? "Failed" : "Push to Watch"}
          </button>
        </div>
        ${this._pushError ? b`<div class="push-error" role="alert">Error: ${this._pushError}</div>` : A}
      </ha-card>
    `;
  }
  /**
   * The validation summary. Tapping it lists the errors, then the warnings, each with its tab
   * and field, so the counts say what to fix and where.
   *
   * Only the summary is the live region. Around the button it would read out the button too,
   * and inside the button it would be lost: a button's content is presentational. So the button
   * is the chevron, stretched over the banner (styles.ts), and the list is in the DOM whenever
   * there is one, hidden while closed, so aria-controls always names it.
   */
  _renderValidationBanner(payloadSize) {
    const valid = this._validation?.valid ?? true;
    const errorCount = this._validation?.errors.length ?? 0;
    const warningCount = this._validation?.warnings.length ?? 0;
    const listed = listedMessages(this._validation);
    const expandable = listed.length > 0;
    const open = this._showMessages && expandable;
    const count = (n3, what) => `${n3} ${what}${n3 !== 1 ? "s" : ""}`;
    const summary = [
      valid ? "Valid configuration" : count(errorCount, "error"),
      ...warningCount > 0 ? [count(warningCount, "warning")] : []
    ].join(", ");
    return b`
      <div class="validation-banner ${valid ? "valid" : "invalid"} ${expandable ? "expandable" : ""}">
        <span class="icon" aria-hidden="true">${valid ? "✅" : "❌"}</span>
        <span role="status">${summary}</span>
        <span class="payload-size">${Math.round(payloadSize / 1024 * 10) / 10} KB</span>
        ${expandable ? b`
              <button
                class="validation-toggle"
                aria-label="Errors and warnings"
                aria-expanded=${open ? "true" : "false"}
                aria-controls="validation-list"
                @click=${() => {
      this._showMessages = !this._showMessages;
    }}
              ><span class="validation-chevron" aria-hidden="true">${open ? "▴" : "▾"}</span></button>
            ` : A}
      </div>
      ${expandable ? b`
            <ul id="validation-list" class="validation-list" aria-label="Errors and warnings" ?hidden=${!open}>
              ${listed.map((m2) => b`
                <li class="validation-item ${m2.severity}">
                  <span class="validation-item-icon" role="img" aria-label=${m2.severity === "error" ? "Error" : "Warning"}>${m2.severity === "error" ? "❌" : "⚠️"}</span>
                  <span class="validation-item-body">
                    <span>${m2.message}</span>
                    <span class="validation-item-where">${m2.tabLabel}${m2.field ? b` \u00B7 <code>${m2.field}</code>` : A}</span>
                  </span>
                </li>
              `)}
            </ul>
          ` : A}
    `;
  }
  _renderWatchPreview() {
    if (!this._watchLayout) {
      return b`<div class="watch-preview charcoal">Loading...</div>`;
    }
    const layout = this._watchLayout;
    const debugClass = this._config.advanced.debug.show_bounds ? "debug-bounds" : "";
    const screens = layout.screens ?? [];
    const index = Math.min(this._previewScreen, Math.max(screens.length - 1, 0));
    const screen = screens[index];
    return b`
      <div
        class="watch-preview ${this._config.theme.preset} ${debugClass}"
        style="--accent-color: ${layout.theme.accent}"
      >
        ${screen !== void 0 ? this._renderScreen(layout, screen, index, screens.length) : this._renderLegacyScreen(layout)}
        ${screen === void 0 ? this._renderStatusBar(layout) : A}
      </div>
      ${screens.length > 1 ? b`
            <div class="preview-nav">
              <button
                aria-label="Previous screen"
                ?disabled=${index === 0}
                @click=${() => {
      this._previewScreen = index - 1;
    }}
              >&#x2039;</button>
              <span>Screen ${index + 1} of ${screens.length}</span>
              <button
                aria-label="Next screen"
                ?disabled=${index === screens.length - 1}
                @click=${() => {
      this._previewScreen = index + 1;
    }}
              >&#x203A;</button>
            </div>
          ` : A}
    `;
  }
  _renderScreen(layout, screen, index, count) {
    if (screen.screenType === 0 && screen.dashboard) {
      return this._renderDashboardScreen(layout, screen.dashboard, index, count);
    }
    return this._renderTileScreen(layout, screen.tiles ?? [], index, count);
  }
  _renderLegacyScreen(layout) {
    return b`
      ${this._renderHeader(layout)}
      ${this._renderEvents(layout)}
      ${this._renderTiles(layout)}
      ${this._renderActions(layout)}
    `;
  }
  /**
   * A tile screen as the watch draws it (firmware 2.4.94; tile-preview.ts): up to 4 dark framed
   * tiles with the name over the state, the active colour while on, and the "n/N" indicator. Until
   * this the preview drew a clock plate with steps and heart rate above small tiles and the
   * actions, none of which the watch shows on a tile screen.
   */
  _renderTileScreen(layout, tiles, index, count) {
    const stateAccent = hexColor(layout.defaultActiveColor, TILE_ACCENT_DEFAULT);
    return b`
      <div class="watch-tile-screen">
        ${tiles.slice(0, 4).map((tile, i2) => this._renderWatchTile(tile, i2, stateAccent))}
        ${count > 1 ? b`<div class="watch-screen-indicator">${index + 1}/${count}</div>` : A}
      </div>
    `;
  }
  _renderWatchTile(tile, index, stateAccent) {
    const { left, top } = tilePosition(index);
    const ownColor = tile.colorMode === "disabled";
    const accent = ownColor ? TILE_ACCENT_DEFAULT : stateAccent;
    const state2 = this._tileState(tile);
    const lit = !ownColor && isActiveState(state2);
    const icon = tile.displayMode === 1 && tile.icon ? TILE_ICON_MDI[tile.icon] : void 0;
    const name = tile.label || "";
    const tight = icon === void 0 && state2 !== null && nameWraps(name);
    const style = [
      `left: ${left}px`,
      `top: ${top}px`,
      `background: ${lit ? litGround(accent) : TILE_GROUND}`,
      `border-color: ${lit || ownColor ? accent : TILE_FRAME}`
    ].join("; ");
    return b`
      <div class="watch-tile2 ${tight ? "tight" : ""}" style=${style}>
        ${icon !== void 0 ? b`<ha-icon class="watch-tile2-icon" icon=${icon}></ha-icon>` : b`<span class="watch-tile2-name">${name}</span>`}
        ${state2 !== null ? b`<span class="watch-tile2-state" style="color: ${lit ? accent : TILE_STATE_OFF}">${formatTileState(state2)}</span>` : A}
      </div>
    `;
  }
  /**
   * The state a tile shows: the entity's live state from Home Assistant, as the watch gets it from
   * the app, and "---" when HA has none. A tile on a device uses the device's first switchable
   * entity, as the app resolves it. Without hass (an editor preview) the simulator stands in.
   * Null for a tile with neither entity nor device: the watch shows its name alone.
   */
  _tileState(tile) {
    if (!tile.entity && !tile.device_id) return null;
    if (!this.hass) {
      if (tile.type === "cover_state") return this._simulator.garage;
      if (tile.type === "media_count") return this._simulator.media;
      return "on";
    }
    const entityId = tile.entity || this._deviceEntity(tile.device_id ?? "");
    return entityId && this.hass.states[entityId]?.state || "---";
  }
  _deviceEntity(deviceId) {
    const entries = Object.values(this.hass?.entities ?? {}).filter((e2) => e2.device_id === deviceId);
    const preferred = ["light", "switch", "fan", "cover", "lock", "input_boolean", "media_player"];
    for (const domain of preferred) {
      const match = entries.find((e2) => e2.entity_id.startsWith(`${domain}.`));
      if (match) return match.entity_id;
    }
    return entries[0]?.entity_id;
  }
  _renderLogbookScreenPreview(screen) {
    const entityCount = screen.logbook?.entityIds?.length ?? 0;
    return b`
      <div style="padding: 8px; text-align: center;">
        <div style="font-size: 28px; font-family: monospace; color: white; margin-bottom: 8px;">12:34</div>
        <div style="font-size: 10px; color: #888; margin-bottom: 8px;">LOGBOOK</div>
        <div style="font-size: 9px; color: #666; padding: 4px;">
          <div style="margin-bottom: 2px;">12:30 &nbsp; Entity turned on</div>
          <div style="margin-bottom: 2px;">12:15 &nbsp; Entity turned off</div>
          <div style="margin-bottom: 2px;">11:45 &nbsp; Entity opened</div>
        </div>
        <div style="font-size: 8px; color: #555; margin-top: 4px;">${entityCount} entities configured</div>
      </div>
    `;
  }
  /**
   * The dashboard as the watch draws it (firmware 2.4.98, "dashboard v8"; dashboard-preview.ts):
   * the date, the screen indicator and the weather on top, the time across the full width, two
   * event lines, the strip of pills with the doors verdict in slot 0, a red bar for a freezer
   * alarm, then the thermostats, the number at home, and battery, steps and heart rate. The text,
   * pills, bar and rule are an SVG of the watch's pixels, placed by baseline; the icons sit over
   * it at their boxes. The states are the entities' live states from hass, as the app sends them
   * to the watch. Battery, steps and heart rate are the watch's own, so the simulator's, as is
   * whether the watch's copy of the state has gone stale.
   */
  _renderDashboardScreen(layout, dashboard, index, count) {
    const states = this.hass?.states ?? {};
    const weatherId = dashboard.weather?.entity;
    const hiLo = (weatherId ? this._forecast[weatherId]?.hiLo : null) ?? legacyHiLo(weatherId ? states[weatherId] : void 0);
    const events = this._events[dashboardCalendars(dashboard, layout).join(",")]?.events ?? null;
    const sim = this._simulator;
    const p2 = dashboardPreview(dashboard, layout, (id) => states[id], /* @__PURE__ */ new Date(), hiLo, { stale: sim.stale === true, events });
    const B2 = DASH_BASE;
    const icon = (name, [left, top], extra = "", color = "") => b`<ha-icon
        class="dash8-icon ${extra}"
        icon=${name}
        style="left: ${left}px; top: ${top}px${color ? `; color: ${color}` : ""}"
      ></ha-icon>`;
    return b`
      <div class="watch-dash8">
        <svg viewBox="0 0 240 240" width="240" height="240" aria-hidden="true">
          <text class="m14" x="6" y=${B2.top} fill=${DASH_GREY}>${p2.date}</text>
          <text class="m14" x="120" y=${B2.top} text-anchor="middle" fill=${DASH_FAINT}>${index + 1}/${count}</text>
          ${p2.weatherTemp !== null ? w`<text class="m18" x="234" y=${B2.top} text-anchor="end" fill=${DASH_WHITE}>${p2.weatherTemp}°</text>` : A}
          ${p2.hiLo !== null ? w`<text class="m14" x="234" y=${B2.hiLo} text-anchor="end" fill=${DASH_GREY}>${p2.hiLo}</text>` : A}
          <text class="time" x="120" y=${B2.time} text-anchor="middle" fill=${DASH_WHITE}>${p2.clock}</text>
          ${p2.events.map((e2, i2) => w`
            <text class="m14" x="6" y=${B2.event + 18 * i2} fill=${e2.startColor}>${e2.start}</text>
            <text class="m14" x=${TITLE_X} y=${B2.event + 18 * i2} fill=${DASH_WHITE}>${e2.title}</text>
          `)}
          ${p2.pills.map((pill) => w`
            <rect x=${pillX(pill.slot)} y=${PILL.y} width=${PILL.w} height=${PILL.h} rx=${PILL.radius} fill=${pill.fill}></rect>
            <text class="m14" x=${pillX(pill.slot) + PILL.w / 2} y=${B2.pill} text-anchor="middle" fill=${DASH_INK}>${pill.letter}</text>
          `)}
          <line x1="6" y1="185.5" x2="234" y2="185.5" stroke=${DASH_RULE} stroke-width="1"></line>
          ${p2.freezer !== null ? w`
                <rect x="0" y="175" width="240" height="20" fill=${DASH_RED}></rect>
                <text class="bold" x="120" y=${B2.freezer} text-anchor="middle" fill=${DASH_INK}>${p2.freezer}</text>
              ` : A}
          <text class="m18" x="6" y=${B2.house} fill=${p2.thermostatColor}>${p2.thermostats}</text>
          ${p2.home !== null ? w`<text class="m18" x="206" y=${B2.house} fill=${DASH_WHITE}>${p2.home}</text>` : A}
          <text class="m18" x="34" y=${B2.watch} fill=${DASH_WHITE}>${sim.battery}%</text>
          <text class="m18" x="116" y=${B2.watch} fill=${DASH_WHITE}>${sim.steps}</text>
          <text class="m18" x="206" y=${B2.watch} fill=${DASH_WHITE}>${formatHeartRate(sim.heartRate)}</text>
        </svg>
        ${p2.freezer !== null ? b`<div
              class="dash8-freezer"
              title=${p2.freezer === "!--" ? "A freezer sensor has no reading" : "The watch shows this once a freezer has stayed above 15 °F (-9 °C) for 20 minutes"}
            ></div>` : A}
        ${p2.weatherIcon !== null ? icon(p2.weatherIcon, DASH_ICON.weather, "dash8-weather") : A}
        ${p2.check !== null ? icon("mdi:check-bold", DASH_ICON.check, "", p2.check) : A}
        ${icon("mdi:home", DASH_ICON.home)}
        ${icon(batteryIcon(sim.battery), DASH_ICON.battery, "dash8-battery")}
        ${icon("mdi:shoe-print", DASH_ICON.steps)}
        ${icon("mdi:heart-pulse", DASH_ICON.heart)}
      </div>
    `;
  }
  _renderHeader(layout) {
    const now = /* @__PURE__ */ new Date();
    const timeStr = layout.header.time.format === "HH:mm" ? `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}` : `${(now.getHours() % 12 || 12).toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const getPresenceColor = () => {
      switch (this._simulator.presence) {
        case "home":
          return "#00C853";
        case "away":
          return "#FFD600";
        case "long_away":
          return "#FF5252";
        default:
          return "#9E9E9E";
      }
    };
    return b`
      <div class="watch-header">
        <div class="watch-time align-${layout.header.time.align}">${timeStr}</div>
        <div class="presence-icons">
          ${layout.header.presence.enabled && layout.header.presence.icons.map(
      (icon) => b`
              <div class="presence-icon" style="background: ${getPresenceColor()}">
                <svg viewBox="0 0 24 24" fill="white">
                  <path d="${getGlyphPath(icon.type)}"/>
                </svg>
              </div>
            `
    )}
        </div>
      </div>
    `;
  }
  _renderEvents(layout) {
    if (!layout.events.enabled || layout.events.calendars.length === 0) {
      return b`<div class="watch-events"></div>`;
    }
    const maxEvents = layout.events.maxEvents || 2;
    const placeholderEvents = layout.events.calendars.slice(0, maxEvents).map((_2, i2) => ({
      time: `In ${i2 + 1}h`,
      title: `Event ${i2 + 1}`,
      isSoon: i2 === 0
    }));
    return b`
      <div class="watch-events">
        ${placeholderEvents.map(
      (event) => b`
            <div class="event-row ${event.isSoon ? "soon" : ""}">
              ${event.time}: ${event.title}
            </div>
          `
    )}
      </div>
    `;
  }
  _renderTiles(layout, _tileLayout = 4, screenTiles) {
    const columns = 2;
    const maxTiles = 4;
    const emptyTile = {
      label: "",
      entity: "",
      type: "sensor_value",
      colorMode: "auto",
      rules: [],
      tap: "none",
      format: { prefix: "", suffix: "", unit: "", uppercase: false }
    };
    const tiles = [...screenTiles || layout.tiles];
    while (tiles.length < maxTiles) {
      tiles.push(emptyTile);
    }
    const getPreviewValue = (tile) => {
      if (!tile.entity) return "-";
      switch (tile.type) {
        case "count":
          return "5";
        case "duration":
          return "2h";
        case "cover_state":
          return this._simulator.garage === "open" ? "OPEN" : "CLSD";
        case "media_count":
          return this._simulator.media === "playing" ? "▶" : "⏹";
        case "state_text":
          return "ON";
        case "sensor_value":
        default:
          return "72°";
      }
    };
    const getPreviewColor = (tile) => {
      if (!tile.entity) return "transparent";
      if (tile.colorMode === "disabled") {
        return "#FFFFFF";
      }
      switch (tile.type) {
        case "cover_state":
          return this._simulator.garage === "open" ? "#FF5252" : "#00C853";
        case "media_count":
          return this._simulator.media === "playing" ? "#FFD600" : "#9E9E9E";
        default:
          return "#FFFFFF";
      }
    };
    const getLabelDisplay = (tile) => {
      if (tile.displayMode === 1 && tile.icon) {
        return `[${tile.icon}]`;
      }
      return tile.label || "";
    };
    return b`
      <div class="watch-tiles" style="grid-template-columns: repeat(${columns}, 1fr);">
        ${tiles.slice(0, maxTiles).map(
      (tile) => b`
            <div class="watch-tile">
              <span class="tile-label">${getLabelDisplay(tile)}</span>
              <span class="tile-value" style="color: ${getPreviewColor(tile)}">${getPreviewValue(tile)}</span>
            </div>
          `
    )}
      </div>
    `;
  }
  _renderActions(layout, screenActions) {
    const actions = screenActions ?? layout.actions ?? [];
    if (actions.length === 0) {
      return b`<div class="watch-actions"></div>`;
    }
    const getActionColor = (action) => {
      if (!action.stateColor) return "#FFFFFF";
      if (action.actionType.startsWith("cover.")) {
        return this._simulator.garage === "open" ? "#FF5252" : "#00C853";
      }
      if (action.actionType === "media.play_pause") {
        return this._simulator.media === "playing" ? "#FFD600" : "#9E9E9E";
      }
      return "#FFFFFF";
    };
    return b`
      <div class="watch-actions">
        ${actions.map(
      (action) => b`
            <div class="watch-action" style="color: ${getActionColor(action)}">
              ${action.icon ? b`
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="${getGlyphPath(action.icon)}"/>
                </svg>
              ` : A}
              <span>${action.label}</span>
            </div>
          `
    )}
      </div>
    `;
  }
  _renderStatusBar(layout) {
    const { statusBar } = layout;
    const batteryColor = this._simulator.battery < 15 ? "#FF5252" : this._simulator.battery < 30 ? "#FFD600" : "#FFFFFF";
    const bluetoothColor = this._simulator.bluetooth ? "#18A1FF" : "#9E9E9E";
    const notificationsColor = this._simulator.notifications > 0 ? "#18A1FF" : "#9E9E9E";
    return b`
      <div class="watch-status-bar">
        ${statusBar.battery?.enabled ? b`
          <div class="status-item" style="color: ${batteryColor}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="${getGlyphPath("battery")}"/>
            </svg>
            <span>${this._simulator.battery}%</span>
          </div>
        ` : A}

        ${statusBar.steps?.enabled ? b`
          <div class="status-item" style="color: var(--color-white)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="${getGlyphPath("steps")}"/>
            </svg>
            <span>5,234</span>
          </div>
        ` : A}

        ${statusBar.heartRate?.enabled ? b`
          <div class="status-item" style="color: var(--color-red)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="${getGlyphPath("heart")}"/>
            </svg>
            <span>72</span>
          </div>
        ` : A}

        ${statusBar.notifications?.enabled ? b`
          <div class="status-item" style="color: ${notificationsColor}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="${getGlyphPath("bell")}"/>
            </svg>
            <span>${this._simulator.notifications}</span>
          </div>
        ` : A}

        ${statusBar.bluetooth?.enabled ? b`
          <div class="status-item" style="color: ${bluetoothColor}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="${getGlyphPath("bluetooth")}"/>
            </svg>
          </div>
        ` : A}
      </div>
    `;
  }
  _renderJsonOutput() {
    const json = this._watchLayout ? JSON.stringify(this._watchLayout, null, 2) : "{}";
    return b`
      <div class="json-output" role="region" aria-label="Watch layout JSON output">${json}</div>
    `;
  }
  _renderSimulator() {
    return b`
      <div class="simulator-panel">
        <div class="simulator-title">State Simulator</div>
        <div class="simulator-controls">
          <div class="simulator-control">
            <label for="sim-garage">Garage</label>
            <select
              id="sim-garage"
              aria-label="Simulate garage state"
              .value=${this._simulator.garage}
              @change=${(e2) => {
      this._simulator = { ...this._simulator, garage: e2.target.value };
      this._updateLayout();
    }}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div class="simulator-control">
            <label for="sim-media">Media</label>
            <select
              id="sim-media"
              aria-label="Simulate media state"
              .value=${this._simulator.media}
              @change=${(e2) => {
      this._simulator = { ...this._simulator, media: e2.target.value };
      this._updateLayout();
    }}
            >
              <option value="playing">Playing</option>
              <option value="paused">Paused</option>
              <option value="idle">Idle</option>
            </select>
          </div>

          <div class="simulator-control">
            <label for="sim-presence">Presence</label>
            <select
              id="sim-presence"
              aria-label="Simulate presence state"
              .value=${this._simulator.presence}
              @change=${(e2) => {
      this._simulator = { ...this._simulator, presence: e2.target.value };
      this._updateLayout();
    }}
            >
              <option value="home">Home</option>
              <option value="away">Away</option>
              <option value="long_away">Long Away</option>
            </select>
          </div>

          <div class="simulator-control">
            <label for="sim-notifications">Notifications</label>
            <input
              id="sim-notifications"
              aria-label="Simulate notification count"
              type="number"
              min="0"
              max="99"
              .value=${this._simulator.notifications.toString()}
              @input=${(e2) => {
      this._simulator = { ...this._simulator, notifications: parseInt(e2.target.value) || 0 };
      this._updateLayout();
    }}
            />
          </div>

          <div class="simulator-control">
            <label for="sim-bluetooth">Bluetooth</label>
            <select
              id="sim-bluetooth"
              aria-label="Simulate bluetooth state"
              .value=${this._simulator.bluetooth ? "connected" : "disconnected"}
              @change=${(e2) => {
      this._simulator = { ...this._simulator, bluetooth: e2.target.value === "connected" };
      this._updateLayout();
    }}
            >
              <option value="connected">Connected</option>
              <option value="disconnected">Disconnected</option>
            </select>
          </div>

          <div class="simulator-control">
            <label for="sim-battery">Battery %</label>
            <input
              id="sim-battery"
              aria-label="Simulate battery percentage"
              type="range"
              min="0"
              max="100"
              .value=${this._simulator.battery.toString()}
              @input=${(e2) => {
      this._simulator = { ...this._simulator, battery: parseInt(e2.target.value) };
      this._updateLayout();
    }}
            />
            <span>${this._simulator.battery}%</span>
          </div>

          <div class="simulator-control">
            <label for="sim-stale">Dashboard state</label>
            <select
              id="sim-stale"
              aria-label="Simulate how old the watch's dashboard state is"
              .value=${this._simulator.stale ? "stale" : "fresh"}
              @change=${(e2) => {
      this._simulator = { ...this._simulator, stale: e2.target.value === "stale" };
    }}
            >
              <option value="fresh">Fresh</option>
              <option value="stale">Over 30 min old</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }
};
InfinassistantWatchfaceCard.styles = [
  sharedStyles,
  previewStyles,
  i$3`
      :host {
        display: block;
      }

      ha-card {
        overflow: hidden;
      }

      .card-header {
        padding: 16px 16px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .card-title {
        font-size: 18px;
        font-weight: 500;
      }

      .card-actions {
        display: flex;
        gap: 8px;
        padding: 8px 16px 16px;
        justify-content: center;
      }

      .json-output {
        margin: 0 16px 16px;
        padding: 12px;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 4px;
        font-family: monospace;
        font-size: 11px;
        max-height: 200px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }

      .toggle-json-btn {
        background: none;
        border: 1px solid var(--divider-color, #e0e0e0);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
      }

      .toggle-json-btn:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }

      /* Simulator panel */
      .simulator-panel {
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 4px;
        padding: 12px;
        margin-top: 12px;
      }

      .simulator-title {
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--secondary-text-color, #757575);
      }

      .simulator-controls {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .simulator-control {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .simulator-control label {
        font-size: 10px;
        color: var(--secondary-text-color, #757575);
      }

      .simulator-control select,
      .simulator-control input {
        padding: 4px;
        font-size: 12px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 2px;
      }
    `
];
__decorateClass([
  n2({ attribute: false })
], InfinassistantWatchfaceCard.prototype, "hass", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_config", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_validation", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_watchLayout", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_copied", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_showJson", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_showMessages", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_simulator", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_previewScreen", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_forecast", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_events", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_pushSuccess", 2);
__decorateClass([
  r()
], InfinassistantWatchfaceCard.prototype, "_pushError", 2);
InfinassistantWatchfaceCard = __decorateClass([
  defineCard(CARD_TAG)
], InfinassistantWatchfaceCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((c2) => c2.type === "custom:" + CARD_TAG)) {
  window.customCards.push({
    type: "custom:" + CARD_TAG,
    name: "InfinAssistant Watch Face",
    description: "Configure and preview your InfiniTime watch face layout",
    preview: false
    // Disable preview to avoid scoped registry timing issues
  });
}
export {
  InfinassistantWatchfaceCard
};
//# sourceMappingURL=infinassistant-watchface.js.map
