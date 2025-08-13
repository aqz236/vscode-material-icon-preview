import process from 'node:process';globalThis._importMeta_={url:import.meta.url,env:process.env};import http, { Server as Server$1 } from 'node:http';
import https, { Server } from 'node:https';
import { EventEmitter } from 'node:events';
import { Buffer as Buffer$1 } from 'node:buffer';
import { promises, existsSync } from 'node:fs';
import { resolve as resolve$1, dirname as dirname$1, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function decode(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/");
  }
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/") ? input : input + "/";
  }
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    return input;
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const trimmed = input.slice(_base.length);
  return trimmed[0] === "/" ? trimmed : "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = Object.assign({}, defaults);
  for (const key in baseObject) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function o(n){throw new Error(`${n} is not implemented yet!`)}let i$1 = class i extends EventEmitter{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}};let l$1 = class l extends EventEmitter{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u,s);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}};const c=class{allowHalfOpen=true;_destroy;constructor(e=new i$1,t=new l$1){Object.assign(this,e),Object.assign(this,t),this._destroy=g(e._destroy,t._destroy);}};function _(){return Object.assign(c.prototype,i$1.prototype),Object.assign(c.prototype,l$1.prototype),c}function g(...n){return function(...e){for(const t of n)t(...e);}}const m=_();class A extends m{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}}class y extends i$1{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}}function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}class w extends l$1{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}}const E=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R(n={}){const e=new E,t=Array.isArray(n)||H(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H(n){return typeof n?.entries=="function"}function v(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S=new Set([101,204,205,304]);async function b(n,e){const t=new y,r=new w(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C(n,e,t={}){try{const r=await b(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, void 0, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.node.req.headers["x-forwarded-host"];
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}

const RawBodySymbol = Symbol.for("h3RawBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      if (_resolved instanceof FormData) {
        return new Response(_resolved).bytes().then((uint8arr) => Buffer.from(uint8arr));
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !String(event.node.req.headers["transfer-encoding"] ?? "").split(",").map((e) => e.trim()).filter(Boolean).includes("chunked")) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== void 0) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function removeResponseHeader(event, name) {
  return event.node.res.removeHeader(name);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => void 0);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== void 0) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
    for (const [key, value] of entries) {
      if (value !== void 0) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  if (!isEventHandler(input)) {
    console.warn(
      "[h3] Implicit event handler conversion is deprecated. Use `eventHandler()` or `fromNodeMiddleware()` to define event handlers.",
      _route && _route !== "/" ? `
     Route: ${_route}` : "",
      `
     Handler: ${input}`
    );
  }
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : void 0;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _reqPath = event._path || event.node.req.url || "/";
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _layerPath;
      const val = await layer.handler(event);
      const _body = val === void 0 ? void 0 : await val;
      if (_body !== void 0) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, void 0);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, void 0);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, void 0)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, void 0, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, void 0, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler, void 0, path);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === void 0 && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const s$1=globalThis.Headers,i=globalThis.AbortController,l=globalThis.fetch||(()=>{throw new Error("[node-fetch-native] Failed to fetch: `globalThis.fetch` is not available!")});

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        context.options.body = typeof context.options.body === "string" ? context.options.body : JSON.stringify(context.options.body);
        context.options.headers = new Headers(context.options.headers || {});
        if (!context.options.headers.has("content-type")) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return l;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return l(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s$1;
const AbortController = globalThis.AbortController || i;
createFetch({ fetch, Headers: Headers$1, AbortController });

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage = createStorage({});

storage.mount('/assets', assets$1);

storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

const e=globalThis.process?.getBuiltinModule?.("crypto")?.hash,r="sha256",s="base64url";function digest(t){if(e)return e(r,t,s);const o=createHash(r).update(t);return globalThis.process?.versions?.webcontainer?o.digest().toString(s):o.digest(s)}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const inlineAppConfig = {};



const appConfig = defuFn(inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner) : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/"
  },
  "nitro": {
    "routeRules": {}
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  {
    return _sharedRuntimeConfig;
  }
}
_deepFreeze(klona(appConfig));
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());

getContext("nitro-app", {
  asyncContext: undefined,
  AsyncLocalStorage: void 0
});

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$0 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    setResponseHeaders(event, res.headers);
    setResponseStatus(event, res.status, res.statusText);
    return send(event, JSON.stringify(res.body, null, 2));
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.method}] ${url}
`, error);
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  setResponseStatus(event, statusCode, statusMessage);
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    statusCode,
    statusMessage,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}

const errorHandlers = [errorHandler$0];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

const plugins = [
  
];

const assets = {
  "/favicon.ico": {
    "type": "image/vnd.microsoft.icon",
    "etag": "\"f1e-ESBTjHetHyiokkO0tT/irBbMO8Y\"",
    "mtime": "2025-08-13T06:36:31.441Z",
    "size": 3870,
    "path": "../public/favicon.ico"
  },
  "/logo192.png": {
    "type": "image/png",
    "etag": "\"14e3-f08taHgqf6/O2oRVTsq5tImHdQA\"",
    "mtime": "2025-08-13T06:36:31.442Z",
    "size": 5347,
    "path": "../public/logo192.png"
  },
  "/logo512.png": {
    "type": "image/png",
    "etag": "\"25c0-RpFfnQJpTtSb/HqVNJR2hBA9w/4\"",
    "mtime": "2025-08-13T06:36:31.442Z",
    "size": 9664,
    "path": "../public/logo512.png"
  },
  "/manifest.json": {
    "type": "application/json",
    "etag": "\"1f2-Oqn/x1R1hBTtEjA8nFhpBeFJJNg\"",
    "mtime": "2025-08-13T06:36:31.442Z",
    "size": 498,
    "path": "../public/manifest.json"
  },
  "/robots.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"43-BEzmj4PuhUNHX+oW9uOnPSihxtU\"",
    "mtime": "2025-08-13T06:36:31.442Z",
    "size": 67,
    "path": "../public/robots.txt"
  },
  "/.vite/manifest.json": {
    "type": "application/json",
    "etag": "\"818-VSHCkTOabvEICv0e1ILFKvSeTAs\"",
    "mtime": "2025-08-13T06:36:31.288Z",
    "size": 2072,
    "path": "../public/.vite/manifest.json"
  },
  "/assets/demo.mcp-todos-CBVNXN9L.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6b6-UNv1vBbmCYaB+0RUiF3oWqJbjrM\"",
    "mtime": "2025-08-13T06:36:31.288Z",
    "size": 1718,
    "path": "../public/assets/demo.mcp-todos-CBVNXN9L.js"
  },
  "/assets/demo.start.api-request-DZSMYmpf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"37e-Zz28MHFWqLa/P5ZvtKBcWajYI6Y\"",
    "mtime": "2025-08-13T06:36:31.298Z",
    "size": 894,
    "path": "../public/assets/demo.start.api-request-DZSMYmpf.js"
  },
  "/assets/demo.start.server-funcs-DXRuneYa.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6c3-Hb59FAfh0K9VtYgu93Y64E57+v0\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 1731,
    "path": "../public/assets/demo.start.server-funcs-DXRuneYa.js"
  },
  "/assets/index-DmE36E-r.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13b06-os0KDS4yXGE0NB6poLFYTEuoxSU\"",
    "mtime": "2025-08-13T06:36:31.299Z",
    "size": 80646,
    "path": "../public/assets/index-DmE36E-r.js"
  },
  "/assets/main-D0RsKdvm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4461c-b5Rn7L1a6Uui/98Z7r8MAd/T+qA\"",
    "mtime": "2025-08-13T06:36:31.299Z",
    "size": 280092,
    "path": "../public/assets/main-D0RsKdvm.js"
  },
  "/assets/styles-Cfz3f-vR.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"70c0-2IxmYkJCESyq9kFcnmEBzUlEzE8\"",
    "mtime": "2025-08-13T06:36:31.299Z",
    "size": 28864,
    "path": "../public/assets/styles-Cfz3f-vR.css"
  },
  "/icons/3d.svg": {
    "type": "image/svg+xml",
    "etag": "\"181-VWlHs4s0DBfUSWBw89zZvcYQcO0\"",
    "mtime": "2025-08-13T06:36:31.288Z",
    "size": 385,
    "path": "../public/icons/3d.svg"
  },
  "/icons/abap.svg": {
    "type": "image/svg+xml",
    "etag": "\"6e-GHAu+6lXaZTvnRVxinLPGSV/Hak\"",
    "mtime": "2025-08-13T06:36:31.298Z",
    "size": 110,
    "path": "../public/icons/abap.svg"
  },
  "/icons/abc.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ea-A4GqN4c/UsoFSTdaSqG6eLOBfRM\"",
    "mtime": "2025-08-13T06:36:31.299Z",
    "size": 746,
    "path": "../public/icons/abc.svg"
  },
  "/icons/actionscript.svg": {
    "type": "image/svg+xml",
    "etag": "\"2f6-4DvyqGzxVWay3EKjdUhYvRlYCfc\"",
    "mtime": "2025-08-13T06:36:31.299Z",
    "size": 758,
    "path": "../public/icons/actionscript.svg"
  },
  "/icons/ada.svg": {
    "type": "image/svg+xml",
    "etag": "\"15c-aJ2YExItjf2JwaLr6MjVTj3elFA\"",
    "mtime": "2025-08-13T06:36:31.299Z",
    "size": 348,
    "path": "../public/icons/ada.svg"
  },
  "/icons/adobe-illustrator.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ff-QIg81Z9YtVoKsQaM7pSTHW8M+HA\"",
    "mtime": "2025-08-13T06:36:31.299Z",
    "size": 511,
    "path": "../public/icons/adobe-illustrator.svg"
  },
  "/icons/adobe-illustrator_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ff-fzNjgY9hgb8KwUWQQMEZ6sqcUtA\"",
    "mtime": "2025-08-13T06:36:31.300Z",
    "size": 511,
    "path": "../public/icons/adobe-illustrator_light.svg"
  },
  "/icons/adobe-photoshop.svg": {
    "type": "image/svg+xml",
    "etag": "\"49b-wvGZO29bATLmC+7JmIMScKVhrnU\"",
    "mtime": "2025-08-13T06:36:31.299Z",
    "size": 1179,
    "path": "../public/icons/adobe-photoshop.svg"
  },
  "/icons/adobe-photoshop_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"49b-iWcERmmR5J3eGkx/rE80HQjkdj0\"",
    "mtime": "2025-08-13T06:36:31.300Z",
    "size": 1179,
    "path": "../public/icons/adobe-photoshop_light.svg"
  },
  "/icons/adobe-swc.svg": {
    "type": "image/svg+xml",
    "etag": "\"129-Zf2AlLqx6BXNyYNHWOw5pvxEtQU\"",
    "mtime": "2025-08-13T06:36:31.299Z",
    "size": 297,
    "path": "../public/icons/adobe-swc.svg"
  },
  "/icons/adonis.svg": {
    "type": "image/svg+xml",
    "etag": "\"106-RwIso1LN/UDi9sCMfVS4fHldhRc\"",
    "mtime": "2025-08-13T06:36:31.299Z",
    "size": 262,
    "path": "../public/icons/adonis.svg"
  },
  "/icons/advpl.svg": {
    "type": "image/svg+xml",
    "etag": "\"307-tv6U57e4KUGnhfUBvUzcFVnTq4w\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 775,
    "path": "../public/icons/advpl.svg"
  },
  "/icons/amplify.svg": {
    "type": "image/svg+xml",
    "etag": "\"97-m64AkR0lySo98/0xFCkKg9dENe8\"",
    "mtime": "2025-08-13T06:36:31.300Z",
    "size": 151,
    "path": "../public/icons/amplify.svg"
  },
  "/icons/android.svg": {
    "type": "image/svg+xml",
    "etag": "\"1fd-E+s79AjShaDQ2g3zeW0pLBNcNdE\"",
    "mtime": "2025-08-13T06:36:31.300Z",
    "size": 509,
    "path": "../public/icons/android.svg"
  },
  "/icons/angular.svg": {
    "type": "image/svg+xml",
    "etag": "\"107-fBqLj0i5VFip4glIJJuK8d1RIkE\"",
    "mtime": "2025-08-13T06:36:31.301Z",
    "size": 263,
    "path": "../public/icons/angular.svg"
  },
  "/icons/antlr.svg": {
    "type": "image/svg+xml",
    "etag": "\"337-9Zb863twxm1lrFod80GSqHiDUUM\"",
    "mtime": "2025-08-13T06:36:31.301Z",
    "size": 823,
    "path": "../public/icons/antlr.svg"
  },
  "/icons/apiblueprint.svg": {
    "type": "image/svg+xml",
    "etag": "\"16b-ZB8w880RQSxCc8Pm9biUKnWRquI\"",
    "mtime": "2025-08-13T06:36:31.301Z",
    "size": 363,
    "path": "../public/icons/apiblueprint.svg"
  },
  "/icons/apollo.svg": {
    "type": "image/svg+xml",
    "etag": "\"1af-2+hOPEF0cDijo7H3GVRRw1Z1KN0\"",
    "mtime": "2025-08-13T06:36:31.301Z",
    "size": 431,
    "path": "../public/icons/apollo.svg"
  },
  "/icons/applescript.svg": {
    "type": "image/svg+xml",
    "etag": "\"24f-G6R+dfbcVinaMmUgwVK5eTmd5R4\"",
    "mtime": "2025-08-13T06:36:31.302Z",
    "size": 591,
    "path": "../public/icons/applescript.svg"
  },
  "/icons/apps-script.svg": {
    "type": "image/svg+xml",
    "etag": "\"308-UfnOKQaGbd7RVE/gP93RBk8154Q\"",
    "mtime": "2025-08-13T06:36:31.302Z",
    "size": 776,
    "path": "../public/icons/apps-script.svg"
  },
  "/icons/appveyor.svg": {
    "type": "image/svg+xml",
    "etag": "\"308-ey8b6hegb05qHAvJf7hra+VnEOA\"",
    "mtime": "2025-08-13T06:36:31.302Z",
    "size": 776,
    "path": "../public/icons/appveyor.svg"
  },
  "/icons/architecture.svg": {
    "type": "image/svg+xml",
    "etag": "\"243-gobl8m0GPwMv5lxO/gjl9J41tDY\"",
    "mtime": "2025-08-13T06:36:31.302Z",
    "size": 579,
    "path": "../public/icons/architecture.svg"
  },
  "/icons/arduino.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a2-eZULypygtS/CAMiqN+/gU25K7V0\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 418,
    "path": "../public/icons/arduino.svg"
  },
  "/icons/asciidoc.svg": {
    "type": "image/svg+xml",
    "etag": "\"119-M5XjTpnieCMJFY7Zjb+2xVwCCN8\"",
    "mtime": "2025-08-13T06:36:31.302Z",
    "size": 281,
    "path": "../public/icons/asciidoc.svg"
  },
  "/icons/assembly.svg": {
    "type": "image/svg+xml",
    "etag": "\"19f-6yxu+WaipBZZRmDT+pfWaDY1r7w\"",
    "mtime": "2025-08-13T06:36:31.302Z",
    "size": 415,
    "path": "../public/icons/assembly.svg"
  },
  "/icons/astro-config.svg": {
    "type": "image/svg+xml",
    "etag": "\"205-jl8MkeCf4VMZt7qnBOkMXpfb7ok\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 517,
    "path": "../public/icons/astro-config.svg"
  },
  "/icons/astro.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ae-k1hHk3rGbT7QWBL8DMReFUGDKRs\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 686,
    "path": "../public/icons/astro.svg"
  },
  "/icons/astyle.svg": {
    "type": "image/svg+xml",
    "etag": "\"241-FwLLNQkNLaS/dHf12CECVwH8n2I\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 577,
    "path": "../public/icons/astyle.svg"
  },
  "/icons/audio.svg": {
    "type": "image/svg+xml",
    "etag": "\"b9-bGdPfjTaGnnUoGIkm6/LNi4rwC8\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 185,
    "path": "../public/icons/audio.svg"
  },
  "/icons/aurelia.svg": {
    "type": "image/svg+xml",
    "etag": "\"12d7-iNqkhiu81IQN/hb8DBh9lnKI488\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 4823,
    "path": "../public/icons/aurelia.svg"
  },
  "/icons/authors.svg": {
    "type": "image/svg+xml",
    "etag": "\"214-aDcfg+5fRTV6cE7QUAriGZzhpCY\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 532,
    "path": "../public/icons/authors.svg"
  },
  "/icons/auto.svg": {
    "type": "image/svg+xml",
    "etag": "\"474-wxLjeiZYclFQcYOQEwf2PgFZ22U\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 1140,
    "path": "../public/icons/auto.svg"
  },
  "/icons/auto_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"474-rSBOfmSc8A12Ht04xN+zbEw45AU\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 1140,
    "path": "../public/icons/auto_light.svg"
  },
  "/icons/autohotkey.svg": {
    "type": "image/svg+xml",
    "etag": "\"4c9-cwKXsKAbaG7K2KbdTmUK4GdHz+I\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 1225,
    "path": "../public/icons/autohotkey.svg"
  },
  "/icons/autoit.svg": {
    "type": "image/svg+xml",
    "etag": "\"180-DUlC+rfu6HB8GyI0LBjqi6VpC9M\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 384,
    "path": "../public/icons/autoit.svg"
  },
  "/icons/azure-pipelines.svg": {
    "type": "image/svg+xml",
    "etag": "\"2eb-43XHuH95tReS5Yf0pa7X9XepJfc\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 747,
    "path": "../public/icons/azure-pipelines.svg"
  },
  "/icons/azure.svg": {
    "type": "image/svg+xml",
    "etag": "\"254-9Qaj/z3hcXqqrmSANVMNVzUNTCE\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 596,
    "path": "../public/icons/azure.svg"
  },
  "/icons/babel.svg": {
    "type": "image/svg+xml",
    "etag": "\"4ef-VJVDhg6vNYXk+pBRx3mm40x+y4s\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 1263,
    "path": "../public/icons/babel.svg"
  },
  "/icons/ballerina.svg": {
    "type": "image/svg+xml",
    "etag": "\"cc-VREuE8HvHTYtr9uWJC8+g2yQCSk\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 204,
    "path": "../public/icons/ballerina.svg"
  },
  "/icons/bazel.svg": {
    "type": "image/svg+xml",
    "etag": "\"26c-oMdNhKh8c0wobWQqyTmml60hc68\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 620,
    "path": "../public/icons/bazel.svg"
  },
  "/icons/bbx.svg": {
    "type": "image/svg+xml",
    "etag": "\"2f3-RKQVi+MO33ndcwAf8W/b9AI+q0s\"",
    "mtime": "2025-08-13T06:36:31.303Z",
    "size": 755,
    "path": "../public/icons/bbx.svg"
  },
  "/icons/beancount.svg": {
    "type": "image/svg+xml",
    "etag": "\"188-VXFBKn2a6IdN5f3ZgXmB8RBTSac\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 392,
    "path": "../public/icons/beancount.svg"
  },
  "/icons/bench-js.svg": {
    "type": "image/svg+xml",
    "etag": "\"293-wN+PsS5aNsqXYMoQbpSZS4bJFJk\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 659,
    "path": "../public/icons/bench-js.svg"
  },
  "/icons/bench-jsx.svg": {
    "type": "image/svg+xml",
    "etag": "\"293-lx7k7ryVRX9XBt7ymQCX8h6lXGU\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 659,
    "path": "../public/icons/bench-jsx.svg"
  },
  "/icons/bench-ts.svg": {
    "type": "image/svg+xml",
    "etag": "\"293-gD0V03LWyZYUpgLk6iHIcEqLKco\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 659,
    "path": "../public/icons/bench-ts.svg"
  },
  "/icons/bibliography.svg": {
    "type": "image/svg+xml",
    "etag": "\"33e-6J9iPlFOYwNsDw7evoQI5MCgpts\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 830,
    "path": "../public/icons/bibliography.svg"
  },
  "/icons/bibtex-style.svg": {
    "type": "image/svg+xml",
    "etag": "\"458-SZn+fkuBRBbNcfA3QPhgICHfwZI\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 1112,
    "path": "../public/icons/bibtex-style.svg"
  },
  "/icons/bicep.svg": {
    "type": "image/svg+xml",
    "etag": "\"e2-EtucZIorJlJ4d7sYGm+cOgHviUk\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 226,
    "path": "../public/icons/bicep.svg"
  },
  "/icons/biome.svg": {
    "type": "image/svg+xml",
    "etag": "\"137-KH7ADcNRgUMJUTsiWESqj0kb8Y4\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 311,
    "path": "../public/icons/biome.svg"
  },
  "/icons/bitbucket.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ad-BrZ+/IvDo/inRg6c83p5Wlj2wp8\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 685,
    "path": "../public/icons/bitbucket.svg"
  },
  "/icons/bithound.svg": {
    "type": "image/svg+xml",
    "etag": "\"80c-PSaodyDNmaxKukSj1CgtDB7xRlg\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 2060,
    "path": "../public/icons/bithound.svg"
  },
  "/icons/blender.svg": {
    "type": "image/svg+xml",
    "etag": "\"2a0-kA0cMfoLArGB43bX5LRkpMimNxI\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 672,
    "path": "../public/icons/blender.svg"
  },
  "/icons/blink.svg": {
    "type": "image/svg+xml",
    "etag": "\"595-Mbk+nLPhGkA3IQLQFOOyVoCXF8I\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 1429,
    "path": "../public/icons/blink.svg"
  },
  "/icons/blink_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"5c8-v4JuZiLi72V9apcRU8Az8uxZ7EE\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 1480,
    "path": "../public/icons/blink_light.svg"
  },
  "/icons/blitz.svg": {
    "type": "image/svg+xml",
    "etag": "\"15a-WuOXYftdXXTNKHj1lEvSWoYd/O0\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 346,
    "path": "../public/icons/blitz.svg"
  },
  "/icons/bower.svg": {
    "type": "image/svg+xml",
    "etag": "\"e8b-IOjVlJCWOdLZqFy6ISJtLEoqLbk\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 3723,
    "path": "../public/icons/bower.svg"
  },
  "/icons/brainfuck.svg": {
    "type": "image/svg+xml",
    "etag": "\"751-oaeU+HHj9A9UliQkFL8VWVbcJNw\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 1873,
    "path": "../public/icons/brainfuck.svg"
  },
  "/icons/browserlist.svg": {
    "type": "image/svg+xml",
    "etag": "\"630-BG2XqXLwyu53eQOj1Y3KgLFk/5s\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 1584,
    "path": "../public/icons/browserlist.svg"
  },
  "/icons/browserlist_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"636-hE+HNoa3UD/Q+DCJWq2XI73rqHY\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 1590,
    "path": "../public/icons/browserlist_light.svg"
  },
  "/icons/bruno.svg": {
    "type": "image/svg+xml",
    "etag": "\"24c-fi+kD9KWbXB02MvDlf/4LeSpLAM\"",
    "mtime": "2025-08-13T06:36:31.304Z",
    "size": 588,
    "path": "../public/icons/bruno.svg"
  },
  "/icons/buck.svg": {
    "type": "image/svg+xml",
    "etag": "\"1e8-zBncKwNIWsjDAxmUbd2Lex/n78A\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 488,
    "path": "../public/icons/buck.svg"
  },
  "/icons/bucklescript.svg": {
    "type": "image/svg+xml",
    "etag": "\"208-GbEUA6JRRIwnjIXt1TPT4j7PBjY\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 520,
    "path": "../public/icons/bucklescript.svg"
  },
  "/icons/buildkite.svg": {
    "type": "image/svg+xml",
    "etag": "\"ba-kq3gwk2pGVkMbw5irDKETY+eKC0\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 186,
    "path": "../public/icons/buildkite.svg"
  },
  "/icons/bun.svg": {
    "type": "image/svg+xml",
    "etag": "\"3de-nyO+BKYw1f/+d6t7b409UtvG79g\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 990,
    "path": "../public/icons/bun.svg"
  },
  "/icons/bun_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"6bf-ygXZmg75kpx7TT/TCNX1Th0d80g\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 1727,
    "path": "../public/icons/bun_light.svg"
  },
  "/icons/c.svg": {
    "type": "image/svg+xml",
    "etag": "\"f5-mqrh/SyB3WyMC+bQ83o1NhCFviU\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 245,
    "path": "../public/icons/c.svg"
  },
  "/icons/c3.svg": {
    "type": "image/svg+xml",
    "etag": "\"290-/TnLRWs7TiHLiwQrR5KFXSMGJg8\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 656,
    "path": "../public/icons/c3.svg"
  },
  "/icons/cabal.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ee-zXSpjrr9HxV3pRof7duPJYqCOKA\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 750,
    "path": "../public/icons/cabal.svg"
  },
  "/icons/caddy.svg": {
    "type": "image/svg+xml",
    "etag": "\"23e-fWuB4eT5jPLNRA9/nNxoZuax3N4\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 574,
    "path": "../public/icons/caddy.svg"
  },
  "/icons/cadence.svg": {
    "type": "image/svg+xml",
    "etag": "\"156-MI6iaa37t7zsDcck+sxrsPJF9Fc\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 342,
    "path": "../public/icons/cadence.svg"
  },
  "/icons/cairo.svg": {
    "type": "image/svg+xml",
    "etag": "\"300-igFeXaaZ2Dwem059gIIvx+JU/cU\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 768,
    "path": "../public/icons/cairo.svg"
  },
  "/icons/cake.svg": {
    "type": "image/svg+xml",
    "etag": "\"281-rTdrerbVeiJyTEDnDK01YANCLqI\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 641,
    "path": "../public/icons/cake.svg"
  },
  "/icons/capacitor.svg": {
    "type": "image/svg+xml",
    "etag": "\"157-QvS8UbhudI16cO78dsT+Pm6eM7Q\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 343,
    "path": "../public/icons/capacitor.svg"
  },
  "/icons/capnp.svg": {
    "type": "image/svg+xml",
    "etag": "\"145-0s+Va3ka9o0+JXeHdS8hqn2sZm4\"",
    "mtime": "2025-08-13T06:36:31.305Z",
    "size": 325,
    "path": "../public/icons/capnp.svg"
  },
  "/icons/cbx.svg": {
    "type": "image/svg+xml",
    "etag": "\"3a0-psb7gKI05blCBrCUgTdrq04C4Ok\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 928,
    "path": "../public/icons/cbx.svg"
  },
  "/icons/cds.svg": {
    "type": "image/svg+xml",
    "etag": "\"2bf-4jNxcU48eLk7y3nBXcCY9CtMfas\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 703,
    "path": "../public/icons/cds.svg"
  },
  "/icons/certificate.svg": {
    "type": "image/svg+xml",
    "etag": "\"111-PcHb01lrNZyWiPEA/rLdPx4CM8c\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 273,
    "path": "../public/icons/certificate.svg"
  },
  "/icons/changelog.svg": {
    "type": "image/svg+xml",
    "etag": "\"13a-fcKjmUVon+POKW1ZNO2tRaYzwZo\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 314,
    "path": "../public/icons/changelog.svg"
  },
  "/icons/chess.svg": {
    "type": "image/svg+xml",
    "etag": "\"e9-mRfk4j/fHr0eemKp+zJIn/5GPxk\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 233,
    "path": "../public/icons/chess.svg"
  },
  "/icons/chess_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"e9-DZQU4c7pzLDyEQOCLfwgHOT6NOs\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 233,
    "path": "../public/icons/chess_light.svg"
  },
  "/icons/chrome.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d9-CyuQQZ31ee2htZrG/tAWZuhgHsY\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 473,
    "path": "../public/icons/chrome.svg"
  },
  "/icons/circleci.svg": {
    "type": "image/svg+xml",
    "etag": "\"13f-SCaAPfq4lL5RuToY3ZQbf33ET10\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 319,
    "path": "../public/icons/circleci.svg"
  },
  "/icons/circleci_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"13f-bpX8RXr5n5ix7DEko9cUF3Pb000\"",
    "mtime": "2025-08-13T06:36:31.307Z",
    "size": 319,
    "path": "../public/icons/circleci_light.svg"
  },
  "/icons/citation.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c1-Jwq3fJMLlxalkELEZY+i8Eyh17A\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 449,
    "path": "../public/icons/citation.svg"
  },
  "/icons/clangd.svg": {
    "type": "image/svg+xml",
    "etag": "\"14b-uGWDT3UxPBbvHr+3lFeTJuqeYUg\"",
    "mtime": "2025-08-13T06:36:31.307Z",
    "size": 331,
    "path": "../public/icons/clangd.svg"
  },
  "/icons/claude.svg": {
    "type": "image/svg+xml",
    "etag": "\"5d1-51UiycAMrPH81MLWNR7Iro+lw0s\"",
    "mtime": "2025-08-13T06:36:31.307Z",
    "size": 1489,
    "path": "../public/icons/claude.svg"
  },
  "/icons/cline.svg": {
    "type": "image/svg+xml",
    "etag": "\"17f-WS8GnPdfYrcPXjQ7SVb4KwYqPww\"",
    "mtime": "2025-08-13T06:36:31.306Z",
    "size": 383,
    "path": "../public/icons/cline.svg"
  },
  "/icons/clojure.svg": {
    "type": "image/svg+xml",
    "etag": "\"712-cX8uMnELdPWTYN0UugMrFtt4TnQ\"",
    "mtime": "2025-08-13T06:36:31.307Z",
    "size": 1810,
    "path": "../public/icons/clojure.svg"
  },
  "/icons/cloudfoundry.svg": {
    "type": "image/svg+xml",
    "etag": "\"902-A5MfzNpe458JUnCW8SsCO2f4g1Y\"",
    "mtime": "2025-08-13T06:36:31.307Z",
    "size": 2306,
    "path": "../public/icons/cloudfoundry.svg"
  },
  "/icons/cmake.svg": {
    "type": "image/svg+xml",
    "etag": "\"148-sBswhN3RWJXk4/ryGIXR93Mdays\"",
    "mtime": "2025-08-13T06:36:31.307Z",
    "size": 328,
    "path": "../public/icons/cmake.svg"
  },
  "/icons/coala.svg": {
    "type": "image/svg+xml",
    "etag": "\"3ec-3sKQT23Zbz83TAHAV1gtOiy74UI\"",
    "mtime": "2025-08-13T06:36:31.307Z",
    "size": 1004,
    "path": "../public/icons/coala.svg"
  },
  "/icons/cobol.svg": {
    "type": "image/svg+xml",
    "etag": "\"219-ue3/5YGXsxCi4tr/LI1j7bf9ofI\"",
    "mtime": "2025-08-13T06:36:31.307Z",
    "size": 537,
    "path": "../public/icons/cobol.svg"
  },
  "/icons/coconut.svg": {
    "type": "image/svg+xml",
    "etag": "\"458-fjX92CVmDe/fJuhNi0CavXQN3tk\"",
    "mtime": "2025-08-13T06:36:31.308Z",
    "size": 1112,
    "path": "../public/icons/coconut.svg"
  },
  "/icons/code-climate.svg": {
    "type": "image/svg+xml",
    "etag": "\"156-oHBqfMYPXITHMpnkeXGbokl0CBk\"",
    "mtime": "2025-08-13T06:36:31.307Z",
    "size": 342,
    "path": "../public/icons/code-climate.svg"
  },
  "/icons/code-climate_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"159-cc0qvn8nkdtt7Rh/xjKuWnR2jIg\"",
    "mtime": "2025-08-13T06:36:31.307Z",
    "size": 345,
    "path": "../public/icons/code-climate_light.svg"
  },
  "/icons/codecov.svg": {
    "type": "image/svg+xml",
    "etag": "\"468-UhRBYe4XN/kirEu+wvO7Kq+Df2c\"",
    "mtime": "2025-08-13T06:36:31.307Z",
    "size": 1128,
    "path": "../public/icons/codecov.svg"
  },
  "/icons/codeowners.svg": {
    "type": "image/svg+xml",
    "etag": "\"106-/k95a0s+uFoszTMk8gN8NG0aYPM\"",
    "mtime": "2025-08-13T06:36:31.308Z",
    "size": 262,
    "path": "../public/icons/codeowners.svg"
  },
  "/icons/coderabbit-ai.svg": {
    "type": "image/svg+xml",
    "etag": "\"4c5-pDWIGZZlE6PI73btqcFwsDpV0Z0\"",
    "mtime": "2025-08-13T06:36:31.308Z",
    "size": 1221,
    "path": "../public/icons/coderabbit-ai.svg"
  },
  "/icons/coffee.svg": {
    "type": "image/svg+xml",
    "etag": "\"d0-FExSCP8i6UBG5fiUbs/iIGbs+Ls\"",
    "mtime": "2025-08-13T06:36:31.308Z",
    "size": 208,
    "path": "../public/icons/coffee.svg"
  },
  "/icons/coldfusion.svg": {
    "type": "image/svg+xml",
    "etag": "\"21a-XlFcmdry2bc2AaQAi7HVnj1V314\"",
    "mtime": "2025-08-13T06:36:31.308Z",
    "size": 538,
    "path": "../public/icons/coldfusion.svg"
  },
  "/icons/coloredpetrinets.svg": {
    "type": "image/svg+xml",
    "etag": "\"16f-dqe4LDZsVvdPxz1vK44yLGnsjYU\"",
    "mtime": "2025-08-13T06:36:31.308Z",
    "size": 367,
    "path": "../public/icons/coloredpetrinets.svg"
  },
  "/icons/command.svg": {
    "type": "image/svg+xml",
    "etag": "\"135-BJZ3qR2Wck8EmPYYTAvAyY1125c\"",
    "mtime": "2025-08-13T06:36:31.308Z",
    "size": 309,
    "path": "../public/icons/command.svg"
  },
  "/icons/commitizen.svg": {
    "type": "image/svg+xml",
    "etag": "\"223-ChnlryU++RMnW+VYV7A1+MZhlR8\"",
    "mtime": "2025-08-13T06:36:31.308Z",
    "size": 547,
    "path": "../public/icons/commitizen.svg"
  },
  "/icons/commitlint.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ba-s0Ws4ty5vE9DO0f7RDolvyf2ihk\"",
    "mtime": "2025-08-13T06:36:31.308Z",
    "size": 442,
    "path": "../public/icons/commitlint.svg"
  },
  "/icons/concourse.svg": {
    "type": "image/svg+xml",
    "etag": "\"11be-JftWgsr5Xx1osPeKRfR3r+t2lk0\"",
    "mtime": "2025-08-13T06:36:31.308Z",
    "size": 4542,
    "path": "../public/icons/concourse.svg"
  },
  "/icons/conduct.svg": {
    "type": "image/svg+xml",
    "etag": "\"137-DY6lysoBbWiopVgFRCEbND00GvU\"",
    "mtime": "2025-08-13T06:36:31.309Z",
    "size": 311,
    "path": "../public/icons/conduct.svg"
  },
  "/icons/console.svg": {
    "type": "image/svg+xml",
    "etag": "\"fd-YM9BjfWrLCDkdPl/8eo7hJ1TxW0\"",
    "mtime": "2025-08-13T06:36:31.308Z",
    "size": 253,
    "path": "../public/icons/console.svg"
  },
  "/icons/contentlayer.svg": {
    "type": "image/svg+xml",
    "etag": "\"381-nYPDDofss3V2TBzBmIthp1oSZls\"",
    "mtime": "2025-08-13T06:36:31.310Z",
    "size": 897,
    "path": "../public/icons/contentlayer.svg"
  },
  "/icons/context.svg": {
    "type": "image/svg+xml",
    "etag": "\"353-Jx+BHrds+k6no96bU6TKH97yA5g\"",
    "mtime": "2025-08-13T06:36:31.309Z",
    "size": 851,
    "path": "../public/icons/context.svg"
  },
  "/icons/contributing.svg": {
    "type": "image/svg+xml",
    "etag": "\"12f-xapt02H+vOr4cSn5IAOR6Dbd6zs\"",
    "mtime": "2025-08-13T06:36:31.309Z",
    "size": 303,
    "path": "../public/icons/contributing.svg"
  },
  "/icons/controller.svg": {
    "type": "image/svg+xml",
    "etag": "\"347-/ysuz8qZTcEwh4ZA1gwbYq3idXc\"",
    "mtime": "2025-08-13T06:36:31.309Z",
    "size": 839,
    "path": "../public/icons/controller.svg"
  },
  "/icons/copilot.svg": {
    "type": "image/svg+xml",
    "etag": "\"5c4-lZVuXRKDJmJn2A0yXsE/THfAgfQ\"",
    "mtime": "2025-08-13T06:36:31.309Z",
    "size": 1476,
    "path": "../public/icons/copilot.svg"
  },
  "/icons/copilot_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"5c4-f3Y8NTvKWjia9ja8PJFYHxlCYIc\"",
    "mtime": "2025-08-13T06:36:31.309Z",
    "size": 1476,
    "path": "../public/icons/copilot_light.svg"
  },
  "/icons/cpp.svg": {
    "type": "image/svg+xml",
    "etag": "\"145-AlEzru8MxtoRkggLWJ2buyih3jA\"",
    "mtime": "2025-08-13T06:36:31.311Z",
    "size": 325,
    "path": "../public/icons/cpp.svg"
  },
  "/icons/craco.svg": {
    "type": "image/svg+xml",
    "etag": "\"305-XYI1tatC5uIeEJaWylKeRKGTWU0\"",
    "mtime": "2025-08-13T06:36:31.309Z",
    "size": 773,
    "path": "../public/icons/craco.svg"
  },
  "/icons/credits.svg": {
    "type": "image/svg+xml",
    "etag": "\"9d-MzlOofnlrBG8LcedTfNihUYB2kM\"",
    "mtime": "2025-08-13T06:36:31.309Z",
    "size": 157,
    "path": "../public/icons/credits.svg"
  },
  "/icons/crystal.svg": {
    "type": "image/svg+xml",
    "etag": "\"1dd-E+qgl0+ceEKQ9lwFEmIX9dZRBjc\"",
    "mtime": "2025-08-13T06:36:31.311Z",
    "size": 477,
    "path": "../public/icons/crystal.svg"
  },
  "/icons/crystal_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"1dd-lJiIxB9hnCUwnk2TaLaNbjEE36E\"",
    "mtime": "2025-08-13T06:36:31.309Z",
    "size": 477,
    "path": "../public/icons/crystal_light.svg"
  },
  "/icons/csharp.svg": {
    "type": "image/svg+xml",
    "etag": "\"14b-ix1ehTxfVUOhHdcdLH7ae23ZRlI\"",
    "mtime": "2025-08-13T06:36:31.310Z",
    "size": 331,
    "path": "../public/icons/csharp.svg"
  },
  "/icons/css-map.svg": {
    "type": "image/svg+xml",
    "etag": "\"2af-XaYJzfDgAbe5q6wbo81gnDLtGbI\"",
    "mtime": "2025-08-13T06:36:31.309Z",
    "size": 687,
    "path": "../public/icons/css-map.svg"
  },
  "/icons/css.svg": {
    "type": "image/svg+xml",
    "etag": "\"2a2-TUintDDIxspvU8KSZAPTIFbj5Lw\"",
    "mtime": "2025-08-13T06:36:31.310Z",
    "size": 674,
    "path": "../public/icons/css.svg"
  },
  "/icons/cucumber.svg": {
    "type": "image/svg+xml",
    "etag": "\"63d-bBdyNzGLTNNAV0hCrfzbkc2/gAY\"",
    "mtime": "2025-08-13T06:36:31.313Z",
    "size": 1597,
    "path": "../public/icons/cucumber.svg"
  },
  "/icons/cuda.svg": {
    "type": "image/svg+xml",
    "etag": "\"361-zCncSCpg4esRaHCn1tLaKqP1hQI\"",
    "mtime": "2025-08-13T06:36:31.311Z",
    "size": 865,
    "path": "../public/icons/cuda.svg"
  },
  "/icons/cypress.svg": {
    "type": "image/svg+xml",
    "etag": "\"36c-EKZFWRCanpJT7Pi68ifKnObGdJA\"",
    "mtime": "2025-08-13T06:36:31.311Z",
    "size": 876,
    "path": "../public/icons/cypress.svg"
  },
  "/icons/d.svg": {
    "type": "image/svg+xml",
    "etag": "\"149-B2R5o/mEBL7rg+zUqwaJRf29yH8\"",
    "mtime": "2025-08-13T06:36:31.311Z",
    "size": 329,
    "path": "../public/icons/d.svg"
  },
  "/icons/dart.svg": {
    "type": "image/svg+xml",
    "etag": "\"2b3-EOfql+v7RWr/Qq5b1IrGowygTDw\"",
    "mtime": "2025-08-13T06:36:31.329Z",
    "size": 691,
    "path": "../public/icons/dart.svg"
  },
  "/icons/dart_generated.svg": {
    "type": "image/svg+xml",
    "etag": "\"2b3-hHTqLqN0WMVbxNgicKKqMh1ivaI\"",
    "mtime": "2025-08-13T06:36:31.311Z",
    "size": 691,
    "path": "../public/icons/dart_generated.svg"
  },
  "/icons/database.svg": {
    "type": "image/svg+xml",
    "etag": "\"14c-n4oDjNhh55DlTjdiYPGT1ZN6ygw\"",
    "mtime": "2025-08-13T06:36:31.311Z",
    "size": 332,
    "path": "../public/icons/database.svg"
  },
  "/icons/deepsource.svg": {
    "type": "image/svg+xml",
    "etag": "\"108-TmrIo016xcYpFZV/qrTknXsdQnw\"",
    "mtime": "2025-08-13T06:36:31.312Z",
    "size": 264,
    "path": "../public/icons/deepsource.svg"
  },
  "/icons/denizenscript.svg": {
    "type": "image/svg+xml",
    "etag": "\"232-hKrsEQhLXXgbPukF0H3oVZtiKa8\"",
    "mtime": "2025-08-13T06:36:31.312Z",
    "size": 562,
    "path": "../public/icons/denizenscript.svg"
  },
  "/icons/deno.svg": {
    "type": "image/svg+xml",
    "etag": "\"4cb-chx8QZ/21QtvxYEkA2q6Ds8vZEQ\"",
    "mtime": "2025-08-13T06:36:31.312Z",
    "size": 1227,
    "path": "../public/icons/deno.svg"
  },
  "/icons/deno_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"199-PpIVF7Ikj7Di5QDyLxKEeso9Ptc\"",
    "mtime": "2025-08-13T06:36:31.312Z",
    "size": 409,
    "path": "../public/icons/deno_light.svg"
  },
  "/icons/dependabot.svg": {
    "type": "image/svg+xml",
    "etag": "\"287-8s8DLdHD0ulxrUZGrkGMGXzM2zI\"",
    "mtime": "2025-08-13T06:36:31.312Z",
    "size": 647,
    "path": "../public/icons/dependabot.svg"
  },
  "/icons/dependencies-update.svg": {
    "type": "image/svg+xml",
    "etag": "\"223-3SAOsjMqNdkP4IvY4yc7AI7anGk\"",
    "mtime": "2025-08-13T06:36:31.312Z",
    "size": 547,
    "path": "../public/icons/dependencies-update.svg"
  },
  "/icons/dhall.svg": {
    "type": "image/svg+xml",
    "etag": "\"153-SVFlKPnHL0AI0VMp1YvIfdLkY9o\"",
    "mtime": "2025-08-13T06:36:31.312Z",
    "size": 339,
    "path": "../public/icons/dhall.svg"
  },
  "/icons/diff.svg": {
    "type": "image/svg+xml",
    "etag": "\"130-m8l9bEprumETnp6SBNOJrir4ncA\"",
    "mtime": "2025-08-13T06:36:31.313Z",
    "size": 304,
    "path": "../public/icons/diff.svg"
  },
  "/icons/dinophp.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d95-qZY0Sezc8fK2NfzVQAXj3Ml62ZE\"",
    "mtime": "2025-08-13T06:36:31.312Z",
    "size": 7573,
    "path": "../public/icons/dinophp.svg"
  },
  "/icons/disc.svg": {
    "type": "image/svg+xml",
    "etag": "\"af-WD6I9NR5wsSaRs8dh3T5+Dqsr7Y\"",
    "mtime": "2025-08-13T06:36:31.313Z",
    "size": 175,
    "path": "../public/icons/disc.svg"
  },
  "/icons/django.svg": {
    "type": "image/svg+xml",
    "etag": "\"1e5-LiWd0ei1eydR2wa7ADvNjTI0y8c\"",
    "mtime": "2025-08-13T06:36:31.313Z",
    "size": 485,
    "path": "../public/icons/django.svg"
  },
  "/icons/dll.svg": {
    "type": "image/svg+xml",
    "etag": "\"304-hOBGH/W+aWgcv2JfwS6zEzzh29A\"",
    "mtime": "2025-08-13T06:36:31.314Z",
    "size": 772,
    "path": "../public/icons/dll.svg"
  },
  "/icons/docker.svg": {
    "type": "image/svg+xml",
    "etag": "\"5dd-6QxH7LYB9gftcMlzAEoHiRlRgV0\"",
    "mtime": "2025-08-13T06:36:31.314Z",
    "size": 1501,
    "path": "../public/icons/docker.svg"
  },
  "/icons/doctex-installer.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c3-e+18+7bymS4DZFv081ufooXPfAI\"",
    "mtime": "2025-08-13T06:36:31.313Z",
    "size": 451,
    "path": "../public/icons/doctex-installer.svg"
  },
  "/icons/document.svg": {
    "type": "image/svg+xml",
    "etag": "\"ea-wT8CgLjA7ULwrl/KSV0VyYXYF4k\"",
    "mtime": "2025-08-13T06:36:31.313Z",
    "size": 234,
    "path": "../public/icons/document.svg"
  },
  "/icons/dotjs.svg": {
    "type": "image/svg+xml",
    "etag": "\"256-LC/C66GYMVfM2PGBKc6hIepI/SA\"",
    "mtime": "2025-08-13T06:36:31.314Z",
    "size": 598,
    "path": "../public/icons/dotjs.svg"
  },
  "/icons/drawio.svg": {
    "type": "image/svg+xml",
    "etag": "\"b6-/dvUVj7m7BIUCKNW/27ik1XHye8\"",
    "mtime": "2025-08-13T06:36:31.314Z",
    "size": 182,
    "path": "../public/icons/drawio.svg"
  },
  "/icons/drizzle.svg": {
    "type": "image/svg+xml",
    "etag": "\"1cd-xWJdWBC5eNwjelcr6QsO2YAu6tU\"",
    "mtime": "2025-08-13T06:36:31.314Z",
    "size": 461,
    "path": "../public/icons/drizzle.svg"
  },
  "/icons/drone.svg": {
    "type": "image/svg+xml",
    "etag": "\"2f1-/Gz/psqrpVoS72fWqc6IyJyHUvs\"",
    "mtime": "2025-08-13T06:36:31.315Z",
    "size": 753,
    "path": "../public/icons/drone.svg"
  },
  "/icons/drone_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"2e8-QpNjn/+NVO2ejQzvVNzfEQTk0ks\"",
    "mtime": "2025-08-13T06:36:31.314Z",
    "size": 744,
    "path": "../public/icons/drone_light.svg"
  },
  "/icons/duc.svg": {
    "type": "image/svg+xml",
    "etag": "\"3f7-qFdUIN1Cbs+C/SCE41IAkHHH/3Q\"",
    "mtime": "2025-08-13T06:36:31.314Z",
    "size": 1015,
    "path": "../public/icons/duc.svg"
  },
  "/icons/dune.svg": {
    "type": "image/svg+xml",
    "etag": "\"98-sOVGJEClVv2nWxpQRi43Fml2elQ\"",
    "mtime": "2025-08-13T06:36:31.315Z",
    "size": 152,
    "path": "../public/icons/dune.svg"
  },
  "/icons/edge.svg": {
    "type": "image/svg+xml",
    "etag": "\"312-nViGHQJ4aoDDk0RJX7485BcI57Q\"",
    "mtime": "2025-08-13T06:36:31.315Z",
    "size": 786,
    "path": "../public/icons/edge.svg"
  },
  "/icons/editorconfig.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f9b-BBkL0f6S7bmYcON7XrxK0R9U9oM\"",
    "mtime": "2025-08-13T06:36:31.315Z",
    "size": 8091,
    "path": "../public/icons/editorconfig.svg"
  },
  "/icons/ejs.svg": {
    "type": "image/svg+xml",
    "etag": "\"1aa-gQC8gDp/CoFKp1VOkt3n5pG972g\"",
    "mtime": "2025-08-13T06:36:31.315Z",
    "size": 426,
    "path": "../public/icons/ejs.svg"
  },
  "/icons/elixir.svg": {
    "type": "image/svg+xml",
    "etag": "\"122-+bVTweTEIvQurqlUYnEz18cB9sk\"",
    "mtime": "2025-08-13T06:36:31.316Z",
    "size": 290,
    "path": "../public/icons/elixir.svg"
  },
  "/icons/elm.svg": {
    "type": "image/svg+xml",
    "etag": "\"216-1ZzZgAn7xFs11HdWOlTKaDRFY38\"",
    "mtime": "2025-08-13T06:36:31.315Z",
    "size": 534,
    "path": "../public/icons/elm.svg"
  },
  "/icons/email.svg": {
    "type": "image/svg+xml",
    "etag": "\"bf-Jv79q6FZlXhq9FGn++GjUlHMcoU\"",
    "mtime": "2025-08-13T06:36:31.316Z",
    "size": 191,
    "path": "../public/icons/email.svg"
  },
  "/icons/ember.svg": {
    "type": "image/svg+xml",
    "etag": "\"229-W8Tdp7ceTcdXGWofpuTwY16COyc\"",
    "mtime": "2025-08-13T06:36:31.315Z",
    "size": 553,
    "path": "../public/icons/ember.svg"
  },
  "/icons/epub.svg": {
    "type": "image/svg+xml",
    "etag": "\"124-ZbQPfDn46FR8cPzonA20wZtDaI0\"",
    "mtime": "2025-08-13T06:36:31.316Z",
    "size": 292,
    "path": "../public/icons/epub.svg"
  },
  "/icons/erlang.svg": {
    "type": "image/svg+xml",
    "etag": "\"21f-J2nuIgnjGkO8iS7kfn4/QTQKijc\"",
    "mtime": "2025-08-13T06:36:31.316Z",
    "size": 543,
    "path": "../public/icons/erlang.svg"
  },
  "/icons/esbuild.svg": {
    "type": "image/svg+xml",
    "etag": "\"159-8osdajh22qjsWIw7vGx/DH2N7vo\"",
    "mtime": "2025-08-13T06:36:31.316Z",
    "size": 345,
    "path": "../public/icons/esbuild.svg"
  },
  "/icons/eslint.svg": {
    "type": "image/svg+xml",
    "etag": "\"299-LUgY+g1ayKqRQS9EJI+S6uE3gy8\"",
    "mtime": "2025-08-13T06:36:31.316Z",
    "size": 665,
    "path": "../public/icons/eslint.svg"
  },
  "/icons/excalidraw.svg": {
    "type": "image/svg+xml",
    "etag": "\"a8-PK6MFgLtY8kRb9Pj+BUh2bMx0zg\"",
    "mtime": "2025-08-13T06:36:31.317Z",
    "size": 168,
    "path": "../public/icons/excalidraw.svg"
  },
  "/icons/exe.svg": {
    "type": "image/svg+xml",
    "etag": "\"b2-jV3rBJWRD2gttn5R5v9cgWo2r7g\"",
    "mtime": "2025-08-13T06:36:31.316Z",
    "size": 178,
    "path": "../public/icons/exe.svg"
  },
  "/icons/fastlane.svg": {
    "type": "image/svg+xml",
    "etag": "\"981-dQjNP8RXcvsoHEebdd/M/ycJRIE\"",
    "mtime": "2025-08-13T06:36:31.316Z",
    "size": 2433,
    "path": "../public/icons/fastlane.svg"
  },
  "/icons/favicon.svg": {
    "type": "image/svg+xml",
    "etag": "\"90-9Ans+Ojf6BuxBClHizRfiqLGlCc\"",
    "mtime": "2025-08-13T06:36:31.317Z",
    "size": 144,
    "path": "../public/icons/favicon.svg"
  },
  "/icons/figma.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ba-4FpvwKs5sByzCk61WSkX3DEwaLw\"",
    "mtime": "2025-08-13T06:36:31.317Z",
    "size": 442,
    "path": "../public/icons/figma.svg"
  },
  "/icons/firebase.svg": {
    "type": "image/svg+xml",
    "etag": "\"5a1-qukF8ABFmiFOGRZlR5VYYOLDcII\"",
    "mtime": "2025-08-13T06:36:31.317Z",
    "size": 1441,
    "path": "../public/icons/firebase.svg"
  },
  "/icons/flash.svg": {
    "type": "image/svg+xml",
    "etag": "\"14d-GN0z4IOlw/NOlEK1sSDWDBXmPn8\"",
    "mtime": "2025-08-13T06:36:31.317Z",
    "size": 333,
    "path": "../public/icons/flash.svg"
  },
  "/icons/flow.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c4-T+EFfA+Lfdb8e8bqbIwnsVA8Ezk\"",
    "mtime": "2025-08-13T06:36:31.317Z",
    "size": 452,
    "path": "../public/icons/flow.svg"
  },
  "/icons/folder-admin-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"270-YMqbk4LYi8kARPaXHql1uG4xeRg\"",
    "mtime": "2025-08-13T06:36:31.317Z",
    "size": 624,
    "path": "../public/icons/folder-admin-open.svg"
  },
  "/icons/folder-admin.svg": {
    "type": "image/svg+xml",
    "etag": "\"23b-/uesU8Lj/kQXxJTgWIXgtlqi448\"",
    "mtime": "2025-08-13T06:36:31.317Z",
    "size": 571,
    "path": "../public/icons/folder-admin.svg"
  },
  "/icons/folder-android-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f7-G8jAVvFmCYZECsVKNNWJp9dm22k\"",
    "mtime": "2025-08-13T06:36:31.318Z",
    "size": 503,
    "path": "../public/icons/folder-android-open.svg"
  },
  "/icons/folder-android.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c2-1Zc8xZu2LTCNoTSKz8R4uagtU54\"",
    "mtime": "2025-08-13T06:36:31.318Z",
    "size": 450,
    "path": "../public/icons/folder-android.svg"
  },
  "/icons/folder-angular-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"18e-FLFvqECpf1F0/GMbYzPw8oyoMWs\"",
    "mtime": "2025-08-13T06:36:31.318Z",
    "size": 398,
    "path": "../public/icons/folder-angular-open.svg"
  },
  "/icons/folder-angular.svg": {
    "type": "image/svg+xml",
    "etag": "\"159-D52SNXkXwJwBxtIeCYqMcV94Ohk\"",
    "mtime": "2025-08-13T06:36:31.318Z",
    "size": 345,
    "path": "../public/icons/folder-angular.svg"
  },
  "/icons/folder-animation-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ac-VkQkPrJTG0VEIIm1r4Vyqr6I6QM\"",
    "mtime": "2025-08-13T06:36:31.318Z",
    "size": 684,
    "path": "../public/icons/folder-animation-open.svg"
  },
  "/icons/folder-animation.svg": {
    "type": "image/svg+xml",
    "etag": "\"277-JZGsfAP4UQ+MILat8ODhVraRADQ\"",
    "mtime": "2025-08-13T06:36:31.318Z",
    "size": 631,
    "path": "../public/icons/folder-animation.svg"
  },
  "/icons/folder-ansible-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"213-28/IPve3Cfjt66O5thQ2opvJl/A\"",
    "mtime": "2025-08-13T06:36:31.318Z",
    "size": 531,
    "path": "../public/icons/folder-ansible-open.svg"
  },
  "/icons/folder-ansible.svg": {
    "type": "image/svg+xml",
    "etag": "\"1de-Vi+d9CrhXf1xNvaFoU2gpNADmgE\"",
    "mtime": "2025-08-13T06:36:31.318Z",
    "size": 478,
    "path": "../public/icons/folder-ansible.svg"
  },
  "/icons/folder-api-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"185-yKGo6lTEtKWG5hX+2n6FEY2B9ec\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 389,
    "path": "../public/icons/folder-api-open.svg"
  },
  "/icons/folder-api.svg": {
    "type": "image/svg+xml",
    "etag": "\"150-pTHOaS8M9BWhAjTdUa3hmBpypKA\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 336,
    "path": "../public/icons/folder-api.svg"
  },
  "/icons/folder-apollo-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"21f-S+9NK9KWiqmaei10TEpo35fZBHo\"",
    "mtime": "2025-08-13T06:36:31.327Z",
    "size": 543,
    "path": "../public/icons/folder-apollo-open.svg"
  },
  "/icons/folder-apollo.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ea-3Km+Cx7CU5fooNq2A4ki2Tdr58o\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 490,
    "path": "../public/icons/folder-apollo.svg"
  },
  "/icons/folder-app-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a9-U/xfZ/4CCvxaRYaAOKUVvuyNpPc\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 425,
    "path": "../public/icons/folder-app-open.svg"
  },
  "/icons/folder-app.svg": {
    "type": "image/svg+xml",
    "etag": "\"174-fD6zt7oLSD7QGGMuYirv/IwHfrE\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 372,
    "path": "../public/icons/folder-app.svg"
  },
  "/icons/folder-archive-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"244-PKw4wSUY/67xfXYAj4sIbQq8EZ0\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 580,
    "path": "../public/icons/folder-archive-open.svg"
  },
  "/icons/folder-archive.svg": {
    "type": "image/svg+xml",
    "etag": "\"203-iaQa2OIgvMMhsTrVeCdU1gyvoLw\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 515,
    "path": "../public/icons/folder-archive.svg"
  },
  "/icons/folder-astro-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"25b-HqvZQVXc5P6gm9FMAeGvp6BRYZs\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 603,
    "path": "../public/icons/folder-astro-open.svg"
  },
  "/icons/folder-astro.svg": {
    "type": "image/svg+xml",
    "etag": "\"226-Z1ixqKPc5JToCzbso8ckfq0qZes\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 550,
    "path": "../public/icons/folder-astro.svg"
  },
  "/icons/folder-atom-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2d5-CvQQs2AbrNLeP9Ng4djENW0bsXM\"",
    "mtime": "2025-08-13T06:36:31.320Z",
    "size": 725,
    "path": "../public/icons/folder-atom-open.svg"
  },
  "/icons/folder-atom.svg": {
    "type": "image/svg+xml",
    "etag": "\"2a0-8Cs9h38RLN6q+Nv4zhhhxOoYjwA\"",
    "mtime": "2025-08-13T06:36:31.320Z",
    "size": 672,
    "path": "../public/icons/folder-atom.svg"
  },
  "/icons/folder-attachment-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"282-MZzXFYMnZhFsg485IQCJOlru4HU\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 642,
    "path": "../public/icons/folder-attachment-open.svg"
  },
  "/icons/folder-attachment.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f5-FL+tqUcJst+FqAI0Om8G4J9SCZw\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 501,
    "path": "../public/icons/folder-attachment.svg"
  },
  "/icons/folder-audio-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d3-xO6k7+5tuVpFOLbKE1pFSHVB9vk\"",
    "mtime": "2025-08-13T06:36:31.319Z",
    "size": 467,
    "path": "../public/icons/folder-audio-open.svg"
  },
  "/icons/folder-audio.svg": {
    "type": "image/svg+xml",
    "etag": "\"19e-er1ipDrz/alb0nWuaSfii0q5C/s\"",
    "mtime": "2025-08-13T06:36:31.320Z",
    "size": 414,
    "path": "../public/icons/folder-audio.svg"
  },
  "/icons/folder-aurelia-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"dae-VSLJ3FdjxcqWqssdTCfUZqeuLoI\"",
    "mtime": "2025-08-13T06:36:31.320Z",
    "size": 3502,
    "path": "../public/icons/folder-aurelia-open.svg"
  },
  "/icons/folder-aurelia.svg": {
    "type": "image/svg+xml",
    "etag": "\"d7a-BwmaoTEpKU0FqTOfRVuSi74K4f8\"",
    "mtime": "2025-08-13T06:36:31.321Z",
    "size": 3450,
    "path": "../public/icons/folder-aurelia.svg"
  },
  "/icons/folder-aws-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a5-YpFQZnrJ7EvogE1JpymG+dXXA8Y\"",
    "mtime": "2025-08-13T06:36:31.321Z",
    "size": 421,
    "path": "../public/icons/folder-aws-open.svg"
  },
  "/icons/folder-aws.svg": {
    "type": "image/svg+xml",
    "etag": "\"170-/1RFG94o+8+LVvZRG/iXi3Jpq/E\"",
    "mtime": "2025-08-13T06:36:31.322Z",
    "size": 368,
    "path": "../public/icons/folder-aws.svg"
  },
  "/icons/folder-azure-pipelines-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"25a-+wKn1u52ck3zH9rtMJPoFnY/F/Q\"",
    "mtime": "2025-08-13T06:36:31.323Z",
    "size": 602,
    "path": "../public/icons/folder-azure-pipelines-open.svg"
  },
  "/icons/folder-azure-pipelines.svg": {
    "type": "image/svg+xml",
    "etag": "\"225-dldRksD8B3MWKmRNy46RTbRghG8\"",
    "mtime": "2025-08-13T06:36:31.322Z",
    "size": 549,
    "path": "../public/icons/folder-azure-pipelines.svg"
  },
  "/icons/folder-backup-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d7-92Mnagw0Hrq8ZUBwdAf74eQ2zMg\"",
    "mtime": "2025-08-13T06:36:31.323Z",
    "size": 471,
    "path": "../public/icons/folder-backup-open.svg"
  },
  "/icons/folder-backup.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a2-Bj+18CsAlqmMqiQ71RImkS8x8Q0\"",
    "mtime": "2025-08-13T06:36:31.323Z",
    "size": 418,
    "path": "../public/icons/folder-backup.svg"
  },
  "/icons/folder-base-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"15d-cy1v/lNx06xGOvQa3lg2v0gPzuo\"",
    "mtime": "2025-08-13T06:36:31.323Z",
    "size": 349,
    "path": "../public/icons/folder-base-open.svg"
  },
  "/icons/folder-base.svg": {
    "type": "image/svg+xml",
    "etag": "\"128-/HiWl48CIUXKqq7ruAuew/ZDrbE\"",
    "mtime": "2025-08-13T06:36:31.323Z",
    "size": 296,
    "path": "../public/icons/folder-base.svg"
  },
  "/icons/folder-batch-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"16b-vIfsr/h0W5ULUgZ01Rnq84Ob9xo\"",
    "mtime": "2025-08-13T06:36:31.324Z",
    "size": 363,
    "path": "../public/icons/folder-batch-open.svg"
  },
  "/icons/folder-batch.svg": {
    "type": "image/svg+xml",
    "etag": "\"136-GWfUvENOQBdnUL3UxWWI+LlXjRM\"",
    "mtime": "2025-08-13T06:36:31.325Z",
    "size": 310,
    "path": "../public/icons/folder-batch.svg"
  },
  "/icons/folder-benchmark-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2b3-iAFhxgvOTBzRC0yy4EnRI5L19X4\"",
    "mtime": "2025-08-13T06:36:31.326Z",
    "size": 691,
    "path": "../public/icons/folder-benchmark-open.svg"
  },
  "/icons/folder-benchmark.svg": {
    "type": "image/svg+xml",
    "etag": "\"27e-7QY11h1iKZ4t4cxMTeagwhPGWKc\"",
    "mtime": "2025-08-13T06:36:31.324Z",
    "size": 638,
    "path": "../public/icons/folder-benchmark.svg"
  },
  "/icons/folder-bibliography-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"4a4-9a/jQVSwsviwG4upQszpLeElncw\"",
    "mtime": "2025-08-13T06:36:31.327Z",
    "size": 1188,
    "path": "../public/icons/folder-bibliography-open.svg"
  },
  "/icons/folder-bibliography.svg": {
    "type": "image/svg+xml",
    "etag": "\"463-m0Gfm5oaXhvDrEbrlxiaOEBQRPo\"",
    "mtime": "2025-08-13T06:36:31.325Z",
    "size": 1123,
    "path": "../public/icons/folder-bibliography.svg"
  },
  "/icons/folder-bicep-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1bf-CB7BESroIeOiOSOkMtPS8elr4zs\"",
    "mtime": "2025-08-13T06:36:31.325Z",
    "size": 447,
    "path": "../public/icons/folder-bicep-open.svg"
  },
  "/icons/folder-bicep.svg": {
    "type": "image/svg+xml",
    "etag": "\"18a-/g9LRo2+oNRmEgqB2Z4HeG/DKbY\"",
    "mtime": "2025-08-13T06:36:31.325Z",
    "size": 394,
    "path": "../public/icons/folder-bicep.svg"
  },
  "/icons/folder-blender-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3be-jFsIFpEzXdHphKc0spXV9SMUIjA\"",
    "mtime": "2025-08-13T06:36:31.328Z",
    "size": 958,
    "path": "../public/icons/folder-blender-open.svg"
  },
  "/icons/folder-blender.svg": {
    "type": "image/svg+xml",
    "etag": "\"389-F67dIK2a31qMzN3ds3mwK2Ctezw\"",
    "mtime": "2025-08-13T06:36:31.325Z",
    "size": 905,
    "path": "../public/icons/folder-blender.svg"
  },
  "/icons/folder-bloc-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"16f-+dicJpyNWOgCQm1JfuiPimNwGfg\"",
    "mtime": "2025-08-13T06:36:31.325Z",
    "size": 367,
    "path": "../public/icons/folder-bloc-open.svg"
  },
  "/icons/folder-bloc.svg": {
    "type": "image/svg+xml",
    "etag": "\"134-esA7cXP/VMavG1KPuhOPtMQ5QAY\"",
    "mtime": "2025-08-13T06:36:31.326Z",
    "size": 308,
    "path": "../public/icons/folder-bloc.svg"
  },
  "/icons/folder-bower-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"b73-FEbqG7KdzlJqK/UzCYNnlHPlaoQ\"",
    "mtime": "2025-08-13T06:36:31.326Z",
    "size": 2931,
    "path": "../public/icons/folder-bower-open.svg"
  },
  "/icons/folder-bower.svg": {
    "type": "image/svg+xml",
    "etag": "\"b3e-WpUTQ58k/W07P0fCthFL/x8VcnU\"",
    "mtime": "2025-08-13T06:36:31.326Z",
    "size": 2878,
    "path": "../public/icons/folder-bower.svg"
  },
  "/icons/folder-buildkite-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"198-vFKdySSXHLdAA/lzvLQou7m22CA\"",
    "mtime": "2025-08-13T06:36:31.326Z",
    "size": 408,
    "path": "../public/icons/folder-buildkite-open.svg"
  },
  "/icons/folder-buildkite.svg": {
    "type": "image/svg+xml",
    "etag": "\"163-btfR93nNoWRpFa0DDln/R+sscsY\"",
    "mtime": "2025-08-13T06:36:31.326Z",
    "size": 355,
    "path": "../public/icons/folder-buildkite.svg"
  },
  "/icons/folder-cart-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"203-gXo/ndBgH5YJYuw1YcWIjUDjif4\"",
    "mtime": "2025-08-13T06:36:31.326Z",
    "size": 515,
    "path": "../public/icons/folder-cart-open.svg"
  },
  "/icons/folder-cart.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ce-WSpE+eN3OwJhQ2R6GAHWF55NZAo\"",
    "mtime": "2025-08-13T06:36:31.329Z",
    "size": 462,
    "path": "../public/icons/folder-cart.svg"
  },
  "/icons/folder-changesets-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"25e-bO9gy8uNhJWPsjXUIZdBpNHrVIg\"",
    "mtime": "2025-08-13T06:36:31.327Z",
    "size": 606,
    "path": "../public/icons/folder-changesets-open.svg"
  },
  "/icons/folder-changesets.svg": {
    "type": "image/svg+xml",
    "etag": "\"229-GpSmyn2rn8ukch5GiU5Be9v7Vuc\"",
    "mtime": "2025-08-13T06:36:31.326Z",
    "size": 553,
    "path": "../public/icons/folder-changesets.svg"
  },
  "/icons/folder-ci-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"264-vH4JtH+ivYXS3hsrLA+1eFZMnJk\"",
    "mtime": "2025-08-13T06:36:31.327Z",
    "size": 612,
    "path": "../public/icons/folder-ci-open.svg"
  },
  "/icons/folder-ci.svg": {
    "type": "image/svg+xml",
    "etag": "\"22f-5SbbUghiqaKrtaico6MmmHAb+cw\"",
    "mtime": "2025-08-13T06:36:31.327Z",
    "size": 559,
    "path": "../public/icons/folder-ci.svg"
  },
  "/icons/folder-circleci-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"230-eNlv8YE2M/ilNG+JCWgEizC/+v0\"",
    "mtime": "2025-08-13T06:36:31.327Z",
    "size": 560,
    "path": "../public/icons/folder-circleci-open.svg"
  },
  "/icons/folder-circleci.svg": {
    "type": "image/svg+xml",
    "etag": "\"1fb-ROG2tWFA8mSsEYV+nGuyQ+BdDS0\"",
    "mtime": "2025-08-13T06:36:31.327Z",
    "size": 507,
    "path": "../public/icons/folder-circleci.svg"
  },
  "/icons/folder-class-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"19f-Letj9vCUIW21EZ6PhEeDArYbGus\"",
    "mtime": "2025-08-13T06:36:31.327Z",
    "size": 415,
    "path": "../public/icons/folder-class-open.svg"
  },
  "/icons/folder-class.svg": {
    "type": "image/svg+xml",
    "etag": "\"16a-rMzmfegXK6H65KAUNHRZWZmZiog\"",
    "mtime": "2025-08-13T06:36:31.327Z",
    "size": 362,
    "path": "../public/icons/folder-class.svg"
  },
  "/icons/folder-claude-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"743-aomAOS89aSoGygi2bviL0uCxeZM\"",
    "mtime": "2025-08-13T06:36:31.327Z",
    "size": 1859,
    "path": "../public/icons/folder-claude-open.svg"
  },
  "/icons/folder-claude.svg": {
    "type": "image/svg+xml",
    "etag": "\"70a-djUPXQiqV8j+zHlaqN0fExc09nE\"",
    "mtime": "2025-08-13T06:36:31.328Z",
    "size": 1802,
    "path": "../public/icons/folder-claude.svg"
  },
  "/icons/folder-client-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1e0-w+jWY0VuwFk7XJUpO8SJXosEO7k\"",
    "mtime": "2025-08-13T06:36:31.328Z",
    "size": 480,
    "path": "../public/icons/folder-client-open.svg"
  },
  "/icons/folder-client.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ab-WoP3udb5TQmalR5ibfEi4CTQqV0\"",
    "mtime": "2025-08-13T06:36:31.328Z",
    "size": 427,
    "path": "../public/icons/folder-client.svg"
  },
  "/icons/folder-cline-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"258-jkjjl8N8mNeQQTTfv38K0YF0Ftg\"",
    "mtime": "2025-08-13T06:36:31.328Z",
    "size": 600,
    "path": "../public/icons/folder-cline-open.svg"
  },
  "/icons/folder-cline.svg": {
    "type": "image/svg+xml",
    "etag": "\"238-ZaIro07RFnpywEvyICfVe0JEcLo\"",
    "mtime": "2025-08-13T06:36:31.328Z",
    "size": 568,
    "path": "../public/icons/folder-cline.svg"
  },
  "/icons/folder-cloud-functions-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3ca-jxmX97ddX80hgeM+Jol2kqcmvCg\"",
    "mtime": "2025-08-13T06:36:31.328Z",
    "size": 970,
    "path": "../public/icons/folder-cloud-functions-open.svg"
  },
  "/icons/folder-cloud-functions.svg": {
    "type": "image/svg+xml",
    "etag": "\"377-c2P1Y4vJhzaxktqyaOV4VMNvl1E\"",
    "mtime": "2025-08-13T06:36:31.329Z",
    "size": 887,
    "path": "../public/icons/folder-cloud-functions.svg"
  },
  "/icons/folder-cloudflare-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a6-2YKVDKESmSgeh1sbhDfdZXpOLic\"",
    "mtime": "2025-08-13T06:36:31.329Z",
    "size": 422,
    "path": "../public/icons/folder-cloudflare-open.svg"
  },
  "/icons/folder-cloudflare.svg": {
    "type": "image/svg+xml",
    "etag": "\"171-drki26WYJ0wMGZ0l1oJryhscAdE\"",
    "mtime": "2025-08-13T06:36:31.329Z",
    "size": 369,
    "path": "../public/icons/folder-cloudflare.svg"
  },
  "/icons/folder-cluster-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a6-DAA7O0bn6xwb1ayRWBcvZgrV6Mg\"",
    "mtime": "2025-08-13T06:36:31.329Z",
    "size": 422,
    "path": "../public/icons/folder-cluster-open.svg"
  },
  "/icons/folder-cluster.svg": {
    "type": "image/svg+xml",
    "etag": "\"171-8QXo/ZPXupMJ0IGnyoFeCG57prs\"",
    "mtime": "2025-08-13T06:36:31.331Z",
    "size": 369,
    "path": "../public/icons/folder-cluster.svg"
  },
  "/icons/folder-cobol-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"41d-hK6UJBdICjeQlG9mGl6ieTUJV9w\"",
    "mtime": "2025-08-13T06:36:31.330Z",
    "size": 1053,
    "path": "../public/icons/folder-cobol-open.svg"
  },
  "/icons/folder-cobol.svg": {
    "type": "image/svg+xml",
    "etag": "\"3e8-ugnH89vfqH52xXtgg9T8Fph4Q28\"",
    "mtime": "2025-08-13T06:36:31.329Z",
    "size": 1000,
    "path": "../public/icons/folder-cobol.svg"
  },
  "/icons/folder-command-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d7-wwswA5REEfaYv/3x7eAHDWkxCvk\"",
    "mtime": "2025-08-13T06:36:31.330Z",
    "size": 471,
    "path": "../public/icons/folder-command-open.svg"
  },
  "/icons/folder-command.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a2-AbyFz+JfU2pbzlbT4RP3FwEWdaU\"",
    "mtime": "2025-08-13T06:36:31.330Z",
    "size": 418,
    "path": "../public/icons/folder-command.svg"
  },
  "/icons/folder-components-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"186-/ulO5YdZEvDgrd5uaiG0wYHGvj4\"",
    "mtime": "2025-08-13T06:36:31.330Z",
    "size": 390,
    "path": "../public/icons/folder-components-open.svg"
  },
  "/icons/folder-components.svg": {
    "type": "image/svg+xml",
    "etag": "\"151-rB/ekaD0o4WOxIjcCmEhAGqfhhs\"",
    "mtime": "2025-08-13T06:36:31.330Z",
    "size": 337,
    "path": "../public/icons/folder-components.svg"
  },
  "/icons/folder-config-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"405-JEBYjMbunmvoye9h0KxOPkYGTD0\"",
    "mtime": "2025-08-13T06:36:31.331Z",
    "size": 1029,
    "path": "../public/icons/folder-config-open.svg"
  },
  "/icons/folder-config.svg": {
    "type": "image/svg+xml",
    "etag": "\"3d0-IDzdTg0cHgNvniIYwRN943a7TLs\"",
    "mtime": "2025-08-13T06:36:31.331Z",
    "size": 976,
    "path": "../public/icons/folder-config.svg"
  },
  "/icons/folder-connection-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2fa-LpOxs9K+q4uM3CvExGBnOQsYAB4\"",
    "mtime": "2025-08-13T06:36:31.331Z",
    "size": 762,
    "path": "../public/icons/folder-connection-open.svg"
  },
  "/icons/folder-connection.svg": {
    "type": "image/svg+xml",
    "etag": "\"2c5-hzjY/eMFiPRFkp3AGOU0h/4h0fg\"",
    "mtime": "2025-08-13T06:36:31.330Z",
    "size": 709,
    "path": "../public/icons/folder-connection.svg"
  },
  "/icons/folder-console-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2aa-7f6HMyO/edF05Z0TD9mDzAh3sQw\"",
    "mtime": "2025-08-13T06:36:31.330Z",
    "size": 682,
    "path": "../public/icons/folder-console-open.svg"
  },
  "/icons/folder-console.svg": {
    "type": "image/svg+xml",
    "etag": "\"275-sb6uobTXtp6yCUFl78V3mVXeP3o\"",
    "mtime": "2025-08-13T06:36:31.330Z",
    "size": 629,
    "path": "../public/icons/folder-console.svg"
  },
  "/icons/folder-constant-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"160-pFRtPzf7/fKAaHt+fXWynbVUlTg\"",
    "mtime": "2025-08-13T06:36:31.331Z",
    "size": 352,
    "path": "../public/icons/folder-constant-open.svg"
  },
  "/icons/folder-constant.svg": {
    "type": "image/svg+xml",
    "etag": "\"12b-zYiDknEndTv1yTzibMshPJwFqwM\"",
    "mtime": "2025-08-13T06:36:31.331Z",
    "size": 299,
    "path": "../public/icons/folder-constant.svg"
  },
  "/icons/folder-container-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"245-w4Er+WrlMEqFzG/ZSXZMfebzAUE\"",
    "mtime": "2025-08-13T06:36:31.331Z",
    "size": 581,
    "path": "../public/icons/folder-container-open.svg"
  },
  "/icons/folder-container.svg": {
    "type": "image/svg+xml",
    "etag": "\"210-e9ZdIofXoJM/XNMYnj1NRfRCgGM\"",
    "mtime": "2025-08-13T06:36:31.331Z",
    "size": 528,
    "path": "../public/icons/folder-container.svg"
  },
  "/icons/folder-content-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c6-EJo85DyHMjcxf8x2vseUwpwn+OA\"",
    "mtime": "2025-08-13T06:36:31.331Z",
    "size": 454,
    "path": "../public/icons/folder-content-open.svg"
  },
  "/icons/folder-content.svg": {
    "type": "image/svg+xml",
    "etag": "\"191-iSyAHKzOytVwUi32YmYxbWpd31Q\"",
    "mtime": "2025-08-13T06:36:31.332Z",
    "size": 401,
    "path": "../public/icons/folder-content.svg"
  },
  "/icons/folder-context-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a8-/d9cW1rfFZTOZCE979+E9HNm6Vo\"",
    "mtime": "2025-08-13T06:36:31.331Z",
    "size": 424,
    "path": "../public/icons/folder-context-open.svg"
  },
  "/icons/folder-context.svg": {
    "type": "image/svg+xml",
    "etag": "\"173-iymA3pDVcrdWNvZuy7BTdYSlmgY\"",
    "mtime": "2025-08-13T06:36:31.331Z",
    "size": 371,
    "path": "../public/icons/folder-context.svg"
  },
  "/icons/folder-contract-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3ab-sDCQ0gSqPwoWNq/YZCRtsH5qrbA\"",
    "mtime": "2025-08-13T06:36:31.332Z",
    "size": 939,
    "path": "../public/icons/folder-contract-open.svg"
  },
  "/icons/folder-contract.svg": {
    "type": "image/svg+xml",
    "etag": "\"376-BIW9Vkuztq9+D8VIjup2082YmIg\"",
    "mtime": "2025-08-13T06:36:31.332Z",
    "size": 886,
    "path": "../public/icons/folder-contract.svg"
  },
  "/icons/folder-controller-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"405-iKxGkm40iLVoCNLHbRi38geIag0\"",
    "mtime": "2025-08-13T06:36:31.332Z",
    "size": 1029,
    "path": "../public/icons/folder-controller-open.svg"
  },
  "/icons/folder-controller.svg": {
    "type": "image/svg+xml",
    "etag": "\"3d0-L+pIt9A2Am6lYWeoLELwcpIMMS8\"",
    "mtime": "2025-08-13T06:36:31.332Z",
    "size": 976,
    "path": "../public/icons/folder-controller.svg"
  },
  "/icons/folder-core-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"246-49KFPQaGIafmz9yTucauEcWFJz4\"",
    "mtime": "2025-08-13T06:36:31.332Z",
    "size": 582,
    "path": "../public/icons/folder-core-open.svg"
  },
  "/icons/folder-core.svg": {
    "type": "image/svg+xml",
    "etag": "\"211-O+9fN6eNUH9Tn7tSac7bl0fWarA\"",
    "mtime": "2025-08-13T06:36:31.332Z",
    "size": 529,
    "path": "../public/icons/folder-core.svg"
  },
  "/icons/folder-coverage-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ba-GYjy7zDxiSQjYKscQ+EizzaCGd4\"",
    "mtime": "2025-08-13T06:36:31.333Z",
    "size": 442,
    "path": "../public/icons/folder-coverage-open.svg"
  },
  "/icons/folder-coverage.svg": {
    "type": "image/svg+xml",
    "etag": "\"185-DU958HKINfgo6MF+EG4VESVmWHY\"",
    "mtime": "2025-08-13T06:36:31.332Z",
    "size": 389,
    "path": "../public/icons/folder-coverage.svg"
  },
  "/icons/folder-css-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"39b-siOTouMecRqbNH7OWmdDmYo9xgI\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 923,
    "path": "../public/icons/folder-css-open.svg"
  },
  "/icons/folder-css.svg": {
    "type": "image/svg+xml",
    "etag": "\"366-0TtL1phBvKgnCluUkvOgWBrb9ok\"",
    "mtime": "2025-08-13T06:36:31.333Z",
    "size": 870,
    "path": "../public/icons/folder-css.svg"
  },
  "/icons/folder-custom-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a2-tmZs4n+PBfnzKyCPk0vp14QkJDM\"",
    "mtime": "2025-08-13T06:36:31.333Z",
    "size": 418,
    "path": "../public/icons/folder-custom-open.svg"
  },
  "/icons/folder-custom.svg": {
    "type": "image/svg+xml",
    "etag": "\"16d-9DY+xaOhUxAWugy8yZU61T2di/8\"",
    "mtime": "2025-08-13T06:36:31.333Z",
    "size": 365,
    "path": "../public/icons/folder-custom.svg"
  },
  "/icons/folder-cypress-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"40e-iZjXDlL+Ezjhnr9qObqy6SfHW5Y\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 1038,
    "path": "../public/icons/folder-cypress-open.svg"
  },
  "/icons/folder-cypress.svg": {
    "type": "image/svg+xml",
    "etag": "\"3d9-01GiN8YbbN7/P9PbtAffFa9IT40\"",
    "mtime": "2025-08-13T06:36:31.333Z",
    "size": 985,
    "path": "../public/icons/folder-cypress.svg"
  },
  "/icons/folder-dart-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1cb-QBp+SePZp6QS+BDpZrJqzaTSB1A\"",
    "mtime": "2025-08-13T06:36:31.333Z",
    "size": 459,
    "path": "../public/icons/folder-dart-open.svg"
  },
  "/icons/folder-dart.svg": {
    "type": "image/svg+xml",
    "etag": "\"196-K2lEL5WvqgXaTjKJLnFpd804RLI\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 406,
    "path": "../public/icons/folder-dart.svg"
  },
  "/icons/folder-database-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"229-qwLK8yq/Q5BOsjMaAKIPGFMGwR4\"",
    "mtime": "2025-08-13T06:36:31.333Z",
    "size": 553,
    "path": "../public/icons/folder-database-open.svg"
  },
  "/icons/folder-database.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f4-y5ELYIzxJ3pDSfm4qvLoFXpK3r0\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 500,
    "path": "../public/icons/folder-database.svg"
  },
  "/icons/folder-debug-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"235-oadcmAL+6CHEe9F9EABkr9bF6iw\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 565,
    "path": "../public/icons/folder-debug-open.svg"
  },
  "/icons/folder-debug.svg": {
    "type": "image/svg+xml",
    "etag": "\"200-sYxcVn2gY1JGyK6vMGMdLSItPIQ\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 512,
    "path": "../public/icons/folder-debug.svg"
  },
  "/icons/folder-decorators-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"51a-vimgvJiPbTNx8m9ng2WMCb4YY2I\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 1306,
    "path": "../public/icons/folder-decorators-open.svg"
  },
  "/icons/folder-decorators.svg": {
    "type": "image/svg+xml",
    "etag": "\"4e5-TuzSi0FSgr0fifCAedLf52wW7eI\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 1253,
    "path": "../public/icons/folder-decorators.svg"
  },
  "/icons/folder-delta-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"163-sgYzbaXyZBPfoPrpmLWhqqQ/5Ao\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 355,
    "path": "../public/icons/folder-delta-open.svg"
  },
  "/icons/folder-delta.svg": {
    "type": "image/svg+xml",
    "etag": "\"12e-zmh4hybNZdUsKSVn+ij3kroXhVE\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 302,
    "path": "../public/icons/folder-delta.svg"
  },
  "/icons/folder-desktop-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a3-didhi7ZRn/0xuuBQTIHPDhA7La4\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 419,
    "path": "../public/icons/folder-desktop-open.svg"
  },
  "/icons/folder-desktop.svg": {
    "type": "image/svg+xml",
    "etag": "\"16e-9K6dIFsceXj8AHCTMveme1eXjpc\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 366,
    "path": "../public/icons/folder-desktop.svg"
  },
  "/icons/folder-directive-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1fb-l2TJkXpopSQVgB8+SmL/pZhmPlo\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 507,
    "path": "../public/icons/folder-directive-open.svg"
  },
  "/icons/folder-directive.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c7-WHc3XobP07kVSfMAnuatkI8ozQw\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 455,
    "path": "../public/icons/folder-directive.svg"
  },
  "/icons/folder-dist-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a4-t51AuhtxB615usDz3O0MBbLYrUE\"",
    "mtime": "2025-08-13T06:36:31.334Z",
    "size": 420,
    "path": "../public/icons/folder-dist-open.svg"
  },
  "/icons/folder-dist.svg": {
    "type": "image/svg+xml",
    "etag": "\"16f-u70dwbU3FLTw/q1ydxmea5Sjgss\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 367,
    "path": "../public/icons/folder-dist.svg"
  },
  "/icons/folder-docker-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2d5-vUzVaKmy4nUIMvT6rL5lpUQz9SI\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 725,
    "path": "../public/icons/folder-docker-open.svg"
  },
  "/icons/folder-docker.svg": {
    "type": "image/svg+xml",
    "etag": "\"2a0-ZjQJxTJShAj8G3mAzX8nc72vLkM\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 672,
    "path": "../public/icons/folder-docker.svg"
  },
  "/icons/folder-docs-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ab-vyHtJGFqwkgIEp+Hxh88SnCyQOY\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 427,
    "path": "../public/icons/folder-docs-open.svg"
  },
  "/icons/folder-docs.svg": {
    "type": "image/svg+xml",
    "etag": "\"176-/ZhdhaWEYQcB81NUusJJMoqcZ00\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 374,
    "path": "../public/icons/folder-docs.svg"
  },
  "/icons/folder-download-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"15e-b7KAmQOwicwUP1k8o6kwxFVFfUU\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 350,
    "path": "../public/icons/folder-download-open.svg"
  },
  "/icons/folder-download.svg": {
    "type": "image/svg+xml",
    "etag": "\"129-f87Jujl9dyTd+lImbGTogDa1yiw\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 297,
    "path": "../public/icons/folder-download.svg"
  },
  "/icons/folder-drizzle-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3d6-qK9IC+91ew69iiZXd6ZOAkznPs0\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 982,
    "path": "../public/icons/folder-drizzle-open.svg"
  },
  "/icons/folder-drizzle.svg": {
    "type": "image/svg+xml",
    "etag": "\"3a1-ddG7HU8TBnWLU2rCVjQ7ho3pLfk\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 929,
    "path": "../public/icons/folder-drizzle.svg"
  },
  "/icons/folder-dump-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ab-N0iimtZleD7NENrgi/BJ4cQ70q0\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 427,
    "path": "../public/icons/folder-dump-open.svg"
  },
  "/icons/folder-dump.svg": {
    "type": "image/svg+xml",
    "etag": "\"176-5bkPPDMQhBxHFRKtAvvIRQuA6tE\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 374,
    "path": "../public/icons/folder-dump.svg"
  },
  "/icons/folder-element-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"291-jXhPebaXYx/lLUOLKG3Uk9OCoFo\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 657,
    "path": "../public/icons/folder-element-open.svg"
  },
  "/icons/folder-element.svg": {
    "type": "image/svg+xml",
    "etag": "\"274-mHF9U/HGeg5fdiI4RLTxvr72TWI\"",
    "mtime": "2025-08-13T06:36:31.335Z",
    "size": 628,
    "path": "../public/icons/folder-element.svg"
  },
  "/icons/folder-enum-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"19f-gMnV7wuMQewpcvMBf6sPMaQ3yM0\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 415,
    "path": "../public/icons/folder-enum-open.svg"
  },
  "/icons/folder-enum.svg": {
    "type": "image/svg+xml",
    "etag": "\"16a-f4jQcsUow6FgythHwoRHUbgvJxk\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 362,
    "path": "../public/icons/folder-enum.svg"
  },
  "/icons/folder-environment-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"16b-S4UywU6sQmNn79woMjVgArseIus\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 363,
    "path": "../public/icons/folder-environment-open.svg"
  },
  "/icons/folder-environment.svg": {
    "type": "image/svg+xml",
    "etag": "\"136-RV9kw6fMxFSfdP15oxna3QzAnSM\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 310,
    "path": "../public/icons/folder-environment.svg"
  },
  "/icons/folder-error-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"174-dUeO8EzKdcnPztsml87fBMrF5ZA\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 372,
    "path": "../public/icons/folder-error-open.svg"
  },
  "/icons/folder-error.svg": {
    "type": "image/svg+xml",
    "etag": "\"13f-dGMWXl8UO8oiqHVH+mmYCkKnyNk\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 319,
    "path": "../public/icons/folder-error.svg"
  },
  "/icons/folder-event-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a7-674IRxzZEhGFwxisidmRjDqgn7c\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 423,
    "path": "../public/icons/folder-event-open.svg"
  },
  "/icons/folder-event.svg": {
    "type": "image/svg+xml",
    "etag": "\"172-+GiSzZOj2Ywek3uztIDEM2WrkAA\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 370,
    "path": "../public/icons/folder-event.svg"
  },
  "/icons/folder-examples-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1dc-o0Pn0uhSpq2YEMmaqUdmNXdK91I\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 476,
    "path": "../public/icons/folder-examples-open.svg"
  },
  "/icons/folder-examples.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a7-osuH8ycZgDQO7Qk+sPEPzpFT4rY\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 423,
    "path": "../public/icons/folder-examples.svg"
  },
  "/icons/folder-expo-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"28c-0umfm7f3z51r+bu67kQKB0QunlU\"",
    "mtime": "2025-08-13T06:36:31.336Z",
    "size": 652,
    "path": "../public/icons/folder-expo-open.svg"
  },
  "/icons/folder-expo.svg": {
    "type": "image/svg+xml",
    "etag": "\"257-vXZTWjCsovzYl/HBsElQbPZQXUU\"",
    "mtime": "2025-08-13T06:36:31.337Z",
    "size": 599,
    "path": "../public/icons/folder-expo.svg"
  },
  "/icons/folder-export-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"17b-Wjv/0DR8FBtpfkUpflZn9OywRd4\"",
    "mtime": "2025-08-13T06:36:31.337Z",
    "size": 379,
    "path": "../public/icons/folder-export-open.svg"
  },
  "/icons/folder-export.svg": {
    "type": "image/svg+xml",
    "etag": "\"146-+4rkZj8409KlCuj2hFafx8pinJ8\"",
    "mtime": "2025-08-13T06:36:31.337Z",
    "size": 326,
    "path": "../public/icons/folder-export.svg"
  },
  "/icons/folder-fastlane-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"b18-e+FEleMttByiVQO7VvpGnTk00d8\"",
    "mtime": "2025-08-13T06:36:31.337Z",
    "size": 2840,
    "path": "../public/icons/folder-fastlane-open.svg"
  },
  "/icons/folder-fastlane.svg": {
    "type": "image/svg+xml",
    "etag": "\"ae3-JQm0lQahcFjZi2fHMT/wRdCfJyQ\"",
    "mtime": "2025-08-13T06:36:31.337Z",
    "size": 2787,
    "path": "../public/icons/folder-fastlane.svg"
  },
  "/icons/folder-favicon-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"16f-5u49VL1o2fNCNE295C0q0IYWM9k\"",
    "mtime": "2025-08-13T06:36:31.337Z",
    "size": 367,
    "path": "../public/icons/folder-favicon-open.svg"
  },
  "/icons/folder-favicon.svg": {
    "type": "image/svg+xml",
    "etag": "\"132-dGfrMJp2pLdaxvZqLeBWj5eVRaw\"",
    "mtime": "2025-08-13T06:36:31.337Z",
    "size": 306,
    "path": "../public/icons/folder-favicon.svg"
  },
  "/icons/folder-firebase-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3c7-0j5Gnvg18duF1Z+MjTbGckEYl1Y\"",
    "mtime": "2025-08-13T06:36:31.337Z",
    "size": 967,
    "path": "../public/icons/folder-firebase-open.svg"
  },
  "/icons/folder-firebase.svg": {
    "type": "image/svg+xml",
    "etag": "\"42d-KNHBTz/NnCRnTFhTCCK8LzDt584\"",
    "mtime": "2025-08-13T06:36:31.337Z",
    "size": 1069,
    "path": "../public/icons/folder-firebase.svg"
  },
  "/icons/folder-firestore-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"26a-69gBXzPFMMkWDbFrcqxI7kNeAPQ\"",
    "mtime": "2025-08-13T06:36:31.337Z",
    "size": 618,
    "path": "../public/icons/folder-firestore-open.svg"
  },
  "/icons/folder-firestore.svg": {
    "type": "image/svg+xml",
    "etag": "\"217-UWQcYX3lt32Yhn6fBMby2unTmfQ\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 535,
    "path": "../public/icons/folder-firestore.svg"
  },
  "/icons/folder-flow-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1fa-kyvwC/eDRi9xScdAMDcVg8vsojI\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 506,
    "path": "../public/icons/folder-flow-open.svg"
  },
  "/icons/folder-flow.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c5-FxWfAeOPaJTMwlPmf1dlkIKK0+Y\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 453,
    "path": "../public/icons/folder-flow.svg"
  },
  "/icons/folder-flutter-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"15a-/OXWbBHGKav/aUBkoxfAR96O4bQ\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 346,
    "path": "../public/icons/folder-flutter-open.svg"
  },
  "/icons/folder-flutter.svg": {
    "type": "image/svg+xml",
    "etag": "\"133-GTknxVG25I9vB74xmyYRRWxFQCE\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 307,
    "path": "../public/icons/folder-flutter.svg"
  },
  "/icons/folder-font-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"186-Ys/8oTBJgTagwlEMv6tyRsLXRl4\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 390,
    "path": "../public/icons/folder-font-open.svg"
  },
  "/icons/folder-font.svg": {
    "type": "image/svg+xml",
    "etag": "\"151-kRIiYfNxVQyXi3hdnYVJPlWmNlw\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 337,
    "path": "../public/icons/folder-font.svg"
  },
  "/icons/folder-forgejo-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"35b-eCe33L1lXdmDl23cnDAOcr4fnGQ\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 859,
    "path": "../public/icons/folder-forgejo-open.svg"
  },
  "/icons/folder-forgejo.svg": {
    "type": "image/svg+xml",
    "etag": "\"326-vLo/D5+2q8kDefTDkD8dyIT0qNw\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 806,
    "path": "../public/icons/folder-forgejo.svg"
  },
  "/icons/folder-functions-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ef-Vws3ZdBy5haSxTxZiPrFDxgRkTg\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 751,
    "path": "../public/icons/folder-functions-open.svg"
  },
  "/icons/folder-functions.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ba-QQzzTCK83K3EvJ+jakbsm6GDFA8\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 698,
    "path": "../public/icons/folder-functions.svg"
  },
  "/icons/folder-gamemaker-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a3-OqKb9aIhVgNDjGhxI9RYY7Cn9lw\"",
    "mtime": "2025-08-13T06:36:31.338Z",
    "size": 419,
    "path": "../public/icons/folder-gamemaker-open.svg"
  },
  "/icons/folder-gamemaker.svg": {
    "type": "image/svg+xml",
    "etag": "\"16e-7TALbGi0yPcQgV8aUvxcGkaRASk\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 366,
    "path": "../public/icons/folder-gamemaker.svg"
  },
  "/icons/folder-generator-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"264-L3yXpUmd7nTuidZKEibiYym21Rc\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 612,
    "path": "../public/icons/folder-generator-open.svg"
  },
  "/icons/folder-generator.svg": {
    "type": "image/svg+xml",
    "etag": "\"22f-k2/Cspa2ryKIet3DSqXrtFCeu7k\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 559,
    "path": "../public/icons/folder-generator.svg"
  },
  "/icons/folder-gh-workflows-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"19d-CMb2XInQMQKfjCTJFZ/LAgD3dTE\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 413,
    "path": "../public/icons/folder-gh-workflows-open.svg"
  },
  "/icons/folder-gh-workflows.svg": {
    "type": "image/svg+xml",
    "etag": "\"168-OwT9OlCF6YpnYd2KtHVdxY94uuc\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 360,
    "path": "../public/icons/folder-gh-workflows.svg"
  },
  "/icons/folder-git-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"304-jCiQPcj8PpH4Hvmx28TfWLNOkkE\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 772,
    "path": "../public/icons/folder-git-open.svg"
  },
  "/icons/folder-git.svg": {
    "type": "image/svg+xml",
    "etag": "\"2cf-DVBGcrwMBxRBuh01mNg+avg0a9k\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 719,
    "path": "../public/icons/folder-git.svg"
  },
  "/icons/folder-gitea-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"20b-6Vtam5kIVp3MWbrcUsdFqXLpUkw\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 523,
    "path": "../public/icons/folder-gitea-open.svg"
  },
  "/icons/folder-gitea.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d6-WHngs8x5yqe79LrGCG0MKJySJM4\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 470,
    "path": "../public/icons/folder-gitea.svg"
  },
  "/icons/folder-github-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"37f-iDtd7D6rkLq9XgMU3ETERdbhmX4\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 895,
    "path": "../public/icons/folder-github-open.svg"
  },
  "/icons/folder-github.svg": {
    "type": "image/svg+xml",
    "etag": "\"34a-07j7+WGOTaSbtuUISpz1n/LkYXY\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 842,
    "path": "../public/icons/folder-github.svg"
  },
  "/icons/folder-gitlab-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"441-KrKv2+VsVsUk8IeB30R18P+FYgI\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 1089,
    "path": "../public/icons/folder-gitlab-open.svg"
  },
  "/icons/folder-gitlab.svg": {
    "type": "image/svg+xml",
    "etag": "\"40c-7jiaIEdNCa0gfIR5BS6AD+Y2YAw\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 1036,
    "path": "../public/icons/folder-gitlab.svg"
  },
  "/icons/folder-global-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"20f-eK07KubJVS9P7tKXTEAyL308Uao\"",
    "mtime": "2025-08-13T06:36:31.339Z",
    "size": 527,
    "path": "../public/icons/folder-global-open.svg"
  },
  "/icons/folder-global.svg": {
    "type": "image/svg+xml",
    "etag": "\"1da-lxLeVizKCvF5hUAfBMRwgtDit88\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 474,
    "path": "../public/icons/folder-global.svg"
  },
  "/icons/folder-godot-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"5ef-uxTY3hcga2lznINj9VzpYpdliqs\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 1519,
    "path": "../public/icons/folder-godot-open.svg"
  },
  "/icons/folder-godot.svg": {
    "type": "image/svg+xml",
    "etag": "\"5ba-rjUQIjEQydUzskcpw2Y9p/taBHI\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 1466,
    "path": "../public/icons/folder-godot.svg"
  },
  "/icons/folder-gradle-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3c1-CqWL+D4aHDguA+g6lK9QVGte+Dk\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 961,
    "path": "../public/icons/folder-gradle-open.svg"
  },
  "/icons/folder-gradle.svg": {
    "type": "image/svg+xml",
    "etag": "\"38c-sMmd9FWDkuiHHR3FWAv2uawPiFY\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 908,
    "path": "../public/icons/folder-gradle.svg"
  },
  "/icons/folder-graphql-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"4a8-YkXxg3DdzWTGEWrAtZR1Y56nZns\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 1192,
    "path": "../public/icons/folder-graphql-open.svg"
  },
  "/icons/folder-graphql.svg": {
    "type": "image/svg+xml",
    "etag": "\"473-rnNcRCjr6D3Dd6wsNxzJEz9Zfio\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 1139,
    "path": "../public/icons/folder-graphql.svg"
  },
  "/icons/folder-guard-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"19b-8oblWwb4oChh6dTJ+L1wsNUVTv0\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 411,
    "path": "../public/icons/folder-guard-open.svg"
  },
  "/icons/folder-guard.svg": {
    "type": "image/svg+xml",
    "etag": "\"166-DkCGS59cURx7Oc6xoveXDJZB5zk\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 358,
    "path": "../public/icons/folder-guard.svg"
  },
  "/icons/folder-gulp-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"19f-vHbw9vmX77sHIZZwAC9VtmIR5vc\"",
    "mtime": "2025-08-13T06:36:31.341Z",
    "size": 415,
    "path": "../public/icons/folder-gulp-open.svg"
  },
  "/icons/folder-gulp.svg": {
    "type": "image/svg+xml",
    "etag": "\"16a-S5SSqdmse/dTBr6eLpbIy4aEJqQ\"",
    "mtime": "2025-08-13T06:36:31.340Z",
    "size": 362,
    "path": "../public/icons/folder-gulp.svg"
  },
  "/icons/folder-helm-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"d78-u8mixKsupA6zKfceQn9RZxFdZ6A\"",
    "mtime": "2025-08-13T06:36:31.341Z",
    "size": 3448,
    "path": "../public/icons/folder-helm-open.svg"
  },
  "/icons/folder-helm.svg": {
    "type": "image/svg+xml",
    "etag": "\"d57-5kEfPdeg6d92FjNuwT1DAX6EoVU\"",
    "mtime": "2025-08-13T06:36:31.341Z",
    "size": 3415,
    "path": "../public/icons/folder-helm.svg"
  },
  "/icons/folder-helper-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"254-+LB8xMW4vtWy9lERkeXTuUTWOIM\"",
    "mtime": "2025-08-13T06:36:31.341Z",
    "size": 596,
    "path": "../public/icons/folder-helper-open.svg"
  },
  "/icons/folder-helper.svg": {
    "type": "image/svg+xml",
    "etag": "\"21f-phJO3aBbjuDNu9d54vV3ilBRQrA\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 543,
    "path": "../public/icons/folder-helper.svg"
  },
  "/icons/folder-home-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"157-lwKKvrWp2R5opbeNyEGJwlsUz44\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 343,
    "path": "../public/icons/folder-home-open.svg"
  },
  "/icons/folder-home.svg": {
    "type": "image/svg+xml",
    "etag": "\"122-NzDuXVV52g56xS5Qh6lGd13JvOU\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 290,
    "path": "../public/icons/folder-home.svg"
  },
  "/icons/folder-hook-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2b2-zSHu28oXANGMB3NhC00cbrI01Aw\"",
    "mtime": "2025-08-13T06:36:31.341Z",
    "size": 690,
    "path": "../public/icons/folder-hook-open.svg"
  },
  "/icons/folder-hook.svg": {
    "type": "image/svg+xml",
    "etag": "\"273-0U87iEQLW7O/Dqidabw1tps0KO4\"",
    "mtime": "2025-08-13T06:36:31.341Z",
    "size": 627,
    "path": "../public/icons/folder-hook.svg"
  },
  "/icons/folder-husky-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"451-XOjgmWC/ysCyRsgRP0AkrjKAvn0\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 1105,
    "path": "../public/icons/folder-husky-open.svg"
  },
  "/icons/folder-husky.svg": {
    "type": "image/svg+xml",
    "etag": "\"41c-jH2+g0JMr6yu0dKmvD5aaYZ6PZg\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 1052,
    "path": "../public/icons/folder-husky.svg"
  },
  "/icons/folder-i18n-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"285-YOKhZ4bPsTHGvWJERn2hCR7CcNI\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 645,
    "path": "../public/icons/folder-i18n-open.svg"
  },
  "/icons/folder-i18n.svg": {
    "type": "image/svg+xml",
    "etag": "\"250-YSe2JAnyQvft6TEY1vVBxe1P4u0\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 592,
    "path": "../public/icons/folder-i18n.svg"
  },
  "/icons/folder-images-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1cb-eJU+FU2hrlC7mZpq8/6dbksT9FU\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 459,
    "path": "../public/icons/folder-images-open.svg"
  },
  "/icons/folder-images.svg": {
    "type": "image/svg+xml",
    "etag": "\"196-hSUkX8La9l11XqSuvzpdI4/3nLY\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 406,
    "path": "../public/icons/folder-images.svg"
  },
  "/icons/folder-import-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"179-OyMwRwAyKGkHYvH8dQceixabh3o\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 377,
    "path": "../public/icons/folder-import-open.svg"
  },
  "/icons/folder-import.svg": {
    "type": "image/svg+xml",
    "etag": "\"144-xJ19EVXlZ1B5A8S8+53AGG+Tlrk\"",
    "mtime": "2025-08-13T06:36:31.343Z",
    "size": 324,
    "path": "../public/icons/folder-import.svg"
  },
  "/icons/folder-include-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"179-t8/FqIev6VL0bGq4eHYmKkX+uXQ\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 377,
    "path": "../public/icons/folder-include-open.svg"
  },
  "/icons/folder-include.svg": {
    "type": "image/svg+xml",
    "etag": "\"144-mV/PGf6SaF1LHFCCMCh/oEYEDUQ\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 324,
    "path": "../public/icons/folder-include.svg"
  },
  "/icons/folder-intellij-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"986-MepdZHY8ir2R8JnyA+U7rOrLtMw\"",
    "mtime": "2025-08-13T06:36:31.342Z",
    "size": 2438,
    "path": "../public/icons/folder-intellij-open.svg"
  },
  "/icons/folder-intellij-open_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"987-x5oLadn/+z+DW0xCFo/Xy39TKe4\"",
    "mtime": "2025-08-13T06:36:31.343Z",
    "size": 2439,
    "path": "../public/icons/folder-intellij-open_light.svg"
  },
  "/icons/folder-intellij.svg": {
    "type": "image/svg+xml",
    "etag": "\"960-2Jme6eVdIj7lRP/sUJP6JnzQAI0\"",
    "mtime": "2025-08-13T06:36:31.343Z",
    "size": 2400,
    "path": "../public/icons/folder-intellij.svg"
  },
  "/icons/folder-intellij_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"961-QEPBvMuvNrPJ9uXoGoA9iSbgsJA\"",
    "mtime": "2025-08-13T06:36:31.343Z",
    "size": 2401,
    "path": "../public/icons/folder-intellij_light.svg"
  },
  "/icons/folder-interceptor-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f9-lDQQ8jo5oYVXjUjzl0zEIhxyAog\"",
    "mtime": "2025-08-13T06:36:31.343Z",
    "size": 505,
    "path": "../public/icons/folder-interceptor-open.svg"
  },
  "/icons/folder-interceptor.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c4-4v2PrV0Hka68MudPR7ilv0pUu+A\"",
    "mtime": "2025-08-13T06:36:31.344Z",
    "size": 452,
    "path": "../public/icons/folder-interceptor.svg"
  },
  "/icons/folder-interface-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"19f-Zyx+EWza8I8fHBmeLdoRJ/6BFFk\"",
    "mtime": "2025-08-13T06:36:31.343Z",
    "size": 415,
    "path": "../public/icons/folder-interface-open.svg"
  },
  "/icons/folder-interface.svg": {
    "type": "image/svg+xml",
    "etag": "\"16a-Z6CRtKkuEqn3sT/xJnG/ZuteW7E\"",
    "mtime": "2025-08-13T06:36:31.343Z",
    "size": 362,
    "path": "../public/icons/folder-interface.svg"
  },
  "/icons/folder-ios-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"202-YN6v3zGsR4NHDhNnIScUEsTkwFc\"",
    "mtime": "2025-08-13T06:36:31.343Z",
    "size": 514,
    "path": "../public/icons/folder-ios-open.svg"
  },
  "/icons/folder-ios.svg": {
    "type": "image/svg+xml",
    "etag": "\"1cd-U9sJdrxtbvFBoD5+pL9eSWXrJxI\"",
    "mtime": "2025-08-13T06:36:31.343Z",
    "size": 461,
    "path": "../public/icons/folder-ios.svg"
  },
  "/icons/folder-java-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"19e-BujzFDzLXpyiGWAWb6LnWSXs8To\"",
    "mtime": "2025-08-13T06:36:31.344Z",
    "size": 414,
    "path": "../public/icons/folder-java-open.svg"
  },
  "/icons/folder-java.svg": {
    "type": "image/svg+xml",
    "etag": "\"169-pD5hm5U7cux93XwTXUiLFdT/10g\"",
    "mtime": "2025-08-13T06:36:31.344Z",
    "size": 361,
    "path": "../public/icons/folder-java.svg"
  },
  "/icons/folder-javascript-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3f1-UaOiasLSxD8b1CjXZsrZr7Bnn5Q\"",
    "mtime": "2025-08-13T06:36:31.343Z",
    "size": 1009,
    "path": "../public/icons/folder-javascript-open.svg"
  },
  "/icons/folder-javascript.svg": {
    "type": "image/svg+xml",
    "etag": "\"3bc-wUZAmI7HaeVUkZK8imBFJ/ZRFx4\"",
    "mtime": "2025-08-13T06:36:31.344Z",
    "size": 956,
    "path": "../public/icons/folder-javascript.svg"
  },
  "/icons/folder-jinja-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"21f-STFGvVz8SafHBTzvIz2vw34OBHs\"",
    "mtime": "2025-08-13T06:36:31.344Z",
    "size": 543,
    "path": "../public/icons/folder-jinja-open.svg"
  },
  "/icons/folder-jinja-open_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"21f-gvJgqlNpI3nkccG/6I/paUGydxA\"",
    "mtime": "2025-08-13T06:36:31.344Z",
    "size": 543,
    "path": "../public/icons/folder-jinja-open_light.svg"
  },
  "/icons/folder-jinja.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ea-acZknz8HRuue5zqjshadh/DzvT4\"",
    "mtime": "2025-08-13T06:36:31.344Z",
    "size": 490,
    "path": "../public/icons/folder-jinja.svg"
  },
  "/icons/folder-jinja_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ea-NjWgsLZodIIPB0d6BP+KJu7BO7I\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 490,
    "path": "../public/icons/folder-jinja_light.svg"
  },
  "/icons/folder-job-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1e7-8Rj9WWvWxWrFhZv7fWYQHoy8oxE\"",
    "mtime": "2025-08-13T06:36:31.344Z",
    "size": 487,
    "path": "../public/icons/folder-job-open.svg"
  },
  "/icons/folder-job.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b2-RF5pzBlAC4UR8GFzXKPnJZkbWLI\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 434,
    "path": "../public/icons/folder-job.svg"
  },
  "/icons/folder-json-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"34b-QSQtoOseIOnKYUjkiGDubktTjc4\"",
    "mtime": "2025-08-13T06:36:31.344Z",
    "size": 843,
    "path": "../public/icons/folder-json-open.svg"
  },
  "/icons/folder-json.svg": {
    "type": "image/svg+xml",
    "etag": "\"2c6-9OTC3GrVk6vYJhx/YohMdyuhPaA\"",
    "mtime": "2025-08-13T06:36:31.344Z",
    "size": 710,
    "path": "../public/icons/folder-json.svg"
  },
  "/icons/folder-jupyter-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"26f-ZjOReJWfd/J/vlDjLYXNZ4r90ZM\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 623,
    "path": "../public/icons/folder-jupyter-open.svg"
  },
  "/icons/folder-jupyter.svg": {
    "type": "image/svg+xml",
    "etag": "\"23a-+n7YuDMgyFbB+l395JPIpOos5hc\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 570,
    "path": "../public/icons/folder-jupyter.svg"
  },
  "/icons/folder-keys-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"181-UHwYiTaMSDG8o5kxSWps4Q4kIp4\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 385,
    "path": "../public/icons/folder-keys-open.svg"
  },
  "/icons/folder-keys.svg": {
    "type": "image/svg+xml",
    "etag": "\"14c-LrkLrb5UYLJ3uMhNUTIGpYj4HpU\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 332,
    "path": "../public/icons/folder-keys.svg"
  },
  "/icons/folder-kubernetes-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"c78-1n15mzV/8THF+L7umioBpwzSe7Y\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 3192,
    "path": "../public/icons/folder-kubernetes-open.svg"
  },
  "/icons/folder-kubernetes.svg": {
    "type": "image/svg+xml",
    "etag": "\"c43-ORf+rStAsxysIEgNB27rwW2p+xs\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 3139,
    "path": "../public/icons/folder-kubernetes.svg"
  },
  "/icons/folder-kusto-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d2-xXRH5ltnbFnRzUj/Tjw2JxP2wjo\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 466,
    "path": "../public/icons/folder-kusto-open.svg"
  },
  "/icons/folder-kusto.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b2-pVQvPZG0x+ZX9z0ML21+beHp00w\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 434,
    "path": "../public/icons/folder-kusto.svg"
  },
  "/icons/folder-layout-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"16c-KsNTcqe7+ZQ1WqDWSQC+9LhjCRQ\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 364,
    "path": "../public/icons/folder-layout-open.svg"
  },
  "/icons/folder-layout.svg": {
    "type": "image/svg+xml",
    "etag": "\"137-W6hBYIYn8k8oJFkgJsmJuUdup5w\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 311,
    "path": "../public/icons/folder-layout.svg"
  },
  "/icons/folder-lefthook-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3aa-SLEtqIPyFb/Dv2Q5Y+NrRIq/ZfQ\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 938,
    "path": "../public/icons/folder-lefthook-open.svg"
  },
  "/icons/folder-lefthook.svg": {
    "type": "image/svg+xml",
    "etag": "\"363-CGm99BRmob4IOspuXbKgQ7p1PqE\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 867,
    "path": "../public/icons/folder-lefthook.svg"
  },
  "/icons/folder-less-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"227-7TJKNNlQI5TAu2gDaPtNNyNR8sY\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 551,
    "path": "../public/icons/folder-less-open.svg"
  },
  "/icons/folder-less.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f2-HgdsvC3vKzbyw9ie3ejp6W36EFg\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 498,
    "path": "../public/icons/folder-less.svg"
  },
  "/icons/folder-lib-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1fa-+bpKwa9kECkUuw1CwoMw7uiCjUc\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 506,
    "path": "../public/icons/folder-lib-open.svg"
  },
  "/icons/folder-lib.svg": {
    "type": "image/svg+xml",
    "etag": "\"1cc-ZSZ3XPk/UtVKVrnc+rcfGypeI/8\"",
    "mtime": "2025-08-13T06:36:31.345Z",
    "size": 460,
    "path": "../public/icons/folder-lib.svg"
  },
  "/icons/folder-link-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"34d-zkfhMvyStJav5dA2gA3zqritQis\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 845,
    "path": "../public/icons/folder-link-open.svg"
  },
  "/icons/folder-link.svg": {
    "type": "image/svg+xml",
    "etag": "\"30c-FOVvNL695cJhk089JhcdaPP8QAw\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 780,
    "path": "../public/icons/folder-link.svg"
  },
  "/icons/folder-linux-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3bd-rGROs485TBKyYa7KmiXOFp/vrgs\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 957,
    "path": "../public/icons/folder-linux-open.svg"
  },
  "/icons/folder-linux.svg": {
    "type": "image/svg+xml",
    "etag": "\"388-A4upcBvI1HbBh45ityWspqasq6k\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 904,
    "path": "../public/icons/folder-linux.svg"
  },
  "/icons/folder-liquibase-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"4a6-gmYHFAsgN/uA11W9A/CTyh70qUY\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 1190,
    "path": "../public/icons/folder-liquibase-open.svg"
  },
  "/icons/folder-liquibase.svg": {
    "type": "image/svg+xml",
    "etag": "\"461-YrgICXa7gv0v546N5lKHqeXQmM0\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 1121,
    "path": "../public/icons/folder-liquibase.svg"
  },
  "/icons/folder-log-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f6-7R97rrGjbFDy9KP+FB9s2NHYzIQ\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 502,
    "path": "../public/icons/folder-log-open.svg"
  },
  "/icons/folder-log.svg": {
    "type": "image/svg+xml",
    "etag": "\"202-EdDRlg/NwYr0f7JAe8J7/w36t2I\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 514,
    "path": "../public/icons/folder-log.svg"
  },
  "/icons/folder-lottie-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"278-sYIKP0zbeFhARoN75ZfGzmcsAVE\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 632,
    "path": "../public/icons/folder-lottie-open.svg"
  },
  "/icons/folder-lottie.svg": {
    "type": "image/svg+xml",
    "etag": "\"243-lxG8JDLXjjYFOTBjXEhboHKoOdk\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 579,
    "path": "../public/icons/folder-lottie.svg"
  },
  "/icons/folder-lua-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d1-1GT7dJflKmbBE0w269ckt5DZpUg\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 465,
    "path": "../public/icons/folder-lua-open.svg"
  },
  "/icons/folder-lua.svg": {
    "type": "image/svg+xml",
    "etag": "\"19c-7uk0WoJr8Do8363SvdHx6RFBhzU\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 412,
    "path": "../public/icons/folder-lua.svg"
  },
  "/icons/folder-luau-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c0-vix1DvNsi2adrmmvvUSDAZxukVU\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 448,
    "path": "../public/icons/folder-luau-open.svg"
  },
  "/icons/folder-luau.svg": {
    "type": "image/svg+xml",
    "etag": "\"18b-QHwxSVfMgzlnBqc9yoUXI+xRl8g\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 395,
    "path": "../public/icons/folder-luau.svg"
  },
  "/icons/folder-macos-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"308-sOGzZyTC7Bgvbf3qIOFwDGrfKbo\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 776,
    "path": "../public/icons/folder-macos-open.svg"
  },
  "/icons/folder-macos.svg": {
    "type": "image/svg+xml",
    "etag": "\"2d3-KnCmpQqSQeEkaqz+gZHO+tvfGic\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 723,
    "path": "../public/icons/folder-macos.svg"
  },
  "/icons/folder-mail-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"19a-/hEOnsij/T0Puo5YCnZRTtIcu2M\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 410,
    "path": "../public/icons/folder-mail-open.svg"
  },
  "/icons/folder-mail.svg": {
    "type": "image/svg+xml",
    "etag": "\"165-4aFVWzxBQkzWfBEkEMmKghwEGaI\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 357,
    "path": "../public/icons/folder-mail.svg"
  },
  "/icons/folder-mappings-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"206-cqYbU6ImQBMBw/ikLG5Mgz0LQSs\"",
    "mtime": "2025-08-13T06:36:31.346Z",
    "size": 518,
    "path": "../public/icons/folder-mappings-open.svg"
  },
  "/icons/folder-mappings.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d1-Q3SMtocWrbnek5o/hciC9tPdNkE\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 465,
    "path": "../public/icons/folder-mappings.svg"
  },
  "/icons/folder-markdown-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"179-c4Met6UFFXh0Kyas1emYW+d1aYA\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 377,
    "path": "../public/icons/folder-markdown-open.svg"
  },
  "/icons/folder-markdown.svg": {
    "type": "image/svg+xml",
    "etag": "\"144-e1V5yr1baNtFzxqEvRJWkW+mQuQ\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 324,
    "path": "../public/icons/folder-markdown.svg"
  },
  "/icons/folder-mercurial-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"28f-EThUvD5VMPIRdD6chsZBtuwHuZM\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 655,
    "path": "../public/icons/folder-mercurial-open.svg"
  },
  "/icons/folder-mercurial.svg": {
    "type": "image/svg+xml",
    "etag": "\"25a-sZpWdQwSpRbJDxR6KA9G7cIdl4Q\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 602,
    "path": "../public/icons/folder-mercurial.svg"
  },
  "/icons/folder-messages-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1dc-jQ9jj1sZy6dOzSAQ0G3IPB1YMzg\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 476,
    "path": "../public/icons/folder-messages-open.svg"
  },
  "/icons/folder-messages.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a7-gZuFx8CGQpJHZ3xKy8ouvHpsBRU\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 423,
    "path": "../public/icons/folder-messages.svg"
  },
  "/icons/folder-meta-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1eb-AzzawtqKuGFyX82dNQJ6bRhwOAs\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 491,
    "path": "../public/icons/folder-meta-open.svg"
  },
  "/icons/folder-meta.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b6-/a/5AgOu+/CPrfF0kkh/m11hzs0\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 438,
    "path": "../public/icons/folder-meta.svg"
  },
  "/icons/folder-middleware-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"221-+1QyuriWuhws27uz1Ke/kGuK470\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 545,
    "path": "../public/icons/folder-middleware-open.svg"
  },
  "/icons/folder-middleware.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ec-6NHFJBaGaOkeeEDFGxuzxT2Nvw8\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 492,
    "path": "../public/icons/folder-middleware.svg"
  },
  "/icons/folder-mjml-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"269-F7gBNQiJjUpDq14sB6r/9NyPYUc\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 617,
    "path": "../public/icons/folder-mjml-open.svg"
  },
  "/icons/folder-mjml.svg": {
    "type": "image/svg+xml",
    "etag": "\"234-gEkY/VrGZ265yMMYw8CYMi/LRiY\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 564,
    "path": "../public/icons/folder-mjml.svg"
  },
  "/icons/folder-mobile-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f2-f0IiNFoMq1lrGzKP4R4tFdkW3AQ\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 498,
    "path": "../public/icons/folder-mobile-open.svg"
  },
  "/icons/folder-mobile.svg": {
    "type": "image/svg+xml",
    "etag": "\"1bd-pDlo0fZdVwRanHhGSZSqGJyzP/Q\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 445,
    "path": "../public/icons/folder-mobile.svg"
  },
  "/icons/folder-mock-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1cc-Cw2vQb6/PKzifSGjbbwpxUJzRjk\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 460,
    "path": "../public/icons/folder-mock-open.svg"
  },
  "/icons/folder-mock.svg": {
    "type": "image/svg+xml",
    "etag": "\"197-8NeeJZftWgRgHo+2Zyf8k+p5b44\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 407,
    "path": "../public/icons/folder-mock.svg"
  },
  "/icons/folder-mojo-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3c1-hNC9pqS15/dG7pLHc05+lucMvhc\"",
    "mtime": "2025-08-13T06:36:31.347Z",
    "size": 961,
    "path": "../public/icons/folder-mojo-open.svg"
  },
  "/icons/folder-mojo.svg": {
    "type": "image/svg+xml",
    "etag": "\"38c-AZs3YTecFMzIrFbrplMQ+JWMtGE\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 908,
    "path": "../public/icons/folder-mojo.svg"
  },
  "/icons/folder-molecule-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"270-rMOV5gpLTNaLMUQ8wB5I7qJBHlA\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 624,
    "path": "../public/icons/folder-molecule-open.svg"
  },
  "/icons/folder-molecule.svg": {
    "type": "image/svg+xml",
    "etag": "\"23b-6MZXGqr6hLfly/RVZv6TgJpWIug\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 571,
    "path": "../public/icons/folder-molecule.svg"
  },
  "/icons/folder-moon-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d7-hoIUvNRSHSX++g+e5kMK02KcX0U\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 471,
    "path": "../public/icons/folder-moon-open.svg"
  },
  "/icons/folder-moon.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a2-DmYdgduvJOiGJWc916mdwMY9knQ\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 418,
    "path": "../public/icons/folder-moon.svg"
  },
  "/icons/folder-netlify-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2e9-HEZmC1mVUCCAcoNiitzfsdmNiWg\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 745,
    "path": "../public/icons/folder-netlify-open.svg"
  },
  "/icons/folder-netlify.svg": {
    "type": "image/svg+xml",
    "etag": "\"2b4-7bMT9pmjgr1tCavwq9NyVINUWSo\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 692,
    "path": "../public/icons/folder-netlify.svg"
  },
  "/icons/folder-next-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"204-lnx3lVN2BasgdHCiYwxs9gIhvBs\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 516,
    "path": "../public/icons/folder-next-open.svg"
  },
  "/icons/folder-next.svg": {
    "type": "image/svg+xml",
    "etag": "\"1cf-eLzpm8oaIj9N9+ArA1iP4UYq3rg\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 463,
    "path": "../public/icons/folder-next.svg"
  },
  "/icons/folder-ngrx-store-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"580-UJTaSbMsazPTS8TO++IMK8M/acU\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 1408,
    "path": "../public/icons/folder-ngrx-store-open.svg"
  },
  "/icons/folder-ngrx-store.svg": {
    "type": "image/svg+xml",
    "etag": "\"54b-KECm+7ZL0EzpsEzZn5FkiVtRBiI\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 1355,
    "path": "../public/icons/folder-ngrx-store.svg"
  },
  "/icons/folder-node-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"161-ZiqC2KBiiUJbFDrpZJfWTeVW4bQ\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 353,
    "path": "../public/icons/folder-node-open.svg"
  },
  "/icons/folder-node.svg": {
    "type": "image/svg+xml",
    "etag": "\"12c-GglaKw7mhcmQ4vVlE819e51Y5wE\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 300,
    "path": "../public/icons/folder-node.svg"
  },
  "/icons/folder-nuxt-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"34a-OLgsjsvcIv5lktUYhj8Me8sh8zs\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 842,
    "path": "../public/icons/folder-nuxt-open.svg"
  },
  "/icons/folder-nuxt.svg": {
    "type": "image/svg+xml",
    "etag": "\"315-iaAuB799itt9zhIgJxoQERtnYAw\"",
    "mtime": "2025-08-13T06:36:31.348Z",
    "size": 789,
    "path": "../public/icons/folder-nuxt.svg"
  },
  "/icons/folder-obsidian-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"4a4-e/FoJPpQR7CXBi2NlvsyYyASyU4\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 1188,
    "path": "../public/icons/folder-obsidian-open.svg"
  },
  "/icons/folder-obsidian.svg": {
    "type": "image/svg+xml",
    "etag": "\"444-VgI2TCtU2ffEcIOMi7CrWR24ffc\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 1092,
    "path": "../public/icons/folder-obsidian.svg"
  },
  "/icons/folder-organism-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d4-ANfwslSB4cKAZcsK3/BUBvzXsQI\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 468,
    "path": "../public/icons/folder-organism-open.svg"
  },
  "/icons/folder-organism.svg": {
    "type": "image/svg+xml",
    "etag": "\"19f-m09oKZFQON3Hho1yBFdjdqeKv8k\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 415,
    "path": "../public/icons/folder-organism.svg"
  },
  "/icons/folder-other-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c7-AKnuetj0RdZlmq/o4e/RWQnpNyk\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 455,
    "path": "../public/icons/folder-other-open.svg"
  },
  "/icons/folder-other.svg": {
    "type": "image/svg+xml",
    "etag": "\"192-2p2LtejJQCDFDIsdlUPw/+eNXl8\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 402,
    "path": "../public/icons/folder-other.svg"
  },
  "/icons/folder-packages-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f2-SWlXDvSj7JNllXAsDEFUccCGB0k\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 498,
    "path": "../public/icons/folder-packages-open.svg"
  },
  "/icons/folder-packages.svg": {
    "type": "image/svg+xml",
    "etag": "\"1bd-OmOy6OsbKM2T05oOCp08S6vUW9U\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 445,
    "path": "../public/icons/folder-packages.svg"
  },
  "/icons/folder-pdf-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"5d7-lN+jP8YcdOwhe+rM9jL/W2VGsCQ\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 1495,
    "path": "../public/icons/folder-pdf-open.svg"
  },
  "/icons/folder-pdf.svg": {
    "type": "image/svg+xml",
    "etag": "\"5a2-s/lWooF5VB0zoU59+s1r/OjLyds\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 1442,
    "path": "../public/icons/folder-pdf.svg"
  },
  "/icons/folder-pdm-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2fa-GO7jJcSmeacSAEtIV6ifAkv6P1c\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 762,
    "path": "../public/icons/folder-pdm-open.svg"
  },
  "/icons/folder-pdm.svg": {
    "type": "image/svg+xml",
    "etag": "\"2c5-x5Uox0+ZX2PBA/1DSD1omDmiyF8\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 709,
    "path": "../public/icons/folder-pdm.svg"
  },
  "/icons/folder-php-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"304-Gf6G6bdJhGERC+0IOsa21pbdTJ4\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 772,
    "path": "../public/icons/folder-php-open.svg"
  },
  "/icons/folder-php.svg": {
    "type": "image/svg+xml",
    "etag": "\"2cf-SFCVy27YqzGYskUWW+oWsipU/+E\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 719,
    "path": "../public/icons/folder-php.svg"
  },
  "/icons/folder-phpmailer-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c8-Xn3ABzDl2VMYxlbi71w7UkoZ72w\"",
    "mtime": "2025-08-13T06:36:31.349Z",
    "size": 456,
    "path": "../public/icons/folder-phpmailer-open.svg"
  },
  "/icons/folder-phpmailer.svg": {
    "type": "image/svg+xml",
    "etag": "\"193-/UrId3pOBHZ96LiS+qnGR+cnzA4\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 403,
    "path": "../public/icons/folder-phpmailer.svg"
  },
  "/icons/folder-pipe-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"193-ruzUIBabMozbIPXC7z/z+hswNu4\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 403,
    "path": "../public/icons/folder-pipe-open.svg"
  },
  "/icons/folder-pipe.svg": {
    "type": "image/svg+xml",
    "etag": "\"15e-lltlEFi0DcNMCjQkBlZsstuMulk\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 350,
    "path": "../public/icons/folder-pipe.svg"
  },
  "/icons/folder-plastic-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"50b-nQDgN+GKwStDTkULd+XQM3sjdQg\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 1291,
    "path": "../public/icons/folder-plastic-open.svg"
  },
  "/icons/folder-plastic.svg": {
    "type": "image/svg+xml",
    "etag": "\"4d6-cboxznPr+lDCI8L71V4S7qxUB7k\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 1238,
    "path": "../public/icons/folder-plastic.svg"
  },
  "/icons/folder-plugin-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"221-ibQE1y1/DeuWr84Fb6nZhDSPlZ8\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 545,
    "path": "../public/icons/folder-plugin-open.svg"
  },
  "/icons/folder-plugin.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ec-qh5PQsaV2l3FCtenJaSNUuzuzoo\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 492,
    "path": "../public/icons/folder-plugin.svg"
  },
  "/icons/folder-policy-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"333-lPGkl8WuR4Ye+4qwc6ydd2wlwK8\"",
    "mtime": "2025-08-13T06:36:31.351Z",
    "size": 819,
    "path": "../public/icons/folder-policy-open.svg"
  },
  "/icons/folder-policy.svg": {
    "type": "image/svg+xml",
    "etag": "\"2fe-PWKtpm+E3z/N/86WYKqQhXB9t1c\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 766,
    "path": "../public/icons/folder-policy.svg"
  },
  "/icons/folder-powershell-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"287-SyuHQtH4d8mTcMMhJ2i+HB3gKXQ\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 647,
    "path": "../public/icons/folder-powershell-open.svg"
  },
  "/icons/folder-powershell.svg": {
    "type": "image/svg+xml",
    "etag": "\"252-sXlm/hRsxUzogSszkRj2zTEHzng\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 594,
    "path": "../public/icons/folder-powershell.svg"
  },
  "/icons/folder-prisma-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2a8-mrY0RO7xptwx1uakgVflHkoZ0no\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 680,
    "path": "../public/icons/folder-prisma-open.svg"
  },
  "/icons/folder-prisma.svg": {
    "type": "image/svg+xml",
    "etag": "\"273-W3THkaGdZefTBoPIJP88pLEumfc\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 627,
    "path": "../public/icons/folder-prisma.svg"
  },
  "/icons/folder-private-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1e0-MO9T8eeBYT3SepKccdN3QTpWYWE\"",
    "mtime": "2025-08-13T06:36:31.353Z",
    "size": 480,
    "path": "../public/icons/folder-private-open.svg"
  },
  "/icons/folder-private.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ab-Q7m3DuLB8Vimk3hXFtiF0cPA7jc\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 427,
    "path": "../public/icons/folder-private.svg"
  },
  "/icons/folder-project-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"29d-aVBfBok9uciQUaiKfjiBLKcioSc\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 669,
    "path": "../public/icons/folder-project-open.svg"
  },
  "/icons/folder-project.svg": {
    "type": "image/svg+xml",
    "etag": "\"268-y9u1qKsGztxW9TRNXcBm4l05rEM\"",
    "mtime": "2025-08-13T06:36:31.350Z",
    "size": 616,
    "path": "../public/icons/folder-project.svg"
  },
  "/icons/folder-proto-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"16e-pr79LlFvK3CjCioM7pDkD0z7ToA\"",
    "mtime": "2025-08-13T06:36:31.351Z",
    "size": 366,
    "path": "../public/icons/folder-proto-open.svg"
  },
  "/icons/folder-proto.svg": {
    "type": "image/svg+xml",
    "etag": "\"139-uIkAhy6bq+mae5/xHEc9bbj/eMw\"",
    "mtime": "2025-08-13T06:36:31.351Z",
    "size": 313,
    "path": "../public/icons/folder-proto.svg"
  },
  "/icons/folder-public-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"387-nM14cdJXss99SUGpTI3z0smRMzk\"",
    "mtime": "2025-08-13T06:36:31.351Z",
    "size": 903,
    "path": "../public/icons/folder-public-open.svg"
  },
  "/icons/folder-public.svg": {
    "type": "image/svg+xml",
    "etag": "\"352-ZUfRhaxChnQlGE1of29bVp2qwvU\"",
    "mtime": "2025-08-13T06:36:31.351Z",
    "size": 850,
    "path": "../public/icons/folder-public.svg"
  },
  "/icons/folder-python-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"444-asKA2gTNH/qIWVDPoBtTmJNhvuw\"",
    "mtime": "2025-08-13T06:36:31.351Z",
    "size": 1092,
    "path": "../public/icons/folder-python-open.svg"
  },
  "/icons/folder-python.svg": {
    "type": "image/svg+xml",
    "etag": "\"40f-vwaDuWmTTXDLToGdeBvAV6OwX7A\"",
    "mtime": "2025-08-13T06:36:31.352Z",
    "size": 1039,
    "path": "../public/icons/folder-python.svg"
  },
  "/icons/folder-pytorch-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"309-/9nsNaYbGYY0SwN1LhGlUB7xbAs\"",
    "mtime": "2025-08-13T06:36:31.351Z",
    "size": 777,
    "path": "../public/icons/folder-pytorch-open.svg"
  },
  "/icons/folder-pytorch.svg": {
    "type": "image/svg+xml",
    "etag": "\"2d4-armJhPhixuRDl3qSxUToi6gOin4\"",
    "mtime": "2025-08-13T06:36:31.352Z",
    "size": 724,
    "path": "../public/icons/folder-pytorch.svg"
  },
  "/icons/folder-quasar-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"50e-+dI3Sn7hZtHIVwGxtCaHHUtkOBg\"",
    "mtime": "2025-08-13T06:36:31.356Z",
    "size": 1294,
    "path": "../public/icons/folder-quasar-open.svg"
  },
  "/icons/folder-quasar.svg": {
    "type": "image/svg+xml",
    "etag": "\"4d9-oS0pEYkOscBPP/Mfdv1X6RnDTHU\"",
    "mtime": "2025-08-13T06:36:31.355Z",
    "size": 1241,
    "path": "../public/icons/folder-quasar.svg"
  },
  "/icons/folder-queue-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b1-oxOqfsAv0m9gWBu24BrZXLA8ILk\"",
    "mtime": "2025-08-13T06:36:31.354Z",
    "size": 433,
    "path": "../public/icons/folder-queue-open.svg"
  },
  "/icons/folder-queue.svg": {
    "type": "image/svg+xml",
    "etag": "\"17c-tIbY9OO8dWwmdBj8ou58ieSa83o\"",
    "mtime": "2025-08-13T06:36:31.355Z",
    "size": 380,
    "path": "../public/icons/folder-queue.svg"
  },
  "/icons/folder-react-components-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"520-50Psiy0fy7vmaFkWfNh6/ANw9zo\"",
    "mtime": "2025-08-13T06:36:31.357Z",
    "size": 1312,
    "path": "../public/icons/folder-react-components-open.svg"
  },
  "/icons/folder-react-components.svg": {
    "type": "image/svg+xml",
    "etag": "\"4f1-Qrcy6gj6mokQzg2WK9ifhTzLVLU\"",
    "mtime": "2025-08-13T06:36:31.355Z",
    "size": 1265,
    "path": "../public/icons/folder-react-components.svg"
  },
  "/icons/folder-redux-reducer-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"7e4-EL5sYnsvdkrQ455pUvtKlFlRkN4\"",
    "mtime": "2025-08-13T06:36:31.355Z",
    "size": 2020,
    "path": "../public/icons/folder-redux-reducer-open.svg"
  },
  "/icons/folder-redux-reducer.svg": {
    "type": "image/svg+xml",
    "etag": "\"7af-EjZefrP61ZgcCXocVJ3G3tUn1zs\"",
    "mtime": "2025-08-13T06:36:31.355Z",
    "size": 1967,
    "path": "../public/icons/folder-redux-reducer.svg"
  },
  "/icons/folder-repository-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1e9-IJYN/sCpwAvq7ID1QKy9aFRGYX4\"",
    "mtime": "2025-08-13T06:36:31.355Z",
    "size": 489,
    "path": "../public/icons/folder-repository-open.svg"
  },
  "/icons/folder-repository.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b4-g3GcJ4T/61VnLDYwvFZzAqJF0EY\"",
    "mtime": "2025-08-13T06:36:31.355Z",
    "size": 436,
    "path": "../public/icons/folder-repository.svg"
  },
  "/icons/folder-resolver-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"177-1N0G5VEuWviAbrhmIA2n4xTp5YY\"",
    "mtime": "2025-08-13T06:36:31.355Z",
    "size": 375,
    "path": "../public/icons/folder-resolver-open.svg"
  },
  "/icons/folder-resolver.svg": {
    "type": "image/svg+xml",
    "etag": "\"142-bxDS+cbUHOmgijMuyJwKz7Y3v9o\"",
    "mtime": "2025-08-13T06:36:31.355Z",
    "size": 322,
    "path": "../public/icons/folder-resolver.svg"
  },
  "/icons/folder-resource-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1eb-2CgLTAPGabV6noN6FcxoB9F50Ng\"",
    "mtime": "2025-08-13T06:36:31.355Z",
    "size": 491,
    "path": "../public/icons/folder-resource-open.svg"
  },
  "/icons/folder-resource.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b6-XNwyfI/cPjYbS3OUK2IsDxfB/f8\"",
    "mtime": "2025-08-13T06:36:31.356Z",
    "size": 438,
    "path": "../public/icons/folder-resource.svg"
  },
  "/icons/folder-review-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1df-NIpPBkUZsv53fLOubpvfG6sgFjI\"",
    "mtime": "2025-08-13T06:36:31.356Z",
    "size": 479,
    "path": "../public/icons/folder-review-open.svg"
  },
  "/icons/folder-review.svg": {
    "type": "image/svg+xml",
    "etag": "\"1aa-fs3DTbsNzZ7JwD9tVKSmNJhlZTY\"",
    "mtime": "2025-08-13T06:36:31.358Z",
    "size": 426,
    "path": "../public/icons/folder-review.svg"
  },
  "/icons/folder-robot-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"276-kXg8V6qPyM35qOqfBiRn9rMUMGo\"",
    "mtime": "2025-08-13T06:36:31.357Z",
    "size": 630,
    "path": "../public/icons/folder-robot-open.svg"
  },
  "/icons/folder-robot.svg": {
    "type": "image/svg+xml",
    "etag": "\"241-cWI4tM66FuLR1RC7woq3HP0H/Ic\"",
    "mtime": "2025-08-13T06:36:31.358Z",
    "size": 577,
    "path": "../public/icons/folder-robot.svg"
  },
  "/icons/folder-routes-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1e3-0hwpYpaxrOTsGcCgJ0S+SBF35xI\"",
    "mtime": "2025-08-13T06:36:31.357Z",
    "size": 483,
    "path": "../public/icons/folder-routes-open.svg"
  },
  "/icons/folder-routes.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ae-o3kIX03NgSjwJDjT15u2NPDA0iA\"",
    "mtime": "2025-08-13T06:36:31.358Z",
    "size": 430,
    "path": "../public/icons/folder-routes.svg"
  },
  "/icons/folder-rules-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"204-nCJINOI0V54b0otftWA8MOsERoc\"",
    "mtime": "2025-08-13T06:36:31.357Z",
    "size": 516,
    "path": "../public/icons/folder-rules-open.svg"
  },
  "/icons/folder-rules.svg": {
    "type": "image/svg+xml",
    "etag": "\"1cf-3Y4aq51hRwIcJIH/oW4qI5+DIfQ\"",
    "mtime": "2025-08-13T06:36:31.358Z",
    "size": 463,
    "path": "../public/icons/folder-rules.svg"
  },
  "/icons/folder-rust-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"200-3A+ZhIcfRUMPhuue+ORFTDJ02tE\"",
    "mtime": "2025-08-13T06:36:31.358Z",
    "size": 512,
    "path": "../public/icons/folder-rust-open.svg"
  },
  "/icons/folder-rust.svg": {
    "type": "image/svg+xml",
    "etag": "\"1cb-gvopl4lNPWxV4tZ5mpwxbGc9ojQ\"",
    "mtime": "2025-08-13T06:36:31.358Z",
    "size": 459,
    "path": "../public/icons/folder-rust.svg"
  },
  "/icons/folder-sandbox-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"275-GHt9cZMi3Jqh1yZCjnzNQdCrApw\"",
    "mtime": "2025-08-13T06:36:31.358Z",
    "size": 629,
    "path": "../public/icons/folder-sandbox-open.svg"
  },
  "/icons/folder-sandbox.svg": {
    "type": "image/svg+xml",
    "etag": "\"22d-EaOlRwCUlIErHSntTbReRbndTvA\"",
    "mtime": "2025-08-13T06:36:31.358Z",
    "size": 557,
    "path": "../public/icons/folder-sandbox.svg"
  },
  "/icons/folder-sass-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"5b1-vb7XPGuVzYpVogWlaDKw2rkPfL8\"",
    "mtime": "2025-08-13T06:36:31.359Z",
    "size": 1457,
    "path": "../public/icons/folder-sass-open.svg"
  },
  "/icons/folder-sass.svg": {
    "type": "image/svg+xml",
    "etag": "\"57c-nyHMZxy2WanTV24u4EFO86V2a3c\"",
    "mtime": "2025-08-13T06:36:31.358Z",
    "size": 1404,
    "path": "../public/icons/folder-sass.svg"
  },
  "/icons/folder-scala-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1fc-AZiJAMe5A1DSwckHZqmIdYH5o6k\"",
    "mtime": "2025-08-13T06:36:31.359Z",
    "size": 508,
    "path": "../public/icons/folder-scala-open.svg"
  },
  "/icons/folder-scala.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c7-ikOZ+/qJ6axIVygHFlWrlFockPY\"",
    "mtime": "2025-08-13T06:36:31.358Z",
    "size": 455,
    "path": "../public/icons/folder-scala.svg"
  },
  "/icons/folder-scons-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"190-STdDu7t3VlL+ACu8qqF5U5uyKrM\"",
    "mtime": "2025-08-13T06:36:31.359Z",
    "size": 400,
    "path": "../public/icons/folder-scons-open.svg"
  },
  "/icons/folder-scons.svg": {
    "type": "image/svg+xml",
    "etag": "\"163-CYWngRBFRpLdWBn/svfKaZYsaO0\"",
    "mtime": "2025-08-13T06:36:31.359Z",
    "size": 355,
    "path": "../public/icons/folder-scons.svg"
  },
  "/icons/folder-scripts-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1be-82P9m1SGHms2WSKqZcIRQ/fEjTQ\"",
    "mtime": "2025-08-13T06:36:31.359Z",
    "size": 446,
    "path": "../public/icons/folder-scripts-open.svg"
  },
  "/icons/folder-scripts.svg": {
    "type": "image/svg+xml",
    "etag": "\"189-Qiyk6B2AZ+WkzEloNNYX6TOjikw\"",
    "mtime": "2025-08-13T06:36:31.359Z",
    "size": 393,
    "path": "../public/icons/folder-scripts.svg"
  },
  "/icons/folder-secure-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f2-fdNetwWnnhlRWSTqDrGVvvTrNc0\"",
    "mtime": "2025-08-13T06:36:31.360Z",
    "size": 498,
    "path": "../public/icons/folder-secure-open.svg"
  },
  "/icons/folder-secure.svg": {
    "type": "image/svg+xml",
    "etag": "\"1bd-1+JJPR2UeEg1bypE2hNR23bCjXc\"",
    "mtime": "2025-08-13T06:36:31.359Z",
    "size": 445,
    "path": "../public/icons/folder-secure.svg"
  },
  "/icons/folder-seeders-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"de1-8w6mjd0aHadHHmAmgIAGKDRDyfg\"",
    "mtime": "2025-08-13T06:36:31.359Z",
    "size": 3553,
    "path": "../public/icons/folder-seeders-open.svg"
  },
  "/icons/folder-seeders.svg": {
    "type": "image/svg+xml",
    "etag": "\"99b-TcyhR55DeAW4vtUOyT661YsfbfA\"",
    "mtime": "2025-08-13T06:36:31.359Z",
    "size": 2459,
    "path": "../public/icons/folder-seeders.svg"
  },
  "/icons/folder-server-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1fd-5bdttI6MYxGKiORYCcKYaWOqL74\"",
    "mtime": "2025-08-13T06:36:31.360Z",
    "size": 509,
    "path": "../public/icons/folder-server-open.svg"
  },
  "/icons/folder-server.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c8-ttQLwXfOf399/WaUOedzSHtY044\"",
    "mtime": "2025-08-13T06:36:31.360Z",
    "size": 456,
    "path": "../public/icons/folder-server.svg"
  },
  "/icons/folder-serverless-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a5-ttlDmEM8smEP0hLahdOXxcXbp+I\"",
    "mtime": "2025-08-13T06:36:31.360Z",
    "size": 421,
    "path": "../public/icons/folder-serverless-open.svg"
  },
  "/icons/folder-serverless.svg": {
    "type": "image/svg+xml",
    "etag": "\"170-s7YLTWgYmB5QiNgtC4s/Ih0x+6g\"",
    "mtime": "2025-08-13T06:36:31.360Z",
    "size": 368,
    "path": "../public/icons/folder-serverless.svg"
  },
  "/icons/folder-shader-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"28f-L57Xjyk5i3tnrkfsrio1C4u/Ync\"",
    "mtime": "2025-08-13T06:36:31.360Z",
    "size": 655,
    "path": "../public/icons/folder-shader-open.svg"
  },
  "/icons/folder-shader.svg": {
    "type": "image/svg+xml",
    "etag": "\"25a-FOUHnIc4GSwaJWmt7egwbfjzBSs\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 602,
    "path": "../public/icons/folder-shader.svg"
  },
  "/icons/folder-shared-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1cf-Em32TfryWfpJ+d28iONvX2+uZwE\"",
    "mtime": "2025-08-13T06:36:31.360Z",
    "size": 463,
    "path": "../public/icons/folder-shared-open.svg"
  },
  "/icons/folder-shared.svg": {
    "type": "image/svg+xml",
    "etag": "\"19a-yijjf2HIergtPX6UQLyxQip/JyE\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 410,
    "path": "../public/icons/folder-shared.svg"
  },
  "/icons/folder-snapcraft-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1dc-pFWdhfyuMBIrs1LV6akFiLWUrhQ\"",
    "mtime": "2025-08-13T06:36:31.360Z",
    "size": 476,
    "path": "../public/icons/folder-snapcraft-open.svg"
  },
  "/icons/folder-snapcraft.svg": {
    "type": "image/svg+xml",
    "etag": "\"177-NQqYIRGIT/5GfPF3kn8gE4/OEgs\"",
    "mtime": "2025-08-13T06:36:31.360Z",
    "size": 375,
    "path": "../public/icons/folder-snapcraft.svg"
  },
  "/icons/folder-snippet-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2e4-KGnRvuJjzMQKdR01Q5zl+kx/41c\"",
    "mtime": "2025-08-13T06:36:31.360Z",
    "size": 740,
    "path": "../public/icons/folder-snippet-open.svg"
  },
  "/icons/folder-snippet.svg": {
    "type": "image/svg+xml",
    "etag": "\"2c7-jA6TIeWkS2Ag53Shve27JnP2tyw\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 711,
    "path": "../public/icons/folder-snippet.svg"
  },
  "/icons/folder-src-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3fc-B6KGMG8x/K+veDaqq1nGrxmn9XI\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 1020,
    "path": "../public/icons/folder-src-open.svg"
  },
  "/icons/folder-src-tauri-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"46a-sScr2rofRgqTScaYPN68R27p6bo\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 1130,
    "path": "../public/icons/folder-src-tauri-open.svg"
  },
  "/icons/folder-src-tauri.svg": {
    "type": "image/svg+xml",
    "etag": "\"495-9yLNWBmg90mxg/8NfD2xn5Ajv8o\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 1173,
    "path": "../public/icons/folder-src-tauri.svg"
  },
  "/icons/folder-src.svg": {
    "type": "image/svg+xml",
    "etag": "\"3c5-L4GRFP7U4M/Yr2Z6UDqA5PdgvBo\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 965,
    "path": "../public/icons/folder-src.svg"
  },
  "/icons/folder-stack-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"207-4reQOrEMFM4pN7U33+civZw3sJw\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 519,
    "path": "../public/icons/folder-stack-open.svg"
  },
  "/icons/folder-stack.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d2-yRH5EgPvLqshxV4nLxLwuiPJS3w\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 466,
    "path": "../public/icons/folder-stack.svg"
  },
  "/icons/folder-stencil-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"16c-euQ5af24qQ1395CqOLacRGaYobI\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 364,
    "path": "../public/icons/folder-stencil-open.svg"
  },
  "/icons/folder-stencil.svg": {
    "type": "image/svg+xml",
    "etag": "\"137-z6jbTbDQV0VhHOIuMPUnA1nX6JI\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 311,
    "path": "../public/icons/folder-stencil.svg"
  },
  "/icons/folder-store-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"17d-EYamXYnwCY4J8PAmF0JJPDC6AdY\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 381,
    "path": "../public/icons/folder-store-open.svg"
  },
  "/icons/folder-store.svg": {
    "type": "image/svg+xml",
    "etag": "\"15d-+OfmMHgsJkcDFhzInOZ19aztFNY\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 349,
    "path": "../public/icons/folder-store.svg"
  },
  "/icons/folder-storybook-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"308-15Um5/IQJPbu9+BUOCBmx816fXU\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 776,
    "path": "../public/icons/folder-storybook-open.svg"
  },
  "/icons/folder-storybook.svg": {
    "type": "image/svg+xml",
    "etag": "\"2d3-TclPlA4SeFneK8YKNrAv/q38uQ8\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 723,
    "path": "../public/icons/folder-storybook.svg"
  },
  "/icons/folder-stylus-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ad-DjXvyzOWqGjLvrmwywVVT1SrsPY\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 685,
    "path": "../public/icons/folder-stylus-open.svg"
  },
  "/icons/folder-stylus.svg": {
    "type": "image/svg+xml",
    "etag": "\"278-RylbkMyc1ln2/WOFINNwfX4GJKw\"",
    "mtime": "2025-08-13T06:36:31.361Z",
    "size": 632,
    "path": "../public/icons/folder-stylus.svg"
  },
  "/icons/folder-sublime-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"258-dn2/TSgqNUUFvv11pyWYW2KzJzw\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 600,
    "path": "../public/icons/folder-sublime-open.svg"
  },
  "/icons/folder-sublime.svg": {
    "type": "image/svg+xml",
    "etag": "\"223-DY4HNceT5n/HE6U+UlKKfw+qgP8\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 547,
    "path": "../public/icons/folder-sublime.svg"
  },
  "/icons/folder-supabase-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1aa-dht0D641I7hrr0AZvr6rWZnu0vU\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 426,
    "path": "../public/icons/folder-supabase-open.svg"
  },
  "/icons/folder-supabase.svg": {
    "type": "image/svg+xml",
    "etag": "\"175-NoeOd/U/ah1BcmZZZ9lLYzqYlxQ\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 373,
    "path": "../public/icons/folder-supabase.svg"
  },
  "/icons/folder-svelte-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"620-G5vYRYUebrcu8KPeBi+7dh8lxW0\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 1568,
    "path": "../public/icons/folder-svelte-open.svg"
  },
  "/icons/folder-svelte.svg": {
    "type": "image/svg+xml",
    "etag": "\"5eb-dfS6PIdp+L+7V/1vyLyZyDikiaA\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 1515,
    "path": "../public/icons/folder-svelte.svg"
  },
  "/icons/folder-svg-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"29d-TTe1/8T1a7N0wf+WrGuF/8U4A+8\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 669,
    "path": "../public/icons/folder-svg-open.svg"
  },
  "/icons/folder-svg.svg": {
    "type": "image/svg+xml",
    "etag": "\"268-HDBr6L8/IFS0HCFT2V/92gN3dIA\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 616,
    "path": "../public/icons/folder-svg.svg"
  },
  "/icons/folder-syntax-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"325-IUVdFTNVLxqn83x4Rrrv6YxsQ7c\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 805,
    "path": "../public/icons/folder-syntax-open.svg"
  },
  "/icons/folder-syntax.svg": {
    "type": "image/svg+xml",
    "etag": "\"2f0-yMPd6fQ455i/JeTGP8Nm6NYUvaY\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 752,
    "path": "../public/icons/folder-syntax.svg"
  },
  "/icons/folder-target-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"303-afuG72aQmq+JqICkbcL6E2qVTGs\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 771,
    "path": "../public/icons/folder-target-open.svg"
  },
  "/icons/folder-target.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ce-U9u8xj1gLU0rySErb8pcrmDzc34\"",
    "mtime": "2025-08-13T06:36:31.362Z",
    "size": 718,
    "path": "../public/icons/folder-target.svg"
  },
  "/icons/folder-taskfile-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"161-S0AsgLoT4oMdHtV+6hWhfTeYlxQ\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 353,
    "path": "../public/icons/folder-taskfile-open.svg"
  },
  "/icons/folder-taskfile.svg": {
    "type": "image/svg+xml",
    "etag": "\"12c-leAnnPkb4gj8pajcKFFjPIUTlpc\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 300,
    "path": "../public/icons/folder-taskfile.svg"
  },
  "/icons/folder-tasks-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1fa-adcksOFOGgxX//4XAab4jWTs+lM\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 506,
    "path": "../public/icons/folder-tasks-open.svg"
  },
  "/icons/folder-tasks.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c5-r1JEoV85LZBHgXZPVBomJMyPzKM\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 453,
    "path": "../public/icons/folder-tasks.svg"
  },
  "/icons/folder-television-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"198-yc9NSDbjLn8frovAShIeJYe48BU\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 408,
    "path": "../public/icons/folder-television-open.svg"
  },
  "/icons/folder-television.svg": {
    "type": "image/svg+xml",
    "etag": "\"163-Gi5kmGoVxZBmfe0QOqcam3s2fOA\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 355,
    "path": "../public/icons/folder-television.svg"
  },
  "/icons/folder-temp-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d7-R8SaLyyVCA5GaWfZwNkmXJT1s/E\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 471,
    "path": "../public/icons/folder-temp-open.svg"
  },
  "/icons/folder-temp.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a2-/Ae5aHjXk9jsdbZtmCmPbLmY//k\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 418,
    "path": "../public/icons/folder-temp.svg"
  },
  "/icons/folder-template-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"177-fZlEfExM35GeJr+6dorkqcNyjzI\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 375,
    "path": "../public/icons/folder-template-open.svg"
  },
  "/icons/folder-template.svg": {
    "type": "image/svg+xml",
    "etag": "\"142-ZRs4ZPNWCYtSNj8yb2CuPRa9klA\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 322,
    "path": "../public/icons/folder-template.svg"
  },
  "/icons/folder-terraform-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d3-7O4RgF4BtWTvhJos2H4tGmOXc5A\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 467,
    "path": "../public/icons/folder-terraform-open.svg"
  },
  "/icons/folder-terraform.svg": {
    "type": "image/svg+xml",
    "etag": "\"19e-Dyr1H8z1Ptrhez7bYVkaAjsQ6xI\"",
    "mtime": "2025-08-13T06:36:31.363Z",
    "size": 414,
    "path": "../public/icons/folder-terraform.svg"
  },
  "/icons/folder-test-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a9-NWLpaczrzf9R1rRLLWyXFKew/I0\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 425,
    "path": "../public/icons/folder-test-open.svg"
  },
  "/icons/folder-test.svg": {
    "type": "image/svg+xml",
    "etag": "\"174-5+uKgZUyz3Im1ptqV3IU/gTJFx8\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 372,
    "path": "../public/icons/folder-test.svg"
  },
  "/icons/folder-theme-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"231-dxKtyJymr5MyThUdZHWDUk8su98\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 561,
    "path": "../public/icons/folder-theme-open.svg"
  },
  "/icons/folder-theme.svg": {
    "type": "image/svg+xml",
    "etag": "\"1fc-qksFnsYsWnon5uywTfxLZnYea6g\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 508,
    "path": "../public/icons/folder-theme.svg"
  },
  "/icons/folder-tools-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"252-Lv7b09PnX8xLPM7eeteUS3Li1rM\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 594,
    "path": "../public/icons/folder-tools-open.svg"
  },
  "/icons/folder-tools.svg": {
    "type": "image/svg+xml",
    "etag": "\"21d-R+5Nt/ibvy/JF+laXHxSZYEV7ZM\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 541,
    "path": "../public/icons/folder-tools.svg"
  },
  "/icons/folder-trash-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"2a6-jfMyTvpnjTijK9R6u1+mEMY4+fc\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 678,
    "path": "../public/icons/folder-trash-open.svg"
  },
  "/icons/folder-trash.svg": {
    "type": "image/svg+xml",
    "etag": "\"246-jtrl57v9aIRVra0pHzFYEqGwVYc\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 582,
    "path": "../public/icons/folder-trash.svg"
  },
  "/icons/folder-trigger-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d5-pVu/5ky6CJfTvTPUubKTIDrogNg\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 469,
    "path": "../public/icons/folder-trigger-open.svg"
  },
  "/icons/folder-trigger.svg": {
    "type": "image/svg+xml",
    "etag": "\"196-9xhB3BvWtLwzCcAGN3FG+4CfOd0\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 406,
    "path": "../public/icons/folder-trigger.svg"
  },
  "/icons/folder-turborepo-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"372-5FEUFgIKBC+gpzTG5yMowtxcj38\"",
    "mtime": "2025-08-13T06:36:31.364Z",
    "size": 882,
    "path": "../public/icons/folder-turborepo-open.svg"
  },
  "/icons/folder-turborepo.svg": {
    "type": "image/svg+xml",
    "etag": "\"33d-VIFG8XZTZhghelreoYQUQfWtpIw\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 829,
    "path": "../public/icons/folder-turborepo.svg"
  },
  "/icons/folder-typescript-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"3bb-DGRQRko1h9zbkmqfLk0gbvijpIs\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 955,
    "path": "../public/icons/folder-typescript-open.svg"
  },
  "/icons/folder-typescript.svg": {
    "type": "image/svg+xml",
    "etag": "\"386-dTm6ZvGbLMSNzAduEphOzhpCIMI\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 902,
    "path": "../public/icons/folder-typescript.svg"
  },
  "/icons/folder-ui-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"15e-33GmINdQq0tnD1Hlqgmj+wv/PRo\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 350,
    "path": "../public/icons/folder-ui-open.svg"
  },
  "/icons/folder-ui.svg": {
    "type": "image/svg+xml",
    "etag": "\"129-4H1pWAvb05TPHJIE+VHxSRFNAlE\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 297,
    "path": "../public/icons/folder-ui.svg"
  },
  "/icons/folder-unity-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c7-Ha2SnYto/fVQvUqBROVuFtEtaWA\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 455,
    "path": "../public/icons/folder-unity-open.svg"
  },
  "/icons/folder-unity.svg": {
    "type": "image/svg+xml",
    "etag": "\"19a-RsV/0+Gqp3Z1nKXE+0g17zgAb8g\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 410,
    "path": "../public/icons/folder-unity.svg"
  },
  "/icons/folder-update-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1de-zi/Sw7ZlEKTbR0h5SuO7xIlijls\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 478,
    "path": "../public/icons/folder-update-open.svg"
  },
  "/icons/folder-update.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a9-DB+Yjyx3y2lubN2ZJPDHhxVtxs8\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 425,
    "path": "../public/icons/folder-update.svg"
  },
  "/icons/folder-upload-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"15f-X6/x1GYeKIvrLOl/iXmjFqSWTQc\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 351,
    "path": "../public/icons/folder-upload-open.svg"
  },
  "/icons/folder-upload.svg": {
    "type": "image/svg+xml",
    "etag": "\"12a-JHr9sQfY3Ii5X6aiKIelpS5geM0\"",
    "mtime": "2025-08-13T06:36:31.365Z",
    "size": 298,
    "path": "../public/icons/folder-upload.svg"
  },
  "/icons/folder-utils-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1e2-79zHbXQbP24z8mFJpFHz1RSZxO8\"",
    "mtime": "2025-08-13T06:36:31.366Z",
    "size": 482,
    "path": "../public/icons/folder-utils-open.svg"
  },
  "/icons/folder-utils.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ad-Nyi35nEdi5YWIjzLAymB3HB7qLI\"",
    "mtime": "2025-08-13T06:36:31.366Z",
    "size": 429,
    "path": "../public/icons/folder-utils.svg"
  },
  "/icons/folder-vercel-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"147-qdxlwRhOgD5K/DrKopEJnpH5/QA\"",
    "mtime": "2025-08-13T06:36:31.366Z",
    "size": 327,
    "path": "../public/icons/folder-vercel-open.svg"
  },
  "/icons/folder-vercel.svg": {
    "type": "image/svg+xml",
    "etag": "\"112-p8jPXW5aWxZCtWyCWfpEmW2kbSs\"",
    "mtime": "2025-08-13T06:36:31.366Z",
    "size": 274,
    "path": "../public/icons/folder-vercel.svg"
  },
  "/icons/folder-verdaccio-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f2-QemXzEz/mc7/tfB+oei5iaJD7a4\"",
    "mtime": "2025-08-13T06:36:31.366Z",
    "size": 498,
    "path": "../public/icons/folder-verdaccio-open.svg"
  },
  "/icons/folder-verdaccio.svg": {
    "type": "image/svg+xml",
    "etag": "\"1bd-+MCkKnAXREuKEqmVS9zeimQLCpw\"",
    "mtime": "2025-08-13T06:36:31.366Z",
    "size": 445,
    "path": "../public/icons/folder-verdaccio.svg"
  },
  "/icons/folder-video-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b1-KTDPreQFx9KWDQmmObBH7UsbfuQ\"",
    "mtime": "2025-08-13T06:36:31.366Z",
    "size": 433,
    "path": "../public/icons/folder-video-open.svg"
  },
  "/icons/folder-video.svg": {
    "type": "image/svg+xml",
    "etag": "\"17c-0qoCoaVPJyLE8W5oZWnIPQaUxrY\"",
    "mtime": "2025-08-13T06:36:31.366Z",
    "size": 380,
    "path": "../public/icons/folder-video.svg"
  },
  "/icons/folder-views-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c6-EtFIEJWfPuHWgEz1PpZfGWh0QXQ\"",
    "mtime": "2025-08-13T06:36:31.366Z",
    "size": 454,
    "path": "../public/icons/folder-views-open.svg"
  },
  "/icons/folder-views.svg": {
    "type": "image/svg+xml",
    "etag": "\"191-8zR04ldRdaAp3kVdVzBKmo994EE\"",
    "mtime": "2025-08-13T06:36:31.366Z",
    "size": 401,
    "path": "../public/icons/folder-views.svg"
  },
  "/icons/folder-vm-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c9-y3+ypU3O2rOMxEocWgqBaO3RqJo\"",
    "mtime": "2025-08-13T06:36:31.366Z",
    "size": 457,
    "path": "../public/icons/folder-vm-open.svg"
  },
  "/icons/folder-vm.svg": {
    "type": "image/svg+xml",
    "etag": "\"194-NqCfzhezIe005oSfRL9eY4H+/AA\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 404,
    "path": "../public/icons/folder-vm.svg"
  },
  "/icons/folder-vscode-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c9-GH59A5iP3F0oOOBRSvo+UsLCBQI\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 457,
    "path": "../public/icons/folder-vscode-open.svg"
  },
  "/icons/folder-vscode.svg": {
    "type": "image/svg+xml",
    "etag": "\"194-CquSvPvJrRmBcxO72tN0SWAbRMc\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 404,
    "path": "../public/icons/folder-vscode.svg"
  },
  "/icons/folder-vue-directives-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c8-cnmM6FsPuXWUUJncnnOyqrylT6A\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 456,
    "path": "../public/icons/folder-vue-directives-open.svg"
  },
  "/icons/folder-vue-directives.svg": {
    "type": "image/svg+xml",
    "etag": "\"193-Flo2ZS/f8OZbLnfqyCFGgNYA5Rw\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 403,
    "path": "../public/icons/folder-vue-directives.svg"
  },
  "/icons/folder-vue-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c8-N/pLkFnscyYQ7tDnR8Y5XbFClxI\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 456,
    "path": "../public/icons/folder-vue-open.svg"
  },
  "/icons/folder-vue.svg": {
    "type": "image/svg+xml",
    "etag": "\"193-VDl6nv8GasfYx4a4myWe7a5260Y\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 403,
    "path": "../public/icons/folder-vue.svg"
  },
  "/icons/folder-vuepress-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"24b-hxG3MUF9FPDnuXVimPvnGeuUNk8\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 587,
    "path": "../public/icons/folder-vuepress-open.svg"
  },
  "/icons/folder-vuepress.svg": {
    "type": "image/svg+xml",
    "etag": "\"216-KhdZzmxoMCjTJRnjQdz59x/gKUw\"",
    "mtime": "2025-08-13T06:36:31.368Z",
    "size": 534,
    "path": "../public/icons/folder-vuepress.svg"
  },
  "/icons/folder-vuex-store-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"20f-WPbE4kouFhjNJAfhklI29qERpgY\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 527,
    "path": "../public/icons/folder-vuex-store-open.svg"
  },
  "/icons/folder-vuex-store.svg": {
    "type": "image/svg+xml",
    "etag": "\"1da-t15hPsb+pTWvaiBIy0qqQc9aa5Q\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 474,
    "path": "../public/icons/folder-vuex-store.svg"
  },
  "/icons/folder-wakatime-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"334-VFlXNzU8CGFJTwomM6oOUf8OOhw\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 820,
    "path": "../public/icons/folder-wakatime-open.svg"
  },
  "/icons/folder-wakatime.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ff-Ja11BoHEUPSKixEitZLcMV8gAKg\"",
    "mtime": "2025-08-13T06:36:31.367Z",
    "size": 767,
    "path": "../public/icons/folder-wakatime.svg"
  },
  "/icons/folder-webpack-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"250-sEjTswaFXRD0GkShdNVTm06K0Jc\"",
    "mtime": "2025-08-13T06:36:31.368Z",
    "size": 592,
    "path": "../public/icons/folder-webpack-open.svg"
  },
  "/icons/folder-webpack.svg": {
    "type": "image/svg+xml",
    "etag": "\"21b-LBXoIjdJMwCj19bdxnZEIBUM2O8\"",
    "mtime": "2025-08-13T06:36:31.368Z",
    "size": 539,
    "path": "../public/icons/folder-webpack.svg"
  },
  "/icons/folder-windows-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"16d-pEffUOtySJ12BNmJ9PythCRZ+o4\"",
    "mtime": "2025-08-13T06:36:31.368Z",
    "size": 365,
    "path": "../public/icons/folder-windows-open.svg"
  },
  "/icons/folder-windows.svg": {
    "type": "image/svg+xml",
    "etag": "\"140-bWDO5kW6aHWBREQx4nAcL2hmdYU\"",
    "mtime": "2025-08-13T06:36:31.368Z",
    "size": 320,
    "path": "../public/icons/folder-windows.svg"
  },
  "/icons/folder-wordpress-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"39b-Rnu/H3FZVk1edmzRJEqSrU1G9xQ\"",
    "mtime": "2025-08-13T06:36:31.368Z",
    "size": 923,
    "path": "../public/icons/folder-wordpress-open.svg"
  },
  "/icons/folder-wordpress.svg": {
    "type": "image/svg+xml",
    "etag": "\"366-gANCEPI65wsyYzg6ShvmPTIyejk\"",
    "mtime": "2025-08-13T06:36:31.368Z",
    "size": 870,
    "path": "../public/icons/folder-wordpress.svg"
  },
  "/icons/folder-yarn-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"47c-QfoC2xCgPQ2Yi9RqO45CuS+K1HY\"",
    "mtime": "2025-08-13T06:36:31.368Z",
    "size": 1148,
    "path": "../public/icons/folder-yarn-open.svg"
  },
  "/icons/folder-yarn.svg": {
    "type": "image/svg+xml",
    "etag": "\"447-LskfIsixlYbZjosoN/KCByNftDI\"",
    "mtime": "2025-08-13T06:36:31.368Z",
    "size": 1095,
    "path": "../public/icons/folder-yarn.svg"
  },
  "/icons/folder-zeabur-open.svg": {
    "type": "image/svg+xml",
    "etag": "\"21a-mJoq4VC0kGqOMd7uHHJoMVZq0Xc\"",
    "mtime": "2025-08-13T06:36:31.368Z",
    "size": 538,
    "path": "../public/icons/folder-zeabur-open.svg"
  },
  "/icons/folder-zeabur.svg": {
    "type": "image/svg+xml",
    "etag": "\"1df-JduE/pZgEWD0xYEH09ieUiXfvgY\"",
    "mtime": "2025-08-13T06:36:31.369Z",
    "size": 479,
    "path": "../public/icons/folder-zeabur.svg"
  },
  "/icons/font.svg": {
    "type": "image/svg+xml",
    "etag": "\"a5-RRcFLpwYifzXfwD8r/xBKV6jzTw\"",
    "mtime": "2025-08-13T06:36:31.369Z",
    "size": 165,
    "path": "../public/icons/font.svg"
  },
  "/icons/forth.svg": {
    "type": "image/svg+xml",
    "etag": "\"2dc-2gI7p1oX54s3POHCoxCER9dOyaM\"",
    "mtime": "2025-08-13T06:36:31.369Z",
    "size": 732,
    "path": "../public/icons/forth.svg"
  },
  "/icons/fortran.svg": {
    "type": "image/svg+xml",
    "etag": "\"e6-IxOUEp9wjj7OINqJ/Cl8L1Tblv0\"",
    "mtime": "2025-08-13T06:36:31.369Z",
    "size": 230,
    "path": "../public/icons/fortran.svg"
  },
  "/icons/foxpro.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f6b-hkha/xdZH4+niHrx1xq52UBXFFc\"",
    "mtime": "2025-08-13T06:36:31.369Z",
    "size": 8043,
    "path": "../public/icons/foxpro.svg"
  },
  "/icons/freemarker.svg": {
    "type": "image/svg+xml",
    "etag": "\"fe-OnnmCXzDmSvrWtHz+Qm+71usR3A\"",
    "mtime": "2025-08-13T06:36:31.369Z",
    "size": 254,
    "path": "../public/icons/freemarker.svg"
  },
  "/icons/fsharp.svg": {
    "type": "image/svg+xml",
    "etag": "\"158-Gp8+3My56gJnZ59PAXQ/wQrsXTM\"",
    "mtime": "2025-08-13T06:36:31.369Z",
    "size": 344,
    "path": "../public/icons/fsharp.svg"
  },
  "/icons/fusebox.svg": {
    "type": "image/svg+xml",
    "etag": "\"5fb-w4kZLJ9S59t/22lA37jmm1HdMKo\"",
    "mtime": "2025-08-13T06:36:31.369Z",
    "size": 1531,
    "path": "../public/icons/fusebox.svg"
  },
  "/icons/gamemaker.svg": {
    "type": "image/svg+xml",
    "etag": "\"e5-klQiH3lsjZhe9SpaGqlk42jOgdQ\"",
    "mtime": "2025-08-13T06:36:31.369Z",
    "size": 229,
    "path": "../public/icons/gamemaker.svg"
  },
  "/icons/garden.svg": {
    "type": "image/svg+xml",
    "etag": "\"28b-L5H8rMOSeM5k1vRtzz3BaAJY6vU\"",
    "mtime": "2025-08-13T06:36:31.370Z",
    "size": 651,
    "path": "../public/icons/garden.svg"
  },
  "/icons/gatsby.svg": {
    "type": "image/svg+xml",
    "etag": "\"38f-q48tvolDDr7Y8AwQ28hyYStkJEE\"",
    "mtime": "2025-08-13T06:36:31.370Z",
    "size": 911,
    "path": "../public/icons/gatsby.svg"
  },
  "/icons/gcp.svg": {
    "type": "image/svg+xml",
    "etag": "\"33f-b9/BS36KAxT6XmE/D4UEYnmpbpY\"",
    "mtime": "2025-08-13T06:36:31.369Z",
    "size": 831,
    "path": "../public/icons/gcp.svg"
  },
  "/icons/gemfile.svg": {
    "type": "image/svg+xml",
    "etag": "\"104-gDskpzkrwqd9JxDVB7iab4q+Id0\"",
    "mtime": "2025-08-13T06:36:31.370Z",
    "size": 260,
    "path": "../public/icons/gemfile.svg"
  },
  "/icons/gemini-ai.svg": {
    "type": "image/svg+xml",
    "etag": "\"e2-GliS8H8+cpUlrRDKkUI/ce07evA\"",
    "mtime": "2025-08-13T06:36:31.370Z",
    "size": 226,
    "path": "../public/icons/gemini-ai.svg"
  },
  "/icons/gemini.svg": {
    "type": "image/svg+xml",
    "etag": "\"397-Ip1zvgvK0/zU/c5wUdPBfNbHcio\"",
    "mtime": "2025-08-13T06:36:31.370Z",
    "size": 919,
    "path": "../public/icons/gemini.svg"
  },
  "/icons/git.svg": {
    "type": "image/svg+xml",
    "etag": "\"2d9-JW47+qBagvmc94zOhmLMZo0jiHo\"",
    "mtime": "2025-08-13T06:36:31.370Z",
    "size": 729,
    "path": "../public/icons/git.svg"
  },
  "/icons/github-actions-workflow.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b3-cirn94naHNFkUGLVXHfSnfqlKx8\"",
    "mtime": "2025-08-13T06:36:31.370Z",
    "size": 435,
    "path": "../public/icons/github-actions-workflow.svg"
  },
  "/icons/github-sponsors.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ae-KiI0whvVAvlu3hi/aMlxKc5zODI\"",
    "mtime": "2025-08-13T06:36:31.370Z",
    "size": 430,
    "path": "../public/icons/github-sponsors.svg"
  },
  "/icons/gitlab.svg": {
    "type": "image/svg+xml",
    "etag": "\"38a-5cM2sbkh+fbW0r1YZJ0BsPH/FVM\"",
    "mtime": "2025-08-13T06:36:31.371Z",
    "size": 906,
    "path": "../public/icons/gitlab.svg"
  },
  "/icons/gitpod.svg": {
    "type": "image/svg+xml",
    "etag": "\"21a-X+JUDRzb7IMQxaN2r8gTEl+nivg\"",
    "mtime": "2025-08-13T06:36:31.371Z",
    "size": 538,
    "path": "../public/icons/gitpod.svg"
  },
  "/icons/gleam.svg": {
    "type": "image/svg+xml",
    "etag": "\"a4d-W/B0OYht+3kxyI+rK64jlJajOYs\"",
    "mtime": "2025-08-13T06:36:31.370Z",
    "size": 2637,
    "path": "../public/icons/gleam.svg"
  },
  "/icons/gnuplot.svg": {
    "type": "image/svg+xml",
    "etag": "\"d1-jHpJ/oYE4yQrv1ZoItSoLkomRnw\"",
    "mtime": "2025-08-13T06:36:31.371Z",
    "size": 209,
    "path": "../public/icons/gnuplot.svg"
  },
  "/icons/go-mod.svg": {
    "type": "image/svg+xml",
    "etag": "\"2e9-No7rB5/rFM9o0jED0Jj8ciO4BgA\"",
    "mtime": "2025-08-13T06:36:31.371Z",
    "size": 745,
    "path": "../public/icons/go-mod.svg"
  },
  "/icons/go.svg": {
    "type": "image/svg+xml",
    "etag": "\"2e9-VeiWRIqphFOzgg16eqiae6a6QN4\"",
    "mtime": "2025-08-13T06:36:31.371Z",
    "size": 745,
    "path": "../public/icons/go.svg"
  },
  "/icons/go_gopher.svg": {
    "type": "image/svg+xml",
    "etag": "\"877-CUQ8lqc2ptWjYUCdhXltP7zsqJw\"",
    "mtime": "2025-08-13T06:36:31.371Z",
    "size": 2167,
    "path": "../public/icons/go_gopher.svg"
  },
  "/icons/godot-assets.svg": {
    "type": "image/svg+xml",
    "etag": "\"280-vCkkMMDropzJNCNNQ6qW4F9a+So\"",
    "mtime": "2025-08-13T06:36:31.372Z",
    "size": 640,
    "path": "../public/icons/godot-assets.svg"
  },
  "/icons/godot.svg": {
    "type": "image/svg+xml",
    "etag": "\"280-KaLilizavYdHe0SI/qkQ1j9YgMU\"",
    "mtime": "2025-08-13T06:36:31.371Z",
    "size": 640,
    "path": "../public/icons/godot.svg"
  },
  "/icons/gradle.svg": {
    "type": "image/svg+xml",
    "etag": "\"1aa-Z2VjlV7r4RjtManW/lgA67Azlgw\"",
    "mtime": "2025-08-13T06:36:31.371Z",
    "size": 426,
    "path": "../public/icons/gradle.svg"
  },
  "/icons/grafana-alloy.svg": {
    "type": "image/svg+xml",
    "etag": "\"53d-yU6cjoQSDOXymbE5U8BowZIzEwk\"",
    "mtime": "2025-08-13T06:36:31.372Z",
    "size": 1341,
    "path": "../public/icons/grafana-alloy.svg"
  },
  "/icons/grain.svg": {
    "type": "image/svg+xml",
    "etag": "\"101-Eghk4njd4IY3JmQyQSDPoizl3DQ\"",
    "mtime": "2025-08-13T06:36:31.372Z",
    "size": 257,
    "path": "../public/icons/grain.svg"
  },
  "/icons/graphcool.svg": {
    "type": "image/svg+xml",
    "etag": "\"3e0-A99QiPjuychqTL1N2TuHaEpPRK8\"",
    "mtime": "2025-08-13T06:36:31.371Z",
    "size": 992,
    "path": "../public/icons/graphcool.svg"
  },
  "/icons/graphql.svg": {
    "type": "image/svg+xml",
    "etag": "\"3e9-AsJwkmp/AoLNcqE7tAAN6370np8\"",
    "mtime": "2025-08-13T06:36:31.372Z",
    "size": 1001,
    "path": "../public/icons/graphql.svg"
  },
  "/icons/gridsome.svg": {
    "type": "image/svg+xml",
    "etag": "\"f8-GoavAOCh6fmGOIJgkUYy4p7vra4\"",
    "mtime": "2025-08-13T06:36:31.372Z",
    "size": 248,
    "path": "../public/icons/gridsome.svg"
  },
  "/icons/groovy.svg": {
    "type": "image/svg+xml",
    "etag": "\"49c-eFzRfJX7z4zHKjyUObE3LmU9pvI\"",
    "mtime": "2025-08-13T06:36:31.372Z",
    "size": 1180,
    "path": "../public/icons/groovy.svg"
  },
  "/icons/grunt.svg": {
    "type": "image/svg+xml",
    "etag": "\"4c4e-yl3Z/on9la4HU5k7PhOgIRZJk5A\"",
    "mtime": "2025-08-13T06:36:31.373Z",
    "size": 19534,
    "path": "../public/icons/grunt.svg"
  },
  "/icons/gulp.svg": {
    "type": "image/svg+xml",
    "etag": "\"b6-h5xvXmMJnGVWGvgoN0gva0txiuI\"",
    "mtime": "2025-08-13T06:36:31.372Z",
    "size": 182,
    "path": "../public/icons/gulp.svg"
  },
  "/icons/h.svg": {
    "type": "image/svg+xml",
    "etag": "\"b9-6l5AN9R0BM9oiuAXp0zpLr2u8EI\"",
    "mtime": "2025-08-13T06:36:31.372Z",
    "size": 185,
    "path": "../public/icons/h.svg"
  },
  "/icons/hack.svg": {
    "type": "image/svg+xml",
    "etag": "\"f9-ycqhutd0JzZyZ9n8Otdu2xDb/SY\"",
    "mtime": "2025-08-13T06:36:31.372Z",
    "size": 249,
    "path": "../public/icons/hack.svg"
  },
  "/icons/hadolint.svg": {
    "type": "image/svg+xml",
    "etag": "\"7ad-prBNyb5pq7+gnBA1BPMQTh0hxCQ\"",
    "mtime": "2025-08-13T06:36:31.373Z",
    "size": 1965,
    "path": "../public/icons/hadolint.svg"
  },
  "/icons/haml.svg": {
    "type": "image/svg+xml",
    "etag": "\"7c1-BJ32kpxAcwRFWwUM0Se8ilh+GW0\"",
    "mtime": "2025-08-13T06:36:31.373Z",
    "size": 1985,
    "path": "../public/icons/haml.svg"
  },
  "/icons/handlebars.svg": {
    "type": "image/svg+xml",
    "etag": "\"1e6-GVTgwoGEGD2qE03vkO1Z8p7SQCk\"",
    "mtime": "2025-08-13T06:36:31.373Z",
    "size": 486,
    "path": "../public/icons/handlebars.svg"
  },
  "/icons/hardhat.svg": {
    "type": "image/svg+xml",
    "etag": "\"191-K2j1ynrk9d8J/AMUCIgc0IeQBHg\"",
    "mtime": "2025-08-13T06:36:31.373Z",
    "size": 401,
    "path": "../public/icons/hardhat.svg"
  },
  "/icons/harmonix.svg": {
    "type": "image/svg+xml",
    "etag": "\"9d-RGaOFniPJcyfq4l5ZxU4C6XFE7U\"",
    "mtime": "2025-08-13T06:36:31.373Z",
    "size": 157,
    "path": "../public/icons/harmonix.svg"
  },
  "/icons/haskell.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b4-tpKnvulqfWWKBcva7SApOtiypnU\"",
    "mtime": "2025-08-13T06:36:31.374Z",
    "size": 436,
    "path": "../public/icons/haskell.svg"
  },
  "/icons/haxe.svg": {
    "type": "image/svg+xml",
    "etag": "\"5af-vBo0LBe/W35DV25IYkb1U7A6zyo\"",
    "mtime": "2025-08-13T06:36:31.374Z",
    "size": 1455,
    "path": "../public/icons/haxe.svg"
  },
  "/icons/hcl.svg": {
    "type": "image/svg+xml",
    "etag": "\"fc-hqxYUQ7ckG91gSNmmMZhc0HqMFE\"",
    "mtime": "2025-08-13T06:36:31.373Z",
    "size": 252,
    "path": "../public/icons/hcl.svg"
  },
  "/icons/hcl_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"fc-oqJ4ja6CrdM0nzKZf6vtFGtz08g\"",
    "mtime": "2025-08-13T06:36:31.373Z",
    "size": 252,
    "path": "../public/icons/hcl_light.svg"
  },
  "/icons/helm.svg": {
    "type": "image/svg+xml",
    "etag": "\"102f-1f+P0nmPIpa96qEeDVb/J1lOgMo\"",
    "mtime": "2025-08-13T06:36:31.374Z",
    "size": 4143,
    "path": "../public/icons/helm.svg"
  },
  "/icons/heroku.svg": {
    "type": "image/svg+xml",
    "etag": "\"139-ZnjlQhlSy/IoYMGhE6L+Ryz6/ZE\"",
    "mtime": "2025-08-13T06:36:31.374Z",
    "size": 313,
    "path": "../public/icons/heroku.svg"
  },
  "/icons/hex.svg": {
    "type": "image/svg+xml",
    "etag": "\"10f-ZPTb9TmtLLKfUwR0lI3STx817XQ\"",
    "mtime": "2025-08-13T06:36:31.374Z",
    "size": 271,
    "path": "../public/icons/hex.svg"
  },
  "/icons/histoire.svg": {
    "type": "image/svg+xml",
    "etag": "\"11b-bXOdjPqX/616jXX0iXontx45K5Y\"",
    "mtime": "2025-08-13T06:36:31.374Z",
    "size": 283,
    "path": "../public/icons/histoire.svg"
  },
  "/icons/hjson.svg": {
    "type": "image/svg+xml",
    "etag": "\"3f7-s2AFlv3cxetqBO0fKp8DEKC46Nc\"",
    "mtime": "2025-08-13T06:36:31.375Z",
    "size": 1015,
    "path": "../public/icons/hjson.svg"
  },
  "/icons/horusec.svg": {
    "type": "image/svg+xml",
    "etag": "\"b73-lc+jIG4H7lLZk/NWk91ZEfLMo2w\"",
    "mtime": "2025-08-13T06:36:31.374Z",
    "size": 2931,
    "path": "../public/icons/horusec.svg"
  },
  "/icons/hosts.svg": {
    "type": "image/svg+xml",
    "etag": "\"87-WzRewwYdHI0Kq9Iam/e2zRVmSYU\"",
    "mtime": "2025-08-13T06:36:31.374Z",
    "size": 135,
    "path": "../public/icons/hosts.svg"
  },
  "/icons/hosts_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"87-F3hQpjrEgL7LjagVInI6tn+luM0\"",
    "mtime": "2025-08-13T06:36:31.375Z",
    "size": 135,
    "path": "../public/icons/hosts_light.svg"
  },
  "/icons/hpp.svg": {
    "type": "image/svg+xml",
    "etag": "\"e8-vzMOAseI0ZBU68jobtLBrbkrPVw\"",
    "mtime": "2025-08-13T06:36:31.375Z",
    "size": 232,
    "path": "../public/icons/hpp.svg"
  },
  "/icons/html.svg": {
    "type": "image/svg+xml",
    "etag": "\"e8-EKxmhKyMF0DQfhFGinl2t7NVg6U\"",
    "mtime": "2025-08-13T06:36:31.375Z",
    "size": 232,
    "path": "../public/icons/html.svg"
  },
  "/icons/http.svg": {
    "type": "image/svg+xml",
    "etag": "\"397-G0w9dW2NxvrTlS8L4RRubkpnhyI\"",
    "mtime": "2025-08-13T06:36:31.375Z",
    "size": 919,
    "path": "../public/icons/http.svg"
  },
  "/icons/huff.svg": {
    "type": "image/svg+xml",
    "etag": "\"220-Ve287gKj3D+y12fPm6fOL8Qwj1A\"",
    "mtime": "2025-08-13T06:36:31.376Z",
    "size": 544,
    "path": "../public/icons/huff.svg"
  },
  "/icons/huff_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"220-iTWhuFnt+cnq8qHopSBthMuh84Q\"",
    "mtime": "2025-08-13T06:36:31.375Z",
    "size": 544,
    "path": "../public/icons/huff_light.svg"
  },
  "/icons/hurl.svg": {
    "type": "image/svg+xml",
    "etag": "\"89-XBCqmoAy1LbVRRdLPd1fScihLCw\"",
    "mtime": "2025-08-13T06:36:31.375Z",
    "size": 137,
    "path": "../public/icons/hurl.svg"
  },
  "/icons/husky.svg": {
    "type": "image/svg+xml",
    "etag": "\"393-t4h61ZrQ+7Zvs0db4w0pp8nAHMM\"",
    "mtime": "2025-08-13T06:36:31.375Z",
    "size": 915,
    "path": "../public/icons/husky.svg"
  },
  "/icons/i18n.svg": {
    "type": "image/svg+xml",
    "etag": "\"19b-TekM3yIyfqNKYdcRfXZeu/h7Hh4\"",
    "mtime": "2025-08-13T06:36:31.375Z",
    "size": 411,
    "path": "../public/icons/i18n.svg"
  },
  "/icons/idris.svg": {
    "type": "image/svg+xml",
    "etag": "\"194c-nFtTQY612uRpgmgutISAaPDZ+Ww\"",
    "mtime": "2025-08-13T06:36:31.376Z",
    "size": 6476,
    "path": "../public/icons/idris.svg"
  },
  "/icons/ifanr-cloud.svg": {
    "type": "image/svg+xml",
    "etag": "\"302-30ueHLHTuo3csJmKwwWgThFwI08\"",
    "mtime": "2025-08-13T06:36:31.376Z",
    "size": 770,
    "path": "../public/icons/ifanr-cloud.svg"
  },
  "/icons/image.svg": {
    "type": "image/svg+xml",
    "etag": "\"15a-E39bw+WnjLePA8zvGUFX8XvfJik\"",
    "mtime": "2025-08-13T06:36:31.376Z",
    "size": 346,
    "path": "../public/icons/image.svg"
  },
  "/icons/imba.svg": {
    "type": "image/svg+xml",
    "etag": "\"3c7-aK+RNbkG7nHQhuU501F5G1hx25s\"",
    "mtime": "2025-08-13T06:36:31.375Z",
    "size": 967,
    "path": "../public/icons/imba.svg"
  },
  "/icons/installation.svg": {
    "type": "image/svg+xml",
    "etag": "\"85-24MAKOpyX4XY3vidMiiO75Tt/hQ\"",
    "mtime": "2025-08-13T06:36:31.376Z",
    "size": 133,
    "path": "../public/icons/installation.svg"
  },
  "/icons/ionic.svg": {
    "type": "image/svg+xml",
    "etag": "\"41e-PFqz2x6PiYPXYLj1xeRSRv0z4G4\"",
    "mtime": "2025-08-13T06:36:31.376Z",
    "size": 1054,
    "path": "../public/icons/ionic.svg"
  },
  "/icons/istanbul.svg": {
    "type": "image/svg+xml",
    "etag": "\"221-5h6ku62Nv6sjzpjxBWAzg5NOQw0\"",
    "mtime": "2025-08-13T06:36:31.376Z",
    "size": 545,
    "path": "../public/icons/istanbul.svg"
  },
  "/icons/jar.svg": {
    "type": "image/svg+xml",
    "etag": "\"119-Kyxdz4u88TPBKOlteYM/7jxq3H0\"",
    "mtime": "2025-08-13T06:36:31.376Z",
    "size": 281,
    "path": "../public/icons/jar.svg"
  },
  "/icons/java.svg": {
    "type": "image/svg+xml",
    "etag": "\"d0-0iXmrVRyP6kmITQnp3auWGEnZuE\"",
    "mtime": "2025-08-13T06:36:31.378Z",
    "size": 208,
    "path": "../public/icons/java.svg"
  },
  "/icons/javaclass.svg": {
    "type": "image/svg+xml",
    "etag": "\"d0-bK0ryCXN0hEhGViQAArKop8PWfs\"",
    "mtime": "2025-08-13T06:36:31.376Z",
    "size": 208,
    "path": "../public/icons/javaclass.svg"
  },
  "/icons/javascript-map.svg": {
    "type": "image/svg+xml",
    "etag": "\"155-dLd2l3iNYabGrY5MK8xEAtjzOU0\"",
    "mtime": "2025-08-13T06:36:31.377Z",
    "size": 341,
    "path": "../public/icons/javascript-map.svg"
  },
  "/icons/javascript.svg": {
    "type": "image/svg+xml",
    "etag": "\"123-G6Merg9VgWFMsONBTcH6pDOxxLg\"",
    "mtime": "2025-08-13T06:36:31.376Z",
    "size": 291,
    "path": "../public/icons/javascript.svg"
  },
  "/icons/jenkins.svg": {
    "type": "image/svg+xml",
    "etag": "\"3d18-oO9knM9SHo3KZIqzQ4EwxrqQY+Q\"",
    "mtime": "2025-08-13T06:36:31.378Z",
    "size": 15640,
    "path": "../public/icons/jenkins.svg"
  },
  "/icons/jest.svg": {
    "type": "image/svg+xml",
    "etag": "\"207-v9Dkpedv3KjI+qhYs01fZjUOfu8\"",
    "mtime": "2025-08-13T06:36:31.377Z",
    "size": 519,
    "path": "../public/icons/jest.svg"
  },
  "/icons/jinja.svg": {
    "type": "image/svg+xml",
    "etag": "\"144-W/w+Omggo9AQ5BJShwA0ehcQ1S4\"",
    "mtime": "2025-08-13T06:36:31.377Z",
    "size": 324,
    "path": "../public/icons/jinja.svg"
  },
  "/icons/jinja_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"144-n1SVll/yCgaUdsA2gziKUPNtRd0\"",
    "mtime": "2025-08-13T06:36:31.377Z",
    "size": 324,
    "path": "../public/icons/jinja_light.svg"
  },
  "/icons/jsconfig.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c6-JYCmF7Uk3zyhKAcH82wq+Gl9nN8\"",
    "mtime": "2025-08-13T06:36:31.378Z",
    "size": 454,
    "path": "../public/icons/jsconfig.svg"
  },
  "/icons/json.svg": {
    "type": "image/svg+xml",
    "etag": "\"21c-j65qOL+9qLZWU+29ZiPMyPBSAxE\"",
    "mtime": "2025-08-13T06:36:31.377Z",
    "size": 540,
    "path": "../public/icons/json.svg"
  },
  "/icons/jsr.svg": {
    "type": "image/svg+xml",
    "etag": "\"a7-H/eZVFDP0RcCvFY0CgQAmMKNPBo\"",
    "mtime": "2025-08-13T06:36:31.377Z",
    "size": 167,
    "path": "../public/icons/jsr.svg"
  },
  "/icons/jsr_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"de-64CSubBRq3rBFPTi5QuBtVDH8zc\"",
    "mtime": "2025-08-13T06:36:31.379Z",
    "size": 222,
    "path": "../public/icons/jsr_light.svg"
  },
  "/icons/julia.svg": {
    "type": "image/svg+xml",
    "etag": "\"11a-wtvtTDH5e4rzAt2e9uvnr3XQJBM\"",
    "mtime": "2025-08-13T06:36:31.378Z",
    "size": 282,
    "path": "../public/icons/julia.svg"
  },
  "/icons/jupyter.svg": {
    "type": "image/svg+xml",
    "etag": "\"17f-x+HWfZQVL3UQmfrjC3iQdohjBvg\"",
    "mtime": "2025-08-13T06:36:31.378Z",
    "size": 383,
    "path": "../public/icons/jupyter.svg"
  },
  "/icons/just.svg": {
    "type": "image/svg+xml",
    "etag": "\"11d-1alNKO0ZYl241u+o3yq5GGKckDI\"",
    "mtime": "2025-08-13T06:36:31.378Z",
    "size": 285,
    "path": "../public/icons/just.svg"
  },
  "/icons/karma.svg": {
    "type": "image/svg+xml",
    "etag": "\"139-UOjWpFysNaKBZ59wimoUjncHE3E\"",
    "mtime": "2025-08-13T06:36:31.378Z",
    "size": 313,
    "path": "../public/icons/karma.svg"
  },
  "/icons/kcl.svg": {
    "type": "image/svg+xml",
    "etag": "\"134-PvREFB6lUoChU+eezGzDoOqGFIk\"",
    "mtime": "2025-08-13T06:36:31.378Z",
    "size": 308,
    "path": "../public/icons/kcl.svg"
  },
  "/icons/key.svg": {
    "type": "image/svg+xml",
    "etag": "\"af-W/1BE6RsPvpLbKBnDWoWL49ZSdg\"",
    "mtime": "2025-08-13T06:36:31.378Z",
    "size": 175,
    "path": "../public/icons/key.svg"
  },
  "/icons/keystatic.svg": {
    "type": "image/svg+xml",
    "etag": "\"215-L5CfJERkR9/Xpflh0dc2Ee/3Two\"",
    "mtime": "2025-08-13T06:36:31.378Z",
    "size": 533,
    "path": "../public/icons/keystatic.svg"
  },
  "/icons/kivy.svg": {
    "type": "image/svg+xml",
    "etag": "\"196-ASkXy4zFSaprpP0nXMpmM1a1TBQ\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 406,
    "path": "../public/icons/kivy.svg"
  },
  "/icons/kl.svg": {
    "type": "image/svg+xml",
    "etag": "\"564-UJy3y/t8647Se8Rl68QAe3kY/Aw\"",
    "mtime": "2025-08-13T06:36:31.379Z",
    "size": 1380,
    "path": "../public/icons/kl.svg"
  },
  "/icons/knip.svg": {
    "type": "image/svg+xml",
    "etag": "\"21d-s3O9KiFSEJhu3REAWnxOJsmVrDk\"",
    "mtime": "2025-08-13T06:36:31.379Z",
    "size": 541,
    "path": "../public/icons/knip.svg"
  },
  "/icons/kotlin.svg": {
    "type": "image/svg+xml",
    "etag": "\"205-vZZYj5B49au+yItoy6NVU8SK6K8\"",
    "mtime": "2025-08-13T06:36:31.379Z",
    "size": 517,
    "path": "../public/icons/kotlin.svg"
  },
  "/icons/kubernetes.svg": {
    "type": "image/svg+xml",
    "etag": "\"c19-gi2Fdm9h7606jdCA4WW8OxoWoYc\"",
    "mtime": "2025-08-13T06:36:31.379Z",
    "size": 3097,
    "path": "../public/icons/kubernetes.svg"
  },
  "/icons/kusto.svg": {
    "type": "image/svg+xml",
    "etag": "\"fd-eiiEyu64KLwX7h8hTUNM2BXQ/iM\"",
    "mtime": "2025-08-13T06:36:31.379Z",
    "size": 253,
    "path": "../public/icons/kusto.svg"
  },
  "/icons/label.svg": {
    "type": "image/svg+xml",
    "etag": "\"16a-ulU1fCniBzye0nNzRVWbYHFUMSg\"",
    "mtime": "2025-08-13T06:36:31.379Z",
    "size": 362,
    "path": "../public/icons/label.svg"
  },
  "/icons/laravel.svg": {
    "type": "image/svg+xml",
    "etag": "\"4c9-PHZRAcTClbGKM8lkvNMsHKnGldQ\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 1225,
    "path": "../public/icons/laravel.svg"
  },
  "/icons/latexmk.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a1-6XzkhYfebLhYwhJIa4XrN9roE/o\"",
    "mtime": "2025-08-13T06:36:31.379Z",
    "size": 417,
    "path": "../public/icons/latexmk.svg"
  },
  "/icons/lbx.svg": {
    "type": "image/svg+xml",
    "etag": "\"4c4-tcArnSAVAn2oHGxR0x1t5+rhNow\"",
    "mtime": "2025-08-13T06:36:31.379Z",
    "size": 1220,
    "path": "../public/icons/lbx.svg"
  },
  "/icons/lefthook.svg": {
    "type": "image/svg+xml",
    "etag": "\"2df-QAO7cTpMqmE6U1ovRogDVOW/FJs\"",
    "mtime": "2025-08-13T06:36:31.379Z",
    "size": 735,
    "path": "../public/icons/lefthook.svg"
  },
  "/icons/lerna.svg": {
    "type": "image/svg+xml",
    "etag": "\"54b-HsHsw49N6b/uHLQSF/q/fDOwErM\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 1355,
    "path": "../public/icons/lerna.svg"
  },
  "/icons/less.svg": {
    "type": "image/svg+xml",
    "etag": "\"145-NiegTH/+aN1qYn1/YcI+5HYxNDQ\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 325,
    "path": "../public/icons/less.svg"
  },
  "/icons/liara.svg": {
    "type": "image/svg+xml",
    "etag": "\"57f-LT22PuNRHr7P9nqNe80X9QIghkQ\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 1407,
    "path": "../public/icons/liara.svg"
  },
  "/icons/lib.svg": {
    "type": "image/svg+xml",
    "etag": "\"11f-U2Q6qz5XVPLqzY3eO8ojpOuXBUs\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 287,
    "path": "../public/icons/lib.svg"
  },
  "/icons/lighthouse.svg": {
    "type": "image/svg+xml",
    "etag": "\"155-Wc0pSypcNZfMFtfkp5VZh7645LQ\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 341,
    "path": "../public/icons/lighthouse.svg"
  },
  "/icons/lilypond.svg": {
    "type": "image/svg+xml",
    "etag": "\"b8-yKMVzQOIROroS/5CEhoI5Hp/dPc\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 184,
    "path": "../public/icons/lilypond.svg"
  },
  "/icons/liquid.svg": {
    "type": "image/svg+xml",
    "etag": "\"d6-GpEKIopxaZ+IsdIk4aaT3l4mUxU\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 214,
    "path": "../public/icons/liquid.svg"
  },
  "/icons/lisp.svg": {
    "type": "image/svg+xml",
    "etag": "\"132-8u936Odgq8ZbKOV7qBrSiV7N3tw\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 306,
    "path": "../public/icons/lisp.svg"
  },
  "/icons/livescript.svg": {
    "type": "image/svg+xml",
    "etag": "\"140-PI84m/3NpguMP9BT4uvK5oOjB88\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 320,
    "path": "../public/icons/livescript.svg"
  },
  "/icons/lock.svg": {
    "type": "image/svg+xml",
    "etag": "\"f6-KpHFJ9c8lTDbK7dZdCHz7XnEbIk\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 246,
    "path": "../public/icons/lock.svg"
  },
  "/icons/log.svg": {
    "type": "image/svg+xml",
    "etag": "\"ec-WLjwvH1p8hsyITqIkL8Oq2t7sQE\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 236,
    "path": "../public/icons/log.svg"
  },
  "/icons/lolcode.svg": {
    "type": "image/svg+xml",
    "etag": "\"401-qdYGvLe9x5KD+YqHgiJ+JTpQcEw\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 1025,
    "path": "../public/icons/lolcode.svg"
  },
  "/icons/lottie.svg": {
    "type": "image/svg+xml",
    "etag": "\"16e-HqHKIwQog365GynTQO6s7gJDt2g\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 366,
    "path": "../public/icons/lottie.svg"
  },
  "/icons/lua.svg": {
    "type": "image/svg+xml",
    "etag": "\"240-p3rCg2YkPzMJCEGEUv9EhUYxebY\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 576,
    "path": "../public/icons/lua.svg"
  },
  "/icons/luau.svg": {
    "type": "image/svg+xml",
    "etag": "\"dc-3bNOPHf+kiTD04pfUnfJl/ocTOs\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 220,
    "path": "../public/icons/luau.svg"
  },
  "/icons/lyric.svg": {
    "type": "image/svg+xml",
    "etag": "\"138-ODjPVTIemhE3VNvEm1wyIJDMX0k\"",
    "mtime": "2025-08-13T06:36:31.380Z",
    "size": 312,
    "path": "../public/icons/lyric.svg"
  },
  "/icons/makefile.svg": {
    "type": "image/svg+xml",
    "etag": "\"3af-coYVW9qVIer+LMqha8gIZIkAzms\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 943,
    "path": "../public/icons/makefile.svg"
  },
  "/icons/markdoc-config.svg": {
    "type": "image/svg+xml",
    "etag": "\"126-Vb8OpnAgrDuuh0ux/wCBPNy+qFc\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 294,
    "path": "../public/icons/markdoc-config.svg"
  },
  "/icons/markdoc.svg": {
    "type": "image/svg+xml",
    "etag": "\"c9-0vpkBXOoXve3JMFj4GCQ4i9Q/LE\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 201,
    "path": "../public/icons/markdoc.svg"
  },
  "/icons/markdown.svg": {
    "type": "image/svg+xml",
    "etag": "\"a1-6fMa2zrXh11hP8YMRYgoml/c9sc\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 161,
    "path": "../public/icons/markdown.svg"
  },
  "/icons/markdownlint.svg": {
    "type": "image/svg+xml",
    "etag": "\"a3-QsGBUmwbNzqWhFcAdhh1GkCvAbU\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 163,
    "path": "../public/icons/markdownlint.svg"
  },
  "/icons/markojs.svg": {
    "type": "image/svg+xml",
    "etag": "\"563-GT9IepIi4y6zTKC2sN9+jMrlXvg\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 1379,
    "path": "../public/icons/markojs.svg"
  },
  "/icons/mathematica.svg": {
    "type": "image/svg+xml",
    "etag": "\"fc9-AQED1I69KBtXdVt7CFWua1/iTfw\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 4041,
    "path": "../public/icons/mathematica.svg"
  },
  "/icons/matlab.svg": {
    "type": "image/svg+xml",
    "etag": "\"3a9-TNdQzI4ny2jxYLA5iF3wwuJ1bT0\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 937,
    "path": "../public/icons/matlab.svg"
  },
  "/icons/maven.svg": {
    "type": "image/svg+xml",
    "etag": "\"35d-jGtOWSCVatL7EJ/yntXUbvwfQIU\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 861,
    "path": "../public/icons/maven.svg"
  },
  "/icons/mdsvex.svg": {
    "type": "image/svg+xml",
    "etag": "\"a1-ObbJo59R0kyXz5KeUFijhvhqFjk\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 161,
    "path": "../public/icons/mdsvex.svg"
  },
  "/icons/mdx.svg": {
    "type": "image/svg+xml",
    "etag": "\"a1-Qe3j/by4hujlEsKUpyT+ND4Zv3s\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 161,
    "path": "../public/icons/mdx.svg"
  },
  "/icons/mercurial.svg": {
    "type": "image/svg+xml",
    "etag": "\"2f2-ncH9YFZhVWh+txypXbMo7xVYTc0\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 754,
    "path": "../public/icons/mercurial.svg"
  },
  "/icons/merlin.svg": {
    "type": "image/svg+xml",
    "etag": "\"10f-oqxtWrtVuquqsdOuiRmgj+PHRuI\"",
    "mtime": "2025-08-13T06:36:31.381Z",
    "size": 271,
    "path": "../public/icons/merlin.svg"
  },
  "/icons/mermaid.svg": {
    "type": "image/svg+xml",
    "etag": "\"18d-gDlNwh3hpdvFbKuPTVYrOP1DlGU\"",
    "mtime": "2025-08-13T06:36:31.382Z",
    "size": 397,
    "path": "../public/icons/mermaid.svg"
  },
  "/icons/meson.svg": {
    "type": "image/svg+xml",
    "etag": "\"1e4-3z/IjFYzsAfvLJyRXfM1Kz5qVaI\"",
    "mtime": "2025-08-13T06:36:31.382Z",
    "size": 484,
    "path": "../public/icons/meson.svg"
  },
  "/icons/minecraft-fabric.svg": {
    "type": "image/svg+xml",
    "etag": "\"353-iPCBJ8d/v+5Wf/8jo7JTVye+atY\"",
    "mtime": "2025-08-13T06:36:31.382Z",
    "size": 851,
    "path": "../public/icons/minecraft-fabric.svg"
  },
  "/icons/minecraft.svg": {
    "type": "image/svg+xml",
    "etag": "\"9e-7Agzac6SO1wV2fFnuQEaMT7lpjk\"",
    "mtime": "2025-08-13T06:36:31.382Z",
    "size": 158,
    "path": "../public/icons/minecraft.svg"
  },
  "/icons/mint.svg": {
    "type": "image/svg+xml",
    "etag": "\"3e0-u0SYtGf+MV9dgBVo7WGbjbaoook\"",
    "mtime": "2025-08-13T06:36:31.382Z",
    "size": 992,
    "path": "../public/icons/mint.svg"
  },
  "/icons/mjml.svg": {
    "type": "image/svg+xml",
    "etag": "\"2f6-oVsCTDHZBm9IiGVGTZErJlEBymg\"",
    "mtime": "2025-08-13T06:36:31.382Z",
    "size": 758,
    "path": "../public/icons/mjml.svg"
  },
  "/icons/mocha.svg": {
    "type": "image/svg+xml",
    "etag": "\"22f-0Rbd3S0+iIWrya02pS9H4Oet5b8\"",
    "mtime": "2025-08-13T06:36:31.382Z",
    "size": 559,
    "path": "../public/icons/mocha.svg"
  },
  "/icons/modernizr.svg": {
    "type": "image/svg+xml",
    "etag": "\"90-dB4Naj3pv7F7A4sI11ixiC6Vuz0\"",
    "mtime": "2025-08-13T06:36:31.382Z",
    "size": 144,
    "path": "../public/icons/modernizr.svg"
  },
  "/icons/mojo.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b2-U332dXOE7FJppIuZaTUILpea8rY\"",
    "mtime": "2025-08-13T06:36:31.382Z",
    "size": 434,
    "path": "../public/icons/mojo.svg"
  },
  "/icons/moon.svg": {
    "type": "image/svg+xml",
    "etag": "\"12b-G2XGQH7svEhVhhe7dnRDQYsRhZI\"",
    "mtime": "2025-08-13T06:36:31.382Z",
    "size": 299,
    "path": "../public/icons/moon.svg"
  },
  "/icons/moonscript.svg": {
    "type": "image/svg+xml",
    "etag": "\"269-88AZTe4nyyCEp3eTBSmwlcGKJ4c\"",
    "mtime": "2025-08-13T06:36:31.383Z",
    "size": 617,
    "path": "../public/icons/moonscript.svg"
  },
  "/icons/mxml.svg": {
    "type": "image/svg+xml",
    "etag": "\"122-1iakWgoxW8TH02brU9hK5xe1js8\"",
    "mtime": "2025-08-13T06:36:31.383Z",
    "size": 290,
    "path": "../public/icons/mxml.svg"
  },
  "/icons/nano-staged.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b4-+Z9WcbNp/D1q1Fa+FNCfZuExwSs\"",
    "mtime": "2025-08-13T06:36:31.383Z",
    "size": 436,
    "path": "../public/icons/nano-staged.svg"
  },
  "/icons/nano-staged_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c5-end8AGjan8uZvChrU9/CfQ/HWXU\"",
    "mtime": "2025-08-13T06:36:31.383Z",
    "size": 453,
    "path": "../public/icons/nano-staged_light.svg"
  },
  "/icons/ndst.svg": {
    "type": "image/svg+xml",
    "etag": "\"3ce-dSPFqHS3AaZGdpwKn+HX6sb0Ako\"",
    "mtime": "2025-08-13T06:36:31.383Z",
    "size": 974,
    "path": "../public/icons/ndst.svg"
  },
  "/icons/nest.svg": {
    "type": "image/svg+xml",
    "etag": "\"1d18-PwmLLOuQMW/tWXmqpS87WPneAz4\"",
    "mtime": "2025-08-13T06:36:31.383Z",
    "size": 7448,
    "path": "../public/icons/nest.svg"
  },
  "/icons/netlify.svg": {
    "type": "image/svg+xml",
    "etag": "\"2d4-w4MuxVeYg8NFV+iMOTlRRIZcMPI\"",
    "mtime": "2025-08-13T06:36:31.383Z",
    "size": 724,
    "path": "../public/icons/netlify.svg"
  },
  "/icons/netlify_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"2d4-8NhKWTYnWuhDENaLUnaP0bn57RE\"",
    "mtime": "2025-08-13T06:36:31.393Z",
    "size": 724,
    "path": "../public/icons/netlify_light.svg"
  },
  "/icons/next.svg": {
    "type": "image/svg+xml",
    "etag": "\"111-OzjODt3GICaXxN1v4UejeZFi0Pc\"",
    "mtime": "2025-08-13T06:36:31.383Z",
    "size": 273,
    "path": "../public/icons/next.svg"
  },
  "/icons/next_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"111-hsCBXts9cINEvRUq7VFdA/ZGcbA\"",
    "mtime": "2025-08-13T06:36:31.383Z",
    "size": 273,
    "path": "../public/icons/next_light.svg"
  },
  "/icons/nginx.svg": {
    "type": "image/svg+xml",
    "etag": "\"116-zMs3tisCVYGgbBdBMmib8GWcyXg\"",
    "mtime": "2025-08-13T06:36:31.384Z",
    "size": 278,
    "path": "../public/icons/nginx.svg"
  },
  "/icons/ngrx-actions.svg": {
    "type": "image/svg+xml",
    "etag": "\"65a-sHdL8Lp2jiZ6xLJRXOr7OgjX2bQ\"",
    "mtime": "2025-08-13T06:36:31.383Z",
    "size": 1626,
    "path": "../public/icons/ngrx-actions.svg"
  },
  "/icons/ngrx-effects.svg": {
    "type": "image/svg+xml",
    "etag": "\"65a-9MhvhQDSCKOWDYIv89R5YmfDXiA\"",
    "mtime": "2025-08-13T06:36:31.384Z",
    "size": 1626,
    "path": "../public/icons/ngrx-effects.svg"
  },
  "/icons/ngrx-entity.svg": {
    "type": "image/svg+xml",
    "etag": "\"65a-CbR9iNyUiRe694VlqCYYtHS/qSM\"",
    "mtime": "2025-08-13T06:36:31.384Z",
    "size": 1626,
    "path": "../public/icons/ngrx-entity.svg"
  },
  "/icons/ngrx-reducer.svg": {
    "type": "image/svg+xml",
    "etag": "\"65a-aVN7MUOn0yy9ahvLjEXAC8qSQRY\"",
    "mtime": "2025-08-13T06:36:31.384Z",
    "size": 1626,
    "path": "../public/icons/ngrx-reducer.svg"
  },
  "/icons/ngrx-selectors.svg": {
    "type": "image/svg+xml",
    "etag": "\"65a-jiCX+SmIxghdVaNtHI28IdYcHMA\"",
    "mtime": "2025-08-13T06:36:31.384Z",
    "size": 1626,
    "path": "../public/icons/ngrx-selectors.svg"
  },
  "/icons/ngrx-state.svg": {
    "type": "image/svg+xml",
    "etag": "\"65a-NXsavlO0Y9XqKQsZpd3hzFhUSjQ\"",
    "mtime": "2025-08-13T06:36:31.384Z",
    "size": 1626,
    "path": "../public/icons/ngrx-state.svg"
  },
  "/icons/nim.svg": {
    "type": "image/svg+xml",
    "etag": "\"a7-bbkIZkvo07crQ0998ecqH7SlcWo\"",
    "mtime": "2025-08-13T06:36:31.385Z",
    "size": 167,
    "path": "../public/icons/nim.svg"
  },
  "/icons/nix.svg": {
    "type": "image/svg+xml",
    "etag": "\"1012-nhHv3F9Ag8J+ptRHLptiK+0oFBU\"",
    "mtime": "2025-08-13T06:36:31.385Z",
    "size": 4114,
    "path": "../public/icons/nix.svg"
  },
  "/icons/nodejs.svg": {
    "type": "image/svg+xml",
    "etag": "\"177-m2uMmEzxV/ptW6sF9U5TdPix/p0\"",
    "mtime": "2025-08-13T06:36:31.385Z",
    "size": 375,
    "path": "../public/icons/nodejs.svg"
  },
  "/icons/nodejs_alt.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ed-HFQyU3g9/HFi7IjeNRj7RsMS39Y\"",
    "mtime": "2025-08-13T06:36:31.385Z",
    "size": 749,
    "path": "../public/icons/nodejs_alt.svg"
  },
  "/icons/nodemon.svg": {
    "type": "image/svg+xml",
    "etag": "\"2c0-YiyzyfbBuy8w9VTcYpRfhKEb9bA\"",
    "mtime": "2025-08-13T06:36:31.385Z",
    "size": 704,
    "path": "../public/icons/nodemon.svg"
  },
  "/icons/npm.svg": {
    "type": "image/svg+xml",
    "etag": "\"84-7GZwr7brHNhX2m6t7mCCjXixF/0\"",
    "mtime": "2025-08-13T06:36:31.385Z",
    "size": 132,
    "path": "../public/icons/npm.svg"
  },
  "/icons/nuget.svg": {
    "type": "image/svg+xml",
    "etag": "\"112-W57JSQkyECLMGqcb1Z1yABfCOCk\"",
    "mtime": "2025-08-13T06:36:31.385Z",
    "size": 274,
    "path": "../public/icons/nuget.svg"
  },
  "/icons/nunjucks.svg": {
    "type": "image/svg+xml",
    "etag": "\"b2-tPRRYqHw6GBtSnRtxzkXGyL21gs\"",
    "mtime": "2025-08-13T06:36:31.387Z",
    "size": 178,
    "path": "../public/icons/nunjucks.svg"
  },
  "/icons/nuxt.svg": {
    "type": "image/svg+xml",
    "etag": "\"174-obrzppNi6T5PvUwPCQ1x9TdTuk8\"",
    "mtime": "2025-08-13T06:36:31.386Z",
    "size": 372,
    "path": "../public/icons/nuxt.svg"
  },
  "/icons/nx.svg": {
    "type": "image/svg+xml",
    "etag": "\"3c9-rRZ5abxH918YczbHOJ5m1Zl5nIk\"",
    "mtime": "2025-08-13T06:36:31.385Z",
    "size": 969,
    "path": "../public/icons/nx.svg"
  },
  "/icons/objective-c.svg": {
    "type": "image/svg+xml",
    "etag": "\"f5-xo1GPvD8Z69BiR9kjzRJ0MwslF0\"",
    "mtime": "2025-08-13T06:36:31.385Z",
    "size": 245,
    "path": "../public/icons/objective-c.svg"
  },
  "/icons/objective-cpp.svg": {
    "type": "image/svg+xml",
    "etag": "\"145-4E2iuC1S7x8yGPtP+qNYm1p+m7U\"",
    "mtime": "2025-08-13T06:36:31.385Z",
    "size": 325,
    "path": "../public/icons/objective-cpp.svg"
  },
  "/icons/ocaml.svg": {
    "type": "image/svg+xml",
    "etag": "\"94f-ypivnxYWVm5P3kABTe7Fey01FNI\"",
    "mtime": "2025-08-13T06:36:31.386Z",
    "size": 2383,
    "path": "../public/icons/ocaml.svg"
  },
  "/icons/odin.svg": {
    "type": "image/svg+xml",
    "etag": "\"310-nLfyHnVHtP5VSjFAHRxyfIKxQCQ\"",
    "mtime": "2025-08-13T06:36:31.386Z",
    "size": 784,
    "path": "../public/icons/odin.svg"
  },
  "/icons/opa.svg": {
    "type": "image/svg+xml",
    "etag": "\"2d4-ll32NvhxKN2PNgnlIC4Oo6EDLhU\"",
    "mtime": "2025-08-13T06:36:31.386Z",
    "size": 724,
    "path": "../public/icons/opa.svg"
  },
  "/icons/opam.svg": {
    "type": "image/svg+xml",
    "etag": "\"8bc-ldH4mdTC0nwgh6egOi5hqTaHvkM\"",
    "mtime": "2025-08-13T06:36:31.386Z",
    "size": 2236,
    "path": "../public/icons/opam.svg"
  },
  "/icons/openapi.svg": {
    "type": "image/svg+xml",
    "etag": "\"946-ORlRKoP7WFI6dFUM/7G/iIBDgl8\"",
    "mtime": "2025-08-13T06:36:31.386Z",
    "size": 2374,
    "path": "../public/icons/openapi.svg"
  },
  "/icons/openapi_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"987-Nbt/EV2MMWi50H0Vug0YSvFVFWI\"",
    "mtime": "2025-08-13T06:36:31.386Z",
    "size": 2439,
    "path": "../public/icons/openapi_light.svg"
  },
  "/icons/otne.svg": {
    "type": "image/svg+xml",
    "etag": "\"206-6Bpxb4H4BZUQ/mCYl36nVctWxsY\"",
    "mtime": "2025-08-13T06:36:31.386Z",
    "size": 518,
    "path": "../public/icons/otne.svg"
  },
  "/icons/oxlint.svg": {
    "type": "image/svg+xml",
    "etag": "\"1bc-GLqQpWldBRbecHnjtJ0izCF7kFs\"",
    "mtime": "2025-08-13T06:36:31.387Z",
    "size": 444,
    "path": "../public/icons/oxlint.svg"
  },
  "/icons/packship.svg": {
    "type": "image/svg+xml",
    "etag": "\"4dd-yv1Kak3094Lg4G+WT+YgOVL6DMM\"",
    "mtime": "2025-08-13T06:36:31.386Z",
    "size": 1245,
    "path": "../public/icons/packship.svg"
  },
  "/icons/palette.svg": {
    "type": "image/svg+xml",
    "etag": "\"31d-cfr054gblUL4QLgkhgxvJNIZecc\"",
    "mtime": "2025-08-13T06:36:31.387Z",
    "size": 797,
    "path": "../public/icons/palette.svg"
  },
  "/icons/panda.svg": {
    "type": "image/svg+xml",
    "etag": "\"247-KTNwMEAmQKkx/hKqgOBEWeUnBAk\"",
    "mtime": "2025-08-13T06:36:31.387Z",
    "size": 583,
    "path": "../public/icons/panda.svg"
  },
  "/icons/parcel.svg": {
    "type": "image/svg+xml",
    "etag": "\"21a-OPdui98zWvfHybu2eOabIHvJq80\"",
    "mtime": "2025-08-13T06:36:31.387Z",
    "size": 538,
    "path": "../public/icons/parcel.svg"
  },
  "/icons/pascal.svg": {
    "type": "image/svg+xml",
    "etag": "\"168-HCijFriFMlPgwY3KGJJEjUkH+oM\"",
    "mtime": "2025-08-13T06:36:31.388Z",
    "size": 360,
    "path": "../public/icons/pascal.svg"
  },
  "/icons/pawn.svg": {
    "type": "image/svg+xml",
    "etag": "\"d1-/TIHKy7hOO38hw3twbJ6+bgnEW0\"",
    "mtime": "2025-08-13T06:36:31.387Z",
    "size": 209,
    "path": "../public/icons/pawn.svg"
  },
  "/icons/payload.svg": {
    "type": "image/svg+xml",
    "etag": "\"af-54x9NObdkNpiVbKJPxBd3HyN8Kk\"",
    "mtime": "2025-08-13T06:36:31.387Z",
    "size": 175,
    "path": "../public/icons/payload.svg"
  },
  "/icons/payload_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"af-So3oChnEcRvkVry1FVnCWIsALXM\"",
    "mtime": "2025-08-13T06:36:31.388Z",
    "size": 175,
    "path": "../public/icons/payload_light.svg"
  },
  "/icons/pdf.svg": {
    "type": "image/svg+xml",
    "etag": "\"3d0-y0n1vOjRQePqnMGAm7DxlhO8zww\"",
    "mtime": "2025-08-13T06:36:31.388Z",
    "size": 976,
    "path": "../public/icons/pdf.svg"
  },
  "/icons/pdm.svg": {
    "type": "image/svg+xml",
    "etag": "\"291-RtFEgd4LcAsxIy+5itkRSouKr9U\"",
    "mtime": "2025-08-13T06:36:31.387Z",
    "size": 657,
    "path": "../public/icons/pdm.svg"
  },
  "/icons/percy.svg": {
    "type": "image/svg+xml",
    "etag": "\"6b3-Zk9cq2iTxoFeBhJa7vJTZA9dANE\"",
    "mtime": "2025-08-13T06:36:31.388Z",
    "size": 1715,
    "path": "../public/icons/percy.svg"
  },
  "/icons/perl.svg": {
    "type": "image/svg+xml",
    "etag": "\"6c6-gDzPM7KhZl2KVihwEbTn/Juo5X8\"",
    "mtime": "2025-08-13T06:36:31.388Z",
    "size": 1734,
    "path": "../public/icons/perl.svg"
  },
  "/icons/php-cs-fixer.svg": {
    "type": "image/svg+xml",
    "etag": "\"286-avmidr+bxiqTm0c9gzA7SMt8Oh8\"",
    "mtime": "2025-08-13T06:36:31.388Z",
    "size": 646,
    "path": "../public/icons/php-cs-fixer.svg"
  },
  "/icons/php.svg": {
    "type": "image/svg+xml",
    "etag": "\"370-ZsyPBl0oSM/TcsNZWdxsoBrpteM\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 880,
    "path": "../public/icons/php.svg"
  },
  "/icons/php_elephant.svg": {
    "type": "image/svg+xml",
    "etag": "\"158-qwoaGDaTj6GKELmIdk71IzwJp3E\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 344,
    "path": "../public/icons/php_elephant.svg"
  },
  "/icons/php_elephant_pink.svg": {
    "type": "image/svg+xml",
    "etag": "\"158-2/xFdaPmFI22bOQBV7VG/RkB6QU\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 344,
    "path": "../public/icons/php_elephant_pink.svg"
  },
  "/icons/phpstan.svg": {
    "type": "image/svg+xml",
    "etag": "\"792-2rf9EUVsr/Ad6wMAcXDFJRCHGdA\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 1938,
    "path": "../public/icons/phpstan.svg"
  },
  "/icons/phpunit.svg": {
    "type": "image/svg+xml",
    "etag": "\"1fd-pUblxJuqPhy9JdqV0eo+Nq17f6c\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 509,
    "path": "../public/icons/phpunit.svg"
  },
  "/icons/pinejs.svg": {
    "type": "image/svg+xml",
    "etag": "\"3ae-L+uv3dvxVOfHWm/5P7b27jO3OQM\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 942,
    "path": "../public/icons/pinejs.svg"
  },
  "/icons/pipeline.svg": {
    "type": "image/svg+xml",
    "etag": "\"190-e2oU4YfRJNFR+b0/CId2hHBEPaY\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 400,
    "path": "../public/icons/pipeline.svg"
  },
  "/icons/pkl.svg": {
    "type": "image/svg+xml",
    "etag": "\"4b9-U2rDLI10lAUSZdu5QfER++ylnMo\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 1209,
    "path": "../public/icons/pkl.svg"
  },
  "/icons/plastic.svg": {
    "type": "image/svg+xml",
    "etag": "\"386-cTqZzqUjhGmO6fepMlhoHnxUuNk\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 902,
    "path": "../public/icons/plastic.svg"
  },
  "/icons/playwright.svg": {
    "type": "image/svg+xml",
    "etag": "\"3cf-buUVnD60MKTtgzHatm5Uxr5+I0s\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 975,
    "path": "../public/icons/playwright.svg"
  },
  "/icons/plop.svg": {
    "type": "image/svg+xml",
    "etag": "\"35b-ylCjpJ3sd+6xMI2nm0CREz1cwnA\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 859,
    "path": "../public/icons/plop.svg"
  },
  "/icons/pm2-ecosystem.svg": {
    "type": "image/svg+xml",
    "etag": "\"57d-+Xvvv8vDmKeoYchEI2PYtUw6Aag\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 1405,
    "path": "../public/icons/pm2-ecosystem.svg"
  },
  "/icons/pnpm.svg": {
    "type": "image/svg+xml",
    "etag": "\"de-Q1gF0mBveMvUQpwk4W4GTaRD8LE\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 222,
    "path": "../public/icons/pnpm.svg"
  },
  "/icons/pnpm_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"de-CdtFWjCIunKKOebh3E5zIQxvHQg\"",
    "mtime": "2025-08-13T06:36:31.389Z",
    "size": 222,
    "path": "../public/icons/pnpm_light.svg"
  },
  "/icons/poetry.svg": {
    "type": "image/svg+xml",
    "etag": "\"121-B6hQFbcBDub3sGM3b3Y8fUmrWfE\"",
    "mtime": "2025-08-13T06:36:31.390Z",
    "size": 289,
    "path": "../public/icons/poetry.svg"
  },
  "/icons/postcss.svg": {
    "type": "image/svg+xml",
    "etag": "\"192-EMwuTc28MGFsMtGKSrGPtyKT3FM\"",
    "mtime": "2025-08-13T06:36:31.390Z",
    "size": 402,
    "path": "../public/icons/postcss.svg"
  },
  "/icons/posthtml.svg": {
    "type": "image/svg+xml",
    "etag": "\"afe-nqNJiPqFNpGF/w3GUzx+m6P7avk\"",
    "mtime": "2025-08-13T06:36:31.390Z",
    "size": 2814,
    "path": "../public/icons/posthtml.svg"
  },
  "/icons/powerpoint.svg": {
    "type": "image/svg+xml",
    "etag": "\"105-VE5pLhAEBZWyNFv6m6UujJhdDfo\"",
    "mtime": "2025-08-13T06:36:31.390Z",
    "size": 261,
    "path": "../public/icons/powerpoint.svg"
  },
  "/icons/powershell.svg": {
    "type": "image/svg+xml",
    "etag": "\"262-CBQVqAcHurp16PcPjNSxERyQsR8\"",
    "mtime": "2025-08-13T06:36:31.390Z",
    "size": 610,
    "path": "../public/icons/powershell.svg"
  },
  "/icons/pre-commit.svg": {
    "type": "image/svg+xml",
    "etag": "\"60c-i/32cwwV/xvqFAwsYtAondp28zk\"",
    "mtime": "2025-08-13T06:36:31.390Z",
    "size": 1548,
    "path": "../public/icons/pre-commit.svg"
  },
  "/icons/prettier.svg": {
    "type": "image/svg+xml",
    "etag": "\"15a-V31ADw9OCpebNaGVtQ4m+cv3nUw\"",
    "mtime": "2025-08-13T06:36:31.390Z",
    "size": 346,
    "path": "../public/icons/prettier.svg"
  },
  "/icons/prisma.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ad-czoijKHmJ4Sc3kJA7bCX4sfYLWk\"",
    "mtime": "2025-08-13T06:36:31.390Z",
    "size": 429,
    "path": "../public/icons/prisma.svg"
  },
  "/icons/processing.svg": {
    "type": "image/svg+xml",
    "etag": "\"92-5YYrI1tZ8LxxrHbyzoHRje75S0A\"",
    "mtime": "2025-08-13T06:36:31.391Z",
    "size": 146,
    "path": "../public/icons/processing.svg"
  },
  "/icons/prolog.svg": {
    "type": "image/svg+xml",
    "etag": "\"411-gCOCvdi2a1j6al6eRtFOchLgGRg\"",
    "mtime": "2025-08-13T06:36:31.390Z",
    "size": 1041,
    "path": "../public/icons/prolog.svg"
  },
  "/icons/proto.svg": {
    "type": "image/svg+xml",
    "etag": "\"129-YN5hJcUvYp27lK6KLRUDmPoWmAo\"",
    "mtime": "2025-08-13T06:36:31.391Z",
    "size": 297,
    "path": "../public/icons/proto.svg"
  },
  "/icons/protractor.svg": {
    "type": "image/svg+xml",
    "etag": "\"429-d18oE3aXrFLmfv7Tmvk/C6lbaHc\"",
    "mtime": "2025-08-13T06:36:31.391Z",
    "size": 1065,
    "path": "../public/icons/protractor.svg"
  },
  "/icons/pug.svg": {
    "type": "image/svg+xml",
    "etag": "\"1333-BxLpXT1oVW0RqzrAtH7niYCQWn8\"",
    "mtime": "2025-08-13T06:36:31.391Z",
    "size": 4915,
    "path": "../public/icons/pug.svg"
  },
  "/icons/puppet.svg": {
    "type": "image/svg+xml",
    "etag": "\"11d-NhAN7IqxFohPqW3qSrAmiWftJpE\"",
    "mtime": "2025-08-13T06:36:31.391Z",
    "size": 285,
    "path": "../public/icons/puppet.svg"
  },
  "/icons/puppeteer.svg": {
    "type": "image/svg+xml",
    "etag": "\"268-z28o2J5uyh0dpngpaFx7LHDdwbk\"",
    "mtime": "2025-08-13T06:36:31.392Z",
    "size": 616,
    "path": "../public/icons/puppeteer.svg"
  },
  "/icons/purescript.svg": {
    "type": "image/svg+xml",
    "etag": "\"177-5Lmzapg6iuztQSSM/2Zg/AsroJM\"",
    "mtime": "2025-08-13T06:36:31.392Z",
    "size": 375,
    "path": "../public/icons/purescript.svg"
  },
  "/icons/python-misc.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ab-f1RDFAZU9meS5VTErEHz1FHhpnY\"",
    "mtime": "2025-08-13T06:36:31.391Z",
    "size": 683,
    "path": "../public/icons/python-misc.svg"
  },
  "/icons/python.svg": {
    "type": "image/svg+xml",
    "etag": "\"305-8aOM2UMFHcLggJmQcdwJ4xT/8Us\"",
    "mtime": "2025-08-13T06:36:31.394Z",
    "size": 773,
    "path": "../public/icons/python.svg"
  },
  "/icons/pytorch.svg": {
    "type": "image/svg+xml",
    "etag": "\"219-3Qo703WbqtUrY4ajaIxLXGYP0Yo\"",
    "mtime": "2025-08-13T06:36:31.393Z",
    "size": 537,
    "path": "../public/icons/pytorch.svg"
  },
  "/icons/qsharp.svg": {
    "type": "image/svg+xml",
    "etag": "\"305-2pExkaPJ6/TSzIjn/XKFMn7MPFM\"",
    "mtime": "2025-08-13T06:36:31.393Z",
    "size": 773,
    "path": "../public/icons/qsharp.svg"
  },
  "/icons/quasar.svg": {
    "type": "image/svg+xml",
    "etag": "\"521-ny6Cr948Rf0fIqq5JoB59lVNpkE\"",
    "mtime": "2025-08-13T06:36:31.394Z",
    "size": 1313,
    "path": "../public/icons/quasar.svg"
  },
  "/icons/quokka.svg": {
    "type": "image/svg+xml",
    "etag": "\"8f-TpegdzGR0Plr3FeQIMtuCwVHtuA\"",
    "mtime": "2025-08-13T06:36:31.395Z",
    "size": 143,
    "path": "../public/icons/quokka.svg"
  },
  "/icons/qwik.svg": {
    "type": "image/svg+xml",
    "etag": "\"2e6-mHmsie3GJIYvVENwIoPcaHAHpks\"",
    "mtime": "2025-08-13T06:36:31.397Z",
    "size": 742,
    "path": "../public/icons/qwik.svg"
  },
  "/icons/r.svg": {
    "type": "image/svg+xml",
    "etag": "\"2db-ZpnNti3TyODpeQs/j4nJZR98Zhg\"",
    "mtime": "2025-08-13T06:36:31.395Z",
    "size": 731,
    "path": "../public/icons/r.svg"
  },
  "/icons/racket.svg": {
    "type": "image/svg+xml",
    "etag": "\"29b-c/6R/+vVHw3soQxWRheBaaa03p8\"",
    "mtime": "2025-08-13T06:36:31.395Z",
    "size": 667,
    "path": "../public/icons/racket.svg"
  },
  "/icons/raml.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b7-3b2PxBCKDtn6jrhEe934Sz5o/Rs\"",
    "mtime": "2025-08-13T06:36:31.397Z",
    "size": 439,
    "path": "../public/icons/raml.svg"
  },
  "/icons/razor.svg": {
    "type": "image/svg+xml",
    "etag": "\"312-whLJdPkhkePukLugNfPZhf1LM6U\"",
    "mtime": "2025-08-13T06:36:31.396Z",
    "size": 786,
    "path": "../public/icons/razor.svg"
  },
  "/icons/rbxmk.svg": {
    "type": "image/svg+xml",
    "etag": "\"204-92LKotWKG8HLX0gWNNoPvex7Pxc\"",
    "mtime": "2025-08-13T06:36:31.397Z",
    "size": 516,
    "path": "../public/icons/rbxmk.svg"
  },
  "/icons/rc.svg": {
    "type": "image/svg+xml",
    "etag": "\"157-HBHlyM9D+bBg/l1V/CDr9y2HrY8\"",
    "mtime": "2025-08-13T06:36:31.398Z",
    "size": 343,
    "path": "../public/icons/rc.svg"
  },
  "/icons/react.svg": {
    "type": "image/svg+xml",
    "etag": "\"450-/OwaUYzQgHCO3bCf8tYHpHgHL5A\"",
    "mtime": "2025-08-13T06:36:31.398Z",
    "size": 1104,
    "path": "../public/icons/react.svg"
  },
  "/icons/react_ts.svg": {
    "type": "image/svg+xml",
    "etag": "\"450-SE75yvXhouVAMvaJ8eaXy4PrmxY\"",
    "mtime": "2025-08-13T06:36:31.397Z",
    "size": 1104,
    "path": "../public/icons/react_ts.svg"
  },
  "/icons/readme.svg": {
    "type": "image/svg+xml",
    "etag": "\"d7-+lDbrktzchfCMTrC/kmKmyU+owc\"",
    "mtime": "2025-08-13T06:36:31.397Z",
    "size": 215,
    "path": "../public/icons/readme.svg"
  },
  "/icons/reason.svg": {
    "type": "image/svg+xml",
    "etag": "\"153-jjflJxcmH1+HZF044WMO8hDlbuU\"",
    "mtime": "2025-08-13T06:36:31.397Z",
    "size": 339,
    "path": "../public/icons/reason.svg"
  },
  "/icons/red.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c7-4sNfULAkM6UyunFh7LzbBa3goZs\"",
    "mtime": "2025-08-13T06:36:31.398Z",
    "size": 455,
    "path": "../public/icons/red.svg"
  },
  "/icons/redux-action.svg": {
    "type": "image/svg+xml",
    "etag": "\"5ea-enbKcsvzAyV1LXZDmPyXYTXNzhQ\"",
    "mtime": "2025-08-13T06:36:31.398Z",
    "size": 1514,
    "path": "../public/icons/redux-action.svg"
  },
  "/icons/redux-reducer.svg": {
    "type": "image/svg+xml",
    "etag": "\"5ea-TwBbyUvjef9ScJEZ8a069mJIlH8\"",
    "mtime": "2025-08-13T06:36:31.398Z",
    "size": 1514,
    "path": "../public/icons/redux-reducer.svg"
  },
  "/icons/redux-selector.svg": {
    "type": "image/svg+xml",
    "etag": "\"5ea-HODTF7y2re57gRGQhbD7EmfR608\"",
    "mtime": "2025-08-13T06:36:31.399Z",
    "size": 1514,
    "path": "../public/icons/redux-selector.svg"
  },
  "/icons/redux-store.svg": {
    "type": "image/svg+xml",
    "etag": "\"5ea-GrCSIBrI9NOHanrA7nYYTEhuW8w\"",
    "mtime": "2025-08-13T06:36:31.398Z",
    "size": 1514,
    "path": "../public/icons/redux-store.svg"
  },
  "/icons/regedit.svg": {
    "type": "image/svg+xml",
    "etag": "\"367-VrU8GwfwzCYzFgWih6noPBaXzTQ\"",
    "mtime": "2025-08-13T06:36:31.398Z",
    "size": 871,
    "path": "../public/icons/regedit.svg"
  },
  "/icons/remark.svg": {
    "type": "image/svg+xml",
    "etag": "\"241-AysIUWEjCKLm3Bsm3tjG8tTNgpY\"",
    "mtime": "2025-08-13T06:36:31.399Z",
    "size": 577,
    "path": "../public/icons/remark.svg"
  },
  "/icons/remix.svg": {
    "type": "image/svg+xml",
    "etag": "\"104-XaISHqqpViIAf6sboWGj8VyLpTI\"",
    "mtime": "2025-08-13T06:36:31.398Z",
    "size": 260,
    "path": "../public/icons/remix.svg"
  },
  "/icons/remix_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"104-QUK+bvmEOYtG3Iojwst/M2ae/zI\"",
    "mtime": "2025-08-13T06:36:31.399Z",
    "size": 260,
    "path": "../public/icons/remix_light.svg"
  },
  "/icons/renovate.svg": {
    "type": "image/svg+xml",
    "etag": "\"16c-2KFfojUjj/SD+T2WGnE0G9TmjJ4\"",
    "mtime": "2025-08-13T06:36:31.399Z",
    "size": 364,
    "path": "../public/icons/renovate.svg"
  },
  "/icons/replit.svg": {
    "type": "image/svg+xml",
    "etag": "\"d7-EmkJW2vy+RJDCvOxxu0VbRHPAlg\"",
    "mtime": "2025-08-13T06:36:31.398Z",
    "size": 215,
    "path": "../public/icons/replit.svg"
  },
  "/icons/rescript-interface.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ae-eWl8bcaNRSH2JFZbRiZZsg6QDzM\"",
    "mtime": "2025-08-13T06:36:31.399Z",
    "size": 430,
    "path": "../public/icons/rescript-interface.svg"
  },
  "/icons/rescript.svg": {
    "type": "image/svg+xml",
    "etag": "\"12f-uqkJNB0vXQZ4zZ2uTVL4Ia2k1Ds\"",
    "mtime": "2025-08-13T06:36:31.399Z",
    "size": 303,
    "path": "../public/icons/rescript.svg"
  },
  "/icons/restql.svg": {
    "type": "image/svg+xml",
    "etag": "\"2016-HZZVhJ7+bMJvZSkYp0te+V1F59o\"",
    "mtime": "2025-08-13T06:36:31.399Z",
    "size": 8214,
    "path": "../public/icons/restql.svg"
  },
  "/icons/riot.svg": {
    "type": "image/svg+xml",
    "etag": "\"14b-QRpd4ldowNNTmD9xUdK0gvDm5Eo\"",
    "mtime": "2025-08-13T06:36:31.399Z",
    "size": 331,
    "path": "../public/icons/riot.svg"
  },
  "/icons/roadmap.svg": {
    "type": "image/svg+xml",
    "etag": "\"9c-TOqKpaT0GWjp0jOHEfxzG69n60o\"",
    "mtime": "2025-08-13T06:36:31.399Z",
    "size": 156,
    "path": "../public/icons/roadmap.svg"
  },
  "/icons/roblox.svg": {
    "type": "image/svg+xml",
    "etag": "\"11d-0Z00dMdfjxuS7WqsizK64NAI3sA\"",
    "mtime": "2025-08-13T06:36:31.400Z",
    "size": 285,
    "path": "../public/icons/roblox.svg"
  },
  "/icons/robot.svg": {
    "type": "image/svg+xml",
    "etag": "\"14f-Zpc+0JSNxST/0T0DvcuTgiAu4OA\"",
    "mtime": "2025-08-13T06:36:31.400Z",
    "size": 335,
    "path": "../public/icons/robot.svg"
  },
  "/icons/robots.svg": {
    "type": "image/svg+xml",
    "etag": "\"192-r8kk+2g8FL4LVHY7s6VC6OysS7s\"",
    "mtime": "2025-08-13T06:36:31.400Z",
    "size": 402,
    "path": "../public/icons/robots.svg"
  },
  "/icons/rocket.svg": {
    "type": "image/svg+xml",
    "etag": "\"236-tfizbWM7ROX46/MRtGyNhcHl70w\"",
    "mtime": "2025-08-13T06:36:31.399Z",
    "size": 566,
    "path": "../public/icons/rocket.svg"
  },
  "/icons/rojo.svg": {
    "type": "image/svg+xml",
    "etag": "\"940-dtSNNs/E8b+uU9bvbpep9FdkJM8\"",
    "mtime": "2025-08-13T06:36:31.399Z",
    "size": 2368,
    "path": "../public/icons/rojo.svg"
  },
  "/icons/rollup.svg": {
    "type": "image/svg+xml",
    "etag": "\"2c8-ePMLANjVpy6UbzRMo65Vcx9ssRQ\"",
    "mtime": "2025-08-13T06:36:31.400Z",
    "size": 712,
    "path": "../public/icons/rollup.svg"
  },
  "/icons/rome.svg": {
    "type": "image/svg+xml",
    "etag": "\"3d1-FK4oa8XLPgi0tGVTKLI6VMZtV80\"",
    "mtime": "2025-08-13T06:36:31.400Z",
    "size": 977,
    "path": "../public/icons/rome.svg"
  },
  "/icons/routing.svg": {
    "type": "image/svg+xml",
    "etag": "\"bd-f1zY5tqNLN5L7/NlIiDZA0I/n7A\"",
    "mtime": "2025-08-13T06:36:31.400Z",
    "size": 189,
    "path": "../public/icons/routing.svg"
  },
  "/icons/rspec.svg": {
    "type": "image/svg+xml",
    "etag": "\"5c6-YnS3jjatK1YFS7De2rPVgnKs2e0\"",
    "mtime": "2025-08-13T06:36:31.400Z",
    "size": 1478,
    "path": "../public/icons/rspec.svg"
  },
  "/icons/rubocop.svg": {
    "type": "image/svg+xml",
    "etag": "\"20a-6OE17km6f5LhZZjNtG/ev4uq92M\"",
    "mtime": "2025-08-13T06:36:31.400Z",
    "size": 522,
    "path": "../public/icons/rubocop.svg"
  },
  "/icons/rubocop_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"20a-EV3+5DarraBXGZPTK98Um9FL990\"",
    "mtime": "2025-08-13T06:36:31.401Z",
    "size": 522,
    "path": "../public/icons/rubocop_light.svg"
  },
  "/icons/ruby.svg": {
    "type": "image/svg+xml",
    "etag": "\"1eb-Ik3pl/Kij9Xyiyg+0RuiW9/zojs\"",
    "mtime": "2025-08-13T06:36:31.400Z",
    "size": 491,
    "path": "../public/icons/ruby.svg"
  },
  "/icons/ruff.svg": {
    "type": "image/svg+xml",
    "etag": "\"ab-TtSw52KmSHV5tQsecE5Cz182u0w\"",
    "mtime": "2025-08-13T06:36:31.400Z",
    "size": 171,
    "path": "../public/icons/ruff.svg"
  },
  "/icons/rust.svg": {
    "type": "image/svg+xml",
    "etag": "\"20e-vGlxR11OoIYnsW/8mISDuFMXg0I\"",
    "mtime": "2025-08-13T06:36:31.401Z",
    "size": 526,
    "path": "../public/icons/rust.svg"
  },
  "/icons/salesforce.svg": {
    "type": "image/svg+xml",
    "etag": "\"238-U0oA/uwfLwUvGfQBqky5dN/jABI\"",
    "mtime": "2025-08-13T06:36:31.401Z",
    "size": 568,
    "path": "../public/icons/salesforce.svg"
  },
  "/icons/san.svg": {
    "type": "image/svg+xml",
    "etag": "\"fb-l2aIg0FEHXuBKxilmyc6gB81AFQ\"",
    "mtime": "2025-08-13T06:36:31.400Z",
    "size": 251,
    "path": "../public/icons/san.svg"
  },
  "/icons/sas.svg": {
    "type": "image/svg+xml",
    "etag": "\"2b0-Lx+EjTXlg/zH61LH8wBvi1LG8Hw\"",
    "mtime": "2025-08-13T06:36:31.401Z",
    "size": 688,
    "path": "../public/icons/sas.svg"
  },
  "/icons/sass.svg": {
    "type": "image/svg+xml",
    "etag": "\"501-JqHqpFM71s8OY73ptTegU/41Oeo\"",
    "mtime": "2025-08-13T06:36:31.401Z",
    "size": 1281,
    "path": "../public/icons/sass.svg"
  },
  "/icons/sbt.svg": {
    "type": "image/svg+xml",
    "etag": "\"245-iwXwnmeEmV+zOvLOYpUwkKZdE/Y\"",
    "mtime": "2025-08-13T06:36:31.401Z",
    "size": 581,
    "path": "../public/icons/sbt.svg"
  },
  "/icons/scala.svg": {
    "type": "image/svg+xml",
    "etag": "\"186-m0nXr+fhCOXkRq3pvgHrd9i9qOc\"",
    "mtime": "2025-08-13T06:36:31.401Z",
    "size": 390,
    "path": "../public/icons/scala.svg"
  },
  "/icons/scheme.svg": {
    "type": "image/svg+xml",
    "etag": "\"101-GcrgtUsSgQ8CO/83T+Td6IpVVf4\"",
    "mtime": "2025-08-13T06:36:31.401Z",
    "size": 257,
    "path": "../public/icons/scheme.svg"
  },
  "/icons/scons.svg": {
    "type": "image/svg+xml",
    "etag": "\"c6-kwabnX6OEqNcDV9Es/VuDbQa4WQ\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 198,
    "path": "../public/icons/scons.svg"
  },
  "/icons/scons_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"c6-u8isafZZOLJ6ytbRFCWpM1Fo5P4\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 198,
    "path": "../public/icons/scons_light.svg"
  },
  "/icons/screwdriver.svg": {
    "type": "image/svg+xml",
    "etag": "\"159-AJGpaRKwvC+yQPDw8zaEVJXjz00\"",
    "mtime": "2025-08-13T06:36:31.401Z",
    "size": 345,
    "path": "../public/icons/screwdriver.svg"
  },
  "/icons/search.svg": {
    "type": "image/svg+xml",
    "etag": "\"173-TY7/BHCB+gjXRiI0Ld0DqOvpxOg\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 371,
    "path": "../public/icons/search.svg"
  },
  "/icons/semantic-release.svg": {
    "type": "image/svg+xml",
    "etag": "\"905-q2h69PApY+JgpTG662xVewkBIiI\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 2309,
    "path": "../public/icons/semantic-release.svg"
  },
  "/icons/semantic-release_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"905-gD8EPG9WwcFcK/3o3K4AgLVnoZU\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 2309,
    "path": "../public/icons/semantic-release_light.svg"
  },
  "/icons/semgrep.svg": {
    "type": "image/svg+xml",
    "etag": "\"381-qGBCPnsmARANuEGtZiraeicu6Hs\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 897,
    "path": "../public/icons/semgrep.svg"
  },
  "/icons/sentry.svg": {
    "type": "image/svg+xml",
    "etag": "\"4c3-t/aWX7v1J0bkspv79BCBaHZ0QIM\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 1219,
    "path": "../public/icons/sentry.svg"
  },
  "/icons/sequelize.svg": {
    "type": "image/svg+xml",
    "etag": "\"b34-8iGhXFl+DvmaSmEccQMyTFiYpJU\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 2868,
    "path": "../public/icons/sequelize.svg"
  },
  "/icons/serverless.svg": {
    "type": "image/svg+xml",
    "etag": "\"dc-WejI7Vbjhk2cW54dcR3EPYBh2+c\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 220,
    "path": "../public/icons/serverless.svg"
  },
  "/icons/settings.svg": {
    "type": "image/svg+xml",
    "etag": "\"536-tuz5q0BIGwTEb7JsFs98eIDTs5E\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 1334,
    "path": "../public/icons/settings.svg"
  },
  "/icons/shader.svg": {
    "type": "image/svg+xml",
    "etag": "\"12e-43btnV5IUpNtPInEngxo9ColSH4\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 302,
    "path": "../public/icons/shader.svg"
  },
  "/icons/silverstripe.svg": {
    "type": "image/svg+xml",
    "etag": "\"257-tgZsegNiwuS6kv+L/02bHAaBGCI\"",
    "mtime": "2025-08-13T06:36:31.402Z",
    "size": 599,
    "path": "../public/icons/silverstripe.svg"
  },
  "/icons/simulink.svg": {
    "type": "image/svg+xml",
    "etag": "\"f8-yKTFBVFc4/EOEGXjL9sykTFKoNE\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 248,
    "path": "../public/icons/simulink.svg"
  },
  "/icons/siyuan.svg": {
    "type": "image/svg+xml",
    "etag": "\"ec-eFT0Yc5hUG+/TMvYTq6NzP8YjAU\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 236,
    "path": "../public/icons/siyuan.svg"
  },
  "/icons/sketch.svg": {
    "type": "image/svg+xml",
    "etag": "\"15c-4r8uGA5XwbpLr4chi/WY8M+owYI\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 348,
    "path": "../public/icons/sketch.svg"
  },
  "/icons/slim.svg": {
    "type": "image/svg+xml",
    "etag": "\"c4-FnWH7FcEWN48BfYX4HQmHolPBuM\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 196,
    "path": "../public/icons/slim.svg"
  },
  "/icons/slint.svg": {
    "type": "image/svg+xml",
    "etag": "\"9c-vWOJ6PcUHkYBvDmX/7Qeyux0eNg\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 156,
    "path": "../public/icons/slint.svg"
  },
  "/icons/slug.svg": {
    "type": "image/svg+xml",
    "etag": "\"855-az3wd+1BUF0ZYanJGpP84Bt9zXI\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 2133,
    "path": "../public/icons/slug.svg"
  },
  "/icons/smarty.svg": {
    "type": "image/svg+xml",
    "etag": "\"14e-L6G5Tvi/DtZ4Lb0qkVOhpbBwD1k\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 334,
    "path": "../public/icons/smarty.svg"
  },
  "/icons/sml.svg": {
    "type": "image/svg+xml",
    "etag": "\"116-ge8395yXoaXgh364HWUjmiS4Yyo\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 278,
    "path": "../public/icons/sml.svg"
  },
  "/icons/snakemake.svg": {
    "type": "image/svg+xml",
    "etag": "\"473-cOZyCM1o1HPk9IFVxHCWxPEc6aM\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 1139,
    "path": "../public/icons/snakemake.svg"
  },
  "/icons/snapcraft.svg": {
    "type": "image/svg+xml",
    "etag": "\"c9-yntHZ+Kfw2T/uixvaRNrY1PPG/o\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 201,
    "path": "../public/icons/snapcraft.svg"
  },
  "/icons/snowpack.svg": {
    "type": "image/svg+xml",
    "etag": "\"129-uvQiRgsHAggxzSXCwxl8ZQNZr5Q\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 297,
    "path": "../public/icons/snowpack.svg"
  },
  "/icons/snowpack_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"129-OZNHmtZ8mo9kkmol95kpzM3hY8k\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 297,
    "path": "../public/icons/snowpack_light.svg"
  },
  "/icons/snyk.svg": {
    "type": "image/svg+xml",
    "etag": "\"853-8Qo9EKh2sfzUDu731isqp3C8xQY\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 2131,
    "path": "../public/icons/snyk.svg"
  },
  "/icons/solidity.svg": {
    "type": "image/svg+xml",
    "etag": "\"d2-K3l0MOVa8Kjk2ti04IqcKqxjCLM\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 210,
    "path": "../public/icons/solidity.svg"
  },
  "/icons/sonarcloud.svg": {
    "type": "image/svg+xml",
    "etag": "\"4ad-V6AUNueYfKYkXL5TTln/lLZV3L4\"",
    "mtime": "2025-08-13T06:36:31.403Z",
    "size": 1197,
    "path": "../public/icons/sonarcloud.svg"
  },
  "/icons/spwn.svg": {
    "type": "image/svg+xml",
    "etag": "\"192-aEyoxMwrBAWmv4Ra09MpNeMte74\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 402,
    "path": "../public/icons/spwn.svg"
  },
  "/icons/stackblitz.svg": {
    "type": "image/svg+xml",
    "etag": "\"88-1b8wMwXmc8avrseVD2Qoqe0mgVs\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 136,
    "path": "../public/icons/stackblitz.svg"
  },
  "/icons/stan.svg": {
    "type": "image/svg+xml",
    "etag": "\"544-n9xIsgCISUI/hRbP3MDbwgruRHs\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 1348,
    "path": "../public/icons/stan.svg"
  },
  "/icons/steadybit.svg": {
    "type": "image/svg+xml",
    "etag": "\"31a-jqhUsXAEupPFMtQTW497/p5BGNk\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 794,
    "path": "../public/icons/steadybit.svg"
  },
  "/icons/stencil.svg": {
    "type": "image/svg+xml",
    "etag": "\"9a-IWm+FoSY6wjjSrixbIdGVvMzKS4\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 154,
    "path": "../public/icons/stencil.svg"
  },
  "/icons/stitches.svg": {
    "type": "image/svg+xml",
    "etag": "\"417-/cKJ65Zb1U/LFNhJQTUlj5ePFT8\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 1047,
    "path": "../public/icons/stitches.svg"
  },
  "/icons/stitches_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"417-ZStGuv9LrU6izP8HfC9kgGDMUOA\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 1047,
    "path": "../public/icons/stitches_light.svg"
  },
  "/icons/storybook.svg": {
    "type": "image/svg+xml",
    "etag": "\"2e9-sA3obFjVdfBAqRnYe1QcZApr48A\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 745,
    "path": "../public/icons/storybook.svg"
  },
  "/icons/stryker.svg": {
    "type": "image/svg+xml",
    "etag": "\"76a-hFTOXgA0+t+AbCylaXbc4r4BQvs\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 1898,
    "path": "../public/icons/stryker.svg"
  },
  "/icons/stylable.svg": {
    "type": "image/svg+xml",
    "etag": "\"60e-Bo9x5BG22MOyPmY9Tw6HZ1u17cc\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 1550,
    "path": "../public/icons/stylable.svg"
  },
  "/icons/stylelint.svg": {
    "type": "image/svg+xml",
    "etag": "\"4e7-7/D5g3z7n/Y34fLT2BPI5Hm6Aqs\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 1255,
    "path": "../public/icons/stylelint.svg"
  },
  "/icons/stylelint_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"4e7-P5jWHs0tzDgAHuv4EJK2Y12B9Vk\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 1255,
    "path": "../public/icons/stylelint_light.svg"
  },
  "/icons/stylus.svg": {
    "type": "image/svg+xml",
    "etag": "\"223-KZL98cUmcecowCw7nRTTrNudUX4\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 547,
    "path": "../public/icons/stylus.svg"
  },
  "/icons/sublime.svg": {
    "type": "image/svg+xml",
    "etag": "\"17a-DfwqckijgKaADEwt3OmKa9ye9m0\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 378,
    "path": "../public/icons/sublime.svg"
  },
  "/icons/subtitles.svg": {
    "type": "image/svg+xml",
    "etag": "\"155-KfYHCl4frMFOlwiZNp8SobjQe8A\"",
    "mtime": "2025-08-13T06:36:31.404Z",
    "size": 341,
    "path": "../public/icons/subtitles.svg"
  },
  "/icons/supabase.svg": {
    "type": "image/svg+xml",
    "etag": "\"d9-a3GJSSm2eXk951x53Gr1e82yR0Q\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 217,
    "path": "../public/icons/supabase.svg"
  },
  "/icons/svelte.svg": {
    "type": "image/svg+xml",
    "etag": "\"684-4UWb55c6kxKsyW0eE2d+Nqm/StM\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 1668,
    "path": "../public/icons/svelte.svg"
  },
  "/icons/svg.svg": {
    "type": "image/svg+xml",
    "etag": "\"505-B3u70cyKgy44mIHEMMZGFIfymFU\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 1285,
    "path": "../public/icons/svg.svg"
  },
  "/icons/svgo.svg": {
    "type": "image/svg+xml",
    "etag": "\"722-YhctL7jzEca6a0fXg4UnoPWO2Bc\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 1826,
    "path": "../public/icons/svgo.svg"
  },
  "/icons/svgr.svg": {
    "type": "image/svg+xml",
    "etag": "\"450-+yjl1MDU99t368DMHUvPIzLAFsg\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 1104,
    "path": "../public/icons/svgr.svg"
  },
  "/icons/swagger.svg": {
    "type": "image/svg+xml",
    "etag": "\"ba8-k43Fcl6+2MtHIlhzNzgJupyJGE0\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 2984,
    "path": "../public/icons/swagger.svg"
  },
  "/icons/sway.svg": {
    "type": "image/svg+xml",
    "etag": "\"207-rnJtG3/ImseDW8mCrZZwUdAMRi8\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 519,
    "path": "../public/icons/sway.svg"
  },
  "/icons/swc.svg": {
    "type": "image/svg+xml",
    "etag": "\"8d1-Tj3Zrliix8/yIHi18t2JA1tYo44\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 2257,
    "path": "../public/icons/swc.svg"
  },
  "/icons/swift.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f6-H7ibqXnidDoLbhlC/JOb+WeJM2Q\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 502,
    "path": "../public/icons/swift.svg"
  },
  "/icons/syncpack.svg": {
    "type": "image/svg+xml",
    "etag": "\"89f-lbp6my0nfsPjiHsIyjJdNV7HZ9U\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 2207,
    "path": "../public/icons/syncpack.svg"
  },
  "/icons/systemd.svg": {
    "type": "image/svg+xml",
    "etag": "\"da-eN5LIWWn6fzDE2d8KwkMhv2PbvE\"",
    "mtime": "2025-08-13T06:36:31.406Z",
    "size": 218,
    "path": "../public/icons/systemd.svg"
  },
  "/icons/systemd_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"da-i4bK56O0uyOrsqKFVvScMUMmxG0\"",
    "mtime": "2025-08-13T06:36:31.405Z",
    "size": 218,
    "path": "../public/icons/systemd_light.svg"
  },
  "/icons/table.svg": {
    "type": "image/svg+xml",
    "etag": "\"10c-lnYh1NJd8yAbpMF+U8lDQZ5VCYE\"",
    "mtime": "2025-08-13T06:36:31.406Z",
    "size": 268,
    "path": "../public/icons/table.svg"
  },
  "/icons/tailwindcss.svg": {
    "type": "image/svg+xml",
    "etag": "\"11e-o2PH5gDdJX6lwAE4Sfo44bCJ+v0\"",
    "mtime": "2025-08-13T06:36:31.406Z",
    "size": 286,
    "path": "../public/icons/tailwindcss.svg"
  },
  "/icons/taskfile.svg": {
    "type": "image/svg+xml",
    "etag": "\"c8-CX1JPu+WMhRnMpDLL3tC6GlHL0Y\"",
    "mtime": "2025-08-13T06:36:31.406Z",
    "size": 200,
    "path": "../public/icons/taskfile.svg"
  },
  "/icons/tauri.svg": {
    "type": "image/svg+xml",
    "etag": "\"469-FXZzZj+RXWYbyQO6MjZ3mayJEdA\"",
    "mtime": "2025-08-13T06:36:31.406Z",
    "size": 1129,
    "path": "../public/icons/tauri.svg"
  },
  "/icons/taze.svg": {
    "type": "image/svg+xml",
    "etag": "\"305-pi2Xj6O8xVnqd9TnQ5sh6WyYo/M\"",
    "mtime": "2025-08-13T06:36:31.406Z",
    "size": 773,
    "path": "../public/icons/taze.svg"
  },
  "/icons/tcl.svg": {
    "type": "image/svg+xml",
    "etag": "\"1ea-CMBtdeP90iN9P88uZxKyWWRHoXI\"",
    "mtime": "2025-08-13T06:36:31.406Z",
    "size": 490,
    "path": "../public/icons/tcl.svg"
  },
  "/icons/teal.svg": {
    "type": "image/svg+xml",
    "etag": "\"92-fzT8Mq/fP5PJEy4JAQqfZluirug\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 146,
    "path": "../public/icons/teal.svg"
  },
  "/icons/templ.svg": {
    "type": "image/svg+xml",
    "etag": "\"e6-wCKoa290SVLDa0TSmV4Cz1UUtQ4\"",
    "mtime": "2025-08-13T06:36:31.406Z",
    "size": 230,
    "path": "../public/icons/templ.svg"
  },
  "/icons/template.svg": {
    "type": "image/svg+xml",
    "etag": "\"17f-GrqaT5WAh+QWhvVCj8WyhED6cx0\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 383,
    "path": "../public/icons/template.svg"
  },
  "/icons/terraform.svg": {
    "type": "image/svg+xml",
    "etag": "\"a0-hrIyZOLAmvwV75p4GRFB5l5o4lg\"",
    "mtime": "2025-08-13T06:36:31.406Z",
    "size": 160,
    "path": "../public/icons/terraform.svg"
  },
  "/icons/test-js.svg": {
    "type": "image/svg+xml",
    "etag": "\"267-adHev0ibKqRilS/cMJF4k3/ivok\"",
    "mtime": "2025-08-13T06:36:31.406Z",
    "size": 615,
    "path": "../public/icons/test-js.svg"
  },
  "/icons/test-jsx.svg": {
    "type": "image/svg+xml",
    "etag": "\"267-R4xng4owTDIjRYAnuPESrgXhKvc\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 615,
    "path": "../public/icons/test-jsx.svg"
  },
  "/icons/test-ts.svg": {
    "type": "image/svg+xml",
    "etag": "\"267-RV8t6Ujc9Wd6I57fHP5mmtAIqCo\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 615,
    "path": "../public/icons/test-ts.svg"
  },
  "/icons/tex.svg": {
    "type": "image/svg+xml",
    "etag": "\"35e-5lyxaf8AMyR3wu2Ut9AXiwzd1V8\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 862,
    "path": "../public/icons/tex.svg"
  },
  "/icons/textlint.svg": {
    "type": "image/svg+xml",
    "etag": "\"c1-Di7nczsZj2QKlCv9aoku31/SXrI\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 193,
    "path": "../public/icons/textlint.svg"
  },
  "/icons/tilt.svg": {
    "type": "image/svg+xml",
    "etag": "\"12d-WRsA8khJzIBHwctzaPjPfB6yyTA\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 301,
    "path": "../public/icons/tilt.svg"
  },
  "/icons/tldraw.svg": {
    "type": "image/svg+xml",
    "etag": "\"22d-qgmNPtagMlC4WeQ+c4yNEu9L8XQ\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 557,
    "path": "../public/icons/tldraw.svg"
  },
  "/icons/tldraw_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"22d-KRb3LZYys3g/299nxjx7oTUrTVU\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 557,
    "path": "../public/icons/tldraw_light.svg"
  },
  "/icons/tobi.svg": {
    "type": "image/svg+xml",
    "etag": "\"99-QAw+1QLSwh3FSm+BEb/TVwspBb0\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 153,
    "path": "../public/icons/tobi.svg"
  },
  "/icons/tobimake.svg": {
    "type": "image/svg+xml",
    "etag": "\"118-S3jXKngDdnImTbO2HvqQZeArIAo\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 280,
    "path": "../public/icons/tobimake.svg"
  },
  "/icons/todo.svg": {
    "type": "image/svg+xml",
    "etag": "\"cd-yOELyjkGqqzxHMfp8bvYwlyjobQ\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 205,
    "path": "../public/icons/todo.svg"
  },
  "/icons/toml.svg": {
    "type": "image/svg+xml",
    "etag": "\"b4-Eo07E85HKIN0Y53LTrQDrT9k93E\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 180,
    "path": "../public/icons/toml.svg"
  },
  "/icons/toml_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"b4-ubQcIOMCeiicmE7RLzB9XJ/jx2k\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 180,
    "path": "../public/icons/toml_light.svg"
  },
  "/icons/travis.svg": {
    "type": "image/svg+xml",
    "etag": "\"54da-cf3Ijozhtligo0jb/wmUbWJcRL8\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 21722,
    "path": "../public/icons/travis.svg"
  },
  "/icons/tree.svg": {
    "type": "image/svg+xml",
    "etag": "\"a4-mMEoqowzt5lm2ofeiGYgVsYybF4\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 164,
    "path": "../public/icons/tree.svg"
  },
  "/icons/trigger.svg": {
    "type": "image/svg+xml",
    "etag": "\"ee-kBZ0JIkjIBhxCYyKRqSf4QfMNeI\"",
    "mtime": "2025-08-13T06:36:31.407Z",
    "size": 238,
    "path": "../public/icons/trigger.svg"
  },
  "/icons/tsconfig.svg": {
    "type": "image/svg+xml",
    "etag": "\"19b-aLjyCE3NkRiC+2yFAbwyUg2PHWg\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 411,
    "path": "../public/icons/tsconfig.svg"
  },
  "/icons/tsdoc.svg": {
    "type": "image/svg+xml",
    "etag": "\"127-HhREuQFXLoVonZc4Uy5iMg04mIo\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 295,
    "path": "../public/icons/tsdoc.svg"
  },
  "/icons/tsil.svg": {
    "type": "image/svg+xml",
    "etag": "\"128-f0OLu1bBhuxExa0CkdleAQHkgpM\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 296,
    "path": "../public/icons/tsil.svg"
  },
  "/icons/tune.svg": {
    "type": "image/svg+xml",
    "etag": "\"10c-KFz+4UZDm3ZThgnXa2B8L9ppgsI\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 268,
    "path": "../public/icons/tune.svg"
  },
  "/icons/turborepo.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ac-c9cgtPw/xVeMgyPgKicEXj4tR7I\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 684,
    "path": "../public/icons/turborepo.svg"
  },
  "/icons/turborepo_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"2ac-h0Fid1ZaEl4roi12FxCxYQqZJiw\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 684,
    "path": "../public/icons/turborepo_light.svg"
  },
  "/icons/twig.svg": {
    "type": "image/svg+xml",
    "etag": "\"b59-6y6Ezuo1OoMrg2Ykfmv+1bABR9s\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 2905,
    "path": "../public/icons/twig.svg"
  },
  "/icons/twine.svg": {
    "type": "image/svg+xml",
    "etag": "\"f1-Hbgg2YM9YzS4WlbkBPmMInXtXYI\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 241,
    "path": "../public/icons/twine.svg"
  },
  "/icons/typescript-def.svg": {
    "type": "image/svg+xml",
    "etag": "\"112-DrMD9qUotHx+dlr7w5eDc0QRLnY\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 274,
    "path": "../public/icons/typescript-def.svg"
  },
  "/icons/typescript.svg": {
    "type": "image/svg+xml",
    "etag": "\"10b-SjigPH+pK5qu+kzs93nQycky+J4\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 267,
    "path": "../public/icons/typescript.svg"
  },
  "/icons/typst.svg": {
    "type": "image/svg+xml",
    "etag": "\"157-YrjmhwJOWVinxEtHlgt8GZpQBZU\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 343,
    "path": "../public/icons/typst.svg"
  },
  "/icons/umi.svg": {
    "type": "image/svg+xml",
    "etag": "\"1f2-uax2uZHULrOcAEPhT4kTVOR7LG8\"",
    "mtime": "2025-08-13T06:36:31.413Z",
    "size": 498,
    "path": "../public/icons/umi.svg"
  },
  "/icons/uml.svg": {
    "type": "image/svg+xml",
    "etag": "\"2b8-64ANqBJ1b7MJ2WTJ74ghrdx+jBo\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 696,
    "path": "../public/icons/uml.svg"
  },
  "/icons/uml_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"2c2-M/H3l8sraKyxmlwpkkhGwkLuNP8\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 706,
    "path": "../public/icons/uml_light.svg"
  },
  "/icons/unity.svg": {
    "type": "image/svg+xml",
    "etag": "\"ba-41w0QtAcOU42rI/nx8/ijV0myRA\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 186,
    "path": "../public/icons/unity.svg"
  },
  "/icons/unocss.svg": {
    "type": "image/svg+xml",
    "etag": "\"da-oNNBW8z1QpROob4F2viso0YOoF0\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 218,
    "path": "../public/icons/unocss.svg"
  },
  "/icons/url.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a2-Z9oLtl7eAu/FoTND3PEvGmpeWtU\"",
    "mtime": "2025-08-13T06:36:31.408Z",
    "size": 418,
    "path": "../public/icons/url.svg"
  },
  "/icons/uv.svg": {
    "type": "image/svg+xml",
    "etag": "\"92-lRBHEs/EdwiHEnmddk2ae/bEreQ\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 146,
    "path": "../public/icons/uv.svg"
  },
  "/icons/vagrant.svg": {
    "type": "image/svg+xml",
    "etag": "\"223-aXuSljdmaBCFH3Z5jkuMfzBAl5I\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 547,
    "path": "../public/icons/vagrant.svg"
  },
  "/icons/vala.svg": {
    "type": "image/svg+xml",
    "etag": "\"a5b-KRijonAVKHkN2rLOwV76iIrESOs\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 2651,
    "path": "../public/icons/vala.svg"
  },
  "/icons/vanilla-extract.svg": {
    "type": "image/svg+xml",
    "etag": "\"554-C3otpw2HOvpmFbuyVHTGJ3+yuW4\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 1364,
    "path": "../public/icons/vanilla-extract.svg"
  },
  "/icons/vedic.svg": {
    "type": "image/svg+xml",
    "etag": "\"787-/XOJSIzj8yAA8gLrZIN5IWxhUl0\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 1927,
    "path": "../public/icons/vedic.svg"
  },
  "/icons/velite.svg": {
    "type": "image/svg+xml",
    "etag": "\"134-KWDhQ6qIwtW6tC2iUQzs5QbnUEY\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 308,
    "path": "../public/icons/velite.svg"
  },
  "/icons/velocity.svg": {
    "type": "image/svg+xml",
    "etag": "\"2c8-iy+YztNbdealLZDhPwmHuRaiohE\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 712,
    "path": "../public/icons/velocity.svg"
  },
  "/icons/vercel.svg": {
    "type": "image/svg+xml",
    "etag": "\"6b-R7R8YOO5e5rPL0kVJ78Sbh/vdhY\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 107,
    "path": "../public/icons/vercel.svg"
  },
  "/icons/vercel_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"6b-s2//fFoVw6dhsqE2akZP6QELTPw\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 107,
    "path": "../public/icons/vercel_light.svg"
  },
  "/icons/verdaccio.svg": {
    "type": "image/svg+xml",
    "etag": "\"13e-WscBCU2AOUr3wdncVY6U+a6wYCM\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 318,
    "path": "../public/icons/verdaccio.svg"
  },
  "/icons/verified.svg": {
    "type": "image/svg+xml",
    "etag": "\"c2-lKVgbJ8EZkk4sP8UuIHvIG57X74\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 194,
    "path": "../public/icons/verified.svg"
  },
  "/icons/verilog.svg": {
    "type": "image/svg+xml",
    "etag": "\"20a-Sl++w9ImRk+7SZvP3VBj2GEwqTQ\"",
    "mtime": "2025-08-13T06:36:31.409Z",
    "size": 522,
    "path": "../public/icons/verilog.svg"
  },
  "/icons/vfl.svg": {
    "type": "image/svg+xml",
    "etag": "\"4cb-Ujy1Cb41MS/5JdjgDcZf4gguTf0\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 1227,
    "path": "../public/icons/vfl.svg"
  },
  "/icons/video.svg": {
    "type": "image/svg+xml",
    "etag": "\"bf-Q7VoAOrGT8vwcmrf2aCBp42HuAk\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 191,
    "path": "../public/icons/video.svg"
  },
  "/icons/vim.svg": {
    "type": "image/svg+xml",
    "etag": "\"9d-DL6O0TRoIdA4Cs5gp6J5KLNdqRE\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 157,
    "path": "../public/icons/vim.svg"
  },
  "/icons/virtual.svg": {
    "type": "image/svg+xml",
    "etag": "\"8f-QHbys/NYvprZaUvZNld9isKMOuo\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 143,
    "path": "../public/icons/virtual.svg"
  },
  "/icons/visualstudio.svg": {
    "type": "image/svg+xml",
    "etag": "\"e8-J8a5Jr312yiCnpCH9B/Nd3v/OdY\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 232,
    "path": "../public/icons/visualstudio.svg"
  },
  "/icons/vite.svg": {
    "type": "image/svg+xml",
    "etag": "\"78-/k7jMu2DVuqBGJuxD6kI0ak1QOs\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 120,
    "path": "../public/icons/vite.svg"
  },
  "/icons/vitest.svg": {
    "type": "image/svg+xml",
    "etag": "\"211-XA2PiXvktnTejdKMYX25SuGFqGk\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 529,
    "path": "../public/icons/vitest.svg"
  },
  "/icons/vlang.svg": {
    "type": "image/svg+xml",
    "etag": "\"232-whe42Hab04m9BlUXM/xwBykGGbk\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 562,
    "path": "../public/icons/vlang.svg"
  },
  "/icons/vscode.svg": {
    "type": "image/svg+xml",
    "etag": "\"17e-p0P//DSHEMHyooZ7JYIoWSYSrSs\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 382,
    "path": "../public/icons/vscode.svg"
  },
  "/icons/vue-config.svg": {
    "type": "image/svg+xml",
    "etag": "\"1a6-Rq+nnnqXCJJu8+cE/12Jj8AyMWs\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 422,
    "path": "../public/icons/vue-config.svg"
  },
  "/icons/vue.svg": {
    "type": "image/svg+xml",
    "etag": "\"103-tXfz2IiPvuyOtiRQYQXdoixyiEc\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 259,
    "path": "../public/icons/vue.svg"
  },
  "/icons/vuex-store.svg": {
    "type": "image/svg+xml",
    "etag": "\"133-cDkP759O2n56dEYUp1dItotnYBo\"",
    "mtime": "2025-08-13T06:36:31.411Z",
    "size": 307,
    "path": "../public/icons/vuex-store.svg"
  },
  "/icons/wakatime.svg": {
    "type": "image/svg+xml",
    "etag": "\"3a5-SKyUrtIW0GUN4N4NQXAITzTs9CM\"",
    "mtime": "2025-08-13T06:36:31.410Z",
    "size": 933,
    "path": "../public/icons/wakatime.svg"
  },
  "/icons/wakatime_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"3a5-wZYw3U3MVqCymt2Au6DzKXPMNEg\"",
    "mtime": "2025-08-13T06:36:31.411Z",
    "size": 933,
    "path": "../public/icons/wakatime_light.svg"
  },
  "/icons/wallaby.svg": {
    "type": "image/svg+xml",
    "etag": "\"70-3y1U96WlYc+p4i5Ch4r4UKRXhgE\"",
    "mtime": "2025-08-13T06:36:31.411Z",
    "size": 112,
    "path": "../public/icons/wallaby.svg"
  },
  "/icons/wally.svg": {
    "type": "image/svg+xml",
    "etag": "\"843-fUIJsysfGgwE0tlMLFjkkGw5Fe8\"",
    "mtime": "2025-08-13T06:36:31.411Z",
    "size": 2115,
    "path": "../public/icons/wally.svg"
  },
  "/icons/watchman.svg": {
    "type": "image/svg+xml",
    "etag": "\"bb4-SsB9Evs335q15wsvxBVccHmHLzE\"",
    "mtime": "2025-08-13T06:36:31.411Z",
    "size": 2996,
    "path": "../public/icons/watchman.svg"
  },
  "/icons/webassembly.svg": {
    "type": "image/svg+xml",
    "etag": "\"fd-LvgMjSz63r/xLeyG/2CcnnOR/UI\"",
    "mtime": "2025-08-13T06:36:31.411Z",
    "size": 253,
    "path": "../public/icons/webassembly.svg"
  },
  "/icons/webhint.svg": {
    "type": "image/svg+xml",
    "etag": "\"359-WrGS6EO0KjA24OqLS60pq+vTgvU\"",
    "mtime": "2025-08-13T06:36:31.411Z",
    "size": 857,
    "path": "../public/icons/webhint.svg"
  },
  "/icons/webpack.svg": {
    "type": "image/svg+xml",
    "etag": "\"2cd-SQoxkwcecw8IwDPO9tDAQpzIS/Q\"",
    "mtime": "2025-08-13T06:36:31.412Z",
    "size": 717,
    "path": "../public/icons/webpack.svg"
  },
  "/icons/wepy.svg": {
    "type": "image/svg+xml",
    "etag": "\"c7-kPkcNkL/mgtoqq1QEc8N4/SGpOo\"",
    "mtime": "2025-08-13T06:36:31.411Z",
    "size": 199,
    "path": "../public/icons/wepy.svg"
  },
  "/icons/werf.svg": {
    "type": "image/svg+xml",
    "etag": "\"5b0-eozoeJv9EGujNEY4z8l/j7M6pjo\"",
    "mtime": "2025-08-13T06:36:31.411Z",
    "size": 1456,
    "path": "../public/icons/werf.svg"
  },
  "/icons/windicss.svg": {
    "type": "image/svg+xml",
    "etag": "\"fe-Ix/1fEiIsxAble7seFd7Rf9WA5M\"",
    "mtime": "2025-08-13T06:36:31.411Z",
    "size": 254,
    "path": "../public/icons/windicss.svg"
  },
  "/icons/wolframlanguage.svg": {
    "type": "image/svg+xml",
    "etag": "\"6e4-Asp1Lp77ANrTR07OZHBT0Zr4rtM\"",
    "mtime": "2025-08-13T06:36:31.412Z",
    "size": 1764,
    "path": "../public/icons/wolframlanguage.svg"
  },
  "/icons/word.svg": {
    "type": "image/svg+xml",
    "etag": "\"fb-IsLUpV/Al5Da4WZMk6vA/apMbP8\"",
    "mtime": "2025-08-13T06:36:31.411Z",
    "size": 251,
    "path": "../public/icons/word.svg"
  },
  "/icons/wrangler.svg": {
    "type": "image/svg+xml",
    "etag": "\"173-pdcsisjnAbC33G0Ov8H86aguh1E\"",
    "mtime": "2025-08-13T06:36:31.413Z",
    "size": 371,
    "path": "../public/icons/wrangler.svg"
  },
  "/icons/wxt.svg": {
    "type": "image/svg+xml",
    "etag": "\"206-GywnNn5lGOABR19mlt0TEDcIPJ4\"",
    "mtime": "2025-08-13T06:36:31.412Z",
    "size": 518,
    "path": "../public/icons/wxt.svg"
  },
  "/icons/xaml.svg": {
    "type": "image/svg+xml",
    "etag": "\"131-QAU9P4IjwEYjDXEziQpmC8nIWFA\"",
    "mtime": "2025-08-13T06:36:31.412Z",
    "size": 305,
    "path": "../public/icons/xaml.svg"
  },
  "/icons/xmake.svg": {
    "type": "image/svg+xml",
    "etag": "\"1c7-PnEucLD2fd93K6tacdakm96VTD4\"",
    "mtime": "2025-08-13T06:36:31.412Z",
    "size": 455,
    "path": "../public/icons/xmake.svg"
  },
  "/icons/xml.svg": {
    "type": "image/svg+xml",
    "etag": "\"122-R/luS437lRz/xcfKCZlbP+82TLI\"",
    "mtime": "2025-08-13T06:36:31.412Z",
    "size": 290,
    "path": "../public/icons/xml.svg"
  },
  "/icons/yaml.svg": {
    "type": "image/svg+xml",
    "etag": "\"c7-CDEQdnMng0DfWYyjFSrrsZ3wSoY\"",
    "mtime": "2025-08-13T06:36:31.412Z",
    "size": 199,
    "path": "../public/icons/yaml.svg"
  },
  "/icons/yang.svg": {
    "type": "image/svg+xml",
    "etag": "\"1b6-72F2wJEUrX0bOjAtWSXg2E5PcSk\"",
    "mtime": "2025-08-13T06:36:31.412Z",
    "size": 438,
    "path": "../public/icons/yang.svg"
  },
  "/icons/yarn.svg": {
    "type": "image/svg+xml",
    "etag": "\"396-3E2yv/DO8GTjoIiUPbROBgBQA58\"",
    "mtime": "2025-08-13T06:36:31.413Z",
    "size": 918,
    "path": "../public/icons/yarn.svg"
  },
  "/icons/zeabur.svg": {
    "type": "image/svg+xml",
    "etag": "\"d7-NMPmCbeGozbFZUG4TBIb62iMV5o\"",
    "mtime": "2025-08-13T06:36:31.412Z",
    "size": 215,
    "path": "../public/icons/zeabur.svg"
  },
  "/icons/zeabur_light.svg": {
    "type": "image/svg+xml",
    "etag": "\"d7-KlIMLJCT4tDYz962untUs+t7j/M\"",
    "mtime": "2025-08-13T06:36:31.412Z",
    "size": 215,
    "path": "../public/icons/zeabur_light.svg"
  },
  "/icons/zig.svg": {
    "type": "image/svg+xml",
    "etag": "\"fe-44GiNx4Mven+TC5ltMoFoLddHkQ\"",
    "mtime": "2025-08-13T06:36:31.413Z",
    "size": 254,
    "path": "../public/icons/zig.svg"
  },
  "/icons/zip.svg": {
    "type": "image/svg+xml",
    "etag": "\"e6-W1sHUETjj4nAgWs7aI8mxu6mpSI\"",
    "mtime": "2025-08-13T06:36:31.412Z",
    "size": 230,
    "path": "../public/icons/zip.svg"
  }
};

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _YYLh_8 = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  if (encodings.length > 1) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError$1({ statusCode: 404 });
    }
    return;
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

const _lazy_vr5YKA = () => import('./chunks/_/ssr.mjs');

const handlers = [
  { route: '', handler: _YYLh_8, lazy: false, middleware: true, method: undefined },
  { route: '/**', handler: _lazy_vr5YKA, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp$1.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp$1.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => b(nodeHandler, aRequest);
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return C(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp$1 = createNitroApp();
function useNitroApp() {
  return nitroApp$1;
}
runNitroPlugins(nitroApp$1);

const debug = (...args) => {
};
function GracefulShutdown(server, opts) {
  opts = opts || {};
  const options = Object.assign(
    {
      signals: "SIGINT SIGTERM",
      timeout: 3e4,
      development: false,
      forceExit: true,
      onShutdown: (signal) => Promise.resolve(signal),
      preShutdown: (signal) => Promise.resolve(signal)
    },
    opts
  );
  let isShuttingDown = false;
  const connections = {};
  let connectionCounter = 0;
  const secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;
  function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
      function call() {
        if (!called) {
          called = true;
          return Reflect.apply(callback, this, arguments);
        }
      }
      for (const e of events) {
        emitter.on(e, call);
      }
    };
  }
  const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
  const once = onceFactory();
  once(process, signals, (signal) => {
    debug("received shut down signal", signal);
    shutdown(signal).then(() => {
      if (options.forceExit) {
        process.exit(failed ? 1 : 0);
      }
    }).catch((error) => {
      debug("server shut down error occurred", error);
      process.exit(1);
    });
  });
  function isFunction(functionToCheck) {
    const getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
  }
  function destroy(socket, force = false) {
    if (socket._isIdle && isShuttingDown || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }
  function destroyAllConnections(force = false) {
    debug("Destroy Connections : " + (force ? "forced close" : "close"));
    let counter = 0;
    let secureCounter = 0;
    for (const key of Object.keys(connections)) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        counter++;
        destroy(socket);
      }
    }
    debug("Connections destroyed : " + counter);
    debug("Connection Counter    : " + connectionCounter);
    for (const key of Object.keys(secureConnections)) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        secureCounter++;
        destroy(socket);
      }
    }
    debug("Secure Connections destroyed : " + secureCounter);
    debug("Secure Connection Counter    : " + secureConnectionCounter);
  }
  server.on("request", (req, res) => {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader("connection", "close");
    }
    res.on("finish", () => {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });
  server.on("connection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;
      socket.once("close", () => {
        delete connections[socket._connectionId];
      });
    }
  });
  server.on("secureConnection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;
      socket.once("close", () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });
  process.on("close", () => {
    debug("closed");
  });
  function shutdown(sig) {
    function cleanupHttp() {
      destroyAllConnections();
      debug("Close http server");
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }
          return resolve(true);
        });
      });
    }
    debug("shutdown signal - " + sig);
    if (options.development) {
      debug("DEV-Mode - immediate forceful shutdown");
      return process.exit(0);
    }
    function finalHandler() {
      if (!finalRun) {
        finalRun = true;
        if (options.finally && isFunction(options.finally)) {
          debug("executing finally()");
          options.finally();
        }
      }
      return Promise.resolve();
    }
    function waitForReadyToShutDown(totalNumInterval) {
      debug(`waitForReadyToShutDown... ${totalNumInterval}`);
      if (totalNumInterval === 0) {
        debug(
          `Could not close connections in time (${options.timeout}ms), will forcefully shut down`
        );
        return Promise.resolve(true);
      }
      const allConnectionsClosed = Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0;
      if (allConnectionsClosed) {
        debug("All connections closed. Continue to shutting down");
        return Promise.resolve(false);
      }
      debug("Schedule the next waitForReadyToShutdown");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForReadyToShutDown(totalNumInterval - 1));
        }, 250);
      });
    }
    if (isShuttingDown) {
      return Promise.resolve();
    }
    debug("shutting down");
    return options.preShutdown(sig).then(() => {
      isShuttingDown = true;
      cleanupHttp();
    }).then(() => {
      const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
      return waitForReadyToShutDown(pollIterations);
    }).then((force) => {
      debug("Do onShutdown now");
      if (force) {
        destroyAllConnections(force);
      }
      return options.onShutdown(sig);
    }).then(finalHandler).catch((error) => {
      const errString = typeof error === "string" ? error : JSON.stringify(error);
      debug(errString);
      failed = true;
      throw errString;
    });
  }
  function shutdownManual() {
    return shutdown("manual");
  }
  return shutdownManual;
}

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  GracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((error) => {
          console.error(error);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;
const nitroApp = useNitroApp();
const server = cert && key ? new Server({ key, cert }, toNodeListener(nitroApp.h3App)) : new Server$1(toNodeListener(nitroApp.h3App));
const port = destr(process.env.NITRO_PORT || process.env.PORT) || 3e3;
const host = process.env.NITRO_HOST || process.env.HOST;
const path = process.env.NITRO_UNIX_SOCKET;
const listener = server.listen(path ? { path } : { port, host }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const protocol = cert && key ? "https" : "http";
  const addressInfo = listener.address();
  if (typeof addressInfo === "string") {
    console.log(`Listening on unix socket ${addressInfo}`);
    return;
  }
  const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
  const url = `${protocol}://${addressInfo.family === "IPv6" ? `[${addressInfo.address}]` : addressInfo.address}:${addressInfo.port}${baseURL}`;
  console.log(`Listening on ${url}`);
});
trapUnhandledNodeErrors();
setupGracefulShutdown(listener, nitroApp);
const nodeServer = {};

export { nodeServer as default };
//# sourceMappingURL=index.mjs.map
