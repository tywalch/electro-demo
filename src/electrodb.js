(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
        const { Entity } = require("./src/entity");
        const { Service } = require("./src/service");

        module.exports = { Entity, Service };

    },{"./src/entity":15,"./src/service":20}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

        'use strict';

        var punycode = require('punycode');
        var util = require('./util');

        exports.parse = urlParse;
        exports.resolve = urlResolve;
        exports.resolveObject = urlResolveObject;
        exports.format = urlFormat;

        exports.Url = Url;

        function Url() {
            this.protocol = null;
            this.slashes = null;
            this.auth = null;
            this.host = null;
            this.port = null;
            this.hostname = null;
            this.hash = null;
            this.search = null;
            this.query = null;
            this.pathname = null;
            this.path = null;
            this.href = null;
        }

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
        var protocolPattern = /^([a-z0-9.+-]+:)/i,
            portPattern = /:[0-9]*$/,

            // Special case for a simple path URL
            simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

            // RFC 2396: characters reserved for delimiting URLs.
            // We actually just auto-escape these.
            delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

            // RFC 2396: characters not allowed for various reasons.
            unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

            // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
            autoEscape = ['\''].concat(unwise),
            // Characters that are never ever allowed in a hostname.
            // Note that any invalid chars are also handled, but these
            // are the ones that are *expected* to be seen, so we fast-path
            // them.
            nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
            hostEndingChars = ['/', '?', '#'],
            hostnameMaxLen = 255,
            hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
            hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
            // protocols that can allow "unsafe" and "unwise" chars.
            unsafeProtocol = {
                'javascript': true,
                'javascript:': true
            },
            // protocols that never have a hostname.
            hostlessProtocol = {
                'javascript': true,
                'javascript:': true
            },
            // protocols that always contain a // bit.
            slashedProtocol = {
                'http': true,
                'https': true,
                'ftp': true,
                'gopher': true,
                'file': true,
                'http:': true,
                'https:': true,
                'ftp:': true,
                'gopher:': true,
                'file:': true
            },
            querystring = require('querystring');

        function urlParse(url, parseQueryString, slashesDenoteHost) {
            if (url && util.isObject(url) && url instanceof Url) return url;

            var u = new Url;
            u.parse(url, parseQueryString, slashesDenoteHost);
            return u;
        }

        Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
            if (!util.isString(url)) {
                throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
            }

            // Copy chrome, IE, opera backslash-handling behavior.
            // Back slashes before the query string get converted to forward slashes
            // See: https://code.google.com/p/chromium/issues/detail?id=25916
            var queryIndex = url.indexOf('?'),
                splitter =
                    (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
                uSplit = url.split(splitter),
                slashRegex = /\\/g;
            uSplit[0] = uSplit[0].replace(slashRegex, '/');
            url = uSplit.join(splitter);

            var rest = url;

            // trim before proceeding.
            // This is to support parse stuff like "  http://foo.com  \n"
            rest = rest.trim();

            if (!slashesDenoteHost && url.split('#').length === 1) {
                // Try fast path regexp
                var simplePath = simplePathPattern.exec(rest);
                if (simplePath) {
                    this.path = rest;
                    this.href = rest;
                    this.pathname = simplePath[1];
                    if (simplePath[2]) {
                        this.search = simplePath[2];
                        if (parseQueryString) {
                            this.query = querystring.parse(this.search.substr(1));
                        } else {
                            this.query = this.search.substr(1);
                        }
                    } else if (parseQueryString) {
                        this.search = '';
                        this.query = {};
                    }
                    return this;
                }
            }

            var proto = protocolPattern.exec(rest);
            if (proto) {
                proto = proto[0];
                var lowerProto = proto.toLowerCase();
                this.protocol = lowerProto;
                rest = rest.substr(proto.length);
            }

            // figure out if it's got a host
            // user@server is *always* interpreted as a hostname, and url
            // resolution will treat //foo/bar as host=foo,path=bar because that's
            // how the browser resolves relative URLs.
            if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
                var slashes = rest.substr(0, 2) === '//';
                if (slashes && !(proto && hostlessProtocol[proto])) {
                    rest = rest.substr(2);
                    this.slashes = true;
                }
            }

            if (!hostlessProtocol[proto] &&
                (slashes || (proto && !slashedProtocol[proto]))) {

                // there's a hostname.
                // the first instance of /, ?, ;, or # ends the host.
                //
                // If there is an @ in the hostname, then non-host chars *are* allowed
                // to the left of the last @ sign, unless some host-ending character
                // comes *before* the @-sign.
                // URLs are obnoxious.
                //
                // ex:
                // http://a@b@c/ => user:a@b host:c
                // http://a@b?@c => user:a host:c path:/?@c

                // v0.12 TODO(isaacs): This is not quite how Chrome does things.
                // Review our test case against browsers more comprehensively.

                // find the first instance of any hostEndingChars
                var hostEnd = -1;
                for (var i = 0; i < hostEndingChars.length; i++) {
                    var hec = rest.indexOf(hostEndingChars[i]);
                    if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
                        hostEnd = hec;
                }

                // at this point, either we have an explicit point where the
                // auth portion cannot go past, or the last @ char is the decider.
                var auth, atSign;
                if (hostEnd === -1) {
                    // atSign can be anywhere.
                    atSign = rest.lastIndexOf('@');
                } else {
                    // atSign must be in auth portion.
                    // http://a@b/c@d => host:b auth:a path:/c@d
                    atSign = rest.lastIndexOf('@', hostEnd);
                }

                // Now we have a portion which is definitely the auth.
                // Pull that off.
                if (atSign !== -1) {
                    auth = rest.slice(0, atSign);
                    rest = rest.slice(atSign + 1);
                    this.auth = decodeURIComponent(auth);
                }

                // the host is the remaining to the left of the first non-host char
                hostEnd = -1;
                for (var i = 0; i < nonHostChars.length; i++) {
                    var hec = rest.indexOf(nonHostChars[i]);
                    if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
                        hostEnd = hec;
                }
                // if we still have not hit it, then the entire thing is a host.
                if (hostEnd === -1)
                    hostEnd = rest.length;

                this.host = rest.slice(0, hostEnd);
                rest = rest.slice(hostEnd);

                // pull out port.
                this.parseHost();

                // we've indicated that there is a hostname,
                // so even if it's empty, it has to be present.
                this.hostname = this.hostname || '';

                // if hostname begins with [ and ends with ]
                // assume that it's an IPv6 address.
                var ipv6Hostname = this.hostname[0] === '[' &&
                    this.hostname[this.hostname.length - 1] === ']';

                // validate a little.
                if (!ipv6Hostname) {
                    var hostparts = this.hostname.split(/\./);
                    for (var i = 0, l = hostparts.length; i < l; i++) {
                        var part = hostparts[i];
                        if (!part) continue;
                        if (!part.match(hostnamePartPattern)) {
                            var newpart = '';
                            for (var j = 0, k = part.length; j < k; j++) {
                                if (part.charCodeAt(j) > 127) {
                                    // we replace non-ASCII char with a temporary placeholder
                                    // we need this to make sure size of hostname is not
                                    // broken by replacing non-ASCII by nothing
                                    newpart += 'x';
                                } else {
                                    newpart += part[j];
                                }
                            }
                            // we test again with ASCII char only
                            if (!newpart.match(hostnamePartPattern)) {
                                var validParts = hostparts.slice(0, i);
                                var notHost = hostparts.slice(i + 1);
                                var bit = part.match(hostnamePartStart);
                                if (bit) {
                                    validParts.push(bit[1]);
                                    notHost.unshift(bit[2]);
                                }
                                if (notHost.length) {
                                    rest = '/' + notHost.join('.') + rest;
                                }
                                this.hostname = validParts.join('.');
                                break;
                            }
                        }
                    }
                }

                if (this.hostname.length > hostnameMaxLen) {
                    this.hostname = '';
                } else {
                    // hostnames are always lower case.
                    this.hostname = this.hostname.toLowerCase();
                }

                if (!ipv6Hostname) {
                    // IDNA Support: Returns a punycoded representation of "domain".
                    // It only converts parts of the domain name that
                    // have non-ASCII characters, i.e. it doesn't matter if
                    // you call it with a domain that already is ASCII-only.
                    this.hostname = punycode.toASCII(this.hostname);
                }

                var p = this.port ? ':' + this.port : '';
                var h = this.hostname || '';
                this.host = h + p;
                this.href += this.host;

                // strip [ and ] from the hostname
                // the host field still retains them, though
                if (ipv6Hostname) {
                    this.hostname = this.hostname.substr(1, this.hostname.length - 2);
                    if (rest[0] !== '/') {
                        rest = '/' + rest;
                    }
                }
            }

            // now rest is set to the post-host stuff.
            // chop off any delim chars.
            if (!unsafeProtocol[lowerProto]) {

                // First, make 100% sure that any "autoEscape" chars get
                // escaped, even if encodeURIComponent doesn't think they
                // need to be.
                for (var i = 0, l = autoEscape.length; i < l; i++) {
                    var ae = autoEscape[i];
                    if (rest.indexOf(ae) === -1)
                        continue;
                    var esc = encodeURIComponent(ae);
                    if (esc === ae) {
                        esc = escape(ae);
                    }
                    rest = rest.split(ae).join(esc);
                }
            }


            // chop off from the tail first.
            var hash = rest.indexOf('#');
            if (hash !== -1) {
                // got a fragment string.
                this.hash = rest.substr(hash);
                rest = rest.slice(0, hash);
            }
            var qm = rest.indexOf('?');
            if (qm !== -1) {
                this.search = rest.substr(qm);
                this.query = rest.substr(qm + 1);
                if (parseQueryString) {
                    this.query = querystring.parse(this.query);
                }
                rest = rest.slice(0, qm);
            } else if (parseQueryString) {
                // no query string, but parseQueryString still requested
                this.search = '';
                this.query = {};
            }
            if (rest) this.pathname = rest;
            if (slashedProtocol[lowerProto] &&
                this.hostname && !this.pathname) {
                this.pathname = '/';
            }

            //to support http.request
            if (this.pathname || this.search) {
                var p = this.pathname || '';
                var s = this.search || '';
                this.path = p + s;
            }

            // finally, reconstruct the href based on what has been validated.
            this.href = this.format();
            return this;
        };

