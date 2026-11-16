// \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
// node_modules/hono/dist/http-exception.js
/**
* `HTTPException` must be used when a fatal error such as authentication failure occurs.
*
* @see {@link https://hono.dev/docs/api/exception}
*
* @param {StatusCode} status - status code of HTTPException
* @param {HTTPExceptionOptions} options - options of HTTPException
* @param {HTTPExceptionOptions["res"]} options.res - response of options of HTTPException
* @param {HTTPExceptionOptions["message"]} options.message - message of options of HTTPException
* @param {HTTPExceptionOptions["cause"]} options.cause - cause of options of HTTPException
*
* @example
* ```ts
* import { HTTPException } from 'hono/http-exception'
*
* // ...
*
* app.post('/auth', async (c, next) => {
*   // authentication
*   if (authorized === false) {
*     throw new HTTPException(401, { message: 'Custom error message' })
*   }
*   await next()
* })
* ```
*/
var HTTPException = class extends Error {
	res;
	status;
	/**
	* Creates an instance of `HTTPException`.
	* @param status - HTTP status code for the exception. Defaults to 500.
	* @param options - Additional options for the exception.
	*/
	constructor(status = 500, options) {
		super(options?.message, { cause: options?.cause });
		this.res = options?.res;
		this.status = status;
	}
	/**
	* Returns the response object associated with the exception.
	* If a response object is not provided, a new response is created with the error message and status code.
	* @returns The response object.
	*/
	getResponse() {
		if (this.res) return new Response(this.res.body, {
			status: this.status,
			headers: this.res.headers
		});
		return new Response(this.message, { status: this.status });
	}
};
// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();
// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
	return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
};
// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = Object.create(null)) => {
	const { all = false, dot = false } = options;
	const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
	if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
		all,
		dot
	});
	return {};
};
/**
* Parses form data from a request.
*
* @template T - The type of the parsed body data.
* @param {HonoRequest | Request} request - The request object containing form data.
* @param {ParseBodyOptions} options - Options for parsing the form data.
* @returns {Promise<T>} The parsed body data.
*/
async function parseFormData(request, options) {
	if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
	const headers = isRawRequest(request) ? request.headers : request.raw.headers;
	const formDataPromise = bufferToFormData(await request.arrayBuffer(), headers.get("Content-Type") || "");
	if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
	const formData = await formDataPromise;
	if (formData) return convertFormDataToBodyData(formData, options);
	return {};
}
/**
* Converts form data to body data based on the provided options.
*
* @template T - The type of the parsed body data.
* @param {FormData} formData - The form data to convert.
* @param {ParseBodyOptions} options - Options for parsing the form data.
* @returns {T} The converted body data.
*/
function convertFormDataToBodyData(formData, options) {
	const form = Object.create(null);
	const nestingState = { count: 0 };
	formData.forEach((value, key) => {
		if (!(options.all || key.endsWith("[]"))) form[key] = value;
		else handleParsingAllValues(form, key, value);
	});
	if (options.dot) Object.entries(form).forEach(([key, value]) => {
		if (key.includes(".")) {
			handleParsingNestedValues(form, key, value, nestingState);
			delete form[key];
		}
	});
	return form;
}
/**
* Handles parsing all values for a given key, supporting multiple values as arrays.
*
* @param {BodyData} form - The form data object.
* @param {string} key - The key to parse.
* @param {FormDataEntryValue} value - The value to assign.
*/
var handleParsingAllValues = (form, key, value) => {
	if (form[key] !== void 0) {
		if (Array.isArray(form[key])) form[key].push(value);
		else form[key] = [form[key], value];
	} else if (!key.endsWith("[]")) form[key] = value;
	else form[key] = [value];
};
/**
* Handles parsing nested values using dot notation keys.
*
* @param {BodyData} form - The form data object.
* @param {string} key - The dot notation key.
* @param {BodyDataValue} value - The value to assign.
*/
var handleParsingNestedValues = (form, key, value, state) => {
	if (/(?:^|\.)__proto__\./.test(key)) return;
	let nestedForm = form;
	const keys = key.split(".", 34);
	if (keys.length > 33) throwNestingLimitExceeded();
	keys.forEach((key, index) => {
		if (index === keys.length - 1) nestedForm[key] = value;
		else {
			if (!nestedForm[key] || typeof nestedForm[key] !== "object" || Array.isArray(nestedForm[key]) || nestedForm[key] instanceof File) {
				if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
				nestedForm[key] = Object.create(null);
			}
			nestedForm = nestedForm[key];
		}
	});
};
var throwNestingLimitExceeded = () => {
	throw new Error("Nesting limit exceeded");
};
// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
	const paths = path.split("/");
	if (paths[0] === "") paths.shift();
	return paths;
};
var splitRoutingPath = (routePath) => {
	const { groups, path } = extractGroupsFromPath(routePath);
	return replaceGroupMarks(splitPath(path), groups);
};
var extractGroupsFromPath = (path) => {
	const groups = [];
	path = path.replace(/\{[^}]+\}/g, (match, index) => {
		const mark = `@${index}`;
		groups.push([mark, match]);
		return mark;
	});
	return {
		groups,
		path
	};
};
var replaceGroupMarks = (paths, groups) => {
	for (let i = groups.length - 1; i >= 0; i--) {
		const [mark] = groups[i];
		for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
			paths[j] = paths[j].replace(mark, groups[i][1]);
			break;
		}
	}
	return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
	if (label === "*") return "*";
	const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
	if (match) {
		const cacheKey = `${label}#${next}`;
		if (!patternCache[cacheKey]) {
			if (match[2]) patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [
				cacheKey,
				match[1],
				new RegExp(`^${match[2]}(?=/${next})`)
			] : [
				label,
				match[1],
				new RegExp(`^${match[2]}$`)
			];
			else patternCache[cacheKey] = [
				label,
				match[1],
				true
			];
		}
		return patternCache[cacheKey];
	}
	return null;
};
var tryDecode = (str, decoder) => {
	try {
		return decoder(str);
	} catch {
		return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
			try {
				return decoder(match);
			} catch {
				return match;
			}
		});
	}
};
var decodeURIWithPreservedPercent = (value) => decodeURI(value.includes("%25") ? value.replace(/%25/g, "%2525") : value);
var getPath = (request) => {
	const url = request.url;
	const start = url.indexOf("/", url.indexOf(":") + 4);
	let i = start;
	for (; i < url.length; i++) {
		const charCode = url.charCodeAt(i);
		if (charCode === 37) {
			const queryIndex = url.indexOf("?", i);
			const hashIndex = url.indexOf("#", i);
			const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
			const path = url.slice(start, end);
			const decoded = tryDecode(path, decodeURIWithPreservedPercent);
			if (/%(?![0-9A-Fa-f]{2})/.test(path)) {
				const rewritten = new URL("http://localhost");
				rewritten.pathname = decoded.replace(/[\\\t\n\r]/g, encodeURIComponent);
				if (tryDecode(rewritten.pathname, decodeURIWithPreservedPercent) !== decoded) return tryDecode(path.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"), decodeURIWithPreservedPercent);
			}
			return decoded;
		} else if (charCode === 63 || charCode === 35) break;
	}
	return url.slice(start, i);
};
var getPathNoStrict = (request) => {
	const result = getPath(request);
	return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
/**
* Merge paths.
* @param {string[]} ...paths - The paths to merge.
* @returns {string} The merged path.
* @example
* mergePath('/api', '/users') // '/api/users'
* mergePath('/api/', '/users') // '/api/users'
* mergePath('/api', '/') // '/api'
* mergePath('/api/', '/') // '/api/'
*/
var mergePath = (base, sub, ...rest) => {
	if (rest.length) sub = mergePath(sub, ...rest);
	return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
	if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
	const segments = path.split("/");
	const results = [];
	let basePath = "";
	segments.forEach((segment) => {
		if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
		else if (/\:/.test(segment)) {
			if (segment.charCodeAt(segment.length - 1) === 63) {
				if (results.length === 0 && basePath === "") results.push("/");
				else results.push(basePath);
				const optionalSegment = segment.slice(0, -1);
				basePath += "/" + optionalSegment;
				results.push(basePath);
			} else basePath += "/" + segment;
		}
	});
	return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
	if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
	return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
	const hashIndex = url.indexOf("#", 8);
	if (hashIndex !== -1) url = url.slice(0, hashIndex);
	let encoded;
	if (!multiple && key && !/[%+&=]/.test(key)) {
		const queryIndex = url.indexOf("?", 8);
		let keyIndex = queryIndex;
		if (keyIndex === -1) return;
		if (!url.startsWith(key, keyIndex + 1)) keyIndex = url.indexOf(`&${key}`, keyIndex + 1);
		while (keyIndex !== -1) {
			const trailingKeyCode = url.charCodeAt(keyIndex + key.length + 1);
			if (trailingKeyCode === 61 || trailingKeyCode === 38 || isNaN(trailingKeyCode)) {
				if (keyIndex > queryIndex && /(?:^|&)[^=&]*[%+]/.test(url.slice(queryIndex + 1, keyIndex))) break;
				if (trailingKeyCode === 61) {
					const valueIndex = keyIndex + key.length + 2;
					const endIndex = url.indexOf("&", valueIndex);
					return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
				}
				return "";
			}
			keyIndex = url.indexOf(`&${key}`, keyIndex + 1);
		}
		encoded = /[%+]/.test(url);
		if (!encoded) return;
	}
	const results = Object.create(null);
	encoded ??= /[%+]/.test(url);
	let keyIndex = url.indexOf("?", 8);
	while (keyIndex !== -1) {
		const nextKeyIndex = url.indexOf("&", keyIndex + 1);
		let valueIndex = url.indexOf("=", keyIndex);
		if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
		let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
		if (encoded) name = _decodeURI(name);
		keyIndex = nextKeyIndex;
		if (name === "") continue;
		let value;
		if (valueIndex === -1) value = "";
		else {
			value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
			if (encoded) value = _decodeURI(value);
		}
		if (multiple) {
			if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
			results[name].push(value);
		} else results[name] ??= value;
	}
	return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
	return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;
// node_modules/hono/dist/request.js
var HonoRequest = class {
	/**
	* `.raw` can get the raw Request object.
	*
	* @see {@link https://hono.dev/docs/api/request#raw}
	*
	* @example
	* ```ts
	* // For Cloudflare Workers
	* app.post('/', async (c) => {
	*   const metadata = c.req.raw.cf?.hostMetadata?
	*   ...
	* })
	* ```
	*/
	raw;
	#validatedData;
	#matchResult;
	routeIndex = 0;
	/**
	* `.path` can get the pathname of the request.
	*
	* @see {@link https://hono.dev/docs/api/request#path}
	*
	* @example
	* ```ts
	* app.get('/about/me', (c) => {
	*   const pathname = c.req.path // `/about/me`
	* })
	* ```
	*/
	path;
	bodyCache = {};
	constructor(request, path = "/", matchResult = [[]]) {
		this.raw = request;
		this.path = path;
		this.#matchResult = matchResult;
	}
	param(key) {
		return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
	}
	#getDecodedParam(key) {
		const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
		const param = this.#getParamValue(paramKey);
		return param && tryDecodeURIComponent(param);
	}
	#getAllDecodedParams() {
		const decoded = {};
		const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
		for (const key of keys) {
			const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
			if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
		}
		return decoded;
	}
	#getParamValue(paramKey) {
		return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
	}
	query(key) {
		return getQueryParam(this.url, key);
	}
	queries(key) {
		return getQueryParams(this.url, key);
	}
	header(name) {
		if (name) return this.raw.headers.get(name) ?? void 0;
		const headerData = Object.create(null);
		this.raw.headers.forEach((value, key) => {
			headerData[key] = value;
		});
		return headerData;
	}
	async parseBody(options) {
		return parseBody(this, options);
	}
	#cachedBody = (key) => {
		const { bodyCache, raw } = this;
		const cachedBody = bodyCache[key];
		if (cachedBody) return cachedBody;
		for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
			if (anyCachedKey === "json") body = JSON.stringify(body);
			const contentType = anyCachedKey === "formData" ? void 0 : raw.headers.get("content-type");
			return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
		});
		return bodyCache[key] = raw[key]();
	};
	/**
	* `.json()` can parse Request body of type `application/json`
	*
	* @see {@link https://hono.dev/docs/api/request#json}
	*
	* @example
	* ```ts
	* app.post('/entry', async (c) => {
	*   const body = await c.req.json()
	* })
	* ```
	*/
	json() {
		return this.#cachedBody("text").then((text) => JSON.parse(text));
	}
	/**
	* `.text()` can parse Request body of type `text/plain`
	*
	* @see {@link https://hono.dev/docs/api/request#text}
	*
	* @example
	* ```ts
	* app.post('/entry', async (c) => {
	*   const body = await c.req.text()
	* })
	* ```
	*/
	text() {
		return this.#cachedBody("text");
	}
	/**
	* `.arrayBuffer()` parse Request body as an `ArrayBuffer`
	*
	* @see {@link https://hono.dev/docs/api/request#arraybuffer}
	*
	* @example
	* ```ts
	* app.post('/entry', async (c) => {
	*   const body = await c.req.arrayBuffer()
	* })
	* ```
	*/
	arrayBuffer() {
		return this.#cachedBody("arrayBuffer");
	}
	/**
	* `.bytes()` parses the request body as a `Uint8Array`.
	*
	* @see {@link https://hono.dev/docs/api/request#bytes}
	*
	* @example
	* ```ts
	* app.post('/entry', async (c) => {
	*   const body = await c.req.bytes()
	* })
	* ```
	*/
	bytes() {
		return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
	}
	/**
	* Parses the request body as a `Blob`.
	* @example
	* ```ts
	* app.post('/entry', async (c) => {
	*   const body = await c.req.blob();
	* });
	* ```
	* @see https://hono.dev/docs/api/request#blob
	*/
	blob() {
		return this.#cachedBody("blob");
	}
	/**
	* Parses the request body as `FormData`.
	* @example
	* ```ts
	* app.post('/entry', async (c) => {
	*   const body = await c.req.formData();
	* });
	* ```
	* @see https://hono.dev/docs/api/request#formdata
	*/
	formData() {
		return this.#cachedBody("formData");
	}
	/**
	* Adds validated data to the request.
	*
	* @param target - The target of the validation.
	* @param data - The validated data to add.
	*/
	addValidatedData(target, data) {
		(this.#validatedData ??= {})[target] = data;
	}
	valid(target) {
		return this.#validatedData?.[target];
	}
	/**
	* `.url` can get the request url strings.
	*
	* @see {@link https://hono.dev/docs/api/request#url}
	*
	* @example
	* ```ts
	* app.get('/about/me', (c) => {
	*   const url = c.req.url // `http://localhost:8787/about/me`
	*   ...
	* })
	* ```
	*/
	get url() {
		return this.raw.url;
	}
	/**
	* `.method` can get the method name of the request.
	*
	* @see {@link https://hono.dev/docs/api/request#method}
	*
	* @example
	* ```ts
	* app.get('/about/me', (c) => {
	*   const method = c.req.method // `GET`
	* })
	* ```
	*/
	get method() {
		return this.raw.method;
	}
	get [GET_MATCH_RESULT]() {
		return this.#matchResult;
	}
	/**
	* `.matchedRoutes` can return a matched route in the handler
	*
	* @deprecated
	*
	* Use matchedRoutes helper defined in "hono/route" instead.
	*
	* @see {@link https://hono.dev/docs/api/request#matchedroutes}
	*
	* @example
	* ```ts
	* app.use('*', async function logger(c, next) {
	*   await next()
	*   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
	*     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
	*     console.log(
	*       method,
	*       ' ',
	*       path,
	*       ' '.repeat(Math.max(10 - path.length, 0)),
	*       name,
	*       i === c.req.routeIndex ? '<- respond from here' : ''
	*     )
	*   })
	* })
	* ```
	*/
	get matchedRoutes() {
		return this.#matchResult[0].map(([[, route]]) => route);
	}
	/**
	* `.routePath` can retrieve the path registered within the handler
	*
	* @deprecated
	*
	* Use routePath helper defined in "hono/route" instead.
	*
	* @see {@link https://hono.dev/docs/api/request#routepath}
	*
	* @example
	* ```ts
	* app.get('/posts/:id', (c) => {
	*   return c.json({ path: c.req.routePath })
	* })
	* ```
	*/
	get routePath() {
		return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
	}
};
// node_modules/hono/dist/utils/html.js
/**
* @module
* HTML utility.
*/
var HtmlEscapedCallbackPhase = {
	Stringify: 1,
	BeforeStream: 2,
	Stream: 3
};
var raw = (value, callbacks) => {
	const escapedString = new String(value);
	escapedString.isEscaped = true;
	escapedString.callbacks = callbacks;
	return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
	if (typeof str === "object" && !(str instanceof String)) {
		if (!(str instanceof Promise)) str = str.toString();
		if (str instanceof Promise) str = await str;
	}
	const callbacks = str.callbacks;
	if (!callbacks?.length) return Promise.resolve(str);
	if (buffer) buffer[0] += str;
	else buffer = [str];
	const resStr = Promise.all(callbacks.map((c) => c({
		phase,
		buffer,
		context
	}))).then((res) => Promise.all(res.filter(Boolean).map((str) => resolveCallback(str, phase, false, context, buffer))).then(() => buffer[0]));
	if (preserveCallbacks) return raw(await resStr, callbacks);
	else return resStr;
};
// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
	return {
		"Content-Type": contentType,
		...headers
	};
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
	#rawRequest;
	#req;
	/**
	* `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
	*
	* @see {@link https://hono.dev/docs/api/context#env}
	*
	* @example
	* ```ts
	* // Environment object for Cloudflare Workers
	* app.get('*', async c => {
	*   const counter = c.env.COUNTER
	* })
	* ```
	*/
	env = {};
	#var;
	finalized = false;
	/**
	* `.error` can get the error object from the middleware if the Handler throws an error.
	*
	* @see {@link https://hono.dev/docs/api/context#error}
	*
	* @example
	* ```ts
	* app.use('*', async (c, next) => {
	*   await next()
	*   if (c.error) {
	*     // do something...
	*   }
	* })
	* ```
	*/
	error;
	#status;
	#executionCtx;
	#res;
	#layout;
	#renderer;
	#notFoundHandler;
	#preparedHeaders;
	#matchResult;
	#path;
	/**
	* Creates an instance of the Context class.
	*
	* @param req - The Request object.
	* @param options - Optional configuration options for the context.
	*/
	constructor(req, options) {
		this.#rawRequest = req;
		if (options) {
			this.#executionCtx = options.executionCtx;
			this.env = options.env;
			this.#notFoundHandler = options.notFoundHandler;
			this.#path = options.path;
			this.#matchResult = options.matchResult;
		}
	}
	/**
	* `.req` is the instance of {@link HonoRequest}.
	*/
	get req() {
		this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
		return this.#req;
	}
	/**
	* @see {@link https://hono.dev/docs/api/context#event}
	* The FetchEvent associated with the current request.
	*
	* @throws Will throw an error if the context does not have a FetchEvent.
	*/
	get event() {
		if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
		else throw Error("This context has no FetchEvent");
	}
	/**
	* @see {@link https://hono.dev/docs/api/context#executionctx}
	* The ExecutionContext associated with the current request.
	*
	* @throws Will throw an error if the context does not have an ExecutionContext.
	*/
	get executionCtx() {
		if (this.#executionCtx) return this.#executionCtx;
		else throw Error("This context has no ExecutionContext");
	}
	/**
	* @see {@link https://hono.dev/docs/api/context#res}
	* The Response object for the current request.
	*/
	get res() {
		return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
	}
	/**
	* Sets the Response object for the current request.
	*
	* @param _res - The Response object to set.
	*/
	set res(_res) {
		if (this.#res && _res) {
			_res = createResponseInstance(_res.body, _res);
			for (const [k, v] of this.#res.headers.entries()) {
				if (k === "content-type") continue;
				if (k === "set-cookie") {
					const cookies = this.#res.headers.getSetCookie();
					_res.headers.delete("set-cookie");
					for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
				} else _res.headers.set(k, v);
			}
		}
		this.#res = _res;
		this.finalized = true;
	}
	/**
	* `.render()` can create a response within a layout.
	*
	* @see {@link https://hono.dev/docs/api/context#render-setrenderer}
	*
	* @example
	* ```ts
	* app.get('/', (c) => {
	*   return c.render('Hello!')
	* })
	* ```
	*/
	render = (...args) => {
		this.#renderer ??= (content) => this.html(content);
		return this.#renderer(...args);
	};
	/**
	* Sets the layout for the response.
	*
	* @param layout - The layout to set.
	* @returns The layout function.
	*/
	setLayout = (layout) => this.#layout = layout;
	/**
	* Gets the current layout for the response.
	*
	* @returns The current layout function.
	*/
	getLayout = () => this.#layout;
	/**
	* `.setRenderer()` can set the layout in the custom middleware.
	*
	* @see {@link https://hono.dev/docs/api/context#render-setrenderer}
	*
	* @example
	* ```tsx
	* app.use('*', async (c, next) => {
	*   c.setRenderer((content) => {
	*     return c.html(
	*       <html>
	*         <body>
	*           <p>{content}</p>
	*         </body>
	*       </html>
	*     )
	*   })
	*   await next()
	* })
	* ```
	*/
	setRenderer = (renderer) => {
		this.#renderer = renderer;
	};
	/**
	* `.header()` can set headers.
	*
	* @see {@link https://hono.dev/docs/api/context#header}
	*
	* @example
	* ```ts
	* app.get('/welcome', (c) => {
	*   // Set headers
	*   c.header('X-Message', 'Hello!')
	*   c.header('Content-Type', 'text/plain')
	*
	*   // Append multiple headers using the append option (e.g. Vary)
	*   c.header('Vary', 'Accept-Encoding', { append: true })
	*   c.header('Vary', 'User-Agent', { append: true })
	*
	*   return c.body('Thank you for coming')
	* })
	* ```
	*/
	header = (name, value, options) => {
		if (this.finalized && !this.#res.bodyUsed) this.#res = createResponseInstance(this.#res.body, this.#res);
		const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
		if (value === void 0) headers.delete(name);
		else if (options?.append) headers.append(name, value);
		else headers.set(name, value);
	};
	status = (status) => {
		this.#status = status;
	};
	/**
	* `.set()` can set the value specified by the key.
	*
	* @see {@link https://hono.dev/docs/api/context#set-get}
	*
	* @example
	* ```ts
	* app.use('*', async (c, next) => {
	*   c.set('message', 'Hono is hot!!')
	*   await next()
	* })
	* ```
	*/
	set = (key, value) => {
		this.#var ??= /* @__PURE__ */ new Map();
		this.#var.set(key, value);
	};
	/**
	* `.get()` can use the value specified by the key.
	*
	* @see {@link https://hono.dev/docs/api/context#set-get}
	*
	* @example
	* ```ts
	* app.get('/', (c) => {
	*   const message = c.get('message')
	*   return c.text(`The message is "${message}"`)
	* })
	* ```
	*/
	get = (key) => {
		return this.#var ? this.#var.get(key) : void 0;
	};
	/**
	* `.var` can access the value of a variable.
	*
	* @see {@link https://hono.dev/docs/api/context#var}
	*
	* @example
	* ```ts
	* const result = c.var.client.oneMethod()
	* ```
	*/
	get var() {
		if (!this.#var) return {};
		return Object.fromEntries(this.#var);
	}
	#newResponse(data, arg, headers) {
		let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
		if (typeof arg === "object" && arg.headers) {
			responseHeaders ??= new Headers();
			for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
			else responseHeaders.set(key, value);
		}
		if (headers) {
			if (!responseHeaders) {
				let count = 0;
				for (const k in headers) if (++count > 1 || typeof headers[k] !== "string") {
					responseHeaders = new Headers();
					break;
				}
			}
			if (responseHeaders) for (const k in headers) {
				const v = headers[k];
				if (typeof v === "string") responseHeaders.set(k, v);
				else {
					responseHeaders.delete(k);
					for (const v2 of v) responseHeaders.append(k, v2);
				}
			}
		}
		return createResponseInstance(data, {
			status: typeof arg === "number" ? arg : arg?.status ?? this.#status,
			headers: responseHeaders ?? headers
		});
	}
	newResponse = (...args) => this.#newResponse(...args);
	/**
	* `.body()` can return the HTTP response.
	* You can set headers with `.header()` and set HTTP status code with `.status`.
	* This can also be set in `.text()`, `.json()` and so on.
	*
	* @see {@link https://hono.dev/docs/api/context#body}
	*
	* @example
	* ```ts
	* app.get('/welcome', (c) => {
	*   // Set headers
	*   c.header('X-Message', 'Hello!')
	*   c.header('Content-Type', 'text/plain')
	*   // Set HTTP status code
	*   c.status(201)
	*
	*   // Return the response body
	*   return c.body('Thank you for coming')
	* })
	* ```
	*/
	body = (data, arg, headers) => this.#newResponse(data, arg, headers);
	/**
	* `.text()` can render text as `Content-Type:text/plain`.
	*
	* @see {@link https://hono.dev/docs/api/context#text}
	*
	* @example
	* ```ts
	* app.get('/say', (c) => {
	*   return c.text('Hello!')
	* })
	* ```
	*/
	text = (text, arg, headers) => {
		return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
	};
	/**
	* `.json()` can render JSON as `Content-Type:application/json`.
	*
	* @see {@link https://hono.dev/docs/api/context#json}
	*
	* @example
	* ```ts
	* app.get('/api', (c) => {
	*   return c.json({ message: 'Hello!' })
	* })
	* ```
	*/
	json = (object, arg, headers) => {
		return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
	};
	html = (html, arg, headers) => {
		const res = (html) => this.#newResponse(html, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
		return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
	};
	/**
	* `.redirect()` can Redirect, default status code is 302.
	*
	* @see {@link https://hono.dev/docs/api/context#redirect}
	*
	* @example
	* ```ts
	* app.get('/redirect', (c) => {
	*   return c.redirect('/')
	* })
	* app.get('/redirect-permanently', (c) => {
	*   return c.redirect('/', 301)
	* })
	* ```
	*/
	redirect = (location, status) => {
		const locationString = String(location);
		this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
		return this.newResponse(null, status ?? 302);
	};
	/**
	* `.notFound()` can return the Not Found Response.
	*
	* @see {@link https://hono.dev/docs/api/context#notfound}
	*
	* @example
	* ```ts
	* app.get('/notfound', (c) => {
	*   return c.notFound()
	* })
	* ```
	*/
	notFound = () => {
		this.#notFoundHandler ??= () => createResponseInstance();
		return this.#notFoundHandler(this);
	};
};
// node_modules/hono/dist/compose.js
/**
* Compose middleware functions into a single function based on `koa-compose` package.
*
* @template E - The environment type.
*
* @param {[[Function, unknown], unknown][] | [[Function]][]} middleware - An array of middleware functions and their corresponding parameters.
* @param {ErrorHandler<E>} [onError] - An optional error handler function.
* @param {NotFoundHandler<E>} [onNotFound] - An optional not-found handler function.
*
* @returns {(context: Context, next?: Next) => Promise<Context>} - A composed middleware function.
*/
var compose = (middleware, onError, onNotFound) => {
	return (context, next) => {
		let index = -1;
		return dispatch(0);
		/**
		* Dispatch the middleware functions.
		*
		* @param {number} i - The current index in the middleware array.
		*
		* @returns {Promise<Context>} - A promise that resolves to the context.
		*/
		async function dispatch(i) {
			if (i <= index) throw new Error("next() called multiple times");
			index = i;
			let res;
			let isError = false;
			let handler;
			if (middleware[i]) {
				handler = middleware[i][0][0];
				context.req.routeIndex = i;
			} else handler = i === middleware.length && next || void 0;
			if (handler) try {
				res = await handler(context, () => dispatch(i + 1));
			} catch (err) {
				if (err instanceof Error && onError) {
					context.error = err;
					res = await onError(err, context);
					isError = true;
				} else throw err;
			}
			else if (context.finalized === false && onNotFound) res = await onNotFound(context);
			if (res && (context.finalized === false || isError)) context.res = res;
			return context;
		}
	};
};
// node_modules/hono/dist/helper/route/index.js
/**
* Get matched routes in the handler
*
* @param {Context} c - The context object
* @returns An array of matched routes
*
* @example
* ```ts
* import { matchedRoutes } from 'hono/route'
*
* app.use('*', async function logger(c, next) {
*   await next()
*   matchedRoutes(c).forEach(({ handler, method, path }, i) => {
*     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
*     console.log(
*       method,
*       ' ',
*       path,
*       ' '.repeat(Math.max(10 - path.length, 0)),
*       name,
*       i === c.req.routeIndex ? '<- respond from here' : ''
*     )
*   })
* })
* ```
*/
var matchedRoutes = (c) => c.req[GET_MATCH_RESULT][0].map(([[, route]]) => route);
/**
* Get the route path registered within the handler
*
* @param {Context} c - The context object
* @param {number} index - The index of the route from which to retrieve the path, similar to Array.prototype.at(), where a negative number is the index counted from the end of the matching route. Defaults to the current route index.
* @returns The route path registered within the handler
*
* @example
* ```ts
* import { routePath } from 'hono/route'
*
* app.use('*', (c, next) => {
*   console.log(routePath(c)) // '*'
*   console.log(routePath(c, -1)) // '/posts/:id'
*   return next()
* })
*
* app.get('/posts/:id', (c) => {
*   return c.text(routePath(c)) // '/posts/:id'
* })
* ```
*/
var routePath = (c, index) => matchedRoutes(c).at(index ?? c.req.routeIndex)?.path ?? "";
// node_modules/hono/dist/router.js
/**
* Array of supported HTTP methods.
*/
var METHODS = [
	"get",
	"post",
	"put",
	"delete",
	"options",
	"patch",
	"query"
];
/**
* Error message indicating that a route cannot be added because the matcher is already built.
*/
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
/**
* Error class representing an unsupported path error.
*/
var UnsupportedPathError = class extends Error {};
// node_modules/hono/dist/utils/constants.js
/**
* Constant used to mark a composed handler.
*/
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";
// node_modules/hono/dist/utils/mount.js
var countTrailingSlashes = (path) => {
	let index = path.length;
	while (index > 0 && path.charCodeAt(index - 1) === 47) index--;
	return path.length - index;
};
var getPathPrefixLength = (c, pathPrefix, routePath) => {
	if (!/[:*]/.test(pathPrefix)) return pathPrefix.length;
	const path = c.req.path;
	const matchResult = c.req[GET_MATCH_RESULT];
	const paramNames = /* @__PURE__ */ new Set();
	let length = 0;
	for (const part of splitRoutingPath(pathPrefix)) {
		if (part[0] === ":" && part.endsWith("}?")) throw new Error(`mount(): Optional regular expression parameters are not supported in "${routePath}".`);
		const pattern = getPattern(part);
		if (pattern && pattern !== "*") {
			const name = pattern[1];
			if (paramNames.has(name)) throw new Error(`mount(): Duplicate path parameter "${name}" in "${routePath}".`);
			paramNames.add(name);
		}
		if (pattern && pattern !== "*" && pattern[2] !== true) {
			const value = matchResult.length === 2 ? matchResult[1][matchResult[0][c.req.routeIndex][1][pattern[1]]] : matchResult[0][c.req.routeIndex][1][pattern[1]];
			length += value.length + 1;
		} else if (pattern || part.endsWith("*")) {
			const end = path.indexOf("/", length + 1);
			length = end === -1 ? path.length : end;
		} else length += part.length + 1;
	}
	return length;
};
var createMountedRequest = (c, pathPrefix, routePath) => {
	if (/[^/]\*$/.test(routePath)) throw new Error(`mount(): Wildcard must follow "/" in "${routePath}".`);
	const prefixLength = getPathPrefixLength(c, pathPrefix, routePath);
	const path = c.req.path.slice(prefixLength) || "/";
	if (prefixLength > c.req.path.length || path[0] !== "/" || /\/(?:\.|%2e){1,2}(?:\/|$)/i.test(path)) throw new HTTPException(400, { message: "Invalid mounted path" });
	const rawUrl = c.req.raw.url;
	if (/^[^/?#]*\/\/[^/?#\\]*[?#\\]/.test(rawUrl)) throw new HTTPException(400, { message: "Invalid mounted path" });
	const rawPathEnd = rawUrl.search(/[?#]/);
	const rawTrailingSlashes = countTrailingSlashes(rawPathEnd === -1 ? rawUrl : rawUrl.slice(0, rawPathEnd));
	if (rawTrailingSlashes > 1 && countTrailingSlashes(c.req.path) === rawTrailingSlashes - 1) throw new HTTPException(400, { message: "Invalid mounted path" });
	const url = new URL(rawUrl);
	url.pathname = path.replace(/[\\\t\n\r]/g, encodeURIComponent);
	if (path.includes("%")) {}
	return new Request(url, c.req.raw);
};
// node_modules/hono/dist/hono-base.js
/**
* @module
* This module is the base module for the Hono object.
*/
var notFoundHandler = (c) => {
	return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
	if ("getResponse" in err) {
		const res = err.getResponse();
		return c.newResponse(res.body, res);
	}
	console.error(err);
	return c.text("Internal Server Error", 500);
};
var Hono$1 = class Hono {
	get;
	post;
	put;
	delete;
	options;
	patch;
	query;
	all;
	on;
	use;
	router;
	getPath;
	_basePath = "/";
	#path = "/";
	routes = [];
	constructor(options = {}) {
		[...METHODS, "all"].forEach((method) => {
			this[method] = (args1, ...args) => {
				const methodName = method.toUpperCase();
				if (typeof args1 === "string") this.#path = args1;
				else this.#addRoute(methodName, this.#path, args1);
				args.forEach((handler) => {
					this.#addRoute(methodName, this.#path, handler);
				});
				return this;
			};
		});
		this.on = (method, path, ...handlers) => {
			for (const p of [path].flat()) {
				this.#path = p;
				for (const m of [method].flat()) {
					const methodName = m.toUpperCase();
					for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
				}
			}
			return this;
		};
		this.use = (arg1, ...handlers) => {
			if (typeof arg1 === "string") this.#path = arg1;
			else {
				this.#path = "*";
				handlers.unshift(arg1);
			}
			handlers.forEach((handler) => {
				this.#addRoute("ALL", this.#path, handler);
			});
			return this;
		};
		const { strict, ...optionsWithoutStrict } = options;
		Object.assign(this, optionsWithoutStrict);
		this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
	}
	#clone() {
		const clone = new Hono({
			router: this.router,
			getPath: this.getPath
		});
		clone.errorHandler = this.errorHandler;
		clone.#notFoundHandler = this.#notFoundHandler;
		clone.routes = this.routes;
		return clone;
	}
	#notFoundHandler = notFoundHandler;
	errorHandler = errorHandler;
	/**
	* `.route()` allows grouping other Hono instance in routes.
	*
	* @see {@link https://hono.dev/docs/api/routing#grouping}
	*
	* @param {string} path - base Path
	* @param {Hono} app - other Hono instance
	* @returns {Hono} routed Hono instance
	*
	* @example
	* ```ts
	* const app = new Hono()
	* const app2 = new Hono()
	*
	* app2.get("/user", (c) => c.text("user"))
	* app.route("/api", app2) // GET /api/user
	* ```
	*/
	route(path, app) {
		const subApp = this.basePath(path);
		app.routes.map((r) => {
			let handler;
			if (app.errorHandler === errorHandler) handler = r.handler;
			else {
				handler = async (c, next) => (await compose([], app.errorHandler)(c, () => r.handler(c, next))).res;
				handler[COMPOSED_HANDLER] = r.handler;
			}
			subApp.#addRoute(r.method, r.path, handler, r.basePath);
		});
		return this;
	}
	/**
	* `.basePath()` allows base paths to be specified.
	*
	* @see {@link https://hono.dev/docs/api/routing#base-path}
	*
	* @param {string} path - base Path
	* @returns {Hono} changed Hono instance
	*
	* @example
	* ```ts
	* const api = new Hono().basePath('/api')
	* ```
	*/
	basePath(path) {
		const subApp = this.#clone();
		subApp._basePath = mergePath(this._basePath, path);
		return subApp;
	}
	/**
	* `.onError()` handles an error and returns a customized Response.
	*
	* @see {@link https://hono.dev/docs/api/hono#error-handling}
	*
	* @param {ErrorHandler} handler - request Handler for error
	* @returns {Hono} changed Hono instance
	*
	* @example
	* ```ts
	* app.onError((err, c) => {
	*   console.error(`${err}`)
	*   return c.text('Custom Error Message', 500)
	* })
	* ```
	*/
	onError = (handler) => {
		this.errorHandler = handler;
		return this;
	};
	/**
	* `.notFound()` allows you to customize a Not Found Response.
	*
	* @see {@link https://hono.dev/docs/api/hono#not-found}
	*
	* @param {NotFoundHandler} handler - request handler for not-found
	* @returns {Hono} changed Hono instance
	*
	* @example
	* ```ts
	* app.notFound((c) => {
	*   return c.text('Custom 404 Message', 404)
	* })
	* ```
	*/
	notFound = (handler) => {
		this.#notFoundHandler = handler;
		return this;
	};
	/**
	* `.mount()` allows you to mount applications built with other frameworks into your Hono application.
	*
	* @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
	*
	* @see {@link https://hono.dev/docs/api/hono#mount}
	*
	* @param {string} path - base Path
	* @param {Function} applicationHandler - other Request Handler
	* @param {MountOptions} [options] - options of `.mount()`
	* @returns {Hono} mounted Hono instance
	* @throws {Error} If automatic request rewriting encounters duplicate path parameter names or an optional regular expression parameter.
	* @throws {HTTPException} With status 400 if automatic request rewriting cannot safely preserve the routed path.
	*
	* @example
	* ```ts
	* import { Router as IttyRouter } from 'itty-router'
	* import { Hono } from 'hono'
	* // Create itty-router application
	* const ittyRouter = IttyRouter()
	* // GET /itty-router/hello
	* ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
	*
	* const app = new Hono()
	* app.mount('/itty-router', ittyRouter.handle)
	* ```
	*
	* @example
	* ```ts
	* const app = new Hono()
	* // Send the request to another application without modification.
	* app.mount('/app', anotherApp, {
	*   replaceRequest: (req) => req,
	* })
	* ```
	*/
	mount(path, applicationHandler, options) {
		let replaceRequest;
		let optionHandler;
		if (options) {
			if (typeof options === "function") optionHandler = options;
			else {
				optionHandler = options.optionHandler;
				if (options.replaceRequest === false) replaceRequest = (request) => request;
				else replaceRequest = options.replaceRequest;
			}
		}
		const getOptions = optionHandler ? (c) => {
			const options = optionHandler(c);
			return Array.isArray(options) ? options : [options];
		} : (c) => {
			let executionContext = void 0;
			try {
				executionContext = c.executionCtx;
			} catch {}
			return [c.env, executionContext];
		};
		const defaultReplaceRequest = (c) => {
			const mountedRoutePath = routePath(c);
			return createMountedRequest(c, mountedRoutePath.replace(/\/?\*$/, ""), mountedRoutePath);
		};
		const handler = async (c, next) => {
			const res = await applicationHandler(replaceRequest ? replaceRequest(c.req.raw) : defaultReplaceRequest(c), ...getOptions(c));
			if (res) return res;
			await next();
		};
		this.#addRoute("ALL", mergePath(path, "*"), handler);
		return this;
	}
	#addRoute(method, path, handler, baseRoutePath) {
		path = mergePath(this._basePath, path);
		const r = {
			basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
			path,
			method,
			handler
		};
		this.router.add(method, path, [handler, r]);
		this.routes.push(r);
	}
	#handleError(err, c) {
		if (err instanceof Error) return this.errorHandler(err, c);
		throw err;
	}
	#dispatch(request, executionCtx, env, method) {
		if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
		const path = this.getPath(request, { env });
		const matchResult = this.router.match(method, path);
		const c = new Context(request, {
			path,
			matchResult,
			env,
			executionCtx,
			notFoundHandler: this.#notFoundHandler
		});
		if (matchResult[0].length === 1) {
			let res;
			try {
				res = matchResult[0][0][0][0](c, async () => {
					c.res = await this.#notFoundHandler(c);
				});
			} catch (err) {
				return this.#handleError(err, c);
			}
			return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
		}
		const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
		return (async () => {
			try {
				const context = await composed(c);
				if (!context.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
				return context.res;
			} catch (err) {
				return this.#handleError(err, c);
			}
		})();
	}
	/**
	* `.fetch()` will be entry point of your app.
	*
	* @see {@link https://hono.dev/docs/api/hono#fetch}
	*
	* @param {Request} request - request Object of request
	* @param {Env} env - env Object
	* @param {ExecutionContext} executionCtx - context of execution
	* @returns {Response | Promise<Response>} response of request
	*
	*/
	fetch = (request, ...rest) => {
		return this.#dispatch(request, rest[1], rest[0], request.method);
	};
	/**
	* `.request()` is a useful method for testing.
	* You can pass a URL or pathname to send a GET request.
	* app will return a Response object.
	* ```ts
	* test('GET /hello is ok', async () => {
	*   const res = await app.request('/hello')
	*   expect(res.status).toBe(200)
	* })
	* ```
	* @see https://hono.dev/docs/api/hono#request
	*/
	request = (input, requestInit, Env, executionCtx) => {
		if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
		input = input.toString();
		return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
	};
	/**
	* `.fire()` automatically adds a global fetch event listener.
	* This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
	* @deprecated
	* Use `fire` from `hono/service-worker` instead.
	* ```ts
	* import { Hono } from 'hono'
	* import { fire } from 'hono/service-worker'
	*
	* const app = new Hono()
	* // ...
	* fire(app)
	* ```
	* @see https://hono.dev/docs/api/hono#fire
	* @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
	* @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
	*/
	fire = () => {
		addEventListener("fetch", (event) => {
			event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
		});
	};
};
// node_modules/hono/dist/router/utils.js
var createNullObject = () => Object.create(null);
// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
	const matchers = this.buildAllMatchers();
	const match = ((method, path) => {
		const matcher = matchers[method] || matchers["ALL"];
		const staticMatch = matcher[2][path];
		if (staticMatch) return staticMatch;
		const match = path.match(matcher[0]);
		if (!match) return [[], emptyParam];
		const index = match.indexOf("", 1);
		return [matcher[1][index], match];
	});
	this.match = match;
	return match(method, path);
}
// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = "[^]*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/[^]*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
/**
* Sort order:
* 1. literal
* 2. special pattern (e.g. :label{[0-9]+})
* 3. common label pattern (e.g. :label)
* 4. wildcard
*/
function compareKey(a, b) {
	if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
	if (b.length === 1) return 1;
	if (a === "[^]*" || a === "(?:|/[^]*)") return b === "[^]*" ? -1 : 1;
	else if (b === "[^]*" || b === "(?:|/[^]*)") return -1;
	if (a === "[^/]+") return 1;
	else if (b === "[^/]+") return -1;
	return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node$1 = class Node {
	#index;
	#varIndex;
	#children = createNullObject();
	insert(tokens, index, paramMap, context, keys) {
		let node = this;
		for (let i = 0, len = tokens.length; i < len; i++) {
			const token = tokens[i];
			const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
				"",
				"",
				ONLY_WILDCARD_REG_EXP_STR
			] : [
				"",
				"",
				LABEL_REG_EXP_STR
			] : null : token === "/*" ? [
				"",
				"",
				TAIL_WILDCARD_REG_EXP_STR
			] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
			let nextNode;
			if (pattern) {
				const name = pattern[1];
				let regexpStr = pattern[2] || "[^/]+";
				if (name && pattern[2]) {
					if (new RegExp(regexpStr).test("")) throw PATH_ERROR;
					regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
					if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
					if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
				}
				keys.push(regexpStr);
				nextNode = node.#children[regexpStr];
				if (!nextNode) {
					if (regexpStr !== "[^]*" && regexpStr !== "(?:|/[^]*)") {
						for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
					}
					nextNode = node.#children[regexpStr] = new Node();
				}
				if (name !== "") {
					nextNode.#varIndex ??= context.varIndex++;
					paramMap.push([name, nextNode.#varIndex]);
				}
			} else {
				keys.push(token);
				nextNode = node.#children[token];
				if (!nextNode) {
					for (const k in node.#children) if (k.length > 1 && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
					nextNode = node.#children[token] = new Node();
				}
			}
			node = nextNode;
		}
		if (node.#index !== void 0) throw PATH_ERROR;
		node.#index = index;
	}
	buildRegExpStr() {
		const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
			const c = this.#children[k];
			const childStr = c.buildRegExpStr();
			return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
		}).filter(Boolean);
		if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
		if (strList.length === 0) return "";
		if (strList.length === 1) return strList[0];
		return "(?:" + strList.join("|") + ")";
	}
};
// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
	#context = { varIndex: 0 };
	#root = new Node$1();
	#index = 0;
	paths = createNullObject();
	insert(path, isStatic) {
		const keys = [];
		if (isStatic) {
			this.#root.insert(path.split(""), -1, [], this.#context, keys);
			this.paths[path] = [
				-1,
				[],
				keys
			];
			return;
		}
		const paramAssoc = [];
		const groups = [];
		let markedPath = path;
		for (let i = 0;;) {
			let replaced = false;
			markedPath = markedPath.replace(/\{(?:\{[\d,]+\}|[^}])+\}/g, (m) => {
				const mark = `@\\${i}`;
				groups[i] = [mark, m];
				i++;
				replaced = true;
				return mark;
			});
			if (!replaced) break;
		}
		/**
		*  - pattern (:label, :label{0-9]+}, ...)
		*  - /* wildcard
		*  - character
		*/
		const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./gs) || [];
		for (let i = groups.length - 1; i >= 0; i--) {
			const [mark] = groups[i];
			for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
				tokens[j] = tokens[j].replace(mark, groups[i][1]);
				break;
			}
		}
		this.#root.insert(tokens, this.#index, paramAssoc, this.#context, keys);
		this.paths[path] = [
			this.#index++,
			paramAssoc,
			keys
		];
	}
	buildRegExp() {
		let regexp = this.#root.buildRegExpStr();
		if (regexp === "") return [
			/^$/,
			[],
			[]
		];
		let captureIndex = 0;
		const indexReplacementMap = [];
		const paramReplacementMap = [];
		regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
			if (handlerIndex !== void 0) {
				indexReplacementMap[++captureIndex] = Number(handlerIndex);
				return "$()";
			}
			if (paramIndex !== void 0) {
				paramReplacementMap[Number(paramIndex)] = ++captureIndex;
				return "";
			}
			return "";
		});
		return [
			new RegExp(`^${regexp}`),
			indexReplacementMap,
			paramReplacementMap
		];
	}
};
// node_modules/hono/dist/router/reg-exp-router/router.js
function endsWithWildcard(keys) {
	const tail = keys[keys.length - 1];
	return tail === "[^]*" || tail === "(?:|/[^]*)";
}
function covers(wildcard, target) {
	const last = wildcard.length - 1;
	for (let i = 0; i < last; i++) if (wildcard[i] !== target[i]) return false;
	return wildcard[last] === "[^]*" || target.length === last || target[last] === "/";
}
var RegExpRouter = class {
	name = "RegExpRouter";
	#handlers;
	#tries;
	constructor() {
		this.#handlers = { ["ALL"]: [] };
		this.#tries = { ["ALL"]: new Trie() };
	}
	#insertPath(method, path) {
		try {
			this.#tries[method].insert(path, !/\*|\/:/.test(path));
		} catch (e) {
			throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
		}
	}
	add(method, path, handler) {
		const handlers = this.#handlers;
		if (!handlers) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
		const tries = this.#tries;
		if (!handlers[method]) {
			tries[method] = new Trie();
			handlers[method] = [...handlers["ALL"]];
			for (const p in tries["ALL"].paths) this.#insertPath(method, p);
		}
		if (path === "/*") path = "*";
		const methods = method === "ALL" ? Object.keys(handlers) : [method];
		const paths = checkOptionalParameter(path) || [path];
		for (const path of paths) for (const m of methods) {
			if (!tries[m].paths[path]) this.#insertPath(m, path);
			handlers[m].push([handler, path]);
		}
	}
	match = match;
	buildAllMatchers() {
		const matchers = createNullObject();
		for (const method of Object.keys(this.#handlers)) matchers[method] = this.#buildMatcher(method);
		this.#handlers = this.#tries = void 0;
		return matchers;
	}
	#buildMatcher(method) {
		const handlers = this.#handlers[method];
		const trie = this.#tries[method];
		const staticMap = createNullObject();
		const handlerData = [];
		const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
		const own = createNullObject();
		const entries = handlers.map(([h, p], i) => {
			(own[p] ??= []).push(i);
			return [h, trie.paths[p][1].reduceRight((map, [key, varIndex]) => {
				map[key] = paramReplacementMap[varIndex];
				return map;
			}, createNullObject())];
		});
		const wildcards = Object.keys(own).filter((p) => endsWithWildcard(trie.paths[p][2]));
		for (const path in trie.paths) {
			const [index, , keys] = trie.paths[path];
			const indexes = [...own[path]];
			for (const p of wildcards) if (p !== path && covers(trie.paths[p][2], keys)) indexes.push(...own[p]);
			const data = indexes.sort((a, b) => a - b).map((i) => entries[i]);
			if (index === -1) {
				const last = Math.max(-1, ...data.flatMap(([, map]) => Object.values(map)));
				staticMap[path] = [data, last === -1 ? emptyParam : path.match(regexp).slice(0, last + 1)];
			} else handlerData[index] = data;
		}
		return [
			regexp,
			indexReplacementMap.map((i) => handlerData[i]),
			staticMap
		];
	}
};
// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
	name = "SmartRouter";
	#routers = [];
	#routes = [];
	constructor(init) {
		this.#routers = init.routers;
	}
	add(method, path, handler) {
		if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
		this.#routes.push([
			method,
			path,
			handler
		]);
	}
	match(method, path) {
		if (!this.#routes) throw new Error("Fatal error");
		const routers = this.#routers;
		const routes = this.#routes;
		const len = routers.length;
		let i = 0;
		let res;
		for (; i < len; i++) {
			const router = routers[i];
			try {
				for (let i = 0, len = routes.length; i < len; i++) router.add(...routes[i]);
				res = router.match(method, path);
			} catch (e) {
				if (e instanceof UnsupportedPathError) continue;
				throw e;
			}
			this.match = router.match.bind(router);
			this.#routers = [router];
			this.#routes = void 0;
			break;
		}
		if (i === len) throw new Error("Fatal error");
		this.name = `SmartRouter + ${this.activeRouter.name}`;
		return res;
	}
	get activeRouter() {
		if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
		return this.#routers[0];
	}
};
// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node = class Node {
	#methods = [];
	#children = createNullObject();
	#patterns = [];
	#pattern;
	#params = emptyParams;
	insert(method, path, handler) {
		let curNode = this;
		const parts = splitRoutingPath(path);
		const possibleKeys = /* @__PURE__ */ new Set();
		let i = 0;
		for (const p of parts) {
			const nextP = parts[++i];
			const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
			const isParam = Array.isArray(pattern);
			const key = isParam ? pattern[0] : pattern || p;
			const child = curNode.#children[key] ||= new Node();
			if (pattern && !child.#pattern) {
				child.#pattern = pattern;
				curNode.#patterns.push(child);
			}
			curNode = child;
			if (isParam) possibleKeys.add(pattern[1]);
		}
		curNode.#methods.push({ [method]: {
			handler,
			possibleKeys: [...possibleKeys],
			score: ++order
		} });
	}
	#pushHandlerSets(handlerSets, node, method, nodeParams, params) {
		for (let i = 0, len = node.#methods.length; i < len; i++) {
			const m = node.#methods[i];
			const handlerSet = m[method] || m["ALL"];
			if (handlerSet) {
				handlerSet.params = createNullObject();
				handlerSets.push(handlerSet);
				for (let i = 0, len = handlerSet.possibleKeys.length; i < len; i++) {
					const key = handlerSet.possibleKeys[i];
					handlerSet.params[key] = params?.[key] && !i ? params[key] : nodeParams[key] ?? params?.[key];
				}
			}
		}
	}
	search(method, path) {
		const handlerSets = [];
		this.#params = emptyParams;
		let curNodes = [this];
		const parts = splitPath(path);
		const curNodesQueue = [];
		const len = parts.length;
		let partOffsets = null;
		for (let i = 0; i < len; i++) {
			const part = parts[i];
			const isLast = i === len - 1;
			const tempNodes = [];
			for (let j = 0, len2 = curNodes.length; j < len2; j++) {
				const node = curNodes[j];
				const nextNode = node.#children[part];
				if (nextNode) {
					nextNode.#params = node.#params;
					if (isLast) {
						if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
						this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
					} else tempNodes.push(nextNode);
				}
				for (const child of node.#patterns) {
					const pattern = child.#pattern;
					const params = node.#params === emptyParams ? {} : { ...node.#params };
					if (typeof pattern === "string") {
						if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
							this.#pushHandlerSets(handlerSets, child, method, node.#params);
							if (pattern === "*") {
								child.#params = params;
								tempNodes.push(child);
							}
						}
						continue;
					}
					const [, name, matcher] = pattern;
					if (!part && matcher === true) continue;
					if (matcher !== true) {
						if (!partOffsets) {
							partOffsets = [];
							let offset = path[0] === "/" ? 1 : 0;
							for (let p = 0; p < len; p++) {
								partOffsets[p] = offset;
								offset += parts[p].length + 1;
							}
						}
						const restPathString = path.slice(partOffsets[i]);
						const m = matcher.exec(restPathString);
						if (m) {
							if (!Object.hasOwn(params, name)) params[name] = m[0];
							this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
							if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
							for (const _ in child.#children) {
								child.#params = params;
								const componentCount = m[0].match(/\//g)?.length ?? 0;
								(curNodesQueue[componentCount] ||= []).push(child);
								break;
							}
							continue;
						}
					}
					if (matcher === true || matcher.test(part)) {
						if (!Object.hasOwn(params, name)) params[name] = part;
						if (isLast) {
							this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
							if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
						} else {
							child.#params = params;
							tempNodes.push(child);
						}
					}
				}
			}
			const shifted = curNodesQueue.shift();
			curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
		}
		if (handlerSets[1]) handlerSets.sort((a, b) => {
			return a.score - b.score;
		});
		return [handlerSets.map(({ handler, params }) => [handler, params])];
	}
};
// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
	name = "TrieRouter";
	#node = new Node();
	add(method, path, handler) {
		for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler);
	}
	match(method, path) {
		return this.#node.search(method, path);
	}
};
// node_modules/hono/dist/hono.js
/**
* The Hono class extends the functionality of the HonoBase class.
* It sets up routing and allows for custom options to be passed.
*
* @template E - The environment type.
* @template S - The schema type.
* @template BasePath - The base path type.
*/
var Hono = class extends Hono$1 {
	/**
	* Creates an instance of the Hono class.
	*
	* @param options - Optional configuration options for the Hono instance.
	*/
	constructor(options = {}) {
		super(options);
		this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
	}
};
// node_modules/hono/dist/middleware/secure-headers/secure-headers.js
var HEADERS_MAP = {
	crossOriginEmbedderPolicy: ["Cross-Origin-Embedder-Policy", "require-corp"],
	crossOriginResourcePolicy: ["Cross-Origin-Resource-Policy", "same-origin"],
	crossOriginOpenerPolicy: ["Cross-Origin-Opener-Policy", "same-origin"],
	originAgentCluster: ["Origin-Agent-Cluster", "?1"],
	referrerPolicy: ["Referrer-Policy", "no-referrer"],
	strictTransportSecurity: ["Strict-Transport-Security", "max-age=15552000; includeSubDomains"],
	xContentTypeOptions: ["X-Content-Type-Options", "nosniff"],
	xDnsPrefetchControl: ["X-DNS-Prefetch-Control", "off"],
	xDownloadOptions: ["X-Download-Options", "noopen"],
	xFrameOptions: ["X-Frame-Options", "SAMEORIGIN"],
	xPermittedCrossDomainPolicies: ["X-Permitted-Cross-Domain-Policies", "none"],
	xXssProtection: ["X-XSS-Protection", "0"]
};
var DEFAULT_OPTIONS = {
	crossOriginEmbedderPolicy: false,
	crossOriginResourcePolicy: true,
	crossOriginOpenerPolicy: true,
	originAgentCluster: true,
	referrerPolicy: true,
	strictTransportSecurity: true,
	xContentTypeOptions: true,
	xDnsPrefetchControl: true,
	xDownloadOptions: true,
	xFrameOptions: true,
	xPermittedCrossDomainPolicies: true,
	xXssProtection: true,
	removePoweredBy: true,
	permissionsPolicy: {}
};
/**
* Secure Headers Middleware for Hono.
*
* @see {@link https://hono.dev/docs/middleware/builtin/secure-headers}
*
* @param {Partial<SecureHeadersOptions>} [customOptions] - The options for the secure headers middleware.
* @param {ContentSecurityPolicyOptions} [customOptions.contentSecurityPolicy] - Settings for the Content-Security-Policy header.
* @param {ContentSecurityPolicyOptions} [customOptions.contentSecurityPolicyReportOnly] - Settings for the Content-Security-Policy-Report-Only header.
* @param {overridableHeader} [customOptions.crossOriginEmbedderPolicy=false] - Settings for the Cross-Origin-Embedder-Policy header.
* @param {overridableHeader} [customOptions.crossOriginResourcePolicy=true] - Settings for the Cross-Origin-Resource-Policy header.
* @param {overridableHeader} [customOptions.crossOriginOpenerPolicy=true] - Settings for the Cross-Origin-Opener-Policy header.
* @param {overridableHeader} [customOptions.originAgentCluster=true] - Settings for the Origin-Agent-Cluster header.
* @param {overridableHeader} [customOptions.referrerPolicy=true] - Settings for the Referrer-Policy header.
* @param {ReportingEndpointOptions[]} [customOptions.reportingEndpoints] - Settings for the Reporting-Endpoints header.
* @param {ReportToOptions[]} [customOptions.reportTo] - Settings for the Report-To header.
* @param {overridableHeader} [customOptions.strictTransportSecurity=true] - Settings for the Strict-Transport-Security header.
* @param {overridableHeader} [customOptions.xContentTypeOptions=true] - Settings for the X-Content-Type-Options header.
* @param {overridableHeader} [customOptions.xDnsPrefetchControl=true] - Settings for the X-DNS-Prefetch-Control header.
* @param {overridableHeader} [customOptions.xDownloadOptions=true] - Settings for the X-Download-Options header.
* @param {overridableHeader} [customOptions.xFrameOptions=true] - Settings for the X-Frame-Options header.
* @param {overridableHeader} [customOptions.xPermittedCrossDomainPolicies=true] - Settings for the X-Permitted-Cross-Domain-Policies header.
* @param {overridableHeader} [customOptions.xXssProtection=true] - Settings for the X-XSS-Protection header.
* @param {boolean} [customOptions.removePoweredBy=true] - Settings for remove X-Powered-By header.
* @param {PermissionsPolicyOptions} [customOptions.permissionsPolicy] - Settings for the Permissions-Policy header.
* @returns {MiddlewareHandler} The middleware handler function.
*
* @example
* ```ts
* const app = new Hono()
* app.use(secureHeaders())
* ```
*/
var secureHeaders = (customOptions) => {
	const options = {
		...DEFAULT_OPTIONS,
		...customOptions
	};
	const headersToSet = getFilteredHeaders(options);
	const callbacks = [];
	if (options.contentSecurityPolicy) {
		const [callback, value] = getCSPDirectives(options.contentSecurityPolicy, "Content-Security-Policy");
		if (callback) callbacks.push(callback);
		headersToSet.push(["Content-Security-Policy", value]);
	}
	if (options.contentSecurityPolicyReportOnly) {
		const [callback, value] = getCSPDirectives(options.contentSecurityPolicyReportOnly, "Content-Security-Policy-Report-Only");
		if (callback) callbacks.push(callback);
		headersToSet.push(["Content-Security-Policy-Report-Only", value]);
	}
	if (options.permissionsPolicy && Object.keys(options.permissionsPolicy).length > 0) headersToSet.push(["Permissions-Policy", getPermissionsPolicyDirectives(options.permissionsPolicy)]);
	if (options.reportingEndpoints) headersToSet.push(["Reporting-Endpoints", getReportingEndpoints(options.reportingEndpoints)]);
	if (options.reportTo) headersToSet.push(["Report-To", getReportToOptions(options.reportTo)]);
	return async function secureHeaders(ctx, next) {
		const headersToSetForReq = callbacks.length === 0 ? headersToSet : callbacks.reduce((acc, cb) => cb(ctx, acc), headersToSet);
		await next();
		setHeaders(ctx, headersToSetForReq);
		if (options?.removePoweredBy) ctx.res.headers.delete("X-Powered-By");
	};
};
function getFilteredHeaders(options) {
	return Object.entries(HEADERS_MAP).filter(([key]) => options[key]).map(([key, defaultValue]) => {
		const overrideValue = options[key];
		return typeof overrideValue === "string" ? [defaultValue[0], overrideValue] : defaultValue;
	});
}
function getCSPDirectives(contentSecurityPolicy, headerName) {
	const callbacks = [];
	const resultValues = [];
	for (const [directive, value] of Object.entries(contentSecurityPolicy)) {
		const valueArray = Array.isArray(value) ? value : [value];
		valueArray.forEach((value, i) => {
			if (typeof value === "function") {
				const index = i * 2 + 2 + resultValues.length;
				callbacks.push((ctx, values) => {
					values[index] = value(ctx, directive);
				});
			}
		});
		resultValues.push(directive.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (match, offset) => offset ? "-" + match.toLowerCase() : match.toLowerCase()), ...valueArray.flatMap((value) => [" ", value]), "; ");
	}
	resultValues.pop();
	return callbacks.length === 0 ? [void 0, resultValues.join("")] : [(ctx, headersToSet) => headersToSet.map((values) => {
		if (values[0] === headerName) {
			const clone = values[1].slice();
			callbacks.forEach((cb) => {
				cb(ctx, clone);
			});
			return [values[0], clone.join("")];
		} else return values;
	}), resultValues];
}
function getPermissionsPolicyDirectives(policy) {
	return Object.entries(policy).map(([directive, value]) => {
		const kebabDirective = camelToKebab(directive);
		if (typeof value === "boolean") return `${kebabDirective}=${value ? "*" : "()"}`;
		if (Array.isArray(value)) {
			if (value.length === 0) return `${kebabDirective}=()`;
			if (value.length === 1 && value[0] === "*") return `${kebabDirective}=*`;
			if (value.length === 1 && value[0] === "none") return `${kebabDirective}=()`;
			return `${kebabDirective}=(${value.map((item) => ["self", "src"].includes(item) ? item : `"${item}"`).join(" ")})`;
		}
		return "";
	}).filter(Boolean).join(", ");
}
function camelToKebab(str) {
	return str.replace(/([a-z\d])([A-Z])/g, "$1-$2").toLowerCase();
}
function getReportingEndpoints(reportingEndpoints = []) {
	return reportingEndpoints.map((endpoint) => `${endpoint.name}="${endpoint.url}"`).join(", ");
}
function getReportToOptions(reportTo = []) {
	return reportTo.map((option) => JSON.stringify(option)).join(", ");
}
function setHeaders(ctx, headersToSet) {
	headersToSet.forEach(([header, value]) => {
		ctx.res.headers.set(header, value);
	});
}
// node_modules/hono/dist/utils/cookie.js
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var relaxedCookieNameRegEx = /^[!#-:<>-[\]-~]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var trimCookieWhitespace = (value) => {
	let start = 0;
	let end = value.length;
	while (start < end) {
		const charCode = value.charCodeAt(start);
		if (charCode !== 32 && charCode !== 9) break;
		start++;
	}
	while (end > start) {
		const charCode = value.charCodeAt(end - 1);
		if (charCode !== 32 && charCode !== 9) break;
		end--;
	}
	return start === 0 && end === value.length ? value : value.slice(start, end);
};
var parse = (cookie, name) => {
	if (name && cookie.indexOf(name) === -1) return {};
	const pairs = cookie.split(";");
	const parsedCookie = Object.create(null);
	for (const pairStr of pairs) {
		const valueStartPos = pairStr.indexOf("=");
		if (valueStartPos === -1) continue;
		const cookieName = trimCookieWhitespace(pairStr.substring(0, valueStartPos));
		if (name && name !== cookieName || !relaxedCookieNameRegEx.test(cookieName) || cookieName in parsedCookie) continue;
		let cookieValue = trimCookieWhitespace(pairStr.substring(valueStartPos + 1));
		if (cookieValue.startsWith("\"") && cookieValue.endsWith("\"")) cookieValue = cookieValue.slice(1, -1);
		if (validCookieValueRegEx.test(cookieValue)) {
			parsedCookie[cookieName] = tryDecodeURIComponent(cookieValue);
			if (name) break;
		}
	}
	return parsedCookie;
};
var _serialize = (name, value, opt = {}) => {
	if (!validCookieNameRegEx.test(name)) throw new Error("Invalid cookie name");
	let cookie = `${name}=${value}`;
	if (/^__secure-/i.test(name) && !opt.secure) throw new Error("__Secure- Cookie must have Secure attributes");
	if (/^__host-/i.test(name)) {
		if (!opt.secure) throw new Error("__Host- Cookie must have Secure attributes");
		if (opt.path !== "/") throw new Error("__Host- Cookie must have Path attributes with \"/\"");
		if (opt.domain) throw new Error("__Host- Cookie must not have Domain attributes");
	}
	for (const key of [
		"domain",
		"path",
		"sameSite",
		"priority"
	]) if (opt[key] && /[;\r\n]/.test(opt[key])) throw new Error(`${key} must not contain ";", "\\r", or "\\n"`);
	if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
		if (opt.maxAge > 3456e4) throw new Error("Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.");
		cookie += `; Max-Age=${opt.maxAge | 0}`;
	}
	if (opt.domain && opt.prefix !== "host") cookie += `; Domain=${opt.domain}`;
	if (opt.path) cookie += `; Path=${opt.path}`;
	if (opt.expires) {
		if (opt.expires.getTime() - Date.now() > 3456e7) throw new Error("Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.");
		cookie += `; Expires=${opt.expires.toUTCString()}`;
	}
	if (opt.httpOnly) cookie += "; HttpOnly";
	if (opt.secure) cookie += "; Secure";
	if (opt.sameSite) cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
	if (opt.priority) cookie += `; Priority=${opt.priority.charAt(0).toUpperCase() + opt.priority.slice(1)}`;
	if (opt.partitioned) {
		if (!opt.secure) throw new Error("Partitioned Cookie must have Secure attributes");
		cookie += "; Partitioned";
	}
	return cookie;
};
var serialize = (name, value, opt) => {
	value = encodeURIComponent(value);
	return _serialize(name, value, opt);
};
// node_modules/hono/dist/helper/cookie/index.js
var getCookie = (c, key, prefix) => {
	const cookie = c.req.raw.headers.get("Cookie");
	if (typeof key === "string") {
		if (!cookie) return;
		let finalKey = key;
		if (prefix === "secure") finalKey = "__Secure-" + key;
		else if (prefix === "host") finalKey = "__Host-" + key;
		return parse(cookie, finalKey)[finalKey];
	}
	if (!cookie) return {};
	return parse(cookie);
};
var generateCookie = (name, value, opt) => {
	let cookie;
	if (opt?.prefix === "secure") cookie = serialize("__Secure-" + name, value, {
		path: "/",
		...opt,
		secure: true
	});
	else if (opt?.prefix === "host") cookie = serialize("__Host-" + name, value, {
		...opt,
		path: "/",
		secure: true,
		domain: void 0
	});
	else cookie = serialize(name, value, {
		path: "/",
		...opt
	});
	return cookie;
};
var setCookie = (c, name, value, opt) => {
	const cookie = generateCookie(name, value, opt);
	c.header("Set-Cookie", cookie, { append: true });
};
var deleteCookie = (c, name, opt) => {
	const deletedCookie = getCookie(c, name, opt?.prefix);
	setCookie(c, name, "", {
		...opt,
		maxAge: 0
	});
	return deletedCookie;
};
// apps/worker/auth.ts
var COOKIE = "__Host-review_trial";
var encoder = new TextEncoder();
var SESSION_TTL = 288e5;
async function digest(value) {
	return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function trialAuthenticated(c) {
	const code = c.env?.TEST_ACCESS_CODE;
	const token = getCookie(c, COOKIE);
	if (!code || code.length < 24 || !token || !/^[a-f0-9]{64}$/.test(token)) return false;
	return !!await c.env.DB.prepare("SELECT expires_at FROM trial_sessions WHERE token_hash = ? AND access_key_hash = ? AND expires_at > ?").bind(await digest(token), await digest(code), Date.now()).first();
}
function sameOrigin(c) {
	return c.req.header("Origin") === new URL(c.req.url).origin;
}
async function loginTrial(c) {
	if (!sameOrigin(c)) return c.json({ error: "ORIGIN_REFUSED" }, 403);
	const code = c.env?.TEST_ACCESS_CODE;
	if (!code || code.length < 24) return c.json({ error: "TRIAL_NOT_CONFIGURED" }, 503);
	const reader = c.req.raw.body?.getReader();
	if (!reader) return c.json({ error: "INVALID_REQUEST" }, 400);
	const chunks = [];
	let length = 0;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			length += value.byteLength;
			if (length > 1024) {
				await reader.cancel();
				return c.json({ error: "REQUEST_TOO_LARGE" }, 413);
			}
			chunks.push(value);
		}
		const body = new Uint8Array(length);
		let offset = 0;
		for (const chunk of chunks) {
			body.set(chunk, offset);
			offset += chunk.byteLength;
		}
		const parsed = JSON.parse(new TextDecoder().decode(body));
		const input = typeof parsed === "object" && parsed !== null && "code" in parsed && typeof parsed.code === "string" ? parsed.code : "";
		const now = Date.now();
		const key = await digest(`${c.req.header("CF-Connecting-IP") ?? "local"}:${Math.floor(now / 6e5)}`);
		const previous = await c.env.DB.prepare("SELECT attempts FROM trial_login_limits WHERE bucket=?").bind(key).first();
		if (previous && previous.attempts >= 8) return c.json({ error: "RATE_LIMITED" }, 429, { "Retry-After": "600" });
		const limit = await c.env.DB.prepare("INSERT INTO trial_login_limits(bucket, attempts, expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 WHERE trial_login_limits.attempts<8 RETURNING attempts").bind(key, now + 6e5).first();
		if (!limit || limit.attempts > 8) return c.json({ error: "RATE_LIMITED" }, 429, { "Retry-After": "600" });
		const actual = await digest(input);
		const expected = await digest(code);
		let mismatch = 0;
		for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
		if (mismatch !== 0) return c.json({ error: "INVALID_CODE" }, 401);
		const token = Array.from(crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
		await c.env.DB.prepare("INSERT INTO trial_sessions(token_hash,access_key_hash,expires_at) VALUES(?,?,?)").bind(await digest(token), expected, now + SESSION_TTL).run();
		setCookie(c, COOKIE, token, {
			secure: true,
			httpOnly: true,
			sameSite: "Strict",
			path: "/",
			maxAge: SESSION_TTL / 1e3
		});
		return c.json({ authenticated: true });
	} catch (error) {
		return error instanceof SyntaxError ? c.json({ error: "INVALID_REQUEST" }, 400) : c.json({ error: "SERVICE_UNAVAILABLE" }, 503);
	} finally {
		reader.releaseLock();
	}
}
async function logoutTrial(c) {
	const token = getCookie(c, COOKIE);
	if (token) await c.env.DB.prepare("DELETE FROM trial_sessions WHERE token_hash = ?").bind(await digest(token)).run();
	deleteCookie(c, COOKIE, {
		secure: true,
		httpOnly: true,
		sameSite: "Strict",
		path: "/"
	});
	return c.json({ authenticated: false });
}
// apps/worker/body.ts
async function limitedBody(request, maximum) {
	const reader = request.body?.getReader();
	if (!reader) return "";
	let length = 0;
	const decoder = new TextDecoder();
	let text = "";
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) return text + decoder.decode();
			length += value.byteLength;
			if (length > maximum) {
				await reader.cancel();
				throw new RangeError("Body too large");
			}
			text += decoder.decode(value, { stream: true });
		}
	} finally {
		reader.releaseLock();
	}
}
// apps/worker/feeds/catalog.ts
var trialCatalog = [
	{
		id: "7sur7",
		name: "7sur7",
		url: "https://www.7sur7.be/",
		category: "Belgique",
		feed: "https://www.7sur7.be/home/rss.xml"
	},
	{
		id: "dh",
		name: "La DH",
		url: "https://www.dhnet.be/",
		category: "Belgique",
		feed: "https://www.dhnet.be/arc/outboundfeeds/rss/?outputType=xml"
	},
	{
		id: "lalibre",
		name: "La Libre",
		url: "https://www.lalibre.be/",
		category: "Belgique",
		feed: "https://www.lalibre.be/arc/outboundfeeds/rss/?outputType=xml"
	},
	{
		id: "lesoir",
		name: "Le Soir",
		url: "https://www.lesoir.be/",
		category: "Belgique",
		feed: null
	},
	{
		id: "figaro",
		name: "Le Figaro",
		url: "https://www.lefigaro.fr/",
		category: "France",
		feed: "https://www.lefigaro.fr/rss/figaro_actualites.xml"
	},
	{
		id: "lejsl",
		name: "Le JSL",
		url: "https://www.lejsl.com/",
		category: "Bourgogne",
		feed: "https://www.lejsl.com/rss"
	},
	{
		id: "investing",
		name: "Investing.com",
		url: "https://www.investing.com/",
		category: "Économie et finance",
		feed: "https://fr.investing.com/rss/news.rss"
	},
	{
		id: "zonebourse",
		name: "Zonebourse",
		url: "https://www.zonebourse.com/",
		category: "Économie et finance",
		feed: null
	},
	{
		id: "gouvernement",
		name: "Gouvernement.lu",
		url: "https://gouvernement.lu/",
		category: "Luxembourg",
		feed: "https://gouvernement.lu/fr/actualites/toutes_actualites.rss"
	}
];
var MIN_INTERVAL = 9e5;
function isSourceUrl(value, source) {
	try {
		const url = new URL(value);
		const hosts = [new URL(source.url).hostname, ...source.feed ? [new URL(source.feed).hostname] : []];
		return url.protocol === "https:" && !url.username && !url.password && !url.port && hosts.includes(url.hostname) && !url.hash;
	} catch {
		return false;
	}
}
// packages/shared/topics.ts
var topics = [
	{
		name: "Politique",
		subtopics: [
			"Présidentielle",
			"Élections",
			"Institutions"
		]
	},
	{
		name: "International",
		subtopics: ["Diplomatie", "Conflits"]
	},
	{
		name: "Économie",
		subtopics: [
			"Marchés",
			"Entreprises",
			"Emploi"
		]
	},
	{
		name: "Société",
		subtopics: ["Justice", "Éducation"]
	},
	{
		name: "Sport",
		subtopics: [
			"Football",
			"Tennis",
			"Cyclisme"
		]
	},
	{
		name: "Culture",
		subtopics: [
			"Cinéma",
			"Musique",
			"Littérature"
		]
	},
	{
		name: "Sciences et technologies",
		subtopics: ["Technologie", "Sciences"]
	},
	{
		name: "Environnement",
		subtopics: [
			"Climat",
			"Biodiversité",
			"Énergie"
		]
	},
	{
		name: "Santé",
		subtopics: ["Médecine", "Santé publique"]
	},
	{
		name: "Autres",
		subtopics: []
	}
];
// apps/worker/feeds/classify.ts
var rules = [
	{
		theme: "Politique",
		subtheme: "Présidentielle",
		keywords: ["presidentielle", "presidentielles"]
	},
	{
		theme: "Politique",
		subtheme: "Élections",
		keywords: [
			"election",
			"elections",
			"electoral",
			"electorale",
			"legislatives",
			"scrutin"
		]
	},
	{
		theme: "Politique",
		subtheme: "Institutions",
		keywords: [
			"parlement",
			"gouvernement",
			"constitution",
			"assemblee nationale",
			"senat",
			"premier ministre"
		]
	},
	{
		theme: "International",
		subtheme: "Diplomatie",
		keywords: [
			"diplomatie",
			"diplomatique",
			"ambassade",
			"onu"
		]
	},
	{
		theme: "International",
		subtheme: "Conflits",
		keywords: [
			"guerre",
			"cessez le feu",
			"conflit arme",
			"bombardement",
			"bombardements"
		]
	},
	{
		theme: "Économie",
		subtheme: "Marchés",
		keywords: [
			"bourse",
			"bourses",
			"boursier",
			"boursiere",
			"cac 40",
			"wall street",
			"nasdaq",
			"marches financiers",
			"stock market"
		]
	},
	{
		theme: "Économie",
		subtheme: "Entreprises",
		keywords: [
			"entreprise",
			"entreprises",
			"fusion acquisition",
			"chiffre d affaires"
		]
	},
	{
		theme: "Économie",
		subtheme: "Emploi",
		keywords: [
			"emploi",
			"chomage",
			"recrutement",
			"licenciements"
		]
	},
	{
		theme: "Société",
		subtheme: "Justice",
		keywords: [
			"justice",
			"tribunal",
			"proces",
			"judiciaire"
		]
	},
	{
		theme: "Société",
		subtheme: "Éducation",
		keywords: [
			"education",
			"enseignement",
			"ecole",
			"universite"
		]
	},
	{
		theme: "Sport",
		subtheme: "Football",
		keywords: [
			"football",
			"foot",
			"ligue 1",
			"ligue des champions",
			"diables rouges",
			"jupiler pro league"
		]
	},
	{
		theme: "Sport",
		subtheme: "Tennis",
		keywords: [
			"tennis",
			"roland garros",
			"wimbledon"
		]
	},
	{
		theme: "Sport",
		subtheme: "Cyclisme",
		keywords: [
			"cyclisme",
			"tour de france",
			"velo",
			"peloton"
		]
	},
	{
		theme: "Culture",
		subtheme: "Cinéma",
		keywords: [
			"cinema",
			"film",
			"films",
			"cineaste"
		]
	},
	{
		theme: "Culture",
		subtheme: "Musique",
		keywords: [
			"musique",
			"concert",
			"album",
			"chanteur",
			"chanteuse"
		]
	},
	{
		theme: "Culture",
		subtheme: "Littérature",
		keywords: [
			"litterature",
			"romancier",
			"prix goncourt"
		]
	},
	{
		theme: "Sciences et technologies",
		subtheme: "Technologie",
		keywords: [
			"technologie",
			"technologies",
			"tech",
			"high tech",
			"intelligence artificielle",
			"ia",
			"smartphone",
			"cybersecurite",
			"logiciel"
		]
	},
	{
		theme: "Sciences et technologies",
		subtheme: "Sciences",
		keywords: [
			"science",
			"sciences",
			"spatial",
			"astronomie",
			"nasa",
			"physique quantique"
		]
	},
	{
		theme: "Environnement",
		subtheme: "Climat",
		keywords: [
			"climat",
			"climatique",
			"rechauffement",
			"emissions de co2"
		]
	},
	{
		theme: "Environnement",
		subtheme: "Biodiversité",
		keywords: [
			"biodiversite",
			"especes menacees",
			"deforestation"
		]
	},
	{
		theme: "Environnement",
		subtheme: "Énergie",
		keywords: [
			"energies renouvelables",
			"eolien",
			"transition energetique"
		]
	},
	{
		theme: "Santé",
		subtheme: "Médecine",
		keywords: [
			"medecine",
			"cancer",
			"vaccin",
			"vaccins",
			"hopital",
			"traitement medical"
		]
	},
	{
		theme: "Santé",
		subtheme: "Santé publique",
		keywords: [
			"sante publique",
			"epidemie",
			"pandemie"
		]
	}
];
var metadataAliases = [
	{
		theme: "International",
		subtheme: null,
		keywords: ["monde", "international"]
	},
	{
		theme: "Sport",
		subtheme: null,
		keywords: ["sports"]
	},
	{
		theme: "Sport",
		subtheme: "Football",
		keywords: ["diables rouges"]
	},
	{
		theme: "Société",
		subtheme: "Justice",
		keywords: ["faits divers", "justice"]
	},
	{
		theme: "Société",
		subtheme: null,
		keywords: ["transports", "mobilite"]
	},
	{
		theme: "Culture",
		subtheme: null,
		keywords: ["people", "medias"]
	},
	{
		theme: "Économie",
		subtheme: null,
		keywords: [
			"conjoncture",
			"finance",
			"economy",
			"economic indicators",
			"economic news"
		]
	},
	{
		theme: "Économie",
		subtheme: "Marchés",
		keywords: [
			"markets",
			"stock market news",
			"marches"
		]
	},
	{
		theme: "Sciences et technologies",
		subtheme: "Technologie",
		keywords: ["tech web"]
	}
];
function normalize$1(value) {
	return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function contains(text, keyword) {
	return ` ${text} `.includes(` ${keyword} `);
}
function pathSections(value) {
	try {
		return new URL(value).pathname.split("/").filter(Boolean).slice(0, -1).map((part) => normalize$1(decodeURIComponent(part)));
	} catch {
		return [];
	}
}
var compiledTopics = topics.filter((topic) => topic.name !== "Autres").map((topic) => ({
	name: topic.name,
	normalized: normalize$1(topic.name),
	aliases: metadataAliases.filter((rule) => rule.theme === topic.name).map((rule) => ({
		...rule,
		keywords: rule.keywords.map(normalize$1)
	})),
	rules: rules.filter((rule) => rule.theme === topic.name).map((rule) => ({
		...rule,
		keywords: rule.keywords.map(normalize$1)
	}))
}));
function classifyArticle(input, sourceId) {
	const categories = (input.categories ?? []).map(normalize$1);
	const sections = pathSections(input.url);
	const title = normalize$1(input.title);
	const excerpt = normalize$1(input.excerpt);
	let best;
	let bestScore = 0;
	for (const topic of compiledTopics) {
		const theme = topic.normalized;
		const topicRules = topic.rules;
		const categoryTheme = categories.some((value) => contains(value, theme));
		const sectionTheme = sections.some((value) => value === theme);
		let score = (categoryTheme ? 100 : 0) + (sectionTheme ? 60 : 0) + (theme !== "culture" && contains(title, theme) ? 4 : 0) + (theme !== "culture" && contains(excerpt, theme) ? 1 : 0);
		let subtheme = null;
		let bestSubScore = 0;
		for (const alias of topic.aliases) {
			const aliasScore = (categories.some((value) => alias.keywords.some((keyword) => contains(value, keyword))) ? 100 : 0) + (sections.some((value) => alias.keywords.some((keyword) => contains(value, keyword))) ? 60 : 0);
			score += aliasScore;
			if (alias.subtheme !== null && aliasScore > bestSubScore) {
				bestSubScore = aliasScore;
				subtheme = alias.subtheme;
			}
		}
		for (const rule of topicRules) {
			const ruleScore = rule.keywords.reduce((sum, keyword) => sum + (categories.some((value) => contains(value, keyword)) ? 100 : 0) + (sections.some((value) => contains(value, keyword)) ? 60 : 0) + (contains(title, keyword) ? 4 : 0) + (contains(excerpt, keyword) ? 1 : 0), 0);
			score += ruleScore;
			if (ruleScore > bestSubScore) {
				bestSubScore = ruleScore;
				subtheme = rule.subtheme;
			}
		}
		if (score > bestScore) {
			bestScore = score;
			best = {
				theme: topic.name,
				subtheme
			};
		}
	}
	if (best) return best;
	if (sourceId === "investing" || sourceId === "zonebourse") return {
		theme: "Économie",
		subtheme: "Marchés"
	};
	if (sourceId === "gouvernement") return {
		theme: "Politique",
		subtheme: "Institutions"
	};
	return {
		theme: "Autres",
		subtheme: null
	};
}
// node_modules/robots-parser/Robots.js
var require_Robots = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Trims the white space from the start and end of the line.
	*
	* If the line is an array it will strip the white space from
	* the start and end of each element of the array.
	*
	* @param  {string|Array} line
	* @return {string|Array}
	* @private
	*/
	function trimLine(line) {
		if (!line) return null;
		if (Array.isArray(line)) return line.map(trimLine);
		return String(line).trim();
	}
	/**
	* Remove comments from lines
	*
	* @param {string} line
	* @return {string}
	* @private
	*/
	function removeComments(line) {
		var commentStartIndex = line.indexOf("#");
		if (commentStartIndex > -1) return line.substr(0, commentStartIndex);
		return line;
	}
	/**
	* Splits a line at the first occurrence of :
	*
	* @param  {string} line
	* @return {Array.<string>}
	* @private
	*/
	function splitLine(line) {
		var idx = String(line).indexOf(":");
		if (!line || idx < 0) return null;
		return [line.slice(0, idx), line.slice(idx + 1)];
	}
	/**
	* Normalises the user-agent string by converting it to
	* lower case and removing any version numbers.
	*
	* @param  {string} userAgent
	* @return {string}
	* @private
	*/
	function formatUserAgent(userAgent) {
		var formattedUserAgent = userAgent.toLowerCase();
		var idx = formattedUserAgent.indexOf("/");
		if (idx > -1) formattedUserAgent = formattedUserAgent.substr(0, idx);
		return formattedUserAgent.trim();
	}
	/**
	* Normalises the URL encoding of a path by encoding
	* unicode characters.
	*
	* @param {string} path
	* @return {string}
	* @private
	*/
	function normaliseEncoding(path) {
		try {
			return urlEncodeToUpper(encodeURI(path).replace(/%25/g, "%"));
		} catch (e) {
			return path;
		}
	}
	/**
	* Convert URL encodings to support case.
	*
	* e.g.: %2a%ef becomes %2A%EF
	*
	* @param {string} path
	* @return {string}
	* @private
	*/
	function urlEncodeToUpper(path) {
		return path.replace(/%[0-9a-fA-F]{2}/g, function(match) {
			return match.toUpperCase();
		});
	}
	/**
	* Matches a pattern with the specified path
	*
	* Uses same algorithm to match patterns as the Google implementation in
	* google/robotstxt so it should be consistent with the spec.
	*
	* @see https://github.com/google/robotstxt/blob/f465f0ede81099dd8bc4aeb2966b3a892bd488b3/robots.cc#L74
	* @param {string} pattern
	* @param {string} path
	* @return {boolean}
	* @private
	*/
	function matches(pattern, path) {
		var matchingLengths = new Array(path.length + 1);
		var numMatchingLengths = 1;
		matchingLengths[0] = 0;
		for (var p = 0; p < pattern.length; p++) {
			if (pattern[p] === "$" && p + 1 === pattern.length) return matchingLengths[numMatchingLengths - 1] === path.length;
			if (pattern[p] == "*") {
				numMatchingLengths = path.length - matchingLengths[0] + 1;
				for (var i = 1; i < numMatchingLengths; i++) matchingLengths[i] = matchingLengths[i - 1] + 1;
			} else {
				var numMatches = 0;
				for (var i = 0; i < numMatchingLengths; i++) if (matchingLengths[i] < path.length && path[matchingLengths[i]] === pattern[p]) matchingLengths[numMatches++] = matchingLengths[i] + 1;
				if (numMatches == 0) return false;
				numMatchingLengths = numMatches;
			}
		}
		return true;
	}
	function parseRobots(contents, robots) {
		var lines = contents.split(/\r\n|\r|\n/).map(removeComments).map(splitLine).map(trimLine);
		var currentUserAgents = [];
		var isNoneUserAgentState = true;
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			if (!line || !line[0]) continue;
			switch (line[0].toLowerCase()) {
				case "user-agent":
					if (isNoneUserAgentState) currentUserAgents.length = 0;
					if (line[1]) currentUserAgents.push(formatUserAgent(line[1]));
					break;
				case "disallow":
					robots.addRule(currentUserAgents, line[1], false, i + 1);
					break;
				case "allow":
					robots.addRule(currentUserAgents, line[1], true, i + 1);
					break;
				case "crawl-delay":
					robots.setCrawlDelay(currentUserAgents, line[1]);
					break;
				case "sitemap":
					if (line[1]) robots.addSitemap(line[1]);
					break;
				case "host": if (line[1]) robots.setPreferredHost(line[1].toLowerCase());
			}
			isNoneUserAgentState = line[0].toLowerCase() !== "user-agent";
		}
	}
	/**
	* Returns if a pattern is allowed by the specified rules.
	*
	* @param  {string}  path
	* @param  {Array.<Object>}  rules
	* @return {Object?}
	* @private
	*/
	function findRule(path, rules) {
		var matchedRule = null;
		for (var i = 0; i < rules.length; i++) {
			var rule = rules[i];
			if (!matches(rule.pattern, path)) continue;
			if (!matchedRule || rule.pattern.length > matchedRule.pattern.length) matchedRule = rule;
			else if (rule.pattern.length == matchedRule.pattern.length && rule.allow && !matchedRule.allow) matchedRule = rule;
		}
		return matchedRule;
	}
	/**
	* Converts provided string into an URL object.
	*
	* Will return null if provided string is not a valid URL.
	*
	* @param {string} url
	* @return {?URL}
	* @private
	*/
	function parseUrl(url) {
		try {
			var url = new URL(url, "http://robots-relative.samclarke.com/");
			if (!url.port) url.port = url.protocol === "https:" ? 443 : 80;
			return url;
		} catch (e) {
			return null;
		}
	}
	function Robots(url, contents) {
		this._url = parseUrl(url) || {};
		this._rules = Object.create(null);
		this._sitemaps = [];
		this._preferredHost = null;
		parseRobots(contents || "", this);
	}
	/**
	* Adds the specified allow/deny rule to the rules
	* for the specified user-agents.
	*
	* @param {Array.<string>} userAgents
	* @param {string} pattern
	* @param {boolean} allow
	* @param {number} [lineNumber] Should use 1-based indexing
	*/
	Robots.prototype.addRule = function(userAgents, pattern, allow, lineNumber) {
		var rules = this._rules;
		userAgents.forEach(function(userAgent) {
			rules[userAgent] = rules[userAgent] || [];
			if (!pattern) return;
			rules[userAgent].push({
				pattern: normaliseEncoding(pattern),
				allow,
				lineNumber
			});
		});
	};
	/**
	* Adds the specified delay to the specified user agents.
	*
	* @param {Array.<string>} userAgents
	* @param {string} delayStr
	*/
	Robots.prototype.setCrawlDelay = function(userAgents, delayStr) {
		var rules = this._rules;
		var delay = Number(delayStr);
		userAgents.forEach(function(userAgent) {
			rules[userAgent] = rules[userAgent] || [];
			if (isNaN(delay)) return;
			rules[userAgent].crawlDelay = delay;
		});
	};
	/**
	* Add a sitemap
	*
	* @param {string} url
	*/
	Robots.prototype.addSitemap = function(url) {
		this._sitemaps.push(url);
	};
	/**
	* Sets the preferred host name
	*
	* @param {string} url
	*/
	Robots.prototype.setPreferredHost = function(url) {
		this._preferredHost = url;
	};
	Robots.prototype._getRule = function(url, ua) {
		var parsedUrl = parseUrl(url) || {};
		var userAgent = formatUserAgent(ua || "*");
		if (parsedUrl.protocol !== this._url.protocol || parsedUrl.hostname !== this._url.hostname || parsedUrl.port !== this._url.port) return;
		var rules = this._rules[userAgent] || this._rules["*"] || [];
		return findRule(urlEncodeToUpper(parsedUrl.pathname + parsedUrl.search), rules);
	};
	/**
	* Returns true if allowed, false if not allowed.
	*
	* Will return undefined if the URL is not valid for
	* this robots.txt file.
	*
	* @param  {string}  url
	* @param  {string?}  ua
	* @return {boolean?}
	*/
	Robots.prototype.isAllowed = function(url, ua) {
		var rule = this._getRule(url, ua);
		if (typeof rule === "undefined") return;
		return !rule || rule.allow;
	};
	/**
	* Returns the line number of the matching directive for the specified
	* URL and user-agent if any.
	*
	* The line numbers start at 1 and go up (1-based indexing).
	*
	* Return -1 if there is no matching directive. If a rule is manually
	* added without a lineNumber then this will return undefined for that
	* rule.
	*
	* @param  {string}  url
	* @param  {string?}  ua
	* @return {number?}
	*/
	Robots.prototype.getMatchingLineNumber = function(url, ua) {
		var rule = this._getRule(url, ua);
		return rule ? rule.lineNumber : -1;
	};
	/**
	* Returns the opposite of isAllowed()
	*
	* @param  {string}  url
	* @param  {string}  ua
	* @return {boolean}
	*/
	Robots.prototype.isDisallowed = function(url, ua) {
		return !this.isAllowed(url, ua);
	};
	/**
	* Gets the crawl delay if there is one.
	*
	* Will return undefined if there is no crawl delay set.
	*
	* @param  {string} ua
	* @return {number?}
	*/
	Robots.prototype.getCrawlDelay = function(ua) {
		var userAgent = formatUserAgent(ua || "*");
		return (this._rules[userAgent] || this._rules["*"] || {}).crawlDelay;
	};
	/**
	* Returns the preferred host if there is one.
	*
	* @return {string?}
	*/
	Robots.prototype.getPreferredHost = function() {
		return this._preferredHost;
	};
	/**
	* Returns an array of sitemap URLs if there are any.
	*
	* @return {Array.<string>}
	*/
	Robots.prototype.getSitemaps = function() {
		return this._sitemaps.slice(0);
	};
	module.exports = Robots;
}));
// apps/worker/feeds/article-preprocess.ts
var import_robots_parser = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Robots = require_Robots();
	module.exports = function(url, contents) {
		return new Robots(url, contents);
	};
})))(), 1);
/** Drop inert payloads with the Workers native streaming parser before extraction.
* Node has no HTMLRewriter: the unchanged fallback makes no performance claim.
* This is not a sanitizer; publisher policy and access checks stay in extraction.
*/
async function preprocessArticleHtml(html) {
	if (typeof HTMLRewriter === "undefined") return html;
	return new HTMLRewriter().on("script", { element(element) {
		if (element.getAttribute("type")?.split(";")[0]?.trim().toLowerCase() !== "application/ld+json") element.remove();
	} }).on("style, svg, template, noscript", { element(element) {
		element.remove();
	} }).transform(new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } })).text();
}
// node_modules/htmlparser2/node_modules/entities/dist/decode-codepoint.js
/**
* C1 Unicode control character reference replacements (code points 128–159).
* Index i gives the replacement for code point 128+i; 0 means "no replacement".
*/
var c1$1 = [
	8364,
	0,
	8218,
	402,
	8222,
	8230,
	8224,
	8225,
	710,
	8240,
	352,
	8249,
	338,
	0,
	381,
	0,
	0,
	8216,
	8217,
	8220,
	8221,
	8226,
	8211,
	8212,
	732,
	8482,
	353,
	8250,
	339,
	0,
	382,
	376
];
/**
* True for NUL, UTF-16 surrogates, and values past U+10FFFF.
* @param codePoint Unicode code point to check.
*/
function isInvalidCodePoint$1(codePoint) {
	return codePoint === 0 || codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111;
}
/**
* Replace the given code point with U+FFFD if it is NUL (0), a surrogate, or
* outside the valid Unicode range. Code points in the C1 controls range
* (128–159) are remapped to their Windows-1252 equivalents, following the
* HTML spec. All other code points are returned unchanged.
* @param codePoint Unicode code point to convert.
*/
function replaceCodePoint$1(codePoint) {
	if (isInvalidCodePoint$1(codePoint)) return 65533;
	if (codePoint >= 128 && codePoint <= 159) return c1$1[codePoint - 128] || codePoint;
	return codePoint;
}
/**
* XML numeric character references are the referenced Unicode code point.
* Invalid values still become U+FFFD; the HTML Windows-1252 C1 remap is not
* applied.
* @see https://www.w3.org/TR/xml/#NT-CharRef
* @param codePoint Unicode code point to convert.
*/
function replaceCodePointXML(codePoint) {
	return isInvalidCodePoint$1(codePoint) ? 65533 : codePoint;
}
// node_modules/htmlparser2/node_modules/entities/dist/internal/decode-shared.js
var BASE91_INVERSE = /* #__PURE__ */ (() => {
	const table = /* @__PURE__ */ new Uint8Array(127);
	let code = 0;
	for (let char = 33; char <= 126; char++) if (char !== 34 && char !== 36 && char !== 92) table[char] = code++;
	return table;
})();
/**
* Decode a dictionary-encoded trie string back into its Uint16Array.
*
* Stream layout (consumed in this order):
*   1. dict1 atoms — `dict1AtomCount` uint16 values, delta+RLE encoded.
*   2. dict2 atoms — `atomCount - dict1AtomCount` values, delta+RLE.
*   3. dict2 ngrams — `ngramCount - (dictSize - dict1AtomCount)` entries,
*      each a pair of slot codes that resolve to earlier slots.
*   4. dict1 ngrams — `dictSize - dict1AtomCount` entries, same shape.
*   5. data — slot codes, each expanding to one or more uint16 values.
*
* Codes use a 91-char base (printable ASCII minus `"`, `$`, `\`):
*   - char1 < dictSize  → 1-char code, slot = char1
*   - char1 ≥ dictSize  → 2-char code, slot = dictSize + (char1 - dictSize)*91 + char2
*
* Slot index → token kind:
*   [0, A)                  dict1 atoms     (1-char codes)
*   [A, dictSize)           dict1 ngrams    (1-char codes)
*   [dictSize, dictSize+D)  dict2 atoms     (2-char codes)
*   [dictSize+D, end)       dict2 ngrams    (2-char codes)
*
* Both atom dicts decode before any ngram, and dict2 ngrams decode before
* dict1 ngrams. So every ngram entry references slots whose contents are
* already filled — no forward references to handle.
*
* This runs on library import. Flat typed arrays store each slot as either
* a plain value (`single`, covering every atom) or a range in a shared
* `pool` (ngrams).
* @param input Packed trie string.
* @param resultLength Expected number of uint16 values in the output.
* @param atomCount Total number of distinct uint16 values in the trie.
* @param dict1AtomCount Atoms in the 1-char range (`A` above).
* @param ngramCount Total number of ngram entries (dict1 + dict2).
* @param dictSize Number of 1-char code slots; the rest of `BASE - dictSize`
*   first-byte values are 2-char codes.
*/
function decodeTrieDict(input, resultLength, atomCount, dict1AtomCount, ngramCount, dictSize) {
	const base = 91;
	const inputLength = input.length;
	const twoCharBias = dictSize * 90;
	let pos = 0;
	/** Read one slot code at `pos` and return its slot index, advancing pos. */
	const readSlotCode = () => {
		const c1 = BASE91_INVERSE[input.charCodeAt(pos++)];
		return c1 < dictSize ? c1 : c1 * base - twoCharBias + BASE91_INVERSE[input.charCodeAt(pos++)];
	};
	const dict2AtomCount = atomCount - dict1AtomCount;
	const slotCount = atomCount + ngramCount;
	const single = new Int32Array(slotCount);
	single.fill(-1, dict1AtomCount, dictSize);
	single.fill(-1, dictSize + dict2AtomCount, slotCount);
	const start = new Int32Array(slotCount);
	const length = new Int32Array(slotCount);
	/**
	* Decode `count` ascending uint16 values from a delta+RLE stream into
	* `single[off..off+count)`.
	*
	*   code < 89   → delta = code
	*   code == 89  → run-length: next char encodes runLength-2; emit `runLength` consecutive +1 values
	*   code == 90, next < 90  → escape: delta = 89 + next * BASE + after-next
	*   code == 90, next == 90 → double-escape: extra char for very large deltas
	* @param count
	* @param off
	*/
	function decodeDelta(count, off) {
		let previous = 0;
		let slot = off;
		const end = off + count;
		while (slot < end) {
			const code = BASE91_INVERSE[input.charCodeAt(pos++)];
			if (code < 89) {
				previous += code;
				single[slot++] = previous;
			} else if (code === 89) {
				let runLength = BASE91_INVERSE[input.charCodeAt(pos++)] + 2;
				while (runLength--) single[slot++] = ++previous;
			} else {
				const next = BASE91_INVERSE[input.charCodeAt(pos++)];
				previous += 89 + (next < 90 ? next * base + BASE91_INVERSE[input.charCodeAt(pos++)] : BASE91_INVERSE[input.charCodeAt(pos++)] * 8281 + BASE91_INVERSE[input.charCodeAt(pos++)] * base + BASE91_INVERSE[input.charCodeAt(pos++)]);
				single[slot++] = previous;
			}
		}
	}
	decodeDelta(dict1AtomCount, 0);
	decodeDelta(dict2AtomCount, dictSize);
	const references = new Int32Array(ngramCount * 2);
	let poolSize = 0;
	let ngramIndex = 0;
	/**
	* Read `count` ngram entries (each = 2 slot-code references) for the slots
	* starting at `startSlot`, recording references and assigning pool ranges.
	* @param count
	* @param startSlot
	*/
	function readNgramReferences(count, startSlot) {
		for (let index = 0; index < count; index++) {
			const slot = startSlot + index;
			const a = readSlotCode();
			const b = readSlotCode();
			references[ngramIndex * 2] = a;
			references[ngramIndex * 2 + 1] = b;
			ngramIndex += 1;
			start[slot] = poolSize;
			const entryLength = (single[a] < 0 ? length[a] : 1) + (single[b] < 0 ? length[b] : 1);
			length[slot] = entryLength;
			poolSize += entryLength;
		}
	}
	readNgramReferences(ngramCount - dictSize + dict1AtomCount, dictSize + dict2AtomCount);
	readNgramReferences(dictSize - dict1AtomCount, dict1AtomCount);
	const pool = new Uint16Array(poolSize);
	let write = 0;
	for (let index = 0; index < ngramIndex; index++) for (let half = 0; half < 2; half++) {
		const source = references[index * 2 + half];
		const value = single[source];
		if (value < 0) {
			let read = start[source];
			const readEnd = read + length[source];
			while (read < readEnd) pool[write++] = pool[read++];
		} else pool[write++] = value;
	}
	const out = new Uint16Array(resultLength);
	let outIndex = 0;
	while (pos < inputLength) {
		let slot = BASE91_INVERSE[input.charCodeAt(pos++)];
		if (slot >= dictSize) slot = slot * base - twoCharBias + BASE91_INVERSE[input.charCodeAt(pos++)];
		const value = single[slot];
		if (value < 0) {
			let read = start[slot];
			const readEnd = read + length[slot];
			while (read < readEnd) out[outIndex++] = pool[read++];
		} else out[outIndex++] = value;
	}
	return out;
}
// node_modules/htmlparser2/node_modules/entities/dist/generated/decode-data-html.js
/** Packed HTML decode trie data. */
var htmlDecodeTree = /* #__PURE__ */ decodeTrieDict("!}.&u%}'&}*'~!6*)%&,~!J~!J~%L~y<~!R,~~%Lu~~#GD~~#|)1#%}^%}2%+#.##%##%}&%##%'#%##&%#%#'%#&#%#&#'#%%#&#%##%#)%''%&%#%#'%#%%#%%}%%%#%#&(23#%%#&-%0%('1#(##%#'##+%'*.:1}#%#6-+(%'%%#%%%}#L'2351&('%}&/N'(0(/*-%(%%}#'+&T%7.2}#&%&#%#36/5##%&%%#&#%%#))2%%##%&&'0~!#*+&'%1~!%).'3q?&%'1~!.##%6(~!+%%%(Gw'rT~!E#<nA%#jZ~!H%(~!42##~!*31&~!G%U~#)5~#`3~!J~!Z~%]~%Y~%C~!q~!u~#kz~%#~!6'~!D~!U~!?~#T~!c%~!G#'~%7|~!G~!J~!G&~#pb~(Df}#%}*&}#%##%##%##&#-}&'#'&%#.++}%mI,#,@&(}*%}*'%&##&#%##%}&0}#.},U},%}+%}&%}#%##&}B%(}(%}+%)})%##%#&}&%##%&}<%}>%#%&}*%}(%}9%}/%})%}*%}*%}?&}&%}3%}&*#%})%#%#)}#&#-#+*%E%%'%'#%}#*V##&##I}#&&##%&%#&&Qf%%))w/0+&%#(#.%-''''++++7}>%4'',##1,#%#&%##&#'##&#*#9)%&%}#*}%,#+P(%A&%#'&##wSD',9E00#y#@}(+}&%&>~!#~!X}#*}(&&}(&}(,%}%&#+&}#&}I%#%}%)#(},'%#*}4%%#%}(''}#/##(##),%-##%%)#&}(.}&%#&}%%}*&#%},&&}&%}#%*'#%})%}D&}&%}-&}6&#&}-,%}#%})-(~+`~,=?~I9'9%~!,#%})%})%}@%}?%}(~!?~#<~#pP~#BG~#=1#%K+~#?#~%;)~#A~#mF1~#A'~'X%'~#lR~#N~'N~#r~#m#-~#i'?%#'%~#B%##%,%#~#_%#0%~#]732~,w~2+#:&#%&'0%&>%}#>##F+)#%&&#(+_}4&}-%}(&}@&}O7Fdf0@+/v4}&WU##&/0#&'('B#%}.%}'+#%}#%%&#&%#%##+#&#)#6#'#.},%}c%},%#%##%&#&%#&~#>'*-.%##%##%}#%%}%'~#)D1}#%*&~#_%%'(~#S2%'.}#~#=##*'*-%}&'%'##&&~'E%.#&~#M4}%%##&'%#~#O1##%&#'+~#<B%##%%'%+~#;#@%}#&%#&&%#(~#H1}'%'##&&~#?A}&'~#D#%32}'&&&&~#[}'(#%}'~#;C})&}%%#%~#=&%,3}%'(#%%~#^'#&&)#%'~#Y%-~#d-%'~#^%%&#&&&}#~#b~2t*&'~&(~&@~0%~e~3}%*''0})&}+~!9##-}#%-hD*)1fC#%/&/fB#40~!+#)*4~!+~!K'&:~!/*7~!.#~!H~!L':~%x&~!H#~!*~%1~!I#~!+A~#p'~!F~~#-#~,,(~.Z~!V~%;'B'mq-W~!N~%I%#&&#&}#%},%%}'%}+X#%}#&}(%}'%}<%}#%}%%'}'%}:~![)9@~%>~#UA%-%##&~!C%~!-.9:~!1~!-^2/:a~!y,D*J#-5)/4~%23,~#G~!L1~!0X3`~!2+~!!0-~&E~!W~!o,>Y&]~%cZx_&~#O*9#A#'#+I'%#)~!0B*-5A+-((F&*M#)(-7-5+'-3a5Vi~!Y~!?+[)%3),ERHm~!+:D,VG.+)?fB%%*(%)'(#&80%1'8`K8?`+'Z#&O&'H5#*9)A%%5&3))0%39+.*7#()&&*=4@**L)<'_&*+..;(#*+)./&0#3)%')-8(4ixD(&.}%,('aI:,)%,k2231T)I'#/-W7,/'Q#.'Y24+h')37</31&83##&0#),H(?'&?/1##%#&&#%''-%&&&#(&''&#.-'%#%%(,')*'&#&#'##%(%(#%('#&##%%%%('%#%#%%#%#&%##h>w+v<ayvyvcg.uuhKr}g/v|g>u9i[~>g5uI~=RvdwEg;v/g;uk!!TTSx]@RT!U!#!@VBRUU!'UTe-d0c`e&gSdicedFcrdTaqb.kYcAohdYd@a3e+d}dMdtd.aJ#bqcK`dle/e.e'dwdPdodddjbEb}ogd^ofdpduc6j?l%d{drdqc)d7bacOdQ%T#Y)X.sR[yH>6Vyv3[xwLu>vo'!*.[yBacahoj>6Rew3[xqdZa#!a&#^(X-[yG>6Vyu3[xvg3sEr|g.u/Ri9db0T#^(Xa)!-[y;>6Vylg4wKs{JwNZt3@3r=c4Z([xlg;wKt!cpq's@v7A'*a(a+!-a#[y<3Dt?3Dt'>6Vym3[xmg9rxsNJwLZt4~?r?db1T#`-!(Xa,!0[yS>6Vz%NuQs.g4wKtnJwNZtS@3r>c4Z([y%g;wKtrdga8!a(!#&T*Y-Xa#!a0<or[yc3Dtq>6Vz43[y3JwNZtf@3s!Ju}!%Dti:pm3c_%X#tjB5pkd6q!r]u?voC'*-a.a2!0a&a+[yI3DtI3Ds~3DtH>6Vyw3[xx;:s#~<5pKJwNZtE@3r~d`a)!a2T#a.(!+U.X1[yT3Dt`3Dtv>6Vz&3[y&g9rxwzcxstPu.<rAJwLZtT~?r@dZa%!a.&^*Za(/Reu[ya>6Vz23[y1g3sEr}wkg{NuQRg{ci(U#5@b`~,cg#U(2WnH5wugcRh7dX#T(Y,a'Ta!!a,[yZ<]mj>6Vz,3[y+Pv#5ReZKu+=,%!H}7ABwkaS?Rh:BcW(X#<]mrj:ubv/ARekdg%!(!a.*Ta(Y.X1!#sP>Rl*Dt6[y>>6Vyo3Wf*jOvuumvuRgRJuq*!:9<B@bX~3jVv&v@s@5Re[d/rQt{uAvo&a&a*)a2!,0Wf!3Dt0=Bs'>6Re}3[xy~<5s%JwJZt1~Gs)c;&!#2sJkNuXvzq7rxu,Re8dka4!a8(aEZ+a@Y.X1Xa)[yd=Bs(3DtP>6Vz53[y4cX#X&Re:avRe9~<5s&JwJZtQ~Gs*i^rzvdRg+Jv{%!2sbB@bX}kdga,!Za?&^*T1/!a'Dt+[y6>6Vyf3Wf%g/u;s4hGu6?Rh-JvZ,!c%#&RoX54Rivj7uyvf8RgTKvZB%*!2sGh<vu5Rgq<=C::9bb~#dZ#T&Ta6Y.X*Dt>[y93Wf)coZ(T,6VyifluvRgC@95@B@bX~/hFu34cC#T,k/unq8w8Q5RkUklwQuzunq8w8Q5Rk8d/rJu?v8w9)-&!a0a;a&aIWejg3sEr/h1s<DtDJvyZqY5aws3Jvy!&Wei~Hr1:au5@Bag>23E~5c:Z&bX};kKv?w&unuVu5Rjc;>bs)#~@:Rh.=ay<a]C;b`}Vd6s/t{uAvoaxa()!a,a7%-a#a2Dt,[yF2Wo[>6Vyt3[xuNuPRi&NuPwpi#RoWh?vf8Ri%Jv]!%Ri:KvxD!.'2WeAjZu`q9rxu,Re7woeAg-unLq(qA_/*2Wg_g3u5q^9:4E}/jTrxrzv=Wkkd~0UX#^^Xa-a1a5T&a=U1a'*aEa]!a*aPaA-adok[y54Rn>;:p3~Dp5g9rpsFNvZqjg3uJp4~<5p0Pw;5qlJwNZt*@3p1Pw:5p/Ou!5p2JvG'!6Vye=<qnJvh_[xhg3v,Rh3kOwOw-sDuev/Re^dha[a%!%!a+#Ta7)-5TaCaO!aka!a)sf[yb2>Rl!9ARiq5E}Qg=ucRkBE|oJrJ_@Wk~@Wk{JrJ_@Wk|@WkyJrJ_@Wk}@WkzJvO_[y2g-vMRmiKuYC!)&>Ri;>Ri<@3RkNc](X#@9Rk=g5vuRmhKvDB!+'=]meg3u4Rmgd)#Y'Vz3CARmfd`a+!%T'!+#Ta1Ta6TaM-sTDt9[yA9sYd'%Y#s[[xpj:ueunaXRgEjRq,v-vuqdd2'`#6Rev<32@5>:2<E}5xIo9a*X#Y(;5RePJvD_g>vyRgNj8w)v8<wggs:RgXiZt|vjx,hSq3ah!-(~@:Ro/Ou!5RhWj^v(pyw8unRhUdx-UY#^Ua.a3a70!)%UX1TaDa)'omRiRRhE[y:3Dsz=Br,>6Vyj3[xkg6ruwjcqsrPw;5r*Ku]D'Zt-@3r(~?r.i[vwv]dU1a--U#`a4(g/vsRhPOu!5RhLj:rmu9Wo!~@:wdh@g/vsRiTjXuvvNr}:RhBj^v(pyw8unRn]dz1UYa'a+^Y(!aETZalaRY.Ta?a4[yDJw1!#qLsW>6Vyrfzq-pLflpwRe|Js>%!Dt@3Dt&Jvy_[xs~HrnjMuwpsw'RecKu+D#'!t<~Grl~?rjg5u-x,gwp{ah!-(~@:Rg~Ou!5Rh'jXuvvNr}:Rh#cW#X/c;&!#2sLi[v7u7RgpJv)(!iLrxu,Re6j7v@s@5Se[e7d`aW!Za(a`T.a#!a3!&aDa-!9)Dt_=6s+3[x~~DR|h~DS6avhGun5RkZj3w)v-]mkKunB!&*]kb97R|i<ARk<c:Z(6Vy}Juh'!wziMRoS:F|vkLuauJv5vtvQRh1d='T+Y#VyO~DR|jcF#T'7R|g97R|kJv3'!ay<Rj,Jvh&!:ReXcsa6*a+#a#_aIRf9aLRf?c,Z&Rf5Rf7c.Z&Rf;Rf>cQ#%T'p-Rf8Rf=ct#%'(*!,p,Rf4p+Rf6Rf:Rf<d~'Ua%U*^UYa(!a,-!#a4YaTalaEX0a8a<Weo3Dt/3Dsx=Br93Wen~Dr;~<5p<JwNZt2@3p=Pw:5p;Ou!5r3c7&!#:p>3Ds}KvGB)_6Vyk2sM=<r7x'eovA(!hFu1ARf}cV#X&@r5j6rvwQa^Rf3c=Za'wkghJv__g;unRggA53B9=b^}%j6uduo5Jq;!(hIv%2Re`Ou4ARe_e%a#^^^Xa&!a*a2!&a6YaP!*ad!#a:aE/5Rn?[y@>6Vyp;:pE~DrY~<5pBJwNZt8@3pCh=rt3rWPw:5pAJup_[xoNuPpF9c!#'45pD5ARn)d8#X'X*3@rU72s]h>v<<sSjJpqvewOJq/(!hNw'5ReBk0s2u3w/w'5ReE5@Jq.!a+JQ!&WeU23d(#Y&RjG5]jBk!u7w&u0udARjEe#+^^^Ub#!a2/a`Z(agT1!a-a;|@TaG!aS[yV=Re~fow'RguNuPRe?bz#'>RoUWeL>:Cbb|?JwPZtVg6ruRmzJvD'!6Vz(g/vmRh~Jvy_[y(g9voRgyx*cy(#2>Ri2B9b]~9kIw9u7rluJu3Rg]dI#a%UY'@=p%CAx.gQZ&RhwwygtRm{x5g_Z'+ABqR9Woa=Bp&dV#^*Xa'!&@o{g4v]Rk;Jv{!%Rk[wkkiA5RkiwwfUB=x,fUuqC&*!>RfTg8v0RfV~ARfSd;rJsAuAv9wR'ae+/aO!a@aza/a#[yQ@Wg!2Wemg3sEr0JvB_g>uvReWg2v+Re=KupB_+[y!2AbY~-~Hr2AJwD!(h<~El>h<~El?Kun@+_:9b`}Kg-v/Ri3g;vtwyk_9]k_d=&T#*U.6qh@Ab`|K9:H|CJv[!&3Dtex'fDwC%!Rf[9WlMd[(^X,!a%Z06Vz!@WgBg=v~Rgvg,QRe@awd,#Y+jTv|Q~EfWj]uNr|~FRfXdy#Y&^Ua%!aO.!(a)Ua;=!a@aKap!a-,a!Ta]a[rSa]p?[y82sK=Bq~;:p:~<5p8Pw:5p7d'#Y'Wf(;RnRi[u4w&RgJJvG'!6Vyh=<r#ijuuv/sIKuYD'ZtG@3p9~Gr&d2#`(g<vtRgFj`u5w&rqpxRf2CJuY!+:wfnTOu!5Rg}jNs1ucv&RfwJvA!&3@q|BDcC#T,k/unq8w8Q5RkTklwQuzunq8w8Q5Rk9dga#!a'!a=#a0!:+Tb*b@aO.a4!aba8aFJv^}?!VyR~Dr<g;u%Rn.~<5p[x'e`wNZtR@3p]Pw:5pZhNvjBp.woe_g5u-r4JwF!%DtO3:ooc7&!#:p^3DtpLuGw(!+%)Dtk6Vz#2sd=<r8d'#Y([y#<x3gJt`w@!)%}MRiowzikRij=]ilxAf3,U(#B2Rf#g0v-Rm[ck{`U#]giKv3>)!&6Ri154s,KuGB_%@r68r:dJ|t`#X(9<E|u2@H|rx3gJu?w'!+'1Nu7Reg4=H~+9<wxgY95Rm]xLggZ-`(X}U2:Ri4h<uOawRmsJv__5@bb{jbV~3dka#a'a]!,#a+U=a>b6a3b%!/aKa/)!arwve^VyJ;:pR~DpTg3uJpS~<5pOPw;5qmPw:5pNOu!5pQJvG'!6Vyx=<qoJvA!{~Jup!%@qk7Rn/KvyD!}''[xz;>wkh'?Rh,x8gyt`w5D!&),(SgyccRgztJ@3pPB5p#d'(Y#<]mmifubw&RgoJvE&!82s^JvF&!8Rf,ADb]~;x=h'rNu]vK!,%'*0RnORh)4Rh*AqQg-vaRnNg;wHwkh'ba~4cE#Ta*x3gctyw@'!+%RnFRnD<4Rn@hFvK5RnCxWg[#`&a0Ua()`1Rm75Rg[c]%X#qi8Rg^NvdRj>BwzgZauwji7Rm6A4wgg]d1#&(*,.0a#Rm;Rm<Rm=Rm>Rm?Rm@RmARmBe%#^^^Xaea?aC/b+(,!a+a#!a/!>a&Ta<aKbD!2wphBRnk[yPw}hE|.=Br-3Dtm>6Vy~g6urRf.x,hPrNav!%'RnqRo%Ro#Nu;q[Pw;5r+JwNZtM@3r)d'#Y'Weh;xChL#`&RnmRnoKu}>%(!Rne~Bs-;2wjcussJv+'!aYSO}6@B<5?ba~8LrNvj!.%*ROwungw~ng~:9;Ri^>wtnig;wHRnixDh@|(UZ.x1h@|)!#:2<H|*xHn]#-UX'3Ro)z=iT}6ARns=Bwsn_wpnaRncw]aR(#UXa&Ua*a/=]iPd'#Y&Ro'WnXf{QRm2hNvj]nZd`'T~&1`{|`#9b]{}c:'!#Wl{>@=be}]?cl{{U#:5Abb}Jds#^YaF!a*b4a#a3aPa>&Tb!bH!*a_!Eau?/a&RjY<]gj>6Vz*;:pe~DrZg,QRj1JwNZtX@wihspcJvZ&!VyX9WmOJu|!|N2WmHJvh&!]ht~Bpbcn&T(!#RmQ<s7Nu;padH#X'`+WmJ@>RmKCARhnKup=!)&Wf+:RhqNuPpf9c!#'45pd5AwghpARn(Ls@w!%,)!RmP@Wfe<E|IJva!&WmNg8vsRmLd`*.`#Y'Xa!axRn*]hrA8Rhug5s@rXg8u!RmMd8#X'X*3@rV72smdI*#UY&RmICARho~GsgxVgd)Ta'U-Y&Xa!T#RnEWnA@Wffg1uDRi0hFvK5RnBxGnG&#`%owp)@wsf+bX}Ze-*1!a*^^^Ua|!#a.aq&Ya2!a>.a6!a:aO`aJDtL[y`@Wg#>6Vz12@wzoYRoZNuPRi!NuPRhzg=ucRi,@=b`{Yg=ucRi-ACJvB!&Sh[ebSh]ebi`wUuFRm4Jw2_[y0JvB!.<Ju(!&SoG}6Shd}6<Ju(!&SoH}6She}6Kur@._g5vHRieJvx!{L2G{Kx6gd'T#?Rh82Wi5cZ#X(g1w)Rm5dW-Y(Ta#!a)!#aYa=wnfE=su2>>bU{0j9udv:<svj8uQv-7RgHdE%#^'sq9sp=>Bb_{TJv`!&g/r|snj6v(us5d,#Y(56H}[978H}]Jw5!&g1rushJvB!+j;v{u5?zDhd}6}bj;v{u5?zDhe}6}ce*#`(^^^a[aea!=!a6a*aoXb1a.!aAbL!b>,b'aL!aV@Wf|2Wlg3[y/JwNZt^@3piPw:5pgJunZou3@rsJva&!Vy_g<v~Rm#JvG'!6Vz0=<r{Ju{%!:pj@WfsiXuJu3Rm:JvZ&!WfA~Bph@c4Z&Dtwax5rubx(#:awRk1@d,#Y&RfjRfid1#,Y(@Wfp2Wlrg5s@ryKu[@!,'=]ig9wlk?Rk>g5u-rqJvy'!@9RkQcH(T#=>Ri~@<wkj(Wj(KuZB*!&<7rw@9RkRcH(T#=>Ri}@<wkj)Wj)dg(Ta2Xa9X#`-!a*CARhg@@=I}d9x;c~#X%so=<sj>2@@=aybb}XjWv0Q~EfEj3vLv;<d,#Y(56H}`978H}_dgaPaFa'a/!#a3Y0a_a;a|!1(a7-[yE3[xt;:pJNvZrrg3uJrvJwNZt=@3pIh=rt3rxPw:5pGOu!5rpJvG'!6Vys=<rz@c4Z&Dt(ax5rtJvZ!&~BpH@wsfNg-vaRlNci*U#=<wei<F}a5@Jq.!a*JQ!%@qZ23d(#Y&RjH5]jCk!u7w&u0udARjFd/prq=tyvpaEa(a:.!a1aZ(@@=I}:9wpd%=<sX55w_h}@@=I{t=ay<aU@@=I}T=ay<2@@=I})?C9:9au@9Cb]}DP~=x-fAZ(2Wl1=ay<aU@@=I}>5@d##Y+jTv|vV~EfFj]uNpn~FRfGdgaK!Z2&!a8a-Tb({E!acTbM*!a(DtY[yYd'%Y#sl[y*hHvh>Re5x2c{Z}.j4uCvcawRiMd+#X+_x&d!},<5RkX;2Hzw@x,gavfB-!{CcF&T#Roe;RodwWbBg5urRgaKvHC*_6Vz+<4opieuew&Rmq@d]&Y)X,T#X0Rh}<BqP=4qS9:ReMg/ujReNJw0!/<Jui%!bd{kawwnemRelAxUa?a3#*.&UX(Ya+a/RhvRnQ<o}9Wmtd-#Y&RgSRmw9;Rmxay=Rmyg-vaRmuxEhSrNu,v-voC!%(aR.a(a7+1Ro1>Ro5CE{A9b]{@;5x#eO{:g;urRi+KrNA!%(Ro3>Ro79;Ri_Ku@>{;&!x%gX|{KunA_+g5QRj/g3u5Rj#g>uERj%wio/xRhS&!,!#^1U}wba{8>>@=be}qC@:D5ba{7Ku+A&!}x?ba}t>>@=be}se(aA^^^Uat!b0#{pa+awUazbGa#aLb9bgaWac'a5TbS=Br!d1#`%scp_Jvl!#rT>Re0JvX&!VyN=H{Fcm#U&:pY=ReaJv2&!]h0=]nUJvG'!6Vy|=<r%JrM_=]h2@Wlud'#)U'Wf'b]{i=]h/Jvh!&~BpWg=v]RnMx+ny#'Nu;pVwjnu=]nwxJnx,T#`&Reqwjnt=]nvieu9vrRjLLuYwP(#+!th@wih5pX~Gr'g5v/Rh4KunA'!-CARnP@wwiN:Rm_9x'cvw>!|l=<saKvAA!0&3@q}>w^e1bp#&Re2Re3BDx7gH#T|f5H|eKuZ>!%(:qNAH{]Jv6!+3B2B9=b^{X<5<B92:E{ZLvhwA(a;a%!igQuyRmad+#Y}m@3Rh5d8#X'X*:AqUAHzmaxwbh<aXRnVcF}RT#Nw&cj#U(BWnug/vsRntdka)(a3+.Zb7aYYan1!bVa@Xa}[y^@b[{G=H{+hFu73Rj&Pv#5ReQcK%T#sig1v{Rj'Ku+D#'!t]~Grm~?rkKuMB!01d5#`'Vy.ta3Dtu~Hroc8#'{^45s85AwZbP&!#Rn!wghxWn#KvEA!)&2RlA2RlBx:h|#(T,=]j09Wobz>x]z/@awRoTd+#Y(az]hFhCrm4d,#Y+jTv|Q~EfMj]uNr|~FRfOdCa!Xa9_X#@<plJvf!%b`{(9;Rgwc;.!#2x7cw#T|UDb]|T5Ju={(!=@E{&Jv)&!Ab`{'awJvf!~*>>@=be{#KuY>!+&4Ezyi[ugv&RjIdea+T)#UXa&T-T&a!Rh9auRmW=]kLg5vuRn+g3u4Rn-Ow6ARn,hHus5xNk?#UX(U~)/g8v0RkD~AwkkF?Ri.OuNBwkkA?Ri/d|a2`a*^UYa.!aBTZaTa'Xa;!(!2!-a#b2[yC>6Vyq3[xr2Wi?g1rusVh%s?DtF~<5rbJs;%!DtBfswKtCj[uvuSsEu3RgVx3o:u+wN'*Zt;@3rd~Grh~?rfg8w)Lq)qE&-a%!>bI|`jWv0vV~EfCjTv|vV~Ef@j]uNpn~FRfBcK#T']gWNu7x,k7q4ai(0!hHv8<RhmkMu9vrsBuev/RhlCJvB!,g<v{wchh~@:Rhji[vrv{wchi~@:RhkdS&a5UY#Ta!RgPwwiI5BwciI~@:Rh`x'iJvj'!5]iJPu8Bwch]~@:Rhach)U#h3rp]gLh@t|Ax,hTq3ah!-(~@:Ro0Ou!5RhXj^v(pyw8unRhVd|)`,^UYas!a?/a2Z'a^Ta{Tb7Ta(a#!a,Wf&9sZ3DtAadamov=Bqt3[xig8vsRm~>waiL2b`{QJv*_Ouv2qgj<v]v2BqfdR'X*X#Y-@3qr~Gqv~?p6hHv-]glPup5Lq+q?_%*b_{qF{n9b^{rOu4ARhpKvCD!+&~Bqp:5Dbb}nwoiKl&unuTuBv]v+ueunaXRf0=Jvh!0nKufu8v1w&w7q%w&uHrz:Rgnj5w,uxDJq/(!hNw'5ReCk0s2u3w/w'5ReFd>Za&!*UaA=<wkgsRnSJv^!%Refifw3vyRgOKu_B'!,<]gkiiu:w&Rh<=C@a^<B57@2F{[<B5@aW:=3away9A5aW=<B=C@a^<B57@2F{Ie-#`(^^^bCara.b8aza6!/bZ,!adTbnTbOb+aFaS!aAT9@Wf~2Wli3Dtl2@d,#Y&RfnRfmJwJZtN~GqyJva&!VyMg<v~Rm%iXuJu3Rm9Jv[_=]ih9wlkDRkCd1#`(@Wg>2Wls3cH#T(@<Rj*=>Ri|b~'#23s9h<~El.d'#Y&Dtxi^rzvdRl#d*#U%(o|B2s`hJwSaxRmDKv4B&!1:Rmdd5#`'Vx}to~Hq{x'f1v3(!BA5ba|bJv_&!Wfug1v]ReIdO+U/Y#&G}-8wze=Rh{g1v]ReHg/uQRf/by#)ibQwERl/cH#T(@<Rj+=>Ri{cNu+vlax-!(#a0qa9<Rii2;;bU{H;x<i=&X#Rk`<4wwi=C9H~8xAI(Y#<azRi@45wXI<B9;5bb~7dL(X#Xa(+!aL6Vy{g5QqOau:5au2@ay547EzbxOcU(UX-T#Ta#:Cbb|A?wjh/b_|SOw6ARgtihr}u7Rhy<d1#T)X1@@=I|~=ay<2@@=aybb}Sj3vLv;<d,#Y(56H}A978H}@dGpvs@uAu`vcw9*!aFa+ai%(b!aXa8.a?a[ozWey=sU2@G}Nch&U#Rf_WexKu+D#'!t:~Gr`~?r^j]uNr|~FRg*j^psurwJt|RmcKv)@&!)7Rkv~Br[@wxfO:Rl3co#U'6Rezj_q#vIuavjRltwzeyh@vr5JqD0!>aY?C9:9au@9Cb]}9cl#U*5;5<H||jbuus1ucv&Rfvg1v~d/pppzqFr^a--a~!aMat1(hFv;Wiz@@=Izoj5uuv-7Rix~Cw`fk2WlVcZ#X,k)u3vWs@u2]ktg;wEx'fBq(_2Wg/jTv|vV~EfoJv]!15x'hzqG!(P~EfU~CRl_j6v(us5x4i-#T(2WmZ?C2F|d>Kq<aj1!*jTqIsBv=Wl`~Cw`fi2WlWj`v0u*~>RlR=c>Z,k#u3vWs@u2]kr<c1Z+jTqIsBv=Wla~Cw`fm2WlXdmb3!a{(arZa`bkTa%TbQTa-a9+c'!aM!/[yL=Bqug.w'RifhFvyDRj.g>vgwyk^9]k^Jv3_@WfbAARkhJw2_[x|JvB_wkoIRoKwkoJRoLd'(Y#<]gm=<9<H|yd'%_X#skDtb3awwqkgNulRkgdB#^',9:p'hJwSaxRmEBwVb8@4=H|qLu+w50&!)@3qs~?pU>Awwn;;Rn=c:Z'ARn<=<qwKvC@!/&~BqqJv6!&]eVb^z^xRge'/a%+^`#Sge}6<4Rn3=]n0Pw2>Rn8Jw0!&>Rn:>Rn6cY#a7+!a&=<wkaNw~h3z_c5Z{=wjh#=]nLKv^D!&)Vyz=bW|swYb<WetcG#T(2wxa@qVx@gD#Y&b^|V5JwG&!5bb|pg/w&RgD@x=kHs=uAvn!a%%/'+RmSRh694Ro`g-vaRmRhHv-]mlxCcS#`&ba~.5cD#Ta)P~=d,#Y(56H{>978H{Dd_#{2^Y%_+qbbb{6g3sERhsbU{?dfa.,`a(Xa<!aiX#(55RiG54RiHcI#T'WiU3RiVNvdwtfcRlKNvdd,#Y&RlHRlExQgf.1*^T'X#Sgf}6Wn4=]hfPrk>Rn7Jw0!&>Rn5>Rn9Lunw?&a2!,5<oq@@wqfdRlJj5Q~=d,#Y(~ARfcOuN]fdDKw;ay(}i!547E}j?cI#T(@5bV}iCbV}hdv(^^Tb?a40,b##Tbo!a*bR!a<b|a/!aKai!aU[yK=]o^g:v>ReGJwPZtK<7Rh+h<~El,Pv#5ReR@awwxjCg,ulRjDJv6&!]j!z?aQeeg>w=Sh<eeJw;!&axEzOg,Qosc!#*:wkeJ]eJ>x'h-u(!%Ro.w~h.zPdNZ(X,Ya![x{;9ReY;wkgxRiF:x?ap#Y&RmUg<s2Rkod]+UY0TZ'!a&A9sw<=bczLNvuw{gqzNhJwSaxRmCKuLay!#&s_Rf-55b^{uJvZa!!c%#(55Ri654wmiu5RiuawLu,vp!+}^%b_}Y9;wkgxba}o>A9:=b^}zKuh=a''!3awRk3c*'!#aHRk6c+Z&Rk5Rk4Jv)&!awRjSawd9*`#0?C2@EzMj8u<uJ5RmbjQrquJu3x,k>uq@_+=ayb^|W~ARkEOuN]k@7dhzV^X/X&a-#zRzSb`zXcJzTT#2WkVKvDBzW!%FzY9;5bbzWjQrquJu3Jw3%!b`zU=ayb^zQd:#X(T-a!6Vyywxh}=b]{Jg=u1RiAdGp~qHtzv!w(wA+a+a;<!aJaYai'anasb(=azRmV:Cbb{MLq2vb!%')RjuRjrRjtRjqx3jnqCw3!%')Rk(Rk+Rk&Rk)Lq2vb!%')Rj{RjxRjzRjwLq2vb!%')RjsRjpRjfRjex3jcqCw3!%')Rk'Rk*RjkRjl9<CbbzfOu4ARhxLq2vb!%')RjyRjvRjhRjgx=joq*uKvb!%')+-Rk.Rk%Rj~Rk-Rk#Rj}x=jdq*uKvb!%')+-Rk,Rk!Rj|RjmRjjRjidAq&qKs@uAv8Aa.'*-a@a&0!aM@a5[y73Dsy3Ds|3Dt):wxgI2sHJwJZt.~Gqxwsf0ikrzt}Rl0Jvy_[xj~HqzKv_A|D!&WfP8axRoVcf,U#k(v]v+ueunaXRf1Ju}'!g8u#Ri=jQw!sCunLprq>!,')~<5qeGzq9F{W=c##%s5au:5aU3CBE|;d4#X(D!a&6Vygx(b;#(=]ed?C2F{N<capoq2r[a&!aPa9,'Pw;5s:@@=I|,55w_h|@@=IzcP~=x'fCqB_2Wl2>aU@@=I|1OuNBc1Z+jTqIsBv=Wlc~Cw`fl2WlZ~AcTa%!Z+jTqIsBv=Wlb~Cw`fh2WlYk+uNqJsBv=WlSg,u3dca3#UXaMYa)TaB-=cM|7T#<bI}l5@B932:aV2G{BOuNBJq:|M!5Ezt=<B=C@a^<B57@2F{v>cB{/T#=ay<bI{3Jv6!a.6BKq0ah&+!5E}HP~Ef{978BaU@@=Iza<7d#.Y#978BaU@@=IzH~AJq0!(@@=IzG978BaU@@=IzFe,aU*Y&^^^bvJb,b:bFad!a,c2Ta>aL.bo6!a#CbTa'T#Re{2Wlh2@G{yg6t~Ro_NvdRfticuRQRllJv3&!x&c|zs@Jw3!%RflwpfkRlpKuL;%(!Re<@G|C2GzdhIvuBwgjAg-u0RjAKQB%!(GzZ@G|5NuuRl7d='T+Y#Vy[g<v~Rm!==G|>JvA!)@wma=]m1ifuaw&RmnLs@vT'!|/+[y,g:v>ReTJw1!#qX=x!eC{bLu+wT&)ZtZauq_~Graci&U#F|89:r_Lupvq!.)&2RlG8RfaC=x!eF{_h?rpWlmd&'!#X|&]k::xJey#`'T|+<E|&2@H|%dE#(^,g;u.RiEg6vjRiC9xCkA{O|zY#g=ucRmXKs0@!&*@G|m@awRknJuh!,3d(}gY}eJvj!%Rm):Jw3!%Rm+Rm-Ls0w(&!a(a#@b[|6cZ#X'7RkxWgAOu4ARn'dH'U#Y*Vz-Wm'CARm}d]*#a%^a*T'aK!a<9bV{PC=p*Jw4!&SgxcbB5r]idw(wBRmF7xFkt#&`(Rm/Rm8E|!JuY_9:Rl5=wrgr2:bbxd@xXfB(a*#T+!.X0X1Ta/a'T&RlDRfL>RlyARl9b[z[>RfZ:RlL:RfRwlg/ARl;9;RlxKv,A/!%7s69<74=BA5ba{-8Bde#`a<XaKYa1,a'P~=wxfB2bZ}}?C972@@=I}r8@55B9;5bb}G978B2@@=aybb}3j3vLv;<Jw3&!>Rfk=ayb^}4~Ad1#`*@@=aybb{w2@>==<bbz]dx+UY#^UaF!a9!bB'Ya1.!ajXa#%olRhD[y=3Dt#Ov5BrHKuMB%!(Rf^Wep~HrJwkiQjKr|~FRg)Ku+D#'!t5~GrF~?rDdV)UY,Z/_7RkuG{<~BrBg,rlsO:235B@bX}|d?a1!#`(6Vyn5@d##Y+jTv|vV~EfIj]uNpn~FRfH7Lq2vb1!a9-978BaU@@=Iz9978BbU}#~AJq0!(@@=Iz8978BaU@@=Iz7~AJQ|}!978BbU}!JvkaK!AdUa21-U#`a+(g/vsRn~Ou!5RPj:rmu9WhOjXuvvNr}:RhAj^v(pyw8unRn[kPr}p|u7vwv]RiSBd;pppzq@qHQa?(b.!a.a`@.|xa(hFv;Wiyj5uuv-7Riw~Cw`fg2WlU978BbU|wOuNBJqG!(P~EfD~CRlQcZ#X,k)u3vWs@u2]ksg;wEx'f@q1_2Wg.j]uNpn~FRfqJv]!15x'h{qG!(@@=IzK~CRl^j6v(us5x4i,#T(2WmY?C2F{1>Kq<aj1!*jTqIsBv=Wld~Cw`fj2Wl[j`v0u*~>RlT=c>Z,k#u3vWs@u2]kq<c1Z+jTqIsBv=Wle~Cw`fn2Wl]dn1#c(a(b^a2!b/bAT(bj!aDa7bu,a_a{c0!2T0g:v>ReD2@G{42@G{5~DpM~<5rc=Bx6i>{RT#RnI@zCx]y]z:2Jv[!zr5Awyk]9]k]dD(Y+X#6Vz.g=wKtgwhaCwgmTWj2Lu,w%_+/[y-B;b^xeg3u3Rj-2@bX{*KrJ<!+'@Wg(g?QRlC@Jv`!%b[zIwsfII}8JQ_@w|kW|=Jv(%!AqcOuNBJvEzh!bYzjLs@wP#(0!oy@>RkdJwMZtc3Dtd@BcG#T'9bWxg2@2Fznd*#Y+;2x'c}w<zizixNgwa#Z'U+!/!a'!a+w~g~z6wcn{Rn}wcnzRn|5Rh%=]nJg5vuRmvNvdRlvcprJu}w*az*a#!%.a.'Bot9qT]kj@Wg'ay2Gzv@Jv`!%b[zEwsfHI}1;ck#Ux`<Cbbx_Lu+w!a&0*!wko*wwo,So,}6Juqxf!E}PigQuyRm`d3(`#8>Rn%:A5B;bZ~%KvhCa!a2!x>k7#Uxb@b{#xaRk7Jw0!)>wwhlShl}6>wwhmShm}6CJvB!.x'hhvj{!!5Bwkhhbaz}x'hivjz~!5Bwkhibaz|xEhTrNu,v-vpD!a%&/)a3a.,%Ro2t[CE{)@3re9b]{%wjo09:rgc:Z&Ro6=<riifuaw&RmoKrNA!%(Ro4>Ro89;Ri`dSaL'UYzxZb)7Rka3xRhT&!,!#^1U}vbaz{>>@=be}yC@:D5bazzKu+A&!}{?ba}y>>@=be}wxBh[t`u~vJvr!%a!a()a,a0a4RoC=]o;Ju(!%RoGRhdwjh`=]oAg>w#Ro?g5vuRo=NvdRl|Ku]C.!&;RoEJvB!%RoORoMBx'h[v+_?w~h`}~5?w~hd~!xKh]oiptu-utv.vp!#%&a30a@a'a+(a/aOp(o~p!RoDJu(!%RoHRhewjha=]oBNvdRl}g>w#Ro@g5vuRo>c[#X']o<CauRoRAd-#Y':RkpauRoQKu]C.!&;RoFJvB!%RoNRoPBx'h]v+_?w~ha}t5?w~he}ue!/UbhYacXaW^Tc&a;b:a-c/#b&aja1(!cL+!bKbt!bmcRc9aIc?8[yW3Dtt94Rg`Jv}!&SiRMzBhEebShEMNuPRe>x7gL#TzuwjirRipc<Z&>on;>z=h-MSh.Mwqczx'a7vj&!>Re4@=ResJt__NuPRi*NuPRi)j]uNr|~FRfzKrJ>_+@Wfy@Wf]2WocKrJ<!+'@Wg%g/QRl@@Jv`!&awRl<wsfFIzgLu(w*!.*&ShBMwvhIRhI9;RhNx1hK'!#Sn]Mx1hK~0!#:2<H~7cNu+w7D*'1ZtW>Rn1~?rOc:Z&Rn2=<rQ<7wjh&=BSnLMc]#X(6Vz)w[b=a!U#9wzgMc3#&(RgMRitRis<x,gKt`ax!&+SioM=BSilMc3#&(RgKRinRimKurB,!&SiQMzBhDebShDM6BJQ!(P~Efx978B2@@=I}WLrJw!!,a*&@G}O@9wkibRid@@x'fKwC!&SlDMSfLMjUv~Q~EfKKv3@a+!(hFv-]mpx/hYZ(C5RiWz<o/MwkhY?So/M@x,gbvfB*&!SgEM:SoeeehFu3:Rgbda(,^TZa)X/7Sg[eb:2RgI~BrMC@wgkc:wwkcRerx3h(uUvK!&*,SnOM4Sh*MArRg;wHRh(x=h;rJvPwI!a4',a'0@Wg&=BSh/Mg>w=Rh=g3w*wwgGRgGcW(X#;Sg}M2Gzk@Jv`!&awRl=wsfGIz`dKZ*T'Y-:RhR7RhQg5u-p`j6v(us5d,#Y+~Awkia?RicOuNBwkibba}Ld6p~tyu_vbAa'a+!a/'a3aEa8a!>Sh,ebJv{!&Sh@ebSaReb9;SgwebNuPRi(NvdRl)NuPRi'hHu^<Rm^Jvv_@Wl(g;u1Si/ebKu'B&!*Sh?eb@Wl'z@aPeb95Si.ebcpputyvjB)!,&a+0a%ShAMWeK@G}C@WfJ9;RhMwvhH9w{ia}ix,hJvRA1(!zAn[MRhHx1hJ~*!#hFv(BSn[MBJQ!(@@=I~'978B2@@=I}2db.Ua<'X}+T#a0XaG2G}E;wkg|wuh!Rh!x,hZu,@)!&So0MVy)C5RiXACJvB!&5RiY5RiZg8w)cG}*T#2@bU}=KsA>(!a.3wkhZba~(x,h^u(A!&(SoCMRhb5Bz=h[eb?w~hb~6x,h_u(A!&(SoDMRhc5Bz=h]eb?w~hc~6e)aA1T#T,^^^c-bMb&blcPaP(a/!0!bA=b5c@a(!bfbrc#2afwmhARnjwchORnp2Wlf3DtsNvdRl-2@wpa<]m0bx(#:awRk2@Jw3!%RfhwpfgRlnKQB%!(G{V@G|'NuuRl6d='T+Y#VyUg<v~Rl~==G|<Jv+'!aYShC}6@B<5?ba~8@Jw3'!g2QRljhLrpWlOd+#Y'g.w'rIg>w*wgj@g-u0Rj@Lu+wT&)ZtUauq]~GrGci&U#F|39:rELrNvj!.%*RhCwunfw~nf~:9;Ri]>wtnhg;wHRnhx3hDs@v~!/+'@Wfr@9RkSNu&Rlo=@<5GzoKs0@_+@Wl+@awRkmJuh!-3d(}pY#qWJvj!%Rm(:Jw3!%Rm,Rm*de&!1U-U#`)Re;@G|.@9Ri82@wjfvRlq=@<5GzpLvOvr!).&2RlF8Rf`C=x!eE{.Jw3_g2QRlkhLrpWlPde(!#U{s,UXa*Ta'[y'g:v>ReS;x0PZ&RnlRnn~HrKJw1}f!=x!eB|2w]aP(#Xa&a*Ta.Ua2a7=]iOd'#Y&Ro&WnWg;u.RiDg6vjRiBNvdRlzhNvj]nYJuW_2Wm3x)kFze{9d])!a.!,Y01!#&aC!a3RndC=ox~BrC@2b^{pg,rlse7x'ksuq!%Rm.E{xidw(wBRmGx9o+)X#wwo-So-}69:Rl4@xSf@a#XZ'X)X,Ta(/ARl8b[xc>RfY:RlI:RfQwlg.ARl:9;Rlwdn'#^XafaQa1X1TaHTa)@b[{zcZ#X'7RkwWg@Ou4ARn&x)kG#{,g7u/RkGdH'U#Y*Vz'Wm&CARm|bx#(A]gUbUzJj9Q~=d,#Y(56H}l978H{U7d,0#U*2>ABb_xZ978BbU{e~AJQ{g!978BbU{hxMh?ad{oUYZ.x1h?{l!#:2<H{mx3n[t{vl!,&a%3Ro(z=iS}6ARnr=Bwsn^wvn`Rnbd`*T}B0!#^X'BG{c9b]{a>>@=be}F?JvS!&BG{d7BG}(Bde#`a1X,Ya@!a'P~=wxf@2bZ}I56B2@@=aybb}08@55B9;5bb}<j3vLv;<Jw3&!>Rfg=ayb^}&OuNBKuLA!)a!P~=x#fD{f2@>==<bbzl?C972@@=Ix^d6rSu,v7w*C(0a)a6#B+a%!sQ[y?3Dt%3[xn~<5rLOu!5p@Ku+D#'!t7~GrP~?rNKvlaya7'!h+v-5qMg=t|cd,U#5AAaa5Abb{S@52B5@a[@52B5Gx[iXueu;d<#`a(!/549C;ag>23ExY5@Dah89b^~689Jv)!~2b[~1Lv'w(%*!a#bX|aPrmawRe]keu7uhv-q6rxu,q`xTo]/a5aU!bNaDXbi!b-!ao!b<bwA!#5@B932:aV2G|:d-)Y#hJrL>RhG<7@C5<H|_=Cau:5aj5@B932:bJ|ng>vIbs)#?C2F|9jPv0w.vISh-MKvUaz(.!9ABbb|[5;5<H|Eg>unwfh;9:4E|YjQsBt|vjx'hYq3!(?C2F|J:2<BaY?C2F|GOu!5x,g|p{ah!-(?C2F|c9:4E|OjXuvvNr}:Rh&i[w*t|cd+U#jJvsu)vsSn~Mkfrmu9p}u7vwv]So!McW#Xa!ax5@A5aY:5;5<H|>kJv~vYrquJu3x4ib#T)2@SmZM?C2F|Bj:rmu9@xPhI(a*a#U#`a3-5Abb|L~@:RhK9:4E|0@52B5G|#C::aY?C2F|-:2<BaY?C2F|.5Jvk!a)javYrquJu3x4ia#T)2@SmYM?C2F|HAxPhH(!a#U#`a*-5Abb|4~@:RhJ9:4E|R@52B5G|F:2<BaY?C2F|Sc^#Xa2j=Qq5CJvB!-g<v{z;hhM?C2F|Zi[vrv{z;hiM?C2F|XKsA>!a)-g<v{z;h[eb?C2F|]i[vrv{z;h]eb?C2F|^iZu.vix,hZq3ah!.(?C2F|QOu!5ShXM:2<BaY?C2F|P", 13494, 2713, 49, 25, 61);
// node_modules/htmlparser2/node_modules/entities/dist/generated/decode-data-xml.js
/** Packed XML decode trie data. */
var xmlDecodeTree = /* #__PURE__ */ new Uint16Array([
	512,
	26465,
	29036,
	7,
	0,
	2,
	4,
	116,
	24638,
	116,
	24636,
	8693,
	29807,
	24610,
	621,
	1,
	0,
	0,
	3,
	112,
	24614,
	111,
	115,
	24615
]);
// node_modules/htmlparser2/node_modules/entities/dist/internal/bin-trie-flags.js
/**
* Bit flags & masks for the binary trie encoding used for entity decoding.
*
* The trie is a flat `Uint16Array`. Every node starts with one header word:
*
*   15..14 VALUE_LENGTH   Number of words the value occupies, +1.
*                         0 = no value; 1 = value inline in bits 12..0;
*                         2/3 = value in the 1/2 words after the header.
*   13     FLAG13         If VALUE_LENGTH > 0: semicolon required ("strict"
*                         entity; `;` is never stored as a branch).
*                         If VALUE_LENGTH == 0: this node is a compact run.
*   12..7  BRANCH_LENGTH  Number of branches (or run length for runs).
*   6..0   JUMP_TABLE     Jump-table offset / single-branch char / first
*                         run char (see below).
*
* Branch data follows the header and any value words. Its shape is selected
* by (JUMP_TABLE, BRANCH_LENGTH) in the header:
*
*   Single branch  JUMP_TABLE = the only child's char, BRANCH_LENGTH = 0.
*                  No branch words; the child node follows immediately.
*   Jump table     JUMP_TABLE = first covered char (> 0), BRANCH_LENGTH =
*                  table length. One word per covered char: 0 = no branch,
*                  otherwise the child's offset from the END of the table,
*                  +1 (so 0 stays the no-branch sentinel).
*   Dictionary     JUMP_TABLE = 0, BRANCH_LENGTH = number of branches.
*                  ceil(n/2) words of sorted keys packed two per word
*                  (low byte first), then n pointer words storing the
*                  child's offset from the END of the branch data.
*   Compact run    VALUE_LENGTH = 0, FLAG13 set. BRANCH_LENGTH = run
*                  length (3..63), JUMP_TABLE = first char; remaining run
*                  chars packed two per word after the header. The target
*                  node follows the packed words immediately.
*
* Pointers are end-relative (rather than relative to the pointer's own
* position) because that makes the common "child encoded right after the
* branch data" case a small constant, which compresses far better. Offsets
* to already-encoded (shared) nodes wrap via uint16 modulo arithmetic; the
* decoder masks navigation results with `& 0xff_ff` to match.
*/
var BinTrieFlags;
(function(BinTrieFlags) {
	BinTrieFlags[BinTrieFlags["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
	BinTrieFlags[BinTrieFlags["FLAG13"] = 8192] = "FLAG13";
	BinTrieFlags[BinTrieFlags["BRANCH_LENGTH"] = 8064] = "BRANCH_LENGTH";
	BinTrieFlags[BinTrieFlags["JUMP_TABLE"] = 127] = "JUMP_TABLE";
	/** Bits 12..0: the inline value of a VALUE_LENGTH = 1 header word. */
	BinTrieFlags[BinTrieFlags["VALUE_MASK"] = 8191] = "VALUE_MASK";
})(BinTrieFlags || (BinTrieFlags = {}));
// node_modules/htmlparser2/node_modules/entities/dist/decode.js
var CharCodes$1;
(function(CharCodes) {
	CharCodes[CharCodes["AMP"] = 38] = "AMP";
	CharCodes[CharCodes["NUM"] = 35] = "NUM";
	CharCodes[CharCodes["SEMI"] = 59] = "SEMI";
	CharCodes[CharCodes["EQUALS"] = 61] = "EQUALS";
	CharCodes[CharCodes["ZERO"] = 48] = "ZERO";
	CharCodes[CharCodes["NINE"] = 57] = "NINE";
	CharCodes[CharCodes["LOWER_A"] = 97] = "LOWER_A";
	CharCodes[CharCodes["LOWER_X"] = 120] = "LOWER_X";
})(CharCodes$1 || (CharCodes$1 = {}));
/** Bit that needs to be set to convert an upper case ASCII character to lower case */
var TO_LOWER_BIT$1 = 32;
/**
* Unsigned subtraction trick: (code - lo) >>> 0 wraps negatives to large
* values, so a single `<=` covers the entire [lo..hi] range check.
* @param code Code point to check.
*/
function isNumber$1(code) {
	return code - CharCodes$1.ZERO >>> 0 <= 9;
}
function isHexadecimalCharacter(code) {
	return (code | TO_LOWER_BIT$1) - CharCodes$1.LOWER_A >>> 0 <= 5;
}
function isAlpha(code) {
	return (code | TO_LOWER_BIT$1) - CharCodes$1.LOWER_A >>> 0 <= 25;
}
/**
* Checks if the given character is a valid end character for an entity in an attribute.
*
* Attribute values that aren't terminated properly aren't parsed, and shouldn't lead to a parser error.
* See the example in https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
* @param code Code point to check.
*/
function isEntityInAttributeInvalidEnd$1(code) {
	return code === CharCodes$1.EQUALS || isAlpha(code) || isNumber$1(code);
}
var EntityDecoderState;
(function(EntityDecoderState) {
	EntityDecoderState[EntityDecoderState["EntityStart"] = 0] = "EntityStart";
	EntityDecoderState[EntityDecoderState["NumericStart"] = 1] = "NumericStart";
	EntityDecoderState[EntityDecoderState["NumericDecimal"] = 2] = "NumericDecimal";
	EntityDecoderState[EntityDecoderState["NumericHex"] = 3] = "NumericHex";
	EntityDecoderState[EntityDecoderState["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState || (EntityDecoderState = {}));
/**
* Decoding mode for named entities.
*/
var DecodingMode$1;
(function(DecodingMode) {
	/** Entities in text nodes that can end with any character. */
	DecodingMode[DecodingMode["Legacy"] = 0] = "Legacy";
	/** Only allow entities terminated with a semicolon. */
	DecodingMode[DecodingMode["Strict"] = 1] = "Strict";
	/** Entities in attributes have limitations on ending characters. */
	DecodingMode[DecodingMode["Attribute"] = 2] = "Attribute";
})(DecodingMode$1 || (DecodingMode$1 = {}));
/**
* Token decoder with support of writing partial entities.
*/
var EntityDecoder = class {
	decodeTree;
	emitCodePoint;
	errors;
	/** The current state of the decoder. */
	state = EntityDecoderState.EntityStart;
	/** Characters that were consumed while parsing an entity. */
	consumed = 1;
	/**
	* The result of the entity.
	*
	* For named entities: the trie index of the best legacy match so far
	* (0 = none). For numeric entities: the accumulated code point.
	*/
	result = 0;
	/** The current index in the decode tree. */
	treeIndex = 0;
	/**
	* Characters consumed since the last recorded legacy match, plus one.
	* Invariant at the top of the `stateNamedEntity` loop: `excess` equals
	* the number of unrecorded consumed characters + 1.
	*/
	excess = 1;
	/** The mode in which the decoder is operating. */
	decodeMode = DecodingMode$1.Strict;
	/** The number of characters that have been consumed in the current run. */
	runConsumed = 0;
	constructor(decodeTree, emitCodePoint, errors) {
		this.decodeTree = decodeTree;
		this.emitCodePoint = emitCodePoint;
		this.errors = errors;
	}
	/**
	* Resets the instance to make it reusable.
	* @param decodeMode Entity decoding mode to use.
	*/
	startEntity(decodeMode) {
		this.decodeMode = decodeMode;
		this.state = EntityDecoderState.EntityStart;
		this.result = 0;
		this.treeIndex = 0;
		this.excess = 1;
		this.consumed = 1;
		this.runConsumed = 0;
	}
	/**
	* Write an entity to the decoder. This can be called multiple times with partial entities.
	* If the entity is incomplete, the decoder will return -1.
	*
	* Mirrors the non-streaming `decodeWithTrie`, but with the ability to stop decoding if the
	* entity is incomplete, and resume when the next string is written.
	* @param input The string containing the entity (or a continuation of the entity).
	* @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
	* @returns The number of characters that were consumed, or -1 if the entity is incomplete.
	*/
	write(input, offset) {
		switch (this.state) {
			case EntityDecoderState.EntityStart:
				if (input.charCodeAt(offset) === CharCodes$1.NUM) {
					this.state = EntityDecoderState.NumericStart;
					this.consumed += 1;
					return this.stateNumericStart(input, offset + 1);
				}
				this.state = EntityDecoderState.NamedEntity;
				return this.stateNamedEntity(input, offset);
			case EntityDecoderState.NumericStart: return this.stateNumericStart(input, offset);
			case EntityDecoderState.NumericDecimal: return this.stateNumericDecimal(input, offset);
			case EntityDecoderState.NumericHex: return this.stateNumericHex(input, offset);
			default: return this.stateNamedEntity(input, offset);
		}
	}
	/**
	* Switches between the numeric decimal and hexadecimal states.
	*
	* Equivalent to the `Numeric character reference state` in the HTML spec.
	* @param input The string containing the entity (or a continuation of the entity).
	* @param offset The current offset.
	* @returns The number of characters that were consumed, or -1 if the entity is incomplete.
	*/
	stateNumericStart(input, offset) {
		if (offset >= input.length) return -1;
		if ((input.charCodeAt(offset) | TO_LOWER_BIT$1) === CharCodes$1.LOWER_X) {
			this.state = EntityDecoderState.NumericHex;
			this.consumed += 1;
			return this.stateNumericHex(input, offset + 1);
		}
		this.state = EntityDecoderState.NumericDecimal;
		return this.stateNumericDecimal(input, offset);
	}
	/**
	* Parses a hexadecimal numeric entity.
	*
	* Equivalent to the `Hexademical character reference state` in the HTML
	* spec. Digit parsing matches the hex loop in `parseNumericEntity`.
	* The accumulated value is preserved for numeric validation callbacks.
	* @param input The string containing the entity (or a continuation of the entity).
	* @param offset The current offset.
	* @returns The number of characters that were consumed, or -1 if the entity is incomplete.
	*/
	stateNumericHex(input, offset) {
		const inputLength = input.length;
		let { result } = this;
		let { consumed } = this;
		while (offset < inputLength) {
			const char = input.charCodeAt(offset);
			if (isNumber$1(char) || isHexadecimalCharacter(char)) {
				const digit = char <= CharCodes$1.NINE ? char - CharCodes$1.ZERO : (char | TO_LOWER_BIT$1) - CharCodes$1.LOWER_A + 10;
				result = result * 16 + digit;
				consumed += 1;
				offset += 1;
			} else {
				this.result = result;
				this.consumed = consumed;
				return this.emitNumericEntity(char, 3);
			}
		}
		this.result = result;
		this.consumed = consumed;
		return -1;
	}
	/**
	* Parses a decimal numeric entity.
	*
	* Equivalent to the `Decimal character reference state` in the HTML
	* spec. Digit parsing matches the decimal loop in `parseNumericEntity`.
	* The accumulated value is preserved for numeric validation callbacks.
	* @param input The string containing the entity (or a continuation of the entity).
	* @param offset The current offset.
	* @returns The number of characters that were consumed, or -1 if the entity is incomplete.
	*/
	stateNumericDecimal(input, offset) {
		const inputLength = input.length;
		let { result } = this;
		let { consumed } = this;
		while (offset < inputLength) {
			const digit = input.charCodeAt(offset) - CharCodes$1.ZERO;
			if (digit >>> 0 > 9) {
				this.result = result;
				this.consumed = consumed;
				return this.emitNumericEntity(digit + CharCodes$1.ZERO, 2);
			}
			result = result * 10 + digit;
			consumed += 1;
			offset += 1;
		}
		this.result = result;
		this.consumed = consumed;
		return -1;
	}
	/**
	* Validate and emit a numeric entity.
	*
	* Implements the logic from the `Hexademical character reference start
	* state` and `Numeric character reference end state` in the HTML spec.
	* @param lastCp The last code point of the entity. Used to see if the
	*               entity was terminated with a semicolon.
	* @param expectedLength The minimum number of characters that should be
	*                       consumed. Used to validate that at least one digit
	*                       was consumed.
	* @returns The number of characters that were consumed.
	*/
	emitNumericEntity(lastCp, expectedLength) {
		if (this.consumed <= expectedLength) {
			this.errors?.absenceOfDigitsInNumericCharacterReference(this.consumed);
			return 0;
		}
		if (lastCp === CharCodes$1.SEMI) this.consumed += 1;
		else if (this.decodeMode === DecodingMode$1.Strict) return 0;
		this.emitCodePoint((this.decodeTree === xmlDecodeTree ? replaceCodePointXML : replaceCodePoint$1)(this.result), this.consumed);
		if (this.errors) {
			if (lastCp !== CharCodes$1.SEMI) this.errors.missingSemicolonAfterCharacterReference();
			this.errors.validateNumericCharacterReference(this.result);
		}
		return this.consumed;
	}
	/**
	* Flush locally-tracked walk state back to the fields, then emit the
	* recorded legacy match or reject (cold path — at most once per
	* entity). Called after failed navigation (leaf node, branch miss, or
	* compact-run mismatch). In attribute mode, reject if no legacy was
	* recorded at the current node, if we descended past it, or if the
	* pending input character is an invalid attribute terminator.
	* @param consumed Locally-tracked consumed count.
	* @param excess Locally-tracked excess count.
	* @param char Pending input character (may be the mismatching char).
	* @param valueLength Value length at the current trie node.
	*/
	flushAndEmitLegacyOrReject(consumed, excess, char, valueLength) {
		this.consumed = consumed;
		this.excess = excess;
		return this.result === 0 || this.decodeMode === DecodingMode$1.Attribute && (valueLength === 0 || excess > 1 || isEntityInAttributeInvalidEnd$1(char)) ? 0 : this.emitNotTerminatedNamedEntity();
	}
	/**
	* Parses a named entity.
	*
	* Equivalent to the `Named character reference state` in the HTML spec.
	* @param input The string containing the entity (or a continuation of the entity).
	* @param offset The current offset.
	* @returns The number of characters that were consumed, or -1 if the entity is incomplete.
	*/
	stateNamedEntity(input, offset) {
		const { decodeTree } = this;
		const inputLength = input.length;
		const isStrict = this.decodeMode === DecodingMode$1.Strict;
		let { treeIndex } = this;
		let { excess } = this;
		let { consumed } = this;
		let current = decodeTree[treeIndex];
		while (offset < inputLength) {
			while ((current & (BinTrieFlags.VALUE_LENGTH | BinTrieFlags.FLAG13)) === 0 && (current & BinTrieFlags.JUMP_TABLE) !== 0) {
				const char = input.charCodeAt(offset);
				const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
				const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
				if (branchCount === 0) {
					if (char !== jumpOffset) return this.flushAndEmitLegacyOrReject(consumed, excess, char, 0);
					treeIndex += 1;
				} else {
					const slot = char - jumpOffset;
					if (slot >>> 0 >= branchCount) return this.flushAndEmitLegacyOrReject(consumed, excess, char, 0);
					const stored = decodeTree[treeIndex + 1 + slot];
					if (stored === 0) return this.flushAndEmitLegacyOrReject(consumed, excess, char, 0);
					treeIndex = treeIndex + branchCount + stored & 65535;
				}
				current = decodeTree[treeIndex];
				offset += 1;
				excess += 1;
				if (offset >= inputLength) break;
			}
			if (offset >= inputLength) break;
			if ((current & (BinTrieFlags.VALUE_LENGTH | BinTrieFlags.FLAG13)) === BinTrieFlags.FLAG13) {
				const runLength = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
				let { runConsumed } = this;
				if (runConsumed === 0) {
					const char = input.charCodeAt(offset);
					if (char !== (current & BinTrieFlags.JUMP_TABLE)) return this.flushAndEmitLegacyOrReject(consumed, excess, char, 0);
					offset += 1;
					excess += 1;
					runConsumed = 1;
				}
				while (runConsumed < runLength) {
					if (offset >= inputLength) {
						this.treeIndex = treeIndex;
						this.excess = excess;
						this.consumed = consumed;
						this.runConsumed = runConsumed;
						return -1;
					}
					const charIndexInPacked = runConsumed - 1;
					const expectedChar = decodeTree[treeIndex + 1 + (charIndexInPacked >> 1)] >> ((charIndexInPacked & 1) << 3) & 255;
					const char = input.charCodeAt(offset);
					if (char !== expectedChar) {
						this.runConsumed = 0;
						return this.flushAndEmitLegacyOrReject(consumed, excess, char, 0);
					}
					offset += 1;
					excess += 1;
					runConsumed += 1;
				}
				this.runConsumed = 0;
				treeIndex += 1 + (runLength >> 1);
				current = decodeTree[treeIndex];
				continue;
			}
			const valueLength = current >>> 14;
			const char = input.charCodeAt(offset);
			if (valueLength !== 0) {
				if (!isStrict && (current & BinTrieFlags.FLAG13) === 0) {
					this.result = treeIndex;
					consumed += excess - 1;
					excess = 1;
				}
				if (char === CharCodes$1.SEMI) return this.emitNamedEntityData(treeIndex, valueLength, consumed + excess);
				if (valueLength === 1) return this.flushAndEmitLegacyOrReject(consumed, excess, char, valueLength);
			}
			const next = determineBranch(decodeTree, current, treeIndex + (valueLength || 1), char);
			if (next < 0) return this.flushAndEmitLegacyOrReject(consumed, excess, char, valueLength);
			treeIndex = next;
			current = decodeTree[treeIndex];
			offset += 1;
			excess += 1;
		}
		if (!isStrict && current >>> 14 !== 0 && (current & BinTrieFlags.FLAG13) === 0) {
			this.result = treeIndex;
			consumed += excess - 1;
			excess = 1;
		}
		this.treeIndex = treeIndex;
		this.excess = excess;
		this.consumed = consumed;
		return -1;
	}
	/**
	* Emit a named entity that was not terminated with a semicolon.
	* @returns The number of characters consumed.
	*/
	emitNotTerminatedNamedEntity() {
		const { result, decodeTree } = this;
		const valueLength = decodeTree[result] >>> 14;
		this.emitNamedEntityData(result, valueLength, this.consumed);
		this.errors?.missingSemicolonAfterCharacterReference();
		return this.consumed;
	}
	/**
	* Emit a named entity.
	* @param result The index of the entity in the decode tree.
	* @param valueLength Encoded value length (header plus any value words).
	* @param consumed The number of characters consumed.
	* @returns The number of characters consumed.
	*/
	emitNamedEntityData(result, valueLength, consumed) {
		const { decodeTree } = this;
		this.emitCodePoint(valueLength === 1 ? decodeTree[result] & BinTrieFlags.VALUE_MASK : decodeTree[result + 1], consumed);
		if (valueLength === 3) this.emitCodePoint(decodeTree[result + 2], consumed);
		return consumed;
	}
	/**
	* Signal to the parser that the end of the input was reached.
	*
	* Remaining data will be emitted and relevant errors will be produced.
	* @returns The number of characters consumed.
	*/
	end() {
		switch (this.state) {
			case EntityDecoderState.NamedEntity: return this.result !== 0 && (this.decodeMode !== DecodingMode$1.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
			case EntityDecoderState.NumericDecimal: return this.emitNumericEntity(0, 2);
			case EntityDecoderState.NumericHex: return this.emitNumericEntity(0, 3);
			case EntityDecoderState.NumericStart:
				this.errors?.absenceOfDigitsInNumericCharacterReference(this.consumed);
				return 0;
			default: return 0;
		}
	}
};
/**
* Determines the branch of the current node that is taken given the current
* character. This function is used to traverse the trie.
*
* See `BinTrieFlags` for the branch-data layouts handled here.
* @param decodeTree The trie.
* @param current The current node's header word.
* @param nodeIndex Index of the node's first branch-data word (the header
*   plus any value words have been skipped by the caller).
* @param char The current character.
* @returns The index of the next node, or -1 if no branch is taken.
*/
function determineBranch(decodeTree, current, nodeIndex, char) {
	const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
	const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
	if (jumpOffset) {
		if (branchCount === 0) return char === jumpOffset ? nodeIndex : -1;
		const slot = char - jumpOffset;
		if (slot >>> 0 >= branchCount) return -1;
		const stored = decodeTree[nodeIndex + slot];
		return stored === 0 ? -1 : nodeIndex + branchCount + stored - 1 & 65535;
	}
	if (branchCount === 0) return -1;
	const packedKeySlots = branchCount + 1 >> 1;
	const branchEnd = nodeIndex + packedKeySlots + branchCount;
	for (let index = 0; index < branchCount; index++) {
		const key = decodeTree[nodeIndex + (index >> 1)] >> ((index & 1) << 3) & 255;
		if (key === char) return branchEnd + decodeTree[nodeIndex + packedKeySlots + index] & 65535;
		if (key > char) return -1;
	}
	return -1;
}
// node_modules/htmlparser2/dist/Tokenizer.js
var CharCodes;
(function(CharCodes) {
	CharCodes[CharCodes["Tab"] = 9] = "Tab";
	CharCodes[CharCodes["NewLine"] = 10] = "NewLine";
	CharCodes[CharCodes["FormFeed"] = 12] = "FormFeed";
	CharCodes[CharCodes["CarriageReturn"] = 13] = "CarriageReturn";
	CharCodes[CharCodes["Space"] = 32] = "Space";
	CharCodes[CharCodes["ExclamationMark"] = 33] = "ExclamationMark";
	CharCodes[CharCodes["Number"] = 35] = "Number";
	CharCodes[CharCodes["Amp"] = 38] = "Amp";
	CharCodes[CharCodes["SingleQuote"] = 39] = "SingleQuote";
	CharCodes[CharCodes["DoubleQuote"] = 34] = "DoubleQuote";
	CharCodes[CharCodes["Dash"] = 45] = "Dash";
	CharCodes[CharCodes["Slash"] = 47] = "Slash";
	CharCodes[CharCodes["Zero"] = 48] = "Zero";
	CharCodes[CharCodes["Nine"] = 57] = "Nine";
	CharCodes[CharCodes["Semi"] = 59] = "Semi";
	CharCodes[CharCodes["Lt"] = 60] = "Lt";
	CharCodes[CharCodes["Eq"] = 61] = "Eq";
	CharCodes[CharCodes["Gt"] = 62] = "Gt";
	CharCodes[CharCodes["Questionmark"] = 63] = "Questionmark";
	CharCodes[CharCodes["UpperA"] = 65] = "UpperA";
	CharCodes[CharCodes["LowerA"] = 97] = "LowerA";
	CharCodes[CharCodes["UpperF"] = 70] = "UpperF";
	CharCodes[CharCodes["LowerF"] = 102] = "LowerF";
	CharCodes[CharCodes["UpperZ"] = 90] = "UpperZ";
	CharCodes[CharCodes["LowerZ"] = 122] = "LowerZ";
	CharCodes[CharCodes["LowerX"] = 120] = "LowerX";
	CharCodes[CharCodes["OpeningSquareBracket"] = 91] = "OpeningSquareBracket";
})(CharCodes || (CharCodes = {}));
/** All the states the tokenizer can be in. */
var State;
(function(State) {
	State[State["Text"] = 1] = "Text";
	State[State["BeforeTagName"] = 2] = "BeforeTagName";
	State[State["InTagName"] = 3] = "InTagName";
	State[State["InSelfClosingTag"] = 4] = "InSelfClosingTag";
	State[State["BeforeClosingTagName"] = 5] = "BeforeClosingTagName";
	State[State["InClosingTagName"] = 6] = "InClosingTagName";
	State[State["AfterClosingTagName"] = 7] = "AfterClosingTagName";
	State[State["BeforeAttributeName"] = 8] = "BeforeAttributeName";
	State[State["InAttributeName"] = 9] = "InAttributeName";
	State[State["AfterAttributeName"] = 10] = "AfterAttributeName";
	State[State["BeforeAttributeValue"] = 11] = "BeforeAttributeValue";
	State[State["InAttributeValueDq"] = 12] = "InAttributeValueDq";
	State[State["InAttributeValueSq"] = 13] = "InAttributeValueSq";
	State[State["InAttributeValueNq"] = 14] = "InAttributeValueNq";
	State[State["BeforeDeclaration"] = 15] = "BeforeDeclaration";
	State[State["InDeclaration"] = 16] = "InDeclaration";
	State[State["InProcessingInstruction"] = 17] = "InProcessingInstruction";
	State[State["BeforeComment"] = 18] = "BeforeComment";
	State[State["CDATASequence"] = 19] = "CDATASequence";
	State[State["DeclarationSequence"] = 20] = "DeclarationSequence";
	State[State["InSpecialComment"] = 21] = "InSpecialComment";
	State[State["InCommentLike"] = 22] = "InCommentLike";
	State[State["SpecialStartSequence"] = 23] = "SpecialStartSequence";
	State[State["InSpecialTag"] = 24] = "InSpecialTag";
	State[State["InPlainText"] = 25] = "InPlainText";
	State[State["InEntity"] = 26] = "InEntity";
})(State || (State = {}));
function isWhitespace(c) {
	return c === CharCodes.Space || c === CharCodes.NewLine || c === CharCodes.Tab || c === CharCodes.FormFeed || c === CharCodes.CarriageReturn;
}
function isEndOfTagSection(c) {
	return c === CharCodes.Slash || c === CharCodes.Gt || isWhitespace(c);
}
function isASCIIAlpha(c) {
	return c >= CharCodes.LowerA && c <= CharCodes.LowerZ || c >= CharCodes.UpperA && c <= CharCodes.UpperZ;
}
/**
* Quote style used for parsed attributes.
*/
var QuoteType;
(function(QuoteType) {
	QuoteType[QuoteType["NoValue"] = 0] = "NoValue";
	QuoteType[QuoteType["Unquoted"] = 1] = "Unquoted";
	QuoteType[QuoteType["Single"] = 2] = "Single";
	QuoteType[QuoteType["Double"] = 3] = "Double";
})(QuoteType || (QuoteType = {}));
/**
* Sequences used to match longer strings.
*
* We don't have `Script`, `Style`, or `Title` here. Instead, we re-use the *End
* sequences with an increased offset.
*/
var Sequences = {
	Empty: /* @__PURE__ */ new Uint8Array(0),
	Cdata: new Uint8Array([
		67,
		68,
		65,
		84,
		65,
		91
	]),
	CdataEnd: new Uint8Array([
		93,
		93,
		62
	]),
	CommentEnd: new Uint8Array([
		45,
		45,
		33,
		62
	]),
	Doctype: new Uint8Array([
		100,
		111,
		99,
		116,
		121,
		112,
		101
	]),
	IframeEnd: new Uint8Array([
		60,
		47,
		105,
		102,
		114,
		97,
		109,
		101
	]),
	NoembedEnd: new Uint8Array([
		60,
		47,
		110,
		111,
		101,
		109,
		98,
		101,
		100
	]),
	NoframesEnd: new Uint8Array([
		60,
		47,
		110,
		111,
		102,
		114,
		97,
		109,
		101,
		115
	]),
	Plaintext: new Uint8Array([
		60,
		47,
		112,
		108,
		97,
		105,
		110,
		116,
		101,
		120,
		116
	]),
	ScriptEnd: new Uint8Array([
		60,
		47,
		115,
		99,
		114,
		105,
		112,
		116
	]),
	StyleEnd: new Uint8Array([
		60,
		47,
		115,
		116,
		121,
		108,
		101
	]),
	TitleEnd: new Uint8Array([
		60,
		47,
		116,
		105,
		116,
		108,
		101
	]),
	TextareaEnd: new Uint8Array([
		60,
		47,
		116,
		101,
		120,
		116,
		97,
		114,
		101,
		97
	]),
	XmpEnd: new Uint8Array([
		60,
		47,
		120,
		109,
		112
	])
};
/**
* Maps the first lowercase character of an HTML tag name to the sequence
* used for special-tag detection.  All sequences share a common layout
* where index 2 is the first tag-name character, so matching always
* continues from offset 3.
*/
var specialStartSequences = /* @__PURE__ */ new Map([
	[Sequences.IframeEnd[2], Sequences.IframeEnd],
	[Sequences.NoembedEnd[2], Sequences.NoembedEnd],
	[Sequences.Plaintext[2], Sequences.Plaintext],
	[Sequences.ScriptEnd[2], Sequences.ScriptEnd],
	[Sequences.TitleEnd[2], Sequences.TitleEnd],
	[Sequences.XmpEnd[2], Sequences.XmpEnd]
]);
/**
* Tokenizer implementation used by `Parser`.
*/
var Tokenizer = class {
	cbs;
	/** The current state the tokenizer is in. */
	state = State.Text;
	/** The read buffer. */
	buffer = "";
	/** The beginning of the section that is currently being read. */
	sectionStart = 0;
	/** The index within the buffer that we are currently looking at. */
	index = 0;
	/** The start of the last entity. */
	entityStart = 0;
	/** Some behavior, eg. when decoding entities, is done while we are in another state. This keeps track of the other state type. */
	baseState = State.Text;
	/** For special parsing behavior inside of script and style tags. */
	isSpecial = false;
	/** Indicates whether the tokenizer has been paused. */
	running = true;
	/** The offset of the current buffer. */
	offset = 0;
	xmlMode;
	decodeEntities;
	recognizeSelfClosing;
	entityDecoder;
	constructor({ xmlMode = false, decodeEntities = true, recognizeSelfClosing = xmlMode }, cbs) {
		this.cbs = cbs;
		this.xmlMode = xmlMode;
		this.decodeEntities = decodeEntities;
		this.recognizeSelfClosing = recognizeSelfClosing;
		this.entityDecoder = new EntityDecoder(xmlMode ? xmlDecodeTree : htmlDecodeTree, (cp, consumed) => this.emitCodePoint(cp, consumed));
	}
	reset() {
		this.state = State.Text;
		this.buffer = "";
		this.sectionStart = 0;
		this.index = 0;
		this.baseState = State.Text;
		this.isSpecial = false;
		this.currentSequence = Sequences.Empty;
		this.sequenceIndex = 0;
		this.running = true;
		this.offset = 0;
	}
	write(chunk) {
		this.offset += this.buffer.length;
		this.buffer = chunk;
		this.parse();
	}
	end() {
		if (this.running) this.finish();
	}
	pause() {
		this.running = false;
	}
	resume() {
		this.running = true;
		if (this.index < this.buffer.length + this.offset) this.parse();
	}
	stateText(c) {
		if (c === CharCodes.Lt || !this.decodeEntities && this.fastForwardTo(CharCodes.Lt)) {
			if (this.index > this.sectionStart) this.cbs.ontext(this.sectionStart, this.index);
			this.state = State.BeforeTagName;
			this.sectionStart = this.index;
		} else if (this.decodeEntities && c === CharCodes.Amp) this.startEntity();
	}
	currentSequence = Sequences.Empty;
	sequenceIndex = 0;
	enterTagBody() {
		if (this.currentSequence === Sequences.Plaintext) {
			this.currentSequence = Sequences.Empty;
			this.state = State.InPlainText;
		} else if (this.isSpecial) {
			this.state = State.InSpecialTag;
			this.sequenceIndex = 0;
		} else this.state = State.Text;
	}
	/**
	* Match the opening tag name against an HTML text-only tag sequence.
	*
	* Some tags share an initial prefix (`script`/`style`, `title`/`textarea`,
	* `noembed`/`noframes`), so we may switch to an alternate sequence at the
	* first distinguishing byte.  On a successful full match we fall back to
	* the normal tag-name state; a later `>` will enter raw-text, RCDATA, or
	* plaintext mode based on `currentSequence` / `isSpecial`.
	* @param c Current character code point.
	*/
	stateSpecialStartSequence(c) {
		const lower = c | 32;
		if (this.sequenceIndex < this.currentSequence.length) {
			if (lower === this.currentSequence[this.sequenceIndex]) {
				this.sequenceIndex++;
				return;
			}
			if (this.sequenceIndex === 3) {
				if (this.currentSequence === Sequences.ScriptEnd && lower === Sequences.StyleEnd[3]) {
					this.currentSequence = Sequences.StyleEnd;
					this.sequenceIndex = 4;
					return;
				}
				if (this.currentSequence === Sequences.TitleEnd && lower === Sequences.TextareaEnd[3]) {
					this.currentSequence = Sequences.TextareaEnd;
					this.sequenceIndex = 4;
					return;
				}
			} else if (this.sequenceIndex === 4 && this.currentSequence === Sequences.NoembedEnd && lower === Sequences.NoframesEnd[4]) {
				this.currentSequence = Sequences.NoframesEnd;
				this.sequenceIndex = 5;
				return;
			}
		} else if (isEndOfTagSection(c)) {
			this.sequenceIndex = 0;
			this.state = State.InTagName;
			this.stateInTagName(c);
			return;
		}
		this.isSpecial = false;
		this.currentSequence = Sequences.Empty;
		this.sequenceIndex = 0;
		this.state = State.InTagName;
		this.stateInTagName(c);
	}
	stateCDATASequence(c) {
		if (c === Sequences.Cdata[this.sequenceIndex]) {
			if (++this.sequenceIndex === Sequences.Cdata.length) {
				this.state = State.InCommentLike;
				this.currentSequence = Sequences.CdataEnd;
				this.sequenceIndex = 0;
				this.sectionStart = this.index + 1;
			}
		} else {
			this.sequenceIndex = 0;
			if (this.xmlMode) {
				this.state = State.InDeclaration;
				this.stateInDeclaration(c);
			} else {
				this.state = State.InSpecialComment;
				this.stateInSpecialComment(c);
			}
		}
	}
	/**
	* When we wait for one specific character, we can speed things up
	* by skipping through the buffer until we find it.
	* @param c Current character code point.
	* @returns Whether the character was found.
	*/
	fastForwardTo(c) {
		while (++this.index < this.buffer.length + this.offset) if (this.buffer.charCodeAt(this.index - this.offset) === c) return true;
		this.index = this.buffer.length + this.offset - 1;
		return false;
	}
	/**
	* Emit a comment token and return to the text state.
	* @param offset Number of characters in the end sequence that have already been matched.
	*/
	emitComment(offset) {
		this.cbs.oncomment(this.sectionStart, this.index, offset);
		this.sequenceIndex = 0;
		this.sectionStart = this.index + 1;
		this.state = State.Text;
	}
	/**
	* Comments and CDATA end with `-->` and `]]>`.
	*
	* Their common qualities are:
	* - Their end sequences have a distinct character they start with.
	* - That character is then repeated, so we have to check multiple repeats.
	* - All characters but the start character of the sequence can be skipped.
	* @param c Current character code point.
	*/
	stateInCommentLike(c) {
		if (!this.xmlMode && this.currentSequence === Sequences.CommentEnd && this.sequenceIndex <= 1 && this.index === this.sectionStart + this.sequenceIndex && c === CharCodes.Gt) this.emitComment(this.sequenceIndex);
		else if (this.currentSequence === Sequences.CommentEnd && this.sequenceIndex === 2 && c === CharCodes.Gt) this.emitComment(2);
		else if (this.currentSequence === Sequences.CommentEnd && this.sequenceIndex === this.currentSequence.length - 1 && c !== CharCodes.Gt) this.sequenceIndex = Number(c === CharCodes.Dash);
		else if (c === this.currentSequence[this.sequenceIndex]) {
			if (++this.sequenceIndex === this.currentSequence.length) {
				if (this.currentSequence === Sequences.CdataEnd) this.cbs.oncdata(this.sectionStart, this.index, 2);
				else this.cbs.oncomment(this.sectionStart, this.index, 3);
				this.sequenceIndex = 0;
				this.sectionStart = this.index + 1;
				this.state = State.Text;
			}
		} else if (this.sequenceIndex === 0) {
			if (this.fastForwardTo(this.currentSequence[0])) this.sequenceIndex = 1;
		} else if (c !== this.currentSequence[this.sequenceIndex - 1]) this.sequenceIndex = 0;
	}
	/**
	* HTML only allows ASCII alpha characters (a-z and A-Z) at the beginning of a tag name.
	*
	* XML allows a lot more characters here (@see https://www.w3.org/TR/REC-xml/#NT-NameStartChar).
	* We allow anything that wouldn't end the tag.
	* @param c Current character code point.
	*/
	isTagStartChar(c) {
		return this.xmlMode ? !isEndOfTagSection(c) : isASCIIAlpha(c);
	}
	/**
	* Scan raw-text / RCDATA content for the matching end tag.
	*
	* For RCDATA tags (`<title>`, `<textarea>`) entities are decoded inline.
	* For raw-text tags (`<script>`, `<style>`, etc.) we fast-forward to `<`.
	* @param c Current character code point.
	*/
	stateInSpecialTag(c) {
		if (this.sequenceIndex === this.currentSequence.length) {
			if (isEndOfTagSection(c)) {
				const endOfText = this.index - this.currentSequence.length;
				if (this.sectionStart < endOfText) {
					const actualIndex = this.index;
					this.index = endOfText;
					this.cbs.ontext(this.sectionStart, endOfText);
					this.index = actualIndex;
				}
				this.isSpecial = false;
				this.sectionStart = endOfText + 2;
				this.stateInClosingTagName(c);
				return;
			}
			this.sequenceIndex = 0;
		}
		if ((c | 32) === this.currentSequence[this.sequenceIndex]) this.sequenceIndex += 1;
		else if (this.sequenceIndex === 0) {
			if (this.currentSequence === Sequences.TitleEnd || this.currentSequence === Sequences.TextareaEnd) {
				if (this.decodeEntities && c === CharCodes.Amp) this.startEntity();
			} else if (this.fastForwardTo(CharCodes.Lt)) this.sequenceIndex = 1;
		} else this.sequenceIndex = Number(c === CharCodes.Lt);
	}
	stateBeforeTagName(c) {
		if (c === CharCodes.ExclamationMark) {
			this.state = State.BeforeDeclaration;
			this.sectionStart = this.index + 1;
		} else if (c === CharCodes.Questionmark) {
			if (this.xmlMode) {
				this.state = State.InProcessingInstruction;
				this.sequenceIndex = 0;
				this.sectionStart = this.index + 1;
			} else {
				this.state = State.InSpecialComment;
				this.sectionStart = this.index;
			}
		} else if (this.isTagStartChar(c)) {
			this.sectionStart = this.index;
			const special = this.xmlMode || this.cbs.isInForeignContext?.() ? void 0 : specialStartSequences.get(c | 32);
			if (special === void 0) this.state = State.InTagName;
			else {
				this.isSpecial = true;
				this.currentSequence = special;
				this.sequenceIndex = 3;
				this.state = State.SpecialStartSequence;
			}
		} else if (c === CharCodes.Slash) this.state = State.BeforeClosingTagName;
		else {
			this.state = State.Text;
			this.stateText(c);
		}
	}
	stateInTagName(c) {
		if (isEndOfTagSection(c)) {
			this.cbs.onopentagname(this.sectionStart, this.index);
			this.sectionStart = -1;
			this.state = State.BeforeAttributeName;
			this.stateBeforeAttributeName(c);
		}
	}
	stateBeforeClosingTagName(c) {
		if (isWhitespace(c)) {
			if (this.xmlMode) {} else {
				this.state = State.InSpecialComment;
				this.sectionStart = this.index;
			}
		} else if (c === CharCodes.Gt) {
			this.state = State.Text;
			if (!this.xmlMode) this.sectionStart = this.index + 1;
		} else {
			this.state = this.isTagStartChar(c) ? State.InClosingTagName : State.InSpecialComment;
			this.sectionStart = this.index;
		}
	}
	stateInClosingTagName(c) {
		if (isEndOfTagSection(c)) {
			this.cbs.onclosetag(this.sectionStart, this.index);
			this.sectionStart = -1;
			this.state = State.AfterClosingTagName;
			this.stateAfterClosingTagName(c);
		}
	}
	stateAfterClosingTagName(c) {
		if (c === CharCodes.Gt || this.fastForwardTo(CharCodes.Gt)) {
			this.state = State.Text;
			this.sectionStart = this.index + 1;
		}
	}
	stateBeforeAttributeName(c) {
		if (c === CharCodes.Gt) {
			this.cbs.onopentagend(this.index);
			this.enterTagBody();
			this.sectionStart = this.index + 1;
		} else if (c === CharCodes.Slash) this.state = State.InSelfClosingTag;
		else if (!isWhitespace(c)) {
			this.state = State.InAttributeName;
			this.sectionStart = this.index;
		}
	}
	/**
	* Handle `/` before `>` in an opening tag.
	*
	* In HTML mode, text-only tags ignore the self-closing flag and still enter
	* their raw-text/RCDATA/plaintext state unless self-closing tags are being
	* recognized. In XML mode, or for ordinary tags, the tokenizer returns to
	* regular text parsing after emitting the self-closing callback.
	* @param c Current character code point.
	*/
	stateInSelfClosingTag(c) {
		if (c === CharCodes.Gt) {
			this.cbs.onselfclosingtag(this.index);
			this.sectionStart = this.index + 1;
			if (!this.recognizeSelfClosing) {
				this.enterTagBody();
				return;
			}
			this.state = State.Text;
			this.isSpecial = false;
			this.currentSequence = Sequences.Empty;
		} else if (!isWhitespace(c)) {
			this.state = State.BeforeAttributeName;
			this.stateBeforeAttributeName(c);
		}
	}
	stateInAttributeName(c) {
		if (c === CharCodes.Eq || isEndOfTagSection(c)) {
			this.cbs.onattribname(this.sectionStart, this.index);
			this.sectionStart = this.index;
			this.state = State.AfterAttributeName;
			this.stateAfterAttributeName(c);
		}
	}
	stateAfterAttributeName(c) {
		if (c === CharCodes.Eq) this.state = State.BeforeAttributeValue;
		else if (c === CharCodes.Slash || c === CharCodes.Gt) {
			this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
			this.sectionStart = -1;
			this.state = State.BeforeAttributeName;
			this.stateBeforeAttributeName(c);
		} else if (!isWhitespace(c)) {
			this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
			this.state = State.InAttributeName;
			this.sectionStart = this.index;
		}
	}
	stateBeforeAttributeValue(c) {
		if (c === CharCodes.DoubleQuote) {
			this.state = State.InAttributeValueDq;
			this.sectionStart = this.index + 1;
		} else if (c === CharCodes.SingleQuote) {
			this.state = State.InAttributeValueSq;
			this.sectionStart = this.index + 1;
		} else if (!isWhitespace(c)) {
			this.sectionStart = this.index;
			this.state = State.InAttributeValueNq;
			this.stateInAttributeValueNoQuotes(c);
		}
	}
	handleInAttributeValue(c, quote) {
		if (c === quote || !this.decodeEntities && this.fastForwardTo(quote)) {
			this.cbs.onattribdata(this.sectionStart, this.index);
			this.sectionStart = -1;
			this.cbs.onattribend(quote === CharCodes.DoubleQuote ? QuoteType.Double : QuoteType.Single, this.index + 1);
			this.state = State.BeforeAttributeName;
		} else if (this.decodeEntities && c === CharCodes.Amp) this.startEntity();
	}
	stateInAttributeValueDoubleQuotes(c) {
		this.handleInAttributeValue(c, CharCodes.DoubleQuote);
	}
	stateInAttributeValueSingleQuotes(c) {
		this.handleInAttributeValue(c, CharCodes.SingleQuote);
	}
	stateInAttributeValueNoQuotes(c) {
		if (isWhitespace(c) || c === CharCodes.Gt) {
			this.cbs.onattribdata(this.sectionStart, this.index);
			this.sectionStart = -1;
			this.cbs.onattribend(QuoteType.Unquoted, this.index);
			this.state = State.BeforeAttributeName;
			this.stateBeforeAttributeName(c);
		} else if (this.decodeEntities && c === CharCodes.Amp) this.startEntity();
	}
	/**
	* Distinguish between CDATA, declarations, HTML comments, and HTML bogus
	* comments after `<!`.
	*
	* In HTML mode, only real comments and doctypes stay on declaration paths;
	* everything else becomes a bogus comment terminated by the next `>`.
	* @param c Current character code point.
	*/
	stateBeforeDeclaration(c) {
		if (c === CharCodes.OpeningSquareBracket) {
			this.state = State.CDATASequence;
			this.sequenceIndex = 0;
		} else if (this.xmlMode) this.state = c === CharCodes.Dash ? State.BeforeComment : State.InDeclaration;
		else if ((c | 32) === Sequences.Doctype[0]) {
			this.state = State.DeclarationSequence;
			this.currentSequence = Sequences.Doctype;
			this.sequenceIndex = 1;
		} else if (c === CharCodes.Gt) {
			this.cbs.oncomment(this.sectionStart, this.index, 0);
			this.state = State.Text;
			this.sectionStart = this.index + 1;
		} else if (c === CharCodes.Dash) this.state = State.BeforeComment;
		else this.state = State.InSpecialComment;
	}
	/**
	* Continue matching `doctype` after `<!d`.
	*
	* A full `doctype` match stays on the declaration path; any other name falls
	* back to an HTML bogus comment, which matches browser behavior for
	* non-doctype `<!...>` constructs.
	* @param c Current character code point.
	*/
	stateDeclarationSequence(c) {
		if (this.sequenceIndex === this.currentSequence.length) {
			this.state = State.InDeclaration;
			this.stateInDeclaration(c);
		} else if ((c | 32) === this.currentSequence[this.sequenceIndex]) this.sequenceIndex += 1;
		else if (c === CharCodes.Gt) {
			this.cbs.oncomment(this.sectionStart, this.index, 0);
			this.state = State.Text;
			this.sectionStart = this.index + 1;
		} else this.state = State.InSpecialComment;
	}
	stateInDeclaration(c) {
		if (c === CharCodes.Gt || this.fastForwardTo(CharCodes.Gt)) {
			this.cbs.ondeclaration(this.sectionStart, this.index);
			this.state = State.Text;
			this.sectionStart = this.index + 1;
		}
	}
	/**
	* XML processing instructions (`<?...?>`).
	*
	* In HTML mode `<?` is routed to `InSpecialComment` instead, so this
	* state is only reachable in XML mode.
	* @param c Current character code point.
	*/
	stateInProcessingInstruction(c) {
		if (c === CharCodes.Questionmark) this.sequenceIndex = 1;
		else if (c === CharCodes.Gt && this.sequenceIndex === 1) {
			this.cbs.onprocessinginstruction(this.sectionStart, this.index - 1);
			this.sequenceIndex = 0;
			this.state = State.Text;
			this.sectionStart = this.index + 1;
		} else this.sequenceIndex = Number(this.fastForwardTo(CharCodes.Questionmark));
	}
	stateBeforeComment(c) {
		if (c === CharCodes.Dash) {
			this.state = State.InCommentLike;
			this.currentSequence = Sequences.CommentEnd;
			this.sequenceIndex = 0;
			this.sectionStart = this.index + 1;
		} else if (this.xmlMode) this.state = State.InDeclaration;
		else if (c === CharCodes.Gt) {
			this.cbs.oncomment(this.sectionStart, this.index, 0);
			this.state = State.Text;
			this.sectionStart = this.index + 1;
		} else this.state = State.InSpecialComment;
	}
	stateInSpecialComment(c) {
		if (c === CharCodes.Gt || this.fastForwardTo(CharCodes.Gt)) {
			this.cbs.oncomment(this.sectionStart, this.index, 0);
			this.state = State.Text;
			this.sectionStart = this.index + 1;
		}
	}
	startEntity() {
		this.baseState = this.state;
		this.state = State.InEntity;
		this.entityStart = this.index;
		this.entityDecoder.startEntity(this.xmlMode ? DecodingMode$1.Strict : this.baseState === State.Text || this.baseState === State.InSpecialTag ? DecodingMode$1.Legacy : DecodingMode$1.Attribute);
	}
	stateInEntity() {
		const indexInBuffer = this.index - this.offset;
		const length = this.entityDecoder.write(this.buffer, indexInBuffer);
		if (length >= 0) {
			this.state = this.baseState;
			if (length === 0) this.index -= 1;
		} else {
			if (indexInBuffer < this.buffer.length && this.buffer.charCodeAt(indexInBuffer) === CharCodes.Amp) {
				this.state = this.baseState;
				this.index -= 1;
				return;
			}
			this.index = this.offset + this.buffer.length - 1;
		}
	}
	/**
	* Remove data that has already been consumed from the buffer.
	*/
	cleanup() {
		if (this.running && this.sectionStart !== this.index) {
			if (this.state === State.Text || this.state === State.InPlainText || this.state === State.InSpecialTag && this.sequenceIndex === 0) {
				this.cbs.ontext(this.sectionStart, this.index);
				this.sectionStart = this.index;
			} else if (this.state === State.InAttributeValueDq || this.state === State.InAttributeValueSq || this.state === State.InAttributeValueNq) {
				this.cbs.onattribdata(this.sectionStart, this.index);
				this.sectionStart = this.index;
			}
		}
	}
	shouldContinue() {
		return this.index < this.buffer.length + this.offset && this.running;
	}
	/**
	* Iterates through the buffer, calling the function corresponding to the current state.
	*
	* States that are more likely to be hit are higher up, as a performance improvement.
	*/
	parse() {
		while (this.shouldContinue()) {
			const c = this.buffer.charCodeAt(this.index - this.offset);
			switch (this.state) {
				case State.Text:
					this.stateText(c);
					break;
				case State.InPlainText:
					this.index = this.buffer.length + this.offset - 1;
					break;
				case State.SpecialStartSequence:
					this.stateSpecialStartSequence(c);
					break;
				case State.InSpecialTag:
					this.stateInSpecialTag(c);
					break;
				case State.CDATASequence:
					this.stateCDATASequence(c);
					break;
				case State.DeclarationSequence:
					this.stateDeclarationSequence(c);
					break;
				case State.InAttributeValueDq:
					this.stateInAttributeValueDoubleQuotes(c);
					break;
				case State.InAttributeName:
					this.stateInAttributeName(c);
					break;
				case State.InCommentLike:
					this.stateInCommentLike(c);
					break;
				case State.InSpecialComment:
					this.stateInSpecialComment(c);
					break;
				case State.BeforeAttributeName:
					this.stateBeforeAttributeName(c);
					break;
				case State.InTagName:
					this.stateInTagName(c);
					break;
				case State.InClosingTagName:
					this.stateInClosingTagName(c);
					break;
				case State.BeforeTagName:
					this.stateBeforeTagName(c);
					break;
				case State.AfterAttributeName:
					this.stateAfterAttributeName(c);
					break;
				case State.InAttributeValueSq:
					this.stateInAttributeValueSingleQuotes(c);
					break;
				case State.BeforeAttributeValue:
					this.stateBeforeAttributeValue(c);
					break;
				case State.BeforeClosingTagName:
					this.stateBeforeClosingTagName(c);
					break;
				case State.AfterClosingTagName:
					this.stateAfterClosingTagName(c);
					break;
				case State.InAttributeValueNq:
					this.stateInAttributeValueNoQuotes(c);
					break;
				case State.InSelfClosingTag:
					this.stateInSelfClosingTag(c);
					break;
				case State.InDeclaration:
					this.stateInDeclaration(c);
					break;
				case State.BeforeDeclaration:
					this.stateBeforeDeclaration(c);
					break;
				case State.BeforeComment:
					this.stateBeforeComment(c);
					break;
				case State.InProcessingInstruction:
					this.stateInProcessingInstruction(c);
					break;
				case State.InEntity: this.stateInEntity();
			}
			this.index++;
		}
		this.cleanup();
	}
	finish() {
		if (this.state === State.InEntity) {
			this.entityDecoder.end();
			this.state = this.baseState;
		}
		this.handleTrailingData();
		this.cbs.onend();
	}
	handleTrailingCommentLikeData(endIndex) {
		if (this.state !== State.InCommentLike) return false;
		if (this.currentSequence === Sequences.CdataEnd) {
			if (this.xmlMode) {
				if (this.sectionStart < endIndex) this.cbs.oncdata(this.sectionStart, endIndex, 0);
			} else {
				const cdataStart = this.sectionStart - Sequences.Cdata.length - 1;
				this.cbs.oncomment(cdataStart, endIndex, 0);
			}
		} else {
			const offset = this.xmlMode ? 0 : Math.min(this.sequenceIndex, Sequences.CommentEnd.length - 1);
			this.cbs.oncomment(this.sectionStart, endIndex, offset);
		}
		return true;
	}
	handleTrailingMarkupDeclaration(endIndex) {
		if (this.xmlMode) switch (this.state) {
			case State.InSpecialComment:
			case State.BeforeComment:
			case State.CDATASequence:
			case State.DeclarationSequence:
			case State.InDeclaration:
				this.cbs.ontext(this.sectionStart, endIndex);
				return true;
			default: return false;
		}
		switch (this.state) {
			case State.BeforeDeclaration:
			case State.InSpecialComment:
			case State.BeforeComment:
			case State.CDATASequence:
				this.cbs.oncomment(this.sectionStart, endIndex, 0);
				return true;
			case State.DeclarationSequence:
				if (this.sequenceIndex !== Sequences.Doctype.length) this.cbs.oncomment(this.sectionStart, endIndex, 0);
				return true;
			case State.InDeclaration: return true;
			default: return false;
		}
	}
	/** Handle any trailing data. */
	handleTrailingData() {
		const endIndex = this.buffer.length + this.offset;
		if (this.handleTrailingCommentLikeData(endIndex) || this.handleTrailingMarkupDeclaration(endIndex)) return;
		if (this.sectionStart >= endIndex) return;
		switch (this.state) {
			case State.InTagName:
			case State.BeforeAttributeName:
			case State.BeforeAttributeValue:
			case State.AfterAttributeName:
			case State.InAttributeName:
			case State.InAttributeValueSq:
			case State.InAttributeValueDq:
			case State.InAttributeValueNq:
			case State.InClosingTagName: break;
			default: this.cbs.ontext(this.sectionStart, endIndex);
		}
	}
	emitCodePoint(cp, consumed) {
		if (this.baseState !== State.Text && this.baseState !== State.InSpecialTag) {
			if (this.sectionStart < this.entityStart) this.cbs.onattribdata(this.sectionStart, this.entityStart);
			this.sectionStart = this.entityStart + consumed;
			this.index = this.sectionStart - 1;
			this.cbs.onattribentity(cp);
		} else {
			if (this.sectionStart < this.entityStart) this.cbs.ontext(this.sectionStart, this.entityStart);
			this.sectionStart = this.entityStart + consumed;
			this.index = this.sectionStart - 1;
			this.cbs.ontextentity(cp, this.sectionStart);
		}
	}
};
// node_modules/htmlparser2/dist/Parser.js
var { fromCodePoint } = String;
var formTags = /* @__PURE__ */ new Set([
	"input",
	"option",
	"optgroup",
	"select",
	"button",
	"datalist",
	"textarea"
]);
var pTag = /* @__PURE__ */ new Set(["p"]);
var headingTags = /* @__PURE__ */ new Set([
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"p"
]);
var tableSectionTags = /* @__PURE__ */ new Set(["thead", "tbody"]);
var ddtTags = /* @__PURE__ */ new Set(["dd", "dt"]);
var rtpTags = /* @__PURE__ */ new Set(["rt", "rp"]);
var openImpliesClose = /* @__PURE__ */ new Map([
	["tr", /* @__PURE__ */ new Set([
		"tr",
		"th",
		"td"
	])],
	["th", /* @__PURE__ */ new Set(["th"])],
	["td", /* @__PURE__ */ new Set([
		"thead",
		"th",
		"td"
	])],
	["body", /* @__PURE__ */ new Set([
		"head",
		"link",
		"script"
	])],
	["a", /* @__PURE__ */ new Set(["a"])],
	["li", /* @__PURE__ */ new Set(["li"])],
	["p", pTag],
	["h1", headingTags],
	["h2", headingTags],
	["h3", headingTags],
	["h4", headingTags],
	["h5", headingTags],
	["h6", headingTags],
	["select", formTags],
	["input", formTags],
	["output", formTags],
	["button", formTags],
	["datalist", formTags],
	["textarea", formTags],
	["option", /* @__PURE__ */ new Set(["option"])],
	["optgroup", /* @__PURE__ */ new Set(["optgroup", "option"])],
	["dd", ddtTags],
	["dt", ddtTags],
	["address", pTag],
	["article", pTag],
	["aside", pTag],
	["blockquote", pTag],
	["details", pTag],
	["div", pTag],
	["dl", pTag],
	["fieldset", pTag],
	["figcaption", pTag],
	["figure", pTag],
	["footer", pTag],
	["form", pTag],
	["header", pTag],
	["hr", pTag],
	["main", pTag],
	["nav", pTag],
	["ol", pTag],
	["pre", pTag],
	["section", pTag],
	["table", pTag],
	["ul", pTag],
	["rt", rtpTags],
	["rp", rtpTags],
	["tbody", tableSectionTags],
	["tfoot", tableSectionTags]
]);
var DOCUMENT_TYPE = "doctype";
var voidElements = /* @__PURE__ */ new Set([
	"area",
	"base",
	"basefont",
	"br",
	"col",
	"command",
	"embed",
	"frame",
	"hr",
	"img",
	"input",
	"isindex",
	"keygen",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr"
]);
var foreignContextElements = /* @__PURE__ */ new Set(["math", "svg"]);
/**
* Elements that can be used to integrate HTML content within foreign namespaces (e.g., SVG or MathML).
*
* Entries must use the SVG-adjusted casing (e.g. "foreignObject" not
* "foreignobject") since they are compared against adjusted tag names.
*/
var htmlIntegrationElements = /* @__PURE__ */ new Set([
	"mi",
	"mo",
	"mn",
	"ms",
	"mtext",
	"annotation-xml",
	"foreignObject",
	"desc",
	"title"
]);
var svgTagNameAdjustments = /* @__PURE__ */ new Map([
	["altglyph", "altGlyph"],
	["altglyphdef", "altGlyphDef"],
	["altglyphitem", "altGlyphItem"],
	["animatecolor", "animateColor"],
	["animatemotion", "animateMotion"],
	["animatetransform", "animateTransform"],
	["clippath", "clipPath"],
	["feblend", "feBlend"],
	["fecolormatrix", "feColorMatrix"],
	["fecomponenttransfer", "feComponentTransfer"],
	["fecomposite", "feComposite"],
	["feconvolvematrix", "feConvolveMatrix"],
	["fediffuselighting", "feDiffuseLighting"],
	["fedisplacementmap", "feDisplacementMap"],
	["fedistantlight", "feDistantLight"],
	["fedropshadow", "feDropShadow"],
	["feflood", "feFlood"],
	["fefunca", "feFuncA"],
	["fefuncb", "feFuncB"],
	["fefuncg", "feFuncG"],
	["fefuncr", "feFuncR"],
	["fegaussianblur", "feGaussianBlur"],
	["feimage", "feImage"],
	["femerge", "feMerge"],
	["femergenode", "feMergeNode"],
	["femorphology", "feMorphology"],
	["feoffset", "feOffset"],
	["fepointlight", "fePointLight"],
	["fespecularlighting", "feSpecularLighting"],
	["fespotlight", "feSpotLight"],
	["fetile", "feTile"],
	["feturbulence", "feTurbulence"],
	["foreignobject", "foreignObject"],
	["glyphref", "glyphRef"],
	["lineargradient", "linearGradient"],
	["radialgradient", "radialGradient"],
	["textpath", "textPath"]
]);
var ForeignContext;
(function(ForeignContext) {
	ForeignContext[ForeignContext["None"] = 0] = "None";
	ForeignContext[ForeignContext["Svg"] = 1] = "Svg";
	ForeignContext[ForeignContext["MathML"] = 2] = "MathML";
})(ForeignContext || (ForeignContext = {}));
var reNameEnd = /\s|\//;
/**
* Incremental parser implementation.
*/
var Parser = class {
	options;
	/** The start index of the last event. */
	startIndex = 0;
	/** The end index of the last event. */
	endIndex = 0;
	/**
	* Store the start index of the current open tag,
	* so we can update the start index for attributes.
	*/
	openTagStart = 0;
	tagname = "";
	attribname = "";
	attribvalue = "";
	attribs = null;
	stack = [];
	foreignContext;
	cbs;
	lowerCaseTagNames;
	lowerCaseAttributeNames;
	recognizeSelfClosing;
	/** We are parsing HTML. Inverse of the `xmlMode` option. */
	htmlMode;
	tokenizer;
	buffers = [];
	bufferOffset = 0;
	/** The index of the last written buffer. Used when resuming after a `pause()`. */
	writeIndex = 0;
	/** Indicates whether the parser has finished running / `.end` has been called. */
	ended = false;
	constructor(cbs, options = {}) {
		this.options = options;
		this.cbs = cbs ?? {};
		this.htmlMode = !this.options.xmlMode;
		this.lowerCaseTagNames = options.lowerCaseTags ?? this.htmlMode;
		this.lowerCaseAttributeNames = options.lowerCaseAttributeNames ?? this.htmlMode;
		this.recognizeSelfClosing = options.recognizeSelfClosing ?? !this.htmlMode;
		this.tokenizer = new (options.Tokenizer ?? Tokenizer)(this.options, this);
		this.foreignContext = [ForeignContext.None];
		this.cbs.onparserinit?.(this);
	}
	/**
	* @param start Start index for the current parser event.
	* @param endIndex End index for the current parser event.
	* @internal
	*/
	ontext(start, endIndex) {
		const data = this.getSlice(start, endIndex);
		this.endIndex = endIndex - 1;
		this.cbs.ontext?.(data);
		this.startIndex = endIndex;
	}
	/**
	* @param cp Current Unicode code point.
	* @param endIndex End index for the current parser event.
	* @internal
	*/
	ontextentity(cp, endIndex) {
		this.endIndex = endIndex - 1;
		this.cbs.ontext?.(fromCodePoint(cp));
		this.startIndex = endIndex;
	}
	/** @internal */
	isInForeignContext() {
		return this.foreignContext[0] !== ForeignContext.None;
	}
	/**
	* Checks if the current tag is a void element. Override this if you want
	* to specify your own additional void elements.
	* @param name Name of the pseudo selector.
	*/
	isVoidElement(name) {
		return this.htmlMode && voidElements.has(name);
	}
	/**
	* Read a tag name from the buffer.
	*
	* When `lowerCaseTagNames` is enabled (the default in HTML mode), the name
	* is lowercased and may be adjusted for SVG casing or the `image` → `img`
	* alias.
	* @param start Start index of the tag name in the buffer.
	* @param endIndex End index of the tag name in the buffer.
	*/
	readTagName(start, endIndex) {
		const name = this.lowerCaseTagNames ? this.getSlice(start, endIndex).toLowerCase() : this.getSlice(start, endIndex);
		if (!(this.lowerCaseTagNames && this.htmlMode)) return name;
		if (this.foreignContext[0] === ForeignContext.Svg) return svgTagNameAdjustments.get(name) ?? name;
		if (this.foreignContext.length > 1) {
			const adjusted = svgTagNameAdjustments.get(name);
			if (adjusted !== void 0 && this.stack.includes(adjusted)) return adjusted;
		}
		if (!this.isInForeignContext()) return name === "image" ? "img" : name;
		return name;
	}
	/**
	* @param start Start index for the current parser event.
	* @param endIndex End index for the current parser event.
	* @internal
	*/
	onopentagname(start, endIndex) {
		this.endIndex = endIndex;
		this.emitOpenTag(this.readTagName(start, endIndex));
	}
	emitOpenTag(name) {
		this.openTagStart = this.startIndex;
		this.tagname = name;
		if (this.htmlMode && name === "form" && this.stack.includes("form")) {
			this.tagname = "";
			return;
		}
		const impliesClose = this.htmlMode && openImpliesClose.get(name);
		if (impliesClose) while (this.stack.length > 0 && impliesClose.has(this.stack[0])) this.popElement(true);
		if (!this.isVoidElement(name)) {
			this.stack.unshift(name);
			if (this.htmlMode) {
				if (name === "svg") this.foreignContext.unshift(ForeignContext.Svg);
				else if (name === "math") this.foreignContext.unshift(ForeignContext.MathML);
				else if (htmlIntegrationElements.has(name)) this.foreignContext.unshift(ForeignContext.None);
			}
		}
		this.cbs.onopentagname?.(name);
		if (this.cbs.onopentag) this.attribs = {};
	}
	endOpenTag(isImplied) {
		this.startIndex = this.openTagStart;
		if (this.attribs) {
			this.cbs.onopentag?.(this.tagname, this.attribs, isImplied);
			this.attribs = null;
		}
		if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) this.cbs.onclosetag(this.tagname, true);
		this.tagname = "";
	}
	/**
	* @param endIndex End index for the current parser event.
	* @internal
	*/
	onopentagend(endIndex) {
		this.endIndex = endIndex;
		this.endOpenTag(false);
		this.startIndex = endIndex + 1;
	}
	/**
	* @param start Start index for the current parser event.
	* @param endIndex End index for the current parser event.
	* @internal
	*/
	onclosetag(start, endIndex) {
		this.endIndex = endIndex;
		const name = this.readTagName(start, endIndex);
		if (!this.isVoidElement(name)) {
			const pos = this.stack.indexOf(name);
			if (pos !== -1) {
				for (let index = 0; index < pos; index++) this.popElement(true);
				this.popElement(false);
			} else if (this.htmlMode && name === "p") {
				this.emitOpenTag("p");
				this.closeCurrentTag(true);
			}
		} else if (this.htmlMode && name === "br") {
			this.cbs.onopentagname?.("br");
			this.cbs.onopentag?.("br", {}, true);
			this.cbs.onclosetag?.("br", false);
		}
		this.startIndex = endIndex + 1;
	}
	/**
	* @param endIndex End index for the current parser event.
	* @internal
	*/
	onselfclosingtag(endIndex) {
		this.endIndex = endIndex;
		if (this.recognizeSelfClosing || this.isInForeignContext()) {
			this.closeCurrentTag(false);
			this.startIndex = endIndex + 1;
		} else this.onopentagend(endIndex);
	}
	/**
	* Pop the top element off the stack, emit a close event, and maintain
	* the foreign context stack.
	* @param implied Whether this close is implied (not from an explicit end tag).
	*/
	popElement(implied) {
		const element = this.stack.shift();
		if (this.htmlMode && (foreignContextElements.has(element) || htmlIntegrationElements.has(element))) this.foreignContext.shift();
		this.cbs.onclosetag?.(element, implied);
	}
	closeCurrentTag(isOpenImplied) {
		const name = this.tagname;
		this.endOpenTag(isOpenImplied);
		if (this.stack[0] === name) this.popElement(!isOpenImplied);
	}
	/**
	* @param start Start index for the current parser event.
	* @param endIndex End index for the current parser event.
	* @internal
	*/
	onattribname(start, endIndex) {
		this.startIndex = start;
		const name = this.getSlice(start, endIndex);
		this.attribname = this.lowerCaseAttributeNames ? name.toLowerCase() : name;
	}
	/**
	* @param start Start index for the current parser event.
	* @param endIndex End index for the current parser event.
	* @internal
	*/
	onattribdata(start, endIndex) {
		this.attribvalue += this.getSlice(start, endIndex);
	}
	/**
	* @param cp Current Unicode code point.
	* @internal
	*/
	onattribentity(cp) {
		this.attribvalue += fromCodePoint(cp);
	}
	/**
	* @param quote Quote type used for the current attribute.
	* @param endIndex End index for the current parser event.
	* @internal
	*/
	onattribend(quote, endIndex) {
		this.endIndex = endIndex;
		this.cbs.onattribute?.(this.attribname, this.attribvalue, quote === QuoteType.Double ? "\"" : quote === QuoteType.Single ? "'" : quote === QuoteType.NoValue ? void 0 : null);
		if (this.attribs && !Object.hasOwn(this.attribs, this.attribname)) this.attribs[this.attribname] = this.attribvalue;
		this.attribvalue = "";
	}
	getInstructionName(value) {
		const index = value.search(reNameEnd);
		let name = index < 0 ? value : value.substr(0, index);
		if (this.lowerCaseTagNames) name = name.toLowerCase();
		return name;
	}
	/**
	* @param start Start index for the current parser event.
	* @param endIndex End index for the current parser event.
	* @internal
	*/
	ondeclaration(start, endIndex) {
		this.endIndex = endIndex;
		const value = this.getSlice(start, endIndex);
		if (this.cbs.onprocessinginstruction) {
			const name = this.htmlMode ? this.lowerCaseTagNames ? DOCUMENT_TYPE : value.slice(0, 7) : this.getInstructionName(value);
			this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
		}
		this.startIndex = endIndex + 1;
	}
	/**
	* @param start Start index for the current parser event.
	* @param endIndex End index for the current parser event.
	* @internal
	*/
	onprocessinginstruction(start, endIndex) {
		this.endIndex = endIndex;
		const value = this.getSlice(start, endIndex);
		if (this.cbs.onprocessinginstruction) {
			const name = this.getInstructionName(value);
			this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
		}
		this.startIndex = endIndex + 1;
	}
	/**
	* @param start Start index for the current parser event.
	* @param endIndex End index for the current parser event.
	* @param offset Offset applied when computing parser indices.
	* @internal
	*/
	oncomment(start, endIndex, offset) {
		this.endIndex = endIndex;
		this.cbs.oncomment?.(this.getSlice(start, endIndex - offset));
		this.cbs.oncommentend?.();
		this.startIndex = endIndex + 1;
	}
	/**
	* @param start Start index for the current parser event.
	* @param endIndex End index for the current parser event.
	* @param offset Offset applied when computing parser indices.
	* @internal
	*/
	oncdata(start, endIndex, offset) {
		this.endIndex = endIndex;
		const value = this.getSlice(start, endIndex - offset);
		if (!this.htmlMode || this.options.recognizeCDATA) {
			this.cbs.oncdatastart?.();
			this.cbs.ontext?.(value);
			this.cbs.oncdataend?.();
		} else if (this.isInForeignContext()) this.cbs.ontext?.(value);
		else {
			this.cbs.oncomment?.(`[CDATA[${value}]]`);
			this.cbs.oncommentend?.();
		}
		this.startIndex = endIndex + 1;
	}
	/** @internal */
	onend() {
		if (this.cbs.onclosetag) {
			this.endIndex = this.startIndex;
			for (let index = 0; index < this.stack.length; index++) this.cbs.onclosetag(this.stack[index], true);
		}
		this.cbs.onend?.();
	}
	/**
	* Resets the parser to a blank state, ready to parse a new HTML document
	*/
	reset() {
		this.cbs.onreset?.();
		this.tokenizer.reset();
		this.tagname = "";
		this.attribname = "";
		this.attribvalue = "";
		this.attribs = null;
		this.stack.length = 0;
		this.startIndex = 0;
		this.endIndex = 0;
		this.cbs.onparserinit?.(this);
		this.buffers.length = 0;
		this.foreignContext.length = 0;
		this.foreignContext.unshift(ForeignContext.None);
		this.bufferOffset = 0;
		this.writeIndex = 0;
		this.ended = false;
	}
	/**
	* Resets the parser, then parses a complete document and
	* pushes it to the handler.
	* @param data Document to parse.
	*/
	parseComplete(data) {
		this.reset();
		this.end(data);
	}
	getSlice(start, end) {
		if (start === end) return "";
		while (start - this.bufferOffset >= this.buffers[0].length) this.shiftBuffer();
		let slice = this.buffers[0].slice(start - this.bufferOffset, end - this.bufferOffset);
		while (end - this.bufferOffset > this.buffers[0].length) {
			this.shiftBuffer();
			slice += this.buffers[0].slice(0, end - this.bufferOffset);
		}
		return slice;
	}
	shiftBuffer() {
		this.bufferOffset += this.buffers[0].length;
		this.writeIndex--;
		this.buffers.shift();
	}
	/**
	* Parses a chunk of data and calls the corresponding callbacks.
	* @param chunk Chunk to parse.
	*/
	write(chunk) {
		if (this.ended) {
			this.cbs.onerror?.(/* @__PURE__ */ new Error(".write() after done!"));
			return;
		}
		this.buffers.push(chunk);
		if (this.tokenizer.running) {
			this.tokenizer.write(chunk);
			this.writeIndex++;
		}
	}
	/**
	* Parses the end of the buffer and clears the stack, calls onend.
	* @param chunk Optional final chunk to parse.
	*/
	end(chunk) {
		if (this.ended) {
			this.cbs.onerror?.(/* @__PURE__ */ new Error(".end() after done!"));
			return;
		}
		if (chunk) this.write(chunk);
		this.ended = true;
		this.tokenizer.end();
	}
	/**
	* Pauses parsing. The parser won't emit events until `resume` is called.
	*/
	pause() {
		this.tokenizer.pause();
	}
	/**
	* Resumes parsing after `pause` was called.
	*/
	resume() {
		this.tokenizer.resume();
		while (this.tokenizer.running && this.writeIndex < this.buffers.length) this.tokenizer.write(this.buffers[this.writeIndex++]);
		if (this.ended) this.tokenizer.end();
	}
};
// apps/worker/feeds/article-extractor.ts
var bodyClasses = {
	gouvernement: ["cmp-text", "article-body"],
	figaro: ["fig-content-body"],
	lejsl: ["articleBody"],
	investing: ["article_WYSIWYG"]
};
var MAX_TEXT = 8e4;
var MIN_TEXT = 400;
var ignoredTags = /* @__PURE__ */ new Set([
	"script",
	"style",
	"nav",
	"header",
	"footer",
	"aside",
	"form",
	"button",
	"iframe",
	"svg",
	"template",
	"noscript",
	"figcaption",
	"figure"
]);
var ignoredClass = /(?:^|[\s_-])(?:ad|ads|advertisement|advertising|publicite|navigation|recommendations?|related|comments?|caption|social|share)(?:$|[\s_-])/i;
var restrictionClass = /(?:^|[\s_-])(?:paywall|premium-wall|subscription-wall|consent-wall|consentwall|cookie-wall|piano-wall|regwall)(?:$|[\s_-])/i;
var restrictionText = /(?:article|contenu|suite).{0,60}(?:réservé|réservée|abonnés|abonné)|(?:abonnez-vous|connectez-vous).{0,70}(?:lire|suite|article)|(?:acceptez|consentez).{0,70}(?:continuer|accéder)|subscribe to (?:continue|read)|already a subscriber/i;
var normalize = (text) => text.replace(/[\t\r\f\v \u00a0]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
var result = (status, reason, text = "") => ({
	status,
	text,
	reason
});
/** Extracts only a configured visible body or explicitly free Article JSON-LD.
* `available` describes extraction, never a guarantee of editorial completeness.
*/
function extractArticle(html, sourceId) {
	let cacheable = true;
	const finish = (status, reason, text = "") => ({
		...result(status, reason, text),
		cacheable
	});
	const ipm = sourceId === "dh" || sourceId === "lalibre";
	if (html.length > 2e6) return finish("unavailable", "html_too_large");
	const candidates = [];
	const jsonBlocks = [];
	const frames = [];
	let restricted = false;
	let publisherPolicy = false;
	let freeBodySeen = false;
	const paragraphCounts = /* @__PURE__ */ new Map();
	let tooDeep = false;
	let incomplete = false;
	let jsonLimit = false;
	const parser = new Parser({
		onopentag(name, attrs) {
			const parent = frames.at(-1);
			const classes = attrs.class ?? "";
			const tokens = parent?.candidate ? [] : classes.split(/\s+/);
			const main = Boolean(parent?.main || name === "main" && attrs.id === "main");
			const freeStory = Boolean(parent?.freeStory || attrs.id === "story-content-FREE");
			if (name === "meta" && /^(?:robots|googlebot|bingbot)$/i.test(attrs.name ?? "")) {
				const directives = (attrs.content ?? "").toLowerCase();
				if (/(?:^|[,;\s])noarchive(?:$|[,;\s])/.test(directives)) cacheable = false;
				if (/(?:^|[,;\s])nosnippet(?:$|[,;\s])|(?:^|[,;\s])max-snippet\s*:\s*0(?:$|[,;\s])/.test(directives)) publisherPolicy = true;
			}
			const hidden = Boolean(parent?.hidden || "hidden" in attrs || attrs["aria-hidden"] === "true" || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attrs.style ?? ""));
			const inert = ignoredTags.has(name);
			const ignored = Boolean(parent?.ignored || inert || hidden || ignoredClass.test(classes + " " + (attrs.id ?? "")) || ipm && /ap-(?:StoryInterstitialLink|AdContainer|SmartTarget|StoryVideo)|NewsletterPromo/.test(classes + " " + (attrs.id ?? "")));
			if (!hidden && !parent?.ignored && !inert && attrs.id !== "piano-paywall-FREE" && restrictionClass.test(classes + " " + (attrs.id ?? ""))) restricted = true;
			let candidate = parent?.candidate;
			if (!ignored && !candidate && (ipm ? attrs.id === "article-text" && tokens.includes("ap-Story-content") : sourceId === "gouvernement" ? main && tokens.includes("cmp-text") : (bodyClasses[sourceId] ?? []).some((token) => tokens.includes(token)))) {
				candidate = [];
				candidates.push(candidate);
			}
			if (!ignored && candidate && /(?:preview|excerpt|truncat|line-clamp)/i.test(classes + " " + (attrs.style ?? ""))) incomplete = true;
			if (!ignored && candidate && name === "p") paragraphCounts.set(candidate, (paragraphCounts.get(candidate) ?? 0) + 1);
			const json = name === "script" && attrs.type?.toLowerCase().split(";")[0]?.trim() === "application/ld+json" ? [] : void 0;
			if (json) jsonBlocks.push(json);
			frames.push({
				ignored,
				hidden,
				candidate,
				json,
				main,
				freeStory
			});
			if (frames.length > 128) tooDeep = true;
			if (!ignored && /^(?:p|div|section|h[1-6]|li|blockquote|br)$/.test(name)) candidate?.push("\n\n");
		},
		ontext(text) {
			const frame = frames.at(-1);
			if (frame?.json) frame.json.push(text);
			if (!frame?.ignored) {
				frame?.candidate?.push(text);
				if (frame?.candidate && frame.freeStory && text.trim()) freeBodySeen = true;
			}
		},
		onclosetag(name) {
			const frame = frames.pop();
			if (!frame?.ignored && /^(?:p|div|section|h[1-6]|li|blockquote)$/.test(name)) frame?.candidate?.push("\n\n");
		}
	}, { decodeEntities: true });
	try {
		parser.end(html);
	} catch {
		return finish("unavailable", "invalid_html");
	}
	if (tooDeep) return finish("unavailable", "html_too_deep");
	const jsonCandidates = [];
	for (const block of jsonBlocks) {
		let parsed;
		try {
			parsed = JSON.parse(block.join(""));
		} catch {
			continue;
		}
		const queue = [parsed];
		let visited = 0;
		while (queue.length && visited++ < 2e4) {
			const value = queue.pop();
			if (!value || typeof value !== "object") continue;
			if (Array.isArray(value)) {
				for (const entry of value) queue.push(entry);
				continue;
			}
			const object = value;
			if ((Array.isArray(object["@type"]) ? object["@type"] : [object["@type"]]).some((type) => typeof type === "string" && /(?:^|[/#])(?:Article|NewsArticle|ReportageNewsArticle|AnalysisNewsArticle|BlogPosting)$/.test(type))) {
				const descendants = [object];
				let denied = false;
				while (descendants.length) {
					const child = descendants.pop();
					if (!child || typeof child !== "object") continue;
					if (Array.isArray(child)) {
						for (const entry of child) descendants.push(entry);
						continue;
					}
					const entry = child;
					if (entry.isAccessibleForFree === false || typeof entry.isAccessibleForFree === "string" && entry.isAccessibleForFree.trim().toLowerCase() === "false") denied = true;
					if (entry.hasPart) descendants.push(entry.hasPart);
				}
				if (denied) restricted = true;
				if (!denied && (object.isAccessibleForFree === true || typeof object.isAccessibleForFree === "string" && object.isAccessibleForFree.trim().toLowerCase() === "true" || sourceId === "gouvernement") && typeof object.articleBody === "string") jsonCandidates.push(object.articleBody);
			}
			for (const entry of Object.values(object)) queue.push(entry);
		}
		if (queue.length) jsonLimit = true;
	}
	const normalizedCandidates = new Map(candidates.map((parts) => [parts, normalize(parts.join(""))]));
	if (restricted) return finish("restricted", "access_restricted");
	if ([...normalizedCandidates.values()].some((body) => restrictionText.test(body))) return finish("unavailable", "possible_access_restriction");
	if (publisherPolicy) return finish("unavailable", "publisher_policy");
	if (jsonLimit) return finish("unavailable", "json_too_complex");
	if (incomplete) return finish("unavailable", "incomplete_body");
	let selectedCandidates = candidates;
	if (sourceId === "gouvernement") selectedCandidates = candidates.filter((parts) => (paragraphCounts.get(parts) ?? 0) >= 2).slice(0, 1);
	const domBodies = selectedCandidates.map((parts) => normalizedCandidates.get(parts) ?? "").filter(Boolean);
	const jsonBodies = [...new Set(jsonCandidates.map(cleanJsonText).filter(Boolean))];
	if (ipm) {
		if (!freeBodySeen || jsonBodies.length !== 1 || domBodies.length !== 1) return finish("unavailable", jsonBodies.length > 1 || domBodies.length > 1 ? "ambiguous_body" : "body_not_found");
		if (!correspondingBodies(domBodies[0], jsonBodies[0])) return finish("unavailable", "body_mismatch");
	}
	const bodies = domBodies.length ? domBodies : ipm ? [] : jsonBodies;
	if (bodies.some((body) => body.length > MAX_TEXT)) return finish("unavailable", "text_too_large");
	const maximal = [...new Set(bodies.filter(Boolean))];
	if (maximal.length > 1) return finish("unavailable", "ambiguous_body");
	const text = maximal[0] ?? "";
	if (text.length < MIN_TEXT) return finish("unavailable", text ? "body_too_short" : "body_not_found");
	if (/(?:…|\.{3}|\[\s*…\s*\])\s*$/.test(text) || /(?:lire la suite|read more|suite de l.article|texte tronqué)\s*[.!…]*$/i.test(text)) return finish("unavailable", "incomplete_body");
	return finish("available", "body_extracted", text);
}
function cleanJsonText(html) {
	const parts = [];
	let ignored = 0;
	const stack = [];
	new Parser({
		onopentag(name) {
			const skip = ignoredTags.has(name);
			stack.push(skip);
			if (skip) ignored++;
			if (!ignored && /^(?:p|div|br)$/.test(name)) parts.push("\n\n");
		},
		ontext(text) {
			if (!ignored) parts.push(text);
		},
		onclosetag(name) {
			if (stack.pop()) ignored--;
			if (!ignored && /^(?:p|div)$/.test(name)) parts.push("\n\n");
		}
	}, { decodeEntities: true }).end(html);
	return normalize(parts.join(""));
}
function correspondingBodies(dom, json) {
	const words = (text) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
	const left = words(dom);
	const right = words(json);
	if (!left.length || !right.length || Math.min(left.length, right.length) / Math.max(left.length, right.length) < .9) return false;
	let matched = 0;
	for (const word of left) if (word === right[matched]) matched++;
	if (matched / right.length >= .9) return true;
	matched = 0;
	for (const word of right) if (word === left[matched]) matched++;
	return matched / left.length >= .9;
}
// apps/worker/feeds/article-fetch.ts
var USER_AGENT = "MyPressReview/0.1 (+https://github.com/laurentkai/my-press-review)";
var ArticleFetchError = class extends Error {
	reason;
	constructor(reason) {
		super(reason);
		this.reason = reason;
	}
};
async function readBounded(response, max, signal) {
	if (Number(response.headers.get("content-length")) > max) {
		await response.body?.cancel();
		throw new ArticleFetchError("too_large");
	}
	const reader = response.body?.getReader();
	if (!reader) throw new ArticleFetchError("empty_response");
	const abort = () => {
		reader.cancel().catch(() => {});
	};
	signal.addEventListener("abort", abort, { once: true });
	let size = 0, text = "";
	const decoder = new TextDecoder();
	try {
		signal.throwIfAborted();
		while (true) {
			const { value, done } = await reader.read();
			signal.throwIfAborted();
			if (done) break;
			size += value.byteLength;
			if (size > max) {
				await reader.cancel();
				throw new ArticleFetchError("too_large");
			}
			text += decoder.decode(value, { stream: true });
		}
		return text + decoder.decode();
	} finally {
		signal.removeEventListener("abort", abort);
		reader.releaseLock();
	}
}
async function documentResponse(url, source, fetcher, signal, allowed) {
	for (let hop = 0; hop <= 3; hop++) {
		if (!isSourceUrl(url, source)) throw new ArticleFetchError("redirect_refused");
		if (allowed && !allowed(url)) throw new ArticleFetchError("robots_disallowed");
		const response = await fetcher(url, {
			redirect: "manual",
			signal,
			credentials: "omit",
			cache: "no-store",
			headers: {
				"User-Agent": USER_AGENT,
				Accept: "text/html,application/xhtml+xml,text/plain;q=0.5",
				"Cache-Control": "no-cache"
			}
		});
		if (response.status < 300 || response.status >= 400) return {
			response,
			url
		};
		const location = response.headers.get("location");
		await response.body?.cancel();
		if (!location) throw new ArticleFetchError("redirect_refused");
		const target = new URL(location, url);
		if (/(?:consent|privacy)/i.test(target.hostname) && !isSourceUrl(target.href, source)) throw new ArticleFetchError("consent_required");
		if (hop === 3 || !isSourceUrl(target.href, source)) throw new ArticleFetchError("redirect_refused");
		url = target.href;
	}
	throw new ArticleFetchError("redirect_refused");
}
async function fetchArticlePage(db, url, source, fetcher = fetch, now = Date.now()) {
	if (!isSourceUrl(url, source)) throw new ArticleFetchError("url_refused");
	const signal = AbortSignal.timeout(15e3);
	const origin = new URL(url).origin;
	let robots = await db.prepare("SELECT body,status FROM trial_article_robots WHERE origin=? AND next_check_at>?").bind(origin, now).first();
	if (!robots) {
		let body = "", status = "ok";
		try {
			const { response } = await documentResponse(origin + "/robots.txt", source, fetcher, signal);
			if (!response.ok) {
				await response.body?.cancel();
				throw new ArticleFetchError("robots_unavailable");
			}
			body = await readBounded(response, 128e3, signal);
			if (body.trim().startsWith("<")) throw new ArticleFetchError("robots_unavailable");
		} catch {
			status = "robots_unavailable";
			body = "";
		}
		await db.prepare("INSERT INTO trial_article_robots(origin,body,status,next_check_at) VALUES(?,?,?,?) ON CONFLICT(origin) DO UPDATE SET body=excluded.body,status=excluded.status,next_check_at=excluded.next_check_at").bind(origin, body, status, now + (status === "ok" ? 36e5 : 9e5)).run();
		robots = {
			body,
			status
		};
	}
	if (robots.status !== "ok") throw new ArticleFetchError("robots_unavailable");
	const rules = (0, import_robots_parser.default)(origin + "/robots.txt", robots.body);
	if (rules.isAllowed(url, "MyPressReview") !== true) throw new ArticleFetchError("robots_disallowed");
	const delay = rules.getCrawlDelay("MyPressReview") ?? 0;
	if (!Number.isFinite(delay) || delay < 0 || delay > 86400) throw new ArticleFetchError("robots_disallowed");
	const { response } = await documentResponse(url, source, fetcher, signal, (target) => new URL(target).origin === origin && rules.isAllowed(target, "MyPressReview") === true);
	if (!response.ok) {
		await response.body?.cancel();
		throw new ArticleFetchError(response.status === 403 ? "blocked_403" : response.status === 429 ? "rate_limited" : response.status === 404 ? "not_found" : "server_error");
	}
	if (!/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/i.test(response.headers.get("content-type") ?? "")) {
		await response.body?.cancel();
		throw new ArticleFetchError("unsupported_content");
	}
	const robotTags = response.headers.get("x-robots-tag") ?? "";
	if (/(?:nosnippet|max-snippet\s*:\s*0)(?:\b|$)/i.test(robotTags)) {
		await response.body?.cancel();
		throw new ArticleFetchError("publisher_policy");
	}
	const result = extractArticle(await preprocessArticleHtml(await readBounded(response, 2e6, signal)), source.id);
	return {
		...result,
		cacheable: !("cacheable" in result && result.cacheable === false) && !/(?:^|[\s,:])noarchive\b/i.test(robotTags),
		crawlDelayMs: Math.max(15e3, delay * 1e3)
	};
}
// apps/worker/feeds/article-collector.ts
var TRANSIENT_REASONS = [
	"network_error",
	"timeout",
	"server_error",
	"robots_unavailable",
	"rate_limited"
];
function articlePolicy(sourceId, access) {
	if (access === "restricted") return "access_restricted";
	if (sourceId === "7sur7") return "publisher_policy";
	if (![
		"dh",
		"lalibre",
		"gouvernement"
	].includes(sourceId)) return "source_unverified";
	if (["dh", "lalibre"].includes(sourceId) && access !== "free") return "access_unverified";
	return null;
}
async function collectArticle(db, id, fetcher = fetch, now = Date.now()) {
	const article = await db.prepare("SELECT a.id,a.source_id,a.url,a.access_level,a.full_status,a.full_next_fetch_at,a.full_reason FROM trial_articles a JOIN trial_sources s ON s.id=a.source_id WHERE a.id=? AND s.enabled=1").bind(id).first();
	if (!article) return {
		processed: false,
		status: "missing",
		reason: "not_found",
		nextAttemptAt: 0
	};
	const policy = articlePolicy(article.source_id, article.access_level);
	if (policy) {
		const status = policy === "access_restricted" ? "restricted" : "unavailable";
		await db.prepare("UPDATE trial_articles SET full_status=?,full_reason=?,full_text='',full_next_fetch_at=? WHERE id=?").bind(status, policy, now + 864e5, id).run();
		return {
			processed: false,
			status,
			reason: policy,
			nextAttemptAt: now + 864e5
		};
	}
	if (article.full_status === "available" || article.full_status === "restricted" || article.full_status === "unavailable" && !TRANSIENT_REASONS.includes(article.full_reason)) return {
		processed: false,
		status: article.full_status,
		reason: article.full_reason,
		nextAttemptAt: article.full_next_fetch_at
	};
	if (article.full_next_fetch_at > now) return {
		processed: false,
		status: article.full_status,
		reason: "not_due",
		nextAttemptAt: article.full_next_fetch_at
	};
	const source = trialCatalog.find((source) => source.id === article.source_id);
	const owner = crypto.randomUUID();
	if (!await db.prepare("UPDATE trial_sources SET article_lease_owner=?,article_lease_until=? WHERE id=? AND enabled=1 AND article_lease_until<=? AND article_next_fetch_at<=? AND lease_until<=? RETURNING id").bind(owner, now + 9e4, source.id, now, now, now).first()) {
		const state = await db.prepare("SELECT article_next_fetch_at,article_lease_until,lease_until FROM trial_sources WHERE id=?").bind(source.id).first();
		return {
			processed: false,
			status: article.full_status,
			reason: "source_busy",
			nextAttemptAt: Math.max(state?.article_next_fetch_at ?? 0, state?.article_lease_until ?? 0, state?.lease_until ?? 0)
		};
	}
	let delay = 15e3;
	try {
		let status = "unavailable", text = "", reason = "network_error", cacheable = true;
		try {
			const result = await fetchArticlePage(db, article.url, source, fetcher, now);
			status = result.status;
			text = result.text;
			reason = result.reason;
			cacheable = result.cacheable;
			delay = result.crawlDelayMs;
			if (status === "available" && !cacheable) status = "live";
		} catch (error) {
			reason = error instanceof ArticleFetchError ? error.reason : error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name) ? "timeout" : "network_error";
		}
		if ([
			"blocked_403",
			"robots_disallowed",
			"publisher_policy"
		].includes(reason)) delay = Math.max(delay, 216e5);
		else if (reason === "rate_limited") delay = Math.max(delay, 36e5);
		else if (reason === "robots_unavailable") delay = Math.max(delay, 9e5);
		const completedAt = Date.now();
		const nextAttempt = completedAt + (status === "available" ? 864e5 : status === "live" ? delay : ["restricted", "unavailable"].includes(status) ? TRANSIENT_REASONS.includes(reason) ? Math.max(9e5, delay) : 864e5 : 9e5);
		if (!await db.prepare(`UPDATE trial_articles SET full_status=?,full_text=?,full_reason=?,full_fetched_at=?,full_next_fetch_at=? WHERE id=? AND access_level!='restricted' AND EXISTS(SELECT 1 FROM trial_sources WHERE id=? AND enabled=1 AND article_lease_owner=? AND article_lease_until>?) RETURNING id`).bind(status, status === "available" ? text : "", reason, completedAt, nextAttempt, id, source.id, owner, Date.now()).first()) return {
			processed: false,
			status: "unavailable",
			reason: "source_changed",
			nextAttemptAt: Date.now() + delay
		};
		return {
			processed: true,
			status,
			reason,
			nextAttemptAt: nextAttempt,
			...status === "live" ? { liveText: text } : {}
		};
	} finally {
		await db.prepare("UPDATE trial_sources SET article_lease_owner=NULL,article_lease_until=0,article_next_fetch_at=? WHERE id=? AND article_lease_owner=?").bind(Date.now() + delay, source.id, owner).run();
	}
}
async function scheduledArticles(db, now = Date.now()) {
	const due = await db.prepare(`SELECT a.id FROM trial_articles a JOIN trial_sources s ON s.id=a.source_id WHERE s.enabled=1 AND a.source_id='gouvernement' AND a.access_level!='restricted' AND (a.full_status='pending' OR (a.full_status='unavailable' AND a.full_reason IN (${TRANSIENT_REASONS.map(() => "?").join(",")}))) AND a.full_next_fetch_at<=? AND s.article_next_fetch_at<=? AND s.article_lease_until<=? AND s.lease_until<=? ORDER BY COALESCE(a.published_at,a.collected_at) DESC LIMIT 1`).bind(...TRANSIENT_REASONS, now, now, now, now).all();
	return Promise.allSettled(due.results.map((article) => collectArticle(db, article.id, fetch, now)));
}
// node_modules/xmlchars/xml/1.0/ed5.js
var require_ed5 = /* @__PURE__ */ __commonJSMin(((exports) => {
	/**
	* Character classes and associated utilities for the 5th edition of XML 1.0.
	*
	* @author Louis-Dominique Dubeau
	* @license MIT
	* @copyright Louis-Dominique Dubeau
	*/
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.CHAR = "	\n\r -퟿-�𐀀-􏿿";
	exports.S = " 	\r\n";
	exports.NAME_START_CHAR = ":A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
	exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
	exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
	exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
	exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
	exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
	exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
	exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
	var TAB = 9;
	var NL = 10;
	var CR = 13;
	var SPACE = 32;
	/** All characters in the ``S`` production. */
	exports.S_LIST = [
		SPACE,
		NL,
		CR,
		TAB
	];
	/**
	* Determines whether a codepoint matches the ``CHAR`` production.
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches ``CHAR``.
	*/
	function isChar(c) {
		return c >= SPACE && c <= 55295 || c === NL || c === CR || c === TAB || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
	}
	exports.isChar = isChar;
	/**
	* Determines whether a codepoint matches the ``S`` (space) production.
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches ``S``.
	*/
	function isS(c) {
		return c === SPACE || c === NL || c === CR || c === TAB;
	}
	exports.isS = isS;
	/**
	* Determines whether a codepoint matches the ``NAME_START_CHAR`` production.
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches ``NAME_START_CHAR``.
	*/
	function isNameStartChar(c) {
		return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
	}
	exports.isNameStartChar = isNameStartChar;
	/**
	* Determines whether a codepoint matches the ``NAME_CHAR`` production.
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches ``NAME_CHAR``.
	*/
	function isNameChar(c) {
		return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
	}
	exports.isNameChar = isNameChar;
}));
// node_modules/xmlchars/xml/1.1/ed2.js
var require_ed2 = /* @__PURE__ */ __commonJSMin(((exports) => {
	/**
	* Character classes and associated utilities for the 2nd edition of XML 1.1.
	*
	* @author Louis-Dominique Dubeau
	* @license MIT
	* @copyright Louis-Dominique Dubeau
	*/
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.CHAR = "-퟿-�𐀀-􏿿";
	exports.RESTRICTED_CHAR = "-\b\v\f---";
	exports.S = " 	\r\n";
	exports.NAME_START_CHAR = ":A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
	exports.NAME_CHAR = "-" + exports.NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
	exports.CHAR_RE = new RegExp("^[" + exports.CHAR + "]$", "u");
	exports.RESTRICTED_CHAR_RE = new RegExp("^[" + exports.RESTRICTED_CHAR + "]$", "u");
	exports.S_RE = new RegExp("^[" + exports.S + "]+$", "u");
	exports.NAME_START_CHAR_RE = new RegExp("^[" + exports.NAME_START_CHAR + "]$", "u");
	exports.NAME_CHAR_RE = new RegExp("^[" + exports.NAME_CHAR + "]$", "u");
	exports.NAME_RE = new RegExp("^[" + exports.NAME_START_CHAR + "][" + exports.NAME_CHAR + "]*$", "u");
	exports.NMTOKEN_RE = new RegExp("^[" + exports.NAME_CHAR + "]+$", "u");
	var TAB = 9;
	var NL = 10;
	var CR = 13;
	var SPACE = 32;
	/** All characters in the ``S`` production. */
	exports.S_LIST = [
		SPACE,
		NL,
		CR,
		TAB
	];
	/**
	* Determines whether a codepoint matches the ``CHAR`` production.
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches ``CHAR``.
	*/
	function isChar(c) {
		return c >= 1 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
	}
	exports.isChar = isChar;
	/**
	* Determines whether a codepoint matches the ``RESTRICTED_CHAR`` production.
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches ``RESTRICTED_CHAR``.
	*/
	function isRestrictedChar(c) {
		return c >= 1 && c <= 8 || c === 11 || c === 12 || c >= 14 && c <= 31 || c >= 127 && c <= 132 || c >= 134 && c <= 159;
	}
	exports.isRestrictedChar = isRestrictedChar;
	/**
	* Determines whether a codepoint matches the ``CHAR`` production and does not
	* match the ``RESTRICTED_CHAR`` production. ``isCharAndNotRestricted(x)`` is
	* equivalent to ``isChar(x) && !isRestrictedChar(x)``. This function is faster
	* than running the two-call equivalent.
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches ``CHAR`` and does not match
	* ``RESTRICTED_CHAR``.
	*/
	function isCharAndNotRestricted(c) {
		return c === 9 || c === 10 || c === 13 || c > 31 && c < 127 || c === 133 || c > 159 && c <= 55295 || c >= 57344 && c <= 65533 || c >= 65536 && c <= 1114111;
	}
	exports.isCharAndNotRestricted = isCharAndNotRestricted;
	/**
	* Determines whether a codepoint matches the ``S`` (space) production.
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches ``S``.
	*/
	function isS(c) {
		return c === SPACE || c === NL || c === CR || c === TAB;
	}
	exports.isS = isS;
	/**
	* Determines whether a codepoint matches the ``NAME_START_CHAR`` production.
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches ``NAME_START_CHAR``.
	*/
	function isNameStartChar(c) {
		return c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 58 || c === 95 || c === 8204 || c === 8205 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
	}
	exports.isNameStartChar = isNameStartChar;
	/**
	* Determines whether a codepoint matches the ``NAME_CHAR`` production.
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches ``NAME_CHAR``.
	*/
	function isNameChar(c) {
		return isNameStartChar(c) || c >= 48 && c <= 57 || c === 45 || c === 46 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
	}
	exports.isNameChar = isNameChar;
}));
// node_modules/xmlchars/xmlns/1.0/ed3.js
var require_ed3 = /* @__PURE__ */ __commonJSMin(((exports) => {
	/**
	* Character class utilities for XML NS 1.0 edition 3.
	*
	* @author Louis-Dominique Dubeau
	* @license MIT
	* @copyright Louis-Dominique Dubeau
	*/
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.NC_NAME_START_CHAR = "A-Z_a-zÀ-ÖØ-öø-˿Ͱ-ͽͿ-῿‌-‍⁰-↏Ⰰ-⿯、-퟿豈-﷏ﷰ-�𐀀-󯿿";
	exports.NC_NAME_CHAR = "-" + exports.NC_NAME_START_CHAR + ".0-9·̀-ͯ‿-⁀";
	exports.NC_NAME_START_CHAR_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "]$", "u");
	exports.NC_NAME_CHAR_RE = new RegExp("^[" + exports.NC_NAME_CHAR + "]$", "u");
	exports.NC_NAME_RE = new RegExp("^[" + exports.NC_NAME_START_CHAR + "][" + exports.NC_NAME_CHAR + "]*$", "u");
	/**
	* Determines whether a codepoint matches [[NC_NAME_START_CHAR]].
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches.
	*/
	function isNCNameStartChar(c) {
		return c >= 65 && c <= 90 || c === 95 || c >= 97 && c <= 122 || c >= 192 && c <= 214 || c >= 216 && c <= 246 || c >= 248 && c <= 767 || c >= 880 && c <= 893 || c >= 895 && c <= 8191 || c >= 8204 && c <= 8205 || c >= 8304 && c <= 8591 || c >= 11264 && c <= 12271 || c >= 12289 && c <= 55295 || c >= 63744 && c <= 64975 || c >= 65008 && c <= 65533 || c >= 65536 && c <= 983039;
	}
	exports.isNCNameStartChar = isNCNameStartChar;
	/**
	* Determines whether a codepoint matches [[NC_NAME_CHAR]].
	*
	* @param c The code point.
	*
	* @returns ``true`` if the codepoint matches.
	*/
	function isNCNameChar(c) {
		return isNCNameStartChar(c) || c === 45 || c === 46 || c >= 48 && c <= 57 || c === 183 || c >= 768 && c <= 879 || c >= 8255 && c <= 8256;
	}
	exports.isNCNameChar = isNCNameChar;
}));
// node_modules/saxes/saxes.js
var require_saxes = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.SaxesParser = exports.EVENTS = void 0;
	var ed5 = require_ed5();
	var ed2 = require_ed2();
	var NSed3 = require_ed3();
	var isS = ed5.isS;
	var isChar10 = ed5.isChar;
	var isNameStartChar = ed5.isNameStartChar;
	var isNameChar = ed5.isNameChar;
	var S_LIST = ed5.S_LIST;
	var NAME_RE = ed5.NAME_RE;
	var isChar11 = ed2.isChar;
	var isNCNameStartChar = NSed3.isNCNameStartChar;
	var isNCNameChar = NSed3.isNCNameChar;
	var NC_NAME_RE = NSed3.NC_NAME_RE;
	var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
	var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
	var rootNS = {
		__proto__: null,
		xml: XML_NAMESPACE,
		xmlns: XMLNS_NAMESPACE
	};
	var XML_ENTITIES = {
		__proto__: null,
		amp: "&",
		gt: ">",
		lt: "<",
		quot: "\"",
		apos: "'"
	};
	var EOC = -1;
	var NL_LIKE = -2;
	var S_BEGIN = 0;
	var S_BEGIN_WHITESPACE = 1;
	var S_DOCTYPE = 2;
	var S_DOCTYPE_QUOTE = 3;
	var S_DTD = 4;
	var S_DTD_QUOTED = 5;
	var S_DTD_OPEN_WAKA = 6;
	var S_DTD_OPEN_WAKA_BANG = 7;
	var S_DTD_COMMENT = 8;
	var S_DTD_COMMENT_ENDING = 9;
	var S_DTD_COMMENT_ENDED = 10;
	var S_DTD_PI = 11;
	var S_DTD_PI_ENDING = 12;
	var S_TEXT = 13;
	var S_ENTITY = 14;
	var S_OPEN_WAKA = 15;
	var S_OPEN_WAKA_BANG = 16;
	var S_COMMENT = 17;
	var S_COMMENT_ENDING = 18;
	var S_COMMENT_ENDED = 19;
	var S_CDATA = 20;
	var S_CDATA_ENDING = 21;
	var S_CDATA_ENDING_2 = 22;
	var S_PI_FIRST_CHAR = 23;
	var S_PI_REST = 24;
	var S_PI_BODY = 25;
	var S_PI_ENDING = 26;
	var S_XML_DECL_NAME_START = 27;
	var S_XML_DECL_NAME = 28;
	var S_XML_DECL_EQ = 29;
	var S_XML_DECL_VALUE_START = 30;
	var S_XML_DECL_VALUE = 31;
	var S_XML_DECL_SEPARATOR = 32;
	var S_XML_DECL_ENDING = 33;
	var S_OPEN_TAG = 34;
	var S_OPEN_TAG_SLASH = 35;
	var S_ATTRIB = 36;
	var S_ATTRIB_NAME = 37;
	var S_ATTRIB_NAME_SAW_WHITE = 38;
	var S_ATTRIB_VALUE = 39;
	var S_ATTRIB_VALUE_QUOTED = 40;
	var S_ATTRIB_VALUE_CLOSED = 41;
	var S_ATTRIB_VALUE_UNQUOTED = 42;
	var S_CLOSE_TAG = 43;
	var S_CLOSE_TAG_SAW_WHITE = 44;
	var TAB = 9;
	var NL = 10;
	var CR = 13;
	var SPACE = 32;
	var BANG = 33;
	var DQUOTE = 34;
	var AMP = 38;
	var SQUOTE = 39;
	var MINUS = 45;
	var FORWARD_SLASH = 47;
	var SEMICOLON = 59;
	var LESS = 60;
	var EQUAL = 61;
	var GREATER = 62;
	var QUESTION = 63;
	var OPEN_BRACKET = 91;
	var CLOSE_BRACKET = 93;
	var NEL = 133;
	var LS = 8232;
	var isQuote = (c) => c === DQUOTE || c === SQUOTE;
	var QUOTES = [DQUOTE, SQUOTE];
	var DOCTYPE_TERMINATOR = [
		...QUOTES,
		OPEN_BRACKET,
		GREATER
	];
	var DTD_TERMINATOR = [
		...QUOTES,
		LESS,
		CLOSE_BRACKET
	];
	var XML_DECL_NAME_TERMINATOR = [
		EQUAL,
		QUESTION,
		...S_LIST
	];
	var ATTRIB_VALUE_UNQUOTED_TERMINATOR = [
		...S_LIST,
		GREATER,
		AMP,
		LESS
	];
	function nsPairCheck(parser, prefix, uri) {
		switch (prefix) {
			case "xml":
				if (uri !== XML_NAMESPACE) parser.fail(`xml prefix must be bound to ${XML_NAMESPACE}.`);
				break;
			case "xmlns": if (uri !== XMLNS_NAMESPACE) parser.fail(`xmlns prefix must be bound to ${XMLNS_NAMESPACE}.`);
		}
		switch (uri) {
			case XMLNS_NAMESPACE:
				parser.fail(prefix === "" ? `the default namespace may not be set to ${uri}.` : `may not assign a prefix (even "xmlns") to the URI \
${XMLNS_NAMESPACE}.`);
				break;
			case XML_NAMESPACE: switch (prefix) {
				case "xml": break;
				case "":
					parser.fail(`the default namespace may not be set to ${uri}.`);
					break;
				default: parser.fail("may not assign the xml namespace to another prefix.");
			}
		}
	}
	function nsMappingCheck(parser, mapping) {
		for (const local of Object.keys(mapping)) nsPairCheck(parser, local, mapping[local]);
	}
	var isNCName = (name) => NC_NAME_RE.test(name);
	var isName = (name) => NAME_RE.test(name);
	var FORBIDDEN_START = 0;
	var FORBIDDEN_BRACKET = 1;
	var FORBIDDEN_BRACKET_BRACKET = 2;
	/**
	* The list of supported events.
	*/
	exports.EVENTS = [
		"xmldecl",
		"text",
		"processinginstruction",
		"doctype",
		"comment",
		"opentagstart",
		"attribute",
		"opentag",
		"closetag",
		"cdata",
		"error",
		"end",
		"ready"
	];
	var EVENT_NAME_TO_HANDLER_NAME = {
		xmldecl: "xmldeclHandler",
		text: "textHandler",
		processinginstruction: "piHandler",
		doctype: "doctypeHandler",
		comment: "commentHandler",
		opentagstart: "openTagStartHandler",
		attribute: "attributeHandler",
		opentag: "openTagHandler",
		closetag: "closeTagHandler",
		cdata: "cdataHandler",
		error: "errorHandler",
		end: "endHandler",
		ready: "readyHandler"
	};
	var SaxesParser = class {
		/**
		* @param opt The parser options.
		*/
		constructor(opt) {
			this.opt = opt !== null && opt !== void 0 ? opt : {};
			this.fragmentOpt = !!this.opt.fragment;
			const xmlnsOpt = this.xmlnsOpt = !!this.opt.xmlns;
			this.trackPosition = this.opt.position !== false;
			this.fileName = this.opt.fileName;
			if (xmlnsOpt) {
				this.nameStartCheck = isNCNameStartChar;
				this.nameCheck = isNCNameChar;
				this.isName = isNCName;
				this.processAttribs = this.processAttribsNS;
				this.pushAttrib = this.pushAttribNS;
				this.ns = Object.assign({ __proto__: null }, rootNS);
				const additional = this.opt.additionalNamespaces;
				if (additional != null) {
					nsMappingCheck(this, additional);
					Object.assign(this.ns, additional);
				}
			} else {
				this.nameStartCheck = isNameStartChar;
				this.nameCheck = isNameChar;
				this.isName = isName;
				this.processAttribs = this.processAttribsPlain;
				this.pushAttrib = this.pushAttribPlain;
			}
			this.stateTable = [
				this.sBegin,
				this.sBeginWhitespace,
				this.sDoctype,
				this.sDoctypeQuote,
				this.sDTD,
				this.sDTDQuoted,
				this.sDTDOpenWaka,
				this.sDTDOpenWakaBang,
				this.sDTDComment,
				this.sDTDCommentEnding,
				this.sDTDCommentEnded,
				this.sDTDPI,
				this.sDTDPIEnding,
				this.sText,
				this.sEntity,
				this.sOpenWaka,
				this.sOpenWakaBang,
				this.sComment,
				this.sCommentEnding,
				this.sCommentEnded,
				this.sCData,
				this.sCDataEnding,
				this.sCDataEnding2,
				this.sPIFirstChar,
				this.sPIRest,
				this.sPIBody,
				this.sPIEnding,
				this.sXMLDeclNameStart,
				this.sXMLDeclName,
				this.sXMLDeclEq,
				this.sXMLDeclValueStart,
				this.sXMLDeclValue,
				this.sXMLDeclSeparator,
				this.sXMLDeclEnding,
				this.sOpenTag,
				this.sOpenTagSlash,
				this.sAttrib,
				this.sAttribName,
				this.sAttribNameSawWhite,
				this.sAttribValue,
				this.sAttribValueQuoted,
				this.sAttribValueClosed,
				this.sAttribValueUnquoted,
				this.sCloseTag,
				this.sCloseTagSawWhite
			];
			this._init();
		}
		/**
		* Indicates whether or not the parser is closed. If ``true``, wait for
		* the ``ready`` event to write again.
		*/
		get closed() {
			return this._closed;
		}
		_init() {
			var _a;
			this.openWakaBang = "";
			this.text = "";
			this.name = "";
			this.piTarget = "";
			this.entity = "";
			this.q = null;
			this.tags = [];
			this.tag = null;
			this.topNS = null;
			this.chunk = "";
			this.chunkPosition = 0;
			this.i = 0;
			this.prevI = 0;
			this.carriedFromPrevious = void 0;
			this.forbiddenState = FORBIDDEN_START;
			this.attribList = [];
			const { fragmentOpt } = this;
			this.state = fragmentOpt ? S_TEXT : S_BEGIN;
			this.reportedTextBeforeRoot = this.reportedTextAfterRoot = this.closedRoot = this.sawRoot = fragmentOpt;
			this.xmlDeclPossible = !fragmentOpt;
			this.xmlDeclExpects = ["version"];
			this.entityReturnState = void 0;
			let { defaultXMLVersion } = this.opt;
			if (defaultXMLVersion === void 0) {
				if (this.opt.forceXMLVersion === true) throw new Error("forceXMLVersion set but defaultXMLVersion is not set");
				defaultXMLVersion = "1.0";
			}
			this.setXMLVersion(defaultXMLVersion);
			this.positionAtNewLine = 0;
			this.doctype = false;
			this._closed = false;
			this.xmlDecl = {
				version: void 0,
				encoding: void 0,
				standalone: void 0
			};
			this.line = 1;
			this.column = 0;
			this.ENTITIES = Object.create(XML_ENTITIES);
			(_a = this.readyHandler) === null || _a === void 0 || _a.call(this);
		}
		/**
		* The stream position the parser is currently looking at. This field is
		* zero-based.
		*
		* This field is not based on counting Unicode characters but is to be
		* interpreted as a plain index into a JavaScript string.
		*/
		get position() {
			return this.chunkPosition + this.i;
		}
		/**
		* The column number of the next character to be read by the parser.  *
		* This field is zero-based. (The first column in a line is 0.)
		*
		* This field reports the index at which the next character would be in the
		* line if the line were represented as a JavaScript string.  Note that this
		* *can* be different to a count based on the number of *Unicode characters*
		* due to how JavaScript handles astral plane characters.
		*
		* See [[column]] for a number that corresponds to a count of Unicode
		* characters.
		*/
		get columnIndex() {
			return this.position - this.positionAtNewLine;
		}
		/**
		* Set an event listener on an event. The parser supports one handler per
		* event type. If you try to set an event handler over an existing handler,
		* the old handler is silently overwritten.
		*
		* @param name The event to listen to.
		*
		* @param handler The handler to set.
		*/
		on(name, handler) {
			this[EVENT_NAME_TO_HANDLER_NAME[name]] = handler;
		}
		/**
		* Unset an event handler.
		*
		* @parma name The event to stop listening to.
		*/
		off(name) {
			this[EVENT_NAME_TO_HANDLER_NAME[name]] = void 0;
		}
		/**
		* Make an error object. The error object will have a message that contains
		* the ``fileName`` option passed at the creation of the parser. If position
		* tracking was turned on, it will also have line and column number
		* information.
		*
		* @param message The message describing the error to report.
		*
		* @returns An error object with a properly formatted message.
		*/
		makeError(message) {
			var _a;
			let msg = (_a = this.fileName) !== null && _a !== void 0 ? _a : "";
			if (this.trackPosition) {
				if (msg.length > 0) msg += ":";
				msg += `${this.line}:${this.column}`;
			}
			if (msg.length > 0) msg += ": ";
			return new Error(msg + message);
		}
		/**
		* Report a parsing error. This method is made public so that client code may
		* check for issues that are outside the scope of this project and can report
		* errors.
		*
		* @param message The error to report.
		*
		* @returns this
		*/
		fail(message) {
			const err = this.makeError(message);
			const handler = this.errorHandler;
			if (handler === void 0) throw err;
			else handler(err);
			return this;
		}
		/**
		* Write a XML data to the parser.
		*
		* @param chunk The XML data to write.
		*
		* @returns this
		*/
		write(chunk) {
			if (this.closed) return this.fail("cannot write after close; assign an onready handler.");
			let end = false;
			if (chunk === null) {
				end = true;
				chunk = "";
			} else if (typeof chunk === "object") chunk = chunk.toString();
			if (this.carriedFromPrevious !== void 0) {
				chunk = `${this.carriedFromPrevious}${chunk}`;
				this.carriedFromPrevious = void 0;
			}
			let limit = chunk.length;
			const lastCode = chunk.charCodeAt(limit - 1);
			if (!end && (lastCode === CR || lastCode >= 55296 && lastCode <= 56319)) {
				this.carriedFromPrevious = chunk[limit - 1];
				limit--;
				chunk = chunk.slice(0, limit);
			}
			const { stateTable } = this;
			this.chunk = chunk;
			this.i = 0;
			while (this.i < limit) stateTable[this.state].call(this);
			this.chunkPosition += limit;
			return end ? this.end() : this;
		}
		/**
		* Close the current stream. Perform final well-formedness checks and reset
		* the parser tstate.
		*
		* @returns this
		*/
		close() {
			return this.write(null);
		}
		/**
		* Get a single code point out of the current chunk. This updates the current
		* position if we do position tracking.
		*
		* This is the algorithm to use for XML 1.0.
		*
		* @returns The character read.
		*/
		getCode10() {
			const { chunk, i } = this;
			this.prevI = i;
			this.i = i + 1;
			if (i >= chunk.length) return EOC;
			const code = chunk.charCodeAt(i);
			this.column++;
			if (code < 55296) {
				if (code >= SPACE || code === TAB) return code;
				switch (code) {
					case NL:
						this.line++;
						this.column = 0;
						this.positionAtNewLine = this.position;
						return NL;
					case CR:
						if (chunk.charCodeAt(i + 1) === NL) this.i = i + 2;
						this.line++;
						this.column = 0;
						this.positionAtNewLine = this.position;
						return NL_LIKE;
					default:
						this.fail("disallowed character.");
						return code;
				}
			}
			if (code > 56319) {
				if (!(code >= 57344 && code <= 65533)) this.fail("disallowed character.");
				return code;
			}
			const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
			this.i = i + 2;
			if (final > 1114111) this.fail("disallowed character.");
			return final;
		}
		/**
		* Get a single code point out of the current chunk. This updates the current
		* position if we do position tracking.
		*
		* This is the algorithm to use for XML 1.1.
		*
		* @returns {number} The character read.
		*/
		getCode11() {
			const { chunk, i } = this;
			this.prevI = i;
			this.i = i + 1;
			if (i >= chunk.length) return EOC;
			const code = chunk.charCodeAt(i);
			this.column++;
			if (code < 55296) {
				if (code > 31 && code < 127 || code > 159 && code !== LS || code === TAB) return code;
				switch (code) {
					case NL:
						this.line++;
						this.column = 0;
						this.positionAtNewLine = this.position;
						return NL;
					case CR: {
						const next = chunk.charCodeAt(i + 1);
						if (next === NL || next === NEL) this.i = i + 2;
					}
					case NEL:
					case LS:
						this.line++;
						this.column = 0;
						this.positionAtNewLine = this.position;
						return NL_LIKE;
					default:
						this.fail("disallowed character.");
						return code;
				}
			}
			if (code > 56319) {
				if (!(code >= 57344 && code <= 65533)) this.fail("disallowed character.");
				return code;
			}
			const final = 65536 + (code - 55296) * 1024 + (chunk.charCodeAt(i + 1) - 56320);
			this.i = i + 2;
			if (final > 1114111) this.fail("disallowed character.");
			return final;
		}
		/**
		* Like ``getCode`` but with the return value normalized so that ``NL`` is
		* returned for ``NL_LIKE``.
		*/
		getCodeNorm() {
			const c = this.getCode();
			return c === NL_LIKE ? NL : c;
		}
		unget() {
			this.i = this.prevI;
			this.column--;
		}
		/**
		* Capture characters into a buffer until encountering one of a set of
		* characters.
		*
		* @param chars An array of codepoints. Encountering a character in the array
		* ends the capture. (``chars`` may safely contain ``NL``.)
		*
		* @return The character code that made the capture end, or ``EOC`` if we hit
		* the end of the chunk. The return value cannot be NL_LIKE: NL is returned
		* instead.
		*/
		captureTo(chars) {
			let { i: start } = this;
			const { chunk } = this;
			while (true) {
				const c = this.getCode();
				const isNLLike = c === NL_LIKE;
				const final = isNLLike ? NL : c;
				if (final === EOC || chars.includes(final)) {
					this.text += chunk.slice(start, this.prevI);
					return final;
				}
				if (isNLLike) {
					this.text += `${chunk.slice(start, this.prevI)}\n`;
					start = this.i;
				}
			}
		}
		/**
		* Capture characters into a buffer until encountering a character.
		*
		* @param char The codepoint that ends the capture. **NOTE ``char`` MAY NOT
		* CONTAIN ``NL``.** Passing ``NL`` will result in buggy behavior.
		*
		* @return ``true`` if we ran into the character. Otherwise, we ran into the
		* end of the current chunk.
		*/
		captureToChar(char) {
			let { i: start } = this;
			const { chunk } = this;
			while (true) {
				let c = this.getCode();
				switch (c) {
					case NL_LIKE:
						this.text += `${chunk.slice(start, this.prevI)}\n`;
						start = this.i;
						c = NL;
						break;
					case EOC:
						this.text += chunk.slice(start);
						return false;
				}
				if (c === char) {
					this.text += chunk.slice(start, this.prevI);
					return true;
				}
			}
		}
		/**
		* Capture characters that satisfy ``isNameChar`` into the ``name`` field of
		* this parser.
		*
		* @return The character code that made the test fail, or ``EOC`` if we hit
		* the end of the chunk. The return value cannot be NL_LIKE: NL is returned
		* instead.
		*/
		captureNameChars() {
			const { chunk, i: start } = this;
			while (true) {
				const c = this.getCode();
				if (c === EOC) {
					this.name += chunk.slice(start);
					return EOC;
				}
				if (!isNameChar(c)) {
					this.name += chunk.slice(start, this.prevI);
					return c === NL_LIKE ? NL : c;
				}
			}
		}
		/**
		* Skip white spaces.
		*
		* @return The character that ended the skip, or ``EOC`` if we hit
		* the end of the chunk. The return value cannot be NL_LIKE: NL is returned
		* instead.
		*/
		skipSpaces() {
			while (true) {
				const c = this.getCodeNorm();
				if (c === EOC || !isS(c)) return c;
			}
		}
		setXMLVersion(version) {
			this.currentXMLVersion = version;
			if (version === "1.0") {
				this.isChar = isChar10;
				this.getCode = this.getCode10;
			} else {
				this.isChar = isChar11;
				this.getCode = this.getCode11;
			}
		}
		sBegin() {
			if (this.chunk.charCodeAt(0) === 65279) {
				this.i++;
				this.column++;
			}
			this.state = S_BEGIN_WHITESPACE;
		}
		sBeginWhitespace() {
			const iBefore = this.i;
			const c = this.skipSpaces();
			if (this.prevI !== iBefore) this.xmlDeclPossible = false;
			switch (c) {
				case LESS:
					this.state = S_OPEN_WAKA;
					if (this.text.length !== 0) throw new Error("no-empty text at start");
					break;
				case EOC: break;
				default:
					this.unget();
					this.state = S_TEXT;
					this.xmlDeclPossible = false;
			}
		}
		sDoctype() {
			var _a;
			const c = this.captureTo(DOCTYPE_TERMINATOR);
			switch (c) {
				case GREATER:
					(_a = this.doctypeHandler) === null || _a === void 0 || _a.call(this, this.text);
					this.text = "";
					this.state = S_TEXT;
					this.doctype = true;
					break;
				case EOC: break;
				default:
					this.text += String.fromCodePoint(c);
					if (c === OPEN_BRACKET) this.state = S_DTD;
					else if (isQuote(c)) {
						this.state = S_DOCTYPE_QUOTE;
						this.q = c;
					}
			}
		}
		sDoctypeQuote() {
			const q = this.q;
			if (this.captureToChar(q)) {
				this.text += String.fromCodePoint(q);
				this.q = null;
				this.state = S_DOCTYPE;
			}
		}
		sDTD() {
			const c = this.captureTo(DTD_TERMINATOR);
			if (c === EOC) return;
			this.text += String.fromCodePoint(c);
			if (c === CLOSE_BRACKET) this.state = S_DOCTYPE;
			else if (c === LESS) this.state = S_DTD_OPEN_WAKA;
			else if (isQuote(c)) {
				this.state = S_DTD_QUOTED;
				this.q = c;
			}
		}
		sDTDQuoted() {
			const q = this.q;
			if (this.captureToChar(q)) {
				this.text += String.fromCodePoint(q);
				this.state = S_DTD;
				this.q = null;
			}
		}
		sDTDOpenWaka() {
			const c = this.getCodeNorm();
			this.text += String.fromCodePoint(c);
			switch (c) {
				case BANG:
					this.state = S_DTD_OPEN_WAKA_BANG;
					this.openWakaBang = "";
					break;
				case QUESTION:
					this.state = S_DTD_PI;
					break;
				default: this.state = S_DTD;
			}
		}
		sDTDOpenWakaBang() {
			const char = String.fromCodePoint(this.getCodeNorm());
			const owb = this.openWakaBang += char;
			this.text += char;
			if (owb !== "-") {
				this.state = owb === "--" ? S_DTD_COMMENT : S_DTD;
				this.openWakaBang = "";
			}
		}
		sDTDComment() {
			if (this.captureToChar(MINUS)) {
				this.text += "-";
				this.state = S_DTD_COMMENT_ENDING;
			}
		}
		sDTDCommentEnding() {
			const c = this.getCodeNorm();
			this.text += String.fromCodePoint(c);
			this.state = c === MINUS ? S_DTD_COMMENT_ENDED : S_DTD_COMMENT;
		}
		sDTDCommentEnded() {
			const c = this.getCodeNorm();
			this.text += String.fromCodePoint(c);
			if (c === GREATER) this.state = S_DTD;
			else {
				this.fail("malformed comment.");
				this.state = S_DTD_COMMENT;
			}
		}
		sDTDPI() {
			if (this.captureToChar(QUESTION)) {
				this.text += "?";
				this.state = S_DTD_PI_ENDING;
			}
		}
		sDTDPIEnding() {
			const c = this.getCodeNorm();
			this.text += String.fromCodePoint(c);
			if (c === GREATER) this.state = S_DTD;
		}
		sText() {
			if (this.tags.length !== 0) this.handleTextInRoot();
			else this.handleTextOutsideRoot();
		}
		sEntity() {
			let { i: start } = this;
			const { chunk } = this;
			loop: while (true) switch (this.getCode()) {
				case NL_LIKE:
					this.entity += `${chunk.slice(start, this.prevI)}\n`;
					start = this.i;
					break;
				case SEMICOLON: {
					const { entityReturnState } = this;
					const entity = this.entity + chunk.slice(start, this.prevI);
					this.state = entityReturnState;
					let parsed;
					if (entity === "") {
						this.fail("empty entity name.");
						parsed = "&;";
					} else {
						parsed = this.parseEntity(entity);
						this.entity = "";
					}
					if (entityReturnState !== S_TEXT || this.textHandler !== void 0) this.text += parsed;
					break loop;
				}
				case EOC:
					this.entity += chunk.slice(start);
					break loop;
			}
		}
		sOpenWaka() {
			const c = this.getCode();
			if (isNameStartChar(c)) {
				this.state = S_OPEN_TAG;
				this.unget();
				this.xmlDeclPossible = false;
			} else switch (c) {
				case FORWARD_SLASH:
					this.state = S_CLOSE_TAG;
					this.xmlDeclPossible = false;
					break;
				case BANG:
					this.state = S_OPEN_WAKA_BANG;
					this.openWakaBang = "";
					this.xmlDeclPossible = false;
					break;
				case QUESTION:
					this.state = S_PI_FIRST_CHAR;
					break;
				default:
					this.fail("disallowed character in tag name");
					this.state = S_TEXT;
					this.xmlDeclPossible = false;
			}
		}
		sOpenWakaBang() {
			this.openWakaBang += String.fromCodePoint(this.getCodeNorm());
			switch (this.openWakaBang) {
				case "[CDATA[":
					if (!this.sawRoot && !this.reportedTextBeforeRoot) {
						this.fail("text data outside of root node.");
						this.reportedTextBeforeRoot = true;
					}
					if (this.closedRoot && !this.reportedTextAfterRoot) {
						this.fail("text data outside of root node.");
						this.reportedTextAfterRoot = true;
					}
					this.state = S_CDATA;
					this.openWakaBang = "";
					break;
				case "--":
					this.state = S_COMMENT;
					this.openWakaBang = "";
					break;
				case "DOCTYPE":
					this.state = S_DOCTYPE;
					if (this.doctype || this.sawRoot) this.fail("inappropriately located doctype declaration.");
					this.openWakaBang = "";
					break;
				default: if (this.openWakaBang.length >= 7) this.fail("incorrect syntax.");
			}
		}
		sComment() {
			if (this.captureToChar(MINUS)) this.state = S_COMMENT_ENDING;
		}
		sCommentEnding() {
			var _a;
			const c = this.getCodeNorm();
			if (c === MINUS) {
				this.state = S_COMMENT_ENDED;
				(_a = this.commentHandler) === null || _a === void 0 || _a.call(this, this.text);
				this.text = "";
			} else {
				this.text += `-${String.fromCodePoint(c)}`;
				this.state = S_COMMENT;
			}
		}
		sCommentEnded() {
			const c = this.getCodeNorm();
			if (c !== GREATER) {
				this.fail("malformed comment.");
				this.text += `--${String.fromCodePoint(c)}`;
				this.state = S_COMMENT;
			} else this.state = S_TEXT;
		}
		sCData() {
			if (this.captureToChar(CLOSE_BRACKET)) this.state = S_CDATA_ENDING;
		}
		sCDataEnding() {
			const c = this.getCodeNorm();
			if (c === CLOSE_BRACKET) this.state = S_CDATA_ENDING_2;
			else {
				this.text += `]${String.fromCodePoint(c)}`;
				this.state = S_CDATA;
			}
		}
		sCDataEnding2() {
			var _a;
			const c = this.getCodeNorm();
			switch (c) {
				case GREATER:
					(_a = this.cdataHandler) === null || _a === void 0 || _a.call(this, this.text);
					this.text = "";
					this.state = S_TEXT;
					break;
				case CLOSE_BRACKET:
					this.text += "]";
					break;
				default:
					this.text += `]]${String.fromCodePoint(c)}`;
					this.state = S_CDATA;
			}
		}
		sPIFirstChar() {
			const c = this.getCodeNorm();
			if (this.nameStartCheck(c)) {
				this.piTarget += String.fromCodePoint(c);
				this.state = S_PI_REST;
			} else if (c === QUESTION || isS(c)) {
				this.fail("processing instruction without a target.");
				this.state = c === QUESTION ? S_PI_ENDING : S_PI_BODY;
			} else {
				this.fail("disallowed character in processing instruction name.");
				this.piTarget += String.fromCodePoint(c);
				this.state = S_PI_REST;
			}
		}
		sPIRest() {
			const { chunk, i: start } = this;
			while (true) {
				const c = this.getCodeNorm();
				if (c === EOC) {
					this.piTarget += chunk.slice(start);
					return;
				}
				if (!this.nameCheck(c)) {
					this.piTarget += chunk.slice(start, this.prevI);
					const isQuestion = c === QUESTION;
					if (isQuestion || isS(c)) {
						if (this.piTarget === "xml") {
							if (!this.xmlDeclPossible) this.fail("an XML declaration must be at the start of the document.");
							this.state = isQuestion ? S_XML_DECL_ENDING : S_XML_DECL_NAME_START;
						} else this.state = isQuestion ? S_PI_ENDING : S_PI_BODY;
					} else {
						this.fail("disallowed character in processing instruction name.");
						this.piTarget += String.fromCodePoint(c);
					}
					break;
				}
			}
		}
		sPIBody() {
			if (this.text.length === 0) {
				const c = this.getCodeNorm();
				if (c === QUESTION) this.state = S_PI_ENDING;
				else if (!isS(c)) this.text = String.fromCodePoint(c);
			} else if (this.captureToChar(QUESTION)) this.state = S_PI_ENDING;
		}
		sPIEnding() {
			var _a;
			const c = this.getCodeNorm();
			if (c === GREATER) {
				const { piTarget } = this;
				if (piTarget.toLowerCase() === "xml") this.fail("the XML declaration must appear at the start of the document.");
				(_a = this.piHandler) === null || _a === void 0 || _a.call(this, {
					target: piTarget,
					body: this.text
				});
				this.piTarget = this.text = "";
				this.state = S_TEXT;
			} else if (c === QUESTION) this.text += "?";
			else {
				this.text += `?${String.fromCodePoint(c)}`;
				this.state = S_PI_BODY;
			}
			this.xmlDeclPossible = false;
		}
		sXMLDeclNameStart() {
			const c = this.skipSpaces();
			if (c === QUESTION) {
				this.state = S_XML_DECL_ENDING;
				return;
			}
			if (c !== EOC) {
				this.state = S_XML_DECL_NAME;
				this.name = String.fromCodePoint(c);
			}
		}
		sXMLDeclName() {
			const c = this.captureTo(XML_DECL_NAME_TERMINATOR);
			if (c === QUESTION) {
				this.state = S_XML_DECL_ENDING;
				this.name += this.text;
				this.text = "";
				this.fail("XML declaration is incomplete.");
				return;
			}
			if (!(isS(c) || c === EQUAL)) return;
			this.name += this.text;
			this.text = "";
			if (!this.xmlDeclExpects.includes(this.name)) switch (this.name.length) {
				case 0:
					this.fail("did not expect any more name/value pairs.");
					break;
				case 1:
					this.fail(`expected the name ${this.xmlDeclExpects[0]}.`);
					break;
				default: this.fail(`expected one of ${this.xmlDeclExpects.join(", ")}`);
			}
			this.state = c === EQUAL ? S_XML_DECL_VALUE_START : S_XML_DECL_EQ;
		}
		sXMLDeclEq() {
			const c = this.getCodeNorm();
			if (c === QUESTION) {
				this.state = S_XML_DECL_ENDING;
				this.fail("XML declaration is incomplete.");
				return;
			}
			if (isS(c)) return;
			if (c !== EQUAL) this.fail("value required.");
			this.state = S_XML_DECL_VALUE_START;
		}
		sXMLDeclValueStart() {
			const c = this.getCodeNorm();
			if (c === QUESTION) {
				this.state = S_XML_DECL_ENDING;
				this.fail("XML declaration is incomplete.");
				return;
			}
			if (isS(c)) return;
			if (!isQuote(c)) {
				this.fail("value must be quoted.");
				this.q = SPACE;
			} else this.q = c;
			this.state = S_XML_DECL_VALUE;
		}
		sXMLDeclValue() {
			const c = this.captureTo([this.q, QUESTION]);
			if (c === QUESTION) {
				this.state = S_XML_DECL_ENDING;
				this.text = "";
				this.fail("XML declaration is incomplete.");
				return;
			}
			if (c === EOC) return;
			const value = this.text;
			this.text = "";
			switch (this.name) {
				case "version": {
					this.xmlDeclExpects = ["encoding", "standalone"];
					const version = value;
					this.xmlDecl.version = version;
					if (!/^1\.[0-9]+$/.test(version)) this.fail("version number must match /^1\\.[0-9]+$/.");
					else if (!this.opt.forceXMLVersion) this.setXMLVersion(version);
					break;
				}
				case "encoding":
					if (!/^[A-Za-z][A-Za-z0-9._-]*$/.test(value)) this.fail("encoding value must match /^[A-Za-z0-9][A-Za-z0-9._-]*$/.");
					this.xmlDeclExpects = ["standalone"];
					this.xmlDecl.encoding = value;
					break;
				case "standalone":
					if (value !== "yes" && value !== "no") this.fail("standalone value must match \"yes\" or \"no\".");
					this.xmlDeclExpects = [];
					this.xmlDecl.standalone = value;
			}
			this.name = "";
			this.state = S_XML_DECL_SEPARATOR;
		}
		sXMLDeclSeparator() {
			const c = this.getCodeNorm();
			if (c === QUESTION) {
				this.state = S_XML_DECL_ENDING;
				return;
			}
			if (!isS(c)) {
				this.fail("whitespace required.");
				this.unget();
			}
			this.state = S_XML_DECL_NAME_START;
		}
		sXMLDeclEnding() {
			var _a;
			if (this.getCodeNorm() === GREATER) {
				if (this.piTarget !== "xml") this.fail("processing instructions are not allowed before root.");
				else if (this.name !== "version" && this.xmlDeclExpects.includes("version")) this.fail("XML declaration must contain a version.");
				(_a = this.xmldeclHandler) === null || _a === void 0 || _a.call(this, this.xmlDecl);
				this.name = "";
				this.piTarget = this.text = "";
				this.state = S_TEXT;
			} else this.fail("The character ? is disallowed anywhere in XML declarations.");
			this.xmlDeclPossible = false;
		}
		sOpenTag() {
			var _a;
			const c = this.captureNameChars();
			if (c === EOC) return;
			const tag = this.tag = {
				name: this.name,
				attributes: Object.create(null)
			};
			this.name = "";
			if (this.xmlnsOpt) this.topNS = tag.ns = Object.create(null);
			(_a = this.openTagStartHandler) === null || _a === void 0 || _a.call(this, tag);
			this.sawRoot = true;
			if (!this.fragmentOpt && this.closedRoot) this.fail("documents may contain only one root.");
			switch (c) {
				case GREATER:
					this.openTag();
					break;
				case FORWARD_SLASH:
					this.state = S_OPEN_TAG_SLASH;
					break;
				default:
					if (!isS(c)) this.fail("disallowed character in tag name.");
					this.state = S_ATTRIB;
			}
		}
		sOpenTagSlash() {
			if (this.getCode() === GREATER) this.openSelfClosingTag();
			else {
				this.fail("forward-slash in opening tag not followed by >.");
				this.state = S_ATTRIB;
			}
		}
		sAttrib() {
			const c = this.skipSpaces();
			if (c === EOC) return;
			if (isNameStartChar(c)) {
				this.unget();
				this.state = S_ATTRIB_NAME;
			} else if (c === GREATER) this.openTag();
			else if (c === FORWARD_SLASH) this.state = S_OPEN_TAG_SLASH;
			else this.fail("disallowed character in attribute name.");
		}
		sAttribName() {
			const c = this.captureNameChars();
			if (c === EQUAL) this.state = S_ATTRIB_VALUE;
			else if (isS(c)) this.state = S_ATTRIB_NAME_SAW_WHITE;
			else if (c === GREATER) {
				this.fail("attribute without value.");
				this.pushAttrib(this.name, this.name);
				this.name = this.text = "";
				this.openTag();
			} else if (c !== EOC) this.fail("disallowed character in attribute name.");
		}
		sAttribNameSawWhite() {
			const c = this.skipSpaces();
			switch (c) {
				case EOC: return;
				case EQUAL:
					this.state = S_ATTRIB_VALUE;
					break;
				default:
					this.fail("attribute without value.");
					this.text = "";
					this.name = "";
					if (c === GREATER) this.openTag();
					else if (isNameStartChar(c)) {
						this.unget();
						this.state = S_ATTRIB_NAME;
					} else {
						this.fail("disallowed character in attribute name.");
						this.state = S_ATTRIB;
					}
			}
		}
		sAttribValue() {
			const c = this.getCodeNorm();
			if (isQuote(c)) {
				this.q = c;
				this.state = S_ATTRIB_VALUE_QUOTED;
			} else if (!isS(c)) {
				this.fail("unquoted attribute value.");
				this.state = S_ATTRIB_VALUE_UNQUOTED;
				this.unget();
			}
		}
		sAttribValueQuoted() {
			const { q, chunk } = this;
			let { i: start } = this;
			while (true) switch (this.getCode()) {
				case q:
					this.pushAttrib(this.name, this.text + chunk.slice(start, this.prevI));
					this.name = this.text = "";
					this.q = null;
					this.state = S_ATTRIB_VALUE_CLOSED;
					return;
				case AMP:
					this.text += chunk.slice(start, this.prevI);
					this.state = S_ENTITY;
					this.entityReturnState = S_ATTRIB_VALUE_QUOTED;
					return;
				case NL:
				case NL_LIKE:
				case TAB:
					this.text += `${chunk.slice(start, this.prevI)} `;
					start = this.i;
					break;
				case LESS:
					this.text += chunk.slice(start, this.prevI);
					this.fail("disallowed character.");
					return;
				case EOC:
					this.text += chunk.slice(start);
					return;
			}
		}
		sAttribValueClosed() {
			const c = this.getCodeNorm();
			if (isS(c)) this.state = S_ATTRIB;
			else if (c === GREATER) this.openTag();
			else if (c === FORWARD_SLASH) this.state = S_OPEN_TAG_SLASH;
			else if (isNameStartChar(c)) {
				this.fail("no whitespace between attributes.");
				this.unget();
				this.state = S_ATTRIB_NAME;
			} else this.fail("disallowed character in attribute name.");
		}
		sAttribValueUnquoted() {
			const c = this.captureTo(ATTRIB_VALUE_UNQUOTED_TERMINATOR);
			switch (c) {
				case AMP:
					this.state = S_ENTITY;
					this.entityReturnState = S_ATTRIB_VALUE_UNQUOTED;
					break;
				case LESS:
					this.fail("disallowed character.");
					break;
				case EOC: break;
				default:
					if (this.text.includes("]]>")) this.fail("the string \"]]>\" is disallowed in char data.");
					this.pushAttrib(this.name, this.text);
					this.name = this.text = "";
					if (c === GREATER) this.openTag();
					else this.state = S_ATTRIB;
			}
		}
		sCloseTag() {
			const c = this.captureNameChars();
			if (c === GREATER) this.closeTag();
			else if (isS(c)) this.state = S_CLOSE_TAG_SAW_WHITE;
			else if (c !== EOC) this.fail("disallowed character in closing tag.");
		}
		sCloseTagSawWhite() {
			switch (this.skipSpaces()) {
				case GREATER:
					this.closeTag();
					break;
				case EOC: break;
				default: this.fail("disallowed character in closing tag.");
			}
		}
		handleTextInRoot() {
			let { i: start, forbiddenState } = this;
			const { chunk, textHandler: handler } = this;
			scanLoop: while (true) switch (this.getCode()) {
				case LESS:
					this.state = S_OPEN_WAKA;
					if (handler !== void 0) {
						const { text } = this;
						const slice = chunk.slice(start, this.prevI);
						if (text.length !== 0) {
							handler(text + slice);
							this.text = "";
						} else if (slice.length !== 0) handler(slice);
					}
					forbiddenState = FORBIDDEN_START;
					break scanLoop;
				case AMP:
					this.state = S_ENTITY;
					this.entityReturnState = S_TEXT;
					if (handler !== void 0) this.text += chunk.slice(start, this.prevI);
					forbiddenState = FORBIDDEN_START;
					break scanLoop;
				case CLOSE_BRACKET:
					switch (forbiddenState) {
						case FORBIDDEN_START:
							forbiddenState = FORBIDDEN_BRACKET;
							break;
						case FORBIDDEN_BRACKET:
							forbiddenState = FORBIDDEN_BRACKET_BRACKET;
							break;
						case FORBIDDEN_BRACKET_BRACKET: break;
						default: throw new Error("impossible state");
					}
					break;
				case GREATER:
					if (forbiddenState === FORBIDDEN_BRACKET_BRACKET) this.fail("the string \"]]>\" is disallowed in char data.");
					forbiddenState = FORBIDDEN_START;
					break;
				case NL_LIKE:
					if (handler !== void 0) this.text += `${chunk.slice(start, this.prevI)}\n`;
					start = this.i;
					forbiddenState = FORBIDDEN_START;
					break;
				case EOC:
					if (handler !== void 0) this.text += chunk.slice(start);
					break scanLoop;
				default: forbiddenState = FORBIDDEN_START;
			}
			this.forbiddenState = forbiddenState;
		}
		handleTextOutsideRoot() {
			let { i: start } = this;
			const { chunk, textHandler: handler } = this;
			let nonSpace = false;
			outRootLoop: while (true) {
				const code = this.getCode();
				switch (code) {
					case LESS:
						this.state = S_OPEN_WAKA;
						if (handler !== void 0) {
							const { text } = this;
							const slice = chunk.slice(start, this.prevI);
							if (text.length !== 0) {
								handler(text + slice);
								this.text = "";
							} else if (slice.length !== 0) handler(slice);
						}
						break outRootLoop;
					case AMP:
						this.state = S_ENTITY;
						this.entityReturnState = S_TEXT;
						if (handler !== void 0) this.text += chunk.slice(start, this.prevI);
						nonSpace = true;
						break outRootLoop;
					case NL_LIKE:
						if (handler !== void 0) this.text += `${chunk.slice(start, this.prevI)}\n`;
						start = this.i;
						break;
					case EOC:
						if (handler !== void 0) this.text += chunk.slice(start);
						break outRootLoop;
					default: if (!isS(code)) nonSpace = true;
				}
			}
			if (!nonSpace) return;
			if (!this.sawRoot && !this.reportedTextBeforeRoot) {
				this.fail("text data outside of root node.");
				this.reportedTextBeforeRoot = true;
			}
			if (this.closedRoot && !this.reportedTextAfterRoot) {
				this.fail("text data outside of root node.");
				this.reportedTextAfterRoot = true;
			}
		}
		pushAttribNS(name, value) {
			var _a;
			const { prefix, local } = this.qname(name);
			const attr = {
				name,
				prefix,
				local,
				value
			};
			this.attribList.push(attr);
			(_a = this.attributeHandler) === null || _a === void 0 || _a.call(this, attr);
			if (prefix === "xmlns") {
				const trimmed = value.trim();
				if (this.currentXMLVersion === "1.0" && trimmed === "") this.fail("invalid attempt to undefine prefix in XML 1.0");
				this.topNS[local] = trimmed;
				nsPairCheck(this, local, trimmed);
			} else if (name === "xmlns") {
				const trimmed = value.trim();
				this.topNS[""] = trimmed;
				nsPairCheck(this, "", trimmed);
			}
		}
		pushAttribPlain(name, value) {
			var _a;
			const attr = {
				name,
				value
			};
			this.attribList.push(attr);
			(_a = this.attributeHandler) === null || _a === void 0 || _a.call(this, attr);
		}
		/**
		* End parsing. This performs final well-formedness checks and resets the
		* parser to a clean state.
		*
		* @returns this
		*/
		end() {
			var _a, _b;
			if (!this.sawRoot) this.fail("document must contain a root element.");
			const { tags } = this;
			while (tags.length > 0) {
				const tag = tags.pop();
				this.fail(`unclosed tag: ${tag.name}`);
			}
			if (this.state !== S_BEGIN && this.state !== S_TEXT) this.fail("unexpected end.");
			const { text } = this;
			if (text.length !== 0) {
				(_a = this.textHandler) === null || _a === void 0 || _a.call(this, text);
				this.text = "";
			}
			this._closed = true;
			(_b = this.endHandler) === null || _b === void 0 || _b.call(this);
			this._init();
			return this;
		}
		/**
		* Resolve a namespace prefix.
		*
		* @param prefix The prefix to resolve.
		*
		* @returns The namespace URI or ``undefined`` if the prefix is not defined.
		*/
		resolve(prefix) {
			var _a, _b;
			let uri = this.topNS[prefix];
			if (uri !== void 0) return uri;
			const { tags } = this;
			for (let index = tags.length - 1; index >= 0; index--) {
				uri = tags[index].ns[prefix];
				if (uri !== void 0) return uri;
			}
			uri = this.ns[prefix];
			if (uri !== void 0) return uri;
			return (_b = (_a = this.opt).resolvePrefix) === null || _b === void 0 ? void 0 : _b.call(_a, prefix);
		}
		/**
		* Parse a qname into its prefix and local name parts.
		*
		* @param name The name to parse
		*
		* @returns
		*/
		qname(name) {
			const colon = name.indexOf(":");
			if (colon === -1) return {
				prefix: "",
				local: name
			};
			const local = name.slice(colon + 1);
			const prefix = name.slice(0, colon);
			if (prefix === "" || local === "" || local.includes(":")) this.fail(`malformed name: ${name}.`);
			return {
				prefix,
				local
			};
		}
		processAttribsNS() {
			var _a;
			const { attribList } = this;
			const tag = this.tag;
			{
				const { prefix, local } = this.qname(tag.name);
				tag.prefix = prefix;
				tag.local = local;
				const uri = tag.uri = (_a = this.resolve(prefix)) !== null && _a !== void 0 ? _a : "";
				if (prefix !== "") {
					if (prefix === "xmlns") this.fail("tags may not have \"xmlns\" as prefix.");
					if (uri === "") {
						this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
						tag.uri = prefix;
					}
				}
			}
			if (attribList.length === 0) return;
			const { attributes } = tag;
			const seen = /* @__PURE__ */ new Set();
			for (const attr of attribList) {
				const { name, prefix, local } = attr;
				let uri;
				let eqname;
				if (prefix === "") {
					uri = name === "xmlns" ? XMLNS_NAMESPACE : "";
					eqname = name;
				} else {
					uri = this.resolve(prefix);
					if (uri === void 0) {
						this.fail(`unbound namespace prefix: ${JSON.stringify(prefix)}.`);
						uri = prefix;
					}
					eqname = `{${uri}}${local}`;
				}
				if (seen.has(eqname)) this.fail(`duplicate attribute: ${eqname}.`);
				seen.add(eqname);
				attr.uri = uri;
				attributes[name] = attr;
			}
			this.attribList = [];
		}
		processAttribsPlain() {
			const { attribList } = this;
			const attributes = this.tag.attributes;
			for (const { name, value } of attribList) {
				if (attributes[name] !== void 0) this.fail(`duplicate attribute: ${name}.`);
				attributes[name] = value;
			}
			this.attribList = [];
		}
		/**
		* Handle a complete open tag. This parser code calls this once it has seen
		* the whole tag. This method checks for well-formeness and then emits
		* ``onopentag``.
		*/
		openTag() {
			var _a;
			this.processAttribs();
			const { tags } = this;
			const tag = this.tag;
			tag.isSelfClosing = false;
			(_a = this.openTagHandler) === null || _a === void 0 || _a.call(this, tag);
			tags.push(tag);
			this.state = S_TEXT;
			this.name = "";
		}
		/**
		* Handle a complete self-closing tag. This parser code calls this once it has
		* seen the whole tag. This method checks for well-formeness and then emits
		* ``onopentag`` and ``onclosetag``.
		*/
		openSelfClosingTag() {
			var _a, _b, _c;
			this.processAttribs();
			const { tags } = this;
			const tag = this.tag;
			tag.isSelfClosing = true;
			(_a = this.openTagHandler) === null || _a === void 0 || _a.call(this, tag);
			(_b = this.closeTagHandler) === null || _b === void 0 || _b.call(this, tag);
			if ((this.tag = (_c = tags[tags.length - 1]) !== null && _c !== void 0 ? _c : null) === null) this.closedRoot = true;
			this.state = S_TEXT;
			this.name = "";
		}
		/**
		* Handle a complete close tag. This parser code calls this once it has seen
		* the whole tag. This method checks for well-formeness and then emits
		* ``onclosetag``.
		*/
		closeTag() {
			const { tags, name } = this;
			this.state = S_TEXT;
			this.name = "";
			if (name === "") {
				this.fail("weird empty close tag.");
				this.text += "</>";
				return;
			}
			const handler = this.closeTagHandler;
			let l = tags.length;
			while (l-- > 0) {
				const tag = this.tag = tags.pop();
				this.topNS = tag.ns;
				handler === null || handler === void 0 || handler(tag);
				if (tag.name === name) break;
				this.fail("unexpected close tag.");
			}
			if (l === 0) this.closedRoot = true;
			else if (l < 0) {
				this.fail(`unmatched closing tag: ${name}.`);
				this.text += `</${name}>`;
			}
		}
		/**
		* Resolves an entity. Makes any necessary well-formedness checks.
		*
		* @param entity The entity to resolve.
		*
		* @returns The parsed entity.
		*/
		parseEntity(entity) {
			if (entity[0] !== "#") {
				const defined = this.ENTITIES[entity];
				if (defined !== void 0) return defined;
				this.fail(this.isName(entity) ? "undefined entity." : "disallowed character in entity name.");
				return `&${entity};`;
			}
			let num = NaN;
			if (entity[1] === "x" && /^#x[0-9a-f]+$/i.test(entity)) num = parseInt(entity.slice(2), 16);
			else if (/^#[0-9]+$/.test(entity)) num = parseInt(entity.slice(1), 10);
			if (!this.isChar(num)) {
				this.fail("malformed character entity.");
				return `&${entity};`;
			}
			return String.fromCodePoint(num);
		}
	};
	exports.SaxesParser = SaxesParser;
}));
// node_modules/entities/dist/decode-codepoint.js
/**
* C1 Unicode control character reference replacements (code points 128-159).
* Index i gives the replacement for code point 128+i; 0 means "no replacement".
*/
var c1 = [
	8364,
	0,
	8218,
	402,
	8222,
	8230,
	8224,
	8225,
	710,
	8240,
	352,
	8249,
	338,
	0,
	381,
	0,
	0,
	8216,
	8217,
	8220,
	8221,
	8226,
	8211,
	8212,
	732,
	8482,
	353,
	8250,
	339,
	0,
	382,
	376
];
/**
* True for NUL, UTF-16 surrogates, and values past U+10FFFF.
* @param codePoint Unicode code point to check.
*/
function isInvalidCodePoint(codePoint) {
	return codePoint === 0 || codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111;
}
/**
* Replace the given code point with U+FFFD if it is NUL (0), a surrogate, or
* outside the valid Unicode range. Code points in the C1 controls range
* (128-159) are remapped to their Windows-1252 equivalents, following the
* HTML spec. All other code points are returned unchanged.
* @param codePoint Unicode code point to convert.
*/
function replaceCodePoint(codePoint) {
	if (isInvalidCodePoint(codePoint)) return 65533;
	if (codePoint >= 128 && codePoint <= 159) return c1[codePoint - 128] || codePoint;
	return codePoint;
}
/**
* Convert the code point of a decoded numeric entity to a string, replacing
* invalid values.
*
* Fast path for plain BMP code points: [1..0x7F] and [0xA0..0xD7FF] pass
* `replaceCodePoint` unchanged (no NUL, C1 remap, surrogate, or out-of-range
* handling) and fit a single charCode. 0xd760 = 0xD800 (the first surrogate)
* - 0xA0.
* @param codePoint Unicode code point to convert.
*/
function codePointToString(codePoint) {
	return codePoint - 1 >>> 0 < 127 || codePoint - 160 >>> 0 < 55136 ? String.fromCharCode(codePoint) : String.fromCodePoint(replaceCodePoint(codePoint));
}
// node_modules/entities/dist/generated/decode-data-html.js
/**
* Serialized decode data; the format is documented in
* `src/internal/decode-data-format.ts`. `[0]` is one-byte data (all char
* codes <= 0xFF: header, front-coded name suffixes, per-name metadata,
* cuckoo choice bits); `[1]` holds the replacement values.
*/
var htmlDecodeData = ["Q=¨`p0AEligMPacutebrevecircyfrgravelphamacrndogonpfpplyFunctionringscrsigntildeumlBackslashrvwedcyecausernoullistafropfrevescrumpeqCHcyOPYacutepitalDifferentialDyleyscaronedilirconintdotedillanterDotfrhiircleDotMinusPlusTimeslockwiseContourIntegralseCurlyDoubleQuoteQuoteolonengruentinttourIntegralpfroductunterClockwiseContourIntegralrossscrupCapDDotrahdJcyScyZcyaggerrrshvcaronyeltafriacriticalAcuteDotubleAcuteGraveTildemondfferentialDopftDotEqualubleContourIntegralDotwnArrowLeftArrowRightArrowTeeongLeftArrowRightArrowRightArrowRightArrowTeeUpArrowDownArrowVerticalBarwnArrowBarUpArrowBreveLeftRightVectorTeeVectorVectorBarRightTeeVectorVectorBarTeeArrowarrowscrtrokENGTHacutecaronircydotfrgravelementmacrptySmallSquareVerySmallSquareogonpfpsilonqualTildeilibriumscrimtaumlxistsponentialEFcyfrilledSmallSquareVerySmallSquareopfrAlluriertrfscrGJcyTammadbrevecedilircydotfrgopfreaterEqualLessFullEqualGreaterLessSlantEqualTildescrtHARDcyacektcircfrilbertSpaceopfrizontalLinescrtrokumpDownHumpEqualIEcyJligOcyacutecircydotfrgravemacrginaryIpliesntegralrsectionvisibleCommaTimesogonpftascrtildeukcymlJcircyfropfscrercyukcyKHcyJcyappacedilyfropfscrLJcyTacutembdangplacetrfrrcaronedilyeftAngleBracketrrowBarRightArrowCeilingDoubleBracketwnTeeVectorVectorBarFloorRightArrowVectorTeeArrowVectorriangleBarEqualUpDownVectorTeeVectorVectorBarVectorBararrowrightarrowssEqualGreaterFullEqualGreaterLessSlantEqualTildefrleftarrowmidotongLeftArrowRightArrowRightArrowleftarrowrightarrowrightarrowpfwerLeftArrowRightArrowscrhtroktMapcyediumSpacellintrffrinusPlusopfscruNJcyacutecaronedilyegativeMediumSpaceThickSpacenSpaceVeryThinSpacestedGreaterGreaterLessLesswLinefroBreaknBreakingSpacepftCongruentupCapDoubleVerticalBarElementqualTildexistsGreaterEqualFullEqualGreaterLessSlantEqualTildeHumpDownHumpEqualLeftTriangleBarEqualssEqualGreaterLessSlantEqualTildeNestedGreaterGreaterLessLessPrecedesEqualSlantEqualReverseElementightTriangleBarEqualSquareSubsetEqualpersetEqualubsetEqualcceedsEqualSlantEqualTildepersetEqualTildeEqualFullEqualTildeVerticalBarscrtildeuOEligacutecircydblacfrgravemacregaicronopfpenCurlyDoubleQuoteQuoterscrlashtildemesumlverBarraceketParenthesisPartialDcyfrhiilusMinusoincareplanepfrecedesEqualSlantEqualTildeimeoductportionalscriQUOTfropfscrRBarrEGacutengrrtlcaronedilyeverseElementquilibriumUpEquilibriumfrhoightAngleBracketrrowBarLeftArrowCeilingDoubleBracketwnTeeVectorVectorBarFloorTeeArrowVectorriangleBarEqualUpDownVectorTeeVectorVectorBarVectorBararrowopfundImpliesrightarrowscrhuleDelayedSHCHcycyOFTcyacutecaronedilircyfrhortDownArrowLeftArrowRightArrowUpArrowigmamallCircleopfqrtuareIntersectionSubsetEqualpersetEqualUnionscrtarubsetEqualcceedsEqualSlantEqualTildehThatmpersetEqualsetTHORNRADESHcycyabucaronedilyfrhereforetaickSpacenSpaceildeEqualFullEqualTildeopfripleDotscrtrokUacuterrocirbrcyevecircydblacfrgravemacrnderBarraceketParenthesisionPlusogonpfpArrowBarDownArrowDownArrowEquilibriumTeeArrowarrowdownarrowperLeftArrowRightArrowsilonringscrtildeumlVDashbarcydashleerbarticalBarLineSeparatorTildeyThinSpacefropfscrvdashWcircedgefropfscrXfriopfscrYAcyIcyUcyacutecircyfropfscrumlZHcyacutecaronydoteroWidthSpacetafropfscraacutebrevecEdircuteyeligfrgravelefsymphphamacrlgpndanddslopevgelemsdaabcdefghrtvbdsphtzarrogonpfpEacireidosproxeqringscrtympeqtildeumlwconintintbNotackcongepsilonprimesimeqrveewedgebrktbrkcongydquoecausemptyvpsirnoutahweenfrigcapircupodotplustimessqcuptartriangledownupuplusveewedgekarowlacklozengesquaretriangledownleftrightnkk12434ocknequivotopfttomwtiexDLRlrHDUduULRlrVHLRhlrboxdLRlrhDUduminusplustimesuLRlrvHLRhlrprimerevevbarscremiimeolbhsubulletmpEeqcacutepandbrcupcapupdotsretoncapsronedilircupssmdotedilmptyvnterdotfrhcyeckmarkiirEceqlearrowleftrightdRSastcircdashefnintmidscirlubsuitoloneqmmatpfnlementxesngdotintpfrodysrrarrossscrubepetdotudarrlreprsclarrppbrcapcapupdotorsrarrmlyeqprecsuccveewedgerenvearrowleftrightveewedwconintintylctydArrHaraggerlethrrshvbkarowlaccaronydaggerrrotseqegltamptyvfishtrharlriamondsuitsegammasinvideontimesonxjcylcornropollarpfteqdotminusplussquareublebarwedgewnarrowdownarrowsharpoonleftrightrbkarowcornropscryoltroktdotrifuarrharwanglezcyigrarreDDototacutestercaronircolonydotefDotrgravesdotlinterslsdotmacrptysetvsp134ngspogonpfparsllussilonvqcircolonsimlantgtrlessualsestivDDvparslrDotarrscrdotimtahumlroxclistpectationonentialefallingdotseqcyemalefiligligligriligjliglatligtnsnofopfrallkvpartintrac123456823534584556878slownscrgElacutemmadpbrevecircydotelqqslantsccdotollesfrggimeljcylEajnEapproxeqqsimopfravescrimeltccirdotlParquestrapproxrrdoteqlessqlesslesssimvertneqqnEhArrairsplfmiltrdcyrcirwbarcirceartsuitlliprconfrksearowwarowoarrmthtokleftarrowrightarrowpfrbarscrlashtrokybullpheniacutecircyecyxclffrgraveiiintntnfinotajligmacrgelinepartthofpedncarefintieodottcalegersrcallarhkprodocygonpftaprodquestscrinEdotsvvtildeukcymljcircyfrmathopfscrercyukcykappavcedilyfrgreenhcyjcyopfscrlAarrrrtailBarrEgHaracuteemptyvgranmbdangdlepquorrbfsfshklpplsimtltailesbarrbrkracekkeslducaronedililubydcaquorrdharusharsheftarrowtailharpoondownupleftarrowsrightarrowsharpoonssquigarrowthreetimesgqqslantsccdotorgessapproxdoteqgtrqgtrgtrsimfishtloorrgEhardulblkjcylarrcornerhardtrimidotoustachenEapproxeqqsimoangrrbrkngleftarrowrightarrowmapstorightarrowoparrowleftrightparflustimeswastbarzengefparltrarrcornerhardmtrisaquocrhimegqbuortroktccirdothreeimeslarrquestrPariefurdsharuharvertneqqnEmDDotacrletesepstodownleftuprkercommaydasheasuredanglefrhoicrodastcirdotnusbdulcpdrnplusodelspfpscrtposultimapmapnGgtvLeftarrowrightarrowltvRightarrowVDashdashablacutengpEidosproxturalsbspumpecapronedilongdotupydasheArrarhkrowdotquivsearimxistsfrgEeqqslantssimtrhArrarrparisdvjcylArrEarrdreftarrowrightarrowqqslantsssimtriemidopftinEdotvabcnivabcparallelsltolintrcueeceqrArrarrcwightarrowtriesccueerhortmidparallelimeqmidparqsubepeubEeseteqqcceqpEeseteqqtglildelgrianglelefteqrightequmerospvDashHarrapdashgetinfinlArretrierArrtriesimwArrarhkrownearoSacutestcircydashblacivotsoldeligfcirrgonravethbarmintlarrcirrossinetmacregaicrondnusopfparerplusrarrderoffmigoforslopevscrlasholtildemesasumlvbarparallelsimltcyercntiodmilptenkfrhivmmatoneitchforkvlanckhkvusacirbcirdouemnsimtwomointintpfundrEapcueecapproxcurlyeqeqnapproxeqqsimsimimesnEapsimodfalarlinesurfptosimurelscriuncspqfrintopfprimescruaternionsintesteqotrAarrrrtailBarrHaraceutedicemptyvngdelequorrapbfscfshklpplsimtlwtailionalsbarrbrkracekkeslducaronedililubydcaldharquorshealinepartsctgfishtloorrhardulovightarrowtailharpoondownupleftarrowsharpoonsrightarrowssquigarrowthreetimesngsingdotseqlarrharmmoustachenmidoangrrbrkparflustimespargtpolintrarrsaquocrhqbuorthreeimesriefltriuluharxsacutebquocEaproncueedilircnEapsimpolintsimydotbeeArrarhkrowctmiswartminusnxtfrownharpchcyyortmidparallelyigmafvmdoteqgElEneplusrarrlarrmallsetminusshpeparslidletesoftcylbarpfpadesuitrqcapsupssubeseteqpesetequareffrarrscretmnmiletarftarfraightepsilonphinsubEdotedotmultnEeplusrarrseteqqneqqimubpccapproxcurlyeqeqnapproxeqqsimsimmngp123EdotsubedothsolublarrmultnEeplusseteqqneqqimubpwArrarhkrownwarzligtargetubrkcaronedilydotelrecfrhere4foretasymvickapproxsimnspkapsimornildemesbardntoeapbotcirforksaprimeradeiangledownlefteqqrighteqdoteminusplussbtimepeziumscryhcytrokwixtoheadleftarrowrightarrowuArrHaracuterrbrcyevecircydarrblacharfishtrgraveharlrblklcornerroptrimacrlogonpfparrowdownarrowharpoonleftrightlussihlonuparrowsrcornerropingtriscrtdotilderifuarrmlwanglevArrBarvDashangrtrepsilonkappanothingphiiroptorhosigmaubsetneqqpsetneqqthetariangleleftrightcydasheebareqlliprbartfrltrinsubpopfproprtriscrubnEepnEezigzagwcircedbargeqierpfropfpreathscrxcapircupdtrifrhArrarrilArrarrmapnisodotpflustimerArrarrscrqcupuplustriveewedgeyacuteycircyenfricyopfscrucymlzacutecaronydoteetrftafrhcyigrarropfscrwjnjC(D%D($(D'%$$ED($'$'$%$'%E$/D'$F%'D(D&#,%%&&$%$)%+%%$E$F$'$&$(#'D&$(%$&4%($(E'%&%($&$)%*$%$%$+)()')($:&5-($'($%*&&&/%%&)%@$'$F$%&&#%%)$&$&$&$(%%%&$(%$$%&%$E$2.&0,.(.(&'%.$F%$&&&(%6)&+*),---&*/1---)-.&)*+,).%*,&,*'('2+,+)1&'1,)2&'&*('($F%'#&D%D($(E&%$$&$ED($)$'%1(2$'%E$)$'((&+$&%%$%D&$(%-#&$E$3)2$F%'%+$&#'D$$'($$($(%&%$$&$E$$$F$./'*,***'*-*($F$$#)$'%$$'$%$.$&%/$&%'$.'(#'$'$&D(D'%$$&$%D($$%&&*%($%&('+%/,($'%E%%$&$($'E%#(%$$E$F$F%'$'#'$&$'$(%$$E$F$F#'D$$(%'%%%+%%$(%'%$$2(',&,-'*'0).+)1&'('-,)'&*(*)(*/&/('/),))/&')-&'('-%1','*'''-'($E$$%+$($/+-'-',+-'-%E%/(-$&%$%'$$#&$%$-%*$E$+$F$&$$#'$($(%'%$$5+-.)+0%5)+%($E$)%1%%%$&,'(&4&*''+H'(&*-(-L-J-'-M-(&O*H&/2F2((%*(***G*M*(&W,K&+.H.-&1'/3F3(&O2(.I4('H,(().H.-.H(I.(&(+(+,+(&.$FD($$#(D(D'%$$($ED($'%&%($F$6,($$$FE'D(&&D&$)('+&'.#+$%$E$%$$$+$/%%$$%)+(+-+(%&%(&*-%$F%$C'$E$&$F#(D%$(%%%%'%$(%'%$$$%/+-*0$%$%$3)'-&-,(*(0*.,)2&(((&+(+))*0&0((/*,*)0&().&(($&%-$-$&%$$-#)%%$($($$%'%'%&%$$E$0(,(-(*$'$-$F$&%')/))/(+)1()($F$&$%&&)(%)+(+-+(&(%$%$&(+(&&C($'$'%%$%%$$(%'%$$E$+&%%K&)$'(((,(($F$+$F%'C)%%''$'&&D'%$$($ED($'$*)',&(.%&('$'%E$)*&*,%,%.%&((%(%,%/(-%%'&$'$F$(D&#($&$%$'($$%%'&$'*+'+,+(&-$E$F$F$(#($'$E$F$F#F$$$F$F#'$&$&D($'%$$E$F$F$&#'$($(%$$&$0%%$%$&$FC)$($$%D%$E&E&%$D'$$%DD($)&%%&$'&%E$$%&&&$&(&$%$&$&%&&)%*$*$*$*$*$*$*$&%(%*$&&'$&'$'%E$$%$%'%$%%%%%')%D'$F%$%&(%D(D&$*%&#'$*'*'('&*%%'&&)%$&''$'%$$'$()$%(%&%'%%&$&'$E$('&'%&''''(&('&&/.%&(&&&($($.()(+0'0'0(&%%&'$&%%&$E&G%%$F%$&&%'%&'$'$'$&$'$'$'$'$&%'$'$'$&$'$'$'$'$'$'$&&&%'$'$'$&$'$'$'$'$&(&'&(&%'$'$'$&$'$'$'$'$'$'$$($'E'$F%&%%'$%%'$''$&'%%%'$'$($#)%$&&&(&&'%&&&D%&&%$'&&E'%&%&(%$&D'%(E%'($E$&%&('%$$%&$&$'%'..()%*$*&*'*'&$&(&&&'$'(&$'($)$%&($&$'%'))&%%'&&&%E&&F$'%$'%&$F%%'$&$'$$'$))$%&&%%')$%$&(&&'%&&&%&D%')$&+*'(&((F&&.-(%&%&$*%&$(#'$&$(%'%%%%'$$)%&$(%$$$%(&%%(D%%&%($(%D$''$$&'&*''$%$%(%&%$F&)*&&$&$(&&$(%E%$&%(&&(&'&)%/%*'-'..($*%'&&$F&$%%%'$'%%'$$'%&$)$&%)#(%%D(%'$(%%G$%'%$$&$$$'%D$$E'%$&&$$%)%$%$&&$'%&(&($%%'%($$%%%$'%E$&'%%&%%'&'$$(&'%&&**'%'&&&%(%%)$'%&$&%&%%$%E$D&%%$&%&%,&,#0$%$($(%&&&%D$'$G$&%&%&$&$F%'&$'$$*D(($H$($($($'%($G%($($'%'%($'%&%%&$F#%%$$(%&($%$$($'%$$&$$%$%$&$&(%$&%&&)$*$&D'%$E$$%$$'$&$$%$%$%$$%%%''%$&$'$%&$F$'$&%%'$'$D$%%&%%&%'%(%*'%&&&)((&'&&$K%E#'$(%%%'%'&$'&'$$&$'$()&%'%'$E$*&($'%'%.'-%E%'$F%'%'$(%'C)$$E&%$$&E&$%%DD($$%'&%%'%&$'$'&%''''&%%%%&$$%'%&(&%'%$&&&(''&(&'$&%&%E%%$'D($F%%'$'&'$($'$$$%'$'E%#(%$$E$'$F$F%'$'#(($$(%$$E$($&$&$F$F#(%%%'$'$$%$$&$(%)%'%'%%'$'%%$E&%%'$(%'%'%'%'%'&'%%$&&&$'D$'%&%'($&%'&)$$(%'&%%%%$$&%&($%(&(%%$$%*,''..%'-'-1$,+,-'-%$%$&$&(%$&%&&)$*$&D'%&*'&'()''&'&$(%'%D$$%$$''$($%&$&$$%&%)%'%&$(%')'$%%%''%$&$'$%&$'&%%&%.+-')'-%.,(%&&D&&%(%'&&%$&'&$$&'%$'%)%&($%$%&$(%E%$%%'$'$%%&%($%'D$%%&%%&%'%'%'%(%'&$'$'$$*&'$K%E#(D&%%&$'&%$&&)')')%%'$(%$$'$/$E$%D'%$&&&&F&%&($($)$$&%%$($(%E$$$F%'$$%)%&#F%D&D$,(-%D%D&D$-$(%'$'%'%E%$&D&E&%&'%&(%*$D&%F(D$&&&%'%&(F%%%$$'$$%&%''$(%%F%'%'&E%')$$E$E%$&$'D'H&D%&%$&$$'%&%&$$%$&$%$$&$'%D%&%%%$&*(-&$'D'H&D'$%&%$&%($$&$FE$&%(D(F(%)$)$&%(%)$)$$&'('E'D%(%$&&&D'$(E$'%&(D(D%,%&($$%&&&D&D%*)+%%'$($%&%&%((%%%'D'$'F*%,D&%(E&$'D'$'F*%,D$&E'%%%.0%,(1%$$%$&&&%$(%'%E%'%E&D%(%'&D&D'F%'&G%F$'%''$(%%'#%D(%%$&G$%$$'%'%%%%%'$'$'%D$&E'%$$'%$$&$'%&&'%&%$$'%&%(&$&&$F$&%&%&$$%&%$&%(%F$F$%'%%%(%$$&E'%%D(&&)%D&$'#&F$''&&'$&$$%$(&&&&&$&'$E$%&$%'%&$$%*%$$()$'%%%'''$'&'%($'$G%'&'&$$$*%EE&$$%$%%%&%$&$')'*'%'*(&(&'&%&($%%&%&&%%&(''''&$'%%&%'$F%$$(#F$&$F$($F$-'&%&(%E%#(%%%'$'$&$F&&%&%)%%'$'$'%E&%%'%'$(%'$'%'%'%'%'&'%'$%'&%('$'%&%'($&%'&)$$(%'&%%%%$$&%(%&($%%$&'&'''$%%E$$(%'%D$''$($%$&$$,-'(./%(-,+(.(-(-%%%-$'%&%$$()'$'$'&%%&%&&D&&%($&'%%)$'$(%E%$%%&%($$(%'%%'$'$''$)$$#)$'$$%$%%&&%&%$&&%&%%&%&&%)%&%$$&'$'$$'%''$(%E%%%%'%)'$%%$E&&$'%'&$%)(+E$$'($($%$&&&$'$&$'$&$'$&%&'&'$'$/&&%)%%&%%$&$'D$(%$&$'%%E$()&&$$'(D&%(D%&($(&+%'$($(&+%%$&&($&$$'$F%'%'%'$&'$%0+&&%$%&$&&&$'&&'&%'$&'&'&&)%+$)&,$'%'%($%%')'*'%'*(&(&'&%$%%%$F$F$F$&$&&'&&$'&&'(%&'&'&%'$&'&&)%+$)&,$'%'%($$'%''$(%%'D'#)%$$&$(%'%$$&$($E$(('&%(&($%,(&&&%&&&E&$'E&($)%($%%$&%$&&&&&D'&%%$($'%)+'+'/%+$+(0%&&&$&(&'&%&'%)$F&$%&%'$'%1*-#'$&D(%%$'&&D'%$$'%'%&$(%DD($''$%&$()%&&%&$'E$$'%E$)%,%.,(%&%%'$'&%+$()%&&%&%&$F$'%'%%'$$'E%$)#'$&'$$'$(%+&(&*&&'$'(&$'%&('K/D(J/D&('..($%$'$%&&&%%'%'&$$E$'$G'D$F$'$'$F%G(D&F(D$)#($(&%($%'$E$F$$$$%'$F#'%&%%$'$E$'%&$$$'%&$&$&$'%E&&%'$'%&$F%'$(%&$&$(C)&$$'%$D%$E$&$F$F$&E%#)$(%$$&$(%%$E$&$)$F$F$%%%0@0000H8H40H000047P00P@001000@0B0HP@:H9T8P000LB8d@800@I0<110000QQ8400P10030005940@410020000Q02000@0200000@P0101@8000440400000000808000000000@00000000P`0000000040400@0004<000000000008000030000000000P020T400020@0@00000000000000000000000000P0000000400400000400220080000100000000000000000P000000000000P000000@00402000000000@00000000000000000000040000000000000", "Æ&ÁĂÂА𝔄ÀΑĀ⩓Ą𝔸⁡Å𝒜≔ÃÄ∖⫧⌆Б∵ℬΒ𝔅𝔹˘ℬ≎Ч©Ć⋒ⅅℭČÇĈ∰Ċ¸·ℭΧ⊙⊖⊕⊗∲”’∷⩴≡∯∮ℂ∐∳⨯𝒞⋓≍ⅅ⤑ЂЅЏ‡↡⫤ĎД∇Δ𝔇´˙˝`˜⋄ⅆ𝔻¨⃜≐∯¨⇓⇐⇔⫤⟸⟺⟹⇒⊨⇑⇕∥↓⤓⇵̑⥐⥞↽⥖⥟⇁⥗⊤↧⇓𝒟ĐŊÐÉĚÊЭĖ𝔈È∈Ē◻▫Ę𝔼Ε⩵≂⇌ℰ⩳ΗË∃ⅇФ𝔉◼▪𝔽∀ℱℱЃ>ΓϜĞĢĜГĠ𝔊⋙𝔾≥⋛≧⪢≷⩾≳𝒢≫Ъˇ^Ĥℌℋℍ─ℋĦ≎≏ЕĲЁÍÎИİℑÌℑĪⅈ⇒∬∫⋂⁣⁢Į𝕀ΙℐĨІÏĴЙ𝔍𝕁𝒥ЈЄХЌΚĶК𝔎𝕂𝒦Љ<ĹΛ⟪ℒ↞ĽĻЛ⟨←⇤⇆⌈⟦⥡⇃⥙⌊↔⥎⊣↤⥚⊲⧏⊴⥑⥠↿⥘↼⥒⇐⇔⋚≦≶⪡⩽≲𝔏⋘⇚Ŀ⟵⟷⟶⟸⟺⟹𝕃↙↘ℒ↰Ł≪⤅М ℳ𝔐∓𝕄ℳΜЊŃŇŅН​​​​≫≪\n𝔑⁠\xA0ℕ⫬≢≭∦∉≠≂̸∄≯≱≧̸≫̸≹⩾̸≵≎̸≏̸⋪⧏̸⋬≮≰≸≪̸⩽̸≴⪢̸⪡̸⊀⪯̸⋠∌⋫⧐̸⋭⊏̸⋢⊐̸⋣⊂⃒⊈⊁⪰̸⋡≿̸⊃⃒⊉≁≄≇≉∤𝒩ÑΝŒÓÔОŐ𝔒ÒŌΩΟ𝕆“‘⩔𝒪ØÕ⨷Ö‾⏞⎴⏜∂П𝔓ΦΠ±ℌℙ⪻≺⪯≼≾″∏∷∝𝒫Ψ\"𝔔ℚ𝒬⤐®Ŕ⟫↠⤖ŘŖРℜ∋⇋⥯ℜΡ⟩→⇥⇄⌉⟧⥝⇂⥕⌋⊢↦⥛⊳⧐⊵⥏⥜↾⥔⇀⥓⇒ℝ⥰⇛ℛ↱⧴ЩШЬŚ⪼ŠŞŜС𝔖↓←→↑Σ∘𝕊√□⊓⊏⊑⊐⊒⊔𝒮⋆⋐⋐⊆≻⪰≽≿∋∑⋑⊃⊇⋑Þ™ЋЦ	ΤŤŢТ𝔗∴Θ   ∼≃≅≈𝕋⃛𝒯ŦÚ↟⥉ЎŬÛУŰ𝔘ÙŪ_⏟⎵⏝⋃⊎Ų𝕌↑⤒⇅↕⥮⊥↥⇑⇕↖↗ϒΥŮ𝒰ŨÜ⊫⫫В⊩⫦⋁‖‖∣|❘≀ 𝔙𝕍𝒱⊪Ŵ⋀𝔚𝕎𝒲𝔛Ξ𝕏𝒳ЯЇЮÝŶЫ𝔜𝕐𝒴ŸЖŹŽЗŻ​Ζℨℤ𝒵áă∾∾̳∿â´аæ⁡𝔞àℵℵαā⨿&∧⩕⩜⩘⩚∠⦤∠∡⦨⦩⦪⦫⦬⦭⦮⦯∟⊾⦝∢Å⍼ą𝕒≈⩰⩯≊≋'≈≊å𝒶*≈≍ãä∳⨑⫭≌϶‵∽⋍⊽⌅⌅⎵⎶≌б„∵∵⦰϶ℬβℶ≬𝔟⋂◯⋃⨀⨁⨂⨆★▽△⨄⋁⋀⤍⧫▪▴▾◂▸␣▒░▓█=⃥≡⃥⌐𝕓⊥⊥⋈╗╔╖╓═╦╩╤╧╝╚╜╙║╬╣╠╫╢╟⧉╕╒┐┌─╥╨┬┴⊟⊞⊠╛╘┘└│╪╡╞┼┤├‵˘¦𝒷⁏∽⋍\\⧅⟈••≎⪮≏≏ć∩⩄⩉⩋⩇⩀∩︀⁁ˇ⩍čçĉ⩌⩐ċ¸⦲¢·𝔠ч✓✓χ○⧃ˆ≗↺↻®Ⓢ⊛⊚⊝≗⨐⫯⧂♣♣:≔≔,@∁∘∁ℂ≅⩭∮𝕔∐©℗↵✗𝒸⫏⫑⫐⫒⋯⤸⤵⋞⋟↶⤽∪⩈⩆⩊⊍⩅∪︀↷⤼⋞⋟⋎⋏¤↶↷⋎⋏∲∱⌭⇓⥥†ℸ↓‐⊣⤏˝ďдⅆ‡⇊⩷°δ⦱⥿𝔡⇃⇂⋄⋄♦♦¨ϝ⋲÷÷⋇⋇ђ⌞⌍$𝕕˙≐≑∸∔⊡⌆↓⇊⇃⇂⤐⌟⌌𝒹ѕ⧶đ⋱▿▾⇵⥯⦦џ⟿⩷≑é⩮ě≖ê≕эėⅇ≒𝔢⪚è⪖⪘⪙⏧ℓ⪕⪗ē∅∅∅   ŋ ę𝕖⋕⧣⩱εεϵ≖≕≂⪖⪕=≟≡⩸⧥≓⥱ℯ≐≂ηðë€!∃ℰⅇ≒ф♀ﬃﬀﬄ𝔣ﬁfj♭ﬂ▱ƒ𝕗∀⋔⫙⨍½⅓¼⅕⅙⅛⅔⅖¾⅗⅜⅘⅚⅝⅞⁄⌢𝒻≧⪌ǵγϝ⪆ğĝгġ≥⋛≥≧⩾⩾⪩⪀⪂⪄⋛︀⪔𝔤≫⋙ℷѓ≷⪒⪥⪤≩⪊⪊⪈⪈≩⋧𝕘`ℊ≳⪎⪐>⪧⩺⋗⦕⩼⪆⥸⋗⋛⪌≷≳≩︀≩︀⇔ ½ℋъ↔⥈↭ℏĥ♥♥…⊹𝔥⤥⤦⇿∻↩↪𝕙―𝒽ℏħ⁃‐í⁣îие¡⇔𝔦ìⅈ⨌∭⧜℩ĳīℑℐℑı⊷Ƶ∈℅∞⧝ı∫⊺ℤ⊺⨗⨼ёį𝕚ι⨼¿𝒾∈⋹⋵⋴⋳∈⁢ĩіïĵй𝔧ȷ𝕛𝒿јєκϰķк𝔨ĸхќ𝕜𝓀⇚⇐⤛⤎≦⪋⥢ĺ⦴ℒλ⟨⦑⟨⪅«←⇤⤟⤝↩↫⤹⥳↢⪫⤙⪭⪭︀⤌❲{[⦋⦏⦍ľļ⌈{л⤶“„⥧⥋↲≤←↢↽↼⇇↔⇆⇋↭⋋⋚≤≦⩽⩽⪨⩿⪁⪃⋚︀⪓⪅⋖⋚⪋≶≲⥼⌊𝔩≶⪑↽↼⥪▄љ≪⇇⌞⥫◺ŀ⎰⎰≨⪉⪉⪇⪇≨⋦⟬⇽⟦⟵⟷⟼⟶↫↬⦅𝕝⨭⨴∗_◊◊⧫(⦓⇆⌟⇋⥭‎⊿‹𝓁↰≲⪍⪏[‘‚ł<⪦⩹⋖⋋⋉⥶⩻⦖◃⊴◂⥊⥦≨︀≨︀∺¯♂✠✠↦↦↧↤↥▮⨩м—∡𝔪℧µ∣*⫰·−⊟∸⨪⫛…∓⊧𝕞∓𝓂∾μ⊸⊸⋙̸≫⃒≫̸⇍⇎⋘̸≪⃒≪̸⇏⊯⊮∇ń∠⃒≉⩰̸≋̸ŉ≉♮♮ℕ\xA0≎̸≏̸⩃ňņ≇⩭̸⩂н–≠⇗⤤↗↗≐̸≢⤨≂̸∄∄𝔫≧̸≱≱≧̸⩾̸⩾̸≵≯≯⇎↮⫲∋⋼⋺∋њ⇍≦̸↚‥≰↚↮≰≦̸⩽̸⩽̸≮≴≮⋪⋬∤𝕟¬∉⋹̸⋵̸∉⋷⋶∌∌⋾⋽∦∦⫽⃥∂̸⨔⊀⋠⪯̸⊀⪯̸⇏↛⤳̸↝̸↛⋫⋭⊁⋡⪰̸𝓃∤∦≁≄≄∤∦⋢⋣⊄⫅̸⊈⊂⃒⊈⫅̸⊁⪰̸⊅⫆̸⊉⊃⃒⊉⫆̸≹ñ≸⋪⋬⋫⋭ν#№ ⊭⤄≍⃒⊬≥⃒>⃒⧞⤂≤⃒<⃒⊴⃒⤃⊵⃒∼⃒⇖⤣↖↖⤧Ⓢó⊛⊚ôо⊝ő⨸⊙⦼œ⦿𝔬˛ò⧁⦵Ω∮↺⦾⦻‾⧀ōωο⦶⊖𝕠⦷⦹⊕∨↻⩝ℴℴªº⊶⩖⩗⩛ℴø⊘õ⊗⨶ö⌽∥¶∥⫳⫽∂п%.‰⊥‱𝔭φϕℳ☎π⋔ϖℏℎℏ+⨣⊞⨢∔⨥⩲±⨦⨧±⨕𝕡£≺⪳⪷≼⪯≺⪷≼⪯⪹⪵⋨≾′ℙ⪵⪹⋨∏⌮⌒⌓∝∝≾⊰𝓅ψ 𝔮⨌𝕢⁗𝓆ℍ⨖?≟\"⇛⇒⤜⤏⥤∽̱ŕ√⦳⟩⦒⦥⟩»→⥵⇥⤠⤳⤞↪↬⥅⥴↣↝⤚∶ℚ⤍❳}]⦌⦎⦐řŗ⌉}р⤷⥩””↳ℜℛℜℝ▭®⥽⌋𝔯⇁⇀⥬ρϱ→↣⇁⇀⇄⇌⇉↝⋌˚≓⇄⇌‏⎱⎱⫮⟭⇾⟧⦆𝕣⨮⨵)⦔⨒⇉›𝓇↱]’’⋌⋊▹⊵▸⧎⥨℞ś‚≻⪴⪸š≽⪰şŝ⪶⪺⋩⨓≿с⋅⊡⩦⇘⤥↘↘§;⤩∖∖✶𝔰⌢♯щш∣∥­σςς∼⩪≃≃⪞⪠⪝⪟≆⨤⥲←∖⨳⧤∣⌣⪪⪬⪬︀ь/⧄⌿𝕤♠♠∥⊓⊓︀⊔⊔︀⊏⊑⊏⊑⊐⊒⊐⊒□□▪▪→𝓈∖⌣⋆☆★ϵϕ¯⊂⫅⪽⊆⫃⫁⫋⊊⪿⥹⊂⊆⫅⊊⫋⫇⫕⫓≻⪸≽⪰⪺⪶⋩≿∑♪⊃¹²³⫆⪾⫘⊇⫄⟉⫗⥻⫂⫌⊋⫀⊃⊇⫆⊋⫌⫈⫔⫖⇙⤦↙↙⤪ß⌖τ⎴ťţт⃛⌕𝔱∴∴θϑϑ≈∼ ≈∼þ˜×⊠⨱⨰∭⤨⊤⌶⫱𝕥⫚⤩‴™▵▿◃⊴≜▹⊵◬≜⨺⨹⧍⨻⏢𝓉цћŧ≬↞↠⇑⥣ú↑ўŭûу⇅ű⥮⥾𝔲ù↿↾▀⌜⌜⌏◸ū¨ų𝕦↑↕↿↾⊎υϒυ⇈⌝⌝⌎ů◹𝓊⋰ũ▵▴⇈ü⦧⇕⫨⫩⊨⦜ϵϰ∅ϕϖ∝↕ϱς⊊︀⫋︀⊋︀⫌︀ϑ⊲⊳в⊢∨⊻≚⋮||𝔳⊲⊂⃒⊃⃒𝕧∝⊳𝓋⫋︀⊊︀⫌︀⊋︀⦚ŵ⩟∧≙℘𝔴𝕨℘≀≀𝓌⋂◯⋃▽𝔵⟺⟷ξ⟸⟵⟼⋻⨀𝕩⨁⨂⟹⟶𝓍⨆⨄△⋁⋀ýяŷы¥𝔶ї𝕪𝓎юÿźžзżℨζ𝔷ж⇝𝕫𝓏‍‌"];
/** Multiplier deriving the first candidate bucket from a key. */
var BUCKET_HASH_1 = 2654435761;
/** Multiplier deriving the second candidate bucket from a key. */
var BUCKET_HASH_2 = 2246822507;
/** Size of the (c0,c1) class table (10-bit index). */
var PAIR_TABLE_SIZE = 1024;
/**
* Map an alphanumeric char code to 6 bits (1..62); 0 = not alphanumeric.
* Used for the key's last-character field.
*/
var CHAR_REMAP = (() => {
	const remap = /* @__PURE__ */ new Uint8Array(128);
	for (let code = 48; code <= 57; code++) remap[code] = code - 47;
	for (let code = 65; code <= 90; code++) remap[code] = code - 54;
	for (let code = 97; code <= 122; code++) remap[code] = code - 60;
	return remap;
})();
/**
* The exact 32-bit key for a name occurring at `nameStart` with `length`
* chars. Covers the first two and last two characters plus the length;
* middle characters are verified separately against the names blob.
*
* The hot decoder inlines this computation; tests assert both stay in sync
* by looking every entity up through the public API.
* @param text Text containing the name.
* @param nameStart Index of the name's first character.
* @param length Length of the name.
*/
function exactKey(text, nameStart, length) {
	return text.charCodeAt(nameStart) << 25 | text.charCodeAt(nameStart + 1) << 18 | text.charCodeAt(nameStart + length - 2) << 11 | CHAR_REMAP[text.charCodeAt(nameStart + length - 1)] << 5 | length;
}
/**
* The 10-bit (c0,c1) class index used by the probe front end. The function
* was chosen by exhaustive search over load-free mixers for minimal
* candidate-set collisions on the real entity set.
* @param c0 First char code of the candidate name.
* @param c1 Second char code.
*/
function pairIndex(c0, c1) {
	return (c0 * 3 << 3 ^ c1) & 1023;
}
/**
* First candidate bucket for a key in a table of `buckets` buckets.
* @param key Exact key.
* @param buckets Bucket count.
*/
function bucketOne(key, buckets) {
	return (Math.imul(key, BUCKET_HASH_1) >>> 16) * buckets >>> 16;
}
/**
* Second candidate bucket for a key.
* @param key Exact key.
* @param buckets Bucket count.
*/
function bucketTwo(key, buckets) {
	return (Math.imul(key, BUCKET_HASH_2) >>> 16) * buckets >>> 16;
}
/**
* Build the lookup structures from a serialized dataset.
* @param packed Serialized decode data, see `decode-data-format.ts`.
*/
function initDecodeData(packed) {
	const [data, values] = packed;
	const nameCount = data.charCodeAt(0) - 48 << 6 | data.charCodeAt(1) - 48;
	const suffixesLength = data.charCodeAt(2) - 48 << 6 | data.charCodeAt(3) - 48;
	const buckets = data.charCodeAt(4) - 48 << 6 | data.charCodeAt(5) - 48;
	const metaStart = 6 + suffixesLength;
	const choicesStart = metaStart + 2 * nameCount;
	const slotCount = 2 * buckets;
	const keys = new Int32Array(slotCount);
	const slotMidOff = new Uint16Array(slotCount);
	const slotValue = new Uint16Array(slotCount);
	const lengthBits = new Uint32Array(PAIR_TABLE_SIZE);
	const middleOffsets = /* @__PURE__ */ new Map();
	const middles = [];
	let name = "";
	let suffixOffset = 6;
	let valueOffset = 0;
	for (let index = 0; index < nameCount; index++) {
		const meta0 = data.charCodeAt(metaStart + 2 * index) - 35;
		const meta1 = data.charCodeAt(metaStart + 2 * index + 1) - 35;
		const prefixLength = meta0 & 31;
		const length = prefixLength + (meta1 & 31);
		const valueLength = (meta1 >> 5) + 1;
		name = name.slice(0, prefixLength) + data.slice(suffixOffset, suffixOffset + length - prefixLength);
		suffixOffset += length - prefixLength;
		const key = exactKey(name, 0, length);
		let slot = 2 * ((data.charCodeAt(choicesStart + Math.floor(index / 6)) - 48 & 1 << index % 6) === 0 ? bucketOne : bucketTwo)(key, buckets);
		if (keys[slot] !== 0) slot += 1;
		keys[slot] = key;
		if (length > 4) {
			const middle = name.slice(2, length - 2);
			const existing = middleOffsets.get(middle);
			if (existing === void 0) {
				middleOffsets.set(middle, middles.length);
				slotMidOff[slot] = middles.length;
				for (let middleIndex = 0; middleIndex < middle.length; middleIndex += 2) middles.push(middle.charCodeAt(middleIndex) | middle.charCodeAt(middleIndex + 1) << 16);
			} else slotMidOff[slot] = existing;
		}
		const pair = pairIndex(name.charCodeAt(0), name.charCodeAt(1));
		lengthBits[pair] |= length <= 16 ? 1 << length - 2 : 32768;
		if ((meta0 & 32) !== 0) lengthBits[pair] |= 1 << length - 2 + 16;
		slotValue[slot] = valueOffset << 2 | valueLength - 1 | (meta0 & 32) >> 4;
		valueOffset += valueLength;
	}
	return {
		keys,
		buckets,
		slotMidOff,
		slotValue,
		values,
		lengthBits,
		middles: new Uint32Array(middles)
	};
}
// node_modules/entities/dist/decode.js
var CHAR_AMP = 38;
var CHAR_NUM = 35;
var CHAR_SEMI = 59;
var CHAR_EQUALS = 61;
var CHAR_ZERO = 48;
var CHAR_LOWER_A = 97;
var CHAR_LOWER_X = 120;
var CHAR_UPPER_A = 65;
/** Bit that needs to be set to convert an upper case ASCII character to lower case */
var TO_LOWER_BIT = 32;
/**
* Unsigned subtraction trick: (code - lo) >>> 0 wraps negatives to large
* values, so a single `<=` covers the entire [lo..hi] range check.
* @param code Code point to check.
*/
function isNumber(code) {
	return code - CHAR_ZERO >>> 0 <= 9;
}
function isAlphaNumeric(code) {
	return isNumber(code) || (code | TO_LOWER_BIT) - CHAR_LOWER_A >>> 0 <= 25;
}
/**
* Checks if the given character is a valid end character for an entity in an attribute.
*
* Attribute values that aren't terminated properly aren't parsed, and shouldn't lead to a parser error.
* See the example in https://html.spec.whatwg.org/multipage/parsing.html#named-character-reference-state
* @param code Code point to check.
*/
function isEntityInAttributeInvalidEnd(code) {
	return code === CHAR_EQUALS || isAlphaNumeric(code);
}
/**
* Decoding mode for named entities.
*/
var DecodingMode;
(function(DecodingMode) {
	/** Entities in text nodes that can end with any character. */
	DecodingMode[DecodingMode["Legacy"] = 0] = "Legacy";
	/** Only allow entities terminated with a semicolon. */
	DecodingMode[DecodingMode["Strict"] = 1] = "Strict";
	/** Entities in attributes have limitations on ending characters. */
	DecodingMode[DecodingMode["Attribute"] = 2] = "Attribute";
})(DecodingMode || (DecodingMode = {}));
/** Decode data for HTML entities. */
var htmlDecode = /* #__PURE__ */ initDecodeData(htmlDecodeData);
var htmlKeys = /* #__PURE__ */ (() => htmlDecode.keys)();
var htmlBuckets = /* #__PURE__ */ (() => htmlDecode.buckets)();
var htmlSlotMidOff = /* #__PURE__ */ (() => htmlDecode.slotMidOff)();
var htmlLengthBits = /* #__PURE__ */ (() => htmlDecode.lengthBits)();
var htmlMiddles = /* #__PURE__ */ (() => htmlDecode.middles)();
/** Hoisted for the specialized HTML cores; see `emitHtmlValue`. */
var htmlSlotValue = /* #__PURE__ */ (() => htmlDecode.slotValue)();
var htmlValues = /* #__PURE__ */ (() => htmlDecode.values)();
/**
* The replacement string for a packed `slotValue` entry. Most values need
* just one UTF-16 code unit.
* @param packed Replacement offset, legacy flag, and length from `htmlSlotValue`.
*/
function emitHtmlValue(packed) {
	const off = packed >> 2;
	return (packed & 1) === 0 ? htmlValues.charAt(off) : htmlValues.slice(off, off + (packed & 1) + 1);
}
/**
* Find the slot matching `text[start..start+length)`, or -1. A match proves
* every character of the span (exact key + middle comparison).
* @param text Input text.
* @param start Start of the span in `text`.
* @param length Length of the span.
*/
function findSlotHtml(text, start, length) {
	const c0 = text.charCodeAt(start);
	const c1 = text.charCodeAt(start + 1);
	const c2 = text.charCodeAt(start + length - 2);
	const c3 = text.charCodeAt(start + length - 1);
	if ((c0 | c1 | c2 | c3) > 127) return -1;
	const key = c0 << 25 | c1 << 18 | c2 << 11 | CHAR_REMAP[c3] << 5 | length;
	let slot = 2 * ((Math.imul(key, BUCKET_HASH_1) >>> 16) * htmlBuckets >>> 16);
	for (let attempt = 0;; attempt++) {
		if (htmlKeys[slot] === key && (length <= 4 || isMidMatchHtml(slot, text, start, length))) return slot;
		if (htmlKeys[slot + 1] === key && (length <= 4 || isMidMatchHtml(slot + 1, text, start, length))) return slot + 1;
		if (attempt === 1) return -1;
		slot = 2 * ((Math.imul(key, BUCKET_HASH_2) >>> 16) * htmlBuckets >>> 16);
	}
}
/**
* Compare the middle characters (positions 2..length-3) of the candidate at
* `slot` against the input. The key already proves the outer characters and
* the length. Names of length at most four are accepted by the caller.
* @param slot Slot of the candidate.
* @param text Input text.
* @param start Start of the span in `text`.
* @param length Length of the span.
*/
function isMidMatchHtml(slot, text, start, length) {
	let wordIndex = htmlSlotMidOff[slot];
	let index = start + 2;
	const end = start + length - 2;
	while (index + 1 < end) {
		if ((text.charCodeAt(index) | text.charCodeAt(index + 1) << 16) !== htmlMiddles[wordIndex++]) return false;
		index += 2;
	}
	return index === end || text.charCodeAt(index) === (htmlMiddles[wordIndex] & 65535);
}
/**
* `parseNumericEntity` packs its two results into one integer:
* `(consumed << CONSUMED_SHIFT) | codePoint`. The code point occupies the low
* 21 bits (max 0x110000, clamped before packing); `consumed` takes the upper
* 11 bits and is read back with `>>> CONSUMED_SHIFT`, so the sign bit set by a
* large `consumed` is harmless. The maximum consumed field is reserved for
* long references, whose full length is stored in `longNumericConsumed`.
* A zero return means "no numeric entity".
*/
var NUMERIC_CONSUMED_SHIFT = 21;
var NUMERIC_CODE_POINT_MASK = 2097151;
var NUMERIC_CONSUMED_OVERFLOW = 2047;
/** Full length, including `&`, when the packed consumed field overflows. */
var longNumericConsumed = 0;
/**
* Recover the consumed count before the next numeric parse can overwrite
* `longNumericConsumed`. This avoids allocating a tuple for each reference.
* @param packed Packed result of `parseNumericEntity`.
*/
function unpackConsumed(packed) {
	const consumed = packed >>> NUMERIC_CONSUMED_SHIFT;
	return consumed === NUMERIC_CONSUMED_OVERFLOW ? longNumericConsumed : consumed;
}
/** ASCII digit values; 0xff marks characters outside the hexadecimal range. */
var numericDigits = /* #__PURE__ */ (() => {
	const digits = (/* @__PURE__ */ new Uint8Array(128)).fill(255);
	for (let digit = 0; digit < 10; digit++) digits[CHAR_ZERO + digit] = digit;
	for (let digit = 0; digit < 6; digit++) {
		digits[CHAR_UPPER_A + digit] = digit + 10;
		digits[CHAR_LOWER_A + digit] = digit + 10;
	}
	return digits;
})();
/**
* Parse a numeric entity starting right after the `#`. In legacy mode the
* terminating semicolon is optional. Returns the number of characters
* consumed (counting the `&` and `#`) packed with the code point (see
* the packing constants above), or 0 if there is no valid numeric entity at this
* position.
* @param input Input string.
* @param offset Index right after the `#`.
* @param isStrict Whether a terminating semicolon is required.
*/
function parseNumericEntity(input, offset, isStrict) {
	const inputLength = input.length;
	let index = offset;
	let codePoint = 0;
	let digitsStart;
	if ((input.charCodeAt(index) | TO_LOWER_BIT) === CHAR_LOWER_X) {
		index += 1;
		digitsStart = index;
		while (index < inputLength) {
			const char = input.charCodeAt(index);
			if (char >= 128) break;
			const digit = numericDigits[char];
			if (digit <= 15) {
				codePoint = codePoint * 16 + digit;
				index++;
			} else break;
		}
	} else {
		digitsStart = index;
		while (index < inputLength) {
			const char = input.charCodeAt(index);
			if (char >= 128) break;
			const digit = numericDigits[char];
			if (digit <= 9) {
				codePoint = codePoint * 10 + digit;
				index++;
			} else break;
		}
	}
	if (index === digitsStart) return 0;
	if (codePoint > 1114111) codePoint = 1114112;
	let consumed = index - offset + 2;
	if (index < inputLength && input.charCodeAt(index) === CHAR_SEMI) consumed += 1;
	else if (isStrict) return 0;
	if (consumed >= NUMERIC_CONSUMED_OVERFLOW) {
		longNumericConsumed = consumed;
		consumed = NUMERIC_CONSUMED_OVERFLOW;
	}
	return consumed << NUMERIC_CONSUMED_SHIFT | codePoint;
}
/**
* Find the longest legacy (semicolon-less) match for the name starting at
* `start`, using the per-class legacy length bits. Returns
* `slot << 3 | matchLength`, or -1 if there is no match. Only called after
* the exact probes failed (the miss path).
* @param input Input text.
* @param start Start of the name.
* @param maxLength Number of available run characters.
*/
function findLegacySlot(input, start, maxLength) {
	let legacy = htmlLengthBits[pairIndex(input.charCodeAt(start), input.charCodeAt(start + 1))] >>> 16 & 31;
	while (legacy !== 0) {
		const top = 31 - Math.clz32(legacy);
		legacy ^= 1 << top;
		if (top + 2 > maxLength) continue;
		const slot = findSlotHtml(input, start, top + 2);
		if (slot >= 0 && (htmlSlotValue[slot] & 2) !== 0) return slot << 3 | top + 2;
	}
	return -1;
}
/**
* Match a class containing long names without probing all its shorter lengths.
* The 32-character window bounds the scan even for invalid or unterminated runs.
* Returns `(slot << 6) | consumed`, excluding the `&`, or -1 on a miss.
* @param input Input containing the candidate name.
* @param start Start of the name.
* @param mode Decoding mode, including the rules for legacy matches.
*/
function findLongClassMatch(input, start, mode) {
	const length = input.slice(start, start + 32).indexOf(";");
	if (length - 2 >>> 0 <= 29) {
		const slot = findSlotHtml(input, start, length);
		if (slot >= 0) return slot << 6 | length + 1;
	}
	if (mode !== DecodingMode.Strict) {
		const packed = findLegacySlot(input, start, Math.min(31, input.length - start));
		if (packed >= 0) {
			const length = packed & 7;
			if (mode !== DecodingMode.Attribute || start + length >= input.length || !isEntityInAttributeInvalidEnd(input.charCodeAt(start + length))) return packed >> 3 << 6 | length;
		}
	}
	return -1;
}
/**
* The next `&` to resume from after emitting a replacement, given the index
* just past it. A leaf the decoders call after every emit: the common
* adjacent-entity case (`&amp;&lt;`) skips the `indexOf` C++ call.
* @param input Input text.
* @param last Index just past the entity that was emitted.
*/
function nextOffset(input, last) {
	if (last >= input.length) return -1;
	return input.charCodeAt(last) === CHAR_AMP ? last : input.indexOf("&", last);
}
/**
* Synchronous HTML decoder, shared by all three decoding modes.
* @param input String to decode.
* @param mode Decoding mode for named entities.
*/
function decodeHtmlText(input, mode) {
	const isLegacyAllowed = mode !== DecodingMode.Strict;
	let offset = input.indexOf("&");
	if (offset < 0) return input;
	const inputLength = input.length;
	let result = "";
	let last = 0;
	do {
		const start = offset + 1;
		if (start + 1 >= inputLength) break;
		const c0 = input.charCodeAt(start);
		if (c0 === CHAR_AMP) {
			offset = start;
			continue;
		}
		if (c0 === CHAR_NUM) {
			const packed = parseNumericEntity(input, start + 1, !isLegacyAllowed);
			const consumed = unpackConsumed(packed);
			if (consumed === 0) offset = input.indexOf("&", start);
			else {
				if (last !== offset) result += input.slice(last, offset);
				result += codePointToString(packed & NUMERIC_CODE_POINT_MASK);
				last = offset + consumed;
				offset = nextOffset(input, last);
			}
			continue;
		}
		const bits = htmlLengthBits[pairIndex(c0, input.charCodeAt(start + 1))];
		if ((bits & 32768) !== 0) {
			const packed = findLongClassMatch(input, start, mode);
			if (packed >= 0) {
				if (last !== offset) result += input.slice(last, offset);
				result += emitHtmlValue(htmlSlotValue[packed >> 6]);
				last = start + (packed & 63);
				offset = nextOffset(input, last);
			} else offset = input.indexOf("&", start);
			continue;
		}
		let probed = bits & 32767;
		let matched = -1;
		while (probed !== 0) {
			const low = probed & -probed;
			probed ^= low;
			const length = 33 - Math.clz32(low);
			const end = start + length;
			if (end > inputLength) break;
			const isTerminated = end < inputLength && input.charCodeAt(end) === CHAR_SEMI;
			if (!(isTerminated || isLegacyAllowed && (bits >>> length + 14 & 1) !== 0)) continue;
			const slot = findSlotHtml(input, start, length);
			if (slot < 0) continue;
			if (isTerminated) {
				matched = slot << 6 | 32 | length + 1;
				break;
			}
			if ((htmlSlotValue[slot] & 2) !== 0) matched = slot << 6 | length;
		}
		if (matched >= 0) {
			const length = matched & 31;
			if ((matched & 32) !== 0 || mode !== DecodingMode.Attribute || start + length >= inputLength || !isEntityInAttributeInvalidEnd(input.charCodeAt(start + length))) {
				if (last !== offset) result += input.slice(last, offset);
				result += emitHtmlValue(htmlSlotValue[matched >> 6]);
				last = start + length;
				offset = nextOffset(input, last);
				continue;
			}
		}
		offset = input.indexOf("&", start + 1);
	} while (offset >= 0);
	return result + input.slice(last);
}
/**
* Decodes an HTML string.
* @param htmlString The string to decode.
* @param mode The decoding mode.
* @returns The decoded string.
*/
function decodeHTML(htmlString, mode = DecodingMode.Legacy) {
	return decodeHtmlText(htmlString, mode);
}
// apps/worker/feeds/images.ts
var import_saxes = require_saxes();
var imageHosts = {
	"7sur7": ["images.7sur7.be"],
	dh: ["www.dhnet.be"],
	lalibre: ["www.lalibre.be"],
	figaro: ["i.f1g.fr"],
	investing: ["content-media.investing.com"]
};
function imageUrl(value, source) {
	if (!value.trim()) return null;
	try {
		const url = new URL(value.trim(), source.feed ?? source.url);
		return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash && url.href.length <= 2048 && (imageHosts[source.id] ?? []).includes(url.hostname) ? url.href : null;
	} catch {
		return null;
	}
}
// apps/worker/feeds/parser.ts
var FeedError = class extends Error {
	status;
	constructor(status) {
		super(status);
		this.status = status;
	}
};
function plainText(value, max) {
	return decodeHTML(value).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ").replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function readingText(value) {
	return decodeHTML(value).replace(/<(script|style|iframe|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ").replace(/<br\s*\/?\s*>|<\/(?:p|div|li|h[1-6])\s*>/gi, "\n\n").replace(/<[^>]*>/g, " ").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").split(/\n+/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n\n").slice(0, 2e3);
}
function publicationDate(value, now = Date.now()) {
	if (!/(?:Z|[+-]\d{2}:?\d{2}|\bGMT|\bUTC|\bUT)$/i.test(value.trim())) return null;
	const timestamp = Date.parse(value);
	return Number.isFinite(timestamp) && timestamp >= 0 && timestamp <= now + 864e5 ? new Date(timestamp).toISOString() : null;
}
function articleUrl(value, source) {
	if (!value.trim()) return null;
	try {
		const url = new URL(value.trim(), source.feed ?? source.url);
		url.hash = "";
		if (url.protocol === "http:") url.protocol = "https:";
		for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key) || ["fbclid", "gclid"].includes(key)) url.searchParams.delete(key);
		return url.href.length <= 2048 && isSourceUrl(url.href, source) ? url.href : null;
	} catch {
		return null;
	}
}
function parseFeed(xml, source, includeRestricted = false) {
	const parser = new import_saxes.SaxesParser({ xmlns: false });
	const stack = [];
	let root = "";
	let item = null;
	let itemDepth = 0;
	let seen = 0;
	let categories = [];
	let images = [];
	let itemCredits = [];
	let mediaScopes = [];
	let activeCredit = null;
	let field = null;
	const items = [];
	const fields = [
		"title",
		"description",
		"summary",
		"link",
		"pubdate",
		"published",
		"updated",
		"dpp:paid",
		"dcterms:accessrights",
		"category"
	];
	const append = (text) => {
		if (activeCredit) {
			activeCredit.text = (activeCredit.text + text).slice(0, 2e3);
			return;
		}
		if (item && field && !stack.some((name) => ["script", "style"].includes(name))) item[field] = ((item[field] ?? "") + text).slice(0, 12e3);
	};
	parser.on("doctype", () => {
		throw new FeedError("invalid_xml");
	});
	parser.on("opentag", (tag) => {
		const name = tag.name.toLowerCase();
		stack.push(name);
		if (stack.length > 32) throw new FeedError("invalid_xml");
		if (stack.length === 1) {
			root = name;
			if (!["rss", "feed"].includes(root)) throw new FeedError("invalid_xml");
		}
		if (root === "rss" && stack.join("/") === "rss/channel/item" || root === "feed" && stack.join("/") === "feed/entry") {
			if (++seen > 200) throw new FeedError("too_many_items");
			item = {};
			categories = [];
			images = [];
			itemCredits = [];
			mediaScopes = [];
			activeCredit = null;
			itemDepth = stack.length;
		}
		if (item && stack.length <= itemDepth + 2 && [
			"media:group",
			"media:content",
			"media:thumbnail",
			"enclosure"
		].includes(name)) mediaScopes.push({
			depth: stack.length,
			credits: []
		});
		if (item && name === "media:credit" && stack.length <= itemDepth + 3) {
			const lastScope = mediaScopes.at(-1);
			const parent = lastScope?.depth === stack.length - 1 ? lastScope : void 0;
			if (parent || stack.length === itemDepth + 1) activeCredit = {
				depth: stack.length,
				credits: parent?.credits ?? itemCredits,
				text: ""
			};
		}
		if (item && stack.length === itemDepth + 1 && fields.includes(name)) {
			field = name;
			if (name === "category") item.category = "";
			if (name === "category" && tag.attributes.term) item.category = String(tag.attributes.term);
		}
		if (item && stack.length > itemDepth + 1 && field && [
			"p",
			"div",
			"br",
			"li"
		].includes(name)) append("\n\n");
		if (item && stack.length <= itemDepth + 2 && [
			"media:content",
			"media:thumbnail",
			"enclosure"
		].includes(name)) {
			const type = String(tag.attributes.type ?? "").toLowerCase();
			const medium = String(tag.attributes.medium ?? "").toLowerCase();
			const candidate = imageUrl(String(tag.attributes.url ?? ""), source);
			if (images.length < 8 && candidate && (!type || type.startsWith("image/")) && (!medium || medium === "image") && (name !== "enclosure" || type.startsWith("image/"))) images.push({
				url: candidate,
				creditScopes: [...mediaScopes].reverse().map((scope) => scope.credits).concat([itemCredits]),
				priority: name === "media:content" ? 0 : name === "media:thumbnail" ? 1 : 2
			});
		}
		if (item && root === "feed" && name === "link" && stack.length === itemDepth + 1 && (!tag.attributes.rel || tag.attributes.rel === "alternate")) item.link = String(tag.attributes.href ?? "");
	});
	parser.on("text", append);
	parser.on("cdata", append);
	parser.on("closetag", () => {
		if (activeCredit && activeCredit.depth === stack.length) {
			if (activeCredit.credits.length < 4) activeCredit.credits.push(plainText(activeCredit.text, 200));
			activeCredit = null;
		}
		if (mediaScopes.at(-1)?.depth === stack.length) mediaScopes.pop();
		if (item && field === "category" && stack.at(-1) === "category" && categories.length < 12) categories.push(plainText(item.category ?? "", 120));
		if (item && field && stack.at(-1) === field) field = null;
		if (item && stack.length === itemDepth) {
			const title = plainText(item.title ?? "", 500);
			const url = articleUrl(item.link ?? "", source);
			const rights = item["dcterms:accessrights"]?.trim().toUpperCase();
			const paid = item["dpp:paid"]?.trim().toLowerCase();
			const accessLevel = paid === "true" || ["PAYING", "MEMBER"].includes(rights ?? "") ? "restricted" : rights === "FREE" || paid === "false" ? "free" : "unknown";
			const description = item.description ?? item.summary ?? "";
			const image = images.sort((a, b) => a.priority - b.priority)[0];
			if (title && url && (includeRestricted || paid !== "true")) items.push({
				url,
				title,
				excerpt: plainText(description, 300),
				bodyText: accessLevel === "restricted" ? "" : readingText(description),
				imageUrl: image?.url ?? null,
				imageCredit: (image?.creditScopes.find((scope) => scope.some(Boolean)) ?? []).filter(Boolean).join(" · ").slice(0, 200),
				accessLevel,
				categories: categories.filter(Boolean),
				publishedAt: publicationDate(item.pubdate ?? item.published ?? item.updated ?? "")
			});
			item = null;
			field = null;
		}
		stack.pop();
	});
	parser.on("error", () => {
		throw new FeedError("invalid_xml");
	});
	try {
		parser.write(xml).close();
	} catch (error) {
		if (error instanceof FeedError) throw error;
		throw new FeedError("invalid_xml");
	}
	if (!root) throw new FeedError("invalid_xml");
	return [...new Map(items.map((entry) => [entry.url, entry])).values()];
}
// apps/worker/feeds/collector.ts
var MAX_BYTES = 1e6;
async function fetchFeed(source, state, fetcher = fetch) {
	if (!source.feed) throw new FeedError("unavailable");
	let url = source.feed;
	const signal = AbortSignal.timeout(12e3);
	let response;
	for (let hop = 0; hop <= 3; hop++) {
		if (!isSourceUrl(url, source)) throw new FeedError("redirect_refused");
		response = await fetcher(url, {
			redirect: "manual",
			signal,
			headers: {
				Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.2",
				"User-Agent": "MyPressReview/0.1 (+https://github.com/laurentkai/my-press-review)",
				...(state.reading_metadata_version ?? 2) >= 2 && state.etag ? { "If-None-Match": state.etag } : {},
				...(state.reading_metadata_version ?? 2) >= 2 && state.last_modified ? { "If-Modified-Since": state.last_modified } : {}
			}
		});
		if (response.status < 300 || response.status >= 400 || response.status === 304) break;
		const location = response.headers.get("location");
		await response.body?.cancel();
		if (!location) throw new FeedError("redirect_refused");
		const target = new URL(location, url);
		if (target.hostname === "myprivacy.dpgmedia.be") throw new FeedError("consent_required");
		if (hop === 3 || !isSourceUrl(target.href, source)) throw new FeedError("redirect_refused");
		url = target.href;
	}
	if (!response) throw new FeedError("network_error");
	if (response.status === 304) {
		await response.body?.cancel();
		return {
			status: "not_modified",
			items: [],
			etag: state.etag,
			modified: state.last_modified
		};
	}
	if (!response.ok) {
		await response.body?.cancel();
		throw new FeedError(response.status === 403 ? "blocked_403" : response.status === 429 ? "rate_limited" : response.status === 404 ? "not_found" : "server_error");
	}
	if (Number(response.headers.get("content-length")) > MAX_BYTES) {
		await response.body?.cancel();
		throw new FeedError("too_large");
	}
	const reader = response.body?.getReader();
	if (!reader) throw new FeedError("invalid_xml");
	let size = 0;
	const decoder = new TextDecoder();
	let xml = "";
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > MAX_BYTES) {
				await reader.cancel();
				throw new FeedError("too_large");
			}
			xml += decoder.decode(value, { stream: true });
		}
		xml += decoder.decode();
	} finally {
		reader.releaseLock();
	}
	const items = parseFeed(xml, source, true).slice(0, 30);
	return {
		status: items.length ? "ok" : "empty",
		items,
		etag: response.headers.get("etag")?.slice(0, 512) ?? null,
		modified: response.headers.get("last-modified")?.slice(0, 128) ?? null
	};
}
async function collectSource(db, id, fetcher = fetch, now = Date.now()) {
	const source = trialCatalog.find((entry) => entry.id === id);
	if (!source?.feed) return {
		processed: false,
		status: "unavailable"
	};
	const owner = crypto.randomUUID();
	const state = await db.prepare("UPDATE trial_sources SET lease_owner=?, lease_until=?, last_attempt_at=? WHERE id=? AND enabled=1 AND next_fetch_at<=? AND lease_until<=? AND article_lease_until<=? RETURNING id, etag, last_modified, reading_metadata_version").bind(owner, now + 12e4, now, id, now, now, now).first();
	if (!state) return {
		processed: false,
		status: "not_due"
	};
	try {
		const result = await fetchFeed(source, state, fetcher);
		const collected = new Date(now).toISOString();
		const writes = [];
		for (const item of result.items) {
			const articleId = await digest(id + "\n" + item.url);
			const topic = classifyArticle(item, id);
			if (item.accessLevel === "restricted") {
				writes.push(db.prepare(`UPDATE trial_articles SET access_level='restricted',excerpt='',body_text='',full_text='',full_status='restricted',full_reason='access_restricted',image_url=NULL,image_credit='',collected_at=? WHERE source_id=? AND url=? AND EXISTS(SELECT 1 FROM trial_sources WHERE id=? AND enabled=1 AND lease_owner=? AND lease_until>?)`).bind(collected, id, item.url, id, owner, Date.now()));
				continue;
			}
			writes.push(db.prepare(`INSERT INTO trial_articles(id,source_id,url,title,excerpt,published_at,collected_at,body_text,image_url,image_credit,access_level,publisher_categories,theme,subtheme)
        SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM trial_sources WHERE id=? AND enabled=1 AND lease_owner=? AND lease_until>?)
        ON CONFLICT(source_id,url) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,published_at=COALESCE(excluded.published_at,trial_articles.published_at),collected_at=excluded.collected_at,body_text=excluded.body_text,image_url=excluded.image_url,image_credit=excluded.image_credit,access_level=excluded.access_level,publisher_categories=excluded.publisher_categories,theme=excluded.theme,subtheme=excluded.subtheme,
        full_text=CASE WHEN excluded.access_level='restricted' THEN '' ELSE trial_articles.full_text END,
        full_status=CASE WHEN excluded.access_level='restricted' THEN 'restricted' WHEN trial_articles.access_level='restricted' AND excluded.access_level='free' THEN 'pending' ELSE trial_articles.full_status END,
        full_reason=CASE WHEN excluded.access_level='restricted' THEN 'access_restricted' WHEN trial_articles.access_level='restricted' AND excluded.access_level='free' THEN '' ELSE trial_articles.full_reason END,
        full_next_fetch_at=CASE WHEN trial_articles.access_level='restricted' AND excluded.access_level='free' THEN 0 ELSE trial_articles.full_next_fetch_at END`).bind(articleId, id, item.url, item.title, item.excerpt, item.publishedAt, collected, item.bodyText, item.imageUrl, item.imageCredit, item.accessLevel, JSON.stringify(item.categories), topic.theme, topic.subtheme, id, owner, Date.now()));
		}
		writes.push(db.prepare("DELETE FROM trial_articles WHERE source_id=? AND (collected_at<? OR id NOT IN (SELECT id FROM trial_articles WHERE source_id=? ORDER BY collected_at DESC LIMIT 200))").bind(id, (/* @__PURE__ */ new Date(now - 12096e5)).toISOString(), id));
		writes.push(db.prepare("UPDATE trial_sources SET status=?,last_success_at=?,next_fetch_at=?,etag=?,last_modified=?,last_item_count=?,reading_metadata_version=2,lease_until=0,lease_owner=NULL WHERE id=? AND lease_owner=? AND enabled=1").bind(result.status, now, now + MIN_INTERVAL, result.etag, result.modified, result.items.length, id, owner));
		writes.push(db.prepare("UPDATE trial_sources SET lease_until=0,lease_owner=NULL WHERE id=? AND lease_owner=?").bind(id, owner));
		await db.batch(writes);
		return {
			processed: true,
			status: result.status,
			count: result.items.length
		};
	} catch (error) {
		const status = error instanceof FeedError ? error.status : error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "timeout" : "network_error";
		const interval = [
			"blocked_403",
			"consent_required",
			"not_found"
		].includes(status) ? 216e5 : status === "rate_limited" ? 36e5 : MIN_INTERVAL;
		await db.prepare("UPDATE trial_sources SET status=?,next_fetch_at=?,lease_until=0,lease_owner=NULL WHERE id=? AND lease_owner=?").bind(status, now + interval, id, owner).run();
		return {
			processed: true,
			status,
			count: 0
		};
	}
}
async function scheduledCollection(db, now = Date.now()) {
	const state = await db.prepare("SELECT id FROM trial_sources WHERE enabled=1 AND next_fetch_at<=? AND lease_until<=? AND article_lease_until<=? ORDER BY next_fetch_at,id LIMIT 1").bind(now, now, now).first();
	if (state) await collectSource(db, state.id);
	else await scheduledArticles(db, now);
	await db.batch([db.prepare("DELETE FROM trial_sessions WHERE expires_at<=?").bind(now), db.prepare("DELETE FROM trial_login_limits WHERE expires_at<=?").bind(now)]);
}
// apps/worker/trial.ts
var visibleArticle = "a.access_level!='restricted' AND a.full_status!='restricted' AND (a.access_level='free' OR a.full_status IN ('available','live'))";
function articleResponse(item) {
	const categories = JSON.parse(item.publisher_categories);
	const topic = item.theme ? {
		theme: item.theme,
		subtheme: item.subtheme
	} : classifyArticle({
		...item,
		categories
	}, item.source_id);
	return {
		id: item.id,
		sourceId: item.source_id,
		url: item.url,
		title: item.title,
		excerpt: item.excerpt,
		publishedAt: item.published_at,
		collectedAt: item.collected_at,
		imageUrl: item.image_url,
		imageCredit: item.image_credit,
		accessLevel: item.full_status === "restricted" ? "restricted" : item.access_level,
		publisherCategories: categories,
		fullTextStatus: item.access_level === "restricted" ? "restricted" : item.full_status,
		...topic
	};
}
async function readArticle(c) {
	const row = await c.env.DB.prepare(`SELECT a.* FROM trial_articles a JOIN trial_sources s ON s.id=a.source_id WHERE a.id=? AND s.enabled=1 AND ${visibleArticle}`).bind(c.req.param("id")).first();
	if (!row) return c.json({ error: "NOT_FOUND" }, 404);
	return c.json({
		...articleResponse(row),
		bodyText: row.access_level === "restricted" || row.full_status === "restricted" ? "" : row.full_status === "available" ? row.full_text ?? "" : row.body_text ?? "",
		contentKind: row.full_status === "available" && row.access_level !== "restricted" ? "article" : "feed",
		fullTextReason: row.full_reason || articlePolicy(row.source_id, row.access_level) || "",
		fullTextFetchedAt: row.full_fetched_at,
		fullTextNextAttemptAt: row.full_next_fetch_at
	});
}
async function workspace(c) {
	const states = await c.env.DB.prepare(`SELECT s.*, (SELECT COUNT(*) FROM trial_articles a WHERE a.source_id=s.id AND ${visibleArticle}) AS article_count FROM trial_sources s`).all();
	const rows = await c.env.DB.prepare(`SELECT * FROM (SELECT a.id,a.source_id,a.url,a.title,a.excerpt,a.published_at,a.collected_at,a.image_url,a.image_credit,a.access_level,a.publisher_categories,a.theme,a.subtheme,a.full_status,a.full_reason,a.full_fetched_at,a.full_next_fetch_at, ROW_NUMBER() OVER(PARTITION BY source_id ORDER BY COALESCE(published_at,collected_at) DESC,a.id) AS position FROM trial_articles a JOIN trial_sources s ON s.id=a.source_id WHERE s.enabled=1 AND ${visibleArticle}) WHERE position<=20 ORDER BY COALESCE(published_at,collected_at) DESC,id`).all();
	return c.json({
		sources: trialCatalog.map((source) => {
			const state = states.results.find((entry) => entry.id === source.id);
			return {
				...source,
				enabled: !!state?.enabled,
				status: state?.status ?? "pending",
				lastAttemptAt: state?.last_attempt_at ?? null,
				lastSuccessAt: state?.last_success_at ?? null,
				nextFetchAt: state?.next_fetch_at ?? 0,
				articleCount: state?.article_count ?? 0
			};
		}),
		articles: rows.results.map(articleResponse)
	});
}
async function toggleSource(c) {
	const source = trialCatalog.find((entry) => entry.id === c.req.param("id"));
	if (!source) return c.json({ error: "NOT_FOUND" }, 404);
	let enabled;
	try {
		const raw = await limitedBody(c.req.raw, 128);
		enabled = JSON.parse(raw).enabled;
	} catch {
		return c.json({ error: "INVALID_REQUEST" }, 400);
	}
	if (typeof enabled !== "boolean" || enabled && !source.feed) return c.json({ error: "SOURCE_UNAVAILABLE" }, 400);
	await c.env.DB.prepare("UPDATE trial_sources SET enabled=? WHERE id=?").bind(enabled ? 1 : 0, source.id).run();
	return c.json({ enabled });
}
async function refreshSource(c) {
	if (!trialCatalog.some((entry) => entry.id === c.req.param("id"))) return c.json({ error: "NOT_FOUND" }, 404);
	return c.json(await collectSource(c.env.DB, c.req.param("id")));
}
async function retrieveArticle(c) {
	const result = await collectArticle(c.env.DB, c.req.param("id"));
	if (result.status === "missing" || result.status === "restricted") return c.json({ error: "NOT_FOUND" }, 404);
	return c.json(result);
}
// apps/worker/index.ts
var app = new Hono();
app.use("*", secureHeaders());
app.use("/api/*", async (c, next) => {
	c.header("Cache-Control", "no-store");
	const publicGet = c.req.method === "GET" && [
		"/api/health",
		"/api/auth/providers",
		"/api/trial/session"
	].includes(c.req.path);
	const login = c.req.path === "/api/trial/login" && c.req.method === "POST";
	if (c.req.path === "/api/trial/logout" && c.req.method === "POST") {
		if (!sameOrigin(c)) return c.json({ error: "ORIGIN_REFUSED" }, 403);
		return next();
	}
	if ((c.req.path === "/api/trial/workspace" || /^\/api\/trial\/articles\/[a-f0-9]{64}(?:\/content)?$/.test(c.req.path) || c.req.path === "/api/trial/logout" || /^\/api\/trial\/sources\/[a-z0-9]+(?:\/refresh)?$/.test(c.req.path)) && await trialAuthenticated(c)) {
		if (!["GET", "HEAD"].includes(c.req.method) && !sameOrigin(c)) return c.json({ error: "ORIGIN_REFUSED" }, 403);
		return next();
	}
	if (!publicGet && !login && !c.req.path.startsWith("/api/auth/")) return c.json({ error: "UNAUTHENTICATED" }, 401);
	await next();
});
app.get("/api/health", (c) => c.json({
	status: "ok",
	version: "0.1.0"
}));
app.get("/api/auth/providers", (c) => c.json({ providers: [{
	id: "microsoft",
	name: "Microsoft / Hotmail",
	available: false
}, {
	id: "apple",
	name: "Apple",
	available: false
}] }));
app.get("/api/trial/session", async (c) => c.json({
	authenticated: await trialAuthenticated(c),
	available: !!c.env?.TEST_ACCESS_CODE && c.env.TEST_ACCESS_CODE.length >= 24
}));
app.post("/api/trial/login", loginTrial);
app.post("/api/trial/logout", logoutTrial);
app.get("/api/trial/workspace", workspace);
app.get("/api/trial/articles/:id", readArticle);
app.post("/api/trial/articles/:id/content", retrieveArticle);
app.put("/api/trial/sources/:id", toggleSource);
app.post("/api/trial/sources/:id/refresh", refreshSource);
app.all("/api/auth/*", (c) => c.json({
	error: "AUTH_NOT_CONFIGURED",
	message: "La connexion OAuth n’est pas encore configurée."
}, 503));
app.all("/api", (c) => c.json({ error: "NOT_FOUND" }, 404));
app.all("/api/*", (c) => c.json({ error: "NOT_FOUND" }, 404));
app.notFound((c) => c.json({ error: "NOT_FOUND" }, 404));
// \0virtual:cloudflare/worker-entry
var worker_entry_default = {
	fetch: app.fetch,
	async scheduled(_event, env, _ctx) {
		if (env.TEST_ACCESS_CODE && env.TEST_ACCESS_CODE.length >= 24) await scheduledCollection(env.DB);
	}
};
export { app, worker_entry_default as default };

//# sourceMappingURL=index.js.map