// \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
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
// apps/worker/feeds/parser.ts
var import_saxes = require_saxes();
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
function parseFeed(xml, source) {
	const parser = new import_saxes.SaxesParser({ xmlns: false });
	const stack = [];
	let root = "";
	let item = null;
	let itemDepth = 0;
	let seen = 0;
	const items = [];
	const append = (text) => {
		if (item && stack.length === itemDepth + 1) {
			const name = stack.at(-1);
			if ([
				"title",
				"description",
				"summary",
				"link",
				"pubdate",
				"published",
				"updated",
				"dpp:paid"
			].includes(name)) item[name] = ((item[name] ?? "") + text).slice(0, 6e3);
		}
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
			itemDepth = stack.length;
		}
		if (item && root === "feed" && name === "link" && stack.length === itemDepth + 1 && (!tag.attributes.rel || tag.attributes.rel === "alternate")) item.link = String(tag.attributes.href ?? "");
	});
	parser.on("text", append);
	parser.on("cdata", append);
	parser.on("closetag", () => {
		if (item && stack.length === itemDepth) {
			const title = plainText(item.title ?? "", 500);
			const url = articleUrl(item.link ?? "", source);
			if (title && url && item["dpp:paid"]?.trim().toLowerCase() !== "true") items.push({
				url,
				title,
				excerpt: plainText(item.description ?? item.summary ?? "", 300),
				publishedAt: publicationDate(item.pubdate ?? item.published ?? item.updated ?? "")
			});
			item = null;
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
				...state.etag ? { "If-None-Match": state.etag } : {},
				...state.last_modified ? { "If-Modified-Since": state.last_modified } : {}
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
	const items = parseFeed(xml, source).slice(0, 30);
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
	const state = await db.prepare("UPDATE trial_sources SET lease_owner=?, lease_until=?, last_attempt_at=? WHERE id=? AND enabled=1 AND next_fetch_at<=? AND lease_until<=? RETURNING id, etag, last_modified").bind(owner, now + 12e4, now, id, now, now).first();
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
			writes.push(db.prepare(`INSERT INTO trial_articles(id,source_id,url,title,excerpt,published_at,collected_at)
        SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM trial_sources WHERE id=? AND enabled=1 AND lease_owner=? AND lease_until>?)
        ON CONFLICT(source_id,url) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,published_at=COALESCE(excluded.published_at,trial_articles.published_at),collected_at=excluded.collected_at`).bind(articleId, id, item.url, item.title, item.excerpt, item.publishedAt, collected, id, owner, Date.now()));
		}
		writes.push(db.prepare("DELETE FROM trial_articles WHERE source_id=? AND (collected_at<? OR id NOT IN (SELECT id FROM trial_articles WHERE source_id=? ORDER BY collected_at DESC LIMIT 200))").bind(id, (/* @__PURE__ */ new Date(now - 12096e5)).toISOString(), id));
		writes.push(db.prepare("UPDATE trial_sources SET status=?,last_success_at=?,next_fetch_at=?,etag=?,last_modified=?,last_item_count=?,lease_until=0,lease_owner=NULL WHERE id=? AND lease_owner=? AND enabled=1").bind(result.status, now, now + MIN_INTERVAL, result.etag, result.modified, result.items.length, id, owner));
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
	const state = await db.prepare("SELECT id FROM trial_sources WHERE enabled=1 AND next_fetch_at<=? AND lease_until<=? ORDER BY next_fetch_at,id LIMIT 1").bind(now, now).first();
	if (state) await collectSource(db, state.id);
	await db.batch([db.prepare("DELETE FROM trial_sessions WHERE expires_at<=?").bind(now), db.prepare("DELETE FROM trial_login_limits WHERE expires_at<=?").bind(now)]);
}
// apps/worker/trial.ts
async function workspace(c) {
	const states = await c.env.DB.prepare("SELECT s.*, (SELECT COUNT(*) FROM trial_articles a WHERE a.source_id=s.id) AS article_count FROM trial_sources s").all();
	const rows = await c.env.DB.prepare(`SELECT * FROM (SELECT a.*, ROW_NUMBER() OVER(PARTITION BY source_id ORDER BY COALESCE(published_at,collected_at) DESC,a.id) AS position FROM trial_articles a JOIN trial_sources s ON s.id=a.source_id WHERE s.enabled=1) WHERE position<=20 ORDER BY COALESCE(published_at,collected_at) DESC,id`).all();
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
		articles: rows.results.map((item) => ({
			id: item.id,
			sourceId: item.source_id,
			url: item.url,
			title: item.title,
			excerpt: item.excerpt,
			publishedAt: item.published_at,
			collectedAt: item.collected_at
		}))
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
	if ((c.req.path === "/api/trial/workspace" || c.req.path === "/api/trial/logout" || /^\/api\/trial\/sources\/[a-z0-9]+(?:\/refresh)?$/.test(c.req.path)) && await trialAuthenticated(c)) {
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