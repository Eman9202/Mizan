/* Translate UI text nodes without replacing elements, controls or user-entered values. */
(() => {
  'use strict';
  const dictionaries = {}, originals = new WeakMap(), attributes = new WeakMap();
  const reverse = new Map();
  let language = 'ar', observer;
  const arabic = /[\u0600-\u06ff]/;
  const excluded = 'script,style,textarea,.msg.me,[data-user-content],#contextSummary';
  const attributeNames = ['placeholder', 'title', 'aria-label', 'alt'];
  function register(locales) {
    for (const [lang, entries] of Object.entries(locales)) {
      dictionaries[lang] = {...dictionaries[lang], ...entries, ...(window.MizanLocaleExtras?.[lang] || {})};
      for (const [source, target] of Object.entries(dictionaries[lang])) if (target !== source) reverse.set(target, source);
    }
  }
  register(window.MizanLocaleExtras || {});
  function translate(source) {
    if (language === 'ar') return source;
    const dict = dictionaries[language] || {};
    if (dict[source]) return dict[source];
    // Keep decorative emoji around dynamically rendered labels.
    const match = source.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u);
    if (match && dict[match[2]]) return match[1] + dict[match[2]] + match[3];
    return window.MizanLocaleFormat?.(source, language) ?? source;
  }
  function valueFor(value, record) {
    const trimmed = value.trim();
    // App rendering may replace the value after translation; retain its new source.
    const source = record && value === record.rendered ? record.source : (reverse.get(trimmed) || trimmed);
    const translated = translate(source);
    return {source, rendered: value.slice(0, value.length - value.trimStart().length) + translated + value.slice(value.trimEnd().length)};
  }
  function watch() {
    observer?.observe(document.documentElement, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:[...attributeNames,'lang']});
  }
  function refresh() {
    if (!document.createTreeWalker) return;
    observer?.disconnect();
    try {
      language = document.documentElement.lang || language;
      document.querySelectorAll('option:not([value])').forEach(el => el.setAttribute('value', el.textContent));
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.parentElement || node.parentElement.closest(excluded) || !node.nodeValue.trim()) continue;
        const record = valueFor(node.nodeValue, originals.get(node));
        originals.set(node, record);
        if (record.rendered !== node.nodeValue) node.nodeValue = record.rendered;
      }
      document.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(el => {
        if (el.matches('[data-user-content]')) return;
        const records = attributes.get(el) || {};
        for (const name of attributeNames) {
          if (!el.hasAttribute(name)) continue;
          const value = el.getAttribute(name), record = valueFor(value, records[name]);
          records[name] = record;
          if (record.rendered !== value) el.setAttribute(name, record.rendered);
        }
        attributes.set(el, records);
      });
    } finally { watch(); }
  }
  function setLanguage(lang) {
    language = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    refresh();
  }
  window.MizanI18n = {register, setLanguage, refresh, t:translate};
  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(refresh);
    refresh();
  }
})();