// format a parsed object into a url string
        function urlFormat(obj) {
            // ensure it's an object, and not a string url.
            // If it's an obj, this is a no-op.
            // this way, you can call url_format() on strings
            // to clean up potentially wonky urls.
            if (util.isString(obj)) obj = urlParse(obj);
            if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
            return obj.format();
        }

        Url.prototype.format = function() {
            var auth = this.auth || '';
            if (auth) {
                auth = encodeURIComponent(auth);
                auth = auth.replace(/%3A/i, ':');
                auth += '@';
            }

            var protocol = this.protocol || '',
                pathname = this.pathname || '',
                hash = this.hash || '',
                host = false,
                query = '';

            if (this.host) {
                host = auth + this.host;
            } else if (this.hostname) {
                host = auth + (this.hostname.indexOf(':') === -1 ?
                    this.hostname :
                    '[' + this.hostname + ']');
                if (this.port) {
                    host += ':' + this.port;
                }
            }

            if (this.query &&
                util.isObject(this.query) &&
                Object.keys(this.query).length) {
                query = querystring.stringify(this.query);
            }

            var search = this.search || (query && ('?' + query)) || '';

            if (protocol && protocol.substr(-1) !== ':') protocol += ':';

            // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
            // unless they had them to begin with.
            if (this.slashes ||
                (!protocol || slashedProtocol[protocol]) && host !== false) {
                host = '//' + (host || '');
                if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
            } else if (!host) {
                host = '';
            }

            if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
            if (search && search.charAt(0) !== '?') search = '?' + search;

            pathname = pathname.replace(/[?#]/g, function(match) {
                return encodeURIComponent(match);
            });
            search = search.replace('#', '%23');

            return protocol + host + pathname + search + hash;
        };

        function urlResolve(source, relative) {
            return urlParse(source, false, true).resolve(relative);
        }

        Url.prototype.resolve = function(relative) {
            return this.resolveObject(urlParse(relative, false, true)).format();
        };

        function urlResolveObject(source, relative) {
            if (!source) return relative;
            return urlParse(source, false, true).resolveObject(relative);
        }

        Url.prototype.resolveObject = function(relative) {
            if (util.isString(relative)) {
                var rel = new Url();
                rel.parse(relative, false, true);
                relative = rel;
            }

            var result = new Url();
            var tkeys = Object.keys(this);
            for (var tk = 0; tk < tkeys.length; tk++) {
                var tkey = tkeys[tk];
                result[tkey] = this[tkey];
            }

            // hash is always overridden, no matter what.
            // even href="" will remove it.
            result.hash = relative.hash;

            // if the relative url is empty, then there's nothing left to do here.
            if (relative.href === '') {
                result.href = result.format();
                return result;
            }

            // hrefs like //foo/bar always cut to the protocol.
            if (relative.slashes && !relative.protocol) {
                // take everything except the protocol from relative
                var rkeys = Object.keys(relative);
                for (var rk = 0; rk < rkeys.length; rk++) {
                    var rkey = rkeys[rk];
                    if (rkey !== 'protocol')
                        result[rkey] = relative[rkey];
                }

                //urlParse appends trailing / to urls like http://www.example.com
                if (slashedProtocol[result.protocol] &&
                    result.hostname && !result.pathname) {
                    result.path = result.pathname = '/';
                }

                result.href = result.format();
                return result;
            }

            if (relative.protocol && relative.protocol !== result.protocol) {
                // if it's a known url protocol, then changing
                // the protocol does weird things
                // first, if it's not file:, then we MUST have a host,
                // and if there was a path
                // to begin with, then we MUST have a path.
                // if it is file:, then the host is dropped,
                // because that's known to be hostless.
                // anything else is assumed to be absolute.
                if (!slashedProtocol[relative.protocol]) {
                    var keys = Object.keys(relative);
                    for (var v = 0; v < keys.length; v++) {
                        var k = keys[v];
                        result[k] = relative[k];
                    }
                    result.href = result.format();
                    return result;
                }

                result.protocol = relative.protocol;
                if (!relative.host && !hostlessProtocol[relative.protocol]) {
                    var relPath = (relative.pathname || '').split('/');
                    while (relPath.length && !(relative.host = relPath.shift()));
                    if (!relative.host) relative.host = '';
                    if (!relative.hostname) relative.hostname = '';
                    if (relPath[0] !== '') relPath.unshift('');
                    if (relPath.length < 2) relPath.unshift('');
                    result.pathname = relPath.join('/');
                } else {
                    result.pathname = relative.pathname;
                }
                result.search = relative.search;
                result.query = relative.query;
                result.host = relative.host || '';
                result.auth = relative.auth;
                result.hostname = relative.hostname || relative.host;
                result.port = relative.port;
                // to support http.request
                if (result.pathname || result.search) {
                    var p = result.pathname || '';
                    var s = result.search || '';
                    result.path = p + s;
                }
                result.slashes = result.slashes || relative.slashes;
                result.href = result.format();
                return result;
            }

            var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
                isRelAbs = (
                    relative.host ||
                    relative.pathname && relative.pathname.charAt(0) === '/'
                ),
                mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
                removeAllDots = mustEndAbs,
                srcPath = result.pathname && result.pathname.split('/') || [],
                relPath = relative.pathname && relative.pathname.split('/') || [],
                psychotic = result.protocol && !slashedProtocol[result.protocol];

            // if the url is a non-slashed url, then relative
            // links like ../.. should be able
            // to crawl up to the hostname, as well.  This is strange.
            // result.protocol has already been set by now.
            // Later on, put the first path part into the host field.
            if (psychotic) {
                result.hostname = '';
                result.port = null;
                if (result.host) {
                    if (srcPath[0] === '') srcPath[0] = result.host;
                    else srcPath.unshift(result.host);
                }
                result.host = '';
                if (relative.protocol) {
                    relative.hostname = null;
                    relative.port = null;
                    if (relative.host) {
                        if (relPath[0] === '') relPath[0] = relative.host;
                        else relPath.unshift(relative.host);
                    }
                    relative.host = null;
                }
                mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
            }

            if (isRelAbs) {
                // it's absolute.
                result.host = (relative.host || relative.host === '') ?
                    relative.host : result.host;
                result.hostname = (relative.hostname || relative.hostname === '') ?
                    relative.hostname : result.hostname;
                result.search = relative.search;
                result.query = relative.query;
                srcPath = relPath;
                // fall through to the dot-handling below.
            } else if (relPath.length) {
                // it's relative
                // throw away the existing file, and take the new path instead.
                if (!srcPath) srcPath = [];
                srcPath.pop();
                srcPath = srcPath.concat(relPath);
                result.search = relative.search;
                result.query = relative.query;
            } else if (!util.isNullOrUndefined(relative.search)) {
                // just pull out the search.
                // like href='?foo'.
                // Put this after the other two cases because it simplifies the booleans
                if (psychotic) {
                    result.hostname = result.host = srcPath.shift();
                    //occationaly the auth can get stuck only in host
                    //this especially happens in cases like
                    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
                    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                        result.host.split('@') : false;
                    if (authInHost) {
                        result.auth = authInHost.shift();
                        result.host = result.hostname = authInHost.shift();
                    }
                }
                result.search = relative.search;
                result.query = relative.query;
                //to support http.request
                if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
                    result.path = (result.pathname ? result.pathname : '') +
                        (result.search ? result.search : '');
                }
                result.href = result.format();
                return result;
            }

            if (!srcPath.length) {
                // no path at all.  easy.
                // we've already handled the other stuff above.
                result.pathname = null;
                //to support http.request
                if (result.search) {
                    result.path = '/' + result.search;
                } else {
                    result.path = null;
                }
                result.href = result.format();
                return result;
            }

            // if a url ENDs in . or .., then it must get a trailing slash.
            // however, if it ends in anything else non-slashy,
            // then it must NOT get a trailing slash.
            var last = srcPath.slice(-1)[0];
            var hasTrailingSlash = (
                (result.host || relative.host || srcPath.length > 1) &&
                (last === '.' || last === '..') || last === '');

            // strip single dots, resolve double dots to parent dir
            // if the path tries to go above the root, `up` ends up > 0
            var up = 0;
            for (var i = srcPath.length; i >= 0; i--) {
                last = srcPath[i];
                if (last === '.') {
                    srcPath.splice(i, 1);
                } else if (last === '..') {
                    srcPath.splice(i, 1);
                    up++;
                } else if (up) {
                    srcPath.splice(i, 1);
                    up--;
                }
            }

            // if the path is allowed to go above the root, restore leading ..s
            if (!mustEndAbs && !removeAllDots) {
                for (; up--; up) {
                    srcPath.unshift('..');
                }
            }

            if (mustEndAbs && srcPath[0] !== '' &&
                (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
                srcPath.unshift('');
            }

            if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
                srcPath.push('');
            }

            var isAbsolute = srcPath[0] === '' ||
                (srcPath[0] && srcPath[0].charAt(0) === '/');

            // put the host back
            if (psychotic) {
                result.hostname = result.host = isAbsolute ? '' :
                    srcPath.length ? srcPath.shift() : '';
                //occationaly the auth can get stuck only in host
                //this especially happens in cases like
                //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
                var authInHost = result.host && result.host.indexOf('@') > 0 ?
                    result.host.split('@') : false;
                if (authInHost) {
                    result.auth = authInHost.shift();
                    result.host = result.hostname = authInHost.shift();
                }
            }

            mustEndAbs = mustEndAbs || (result.host && srcPath.length);

            if (mustEndAbs && !isAbsolute) {
                srcPath.unshift('');
            }

            if (!srcPath.length) {
                result.pathname = null;
                result.path = null;
            } else {
                result.pathname = srcPath.join('/');
            }

            //to support request.http
            if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
                result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
            }
            result.auth = relative.auth || result.auth;
            result.slashes = result.slashes || relative.slashes;
            result.href = result.format();
            return result;
        };

        Url.prototype.parseHost = function() {
            var host = this.host;
            var port = portPattern.exec(host);
            if (port) {
                port = port[0];
                if (port !== ':') {
                    this.port = port.substr(1);
                }
                host = host.substr(0, host.length - port.length);
            }
            if (host) this.hostname = host;
        };

    },{"./util":3,"punycode":9,"querystring":12}],3:[function(require,module,exports){
        'use strict';

        module.exports = {
            isString: function(arg) {
                return typeof(arg) === 'string';
            },
            isObject: function(arg) {
                return typeof(arg) === 'object' && arg !== null;
            },
            isNull: function(arg) {
                return arg === null;
            },
            isNullOrUndefined: function(arg) {
                return arg == null;
            }
        };

    },{}],4:[function(require,module,exports){
        'use strict';

        var helpers = require('./helpers');

        /** @type ValidatorResult */
        var ValidatorResult = helpers.ValidatorResult;
        /** @type SchemaError */
        var SchemaError = helpers.SchemaError;

        var attribute = {};

        attribute.ignoreProperties = {
            // informative properties
            'id': true,
            'default': true,
            'description': true,
            'title': true,
            // arguments to other properties
            'exclusiveMinimum': true,
            'exclusiveMaximum': true,
            'additionalItems': true,
            // special-handled properties
            '$schema': true,
            '$ref': true,
            'extends': true,
        };

        /**
         * @name validators
         */
        var validators = attribute.validators = {};

        /**
         * Validates whether the instance if of a certain type
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @return {ValidatorResult|null}
         */
        validators.type = function validateType (instance, schema, options, ctx) {
            // Ignore undefined instances
            if (instance === undefined) {
                return null;
            }
            var result = new ValidatorResult(instance, schema, options, ctx);
            var types = Array.isArray(schema.type) ? schema.type : [schema.type];
            if (!types.some(this.testType.bind(this, instance, schema, options, ctx))) {
                var list = types.map(function (v) {
                    return v.id && ('<' + v.id + '>') || (v+'');
                });
                result.addError({
                    name: 'type',
                    argument: list,
                    message: "is not of a type(s) " + list,
                });
            }
            return result;
        };

        function testSchemaNoThrow(instance, options, ctx, callback, schema){
            var throwError = options.throwError;
            options.throwError = false;
            var res = this.validateSchema(instance, schema, options, ctx);
            options.throwError = throwError;

            if (!res.valid && callback instanceof Function) {
                callback(res);
            }
            return res.valid;
        }

        /**
         * Validates whether the instance matches some of the given schemas
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @return {ValidatorResult|null}
         */
        validators.anyOf = function validateAnyOf (instance, schema, options, ctx) {
            // Ignore undefined instances
            if (instance === undefined) {
                return null;
            }
            var result = new ValidatorResult(instance, schema, options, ctx);
            var inner = new ValidatorResult(instance, schema, options, ctx);
            if (!Array.isArray(schema.anyOf)){
                throw new SchemaError("anyOf must be an array");
            }
            if (!schema.anyOf.some(
                testSchemaNoThrow.bind(
                    this, instance, options, ctx, function(res){inner.importErrors(res);}
                ))) {
                var list = schema.anyOf.map(function (v, i) {
                    return (v.id && ('<' + v.id + '>')) || (v.title && JSON.stringify(v.title)) || (v['$ref'] && ('<' + v['$ref'] + '>')) || '[subschema '+i+']';
                });
                if (options.nestedErrors) {
                    result.importErrors(inner);
                }
                result.addError({
                    name: 'anyOf',
                    argument: list,
                    message: "is not any of " + list.join(','),
                });
            }
            return result;
        };

        /**
         * Validates whether the instance matches every given schema
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @return {String|null}
         */
        validators.allOf = function validateAllOf (instance, schema, options, ctx) {
            // Ignore undefined instances
            if (instance === undefined) {
                return null;
            }
            if (!Array.isArray(schema.allOf)){
                throw new SchemaError("allOf must be an array");
            }
            var result = new ValidatorResult(instance, schema, options, ctx);
            var self = this;
            schema.allOf.forEach(function(v, i){
                var valid = self.validateSchema(instance, v, options, ctx);
                if(!valid.valid){
                    var msg = (v.id && ('<' + v.id + '>')) || (v.title && JSON.stringify(v.title)) || (v['$ref'] && ('<' + v['$ref'] + '>')) || '[subschema '+i+']';
                    result.addError({
                        name: 'allOf',
                        argument: { id: msg, length: valid.errors.length, valid: valid },
                        message: 'does not match allOf schema ' + msg + ' with ' + valid.errors.length + ' error[s]:',
                    });
                    result.importErrors(valid);
                }
            });
            return result;
        };

        /**
         * Validates whether the instance matches exactly one of the given schemas
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @return {String|null}
         */
        validators.oneOf = function validateOneOf (instance, schema, options, ctx) {
            // Ignore undefined instances
            if (instance === undefined) {
                return null;
            }
            if (!Array.isArray(schema.oneOf)){
                throw new SchemaError("oneOf must be an array");
            }
            var result = new ValidatorResult(instance, schema, options, ctx);
            var inner = new ValidatorResult(instance, schema, options, ctx);
            var count = schema.oneOf.filter(
                testSchemaNoThrow.bind(
                    this, instance, options, ctx, function(res) {inner.importErrors(res);}
                ) ).length;
            var list = schema.oneOf.map(function (v, i) {
                return (v.id && ('<' + v.id + '>')) || (v.title && JSON.stringify(v.title)) || (v['$ref'] && ('<' + v['$ref'] + '>')) || '[subschema '+i+']';
            });
            if (count!==1) {
                if (options.nestedErrors) {
                    result.importErrors(inner);
                }
                result.addError({
                    name: 'oneOf',
                    argument: list,
                    message: "is not exactly one from " + list.join(','),
                });
            }
            return result;
        };

        /**
         * Validates properties
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @return {String|null|ValidatorResult}
         */
        validators.properties = function validateProperties (instance, schema, options, ctx) {
            if(!this.types.object(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            var properties = schema.properties || {};
            for (var property in properties) {
                if (typeof options.preValidateProperty == 'function') {
                    options.preValidateProperty(instance, property, properties[property], options, ctx);
                }

                var prop = Object.hasOwnProperty.call(instance, property) ? instance[property] : undefined;
                var res = this.validateSchema(prop, properties[property], options, ctx.makeChild(properties[property], property));
                if(res.instance !== result.instance[property]) result.instance[property] = res.instance;
                result.importErrors(res);
            }
            return result;
        };

        /**
         * Test a specific property within in instance against the additionalProperties schema attribute
         * This ignores properties with definitions in the properties schema attribute, but no other attributes.
         * If too many more types of property-existance tests pop up they may need their own class of tests (like `type` has)
         * @private
         * @return {boolean}
         */
        function testAdditionalProperty (instance, schema, options, ctx, property, result) {
            if(!this.types.object(instance)) return;
            if (schema.properties && schema.properties[property] !== undefined) {
                return;
            }
            if (schema.additionalProperties === false) {
                result.addError({
                    name: 'additionalProperties',
                    argument: property,
                    message: "additionalProperty " + JSON.stringify(property) + " exists in instance when not allowed",
                });
            } else {
                var additionalProperties = schema.additionalProperties || {};

                if (typeof options.preValidateProperty == 'function') {
                    options.preValidateProperty(instance, property, additionalProperties, options, ctx);
                }

                var res = this.validateSchema(instance[property], additionalProperties, options, ctx.makeChild(additionalProperties, property));
                if(res.instance !== result.instance[property]) result.instance[property] = res.instance;
                result.importErrors(res);
            }
        }

        /**
         * Validates patternProperties
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @return {String|null|ValidatorResult}
         */
        validators.patternProperties = function validatePatternProperties (instance, schema, options, ctx) {
            if(!this.types.object(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            var patternProperties = schema.patternProperties || {};

            for (var property in instance) {
                var test = true;
                for (var pattern in patternProperties) {
                    var expr = new RegExp(pattern, 'u');
                    if (!expr.test(property)) {
                        continue;
                    }
                    test = false;

                    if (typeof options.preValidateProperty == 'function') {
                        options.preValidateProperty(instance, property, patternProperties[pattern], options, ctx);
                    }

                    var res = this.validateSchema(instance[property], patternProperties[pattern], options, ctx.makeChild(patternProperties[pattern], property));
                    if(res.instance !== result.instance[property]) result.instance[property] = res.instance;
                    result.importErrors(res);
                }
                if (test) {
                    testAdditionalProperty.call(this, instance, schema, options, ctx, property, result);
                }
            }

            return result;
        };

        /**
         * Validates additionalProperties
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @return {String|null|ValidatorResult}
         */
        validators.additionalProperties = function validateAdditionalProperties (instance, schema, options, ctx) {
            if(!this.types.object(instance)) return;
            // if patternProperties is defined then we'll test when that one is called instead
            if (schema.patternProperties) {
                return null;
            }
            var result = new ValidatorResult(instance, schema, options, ctx);
            for (var property in instance) {
                testAdditionalProperty.call(this, instance, schema, options, ctx, property, result);
            }
            return result;
        };

        /**
         * Validates whether the instance value is at least of a certain length, when the instance value is a string.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.minProperties = function validateMinProperties (instance, schema, options, ctx) {
            if (!this.types.object(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            var keys = Object.keys(instance);
            if (!(keys.length >= schema.minProperties)) {
                result.addError({
                    name: 'minProperties',
                    argument: schema.minProperties,
                    message: "does not meet minimum property length of " + schema.minProperties,
                });
            }
            return result;
        };

        /**
         * Validates whether the instance value is at most of a certain length, when the instance value is a string.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.maxProperties = function validateMaxProperties (instance, schema, options, ctx) {
            if (!this.types.object(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            var keys = Object.keys(instance);
            if (!(keys.length <= schema.maxProperties)) {
                result.addError({
                    name: 'maxProperties',
                    argument: schema.maxProperties,
                    message: "does not meet maximum property length of " + schema.maxProperties,
                });
            }
            return result;
        };

        /**
         * Validates items when instance is an array
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @return {String|null|ValidatorResult}
         */
        validators.items = function validateItems (instance, schema, options, ctx) {
            var self = this;
            if (!this.types.array(instance)) return;
            if (!schema.items) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            instance.every(function (value, i) {
                var items = Array.isArray(schema.items) ? (schema.items[i] || schema.additionalItems) : schema.items;
                if (items === undefined) {
                    return true;
                }
                if (items === false) {
                    result.addError({
                        name: 'items',
                        message: "additionalItems not permitted",
                    });
                    return false;
                }
                var res = self.validateSchema(value, items, options, ctx.makeChild(items, i));
                if(res.instance !== result.instance[i]) result.instance[i] = res.instance;
                result.importErrors(res);
                return true;
            });
            return result;
        };

        /**
         * Validates minimum and exclusiveMinimum when the type of the instance value is a number.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.minimum = function validateMinimum (instance, schema, options, ctx) {
            if (!this.types.number(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            var valid = true;
            if (schema.exclusiveMinimum && schema.exclusiveMinimum === true) {
                valid = instance > schema.minimum;
            } else {
                valid = instance >= schema.minimum;
            }
            if (!valid) {
                result.addError({
                    name: 'minimum',
                    argument: schema.minimum,
                    message: "must have a minimum value of " + schema.minimum,
                });
            }
            return result;
        };

        /**
         * Validates maximum and exclusiveMaximum when the type of the instance value is a number.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.maximum = function validateMaximum (instance, schema, options, ctx) {
            if (!this.types.number(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            var valid;
            if (schema.exclusiveMaximum && schema.exclusiveMaximum === true) {
                valid = instance < schema.maximum;
            } else {
                valid = instance <= schema.maximum;
            }
            if (!valid) {
                result.addError({
                    name: 'maximum',
                    argument: schema.maximum,
                    message: "must have a maximum value of " + schema.maximum,
                });
            }
            return result;
        };

        /**
         * Perform validation for multipleOf and divisibleBy, which are essentially the same.
         * @param instance
         * @param schema
         * @param validationType
         * @param errorMessage
         * @returns {String|null}
         */
        var validateMultipleOfOrDivisbleBy = function validateMultipleOfOrDivisbleBy (instance, schema, options, ctx, validationType, errorMessage) {
            if (!this.types.number(instance)) return;

            var validationArgument = schema[validationType];
            if (validationArgument == 0) {
                throw new SchemaError(validationType + " cannot be zero");
            }

            var result = new ValidatorResult(instance, schema, options, ctx);

            var instanceDecimals = helpers.getDecimalPlaces(instance);
            var divisorDecimals = helpers.getDecimalPlaces(validationArgument);

            var maxDecimals = Math.max(instanceDecimals , divisorDecimals);
            var multiplier = Math.pow(10, maxDecimals);

            if (Math.round(instance * multiplier) % Math.round(validationArgument * multiplier) !== 0) {
                result.addError({
                    name: validationType,
                    argument:  validationArgument,
                    message: errorMessage + JSON.stringify(validationArgument),
                });
            }

            return result;
        };

        /**
         * Validates divisibleBy when the type of the instance value is a number.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.multipleOf = function validateMultipleOf (instance, schema, options, ctx) {
            return validateMultipleOfOrDivisbleBy.call(this, instance, schema, options, ctx, "multipleOf", "is not a multiple of (divisible by) ");
        };

        /**
         * Validates multipleOf when the type of the instance value is a number.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.divisibleBy = function validateDivisibleBy (instance, schema, options, ctx) {
            return validateMultipleOfOrDivisbleBy.call(this, instance, schema, options, ctx, "divisibleBy", "is not divisible by (multiple of) ");
        };

        /**
         * Validates whether the instance value is present.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.required = function validateRequired (instance, schema, options, ctx) {
            var result = new ValidatorResult(instance, schema, options, ctx);
            if (instance === undefined && schema.required === true) {
                // A boolean form is implemented for reverse-compatability with schemas written against older drafts
                result.addError({
                    name: 'required',
                    message: "is required",
                });
            } else if (this.types.object(instance) && Array.isArray(schema.required)) {
                schema.required.forEach(function(n){
                    if(instance[n]===undefined){
                        result.addError({
                            name: 'required',
                            argument: n,
                            message: "requires property " + JSON.stringify(n),
                        });
                    }
                });
            }
            return result;
        };

        /**
         * Validates whether the instance value matches the regular expression, when the instance value is a string.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.pattern = function validatePattern (instance, schema, options, ctx) {
            if (!this.types.string(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            var regexp = new RegExp(schema.pattern, 'u');
            if (!instance.match(regexp)) {
                result.addError({
                    name: 'pattern',
                    argument: schema.pattern,
                    message: "does not match pattern " + JSON.stringify(schema.pattern.toString()),
                });
            }
            return result;
        };

        /**
         * Validates whether the instance value is of a certain defined format or a custom
         * format.
         * The following formats are supported for string types:
         *   - date-time
         *   - date
         *   - time
         *   - ip-address
         *   - ipv6
         *   - uri
         *   - color
         *   - host-name
         *   - alpha
         *   - alpha-numeric
         *   - utc-millisec
         * @param instance
         * @param schema
         * @param [options]
         * @param [ctx]
         * @return {String|null}
         */
        validators.format = function validateFormat (instance, schema, options, ctx) {
            if (instance===undefined) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            if (!result.disableFormat && !helpers.isFormat(instance, schema.format, this)) {
                result.addError({
                    name: 'format',
                    argument: schema.format,
                    message: "does not conform to the " + JSON.stringify(schema.format) + " format",
                });
            }
            return result;
        };

        /**
         * Validates whether the instance value is at least of a certain length, when the instance value is a string.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.minLength = function validateMinLength (instance, schema, options, ctx) {
            if (!this.types.string(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            var hsp = instance.match(/[\uDC00-\uDFFF]/g);
            var length = instance.length - (hsp ? hsp.length : 0);
            if (!(length >= schema.minLength)) {
                result.addError({
                    name: 'minLength',
                    argument: schema.minLength,
                    message: "does not meet minimum length of " + schema.minLength,
                });
            }
            return result;
        };

        /**
         * Validates whether the instance value is at most of a certain length, when the instance value is a string.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.maxLength = function validateMaxLength (instance, schema, options, ctx) {
            if (!this.types.string(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            // TODO if this was already computed in "minLength", use that value instead of re-computing
            var hsp = instance.match(/[\uDC00-\uDFFF]/g);
            var length = instance.length - (hsp ? hsp.length : 0);
            if (!(length <= schema.maxLength)) {
                result.addError({
                    name: 'maxLength',
                    argument: schema.maxLength,
                    message: "does not meet maximum length of " + schema.maxLength,
                });
            }
            return result;
        };

        /**
         * Validates whether instance contains at least a minimum number of items, when the instance is an Array.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.minItems = function validateMinItems (instance, schema, options, ctx) {
            if (!this.types.array(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            if (!(instance.length >= schema.minItems)) {
                result.addError({
                    name: 'minItems',
                    argument: schema.minItems,
                    message: "does not meet minimum length of " + schema.minItems,
                });
            }
            return result;
        };

        /**
         * Validates whether instance contains no more than a maximum number of items, when the instance is an Array.
         * @param instance
         * @param schema
         * @return {String|null}
         */
        validators.maxItems = function validateMaxItems (instance, schema, options, ctx) {
            if (!this.types.array(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            if (!(instance.length <= schema.maxItems)) {
                result.addError({
                    name: 'maxItems',
                    argument: schema.maxItems,
                    message: "does not meet maximum length of " + schema.maxItems,
                });
            }
            return result;
        };

        /**
         * Deep compares arrays for duplicates
         * @param v
         * @param i
         * @param a
         * @private
         * @return {boolean}
         */
        function testArrays (v, i, a) {
            var j, len = a.length;
            for (j = i + 1, len; j < len; j++) {
                if (helpers.deepCompareStrict(v, a[j])) {
                    return false;
                }
            }
            return true;
        }

        /**
         * Validates whether there are no duplicates, when the instance is an Array.
         * @param instance
         * @return {String|null}
         */
        validators.uniqueItems = function validateUniqueItems (instance, schema, options, ctx) {
            if (schema.uniqueItems!==true) return;
            if (!this.types.array(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            if (!instance.every(testArrays)) {
                result.addError({
                    name: 'uniqueItems',
                    message: "contains duplicate item",
                });
            }
            return result;
        };

        /**
         * Validate for the presence of dependency properties, if the instance is an object.
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @return {null|ValidatorResult}
         */
        validators.dependencies = function validateDependencies (instance, schema, options, ctx) {
            if (!this.types.object(instance)) return;
            var result = new ValidatorResult(instance, schema, options, ctx);
            for (var property in schema.dependencies) {
                if (instance[property] === undefined) {
                    continue;
                }
                var dep = schema.dependencies[property];
                var childContext = ctx.makeChild(dep, property);
                if (typeof dep == 'string') {
                    dep = [dep];
                }
                if (Array.isArray(dep)) {
                    dep.forEach(function (prop) {
                        if (instance[prop] === undefined) {
                            result.addError({
                                // FIXME there's two different "dependencies" errors here with slightly different outputs
                                // Can we make these the same? Or should we create different error types?
                                name: 'dependencies',
                                argument: childContext.propertyPath,
                                message: "property " + prop + " not found, required by " + childContext.propertyPath,
                            });
                        }
                    });
                } else {
                    var res = this.validateSchema(instance, dep, options, childContext);
                    if(result.instance !== res.instance) result.instance = res.instance;
                    if (res && res.errors.length) {
                        result.addError({
                            name: 'dependencies',
                            argument: childContext.propertyPath,
                            message: "does not meet dependency required by " + childContext.propertyPath,
                        });
                        result.importErrors(res);
                    }
                }
            }
            return result;
        };

        /**
         * Validates whether the instance value is one of the enumerated values.
         *
         * @param instance
         * @param schema
         * @return {ValidatorResult|null}
         */
        validators['enum'] = function validateEnum (instance, schema, options, ctx) {
            if (instance === undefined) {
                return null;
            }
            if (!Array.isArray(schema['enum'])) {
                throw new SchemaError("enum expects an array", schema);
            }
            var result = new ValidatorResult(instance, schema, options, ctx);
            if (!schema['enum'].some(helpers.deepCompareStrict.bind(null, instance))) {
                result.addError({
                    name: 'enum',
                    argument: schema['enum'],
                    message: "is not one of enum values: " + schema['enum'].map(String).join(','),
                });
            }
            return result;
        };

        /**
         * Validates whether the instance exactly matches a given value
         *
         * @param instance
         * @param schema
         * @return {ValidatorResult|null}
         */
        validators['const'] = function validateEnum (instance, schema, options, ctx) {
            if (instance === undefined) {
                return null;
            }
            var result = new ValidatorResult(instance, schema, options, ctx);
            if (!helpers.deepCompareStrict(schema['const'], instance)) {
                result.addError({
                    name: 'const',
                    argument: schema['const'],
                    message: "does not exactly match expected constant: " + schema['const'],
                });
            }
            return result;
        };

        /**
         * Validates whether the instance if of a prohibited type.
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @return {null|ValidatorResult}
         */
        validators.not = validators.disallow = function validateNot (instance, schema, options, ctx) {
            var self = this;
            if(instance===undefined) return null;
            var result = new ValidatorResult(instance, schema, options, ctx);
            var notTypes = schema.not || schema.disallow;
            if(!notTypes) return null;
            if(!Array.isArray(notTypes)) notTypes=[notTypes];
            notTypes.forEach(function (type) {
                if (self.testType(instance, schema, options, ctx, type)) {
                    var schemaId = type && type.id && ('<' + type.id + '>') || type;
                    result.addError({
                        name: 'not',
                        argument: schemaId,
                        message: "is of prohibited type " + schemaId,
                    });
                }
            });
            return result;
        };

        module.exports = attribute;

    },{"./helpers":5}],5:[function(require,module,exports){
        'use strict';

        var uri = require('url');

        var ValidationError = exports.ValidationError = function ValidationError (message, instance, schema, propertyPath, name, argument) {
            if (propertyPath) {
                this.property = propertyPath;
            }
            if (message) {
                this.message = message;
            }
            if (schema) {
                if (schema.id) {
                    this.schema = schema.id;
                } else {
                    this.schema = schema;
                }
            }
            if (instance !== undefined) {
                this.instance = instance;
            }
            this.name = name;
            this.argument = argument;
            this.stack = this.toString();
        };

        ValidationError.prototype.toString = function toString() {
            return this.property + ' ' + this.message;
        };

        var ValidatorResult = exports.ValidatorResult = function ValidatorResult(instance, schema, options, ctx) {
            this.instance = instance;
            this.schema = schema;
            this.propertyPath = ctx.propertyPath;
            this.errors = [];
            this.throwError = options && options.throwError;
            this.disableFormat = options && options.disableFormat === true;
        };

        ValidatorResult.prototype.addError = function addError(detail) {
            var err;
            if (typeof detail == 'string') {
                err = new ValidationError(detail, this.instance, this.schema, this.propertyPath);
            } else {
                if (!detail) throw new Error('Missing error detail');
                if (!detail.message) throw new Error('Missing error message');
                if (!detail.name) throw new Error('Missing validator type');
                err = new ValidationError(detail.message, this.instance, this.schema, this.propertyPath, detail.name, detail.argument);
            }

            if (this.throwError) {
                throw err;
            }
            this.errors.push(err);
            return err;
        };

        ValidatorResult.prototype.importErrors = function importErrors(res) {
            if (typeof res == 'string' || (res && res.validatorType)) {
                this.addError(res);
            } else if (res && res.errors) {
                Array.prototype.push.apply(this.errors, res.errors);
            }
        };

        function stringizer (v,i){
            return i+': '+v.toString()+'\n';
        }
        ValidatorResult.prototype.toString = function toString(res) {
            return this.errors.map(stringizer).join('');
        };

        Object.defineProperty(ValidatorResult.prototype, "valid", { get: function() {
                return !this.errors.length;
            } });

        /**
         * Describes a problem with a Schema which prevents validation of an instance
         * @name SchemaError
         * @constructor
         */
        var SchemaError = exports.SchemaError = function SchemaError (msg, schema) {
            this.message = msg;
            this.schema = schema;
            Error.call(this, msg);
            Error.captureStackTrace(this, SchemaError);
        };
        SchemaError.prototype = Object.create(Error.prototype,
            {
                constructor: {value: SchemaError, enumerable: false},
                name: {value: 'SchemaError', enumerable: false},
            });

        var SchemaContext = exports.SchemaContext = function SchemaContext (schema, options, propertyPath, base, schemas) {
            this.schema = schema;
            this.options = options;
            this.propertyPath = propertyPath;
            this.base = base;
            this.schemas = schemas;
        };

        SchemaContext.prototype.resolve = function resolve (target) {
            return uri.resolve(this.base, target);
        };

        SchemaContext.prototype.makeChild = function makeChild(schema, propertyName){
            var propertyPath = (propertyName===undefined) ? this.propertyPath : this.propertyPath+makeSuffix(propertyName);
            var base = uri.resolve(this.base, schema.id||'');
            var ctx = new SchemaContext(schema, this.options, propertyPath, base, Object.create(this.schemas));
            if(schema.id && !ctx.schemas[base]){
                ctx.schemas[base] = schema;
            }
            return ctx;
        };

        var FORMAT_REGEXPS = exports.FORMAT_REGEXPS = {
            'date-time': /^\d{4}-(?:0[0-9]{1}|1[0-2]{1})-(3[01]|0[1-9]|[12][0-9])[tT ](2[0-4]|[01][0-9]):([0-5][0-9]):(60|[0-5][0-9])(\.\d+)?([zZ]|[+-]([0-5][0-9]):(60|[0-5][0-9]))$/,
            'date': /^\d{4}-(?:0[0-9]{1}|1[0-2]{1})-(3[01]|0[1-9]|[12][0-9])$/,
            'time': /^(2[0-4]|[01][0-9]):([0-5][0-9]):(60|[0-5][0-9])$/,

            'email': /^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/,
            'ip-address': /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
            'ipv6': /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/,
            'uri': /^[a-zA-Z][a-zA-Z0-9+-.]*:[^\s]*$/,

            'color': /^(#?([0-9A-Fa-f]{3}){1,2}\b|aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow|(rgb\(\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*,\s*\b([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\b\s*\))|(rgb\(\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*,\s*(\d?\d%|100%)+\s*\)))$/,

            // hostname regex from: http://stackoverflow.com/a/1420225/5628
            'hostname': /^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/,
            'host-name': /^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|-){0,61}[0-9A-Za-z])?)*\.?$/,

            'alpha': /^[a-zA-Z]+$/,
            'alphanumeric': /^[a-zA-Z0-9]+$/,
            'utc-millisec': function (input) {
                return (typeof input === 'string') && parseFloat(input) === parseInt(input, 10) && !isNaN(input);
            },
            'regex': function (input) {
                var result = true;
                try {
                    new RegExp(input);
                } catch (e) {
                    result = false;
                }
                return result;
            },
            'style': /\s*(.+?):\s*([^;]+);?/,
            'phone': /^\+(?:[0-9] ?){6,14}[0-9]$/,
        };

        FORMAT_REGEXPS.regexp = FORMAT_REGEXPS.regex;
        FORMAT_REGEXPS.pattern = FORMAT_REGEXPS.regex;
        FORMAT_REGEXPS.ipv4 = FORMAT_REGEXPS['ip-address'];

        exports.isFormat = function isFormat (input, format, validator) {
            if (typeof input === 'string' && FORMAT_REGEXPS[format] !== undefined) {
                if (FORMAT_REGEXPS[format] instanceof RegExp) {
                    return FORMAT_REGEXPS[format].test(input);
                }
                if (typeof FORMAT_REGEXPS[format] === 'function') {
                    return FORMAT_REGEXPS[format](input);
                }
            } else if (validator && validator.customFormats &&
                typeof validator.customFormats[format] === 'function') {
                return validator.customFormats[format](input);
            }
            return true;
        };

        var makeSuffix = exports.makeSuffix = function makeSuffix (key) {
            key = key.toString();
            // This function could be capable of outputting valid a ECMAScript string, but the
            // resulting code for testing which form to use would be tens of thousands of characters long
            // That means this will use the name form for some illegal forms
            if (!key.match(/[.\s\[\]]/) && !key.match(/^[\d]/)) {
                return '.' + key;
            }
            if (key.match(/^\d+$/)) {
                return '[' + key + ']';
            }
            return '[' + JSON.stringify(key) + ']';
        };

        exports.deepCompareStrict = function deepCompareStrict (a, b) {
            if (typeof a !== typeof b) {
                return false;
            }
            if (Array.isArray(a)) {
                if (!Array.isArray(b)) {
                    return false;
                }
                if (a.length !== b.length) {
                    return false;
                }
                return a.every(function (v, i) {
                    return deepCompareStrict(a[i], b[i]);
                });
            }
            if (typeof a === 'object') {
                if (!a || !b) {
                    return a === b;
                }
                var aKeys = Object.keys(a);
                var bKeys = Object.keys(b);
                if (aKeys.length !== bKeys.length) {
                    return false;
                }
                return aKeys.every(function (v) {
                    return deepCompareStrict(a[v], b[v]);
                });
            }
            return a === b;
        };

        function deepMerger (target, dst, e, i) {
            if (typeof e === 'object') {
                dst[i] = deepMerge(target[i], e);
            } else {
                if (target.indexOf(e) === -1) {
                    dst.push(e);
                }
            }
        }

        function copyist (src, dst, key) {
            dst[key] = src[key];
        }

        function copyistWithDeepMerge (target, src, dst, key) {
            if (typeof src[key] !== 'object' || !src[key]) {
                dst[key] = src[key];
            }
            else {
                if (!target[key]) {
                    dst[key] = src[key];
                } else {
                    dst[key] = deepMerge(target[key], src[key]);
                }
            }
        }

        function deepMerge (target, src) {
            var array = Array.isArray(src);
            var dst = array && [] || {};

            if (array) {
                target = target || [];
                dst = dst.concat(target);
                src.forEach(deepMerger.bind(null, target, dst));
            } else {
                if (target && typeof target === 'object') {
                    Object.keys(target).forEach(copyist.bind(null, target, dst));
                }
                Object.keys(src).forEach(copyistWithDeepMerge.bind(null, target, src, dst));
            }

            return dst;
        }

        module.exports.deepMerge = deepMerge;

        /**
         * Validates instance against the provided schema
         * Implements URI+JSON Pointer encoding, e.g. "%7e"="~0"=>"~", "~1"="%2f"=>"/"
         * @param o
         * @param s The path to walk o along
         * @return any
         */
        exports.objectGetPath = function objectGetPath(o, s) {
            var parts = s.split('/').slice(1);
            var k;
            while (typeof (k=parts.shift()) == 'string') {
                var n = decodeURIComponent(k.replace(/~0/,'~').replace(/~1/g,'/'));
                if (!(n in o)) return;
                o = o[n];
            }
            return o;
        };

        function pathEncoder (v) {
            return '/'+encodeURIComponent(v).replace(/~/g,'%7E');
        }
        /**
         * Accept an Array of property names and return a JSON Pointer URI fragment
         * @param Array a
         * @return {String}
         */
        exports.encodePath = function encodePointer(a){
            // ~ must be encoded explicitly because hacks
            // the slash is encoded by encodeURIComponent
            return a.map(pathEncoder).join('');
        };


        /**
         * Calculate the number of decimal places a number uses
         * We need this to get correct results out of multipleOf and divisibleBy
         * when either figure is has decimal places, due to IEEE-754 float issues.
         * @param number
         * @returns {number}
         */
        exports.getDecimalPlaces = function getDecimalPlaces(number) {

            var decimalPlaces = 0;
            if (isNaN(number)) return decimalPlaces;

            if (typeof number !== 'number') {
                number = Number(number);
            }

            var parts = number.toString().split('e');
            if (parts.length === 2) {
                if (parts[1][0] !== '-') {
                    return decimalPlaces;
                } else {
                    decimalPlaces = Number(parts[1].slice(1));
                }
            }

            var decimalParts = parts[0].split('.');
            if (decimalParts.length === 2) {
                decimalPlaces += decimalParts[1].length;
            }

            return decimalPlaces;
        };


    },{"url":2}],6:[function(require,module,exports){
        'use strict';

        var Validator = module.exports.Validator = require('./validator');

        module.exports.ValidatorResult = require('./helpers').ValidatorResult;
        module.exports.ValidationError = require('./helpers').ValidationError;
        module.exports.SchemaError = require('./helpers').SchemaError;
        module.exports.SchemaScanResult = require('./scan').SchemaScanResult;
        module.exports.scan = require('./scan').scan;

        module.exports.validate = function (instance, schema, options) {
            var v = new Validator();
            return v.validate(instance, schema, options);
        };

    },{"./helpers":5,"./scan":7,"./validator":8}],7:[function(require,module,exports){
        "use strict";

        var urilib = require('url');
        var helpers = require('./helpers');

        module.exports.SchemaScanResult = SchemaScanResult;
        function SchemaScanResult(found, ref){
            this.id = found;
            this.ref = ref;
        }

        /**
         * Adds a schema with a certain urn to the Validator instance.
         * @param string uri
         * @param object schema
         * @return {Object}
         */
        module.exports.scan = function scan(base, schema){
            function scanSchema(baseuri, schema){
                if(!schema || typeof schema!='object') return;
                // Mark all referenced schemas so we can tell later which schemas are referred to, but never defined
                if(schema.$ref){
                    var resolvedUri = urilib.resolve(baseuri, schema.$ref);
                    ref[resolvedUri] = ref[resolvedUri] ? ref[resolvedUri]+1 : 0;
                    return;
                }
                var ourBase = schema.id ? urilib.resolve(baseuri, schema.id) : baseuri;
                if (ourBase) {
                    // If there's no fragment, append an empty one
                    if(ourBase.indexOf('#')<0) ourBase += '#';
                    if(found[ourBase]){
                        if(!helpers.deepCompareStrict(found[ourBase], schema)){
                            throw new Error('Schema <'+schema+'> already exists with different definition');
                        }
                        return found[ourBase];
                    }
                    found[ourBase] = schema;
                    // strip trailing fragment
                    if(ourBase[ourBase.length-1]=='#'){
                        found[ourBase.substring(0, ourBase.length-1)] = schema;
                    }
                }
                scanArray(ourBase+'/items', (Array.isArray(schema.items)?schema.items:[schema.items]));
                scanArray(ourBase+'/extends', (Array.isArray(schema.extends)?schema.extends:[schema.extends]));
                scanSchema(ourBase+'/additionalItems', schema.additionalItems);
                scanObject(ourBase+'/properties', schema.properties);
                scanSchema(ourBase+'/additionalProperties', schema.additionalProperties);
                scanObject(ourBase+'/definitions', schema.definitions);
                scanObject(ourBase+'/patternProperties', schema.patternProperties);
                scanObject(ourBase+'/dependencies', schema.dependencies);
                scanArray(ourBase+'/disallow', schema.disallow);
                scanArray(ourBase+'/allOf', schema.allOf);
                scanArray(ourBase+'/anyOf', schema.anyOf);
                scanArray(ourBase+'/oneOf', schema.oneOf);
                scanSchema(ourBase+'/not', schema.not);
            }
            function scanArray(baseuri, schemas){
                if(!Array.isArray(schemas)) return;
                for(var i=0; i<schemas.length; i++){
                    scanSchema(baseuri+'/'+i, schemas[i]);
                }
            }
            function scanObject(baseuri, schemas){
                if(!schemas || typeof schemas!='object') return;
                for(var p in schemas){
                    scanSchema(baseuri+'/'+p, schemas[p]);
                }
            }

            var found = {};
            var ref = {};
            scanSchema(base, schema);
            return new SchemaScanResult(found, ref);
        };

    },{"./helpers":5,"url":2}],8:[function(require,module,exports){
        'use strict';

        var urilib = require('url');

        var attribute = require('./attribute');
        var helpers = require('./helpers');
        var scanSchema = require('./scan').scan;
        var ValidatorResult = helpers.ValidatorResult;
        var SchemaError = helpers.SchemaError;
        var SchemaContext = helpers.SchemaContext;
//var anonymousBase = 'vnd.jsonschema:///';
        var anonymousBase = '/';

        /**
         * Creates a new Validator object
         * @name Validator
         * @constructor
         */
        var Validator = function Validator () {
            // Allow a validator instance to override global custom formats or to have their
            // own custom formats.
            this.customFormats = Object.create(Validator.prototype.customFormats);
            this.schemas = {};
            this.unresolvedRefs = [];

            // Use Object.create to make this extensible without Validator instances stepping on each other's toes.
            this.types = Object.create(types);
            this.attributes = Object.create(attribute.validators);
        };

// Allow formats to be registered globally.
        Validator.prototype.customFormats = {};

// Hint at the presence of a property
        Validator.prototype.schemas = null;
        Validator.prototype.types = null;
        Validator.prototype.attributes = null;
        Validator.prototype.unresolvedRefs = null;

        /**
         * Adds a schema with a certain urn to the Validator instance.
         * @param schema
         * @param urn
         * @return {Object}
         */
        Validator.prototype.addSchema = function addSchema (schema, base) {
            var self = this;
            if (!schema) {
                return null;
            }
            var scan = scanSchema(base||anonymousBase, schema);
            var ourUri = base || schema.id;
            for(var uri in scan.id){
                this.schemas[uri] = scan.id[uri];
            }
            for(var uri in scan.ref){
                this.unresolvedRefs.push(uri);
            }
            this.unresolvedRefs = this.unresolvedRefs.filter(function(uri){
                return typeof self.schemas[uri]==='undefined';
            });
            return this.schemas[ourUri];
        };

        Validator.prototype.addSubSchemaArray = function addSubSchemaArray(baseuri, schemas) {
            if(!Array.isArray(schemas)) return;
            for(var i=0; i<schemas.length; i++){
                this.addSubSchema(baseuri, schemas[i]);
            }
        };

        Validator.prototype.addSubSchemaObject = function addSubSchemaArray(baseuri, schemas) {
            if(!schemas || typeof schemas!='object') return;
            for(var p in schemas){
                this.addSubSchema(baseuri, schemas[p]);
            }
        };



        /**
         * Sets all the schemas of the Validator instance.
         * @param schemas
         */
        Validator.prototype.setSchemas = function setSchemas (schemas) {
            this.schemas = schemas;
        };

        /**
         * Returns the schema of a certain urn
         * @param urn
         */
        Validator.prototype.getSchema = function getSchema (urn) {
            return this.schemas[urn];
        };

        /**
         * Validates instance against the provided schema
         * @param instance
         * @param schema
         * @param [options]
         * @param [ctx]
         * @return {Array}
         */
        Validator.prototype.validate = function validate (instance, schema, options, ctx) {
            if (!options) {
                options = {};
            }
            var propertyName = options.propertyName || 'instance';
            // This will work so long as the function at uri.resolve() will resolve a relative URI to a relative URI
            var base = urilib.resolve(options.base||anonymousBase, schema.id||'');
            if(!ctx){
                ctx = new SchemaContext(schema, options, propertyName, base, Object.create(this.schemas));
                if (!ctx.schemas[base]) {
                    ctx.schemas[base] = schema;
                }
                var found = scanSchema(base, schema);
                for(var n in found.id){
                    var sch = found.id[n];
                    ctx.schemas[n] = sch;
                }
            }
            if (schema) {
                var result = this.validateSchema(instance, schema, options, ctx);
                if (!result) {
                    throw new Error('Result undefined');
                }
                return result;
            }
            throw new SchemaError('no schema specified', schema);
        };

        /**
         * @param Object schema
         * @return mixed schema uri or false
         */
        function shouldResolve(schema) {
            var ref = (typeof schema === 'string') ? schema : schema.$ref;
            if (typeof ref=='string') return ref;
            return false;
        }

        /**
         * Validates an instance against the schema (the actual work horse)
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @private
         * @return {ValidatorResult}
         */
        Validator.prototype.validateSchema = function validateSchema (instance, schema, options, ctx) {
            var result = new ValidatorResult(instance, schema, options, ctx);

            // Support for the true/false schemas
            if(typeof schema==='boolean') {
                if(schema===true){
                    // `true` is always valid
                    schema = {};
                }else if(schema===false){
                    // `false` is always invalid
                    schema = {type: []};
                }
            }else if(!schema){
                // This might be a string
                throw new Error("schema is undefined");
            }

            if (schema['extends']) {
                if (Array.isArray(schema['extends'])) {
                    var schemaobj = {schema: schema, ctx: ctx};
                    schema['extends'].forEach(this.schemaTraverser.bind(this, schemaobj));
                    schema = schemaobj.schema;
                    schemaobj.schema = null;
                    schemaobj.ctx = null;
                    schemaobj = null;
                } else {
                    schema = helpers.deepMerge(schema, this.superResolve(schema['extends'], ctx));
                }
            }

            // If passed a string argument, load that schema URI
            var switchSchema = shouldResolve(schema);
            if (switchSchema) {
                var resolved = this.resolve(schema, switchSchema, ctx);
                var subctx = new SchemaContext(resolved.subschema, options, ctx.propertyPath, resolved.switchSchema, ctx.schemas);
                return this.validateSchema(instance, resolved.subschema, options, subctx);
            }

            var skipAttributes = options && options.skipAttributes || [];
            // Validate each schema attribute against the instance
            for (var key in schema) {
                if (!attribute.ignoreProperties[key] && skipAttributes.indexOf(key) < 0) {
                    var validatorErr = null;
                    var validator = this.attributes[key];
                    if (validator) {
                        validatorErr = validator.call(this, instance, schema, options, ctx);
                    } else if (options.allowUnknownAttributes === false) {
                        // This represents an error with the schema itself, not an invalid instance
                        throw new SchemaError("Unsupported attribute: " + key, schema);
                    }
                    if (validatorErr) {
                        result.importErrors(validatorErr);
                    }
                }
            }

            if (typeof options.rewrite == 'function') {
                var value = options.rewrite.call(this, instance, schema, options, ctx);
                result.instance = value;
            }
            return result;
        };

        /**
         * @private
         * @param Object schema
         * @param SchemaContext ctx
         * @returns Object schema or resolved schema
         */
        Validator.prototype.schemaTraverser = function schemaTraverser (schemaobj, s) {
            schemaobj.schema = helpers.deepMerge(schemaobj.schema, this.superResolve(s, schemaobj.ctx));
        };

        /**
         * @private
         * @param Object schema
         * @param SchemaContext ctx
         * @returns Object schema or resolved schema
         */
        Validator.prototype.superResolve = function superResolve (schema, ctx) {
            var ref = shouldResolve(schema);
            if(ref) {
                return this.resolve(schema, ref, ctx).subschema;
            }
            return schema;
        };

        /**
         * @private
         * @param Object schema
         * @param Object switchSchema
         * @param SchemaContext ctx
         * @return Object resolved schemas {subschema:String, switchSchema: String}
         * @throws SchemaError
         */
        Validator.prototype.resolve = function resolve (schema, switchSchema, ctx) {
            switchSchema = ctx.resolve(switchSchema);
            // First see if the schema exists under the provided URI
            if (ctx.schemas[switchSchema]) {
                return {subschema: ctx.schemas[switchSchema], switchSchema: switchSchema};
            }
            // Else try walking the property pointer
            var parsed = urilib.parse(switchSchema);
            var fragment = parsed && parsed.hash;
            var document = fragment && fragment.length && switchSchema.substr(0, switchSchema.length - fragment.length);
            if (!document || !ctx.schemas[document]) {
                throw new SchemaError("no such schema <" + switchSchema + ">", schema);
            }
            var subschema = helpers.objectGetPath(ctx.schemas[document], fragment.substr(1));
            if(subschema===undefined){
                throw new SchemaError("no such schema " + fragment + " located in <" + document + ">", schema);
            }
            return {subschema: subschema, switchSchema: switchSchema};
        };

        /**
         * Tests whether the instance if of a certain type.
         * @private
         * @param instance
         * @param schema
         * @param options
         * @param ctx
         * @param type
         * @return {boolean}
         */
        Validator.prototype.testType = function validateType (instance, schema, options, ctx, type) {
            if (typeof this.types[type] == 'function') {
                return this.types[type].call(this, instance);
            }
            if (type && typeof type == 'object') {
                var res = this.validateSchema(instance, type, options, ctx);
                return res === undefined || !(res && res.errors.length);
            }
            // Undefined or properties not on the list are acceptable, same as not being defined
            return true;
        };

        var types = Validator.prototype.types = {};
        types.string = function testString (instance) {
            return typeof instance == 'string';
        };
        types.number = function testNumber (instance) {
            // isFinite returns false for NaN, Infinity, and -Infinity
            return typeof instance == 'number' && isFinite(instance);
        };
        types.integer = function testInteger (instance) {
            return (typeof instance == 'number') && instance % 1 === 0;
        };
        types.boolean = function testBoolean (instance) {
            return typeof instance == 'boolean';
        };
        types.array = function testArray (instance) {
            return Array.isArray(instance);
        };
        types['null'] = function testNull (instance) {
            return instance === null;
        };
        types.date = function testDate (instance) {
            return instance instanceof Date;
        };
        types.any = function testAny (instance) {
            return true;
        };
        types.object = function testObject (instance) {
            // TODO: fix this - see #15
            return instance && (typeof instance === 'object') && !(Array.isArray(instance)) && !(instance instanceof Date);
        };

        module.exports = Validator;

    },{"./attribute":4,"./helpers":5,"./scan":7,"url":2}],9:[function(require,module,exports){
        (function (global){(function (){
            /*! https://mths.be/punycode v1.3.2 by @mathias */
            ;(function(root) {

                /** Detect free variables */
                var freeExports = typeof exports == 'object' && exports &&
                    !exports.nodeType && exports;
                var freeModule = typeof module == 'object' && module &&
                    !module.nodeType && module;
                var freeGlobal = typeof global == 'object' && global;
                if (
                    freeGlobal.global === freeGlobal ||
                    freeGlobal.window === freeGlobal ||
                    freeGlobal.self === freeGlobal
                ) {
                    root = freeGlobal;
                }

                /**
                 * The `punycode` object.
                 * @name punycode
                 * @type Object
                 */
                var punycode,

                    /** Highest positive signed 32-bit float value */
                    maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

                    /** Bootstring parameters */
                    base = 36,
                    tMin = 1,
                    tMax = 26,
                    skew = 38,
                    damp = 700,
                    initialBias = 72,
                    initialN = 128, // 0x80
                    delimiter = '-', // '\x2D'

                    /** Regular expressions */
                    regexPunycode = /^xn--/,
                    regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
                    regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

                    /** Error messages */
                    errors = {
                        'overflow': 'Overflow: input needs wider integers to process',
                        'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
                        'invalid-input': 'Invalid input'
                    },

                    /** Convenience shortcuts */
                    baseMinusTMin = base - tMin,
                    floor = Math.floor,
                    stringFromCharCode = String.fromCharCode,

                    /** Temporary variable */
                    key;

                /*--------------------------------------------------------------------------*/

                /**
                 * A generic error utility function.
                 * @private
                 * @param {String} type The error type.
                 * @returns {Error} Throws a `RangeError` with the applicable error message.
                 */
                function error(type) {
                    throw RangeError(errors[type]);
                }

                /**
                 * A generic `Array#map` utility function.
                 * @private
                 * @param {Array} array The array to iterate over.
                 * @param {Function} callback The function that gets called for every array
                 * item.
                 * @returns {Array} A new array of values returned by the callback function.
                 */
                function map(array, fn) {
                    var length = array.length;
                    var result = [];
                    while (length--) {
                        result[length] = fn(array[length]);
                    }
                    return result;
                }

                /**
                 * A simple `Array#map`-like wrapper to work with domain name strings or email
                 * addresses.
                 * @private
                 * @param {String} domain The domain name or email address.
                 * @param {Function} callback The function that gets called for every
                 * character.
                 * @returns {Array} A new string of characters returned by the callback
                 * function.
                 */
                function mapDomain(string, fn) {
                    var parts = string.split('@');
                    var result = '';
                    if (parts.length > 1) {
                        // In email addresses, only the domain name should be punycoded. Leave
                        // the local part (i.e. everything up to `@`) intact.
                        result = parts[0] + '@';
                        string = parts[1];
                    }
                    // Avoid `split(regex)` for IE8 compatibility. See #17.
                    string = string.replace(regexSeparators, '\x2E');
                    var labels = string.split('.');
                    var encoded = map(labels, fn).join('.');
                    return result + encoded;
                }

                /**
                 * Creates an array containing the numeric code points of each Unicode
                 * character in the string. While JavaScript uses UCS-2 internally,
                 * this function will convert a pair of surrogate halves (each of which
                 * UCS-2 exposes as separate characters) into a single code point,
                 * matching UTF-16.
                 * @see `punycode.ucs2.encode`
                 * @see <https://mathiasbynens.be/notes/javascript-encoding>
                 * @memberOf punycode.ucs2
                 * @name decode
                 * @param {String} string The Unicode input string (UCS-2).
                 * @returns {Array} The new array of code points.
                 */
                function ucs2decode(string) {
                    var output = [],
                        counter = 0,
                        length = string.length,
                        value,
                        extra;
                    while (counter < length) {
                        value = string.charCodeAt(counter++);
                        if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
                            // high surrogate, and there is a next character
                            extra = string.charCodeAt(counter++);
                            if ((extra & 0xFC00) == 0xDC00) { // low surrogate
                                output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
                            } else {
                                // unmatched surrogate; only append this code unit, in case the next
                                // code unit is the high surrogate of a surrogate pair
                                output.push(value);
                                counter--;
                            }
                        } else {
                            output.push(value);
                        }
                    }
                    return output;
                }

                /**
                 * Creates a string based on an array of numeric code points.
                 * @see `punycode.ucs2.decode`
                 * @memberOf punycode.ucs2
                 * @name encode
                 * @param {Array} codePoints The array of numeric code points.
                 * @returns {String} The new Unicode string (UCS-2).
                 */
                function ucs2encode(array) {
                    return map(array, function(value) {
                        var output = '';
                        if (value > 0xFFFF) {
                            value -= 0x10000;
                            output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
                            value = 0xDC00 | value & 0x3FF;
                        }
                        output += stringFromCharCode(value);
                        return output;
                    }).join('');
                }

                /**
                 * Converts a basic code point into a digit/integer.
                 * @see `digitToBasic()`
                 * @private
                 * @param {Number} codePoint The basic numeric code point value.
                 * @returns {Number} The numeric value of a basic code point (for use in
                 * representing integers) in the range `0` to `base - 1`, or `base` if
                 * the code point does not represent a value.
                 */
                function basicToDigit(codePoint) {
                    if (codePoint - 48 < 10) {
                        return codePoint - 22;
                    }
                    if (codePoint - 65 < 26) {
                        return codePoint - 65;
                    }
                    if (codePoint - 97 < 26) {
                        return codePoint - 97;
                    }
                    return base;
                }

                /**
                 * Converts a digit/integer into a basic code point.
                 * @see `basicToDigit()`
                 * @private
                 * @param {Number} digit The numeric value of a basic code point.
                 * @returns {Number} The basic code point whose value (when used for
                 * representing integers) is `digit`, which needs to be in the range
                 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
                 * used; else, the lowercase form is used. The behavior is undefined
                 * if `flag` is non-zero and `digit` has no uppercase form.
                 */
                function digitToBasic(digit, flag) {
                    //  0..25 map to ASCII a..z or A..Z
                    // 26..35 map to ASCII 0..9
                    return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
                }

                /**
                 * Bias adaptation function as per section 3.4 of RFC 3492.
                 * http://tools.ietf.org/html/rfc3492#section-3.4
                 * @private
                 */
                function adapt(delta, numPoints, firstTime) {
                    var k = 0;
                    delta = firstTime ? floor(delta / damp) : delta >> 1;
                    delta += floor(delta / numPoints);
                    for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
                        delta = floor(delta / baseMinusTMin);
                    }
                    return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
                }

                /**
                 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
                 * symbols.
                 * @memberOf punycode
                 * @param {String} input The Punycode string of ASCII-only symbols.
                 * @returns {String} The resulting string of Unicode symbols.
                 */
                function decode(input) {
                    // Don't use UCS-2
                    var output = [],
                        inputLength = input.length,
                        out,
                        i = 0,
                        n = initialN,
                        bias = initialBias,
                        basic,
                        j,
                        index,
                        oldi,
                        w,
                        k,
                        digit,
                        t,
                        /** Cached calculation results */
                        baseMinusT;

                    // Handle the basic code points: let `basic` be the number of input code
                    // points before the last delimiter, or `0` if there is none, then copy
                    // the first basic code points to the output.

                    basic = input.lastIndexOf(delimiter);
                    if (basic < 0) {
                        basic = 0;
                    }

                    for (j = 0; j < basic; ++j) {
                        // if it's not a basic code point
                        if (input.charCodeAt(j) >= 0x80) {
                            error('not-basic');
                        }
                        output.push(input.charCodeAt(j));
                    }

                    // Main decoding loop: start just after the last delimiter if any basic code
                    // points were copied; start at the beginning otherwise.

                    for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

                        // `index` is the index of the next character to be consumed.
                        // Decode a generalized variable-length integer into `delta`,
                        // which gets added to `i`. The overflow checking is easier
                        // if we increase `i` as we go, then subtract off its starting
                        // value at the end to obtain `delta`.
                        for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

                            if (index >= inputLength) {
                                error('invalid-input');
                            }

                            digit = basicToDigit(input.charCodeAt(index++));

                            if (digit >= base || digit > floor((maxInt - i) / w)) {
                                error('overflow');
                            }

                            i += digit * w;
                            t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

                            if (digit < t) {
                                break;
                            }

                            baseMinusT = base - t;
                            if (w > floor(maxInt / baseMinusT)) {
                                error('overflow');
                            }

                            w *= baseMinusT;

                        }

                        out = output.length + 1;
                        bias = adapt(i - oldi, out, oldi == 0);

                        // `i` was supposed to wrap around from `out` to `0`,
                        // incrementing `n` each time, so we'll fix that now:
                        if (floor(i / out) > maxInt - n) {
                            error('overflow');
                        }

                        n += floor(i / out);
                        i %= out;

                        // Insert `n` at position `i` of the output
                        output.splice(i++, 0, n);

                    }

                    return ucs2encode(output);
                }

                /**
                 * Converts a string of Unicode symbols (e.g. a domain name label) to a
                 * Punycode string of ASCII-only symbols.
                 * @memberOf punycode
                 * @param {String} input The string of Unicode symbols.
                 * @returns {String} The resulting Punycode string of ASCII-only symbols.
                 */
                function encode(input) {
                    var n,
                        delta,
                        handledCPCount,
                        basicLength,
                        bias,
                        j,
                        m,
                        q,
                        k,
                        t,
                        currentValue,
                        output = [],
                        /** `inputLength` will hold the number of code points in `input`. */
                        inputLength,
                        /** Cached calculation results */
                        handledCPCountPlusOne,
                        baseMinusT,
                        qMinusT;

                    // Convert the input in UCS-2 to Unicode
                    input = ucs2decode(input);

                    // Cache the length
                    inputLength = input.length;

                    // Initialize the state
                    n = initialN;
                    delta = 0;
                    bias = initialBias;

                    // Handle the basic code points
                    for (j = 0; j < inputLength; ++j) {
                        currentValue = input[j];
                        if (currentValue < 0x80) {
                            output.push(stringFromCharCode(currentValue));
                        }
                    }

                    handledCPCount = basicLength = output.length;

                    // `handledCPCount` is the number of code points that have been handled;
                    // `basicLength` is the number of basic code points.

                    // Finish the basic string - if it is not empty - with a delimiter
                    if (basicLength) {
                        output.push(delimiter);
                    }

                    // Main encoding loop:
                    while (handledCPCount < inputLength) {

                        // All non-basic code points < n have been handled already. Find the next
                        // larger one:
                        for (m = maxInt, j = 0; j < inputLength; ++j) {
                            currentValue = input[j];
                            if (currentValue >= n && currentValue < m) {
                                m = currentValue;
                            }
                        }

                        // Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
                        // but guard against overflow
                        handledCPCountPlusOne = handledCPCount + 1;
                        if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
                            error('overflow');
                        }

                        delta += (m - n) * handledCPCountPlusOne;
                        n = m;

                        for (j = 0; j < inputLength; ++j) {
                            currentValue = input[j];

                            if (currentValue < n && ++delta > maxInt) {
                                error('overflow');
                            }

                            if (currentValue == n) {
                                // Represent delta as a generalized variable-length integer
                                for (q = delta, k = base; /* no condition */; k += base) {
                                    t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
                                    if (q < t) {
                                        break;
                                    }
                                    qMinusT = q - t;
                                    baseMinusT = base - t;
                                    output.push(
                                        stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
                                    );
                                    q = floor(qMinusT / baseMinusT);
                                }

                                output.push(stringFromCharCode(digitToBasic(q, 0)));
                                bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
                                delta = 0;
                                ++handledCPCount;
                            }
                        }

                        ++delta;
                        ++n;

                    }
                    return output.join('');
                }

                /**
                 * Converts a Punycode string representing a domain name or an email address
                 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
                 * it doesn't matter if you call it on a string that has already been
                 * converted to Unicode.
                 * @memberOf punycode
                 * @param {String} input The Punycoded domain name or email address to
                 * convert to Unicode.
                 * @returns {String} The Unicode representation of the given Punycode
                 * string.
                 */
                function toUnicode(input) {
                    return mapDomain(input, function(string) {
                        return regexPunycode.test(string)
                            ? decode(string.slice(4).toLowerCase())
                            : string;
                    });
                }

                /**
                 * Converts a Unicode string representing a domain name or an email address to
                 * Punycode. Only the non-ASCII parts of the domain name will be converted,
                 * i.e. it doesn't matter if you call it with a domain that's already in
                 * ASCII.
                 * @memberOf punycode
                 * @param {String} input The domain name or email address to convert, as a
                 * Unicode string.
                 * @returns {String} The Punycode representation of the given domain name or
                 * email address.
                 */
                function toASCII(input) {
                    return mapDomain(input, function(string) {
                        return regexNonASCII.test(string)
                            ? 'xn--' + encode(string)
                            : string;
                    });
                }

                /*--------------------------------------------------------------------------*/

                /** Define the public API */
                punycode = {
                    /**
                     * A string representing the current Punycode.js version number.
                     * @memberOf punycode
                     * @type String
                     */
                    'version': '1.3.2',
                    /**
                     * An object of methods to convert from JavaScript's internal character
                     * representation (UCS-2) to Unicode code points, and back.
                     * @see <https://mathiasbynens.be/notes/javascript-encoding>
                     * @memberOf punycode
                     * @type Object
                     */
                    'ucs2': {
                        'decode': ucs2decode,
                        'encode': ucs2encode
                    },
                    'decode': decode,
                    'encode': encode,
                    'toASCII': toASCII,
                    'toUnicode': toUnicode
                };

                /** Expose `punycode` */
                // Some AMD build optimizers, like r.js, check for specific condition patterns
                // like the following:
                if (
                    typeof define == 'function' &&
                    typeof define.amd == 'object' &&
                    define.amd
                ) {
                    define('punycode', function() {
                        return punycode;
                    });
                } else if (freeExports && freeModule) {
                    if (module.exports == freeExports) { // in Node.js or RingoJS v0.8.0+
                        freeModule.exports = punycode;
                    } else { // in Narwhal or RingoJS v0.7.0-
                        for (key in punycode) {
                            punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
                        }
                    }
                } else { // in Rhino or a web browser
                    root.punycode = punycode;
                }

            }(this));

        }).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    },{}],10:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

        'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
        function hasOwnProperty(obj, prop) {
            return Object.prototype.hasOwnProperty.call(obj, prop);
        }

        module.exports = function(qs, sep, eq, options) {
            sep = sep || '&';
            eq = eq || '=';
            var obj = {};

            if (typeof qs !== 'string' || qs.length === 0) {
                return obj;
            }

            var regexp = /\+/g;
            qs = qs.split(sep);

            var maxKeys = 1000;
            if (options && typeof options.maxKeys === 'number') {
                maxKeys = options.maxKeys;
            }

            var len = qs.length;
            // maxKeys <= 0 means that we should not limit keys count
            if (maxKeys > 0 && len > maxKeys) {
                len = maxKeys;
            }

            for (var i = 0; i < len; ++i) {
                var x = qs[i].replace(regexp, '%20'),
                    idx = x.indexOf(eq),
                    kstr, vstr, k, v;

                if (idx >= 0) {
                    kstr = x.substr(0, idx);
                    vstr = x.substr(idx + 1);
                } else {
                    kstr = x;
                    vstr = '';
                }

                k = decodeURIComponent(kstr);
                v = decodeURIComponent(vstr);

                if (!hasOwnProperty(obj, k)) {
                    obj[k] = v;
                } else if (isArray(obj[k])) {
                    obj[k].push(v);
                } else {
                    obj[k] = [obj[k], v];
                }
            }

            return obj;
        };

        var isArray = Array.isArray || function (xs) {
            return Object.prototype.toString.call(xs) === '[object Array]';
        };

    },{}],11:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

        'use strict';

        var stringifyPrimitive = function(v) {
            switch (typeof v) {
                case 'string':
                    return v;

                case 'boolean':
                    return v ? 'true' : 'false';

                case 'number':
                    return isFinite(v) ? v : '';

                default:
                    return '';
            }
        };

        module.exports = function(obj, sep, eq, name) {
            sep = sep || '&';
            eq = eq || '=';
            if (obj === null) {
                obj = undefined;
            }

            if (typeof obj === 'object') {
                return map(objectKeys(obj), function(k) {
                    var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
                    if (isArray(obj[k])) {
                        return map(obj[k], function(v) {
                            return ks + encodeURIComponent(stringifyPrimitive(v));
                        }).join(sep);
                    } else {
                        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
                    }
                }).join(sep);

            }

            if (!name) return '';
            return encodeURIComponent(stringifyPrimitive(name)) + eq +
                encodeURIComponent(stringifyPrimitive(obj));
        };

        var isArray = Array.isArray || function (xs) {
            return Object.prototype.toString.call(xs) === '[object Array]';
        };

        function map (xs, f) {
            if (xs.map) return xs.map(f);
            var res = [];
            for (var i = 0; i < xs.length; i++) {
                res.push(f(xs[i], i));
            }
            return res;
        }

        var objectKeys = Object.keys || function (obj) {
            var res = [];
            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
            }
            return res;
        };

    },{}],12:[function(require,module,exports){
        'use strict';

        exports.decode = exports.parse = require('./decode');
        exports.encode = exports.stringify = require('./encode');

    },{"./decode":10,"./encode":11}],13:[function(require,module,exports){
        const ElectroDB = require("../index");
        window.Prism = window.Prism || {};
        window.electroParams = window.electroParams || [];
        const appDiv = document.getElementById('param-container');

        window.notifyRedirect = function notifyRedirect(e) {
            if (top.location !== self.location) {
                e.preventDefault();
                window.top.postMessage(JSON.stringify({type: "redirect", data: e.target.href}), "*");
            }
        }

        function aOrAn(value = "") {
            return ["a", "e", "i", "o", "u"].includes(value[0].toLowerCase())
                ? "an"
                : "a"
        }

        function properCase(str = "") {
            let newStr = "";
            for (let i = 0; i < str.length; i++) {
                let value = i === 0
                    ? str[i].toUpperCase()
                    : str[i];
                newStr += value;
            }
            return newStr;
        }

        function formatProper(value) {
            return formatStrict(properCase(value));
        }

        function formatStrict(value) {
            return `<b>${value}</b>`
        }

        function formatProvidedKeys(pk = {}, sks = []) {
            let keys = {...pk};
            for (const sk of sks) {
                keys = {...keys, ...sk.facets};
            }
            const provided = Object.keys(keys).map(key => formatStrict(key));
            if (provided.length === 0) {
                return "";
            } else if (provided.length === 1) {
                return provided[0];
            } else if (provided.length === 2) {
                return provided.join(" and ");
            } else {
                provided[provided.length - 1] = `and ${provided[provided.length - 1]}`;
                return provided.join(", ");
            }
        }

        function formatParamLabel(state, entity) {
            if (!state) {
                return null;
            } else if (typeof state === "string") {
                return state;
            } else {
                const method = state.query.method;
                const type = state.query.type;
                const collection = state.query.collection;
                const accessPattern = entity.model.translations.indexes.fromIndexToAccessPattern[state.query.index];
                const keys = formatProvidedKeys(state.query.keys.pk, state.query.keys.sk);
                if (collection) {
                    return `<h2>Queries the collection ${formatProper(collection)}, on the service ${formatProper(entity.model.service)}, by ${keys}</h2>`;
                } else if (method === "query") {
                    return `<h2>Queries the access pattern ${formatProper(accessPattern)}, on the entity ${formatProper(entity.model.name)}, by ${keys}</h2>`;
                } else {
                    return `<h2>Performs ${aOrAn(method)} ${formatProper(method)} operation, on the entity ${formatProper(entity.model.name)}</h2>`;
                }
            }
        }

        function printToScreen({params, state, entity, cache} = {}) {
            const innerHtml = appDiv.innerHTML;
            const label = formatParamLabel(state, entity);
            if (cache) {
                window.electroParams.push({title: label, json: params});
            }
            let code = `<pre class="language-json"><code class="language-json">${JSON.stringify(params, null, 4)}</code></pre>`;
            if (label) {
                code = `<hr>${label}${code}`;
            } else {
                code = `<hr>${code}`;
            }
            appDiv.innerHTML = innerHtml + code;
            window.Prism.highlightAll();
        }

        function formatError(message) {
            const electroErrorPattern = "- For more detail on this error reference:";
            const isElectroError = message.match(electroErrorPattern);
            if (!isElectroError) {
                return `<h3>${message}</h3>`;
            }
            const [description, link] = message.split(electroErrorPattern);
            return `<h3>${description}</h3><br><h3>For more detail on this error reference <a href="${link}" onclick="notifyRedirect(event)">${link}</a></h3>`
        }

        function printMessage(type, message) {
            const error = formatError(message);
            const innerHtml = appDiv.innerHTML;
            const label = type === "info" ? "" : "<h2>Query Error</h2>";
            const code = `<hr>${label}<div class="${type} message">${error}</div>`;
            appDiv.innerHTML = innerHtml + code;
        }

        function clearScreen() {
            appDiv.innerHTML = '';
            window.electroParams = [];
        }

        function promiseCallback(results) {
            return {
                promise: async () => results
            }
        }

        class Entity extends ElectroDB.Entity {
            constructor(...params) {
                super(...params);
                this.client = {
                    put: () => promiseCallback({}),
                    delete: () => promiseCallback({}),
                    update: () => promiseCallback({}),
                    get: () => promiseCallback({Item: {}}),
                    query: () => promiseCallback({Items: []}),
                    scan: () => promiseCallback({Items: []}),
                    batchWrite: () => promiseCallback({UnprocessedKeys: {[this._getTableName()]: {Keys: []}}}),
                    batchGet: () => promiseCallback({Responses: {[this._getTableName()]: []}, UnprocessedKeys: {[this._getTableName()]: {Keys: []}}}),
                };
            }

            _demoParams(method, state, config) {
                try {
                    const params = super[method](state, config);
                    if (params && typeof params.catch === "function") {
                        params.catch(err => {
                            console.log(err);
                            printMessage("error", err.message);
                        });
                    }
                    printToScreen({params, state, entity: this, cache: true});
                    return params;
                } catch(err) {
                    console.log(err);
                    printMessage("error", err.message);
                }
            }

            _queryParams(state, config) {
                return this._demoParams("_queryParams", state, config);
            }

            _batchWriteParams(state, config) {
                return this._demoParams("_batchWriteParams", state, config);
            }

            _batchGetParams(state, config) {
                return this._demoParams("_batchGetParams", state, config);
            }

            _params(state, config) {
                return this._demoParams("_params", state, config);
            }

            _makeChain(index, clauses, rootClause, options) {
                const params = clauses.params.action;
                const go = clauses.go.action;
                clauses.params.action = (entity, state, options) => {
                    try {
                        params(entity, state, options);
                    } catch(err) {
                        printMessage("error", err.message);
                    }
                }
                clauses.go.action = async (entity, state, options) => {
                    try {
                        return await go(entity, state, options);
                    } catch(err) {
                        printMessage("error", err.message);
                    }
                }
                return super._makeChain(index, clauses, rootClause, options);
            }
        }

        class Service extends ElectroDB.Service {}


        window.ElectroDB = {
            Entity,
            Service,
            clearScreen,
            printMessage,
            printToScreen
        };
    },{"../index":1}],14:[function(require,module,exports){
        const { QueryTypes, MethodTypes, ItemOperations, ExpressionTypes } = require("./types");
        const {AttributeOperationProxy, UpdateOperations} = require("./operations");
        const {UpdateExpression} = require("./update");
        const {FilterExpression} = require("./where");
        const v = require("./validations");
        const e = require("./errors");
        const u = require("./util");

        function batchAction(action, type, entity, state, payload) {
            if (state.getError() !== null) {
                return state;
            }
            try {
                state.setMethod(type);
                for (let facets of payload) {
                    let batchState = action(entity, state.createSubState(), facets);
                    if (batchState.getError() !== null) {
                        throw batchState.getError();
                    }
                }
                return state;
            } catch(err) {
                state.setError(err);
                return state;
            }
        }

        let clauses = {
            index: {
                name: "index",
                children: ["get", "delete", "update", "query", "put", "scan", "collection", "create", "remove", "patch", "batchPut", "batchDelete", "batchGet"],
            },
            collection: {
                name: "collection",
                /* istanbul ignore next */
                action(entity, state, collection = "", facets /* istanbul ignore next */ = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        const {pk} = state.getCompositeAttributes();
                        return state
                            .setType(QueryTypes.collection)
                            .setMethod(MethodTypes.query)
                            .setCollection(collection)
                            .setPK(entity._expectFacets(facets, pk));

                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["params", "go", "page"],
            },
            scan: {
                name: "scan",
                action(entity, state) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        return state.setMethod(MethodTypes.scan);
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["params", "go", "page"],
            },
            get: {
                name: "get",
                /* istanbul ignore next */
                action(entity, state, facets = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        const attributes = state.getCompositeAttributes();
                        return state
                            .setMethod(MethodTypes.get)
                            .setType(QueryTypes.eq)
                            .setPK(entity._expectFacets(facets, attributes.pk))
                            .ifSK(() => {
                                entity._expectFacets(facets, attributes.sk);
                                state.setSK(entity._buildQueryFacets(facets, attributes.sk));
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["params", "go"],
            },
            batchGet: {
                name: "batchGet",
                action: (entity, state, payload) => batchAction(clauses.get.action, MethodTypes.batchGet, entity, state, payload),
                children: ["params", "go"],
            },
            batchDelete: {
                name: "batchDelete",
                action: (entity, state, payload) => batchAction(clauses.delete.action, MethodTypes.batchWrite, entity, state, payload),
                children: ["params", "go"],
            },
            delete: {
                name: "delete",
                /* istanbul ignore next */
                action(entity, state, facets = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        const attributes = state.getCompositeAttributes();
                        return state
                            .setMethod(MethodTypes.delete)
                            .setType(QueryTypes.eq)
                            .setPK(entity._expectFacets(facets, attributes.pk))
                            .ifSK(() => {
                                entity._expectFacets(facets, attributes.sk);
                                state.setSK(entity._buildQueryFacets(facets, attributes.sk));
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["where", "params", "go"],
            },
            remove: {
                name: "remove",
                /* istanbul ignore next */
                action(entity, state, facets = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        const attributes = state.getCompositeAttributes();
                        return state
                            .setMethod(MethodTypes.delete)
                            .setType(QueryTypes.eq)
                            .setPK(entity._expectFacets(facets, attributes.pk))
                            .ifSK(() => {
                                entity._expectFacets(facets, attributes.sk);
                                state.setSK(entity._buildQueryFacets(facets, attributes.sk));
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["where", "params", "go"],
            },
            put: {
                name: "put",
                /* istanbul ignore next */
                action(entity, state, payload = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        let record = entity.model.schema.checkCreate({...payload});
                        const attributes = state.getCompositeAttributes();
                        return state
                            .setMethod(MethodTypes.put)
                            .setType(QueryTypes.eq)
                            .applyPut(record)
                            .setPK(entity._expectFacets(record, attributes.pk))
                            .ifSK(() => {
                                entity._expectFacets(record, attributes.sk);
                                state.setSK(entity._buildQueryFacets(record, attributes.sk));
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["params", "go"],
            },
            batchPut: {
                name: "batchPut",
                action: (entity, state, payload) => batchAction(clauses.put.action, MethodTypes.batchWrite, entity, state, payload),
                children: ["params", "go"],
            },
            create: {
                name: "create",
                action(entity, state, payload) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        let record = entity.model.schema.checkCreate({...payload});
                        const attributes = state.getCompositeAttributes();
                        return state
                            .setMethod(MethodTypes.put)
                            .setType(QueryTypes.eq)
                            .applyPut(record)
                            .setPK(entity._expectFacets(record, attributes.pk))
                            .ifSK(() => {
                                entity._expectFacets(record, attributes.sk);
                                state.setSK(entity._buildQueryFacets(record, attributes.sk));
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["params", "go"],
            },
            patch: {
                name: "patch",
                action(entity, state, facets) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        const attributes = state.getCompositeAttributes();
                        return state
                            .setMethod(MethodTypes.update)
                            .setType(QueryTypes.eq)
                            .setPK(entity._expectFacets(facets, attributes.pk))
                            .ifSK(() => {
                                entity._expectFacets(facets, attributes.sk);
                                state.setSK(entity._buildQueryFacets(facets, attributes.sk));
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["set", "append", "remove", "add", "subtract", "data"],
            },
            update: {
                name: "update",
                action(entity, state, facets) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        const attributes = state.getCompositeAttributes();
                        return state
                            .setMethod(MethodTypes.update)
                            .setType(QueryTypes.eq)
                            .setPK(entity._expectFacets(facets, attributes.pk))
                            .ifSK(() => {
                                entity._expectFacets(facets, attributes.sk);
                                state.setSK(entity._buildQueryFacets(facets, attributes.sk));
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["data", "set", "append", "add", "updateRemove", "updateDelete", "go", "params", "subtract"],
            },
            data: {
                name: "data",
                action(entity, state, cb) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        state.query.updateProxy.invokeCallback(cb);
                        return state;
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["data", "set", "append", "add", "updateRemove", "updateDelete", "go", "params", "subtract"],
            },
            set: {
                name: "set",
                action(entity, state, data) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        entity.model.schema.checkUpdate(data);
                        state.query.updateProxy.fromObject(ItemOperations.set, data);
                        return state;
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["data", "set", "append", "add", "updateRemove", "updateDelete", "go", "params", "subtract"],
            },
            append: {
                name: "append",
                action(entity, state, data = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        entity.model.schema.checkUpdate(data);
                        state.query.updateProxy.fromObject(ItemOperations.append, data);
                        return state;
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["data", "set", "append", "add", "updateRemove", "updateDelete", "go", "params", "subtract"],
            },
            updateRemove: {
                name: "remove",
                action(entity, state, data) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        if (!Array.isArray(data)) {
                            throw new Error("Update method 'remove' expects type Array");
                        }
                        entity.model.schema.checkRemove(data);
                        state.query.updateProxy.fromArray(ItemOperations.remove, data);
                        return state;
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["data", "set", "append", "add", "updateRemove", "updateDelete", "go", "params", "subtract"],
            },
            updateDelete: {
                name: "delete",
                action(entity, state, data) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        entity.model.schema.checkUpdate(data);
                        state.query.updateProxy.fromObject(ItemOperations.delete, data);
                        return state;
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["data", "set", "append", "add", "updateRemove", "updateDelete", "go", "params", "subtract"],
            },
            add: {
                name: "add",
                action(entity, state, data) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        entity.model.schema.checkUpdate(data);
                        state.query.updateProxy.fromObject(ItemOperations.add, data);
                        return state;
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["data", "set", "append", "add", "updateRemove", "updateDelete", "go", "params", "subtract"],
            },
            subtract: {
                name: "subtract",
                action(entity, state, data) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        entity.model.schema.checkUpdate(data);
                        state.query.updateProxy.fromObject(ItemOperations.subtract, data);
                        return state;
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["data", "set", "append", "add", "updateRemove", "updateDelete", "go", "params", "subtract"],
            },
            query: {
                name: "query",
                action(entity, state, facets, options = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        const attributes = state.getCompositeAttributes();
                        return state
                            .setMethod(MethodTypes.query)
                            .setType(QueryTypes.is)
                            .setPK(entity._expectFacets(facets, attributes.pk))
                            .ifSK(() => {
                                state.setSK(entity._buildQueryFacets(facets, attributes.sk))
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["between", "gte", "gt", "lte", "lt", "begins", "params", "go", "page"],
            },
            between: {
                name: "between",
                action(entity, state, startingFacets = {}, endingFacets = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        const attributes = state.getCompositeAttributes();
                        return state
                            .setType(QueryTypes.and)
                            .setSK(entity._buildQueryFacets(endingFacets, attributes.sk))
                            .setType(QueryTypes.between)
                            .setSK(entity._buildQueryFacets(startingFacets, attributes.sk))
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["go", "params", "page"],
            },
            begins: {
                name: "begins",
                action(entity, state, facets = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        return state
                            .setType(QueryTypes.begins)
                            .ifSK(state => {
                                const attributes = state.getCompositeAttributes();
                                state.setSK(entity._buildQueryFacets(facets, attributes.sk))
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["go", "params", "page"],
            },
            gt: {
                name: "gt",
                action(entity, state, facets = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        return state
                            .setType(QueryTypes.gt)
                            .ifSK(state => {
                                const attributes = state.getCompositeAttributes();
                                state.setSK(entity._buildQueryFacets(facets, attributes.sk))
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["go", "params", "page"],
            },
            gte: {
                name: "gte",
                action(entity, state, facets = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        return state
                            .setType(QueryTypes.gte)
                            .ifSK(state => {
                                const attributes = state.getCompositeAttributes();
                                state.setSK(entity._buildQueryFacets(facets, attributes.sk))
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["go", "params", "page"],
            },
            lt: {
                name: "lt",
                action(entity, state, facets = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        return state.setType(QueryTypes.lt)
                            .ifSK(state => {
                                const attributes = state.getCompositeAttributes();
                                state.setSK(entity._buildQueryFacets(facets, attributes.sk))
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["go", "params", "page"],
            },
            lte: {
                name: "lte",
                action(entity, state, facets = {}) {
                    if (state.getError() !== null) {
                        return state;
                    }
                    try {
                        return state.setType(QueryTypes.lte)
                            .ifSK(state => {
                                const attributes = state.getCompositeAttributes();
                                state.setSK(entity._buildQueryFacets(facets, attributes.sk))
                            });
                    } catch(err) {
                        state.setError(err);
                        return state;
                    }
                },
                children: ["go", "params", "page"],
            },
            params: {
                name: "params",
                action(entity, state, options = {}) {
                    if (state.getError() !== null) {
                        throw state.error;
                    }
                    try {
                        if (!v.isStringHasLength(options.table) && !v.isStringHasLength(entity._getTableName())) {
                            throw new e.ElectroError(e.ErrorCodes.MissingTable, `Table name not defined. Table names must be either defined on the model, instance configuration, or as a query option.`);
                        }
                        let results;
                        switch (state.getMethod()) {
                            case MethodTypes.query:
                                results = entity._queryParams(state, options);
                                break;
                            case MethodTypes.batchWrite:
                                results = entity._batchWriteParams(state, options);
                                break
                            case MethodTypes.batchGet:
                                results = entity._batchGetParams(state, options);
                                break;
                            default:
                                results = entity._params(state, options);
                                break;
                        }

                        if (state.getMethod() === MethodTypes.update && results.ExpressionAttributeValues && Object.keys(results.ExpressionAttributeValues).length === 0) {
                            // An update that only does a `remove` operation would result in an empty object
                            // todo: change the getValues() method to return undefined in this case (would potentially require a more generous refactor)
                            delete results.ExpressionAttributeValues;
                        }
                        return results;
                    } catch(err) {
                        throw err;
                    }
                },
                children: [],
            },
            go: {
                name: "go",
                action(entity, state, options = {}) {
                    if (state.getError() !== null) {
                        return Promise.reject(state.error);
                    }
                    try {
                        if (entity.client === undefined) {
                            throw new e.ElectroError(e.ErrorCodes.NoClientDefined, "No client defined on model");
                        }
                        let params = clauses.params.action(entity, state, options);
                        let {config} = entity._applyParameterOptions({}, state.getOptions(), options);
                        return entity.go(state.getMethod(), params, config);
                    } catch(err) {
                        return Promise.reject(err);
                    }
                },
                children: [],
            },
            page: {
                name: "page",
                action(entity, state, page = null, options = {}) {
                    if (state.getError() !== null) {
                        return Promise.reject(state.error);
                    }
                    try {
                        options.page = page;
                        options._isPagination = true;
                        if (entity.client === undefined) {
                            throw new e.ElectroError(e.ErrorCodes.NoClientDefined, "No client defined on model");
                        }
                        let params = clauses.params.action(entity, state, options);
                        let {config} = entity._applyParameterOptions({}, state.getOptions(), options);
                        return entity.go(state.getMethod(), params, config);
                    } catch(err) {
                        return Promise.reject(err);
                    }
                },
                children: []
            },
        };

        class ChainState {
            constructor({index = "", compositeAttributes = {}, attributes = {}, hasSortKey = false, options = {}, parentState = null} = {}) {
                const update = new UpdateExpression({prefix: "_u"});
                this.parentState = parentState;
                this.error = null;
                this.attributes = attributes;
                this.query = {
                    collection: "",
                    index: index,
                    type: "",
                    method: "",
                    facets: { ...compositeAttributes },
                    update,
                    updateProxy: new AttributeOperationProxy({
                        builder: update,
                        attributes: attributes,
                        operations: UpdateOperations,
                    }),
                    put: {
                        data: {},
                    },
                    keys: {
                        pk: {},
                        sk: [],
                    },
                    filter: {
                        [ExpressionTypes.ConditionExpression]: new FilterExpression(),
                        [ExpressionTypes.FilterExpression]: new FilterExpression()
                    },
                    options,
                };
                this.subStates = [];
                this.hasSortKey = hasSortKey;
                this.prev = null;
                this.self = null;
            }

            init(entity, allClauses, currentClause) {
                let current = {};
                for (let child of currentClause.children) {
                    const name = allClauses[child].name;
                    current[name] = (...args) => {
                        this.prev = this.self;
                        this.self = child;
                        let results = allClauses[child].action(entity, this, ...args);
                        if (allClauses[child].children.length) {
                            return this.init(entity, allClauses, allClauses[child]);
                        } else {
                            return results;
                        }
                    };
                }
                return current;
            }

            getMethod() {
                return this.query.method;
            }

            getOptions() {
                return this.query.options;
            }

            setPK(attributes) {
                this.query.keys.pk = attributes;
                return this;
            }

            ifSK(cb) {
                if (this.hasSortKey) {
                    cb(this);
                }
                return this;
            }

            getCompositeAttributes() {
                return this.query.facets;
            }

            setSK(attributes, type = this.query.type) {
                if (this.hasSortKey) {
                    this.query.keys.sk.push({
                        type: type,
                        facets: attributes
                    });
                }
                return this;
            }

            setType(type) {
                if (!QueryTypes[type]) {
                    throw new Error(`Invalid query type: "${type}"`);
                }
                this.query.type = QueryTypes[type];
                return this;
            }

            setMethod(method) {
                if (!MethodTypes[method]) {
                    throw new Error(`Invalid method type: "${method}"`);
                }
                this.query.method = MethodTypes[method];
                return this;
            }

            setCollection(collection) {
                this.query.collection = collection;
                return this;
            }

            createSubState() {
                let subState = new ChainState({
                    parentState: this,
                    index: this.query.index,
                    attributes: this.attributes,
                    hasSortKey: this.hasSortKey,
                    options: this.query.options,
                    compositeAttributes: this.query.facets
                });
                this.subStates.push(subState);
                return subState;
            }

            getError() {
                return this.error;
            }

            setError(err) {
                this.error = err;
                if (this.parentState) {
                    this.parentState.setError(err);
                }
            }

            applyPut(data = {}) {
                this.query.put.data = {...this.query.put.data, ...data};
                return this;
            }
        }

        module.exports = {
            clauses,
            ChainState,
        };

    },{"./errors":16,"./operations":18,"./types":22,"./update":23,"./util":24,"./validations":25,"./where":26}],15:[function(require,module,exports){
        "use strict";
        const { Schema } = require("./schema");
        const { KeyCasing, TableIndex, FormatToReturnValues, ReturnValues, EntityVersions, ItemOperations, UnprocessedTypes, Pager, ElectroInstance, KeyTypes, QueryTypes, MethodTypes, Comparisons, ExpressionTypes, ModelVersions, ElectroInstanceTypes, MaxBatchItems } = require("./types");
        const { FilterFactory } = require("./filters");
        const { FilterOperations } = require("./operations");
        const { WhereFactory } = require("./where");
        const { clauses, ChainState } = require("./clauses");
        const validations = require("./validations");
        const utilities = require("./util");
        const e = require("./errors");

        class Entity {
            constructor(model, config = {}) {
                this._validateModel(model);
                this.version = EntityVersions.v1;
                this.config = config;
                this.client = config.client;
                this.model = this._parseModel(model, config);
                /** start beta/v1 condition **/
                this.config.table = config.table || model.table;
                /** end beta/v1 condition **/
                this._filterBuilder = new FilterFactory(this.model.schema.attributes, FilterOperations);
                this._whereBuilder = new WhereFactory(this.model.schema.attributes, FilterOperations);
                this._clausesWithFilters = this._filterBuilder.injectFilterClauses(clauses, this.model.filters);
                this._clausesWithFilters = this._whereBuilder.injectWhereClauses(this._clausesWithFilters);
                this.scan = this._makeChain(TableIndex, this._clausesWithFilters, clauses.index).scan();
                this.query = {};
                for (let accessPattern in this.model.indexes) {
                    let index = this.model.indexes[accessPattern].index;
                    this.query[accessPattern] = (...values) => {
                        return this._makeChain(index, this._clausesWithFilters, clauses.index).query(...values);
                    };
                }
                this.config.identifiers = config.identifiers || {};
                this.identifiers = {
                    entity: this.config.identifiers.entity || "__edb_e__",
                    version: this.config.identifiers.version || "__edb_v__",
                };
                this._instance = ElectroInstance.entity;
                this._instanceType = ElectroInstanceTypes.entity;
                this.schema = model;
            }

            setIdentifier(type = "", identifier = "") {
                if (!this.identifiers[type]) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidIdentifier, `Invalid identifier type: "${type}". Valid identifiers include: ${utilities.commaSeparatedString(Object.keys(this.identifiers))}`);
                } else {
                    this.identifiers[type] = identifier;
                }
            }

            getName() {
                return this.model.entity;
            }

            getVersion() {
                return this.model.version;
            }

            ownsItem(item) {
                return (
                    item &&
                    this.getName() === item[this.identifiers.entity] &&
                    this.getVersion() === item[this.identifiers.version] &&
                    validations.isStringHasLength(item[this.identifiers.entity]) &&
                    validations.isStringHasLength(item[this.identifiers.version])
                )
            }

            ownsLastEvaluatedKey(key = {}) {
                let {pk, sk} = this.model.prefixes[TableIndex];
                let hasSK = this.model.lookup.indexHasSortKeys[TableIndex];
                let pkMatch = typeof key[pk.field] === "string" && key[pk.field].startsWith(pk.prefix);
                if (pkMatch && hasSK) {
                    return typeof key[sk.field] === "string" && key[sk.field].startsWith(sk.prefix);
                }
                return pkMatch;
            }

            ownsPager(pager, index) {
                if (pager === null) {
                    return false;
                }
                let tableIndex = TableIndex;
                let tableIndexFacets = this.model.facets.byIndex[tableIndex];
                let indexFacets = this.model.facets.byIndex[tableIndex];

                // Unknown index
                if (tableIndexFacets === undefined || indexFacets === undefined) {
                    return false;
                }

                // Should match all primary index facets
                let matchesTableIndex = tableIndexFacets.all.every((facet) => {
                    return pager[facet.name] !== undefined;
                });

                // If the pager doesnt match the table index, exit early
                if (!matchesTableIndex) {
                    return false;
                }

                return indexFacets.all.every((facet) => {
                    return pager[facet.name] !== undefined;
                });
            }

            match(facets = {}) {
                let match = this._findBestIndexKeyMatch(facets);
                if (match.shouldScan) {
                    return this._makeChain(TableIndex, this._clausesWithFilters, clauses.index)
                        .scan()
                        .filter(attr => {
                            let eqFilters = [];
                            for (let facet of Object.keys(facets)) {
                                if (attr[facet] !== undefined && facets[facet] !== undefined) {
                                    eqFilters.push(attr[facet].eq(facets[facet]));
                                }
                            }
                            return eqFilters.join(" AND ");
                        });
                } else {
                    return this._makeChain(match.index, this._clausesWithFilters, clauses.index)
                        .query(facets)
                        .filter(attr => {
                            let eqFilters = [];
                            for (let facet of Object.keys(facets)) {
                                if (attr[facet] !== undefined && facets[facet] !== undefined) {
                                    eqFilters.push(attr[facet].eq(facets[facet]));
                                }
                            }
                            return eqFilters.join(" AND ");
                        });
                }
            }

            find(facets = {}) {
                let match = this._findBestIndexKeyMatch(facets);
                if (match.shouldScan) {
                    return this._makeChain(TableIndex, this._clausesWithFilters, clauses.index).scan();
                } else {
                    return this._makeChain(match.index, this._clausesWithFilters, clauses.index).query(facets);
                }
            }

            collection(collection = "", clauses = {}, facets = {}, {expressions = {}, parse} = {}) {
                let options = {
                    parse,
                    expressions: {
                        names: expressions.names || {},
                        values: expressions.values || {},
                        expression: expressions.expression || ""
                    },
                    _isCollectionQuery: true,
                };

                let index = this.model.translations.collections.fromCollectionToIndex[collection];
                if (index === undefined) {
                    throw new Error(`Invalid collection: ${collection}`);
                }
                return this._makeChain(index, clauses, clauses.index, options).collection(
                    collection,
                    facets
                );
            }

            _validateModel(model) {
                return validations.model(model);
            }

            get(facets = {}) {
                let index = TableIndex;
                if (Array.isArray(facets)) {
                    return this._makeChain(index, this._clausesWithFilters, clauses.index).batchGet(facets);
                } else {
                    return this._makeChain(index, clauses, clauses.index).get(facets);
                }
            }


            delete(facets = {}) {
                let index = TableIndex;
                if (Array.isArray(facets)) {
                    return this._makeChain(index, this._clausesWithFilters, clauses.index).batchDelete(facets);
                } else {
                    return this._makeChain(index, this._clausesWithFilters, clauses.index).delete(facets);
                }
            }

            put(attributes = {}) {
                let index = TableIndex;
                if (Array.isArray(attributes)) {
                    return this._makeChain(index, this._clausesWithFilters, clauses.index).batchPut(attributes);
                } else {
                    return this._makeChain(index, this._clausesWithFilters, clauses.index).put(attributes);
                }
            }

            create(attributes = {}) {
                let index = TableIndex;
                let options = {
                    params: {
                        ConditionExpression: this._makeItemDoesntExistConditions(index)
                    }
                };
                return this._makeChain(index, this._clausesWithFilters, clauses.index, options).create(attributes);
            }

            update(facets = {}) {
                let index = TableIndex;
                return this._makeChain(index, this._clausesWithFilters, clauses.index).update(facets);
            }

            patch(facets = {}) {
                let index = TableIndex;
                let options = {
                    params: {
                        ConditionExpression: this._makeItemExistsConditions(index)
                    }
                };
                return this._makeChain(index, this._clausesWithFilters, clauses.index, options).patch(facets);
            }

            remove(facets = {}) {
                let index = TableIndex;
                let options = {
                    params: {
                        ConditionExpression: this._makeItemExistsConditions(index)
                    }
                };
                return this._makeChain(index, this._clausesWithFilters, clauses.index, options).remove(facets);
            }

            async go(method, parameters = {}, config = {}) {
                let stackTrace;
                if (!config.originalErr) {
                    stackTrace = new e.ElectroError(e.ErrorCodes.AWSError);
                }
                try {
                    switch (method) {
                        case MethodTypes.batchWrite:
                            return await this.executeBulkWrite(parameters, config);
                        case MethodTypes.batchGet:
                            return await this.executeBulkGet(parameters, config);
                        case MethodTypes.query:
                            return await this.executeQuery(parameters, config)
                        default:
                            return await this.executeOperation(method, parameters, config);
                    }
                } catch (err) {
                    if (config.originalErr || stackTrace === undefined) {
                        return Promise.reject(err);
                    } else {
                        if (err.__isAWSError) {
                            stackTrace.message = new e.ElectroError(e.ErrorCodes.AWSError, err.message).message;
                            return Promise.reject(stackTrace);
                        } else if (err.isElectroError) {
                            return Promise.reject(err);
                        } else {
                            stackTrace.message = new e.ElectroError(e.ErrorCodes.UnknownError, err.message).message;
                            return Promise.reject(stackTrace);
                        }
                    }
                }
            }

            async _exec(method, parameters) {
                return this.client[method](parameters).promise()
                    .catch(err => {
                        err.__isAWSError = true;
                        throw err;
                    });
            }

            async executeBulkWrite(parameters, config) {
                if (!Array.isArray(parameters)) {
                    parameters = [parameters];
                }
                let results = [];
                let concurrent = this._normalizeConcurrencyValue(config.concurrent)
                let concurrentOperations = utilities.batchItems(parameters, concurrent);
                for (let operation of concurrentOperations) {
                    await Promise.all(operation.map(async params => {
                        let response = await this._exec(MethodTypes.batchWrite, params);
                        if (validations.isFunction(config.parse)) {
                            let parsed = await config.parse(config, response);
                            if (parsed) {
                                results.push(parsed);
                            }
                            return;
                        }
                        let unprocessed = this.formatBulkWriteResponse(response, config);
                        for (let u of unprocessed) {
                            results.push(u);
                        }
                    }));
                }

                return results;
            }

            async executeBulkGet(parameters, config) {
                if (!Array.isArray(parameters)) {
                    parameters = [parameters];
                }
                let concurrent = this._normalizeConcurrencyValue(config.concurrent)
                let concurrentOperations = utilities.batchItems(parameters, concurrent);

                let resultsAll = [];
                let unprocessedAll = [];
                for (let operation of concurrentOperations) {
                    await Promise.all(operation.map(async params => {
                        let response = await this._exec(MethodTypes.batchGet, params);
                        if (validations.isFunction(config.parse)) {
                            resultsAll.push(await config.parse(config, response));
                            return;
                        }
                        let [results, unprocessed] = this.formatBulkGetResponse(response, config);
                        for (let r of results) {
                            resultsAll.push(r);
                        }
                        for (let u of unprocessed) {
                            unprocessedAll.push(u);
                        }
                    }));
                }
                return [resultsAll, unprocessedAll];
            }

            async executeQuery(parameters, config = {}) {
                let results = config._isCollectionQuery
                    ? {}
                    : [];
                let ExclusiveStartKey;
                let pages = this._normalizePagesValue(config.pages);
                let max = this._normalizeLimitValue(config.limit);
                let iterations = 0;
                let count = 0;
                do {
                    let limit = max === undefined
                        ? parameters.Limit
                        : max - count;
                    let response = await this._exec("query", {ExclusiveStartKey, ...parameters, Limit: limit});

                    ExclusiveStartKey = response.LastEvaluatedKey;

                    if (validations.isFunction(config.parse)) {
                        response = config.parse(config, response);
                    } else {
                        response = this.formatResponse(response, parameters.IndexName, config);
                    }

                    if (config.raw || config._isPagination) {
                        return response;
                    } else if (config._isCollectionQuery) {
                        for (const entity in response) {
                            if (max) {
                                count += response[entity].length;
                            }
                            results[entity] = results[entity] || [];
                            results[entity] = [...results[entity], ...response[entity]];
                        }
                    } else if (Array.isArray(response)) {
                        if (max) {
                            count += response.length;
                        }
                        results = [...results, ...response];
                    } else {
                        return response;
                    }

                    iterations++;
                } while(ExclusiveStartKey && iterations < pages && (max === undefined || count < max));
                return results;
            }

            async executeOperation(method, parameters, config) {
                let response = await this._exec(method, parameters);
                if (validations.isFunction(config.parse)) {
                    return config.parse(config, response);
                }
                switch (parameters.ReturnValues) {
                    case FormatToReturnValues.none:
                        return null;
                    case FormatToReturnValues.all_new:
                    case FormatToReturnValues.all_old:
                    case FormatToReturnValues.updated_new:
                    case FormatToReturnValues.updated_old:
                        return this.formatResponse(response, parameters.IndexName, config);
                    case FormatToReturnValues.default:
                    default:
                        return this._formatDefaultResponse(method, parameters.IndexName, parameters, config, response);
                }
            }

            _formatDefaultResponse(method, index, parameters, config = {}, response) {
                switch (method) {
                    case MethodTypes.put:
                    case MethodTypes.create:
                        return this.formatResponse(parameters, index, config);
                    case MethodTypes.update:
                    case MethodTypes.patch:
                    case MethodTypes.delete:
                    case MethodTypes.remove:
                        return this.formatResponse(response, index, {...config, _objectOnEmpty: true});
                    default:
                        return this.formatResponse(response, index, config);
                }
            }

            cleanseRetrievedData(item = {}, options = {}) {
                let { includeKeys } = options;
                let data = {};
                let names = this.model.schema.translationForRetrieval;
                for (let [attr, value] of Object.entries(item)) {
                    let name = names[attr];
                    if (name) {
                        data[name] = value;
                    } else if (includeKeys) {
                        data[attr] = value;
                    }
                }
                return data;
            }

            formatBulkWriteResponse(response = {}, config = {}) {
                if (!response || !response.UnprocessedItems) {
                    return response;
                }
                const table = config.table || this._getTableName();
                const index = TableIndex;
                let unprocessed = response.UnprocessedItems[table];
                if (Array.isArray(unprocessed) && unprocessed.length) {
                    return unprocessed.map(request => {
                        if (request.PutRequest) {
                            return this.formatResponse(request.PutRequest, index, config);
                        } else if (request.DeleteRequest) {
                            if (config.unprocessed === UnprocessedTypes.raw) {
                                return request.DeleteRequest.Key;
                            } else {
                                return this._formatKeysToItem(index, request.DeleteRequest.Key);
                            }
                        } else {
                            throw new Error("Unknown response format");
                        }
                    })
                } else {
                    return []
                }
            }

            formatBulkGetResponse(response = {}, config = {}) {
                let unprocessed = [];
                let results = [];
                const table = config.table || this._getTableName();
                const index = TableIndex;
                if (!response.UnprocessedKeys || !response.Responses) {
                    throw new Error("Unknown response format");
                }
                if (response.UnprocessedKeys[table] && response.UnprocessedKeys[table].Keys && Array.isArray(response.UnprocessedKeys[table].Keys)) {
                    for (let value of response.UnprocessedKeys[table].Keys) {
                        if (config && config.unprocessed === UnprocessedTypes.raw) {
                            unprocessed.push(value);
                        } else {
                            unprocessed.push(
                                this._formatKeysToItem(index, value)
                            );
                        }
                    }
                }

                if (response.Responses[table] && Array.isArray(response.Responses[table])) {
                    results = this.formatResponse({Items: response.Responses[table]}, index, config);
                }

                return [results, unprocessed];
            }

            formatResponse(response, index, config = {}) {
                let stackTrace;
                if (!config.originalErr) {
                    stackTrace = new e.ElectroError(e.ErrorCodes.AWSError);
                }
                try {
                    let results = {};
                    if (config.raw && !config._isPagination) {
                        if (response.TableName) {
                            results = {};
                        } else {
                            results = response;
                        }
                    } else if (config.raw && (config._isPagination || config.lastEvaluatedKeyRaw)) {
                        return [response.LastEvaluatedKey || null, response];
                    } else {
                        if (response.Item) {
                            if (config.ignoreOwnership || this.ownsItem(response.Item)) {
                                results = this.model.schema.formatItemForRetrieval(response.Item, config);
                                if (Object.keys(results).length === 0) {
                                    results = null;
                                }
                            }
                        } else if (response.Items) {
                            results = [];
                            for (let item of response.Items) {
                                if (config.ignoreOwnership || this.ownsItem(item)) {
                                    let record = this.model.schema.formatItemForRetrieval(item, config);
                                    if (Object.keys(record).length > 0) {
                                        results.push(record);
                                    }
                                }
                            }
                        } else if (response.Attributes) {
                            results = this.model.schema.formatItemForRetrieval(response.Attributes, config);
                            if (Object.keys(results).length === 0) {
                                results = null;
                            }
                        } else if (config._objectOnEmpty) {
                            return {};
                        } else {
                            results = null;
                        }
                    }

                    if (config._isPagination) {
                        let nextPage = this._formatReturnPager(config, index, response.LastEvaluatedKey, results[results.length - 1]);
                        results = [nextPage, results];
                    }

                    return results;

                } catch (err) {
                    if (config.originalErr || stackTrace === undefined) {
                        throw err;
                    } else {
                        stackTrace.message = err.message;
                        throw stackTrace;
                    }
                }
            }


            parse(item, options = {}) {
                if (item === undefined || item === null) {
                    return null;
                }
                const config = {
                    ...(options || {}),
                    ignoreOwnership: true
                }
                return this.formatResponse(item, TableIndex, config);
            }

            _formatReturnPager(config, index, lastEvaluatedKey, lastReturned) {
                let page = lastEvaluatedKey || null;
                if (config.pager !== Pager.raw) {
                    page = this._formatKeysToItem(index, page, lastReturned);
                    if (page && config.pager === Pager.named) {
                        page[this.identifiers.entity] = this.getName();
                        page[this.identifiers.version] = this.getVersion();
                    }
                }
                return page;
            }

            _getTableName() {
                return this.config.table;
            }

            _setTableName(table) {
                this.config.table = table;
            }

            _setClient(client) {
                if (client) {
                    this.client = client;
                }
            }

            _chain(state, clauses, clause) {
                let current = {};
                for (let child of clause.children) {
                    current[child] = (...args) => {
                        state.prev = state.self;
                        state.self = child;
                        let results = clauses[child].action(this, state, ...args);
                        if (clauses[child].children.length) {
                            return this._chain(results, clauses, clauses[child]);
                        } else {
                            return results;
                        }
                    };
                }
                return current;
            }
            /* istanbul ignore next */
            _makeChain(index = TableIndex, clauses, rootClause, options = {}) {
                let state = new ChainState({
                    index,
                    options,
                    attributes: this.model.schema.attributes,
                    hasSortKey: this.model.lookup.indexHasSortKeys[index],
                    compositeAttributes: this.model.facets.byIndex[index]
                });
                return state.init(this, clauses, rootClause);
            }

            _regexpEscape(string) {
                return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            }

            _normalizeConcurrencyValue(value = 1) {
                value = parseInt(value);
                if (isNaN(value) || value < 1) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidConcurrencyOption, "Query option 'concurrency' must be of type 'number' and greater than zero.");
                }
                return value;
            }

            _normalizePagesValue(value = Number.MAX_SAFE_INTEGER) {
                value = parseInt(value);
                if (isNaN(value) || value < 1) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidPagesOption, "Query option 'pages' must be of type 'number' and greater than zero.");
                }
                return value;
            }

            _normalizeLimitValue(value) {
                if (value !== undefined) {
                    value = parseInt(value);
                    if (isNaN(value) || value < 1) {
                        throw new e.ElectroError(e.ErrorCodes.InvalidLimitOption, "Query option 'limit' must be of type 'number' and greater than zero.");
                    }
                }
                return value;
            }

            _deconstructKeys(index, keyType, key, backupFacets = {}) {
                if (typeof key !== "string" || key.length === 0) {
                    return null;
                }

                let accessPattern = this.model.translations.indexes.fromIndexToAccessPattern[index];
                let {prefix, isCustom} = this.model.prefixes[index][keyType];
                let {facets} = this.model.indexes[accessPattern][keyType];
                let names = [];
                let types = [];
                let pattern = `^${this._regexpEscape(prefix)}`;
                let labels = this.model.facets.labels[index][keyType] || [];
                for (let {name, label} of labels) {
                    let { type } = this.model.schema.attributes[name];
                    if (isCustom) {
                        pattern += `${this._regexpEscape(label === undefined ? "" : label)}(.+)`;
                    } else {
                        pattern += `#${this._regexpEscape(label === undefined ? name : label)}_(.+)`;
                    }
                    names.push(name);
                    types.push(type);
                }
                pattern += "$";
                let regex = RegExp(pattern);
                let match = key.match(regex);
                let results = {};
                if (match) {
                    for (let i = 0; i < names.length; i++) {
                        let key = names[i];
                        let value = match[i+1];
                        let type = types[i];
                        switch (type) {
                            case "number":
                                value = parseFloat(value);
                                break;
                            case "boolean":
                                value = value === "true";
                                break;
                        }
                        results[key] = value;
                    }
                } else {
                    if (Object.keys(backupFacets || {}).length === 0) {
                        // this can occur when a scan is performed but returns no results given the current filters or record timing
                        return {};
                    }
                    for (let facet of facets) {
                        if (backupFacets[facet] === undefined) {
                            throw new e.ElectroError(e.ErrorCodes.LastEvaluatedKey, 'LastEvaluatedKey contains entity that does not match the entity used to query. Use {pager: "raw"} query option.');
                        } else {
                            results[facet] = backupFacets[facet];
                        }
                    }
                }
                return results;
            }



            _deconstructIndex(index = TableIndex, lastEvaluated, lastReturned) {
                let pkName = this.model.translations.keys[index].pk;
                let skName = this.model.translations.keys[index].sk;
                let pkFacets = this._deconstructKeys(index, KeyTypes.pk, lastEvaluated[pkName], lastReturned);
                let skFacets = this._deconstructKeys(index, KeyTypes.sk, lastEvaluated[skName], lastReturned);
                let facets = {...pkFacets};
                if (skFacets && Object.keys(skFacets).length) {
                    facets = {...skFacets, ...pkFacets};
                }
                return facets;
            }

            _formatKeysToItem(index = TableIndex, lastEvaluated, lastReturned) {
                if (lastEvaluated === null || typeof lastEvaluated !== "object" || Object.keys(lastEvaluated).length === 0) {
                    return lastEvaluated;
                }
                let tableIndex = TableIndex;
                let pager = this._deconstructIndex(index, lastEvaluated, lastReturned);
                // lastEvaluatedKeys from query calls include the index pk/sk as well as the table index's pk/sk
                if (index !== tableIndex) {
                    pager = {...pager, ...this._deconstructIndex(tableIndex, lastEvaluated, lastReturned)};
                }
                let pagerIsEmpty = Object.keys(pager).length === 0;
                let pagerIsIncomplete = this.model.facets.byIndex[tableIndex].all.find(facet => pager[facet.name] === undefined);
                if (pagerIsEmpty || pagerIsIncomplete) {
                    // In this case no suitable record could be found be the deconstructed pager.
                    // This can be valid in cases where a scan is performed but returns no results.
                    return null;
                }

                return pager;
            }

            _constructPagerIndex(index = TableIndex, item) {
                let pk = this._expectFacets(item, this.model.facets.byIndex[index].pk);
                let sk = this._expectFacets(item, this.model.facets.byIndex[index].sk);
                let keys = this._makeIndexKeys(index, pk, sk);
                return this._makeParameterKey(index, keys.pk, ...keys.sk);
            }

            _formatSuppliedPager(index = TableIndex, item) {
                if (typeof item !== "object" || Object.keys(item).length === 0) {
                    return item;
                }
                let tableIndex = TableIndex;
                let pager = this._constructPagerIndex(index, item);
                if (index !== tableIndex) {
                    pager = {...pager, ...this._constructPagerIndex(tableIndex, item)}
                }
                return pager
            }

            _applyParameterOptions(params, ...options) {
                let config = {
                    includeKeys: false,
                    originalErr: false,
                    raw: false,
                    params: {},
                    page: {},
                    lastEvaluatedKeyRaw: false,
                    table: undefined,
                    concurrent: undefined,
                    parse: undefined,
                    pager: Pager.named,
                    unprocessed: UnprocessedTypes.item,
                    response: 'default',
                    ignoreOwnership: false,
                    _isPagination: false,
                    _isCollectionQuery: false,
                    pages: undefined,
                };

                config = options.reduce((config, option) => {
                    if (typeof option.response === 'string' && option.response.length) {
                        const format = 	ReturnValues[option.response];
                        if (format === undefined) {
                            throw new e.ElectroError(e.ErrorCodes.InvalidOptions, `Invalid value for query option "format" provided: "${option.format}". Allowed values include ${utilities.commaSeparatedString(Object.keys(ReturnValues))}.`);
                        }
                        config.response = format;
                        config.params.ReturnValues = FormatToReturnValues[format];
                    }

                    if (option.pages !== undefined) {
                        config.pages = option.pages;
                    }

                    if (option._isCollectionQuery === true) {
                        config._isCollectionQuery = true;
                    }

                    if (option.includeKeys === true) {
                        config.includeKeys = true;
                    }

                    if (option.originalErr === true) {
                        config.originalErr = true;
                    }

                    if (option.raw === true) {
                        config.raw = true;
                    }

                    if (option._isPagination) {
                        config._isPagination = true;
                    }

                    if (option.lastEvaluatedKeyRaw === true) {
                        config.lastEvaluatedKeyRaw = true;
                        config.pager = Pager.raw;
                        config.unprocessed = UnprocessedTypes.raw;
                    }

                    if (option.limit !== undefined) {
                        config.limit = option.limit;
                        config.params.Limit = option.limit;
                    }

                    if (validations.isStringHasLength(option.table)) {
                        config.params.TableName = option.table;
                    }

                    if (option.concurrent !== undefined) {
                        config.concurrent = option.concurrent;
                    }

                    if (validations.isFunction(option.parse)) {
                        config.parse = option.parse;
                    }

                    if (typeof option.pager === "string") {
                        if (typeof Pager[option.pager] === "string") {
                            config.pager = option.pager;
                        } else {
                            throw new e.ElectroError(e.ErrorCodes.InvalidOptions, `Invalid value for option "pager" provided: "${option.pager}". Allowed values include ${utilities.commaSeparatedString(Object.keys(Pager))}.`);
                        }
                    }

                    if (typeof option.unprocessed === "string") {
                        if (typeof UnprocessedTypes[option.unprocessed] === "string") {
                            config.unproessed = UnprocessedTypes[option.unprocessed];
                        } else {
                            throw new e.ElectroError(e.ErrorCodes.InvalidOptions, `Invalid value for option "unprocessed" provided: "${option.unprocessed}". Allowed values include ${utilities.commaSeparatedString(Object.keys(UnprocessedTypes))}.`);
                        }
                    }

                    if (option.ignoreOwnership) {
                        config.ignoreOwnership = option.ignoreOwnership;
                    }

                    config.page = Object.assign({}, config.page, option.page);
                    config.params = Object.assign({}, config.params, option.params);
                    return config;
                }, config);

                let parameters = Object.assign({}, params);

                for (let customParameter of Object.keys(config.params)) {
                    if (config.params[customParameter] !== undefined) {
                        parameters[customParameter] = config.params[customParameter];
                    }
                }

                if (Object.keys(config.page || {}).length) {
                    if (config.raw || config.pager === Pager.raw) {
                        parameters.ExclusiveStartKey = config.page;
                    } else {
                        parameters.ExclusiveStartKey = this._formatSuppliedPager(params.IndexName, config.page);
                    }
                }

                return {parameters, config};
            }

            _makeItemDoesntExistConditions(index) {
                let hasSortKey = this.model.lookup.indexHasSortKeys[index];
                let accessPattern = this.model.translations.indexes.fromIndexToAccessPattern[index];
                let pkField = this.model.indexes[accessPattern].pk.field;
                let filter = [`attribute_not_exists(${pkField})`];
                if (hasSortKey) {
                    let skField = this.model.indexes[accessPattern].sk.field;
                    filter.push(`attribute_not_exists(${skField})`);
                }
                return filter.join(" AND ");
            }

            _makeItemExistsConditions(index) {
                let hasSortKey = this.model.lookup.indexHasSortKeys[index];
                let accessPattern = this.model.translations.indexes.fromIndexToAccessPattern[index];
                let pkField = this.model.indexes[accessPattern].pk.field;

                let filter = [`attribute_exists(${pkField})`];
                if (hasSortKey) {
                    let skField = this.model.indexes[accessPattern].sk.field;
                    filter.push(`attribute_exists(${skField})`);
                }
                return filter.join(" AND ");
            }

            _applyParameterExpressionTypes(params, filter) {
                const conditions = filter[ExpressionTypes.ConditionExpression];
                if (conditions.build().length > 0) {
                    if (typeof params[ExpressionTypes.ConditionExpression] === "string" && params[ExpressionTypes.ConditionExpression].length > 0) {
                        params[ExpressionTypes.ConditionExpression] = `${params[ExpressionTypes.ConditionExpression]} AND ${conditions.build()}`
                    } else {
                        params[ExpressionTypes.ConditionExpression] = conditions.build();
                    }
                    if (Object.keys(conditions.getNames()).length > 0) {
                        params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
                        params.ExpressionAttributeNames = Object.assign({}, conditions.getNames(), params.ExpressionAttributeNames);
                    }
                    if (Object.keys(conditions.getValues()).length > 0) {
                        params.ExpressionAttributeValues = params.ExpressionAttributeValues || {};
                        params.ExpressionAttributeValues = Object.assign({}, conditions.getValues(), params.ExpressionAttributeValues);
                    }
                }
                return params;
            }
            /* istanbul ignore next */
            _params(state, config = {}) {
                let { keys = {}, method = "", put = {}, update = {}, filter = {}, options = {} } = state.query;
                let consolidatedQueryFacets = this._consolidateQueryFacets(keys.sk);
                let params = {};
                switch (method) {
                    case MethodTypes.get:
                    case MethodTypes.delete:
                    case MethodTypes.remove:
                        params = this._makeSimpleIndexParams(keys.pk, ...consolidatedQueryFacets);
                        break;
                    case MethodTypes.put:
                    case MethodTypes.create:
                        params = this._makePutParams(put, keys.pk, ...keys.sk);
                        break;
                    case MethodTypes.update:
                    case MethodTypes.patch:
                        params = this._makeUpdateParams(
                            update,
                            keys.pk,
                            ...consolidatedQueryFacets,
                        );
                        break;
                    case MethodTypes.scan:
                        params = this._makeScanParam(filter[ExpressionTypes.FilterExpression]);
                        break;
                    /* istanbul ignore next */
                    default:
                        throw new Error(`Invalid method: ${method}`);
                }
                let applied = this._applyParameterOptions(params, options, config);
                return this._applyParameterExpressionTypes(applied.parameters, filter);
            }

            _batchGetParams(state, config = {}) {
                let table = config.table || this._getTableName();
                let userDefinedParams = config.params || {};
                let records = [];
                for (let itemState of state.subStates) {
                    let method = itemState.query.method;
                    let params = this._params(itemState, config);
                    if (method === MethodTypes.get) {
                        let {Key} = params;
                        records.push(Key);
                    }
                }
                let batches = utilities.batchItems(records, MaxBatchItems.batchGet);
                return batches.map(batch => {
                    return {
                        RequestItems: {
                            [table]: {
                                ...userDefinedParams,
                                Keys: batch
                            }
                        }
                    }
                });
            }

            _batchWriteParams(state, config = {}) {
                let table = config.table || this._getTableName();
                let records = [];
                for (let itemState of state.subStates) {
                    let method = itemState.query.method;
                    let params = this._params(itemState, config);
                    switch (method) {
                        case MethodTypes.put:
                            let {Item} = params;
                            records.push({PutRequest: {Item}});
                            break;
                        case MethodTypes.delete:
                            let {Key} = params;
                            records.push({DeleteRequest: {Key}});
                            break;
                        /* istanbul ignore next */
                        default:
                            throw new Error("Invalid method type");
                    }
                }
                let batches = utilities.batchItems(records, MaxBatchItems.batchWrite);
                return batches.map(batch => {
                    return {
                        RequestItems: {
                            [table]: batch
                        }
                    }
                });
            }

            _makeParameterKey(index, pk, sk) {
                let hasSortKey = this.model.lookup.indexHasSortKeys[index];
                let accessPattern = this.model.translations.indexes.fromIndexToAccessPattern[index];
                let pkField = this.model.indexes[accessPattern].pk.field;
                let key = {
                    [pkField]: pk,
                };
                if (hasSortKey && sk !== undefined) {
                    let skField = this.model.indexes[accessPattern].sk.field;
                    key[skField] = sk;
                }
                return key;
            }

            getIdentifierExpressions(alias = this.getName()) {
                let name = this.getName();
                let version = this.getVersion();
                return {
                    names: {
                        [`#${this.identifiers.entity}_${alias}`]: this.identifiers.entity,
                        [`#${this.identifiers.version}_${alias}`]: this.identifiers.version,
                    },
                    values: {
                        [`:${this.identifiers.entity}_${alias}`]: name,
                        [`:${this.identifiers.version}_${alias}`]: version,
                    },
                    expression: `(#${this.identifiers.entity}_${alias} = :${this.identifiers.entity}_${alias} AND #${this.identifiers.version}_${alias} = :${this.identifiers.version}_${alias})`
                }
            }

            /* istanbul ignore next */
            _makeScanParam(filter = {}) {
                let indexBase = TableIndex;
                let hasSortKey = this.model.lookup.indexHasSortKeys[indexBase];
                let accessPattern = this.model.translations.indexes.fromIndexToAccessPattern[indexBase];
                let pkField = this.model.indexes[accessPattern].pk.field;
                let {pk, sk} = this._makeIndexKeys(indexBase);
                let keys = this._makeParameterKey(indexBase, pk, ...sk);
                let keyExpressions = this._expressionAttributeBuilder(keys);
                let params = {
                    TableName: this._getTableName(),
                    ExpressionAttributeNames: this._mergeExpressionsAttributes(
                        filter.getNames(),
                        keyExpressions.ExpressionAttributeNames
                    ),
                    ExpressionAttributeValues: this._mergeExpressionsAttributes(
                        filter.getValues(),
                        keyExpressions.ExpressionAttributeValues,
                    ),
                    FilterExpression: `begins_with(#${pkField}, :${pkField})`,
                };
                params.ExpressionAttributeNames["#" + this.identifiers.entity] = this.identifiers.entity;
                params.ExpressionAttributeNames["#" + this.identifiers.version] = this.identifiers.version;
                params.ExpressionAttributeValues[":" + this.identifiers.entity] = this.getName();
                params.ExpressionAttributeValues[":" + this.identifiers.version] = this.getVersion();
                params.FilterExpression = `${params.FilterExpression} AND #${this.identifiers.entity} = :${this.identifiers.entity} AND #${this.identifiers.version} = :${this.identifiers.version}`;
                if (hasSortKey) {
                    let skField = this.model.indexes[accessPattern].sk.field;
                    params.FilterExpression = `${params.FilterExpression} AND begins_with(#${skField}, :${skField})`;
                }
                if (filter.build()) {
                    params.FilterExpression = `${params.FilterExpression} AND ${filter.build()}`;
                }
                return params;
            }

            _makeSimpleIndexParams(partition, sort) {
                let index = TableIndex;
                let keys = this._makeIndexKeys(index, partition, sort);
                let Key = this._makeParameterKey(index, keys.pk, ...keys.sk);
                let TableName = this._getTableName();
                return {Key, TableName};
            }

            _removeAttributes(item, keys) {
                let copy = {...item};
                for (let key of (Object.keys(keys))) {
                    delete copy[key];
                }
                return copy;
            }

            _makeUpdateParams(update = {}, pk = {}, sk = {}) {
                let primaryIndexAttributes = {...pk, ...sk};
                let modifiedAttributeValues = {};
                let modifiedAttributeNames = {};
                for (const path of Object.keys(update.paths)) {
                    const {value, name} = update.paths[path];
                    modifiedAttributeValues[path] = value;
                    modifiedAttributeNames[path] = name;
                }
                const removed = {};
                for (const name in update.impacted) {
                    if (update.impacted[name] === ItemOperations.remove) {
                        removed[name] = name;
                    }
                }
                modifiedAttributeValues = this._removeAttributes(modifiedAttributeValues, {...pk, ...sk, ...this.model.schema.getReadOnly()});
                const preparedUpdateValues = this.model.schema.applyAttributeSetters(modifiedAttributeValues);
                // We need to remove the pk/sk facets from before applying the Attribute setters because these values didnt
                // change, and we also don't want to trigger the setters of any attributes watching these facets because that
                // should only happen when an attribute is changed.
                const { indexKey, updatedKeys, deletedKeys = [] } = this._getUpdatedKeys(pk, sk, preparedUpdateValues, removed);
                const accessPattern = this.model.translations.indexes.fromIndexToAccessPattern[TableIndex];

                for (const path of Object.keys(preparedUpdateValues)) {
                    if (modifiedAttributeNames[path] !== undefined && preparedUpdateValues[path] !== undefined) {
                        update.updateValue(modifiedAttributeNames[path], preparedUpdateValues[path]);
                    } else if (preparedUpdateValues[path] !== undefined) {
                        update.set(path, preparedUpdateValues[path]);
                    }
                }

                for (const indexKey of Object.keys(updatedKeys)) {
                    const isNotTablePK = indexKey !== this.model.indexes[accessPattern].pk.field;
                    const isNotTableSK = indexKey !== this.model.indexes[accessPattern].sk.field;
                    const wasNotAlreadyModified = modifiedAttributeNames[indexKey] === undefined;
                    if (isNotTablePK && isNotTableSK && wasNotAlreadyModified) {
                        update.set(indexKey, updatedKeys[indexKey]);

                    }
                }

                for (const indexKey of deletedKeys) {
                    const isNotTablePK = indexKey !== this.model.indexes[accessPattern].pk.field;
                    const isNotTableSK = indexKey !== this.model.indexes[accessPattern].sk.field;
                    const wasNotAlreadyModified = modifiedAttributeNames[indexKey] === undefined;
                    if (isNotTablePK && isNotTableSK && wasNotAlreadyModified) {
                        update.remove(indexKey);
                    }
                }

                // This loop adds the composite attributes to the Primary Index. This is important
                // in the case an update results in an "upsert". We want to add the Primary Index
                // composite attributes to the update so they will be included on the item when it
                // is created. It is done after all of the above because it is not a true "update"
                // so it should not be subject to the above "rules".
                for (const primaryIndexAttribute of Object.keys(primaryIndexAttributes)) {
                    // isNotTablePK and isNotTableSK is important to check in case these properties
                    // are not also the name of the index (you cannot modify the PK or SK of an item
                    // after its creation)
                    const attribute = this.model.schema.attributes[primaryIndexAttribute];
                    const isNotTablePK = !!(attribute && attribute.field !== this.model.indexes[accessPattern].pk.field);
                    const isNotTableSK = !!(attribute && attribute.field !== this.model.indexes[accessPattern].sk.field);
                    const wasNotAlreadyModified = modifiedAttributeNames[primaryIndexAttribute] === undefined;
                    if (isNotTablePK && isNotTableSK && wasNotAlreadyModified) {
                        update.set(primaryIndexAttribute, primaryIndexAttributes[primaryIndexAttribute]);
                    }
                }

                update.set(this.identifiers.entity, this.getName());
                update.set(this.identifiers.version, this.getVersion());

                return {
                    UpdateExpression: update.build(),
                    ExpressionAttributeNames: update.getNames(),
                    ExpressionAttributeValues: update.getValues(),
                    TableName: this._getTableName(),
                    Key: indexKey,
                };
            }

            /* istanbul ignore next */
            _makePutParams({ data } = {}, pk, sk) {
                let { updatedKeys, setAttributes } = this._getPutKeys(pk, sk && sk.facets, data);
                let translatedFields = this.model.schema.translateToFields(setAttributes);

                return {
                    Item: {
                        ...translatedFields,
                        ...updatedKeys,
                        [this.identifiers.entity]: this.getName(),
                        [this.identifiers.version]: this.getVersion(),
                    },
                    TableName: this._getTableName(),
                };
            }

            _updateExpressionBuilder(data) {
                let accessPattern = this.model.translations.indexes.fromIndexToAccessPattern[TableIndex]
                let skip = [
                    // Removing readOnly from here because this should have been validated earlier in the process. Not checking
                    // readOnly here also allows `watch` properties to circumnavigate the readOnly check for attributes that
                    // should be calculated but not updatable by the user.
                    // ...this.model.schema.getReadOnly(),

                    // ...this.model.facets.fields,
                    this.model.indexes[accessPattern].pk.field,
                    this.model.indexes[accessPattern].sk.field
                ];
                return this._expressionAttributeBuilder(data, ItemOperations.set, { skip });
            }

            _queryKeyExpressionAttributeBuilder(index, pk, ...sks) {
                let translate = { ...this.model.translations.keys[index] };
                let restrict = ["pk"];
                let keys = { pk };
                sks = sks.filter(sk => sk !== undefined);

                for (let i = 0; i < sks.length; i++) {
                    let id = `sk${i + 1}`;
                    keys[id] = sks[i];
                    restrict.push(id);
                    translate[id] = translate["sk"];
                }

                let keyExpressions = this._expressionAttributeBuilder(keys, ItemOperations.set, {
                    translate,
                    restrict,
                });

                return {
                    ExpressionAttributeNames: Object.assign({}, keyExpressions.ExpressionAttributeNames),
                    ExpressionAttributeValues: Object.assign({}, keyExpressions.ExpressionAttributeValues),
                };
            }

            /* istanbul ignore next */
            _expressionAttributeBuilder(item = {}, operation = "", options = {}) {
                let {
                    require = [],
                    reject = [],
                    restrict = [],
                    skip = [],
                    translate = {},
                } = options;
                /*
        In order of execution:
        require   - if all elements in require are not present as attributes, it throws.
        reject    - if an attribute on item is present in "reject", it throws.
        restrict  - if an attribute on item is not present in "restrict", it throws.
        skip      - if an attribute matches an element in "skip", it is skipped.
        translate - if an attribute in item matches a property in "translate", use the value in "translate".
    */
                let expressions = {
                    UpdateExpression: [],
                    ExpressionAttributeNames: {},
                    ExpressionAttributeValues: {},
                };

                if (require.length) {
                    let props = Object.keys(item);
                    let missing = require.filter((prop) => !props.includes(prop));
                    if (!missing) {
                        throw new e.ElectroError(e.ErrorCodes.MissingAttribute, `Item is missing attributes: ${utilities.commaSeparatedString(missing)}`);
                    }
                }

                for (let prop in item) {
                    if (reject.includes(prop)) {
                        throw new Error(`Invalid attribute ${prop}`);
                    }
                    if (restrict.length && !restrict.includes(prop)) {
                        throw new Error(`${prop} is not a valid attribute: ${utilities.commaSeparatedString(restrict)}`);
                    }
                    if (prop === undefined || skip.includes(prop)) {
                        continue;
                    }

                    let name = prop;
                    let value = item[prop];
                    let nameProp = `#${prop}`;
                    let valProp = `:${prop}`;

                    if (translate[prop]) {
                        name = translate[prop];
                    }

                    expressions.UpdateExpression.push(`${nameProp} = ${valProp}`);
                    expressions.ExpressionAttributeNames[nameProp] = name;
                    expressions.ExpressionAttributeValues[valProp] = value;
                }
                expressions.UpdateExpression = `${operation.toUpperCase()} ${expressions.UpdateExpression.join(
                    ", ",
                )}`;
                return expressions;
            }

            /* istanbul ignore next */
            _queryParams(state = {}, options = {}) {
                let consolidatedQueryFacets = this._consolidateQueryFacets(
                    state.query.keys.sk,
                );
                let indexKeys;
                if (state.query.type === QueryTypes.is) {
                    indexKeys = this._makeIndexKeys(state.query.index, state.query.keys.pk, ...consolidatedQueryFacets);
                } else {
                    indexKeys = this._makeIndexKeysWithoutTail(state.query.index, state.query.keys.pk, ...consolidatedQueryFacets);
                }
                let parameters = {};
                switch (state.query.type) {
                    case QueryTypes.is:
                    case QueryTypes.begins:
                        parameters = this._makeBeginsWithQueryParams(
                            state.query.options,
                            state.query.index,
                            state.query.filter[ExpressionTypes.FilterExpression],
                            indexKeys.pk,
                            ...indexKeys.sk,
                        );
                        break;
                    case QueryTypes.collection:
                        parameters = this._makeBeginsWithQueryParams(
                            state.query.options,
                            state.query.index,
                            state.query.filter[ExpressionTypes.FilterExpression],
                            indexKeys.pk,
                            this._getCollectionSk(state.query.collection),
                        );
                        break;
                    case QueryTypes.between:
                        parameters = this._makeBetweenQueryParams(
                            state.query.index,
                            state.query.filter[ExpressionTypes.FilterExpression],
                            indexKeys.pk,
                            ...indexKeys.sk,
                        );
                        break;
                    case QueryTypes.gte:
                    case QueryTypes.gt:
                    case QueryTypes.lte:
                    case QueryTypes.lt:
                        parameters = this._makeComparisonQueryParams(
                            state.query.index,
                            state.query.type,
                            state.query.filter[ExpressionTypes.FilterExpression],
                            indexKeys.pk,
                            ...indexKeys.sk,
                        );
                        break;
                    default:
                        throw new Error(`Invalid query type: ${state.query.type}`);
                }
                let applied = this._applyParameterOptions(parameters, state.query.options, options);
                return applied.parameters;
            }

            _makeBetweenQueryParams(index, filter, pk, ...sk) {
                let keyExpressions = this._queryKeyExpressionAttributeBuilder(
                    index,
                    pk,
                    ...sk,
                );
                delete keyExpressions.ExpressionAttributeNames["#sk2"];
                let params = {
                    TableName: this._getTableName(),
                    ExpressionAttributeNames: this._mergeExpressionsAttributes(
                        filter.getNames(),
                        keyExpressions.ExpressionAttributeNames,
                    ),
                    ExpressionAttributeValues: this._mergeExpressionsAttributes(
                        filter.getValues(),
                        keyExpressions.ExpressionAttributeValues,
                    ),
                    KeyConditionExpression: `#pk = :pk and #sk1 BETWEEN :sk1 AND :sk2`,
                };
                if (index) {
                    params["IndexName"] = index;
                }
                if (filter.build()) {
                    params.FilterExpression = filter.build();
                }
                return params;
            }

            _makeBeginsWithQueryParams(options, index, filter, pk, sk) {
                let keyExpressions = this._queryKeyExpressionAttributeBuilder(index, pk, sk);
                let KeyConditionExpression = "#pk = :pk";

                if (this.model.lookup.indexHasSortKeys[index] && typeof keyExpressions.ExpressionAttributeValues[":sk1"] === "string" && keyExpressions.ExpressionAttributeValues[":sk1"].length > 0) {
                    KeyConditionExpression = `${KeyConditionExpression} and begins_with(#sk1, :sk1)`;
                } else {
                    delete keyExpressions.ExpressionAttributeNames["#sk1"];
                    delete keyExpressions.ExpressionAttributeValues[":sk1"];
                }

                let customExpressions = {
                    names: (options.expressions && options.expressions.names) || {},
                    values: (options.expressions && options.expressions.values) || {},
                    expression: (options.expressions && options.expressions.expression) || ""
                };

                let params = {
                    KeyConditionExpression,
                    TableName: this._getTableName(),
                    ExpressionAttributeNames: this._mergeExpressionsAttributes(filter.getNames(), keyExpressions.ExpressionAttributeNames, customExpressions.names),
                    ExpressionAttributeValues: this._mergeExpressionsAttributes(filter.getValues(), keyExpressions.ExpressionAttributeValues, customExpressions.values),
                };

                if (index) {
                    params["IndexName"] = index;
                }

                let expressions = [customExpressions.expression, filter.build()].filter(Boolean).join(" AND ");

                if (expressions.length) {
                    params.FilterExpression = expressions;
                }

                return params;
            }

            _mergeExpressionsAttributes(...expressionAttributes) {
                let merged = {};
                for (let obj of expressionAttributes) {
                    if (obj) {
                        merged = { ...merged, ...obj };
                    }
                }
                return merged;
            }

            /* istanbul ignore next */
            _makeComparisonQueryParams(index = TableIndex, comparison = "", filter = {}, pk = {}, sk = {}) {
                let operator = Comparisons[comparison];
                if (!operator) {
                    throw new Error(`Unexpected comparison operator "${comparison}", expected ${utilities.commaSeparatedString(Object.values(Comparisons))}`);
                }
                let keyExpressions = this._queryKeyExpressionAttributeBuilder(
                    index,
                    pk,
                    sk,
                );
                let params = {
                    TableName: this._getTableName(),
                    ExpressionAttributeNames: this._mergeExpressionsAttributes(
                        filter.getNames(),
                        keyExpressions.ExpressionAttributeNames,
                    ),
                    ExpressionAttributeValues: this._mergeExpressionsAttributes(
                        filter.getValues(),
                        keyExpressions.ExpressionAttributeValues,
                    ),
                    KeyConditionExpression: `#pk = :pk and #sk1 ${operator} :sk1`,
                };
                if (index) {
                    params["IndexName"] = index;
                }
                if (filter.build()) {
                    params.FilterExpression = filter.build();
                }
                return params;
            }

            _expectIndexFacets(attributes, facets) {
                let [isIncomplete, { incomplete, complete }] = this._getIndexImpact(
                    attributes,
                    facets,
                );
                if (isIncomplete) {
                    let incompleteAccessPatterns = incomplete.map(({index}) => this.model.translations.indexes.fromIndexToAccessPattern[index]);
                    let missingFacets = incomplete.reduce((result, { missing }) => [...result, ...missing], []);
                    throw new e.ElectroError(e.ErrorCodes.IncompleteCompositeAttributes,
                        `Incomplete composite attributes: Without the composite attributes ${utilities.commaSeparatedString(missingFacets)} the following access patterns cannot be updated: ${utilities.commaSeparatedString(incompleteAccessPatterns.filter((val) => val !== undefined))} `,
                    );
                }
                return complete;
            }

            _makeKeysFromAttributes(indexes, attributes) {
                let indexKeys = {};
                for (let [index, keyTypes] of Object.entries(indexes)) {
                    let keys = this._makeIndexKeys(index, attributes, attributes);
                    if (keyTypes.pk || keyTypes.sk) {
                        indexKeys[index] = {};
                    }

                    if (keyTypes.pk && keys.pk) {
                        indexKeys[index].pk = keys.pk
                    }

                    if (keyTypes.sk && keys.sk) {
                        indexKeys[index].sk = keys.sk
                    } else {
                        // at least return the same datatype (array)
                        indexKeys[index].sk = []
                    }
                }
                return indexKeys;
            }

            _makePutKeysFromAttributes(indexes, attributes) {
                let indexKeys = {};
                for (let index of indexes) {
                    indexKeys[index] = this._makeIndexKeys(index, attributes, attributes);
                }
                return indexKeys;
            }

            _getPutKeys(pk, sk, set) {
                let setAttributes = this.model.schema.applyAttributeSetters(set);
                let updateIndex = TableIndex;
                let keyTranslations = this.model.translations.keys;
                let keyAttributes = { ...sk, ...pk };
                let completeFacets = this._expectIndexFacets(
                    { ...set },
                    { ...keyAttributes },
                );

                // complete facets, only includes impacted facets which likely does not include the updateIndex which then needs to be added here.
                if (!completeFacets.indexes.includes(updateIndex)) {
                    completeFacets.indexes.push(updateIndex);
                }
                let composedKeys = this._makePutKeysFromAttributes(completeFacets.indexes, { ...keyAttributes, ...setAttributes });
                let updatedKeys = {};
                let indexKey = {};
                for (let [index, keys] of Object.entries(composedKeys)) {
                    let { pk, sk } = keyTranslations[index];
                    if (index === updateIndex) {
                        indexKey[pk] = keys.pk;
                        if (sk) {
                            indexKey[sk] = keys.sk[0];
                        }
                    }
                    updatedKeys[pk] = keys.pk;
                    if (sk) {
                        updatedKeys[sk] = keys.sk[0];
                    }
                }

                return { indexKey, updatedKeys, setAttributes };
            }

            _getUpdatedKeys(pk, sk, set, removed) {
                let updateIndex = TableIndex;
                let keyTranslations = this.model.translations.keys;
                let keyAttributes = { ...sk, ...pk };
                let completeFacets = this._expectIndexFacets(
                    { ...set },
                    { ...keyAttributes },
                );
                const removedKeyImpact = this._expectIndexFacets(
                    { ...removed },
                    {...keyAttributes}
                )

                // complete facets, only includes impacted facets which likely does not include the updateIndex which then needs to be added here.
                if (completeFacets.impactedIndexTypes[updateIndex] === undefined) {
                    completeFacets.impactedIndexTypes[updateIndex] = {
                        pk: "pk",
                        sk: "sk"
                    }
                }
                let composedKeys = this._makeKeysFromAttributes(completeFacets.impactedIndexTypes,{ ...set, ...keyAttributes });
                let updatedKeys = {};
                let deletedKeys = [];
                let indexKey = {};
                for (const keys of Object.values(removedKeyImpact.impactedIndexTypes)) {
                    deletedKeys = deletedKeys.concat(Object.values(keys));
                }
                for (let [index, keys] of Object.entries(composedKeys)) {
                    let { pk, sk } = keyTranslations[index];
                    if (index === updateIndex) {
                        indexKey[pk] = keys.pk;
                        if (sk) {
                            indexKey[sk] = keys.sk[0];
                        }
                    } else {
                        // This block is for when Sort Keys used in sparse indexes never get made because they don't actually
                        // have any composite attributes. Without this the PK would be made for the GSI but the SK would always
                        // be blank, and therefore, not queryable.
                        let noImpactSk = Array.isArray(keys.sk) && keys.sk.length === 0;
                        let indexHasSk = this.model.lookup.indexHasSortKeys[index];
                        let noAttributeSk = indexHasSk && this.model.facets.byIndex[index].sk.length === 0;
                        let hasPrefix = indexHasSk && this.model.prefixes[index].sk.prefix !== undefined;
                        if (noImpactSk && noAttributeSk && hasPrefix) {
                            keys.sk.push(this.model.prefixes[index].sk.prefix);
                        }
                    }

                    if (keys.pk) {
                        updatedKeys[pk] = keys.pk;
                    }

                    if (sk && keys.sk[0]) {
                        updatedKeys[sk] = keys.sk[0];
                    }
                }
                return { indexKey, updatedKeys, deletedKeys };
            }

            /* istanbul ignore next */
            _getIndexImpact(attributes = {}, included = {}) {
                let includedFacets = Object.keys(included);
                let impactedIndexes = {};
                let impactedIndexTypes = {}
                let completedIndexes = [];
                let facets = {};
                for (let [attribute, indexes] of Object.entries(this.model.facets.byAttr)) {
                    if (attributes[attribute] !== undefined) {
                        facets[attribute] = attributes[attribute];
                        indexes.forEach(({ index, type }) => {
                            impactedIndexes[index] = impactedIndexes[index] || {};
                            impactedIndexes[index][type] = impactedIndexes[index][type] || [];
                            impactedIndexes[index][type].push(attribute);
                            impactedIndexTypes[index] = impactedIndexTypes[index] || {};
                            impactedIndexTypes[index][type] = this.model.translations.keys[index][type];
                        });
                    }
                }

                let incomplete = Object.entries(this.model.facets.byIndex)
                    .map(([index, { pk, sk }]) => {
                        let impacted = impactedIndexes[index];
                        let impact = { index, missing: [] };
                        if (impacted) {
                            let missingPk = impacted[KeyTypes.pk] && impacted[KeyTypes.pk].length !== pk.length;
                            let missingSk = impacted[KeyTypes.sk] && impacted[KeyTypes.sk].length !== sk.length;
                            if (missingPk) {
                                impact.missing = [
                                    ...impact.missing,
                                    ...pk.filter((attr) => {
                                        return !impacted[KeyTypes.pk].includes(attr) && !includedFacets.includes(attr)
                                    }),
                                ];
                            }
                            if (missingSk) {
                                impact.missing = [
                                    ...impact.missing,
                                    ...sk.filter(
                                        (attr) =>
                                            !impacted[KeyTypes.sk].includes(attr) &&
                                            !includedFacets.includes(attr),
                                    ),
                                ];
                            }
                            if (!missingPk && !missingSk) {
                                completedIndexes.push(index);
                            }
                        }
                        return impact;
                    })
                    .filter(({ missing }) => missing.length)

                let isIncomplete = !!incomplete.length;
                let complete = {facets, indexes: completedIndexes, impactedIndexTypes};
                return [isIncomplete, { incomplete, complete }];
            }

            _consolidateQueryFacets(queryFacets) {
                let sk1 = {};
                let sk2 = {};
                for (let { type, facets } of queryFacets) {
                    if (type === QueryTypes.between) {
                        sk1 = { ...sk1, ...facets };
                    } else if (type === QueryTypes.and) {
                        sk2 = { ...sk2, ...facets };
                    } else {
                        sk1 = { ...sk1, ...facets };
                        sk2 = { ...sk2, ...facets };
                    }
                }
                return [sk1, sk2];
            }

            _buildQueryFacets(facets, skFacets) {
                let queryFacets = this._findProperties(facets, skFacets).reduce(
                    (result, [name, value]) => {
                        if (value) {
                            result[name] = value;
                        }
                        return result;
                    },
                    {},
                );
                return { ...queryFacets };
            }

            /* istanbul ignore next */
            _expectFacets(obj = {}, properties = [], type = "key composite attributes") {
                let [incompletePk, missing, matching] = this._expectProperties(obj, properties);
                if (incompletePk) {
                    throw new e.ElectroError(e.ErrorCodes.IncompleteCompositeAttributes, `Incomplete or invalid ${type} supplied. Missing properties: ${utilities.commaSeparatedString(missing)}`);
                } else {
                    return matching;
                }
            }

            _findProperties(obj, properties) {
                return properties.map((name) => [name, obj[name]]);
            }

            _expectProperties(obj, properties) {
                let missing = [];
                let matching = {};
                this._findProperties(obj, properties).forEach(([name, value]) => {
                    if (value === undefined) {
                        missing.push(name);
                    } else {
                        matching[name] = value;
                    }
                });
                return [!!missing.length, missing, matching];
            }

            _makeKeyPrefixes(service, entity, version = "1", tableIndex, modelVersion) {
                /*
			Collections will prefix the sort key so they can be queried with
			a "begins_with" operator when crossing entities. It is also possible
			that the user defined a custom key on either the PK or SK. In the case
			of a customKey AND a collection, the collection is ignored to favor
			the custom key.
		*/

                let keys = {
                    pk: {
                        prefix: "",
                        field: tableIndex.pk.field,
                        casing: tableIndex.pk.casing,
                        isCustom: tableIndex.customFacets.pk,
                    },
                    sk: {
                        prefix: "",
                        casing: tableIndex.sk.casing,
                        isCustom: tableIndex.customFacets.sk,
                        field: tableIndex.sk ? tableIndex.sk.field : undefined,
                    }
                };

                let pk = `$${service}`;
                let sk = "";

                // If the index is in a collections, prepend the sk;
                let collectionPrefix = this._makeCollectionPrefix(tableIndex.collection);
                if (validations.isStringHasLength(collectionPrefix)) {
                    sk = `${collectionPrefix}#${entity}`;
                } else {
                    sk = `$${entity}`;
                }

                /** start beta/v1 condition **/
                if (modelVersion === ModelVersions.beta) {
                    pk = `${pk}_${version}`;
                } else {
                    sk = `${sk}_${version}`;
                }
                /** end beta/v1 condition **/

                // If no sk, append the sk properties to the pk
                if (Object.keys(tableIndex.sk).length === 0) {
                    pk += sk;
                }

                // If keys arent custom, set the prefixes
                if (!keys.pk.isCustom) {
                    keys.pk.prefix = utilities.formatKeyCasing(pk, tableIndex.pk.casing);
                }
                if (!keys.sk.isCustom) {
                    keys.sk.prefix = utilities.formatKeyCasing(sk, tableIndex.sk.casing);
                }

                return keys;
            }

            _formatKeyCasing(accessPattern, key) {
                const casing = this.model.indexes[accessPattern] !== undefined
                    ? this.model.indexes[accessPattern].sk.casing
                    : undefined;

                return utilities.formatKeyCasing(key, casing);
            }

            _validateIndex(index) {
                if (!this.model.facets.byIndex[index]) {
                    throw new Error(`Invalid index: ${index}`);
                }
            }

            _getCollectionSk(collection = "") {
                const subCollections = this.model.subCollections[collection];
                const index = this.model.translations.collections.fromCollectionToIndex[collection];
                const accessPattern = this.model.translations.indexes.fromIndexToAccessPattern[index];
                const prefix = this._makeCollectionPrefix(subCollections);
                return this._formatKeyCasing(accessPattern, prefix);
            }

            _makeCollectionPrefix(collection = []) {
                let prefix = "";
                if (validations.isArrayHasLength(collection)) {
                    for (let i = 0; i < collection.length; i++) {
                        let subCollection = collection[i];
                        if (i === 0) {
                            prefix += `$${subCollection}`;
                        } else {
                            prefix += `#${subCollection}`;
                        }
                    }
                } else if (validations.isStringHasLength(collection)) {
                    prefix = `$${collection}`;
                }
                return prefix;
            }

            /* istanbul ignore next */
            _makeIndexKeysWithoutTail(index = TableIndex, pkFacets = {}, ...skFacets) {
                this._validateIndex(index);
                if (!skFacets.length) {
                    skFacets.push({});
                }
                let facets = this.model.facets.byIndex[index];
                let prefixes = this.model.prefixes[index];
                if (!prefixes) {
                    throw new Error(`Invalid index: ${index}`);
                }
                let pk = this._makeKey(prefixes.pk, facets.pk, pkFacets, this.model.facets.labels[index].pk, {excludeLabelTail: true});
                let sk = [];
                if (this.model.lookup.indexHasSortKeys[index]) {
                    for (let skFacet of skFacets) {
                        let hasLabels = this.model.facets.labels[index] && Array.isArray(this.model.facets.labels[index].sk);
                        let labels = hasLabels
                            ? this.model.facets.labels[index].sk
                            : []
                        let sortKey = this._makeKey(prefixes.sk, facets.sk, skFacet, labels, {excludeLabelTail: true});
                        if (sortKey !== undefined) {
                            sk.push(sortKey);
                        }
                    }
                }
                return { pk, sk };
            }

            /* istanbul ignore next */
            _makeIndexKeys(index = TableIndex, pkFacets = {}, ...skFacets) {
                this._validateIndex(index);
                if (!skFacets.length) {
                    skFacets.push({});
                }
                let facets = this.model.facets.byIndex[index];
                let prefixes = this.model.prefixes[index];
                if (!prefixes) {
                    throw new Error(`Invalid index: ${index}`);
                }
                let pk = this._makeKey(prefixes.pk, facets.pk, pkFacets, this.model.facets.labels[index].pk);
                let sk = [];
                if (this.model.lookup.indexHasSortKeys[index]) {
                    for (let skFacet of skFacets) {
                        let hasLabels = this.model.facets.labels[index] && Array.isArray(this.model.facets.labels[index].sk);
                        let labels = hasLabels
                            ? this.model.facets.labels[index].sk
                            : []
                        let sortKey = this._makeKey(prefixes.sk, facets.sk, skFacet, labels);
                        if (sortKey !== undefined) {
                            sk.push(sortKey);
                        }
                    }
                }
                return { pk, sk };
            }

            _isNumericKey(isCustom, facets = [], labels = []) {
                let attribute = this.model.schema.attributes[facets[0]];
                let isSingleComposite = facets.length === 1;
                let hasNoLabels = isCustom && labels.every(({label}) => !label);
                let facetIsNonStringPrimitive = attribute && attribute.type === "number";
                return isCustom && isSingleComposite && hasNoLabels && facetIsNonStringPrimitive
            }

            /* istanbul ignore next */
            _makeKey({prefix, isCustom, casing} = {}, facets = [], supplied = {}, labels = [], {excludeLabelTail} = {}) {
                if (this._isNumericKey(isCustom, facets, labels)) {
                    return supplied[facets[0]];
                }
                let key = prefix;
                for (let i = 0; i < labels.length; i++) {
                    let {name, label} = labels[i];

                    if (supplied[name] === undefined && excludeLabelTail) {
                        break;
                    }

                    if (isCustom) {
                        key = `${key}${label}`;
                    } else {
                        key = `${key}#${label}_`;
                    }
                    // Undefined facet value means we cant build any more of the key
                    if (supplied[name] === undefined) {
                        break;
                    }

                    key = `${key}${supplied[name]}`;
                }

                return utilities.formatKeyCasing(key, casing);
            }

            _findBestIndexKeyMatch(attributes) {
                let candidates = this.model.facets.bySlot.map((val, i) => i);
                let facets = this.model.facets.bySlot;
                let match;
                let keys = {};
                for (let i = 0; i < facets.length; i++) {
                    let currentMatches = [];
                    let nextMatches = [];
                    for (let j = 0; j < candidates.length; j++) {
                        let slot = candidates[j];
                        if (!facets[i][slot]) {
                            continue;
                        }
                        let name = facets[i][slot].name;
                        let next = facets[i][slot].next;
                        let index = facets[i][slot].index;
                        let type = facets[i][slot].type;
                        let match = !!attributes[name];
                        let matchNext = !!attributes[next];
                        if (match) {
                            keys[index] = keys[index] || [];
                            keys[index].push({ name, type });
                            currentMatches.push(slot);
                            if (matchNext) {
                                nextMatches.push(slot);
                            }
                        }
                    }
                    if (currentMatches.length) {
                        if (nextMatches.length) {
                            candidates = [...nextMatches];
                            continue;
                        } else {
                            match = facets[i][currentMatches[0]].index;
                            break;
                        }
                    } else if (i === 0) {
                        break;
                    } else {
                        match = (candidates[0] !== undefined && facets[i][candidates[0]].index) || TableIndex;
                        break;
                    }
                }
                return {
                    keys: keys[match] || [],
                    index: match || TableIndex,
                    shouldScan: match === undefined
                };
            }

            /* istanbul ignore next */
            _parseComposedKey(key = TableIndex) {
                let attributes = {};
                let names = key.match(/:[A-Z1-9]+/gi);
                if (!names) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidKeyCompositeAttributeTemplate, `Invalid key composite attribute template. No composite attributes provided, expected at least one composite attribute with the format ":attributeName". Received: ${key}`);
                }
                let labels = key.split(/:[A-Z1-9]+/gi);
                for (let i = 0; i < names.length; i++) {
                    let name = names[i].replace(":", "");
                    let label = labels[i];
                    if (name !== "") {
                        attributes[name] = attributes[name] || [];
                        attributes[name].push(label);
                    }
                }
                return attributes;
            }

            _parseTemplateKey(template = "") {
                let attributes = [];
                let current = {
                    label: "",
                    name: ""
                };
                let type = "label";
                for (let i = 0; i < template.length; i++) {
                    let char = template[i];
                    let last = template[i - 1];
                    let next = template[i + 1];
                    if (char === "{" && last === "$" && type === "label") {
                        type = "name";
                    } else if (char === "}" && type === "name") {
                        if (current.name.match(/^\s*$/)) {
                            throw new e.ElectroError(e.ErrorCodes.InvalidKeyCompositeAttributeTemplate, `Invalid key composite attribute template. Empty expression "\${${current.name}" provided. Expected attribute name.`);
                        }
                        attributes.push({name: current.name, label: current.label});
                        current.name = "";
                        current.label = "";
                        type = "label";
                    } else if (char === "$" && next === "{" && type === "label") {
                        continue;
                    } else {
                        current[type] += char;
                    }
                }
                if (current.name.length > 0 || current.label.length > 0) {
                    attributes.push({name: current.name, label: current.label});
                }

                return attributes;
            }

            _parseFacets(facets) {
                let isCustom = !Array.isArray(facets) && typeof facets === "string";
                if (isCustom && facets.length > 0) {
                    let labels = this._parseComposedKey(facets);
                    return {
                        isCustom,
                        labels: [],
                        attributes: Object.keys(attributes),
                    }
                } else if (isCustom && facets.length === 0) {
                    // treat like empty array sk
                    return {
                        isCustom: false,
                        labels: [],
                        attributes: []
                    }
                } else {
                    return {
                        isCustom,
                        labels: [],
                        attributes: Object.keys(facets),
                    };
                }
            }

            _parseTemplateAttributes(composite = []) {
                let isCustom = !Array.isArray(composite) && typeof composite === "string";
                if (isCustom && composite.length > 0) {
                    let labels = this._parseTemplateKey(composite);
                    return {
                        isCustom,
                        labels,
                        attributes: labels.map(({name}) => name).filter(name => !!name)
                    }
                } else if (isCustom && composite.length === 0) {
                    // treat like empty array sk
                    return {
                        isCustom: false,
                        labels: [],
                        attributes: []
                    }
                } else {
                    return {
                        isCustom,
                        labels: composite.map(name => ({name})),
                        attributes: composite,
                    };
                }
            }

            _compositeTemplateAreCompatible(parsedAttributes, composite) {
                if (!Array.isArray(composite) || !parsedAttributes || !parsedAttributes.isCustom) {
                    // not beholden to compatibility constraints
                    return true;
                }

                return validations.stringArrayMatch(composite, parsedAttributes.attributes);
            }

            _optimizeIndexKey(keyDefinition) {
                const hasTemplate = typeof keyDefinition.template === "string";
                const hasSingleItemComposite = Array.isArray(keyDefinition.facets) && keyDefinition.facets.length === 1 && keyDefinition.facets[0] === keyDefinition.field;
                if (!hasTemplate && hasSingleItemComposite) {
                    keyDefinition.facets = "${" + keyDefinition.field + "}";
                }
                return keyDefinition;
            }

            _optimizeMatchingKeyAttributes(model = {}) {
                const attributeFields = [];
                for (const name of Object.keys(model.attributes)) {
                    const {field} = model.attributes[name];
                    attributeFields.push(field || name);
                }
                for (const accessPattern of Object.keys(model.indexes)) {
                    let {pk, sk} = model.indexes[accessPattern];
                    if (attributeFields.includes(pk.field)) {
                        model.indexes[accessPattern].pk = this._optimizeIndexKey(pk);
                    }
                    if (sk && attributeFields.includes(sk.field)) {
                        model.indexes[accessPattern].sk = this._optimizeIndexKey(sk);
                    }
                }
                return model;
            }

            _normalizeIndexes(indexes) {
                let normalized = {};
                let indexFieldTranslation = {};
                let indexHasSortKeys = {};
                let indexHasSubCollections = {};
                let indexAccessPatternTransaction = {
                    fromAccessPatternToIndex: {},
                    fromIndexToAccessPattern: {},
                };
                let collectionIndexTranslation = {
                    fromCollectionToIndex: {},
                    fromIndexToCollection: {},
                };
                let subCollections = {};
                let collections = {};
                let facets = {
                    byIndex: {},
                    byField: {},
                    byFacet: {},
                    byAttr: {},
                    byType: {},
                    bySlot: [],
                    fields: [],
                    attributes: [],
                    labels: {},
                };
                let seenIndexes = {};
                let seenIndexFields = {};

                let accessPatterns = Object.keys(indexes);

                for (let i in accessPatterns) {
                    let accessPattern = accessPatterns[i];
                    let index = indexes[accessPattern];
                    let indexName = index.index || TableIndex;
                    if (seenIndexes[indexName] !== undefined) {
                        if (indexName === TableIndex) {
                            throw new e.ElectroError(e.ErrorCodes.DuplicateIndexes, `Duplicate index defined in model found in Access Pattern '${accessPattern}': '${utilities.formatIndexNameForDisplay(indexName)}'. This could be because you forgot to specify the index name of a secondary index defined in your model.`);
                        } else {
                            throw new e.ElectroError(e.ErrorCodes.DuplicateIndexes, `Duplicate index defined in model found in Access Pattern '${accessPattern}': '${indexName}'`);
                        }
                    }
                    seenIndexes[indexName] = indexName;
                    let hasSk = !!index.sk;
                    let inCollection = !!index.collection;
                    if (!hasSk && inCollection) {
                        throw new e.ElectroError(e.ErrorCodes.CollectionNoSK, `Invalid Access pattern definition for '${accessPattern}': '${utilities.formatIndexNameForDisplay(indexName)}', contains a collection definition without a defined SK. Collections can only be defined on indexes with a defined SK.`);
                    }
                    let collection = index.collection || "";
                    let customFacets = {
                        pk: false,
                        sk: false,
                    };
                    const pkCasing = KeyCasing[index.pk.casing] === undefined
                        ? KeyCasing.default
                        : index.pk.casing;
                    let skCasing = KeyCasing.default;
                    if (hasSk && KeyCasing[index.sk.casing] !== undefined) {
                        skCasing = index.sk.casing;
                    }
                    indexHasSortKeys[indexName] = hasSk;
                    let parsedPKAttributes = this._parseTemplateAttributes(index.pk.facets);
                    customFacets.pk = parsedPKAttributes.isCustom;
                    // labels can be set via the attribute definition or as part of the facetTemplate.
                    facets.labels[indexName] = facets.labels[indexName] || {};
                    facets.labels[indexName]["pk"] = facets.labels[indexName]["pk"] || parsedPKAttributes;
                    facets.labels[indexName]["sk"] = facets.labels[indexName]["sk"] || this._parseTemplateAttributes();
                    let pk = {
                        inCollection,
                        accessPattern,
                        index: indexName,
                        casing: pkCasing,
                        type: KeyTypes.pk,
                        field: index.pk.field || "",
                        facets: parsedPKAttributes.attributes,
                        isCustom: parsedPKAttributes.isCustom,
                        facetLabels: parsedPKAttributes.labels,
                    };
                    let sk = {};
                    let parsedSKAttributes = {};
                    if (hasSk) {
                        parsedSKAttributes = this._parseTemplateAttributes(index.sk.facets);
                        customFacets.sk = parsedSKAttributes.isCustom;
                        facets.labels[indexName]["sk"] = parsedSKAttributes;
                        sk = {
                            inCollection,
                            accessPattern,
                            index: indexName,
                            casing: skCasing,
                            type: KeyTypes.sk,
                            field: index.sk.field || "",
                            facets: parsedSKAttributes.attributes,
                            isCustom: parsedSKAttributes.isCustom,
                            facetLabels: parsedSKAttributes.labels,
                        };
                        facets.fields.push(sk.field);
                    }

                    if (seenIndexFields[pk.field] !== undefined) {
                        throw new e.ElectroError(e.ErrorCodes.DuplicateIndexFields, `Partition Key (pk) on Access Pattern '${accessPattern}' references the field '${pk.field}' which is already referenced by the Access Pattern '${seenIndexFields[pk.field]}'. Fields used for indexes need to be unique to avoid conflicts.`);
                    } else {
                        seenIndexFields[pk.field] = accessPattern;
                    }

                    if (sk.field) {
                        if (sk.field === pk.field) {
                            throw new e.ElectroError(e.ErrorCodes.DuplicateIndexFields, `The Access Pattern '${accessPattern}' references the field '${sk.field}' as the field name for both the PK and SK. Fields used for indexes need to be unique to avoid conflicts.`);
                        } else if (seenIndexFields[sk.field] !== undefined) {
                            throw new e.ElectroError(e.ErrorCodes.DuplicateIndexFields, `Sort Key (sk) on Access Pattern '${accessPattern}' references the field '${sk.field}' which is already referenced by the Access Pattern '${seenIndexFields[sk.field]}'. Fields used for indexes need to be unique to avoid conflicts.`);
                        }else {
                            seenIndexFields[sk.field] = accessPattern;
                        }
                    }

                    if (Array.isArray(sk.facets)) {
                        let duplicates = pk.facets.filter(facet => sk.facets.includes(facet));
                        if (duplicates.length !== 0) {
                            throw new e.ElectroError(e.ErrorCodes.DuplicateIndexCompositeAttributes, `The Access Pattern '${accessPattern}' contains duplicate references the composite attribute(s): ${utilities.commaSeparatedString(duplicates)}. Composite attributes may only be used once within an index. If this leaves the Sort Key (sk) without any composite attributes simply set this to be an empty array.`);
                        }
                    }

                    let definition = {
                        pk,
                        sk,
                        collection,
                        customFacets,
                        index: indexName,
                    };

                    indexHasSubCollections[indexName] = inCollection && Array.isArray(collection);

                    if (inCollection) {
                        let collectionArray = this._toSubCollectionArray(collection);

                        for (let collectionName of collectionArray) {
                            if (collections[collectionName] !== undefined) {
                                throw new e.ElectroError(e.ErrorCodes.DuplicateCollections, `Duplicate collection, "${collectionName}" is defined across multiple indexes "${collections[collectionName]}" and "${accessPattern}". Collections must be unique names across indexes for an Entity.`,);
                            } else {
                                collections[collectionName] = accessPattern;
                            }
                            collectionIndexTranslation.fromCollectionToIndex[collectionName] = indexName;
                            collectionIndexTranslation.fromIndexToCollection[indexName] = collectionIndexTranslation.fromIndexToCollection[indexName] || [];
                            collectionIndexTranslation.fromIndexToCollection[indexName].push(collection);
                        }
                        subCollections = {
                            ...subCollections,
                            ...this._normalizeSubCollections(collectionArray)
                        };
                    }

                    let attributes = [
                        ...pk.facets.map((name) => ({
                            name,
                            index: indexName,
                            type: KeyTypes.pk,
                        })),
                        ...(sk.facets || []).map((name) => ({
                            name,
                            index: indexName,
                            type: KeyTypes.sk,
                        })),
                    ];

                    normalized[accessPattern] = definition;

                    indexAccessPatternTransaction.fromAccessPatternToIndex[
                        accessPattern
                        ] = indexName;
                    indexAccessPatternTransaction.fromIndexToAccessPattern[
                        indexName
                        ] = accessPattern;

                    indexFieldTranslation[indexName] = {
                        pk: pk.field,
                        sk: sk.field || "",
                    };

                    facets.attributes = [...facets.attributes, ...attributes];

                    facets.fields.push(pk.field);

                    facets.byIndex[indexName] = {
                        customFacets,
                        pk: pk.facets,
                        sk: sk.facets,
                        all: attributes,
                        collection: index.collection,
                        hasSortKeys: !!indexHasSortKeys[indexName],
                        hasSubCollections: !!indexHasSubCollections[indexName],
                        casing: {
                            pk: pkCasing,
                            sk: skCasing
                        }
                    };

                    facets.byField = facets.byField || {};
                    facets.byField[pk.field] = facets.byField[pk.field] || {};
                    facets.byField[pk.field][indexName] = pk;
                    if (sk.field) {
                        facets.byField[sk.field] = facets.byField[sk.field] || {};
                        facets.byField[sk.field][indexName] = sk;
                    }


                    attributes.forEach(({index, type, name}, j) => {
                        let next = attributes[j + 1] !== undefined ? attributes[j + 1].name : "";
                        let facet = { index, name, type, next };
                        facets.byAttr[name] = facets.byAttr[name] || [];
                        facets.byAttr[name].push(facet);
                        facets.byType[type] = facets.byType[type] || [];
                        facets.byType[type].push(facet);
                        facets.byFacet[name] = facets.byFacet[name] || [];
                        facets.byFacet[name][j] = facets.byFacet[name][j] || [];
                        facets.byFacet[name][j].push(facet);
                        facets.bySlot[j] = facets.bySlot[j] || [];
                        facets.bySlot[j][i] = facet;
                    });

                    let pkTemplateIsCompatible = this._compositeTemplateAreCompatible(parsedPKAttributes, index.pk.composite);
                    if (!pkTemplateIsCompatible) {
                        throw new e.ElectroError(e.ErrorCodes.IncompatibleKeyCompositeAttributeTemplate, `Incompatible PK 'template' and 'composite' properties for defined on index "${utilities.formatIndexNameForDisplay(indexName)}". PK "template" string is defined as having composite attributes ${utilities.commaSeparatedString(parsedPKAttributes.attributes)} while PK "composite" array is defined with composite attributes ${utilities.commaSeparatedString(index.pk.composite)}`);
                    }

                    if (index.sk !== undefined && Array.isArray(index.sk.composite) && typeof index.sk.template === "string") {
                        let skTemplateIsCompatible = this._compositeTemplateAreCompatible(parsedSKAttributes, index.sk.composite);
                        if (!skTemplateIsCompatible) {
                            throw new e.ElectroError(e.ErrorCodes.IncompatibleKeyCompositeAttributeTemplate, `Incompatible SK 'template' and 'composite' properties for defined on index "${utilities.formatIndexNameForDisplay(indexName)}". SK "template" string is defined as having composite attributes ${utilities.commaSeparatedString(parsedSKAttributes.attributes)} while SK "composite" array is defined with composite attributes ${utilities.commaSeparatedString(index.sk.composite)}`);
                        }
                    }
                }

                if (facets.byIndex[TableIndex] === undefined) {
                    throw new e.ElectroError(e.ErrorCodes.MissingPrimaryIndex, "Schema is missing an index definition for the table's main index. Please update the schema to include an index without a specified name to define the table's natural index");
                }

                return {
                    facets,
                    subCollections,
                    indexHasSortKeys,
                    indexHasSubCollections,
                    indexes: normalized,
                    indexField: indexFieldTranslation,
                    indexAccessPattern: indexAccessPatternTransaction,
                    indexCollection: collectionIndexTranslation,
                    collections: Object.keys(collections),
                };
            }

            _normalizeFilters(filters = {}) {
                let normalized = {};
                let invalidFilterNames = ["go", "params", "filter", "where", "set"];

                for (let [name, fn] of Object.entries(filters)) {
                    if (invalidFilterNames.includes(name)) {
                        throw new e.ElectroError(e.ErrorCodes.InvalidFilter, `Invalid filter name: ${name}. Filter cannot be named ${utilities.commaSeparatedString(invalidFilterNames)}`);
                    } else {
                        normalized[name] = fn;
                    }
                }

                return normalized;
            }

            _normalizePrefixes(service, entity, version, indexes, modelVersion) {
                let prefixes = {};
                for (let accessPattern of Object.keys(indexes)) {
                    let item = indexes[accessPattern];
                    prefixes[item.index] = this._makeKeyPrefixes(service, entity, version, item, modelVersion);
                }
                return prefixes;
            }

            _normalizeSubCollections(collections = []) {
                let lookup = {};
                for (let i = collections.length -1; i >= 0; i--) {
                    let subCollection = collections[i];
                    lookup[subCollection] = lookup[subCollection] || [];
                    for (let j = 0; j <= i; j++) {
                        lookup[subCollection].push(collections[j]);
                    }
                }
                return lookup;
            }

            _toSubCollectionArray(collection) {
                let collectionArray = [];
                if (Array.isArray(collection) && collection.every(col => validations.isStringHasLength(col))) {
                    collectionArray = collection;
                } else if (validations.isStringHasLength(collection)) {
                    collectionArray.push(collection);
                } else {
                    throw new Error("Invalid collection definition");
                }
                return collectionArray;
            }

            _applyCompositeToFacetConversion(model) {
                for (let accessPattern of Object.keys(model.indexes)) {
                    let index = model.indexes[accessPattern];
                    let invalidPK = index.pk.facets === undefined && index.pk.composite === undefined && index.pk.template === undefined;
                    let invalidSK = index.sk && (index.sk.facets === undefined && index.sk.composite === undefined && index.sk.template === undefined);
                    if (invalidPK) {
                        throw new Error("Missing Index Composite Attributes!");
                    } else if (invalidSK) {
                        throw new Error("Missing Index Composite Attributes!");
                    }


                    if (Array.isArray(index.pk.composite)) {
                        index.pk = {
                            ...index.pk,
                            facets: index.pk.composite
                        }
                    }

                    if (typeof index.pk.template === "string") {
                        index.pk = {
                            ...index.pk,
                            facets: index.pk.template
                        }
                    }

                    // SK may not exist on index
                    if (index.sk && Array.isArray(index.sk.composite)) {
                        index.sk = {
                            ...index.sk,
                            facets: index.sk.composite
                        }
                    }

                    if (index.sk && typeof index.sk.template === "string") {
                        index.sk = {
                            ...index.sk,
                            facets: index.sk.template
                        }
                    }

                    model.indexes[accessPattern] = index;
                }
                return model;
            }

            _mergeKeyDefinitions(fromIndex, fromModel) {
                let definitions = {};
                for (let indexName of Object.keys(fromIndex)) {
                    let pk = fromIndex[indexName].pk;
                    let sk = fromIndex[indexName].sk || {labels: []};
                    definitions[indexName] = {
                        pk: [],
                        sk: []
                    };
                    for (let {name, label} of pk.labels) {
                        if (pk.isCustom) {
                            definitions[indexName].pk.push({name, label});
                        } else {
                            definitions[indexName].pk.push({name, label: fromModel[name] || name});
                        }
                    }
                    for (let {name, label} of sk.labels) {
                        if (sk.isCustom) {
                            definitions[indexName].sk.push({name, label});
                        } else {
                            definitions[indexName].sk.push({name, label: fromModel[name] || name});
                        }
                    }
                }

                return definitions;
            }

            _parseModel(model, config = {}) {
                /** start beta/v1 condition **/
                const {client} = config;
                let modelVersion = utilities.getModelVersion(model);
                let service, entity, version, table, name;
                switch(modelVersion) {
                    case ModelVersions.beta:
                        service = model.service;
                        entity = model.entity;
                        version = model.version;
                        table = config.table || model.table;
                        name = entity;
                        break;
                    case ModelVersions.v1:
                        service = model.model && model.model.service;
                        entity = model.model && model.model.entity;
                        version = model.model && model.model.version;
                        table = config.table || model.table;
                        name = entity;
                        break;
                    default:
                        throw new Error("Invalid model");
                }

                model = this._applyCompositeToFacetConversion(model);

                // _optimizeMatchingKeyAttributes abides by the design compromises made by _applyCompositeToFacetConversion :\
                model = this._optimizeMatchingKeyAttributes(model);
                /** end beta/v1 condition **/

                let {
                    facets,
                    indexes,
                    indexField,
                    collections,
                    subCollections,
                    indexCollection,
                    indexHasSortKeys,
                    indexAccessPattern,
                    indexHasSubCollections,
                } = this._normalizeIndexes(model.indexes);
                let schema = new Schema(model.attributes, facets, {client});
                let filters = this._normalizeFilters(model.filters);
                let prefixes = this._normalizePrefixes(service, entity, version, indexes, modelVersion);

                // apply model defined labels
                let schemaDefinedLabels = schema.getLabels();
                facets.labels = this._mergeKeyDefinitions(facets.labels, schemaDefinedLabels);
                for (let indexName of Object.keys(facets.labels)) {
                    indexes[indexAccessPattern.fromIndexToAccessPattern[indexName]].pk.labels = facets.labels[indexName].pk;
                    indexes[indexAccessPattern.fromIndexToAccessPattern[indexName]].sk.labels = facets.labels[indexName].sk;
                }

                return {
                    name,
                    table,
                    schema,
                    facets,
                    entity,
                    service,
                    indexes,
                    version,
                    filters,
                    prefixes,
                    collections,
                    modelVersion,
                    subCollections,
                    lookup: {
                        indexHasSortKeys,
                        indexHasSubCollections
                    },
                    translations: {
                        keys: indexField,
                        indexes: indexAccessPattern,
                        collections: indexCollection,
                    },
                    original: model,
                };
            }
        }

        module.exports = {
            Entity,
            clauses,
        };

    },{"./clauses":14,"./errors":16,"./filters":17,"./operations":18,"./schema":19,"./types":22,"./util":24,"./validations":25,"./where":26}],16:[function(require,module,exports){
// # Errors:
// 1000 - Configuration Errors
// 2000 - Invalid Queries
// 3000 - User Defined Errors
// 4000 - DynamoDB Errors
// 5000 - Unexpected Errors

        function getHelpLink(section) {
            section = section || "unknown-error-5001";
            return `https://github.com/tywalch/electrodb#${section}`;
        }

        const ErrorCode = Symbol("error-code");

        const ErrorCodes = {
            NoClientDefined: {
                code: 1001,
                section: "no-client-defined-on-model",
                name: "NoClientDefined",
                sym: ErrorCode,
            },
            InvalidIdentifier: {
                code: 1002,
                section: "invalid-identifier",
                name: "InvalidIdentifier",
                sym: ErrorCode,
            },
            InvalidKeyCompositeAttributeTemplate: {
                code: 1003,
                section: "invalid-key-composite-attribute-template",
                name: "InvalidKeyCompositeAttributeTemplate",
                sym: ErrorCode,
            },
            DuplicateIndexes: {
                code: 1004,
                section: "duplicate-indexes",
                name: "DuplicateIndexes",
                sym: ErrorCode,
            },
            CollectionNoSK: {
                code: 1005,
                section: "collection-without-an-sk",
                name: "CollectionNoSK",
                sym: ErrorCode,
            },
            DuplicateCollections: {
                code: 1006,
                section: "duplicate-collections",
                name: "DuplicateCollections",
                sym: ErrorCode,
            },
            MissingPrimaryIndex: {
                code: 1007,
                section: "missing-primary-index",
                name: "MissingPrimaryIndex",
                sym: ErrorCode,
            },
            InvalidAttributeDefinition: {
                code: 1008,
                section: "invalid-attribute-definition",
                name: "InvalidAttributeDefinition",
                sym: ErrorCode,
            },
            InvalidModel: {
                code: 1009,
                section: "invalid-model",
                name: "InvalidModel",
                sym: ErrorCode
            },
            InvalidOptions: {
                code: 1010,
                section: "invalid-options",
                name: "InvalidOptions",
                sym: ErrorCode
            },
            InvalidFilter: {
                code: 1011,
                section: "filters",
                name: "InvalidFilter",
                sym: ErrorCode
            },
            InvalidWhere: {
                code: 1012,
                section: "where",
                name: "InvalidWhere",
                sym: ErrorCode
            },
            InvalidJoin: {
                code: 1013,
                section: "join",
                name: "InvalidJoin",
                sym: ErrorCode
            },
            DuplicateIndexFields: {
                code: 1014,
                section: "duplicate-index-fields",
                name: "DuplicateIndexField",
                sym: ErrorCode,
            },
            DuplicateIndexCompositeAttributes: {
                code: 1015,
                section: "duplicate-index-composite-attributes",
                name: "DuplicateIndexCompositeAttributes",
                sym: ErrorCode,
            },
            InvalidAttributeWatchDefinition: {
                code: 1016,
                section: "invalid-attribute-watch-definition",
                name: "InvalidAttributeWatchDefinition",
                sym: ErrorCode
            },
            IncompatibleKeyCompositeAttributeTemplate: {
                code: 1017,
                section: "incompatible-key-composite-attribute-template",
                name: "IncompatibleKeyCompositeAttributeTemplate",
                sym: ErrorCode,
            },
            InvalidIndexWithAttributeName: {
                code: 1018,
                section: "invalid-index-with-attribute-name",
                name: "InvalidIndexWithAttributeName",
                sym: ErrorCode,
            },
            InvalidCollectionOnIndexWithAttributeFieldNames: {
                code: 1019,
                section: "invalid-collection-on-index-with-attribute-field-names",
                name: "InvalidIndexCompositeWithAttributeName",
                sym: ErrorCode,
            },
            MissingAttribute: {
                code: 2001,
                section: "missing-attribute",
                name: "MissingAttribute",
                sym: ErrorCode,
            },
            IncompleteCompositeAttributes: {
                code: 2002,
                section: "incomplete-composite-attributes",
                name: "IncompleteCompositeAttributes",
                sym: ErrorCode,
            },
            MissingTable: {
                code: 2003,
                section: "missing-table",
                name: "MissingTable",
                sym: ErrorCode
            },
            InvalidConcurrencyOption: {
                code: 2004,
                section: "invalid-concurrency-option",
                name: "InvalidConcurrencyOption",
                sym: ErrorCode
            },
            InvalidPagesOption: {
                code: 2005,
                section: "invalid-pages-option",
                name: "InvalidPagesOption",
                sym: ErrorCode,
            },
            InvalidLimitOption: {
                code: 2006,
                section: "invalid-limit-option",
                name: "InvalidLimitOption",
                sym: ErrorCode,
            },
            InvalidAttribute: {
                code: 3001,
                section: "invalid-attribute",
                name: "InvalidAttribute",
                sym: ErrorCode
            },
            AWSError: {
                code: 4001,
                section: "aws-error",
                name: "AWSError",
                sym: ErrorCode,
            },
            UnknownError: {
                code: 5001,
                section: "unknown-error",
                name: "UnknownError",
                sym: ErrorCode,
            },
            GeneralError: {
                code: 5002,
                section: "",
                name: "GeneralError",
                sym: ErrorCode
            },
            LastEvaluatedKey: {
                code: 5003,
                section: "invalid-last-evaluated-key",
                name: "LastEvaluatedKey",
                sym: ErrorCode,
            },
            NoOwnerForPager: {
                code: 5004,
                section: "no-owner-for-pager",
                name: "NoOwnerForPager",
                sym: ErrorCode,
            },
            PagerNotUnique: {
                code: 5005,
                section: "pager-not-unique",
                name: "NoOwnerForPager",
                sym: ErrorCode,
            },
        };

        class ElectroError extends Error {
            constructor(err, message) {
                super(message);
                let detail = ErrorCodes.UnknownError;
                if (err && err.sym === ErrorCode) {
                    detail = err
                }
                this.message = `${message} - For more detail on this error reference: ${getHelpLink(detail.section)}`;

                if (Error.captureStackTrace) {
                    Error.captureStackTrace(this, ElectroError);
                }

                this.name = 'ElectroError';
                this.ref = err;
                this.code = detail.code;
                this.date = new Date();
                this.isElectroError = true;
            }
        }

        module.exports = {
            ElectroError,
            ErrorCodes
        };

    },{}],17:[function(require,module,exports){
        const e = require("./errors");
        const {MethodTypes, ExpressionTypes} = require("./types");

        class FilterFactory {
            constructor(attributes = {}, filterTypes = {}) {
                this.attributes = { ...attributes };
                this.filters = {
                    ...filterTypes,
                };
            }

            getExpressionType(methodType) {
                switch (methodType) {
                    case MethodTypes.put:
                    case MethodTypes.create:
                    case MethodTypes.update:
                    case MethodTypes.patch:
                    case MethodTypes.delete:
                        return ExpressionTypes.ConditionExpression
                    default:
                        return ExpressionTypes.FilterExpression
                }
            }

            _buildFilterAttributes(setName, setValue) {
                let attributes = {};
                for (let [name, attribute] of Object.entries(this.attributes)) {
                    let filterAttribute = {};
                    for (let [type, {template}] of Object.entries(this.filters)) {
                        Object.defineProperty(filterAttribute, type, {
                            get: () => {
                                return (...values) => {
                                    let {prop} = setName({}, name, attribute.field);
                                    let attrValues = [];
                                    for (let value of values) {
                                        if (template.length > 1) {
                                            attrValues.push(
                                                setValue(name, value, name)
                                            );
                                        }
                                    }
                                    let expression = template({}, attribute, prop, ...attrValues);
                                    return expression.trim();
                                };
                            },
                        });
                    }
                    attributes[name] = filterAttribute;
                }
                return attributes;
            }

            buildClause(filterFn) {
                return (entity, state, ...params) => {
                    const type = this.getExpressionType(state.query.method);
                    const builder = state.query.filter[type];
                    let setName = (paths, name, value) => builder.setName(paths, name, value);
                    let setValue = (name, value, path) => builder.setValue(name, value, path);
                    let attributes = this._buildFilterAttributes(
                        setName,
                        setValue,
                    );
                    const expression = filterFn(attributes, ...params);
                    if (typeof expression !== "string") {
                        throw new e.ElectroError(e.ErrorCodes.InvalidFilter, "Invalid filter response. Expected result to be of type string");
                    }
                    builder.add(expression);
                    return state;
                };
            }

            injectFilterClauses(clauses = {}, filters = {}) {
                let injected = { ...clauses };
                let filterParents = Object.entries(injected)
                    .filter(clause => {
                        let [name, { children }] = clause;
                        return children.includes("go");
                    })
                    .map(([name]) => name);
                let modelFilters = Object.keys(filters);
                let filterChildren = [];
                for (let [name, filter] of Object.entries(filters)) {
                    filterChildren.push(name);
                    injected[name] = {
                        name: name,
                        action: this.buildClause(filter),
                        children: ["params", "go", "page", "filter", ...modelFilters],
                    };
                }
                filterChildren.push("filter");
                injected["filter"] = {
                    name: "filter",
                    action: (entity, state, fn) => {
                        return this.buildClause(fn)(entity, state);
                    },
                    children: ["params", "go", "page", "filter", ...modelFilters],
                };
                for (let parent of filterParents) {
                    injected[parent] = { ...injected[parent] };
                    injected[parent].children = [
                        ...filterChildren,
                        ...injected[parent].children,
                    ];
                }
                return injected;
            }
        }

        module.exports = { FilterFactory };

    },{"./errors":16,"./types":22}],18:[function(require,module,exports){
        const {AttributeTypes, ItemOperations, AttributeProxySymbol, BuilderTypes} = require("./types");
        const e = require("./errors");
        const v = require("./util");

        const deleteOperations = {
            canNest: false,
            template: function del(options, attr, path, value) {
                let operation = "";
                let expression = "";
                switch(attr.type) {
                    case AttributeTypes.any:
                    case AttributeTypes.set:
                        operation = ItemOperations.delete;
                        expression = `${path} ${value}`;
                        break;
                    default:
                        throw new Error(`Invalid Update Attribute Operation: "DELETE" Operation can only be performed on attributes with type "set" or "any".`);
                }
                return {operation, expression};
            },
        };

        const UpdateOperations = {
            name: {
                canNest: true,
                template: function name(options, attr, path) {
                    return path;
                }
            },
            value: {
                canNest: true,
                template: function value(options, attr, path, value) {
                    return value;
                }
            },
            append: {
                canNest: false,
                template: function append(options, attr, path, value) {
                    let operation = "";
                    let expression = "";
                    switch(attr.type) {
                        case AttributeTypes.any:
                        case AttributeTypes.list:
                            operation = ItemOperations.set;
                            expression = `${path} = list_append(${path}, ${value})`;
                            break;
                        default:
                            throw new Error(`Invalid Update Attribute Operation: "APPEND" Operation can only be performed on attributes with type "list" or "any".`);
                    }
                    return {operation, expression};
                }
            },
            add: {
                canNest: false,
                template: function add(options, attr, path, value) {
                    let operation = "";
                    let expression = "";
                    switch(attr.type) {
                        case AttributeTypes.any:
                        case AttributeTypes.set:
                            operation = ItemOperations.add;
                            expression = `${path} ${value}`;
                            break;
                        case AttributeTypes.number:
                            if (options.nestedValue) {
                                operation = ItemOperations.set;
                                expression = `${path} = ${path} + ${value}`;
                            } else {
                                operation = ItemOperations.add;
                                expression = `${path} ${value}`;
                            }
                            break;
                        default:
                            throw new Error(`Invalid Update Attribute Operation: "ADD" Operation can only be performed on attributes with type "number", "set", or "any".`);
                    }
                    return {operation, expression};
                }
            },
            subtract: {
                canNest: false,
                template: function subtract(options, attr, path, value) {
                    let operation = "";
                    let expression = "";
                    switch(attr.type) {
                        case AttributeTypes.any:
                        case AttributeTypes.number:
                            operation = ItemOperations.set;
                            expression = `${path} = ${path} - ${value}`;
                            break;
                        default:
                            throw new Error(`Invalid Update Attribute Operation: "SUBTRACT" Operation can only be performed on attributes with type "number" or "any".`);
                    }

                    return {operation, expression};
                }
            },
            set: {
                canNest: false,
                template: function set(options, attr, path, value) {
                    let operation = "";
                    let expression = "";
                    switch(attr.type) {
                        case AttributeTypes.set:
                        case AttributeTypes.list:
                        case AttributeTypes.map:
                        case AttributeTypes.enum:
                        case AttributeTypes.string:
                        case AttributeTypes.number:
                        case AttributeTypes.boolean:
                        case AttributeTypes.any:
                            operation = ItemOperations.set;
                            expression = `${path} = ${value}`;
                            break;
                        default:
                            throw new Error(`Invalid Update Attribute Operation: "SET" Operation can only be performed on attributes with type "list", "map", "string", "number", "boolean", or "any".`);
                    }
                    return {operation, expression};
                }
            },
            remove: {
                canNest: false,
                template: function remove(options, attr, ...paths) {
                    let operation = "";
                    let expression = "";
                    switch(attr.type) {
                        case AttributeTypes.set:
                        case AttributeTypes.any:
                        case AttributeTypes.list:
                        case AttributeTypes.map:
                        case AttributeTypes.string:
                        case AttributeTypes.number:
                        case AttributeTypes.boolean:
                        case AttributeTypes.enum:
                            operation = ItemOperations.remove;
                            expression = paths.join(", ");
                            break;
                        default: {
                            throw new Error(`Invalid Update Attribute Operation: "REMOVE" Operation can only be performed on attributes with type "map", "list", "string", "number", "boolean", or "any".`);
                        }
                    }
                    return {operation, expression};
                }
            },
            del: deleteOperations,
            delete: deleteOperations
        }

        const FilterOperations = {
            ne: {
                template: function eq(options, attr, name, value) {
                    return `${name} <> ${value}`;
                },
                strict: false,
            },
            eq: {
                template: function eq(options, attr, name, value) {
                    return `${name} = ${value}`;
                },
                strict: false,
            },
            gt: {
                template: function gt(options, attr, name, value) {
                    return `${name} > ${value}`;
                },
                strict: false
            },
            lt: {
                template: function lt(options, attr, name, value) {
                    return `${name} < ${value}`;
                },
                strict: false
            },
            gte: {
                template: function gte(options, attr, name, value) {
                    return `${name} >= ${value}`;
                },
                strict: false
            },
            lte: {
                template: function lte(options, attr, name, value) {
                    return `${name} <= ${value}`;
                },
                strict: false
            },
            between: {
                template: function between(options, attr, name, value1, value2) {
                    return `(${name} between ${value1} and ${value2})`;
                },
                strict: false
            },
            begins: {
                template: function begins(options, attr, name, value) {
                    return `begins_with(${name}, ${value})`;
                },
                strict: false
            },
            exists: {
                template: function exists(options, attr, name) {
                    return `attribute_exists(${name})`;
                },
                strict: false
            },
            notExists: {
                template: function notExists(options, attr, name) {
                    return `attribute_not_exists(${name})`;
                },
                strict: false
            },
            contains: {
                template: function contains(options, attr, name, value) {
                    return `contains(${name}, ${value})`;
                },
                strict: false
            },
            notContains: {
                template: function notContains(options, attr, name, value) {
                    return `not contains(${name}, ${value})`;
                },
                strict: false
            },
            value: {
                template: function(options, attr, name, value) {
                    return value;
                },
                strict: false,
                canNest: true,
            },
            name: {
                template: function(options, attr, name) {
                    return name;
                },
                strict: false,
                canNest: true,
            }
        };

        class ExpressionState {
            constructor({prefix} = {}) {
                this.names = {};
                this.values = {};
                this.paths = {};
                this.counts = {};
                this.impacted = {};
                this.expression = "";
                this.prefix = prefix || "";
            }

            incrementName(name) {
                if (this.counts[name] === undefined) {
                    this.counts[name] = 0;
                }
                return `${this.prefix}${this.counts[name]++}`;
            }

            // todo: make the structure: name, value, paths
            setName(paths, name, value) {
                let json = "";
                let expression = "";
                const prop = `#${name}`;
                if (Object.keys(paths).length === 0) {
                    json = `${name}`;
                    expression = `${prop}`;
                    this.names[prop] = value;
                } else if (isNaN(name)) {
                    json = `${paths.json}.${name}`;
                    expression = `${paths.expression}.${prop}`;
                    this.names[prop] = value;
                } else {
                    json = `${paths.json}[*]`;
                    expression = `${paths.expression}[${name}]`;
                }
                return {json, expression, prop};
            }

            getNames() {
                return this.names;
            }

            setValue(name, value) {
                let valueCount = this.incrementName(name);
                let expression = `:${name}${valueCount}`
                this.values[expression] = value;
                return expression;
            }

            updateValue(name, value) {
                this.values[name] = value;
            }

            getValues() {
                return this.values;
            }

            setPath(path, value) {
                this.paths[path] = value;
            }

            setExpression(expression) {
                this.expression = expression;
            }

            getExpression() {
                return this.expression;
            }

            setImpacted(operation, path) {
                this.impacted[path] = operation;
            }
        }

        class AttributeOperationProxy {
            constructor({builder, attributes = {}, operations = {}}) {
                this.ref = {
                    attributes,
                    operations
                };
                this.attributes = AttributeOperationProxy.buildAttributes(builder, attributes);
                this.operations = AttributeOperationProxy.buildOperations(builder, operations);
            }

            invokeCallback(op, ...params) {
                return op(this.attributes, this.operations, ...params);
            }

            fromObject(operation, record) {
                for (let path of Object.keys(record)) {
                    const value = record[path];
                    const parts = v.parseJSONPath(path);
                    let attribute = this.attributes;
                    for (let part of parts) {
                        attribute = attribute[part];
                    }
                    if (attribute) {
                        this.operations[operation](attribute, value);
                        const {target} = attribute();
                        if (target.readOnly) {
                            throw new Error(`Attribute "${target.path}" is Read-Only and cannot be updated`);
                        }
                    }
                }
            }

            fromArray(operation, paths) {
                for (let path of paths) {
                    const parts = v.parseJSONPath(path);
                    let attribute = this.attributes;
                    for (let part of parts) {
                        attribute = attribute[part];
                    }
                    if (attribute) {
                        this.operations[operation](attribute);
                        const {target} = attribute();
                        if (target.readOnly) {
                            throw new Error(`Attribute "${target.path}" is Read-Only and cannot be updated`);
                        } else if (operation === ItemOperations.remove && target.required) {
                            throw new Error(`Attribute "${target.path}" is Required and cannot be removed`);
                        }
                    }
                }
            }

            static buildOperations(builder, operations) {
                let ops = {};
                let seen = new Set();
                for (let operation of Object.keys(operations)) {
                    let {template, canNest} = operations[operation];
                    Object.defineProperty(ops, operation, {
                        get: () => {
                            return (property, ...values) => {
                                if (property === undefined) {
                                    throw new e.ElectroError(e.ErrorCodes.InvalidWhere, `Invalid/Unknown property passed in where clause passed to operation: '${operation}'`);
                                }
                                if (property.__is_clause__ === AttributeProxySymbol) {
                                    const {paths, root, target} = property();
                                    const attributeValues = [];
                                    let hasNestedValue = false;
                                    for (let value of values) {
                                        value = target.format(value);
                                        // template.length is to see if function takes value argument
                                        if (template.length > 3) {
                                            if (seen.has(value)) {
                                                attributeValues.push(value);
                                                hasNestedValue = true;
                                            } else {
                                                let attributeValueName = builder.setValue(target.name, value);
                                                builder.setPath(paths.json, {value, name: attributeValueName});
                                                attributeValues.push(attributeValueName);
                                            }
                                        }
                                    }

                                    const options = {
                                        nestedValue: hasNestedValue
                                    }

                                    const formatted = template(options, target, paths.expression, ...attributeValues);
                                    builder.setImpacted(operation, paths.json);
                                    if (canNest) {
                                        seen.add(paths.expression);
                                        seen.add(formatted);
                                    }

                                    if (builder.type === BuilderTypes.update && formatted && typeof formatted.operation === "string" && typeof formatted.expression === "string") {
                                        builder.add(formatted.operation, formatted.expression);
                                        return formatted.expression;
                                    }

                                    return formatted;
                                } else {
                                    throw new e.ElectroError(e.ErrorCodes.InvalidWhere, `Invalid Attribute in where clause passed to operation '${operation}'. Use injected attributes only.`);
                                }
                            }
                        }
                    });
                }
                return ops;
            }

            static pathProxy(paths, root, target, builder) {
                return new Proxy(() => ({paths, root, target}), {
                    get: (_, prop) => {
                        if (prop === "__is_clause__") {
                            return AttributeProxySymbol
                        } else {
                            const attribute = target.getChild(prop);
                            let field;
                            if (attribute === undefined) {
                                throw new Error(`Invalid attribute "${prop}" at path "${paths.json}".`);
                            } else if (attribute === root && attribute.type === AttributeTypes.any) {
                                // This function is only called if a nested property is called. If this attribute is ultimately the root, don't use the root's field name
                                field = prop;
                            } else {
                                field = attribute.field;
                            }
                            paths = builder.setName(paths, prop, field);
                            return AttributeOperationProxy.pathProxy(paths, root, attribute, builder);
                        }
                    }
                });
            }

            static buildAttributes(builder, attributes) {
                let attr = {};
                for (let [name, attribute] of Object.entries(attributes)) {
                    Object.defineProperty(attr, name, {
                        get: () => {
                            const paths = builder.setName({}, attribute.name, attribute.field);
                            return AttributeOperationProxy.pathProxy(paths, attribute, attribute, builder);
                        }
                    });
                }
                return attr;
            }
        }

        module.exports = {UpdateOperations, FilterOperations, ExpressionState, AttributeOperationProxy};
    },{"./errors":16,"./types":22,"./util":24}],19:[function(require,module,exports){
        const { CastTypes, ValueTypes, KeyCasing, AttributeTypes, AttributeMutationMethods, AttributeWildCard, PathTypes, TraverserIndexes } = require("./types");
        const AttributeTypeNames = Object.keys(AttributeTypes);
        const ValidFacetTypes = [AttributeTypes.string, AttributeTypes.number, AttributeTypes.boolean, AttributeTypes.enum];
        const e = require("./errors");
        const u = require("./util");
        const v = require("./validations");
        const {DynamoDBSet} = require("./set");

        function getValueType(value) {
            if (value === undefined) {
                return ValueTypes.undefined;
            } else if (value === null) {
                return ValueTypes.null;
            } else if (typeof value === "string") {
                return ValueTypes.string;
            } else if (typeof value === "number") {
                return ValueTypes.number;
            } else if (typeof value === "boolean") {
                return ValueTypes.boolean;
            } else if (Array.isArray(value)) {
                return ValueTypes.array;
            } else if (value.wrapperName === "Set") {
                return ValueTypes.aws_set;
            } else if (value.constructor.name === "Set") {
                return ValueTypes.set;
            } else if (value.constructor.name === "Map") {
                return ValueTypes.map;
            } else if (value.constructor.name === "Object") {
                return ValueTypes.object;
            } else {
                return ValueTypes.unknown;
            }
        }

        class AttributeTraverser {
            constructor(parentTraverser) {
                if (parentTraverser instanceof AttributeTraverser) {
                    this.parent = parentTraverser;
                    this.paths = this.parent.paths;
                } else {
                    this.parent = null;
                    this.paths = new Map();
                }
                this.children = new Map();
            }

            setChild(name, attribute) {
                this.children.set(name, attribute);
            }

            asChild(name, attribute) {
                if (this.parent) {
                    this.parent.setChild(name, attribute);
                }
            }

            setPath(path, attribute) {
                if (this.parent) {
                    this.parent.setPath(path, attribute);
                }
                this.paths.set(path, attribute);
            }

            getPath(path) {
                path = u.genericizeJSONPath(path);
                if (this.parent) {
                    return this.parent.getPath(path);
                }
                return this.paths.get(path);
            }

            getChild(name) {
                return this.children.get(name);
            }

            getAllChildren() {
                return this.children.entries();
            }

            getAll() {
                if (this.parent) {
                    return this.parent.getAll();
                }
                return this.paths.entries();
            }
        }


        class Attribute {
            constructor(definition = {}) {
                this.name = definition.name;
                this.field = definition.field || definition.name;
                this.label = definition.label;
                this.readOnly = !!definition.readOnly;
                this.hidden = !!definition.hidden;
                this.required = !!definition.required;
                this.cast = this._makeCast(definition.name, definition.cast);
                this.default = this._makeDefault(definition.default);
                this.validate = this._makeValidate(definition.validate);
                this.isKeyField = !!definition.isKeyField;
                this.unformat = this._makeDestructureKey(definition);
                this.format = this._makeStructureKey(definition);
                this.indexes = [...(definition.indexes || [])];
                let {isWatched, isWatcher, watchedBy, watching, watchAll} = Attribute._destructureWatcher(definition);
                this._isWatched = isWatched
                this._isWatcher = isWatcher;
                this.watchedBy = watchedBy;
                this.watching = watching;
                this.watchAll = watchAll;
                let { type, enumArray } = this._makeType(this.name, definition.type);
                this.type = type;
                this.enumArray = enumArray;
                this.parentType = definition.parentType;
                this.parentPath = definition.parentPath;
                const pathType = this.getPathType(this.type, this.parentType);
                const path = Attribute.buildPath(this.name, pathType, this.parentPath);
                const fieldPath = Attribute.buildPath(this.field, pathType, this.parentType);
                this.path = path;
                this.fieldPath = fieldPath;
                this.traverser = new AttributeTraverser(definition.traverser);
                this.traverser.setPath(this.path, this);
                this.traverser.setPath(this.fieldPath, this);
                this.traverser.asChild(this.name, this);
                this.parent = { parentType: this.type, parentPath: this.path };
                this.get = this._makeGet(definition.get);
                this.set = this._makeSet(definition.set);
                this.client = definition.client;
            }

            static buildChildAttributes(type, definition, parent) {
                let items;
                let properties;
                if (type === AttributeTypes.list) {
                    items = Attribute.buildChildListItems(definition, parent);
                } else if (type === AttributeTypes.set) {
                    items = Attribute.buildChildSetItems(definition, parent);
                } else if (type === AttributeTypes.map) {
                    properties = Attribute.buildChildMapProperties(definition, parent);
                }

                return {items, properties};
            }

            static buildChildListItems(definition, parent) {
                const {items, client} = definition;
                const prop = {...items, ...parent};
                // The use of "*" is to ensure the child's name is "*" when added to the traverser and searching for the children of a list
                return Schema.normalizeAttributes({ '*': prop }, {}, {client, traverser: parent.traverser}).attributes["*"];
            }

            static buildChildSetItems(definition, parent) {
                const {items, client} = definition;

                const allowedTypes = [AttributeTypes.string, AttributeTypes.boolean, AttributeTypes.number, AttributeTypes.enum];
                if (!Array.isArray(items) && !allowedTypes.includes(items)) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidAttributeDefinition, `Invalid "items" definition for Set attribute: "${definition.path}". Acceptable item types include ${u.commaSeparatedString(allowedTypes)}`);
                }
                const prop = {type: items, ...parent};
                return Schema.normalizeAttributes({ prop }, {}, {client, traverser: parent.traverser}).attributes.prop;
            }

            static buildChildMapProperties(definition, parent) {
                const {properties, client} = definition;
                if (!properties || typeof properties !== "object") {
                    throw new e.ElectroError(e.ErrorCodes.InvalidAttributeDefinition, `Invalid "properties" definition for Map attribute: "${definition.path}". The "properties" definition must describe the attributes that the Map will accept`);
                }
                const attributes = {};
                for (let name of Object.keys(properties)) {
                    attributes[name] = {...properties[name], ...parent};
                }
                return Schema.normalizeAttributes(attributes, {}, {client, traverser: parent.traverser});
            }

            static buildPath(name, type, parentPath) {
                if (!parentPath) return name;
                switch(type) {
                    case AttributeTypes.string:
                    case AttributeTypes.number:
                    case AttributeTypes.boolean:
                    case AttributeTypes.map:
                    case AttributeTypes.set:
                    case AttributeTypes.list:
                    case AttributeTypes.enum:
                        return `${parentPath}.${name}`;
                    case PathTypes.item:
                        return `${parentPath}[*]`;
                    case AttributeTypes.any:
                    default:
                        return `${parentPath}.*`;
                }
            }

            static _destructureWatcher(definition) {
                let watchAll = !!definition.watchAll;
                let watchingArr = watchAll ? []: [...(definition.watching || [])];
                let watchedByArr = [...(definition.watchedBy || [])];
                let isWatched = watchedByArr.length > 0;
                let isWatcher = watchingArr.length > 0;
                let watchedBy = {};
                let watching = {};

                for (let watched of watchedByArr) {
                    watchedBy[watched] = watched;
                }

                for (let attribute of watchingArr) {
                    watching[attribute] = attribute;
                }

                return {
                    watchAll,
                    watching,
                    watchedBy,
                    isWatched,
                    isWatcher
                }
            }

            _makeGet(get) {
                this._checkGetSet(get, "get");
                const getter = get || ((attr) => attr);
                return (value, siblings) => {
                    if (this.hidden) {
                        return;
                    }
                    value = this.unformat(value);
                    return getter(value, siblings);
                }
            }

            _makeSet(set) {
                this._checkGetSet(set, "set");
                return set || ((attr) => attr);
            }

            _makeStructureKey({prefix = "", postfix = "", casing= KeyCasing.none} = {}) {
                return (key) => {
                    let value = key;
                    if (this.type === AttributeTypes.string && v.isStringHasLength(key)) {
                        value = `${prefix}${key}${postfix}`;
                    }
                    return u.formatAttributeCasing(value, casing);
                }
            }

            _makeDestructureKey({prefix = "", postfix = "", casing= KeyCasing.none} = {}) {
                return (key) => {
                    let value = "";
                    if (![AttributeTypes.string, AttributeTypes.enum].includes(this.type) || typeof key !== "string") {
                        return key;
                    } else if (key.length > prefix.length) {
                        for (let i = prefix.length; i < key.length - postfix.length; i++) {
                            value += key[i];
                        }
                    } else {
                        value = key;
                    }
                    return u.formatAttributeCasing(value, casing);
                };
            }

            getPathType(type, parentType) {
                if (parentType === AttributeTypes.list || parentType === AttributeTypes.set) {
                    return PathTypes.item;
                }
                return type;
            }

            getAttribute(path) {
                return this.traverser.getPath(path);
            }

            getChild(path) {
                if (this.type === AttributeTypes.any) {
                    return this;
                } else if (!isNaN(path) && (this.type === AttributeTypes.list || this.type === AttributeTypes.set)) {
                    // if they're asking for a number, and this is a list, children will be under "*"
                    return this.traverser.getChild("*");
                } else {
                    return this.traverser.getChild(path);
                }
            }

            _checkGetSet(val, type) {
                if (typeof val !== "function" && val !== undefined) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidAttributeDefinition, `Invalid "${type}" property for attribute ${this.path}. Please ensure value is a function or undefined.`);
                }
            }

            _makeCast(name, cast) {
                if (cast !== undefined && !CastTypes.includes(cast)) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidAttributeDefinition, `Invalid "cast" property for attribute: "${name}". Acceptable types include ${CastTypes.join(", ",)}`,
                    );
                } else if (cast === AttributeTypes.string) {
                    return (val) => {
                        if (val === undefined) {
                            // todo: #electroerror
                            throw new Error(`Attribute ${name} is undefined and cannot be cast to type ${cast}`);
                        } else if (typeof val === "string") {
                            return val;
                        } else {
                            return JSON.stringify(val);
                        }
                    };
                } else if (cast === AttributeTypes.number) {
                    return (val) => {
                        if (val === undefined) {
                            // todo: #electroerror
                            throw new Error(`Attribute ${name} is undefined and cannot be cast to type ${cast}`);
                        } else if (typeof val === "number") {
                            return val;
                        } else {
                            let results = Number(val);
                            if (isNaN(results)) {
                                // todo: #electroerror
                                throw new Error(`Attribute ${name} cannot be cast to type ${cast}. Doing so results in NaN`);
                            } else {
                                return results;
                            }
                        }
                    };
                } else {
                    return (val) => val;
                }
            }

            _makeValidate(definition) {
                if (typeof definition === "function") {
                    return (val) => {
                        let reason = definition(val);
                        return [!reason, reason || ""];
                    };
                } else if (definition instanceof RegExp) {
                    return (val) => {
                        if (val === undefined) {
                            return [true, ""];
                        }
                        let isValid = definition.test(val);
                        let reason = isValid ? "" : `Invalid value for attribute "${this.path}": Failed model defined regex`;
                        return [isValid, reason];
                    };
                } else {
                    return (val) => [true, ""];
                }
            }

            _makeDefault(definition) {
                if (typeof definition === "function") {
                    return () => definition();
                } else {
                    return () => definition;
                }
            }

            _makeType(name, definition) {
                let type = "";
                let enumArray = [];
                if (Array.isArray(definition)) {
                    type = AttributeTypes.enum;
                    enumArray = [...definition];
                } else {
                    type = definition || "string";
                }
                if (!AttributeTypeNames.includes(type)) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidAttributeDefinition, `Invalid "type" property for attribute: "${name}". Acceptable types include ${AttributeTypeNames.join(", ")}`);
                }
                return { type, enumArray };
            }

            isWatcher() {
                return this._isWatcher;
            }

            isWatched() {
                return this._isWatched;
            }

            isWatching(attribute) {
                return this.watching[attribute] !== undefined;
            }

            isWatchedBy(attribute) {
                return this.watchedBy[attribute] !== undefined;
            }

            _isType(value) {
                if (value === undefined) {
                    return [!this.required, this.required ? `Invalid value type at entity path: "${this.path}". Value is required.` : ""];
                }
                let isTyped = false;
                let reason = "";
                switch (this.type) {
                    case AttributeTypes.enum:
                        isTyped = this.enumArray.includes(value);
                        if (!isTyped) {
                            reason = `Invalid value type at entity path: "${this.path}". Value not found in set of acceptable values: ${u.commaSeparatedString(this.enumArray)}`;
                        }
                        break;
                    case AttributeTypes.any:
                        isTyped = true;
                        break;
                    case AttributeTypes.string:
                    case AttributeTypes.number:
                    case AttributeTypes.boolean:
                    default:
                        isTyped = typeof value === this.type;
                        if (!isTyped) {
                            reason = `Invalid value type at entity path: "${this.path}". Received value of type "${typeof value}", expected value of type "${this.type}"`;
                        }
                        break;
                }
                return [isTyped, reason];
            }

            isValid(value) {
                try {
                    let [isTyped, typeError] = this._isType(value);
                    let [isValid, validationError] = this.validate(value);
                    let reason = [typeError, validationError].filter(Boolean).join(", ");
                    return [isTyped && isValid, reason];
                } catch (err) {
                    return [false, err.message];
                }
            }

            val(value) {
                value = this.cast(value);
                if (value === undefined) {
                    value = this.default();
                }
                return value;
            }

            getValidate(value) {
                value = this.val(value);
                let [isValid, validationError] = this.isValid(value);
                if (!isValid) {
                    // todo: #electroerror
                    throw new Error(validationError);
                }
                return value;
            }
        }

        class MapAttribute extends Attribute {
            constructor(definition) {
                super(definition);
                const properties = Attribute.buildChildMapProperties(definition, {
                    parentType: this.type,
                    parentPath: this.path,
                    traverser: this.traverser
                });
                this.properties = properties;
                this.get = this._makeGet(definition.get, properties);
                this.set = this._makeSet(definition.set, properties);
            }

            _makeGet(get, properties) {
                this._checkGetSet(get, "get");

                const getter = get || ((attr) => attr);

                return (values, siblings) => {
                    const data = {};

                    if (this.hidden) {
                        return;
                    }

                    if (values === undefined) {
                        return getter(data, siblings);
                    }

                    for (const name of Object.keys(properties.attributes)) {
                        const attribute = properties.attributes[name];
                        if (values[attribute.field] !== undefined) {
                            let results = attribute.get(values[attribute.field], {...values});
                            if (results !== undefined) {
                                data[name] = results;
                            }
                        }
                    }


                    return getter(data, siblings);
                }
            }

            _makeSet(set, properties) {
                this._checkGetSet(set, "set");
                const setter = set || ((attr) => attr);
                return (values, siblings) => {
                    const data = {};
                    if (values === undefined) {
                        return setter(data, siblings);
                    }
                    for (const name of Object.keys(properties.attributes)) {
                        const attribute = properties.attributes[name];
                        if (values[name] !== undefined) {
                            const results = attribute.set(values[name], {...values});
                            if (results !== undefined) {
                                data[attribute.field] = results;
                            }
                        }
                    }
                    return setter(data, siblings);
                }
            }

            _isType(value) {
                if (value === undefined) {
                    return [!this.required, this.required ? `Invalid value type at entity path: "${this.path}". Value is required.` : ""];
                }
                const valueType = getValueType(value);
                if (valueType !== ValueTypes.object) {
                    return [false, `Invalid value type at entity path "${this.path}. Received value of type "${valueType}", expected value of type "object"`];
                }
                let reason = "";
                const [childrenAreValid, childErrors] = this._validateChildren(value);
                if (!childrenAreValid) {
                    reason = childErrors;
                }
                return [childrenAreValid, reason]
            }

            _validateChildren(value) {
                const valueType = getValueType(value);
                const attributes = this.properties.attributes;
                const errors = [];
                if (valueType === ValueTypes.object) {
                    for (const child of Object.keys(attributes)) {
                        const [isValid, errorMessages] = attributes[child].isValid(value === undefined ? value : value[child])
                        if (!isValid) {
                            errors.push(errorMessages);
                        }
                    }
                } else if (valueType !== ValueTypes.object) {
                    errors.push(
                        `Invalid value type at entity path: "${this.path}". Expected value to be an object to fulfill attribute type "${this.type}"`
                    );
                } else if (this.properties.hasRequiredAttributes) {
                    errors.push(
                        `Invalid value type at entity path: "${this.path}". Map attribute requires at least the properties ${u.commaSeparatedString(Object.keys(attributes))}`
                    );
                }
                return [errors.length === 0, errors.filter(Boolean).join(", ")];
            }

            val(value) {
                const getValue = (v) => {
                    v = this.cast(v);
                    if (v === undefined) {
                        v = this.default();
                    }
                    return v;
                }
                const valueType = getValueType(value);
                if (value === undefined) {
                    return getValue(value);
                } else if (value && valueType !== "object" && Object.keys(value).length === 0) {
                    return getValue(value);
                } else if (valueType !== "object") {
                    throw new Error(`Invalid value type at entity path: "${this.path}". Expected value to be an object to fulfill attribute type "${this.type}"`);
                }

                const data = {};

                for (const name of Object.keys(this.properties.attributes)) {
                    const attribute = this.properties.attributes[name];
                    const results = attribute.val(value[attribute.name]);
                    if (results !== undefined) {
                        data[name] = results;
                    }
                }

                if (Object.keys(data).length > 0) {
                    return getValue(data);
                } else {
                    return getValue();
                }
            }
        }

        class ListAttribute extends Attribute {
            constructor(definition) {
                super(definition);
                const items = Attribute.buildChildListItems(definition, {
                    parentType: this.type,
                    parentPath: this.path,
                    traverser: this.traverser
                });
                this.items = items;
                this.get = this._makeGet(definition.get, items);
                this.set = this._makeSet(definition.set, items);
            }

            _makeGet(get, items) {
                this._checkGetSet(get, "get");

                const getter = get || ((attr) => attr);

                return (values, siblings) => {
                    const data = [];

                    if (this.hidden) {
                        return;
                    }

                    if (values === undefined) {
                        return getter(data, siblings);
                    }

                    for (let value of values) {
                        const results = items.get(value, [...values]);
                        if (results !== undefined) {
                            data.push(results);
                        }
                    }

                    return getter(data, siblings);
                }
            }

            _makeSet(set, items) {
                this._checkGetSet(set, "set");
                const setter = set || ((attr) => attr);
                return (values, siblings) => {
                    const data = [];

                    if (values === undefined) {
                        return setter(values, siblings);
                    }

                    for (const value of values) {
                        const results = items.set(value, [...values]);
                        if (results !== undefined) {
                            data.push(results);
                        }
                    }

                    return setter(data, siblings);
                }
            }

            _validateArrayValue(value) {
                const valueType = getValueType(value);
                if (value !== undefined && valueType !== ValueTypes.array) {
                    return [false, `Invalid value type at entity path "${this.path}. Received value of type "${valueType}", expected value of type "array"`];
                } else {
                    return [true, ""];
                }
            }

            _isType(value) {
                if (value === undefined) {
                    return [!this.required, this.required ? `Invalid value type at entity path: "${this.path}". Value is required.` : ""];
                }

                const [isValidArray, errors] = this._validateArrayValue(value);
                if (!isValidArray) {
                    return [isValidArray, errors];
                }
                let reason = "";
                const [childrenAreValid, childErrors] = this._validateChildren(value);
                if (!childrenAreValid) {
                    reason = childErrors;
                }
                return [childrenAreValid, reason]
            }

            _validateChildren(value) {
                const valueType = getValueType(value);
                const errors = [];
                if (valueType === ValueTypes.array) {
                    for (const i in value) {
                        const [isValid, errorMessages] = this.items.isValid(value[i]);
                        if (!isValid) {
                            errors.push(errorMessages + ` at index "${i}"`);
                        }
                    }
                } else {
                    errors.push(
                        `Invalid value type at entity path: "${this.path}". Expected value to be an Array to fulfill attribute type "${this.type}"`
                    );
                }
                return [errors.length === 0, errors.filter(Boolean).join(", ")];
            }

            val(value) {
                const getValue = (v) => {
                    v = this.cast(v);
                    if (v === undefined) {
                        v = this.default();
                    }
                    return v;
                }

                if (value === undefined) {
                    return this.default();
                } else if (Array.isArray(value) && value.length === 0) {
                    return value;
                } else if (!Array.isArray(value)) {
                    throw new Error(`Invalid value type at entity path "${this.path}. Received value of type "${getValueType(value)}", expected value of type "array"`);
                }

                const data = [];

                for (const v of value) {
                    const results = this.items.val(v);
                    if (results !== undefined) {
                        data.push(results);
                    }
                }

                if (data.filter(value => value !== undefined).length > 0) {
                    return getValue(data);
                } else {
                    return getValue();
                }
            }
        }

        class SetAttribute extends Attribute {
            constructor(definition) {
                super(definition);
                const items = Attribute.buildChildSetItems(definition, {
                    parentType: this.type,
                    parentPath: this.path,
                    traverser: this.traverser
                });
                this.items = items;
                this.get = this._makeGet(definition.get, items);
                this.set = this._makeSet(definition.set, items);
            }

            fromDDBSet(value) {
                if (getValueType(value) === ValueTypes.aws_set) {
                    return value.values;
                }
                return value;
            }

            _createDDBSet(value) {
                if (this.client && typeof this.client.createSet === "function") {
                    value = Array.isArray(value)
                        ? Array.from(new Set(value))
                        : value;
                    return this.client.createSet(value, {validate: true});
                } else {
                    return new DynamoDBSet(value, this.items.type);
                }
            }

            toDDBSet(value) {
                const valueType = getValueType(value);
                let array;
                switch(valueType) {
                    case ValueTypes.set:
                        array = Array.from(value);
                        return this._createDDBSet(array);
                    case ValueTypes.aws_set:
                        return value;
                    case ValueTypes.array:
                        return this._createDDBSet(value);
                    case ValueTypes.string:
                    case ValueTypes.number: {
                        this.items.getValidate(value);
                        return this._createDDBSet(value);
                    }
                    default:
                        throw new Error(`Invalid attribute value supplied to "set" attribute "${this.path}". Received value of type "${valueType}". Set values must be supplied as either Arrays, native JavaScript Set objects, DocumentClient Set objects, strings, or numbers.`)
                }

            }

            _makeGet(get, items) {
                this._checkGetSet(get, "get");

                const getter = get || ((attr) => attr);

                return (values, siblings) => {
                    if (values !== undefined) {
                        const data = this.fromDDBSet(values);
                        return getter(data, siblings);
                    }
                    let results = getter(data, siblings);
                    if (results !== undefined) {
                        // if not undefined, try to convert, else no need to return
                        return this.fromDDBSet(results);
                    }
                }
            }

            _makeSet(set, items) {
                this._checkGetSet(set, "set");
                const setter = set || ((attr) => attr);
                return (values, siblings) => {
                    const results = setter(values, siblings);
                    if (results !== undefined) {
                        return this.toDDBSet(results);
                    }
                }
            }

            _isType(value) {
                if (value === undefined) {
                    return [!this.required, this.required ? `Invalid value type at entity path: "${this.path}". Value is required.` : ""];
                }

                let reason = "";
                const [childrenAreValid, childErrors] = this._validateChildren(value);
                if (!childrenAreValid) {
                    reason = childErrors;
                }
                return [childrenAreValid, reason]
            }

            _validateChildren(value) {
                const valueType = getValueType(value);
                const errors = [];
                let arr = [];
                if (valueType === ValueTypes.array) {
                    arr = value;
                } else if (valueType === ValueTypes.set) {
                    arr = Array.from(value);
                } else if (valueType === ValueTypes.aws_set) {
                    arr = value.values;
                } else {
                    errors.push(
                        `Invalid value type at attribute path: "${this.path}". Expected value to be an Expected value to be an Array, native JavaScript Set objects, or DocumentClient Set objects to fulfill attribute type "${this.type}"`
                    )
                }
                for (const item of arr) {
                    const [isValid, errorMessage] = this.items.isValid(item);
                    if (!isValid) {
                        errors.push(errorMessage);
                    }
                }
                return [errors.length === 0, errors.filter(Boolean).join(", ")];
            }

            val(value) {
                if (value === undefined) {
                    value = this.default();
                }

                if (value !== undefined) {
                    return this.toDDBSet(value);
                }
            }
        }

        class Schema {
            constructor(properties = {}, facets = {}, {traverser = new AttributeTraverser(), client} = {}) {
                this._validateProperties(properties);
                let schema = Schema.normalizeAttributes(properties, facets, {traverser, client});
                this.client = client;
                this.attributes = schema.attributes;
                this.enums = schema.enums;
                this.translationForTable = schema.translationForTable;
                this.translationForRetrieval = schema.translationForRetrieval;
                this.hiddenAttributes = schema.hiddenAttributes;
                this.readOnlyAttributes = schema.readOnlyAttributes;
                this.requiredAttributes = schema.requiredAttributes;
                this.translationForWatching = this._formatWatchTranslations(this.attributes);
                this.traverser = traverser;
            }

            static normalizeAttributes(attributes = {}, facets = {}, {traverser, client} = {}) {
                let invalidProperties = [];
                let normalized = {};
                let usedAttrs = {};
                let enums = {};
                let translationForTable = {};
                let translationForRetrieval = {};
                let watchedAttributes = {};
                let requiredAttributes = new Set();
                let hiddenAttributes = new Set();
                let readOnlyAttributes = new Set();
                let definitions = {};
                for (let name in attributes) {
                    let attribute = attributes[name];
                    if (typeof attribute === AttributeTypes.string || Array.isArray(attribute)) {
                        attribute = {
                            type: attribute
                        };
                    }
                    const field = attribute.field || name;
                    let isKeyField = false;
                    let prefix = "";
                    let postfix = "";
                    let casing = KeyCasing.none;
                    if (facets.byField && facets.byField[field] !== undefined) {
                        for (const indexName of Object.keys(facets.byField[field])) {
                            let definition = facets.byField[field][indexName];
                            if (definition.facets.length > 1) {
                                throw new e.ElectroError(
                                    e.ErrorCodes.InvalidIndexCompositeWithAttributeName,
                                    `Invalid definition for "${definition.type}" field on index "${u.formatIndexNameForDisplay(indexName)}". The ${definition.type} field "${definition.field}" shares a field name with an attribute defined on the Entity, and therefore is not allowed to contain composite references to other attributes. Please either change the field name of the attribute, or redefine the index to use only the single attribute "${definition.field}".`
                                )
                            }
                            if (definition.isCustom) {
                                const keyFieldLabels = facets.labels[indexName][definition.type].labels;
                                // I am not sure how more than two would happen but it would mean either
                                // 1. Code prior has an unknown edge-case.
                                // 2. Method is being incorrectly used.
                                if (keyFieldLabels.length > 2) {
                                    throw new e.ElectroError(
                                        e.ErrorCodes.InvalidIndexWithAttributeName,
                                        `Unexpected definition for "${definition.type}" field on index "${u.formatIndexNameForDisplay(indexName)}". The ${definition.type} field "${definition.field}" shares a field name with an attribute defined on the Entity, and therefore is not possible to have more than two labels as part of it's template. Please either change the field name of the attribute, or reformat the key template to reduce all pre-fixing or post-fixing text around the attribute reference to two.`
                                    )
                                }
                                isKeyField = true;
                                casing = definition.casing;
                                // Walk through the labels, given the above exception handling, I'd expect the first element to
                                // be the prefix and the second element to be the postfix.
                                for (const value of keyFieldLabels) {
                                    if (value.name === field) {
                                        prefix = value.label || "";
                                    } else {
                                        postfix = value.label || "";
                                    }
                                }
                                if (attribute.type !== AttributeTypes.string && !Array.isArray(attribute.type)) {
                                    if (prefix.length > 0 || postfix.length > 0) {
                                        throw new e.ElectroError(e.ErrorCodes.InvalidIndexWithAttributeName, `definition for "${definition.type}" field on index "${u.formatIndexNameForDisplay(indexName)}". Index templates may only have prefix or postfix values on "string" or "enum" type attributes. The ${definition.type} field "${field}" is type "${attribute.type}", and therefore cannot be used with prefixes or postfixes. Please either remove the prefixed or postfixed values from the template or change the field name of the attribute.`);
                                    }
                                }
                            } else {
                                // Upstream middleware should have taken care of this. An error here would mean:
                                // 1. Code prior has an unknown edge-case.
                                // 2. Method is being incorrectly used.
                                throw new e.ElectroError(
                                    e.ErrorCodes.InvalidIndexCompositeWithAttributeName,
                                    `Unexpected definition for "${definition.type}" field on index "${u.formatIndexNameForDisplay(indexName)}". The ${definition.type} field "${definition.field}" shares a field name with an attribute defined on the Entity, and therefore must be defined with a template. Please either change the field name of the attribute, or add a key template to the "${definition.type}" field on index "${u.formatIndexNameForDisplay(indexName)}" with the value: "\${${definition.field}}"`
                                )
                            }

                            if (definition.inCollection) {
                                throw new e.ElectroError(
                                    e.ErrorCodes.InvalidCollectionOnIndexWithAttributeFieldNames,
                                    `Invalid use of a collection on index "${u.formatIndexNameForDisplay(indexName)}". The ${definition.type} field "${definition.field}" shares a field name with an attribute defined on the Entity, and therefore the index is not allowed to participate in a Collection. Please either change the field name of the attribute, or remove all collection(s) from the index.`
                                )
                            }
                        }
                    }

                    let isKey = !!facets.byIndex && facets.byIndex[""].all.find((facet) => facet.name === name);
                    let definition = {
                        name,
                        field,
                        client,
                        casing,
                        prefix,
                        postfix,
                        traverser,
                        isKeyField,
                        label: attribute.label,
                        required: !!attribute.required,
                        default: attribute.default,
                        validate: attribute.validate,
                        readOnly: !!attribute.readOnly || isKey,
                        hidden: !!attribute.hidden,
                        indexes: (facets.byAttr && facets.byAttr[name]) || [],
                        type: attribute.type,
                        get: attribute.get,
                        set: attribute.set,
                        watching: Array.isArray(attribute.watch) ? attribute.watch : [],
                        items: attribute.items,
                        properties: attribute.properties,
                        parentPath: attribute.parentPath,
                        parentType: attribute.parentType,
                    };

                    if (attribute.watch !== undefined) {
                        if (attribute.watch === AttributeWildCard) {
                            definition.watchAll = true;
                            definition.watching = [];
                        } else if (Array.isArray(attribute.watch)) {
                            definition.watching = attribute.watch;
                        } else {
                            throw new e.ElectroError(e.ErrorCodes.InvalidAttributeWatchDefinition, `Attribute Validation Error. The attribute '${name}' is defined to "watch" an invalid value of: '${attribute.watch}'. The watch property must either be a an array of attribute names, or the single string value of "${WatchAll}".`);
                        }
                    } else {
                        definition.watching = [];
                    }

                    if (definition.readOnly) {
                        readOnlyAttributes.add(name);
                    }

                    if (definition.hidden) {
                        hiddenAttributes.add(name);
                    }

                    if (definition.required) {
                        requiredAttributes.add(name);
                    }

                    if (facets.byAttr && facets.byAttr[definition.name] !== undefined && (!ValidFacetTypes.includes(definition.type) && !Array.isArray(definition.type))) {
                        let assignedIndexes = facets.byAttr[name].map(assigned => assigned.index === "" ? "Table Index" : assigned.index);
                        throw new e.ElectroError(e.ErrorCodes.InvalidAttributeDefinition, `Invalid composite attribute definition: Composite attributes must be one of the following: ${ValidFacetTypes.join(", ")}. The attribute "${name}" is defined as being type "${attribute.type}" but is a composite attribute of the the following indexes: ${assignedIndexes.join(", ")}`);
                    }

                    if (usedAttrs[definition.field] || usedAttrs[name]) {
                        invalidProperties.push({
                            name,
                            property: "field",
                            value: definition.field,
                            expected: `Unique field property, already used by attribute ${
                                usedAttrs[definition.field]
                            }`,
                        });
                    } else {
                        usedAttrs[definition.field] = definition.name;
                    }

                    translationForTable[definition.name] = definition.field;
                    translationForRetrieval[definition.field] = definition.name;

                    for (let watched of definition.watching) {
                        watchedAttributes[watched] = watchedAttributes[watched] || [];
                        watchedAttributes[watched].push(name);
                    }

                    definitions[name] = definition;
                }

                for (let name of Object.keys(definitions)) {
                    const definition = definitions[name];

                    definition.watchedBy = Array.isArray(watchedAttributes[name])
                        ? watchedAttributes[name]
                        : [];

                    switch(definition.type) {
                        case AttributeTypes.map:
                            normalized[name] = new MapAttribute(definition);
                            break;
                        case AttributeTypes.list:
                            normalized[name] = new ListAttribute(definition);
                            break;
                        case AttributeTypes.set:
                            normalized[name] = new SetAttribute(definition);
                            break;
                        default:
                            normalized[name] = new Attribute(definition);
                    }
                }

                let watchedWatchers = [];
                let watchingUnknownAttributes = [];
                for (let watched of Object.keys(watchedAttributes)) {
                    if (normalized[watched] === undefined) {
                        for (let attribute of watchedAttributes[watched]) {
                            watchingUnknownAttributes.push({attribute, watched});
                        }
                    } else if (normalized[watched].isWatcher()) {
                        for (let attribute of watchedAttributes[watched]) {
                            watchedWatchers.push({attribute, watched});
                        }
                    }
                }

                if (watchingUnknownAttributes.length > 0) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidAttributeWatchDefinition, `Attribute Validation Error. The following attributes are defined to "watch" invalid/unknown attributes: ${watchingUnknownAttributes.map(({watched, attribute}) => `"${attribute}"->"${watched}"`).join(", ")}.`);
                }

                if (watchedWatchers.length > 0) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidAttributeWatchDefinition, `Attribute Validation Error. Attributes may only "watch" other attributes also watch attributes. The following attributes are defined with ineligible attributes to watch: ${watchedWatchers.map(({attribute, watched}) => `"${attribute}"->"${watched}"`).join(", ")}.`)
                }

                let missingFacetAttributes = Array.isArray(facets.attributes)
                    ? facets.attributes
                        .filter(({ name }) => !normalized[name])
                        .map((facet) => `"${facet.type}: ${facet.name}"`)
                    : []
                if (missingFacetAttributes.length > 0) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidKeyCompositeAttributeTemplate, `Invalid key composite attribute template. The following composite attribute attributes were described in the key composite attribute template but were not included model's attributes: ${missingFacetAttributes.join(", ")}`);
                }
                if (invalidProperties.length > 0) {
                    let message = invalidProperties.map((prop) => `Schema Validation Error. Attribute "${prop.name}" property "${prop.property}". Received: "${prop.value}", Expected: "${prop.expected}"`);
                    throw new e.ElectroError(e.ErrorCodes.InvalidAttributeDefinition, message);
                } else {
                    return {
                        enums,
                        hiddenAttributes,
                        readOnlyAttributes,
                        requiredAttributes,
                        translationForTable,
                        translationForRetrieval,
                        attributes: normalized,
                    };
                }
            }

            _validateProperties() {}

            _formatWatchTranslations(attributes) {
                let watchersToAttributes = {};
                let attributesToWatchers = {};
                let watchAllAttributes = {};
                let hasWatchers = false;
                for (let name of Object.keys(attributes)) {
                    if (attributes[name].isWatcher()) {
                        hasWatchers = true;
                        watchersToAttributes[name] = attributes[name].watching;
                    } else if (attributes[name].watchAll) {
                        hasWatchers = true;
                        watchAllAttributes[name] = name;
                    } else {
                        attributesToWatchers[name] = attributesToWatchers[name] || {};
                        attributesToWatchers[name] = attributes[name].watchedBy;
                    }
                }
                return {
                    hasWatchers,
                    watchAllAttributes,
                    watchersToAttributes,
                    attributesToWatchers
                };
            }

            getAttribute(path) {
                return this.traverser.getPath(path);
            }

            getLabels() {
                let labels = {};
                for (let name of Object.keys(this.attributes)) {
                    let label = this.attributes[name].label;
                    if (label !== undefined) {
                        labels[name] = label;
                    }
                }
                return labels;
            };

            getLabels() {
                let labels = {};
                for (let name of Object.keys(this.attributes)) {
                    let label = this.attributes[name].label;
                    if (label !== undefined) {
                        labels[name] = label;
                    }
                }
                return labels;
            };

            _applyAttributeMutation(method, include, avoid, payload) {
                let data = { ...payload };
                for (let path of Object.keys(include)) {
                    // this.attributes[attribute] !== undefined | Attribute exists as actual attribute. If `includeKeys` is turned on for example this will include values that do not have a presence in the model and therefore will not have a `.get()` method
                    // avoid[attribute] === undefined           | Attribute shouldn't be in the avoided
                    const attribute = this.getAttribute(path);
                    if (attribute !== undefined && avoid[path] === undefined) {
                        data[path] = attribute[method](payload[path], {...payload});
                    }
                }
                return data;
            }

            _fulfillAttributeMutationMethod(method, payload) {
                let watchersToTrigger = {};
                // include: payload               | We want to hit the getters/setters for any attributes coming in to be changed
                // avoid: watchersToAttributes    | We want to avoid anything that is a watcher, even if it was included
                let avoid = {...this.translationForWatching.watchersToAttributes, ...this.translationForWatching.watchAllAttributes};
                let data = this._applyAttributeMutation(method, payload, avoid, payload);
                // `data` here will include all the original payload values, but with the mutations applied to on non-watchers
                if (!this.translationForWatching.hasWatchers) {
                    // exit early, why not
                    return data;
                }
                for (let attribute of Object.keys(data)) {
                    let watchers = this.translationForWatching.attributesToWatchers[attribute];
                    // Any of the attributes on data have a watcher?
                    if (watchers !== undefined) {
                        watchersToTrigger = {...watchersToTrigger, ...watchers}
                    }
                }

                // include: ...data, ...watchersToTrigger | We want to hit attributes that were watching an attribute included in data, and include an properties that were skipped because they were a watcher
                // avoid: attributesToWatchers            | We want to avoid hit anything that was not a watcher because they were already hit once above
                let include = {...data, ...watchersToTrigger, ...this.translationForWatching.watchAllAttributes};
                return this._applyAttributeMutation(method, include, this.translationForWatching.attributesToWatchers, data);
            }

            applyAttributeGetters(payload = {}) {
                return this._fulfillAttributeMutationMethod(AttributeMutationMethods.get, payload);
            }

            applyAttributeSetters(payload = {}) {
                return this._fulfillAttributeMutationMethod(AttributeMutationMethods.set, payload);
            }

            translateFromFields(item = {}, options = {}) {
                let { includeKeys } = options;
                let data = {};
                let names = this.translationForRetrieval;
                for (let [attr, value] of Object.entries(item)) {
                    let name = names[attr];
                    if (name) {
                        data[name] = value;
                    } else if (includeKeys) {
                        data[attr] = value;
                    }
                }
                return data;
            }

            translateToFields(payload = {}) {
                let record = {};
                for (let [name, value] of Object.entries(payload)) {
                    let field = this.translationForTable[name];
                    if (value !== undefined) {
                        record[field] = value;
                    }
                }
                return record;
            }

            checkCreate(payload = {}) {
                let record = {};
                for (let attribute of Object.values(this.attributes)) {
                    let value = payload[attribute.name];
                    record[attribute.name] = attribute.getValidate(value);
                }
                return record;
            }

            checkRemove(paths = []) {
                for (const path of paths) {
                    const attribute = this.traverser.getPath(path);
                    if (!attribute) {
                        throw new Error(`Attribute "${path}" does not exist on model.`);
                    } else if (attribute.readOnly) {
                        throw new Error(`Attribute "${attribute.path}" is Read-Only and cannot be removed`);
                    } else if (attribute.required) {
                        throw new Error(`Attribute "${attribute.path}" is Required and cannot be removed`);
                    }
                }
                return paths;
            }

            checkUpdate(payload = {}) {
                let record = {};
                for (let [path, attribute] of this.traverser.getAll()) {
                    let value = payload[path];
                    if (value === undefined) {
                        continue;
                    }
                    if (attribute.readOnly) {
                        // todo: #electroerror
                        throw new Error(`Attribute "${attribute.path}" is Read-Only and cannot be updated`);
                    } else {
                        record[path] = attribute.getValidate(value);
                    }
                }
                return record;
            }

            getReadOnly() {
                return Array.from(this.readOnlyAttributes);
            }

            getRequired() {
                return Array.from(this.requiredAttributes);
            }

            formatItemForRetrieval(item, config) {
                let remapped = this.translateFromFields(item, config);
                let data = this._fulfillAttributeMutationMethod("get", remapped);
                if (this.hiddenAttributes.size > 0) {
                    for (let attribute of Object.keys(data)) {
                        if (this.hiddenAttributes.has(attribute)) {
                            delete data[attribute];
                        }
                    }
                }
                return data;
            }
        }

        module.exports = {
            Schema,
            Attribute,
            CastTypes,
        };

    },{"./errors":16,"./set":21,"./types":22,"./util":24,"./validations":25}],20:[function(require,module,exports){
        const { Entity } = require("./entity");
        const { clauses } = require("./clauses");
        const { KeyCasing, ServiceVersions, Pager, ElectroInstance, ElectroInstanceTypes, ModelVersions } = require("./types");
        const { FilterFactory } = require("./filters");
        const { FilterOperations } = require("./operations");
        const { WhereFactory } = require("./where");
        const { getInstanceType, getModelVersion, applyBetaModelOverrides } = require("./util");
        const v = require("./validations");
        const e = require("./errors");
        const u = require("./util");

        const ConstructorTypes = {
            beta: "beta",
            v1: "v1",
            v1Map: "v1Map",
            unknown: "unknown"
        };

        function inferConstructorType(service) {
            if (v.isNameEntityRecordType(service) || v.isNameModelRecordType(service)) {
                return ConstructorTypes.v1Map;
            } else if (v.isBetaServiceConfig(service)) {
                return ConstructorTypes.beta;
            } else if (v.isStringHasLength(service)) {
                return ConstructorTypes.v1;
            } else {
                return ConstructorTypes.unknown;
            }
        }

        function inferJoinValues(alias, instance, config) {
            let hasAlias = true;
            let args = {alias, instance, config, hasAlias};
            if (typeof alias !== "string") {
                args.config = instance;
                args.instance = alias;
                args.hasAlias = false;
            }
            return args;
        }

        class Service {
            _betaConstructor(service, config) {
                this.service = {};
                this._modelOverrides = {};

                // Unique to Beta
                this._modelVersion = ModelVersions.beta;
                this._modelOverrides = {
                    table: service.table,
                    service: service.service,
                    version: service.version,
                };
                this.service.name = service.name || service.service;
                this.service.table = service.table;
                this.service.version = service.version;
                // Unique to Beta

                this.config = config;
                this.client = config.client;
                this.entities = {};
                this.find = {};
                this.collectionSchema = {};
                this.collections = {};
                this._instance = ElectroInstance.service;
                this._instanceType = ElectroInstanceTypes.service;
            }

            _v1Constructor(service, config) {
                this.service = {};
                this._modelOverrides = {};

                // Unique to V1
                this._modelVersion = ModelVersions.v1;
                this.service.name = service;
                this.service.table = config.table;
                this._modelOverrides.table = config.table;
                // Unique to V1

                this.config = config;
                this.client = config.client;
                this.entities = {};
                this.find = {};
                this.collectionSchema = {};
                this.collections = {};
                this._instance = ElectroInstance.service;
                this._instanceType = ElectroInstanceTypes.service;
            }

            _v1MapConstructor(service, config) {
                let entityNames = Object.keys(service);
                let serviceName = this._inferServiceNameFromEntityMap(service);
                this._v1Constructor(serviceName, config);
                for (let name of entityNames) {
                    let entity = service[name];
                    this.join(name, entity, config);
                }
            }

            constructor(service = "", config = {}) {
                this.version = ServiceVersions.v1;
                let type = inferConstructorType(service);
                switch(type) {
                    case ConstructorTypes.v1Map:
                        this._v1MapConstructor(service, config);
                        break;
                    case ConstructorTypes.beta:
                        this._betaConstructor(service, config);
                        break;
                    case ConstructorTypes.v1:
                        this._v1Constructor(service, config);
                        break;
                    default:
                        throw new e.ElectroError(e.ErrorCodes.InvalidJoin, `Invalid service name: ${JSON.stringify(service)}. Service name must have length greater than zero`);
                }
            }

            _inferServiceNameFromEntityMap(service) {
                let names = Object.keys(service);
                let entity = names
                    .map(name => service[name])
                    .map(instance => this._inferJoinEntity(instance))
                    .find(entity => entity && entity.model && entity.model.service)

                if (!entity || !entity.model || !entity.model.service) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidJoin, `Invalid service name: Entities/Models provided do not contain property for Service Name`);
                }

                return entity.model.service;
            }

            _inferJoinEntity(instance, options) {
                let entity = {};
                let type = getInstanceType(instance);
                let modelVersion = getModelVersion(instance);
                switch(type) {
                    case ElectroInstanceTypes.model:
                        entity = new Entity(instance, options);
                        break;
                    case ElectroInstanceTypes.entity:
                        entity = instance;
                        break;
                    default:
                        /** start beta/v1 condition **/
                        if (modelVersion !== this._modelVersion) {
                            throw new e.ElectroError(e.ErrorCodes.InvalidJoin, "Invalid instance: Valid instances to join include Models and Entity instances. Additionally, all models must be in the same format (v1 vs beta). Review https://github.com/tywalch/electrodb#version-v1-migration for more detail.");
                        } else if (modelVersion === ModelVersions.beta) {
                            instance = applyBetaModelOverrides(instance, this._modelOverrides);
                        } else {
                            throw new e.ElectroError(e.ErrorCodes.InvalidJoin, `Invalid instance: Valid instances to join include Models and Entity instances.`);
                        }
                        entity = new Entity(instance, options);
                        /** end beta/v1 condition **/
                        break;
                }
                return entity;
            }

            /**
             * Join
             * @param {string} alias
             * @param instance
             * @param config
             * @returns {Service}
             */
            join(...args) {
                let {alias, instance, config, hasAlias} = inferJoinValues(...args);
                let options = { ...config, ...this.config };

                let entity = this._inferJoinEntity(instance, options);

                let name = hasAlias ? alias : entity.getName();

                if (this.service.name.toLowerCase() !== entity.model.service.toLowerCase()) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidJoin, `Service name defined on joined instance, ${entity.model.service}, does not match the name of this Service: ${this.service.name}. Verify or update the service name on the Entity/Model to match the name defined on this service.`);
                }

                if (this._getTableName()) {
                    entity._setTableName(this._getTableName());
                }

                if (options.client) {
                    entity._setClient(options.client);
                }

                if (this._modelVersion === ModelVersions.beta && this.service.version) {
                    entity.model.version = this.service.version;
                }

                this.entities[name] = entity;
                for (let collection of this.entities[name].model.collections) {
                    this._addCollectionEntity(collection, name, this.entities[name]);
                    this.collections[collection] = (...facets) => {
                        let { entities, attributes, identifiers } = this.collectionSchema[collection];
                        return this._makeCollectionChain(collection, attributes, clauses, identifiers, entities, Object.values(entities)[0], ...facets);
                    };
                }
                this.find = { ...this.entities, ...this.collections };
                return this;
            }

            _setClient(client) {
                if (client !== undefined) {
                    for (let entity of Object.values(this.entities)) {
                        entity._setClient(client);
                    }
                }
            }

            _getEntityIdentifiers(entities) {
                let identifiers = [];
                for (let alias of Object.keys(entities)) {
                    let entity = entities[alias];
                    let name = entity.model.entity;
                    let version = entity.model.version;
                    identifiers.push({
                        name,
                        alias,
                        version,
                        entity,
                        nameField: entity.identifiers.entity,
                        versionField: entity.identifiers.version
                    });
                }
                return identifiers;
            }

            cleanseRetrievedData(collection = "", entities, data = {}, config = {}) {
                if (config.raw) {
                    if (config._isPagination) {
                        return [data.LastEvaluatedKey, data];
                    } else {
                        return data;
                    }
                }

                data.Items = data.Items || [];
                let index = this.collectionSchema[collection].index;
                let results = {};
                let identifiers = this._getEntityIdentifiers(entities);
                for (let {alias} of identifiers) {
                    results[alias] = [];
                }
                for (let record of data.Items) {
                    let entityAlias;
                    for (let {name, version, nameField, versionField, alias} of identifiers) {
                        if (record[nameField] !== undefined && record[nameField] === name && record[versionField] !== undefined && record[versionField] === version) {
                            entityAlias = alias;
                            break;
                        }
                    }
                    if (!entityAlias) {
                        continue;
                    }

                    // pager=false because we don't want the entity trying to parse the lastEvaluatedKey
                    let items = this.collectionSchema[collection].entities[entityAlias].formatResponse({Item: record}, index, {...config, pager: false});
                    results[entityAlias].push(items);
                }

                if (config._isPagination) {
                    let page = this._formatReturnPager(config, index, data.LastEvaluatedKey, data.Items[data.Items.length - 1]);
                    return [page, results];
                } else {
                    return results;
                }
            }

            findKeyOwner(lastEvaluatedKey) {
                return Object.values(this.entities)
                    .find((entity) => entity.ownsLastEvaluatedKey(lastEvaluatedKey));
            }

            findItemPagerOwner(collection, pager = {}) {
                if (this.collectionSchema[collection] === undefined) {
                    throw new Error("Invalid collection");
                }
                let matchingEntities = [];
                if (pager === null) {
                    return matchingEntities;
                }
                for (let entity of Object.values(this.collectionSchema[collection].entities)) {
                    if (entity.ownsPager(pager, this.collectionSchema[collection].index)) {
                        matchingEntities.push(entity);
                    }
                }
                return matchingEntities;
            }

            findNamedPagerOwner(pager = {}) {
                let identifiers = this._getEntityIdentifiers(this.entities);
                for (let identifier of identifiers) {
                    let hasCorrectFieldProperties = typeof pager[identifier.nameField] === "string" && typeof pager[identifier.versionField] === "string";
                    let hasMatchingFieldValues = pager[identifier.nameField] === identifier.name && pager[identifier.versionField] === identifier.version;
                    if (hasCorrectFieldProperties && hasMatchingFieldValues) {
                        return identifier.entity;
                    }
                }
            }

            expectPagerOwner(type, collection, pager) {
                if (type === Pager.raw) {
                    return Object.values(this.collectionSchema[collection].entities)[0];
                } else if (type === Pager.named || type === undefined) {
                    let owner = this.findNamedPagerOwner(pager);
                    if (owner === undefined) {
                        throw new e.ElectroError(e.ErrorCodes.NoOwnerForPager, "Supplied Pager does not resolve to Entity within Service");
                    }
                    return owner;
                } else if (type === Pager.item) {
                    let owners = this.findItemPagerOwner(collection, pager);
                    if (owners.length === 1) {
                        return owners[0];
                    } else {
                        throw new e.ElectroError(e.ErrorCodes.PagerNotUnique, "Supplied Pager did not resolve to single Entity");
                    }
                } else {
                    throw new e.ElectroError(e.ErrorCodes.InvalidOptions, `Invalid value for option "pager" provider: "${pager}". Allowed values include ${u.commaSeparatedString(Object.keys(Pager))}.`)
                }
            }

            findPagerIdentifiers(collection, pager = {}) {
                if (this.collectionSchema[collection] === undefined) {
                    throw new Error("Invalid collection");
                }
                let matchingIdentifiers = [];
                if (pager === null) {
                    return matchingIdentifiers;
                }
                for (let entity of Object.values(this.collectionSchema[collection].entities)) {
                    if (entity.ownsPager(pager, this.collectionSchema[collection].index)) {
                        matchingIdentifiers.push({
                            [entity.identifiers.entity]: entity.getName(),
                            [entity.identifiers.version]: entity.getVersion(),
                        });
                    }
                }
                return matchingIdentifiers;
            }

            _formatReturnPager(config, index, lastEvaluatedKey, lastReturned) {
                if (config.pager === "raw") {
                    return lastEvaluatedKey;
                } else if (!lastEvaluatedKey) {
                    return null;
                } else {
                    let entity = this.findKeyOwner(lastEvaluatedKey);
                    if (!entity) {
                        return lastReturned !== undefined
                            ? this._formatReturnPager(config, index, lastReturned)
                            : null
                    }
                    let page = entity._formatKeysToItem(index, lastEvaluatedKey);
                    if (config.pager === "named") {
                        page[entity.identifiers.entity] = entity.getName();
                        page[entity.identifiers.version] = entity.getVersion();
                    }
                    return page;
                }
            }

            _getTableName() {
                return this.service.table;
            }

            _setTableName(table) {
                this.service.table = table;
                for (let entity of Object.values(this.entities)) {
                    entity._setTableName(table);
                }
            }

            _makeCollectionChain(name = "", attributes = {}, initialClauses = {}, expressions = {}, entities = {}, entity = {}, facets = {}) {
                let filterBuilder = new FilterFactory(attributes, FilterOperations);
                let whereBuilder = new WhereFactory(attributes, FilterOperations);

                let pageClause = {...initialClauses.page};
                let pageAction = initialClauses.page.action;
                pageClause.action = (entity, state, page = null, options = {}) => {
                    try {
                        if (page === null) {
                            return pageAction(entity, state, page, options);
                        }
                        let owner = this.expectPagerOwner(options.pager, name, page);
                        return pageAction(owner, state, page, options);
                    } catch(err) {
                        return Promise.reject(err);
                    }
                }
                let clauses = {...initialClauses, page: pageClause};

                clauses = filterBuilder.injectFilterClauses(clauses);
                clauses = whereBuilder.injectWhereClauses(clauses);

                let options = {
                    // expressions, // DynamoDB doesnt return what I expect it would when provided with these entity filters
                    parse: (options, data) => {
                        return this.cleanseRetrievedData(name, entities, data, options);
                    }
                };

                return entity.collection(name, clauses, facets, options);
            }

            _validateIndexCasingMatch(definition = {}, providedIndex = {}) {
                const definitionSk = definition.sk || {};
                const providedSk = providedIndex.sk || {};
                const pkCasingMatch = v.isMatchingCasing(definition.pk.casing, providedIndex.pk.casing);
                const skCasingMatch = v.isMatchingCasing(definitionSk.casing, providedSk.casing);
                return {
                    pk: pkCasingMatch,
                    sk: skCasingMatch
                };
            }

            _validateCollectionDefinition(definition = {}, providedIndex = {}) {
                let indexMatch = definition.index === providedIndex.index;
                let pkFieldMatch = definition.pk.field === providedIndex.pk.field;
                let pkFacetLengthMatch = definition.pk.facets.length === providedIndex.pk.facets.length;
                let mismatchedFacetLabels = [];
                let collectionDifferences = [];
                let definitionIndexName = u.formatIndexNameForDisplay(definition.index);
                let providedIndexName = u.formatIndexNameForDisplay(providedIndex.index);
                let matchingKeyCasing = this._validateIndexCasingMatch(definition, providedIndex);
                if (pkFacetLengthMatch) {
                    for (let i = 0; i < definition.pk.labels.length; i++) {
                        let definitionFacet = definition.pk.labels[i].name;
                        let definitionLabel = definition.pk.labels[i].label;
                        let providedFacet = providedIndex.pk.labels[i].name;
                        let providedLabel = providedIndex.pk.labels[i].label;
                        let noLabels = definition.pk.labels[i].label === definition.pk.labels[i].name && providedIndex.pk.labels[i].label === providedIndex.pk.labels[i].name;
                        if (definitionLabel !== providedLabel) {
                            mismatchedFacetLabels.push({
                                definitionFacet,
                                definitionLabel,
                                providedFacet,
                                providedLabel,
                                type: noLabels ? "facet" : "label"
                            });
                        } else if (definitionFacet !== providedFacet) {
                            mismatchedFacetLabels.push({
                                definitionFacet,
                                definitionLabel,
                                providedFacet,
                                providedLabel,
                                type: "facet"
                            });
                        }
                    }
                }
                if (!matchingKeyCasing.pk) {
                    collectionDifferences.push(
                        `The pk property "casing" provided "${providedIndex.pk.casing || KeyCasing.default}" does not match established casing "${definition.pk.casing || KeyCasing.default}" on index "${providedIndexName}". Index casing options must match across all entities participating in a collection`
                    );
                }
                if (!matchingKeyCasing.sk) {
                    const definedSk = definition.sk || {};
                    const providedSk = providedIndex.sk || {};
                    collectionDifferences.push(
                        `The sk property "casing" provided "${definedSk.casing || KeyCasing.default}" does not match established casing "${providedSk.casing || KeyCasing.default}" on index "${providedIndexName}". Index casing options must match across all entities participating in a collection`
                    );
                }
                if (!indexMatch) {
                    collectionDifferences.push(
                        `Collection defined on provided index "${providedIndexName}" does not match collection established index "${definitionIndexName}". Collections must be defined on the same index across all entities within a service.`,
                    );
                } else if (!pkFieldMatch) {
                    collectionDifferences.push(
                        `Partition Key composite attributes provided "${providedIndex.pk.field}" for index "${providedIndexName}" do not match established field "${definition.pk.field}" on established index "${definitionIndexName}"`,
                    );
                }
                if (!pkFacetLengthMatch) {
                    collectionDifferences.push(
                        `Partition Key composite attributes provided [${providedIndex.pk.facets.map(val => `"${val}"`).join(", ")}] for index "${providedIndexName}" do not match established composite attributes [${definition.pk.facets.map(val => `"${val}"`).join(", ")}] on established index "${definitionIndexName}"`,
                    );
                    // Else if used here because if they don't even have the same facet length then the data collected for the mismatched facets would include undefined values
                    // which would make the error messages even more confusing.
                } else if (mismatchedFacetLabels.length > 0) {
                    for (let mismatch of mismatchedFacetLabels) {
                        if (mismatch.type === "facet") {
                            collectionDifferences.push(
                                `Partition Key composite attributes provided for index "${providedIndexName}" do not match established composite attribute "${mismatch.definitionFacet}" on established index "${definitionIndexName}": "${mismatch.definitionLabel}" != "${mismatch.providedLabel}"; Composite attribute definitions must match between all members of a collection to ensure key structures will resolve to identical Partition Keys. Please ensure these composite attribute definitions are identical for all entities associated with this service.`
                            );
                        } else {
                            collectionDifferences.push(
                                `Partition Key composite attributes provided for index "${providedIndexName}" contain conflicting composite attribute labels for established composite attribute "${mismatch.definitionFacet}" on established index "${definitionIndexName}". Established composite attribute "${mismatch.definitionFacet}" on established index "${definitionIndexName}" was defined with label "${mismatch.definitionLabel}" while provided composite attribute "${mismatch.providedFacet}" on provided index "${providedIndexName}" is defined with label "${mismatch.providedLabel}". Composite attribute labels definitions must match between all members of a collection to ensure key structures will resolve to identical Partition Keys. Please ensure these labels definitions are identical for all entities associated with this service.`
                            );
                        }

                    }
                }
                return [!!collectionDifferences.length, collectionDifferences];
            }

            _compareEntityAttributes(definition = {}, providedAttributes = {}) {
                let results = {
                    additions: {},
                    invalid: [],
                };
                for (let [name, detail] of Object.entries(providedAttributes)) {
                    let defined = definition[name];
                    if (defined === undefined) {
                        results.additions[name] = detail;
                    } else if (defined.field !== detail.field) {
                        results.invalid.push(
                            `Attribute provided "${name}" with Table Field "${detail.field}" does not match established Table Field "${defined.field}"`,
                        );
                    }
                }
                return [!!results.invalid.length, results];
            }

            _processEntityAttributes(definition = {}, providedAttributes = {}) {
                let [attributesAreIncompatible, attributeResults] = this._compareEntityAttributes(definition, providedAttributes);
                if (attributesAreIncompatible) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidJoin, `Invalid entity attributes. The following attributes have already been defined on this model but with incompatible or conflicting properties: ${attributeResults.invalid.join(", ")}`);
                } else {
                    return {
                        ...definition,
                        ...attributeResults.additions,
                    };
                }
            }

            _processEntityKeys(name, definition = {}, providedIndex = {}) {
                if (!Object.keys(definition).length) {
                    definition = providedIndex;
                }
                const [invalidDefinition, invalidIndexMessages] = this._validateCollectionDefinition(definition, providedIndex);
                if (invalidDefinition) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidJoin, `Validation Error while joining entity, "${name}". ${invalidIndexMessages.join(", ")}`);
                }
                return definition;
            }

            _getEntityIndexFromCollectionName(collection, entity) {
                for (let index of Object.values(entity.model.indexes)) {
                    let names = [];
                    if (v.isArrayHasLength(index.collection)) {
                        names = index.collection;
                    } else {
                        names.push(index.collection);
                    }

                    for (let name of names) {
                        if (v.isStringHasLength(name) && name === collection) {
                            return index;
                        }
                    }
                }
                return Object.values(entity.model.indexes).find(
                    (index) => {
                        if (v.isStringHasLength(index.collection)) {
                            return index.collection === collection;
                        } else if (v.isArrayHasLength(index.collection)) {
                            return index.collection.indexOf(collection) > 0;
                        }
                    },
                );
            }

            _processSubCollections(existing, provided, entityName, collectionName) {
                let existingSubCollections;
                let providedSubCollections;
                if (v.isArrayHasLength(existing)) {
                    existingSubCollections = existing;
                } else {
                    existingSubCollections = [existing];
                }
                if (v.isArrayHasLength(provided)) {
                    providedSubCollections = provided
                } else {
                    providedSubCollections = [provided];
                }

                const existingRequiredIndex = existingSubCollections.indexOf(collectionName);
                const providedRequiredIndex = providedSubCollections.indexOf(collectionName);
                if (providedRequiredIndex < 0) {
                    throw new Error(`The collection definition for Collection "${collectionName}" does not exist on Entity "${entityName}".`);
                }
                if (existingRequiredIndex >= 0 && existingRequiredIndex !== providedRequiredIndex) {
                    throw new Error(`The collection definition for Collection "${collectionName}", on Entity "${entityName}", does not match the established sub-collection order for this service. The collection name provided in slot ${providedRequiredIndex + 1}, ${providedSubCollections[existingRequiredIndex] === undefined ? '(not found)' : `"${providedSubCollections[existingRequiredIndex]}"`}, on Entity "${entityName}", does not match the established collection name in slot ${existingRequiredIndex + 1}, "${collectionName}". When using sub-collections, all Entities within a Service must must implement the same order for all preceding sub-collections.`);
                }
                let length = Math.max(existingRequiredIndex, providedRequiredIndex);
                for (let i = 0; i <= length; i++) {
                    let existingCollection = existingSubCollections[i];
                    let providedCollection = providedSubCollections[i];
                    if (v.isStringHasLength(existingCollection)) {
                        if (existingCollection === providedCollection && providedCollection === collectionName) {
                            return i;
                        }
                        if (existingCollection !== providedCollection) {
                            throw new Error(`The collection definition for Collection "${collectionName}", on Entity "${entityName}", does not match the established sub-collection order for this service. The collection name provided in slot ${i+1}, "${providedCollection}", on Entity "${entityName}", does not match the established collection name in slot ${i + 1}, "${existingCollection}". When using sub-collections, all Entities within a Service must must implement the same order for all preceding sub-collections.`);
                        }
                    } else if (v.isStringHasLength(providedCollection)) {
                        if (providedCollection === collectionName) {
                            return i;
                        }
                    }
                }
            }

            _addCollectionEntity(collection = "", name = "", entity = {}) {
                let providedIndex = this._getEntityIndexFromCollectionName(
                    collection,
                    entity,
                );

                this.collectionSchema[collection] = this.collectionSchema[collection] || {
                    entities: {},
                    keys: {},
                    attributes: {},
                    identifiers: {
                        names: {},
                        values: {},
                        expression: ""
                    },
                    index: undefined,
                    table: "",
                    collection: []
                };
                if (this.collectionSchema[collection].entities[name] !== undefined) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidJoin, `Entity with name '${name}' has already been joined to this service.`);
                }

                if (this.collectionSchema[collection].table !== "") {
                    if (this.collectionSchema[collection].table !== entity._getTableName()) {
                        throw new e.ElectroError(e.ErrorCodes.InvalidJoin, `Entity with name '${name}' is defined to use a different Table than what is defined on other Service Entities and/or the Service itself. Entity '${name}' is defined with table name '${entity._getTableName()}' but the Service has been defined to use table name '${this.collectionSchema[collection].table}'. All Entities in a Service must reference the same DynamoDB table. To ensure all Entities will use the same DynamoDB table, it is possible to apply the property 'table' to the Service constructor's configuration parameter.`);
                    }
                } else {
                    this.collectionSchema[collection].table = entity._getTableName();
                }
                this.collectionSchema[collection].keys = this._processEntityKeys(name, this.collectionSchema[collection].keys, providedIndex);
                this.collectionSchema[collection].attributes = this._processEntityAttributes(this.collectionSchema[collection].attributes, entity.model.schema.attributes);
                this.collectionSchema[collection].entities[name] = entity;
                this.collectionSchema[collection].identifiers = this._processEntityIdentifiers(this.collectionSchema[collection].identifiers, entity.getIdentifierExpressions(name));
                this.collectionSchema[collection].index = this._processEntityCollectionIndex(this.collectionSchema[collection].index, providedIndex.index, name, collection);
                let collectionIndex = this._processSubCollections(this.collectionSchema[collection].collection, providedIndex.collection, name, collection);
                this.collectionSchema[collection].collection[collectionIndex] = collection;

            }

            _processEntityCollectionIndex(existing, provided, name, collection) {
                if (typeof provided !== "string") {
                    throw new e.ElectroError(e.ErrorCodes.InvalidJoin, `Entity with name '${name}' does not have collection ${collection} defined on it's model`);
                } else if (existing === undefined) {
                    return provided;
                } else if (provided !== existing) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidJoin, `Entity with name '${name}' defines collection ${collection} on index `);
                } else {
                    return existing;
                }
            }

            _processEntityIdentifiers(existing = {}, {names, values, expression} = {}) {
                let identifiers = {};
                if (names) {
                    identifiers.names = Object.assign({}, existing.names, names);
                }
                if (values) {
                    identifiers.values = Object.assign({}, existing.values, values);
                }
                if (expression) {
                    identifiers.expression = [existing.expression, expression].filter(Boolean).join(" OR ");
                }
                return identifiers;
            }
        }

        module.exports = { Service };

    },{"./clauses":14,"./entity":15,"./errors":16,"./filters":17,"./operations":18,"./types":22,"./util":24,"./validations":25,"./where":26}],21:[function(require,module,exports){
        const memberTypeToSetType = {
            'String': 'String',
            'Number': 'Number',
            'NumberValue': 'Number',
            'Binary': 'Binary',
            'string': 'String',
            'number': 'Number'
        };

        class DynamoDBSet {
            constructor(list, type) {
                this.wrapperName = 'Set';
                this.type = memberTypeToSetType[type];
                if (this.type === undefined) {
                    new Error(`Invalid Set type: ${type}`);
                }
                this.values = Array.from(new Set([].concat(list)));
            }

            initialize(list, validate) {

            }

            detectType() {
                return memberTypeToSetType[typeof (this.values[0])];
            }

            validate() {

            }

            toJSON() {
                return this.values;
            }
        }

        module.exports = {DynamoDBSet};

    },{}],22:[function(require,module,exports){
        const KeyTypes = {
            pk: "pk",
            sk: "sk",
        };

        const BatchWriteTypes = {
            batch: "batch",
            concurrent: "concurrent"
        }

        const QueryTypes = {
            and: "and",
            gte: "gte",
            gt: "gt",
            lte: "lte",
            lt: "lt",
            eq: "eq",
            begins: "begins",
            between: "between",
            collection: "collection",
            is: "is"
        };

        const MethodTypes = {
            put: "put",
            get: "get",
            query: "query",
            scan: "scan",
            update: "update",
            delete: "delete",
            remove: "remove",
            scan: "scan",
            patch: "patch",
            create: "create",
            batchGet: "batchGet",
            batchWrite: "batchWrite"
        };

        const Comparisons = {
            gte: ">=",
            gt: ">",
            lte: "<=",
            lt: "<",
        };

        const CastTypes = ["string", "number"];

        const AttributeTypes = {
            string: "string",
            number: "number",
            boolean: "boolean",
            enum: "enum",
            map: "map",
            set: "set",
            list: "list",
            any: "any",
        };

        const PathTypes = {
            ...AttributeTypes,
            item: "item"
        };


        const ExpressionTypes = {
            ConditionExpression: "ConditionExpression",
            FilterExpression: "FilterExpression"
        };

        const ElectroInstance = {
            entity: Symbol("entity"),
            service: Symbol("service"),
            electro: Symbol("electro"),
        };

        const ElectroInstanceTypes = {
            electro: "electro",
            service: "service",
            entity: "entity",
            model: "model"
        };

        const ModelVersions = {
            beta: "beta",
            v1: "v1",
            v2: "v2"
        };

        const EntityVersions = {
            v1: "v1"
        };

        const ServiceVersions = {
            v1: "v1"
        };

        const MaxBatchItems = {
            [MethodTypes.batchGet]: 100,
            [MethodTypes.batchWrite]: 25
        };

        const AttributeMutationMethods = {
            get: "get",
            set: "set"
        };

        const Pager = {
            raw: "raw",
            named: "named",
            item: "item"
        }

        const UnprocessedTypes = {
            raw: "raw",
            item: "item"
        };

        const AttributeWildCard = "*";

        const ItemOperations = {
            "set": "set",
            "delete": "delete",
            "remove": "remove",
            "add": "add",
            "subtract": "subtract",
            "append": "append",
        };

        const AttributeProxySymbol = Symbol("attribute_proxy");

        const BuilderTypes = {
            update: "update",
            filter: "filter"
        };

        const ValueTypes = {
            string: "string",
            boolean: "boolean",
            number: "number",
            array: "array",
            set: "set",
            aws_set: "aws_set",
            object: "object",
            map: "map",
            null: "null",
            undefined: "undefined",
            unknown: "unknown",
        };

        const TraverserIndexes = {
            readonly: "readonly",
            required: "required",
            getters: "getters",
            setters: "setters"
        }

        const ReturnValues = {
            'default': 'default',
            'none': 'none',
            'all_old': 'all_old',
            'updated_old': 'updated_old',
            'all_new': 'all_new',
            'updated_new': 'updated_new',
        };

        const FormatToReturnValues = {
            'none': 'NONE',
            'default': 'NONE',
            'all_old': 'ALL_OLD',
            'updated_old': 'UPDATED_OLD',
            'all_new': 'ALL_NEW',
            'updated_new': 'UPDATED_NEW'
        };

        const TableIndex = "";

        const KeyCasing = {
            none: "none",
            upper: "upper",
            lower: "lower",
            default: "default",
        }

        module.exports = {
            Pager,
            KeyTypes,
            CastTypes,
            KeyCasing,
            PathTypes,
            QueryTypes,
            ValueTypes,
            TableIndex,
            MethodTypes,
            Comparisons,
            BuilderTypes,
            ReturnValues,
            MaxBatchItems,
            ModelVersions,
            ItemOperations,
            AttributeTypes,
            EntityVersions,
            ServiceVersions,
            ExpressionTypes,
            ElectroInstance,
            TraverserIndexes,
            UnprocessedTypes,
            AttributeWildCard,
            FormatToReturnValues,
            AttributeProxySymbol,
            ElectroInstanceTypes,
            AttributeMutationMethods
        };

    },{}],23:[function(require,module,exports){
        const {AttributeOperationProxy, ExpressionState} = require("./operations");
        const {ItemOperations, BuilderTypes} = require("./types");

        class UpdateExpression extends ExpressionState {
            constructor(props = {}) {
                super({...props});
                this.operations = {
                    set: new Set(),
                    remove: new Set(),
                    add: new Set(),
                    subtract: new Set(),
                    delete: new Set()
                };
                this.type = BuilderTypes.update;
            }

            add(type, expression) {
                this.operations[type].add(expression);
            }

            set(name, value) {
                const n = this.setName({}, name, name);
                const v = this.setValue(name, value);
                this.add(ItemOperations.set, `${n.prop} = ${v}`);
            }

            remove(name) {
                const n = this.setName({}, name, name);
                this.add(ItemOperations.remove, `${n.prop}`);
            }

            build() {
                let expressions = [];
                for (const type of Object.keys(this.operations)) {
                    const operations = this.operations[type];
                    if (operations.size > 0) {
                        expressions.push(`${type.toUpperCase()} ${Array.from(operations).join(", ")}`);
                    }
                }
                return expressions.join(" ");
            }
        }

        class UpdateEntity {
            constructor(attributes = {}, operations = {}) {
                this.attributes = {...attributes};
                this.operations = {...operations};
            }

            buildCallbackHandler(entity, state) {
                const proxy = new AttributeOperationProxy({
                    builder: state.query.updates,
                    attributes: this.attributes,
                    operations: this.operations,
                });

                return (cb, ...params) => {
                    if (typeof cb !== "function") {
                        throw new Error('Update Callback must be of type "function"');
                    }
                    proxy.invokeCallback(cb, ...params);
                }
            }
        }

        module.exports = {
            UpdateEntity,
            UpdateExpression
        }
    },{"./operations":18,"./types":22}],24:[function(require,module,exports){
        const v = require("./validations");
        const t = require("./types");

        function parseJSONPath(path = "") {
            if (typeof path !== "string") {
                throw new Error("Path must be a string");
            }
            path = path.replace(/\[/g, ".");
            path = path.replace(/\]/g, "");
            return path.split(".");
        }

        function genericizeJSONPath(path = "") {
            return path.replace(/\[\d+\]/g, "[*]");
        }

        function getInstanceType(instance = {}) {
            let [isModel, errors] = v.testModel(instance);
            if (!instance || Object.keys(instance).length === 0) {
                return "";
            } else if (isModel) {
                return t.ElectroInstanceTypes.model;
            } else if (instance._instance === t.ElectroInstance.entity) {
                return t.ElectroInstanceTypes.entity;
            } else if (instance._instance === t.ElectroInstance.service) {
                return t.ElectroInstanceTypes.service;
            } else if (instance._instance === t.ElectroInstance.electro) {
                return t.ElectroInstanceTypes.electro;
            } else {
                return "";
            }
        }

        function getModelVersion(model = {}) {
            let nameOnRoot = model && v.isStringHasLength(model.entity);
            let nameInModelNamespace = model && model.model && v.isStringHasLength(model.model.entity);
            if (nameInModelNamespace) {
                return t.ModelVersions.v1
            } else if (nameOnRoot) {
                return t.ModelVersions.beta;
            } else {
                return "";
            }
        }

        function applyBetaModelOverrides(model = {}, {service = "", version = "", table = ""} = {}) {
            let type = getModelVersion(model);
            if (type !== t.ModelVersions.beta) {
                throw new Error("Invalid model");
            }
            let copy = Object.assign({}, model);
            if (v.isStringHasLength(service)) {
                copy.service = service;
            }
            if (v.isStringHasLength(version)) {
                copy.version = version;
            }
            if (v.isStringHasLength(table)) {
                copy.table = table;
            }
            return copy;
        }

        function batchItems(arr = [], size) {
            if (isNaN(size)) {
                throw new Error("Batch size must be of type number");
            }
            let batched = [];
            for (let i = 0; i < arr.length; i++) {
                let partition = Math.floor(i / size);
                batched[partition] = batched[partition] || [];
                batched[partition].push(arr[i]);
            }
            return batched;
        }

        function commaSeparatedString(array = []) {
            return array.map(value => `"${value}"`).join(", ");
        }

        function formatStringCasing(str, casing, defaultCase) {
            if (typeof str !== "string") {
                return str;
            }
            let strCase = defaultCase;
            if (v.isStringHasLength(casing) && typeof t.KeyCasing[casing] === "string") {
                strCase = t.KeyCasing.default === casing
                    ? defaultCase
                    : t.KeyCasing[casing];
            }
            switch (strCase) {
                case t.KeyCasing.upper:
                    return str.toUpperCase();
                case t.KeyCasing.none:
                    return str;
                case t.KeyCasing.lower:
                    return str.toLowerCase();
                case t.KeyCasing.default:
                default:
                    return str;
            }
        }

        function formatKeyCasing(str, casing) {
            return formatStringCasing(str, casing, t.KeyCasing.lower);
        }

        function formatAttributeCasing(str, casing) {
            return formatStringCasing(str, casing, t.KeyCasing.none);
        }

        function formatIndexNameForDisplay(index) {
            if (index) {
                return index;
            } else {
                return "(Primary Index)";
            }
        }

        module.exports = {
            batchItems,
            parseJSONPath,
            getInstanceType,
            getModelVersion,
            formatKeyCasing,
            genericizeJSONPath,
            commaSeparatedString,
            formatAttributeCasing,
            applyBetaModelOverrides,
            formatIndexNameForDisplay
        };

    },{"./types":22,"./validations":25}],25:[function(require,module,exports){
        const e = require("./errors");
        const {KeyCasing} = require("./types")

        const Validator = require("jsonschema").Validator;
        Validator.prototype.customFormats.isFunction = function (input) {
            return typeof input === "function";
        };
        Validator.prototype.customFormats.isFunctionOrString = function (input) {
            return typeof input === "function" || typeof input === "string";
        };
        Validator.prototype.customFormats.isFunctionOrRegexp = function (input) {
            return typeof input === "function" || input instanceof RegExp;
        };

        let v = new Validator();

        const Attribute = {
            id: "/Attribute",
            type: ["object", "string", "array"],
            required: ["type"],
            properties: {
                type: {
                    // todo: only specific values
                    type: ["string", "array"],
                    // enum: ["string", "number", "boolean", "enum"],
                },
                field: {
                    type: "string",
                },
                hidden: {
                    type: "boolean"
                },
                watch: {
                    type: ["array", "string"],
                    items: {
                        type: "string",
                    }
                },
                label: {
                    type: "string",
                },
                readOnly: {
                    type: "boolean",
                },
                required: {
                    type: "boolean",
                },
                cast: {
                    type: "string",
                    enum: ["string", "number"],
                },
                default: {
                    type: "any",
                },
                validate: {
                    type: "any",
                    format: "isFunctionOrRegexp",
                },
                get: {
                    type: "any",
                    format: "isFunction",
                },
                set: {
                    type: "any",
                    format: "isFunction",
                },
            },
        };

        const Index = {
            id: "/Index",
            type: "object",
            properties: {
                pk: {
                    type: "object",
                    required: true,
                    properties: {
                        field: {
                            type: "string",
                            required: true,
                        },
                        facets: {
                            type: ["array", "string"],
                            minItems: 1,
                            items: {
                                type: "string",
                            },
                            required: false,
                        },
                        composite: {
                            type: ["array"],
                            minItems: 1,
                            items: {
                                type: "string",
                            },
                            required: false,
                        },
                        template: {
                            type: "string",
                            required: false,
                        },
                        casing: {
                            type: "string",
                            enum: ["upper", "lower", "none", "default"],
                            required: false,
                        }
                    },
                },
                sk: {
                    type: "object",
                    required: ["field"],
                    properties: {
                        field: {
                            type: "string",
                            required: true,
                        },
                        facets: {
                            type: ["array", "string"],
                            required: false,
                            items: {
                                type: "string",
                            },
                        },
                        composite: {
                            type: ["array"],
                            required: false,
                            items: {
                                type: "string",
                            },
                        },
                        template: {
                            type: "string",
                            required: false,
                        },
                        casing: {
                            type: "string",
                            enum: ["upper", "lower", "none", "default"],
                            required: false,
                        }
                    },
                },
                index: {
                    type: "string",
                },
                collection: {
                    type: ["array", "string"]
                }
            },
        };

        const Modelv1= {
            type: "object",
            required: true,
            properties: {
                model: {
                    type: "object",
                    required: true,
                    properties: {
                        entity: {
                            type: "string",
                            required: true
                        },
                        version: {
                            type: "string",
                            required: true
                        },
                        service: {
                            type: "string",
                            required: true
                        }
                    }
                },
                table: {
                    type: "string",
                },
                attributes: {
                    type: "object",
                    patternProperties: {
                        ["."]: { $ref: "/Attribute" },
                    },
                },
                indexes: {
                    type: "object",
                    minProperties: 1,
                    patternProperties: {
                        ["."]: { $ref: "/Index" },
                    },
                },
                filters: { $ref: "/Filters" },
            },
            required: ["model", "attributes", "indexes"]
        };

        const ModelBeta = {
            type: "object",
            required: true,
            properties: {
                service: {
                    type: "string",
                    required: true,
                },
                entity: {
                    type: "string",
                    required: true,
                },
                table: {
                    type: "string",
                },
                version: {
                    type: "string",
                },
                attributes: {
                    type: "object",
                    patternProperties: {
                        ["."]: { $ref: "/Attribute" },
                    },
                },
                indexes: {
                    type: "object",
                    minProperties: 1,
                    patternProperties: {
                        ["."]: { $ref: "/Index" },
                    },
                },
                filters: { $ref: "/Filters" },
            },
            required: ["attributes", "indexes"]
        };

        const Filters = {
            id: "/Filters",
            type: "object",
            patternProperties: {
                ["."]: {
                    type: "any",
                    format: "isFunction",
                    message: "Requires function",
                },
            },
        };

        v.addSchema(Attribute, "/Attribute");
        v.addSchema(Index, "/Index");
        v.addSchema(Filters, "/Filters");
        v.addSchema(ModelBeta, "/ModelBeta");
        v.addSchema(Modelv1, "/Modelv1");

        function validateModel(model = {}) {
            /** start beta/v1 condition **/
            let betaErrors = v.validate(model, "/ModelBeta").errors;
            if (betaErrors.length) {
                /** end/v1 condition **/
                let errors = v.validate(model, "/Modelv1").errors;
                if (errors.length) {
                    throw new e.ElectroError(e.ErrorCodes.InvalidModel,
                        errors
                            .map((err) => {
                                let message = `${err.property}`;
                                switch (err.argument) {
                                    case "isFunction":
                                        return `${message} must be a function`;
                                    case "isFunctionOrString":
                                        return `${message} must be either a function or string`;
                                    case "isFunctionOrRegexp":
                                        return `${message} must be either a function or Regexp`;
                                    default:
                                        return `${message} ${err.message}`;
                                }
                            })
                            .join(", "),
                    );
                }
            }
        }

        function testModel(model) {
            let isModel = false;
            let error = "";
            try {
                validateModel(model);
                isModel = true;
            } catch(err) {
                error = err.message;
            }
            return [isModel, error];
        }

        function isStringHasLength(str) {
            return typeof str === "string" && str.length > 0;
        }

        function isObjectHasLength(obj) {
            return typeof obj === "object" && Object.keys(obj).length > 0;
        }

        function isArrayHasLength(arr) {
            return Array.isArray(arr) && arr.length > 0;
        }

        function isNameEntityRecordType(entityRecord) {
            return isObjectHasLength(entityRecord) && Object.values(entityRecord).find(value => {
                return value._instance !== undefined;
            })
        }

        function isNameModelRecordType(modelRecord) {
            return isObjectHasLength(modelRecord) && Object.values(modelRecord).find(value => {
                return value.model
                    && isStringHasLength(value.model.entity)
                    && isStringHasLength(value.model.version)
                    && isStringHasLength(value.model.service)
            });
        }

        function isBetaServiceConfig(serviceConfig) {
            return isObjectHasLength(serviceConfig)
                && (isStringHasLength(serviceConfig.service) || isStringHasLength(serviceConfig.name))
                && isStringHasLength(serviceConfig.version)
        }

        function isFunction(value) {
            return typeof value === "function";
        }

        function stringArrayMatch(arr1, arr2) {
            let areArrays = Array.isArray(arr1) && Array.isArray(arr2);
            let match = areArrays && arr1.length === arr2.length;
            for (let i = 0; i < arr1.length; i++) {
                if (!match) {
                    break;
                }
                match = isStringHasLength(arr1[i]) && arr1[i] === arr2[i];
            }
            return match;
        }

        function isMatchingCasing(casing1, casing2) {
            const equivalentCasings = [KeyCasing.default, KeyCasing.lower];
            if (isStringHasLength(casing1) && isStringHasLength(casing2)) {
                let isRealCase = KeyCasing[casing1.toLowerCase()] !== undefined;
                let casingsMatch = casing1 === casing2;
                let casingsAreEquivalent = [casing1, casing2].every(casing => {
                    return casing === KeyCasing.lower || casing === KeyCasing.default;
                });
                return isRealCase && (casingsMatch || casingsAreEquivalent);
            } else if (isStringHasLength(casing1)) {
                return equivalentCasings.includes(casing1.toLowerCase());
            } else if (isStringHasLength(casing2)) {
                return equivalentCasings.includes(casing2.toLowerCase());
            } else {
                return casing1 === undefined && casing2 === undefined;
            }
        }

        module.exports = {
            testModel,
            isFunction,
            stringArrayMatch,
            isMatchingCasing,
            isArrayHasLength,
            isStringHasLength,
            isObjectHasLength,
            isBetaServiceConfig,
            isNameModelRecordType,
            isNameEntityRecordType,
            model: validateModel
        };

    },{"./errors":16,"./types":22,"jsonschema":6}],26:[function(require,module,exports){
        const {MethodTypes, ExpressionTypes, BuilderTypes} = require("./types");
        const {AttributeOperationProxy, ExpressionState} = require("./operations");
        const e = require("./errors");

        class FilterExpression extends ExpressionState {
            constructor(props) {
                super(props);
                this.expression = "";
                this.type = BuilderTypes.filter;
            }

            _trim(expression) {
                if (typeof expression === "string" && expression.length > 0) {
                    return expression.replace(/\n|\r/g, "").trim();
                }
                return "";
            }

            _isEmpty(expression) {
                if (typeof expression !== "string") {
                    throw new Error("Invalid expression value type. Expected type string.");
                }
                return !expression.replace(/\n|\r|\w/g, "").trim();
            }

            add(newExpression) {
                let expression = "";
                let existingExpression = this.expression;
                if (typeof existingExpression === "string" && existingExpression.length > 0) {
                    newExpression = this._trim(newExpression);
                    let isEmpty = this._isEmpty(newExpression);
                    if (isEmpty) {
                        return existingExpression;
                    }
                    let existingNeedsParens = !existingExpression.startsWith("(") && !existingExpression.endsWith(")");
                    if (existingNeedsParens) {
                        existingExpression = `(${existingExpression})`;
                    }
                    expression = `${existingExpression} AND ${newExpression}`;
                } else {
                    expression = this._trim(newExpression);
                }
                this.expression = expression;
            }

            build() {
                return this.expression;
            }
        }

        class WhereFactory {
            constructor(attributes = {}, operations = {}) {
                this.attributes = {...attributes};
                this.operations = {...operations};
            }

            getExpressionType(methodType) {
                switch (methodType) {
                    case MethodTypes.put:
                    case MethodTypes.create:
                    case MethodTypes.update:
                    case MethodTypes.patch:
                    case MethodTypes.delete:
                    case MethodTypes.remove:
                        return ExpressionTypes.ConditionExpression
                    default:
                        return ExpressionTypes.FilterExpression
                }
            }

            buildClause(cb) {
                if (typeof cb !== "function") {
                    throw new e.ElectroError(e.ErrorCodes.InvalidWhere, 'Where callback must be of type "function"');
                }
                return (entity, state, ...params) => {
                    const type = this.getExpressionType(state.query.method);
                    const builder = state.query.filter[type];
                    const proxy = new AttributeOperationProxy({
                        builder,
                        attributes: this.attributes,
                        operations: this.operations
                    });
                    const expression = proxy.invokeCallback(cb, ...params);
                    if (typeof expression !== "string") {
                        throw new e.ElectroError(e.ErrorCodes.InvalidWhere, "Invalid response from where clause callback. Expected return result to be of type string");
                    }
                    builder.add(expression);
                    return state;
                };
            }

            injectWhereClauses(clauses = {}, filters = {}) {
                let injected = { ...clauses };
                let filterParents = Object.entries(injected)
                    .filter(clause => {
                        let [name, { children }] = clause;
                        return children.includes("go");
                    })
                    .map(([name]) => name);
                let modelFilters = Object.keys(filters);
                let filterChildren = [];
                for (let [name, filter] of Object.entries(filters)) {
                    filterChildren.push(name);
                    injected[name] = {
                        name,
                        action: this.buildClause(filter),
                        children: ["params", "go", "page", "where", ...modelFilters],
                    };
                }
                filterChildren.push("where");
                injected["where"] = {
                    name: "where",
                    action: (entity, state, fn) => {
                        return this.buildClause(fn)(entity, state);
                    },
                    children: ["params", "go", "page", "where", ...modelFilters],
                };
                for (let parent of filterParents) {
                    injected[parent] = { ...injected[parent] };
                    injected[parent].children = [
                        ...filterChildren,
                        ...injected[parent].children,
                    ];
                }
                return injected;
            }
        }

        module.exports = {
            WhereFactory,
            FilterExpression
        };

    },{"./errors":16,"./operations":18,"./types":22}]},{},[13]);
