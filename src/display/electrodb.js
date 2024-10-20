(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { Entity } = require("./src/entity");
const { Service } = require("./src/service");
const {
  createGetTransaction,
  createWriteTransaction,
} = require("./src/transaction");
const {
  createCustomAttribute,
  CustomAttributeType,
  createSchema,
} = require("./src/schema");
const {
  ElectroError,
  ElectroValidationError,
  ElectroUserValidationError,
  ElectroAttributeValidationError,
} = require("./src/errors");
const { createConversions } = require("./src/conversions");

const {
  ComparisonTypes
} = require('./src/types');

module.exports = {
  Entity,
  Service,
  ElectroError,
  createSchema,
  ComparisonTypes,
  CustomAttributeType,
  createCustomAttribute,
  ElectroValidationError,
  createGetTransaction,
  createWriteTransaction,
  ElectroUserValidationError,
  ElectroAttributeValidationError,
  createConversions,
};

},{"./src/conversions":19,"./src/entity":20,"./src/errors":21,"./src/schema":26,"./src/service":27,"./src/transaction":29,"./src/types":30}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],3:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":2,"buffer":3,"ieee754":6}],4:[function(require,module,exports){
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

},{"./util":5,"punycode":12,"querystring":15}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],7:[function(require,module,exports){
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

},{"./helpers":8}],8:[function(require,module,exports){
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


},{"url":4}],9:[function(require,module,exports){
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

},{"./helpers":8,"./scan":10,"./validator":11}],10:[function(require,module,exports){
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

},{"./helpers":8,"url":4}],11:[function(require,module,exports){
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

},{"./attribute":7,"./helpers":8,"./scan":10,"url":4}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":13,"./encode":14}],16:[function(require,module,exports){
/* istanbul ignore file */
const ElectroDB = require("../index");

window.Prism = window.Prism || {};
window.electroParams = window.electroParams || [];
const appDiv = document.getElementById("param-container");

window.notifyRedirect = function notifyRedirect(e) {
  if (top.location !== self.location) {
    e.preventDefault();
    window.top.postMessage(
      JSON.stringify({ type: "redirect", data: e.target.href }),
      "*",
    );
  }
};

function aOrAn(value = "") {
  return ["a", "e", "i", "o", "u"].includes(value[0].toLowerCase())
    ? "an"
    : "a";
}

function properCase(str = "") {
  let newStr = "";
  for (let i = 0; i < str.length; i++) {
    let value = i === 0 ? str[i].toUpperCase() : str[i];
    newStr += value;
  }
  return newStr;
}

function formatProper(value) {
  return formatStrict(properCase(value));
}

function formatStrict(value) {
  return `<b>${value}</b>`;
}

function formatProvidedKeys(pk = {}, sks = []) {
  let keys = { ...pk };
  for (const sk of sks) {
    keys = { ...keys, ...sk.facets };
  }
  const provided = Object.keys(keys).map((key) => formatStrict(key));
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
    return `<h2>${state}</h2>`;
  } else {
    const method = state.query.method;
    const type = state.query.type;
    const collection = state.query.collection;
    const accessPattern =
      entity.model.translations.indexes.fromIndexToAccessPattern[
        state.query.index
      ];
    const keys = formatProvidedKeys(state.query.keys.pk, state.query.keys.sk);
    if (collection) {
      return `<h2>Queries the collection ${formatProper(
        collection,
      )}, on the service ${formatProper(
        entity.model.service,
      )}, by ${keys}</h2>`;
    } else if (method === "query") {
      return `<h2>Queries the access pattern ${formatProper(
        accessPattern,
      )}, on the entity ${formatProper(entity.model.name)}, by ${keys}</h2>`;
    } else if (state.self === "commit") {
      // handled inside the "client" so each operation doesn't get its own printed line
    } else {
      return `<h2>Performs ${aOrAn(method)} ${formatProper(
        method,
      )} operation, on the entity ${formatProper(entity.model.name)}</h2>`;
    }
  }
}

function printToScreen({ params, state, entity, cache } = {}) {
  const innerHtml = appDiv.innerHTML;
  const label = formatParamLabel(state, entity);
  if (cache) {
    window.electroParams.push({ title: label, json: params });
  }
  let code = `<pre class="language-json"><code class="language-json">${JSON.stringify(
    params,
    null,
    4,
  )}</code></pre>`;
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
  return `<h3>${description}</h3><br><h3>For more detail on this error reference <a href="${link}" onclick="notifyRedirect(event)">${link}</a></h3>`;
}

function printMessage(type, message) {
  const error = formatError(message);
  const innerHtml = appDiv.innerHTML;
  const label = type === "info" ? "" : "<h2>Query Error</h2>";
  const code = `<hr>${label}<div class="${type} message">${error}</div>`;
  appDiv.innerHTML = innerHtml + code;
}

function clearScreen() {
  appDiv.innerHTML = "";
  window.electroParams = [];
}

function promiseCallback(results) {
  return {
    promise: async () => results,
  };
}

class Entity extends ElectroDB.Entity {
  constructor(schema, options = {}) {
    super(schema, {
      ...options,
      client: {
        put: () => promiseCallback({}),
        delete: () => promiseCallback({}),
        update: () => promiseCallback({}),
        get: () => promiseCallback({ Item: {} }),
        query: () => promiseCallback({ Items: [] }),
        scan: () => promiseCallback({ Items: [] }),
        batchWrite: () =>
          promiseCallback({
            UnprocessedKeys: { [options.table]: { Keys: [] } },
          }),
        batchGet: () =>
          promiseCallback({
            Responses: { [options.table]: [] },
            UnprocessedKeys: { [options.table]: { Keys: [] } },
          }),
        transactWrite: (params) => {
          return {
            promise: async () => {
              printToScreen({
                params,
                entity: this,
                cache: true,
                state: "Performs a TransactWrite operation",
              });
              return {};
            },
            on: () => {},
          };
        },
        transactGet: (params) => {
          return {
            promise: async () => {
              printToScreen({
                params,
                entity: this,
                cache: true,
                state: "Performs a TransactGet operation",
              });
              return { Responses: [] };
            },
            on: () => {},
          };
        },
        createSet: (val) => val,
      },
    });
  }

  _demoParams(method, state, config) {
    try {
      const params = super[method](state, config);
      if (params && typeof params.catch === "function") {
        params.catch((err) => {
          console.log("param creation rejected: %o", err);
          printMessage("error", err.message);
        });
      }
      if (state.self !== "commit") {
        printToScreen({ params, state, entity: this, cache: true });
      }
      return params;
    } catch (err) {
      console.log("create params error: %o", err);
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
    const commit = clauses.commit.action;
    clauses.params.action = (entity, state, options) => {
      try {
        return params(entity, state, options);
      } catch (err) {
        printMessage("error", err.message);
      }
    };
    clauses.go.action = async (entity, state, options) => {
      try {
        return await go(entity, state, options);
      } catch (err) {
        printMessage("error", err.message);
      }
    };
    clauses.commit.action = (entity, state, options) => {
      try {
        return commit(entity, state, options);
      } catch (err) {
        printMessage("error", err.message);
      }
    };
    return super._makeChain(index, clauses, rootClause, options);
  }
}

class Service extends ElectroDB.Service {}

const createSchema = ElectroDB.createSchema;

const createCustomAttribute = ElectroDB.createCustomAttribute;

const CustomAttributeType = ElectroDB.CustomAttributeType;

window.ElectroDB = {
  Entity,
  Service,
  clearScreen,
  printMessage,
  printToScreen,
  createSchema,
  createCustomAttribute,
  CustomAttributeType,
};

},{"../index":1}],17:[function(require,module,exports){
const {
  QueryTypes,
  MethodTypes,
  ItemOperations,
  ExpressionTypes,
  TransactionCommitSymbol,
  TransactionOperations,
  TerminalOperation,
  KeyTypes,
  IndexTypes,
  UpsertOperations,
  ComparisonTypes,
} = require("./types");
const {
  AttributeOperationProxy,
  UpdateOperations,
  FilterOperationNames,
  UpdateOperationNames,
} = require("./operations");
const { UpdateExpression } = require("./update");
const { FilterExpression } = require("./where");
const v = require("./validations");
const e = require("./errors");
const u = require("./util");

const methodChildren = {
  upsert: [
    "upsertSet",
    "upsertAppend",
    "upsertAdd",
    "go",
    "params",
    "upsertSubtract",
    "commit",
    "upsertIfNotExists",
    "where",
  ],
  update: [
    "data",
    "set",
    "append",
    "add",
    "updateRemove",
    "updateDelete",
    "go",
    "params",
    "subtract",
    "commit",
    "composite",
    "ifNotExists",
    "where",
  ],
  put: ["where", "params", "go", "commit"],
  del: ["where", "params", "go", "commit"],
};

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
  } catch (err) {
    state.setError(err);
    return state;
  }
}

let clauses = {
  index: {
    name: "index",
    children: [
      "check",
      "get",
      "delete",
      "update",
      "query",
      "upsert",
      "put",
      "scan",
      "collection",
      "clusteredCollection",
      "create",
      "remove",
      "patch",
      "batchPut",
      "batchDelete",
      "batchGet",
    ],
  },
  clusteredCollection: {
    name: "clusteredCollection",
    action(
      entity,
      state,
      collection = "",
      facets /* istanbul ignore next */ = {},
    ) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        const { pk, sk } = state.getCompositeAttributes();
        return state
          .setType(QueryTypes.clustered_collection)
          .setMethod(MethodTypes.query)
          .setCollection(collection)
          .setPK(entity._expectFacets(facets, pk))
          .ifSK(() => {
            const { composites, unused } = state.identifyCompositeAttributes(
              facets,
              sk,
              pk,
            );
            state.setSK(composites);
            state.beforeBuildParams(({ options, state }) => {
              const accessPattern =
                entity.model.translations.indexes.fromIndexToAccessPattern[
                  state.query.index
                ];

              if (
                options.compare === ComparisonTypes.attributes ||
                options.compare === ComparisonTypes.v2
              ) {
                if (
                  !entity.model.indexes[accessPattern].sk.isFieldRef &&
                  sk.length > 1
                ) {
                  state.filterProperties(FilterOperationNames.eq, {
                    ...unused,
                    ...composites,
                  });
                }
              }
            });
          })
          .whenOptions(({ options, state }) => {
            if (!options.ignoreOwnership && !state.getParams()) {
              state.query.options.expressions.names = {
                ...state.query.options.expressions.names,
                ...state.query.options.identifiers.names,
              };
              state.query.options.expressions.values = {
                ...state.query.options.expressions.values,
                ...state.query.options.identifiers.values,
              };
              state.query.options.expressions.expression =
                state.query.options.expressions.expression.length > 1
                  ? `(${state.query.options.expressions.expression}) AND ${state.query.options.identifiers.expression}`
                  : `${state.query.options.identifiers.expression}`;
            }
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["between", "gte", "gt", "lte", "lt", "begins", "params", "go"],
  },
  collection: {
    name: "collection",
    /* istanbul ignore next */
    action(
      entity,
      state,
      collection = "",
      facets /* istanbul ignore next */ = {},
    ) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        const { pk, sk } = state.getCompositeAttributes();
        return state
          .setType(QueryTypes.collection)
          .setMethod(MethodTypes.query)
          .setCollection(collection)
          .setPK(entity._expectFacets(facets, pk))
          .whenOptions(({ options, state }) => {
            if (!options.ignoreOwnership && !state.getParams()) {
              state.query.options.expressions.names = {
                ...state.query.options.expressions.names,
                ...state.query.options.identifiers.names,
              };
              state.query.options.expressions.values = {
                ...state.query.options.expressions.values,
                ...state.query.options.identifiers.values,
              };
              state.query.options.expressions.expression =
                state.query.options.expressions.expression.length > 1
                  ? `(${state.query.options.expressions.expression}) AND ${state.query.options.identifiers.expression}`
                  : `${state.query.options.identifiers.expression}`;
            }
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["params", "go"],
  },
  scan: {
    name: "scan",
    action(entity, state, config) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        return state
          .setMethod(MethodTypes.scan)
          .whenOptions(({ state, options }) => {
            if (!options.ignoreOwnership && !state.getParams()) {
              state.unsafeApplyFilter(
                {},
                FilterOperationNames.eq,
                entity.identifiers.entity,
                entity.getName(),
              );
              state.unsafeApplyFilter(
                {},
                FilterOperationNames.eq,
                entity.identifiers.version,
                entity.getVersion(),
              );
            }
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["params", "go"],
  },
  get: {
    name: "get",
    /* istanbul ignore next */
    action(entity, state, facets = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        const { pk, sk } = state.getCompositeAttributes();
        const { composites } = state.identifyCompositeAttributes(
          facets,
          sk,
          pk,
        );
        return state
          .setMethod(MethodTypes.get)
          .setType(QueryTypes.eq)
          .setPK(entity._expectFacets(facets, pk))
          .ifSK(() => {
            entity._expectFacets(facets, sk);
            state.setSK(composites);
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["params", "go", "commit"],
  },
  check: {
    name: "check",
    action(...params) {
      return clauses.get.action(...params).setMethod(MethodTypes.check);
    },
    children: ["commit"],
  },
  batchGet: {
    name: "batchGet",
    action: (entity, state, payload) =>
      batchAction(
        clauses.get.action,
        MethodTypes.batchGet,
        entity,
        state,
        payload,
      ),
    children: ["params", "go"],
  },
  batchDelete: {
    name: "batchDelete",
    action: (entity, state, payload) =>
      batchAction(
        clauses.delete.action,
        MethodTypes.batchWrite,
        entity,
        state,
        payload,
      ),
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
        const { pk, sk } = state.getCompositeAttributes();
        const pkComposite = entity._expectFacets(facets, pk);
        state.addOption("_includeOnResponseItem", pkComposite);
        return state
          .setMethod(MethodTypes.delete)
          .setType(QueryTypes.eq)
          .setPK(pkComposite)
          .ifSK(() => {
            entity._expectFacets(facets, sk);
            const skComposite = state.buildQueryComposites(facets, sk);
            state.setSK(skComposite);
            state.addOption("_includeOnResponseItem", {
              ...skComposite,
              ...pkComposite,
            });
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["where", "params", "go", "commit"],
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
        const filter = state.query.filter[ExpressionTypes.ConditionExpression];
        const { pk, sk } = entity._getPrimaryIndexFieldNames();
        filter.unsafeSet({}, FilterOperationNames.exists, pk);
        if (sk) {
          filter.unsafeSet({}, FilterOperationNames.exists, sk);
        }
        const pkComposite = entity._expectFacets(facets, attributes.pk);
        state.addOption("_includeOnResponseItem", pkComposite);
        return state
          .setMethod(MethodTypes.delete)
          .setType(QueryTypes.eq)
          .setPK(pkComposite)
          .ifSK(() => {
            entity._expectFacets(facets, attributes.sk);
            const skComposite = state.buildQueryComposites(
              facets,
              attributes.sk,
            );
            state.setSK(skComposite);
            state.addOption("_includeOnResponseItem", {
              ...skComposite,
              ...pkComposite,
            });
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.del,
  },
  upsert: {
    name: "upsert",
    action(entity, state, payload = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        return state
          .setMethod(MethodTypes.upsert)
          .setType(QueryTypes.eq)
          .applyUpsert(UpsertOperations.set, payload)
          .beforeBuildParams(({ state }) => {
            const { upsert, update, updateProxy } = state.query;

            state.query.update.set(entity.identifiers.entity, entity.getName());
            state.query.update.set(
              entity.identifiers.version,
              entity.getVersion(),
            );

            // only "set" data is used to make keys
            const setData = {};
            const nonSetData = {};
            let allData = {};

            for (const name in upsert.data) {
              const { operation, value } = upsert.data[name];
              allData[name] = value;
              if (operation === UpsertOperations.set) {
                setData[name] = value;
              } else {
                nonSetData[name] = value;
              }
            }

            const upsertData = entity.model.schema.checkCreate({ ...allData });
            const attributes = state.getCompositeAttributes();
            const pkComposite = entity._expectFacets(upsertData, attributes.pk);

            state
              .addOption("_includeOnResponseItem", pkComposite)
              .setPK(pkComposite)
              .ifSK(() => {
                entity._expectFacets(upsertData, attributes.sk);
                const skComposite = entity._buildQueryFacets(
                  upsertData,
                  attributes.sk,
                );
                state.setSK(skComposite);
                state.addOption("_includeOnResponseItem", {
                  ...skComposite,
                  ...pkComposite,
                });
              });

            const appliedData = entity.model.schema.applyAttributeSetters({
              ...upsertData,
            });

            const onlySetAppliedData = {};
            const nonSetAppliedData = {};
            for (const name in appliedData) {
              const value = appliedData[name];
              const isSetOperation = setData[name] !== undefined;
              const cameFromApplyingSetters = allData[name] === undefined;
              const isNotUndefined = appliedData[name] !== undefined;
              const applyAsSet = isSetOperation || cameFromApplyingSetters;
              if (applyAsSet && isNotUndefined) {
                onlySetAppliedData[name] = value;
              } else {
                nonSetAppliedData[name] = value;
              }
            }

            // we build this above, and set them to state, but use it here, not ideal but
            // the way it worked out so that this could be wrapped in beforeBuildParams
            const { pk } = state.query.keys;
            const sk = state.query.keys.sk[0];

            const {
              updatedKeys,
              setAttributes,
              indexKey,
              deletedKeys = [],
            } = entity._getPutKeys(pk, sk && sk.facets, onlySetAppliedData);

            for (const deletedKey of deletedKeys) {
              state.query.update.remove(deletedKey);
            }

            // calculated here but needs to be used when building the params
            upsert.indexKey = indexKey;

            // only "set" data is used to make keys
            const setFields = Object.entries(
              entity.model.schema.translateToFields(setAttributes),
            );

            // add the keys impacted except for the table index keys; they are upserted
            // automatically by dynamo
            for (const key in updatedKeys) {
              const value = updatedKeys[key];
              if (indexKey[key] === undefined) {
                setFields.push([key, value]);
              }
            }

            entity._maybeApplyUpsertUpdate({
              fields: setFields,
              operation: UpsertOperations.set,
              updateProxy,
              update,
            });

            for (const name in nonSetData) {
              const value = appliedData[name];
              if (value === undefined || upsert.data[name] === undefined) {
                continue;
              }

              const { operation } = upsert.data[name];
              const fields = entity.model.schema.translateToFields({
                [name]: value,
              });
              entity._maybeApplyUpsertUpdate({
                fields: Object.entries(fields),
                updateProxy,
                operation,
                update,
              });
            }
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.upsert,
  },
  put: {
    name: "put",
    /* istanbul ignore next */
    action(entity, state, payload = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        let record = entity.model.schema.checkCreate({ ...payload });
        const attributes = state.getCompositeAttributes();
        return state
          .setMethod(MethodTypes.put)
          .setType(QueryTypes.eq)
          .applyPut(record)
          .setPK(entity._expectFacets(record, attributes.pk))
          .ifSK(() => {
            entity._expectFacets(record, attributes.sk);
            state.setSK(state.buildQueryComposites(record, attributes.sk));
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.put,
  },
  batchPut: {
    name: "batchPut",
    action: (entity, state, payload) =>
      batchAction(
        clauses.put.action,
        MethodTypes.batchWrite,
        entity,
        state,
        payload,
      ),
    children: ["params", "go"],
  },
  create: {
    name: "create",
    action(entity, state, payload) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        let record = entity.model.schema.checkCreate({ ...payload });
        const attributes = state.getCompositeAttributes();
        const filter = state.query.filter[ExpressionTypes.ConditionExpression];
        const { pk, sk } = entity._getPrimaryIndexFieldNames();
        filter.unsafeSet({}, FilterOperationNames.notExists, pk);
        if (sk) {
          filter.unsafeSet({}, FilterOperationNames.notExists, sk);
        }
        return state
          .setMethod(MethodTypes.put)
          .setType(QueryTypes.eq)
          .applyPut(record)
          .setPK(entity._expectFacets(record, attributes.pk))
          .ifSK(() => {
            entity._expectFacets(record, attributes.sk);
            state.setSK(state.buildQueryComposites(record, attributes.sk));
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.put,
  },
  patch: {
    name: "patch",
    action(entity, state, facets) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        const attributes = state.getCompositeAttributes();
        const filter = state.query.filter[ExpressionTypes.ConditionExpression];
        const { pk, sk } = entity._getPrimaryIndexFieldNames();
        filter.unsafeSet({}, FilterOperationNames.exists, pk);
        if (sk) {
          filter.unsafeSet({}, FilterOperationNames.exists, sk);
        }
        const pkComposite = entity._expectFacets(facets, attributes.pk);
        state.addOption("_includeOnResponseItem", pkComposite);
        return state
          .setMethod(MethodTypes.update)
          .setType(QueryTypes.eq)
          .setPK(pkComposite)
          .ifSK(() => {
            entity._expectFacets(facets, attributes.sk);
            const skComposite = state.buildQueryComposites(
              facets,
              attributes.sk,
            );
            state.setSK(skComposite);
            state.addOption("_includeOnResponseItem", {
              ...skComposite,
              ...pkComposite,
            });
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.update,
  },
  update: {
    name: "update",
    action(entity, state, facets) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        const attributes = state.getCompositeAttributes();
        const pkComposite = entity._expectFacets(facets, attributes.pk);
        state.addOption("_includeOnResponseItem", pkComposite);
        return state
          .setMethod(MethodTypes.update)
          .setType(QueryTypes.eq)
          .setPK(pkComposite)
          .ifSK(() => {
            entity._expectFacets(facets, attributes.sk);
            const skComposite = state.buildQueryComposites(
              facets,
              attributes.sk,
            );
            state.setSK(skComposite);
            state.addOption("_includeOnResponseItem", {
              ...pkComposite,
              ...skComposite,
            });
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.update,
  },
  data: {
    name: "data",
    action(entity, state, cb) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        state.query.updateProxy.invokeCallback(cb);
        for (const path of Object.keys(state.query.update.refs)) {
          const operation = state.query.update.impacted[path];
          const attribute = state.query.update.refs[path];
          // note: keyValue will be empty if the user used `name`/`value` operations
          // because it becomes hard to know how they are used and which attribute
          // should validate the change. This is an edge case however, this change
          // still improves on the existing implementation.
          const keyValue = state.query.update.paths[path] || {};
          if (!attribute) {
            throw new e.ElectroAttributeValidationError(
              path,
              `Attribute "${path}" does not exist on model.`,
            );
          }

          entity.model.schema.checkOperation(
            attribute,
            operation,
            keyValue.value,
          );
        }
        return state;
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.update,
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
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.update,
  },
  upsertSet: {
    name: "set",
    action(entity, state, data) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        entity.model.schema.checkUpdate(data, { allowReadOnly: true });
        state.query.upsert.addData(UpsertOperations.set, data);
        return state;
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.upsert,
  },
  composite: {
    name: "composite",
    action(entity, state, composites = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        for (const attrName in composites) {
          // todo: validate attrName is facet
          if (entity.model.facets.byAttr[attrName]) {
            const wasSet = state.query.update.addComposite(
              attrName,
              composites[attrName],
            );
            if (!wasSet) {
              throw new e.ElectroError(
                e.ErrorCodes.DuplicateUpdateCompositesProvided,
                `The composite attribute ${attrName} has been provided more than once with different values. Remove the duplication before running again`,
              );
            }
            state.applyCondition(
              FilterOperationNames.eq,
              attrName,
              composites[attrName],
            );
          }
        }
        return state;
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.update,
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
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.update,
  },
  ifNotExists: {
    name: "ifNotExists",
    action(entity, state, data = {}) {
      entity.model.schema.checkUpdate(data);
      state.query.updateProxy.fromObject(ItemOperations.ifNotExists, data);
      return state;
    },
    children: methodChildren.update,
  },
  upsertIfNotExists: {
    name: "ifNotExists",
    action(entity, state, data = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        entity.model.schema.checkUpdate(data, { allowReadOnly: true });
        state.query.upsert.addData(UpsertOperations.ifNotExists, data);
        return state;
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.upsert,
  },
  upsertAppend: {
    name: "append",
    action(entity, state, data = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        entity.model.schema.checkUpdate(data, { allowReadOnly: true });
        state.query.upsert.addData(UpsertOperations.append, data);
        return state;
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.upsert,
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
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.update,
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
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.update,
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
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.update,
  },
  upsertAdd: {
    name: "add",
    action(entity, state, data) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        entity.model.schema.checkUpdate(data, { allowReadOnly: true });
        state.query.upsert.addData(UpsertOperations.add, data);
        return state;
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.upsert,
  },
  upsertSubtract: {
    name: "subtract",
    action(entity, state, data) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        entity.model.schema.checkUpdate(data, { allowReadOnly: true });
        state.query.upsert.addData(UpsertOperations.subtract, data);
        return state;
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.upsert,
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
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: methodChildren.update,
  },
  query: {
    name: "query",
    action(entity, state, facets, options = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        state.addOption("_isPagination", true);
        const { pk, sk } = state.getCompositeAttributes();
        return state
          .setMethod(MethodTypes.query)
          .setType(QueryTypes.is)
          .setPK(entity._expectFacets(facets, pk))
          .ifSK(() => {
            const { composites, unused } = state.identifyCompositeAttributes(
              facets,
              sk,
              pk,
            );
            state.setSK(state.buildQueryComposites(facets, sk));

            state.whenOptions(({ options, state }) => {
              if (
                options.compare === ComparisonTypes.attributes ||
                options.compare === ComparisonTypes.v2
              ) {
                if (sk.length > 1) {
                  state.filterProperties(FilterOperationNames.eq, {
                    ...unused,
                    ...composites,
                  });
                }
              }

              if (
                state.query.options.indexType === IndexTypes.clustered &&
                Object.keys(composites).length < sk.length &&
                !options.ignoreOwnership &&
                !state.getParams()
              ) {
                state
                  .unsafeApplyFilter(
                    {},
                    FilterOperationNames.eq,
                    entity.identifiers.entity,
                    entity.getName(),
                  )
                  .unsafeApplyFilter(
                    {},
                    FilterOperationNames.eq,
                    entity.identifiers.version,
                    entity.getVersion(),
                  );
              }
            });
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["between", "gte", "gt", "lte", "lt", "begins", "params", "go"],
  },
  between: {
    name: "between",
    action(entity, state, startingFacets = {}, endingFacets = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        const { pk, sk } = state.getCompositeAttributes();
        const endingSk = state.identifyCompositeAttributes(
          endingFacets,
          sk,
          pk,
        );
        const startingSk = state.identifyCompositeAttributes(
          startingFacets,
          sk,
          pk,
        );

        const accessPattern =
          entity.model.translations.indexes.fromIndexToAccessPattern[
            state.query.index
          ];

        return state
          .setType(QueryTypes.and)
          .setSK(endingSk.composites)
          .setType(QueryTypes.between)
          .setSK(startingSk.composites)
          .beforeBuildParams(({ options, state }) => {
            if (
              options.compare === ComparisonTypes.attributes ||
              options.compare === ComparisonTypes.v2
            ) {
              if (!entity.model.indexes[accessPattern].sk.isFieldRef) {
                state.filterProperties(
                  FilterOperationNames.lte,
                  endingSk.composites,
                  { asPrefix: true },
                );
              }
              if (options.compare === ComparisonTypes.attributes) {
                if (!entity.model.indexes[accessPattern].sk.isFieldRef) {
                  state.filterProperties(
                    FilterOperationNames.gte,
                    startingSk.composites,
                    { asPrefix: true },
                  );
                }
              }
            }
          });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["go", "params"],
  },
  begins: {
    name: "begins",
    action(entity, state, facets = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        return state.setType(QueryTypes.begins).ifSK((state) => {
          const attributes = state.getCompositeAttributes();
          state.setSK(state.buildQueryComposites(facets, attributes.sk));
        });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["go", "params"],
  },
  gt: {
    name: "gt",
    action(entity, state, facets = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        return state.setType(QueryTypes.gt).ifSK((state) => {
          const { pk, sk } = state.getCompositeAttributes();
          const { composites } = state.identifyCompositeAttributes(
            facets,
            sk,
            pk,
          );
          state.setSK(composites);
          state.beforeBuildParams(({ options, state }) => {
            if (
              options.compare === ComparisonTypes.attributes ||
              options.compare === ComparisonTypes.v2
            ) {
              const accessPattern =
                entity.model.translations.indexes.fromIndexToAccessPattern[
                  state.query.index
                ];

              if (!entity.model.indexes[accessPattern].sk.isFieldRef) {
                state.filterProperties(FilterOperationNames.gt, composites, {
                  asPrefix: true,
                });
              }
            }
          });
        });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["go", "params"],
  },
  gte: {
    name: "gte",
    action(entity, state, facets = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        return state.setType(QueryTypes.gte).ifSK((state) => {
          const attributes = state.getCompositeAttributes();
          state.setSK(state.buildQueryComposites(facets, attributes.sk));
          state.beforeBuildParams(({ options, state }) => {
            const { composites } = state.identifyCompositeAttributes(
              facets,
              attributes.sk,
              attributes.pk,
            );
            if (options.compare === ComparisonTypes.attributes) {
              const accessPattern =
                entity.model.translations.indexes.fromIndexToAccessPattern[
                  state.query.index
                ];
              if (
                !entity.model.indexes[accessPattern].sk.isFieldRef &&
                attributes.sk.length > 1
              ) {
                state.filterProperties(FilterOperationNames.gte, composites, {
                  asPrefix: true,
                });
              }
            }
          });
        });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["go", "params"],
  },
  lt: {
    name: "lt",
    action(entity, state, facets = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        return state.setType(QueryTypes.lt).ifSK((state) => {
          const { pk, sk } = state.getCompositeAttributes();
          const { composites } = state.identifyCompositeAttributes(
            facets,
            sk,
            pk,
          );
          state.setSK(composites);
          state.beforeBuildParams(({ options, state }) => {
            if (options.compare === ComparisonTypes.attributes) {
              const accessPattern =
                entity.model.translations.indexes.fromIndexToAccessPattern[
                  state.query.index
                ];
              if (!entity.model.indexes[accessPattern].sk.isFieldRef) {
                state.filterProperties(FilterOperationNames.lt, composites, {
                  asPrefix: true,
                });
              }
            }
          });
        });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["go", "params"],
  },
  lte: {
    name: "lte",
    action(entity, state, facets = {}) {
      if (state.getError() !== null) {
        return state;
      }
      try {
        return state.setType(QueryTypes.lte).ifSK((state) => {
          const { pk, sk } = state.getCompositeAttributes();
          const { composites } = state.identifyCompositeAttributes(
            facets,
            sk,
            pk,
          );
          state.setSK(composites);

          state.beforeBuildParams(({ options, state }) => {
            if (
              options.compare === ComparisonTypes.attributes ||
              options.compare === ComparisonTypes.v2
            ) {
              const accessPattern =
                entity.model.translations.indexes.fromIndexToAccessPattern[
                  state.query.index
                ];
              if (!entity.model.indexes[accessPattern].sk.isFieldRef) {
                state.filterProperties(FilterOperationNames.lte, composites, {
                  asPrefix: true,
                });
              }
            }
          });
        });
      } catch (err) {
        state.setError(err);
        return state;
      }
    },
    children: ["go", "params"],
  },
  commit: {
    name: "commit",
    action(entity, state, options) {
      if (state.getError() !== null) {
        throw state.error;
      }

      const results = clauses.params.action(entity, state, {
        ...options,
        _returnOptions: true,
        _isTransaction: true,
      });

      const method = TransactionOperations[state.query.method];
      if (!method) {
        throw new Error("Invalid commit method");
      }

      return {
        [method]: results.params,
        [TransactionCommitSymbol]: () => {
          return {
            entity,
          };
        },
      };
    },
    children: [],
  },
  params: {
    name: "params",
    action(entity, state, options = {}) {
      if (state.getError() !== null) {
        throw state.error;
      }
      try {
        if (
          !v.isStringHasLength(options.table) &&
          !v.isStringHasLength(entity.getTableName())
        ) {
          throw new e.ElectroError(
            e.ErrorCodes.MissingTable,
            `Table name not defined. Table names must be either defined on the model, instance configuration, or as a query option.`,
          );
        }
        const method = state.getMethod();
        const normalizedOptions = entity._normalizeExecutionOptions({
          provided: [state.getOptions(), state.query.options, options],
          context: {
            operation: options._isTransaction
              ? MethodTypes.transactWrite
              : undefined,
          },
        });

        state.applyWithOptions(normalizedOptions);
        state.applyBeforeBuildParams(normalizedOptions);

        let results;
        switch (method) {
          case MethodTypes.query: {
            results = entity._queryParams(state, normalizedOptions);
            break;
          }
          case MethodTypes.batchWrite: {
            results = entity._batchWriteParams(state, normalizedOptions);
            break;
          }
          case MethodTypes.batchGet: {
            results = entity._batchGetParams(state, normalizedOptions);
            break;
          }
          default: {
            results = entity._params(state, normalizedOptions);
            break;
          }
        }

        if (
          method === MethodTypes.update &&
          results.ExpressionAttributeValues &&
          Object.keys(results.ExpressionAttributeValues).length === 0
        ) {
          // An update that only does a `remove` operation would result in an empty object
          // todo: change the getValues() method to return undefined in this case (would potentially require a more generous refactor)
          delete results.ExpressionAttributeValues;
        }

        if (options._returnOptions) {
          results = {
            params: results,
            options: normalizedOptions,
          };
        }

        state.setParams(results);

        return results;
      } catch (err) {
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
          throw new e.ElectroError(
            e.ErrorCodes.NoClientDefined,
            "No client defined on model",
          );
        }
        options.terminalOperation = TerminalOperation.go;
        const paramResults = clauses.params.action(entity, state, {
          ...options,
          _returnOptions: true,
        });
        return entity.go(
          state.getMethod(),
          paramResults.params,
          paramResults.options,
        );
      } catch (err) {
        return Promise.reject(err);
      }
    },
    children: [],
  },
};

class ChainState {
  constructor({
    index = "",
    compositeAttributes = {},
    attributes = {},
    hasSortKey = false,
    options = {},
    parentState = null,
  } = {}) {
    const update = new UpdateExpression({ prefix: "_u" });
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
      upsert: {
        data: {},
        indexKey: null,
        addData(operation = UpsertOperations.set, data = {}) {
          for (const name of Object.keys(data)) {
            const value = data[name];
            this.data[name] = {
              operation,
              value,
            };
          }
        },
        getData(operationFilter) {
          const results = {};
          for (const name in this.data) {
            const { operation, value } = this.data[name];
            if (!operationFilter || operationFilter === operation) {
              results[name] = value;
            }
          }

          return results;
        },
      },
      keys: {
        provided: [],
        pk: {},
        sk: [],
      },
      filter: {
        [ExpressionTypes.ConditionExpression]: new FilterExpression(),
        [ExpressionTypes.FilterExpression]: new FilterExpression(),
      },
      options,
    };
    this.subStates = [];
    this.hasSortKey = hasSortKey;
    this.prev = null;
    this.self = null;
    this.params = null;
    this.applyAfterOptions = [];
    this.beforeBuildParamsOperations = [];
    this.beforeBuildParamsHasRan = false;
  }

  getParams() {
    return this.params;
  }

  setParams(params) {
    if (params) {
      this.params = params;
    }
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

  addOption(key, value) {
    this.query.options[key] = value;
    return this;
  }

  _appendProvided(type, attributes) {
    const newAttributes = Object.keys(attributes).map((attribute) => {
      return {
        type,
        attribute,
      };
    });
    return u.getUnique(this.query.keys.provided, newAttributes);
  }

  setPK(attributes) {
    this.query.keys.pk = attributes;
    this.query.keys.provided = this._appendProvided(KeyTypes.pk, attributes);

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

  buildQueryComposites(provided, definition) {
    return definition
      .map((name) => [name, provided[name]])
      .reduce((result, [name, value]) => {
        if (value !== undefined) {
          result[name] = value;
        }
        return result;
      }, {});
  }

  identifyCompositeAttributes(provided, defined, skip) {
    // todo: make sure attributes are valid
    const composites = {};
    const unused = {};
    const definedSet = new Set(defined || []);
    const skipSet = new Set(skip || []);
    for (const key of Object.keys(provided)) {
      const value = provided[key];
      if (definedSet.has(key)) {
        composites[key] = value;
      } else if (skipSet.has(key)) {
        continue;
      } else {
        unused[key] = value;
      }
    }

    return {
      composites,
      unused,
    };
  }

  applyFilter(operation, name, values, filterOptions) {
    if (
      FilterOperationNames[operation] !== undefined &&
      name !== undefined &&
      values !== undefined
    ) {
      const attribute = this.attributes[name];
      if (attribute !== undefined) {
        this.unsafeApplyFilter(
          filterOptions,
          operation,
          attribute.field,
          values,
        );
      }
    }
    return this;
  }

  applyCondition(operation, name, ...values) {
    if (
      FilterOperationNames[operation] !== undefined &&
      name !== undefined &&
      values.length > 0
    ) {
      const attribute = this.attributes[name];
      if (attribute !== undefined) {
        const filter = this.query.filter[ExpressionTypes.ConditionExpression];
        filter.unsafeSet({}, operation, attribute.field, ...values);
      }
    }
    return this;
  }

  unsafeApplyFilter(filterOptions = {}, operation, name, values) {
    if (
      (FilterOperationNames[operation] !== undefined) & (name !== undefined) &&
      values !== undefined
    ) {
      const filter = this.query.filter[ExpressionTypes.FilterExpression];
      filter.unsafeSet(filterOptions, operation, name, values);
    }
    return this;
  }

  filterProperties(operation, obj = {}, filterOptions = {}) {
    for (const property in obj) {
      const value = obj[property];
      if (value !== undefined) {
        this.applyFilter(operation, property, value, filterOptions);
      }
    }
    return this;
  }

  setSK(attributes, type = this.query.type) {
    if (this.hasSortKey) {
      this.query.keys.sk.push({
        type: type,
        facets: attributes,
      });
      this.query.keys.provided = this._appendProvided(KeyTypes.sk, attributes);
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
      compositeAttributes: this.query.facets,
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

  applyUpsert(operation = UpsertOperations.set, data = {}) {
    this.query.upsert.addData(operation, data);
    return this;
  }

  applyPut(data = {}) {
    this.query.put.data = { ...this.query.put.data, ...data };
    return this;
  }

  whenOptions(fn) {
    if (v.isFunction(fn)) {
      this.applyAfterOptions.push((options) => {
        fn({ options, state: this });
      });
    }

    return this;
  }

  // these are ran before "beforeBuildParams"
  applyWithOptions(options = {}) {
    this.applyAfterOptions.forEach((fn) => fn(options));
  }

  beforeBuildParams(fn) {
    if (v.isFunction(fn)) {
      this.beforeBuildParamsOperations.push((options) => {
        fn({ options, state: this });
      });
    }
    return this;
  }

  applyBeforeBuildParams(options = {}) {
    if (!this.beforeBuildParamsHasRan) {
      this.beforeBuildParamsHasRan = true;
      this.beforeBuildParamsOperations.forEach((fn) => fn(options));
    }
  }
}

module.exports = {
  clauses,
  ChainState,
};

},{"./errors":21,"./operations":25,"./types":30,"./update":31,"./util":33,"./validations":34,"./where":35}],18:[function(require,module,exports){
const lib = {}
const util = {}
const { isFunction } = require("./validations");
const { ElectroError, ErrorCodes } = require("./errors");
const DocumentClientVersions = {
  v2: "v2",
  v3: "v3",
  electro: "electro",
};
const unmarshallItem = (value) => {
  const unmarshall = util.unmarshall || ((val) => val);
  try {
    value.Item = unmarshall(value.Item);
  } catch (err) {
    console.error("Internal Error: Failed to unmarshal input", err);
  }

  return value;
};

const v3Methods = ["send"];
const v2Methods = [
  "get",
  "put",
  "update",
  "delete",
  "batchWrite",
  "batchGet",
  "scan",
  "query",
  "createSet",
  "transactWrite",
  "transactGet",
];
const supportedClientVersions = {
  [DocumentClientVersions.v2]: v2Methods,
  [DocumentClientVersions.v3]: v3Methods,
};

class DocumentClientV2Wrapper {
  static init(client) {
    return new DocumentClientV2Wrapper(client, lib);
  }

  constructor(client, lib) {
    this.client = client;
    this.lib = lib;
    this.__v = "v2";
  }

  get(params) {
    return this.client.get(params);
  }

  put(params) {
    return this.client.put(params);
  }

  update(params) {
    return this.client.update(params);
  }

  delete(params) {
    return this.client.delete(params);
  }

  batchWrite(params) {
    return this.client.batchWrite(params);
  }

  batchGet(params) {
    return this.client.batchGet(params);
  }

  scan(params) {
    return this.client.scan(params);
  }

  query(params) {
    return this.client.query(params);
  }

  _transact(transactionRequest) {
    let cancellationReasons;
    transactionRequest.on("extractError", (response) => {
      try {
        cancellationReasons = JSON.parse(
          response.httpResponse.body.toString(),
        ).CancellationReasons;
      } catch (err) {}
    });

    return {
      async promise() {
        return transactionRequest.promise().catch((err) => {
          if (err) {
            if (Array.isArray(cancellationReasons)) {
              return {
                canceled: cancellationReasons.map((reason) => {
                  if (reason.Item) {
                    return unmarshallItem(reason);
                  }
                  return reason;
                }),
              };
            }
            throw err;
          }
        });
      },
    };
  }

  transactWrite(params) {
    const transactionRequest = this.client.transactWrite(params);
    return this._transact(transactionRequest);
  }

  transactGet(params) {
    const transactionRequest = this.client.transactGet(params);
    return this._transact(transactionRequest);
  }

  createSet(value, ...rest) {
    if (Array.isArray(value)) {
      return this.client.createSet(value, ...rest);
    } else {
      return this.client.createSet([value], ...rest);
    }
  }
}

class DocumentClientV3Wrapper {
  static init(client) {
    return new DocumentClientV3Wrapper(client, lib);
  }

  constructor(client, lib) {
    this.client = client;
    this.lib = lib;
    this.__v = "v3";
  }

  promiseWrap(fn) {
    return {
      promise: async () => {
        return fn();
      },
    };
  }

  get(params) {
    return this.promiseWrap(() => {
      const command = new this.lib.GetCommand(params);
      return this.client.send(command);
    });
  }
  put(params) {
    return this.promiseWrap(() => {
      const command = new this.lib.PutCommand(params);
      return this.client.send(command);
    });
  }
  update(params) {
    return this.promiseWrap(() => {
      const command = new this.lib.UpdateCommand(params);
      return this.client.send(command);
    });
  }
  delete(params) {
    return this.promiseWrap(async () => {
      const command = new this.lib.DeleteCommand(params);
      return this.client.send(command);
    });
  }
  batchWrite(params) {
    return this.promiseWrap(async () => {
      const command = new this.lib.BatchWriteCommand(params);
      return this.client.send(command);
    });
  }
  batchGet(params) {
    return this.promiseWrap(async () => {
      const command = new this.lib.BatchGetCommand(params);
      return this.client.send(command);
    });
  }
  scan(params) {
    return this.promiseWrap(async () => {
      const command = new this.lib.ScanCommand(params);
      return this.client.send(command);
    });
  }
  query(params) {
    return this.promiseWrap(async () => {
      const command = new this.lib.QueryCommand(params);
      return this.client.send(command);
    });
  }

  transactWrite(params) {
    return this.promiseWrap(async () => {
      const command = new this.lib.TransactWriteCommand(params);
      return this.client
        .send(command)
        .then((result) => {
          return result;
        })
        .catch((err) => {
          if (err.CancellationReasons) {
            return {
              canceled: err.CancellationReasons.map((reason) => {
                if (reason.Item) {
                  return unmarshallItem(reason);
                }
                return reason;
              }),
            };
          }
          throw err;
        });
    });
  }
  transactGet(params) {
    return this.promiseWrap(async () => {
      const command = new this.lib.TransactGetCommand(params);
      return this.client
        .send(command)
        .then((result) => {
          return result;
        })
        .catch((err) => {
          if (err.CancellationReasons) {
            return {
              canceled: err.CancellationReasons.map((reason) => {
                if (reason.Item) {
                  return unmarshallItem(reason);
                }
                return reason;
              }),
            };
          }
          throw err;
        });
    });
  }
  createSet(value) {
    if (Array.isArray(value)) {
      return new Set(value);
    } else {
      return new Set([value]);
    }
  }
}

function identifyClientVersion(client = {}) {
  if (
    client instanceof DocumentClientV3Wrapper ||
    client instanceof DocumentClientV2Wrapper
  ) {
    return DocumentClientVersions.electro;
  }
  for (const [version, methods] of Object.entries(supportedClientVersions)) {
    const hasMethods = methods.every((method) => {
      return method in client && isFunction(client[method]);
    });
    if (hasMethods) {
      return version;
    }
  }
}

function normalizeClient(client) {
  if (client === undefined) return client;
  const version = identifyClientVersion(client);
  switch (version) {
    case DocumentClientVersions.v3:
      return DocumentClientV3Wrapper.init(client);
    case DocumentClientVersions.v2:
      return DocumentClientV2Wrapper.init(client);
    case DocumentClientVersions.electro:
      return client;
    default:
      throw new ElectroError(
        ErrorCodes.InvalidClientProvided,
        "Invalid DynamoDB Document Client provided. ElectroDB supports the v2 and v3 DynamoDB Document Clients from the aws-sdk",
      );
  }
}

function normalizeConfig(config = {}) {
  return {
    ...config,
    client: normalizeClient(config.client),
  };
}

module.exports = {
  util,
  v2Methods,
  v3Methods,
  normalizeClient,
  normalizeConfig,
  identifyClientVersion,
  DocumentClientVersions,
  supportedClientVersions,
  DocumentClientV3Wrapper,
  DocumentClientV2Wrapper,
};

},{"./errors":21,"./validations":34}],19:[function(require,module,exports){
function createConversions(entity) {
  const conversions = {
    fromComposite: {
      toKeys: (composite, options = {}) =>
        entity._fromCompositeToKeys({ provided: composite }, options),
      toCursor: (composite) =>
        entity._fromCompositeToCursor(
          { provided: composite },
          { strict: "all" },
        ),
    },
    fromKeys: {
      toCursor: (keys) => entity._fromKeysToCursor({ provided: keys }, {}),
      toComposite: (keys) => entity._fromKeysToComposite({ provided: keys }),
    },
    fromCursor: {
      toKeys: (cursor) => entity._fromCursorToKeys({ provided: cursor }),
      toComposite: (cursor) =>
        entity._fromCursorToComposite({ provided: cursor }),
    },
    byAccessPattern: {},
  };

  for (let accessPattern in entity.model.indexes) {
    let index = entity.model.indexes[accessPattern].index;
    conversions.byAccessPattern[accessPattern] = {
      fromKeys: {
        toCursor: (keys) =>
          entity._fromKeysToCursorByIndex({ indexName: index, provided: keys }),
        toComposite: (keys) =>
          entity._fromKeysToCompositeByIndex({
            indexName: index,
            provided: keys,
          }),
      },
      fromCursor: {
        toKeys: (cursor) =>
          entity._fromCursorToKeysByIndex({
            indexName: index,
            provided: cursor,
          }),
        toComposite: (cursor) =>
          entity._fromCursorToCompositeByIndex({
            indexName: index,
            provided: cursor,
          }),
      },
      fromComposite: {
        toCursor: (composite) =>
          entity._fromCompositeToCursorByIndex(
            { indexName: index, provided: composite },
            { strict: "all" },
          ),
        toKeys: (composite, options = {}) =>
          entity._fromCompositeToKeysByIndex(
            { indexName: index, provided: composite },
            options,
          ),
      },
    };
  }

  return conversions;
}

module.exports = {
  createConversions,
};

},{}],20:[function(require,module,exports){
"use strict";
const { Schema } = require("./schema");
const {
  AllPages,
  KeyCasing,
  TableIndex,
  FormatToReturnValues,
  ReturnValues,
  EntityVersions,
  ItemOperations,
  UnprocessedTypes,
  Pager,
  ElectroInstance,
  KeyTypes,
  QueryTypes,
  MethodTypes,
  Comparisons,
  ExpressionTypes,
  ModelVersions,
  ElectroInstanceTypes,
  MaxBatchItems,
  TerminalOperation,
  ResultOrderOption,
  ResultOrderParam,
  IndexTypes,
  KeyAttributesComparisons,
  MethodTypeTranslation,
  TransactionCommitSymbol,
  CastKeyOptions,
  ComparisonTypes,
  DataOptions,
} = require("./types");
const { FilterFactory } = require("./filters");
const { FilterOperations } = require("./operations");
const { WhereFactory } = require("./where");
const { clauses, ChainState } = require("./clauses");
const { EventManager } = require("./events");
const validations = require("./validations");
const c = require("./client");
const u = require("./util");
const e = require("./errors");
const v = require("./validations");

const ImpactedIndexTypeSource = {
  composite: "composite",
  provided: "provided",
};

class Entity {
  constructor(model, config = {}) {
    config = c.normalizeConfig(config);
    this.eventManager = new EventManager({
      listeners: config.listeners,
    });
    this.eventManager.add(config.logger);
    this._validateModel(model);
    this.version = EntityVersions.v1;
    this.config = config;
    this.client = config.client;
    this.model = this._parseModel(model, config);
    /** start beta/v1 condition **/
    this.config.table = config.table || model.table;
    /** end beta/v1 condition **/
    this._filterBuilder = new FilterFactory(
      this.model.schema.attributes,
      FilterOperations,
    );
    this._whereBuilder = new WhereFactory(
      this.model.schema.attributes,
      FilterOperations,
    );
    this._clausesWithFilters = this._filterBuilder.injectFilterClauses(
      clauses,
      this.model.filters,
    );
    this._clausesWithFilters = this._whereBuilder.injectWhereClauses(
      this._clausesWithFilters,
    );

    this.query = {};
    for (let accessPattern in this.model.indexes) {
      let index = this.model.indexes[accessPattern].index;
      this.query[accessPattern] = (...values) => {
        const options = {
          indexType:
            this.model.indexes[accessPattern].type || IndexTypes.isolated,
        };
        return this._makeChain(
          index,
          this._clausesWithFilters,
          clauses.index,
          options,
        ).query(...values);
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

  get scan() {
    return this._makeChain(
      TableIndex,
      this._clausesWithFilters,
      clauses.index,
      { _isPagination: true },
    ).scan();
  }

  setIdentifier(type = "", identifier = "") {
    if (!this.identifiers[type]) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidIdentifier,
        `Invalid identifier type: "${type}". Valid identifiers include: ${u.commaSeparatedString(
          Object.keys(this.identifiers),
        )}`,
      );
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
    );
  }

  _attributesIncludeKeys(attributes = []) {
    let { pk, sk } = this.model.prefixes[TableIndex];
    let pkFound = false;
    let skFound = false;
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      if (attribute === sk.field) {
        skFound = true;
      }
      if (attribute === pk.field) {
        skFound = true;
      }
      if (pkFound && skFound) {
        return true;
      }
    }
    return false;
  }

  ownsKeys(key = {}) {
    let { pk, sk } = this.model.prefixes[TableIndex];
    let hasSK = this.model.lookup.indexHasSortKeys[TableIndex];
    const typeofPkProvided = typeof key[pk.field];
    const pkPrefixMatch =
      typeofPkProvided === "string" && key[pk.field].startsWith(pk.prefix);
    const isNumericPk = typeofPkProvided === "number" && pk.cast === "number";
    let pkMatch = pkPrefixMatch || isNumericPk;
    let skMatch = pkMatch && !hasSK;
    if (pkMatch && hasSK) {
      const typeofSkProvided = typeof key[sk.field];
      const skPrefixMatch =
        typeofSkProvided === "string" && key[sk.field].startsWith(sk.prefix);
      const isNumericSk = typeofSkProvided === "number" && sk.cast === "number";
      skMatch = skPrefixMatch || isNumericSk;
    }

    return (
      pkMatch && skMatch && this._formatKeysToItem(TableIndex, key) !== null
    );
  }

  ownsCursor(cursor) {
    if (typeof cursor === "string") {
      cursor = u.cursorFormatter.deserialize(cursor);
    }
    return this.ownsKeys(cursor);
  }

  serializeCursor(key) {
    return u.cursorFormatter.serialize(key);
  }

  deserializeCursor(cursor) {
    return u.cursorFormatter.deserialize(cursor);
  }

  /** @depricated pagers no longer exist, use the new cursor api */
  ownsPager(pager, index = TableIndex) {
    if (pager === null) {
      return false;
    }
    let tableIndexFacets = this.model.facets.byIndex[index];
    // todo: is the fact it doesn't use the provided index a bug?
    // feels like collections may have played a roll into why this is this way
    let indexFacets = this.model.facets.byIndex[index];

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
    const options = { _isPagination: true };
    const match = this._findBestIndexKeyMatch(facets);
    if (match.shouldScan) {
      return this._makeChain(
        TableIndex,
        this._clausesWithFilters,
        clauses.index,
        options,
      )
        .scan()
        .filter((attr) => {
          let eqFilters = [];
          for (let facet of Object.keys(facets)) {
            if (attr[facet] !== undefined && facets[facet] !== undefined) {
              eqFilters.push(attr[facet].eq(facets[facet]));
            }
          }
          return eqFilters.join(" AND ");
        });
    } else {
      return this._makeChain(
        match.index,
        this._clausesWithFilters,
        clauses.index,
        options,
      )
        .query(facets)
        .filter((attr) => {
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
    const options = { _isPagination: true };
    const match = this._findBestIndexKeyMatch(facets);
    if (match.shouldScan) {
      return this._makeChain(
        TableIndex,
        this._clausesWithFilters,
        clauses.index,
        options,
      ).scan();
    } else {
      return this._makeChain(
        match.index,
        this._clausesWithFilters,
        clauses.index,
        options,
      ).query(facets);
    }
  }

  collection(collection = "", clauses = {}, facets = {}, options = {}) {
    const chainOptions = {
      ...options,
      _isPagination: true,
      _isCollectionQuery: true,
    };

    let index =
      this.model.translations.collections.fromCollectionToIndex[collection];
    if (index === undefined) {
      throw new Error(`Invalid collection: ${collection}`);
    }
    const chain = this._makeChain(index, clauses, clauses.index, chainOptions);
    if (options.indexType === IndexTypes.clustered) {
      return chain.clusteredCollection(collection, facets);
    } else {
      return chain.collection(collection, facets);
    }
  }

  _validateModel(model) {
    return validations.model(model);
  }

  check(compositeAttributes = {}) {
    return this._makeChain(
      TableIndex,
      this._clausesWithFilters,
      clauses.index,
    ).check(compositeAttributes);
  }

  get(facets = {}) {
    let index = TableIndex;
    if (Array.isArray(facets)) {
      return this._makeChain(
        index,
        this._clausesWithFilters,
        clauses.index,
      ).batchGet(facets);
    } else {
      return this._makeChain(
        index,
        this._clausesWithFilters,
        clauses.index,
      ).get(facets);
    }
  }

  delete(facets = {}) {
    let index = TableIndex;
    if (Array.isArray(facets)) {
      return this._makeChain(
        index,
        this._clausesWithFilters,
        clauses.index,
      ).batchDelete(facets);
    } else {
      return this._makeChain(
        index,
        this._clausesWithFilters,
        clauses.index,
      ).delete(facets);
    }
  }

  put(attributes = {}) {
    let index = TableIndex;
    if (Array.isArray(attributes)) {
      return this._makeChain(
        index,
        this._clausesWithFilters,
        clauses.index,
      ).batchPut(attributes);
    } else {
      return this._makeChain(
        index,
        this._clausesWithFilters,
        clauses.index,
      ).put(attributes);
    }
  }

  upsert(attributes = {}) {
    let index = TableIndex;
    return this._makeChain(
      index,
      this._clausesWithFilters,
      clauses.index,
    ).upsert(attributes);
  }

  create(attributes = {}) {
    let index = TableIndex;
    let options = {};
    return this._makeChain(
      index,
      this._clausesWithFilters,
      clauses.index,
      options,
    ).create(attributes);
  }

  update(facets = {}) {
    let index = TableIndex;
    return this._makeChain(
      index,
      this._clausesWithFilters,
      clauses.index,
    ).update(facets);
  }

  patch(facets = {}) {
    let index = TableIndex;
    let options = {};
    return this._makeChain(
      index,
      this._clausesWithFilters,
      clauses.index,
      options,
    ).patch(facets);
  }

  remove(facets = {}) {
    let index = TableIndex;
    let options = {};
    return this._makeChain(
      index,
      this._clausesWithFilters,
      clauses.index,
      options,
    ).remove(facets);
  }

  async transactWrite(parameters, config) {
    let response = await this._exec(
      MethodTypes.transactWrite,
      parameters,
      config,
    );
    return response;
  }

  async transactGet(parameters, config) {
    let response = await this._exec(
      MethodTypes.transactGet,
      parameters,
      config,
    );
    return response;
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
        case MethodTypes.scan:
          return await this.executeQuery(method, parameters, config);
        default:
          return await this.executeOperation(method, parameters, config);
      }
    } catch (err) {
      if (config.originalErr || stackTrace === undefined) {
        return Promise.reject(err);
      } else {
        if (err.__isAWSError) {
          stackTrace.message = `Error thrown by DynamoDB client: "${err.message}" - For more detail on this error reference: https://electrodb.dev/en/reference/errors/#aws-error`;
          stackTrace.cause = err;
          return Promise.reject(stackTrace);
        } else if (err.isElectroError) {
          return Promise.reject(err);
        } else {
          stackTrace.message = new e.ElectroError(
            e.ErrorCodes.UnknownError,
            err.message,
            err,
          ).message;
          return Promise.reject(stackTrace);
        }
      }
    }
  }

  async _exec(method, params, config = {}) {
    const notifyQuery = () => {
      this.eventManager.trigger(
        {
          type: "query",
          method,
          params,
          config,
        },
        config.listeners,
      );
    };
    const notifyResults = (results, success) => {
      this.eventManager.trigger(
        {
          type: "results",
          method,
          config,
          success,
          results,
        },
        config.listeners,
      );
    };
    const dynamoDBMethod = MethodTypeTranslation[method];
    return this.client[dynamoDBMethod](params)
      .promise()
      .then((results) => {
        notifyQuery();
        notifyResults(results, true);
        return results;
      })
      .catch((err) => {
        notifyQuery();
        notifyResults(err, false);
        err.__isAWSError = true;
        throw err;
      });
  }

  async executeBulkWrite(parameters, config) {
    if (!Array.isArray(parameters)) {
      parameters = [parameters];
    }
    let results = [];
    let concurrent = this._normalizeConcurrencyValue(config.concurrent);
    let concurrentOperations = u.batchItems(parameters, concurrent);
    for (let operation of concurrentOperations) {
      await Promise.all(
        operation.map(async (params) => {
          let response = await this._exec(
            MethodTypes.batchWrite,
            params,
            config,
          );
          if (validations.isFunction(config.parse)) {
            let parsed = config.parse(config, response);
            if (parsed) {
              results.push(parsed);
            }
          } else {
            let { unprocessed } = this.formatBulkWriteResponse(
              response,
              config,
            );
            for (let u of unprocessed) {
              results.push(u);
            }
          }
        }),
      );
    }

    return { unprocessed: results };
  }

  _createNewBatchGetOrderMaintainer(config = {}) {
    const pkName = this.model.translations.keys[TableIndex].pk;
    const skName = this.model.translations.keys[TableIndex].sk;
    const enabled = !!config.preserveBatchOrder;
    const table = this.config.table;
    const keyFormatter = (record = {}) => {
      const pk = record[pkName];
      const sk = record[skName];
      return `${pk}${sk}`;
    };

    return new u.BatchGetOrderMaintainer({
      table,
      enabled,
      keyFormatter,
    });
  }

  _safeMinimum(...values) {
    let eligibleNumbers = [];
    for (let value of values) {
      if (typeof value === "number") {
        eligibleNumbers.push(value);
      }
    }

    if (eligibleNumbers.length) {
      return Math.min(...eligibleNumbers);
    }

    return undefined;
  }

  async executeBulkGet(parameters, config) {
    if (!Array.isArray(parameters)) {
      parameters = [parameters];
    }

    const orderMaintainer = this._createNewBatchGetOrderMaintainer(config);
    orderMaintainer.defineOrder(parameters);
    let concurrent = this._normalizeConcurrencyValue(config.concurrent);
    let concurrentOperations = u.batchItems(parameters, concurrent);
    let resultsAll = config.preserveBatchOrder
      ? new Array(orderMaintainer.getSize()).fill(null)
      : [];
    let unprocessedAll = [];
    for (let operation of concurrentOperations) {
      await Promise.all(
        operation.map(async (params) => {
          let response = await this._exec(MethodTypes.batchGet, params, config);
          if (validations.isFunction(config.parse)) {
            resultsAll.push(config.parse(config, response));
          } else {
            this.applyBulkGetResponseFormatting({
              orderMaintainer,
              resultsAll,
              unprocessedAll,
              response,
              config,
            });
          }
        }),
      );
    }
    return { data: resultsAll, unprocessed: unprocessedAll };
  }

  async hydrate(index, keys = [], config) {
    const items = [];
    const validKeys = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const item = this._formatKeysToItem(index, key);
      if (item !== null) {
        items.push(item);
        validKeys.push(key);
      }
    }

    const results = await this.get(items).go({
      ...config,
      hydrate: false,
      parse: undefined,
      hydrator: undefined,
      _isCollectionQuery: false,
      preserveBatchOrder: true,
      ignoreOwnership: config._providedIgnoreOwnership,
    });

    const unprocessed = [];
    const data = [];

    for (let i = 0; i < results.data.length; i++) {
      const key = validKeys[i];
      const item = results.data[i];
      if (!item) {
        if (key) {
          unprocessed.push(key);
        }
      } else {
        data.push(item);
      }
    }

    return {
      unprocessed,
      data,
    };
  }

  async executeQuery(method, parameters, config = {}) {
    const indexName = parameters.IndexName;
    let results = config._isCollectionQuery ? {} : [];
    let ExclusiveStartKey = this._formatExclusiveStartKey({
      indexName,
      config,
    });
    if (ExclusiveStartKey === null) {
      ExclusiveStartKey = undefined;
    }
    let pages = this._normalizePagesValue(config.pages);
    let iterations = 0;
    let count = 0;
    let hydratedUnprocessed = [];
    const shouldHydrate = config.hydrate && method === MethodTypes.query;
    do {
      let response = await this._exec(
        method,
        { ExclusiveStartKey, ...parameters },
        config,
      );

      ExclusiveStartKey = response.LastEvaluatedKey;

      response = this.formatResponse(response, parameters.IndexName, {
        ...config,
        data:
          shouldHydrate &&
          (!config.data || config.data === DataOptions.attributes)
            ? "includeKeys"
            : config.data,
        ignoreOwnership: shouldHydrate || config.ignoreOwnership,
      });
      if (config.data === DataOptions.raw) {
        return response;
      } else if (config._isCollectionQuery) {
        for (const entity in response.data) {
          let items = response.data[entity];
          if (shouldHydrate && items.length) {
            const hydrated = await config.hydrator(
              entity,
              parameters.IndexName,
              items,
              config,
            );
            items = hydrated.data;
            hydratedUnprocessed = hydratedUnprocessed.concat(
              hydrated.unprocessed,
            );
          }
          results[entity] = results[entity] || [];
          results[entity] = [...results[entity], ...items];
        }
      } else if (Array.isArray(response.data)) {
        let prevCount = count;
        if (config.count) {
          count += response.data.length;
        }
        let items = response.data;
        const moreItemsThanRequired = !!config.count && count > config.count;
        if (moreItemsThanRequired) {
          items = items.slice(0, config.count - prevCount);
        }
        if (shouldHydrate) {
          const hydrated = await this.hydrate(
            parameters.IndexName,
            items,
            config,
          );
          items = hydrated.data;
          hydratedUnprocessed = hydratedUnprocessed.concat(
            hydrated.unprocessed,
          );
        }
        results = [...results, ...items];
        if (moreItemsThanRequired || count === config.count) {
          const lastItem = results[results.length - 1];
          ExclusiveStartKey = this._fromCompositeToKeysByIndex({
            indexName,
            provided: lastItem,
          });
          break;
        }
      } else {
        return response;
      }
      iterations++;
    } while (
      ExclusiveStartKey &&
      (pages === AllPages ||
        config.count !== undefined ||
        iterations < pages) &&
      (config.count === undefined || count < config.count)
    );

    const cursor = this._formatReturnPager(config, ExclusiveStartKey);

    if (shouldHydrate) {
      return {
        cursor,
        data: results,
        unprocessed: hydratedUnprocessed,
      };
    }
    return { data: results, cursor };
  }

  async executeOperation(method, parameters, config) {
    let response = await this._exec(method, parameters, config);
    switch (parameters.ReturnValues) {
      case FormatToReturnValues.none:
        return { data: null };
      case FormatToReturnValues.all_new:
      case FormatToReturnValues.all_old:
      case FormatToReturnValues.updated_new:
      case FormatToReturnValues.updated_old:
        return this.formatResponse(response, TableIndex, config);
      case FormatToReturnValues.default:
      default:
        return this._formatDefaultResponse(
          method,
          parameters.IndexName,
          parameters,
          config,
          response,
        );
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
      case MethodTypes.upsert:
        return this.formatResponse(response, index, {
          ...config,
          _objectOnEmpty: true,
        });
      default:
        return this.formatResponse(response, index, config);
    }
  }

  cleanseRetrievedData(item = {}, options = {}) {
    let data = {};
    let names = this.model.schema.translationForRetrieval;
    for (let [attr, value] of Object.entries(item)) {
      let name = names[attr];
      if (name) {
        data[name] = value;
      } else if (options.data === DataOptions.includeKeys) {
        data[attr] = value;
      }
    }
    return data;
  }

  formatBulkWriteResponse(response = {}, config = {}) {
    if (!response || !response.UnprocessedItems) {
      return response;
    }
    const table = config.table || this.getTableName();
    const index = TableIndex;
    let unprocessed = response.UnprocessedItems[table];
    if (Array.isArray(unprocessed) && unprocessed.length) {
      unprocessed = unprocessed.map((request) => {
        if (request.PutRequest) {
          return this.formatResponse(request.PutRequest, index, config).data;
        } else if (request.DeleteRequest) {
          if (config.unprocessed === UnprocessedTypes.raw) {
            return request.DeleteRequest.Key;
          } else {
            return this._formatKeysToItem(index, request.DeleteRequest.Key);
          }
        } else {
          throw new Error("Unknown response format");
        }
      });
    } else {
      unprocessed = [];
    }

    return { unprocessed };
  }

  applyBulkGetResponseFormatting({
    resultsAll,
    unprocessedAll,
    orderMaintainer,
    response = {},
    config = {},
  }) {
    const table = config.table || this.getTableName();
    const index = TableIndex;

    if (!response.UnprocessedKeys || !response.Responses) {
      throw new Error("Unknown response format");
    }

    if (
      response.UnprocessedKeys[table] &&
      response.UnprocessedKeys[table].Keys &&
      Array.isArray(response.UnprocessedKeys[table].Keys)
    ) {
      for (let value of response.UnprocessedKeys[table].Keys) {
        if (config && config.unprocessed === UnprocessedTypes.raw) {
          unprocessedAll.push(value);
        } else {
          unprocessedAll.push(this._formatKeysToItem(index, value));
        }
      }
    }

    if (response.Responses[table] && Array.isArray(response.Responses[table])) {
      const responses = response.Responses[table];
      for (let i = 0; i < responses.length; i++) {
        const item = responses[i];
        const slot = orderMaintainer.getOrder(item);
        const formatted = this.formatResponse({ Item: item }, index, config);
        if (slot !== -1) {
          resultsAll[slot] = formatted.data;
        } else {
          resultsAll.push(formatted.data);
        }
      }
    }
  }

  formatResponse(response, index, config = {}) {
    let stackTrace;
    if (!config.originalErr) {
      stackTrace = new e.ElectroError(e.ErrorCodes.AWSError);
    }
    try {
      let results = {};
      if (validations.isFunction(config.parse)) {
        results = config.parse(config, response);
      } else if (config.data === DataOptions.raw && !config._isPagination) {
        if (response.TableName) {
          results = {};
        } else {
          results = response;
        }
      } else if (
        config.data === DataOptions.raw &&
        (config._isPagination || config.lastEvaluatedKeyRaw)
      ) {
        results = response;
      } else {
        if (response.Item) {
          if (
            (config.ignoreOwnership &&
              config.attributes &&
              config.attributes.length > 0 &&
              !this._attributesIncludeKeys(config.attributes)) ||
            ((config.ignoreOwnership || config.hydrate) &&
              this.ownsKeys(response.Item)) ||
            this.ownsItem(response.Item)
          ) {
            results = this.model.schema.formatItemForRetrieval(
              response.Item,
              config,
            );
            if (Object.keys(results).length === 0) {
              results = null;
            }
          } else if (!config._objectOnEmpty) {
            results = null;
          }
        } else if (response.Items) {
          results = [];
          for (let item of response.Items) {
            if (
              (config.ignoreOwnership &&
                config.attributes &&
                config.attributes.length > 0 &&
                !this._attributesIncludeKeys(config.attributes)) ||
              ((config.ignoreOwnership || config.hydrate) &&
                this.ownsKeys(item)) ||
              this.ownsItem(item)
            ) {
              let record = this.model.schema.formatItemForRetrieval(
                item,
                config,
              );
              if (Object.keys(record).length > 0) {
                results.push(record);
              }
            }
          }
        } else if (response.Attributes) {
          results = this.model.schema.formatItemForRetrieval(
            response.Attributes,
            config,
          );
          if (Object.keys(results).length === 0) {
            results = null;
          }
        } else if (config._objectOnEmpty) {
          return {
            data: {
              ...config._includeOnResponseItem,
            },
          };
        } else {
          results = null;
        }
      }

      if (config._isPagination || response.LastEvaluatedKey) {
        const nextPage = this._formatReturnPager(
          config,
          response.LastEvaluatedKey,
        );
        return { cursor: nextPage || null, data: results };
      }

      return { data: results };
    } catch (err) {
      if (
        config.originalErr ||
        stackTrace === undefined ||
        err.isElectroError
      ) {
        throw err;
      } else {
        stackTrace.message = `Error thrown by DynamoDB client: "${err.message}" - For more detail on this error reference: https://electrodb.dev/en/reference/errors/#aws-error`;
        stackTrace.cause = err;
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
      ignoreOwnership: true,
    };
    return this.formatResponse(item, TableIndex, config);
  }

  _fromCompositeToKeys({ provided }, options = {}) {
    if (!provided || Object.keys(provided).length === 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionCompositeProvided,
        "Invalid conversion composite provided",
      );
    }

    let keys = {};
    const secondaryIndexStrictMode =
      options.strict === "all" || options.strict === "pk" ? "pk" : "none";
    for (const { index } of Object.values(this.model.indexes)) {
      const indexKeys = this._fromCompositeToKeysByIndex(
        { indexName: index, provided },
        {
          strict:
            index === TableIndex ? options.strict : secondaryIndexStrictMode,
        },
      );
      if (indexKeys) {
        keys = {
          ...keys,
          ...indexKeys,
        };
      }
    }

    if (Object.keys(keys).length === 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionCompositeProvided,
        "Invalid conversion composite provided",
      );
    }

    return keys;
  }

  _fromCompositeToCursor({ provided }, options = {}) {
    const keys = this._fromCompositeToKeys({ provided }, options);
    if (!keys || Object.keys(keys).length === 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionCompositeProvided,
        "Invalid conversion composite provided",
      );
    }
    return u.cursorFormatter.serialize(keys);
  }

  _fromKeysToCursor({ provided }, options = {}) {
    if (!provided || Object.keys(provided).length === 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionKeysProvided,
        "Invalid keys provided",
      );
    }
    return u.cursorFormatter.serialize(provided);
  }

  _fromKeysToComposite({ provided }, options = {}) {
    if (!provided || Object.keys(provided).length === 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionKeysProvided,
        "Provided keys could not be used to form composite attributes",
      );
    }

    let keys = {};
    for (const { index } of Object.values(this.model.indexes)) {
      const composite = this._fromKeysToCompositeByIndex(
        { indexName: index, provided },
        options,
      );
      if (composite) {
        for (const attribute in composite) {
          if (keys[attribute] === undefined) {
            keys[attribute] = composite[attribute];
          }
        }
      }
    }

    if (Object.keys(keys).length === 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionKeysProvided,
        "Provided keys could not be used to form composite attributes",
      );
    }

    return keys;
  }

  _fromCursorToKeys({ provided }, options = {}) {
    if (typeof provided !== "string") {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionCursorProvided,
        "Invalid conversion cursor provided",
      );
    }

    return u.cursorFormatter.deserialize(provided);
  }

  _fromCursorToComposite({ provided }, options = {}) {
    if (typeof provided !== "string") {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionCursorProvided,
        "Invalid conversion cursor provided",
      );
    }

    const keys = this._fromCursorToKeys({ provided }, options);
    if (!keys) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionCursorProvided,
        "Invalid conversion cursor provided",
      );
    }

    return this._fromKeysToComposite({ provided: keys }, options);
  }

  _fromCompositeToCursorByIndex(
    { indexName = TableIndex, provided },
    options = {},
  ) {
    if (!provided || Object.keys(provided).length === 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionCompositeProvided,
        "Invalid conversion composite provided",
      );
    }

    const keys = this._formatSuppliedPager(indexName, provided, {
      relaxedPk: false,
      relaxedSk: false,
    });

    return this._fromKeysToCursorByIndex(
      { indexName, provided: keys },
      options,
    );
  }

  _fromCompositeToKeysByIndex(
    { indexName = TableIndex, provided },
    options = {},
  ) {
    return this._formatSuppliedPager(indexName, provided, {
      relaxedPk: options.strict !== "pk" && options.strict !== "all",
      relaxedSk: options.strict !== "all",
    });
  }

  _fromCursorToKeysByIndex({ provided }, options = {}) {
    if (typeof provided !== "string" || provided.length < 1) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionCursorProvided,
        "Invalid conversion cursor provided",
      );
    }

    return u.cursorFormatter.deserialize(provided);
  }

  _fromKeysToCursorByIndex({ indexName = TableIndex, provided }, options = {}) {
    const isValidTableIndex = this._verifyKeys({
      indexName: TableIndex,
      provided,
    });
    const isValidIndex = this._verifyKeys({ indexName, provided });
    if (!isValidTableIndex) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionKeysProvided,
        "Provided keys did not include valid properties for the primary index",
      );
    } else if (!isValidIndex) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionKeysProvided,
        `Provided keys did not include valid properties for the index "${indexName}"`,
      );
    }

    const keys = this._trimKeysToIndex({ indexName, provided });

    if (!keys || Object.keys(keys).length === 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionKeysProvided,
        `Provided keys not defined`,
      );
    }

    return u.cursorFormatter.serialize(provided);
  }

  _fromKeysToCompositeByIndex(
    { indexName = TableIndex, provided },
    options = {},
  ) {
    let allKeys = {};

    const indexKeys = this._deconstructIndex({
      index: indexName,
      keys: provided,
    });
    if (!indexKeys) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionKeysProvided,
        `Provided keys did not include valid properties for the index "${indexName}"`,
      );
    }

    allKeys = {
      ...indexKeys,
    };

    let tableKeys;
    if (indexName !== TableIndex) {
      tableKeys = this._deconstructIndex({ index: TableIndex, keys: provided });
    }

    if (tableKeys === null) {
      return allKeys;
    }

    allKeys = {
      ...allKeys,
      ...tableKeys,
    };

    if (Object.keys(allKeys).length === 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionKeysProvided,
        "Provided keys could not be used to form composite attributes",
      );
    }

    return allKeys;
  }

  _fromCursorToCompositeByIndex(
    { indexName = TableIndex, provided },
    options = {},
  ) {
    const keys = this._fromCursorToKeysByIndex(
      { indexName, provided },
      options,
    );
    if (!keys || Object.keys(keys).length === 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionCursorProvided,
        "Invalid conversion cursor provided",
      );
    }
    return this._fromKeysToCompositeByIndex(
      { indexName, provided: keys },
      options,
    );
  }

  _trimKeysToIndex({ indexName = TableIndex, provided }) {
    if (!provided) {
      return null;
    }

    const pkName = this.model.translations.keys[indexName].pk;
    const skName = this.model.translations.keys[indexName].sk;
    const tablePKName = this.model.translations.keys[TableIndex].pk;
    const tableSKName = this.model.translations.keys[TableIndex].sk;

    const keys = {
      [pkName]: provided[pkName],
      [skName]: provided[skName],
      [tablePKName]: provided[tablePKName],
      [tableSKName]: provided[tableSKName],
    };

    if (!keys || Object.keys(keys).length === 0) {
      return null;
    }

    return keys;
  }

  _verifyKeys({ indexName, provided }) {
    if (!provided) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConversionKeysProvided,
        `Provided keys not defined`,
      );
    }

    const pkName = this.model.translations.keys[indexName].pk;
    const skName = this.model.translations.keys[indexName].sk;

    return (
      provided[pkName] !== undefined &&
      (!skName || provided[skName] !== undefined)
    );
  }

  _formatReturnPager(config, lastEvaluatedKey) {
    let page = lastEvaluatedKey || null;
    if (config.data === DataOptions.raw || config.pager === Pager.raw) {
      return page;
    }
    return config.formatCursor.serialize(page) || null;
  }

  _formatExclusiveStartKey({ config, indexName = TableIndex }) {
    let exclusiveStartKey = config.cursor;
    if (config.data === DataOptions.raw || config.pager === Pager.raw) {
      return (
        this._trimKeysToIndex({ provided: exclusiveStartKey, indexName }) ||
        null
      );
    }
    let keys;
    if (config.pager === Pager.item) {
      keys = this._fromCompositeToKeysByIndex({
        indexName,
        provided: exclusiveStartKey,
      });
    } else {
      keys = config.formatCursor.deserialize(exclusiveStartKey);
    }
    if (!keys) {
      return null;
    }

    return this._trimKeysToIndex({ provided: keys, indexName }) || null;
  }

  setClient(client) {
    if (client) {
      this.client = c.normalizeClient(client);
    }
  }

  setTableName(tableName) {
    this.config.table = tableName;
  }

  getTableName() {
    return this.config.table;
  }

  getTableName() {
    return this.config.table;
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
      attributes: options.attributes || this.model.schema.attributes,
      hasSortKey:
        options.hasSortKey || this.model.lookup.indexHasSortKeys[index],
      compositeAttributes:
        options.compositeAttributes || this.model.facets.byIndex[index],
    });
    return state.init(this, clauses, rootClause);
  }

  _regexpEscape(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  _normalizeConcurrencyValue(value = 1) {
    value = parseInt(value);
    if (isNaN(value) || value < 1) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidConcurrencyOption,
        "Query option 'concurrency' must be of type 'number' and greater than zero.",
      );
    }
    return value;
  }

  _normalizePagesValue(value) {
    if (value === AllPages) {
      return value;
    }
    value = parseInt(value);
    if (isNaN(value) || value < 1) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidPagesOption,
        `Query option 'pages' must be of type 'number' and greater than zero or the string value '${AllPages}'`,
      );
    }
    return value;
  }

  _normalizeLimitValue(value) {
    if (value !== undefined) {
      value = parseInt(value);
      if (isNaN(value) || value < 1) {
        throw new e.ElectroError(
          e.ErrorCodes.InvalidLimitOption,
          "Query option 'limit' must be of type 'number' and greater than zero.",
        );
      }
    }
    return value;
  }

  _createKeyDeconstructor(prefixes = {}, labels = [], attributes = {}) {
    let { prefix, isCustom, postfix, cast } = prefixes;
    let names = [];
    let types = [];
    let pattern = `^${this._regexpEscape(prefix || "")}`;
    for (let { name, label } of labels) {
      let attr = attributes[name];
      if (isCustom && !name && label) {
        // this case is for when someone uses a direct attribute reference but with a postfix (zoinks ;P)
        pattern += `${this._regexpEscape(label)}`;
      } else if (isCustom) {
        pattern += `${this._regexpEscape(
          label === undefined ? "" : label,
        )}(.+)`;
      } else {
        pattern += `#${this._regexpEscape(
          label === undefined ? name : label,
        )}_(.+)`;
      }
      names.push(name);
      if (attr) {
        types.push(attr.type);
      }
    }
    if (typeof postfix === "string") {
      pattern += this._regexpEscape(postfix);
    }
    pattern += "$";

    let regex = new RegExp(pattern, "i");

    return ({ key } = {}) => {
      const typeofKey = typeof key;
      if (!["string", "number"].includes(typeofKey)) {
        return null;
      }
      key = `${key}`;
      const isNumeric =
        cast === CastKeyOptions.number && typeofKey === "number";
      let match = key.match(regex);
      let results = {};
      if (match || isNumeric) {
        for (let i = 0; i < names.length; i++) {
          let keyName = names[i];
          let value = isNumeric ? key : match[i + 1];
          let type = types[i];
          switch (type) {
            case "number": {
              value = parseFloat(value);
              break;
            }
            case "boolean": {
              value = value === "true";
              break;
            }
          }
          if (keyName && value !== undefined) {
            results[keyName] = value;
          }
        }
      } else {
        results = null;
      }

      return results;
    };
  }

  _deconstructIndex({ index = TableIndex, keys = {} } = {}) {
    const hasIndex = !!this.model.translations.keys[index];
    if (!hasIndex) {
      return null;
    }
    let pkName = this.model.translations.keys[index].pk;
    let skName = this.model.translations.keys[index].sk;
    const indexHasSortKey = this.model.lookup.indexHasSortKeys[index];
    const deconstructors = this.model.keys.deconstructors[index];
    const pk = keys[pkName];
    if (pk === undefined) {
      return null;
    }
    const pkComposites = deconstructors.pk({ key: pk });
    if (pkComposites === null) {
      return null;
    }
    let skComposites = {};
    if (indexHasSortKey) {
      const sk = keys[skName];
      if (sk === undefined) {
        return null;
      }
      skComposites = deconstructors.sk({ key: sk });
      if (skComposites === null) {
        return null;
      }
    }
    return {
      ...pkComposites,
      ...skComposites,
    };
  }

  _formatKeysToItem(index = TableIndex, keys) {
    if (
      keys === null ||
      typeof keys !== "object" ||
      Object.keys(keys).length === 0
    ) {
      return keys;
    }
    let tableIndex = TableIndex;
    let indexParts = this._deconstructIndex({ index, keys });
    if (indexParts === null) {
      return null;
    }
    // lastEvaluatedKeys from query calls include the index pk/sk as well as the table index's pk/sk
    if (index !== tableIndex) {
      const tableIndexParts = this._deconstructIndex({
        index: tableIndex,
        keys,
      });
      if (tableIndexParts === null) {
        return null;
      }
      indexParts = { ...indexParts, ...tableIndexParts };
    }
    let noPartsFound =
      Object.keys(indexParts).length === 0 &&
      this.model.facets.byIndex[tableIndex].all.length > 0;
    let partsAreIncomplete = this.model.facets.byIndex[tableIndex].all.find(
      (facet) => indexParts[facet.name] === undefined,
    );
    if (noPartsFound || partsAreIncomplete) {
      // In this case no suitable record could be found be the deconstructed pager.
      // This can be valid in cases where a scan is performed but returns no results.
      return null;
    }

    return indexParts;
  }

  _constructPagerIndex(index = TableIndex, item, options = {}) {
    let pkAttributes = options.relaxedPk
      ? item
      : this._expectFacets(item, this.model.facets.byIndex[index].pk);
    let skAttributes = options.relaxedSk
      ? item
      : this._expectFacets(item, this.model.facets.byIndex[index].sk);

    let keys = this._makeIndexKeys({
      index,
      pkAttributes,
      skAttributes: [skAttributes],
    });

    return this._makeParameterKey(index, keys.pk, ...keys.sk);
  }

  _formatSuppliedPager(index = TableIndex, item, options = {}) {
    if (typeof item !== "object" || Object.keys(item).length === 0) {
      return item;
    }

    let tableIndex = TableIndex;
    let pager = this._constructPagerIndex(index, item, options);
    if (index !== tableIndex) {
      pager = {
        ...pager,
        ...this._constructPagerIndex(tableIndex, item, options),
      };
    }

    return pager;
  }

  _normalizeExecutionOptions({ provided = [], context = {} } = {}) {
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
      response: "default",
      cursor: null,
      data: "attributes",
      consistent: undefined,
      compare: ComparisonTypes.keys,
      complete: false,
      ignoreOwnership: false,
      _providedIgnoreOwnership: false,
      _isPagination: false,
      _isCollectionQuery: false,
      pages: 1,
      count: undefined,
      listeners: [],
      preserveBatchOrder: false,
      attributes: [],
      terminalOperation: undefined,
      formatCursor: u.cursorFormatter,
      order: undefined,
      hydrate: false,
      hydrator: (_entity, _indexName, items) => items,
      _includeOnResponseItem: {},
    };

    return provided.filter(Boolean).reduce((config, option) => {
      if (typeof option.order === "string") {
        switch (option.order.toLowerCase()) {
          case "asc":
            config.params[ResultOrderParam] = ResultOrderOption.asc;
            break;
          case "desc":
            config.params[ResultOrderParam] = ResultOrderOption.desc;
            break;
          default:
            throw new e.ElectroError(
              e.ErrorCodes.InvalidOptions,
              `Invalid value for query option "order" provided. Valid options include 'asc' and 'desc, received: "${option.order}"`,
            );
        }
      }

      if (typeof option.compare === "string") {
        const type = ComparisonTypes[option.compare.toLowerCase()];
        if (type) {
          config.compare = type;
          if (type === ComparisonTypes.v2 && option.complete === undefined) {
            config.complete = true;
          }
        } else {
          throw new e.ElectroError(
            e.ErrorCodes.InvalidOptions,
            `Invalid value for query option "compare" provided. Valid options include ${u.commaSeparatedString(
              Object.keys(ComparisonTypes),
            )}, received: "${option.compare}"`,
          );
        }
      }

      if (typeof option.response === "string" && option.response.length) {
        const format = ReturnValues[option.response];
        if (format === undefined) {
          throw new e.ElectroError(
            e.ErrorCodes.InvalidOptions,
            `Invalid value for query option "format" provided: "${
              option.format
            }". Allowed values include ${u.commaSeparatedString(
              Object.keys(ReturnValues),
            )}.`,
          );
        } else if (format !== ReturnValues.default) {
          config.response = format;
          if (context.operation === MethodTypes.transactWrite) {
            config.params.ReturnValuesOnConditionCheckFailure =
              FormatToReturnValues[format];
          } else {
            config.params.ReturnValues = FormatToReturnValues[format];
          }
        }
      }

      if (option.formatCursor) {
        const isValid = ["serialize", "deserialize"].every(
          (method) =>
            method in option.formatCursor &&
            validations.isFunction(option.formatCursor[method]),
        );
        if (isValid) {
          config.formatCursor = option.formatCursor;
        } else {
          throw new e.ElectroError(
            e.ErrorCodes.InvalidOptions,
            `Invalid value for query option "formatCursor" provided. Formatter interface must have serialize and deserialize functions`,
          );
        }
      }

      if (option.terminalOperation in TerminalOperation) {
        config.terminalOperation = TerminalOperation[option.terminalOperation];
      }

      if (Array.isArray(option.attributes)) {
        config.attributes = config.attributes.concat(option.attributes);
      }

      if (option.preserveBatchOrder === true) {
        config.preserveBatchOrder = true;
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

      if (option.cursor) {
        config.cursor = option.cursor;
      }

      if (option.data) {
        if (!DataOptions[option.data]) {
          throw new e.ElectroError(
            e.ErrorCodes.InvalidOptions,
            `Query option 'data' must be one of ${u.commaSeparatedString(
              Object.keys(DataOptions),
            )}.`,
          );
        }
        config.data = option.data;
        switch (option.data) {
          case DataOptions.raw:
            config.raw = true;
            break;
          case DataOptions.includeKeys:
            config.includeKeys = true;
            break;
        }
      }

      if (option.count !== undefined) {
        if (typeof option.count !== "number" || option.count < 1) {
          throw new e.ElectroError(
            e.ErrorCodes.InvalidOptions,
            `Query option 'count' must be of type 'number' and greater than zero.`,
          );
        }
        config.count = option.count;
      }

      if (option.consistent === true) {
        config.consistent = true;
        config.params.ConsistentRead = true;
      }

      if (option.limit !== undefined) {
        config.limit = option.limit;
        config.params.Limit = option.limit;
      }

      if (validations.isStringHasLength(option.table)) {
        config.params.TableName = option.table;
        config.table = option.table;
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
          throw new e.ElectroError(
            e.ErrorCodes.InvalidOptions,
            `Invalid value for option "pager" provided: "${
              option.pager
            }". Allowed values include ${u.commaSeparatedString(
              Object.keys(Pager),
            )}.`,
          );
        }
      }

      if (typeof option.unprocessed === "string") {
        if (typeof UnprocessedTypes[option.unprocessed] === "string") {
          config.unproessed = UnprocessedTypes[option.unprocessed];
        } else {
          throw new e.ElectroError(
            e.ErrorCodes.InvalidOptions,
            `Invalid value for option "unprocessed" provided: "${
              option.unprocessed
            }". Allowed values include ${u.commaSeparatedString(
              Object.keys(UnprocessedTypes),
            )}.`,
          );
        }
      }

      if (option.ignoreOwnership) {
        config.ignoreOwnership = option.ignoreOwnership;
        config._providedIgnoreOwnership = option.ignoreOwnership;
      }

      if (option.listeners) {
        if (Array.isArray(option.listeners)) {
          config.listeners = config.listeners.concat(option.listeners);
        }
      }

      if (option.logger) {
        if (validations.isFunction(option.logger)) {
          config.listeners.push(option.logger);
        } else {
          throw new e.ElectroError(
            e.ErrorCodes.InvalidLoggerProvided,
            `Loggers must be of type function`,
          );
        }
      }

      if (option.hydrate) {
        config.hydrate = true;
        config.ignoreOwnership = true;
      }

      if (validations.isFunction(option.hydrator)) {
        config.hydrator = option.hydrator;
      }

      if (option._includeOnResponseItem) {
        config._includeOnResponseItem = {
          ...config._includeOnResponseItem,
          ...option._includeOnResponseItem,
        };
      }

      config.page = Object.assign({}, config.page, option.page);
      config.params = Object.assign({}, config.params, option.params);
      return config;
    }, config);
  }

  _applyParameterOptions({ params = {}, options = {} } = {}) {
    let parameters = Object.assign({}, params);

    for (let customParameter of Object.keys(options.params || {})) {
      if (options.params[customParameter] !== undefined) {
        parameters[customParameter] = options.params[customParameter];
      }
    }

    return parameters;
  }

  addListeners(logger) {
    this.eventManager.add(logger);
  }

  _addLogger(logger) {
    if (validations.isFunction(logger)) {
      this.addListeners(logger);
    } else {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidLoggerProvided,
        `Logger must be of type function`,
      );
    }
  }

  _getPrimaryIndexFieldNames() {
    let hasSortKey = this.model.lookup.indexHasSortKeys[TableIndex];
    let accessPattern =
      this.model.translations.indexes.fromIndexToAccessPattern[TableIndex];
    let pkField = this.model.indexes[accessPattern].pk.field;
    let skField;
    if (hasSortKey) {
      skField = this.model.indexes[accessPattern].sk.field;
    }
    return {
      pk: pkField,
      sk: skField,
    };
  }

  _applyParameterExpressionTypes(params, filter) {
    const conditions = filter[ExpressionTypes.ConditionExpression];
    if (conditions.build().length > 0) {
      if (
        typeof params[ExpressionTypes.ConditionExpression] === "string" &&
        params[ExpressionTypes.ConditionExpression].length > 0
      ) {
        params[ExpressionTypes.ConditionExpression] = `${
          params[ExpressionTypes.ConditionExpression]
        } AND ${conditions.build()}`;
      } else {
        params[ExpressionTypes.ConditionExpression] = conditions.build();
      }
      if (Object.keys(conditions.getNames()).length > 0) {
        params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
        params.ExpressionAttributeNames = Object.assign(
          {},
          conditions.getNames(),
          params.ExpressionAttributeNames,
        );
      }
      if (Object.keys(conditions.getValues()).length > 0) {
        params.ExpressionAttributeValues =
          params.ExpressionAttributeValues || {};
        params.ExpressionAttributeValues = Object.assign(
          {},
          conditions.getValues(),
          params.ExpressionAttributeValues,
        );
      }
    }
    return params;
  }
  /* istanbul ignore next */
  _params(state, config = {}) {
    const {
      keys = {},
      method = "",
      put = {},
      update = {},
      filter = {},
      upsert,
      updateProxy,
    } = state.query;
    let consolidatedQueryFacets = this._consolidateQueryFacets(keys.sk);
    let params = {};
    switch (method) {
      case MethodTypes.check:
      case MethodTypes.get:
      case MethodTypes.delete:
      case MethodTypes.remove:
        params = this._makeSimpleIndexParams(
          keys.pk,
          ...consolidatedQueryFacets,
        );
        break;
      case MethodTypes.upsert:
        params = this._makeUpsertParams(
          { update, upsert, updateProxy },
          keys.pk,
          ...keys.sk,
        );
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

    let appliedParameters = this._applyParameterOptions({
      params,
      options: config,
    });

    return this._applyParameterExpressions(
      method,
      appliedParameters,
      config,
      filter,
    );
  }

  _applyParameterExpressions(method, parameters, config, filter) {
    if (method !== MethodTypes.get) {
      return this._applyParameterExpressionTypes(parameters, filter);
    } else {
      parameters = this._applyProjectionExpressions({ parameters, config });
      return this._applyParameterExpressionTypes(parameters, filter);
    }
  }

  _applyProjectionExpressions({ parameters = {}, config = {} } = {}) {
    const attributes = config.attributes || [];
    if (attributes.length === 0) {
      return parameters;
    }

    const requiresRawResponse = config.data === DataOptions.raw;
    const enforcesOwnership = !config.ignoreOwnership;
    const requiresUserInvolvedPagination =
      TerminalOperation[config.terminalOperation] === TerminalOperation.page;
    const isServerBound =
      TerminalOperation[config.terminalOperation] === TerminalOperation.go ||
      TerminalOperation[config.terminalOperation] === TerminalOperation.page;

    // 1. Take stock of invalid attributes, if there are any this should be considered
    //    unintentional and should throw to prevent unintended results
    // 2. Convert all attribute names to their respective "field" names
    const unknownAttributes = [];
    let attributeFields = new Set();
    for (const attributeName of attributes) {
      const fieldName = this.model.schema.getFieldName(attributeName);
      if (typeof fieldName !== "string") {
        unknownAttributes.push(attributeName);
      } else {
        attributeFields.add(fieldName);
      }
    }

    // Stop doing work, prepare error message and throw
    if (attributeFields.size === 0 || unknownAttributes.length > 0) {
      let message = "Unknown attributes provided in query options";
      if (unknownAttributes.length) {
        message += `: ${u.commaSeparatedString(unknownAttributes)}`;
      }
      throw new e.ElectroError(e.ErrorCodes.InvalidOptions, message);
    }

    // add ExpressionAttributeNames if it doesn't exist already
    parameters.ExpressionAttributeNames =
      parameters.ExpressionAttributeNames || {};

    if (
      // The response you're returning:
      // 1. is not expected to be raw
      !requiresRawResponse &&
      // 2. is making a request to the server
      isServerBound &&
      // 3. will expect entity identifiers down stream
      enforcesOwnership
    ) {
      // add entity identifiers to so items can be identified
      attributeFields.add(this.identifiers.entity);
      attributeFields.add(this.identifiers.version);

      // if pagination is required you may enter into a scenario where
      // the LastEvaluatedKey doesn't belong to entity and one must be formed.
      // We must add the attributes necessary to make that key to not break
      // pagination. This stinks.
      if (requiresUserInvolvedPagination && config.pager !== Pager.raw) {
        // LastEvaluatedKeys return the TableIndex keys and the keys for the SecondaryIndex
        let tableIndexFacets = this.model.facets.byIndex[TableIndex];
        let indexFacets = this.model.facets.byIndex[parameters.IndexName] || {
          all: [],
        };

        for (const attribute of [...tableIndexFacets.all, ...indexFacets.all]) {
          const fieldName = this.model.schema.getFieldName(attribute.name);
          attributeFields.add(fieldName);
        }
      }
    }

    for (const attributeField of attributeFields) {
      // prefix the ExpressionAttributeNames because some prefixes are not allowed
      parameters.ExpressionAttributeNames["#" + attributeField] =
        attributeField;
    }

    // if there is already a ProjectionExpression (e.g. config "params"), merge it
    if (typeof parameters.ProjectionExpression === "string") {
      parameters.ProjectionExpression = [
        parameters.ProjectionExpression,
        ...Object.keys([parameters.ExpressionAttributeNames]),
      ].join(", ");
    } else {
      parameters.ProjectionExpression = Object.keys(
        parameters.ExpressionAttributeNames,
      ).join(", ");
    }

    return parameters;
  }

  _batchGetParams(state, config = {}) {
    let table = config.table || this.getTableName();
    let userDefinedParams = config.params || {};

    // TableName is added when the config provided includes "table"
    // this is evaluated upstream so we remove it to avoid forming
    // bad syntax. Code should reconsider how this is applied to
    // make this cleaner :(
    delete userDefinedParams.TableName;

    let records = [];
    for (let itemState of state.subStates) {
      let method = itemState.query.method;
      let params = this._params(itemState, config);
      if (method === MethodTypes.get) {
        let { Key } = params;
        records.push(Key);
      }
    }
    let batches = u.batchItems(records, MaxBatchItems.batchGet);
    return batches.map((batch) => {
      return {
        RequestItems: {
          [table]: {
            ...userDefinedParams,
            Keys: batch,
          },
        },
      };
    });
  }

  _batchWriteParams(state, config = {}) {
    let table = config.table || this.getTableName();
    let records = [];
    for (let itemState of state.subStates) {
      let method = itemState.query.method;
      let params = this._params(itemState, config);
      switch (method) {
        case MethodTypes.put:
          let { Item } = params;
          records.push({ PutRequest: { Item } });
          break;
        case MethodTypes.delete:
          let { Key } = params;
          records.push({ DeleteRequest: { Key } });
          break;
        /* istanbul ignore next */
        default:
          throw new Error("Invalid method type");
      }
    }
    let batches = u.batchItems(records, MaxBatchItems.batchWrite);
    return batches.map((batch) => {
      return {
        RequestItems: {
          [table]: batch,
        },
      };
    });
  }

  _makeParameterKey(index, pk, sk) {
    let hasSortKey = this.model.lookup.indexHasSortKeys[index];
    let accessPattern =
      this.model.translations.indexes.fromIndexToAccessPattern[index];
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
        [`#${this.identifiers.entity}`]: this.identifiers.entity,
        [`#${this.identifiers.version}`]: this.identifiers.version,
      },
      values: {
        [`:${this.identifiers.entity}_${alias}`]: name,
        [`:${this.identifiers.version}_${alias}`]: version,
      },
      expression: `(#${this.identifiers.entity} = :${this.identifiers.entity}_${alias} AND #${this.identifiers.version} = :${this.identifiers.version}_${alias})`,
    };
  }

  /* istanbul ignore next */
  _makeScanParam(filter = {}) {
    let indexBase = TableIndex;
    let hasSortKey = this.model.lookup.indexHasSortKeys[indexBase];
    let accessPattern =
      this.model.translations.indexes.fromIndexToAccessPattern[indexBase];
    let pkField = this.model.indexes[accessPattern].pk.field;
    let { pk, sk } = this._makeIndexKeys({
      index: indexBase,
    });

    let keys = this._makeParameterKey(indexBase, pk, ...sk);
    // trim empty key values (this can occur when keys are defined by users)
    for (let key in keys) {
      if (keys[key] === undefined || keys[key] === "") {
        delete keys[key];
      }
    }

    let keyExpressions = this._expressionAttributeBuilder(keys);

    const expressionAttributeNames = this._mergeExpressionsAttributes(
      filter.getNames(),
      keyExpressions.ExpressionAttributeNames,
    );

    const expressionAttributeValues = this._mergeExpressionsAttributes(
      filter.getValues(),
      keyExpressions.ExpressionAttributeValues,
    );

    let params = {
      TableName: this.getTableName(),
    };

    if (Object.keys(expressionAttributeNames).length) {
      params["ExpressionAttributeNames"] = expressionAttributeNames;
    }

    if (Object.keys(expressionAttributeValues).length) {
      params["ExpressionAttributeValues"] = expressionAttributeValues;
    }

    let filterExpressions = [];

    if (keys[pkField]) {
      filterExpressions.push(`begins_with(#${pkField}, :${pkField})`);
    }

    if (hasSortKey) {
      let skField = this.model.indexes[accessPattern].sk.field;
      if (keys[skField]) {
        filterExpressions.push(`begins_with(#${skField}, :${skField})`);
      }
    }

    if (filter.build()) {
      filterExpressions.push(filter.build());
    }

    if (filterExpressions.length) {
      params.FilterExpression = filterExpressions.join(" AND ");
    }

    return params;
  }

  _makeSimpleIndexParams(partition, sort) {
    let index = TableIndex;
    let keys = this._makeIndexKeys({
      index,
      pkAttributes: partition,
      skAttributes: [sort],
    });
    let Key = this._makeParameterKey(index, keys.pk, ...keys.sk);
    let TableName = this.getTableName();
    return { Key, TableName };
  }

  _removeAttributes(item, keys) {
    let copy = { ...item };
    for (let key of Object.keys(keys)) {
      delete copy[key];
    }
    return copy;
  }

  _makeUpdateParams(update = {}, pk = {}, sk = {}) {
    let primaryIndexAttributes = { ...pk, ...sk };
    let modifiedAttributeValues = {};
    let modifiedAttributeNames = {};
    for (const path of Object.keys(update.paths)) {
      const { value, name } = update.paths[path];
      modifiedAttributeValues[path] = value;
      modifiedAttributeNames[path] = name;
    }
    const removed = {};
    for (const name in update.impacted) {
      if (update.impacted[name] === ItemOperations.remove) {
        removed[name] = name;
      }
    }
    modifiedAttributeValues = this._removeAttributes(modifiedAttributeValues, {
      ...pk,
      ...sk,
      ...this.model.schema.getReadOnly(),
    });
    const preparedUpdateValues = this.model.schema.applyAttributeSetters(
      modifiedAttributeValues,
    );
    // We need to remove the pk/sk facets from before applying the Attribute setters because these values didnt
    // change, and we also don't want to trigger the setters of any attributes watching these facets because that
    // should only happen when an attribute is changed.
    const attributesAndComposites = {
      ...preparedUpdateValues,
    };
    const {
      indexKey,
      updatedKeys,
      deletedKeys = [],
    } = this._getUpdatedKeys(
      pk,
      sk,
      attributesAndComposites,
      removed,
      update.composites,
    );
    const accessPattern =
      this.model.translations.indexes.fromIndexToAccessPattern[TableIndex];
    for (const path of Object.keys(preparedUpdateValues)) {
      if (
        modifiedAttributeNames[path] !== undefined &&
        preparedUpdateValues[path] !== undefined
      ) {
        update.updateValue(
          modifiedAttributeNames[path],
          preparedUpdateValues[path],
        );
      } else if (preparedUpdateValues[path] !== undefined) {
        const attr = this.model.schema.getAttribute(path);
        if (attr) {
          // attributes might enter into this flow because they were triggered via a `watch` event and were
          // not supplied directly by the user. In this case we should set the field name.
          // TODO: This will only work with root attributes and should be refactored for nested attributes.
          update.set(attr.field, preparedUpdateValues[path]);
        } else {
          // this could be fields added by electro that don't appear in the schema
          update.set(path, preparedUpdateValues[path]);
        }
      }
    }

    for (const indexKey of Object.keys(updatedKeys)) {
      const isNotTablePK =
        indexKey !== this.model.indexes[accessPattern].pk.field;
      const isNotTableSK =
        indexKey !== this.model.indexes[accessPattern].sk.field;
      const wasNotAlreadyModified =
        modifiedAttributeNames[indexKey] === undefined;
      if (isNotTablePK && isNotTableSK && wasNotAlreadyModified) {
        update.set(indexKey, updatedKeys[indexKey]);
      }
    }

    for (const indexKey of deletedKeys) {
      const isNotTablePK =
        indexKey !== this.model.indexes[accessPattern].pk.field;
      const isNotTableSK =
        indexKey !== this.model.indexes[accessPattern].sk.field;
      const wasNotAlreadyModified =
        modifiedAttributeNames[indexKey] === undefined;
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
      const isNotTablePK = !!(
        attribute &&
        attribute.field !== this.model.indexes[accessPattern].pk.field
      );
      const isNotTableSK = !!(
        attribute &&
        attribute.field !== this.model.indexes[accessPattern].sk.field
      );
      const wasNotAlreadyModified =
        modifiedAttributeNames[primaryIndexAttribute] === undefined;
      if (isNotTablePK && isNotTableSK && wasNotAlreadyModified) {
        update.set(
          attribute.field,
          primaryIndexAttributes[primaryIndexAttribute],
        );
      }
    }

    update.set(this.identifiers.entity, this.getName());
    update.set(this.identifiers.version, this.getVersion());

    return {
      UpdateExpression: update.build(),
      ExpressionAttributeNames: update.getNames(),
      ExpressionAttributeValues: update.getValues(),
      TableName: this.getTableName(),
      Key: indexKey,
    };
  }

  /* istanbul ignore next */
  _makePutParams({ data } = {}, pk, sk) {
    let appliedData = this.model.schema.applyAttributeSetters(data);
    let { updatedKeys, setAttributes } = this._getPutKeys(
      pk,
      sk && sk.facets,
      appliedData,
    );
    let translatedFields = this.model.schema.translateToFields(setAttributes);
    return {
      Item: {
        ...translatedFields,
        ...updatedKeys,
        [this.identifiers.entity]: this.getName(),
        [this.identifiers.version]: this.getVersion(),
      },
      TableName: this.getTableName(),
    };
  }

  _maybeApplyUpsertUpdate({ fields = [], operation, updateProxy, update }) {
    for (let [field, value] of fields) {
      const name = this.model.schema.translationForRetrieval[field];
      if (name) {
        const attribute = this.model.schema.attributes[name];
        if (
          this.model.schema.readOnlyAttributes.has(name) &&
          (!attribute || !attribute.indexes || attribute.indexes.length === 0)
        ) {
          /*
						// this should be considered but is likely overkill at best and unexpected at worst.
						// It also is likely symbolic of a deeper issue. That said maybe it could be helpful
						// in the future? It is unclear, if this were added, whether this should get the
						// default value and then call the setter on the defaultValue. That would at least
						// make parity between upsert and a create (without including the attribute) and then
						// an "update"

						const defaultValue = attribute.default();
						const valueIsNumber = typeof value === 'number';
						const resolvedDefaultValue  = typeof defaultValue === 'number' ? defaultValue : 0;
						if (operation === UpsertOperations.subtract && valueIsNumber) {
							value = resolvedDefaultValue - value;
						} else if (operation === UpsertOperations.add && valueIsNumber) {
							value = resolvedDefaultValue + value;
					// }
					*/
          update.set(field, value, ItemOperations.ifNotExists);
        } else {
          updateProxy.performOperation({
            value,
            operation,
            path: name,
            force: true,
          });
        }
      } else {
        // I think this is for keys
        update.set(field, value, operation);
      }
    }
  }

  _makeUpsertParams({ update, upsert } = {}) {
    return {
      TableName: this.getTableName(),
      UpdateExpression: update.build(),
      ExpressionAttributeNames: update.getNames(),
      ExpressionAttributeValues: update.getValues(),
      Key: upsert.indexKey,
    };
  }

  _updateExpressionBuilder(data) {
    let accessPattern =
      this.model.translations.indexes.fromIndexToAccessPattern[TableIndex];
    let skip = [
      // Removing readOnly from here because this should have been validated earlier in the process. Not checking
      // readOnly here also allows `watch` properties to circumnavigate the readOnly check for attributes that
      // should be calculated but not updatable by the user.
      // ...this.model.schema.getReadOnly(),

      // ...this.model.facets.fields,
      this.model.indexes[accessPattern].pk.field,
      this.model.indexes[accessPattern].sk.field,
    ];
    return this._expressionAttributeBuilder(data, ItemOperations.set, { skip });
  }

  _queryKeyExpressionAttributeBuilder(index, pk, ...sks) {
    let translate = { ...this.model.translations.keys[index] };
    let restrict = ["pk"];
    let keys = { pk };
    sks = sks.filter((sk) => sk !== undefined);

    for (let i = 0; i < sks.length; i++) {
      let id = `sk${i + 1}`;
      keys[id] = sks[i];
      restrict.push(id);
      translate[id] = translate["sk"];
    }

    let keyExpressions = this._expressionAttributeBuilder(
      keys,
      ItemOperations.set,
      {
        translate,
        restrict,
      },
    );

    return {
      ExpressionAttributeNames: Object.assign(
        {},
        keyExpressions.ExpressionAttributeNames,
      ),
      ExpressionAttributeValues: Object.assign(
        {},
        keyExpressions.ExpressionAttributeValues,
      ),
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
        throw new e.ElectroError(
          e.ErrorCodes.MissingAttribute,
          `Item is missing attributes: ${u.commaSeparatedString(missing)}`,
        );
      }
    }

    for (let prop in item) {
      if (reject.includes(prop)) {
        throw new Error(`Invalid attribute ${prop}`);
      }
      if (restrict.length && !restrict.includes(prop)) {
        throw new Error(
          `${prop} is not a valid attribute: ${u.commaSeparatedString(
            restrict,
          )}`,
        );
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

  _makeQueryKeys(state, options) {
    let consolidatedQueryFacets = this._consolidateQueryFacets(
      state.query.keys.sk,
    );
    switch (state.query.type) {
      case QueryTypes.is:
        return this._makeIndexKeys({
          index: state.query.index,
          pkAttributes: state.query.keys.pk,
          skAttributes: consolidatedQueryFacets,
          indexType: state.query.options.indexType,
          queryType: state.query.type,
          isCollection: state.query.options._isCollectionQuery,
        });
      default:
        return this._makeIndexKeysWithoutTail(
          state,
          consolidatedQueryFacets,
          options,
        );
    }
  }

  /* istanbul ignore next */
  _queryParams(state = {}, options = {}) {
    const indexKeys = this._makeQueryKeys(state, options);
    let parameters = {};
    switch (state.query.type) {
      case QueryTypes.is:
        parameters = this._makeIsQueryParams(
          state.query,
          state.query.index,
          state.query.filter[ExpressionTypes.FilterExpression],
          indexKeys.pk,
          ...indexKeys.sk,
        );
        break;
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
      case QueryTypes.clustered_collection:
        parameters = this._makeBeginsWithQueryParams(
          state.query.options,
          state.query.index,
          state.query.filter[ExpressionTypes.FilterExpression],
          indexKeys.pk,
          ...indexKeys.sk,
        );
        break;
      case QueryTypes.between:
        parameters = this._makeBetweenQueryParams(
          state.query.options,
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
          indexKeys,
          options,
          state.query.options,
        );
        break;
      default:
        throw new Error(`Invalid query type: ${state.query.type}`);
    }

    const appliedParameters = this._applyParameterOptions({
      params: parameters,
      options,
    });

    return this._applyProjectionExpressions({
      parameters: appliedParameters,
      config: options,
    });
  }

  _makeBetweenQueryParams(queryOptions, index, filter, pk, ...sk) {
    let keyExpressions = this._queryKeyExpressionAttributeBuilder(
      index,
      pk,
      ...sk,
    );

    delete keyExpressions.ExpressionAttributeNames["#sk2"];

    const customExpressions = {
      names: (queryOptions.expressions && queryOptions.expressions.names) || {},
      values:
        (queryOptions.expressions && queryOptions.expressions.values) || {},
      expression:
        (queryOptions.expressions && queryOptions.expressions.expression) || "",
    };

    let params = {
      TableName: this.getTableName(),
      ExpressionAttributeNames: this._mergeExpressionsAttributes(
        filter.getNames(),
        keyExpressions.ExpressionAttributeNames,
        customExpressions.names,
      ),
      ExpressionAttributeValues: this._mergeExpressionsAttributes(
        filter.getValues(),
        keyExpressions.ExpressionAttributeValues,
        customExpressions.values,
      ),
      KeyConditionExpression: `#pk = :pk and #sk1 BETWEEN :sk1 AND :sk2`,
    };

    if (index) {
      params["IndexName"] = index;
    }

    let expressions = [customExpressions.expression, filter.build()]
      .filter(Boolean)
      .join(" AND ");

    if (expressions.length) {
      params.FilterExpression = expressions;
    }

    return params;
  }

  _makeInclusiveQueryParams(options, index, filter, pk, sk, type) {
    let keyExpressions = this._queryKeyExpressionAttributeBuilder(
      index,
      pk,
      sk,
    );
    let KeyConditionExpression = "#pk = :pk";

    if (
      this.model.lookup.indexHasSortKeys[index] &&
      (typeof keyExpressions.ExpressionAttributeValues[":sk1"] === "number" ||
        (typeof keyExpressions.ExpressionAttributeValues[":sk1"] === "string" &&
          keyExpressions.ExpressionAttributeValues[":sk1"].length > 0))
    ) {
      if (type === QueryTypes.is) {
        KeyConditionExpression = `${KeyConditionExpression} and #sk1 = :sk1`;
      } else {
        KeyConditionExpression = `${KeyConditionExpression} and begins_with(#sk1, :sk1)`;
      }
    } else {
      delete keyExpressions.ExpressionAttributeNames["#sk1"];
      delete keyExpressions.ExpressionAttributeValues[":sk1"];
    }

    let customExpressions = {
      names: (options.expressions && options.expressions.names) || {},
      values: (options.expressions && options.expressions.values) || {},
      expression: (options.expressions && options.expressions.expression) || "",
    };

    let params = {
      KeyConditionExpression,
      TableName: this.getTableName(),
      ExpressionAttributeNames: this._mergeExpressionsAttributes(
        filter.getNames(),
        keyExpressions.ExpressionAttributeNames,
        customExpressions.names,
      ),
      ExpressionAttributeValues: this._mergeExpressionsAttributes(
        filter.getValues(),
        keyExpressions.ExpressionAttributeValues,
        customExpressions.values,
      ),
    };

    if (index) {
      params["IndexName"] = index;
    }

    let expressions = [customExpressions.expression, filter.build()]
      .filter(Boolean)
      .join(" AND ");

    if (expressions.length) {
      params.FilterExpression = expressions;
    }

    return params;
  }

  _makeIsQueryParams(query, index, filter, pk, sk) {
    const { options, keys } = query;

    const providedSks = keys.provided
      .filter((item) => item.type === KeyTypes.sk)
      .map((item) => item.attribute);

    const skDefinition =
      (this.model.facets.byIndex[index] &&
        this.model.facets.byIndex[index].sk &&
        Array.isArray(this.model.facets.byIndex[index].sk) &&
        this.model.facets.byIndex[index].sk) ||
      [];

    const skCompositeAttributes = new Set(skDefinition);
    const skIsCompletelyFulfilled =
      skCompositeAttributes.size === providedSks.length &&
      skDefinition.every((attr) => providedSks.includes(attr));

    if (skIsCompletelyFulfilled) {
      return this._makeInclusiveQueryParams(
        options,
        index,
        filter,
        pk,
        sk,
        QueryTypes.is,
      );
    } else {
      return this._makeBeginsWithQueryParams(options, index, filter, pk, sk);
    }
  }

  _makeBeginsWithQueryParams(options, index, filter, pk, sk) {
    return this._makeInclusiveQueryParams(
      options,
      index,
      filter,
      pk,
      sk,
      QueryTypes.begins,
    );
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

  _getComparisonOperator(comparison, skType, comparisonType) {
    if (skType === "number") {
      return Comparisons[comparison];
    } else if (
      comparisonType === ComparisonTypes.v2
    ) {
      return KeyAttributesComparisons[comparison];
    } else {
      return Comparisons[comparison];
    }
  }

  /* istanbul ignore next */
  _makeComparisonQueryParams(
    index = TableIndex,
    comparison = "",
    filter = {},
    indexKeys = {},
    options = {},
    queryOptions = {},
  ) {
    const { pk } = indexKeys;
    const sk = indexKeys.sk[0];

    let operator = this._getComparisonOperator(
      comparison,
      typeof sk,
      options.compare,
    );
    if (!operator) {
      throw new Error(
        `Unexpected comparison operator "${comparison}", expected ${u.commaSeparatedString(
          Object.keys(KeyAttributesComparisons),
        )}`,
      );
    }

    let customExpressions = {
      names: (queryOptions.expressions && queryOptions.expressions.names) || {},
      values:
        (queryOptions.expressions && queryOptions.expressions.values) || {},
      expression:
        (queryOptions.expressions && queryOptions.expressions.expression) || "",
    };

    let keyExpressions = this._queryKeyExpressionAttributeBuilder(
      index,
      pk,
      sk,
    );

    let params = {
      TableName: this.getTableName(),
      ExpressionAttributeNames: this._mergeExpressionsAttributes(
        filter.getNames(),
        keyExpressions.ExpressionAttributeNames,
        customExpressions.names,
      ),
      ExpressionAttributeValues: this._mergeExpressionsAttributes(
        filter.getValues(),
        keyExpressions.ExpressionAttributeValues,
        customExpressions.values,
      ),
      KeyConditionExpression: `#pk = :pk and #sk1 ${operator} :sk1`,
    };

    if (index) {
      params["IndexName"] = index;
    }

    let expressions = [customExpressions.expression, filter.build()]
      .filter(Boolean)
      .join(" AND ");

    if (expressions.length) {
      params.FilterExpression = expressions;
    }

    return params;
  }

  _expectIndexFacets(
    attributes,
    facets,
    { utilizeIncludedOnlyIndexes, skipConditionCheck } = {},
  ) {
    let [isIncomplete, { incomplete, complete }] = this._getIndexImpact(
      attributes,
      facets,
      { utilizeIncludedOnlyIndexes, skipConditionCheck },
    );

    if (isIncomplete) {
      let incompleteAccessPatterns = incomplete.map(
        ({ index }) =>
          this.model.translations.indexes.fromIndexToAccessPattern[index],
      );
      let missingFacets = incomplete.reduce(
        (result, { missing }) => [...result, ...missing],
        [],
      );

      throw new e.ElectroError(
        e.ErrorCodes.IncompleteCompositeAttributes,
        `Incomplete composite attributes: Without the composite attributes ${u.commaSeparatedString(
          missingFacets,
        )} the following access patterns cannot be updated: ${u.commaSeparatedString(
          incompleteAccessPatterns.filter((val) => val !== undefined),
        )}. If a composite attribute is readOnly and cannot be set, use the 'composite' chain method on update to supply the value for key formatting purposes.`,
      );
    }

    return complete;
  }

  _makeKeysFromAttributes(indexes, attributes, conditions) {
    let indexKeys = {};
    for (let [index, keyTypes] of Object.entries(indexes)) {
      const shouldMakeKeys =
        !this._indexConditionIsDefined(index) || conditions[index];
      if (!shouldMakeKeys && index !== TableIndex) {
        continue;
      }

      let keys = this._makeIndexKeys({
        index,
        pkAttributes: attributes,
        skAttributes: [attributes],
      });
      if (keyTypes.pk || keyTypes.sk) {
        indexKeys[index] = {};
      }

      if (keyTypes.pk && keys.pk) {
        indexKeys[index].pk = keys.pk;
      }

      if (keyTypes.sk && keys.sk) {
        indexKeys[index].sk = keys.sk;
      } else {
        // at least return the same datatype (array)
        indexKeys[index].sk = [];
      }
    }
    return indexKeys;
  }

  _makePutKeysFromAttributes(indexes, attributes) {
    let indexKeys = {};
    for (let index of indexes) {
      const shouldMakeKeys =
        this.model.indexes[
          this.model.translations.indexes.fromIndexToAccessPattern[index]
        ].condition(attributes);
      if (!shouldMakeKeys) {
        continue;
      }
      indexKeys[index] = this._makeIndexKeys({
        index,
        pkAttributes: attributes,
        skAttributes: [attributes],
      });
    }
    return indexKeys;
  }

  _getPutKeys(pk, sk, set, validationAssistance) {
    let setAttributes = set;
    let updateIndex = TableIndex;
    let keyTranslations = this.model.translations.keys;
    let keyAttributes = { ...sk, ...pk };
    let completeFacets = this._expectIndexFacets(
      { ...setAttributes, ...validationAssistance },
      { ...keyAttributes },
      { set },
    );

    let deletedKeys = [];
    for (const [indexName, condition] of Object.entries(
      completeFacets.conditions,
    )) {
      if (!condition) {
        deletedKeys.push(this.model.translations.keys[indexName][KeyTypes.pk]);
        if (this.model.translations.keys[indexName][KeyTypes.sk]) {
          deletedKeys.push(
            this.model.translations.keys[indexName][KeyTypes.sk],
          );
        }
      }
    }

    // complete facets, only includes impacted facets which likely does not include the updateIndex which then needs to be added here.
    if (!completeFacets.indexes.includes(updateIndex)) {
      completeFacets.indexes.push(updateIndex);
    }
    let composedKeys = this._makePutKeysFromAttributes(completeFacets.indexes, {
      ...keyAttributes,
      ...setAttributes,
    });
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
      if (keys.pk !== undefined && keys.pk !== "") {
        updatedKeys[pk] = keys.pk;
      }
      if (sk && keys.sk[0] !== undefined && keys.sk[0] !== "") {
        updatedKeys[sk] = keys.sk[0];
      }
    }

    return { indexKey, updatedKeys, setAttributes, deletedKeys };
  }

  _getUpdatedKeys(pk, sk, set, removed, composite = {}) {
    let updateIndex = TableIndex;
    let keyTranslations = this.model.translations.keys;
    let keyAttributes = { ...sk, ...pk };

    let completeFacets = this._expectIndexFacets(
      { ...set },
      { ...composite, ...keyAttributes },
      { utilizeIncludedOnlyIndexes: true },
    );

    const removedKeyImpact = this._expectIndexFacets(
      { ...removed },
      { ...keyAttributes },
      { skipConditionCheck: true },
    );

    // complete facets, only includes impacted facets which likely does not include the updateIndex which then needs to be added here.
    if (completeFacets.impactedIndexTypes[updateIndex] === undefined) {
      completeFacets.impactedIndexTypes[updateIndex] = {
        pk: "pk",
        sk: "sk",
      };
    }

    let composedKeys = this._makeKeysFromAttributes(
      completeFacets.impactedIndexTypes,
      { ...composite, ...set, ...keyAttributes },
      completeFacets.conditions,
    );

    let updatedKeys = {};
    let deletedKeys = [];
    let indexKey = {};
    for (const [indexName, condition] of Object.entries(
      completeFacets.conditions,
    )) {
      if (!condition) {
        deletedKeys.push(this.model.translations.keys[indexName][KeyTypes.pk]);
        if (this.model.translations.keys[indexName][KeyTypes.sk]) {
          deletedKeys.push(
            this.model.translations.keys[indexName][KeyTypes.sk],
          );
        }
      }
    }

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
        let noAttributeSk =
          indexHasSk && this.model.facets.byIndex[index].sk.length === 0;
        let hasPrefix =
          indexHasSk && this.model.prefixes[index].sk.prefix !== undefined;
        let hasPostfix =
          indexHasSk && this.model.prefixes[index].sk.prefix !== undefined;
        if (noImpactSk && noAttributeSk) {
          let key = hasPrefix ? this.model.prefixes[index].sk.prefix : "";
          if (hasPostfix) {
            key = `${key}${this.model.prefixes[index].sk.postfix}`;
          }
          if (key) {
            keys.sk.push(key);
          }
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

  _indexConditionIsDefined(index) {
    const definition =
      this.model.indexes[
        this.model.translations.indexes.fromIndexToAccessPattern[index]
      ];
    return definition && definition.conditionDefined;
  }

  /* istanbul ignore next */
  _getIndexImpact(
    attributes = {},
    included = {},
    { utilizeIncludedOnlyIndexes, skipConditionCheck } = {},
  ) {
    // beware: this entire algorithm stinks and needs to be completely refactored. It does redundant loops and fights
    // itself the whole way through. I am sorry.
    let includedFacets = Object.keys(included);
    let impactedIndexes = {};
    let conditions = {};
    let impactedIndexTypes = {};
    let impactedIndexTypeSources = {};
    let completedIndexes = [];
    let facets = {};
    for (let [attribute, indexes] of Object.entries(this.model.facets.byAttr)) {
      if (attributes[attribute] !== undefined) {
        facets[attribute] = attributes[attribute];
        indexes.forEach((definition) => {
          const { index, type } = definition;
          impactedIndexes[index] = impactedIndexes[index] || {};
          impactedIndexes[index][type] = impactedIndexes[index][type] || [];
          impactedIndexes[index][type].push(attribute);
          impactedIndexTypes[index] = impactedIndexTypes[index] || {};
          impactedIndexTypes[index][type] =
            this.model.translations.keys[index][type];

          impactedIndexTypeSources[index] =
            impactedIndexTypeSources[index] || {};
          impactedIndexTypeSources[index][type] =
            ImpactedIndexTypeSource.provided;
        });
      }
    }

    // this function is used to determine key impact for update `set`, update `delete`, and `put`. This block is currently only used by update `set`
    if (utilizeIncludedOnlyIndexes) {
      for (const [index, { pk, sk }] of Object.entries(
        this.model.facets.byIndex,
      )) {
        // The main table index is handled somewhere else (messy I know), and we only want to do this processing if an
        // index condition is defined for backwards compatibility. Backwards compatibility is not required for this
        // change, but I have paranoid concerns of breaking changes around sparse indexes.
        if (index === TableIndex || !this._indexConditionIsDefined(index)) {
          continue;
        }

        if (
          pk &&
          pk.length &&
          pk.every((attr) => included[attr] !== undefined)
        ) {
          pk.forEach((attr) => {
            facets[attr] = included[attr];
          });
          impactedIndexes[index] = impactedIndexes[index] || {};
          impactedIndexes[index][KeyTypes.pk] = [...pk];
          impactedIndexTypes[index] = impactedIndexTypes[index] || {};
          impactedIndexTypes[index][KeyTypes.pk] =
            this.model.translations.keys[index][KeyTypes.pk];

          // flagging the impactedIndexTypeSource as `composite` means the entire key is only being impacted because
          // all composites are in `included`. This will help us determine if we need to evaluate the `condition`
          // callback for the index. If both the `sk` and `pk` were impacted because of `included` then we can skip
          // the condition check because the index doesn't need to be recalculated;
          impactedIndexTypeSources[index] =
            impactedIndexTypeSources[index] || {};
          impactedIndexTypeSources[index][KeyTypes.pk] =
            impactedIndexTypeSources[index][KeyTypes.pk] ||
            ImpactedIndexTypeSource.composite;
        }

        if (
          sk &&
          sk.length &&
          sk.every((attr) => included[attr] !== undefined)
        ) {
          if (this.model.translations.keys[index][KeyTypes.sk]) {
            sk.forEach((attr) => {
              facets[attr] = included[attr];
            });
            impactedIndexes[index] = impactedIndexes[index] || {};
            impactedIndexes[index][KeyTypes.sk] = [...sk];
            impactedIndexTypes[index] = impactedIndexTypes[index] || {};
            impactedIndexTypes[index][KeyTypes.sk] =
              this.model.translations.keys[index][KeyTypes.sk];

            // flagging the impactedIndexTypeSource as `composite` means the entire key is only being impacted because
            // all composites are in `included`. This will help us determine if we need to evaluate the `condition`
            // callback for the index. If both the `sk` and `pk` were impacted because of `included` then we can skip
            // the condition check because the index doesn't need to be recalculated;
            impactedIndexTypeSources[index] =
              impactedIndexTypeSources[index] || {};
            impactedIndexTypeSources[index][KeyTypes.sk] =
              impactedIndexTypeSources[index][KeyTypes.sk] ||
              ImpactedIndexTypeSource.composite;
          }
        }
      }
    }

    let indexesWithMissingComposites = Object.entries(
      this.model.facets.byIndex,
    ).map(([index, definition]) => {
      const { pk, sk } = definition;
      let impacted = impactedIndexes[index];
      let impact = {
        index,
        definition,
        missing: [],
      };
      if (impacted) {
        let missingPk =
          impacted[KeyTypes.pk] && impacted[KeyTypes.pk].length !== pk.length;
        let missingSk =
          impacted[KeyTypes.sk] && impacted[KeyTypes.sk].length !== sk.length;
        if (missingPk) {
          impact.missing = [
            ...impact.missing,
            ...pk.filter((attr) => {
              return (
                !impacted[KeyTypes.pk].includes(attr) &&
                !includedFacets.includes(attr)
              );
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
    });

    let incomplete = [];
    for (const { index, missing, definition } of indexesWithMissingComposites) {
      const indexConditionIsDefined = this._indexConditionIsDefined(index);

      // `skipConditionCheck` is being used by update `remove`. If Attributes are being removed then the condition check
      // is meaningless and ElectroDB should uphold its obligation to keep keys and attributes in sync.
      // `index === TableIndex` is a special case where we don't need to check the condition because the main table is immutable
      // `!this._indexConditionIsDefined(index)` means the index doesn't have a condition defined, so we can skip the check
      if (
        skipConditionCheck ||
        index === TableIndex ||
        !indexConditionIsDefined
      ) {
        incomplete.push({ index, missing });
        conditions[index] = true;
        continue;
      }

      const memberAttributeIsImpacted =
        impactedIndexTypeSources[index] &&
        (impactedIndexTypeSources[index][KeyTypes.pk] ===
          ImpactedIndexTypeSource.provided ||
          impactedIndexTypeSources[index][KeyTypes.sk] ===
            ImpactedIndexTypeSource.provided);
      const allMemberAttributesAreIncluded = definition.all.every(
        ({ name }) => included[name] !== undefined,
      );

      if (memberAttributeIsImpacted || allMemberAttributesAreIncluded) {
        // the `missing` array will contain indexes that are partially provided, but that leaves cases where the pk or
        // sk of an index is complete but not both. Both cases are invalid if `indexConditionIsDefined=true`
        const missingAttributes = definition.all
          .filter(
            ({ name }) =>
              (attributes[name] === undefined &&
                included[name] === undefined) ||
              missing.includes(name),
          )
          .map(({ name }) => name);

        if (missingAttributes.length) {
          throw new e.ElectroError(
            e.ErrorCodes.IncompleteIndexCompositesAttributesProvided,
            `Incomplete composite attributes provided for index ${index}. Write operations that include composite attributes, for indexes with a condition callback defined, must always provide values for every index composite. This is to ensure consistency between index values and attribute values. Missing composite attributes identified: ${u.commaSeparatedString(
              missingAttributes,
            )}`,
          );
        }

        const accessPattern =
          this.model.translations.indexes.fromIndexToAccessPattern[index];
        let shouldMakeKeys = !!this.model.indexes[accessPattern].condition({
          ...attributes,
          ...included,
        });

        // this helps identify which conditions were checked (key is present) and what the result was (true/false)
        conditions[index] = shouldMakeKeys;
        if (!shouldMakeKeys) {
          continue;
        }
      } else {
        incomplete.push({ index, missing });
      }
    }

    incomplete = incomplete.filter(({ missing }) => missing.length);

    let isIncomplete = !!incomplete.length;
    let complete = {
      facets,
      indexes: completedIndexes,
      impactedIndexTypes,
      conditions,
    };
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
        if (value !== undefined) {
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
    let [incompletePk, missing, matching] = this._expectProperties(
      obj,
      properties,
    );
    if (incompletePk) {
      throw new e.ElectroError(
        e.ErrorCodes.IncompleteCompositeAttributes,
        `Incomplete or invalid ${type} supplied. Missing properties: ${u.commaSeparatedString(
          missing,
        )}`,
      );
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

  _makeKeyFixings({
    service,
    entity,
    version = "1",
    tableIndex,
    modelVersion,
    isClustered,
    schema,
  }) {
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
        cast: tableIndex.pk.cast,
      },
      sk: {
        prefix: "",
        casing: tableIndex.sk.casing,
        isCustom: tableIndex.customFacets.sk,
        field: tableIndex.sk ? tableIndex.sk.field : undefined,
        cast: tableIndex.sk ? tableIndex.sk.cast : undefined,
      },
    };

    let pk = `$${service}`;
    let sk = "";
    let entityKeys = "";
    let postfix = "";
    // If the index is in a collections, prepend the sk;
    let collectionPrefix = this._makeCollectionPrefix(tableIndex.collection);
    if (validations.isStringHasLength(collectionPrefix)) {
      sk = `${collectionPrefix}`;
      entityKeys += `#${entity}`;
    } else {
      entityKeys += `$${entity}`;
    }

    /** start beta/v1 condition **/
    if (modelVersion === ModelVersions.beta) {
      pk = `${pk}_${version}`;
    } else {
      entityKeys = `${entityKeys}_${version}`;
    }
    /** end beta/v1 condition **/

    if (isClustered) {
      postfix = entityKeys;
    } else {
      sk = `${sk}${entityKeys}`;
    }

    // If no sk, append the sk properties to the pk
    if (Object.keys(tableIndex.sk).length === 0) {
      pk += sk;
      if (isClustered) {
        pk += postfix;
      }
    }

    // If keys are not custom, set the prefixes
    if (!keys.pk.isCustom) {
      if (tableIndex.scope) {
        pk = `${pk}_${tableIndex.scope}`;
      }
      keys.pk.prefix = u.formatKeyCasing(pk, tableIndex.pk.casing);
    }

    if (!keys.sk.isCustom) {
      keys.sk.prefix = u.formatKeyCasing(sk, tableIndex.sk.casing);
      keys.sk.postfix = u.formatKeyCasing(postfix, tableIndex.sk.casing);
    }

    const castKeys = tableIndex.hasSk
      ? [tableIndex.pk, tableIndex.sk]
      : [tableIndex.pk];

    for (const castKey of castKeys) {
      if (castKey.cast === CastKeyOptions.string) {
        keys[castKey.type].cast = CastKeyOptions.string;
      } else if (
        // custom keys with only one facet and no labels are numeric by default
        castKey.cast === undefined &&
        castKey.isCustom &&
        castKey.facets.length === 1 &&
        castKey.facetLabels.every(({ label }) => !label) &&
        schema.attributes[castKey.facets[0]] &&
        schema.attributes[castKey.facets[0]].type === "number"
      ) {
        keys[castKey.type].cast = CastKeyOptions.number;
      } else if (
        castKey.cast === CastKeyOptions.number &&
        castKey.facets.length === 1 &&
        schema.attributes[castKey.facets[0]] &&
        ["number", "string", "boolean"].includes(
          schema.attributes[castKey.facets[0]].type,
        )
      ) {
        keys[castKey.type].cast = CastKeyOptions.number;
      } else if (
        castKey.cast === CastKeyOptions.number &&
        castKey.facets.length > 1
      ) {
        throw new e.ElectroError(
          e.ErrorCodes.InvalidModel,
          `Invalid "cast" option provided for ${
            castKey.type
          } definition on index "${u.formatIndexNameForDisplay(
            tableIndex.index,
          )}". Keys can only be cast to 'number' if they are a composite of one numeric attribute.`,
        );
      } else {
        keys[castKey.type].cast = CastKeyOptions.string;
      }
    }

    return keys;
  }

  _formatKeyCasing(accessPattern, key) {
    const casing =
      this.model.indexes[accessPattern] !== undefined
        ? this.model.indexes[accessPattern].sk.casing
        : undefined;

    return u.formatKeyCasing(key, casing);
  }

  _validateIndex(index) {
    if (!this.model.facets.byIndex[index]) {
      throw new Error(`Invalid index: ${index}`);
    }
  }

  _getCollectionSk(collection = "") {
    const subCollections = this.model.subCollections[collection];
    const index =
      this.model.translations.collections.fromCollectionToIndex[collection];
    const accessPattern =
      this.model.translations.indexes.fromIndexToAccessPattern[index];
    const prefixes = this.model.prefixes[index];
    const prefix = this._makeCollectionPrefix(subCollections);
    if (prefixes.sk && prefixes.sk.isCustom) {
      return "";
    }
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

  _makeKeyTransforms(queryType, options = {}) {
    const transforms = [];
    const shiftUp = (val) => u.shiftSortOrder(val, 1);
    const noop = (val) => val;
    if (options.compare !== ComparisonTypes.v2) {
      transforms.push(noop);
    } else if (queryType === QueryTypes.between) {
      transforms.push(noop, shiftUp);
    } else if (queryType === QueryTypes.lte || queryType === QueryTypes.gt) {
      transforms.push(shiftUp);
    } else {
      transforms.push(noop);
    }

    return transforms;
  }

  /* istanbul ignore next */
  _makeIndexKeysWithoutTail(state = {}, skFacets = [], options) {
    const index = state.query.index || TableIndex;
    this._validateIndex(index);
    const pkFacets = state.query.keys.pk || {};
    const excludePostfix =
      state.query.options.indexType === IndexTypes.clustered &&
      state.query.options._isCollectionQuery;
    const transforms = this._makeKeyTransforms(state.query.type, options);
    if (!skFacets.length) {
      skFacets.push({});
    }
    let facets = this.model.facets.byIndex[index];
    let prefixes = this.model.prefixes[index];
    if (!prefixes) {
      throw new Error(`Invalid index: ${index}`);
    }
    // let partitionKey = this._makeKey(prefixes.pk, facets.pk, pkFacets, this.model.facets.labels[index].pk, { excludeLabelTail: true });
    let partitionKey = this._makeKey(
      prefixes.pk,
      facets.pk,
      pkFacets,
      this.model.facets.labels[index].pk,
    );
    let pk = partitionKey.key;
    let sk = [];
    let fulfilled = false;
    if (this.model.lookup.indexHasSortKeys[index]) {
      for (let i = 0; i < skFacets.length; i++) {
        const skFacet = skFacets[i];
        const transform = transforms[i];
        let hasLabels =
          this.model.facets.labels[index] &&
          Array.isArray(this.model.facets.labels[index].sk);
        let labels = hasLabels ? this.model.facets.labels[index].sk : [];
        let sortKey = this._makeKey(prefixes.sk, facets.sk, skFacet, labels, {
          excludeLabelTail: true,
          excludePostfix,
          transform,
        });
        if (sortKey.key !== undefined) {
          sk.push(sortKey.key);
        }
        if (sortKey.fulfilled) {
          fulfilled = true;
        }
      }
    }
    return {
      pk,
      sk,
      fulfilled,
    };
  }

  /* istanbul ignore next */
  _makeIndexKeys({
    index = TableIndex,
    pkAttributes = {},
    skAttributes = [],
    queryType,
    indexType,
    isCollection = false,
  }) {
    this._validateIndex(index);
    const excludePostfix = indexType === IndexTypes.clustered && isCollection;
    const transforms = this._makeKeyTransforms(queryType);
    if (!skAttributes.length) {
      skAttributes.push({});
    }
    let facets = this.model.facets.byIndex[index];
    let prefixes = this.model.prefixes[index];
    if (!prefixes) {
      throw new Error(`Invalid index: ${index}`);
    }
    let pk = this._makeKey(
      prefixes.pk,
      facets.pk,
      pkAttributes,
      this.model.facets.labels[index].pk,
    );
    let sk = [];
    let fulfilled = false;
    if (this.model.lookup.indexHasSortKeys[index]) {
      for (let i = 0; i < skAttributes.length; i++) {
        const skFacet = skAttributes[i];
        const transform = transforms[i];
        let hasLabels =
          this.model.facets.labels[index] &&
          Array.isArray(this.model.facets.labels[index].sk);
        let labels = hasLabels ? this.model.facets.labels[index].sk : [];
        let sortKey = this._makeKey(prefixes.sk, facets.sk, skFacet, labels, {
          excludePostfix,
          transform,
        });
        if (sortKey.key !== undefined) {
          sk.push(sortKey.key);
        }
        if (sortKey.fulfilled) {
          fulfilled = true;
        }
      }
    }
    return {
      pk: pk.key,
      sk,
      fulfilled,
    };
  }

  _formatNumericCastKey(attributeName, key) {
    const fulfilled = key !== undefined;
    if (!fulfilled) {
      return {
        fulfilled,
        key,
      };
    }
    if (typeof key === "number") {
      return {
        fulfilled,
        key,
      };
    }
    if (typeof key === "string") {
      const parsed = parseInt(key);
      if (!isNaN(parsed)) {
        return {
          fulfilled,
          key: parsed,
        };
      }
    }

    if (typeof key === "boolean") {
      return {
        fulfilled,
        key: key === true ? 1 : 0,
      };
    }

    throw new e.ElectroAttributeValidationError(
      attributeName,
      `Invalid key value provided, could not cast composite attribute ${attributeName} to number for index`,
    );
  }

  /* istanbul ignore next */
  _makeKey(
    { prefix, isCustom, casing, postfix, cast } = {},
    facets = [],
    supplied = {},
    labels = [],
    { excludeLabelTail, excludePostfix, transform = (val) => val } = {},
  ) {
    if (cast === CastKeyOptions.number) {
      return this._formatNumericCastKey(facets[0], supplied[facets[0]]);
    }

    let key = prefix;
    let foundCount = 0;
    for (let i = 0; i < labels.length; i++) {
      const { name, label } = labels[i];
      const attribute = this.model.schema.getAttribute(name);
      let value = supplied[name];
      if (supplied[name] === undefined && excludeLabelTail) {
        break;
      }

      if (attribute && validations.isFunction(attribute.format)) {
        value = attribute.format(`${value}`);
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
      foundCount++;
      key = `${key}${value}`;
    }

    // when sort keys are fulfilled we need to add the entity postfix
    // this is used for cluster indexes
    const fulfilled = foundCount === labels.length;
    const shouldApplyPostfix = typeof postfix === "string" && !excludePostfix;
    if (fulfilled && shouldApplyPostfix) {
      key += postfix;
    }

    const transformedKey = transform(u.formatKeyCasing(key, casing));

    return {
      fulfilled,
      key: transformedKey,
    };
  }

  _findBestIndexKeyMatch(attributes = {}) {
    // an array of arrays, representing the order of pk and sk composites specified for each index, and then an
    // array with each access pattern occupying the same array index.
    let facets = this.model.facets.bySlot;
    // a flat array containing the match results of each access pattern, in the same array index they occur within
    // bySlot above
    let matches = [];
    for (let f = 0; f < facets.length; f++) {
      const slots = facets[f] || [];
      for (let s = 0; s < slots.length; s++) {
        const accessPatternSlot = slots[s];
        matches[s] = matches[s] || {
          index: accessPatternSlot.index,
          allKeys: false,
          hasSk: false,
          count: 0,
          done: false,
          keys: [],
        };
        // already determined to be out of contention on prior iteration
        const indexOutOfContention = matches[s].done;
        // composite shorter than other indexes
        const lacksAttributeAtSlot = !accessPatternSlot;
        // attribute at this slot is not in the object provided
        const attributeNotProvided =
          accessPatternSlot && attributes[accessPatternSlot.name] === undefined;
        // if the next attribute is a sort key then all partition keys were provided
        const nextAttributeIsSortKey =
          accessPatternSlot &&
          accessPatternSlot.next &&
          facets[f + 1][s].type === "sk";
        // if no keys are left then all attribute requirements were met (remember indexes don't require a sort key)
        const hasAllKeys = accessPatternSlot && !accessPatternSlot.next;

        // no sense iterating on items we know to be "done"
        if (
          indexOutOfContention ||
          lacksAttributeAtSlot ||
          attributeNotProvided
        ) {
          matches[s].done = true;
          continue;
        }

        // if the next attribute is a sort key (and you reached this line) then you have fulfilled all the
        // partition key requirements for this index
        if (nextAttributeIsSortKey) {
          matches[s].hasSk = true;
          // if you reached this step and there are no more attributes, then you fulfilled the index
        } else if (hasAllKeys) {
          matches[s].allKeys = true;
        }

        // number of successfully fulfilled attributes plays into the ranking heuristic
        matches[s].count++;

        // note the names/types of fulfilled attributes
        matches[s].keys.push({
          name: accessPatternSlot.name,
          type: accessPatternSlot.type,
        });
      }
    }
    // the highest count of matched attributes among all access patterns
    let max = 0;
    matches = matches
      // remove incomplete indexes
      .filter((match) => match.hasSk || match.allKeys)
      // calculate max attribute match
      .map((match) => {
        max = Math.max(max, match.count);
        return match;
      });

    // matched contains the ranked attributes. The closer an element is to zero the "higher" the rank.
    const matched = [];
    for (let m = 0; m < matches.length; m++) {
      const match = matches[m];
      // a finished primary index is most ideal (could be a get)
      const primaryIndexIsFinished = match.index === "" && match.allKeys;
      // if there is a tie for matched index attributes, primary index should win
      const primaryIndexIsMostMatched =
        match.index === "" && match.count === max;
      // composite attributes are complete
      const indexRequirementsFulfilled = match.allKeys;
      // having the most matches is important
      const hasTheMostAttributeMatches = match.count === max;
      if (primaryIndexIsFinished) {
        matched[0] = match;
      } else if (primaryIndexIsMostMatched) {
        matched[1] = match;
      } else if (indexRequirementsFulfilled) {
        matched[2] = match;
      } else if (hasTheMostAttributeMatches) {
        matched[3] = match;
      }
    }
    // find the first non-undefined element (best ranked) -- if possible
    const match = matched.find((value) => !!value);
    let keys = [];
    let index = "";
    let shouldScan = true;
    if (match) {
      keys = match.keys;
      index = match.index;
      shouldScan = false;
    }
    return { keys, index, shouldScan };
  }

  /* istanbul ignore next */
  _parseComposedKey(key = TableIndex) {
    let attributes = {};
    let names = key.match(/:[A-Z1-9]+/gi);
    if (!names) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidKeyCompositeAttributeTemplate,
        `Invalid key composite attribute template. No composite attributes provided, expected at least one composite attribute with the format ":attributeName". Received: ${key}`,
      );
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
      name: "",
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
          throw new e.ElectroError(
            e.ErrorCodes.InvalidKeyCompositeAttributeTemplate,
            `Invalid key composite attribute template. Empty expression "\${${current.name}}" provided. Expected attribute name.`,
          );
        }
        attributes.push({ name: current.name, label: current.label });
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
      attributes.push({ name: current.name, label: current.label });
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
      };
    } else if (isCustom && facets.length === 0) {
      // treat like empty array sk
      return {
        isCustom: false,
        labels: [],
        attributes: [],
      };
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
        attributes: labels.map(({ name }) => name).filter((name) => !!name),
      };
    } else if (isCustom && composite.length === 0) {
      // treat like empty array sk
      return {
        isCustom: false,
        labels: [],
        attributes: [],
      };
    } else {
      return {
        isCustom,
        labels: composite.map((name) => ({ name })),
        attributes: composite,
      };
    }
  }

  _compositeTemplateAreCompatible(parsedAttributes, composite) {
    if (
      !Array.isArray(composite) ||
      !parsedAttributes ||
      !parsedAttributes.isCustom
    ) {
      // not beholden to compatibility constraints
      return true;
    }

    return validations.stringArrayMatch(composite, parsedAttributes.attributes);
  }

  _optimizeIndexKey(keyDefinition) {
    const hasTemplate = typeof keyDefinition.template === "string";
    const hasSingleItemComposite =
      Array.isArray(keyDefinition.facets) &&
      keyDefinition.facets.length === 1 &&
      keyDefinition.facets[0] === keyDefinition.field;
    if (!hasTemplate && hasSingleItemComposite) {
      keyDefinition.facets = "${" + keyDefinition.field + "}";
    }
    return keyDefinition;
  }

  _optimizeMatchingKeyAttributes(model = {}) {
    const attributeFields = [];
    for (const name of Object.keys(model.attributes)) {
      const { field } = model.attributes[name];
      attributeFields.push(field || name);
    }
    for (const accessPattern of Object.keys(model.indexes)) {
      let { pk, sk } = model.indexes[accessPattern];
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
    let clusteredIndexes = new Set();
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
      let indexType =
        typeof index.type === "string" ? index.type : IndexTypes.isolated;
      let indexScope = index.scope || "";
      if (index.index === undefined && v.isFunction(index.condition)) {
        throw new e.ElectroError(
          e.ErrorCodes.InvalidIndexCondition,
          `The index option 'condition' is only allowed on secondary indexes`,
        );
      }

      let conditionDefined = v.isFunction(index.condition);
      let indexCondition = index.condition || (() => true);

      if (indexType === "clustered") {
        clusteredIndexes.add(accessPattern);
      }
      if (seenIndexes[indexName] !== undefined) {
        if (indexName === TableIndex) {
          throw new e.ElectroError(
            e.ErrorCodes.DuplicateIndexes,
            `Duplicate index defined in model found in Access Pattern '${accessPattern}': '${u.formatIndexNameForDisplay(
              indexName,
            )}'. This could be because you forgot to specify the index name of a secondary index defined in your model.`,
          );
        } else {
          throw new e.ElectroError(
            e.ErrorCodes.DuplicateIndexes,
            `Duplicate index defined in model found in Access Pattern '${accessPattern}': '${indexName}'`,
          );
        }
      }
      seenIndexes[indexName] = indexName;
      let hasSk = !!index.sk;
      let inCollection = !!index.collection;
      if (!hasSk && inCollection) {
        throw new e.ElectroError(
          e.ErrorCodes.CollectionNoSK,
          `Invalid Access pattern definition for '${accessPattern}': '${u.formatIndexNameForDisplay(
            indexName,
          )}', contains a collection definition without a defined SK. Collections can only be defined on indexes with a defined SK.`,
        );
      }
      let collection = index.collection || "";
      let customFacets = {
        pk: false,
        sk: false,
      };
      const pkCasing =
        KeyCasing[index.pk.casing] === undefined
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
      facets.labels[indexName]["pk"] =
        facets.labels[indexName]["pk"] || parsedPKAttributes;
      facets.labels[indexName]["sk"] =
        facets.labels[indexName]["sk"] || this._parseTemplateAttributes();
      let pk = {
        inCollection,
        accessPattern,
        index: indexName,
        casing: pkCasing,
        type: KeyTypes.pk,
        cast: index.pk.cast,
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
          cast: index.sk.cast,
          field: index.sk.field || "",
          facets: parsedSKAttributes.attributes,
          isCustom: parsedSKAttributes.isCustom,
          facetLabels: parsedSKAttributes.labels,
        };
        facets.fields.push(sk.field);
      }

      if (Array.isArray(sk.facets)) {
        let duplicates = pk.facets.filter((facet) => sk.facets.includes(facet));
        if (duplicates.length !== 0) {
          if (sk.facets.length > 1) {
            throw new e.ElectroError(
              e.ErrorCodes.DuplicateIndexCompositeAttributes,
              `The Access Pattern '${accessPattern}' contains duplicate references the composite attribute(s): ${u.commaSeparatedString(
                duplicates,
              )}. Composite attributes can only be used more than once in an index if your sort key is limitted to a single attribute. This is to prevent unexpected runtime errors related to the inability to generate keys.`,
            );
          }
        }
      }

      let definition = {
        pk,
        sk,
        hasSk,
        collection,
        customFacets,
        type: indexType,
        index: indexName,
        scope: indexScope,
        condition: indexCondition,
        conditionDefined: conditionDefined,
      };

      indexHasSubCollections[indexName] =
        inCollection && Array.isArray(collection);

      if (inCollection) {
        let collectionArray = this._toSubCollectionArray(collection);

        for (let collectionName of collectionArray) {
          if (collections[collectionName] !== undefined) {
            throw new e.ElectroError(
              e.ErrorCodes.DuplicateCollections,
              `Duplicate collection, "${collectionName}" is defined across multiple indexes "${collections[collectionName]}" and "${accessPattern}". Collections must be unique names across indexes for an Entity.`,
            );
          } else {
            collections[collectionName] = accessPattern;
          }
          collectionIndexTranslation.fromCollectionToIndex[collectionName] =
            indexName;
          collectionIndexTranslation.fromIndexToCollection[indexName] =
            collectionIndexTranslation.fromIndexToCollection[indexName] || [];
          collectionIndexTranslation.fromIndexToCollection[indexName].push(
            collection,
          );
        }
        subCollections = {
          ...subCollections,
          ...this._normalizeSubCollections(collectionArray),
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

      indexAccessPatternTransaction.fromAccessPatternToIndex[accessPattern] =
        indexName;
      indexAccessPatternTransaction.fromIndexToAccessPattern[indexName] =
        accessPattern;

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
          sk: skCasing,
        },
      };

      facets.byField = facets.byField || {};
      facets.byField[pk.field] = facets.byField[pk.field] || {};
      facets.byField[pk.field][indexName] = pk;
      if (sk.field) {
        facets.byField[sk.field] = facets.byField[sk.field] || {};
        facets.byField[sk.field][indexName] = sk;
      }

      if (seenIndexFields[pk.field] !== undefined) {
        const definition = Object.values(facets.byField[pk.field]).find(
          (definition) => definition.index !== indexName,
        );
        const definitionsMatch = validations.stringArrayMatch(
          pk.facets,
          definition.facets,
        );
        if (!definitionsMatch) {
          throw new e.ElectroError(
            e.ErrorCodes.InconsistentIndexDefinition,
            `Partition Key (pk) on Access Pattern '${u.formatIndexNameForDisplay(
              accessPattern,
            )}' is defined with the composite attribute(s) ${u.commaSeparatedString(
              pk.facets,
            )}, but the accessPattern '${u.formatIndexNameForDisplay(
              definition.index,
            )}' defines this field with the composite attributes ${u.commaSeparatedString(
              definition.facets,
            )}'. Key fields must have the same composite attribute definitions across all indexes they are involved with`,
          );
        }
        seenIndexFields[pk.field].push({ accessPattern, type: "pk" });
      } else {
        seenIndexFields[pk.field] = [];
        seenIndexFields[pk.field].push({ accessPattern, type: "pk" });
      }

      if (sk.field) {
        if (sk.field === pk.field) {
          throw new e.ElectroError(
            e.ErrorCodes.DuplicateIndexFields,
            `The Access Pattern '${u.formatIndexNameForDisplay(
              accessPattern,
            )}' references the field '${
              sk.field
            }' as the field name for both the PK and SK. Fields used for indexes need to be unique to avoid conflicts.`,
          );
        } else if (seenIndexFields[sk.field] !== undefined) {
          const isAlsoDefinedAsPK = seenIndexFields[sk.field].find(
            (field) => field.type === "pk",
          );
          if (isAlsoDefinedAsPK) {
            throw new e.ElectroError(
              e.ErrorCodes.InconsistentIndexDefinition,
              `The Sort Key (sk) on Access Pattern '${u.formatIndexNameForDisplay(
                accessPattern,
              )}' references the field '${
                pk.field
              }' which is already referenced by the Access Pattern(s) '${u.formatIndexNameForDisplay(
                isAlsoDefinedAsPK.accessPattern,
              )}' as a Partition Key. Fields mapped to Partition Keys cannot be also mapped to Sort Keys.`,
            );
          }
          const definition = Object.values(facets.byField[sk.field]).find(
            (definition) => definition.index !== indexName,
          );
          const definitionsMatch = validations.stringArrayMatch(
            sk.facets,
            definition.facets,
          );
          if (!definitionsMatch) {
            throw new e.ElectroError(
              e.ErrorCodes.DuplicateIndexFields,
              `Sort Key (sk) on Access Pattern '${u.formatIndexNameForDisplay(
                accessPattern,
              )}' is defined with the composite attribute(s) ${u.commaSeparatedString(
                sk.facets,
              )}, but the accessPattern '${u.formatIndexNameForDisplay(
                definition.index,
              )}' defines this field with the composite attributes ${u.commaSeparatedString(
                definition.facets,
              )}'. Key fields must have the same composite attribute definitions across all indexes they are involved with`,
            );
          }
          seenIndexFields[sk.field].push({ accessPattern, type: "sk" });
        } else {
          seenIndexFields[sk.field] = [];
          seenIndexFields[sk.field].push({ accessPattern, type: "sk" });
        }
      }

      attributes.forEach(({ index, type, name }, j) => {
        let next =
          attributes[j + 1] !== undefined ? attributes[j + 1].name : "";
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

      let pkTemplateIsCompatible = this._compositeTemplateAreCompatible(
        parsedPKAttributes,
        index.pk.composite,
      );
      if (!pkTemplateIsCompatible) {
        throw new e.ElectroError(
          e.ErrorCodes.IncompatibleKeyCompositeAttributeTemplate,
          `Incompatible PK 'template' and 'composite' properties for defined on index "${u.formatIndexNameForDisplay(
            indexName,
          )}". PK "template" string is defined as having composite attributes ${u.commaSeparatedString(
            parsedPKAttributes.attributes,
          )} while PK "composite" array is defined with composite attributes ${u.commaSeparatedString(
            index.pk.composite,
          )}`,
        );
      }

      if (
        index.sk !== undefined &&
        Array.isArray(index.sk.composite) &&
        typeof index.sk.template === "string"
      ) {
        let skTemplateIsCompatible = this._compositeTemplateAreCompatible(
          parsedSKAttributes,
          index.sk.composite,
        );
        if (!skTemplateIsCompatible) {
          throw new e.ElectroError(
            e.ErrorCodes.IncompatibleKeyCompositeAttributeTemplate,
            `Incompatible SK 'template' and 'composite' properties for defined on index "${u.formatIndexNameForDisplay(
              indexName,
            )}". SK "template" string is defined as having composite attributes ${u.commaSeparatedString(
              parsedSKAttributes.attributes,
            )} while SK "composite" array is defined with composite attributes ${u.commaSeparatedString(
              index.sk.composite,
            )}`,
          );
        }
      }
    }

    if (facets.byIndex[TableIndex] === undefined) {
      throw new e.ElectroError(
        e.ErrorCodes.MissingPrimaryIndex,
        "Schema is missing an index definition for the table's main index. Please update the schema to include an index without a specified name to define the table's natural index",
      );
    }

    return {
      facets,
      subCollections,
      indexHasSortKeys,
      clusteredIndexes,
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
        throw new e.ElectroError(
          e.ErrorCodes.InvalidFilter,
          `Invalid filter name: ${name}. Filter cannot be named ${u.commaSeparatedString(
            invalidFilterNames,
          )}`,
        );
      } else {
        normalized[name] = fn;
      }
    }

    return normalized;
  }

  _normalizeKeyFixings({
    service,
    entity,
    version,
    indexes,
    modelVersion,
    clusteredIndexes,
    schema,
  }) {
    let prefixes = {};
    for (let accessPattern of Object.keys(indexes)) {
      let tableIndex = indexes[accessPattern];
      prefixes[tableIndex.index] = this._makeKeyFixings({
        service,
        entity,
        version,
        tableIndex,
        modelVersion,
        isClustered: clusteredIndexes.has(accessPattern),
        schema,
      });
    }
    return prefixes;
  }

  _normalizeSubCollections(collections = []) {
    let lookup = {};
    for (let i = collections.length - 1; i >= 0; i--) {
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
    if (
      Array.isArray(collection) &&
      collection.every((col) => validations.isStringHasLength(col))
    ) {
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
      let invalidPK =
        index.pk.facets === undefined &&
        index.pk.composite === undefined &&
        index.pk.template === undefined;
      let invalidSK =
        index.sk &&
        index.sk.facets === undefined &&
        index.sk.composite === undefined &&
        index.sk.template === undefined;
      if (invalidPK) {
        throw new Error("Missing Index Composite Attributes!");
      } else if (invalidSK) {
        throw new Error("Missing Index Composite Attributes!");
      }

      if (Array.isArray(index.pk.composite)) {
        index.pk = {
          ...index.pk,
          facets: index.pk.composite,
        };
      }

      if (typeof index.pk.template === "string") {
        index.pk = {
          ...index.pk,
          facets: index.pk.template,
        };
      }

      // SK may not exist on index
      if (index.sk && Array.isArray(index.sk.composite)) {
        index.sk = {
          ...index.sk,
          facets: index.sk.composite,
        };
      }

      if (index.sk && typeof index.sk.template === "string") {
        index.sk = {
          ...index.sk,
          facets: index.sk.template,
        };
      }

      model.indexes[accessPattern] = index;
    }
    return model;
  }

  _mergeKeyDefinitions(fromIndex, fromModel) {
    let definitions = {};
    for (let indexName of Object.keys(fromIndex)) {
      let pk = fromIndex[indexName].pk;
      let sk = fromIndex[indexName].sk || { labels: [] };
      definitions[indexName] = {
        pk: [],
        sk: [],
      };
      for (let { name, label } of pk.labels) {
        if (pk.isCustom) {
          definitions[indexName].pk.push({ name, label });
        } else {
          definitions[indexName].pk.push({
            name,
            label: fromModel[name] || name,
          });
        }
      }
      for (let { name, label } of sk.labels) {
        if (sk.isCustom) {
          definitions[indexName].sk.push({ name, label });
        } else {
          definitions[indexName].sk.push({
            name,
            label: u.getFirstDefined(fromModel[name], name),
          });
        }
      }
    }

    return definitions;
  }

  _parseModel(model, config = {}) {
    /** start beta/v1 condition **/
    let modelVersion = u.getModelVersion(model);
    let service, entity, version, table, name;
    switch (modelVersion) {
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
      clusteredIndexes,
      indexHasSortKeys,
      indexAccessPattern,
      indexHasSubCollections,
    } = this._normalizeIndexes(model.indexes);
    let schema = new Schema(model.attributes, facets, {
      getClient: () => this.client,
      isRoot: true,
    });

    let filters = this._normalizeFilters(model.filters);
    // todo: consider a rename
    let prefixes = this._normalizeKeyFixings({
      service,
      entity,
      version,
      indexes,
      modelVersion,
      clusteredIndexes,
      schema,
    });

    // apply model defined labels
    let schemaDefinedLabels = schema.getLabels();
    const deconstructors = {};
    facets.labels = this._mergeKeyDefinitions(
      facets.labels,
      schemaDefinedLabels,
    );
    for (let indexName of Object.keys(facets.labels)) {
      const accessPattern =
        indexAccessPattern.fromIndexToAccessPattern[indexName];
      indexes[accessPattern].pk.labels = facets.labels[indexName].pk;
      indexes[accessPattern].sk.labels = facets.labels[indexName].sk;

      const keyTypes = prefixes[indexName] || {};
      deconstructors[indexName] = {};
      for (const keyType in keyTypes) {
        const prefixes = keyTypes[keyType];
        const labels = facets.labels[indexName][keyType] || [];
        const attributes = schema.attributes;
        deconstructors[indexName][keyType] = this._createKeyDeconstructor(
          prefixes,
          labels,
          attributes,
        );
        for (let attributeName in schema.attributes) {
          const { field } = schema.attributes[attributeName];
          if (indexes[accessPattern][keyType].field === field) {
            indexes[accessPattern][keyType].isFieldRef = true;
          }
        }
      }
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
        clusteredIndexes,
        indexHasSortKeys,
        indexHasSubCollections,
      },
      translations: {
        keys: indexField,
        indexes: indexAccessPattern,
        collections: indexCollection,
      },
      keys: {
        deconstructors,
      },
      original: model,
    };
  }
}

function getEntityIdentifiers(entities) {
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
      versionField: entity.identifiers.version,
    });
  }
  return identifiers;
}

function matchToEntityAlias({
  paramItem,
  identifiers,
  record,
  entities = {},
  allowMatchOnKeys = false,
} = {}) {
  let entity;
  if (paramItem && v.isFunction(paramItem[TransactionCommitSymbol])) {
    const committed = paramItem[TransactionCommitSymbol]();
    entity = committed.entity;
  }

  let entityAlias;
  for (let { name, version, nameField, versionField, alias } of identifiers) {
    if (
      entity &&
      entity.model.entity === name &&
      entity.model.version === version
    ) {
      entityAlias = alias;
      break;
    } else if (
      record[nameField] !== undefined &&
      record[versionField] !== undefined &&
      record[nameField] === name &&
      record[versionField] === version
    ) {
      entityAlias = alias;
      break;
      // } else if (allowMatchOnKeys && entities[alias] && entities[alias].ownsKeys({keys: record})) {
      // 	if (entityAlias) {
      // 		if (alias !== entityAlias) {
      // 			throw new Error('Key ownership found to be not distinct');
      // 		}
      // 	} else {
      // 		entityAlias = alias;
      // 	}
      // }
    } else if (entities[alias] && entities[alias].ownsKeys(record)) {
      entityAlias = alias;
      break;
    }
  }

  return entityAlias;
}

module.exports = {
  Entity,
  clauses,
  getEntityIdentifiers,
  matchToEntityAlias,
};

},{"./clauses":17,"./client":18,"./errors":21,"./events":22,"./filters":24,"./operations":25,"./schema":26,"./types":30,"./util":33,"./validations":34,"./where":35}],21:[function(require,module,exports){
// # Errors:
// 1000 - Configuration Errors
// 2000 - Invalid Queries
// 3000 - User Defined Errors
// 4000 - DynamoDB Errors
// 5000 - Unexpected Errors

function getHelpLink(section) {
  section = section || "unknown-error-5001";
  return `https://electrodb.dev/en/reference/errors/#${section}`;
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
    sym: ErrorCode,
  },
  InvalidOptions: {
    code: 1010,
    section: "invalid-options",
    name: "InvalidOptions",
    sym: ErrorCode,
  },
  InvalidFilter: {
    code: 1011,
    section: "filters",
    name: "InvalidFilter",
    sym: ErrorCode,
  },
  InvalidWhere: {
    code: 1012,
    section: "where",
    name: "InvalidWhere",
    sym: ErrorCode,
  },
  InvalidJoin: {
    code: 1013,
    section: "join",
    name: "InvalidJoin",
    sym: ErrorCode,
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
    sym: ErrorCode,
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
  InvalidListenerProvided: {
    code: 1020,
    section: "invalid-listener-provided",
    name: "InvalidListenerProvided",
    sym: ErrorCode,
  },
  InvalidLoggerProvided: {
    code: 1020,
    section: "invalid-listener-provided",
    name: "InvalidListenerProvided",
    sym: ErrorCode,
  },
  InvalidClientProvided: {
    code: 1021,
    section: "invalid-client-provided",
    name: "InvalidClientProvided",
    sym: ErrorCode,
  },
  InconsistentIndexDefinition: {
    code: 1022,
    section: "inconsistent-index-definition",
    name: "Inconsistent Index Definition",
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
    sym: ErrorCode,
  },
  InvalidConcurrencyOption: {
    code: 2004,
    section: "invalid-concurrency-option",
    name: "InvalidConcurrencyOption",
    sym: ErrorCode,
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
  InvalidConversionKeysProvided: {
    code: 2007,
    section: "invalid-conversion-values-provided",
    name: "InvalidConversionKeysProvided",
    sym: ErrorCode,
  },
  InvalidConversionCursorProvided: {
    code: 2008,
    section: "invalid-conversion-values-provided",
    name: "InvalidConversionCursorProvided",
    sym: ErrorCode,
  },
  InvalidConversionCompositeProvided: {
    code: 2009,
    section: "invalid-conversion-values-provided",
    name: "InvalidConversionCompositeProvided",
    sym: ErrorCode,
  },
  DuplicateUpdateCompositesProvided: {
    code: 2010,
    section: "duplicate-update-composites-provided",
    name: "DuplicateUpdateCompositesProvided",
    sym: ErrorCode,
  },
  InvalidIndexCondition: {
    code: 2011,
    section: "invalid-index-option",
    name: "InvalidIndexOption",
    sym: ErrorCode,
  },
  IncompleteIndexCompositesAttributesProvided: {
    code: 2012,
    section: "invalid-index-composite-attributes-provided",
    name: "IncompleteIndexCompositesAttributesProvided",
    sym: ErrorCode,
  },
  InvalidAttribute: {
    code: 3001,
    section: "invalid-attribute",
    name: "InvalidAttribute",
    sym: ErrorCode,
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
    sym: ErrorCode,
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
  NoOwnerForCursor: {
    code: 5004,
    section: "no-owner-for-pager",
    name: "NoOwnerForCursor",
    sym: ErrorCode,
  },
  PagerNotUnique: {
    code: 5005,
    section: "pager-not-unique",
    name: "NoOwnerForPager",
    sym: ErrorCode,
  },
};

function makeMessage(message, section) {
  return `${message} - For more detail on this error reference: ${getHelpLink(
    section,
  )}`;
}

class ElectroError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    let detail = ErrorCodes.UnknownError;
    if (code && code.sym === ErrorCode) {
      detail = code;
    }
    this._message = message;
    // this.message = `${message} - For more detail on this error reference: ${getHelpLink(detail.section)}`;
    this.message = makeMessage(message, detail.section);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ElectroError);
    }

    this.name = "ElectroError";
    this.ref = code;
    this.code = detail.code;
    this.date = Date.now();
    this.isElectroError = true;
  }
}

class ElectroValidationError extends ElectroError {
  constructor(errors = []) {
    const fields = [];
    const messages = [];
    for (let i = 0; i < errors.length; i++) {
      const error = errors[i];
      const message = error ? error._message || error.message : undefined;
      messages.push(message);
      if (error instanceof ElectroUserValidationError) {
        fields.push({
          field: error.field,
          index: error.index,
          reason: message,
          cause: error.cause,
          type: "validation",
        });
      } else if (error instanceof ElectroAttributeValidationError) {
        fields.push({
          field: error.field,
          index: error.index,
          reason: message,
          cause: error.cause || error, // error | undefined
          type: "validation",
        });
      } else if (message) {
        fields.push({
          field: "",
          index: error.index,
          reason: message,
          cause: error !== undefined ? error.cause || error : undefined,
          type: "fatal",
        });
      }
    }

    const message =
      messages
        .filter((message) => typeof message === "string" && message.length)
        .join(", ") || `Invalid value(s) provided`;

    super(ErrorCodes.InvalidAttribute, message);
    this.fields = fields;
    this.name = "ElectroValidationError";
  }
}

class ElectroUserValidationError extends ElectroError {
  constructor(field, cause) {
    let message;
    let hasCause = false;
    if (typeof cause === "string") {
      message = cause;
    } else if (
      cause !== undefined &&
      typeof cause._message === "string" &&
      cause._message.length
    ) {
      message = cause._message;
      hasCause = true;
    } else if (
      cause !== undefined &&
      typeof cause.message === "string" &&
      cause.message.length
    ) {
      message = cause.message;
      hasCause = true;
    } else {
      message = "Invalid value provided";
    }
    super(ErrorCodes.InvalidAttribute, message);
    this.field = field;
    this.name = "ElectroUserValidationError";
    if (hasCause) {
      this.cause = cause;
    }
  }
}

class ElectroAttributeValidationError extends ElectroError {
  constructor(field, reason) {
    super(ErrorCodes.InvalidAttribute, reason);
    this.field = field;
  }
}

module.exports = {
  ErrorCodes,
  ElectroError,
  ElectroValidationError,
  ElectroUserValidationError,
  ElectroAttributeValidationError,
};

},{}],22:[function(require,module,exports){
const e = require("./errors");
const v = require("./validations");

class EventManager {
  static createSafeListener(listener) {
    if (listener === undefined) {
      return undefined;
    }
    if (!v.isFunction(listener)) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidListenerProvided,
        `Provided listener is not of type 'function'`,
      );
    } else {
      return (...params) => {
        try {
          listener(...params);
        } catch (err) {
          console.error(`Error invoking user supplied listener`, err);
        }
      };
    }
  }

  static normalizeListeners(listeners = []) {
    if (!Array.isArray(listeners)) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidListenerProvided,
        `Listeners must be provided as an array of functions`,
      );
    }
    return listeners
      .map((listener) => EventManager.createSafeListener(listener))
      .filter((listener) => {
        switch (typeof listener) {
          case "function":
            return true;
          case "undefined":
            return false;
          default:
            throw new e.ElectroError(
              e.ErrorCodes.InvalidListenerProvided,
              `Provided listener is not of type 'function`,
            );
        }
      });
  }

  constructor({ listeners = [] } = {}) {
    this.listeners = EventManager.normalizeListeners(listeners);
  }

  add(listeners = []) {
    if (!Array.isArray(listeners)) {
      listeners = [listeners];
    }

    this.listeners = this.listeners.concat(
      EventManager.normalizeListeners(listeners),
    );
  }

  trigger(event, adHocListeners = []) {
    const allListeners = [
      ...this.listeners,
      ...EventManager.normalizeListeners(adHocListeners),
    ];

    for (const listener of allListeners) {
      listener(event);
    }
  }
}

module.exports = {
  EventManager,
};

},{"./errors":21,"./validations":34}],23:[function(require,module,exports){
const FilterOperations = {
  escape: {
    template: function escape(options, attr) {
      return `${attr}`;
    },
    rawValue: true,
  },
  size: {
    template: function size(options, attr, name) {
      return `size(${name})`;
    },
    strict: false,
  },
  type: {
    template: function attributeType(options, attr, name, value) {
      return `attribute_type(${name}, ${value})`;
    },
    strict: false,
  },
  ne: {
    template: function ne(options, attr, name, value) {
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
    strict: false,
  },
  lt: {
    template: function lt(options, attr, name, value) {
      return `${name} < ${value}`;
    },
    strict: false,
  },
  gte: {
    template: function gte(options, attr, name, value) {
      return `${name} >= ${value}`;
    },
    strict: false,
  },
  lte: {
    template: function lte(options, attr, name, value) {
      return `${name} <= ${value}`;
    },
    strict: false,
  },
  between: {
    template: function between(options, attr, name, value1, value2) {
      return `(${name} between ${value1} and ${value2})`;
    },
    strict: false,
  },
  begins: {
    template: function begins(options, attr, name, value) {
      return `begins_with(${name}, ${value})`;
    },
    strict: false,
  },
  exists: {
    template: function exists(options, attr, name) {
      return `attribute_exists(${name})`;
    },
    strict: false,
  },
  notExists: {
    template: function notExists(options, attr, name) {
      return `attribute_not_exists(${name})`;
    },
    strict: false,
  },
  contains: {
    template: function contains(options, attr, name, value) {
      return `contains(${name}, ${value})`;
    },
    strict: false,
  },
  notContains: {
    template: function notContains(options, attr, name, value) {
      return `not contains(${name}, ${value})`;
    },
    strict: false,
  },
  value: {
    template: function (options, attr, name, value) {
      return value;
    },
    strict: false,
    canNest: true,
  },
  name: {
    template: function (options, attr, name) {
      return name;
    },
    strict: false,
    canNest: true,
  },
  eqOrNotExists: {
    template: function eq(options, attr, name, value) {
      return `(${name} = ${value} OR attribute_not_exists(${name}))`;
    },
    strict: false,
  },
  field: {
    template: function (options, _, fieldName) {
      return fieldName !== undefined ? `${fieldName}` : "";
    },
    strict: false,
    canNest: true,
    rawField: true,
  },
};

module.exports = {
  FilterOperations,
};

},{}],24:[function(require,module,exports){
const e = require("./errors");
const { MethodTypes, ExpressionTypes } = require("./types");

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
      case MethodTypes.get:
      case MethodTypes.upsert:
        return ExpressionTypes.ConditionExpression;
      default:
        return ExpressionTypes.FilterExpression;
    }
  }

  _buildFilterAttributes(setName, setValue) {
    let attributes = {};
    for (let [name, attribute] of Object.entries(this.attributes)) {
      let filterAttribute = {};
      for (let [type, { template }] of Object.entries(this.filters)) {
        Object.defineProperty(filterAttribute, type, {
          get: () => {
            return (...values) => {
              let { prop } = setName({}, name, attribute.field);
              let attrValues = [];
              for (let value of values) {
                if (template.length > 1) {
                  attrValues.push(setValue(name, value, name));
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
      let attributes = this._buildFilterAttributes(setName, setValue);
      const expression = filterFn(attributes, ...params);
      if (typeof expression !== "string") {
        throw new e.ElectroError(
          e.ErrorCodes.InvalidFilter,
          "Invalid filter response. Expected result to be of type string",
        );
      }
      builder.add(expression);
      return state;
    };
  }

  injectFilterClauses(clauses = {}, filters = {}) {
    let injected = { ...clauses };
    let filterParents = Object.entries(injected)
      .filter((clause) => {
        let [name, { children }] = clause;
        return children.find((child) => ["go", "commit"].includes(child));
      })
      .map(([name]) => name);
    let modelFilters = Object.keys(filters);
    let filterChildren = [];
    for (let [name, filter] of Object.entries(filters)) {
      filterChildren.push(name);
      injected[name] = {
        name: name,
        action: this.buildClause(filter),
        children: ["params", "go", "commit", "filter", ...modelFilters],
      };
    }
    filterChildren.push("filter");
    injected["filter"] = {
      name: "filter",
      action: (entity, state, fn) => {
        return this.buildClause(fn)(entity, state);
      },
      children: ["params", "go", "commit", "filter", ...modelFilters],
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

},{"./errors":21,"./types":30}],25:[function(require,module,exports){
const {
  AttributeTypes,
  ItemOperations,
  AttributeProxySymbol,
  BuilderTypes,
} = require("./types");
const { UpdateOperations } = require("./updateOperations");
const { FilterOperations } = require("./filterOperations");
const e = require("./errors");
const u = require("./util");

class ExpressionState {
  constructor({ prefix } = {}) {
    this.names = {};
    this.values = {};
    this.paths = {};
    this.counts = {};
    this.impacted = {};
    this.expression = "";
    this.prefix = prefix || "";
    this.refs = {};
  }

  incrementName(name) {
    if (this.counts[name] === undefined) {
      this.counts[name] = 0;
    }
    return `${this.prefix}${this.counts[name]++}`;
  }

  formatName(name = "") {
    const nameWasNotANumber = isNaN(name);
    name = `${name}`.replaceAll(/[^\w]/g, "");
    if (name.length === 0) {
      name = "p";
    } else if (nameWasNotANumber !== isNaN(name)) {
      // name became number due to replace
      name = `p${name}`;
    }
    return name;
  }

  // todo: make the structure: name, value, paths
  setName(paths, name, value) {
    name = this.formatName(name);
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
      json = `${paths.json}[${name}]`;
      expression = `${paths.expression}[${name}]`;
    }
    return { json, expression, prop };
  }

  getNames() {
    return this.names;
  }

  setValue(name, value) {
    name = this.formatName(name);
    let valueCount = this.incrementName(name);
    let expression = `:${name}${valueCount}`;
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

  setImpacted(operation, path, ref) {
    this.impacted[path] = operation;
    this.refs[path] = ref;
  }
}

class AttributeOperationProxy {
  constructor({ builder, attributes = {}, operations = {} }) {
    this.ref = {
      attributes,
      operations,
    };
    this.attributes = AttributeOperationProxy.buildAttributes(
      builder,
      attributes,
    );
    this.operations = AttributeOperationProxy.buildOperations(
      builder,
      operations,
    );
  }

  invokeCallback(op, ...params) {
    return op(this.attributes, this.operations, ...params);
  }

  performOperation({ operation, path, value, force = false }) {
    if (value === undefined) {
      return;
    }
    const parts = u.parseJSONPath(path);
    let attribute = this.attributes;
    for (let part of parts) {
      attribute = attribute[part];
    }
    if (attribute) {
      this.operations[operation](attribute, value);
      const { target } = attribute();
      if (target.readOnly && !force) {
        throw new Error(
          `Attribute "${target.path}" is Read-Only and cannot be updated`,
        );
      }
    }
  }

  fromObject(operation, record) {
    for (let path of Object.keys(record)) {
      this.performOperation({
        operation,
        path,
        value: record[path],
      });
    }
  }

  fromArray(operation, paths) {
    for (let path of paths) {
      const parts = u.parseJSONPath(path);
      let attribute = this.attributes;
      for (let part of parts) {
        attribute = attribute[part];
      }
      if (attribute) {
        this.operations[operation](attribute);
        const { target } = attribute();
        if (target.readOnly) {
          throw new Error(
            `Attribute "${target.path}" is Read-Only and cannot be updated`,
          );
        } else if (operation === ItemOperations.remove && target.required) {
          throw new Error(
            `Attribute "${target.path}" is Required and cannot be removed`,
          );
        }
      }
    }
  }

  static buildOperations(builder, operations) {
    let ops = {};
    let seen = new Map();
    for (let operation of Object.keys(operations)) {
      let { template, canNest, rawValue, rawField } = operations[operation];
      Object.defineProperty(ops, operation, {
        get: () => {
          return (property, ...values) => {
            if (property === undefined) {
              throw new e.ElectroError(
                e.ErrorCodes.InvalidWhere,
                `Invalid/Unknown property passed in where clause passed to operation: '${operation}'`,
              );
            }
            if (property[AttributeProxySymbol]) {
              const { commit, target } = property();
              const fixedValues = values
                .map((value) => target.applyFixings(value))
                .filter((value) => value !== undefined);
              const isFilterBuilder = builder.type === BuilderTypes.filter;
              const takesValueArgument = template.length > 3;
              const isAcceptableValue = fixedValues.every((value) => {
                const seenAttributes = seen.get(value);
                if (seenAttributes) {
                  return seenAttributes.every((v) => target.acceptable(v));
                }
                return target.acceptable(value);
              });

              const shouldCommit =
                // if it is a filterBuilder than we don't care what they pass because the user needs more freedom here
                isFilterBuilder ||
                // if the operation does not take a value argument then not committing here could cause problems.
                // this should be revisited to make more robust, we could hypothetically store the commit in the
                // "seen" map for when the value is used, but that's a lot of new complexity
                !takesValueArgument ||
                // if the operation takes a value, we should determine if that value is acceptable. For
                // example, in the cases of a "set" we check to see if it is empty, or if the value is
                // undefined, we should not commit. The "fixedValues" length check is because the
                // "fixedValues" array has been filtered for undefined, so no length there indicates an
                // undefined value was passed.
                (takesValueArgument &&
                  isAcceptableValue &&
                  fixedValues.length > 0);

              if (!shouldCommit) {
                return "";
              }

              const paths = commit();
              const attributeValues = [];
              let hasNestedValue = false;
              for (let fixedValue of fixedValues) {
                if (seen.has(fixedValue)) {
                  attributeValues.push(fixedValue);
                  hasNestedValue = true;
                } else {
                  let attributeValueName = builder.setValue(
                    target.name,
                    fixedValue,
                  );
                  builder.setPath(paths.json, {
                    value: fixedValue,
                    name: attributeValueName,
                  });
                  attributeValues.push(attributeValueName);
                }
              }

              const options = {
                nestedValue: hasNestedValue,
                createValue: (name, value) =>
                  builder.setValue(`${target.name}_${name}`, value),
              };

              const formatted = template(
                options,
                target,
                paths.expression,
                ...attributeValues,
              );
              builder.setImpacted(operation, paths.json, target);
              if (canNest) {
                seen.set(paths.expression, attributeValues);
                seen.set(formatted, attributeValues);
              }

              if (
                builder.type === BuilderTypes.update &&
                formatted &&
                typeof formatted.operation === "string" &&
                typeof formatted.expression === "string"
              ) {
                builder.add(formatted.operation, formatted.expression);
                return formatted.expression;
              }

              return formatted;
            } else if (rawValue) {
              // const {json, expression} = builder.setName({}, property, property);
              let attributeValueName = builder.setValue(property, property);
              builder.setPath(property, {
                value: property,
                name: attributeValueName,
              });
              const formatted = template({}, attributeValueName);
              seen.set(attributeValueName, [property]);
              seen.set(formatted, [property]);
              return formatted;
            } else if (rawField) {
              const { prop, expression } = builder.setName(
                {},
                property,
                property,
              );
              const formatted = template({}, null, prop);
              seen.set(expression, [property]);
              seen.set(formatted, [property]);
              return formatted;
            } else {
              throw new e.ElectroError(
                e.ErrorCodes.InvalidWhere,
                `Invalid Attribute in where clause passed to operation '${operation}'. Use injected attributes only.`,
              );
            }
          };
        },
      });
    }
    return ops;
  }

  static pathProxy(build) {
    return new Proxy(() => build(), {
      get: (_, prop, o) => {
        if (prop === AttributeProxySymbol) {
          return true;
        } else {
          return AttributeOperationProxy.pathProxy(() => {
            const { commit, root, target, builder } = build();
            const attribute = target.getChild(prop);
            const nestedAny =
              attribute.type === AttributeTypes.any &&
              // if the name doesn't match that's because we are nested under 'any'
              attribute.name !== prop;
            let field;
            if (attribute === undefined) {
              throw new Error(
                `Invalid attribute "${prop}" at path "${target.path}.${prop}"`,
              );
            } else if (nestedAny) {
              field = prop;
            } else {
              field = attribute.field;
            }

            return {
              root,
              builder,
              nestedAny,
              target: attribute,
              commit: () => {
                const paths = commit();
                return builder.setName(paths, prop, field);
              },
            };
          });
        }
      },
    });
  }

  static buildAttributes(builder, attributes) {
    let attr = {};
    for (let [name, attribute] of Object.entries(attributes)) {
      Object.defineProperty(attr, name, {
        get: () => {
          return AttributeOperationProxy.pathProxy(() => {
            return {
              root: attribute,
              target: attribute,
              builder,
              commit: () =>
                builder.setName({}, attribute.name, attribute.field),
            };
          });
        },
      });
    }
    return attr;
  }
}

const FilterOperationNames = Object.keys(FilterOperations).reduce(
  (ops, name) => {
    ops[name] = name;
    return ops;
  },
  {},
);

const UpdateOperationNames = Object.keys(UpdateOperations).reduce(
  (ops, name) => {
    ops[name] = name;
    return ops;
  },
  {},
);

module.exports = {
  UpdateOperations,
  UpdateOperationNames,
  FilterOperations,
  FilterOperationNames,
  ExpressionState,
  AttributeOperationProxy,
};

},{"./errors":21,"./filterOperations":23,"./types":30,"./updateOperations":32,"./util":33}],26:[function(require,module,exports){
const {
  CastTypes,
  ValueTypes,
  KeyCasing,
  AttributeTypes,
  AttributeMutationMethods,
  AttributeWildCard,
  PathTypes,
  TableIndex,
  ItemOperations,
  DataOptions,
} = require("./types");
const AttributeTypeNames = Object.keys(AttributeTypes);
const ValidFacetTypes = [
  AttributeTypes.string,
  AttributeTypes.number,
  AttributeTypes.boolean,
  AttributeTypes.enum,
];
const e = require("./errors");
const u = require("./util");
const v = require("./validations");
const { DynamoDBSet } = require("./set");

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
    this.padding = definition.padding;
    this.applyFixings = this._makeApplyFixings(definition);
    this.applyPadding = this._makePadding(definition);
    this.indexes = [...(definition.indexes || [])];
    let { isWatched, isWatcher, watchedBy, watching, watchAll } =
      Attribute._destructureWatcher(definition);
    this._isWatched = isWatched;
    this._isWatcher = isWatcher;
    this.watchedBy = watchedBy;
    this.watching = watching;
    this.watchAll = watchAll;
    let { type, enumArray } = this._makeType(this.name, definition);
    this.type = type;
    this.enumArray = enumArray;
    this.parentType = definition.parentType;
    this.parentPath = definition.parentPath;
    const pathType = this.getPathType(this.type, this.parentType);
    const path = Attribute.buildPath(this.name, pathType, this.parentPath);
    const fieldPath = Attribute.buildPath(
      this.field,
      pathType,
      this.parentType,
    );
    this.path = path;
    this.fieldPath = fieldPath;
    this.traverser = new AttributeTraverser(definition.traverser);
    this.traverser.setPath(this.path, this);
    this.traverser.setPath(this.fieldPath, this);
    this.traverser.asChild(this.name, this);
    this.parent = { parentType: this.type, parentPath: this.path };
    this.get = this._makeGet(definition.get);
    this.set = this._makeSet(definition.set);
    this.getClient = definition.getClient;
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

    return { items, properties };
  }

  static buildChildListItems(definition, parent) {
    const { items, getClient } = definition;
    const prop = { ...items, ...parent };
    // The use of "*" is to ensure the child's name is "*" when added to the traverser and searching for the children of a list
    return Schema.normalizeAttributes(
      { "*": prop },
      {},
      { getClient, traverser: parent.traverser, parent },
    ).attributes["*"];
  }

  static buildChildSetItems(definition, parent) {
    const { items, getClient } = definition;

    const allowedTypes = [
      AttributeTypes.string,
      AttributeTypes.boolean,
      AttributeTypes.number,
      AttributeTypes.enum,
    ];
    if (!Array.isArray(items) && !allowedTypes.includes(items)) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidAttributeDefinition,
        `Invalid "items" definition for Set attribute: "${
          definition.path
        }". Acceptable item types include ${u.commaSeparatedString(
          allowedTypes,
        )}`,
      );
    }
    const prop = { type: items, ...parent };
    return Schema.normalizeAttributes(
      { prop },
      {},
      { getClient, traverser: parent.traverser, parent },
    ).attributes.prop;
  }

  static buildChildMapProperties(definition, parent) {
    const { properties, getClient } = definition;
    if (!properties || typeof properties !== "object") {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidAttributeDefinition,
        `Invalid "properties" definition for Map attribute: "${definition.path}". The "properties" definition must describe the attributes that the Map will accept`,
      );
    }
    const attributes = {};
    for (let name of Object.keys(properties)) {
      attributes[name] = { ...properties[name], ...parent };
    }
    return Schema.normalizeAttributes(
      attributes,
      {},
      { getClient, traverser: parent.traverser, parent },
    );
  }

  static buildPath(name, type, parentPath) {
    if (!parentPath) return name;
    switch (type) {
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
    let watchingArr = watchAll ? [] : [...(definition.watching || [])];
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
      isWatcher,
    };
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
    };
  }

  _makeSet(set) {
    this._checkGetSet(set, "set");
    return set || ((attr) => attr);
  }

  _makeApplyFixings({
    prefix = "",
    postfix = "",
    casing = KeyCasing.none,
  } = {}) {
    return (value) => {
      if (value === undefined) {
        return;
      }

      if ([AttributeTypes.string, AttributeTypes.enum].includes(this.type)) {
        value = `${prefix}${value}${postfix}`;
      }

      return u.formatAttributeCasing(value, casing);
    };
  }

  _makeStructureKey() {
    return (key) => {
      return this.applyPadding(key);
    };
  }

  _isPaddingEligible(padding = {}) {
    return !!padding && padding.length && v.isStringHasLength(padding.char);
  }

  _makePadding({ padding = {} }) {
    return (value) => {
      if (typeof value !== "string") {
        return value;
      } else if (this._isPaddingEligible(padding)) {
        return u.addPadding({ padding, value });
      } else {
        return value;
      }
    };
  }

  _makeRemoveFixings({
    prefix = "",
    postfix = "",
    casing = KeyCasing.none,
  } = {}) {
    return (key) => {
      let value = "";
      if (
        ![AttributeTypes.string, AttributeTypes.enum].includes(this.type) ||
        typeof key !== "string"
      ) {
        value = key;
      } else if (prefix.length > 0 && key.length > prefix.length) {
        for (let i = prefix.length; i < key.length - postfix.length; i++) {
          value += key[i];
        }
      } else {
        value = key;
      }

      return value;
    };
  }

  _makeDestructureKey({
    prefix = "",
    postfix = "",
    casing = KeyCasing.none,
    padding = {},
  } = {}) {
    return (key) => {
      let value = "";
      if (
        ![AttributeTypes.string, AttributeTypes.enum].includes(this.type) ||
        typeof key !== "string"
      ) {
        return key;
      } else if (key.length > prefix.length) {
        value = u.removeFixings({ prefix, postfix, value: key });
      } else {
        value = key;
      }

      // todo: if an attribute is also used as a pk or sk directly in one index, but a composite in another, then padding is going to be broken
      // if (padding && padding.length) {
      // 	value = u.removePadding({padding, value});
      // }

      return value;
    };
  }

  acceptable(val) {
    return val !== undefined;
  }

  getPathType(type, parentType) {
    if (
      parentType === AttributeTypes.list ||
      parentType === AttributeTypes.set
    ) {
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
    } else if (
      !isNaN(path) &&
      (this.type === AttributeTypes.list || this.type === AttributeTypes.set)
    ) {
      // if they're asking for a number, and this is a list, children will be under "*"
      return this.traverser.getChild("*");
    } else {
      return this.traverser.getChild(path);
    }
  }

  _checkGetSet(val, type) {
    if (typeof val !== "function" && val !== undefined) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidAttributeDefinition,
        `Invalid "${type}" property for attribute ${this.path}. Please ensure value is a function or undefined.`,
      );
    }
  }

  _makeCast(name, cast) {
    if (cast !== undefined && !CastTypes.includes(cast)) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidAttributeDefinition,
        `Invalid "cast" property for attribute: "${name}". Acceptable types include ${CastTypes.join(
          ", ",
        )}`,
      );
    } else if (cast === AttributeTypes.string) {
      return (val) => {
        if (val === undefined) {
          // todo: #electroerror
          throw new Error(
            `Attribute ${name} is undefined and cannot be cast to type ${cast}`,
          );
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
          throw new Error(
            `Attribute ${name} is undefined and cannot be cast to type ${cast}`,
          );
        } else if (typeof val === "number") {
          return val;
        } else {
          let results = Number(val);
          if (isNaN(results)) {
            // todo: #electroerror
            throw new Error(
              `Attribute ${name} cannot be cast to type ${cast}. Doing so results in NaN`,
            );
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
        try {
          let isValid = !!definition(val);
          return [
            isValid,
            isValid
              ? []
              : [
                  new e.ElectroUserValidationError(
                    this.path,
                    "Invalid value provided",
                  ),
                ],
          ];
        } catch (err) {
          return [false, [new e.ElectroUserValidationError(this.path, err)]];
        }
      };
    } else if (definition instanceof RegExp) {
      return (val) => {
        if (val === undefined) {
          return [true, []];
        }
        let isValid = definition.test(val);
        let reason = [];
        if (!isValid) {
          reason.push(
            new e.ElectroUserValidationError(
              this.path,
              `Invalid value for attribute "${this.path}": Failed model defined regex`,
            ),
          );
        }
        return [isValid, reason];
      };
    } else {
      return () => [true, []];
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
    if (Array.isArray(definition.type)) {
      type = AttributeTypes.enum;
      enumArray = [...definition.type];
      // } else if (definition.type === AttributeTypes.set && Array.isArray(definition.items)) {
      // type = AttributeTypes.enumSet;
      // enumArray = [...definition.items];
    } else {
      type = definition.type || "string";
    }
    if (!AttributeTypeNames.includes(type)) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidAttributeDefinition,
        `Invalid "type" property for attribute: "${name}". Acceptable types include ${AttributeTypeNames.join(
          ", ",
        )}`,
      );
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
      let reason = [];
      if (this.required) {
        reason.push(
          new e.ElectroAttributeValidationError(
            this.path,
            `Invalid value type at entity path: "${this.path}". Value is required.`,
          ),
        );
      }
      return [!this.required, reason];
    }
    let isTyped = false;
    let reason = [];
    switch (this.type) {
      case AttributeTypes.enum:
        // case AttributeTypes.enumSet:
        // isTyped = this.enumArray.every(enumValue => {
        // 	const val = Array.isArray(value) ? value : [value];
        // 	return val.includes(enumValue);
        // })
        isTyped = this.enumArray.includes(value);
        if (!isTyped) {
          reason.push(
            new e.ElectroAttributeValidationError(
              this.path,
              `Invalid value type at entity path: "${
                this.path
              }". Value not found in set of acceptable values: ${u.commaSeparatedString(
                this.enumArray,
              )}`,
            ),
          );
        }
        break;
      case AttributeTypes.any:
      case AttributeTypes.static:
      case AttributeTypes.custom:
        isTyped = true;
        break;
      case AttributeTypes.string:
      case AttributeTypes.number:
      case AttributeTypes.boolean:
      default:
        isTyped = typeof value === this.type;
        if (!isTyped) {
          reason.push(
            new e.ElectroAttributeValidationError(
              this.path,
              `Invalid value type at entity path: "${
                this.path
              }". Received value of type "${typeof value}", expected value of type "${
                this.type
              }"`,
            ),
          );
        }
        break;
    }
    return [isTyped, reason];
  }

  isValid(value) {
    try {
      let [isTyped, typeErrorReason] = this._isType(value);
      let [isValid, validationError] = isTyped
        ? this.validate(value)
        : [false, []];
      let errors = [...typeErrorReason, ...validationError].filter(
        (value) => value !== undefined,
      );
      return [isTyped && isValid, errors];
    } catch (err) {
      return [false, [err]];
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
    let [isValid, validationErrors] = this.isValid(value);
    if (!isValid) {
      throw new e.ElectroValidationError(validationErrors);
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
      traverser: this.traverser,
    });
    this.properties = properties;
    this.isRoot = !!definition.isRoot;
    this.get = this._makeGet(definition.get, properties);
    this.set = this._makeSet(definition.set, properties);
  }

  _makeGet(get, properties) {
    this._checkGetSet(get, "get");
    const getter =
      get ||
      ((val) => {
        const isEmpty = !val || Object.keys(val).length === 0;
        const isNotRequired = !this.required;
        const doesNotHaveDefault = this.default === undefined;
        const isRoot = this.isRoot;
        if (isEmpty && isRoot && isNotRequired && doesNotHaveDefault) {
          return undefined;
        }
        return val;
      });
    return (values, siblings) => {
      const data = {};

      if (this.hidden) {
        return;
      }

      if (values === undefined) {
        if (!get) {
          return undefined;
        }
        return getter(data, siblings);
      }

      for (const name of Object.keys(properties.attributes)) {
        const attribute = properties.attributes[name];
        if (values[attribute.field] !== undefined) {
          let results = attribute.get(values[attribute.field], { ...values });
          if (results !== undefined) {
            data[name] = results;
          }
        }
      }

      return getter(data, siblings);
    };
  }

  _makeSet(set, properties) {
    this._checkGetSet(set, "set");
    const setter =
      set ||
      ((val) => {
        const isEmpty = !val || Object.keys(val).length === 0;
        const isNotRequired = !this.required;
        const doesNotHaveDefault = this.default === undefined;
        const defaultIsValue = this.default === val;
        const isRoot = this.isRoot;
        if (defaultIsValue) {
          return val;
        } else if (isEmpty && isRoot && isNotRequired && doesNotHaveDefault) {
          return undefined;
        } else {
          return val;
        }
      });

    return (values, siblings) => {
      const data = {};
      if (values === undefined) {
        if (!set) {
          return undefined;
        }
        return setter(values, siblings);
      }
      for (const name of Object.keys(properties.attributes)) {
        const attribute = properties.attributes[name];
        if (values[name] !== undefined) {
          const results = attribute.set(values[name], { ...values });
          if (results !== undefined) {
            data[attribute.field] = results;
          }
        }
      }
      return setter(data, siblings);
    };
  }

  _isType(value) {
    if (value === undefined) {
      let reason = [];
      if (this.required) {
        reason.push(
          new e.ElectroAttributeValidationError(
            this.path,
            `Invalid value type at entity path: "${this.path}". Value is required.`,
          ),
        );
      }
      return [!this.required, reason];
    }
    const valueType = getValueType(value);
    if (valueType !== ValueTypes.object) {
      return [
        false,
        [
          new e.ElectroAttributeValidationError(
            this.path,
            `Invalid value type at entity path "${this.path}. Received value of type "${valueType}", expected value of type "object"`,
          ),
        ],
      ];
    }
    let reason = [];
    const [childrenAreValid, childErrors] = this._validateChildren(value);
    if (!childrenAreValid) {
      reason = childErrors;
    }
    return [childrenAreValid, reason];
  }

  _validateChildren(value) {
    const valueType = getValueType(value);
    const attributes = this.properties.attributes;
    let errors = [];
    if (valueType === ValueTypes.object) {
      for (const child of Object.keys(attributes)) {
        const [isValid, errorValues] = attributes[child].isValid(
          value === undefined ? value : value[child],
        );
        if (!isValid) {
          errors = [...errors, ...errorValues];
        }
      }
    } else if (valueType !== ValueTypes.object) {
      errors.push(
        new e.ElectroAttributeValidationError(
          this.path,
          `Invalid value type at entity path: "${this.path}". Expected value to be an object to fulfill attribute type "${this.type}"`,
        ),
      );
    } else if (this.properties.hasRequiredAttributes) {
      errors.push(
        new e.ElectroAttributeValidationError(
          this.path,
          `Invalid value type at entity path: "${
            this.path
          }". Map attribute requires at least the properties ${u.commaSeparatedString(
            Object.keys(attributes),
          )}`,
        ),
      );
    }
    return [errors.length === 0, errors];
  }

  val(value) {
    const incomingIsEmpty = value === undefined;
    let fromDefault = false;
    let data;
    if (value === undefined) {
      data = this.default();
      if (data !== undefined) {
        fromDefault = true;
      }
    } else {
      data = value;
    }

    const valueType = getValueType(data);

    if (data === undefined) {
      return data;
    } else if (valueType !== "object") {
      throw new e.ElectroAttributeValidationError(
        this.path,
        `Invalid value type at entity path: "${this.path}". Expected value to be an object to fulfill attribute type "${this.type}"`,
      );
    }

    const response = {};

    for (const name of Object.keys(this.properties.attributes)) {
      const attribute = this.properties.attributes[name];
      const results = attribute.val(data[attribute.name]);
      if (results !== undefined) {
        response[name] = results;
      }
    }

    if (
      Object.keys(response).length === 0 &&
      !fromDefault &&
      this.isRoot &&
      !this.required &&
      incomingIsEmpty
    ) {
      return undefined;
    }

    return response;
  }
}

class ListAttribute extends Attribute {
  constructor(definition) {
    super(definition);
    const items = Attribute.buildChildListItems(definition, {
      parentType: this.type,
      parentPath: this.path,
      traverser: this.traverser,
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
    };
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
    };
  }

  _validateArrayValue(value) {
    const reason = [];
    const valueType = getValueType(value);
    if (value !== undefined && valueType !== ValueTypes.array) {
      return [
        false,
        [
          new e.ElectroAttributeValidationError(
            this.path,
            `Invalid value type at entity path "${this.path}. Received value of type "${valueType}", expected value of type "array"`,
          ),
        ],
      ];
    } else {
      return [true, []];
    }
  }

  _isType(value) {
    if (value === undefined) {
      let reason = [];
      if (this.required) {
        reason.push(
          new e.ElectroAttributeValidationError(
            this.path,
            `Invalid value type at entity path: "${this.path}". Value is required.`,
          ),
        );
      }
      return [!this.required, reason];
    }

    const [isValidArray, errors] = this._validateArrayValue(value);
    if (!isValidArray) {
      return [isValidArray, errors];
    }
    let reason = [];
    const [childrenAreValid, childErrors] = this._validateChildren(value);
    if (!childrenAreValid) {
      reason = childErrors;
    }
    return [childrenAreValid, reason];
  }

  _validateChildren(value) {
    const valueType = getValueType(value);
    const errors = [];
    if (valueType === ValueTypes.array) {
      for (const i in value) {
        const [isValid, errorValues] = this.items.isValid(value[i]);
        if (!isValid) {
          for (const err of errorValues) {
            if (
              err instanceof e.ElectroAttributeValidationError ||
              err instanceof e.ElectroUserValidationError
            ) {
              err.index = parseInt(i);
            }
            errors.push(err);
          }
        }
      }
    } else {
      errors.push(
        new e.ElectroAttributeValidationError(
          this.path,
          `Invalid value type at entity path: "${this.path}". Expected value to be an Array to fulfill attribute type "${this.type}"`,
        ),
      );
    }
    return [errors.length === 0, errors];
  }

  val(value) {
    const getValue = (v) => {
      v = this.cast(v);
      if (v === undefined) {
        v = this.default();
      }
      return v;
    };

    const data = value === undefined ? getValue(value) : value;

    if (data === undefined) {
      return data;
    } else if (!Array.isArray(data)) {
      throw new e.ElectroAttributeValidationError(
        this.path,
        `Invalid value type at entity path "${
          this.path
        }. Received value of type "${getValueType(
          value,
        )}", expected value of type "array"`,
      );
    }

    const response = [];
    for (const d of data) {
      const results = this.items.val(d);
      if (results !== undefined) {
        response.push(results);
      }
    }

    return response;
  }
}

class SetAttribute extends Attribute {
  constructor(definition) {
    super(definition);
    const items = Attribute.buildChildSetItems(definition, {
      parentType: this.type,
      parentPath: this.path,
      traverser: this.traverser,
    });
    this.items = items;
    this.get = this._makeGet(definition.get, items);
    this.set = this._makeSet(definition.set, items);
    this.validate = this._makeSetValidate(definition);
  }

  _makeSetValidate(definition) {
    const validate = this._makeValidate(definition.validate);
    return (value) => {
      switch (getValueType(value)) {
        case ValueTypes.array:
          return validate([...value]);
        case ValueTypes.aws_set:
          return validate([...value.values]);
        case ValueTypes.set:
          return validate(Array.from(value));
        default:
          return validate(value);
      }
    };
  }

  fromDDBSet(value) {
    switch (getValueType(value)) {
      case ValueTypes.aws_set:
        return [...value.values];
      case ValueTypes.set:
        return Array.from(value);
      default:
        return value;
    }
  }

  _createDDBSet(value) {
    const client = this.getClient();
    if (client && typeof client.createSet === "function") {
      value = Array.isArray(value) ? Array.from(new Set(value)) : value;
      return client.createSet(value, { validate: true });
    } else {
      return new DynamoDBSet(value, this.items.type);
    }
  }

  acceptable(val) {
    return Array.isArray(val) ? val.length > 0 : this.items.acceptable(val);
  }

  toDDBSet(value) {
    const valueType = getValueType(value);
    let array;
    switch (valueType) {
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
        throw new e.ElectroAttributeValidationError(
          this.path,
          `Invalid attribute value supplied to "set" attribute "${this.path}". Received value of type "${valueType}". Set values must be supplied as either Arrays, native JavaScript Set objects, DocumentClient Set objects, strings, or numbers.`,
        );
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
      const data = this.fromDDBSet(values);
      const results = getter(data, siblings);
      if (results !== undefined) {
        // if not undefined, try to convert, else no need to return
        return this.fromDDBSet(results);
      }
    };
  }

  _makeSet(set, items) {
    this._checkGetSet(set, "set");
    const setter = set || ((attr) => attr);
    return (values, siblings) => {
      const results = setter(this.fromDDBSet(values), siblings);
      if (results !== undefined) {
        return this.toDDBSet(results);
      }
    };
  }

  _isType(value) {
    if (value === undefined) {
      const reason = [];
      if (this.required) {
        reason.push(
          new e.ElectroAttributeValidationError(
            this.path,
            `Invalid value type at entity path: "${this.path}". Value is required.`,
          ),
        );
      }
      return [!this.required, reason];
    }

    let reason = [];
    const [childrenAreValid, childErrors] = this._validateChildren(value);
    if (!childrenAreValid) {
      reason = childErrors;
    }
    return [childrenAreValid, reason];
  }

  _validateChildren(value) {
    const valueType = getValueType(value);
    let errors = [];
    let arr = [];
    if (valueType === ValueTypes.array) {
      arr = value;
    } else if (valueType === ValueTypes.set) {
      arr = Array.from(value);
    } else if (valueType === ValueTypes.aws_set) {
      arr = value.values;
    } else {
      errors.push(
        new e.ElectroAttributeValidationError(
          this.path,
          `Invalid value type at attribute path: "${this.path}". Expected value to be an Expected value to be an Array, native JavaScript Set objects, or DocumentClient Set objects to fulfill attribute type "${this.type}"`,
        ),
      );
    }
    for (const item of arr) {
      const [isValid, errorValues] = this.items.isValid(item);
      if (!isValid) {
        errors = [...errors, ...errorValues];
      }
    }
    return [errors.length === 0, errors];
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
  constructor(
    properties = {},
    facets = {},
    { traverser = new AttributeTraverser(), getClient, parent, isRoot } = {},
  ) {
    this._validateProperties(properties, parent);
    let schema = Schema.normalizeAttributes(properties, facets, {
      traverser,
      getClient,
      parent,
      isRoot,
    });
    this.getClient = getClient;
    this.attributes = schema.attributes;
    this.enums = schema.enums;
    this.translationForTable = schema.translationForTable;
    this.translationForRetrieval = schema.translationForRetrieval;
    this.hiddenAttributes = schema.hiddenAttributes;
    this.readOnlyAttributes = schema.readOnlyAttributes;
    this.requiredAttributes = schema.requiredAttributes;
    this.translationForWatching = this._formatWatchTranslations(
      this.attributes,
    );
    this.traverser = traverser;
    this.isRoot = !!isRoot;
  }

  static normalizeAttributes(
    attributes = {},
    facets = {},
    { traverser, getClient, parent, isRoot } = {},
  ) {
    const attributeHasParent = !!parent;
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
      if (
        typeof attribute === AttributeTypes.string ||
        Array.isArray(attribute)
      ) {
        attribute = {
          type: attribute,
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
              e.ErrorCodes.InvalidIndexWithAttributeName,
              `Invalid definition for "${
                definition.type
              }" field on index "${u.formatIndexNameForDisplay(
                indexName,
              )}". The ${definition.type} field "${
                definition.field
              }" shares a field name with an attribute defined on the Entity, and therefore is not allowed to contain composite references to other attributes. Please either change the field name of the attribute, or redefine the index to use only the single attribute "${
                definition.field
              }".`,
            );
          }
          if (definition.isCustom) {
            const keyFieldLabels =
              facets.labels[indexName][definition.type].labels;
            // I am not sure how more than two would happen but it would mean either
            // 1. Code prior has an unknown edge-case.
            // 2. Method is being incorrectly used.
            if (keyFieldLabels.length > 2) {
              throw new e.ElectroError(
                e.ErrorCodes.InvalidIndexWithAttributeName,
                `Unexpected definition for "${
                  definition.type
                }" field on index "${u.formatIndexNameForDisplay(
                  indexName,
                )}". The ${definition.type} field "${
                  definition.field
                }" shares a field name with an attribute defined on the Entity, and therefore is not possible to have more than two labels as part of it's template. Please either change the field name of the attribute, or reformat the key template to reduce all pre-fixing or post-fixing text around the attribute reference to two.`,
              );
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
            if (
              attribute.type !== AttributeTypes.string &&
              !Array.isArray(attribute.type)
            ) {
              if (prefix.length > 0 || postfix.length > 0) {
                throw new e.ElectroError(
                  e.ErrorCodes.InvalidIndexWithAttributeName,
                  `definition for "${
                    definition.type
                  }" field on index "${u.formatIndexNameForDisplay(
                    indexName,
                  )}". Index templates may only have prefix or postfix values on "string" or "enum" type attributes. The ${
                    definition.type
                  } field "${field}" is type "${
                    attribute.type
                  }", and therefore cannot be used with prefixes or postfixes. Please either remove the prefixed or postfixed values from the template or change the field name of the attribute.`,
                );
              }
            }
          } else {
            // Upstream middleware should have taken care of this. An error here would mean:
            // 1. Code prior has an unknown edge-case.
            // 2. Method is being incorrectly used.
            throw new e.ElectroError(
              e.ErrorCodes.InvalidIndexCompositeWithAttributeName,
              `Unexpected definition for "${
                definition.type
              }" field on index "${u.formatIndexNameForDisplay(
                indexName,
              )}". The ${definition.type} field "${
                definition.field
              }" shares a field name with an attribute defined on the Entity, and therefore must be defined with a template. Please either change the field name of the attribute, or add a key template to the "${
                definition.type
              }" field on index "${u.formatIndexNameForDisplay(
                indexName,
              )}" with the value: "\${${definition.field}}"`,
            );
          }

          if (definition.inCollection) {
            throw new e.ElectroError(
              e.ErrorCodes.InvalidCollectionOnIndexWithAttributeFieldNames,
              `Invalid use of a collection on index "${u.formatIndexNameForDisplay(
                indexName,
              )}". The ${definition.type} field "${
                definition.field
              }" shares a field name with an attribute defined on the Entity, and therefore the index is not allowed to participate in a Collection. Please either change the field name of the attribute, or remove all collection(s) from the index.`,
            );
          }

          if (definition.field === field) {
            if (attribute.padding !== undefined) {
              throw new e.ElectroError(
                e.ErrorCodes.InvalidAttributeDefinition,
                `Invalid padding definition for the attribute "${name}". Padding is not currently supported for attributes that are also defined as table indexes.`,
              );
            }
          }
        }
      }

      let isKey =
        !!facets.byIndex &&
        facets.byIndex[TableIndex].all.find((facet) => facet.name === name);
      let definition = {
        name,
        field,
        getClient,
        casing,
        prefix,
        postfix,
        traverser,
        isKeyField: isKeyField || isKey,
        isRoot: !!isRoot,
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
        padding: attribute.padding,
      };

      if (definition.type === AttributeTypes.custom) {
        definition.type = AttributeTypes.any;
      }

      if (attribute.watch !== undefined) {
        if (attribute.watch === AttributeWildCard) {
          definition.watchAll = true;
          definition.watching = [];
        } else if (Array.isArray(attribute.watch)) {
          definition.watching = attribute.watch;
        } else {
          throw new e.ElectroError(
            e.ErrorCodes.InvalidAttributeWatchDefinition,
            `Attribute Validation Error. The attribute '${name}' is defined to "watch" an invalid value of: '${attribute.watch}'. The watch property must either be a an array of attribute names, or the single string value of "${WatchAll}".`,
          );
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

      if (
        facets.byAttr &&
        facets.byAttr[definition.name] !== undefined &&
        !ValidFacetTypes.includes(definition.type) &&
        !Array.isArray(definition.type)
      ) {
        let assignedIndexes = facets.byAttr[name].map((assigned) =>
          assigned.index === "" ? "Table Index" : assigned.index,
        );
        throw new e.ElectroError(
          e.ErrorCodes.InvalidAttributeDefinition,
          `Invalid composite attribute definition: Composite attributes must be one of the following: ${ValidFacetTypes.join(
            ", ",
          )}. The attribute "${name}" is defined as being type "${
            attribute.type
          }" but is a composite attribute of the following indexes: ${assignedIndexes.join(
            ", ",
          )}`,
        );
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

      switch (definition.type) {
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
          watchingUnknownAttributes.push({ attribute, watched });
        }
      } else if (normalized[watched].isWatcher()) {
        for (let attribute of watchedAttributes[watched]) {
          watchedWatchers.push({ attribute, watched });
        }
      }
    }

    if (watchingUnknownAttributes.length > 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidAttributeWatchDefinition,
        `Attribute Validation Error. The following attributes are defined to "watch" invalid/unknown attributes: ${watchingUnknownAttributes
          .map(({ watched, attribute }) => `"${attribute}"->"${watched}"`)
          .join(", ")}.`,
      );
    }

    if (watchedWatchers.length > 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidAttributeWatchDefinition,
        `Attribute Validation Error. Attributes may only "watch" other attributes also watch attributes. The following attributes are defined with ineligible attributes to watch: ${watchedWatchers
          .map(({ attribute, watched }) => `"${attribute}"->"${watched}"`)
          .join(", ")}.`,
      );
    }

    let missingFacetAttributes = Array.isArray(facets.attributes)
      ? facets.attributes
          .filter(({ name }) => !normalized[name])
          .map((facet) => `"${facet.type}: ${facet.name}"`)
      : [];
    if (missingFacetAttributes.length > 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidKeyCompositeAttributeTemplate,
        `Invalid key composite attribute template. The following composite attribute attributes were described in the key composite attribute template but were not included model's attributes: ${missingFacetAttributes.join(
          ", ",
        )}`,
      );
    }
    if (invalidProperties.length > 0) {
      let message = invalidProperties.map(
        (prop) =>
          `Schema Validation Error. Attribute "${prop.name}" property "${prop.property}". Received: "${prop.value}", Expected: "${prop.expected}"`,
      );
      throw new e.ElectroError(
        e.ErrorCodes.InvalidAttributeDefinition,
        message,
      );
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
      attributesToWatchers,
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
  }

  _applyAttributeMutation(method, include, avoid, payload) {
    let data = { ...payload };
    for (let path of Object.keys(include)) {
      // this.attributes[attribute] !== undefined | Attribute exists as actual attribute. If `includeKeys` is turned on for example this will include values that do not have a presence in the model and therefore will not have a `.get()` method
      // avoid[attribute] === undefined           | Attribute shouldn't be in the avoided
      const attribute = this.getAttribute(path);
      if (attribute !== undefined && avoid[path] === undefined) {
        data[path] = attribute[method](payload[path], { ...payload });
      }
    }
    return data;
  }

  _fulfillAttributeMutationMethod(method, payload) {
    let watchersToTrigger = {};
    // include: payload               | We want to hit the getters/setters for any attributes coming in to be changed
    // avoid: watchersToAttributes    | We want to avoid anything that is a watcher, even if it was included
    let avoid = {
      ...this.translationForWatching.watchersToAttributes,
      ...this.translationForWatching.watchAllAttributes,
    };
    let data = this._applyAttributeMutation(method, payload, avoid, payload);
    // `data` here will include all the original payload values, but with the mutations applied to on non-watchers
    if (!this.translationForWatching.hasWatchers) {
      // exit early, why not
      return data;
    }
    for (let attribute of Object.keys(data)) {
      let watchers =
        this.translationForWatching.attributesToWatchers[attribute];
      // Any of the attributes on data have a watcher?
      if (watchers !== undefined) {
        watchersToTrigger = { ...watchersToTrigger, ...watchers };
      }
    }

    // include: ...data, ...watchersToTrigger | We want to hit attributes that were watching an attribute included in data, and include an properties that were skipped because they were a watcher
    // avoid: attributesToWatchers            | We want to avoid hit anything that was not a watcher because they were already hit once above
    let include = {
      ...data,
      ...watchersToTrigger,
      ...this.translationForWatching.watchAllAttributes,
    };
    return this._applyAttributeMutation(
      method,
      include,
      this.translationForWatching.attributesToWatchers,
      data,
    );
  }

  applyAttributeGetters(payload = {}) {
    return this._fulfillAttributeMutationMethod(
      AttributeMutationMethods.get,
      payload,
    );
  }

  applyAttributeSetters(payload = {}) {
    return this._fulfillAttributeMutationMethod(
      AttributeMutationMethods.set,
      payload,
    );
  }

  translateFromFields(item = {}, options = {}) {
    let data = {};
    let names = this.translationForRetrieval;
    for (let [attr, value] of Object.entries(item)) {
      let name = names[attr];
      if (name) {
        data[name] = value;
      } else if (options.data === DataOptions.includeKeys) {
        data[attr] = value;
      }
    }
    return data;
  }

  translateToFields(payload = {}) {
    let record = {};
    for (let [name, value] of Object.entries(payload)) {
      let field = this.getFieldName(name);
      if (value !== undefined) {
        record[field] = value;
      }
    }
    return record;
  }

  getFieldName(name) {
    if (typeof name === "string") {
      return this.translationForTable[name];
    }
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
        throw new e.ElectroAttributeValidationError(
          path,
          `Attribute "${path}" does not exist on model.`,
        );
      } else if (attribute.readOnly) {
        throw new e.ElectroAttributeValidationError(
          attribute.path,
          `Attribute "${attribute.path}" is Read-Only and cannot be removed`,
        );
      } else if (attribute.required) {
        throw new e.ElectroAttributeValidationError(
          attribute.path,
          `Attribute "${attribute.path}" is Required and cannot be removed`,
        );
      }
    }
    return paths;
  }

  checkOperation(attribute, operation, value) {
    if (attribute.required && operation === ItemOperations.remove) {
      throw new e.ElectroAttributeValidationError(
        attribute.path,
        `Attribute "${attribute.path}" is Required and cannot be removed`,
      );
    } else if (attribute.readOnly) {
      throw new e.ElectroAttributeValidationError(
        attribute.path,
        `Attribute "${attribute.path}" is Read-Only and cannot be updated`,
      );
    }

    return value === undefined ? undefined : attribute.getValidate(value);
  }

  checkUpdate(payload = {}, { allowReadOnly } = {}) {
    let record = {};
    for (let [path, value] of Object.entries(payload)) {
      let attribute = this.traverser.paths.get(path);
      if (attribute === undefined) {
        continue;
      }
      if (attribute.readOnly && !allowReadOnly) {
        throw new e.ElectroAttributeValidationError(
          attribute.path,
          `Attribute "${attribute.path}" is Read-Only and cannot be updated`,
        );
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
    let returnAttributes = new Set(config.attributes || []);
    let hasUserSpecifiedReturnAttributes = returnAttributes.size > 0;
    let remapped = this.translateFromFields(item, config);
    let data = this._fulfillAttributeMutationMethod("get", remapped);
    if (this.hiddenAttributes.size > 0 || hasUserSpecifiedReturnAttributes) {
      for (let attribute of Object.keys(data)) {
        if (this.hiddenAttributes.has(attribute)) {
          delete data[attribute];
        }
        if (
          hasUserSpecifiedReturnAttributes &&
          !returnAttributes.has(attribute)
        ) {
          delete data[attribute];
        }
      }
    }
    return data;
  }
}

function createCustomAttribute(definition = {}) {
  return {
    ...definition,
    type: "custom",
  };
}

function CustomAttributeType(base) {
  const supported = ["string", "number", "boolean", "any"];
  if (!supported.includes(base)) {
    throw new Error(
      `OpaquePrimitiveType only supports base types: ${u.commaSeparatedString(
        supported,
      )}`,
    );
  }
  return base;
}

function createSchema(schema) {
  v.model(schema);
  return schema;
}

module.exports = {
  Schema,
  Attribute,
  CastTypes,
  SetAttribute,
  createSchema,
  CustomAttributeType,
  createCustomAttribute,
};

},{"./errors":21,"./set":28,"./types":30,"./util":33,"./validations":34}],27:[function(require,module,exports){
const {
  Entity,
  getEntityIdentifiers,
  matchToEntityAlias,
} = require("./entity");
const { clauses } = require("./clauses");
const {
  TableIndex,
  TransactionMethods,
  KeyCasing,
  ServiceVersions,
  ElectroInstance,
  ElectroInstanceTypes,
  ModelVersions,
  IndexTypes,
  DataOptions,
} = require("./types");
const { FilterFactory } = require("./filters");
const { FilterOperations } = require("./operations");
const { WhereFactory } = require("./where");
const v = require("./validations");
const c = require("./client");
const e = require("./errors");
const u = require("./util");
const txn = require("./transaction");
const {
  getInstanceType,
  getModelVersion,
  applyBetaModelOverrides,
} = require("./util");

const ConstructorTypes = {
  beta: "beta",
  v1: "v1",
  v1Map: "v1Map",
  unknown: "unknown",
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
  let args = { alias, instance, config, hasAlias };
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
    if (v.isFunction(config.logger)) {
      this.logger = config.logger;
    }
    this.entities = {};
    this.find = {};
    this.collectionSchema = {};
    this.compositeAttributes = {};
    this.collections = {};
    this.identifiers = {};
    this.transaction = {
      get: (fn) => {
        return txn.createTransaction({
          fn,
          getEntities: () => this.entities,
          method: TransactionMethods.transactGet,
        });
      },
      write: (fn) => {
        return txn.createTransaction({
          fn,
          getEntities: () => this.entities,
          method: TransactionMethods.transactWrite,
        });
      },
    };
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
    if (v.isFunction(config.logger)) {
      this.logger = config.logger;
    }
    this.entities = {};
    this.find = {};
    this.collectionSchema = {};
    this.compositeAttributes = {};
    this.collections = {};
    this.identifiers = {};
    this.transaction = {
      get: (fn) => {
        return txn.createTransaction({
          fn,
          getEntities: () => this.entities,
          method: TransactionMethods.transactGet,
        });
      },
      write: (fn) => {
        return txn.createTransaction({
          fn,
          getEntities: () => this.entities,
          method: TransactionMethods.transactWrite,
        });
      },
    };
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
    config = c.normalizeConfig(config);
    this.version = ServiceVersions.v1;
    let type = inferConstructorType(service);
    switch (type) {
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
        throw new e.ElectroError(
          e.ErrorCodes.InvalidJoin,
          `Invalid service name: ${JSON.stringify(
            service,
          )}. Service name must have length greater than zero`,
        );
    }
  }

  _inferServiceNameFromEntityMap(service) {
    let names = Object.keys(service);
    let entity = names
      .map((name) => service[name])
      .map((instance) => this._inferJoinEntity(instance))
      .find((entity) => entity && entity.model && entity.model.service);

    if (!entity || !entity.model || !entity.model.service) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidJoin,
        `Invalid service name: Entities/Models provided do not contain property for Service Name`,
      );
    }

    return entity.model.service;
  }

  _inferJoinEntity(instance, options) {
    let entity = {};
    let type = getInstanceType(instance);
    let modelVersion = getModelVersion(instance);
    switch (type) {
      case ElectroInstanceTypes.model:
        entity = new Entity(instance, options);
        break;
      case ElectroInstanceTypes.entity:
        entity = instance;
        break;
      default:
        /** start beta/v1 condition **/
        if (modelVersion !== this._modelVersion) {
          throw new e.ElectroError(
            e.ErrorCodes.InvalidJoin,
            "Invalid instance: Valid instances to join include Models and Entity instances.",
          );
        } else if (modelVersion === ModelVersions.beta) {
          instance = applyBetaModelOverrides(instance, this._modelOverrides);
        } else {
          throw new e.ElectroError(
            e.ErrorCodes.InvalidJoin,
            `Invalid instance: Valid instances to join include Models and Entity instances.`,
          );
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
    let { alias, instance, config, hasAlias } = inferJoinValues(...args);
    let options = { ...config, ...this.config };

    let entity = this._inferJoinEntity(instance, options);

    let name = hasAlias ? alias : entity.getName();

    if (
      this.service.name.toLowerCase() !== entity.model.service.toLowerCase()
    ) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidJoin,
        `Service name defined on joined instance, ${entity.model.service}, does not match the name of this Service: ${this.service.name}. Verify or update the service name on the Entity/Model to match the name defined on this service.`,
      );
    }

    if (this.getTableName()) {
      entity.setTableName(this.getTableName());
    }

    if (options.client) {
      entity.setClient(options.client);
    }

    if (options.logger) {
      entity._addLogger(options.logger);
    }

    if (options.listeners) {
      entity.addListeners(options.listeners);
    }

    if (this._modelVersion === ModelVersions.beta && this.service.version) {
      entity.model.version = this.service.version;
    }

    this.entities[name] = entity;
    for (let collection of this.entities[name].model.collections) {
      // todo: this used to be inside the collection callback, it does not do well being ran multiple times
      // this forlook adds the entity filters multiple times
      this._addCollectionEntity(collection, name, this.entities[name]);
      this.collections[collection] = (...facets) => {
        return this._makeCollectionChain(
          {
            name: collection,
            initialClauses: clauses,
          },
          ...facets,
        );
      };
    }
    for (const collection in this.collectionSchema) {
      const collectionSchema = this.collectionSchema[collection];
      this.compositeAttributes[collection] =
        this._collectionSchemaToCompositeAttributes(collectionSchema);
    }
    this.find = { ...this.entities, ...this.collections };
    return this;
  }

  _collectionSchemaToCompositeAttributes(schema) {
    const keys = schema.keys;
    return {
      hasSortKeys: keys.hasSk,
      customFacets: {
        pk: keys.pk.isCustom,
        sk: keys.sk.isCustom,
      },
      pk: keys.pk.facets,
      sk: keys.sk.facets,
      all: [
        ...keys.pk.facets.map((name) => {
          return {
            name,
            index: keys.index,
            type: "pk",
          };
        }),
        ...keys.sk.facets.map((name) => {
          return {
            name,
            index: keys.index,
            type: "sk",
          };
        }),
      ],
      collection: keys.collection,
      hasSubCollections: schema.hasSubCollections,
      casing: {
        pk: keys.pk.casing,
        sk: keys.sk.casing,
      },
    };
  }

  setClient(client) {
    if (client !== undefined) {
      for (let entity of Object.values(this.entities)) {
        entity.setClient(client);
      }
    }
  }

  cleanseRetrievedData(index = TableIndex, entities, data = {}, config = {}) {
    if (config.data === DataOptions.raw) {
      return data;
    }
    const identifiers = getEntityIdentifiers(entities);

    data.Items = data.Items || [];

    const results = {};
    for (let { alias } of identifiers) {
      results[alias] = [];
    }

    for (let i = 0; i < data.Items.length; i++) {
      const record = data.Items[i];

      if (!record) {
        continue;
      }

      const entityAlias = matchToEntityAlias({
        identifiers,
        record,
        entities: this.entities,
        allowMatchOnKeys: config.ignoreOwnership,
      });

      if (!entityAlias) {
        continue;
      }

      // pager=false because we don't want the entity trying to parse the lastEvaluatedKey
      let formatted;
      if (config.hydrate) {
        formatted = {
          data: record, // entities[entityAlias]._formatKeysToItem(index, record),
        };
      } else {
        formatted = entities[entityAlias].formatResponse(
          { Item: record },
          index,
          {
            ...config,
            pager: false,
            parse: undefined,
          },
        );
      }

      results[entityAlias].push(formatted.data);
    }
    return results;
  }

  findKeyOwner(lastEvaluatedKey) {
    return Object.values(this.entities)[0];
    // return Object.values(this.entities)
    // 	.find((entity) => entity.ownsLastEvaluatedKey(lastEvaluatedKey));
  }

  expectKeyOwner(lastEvaluatedKey) {
    const owner = this.findKeyOwner(lastEvaluatedKey);
    if (owner === undefined) {
      throw new e.ElectroError(
        e.ErrorCodes.NoOwnerForCursor,
        `Supplied cursor does not resolve to Entity within the Service ${this.service.name}`,
      );
    }
    return owner;
  }

  findCursorOwner(cursor) {
    return Object.values(this.entities)[0];
    // return Object.values(this.entities)
    // 	.find(entity => entity.ownsCursor(cursor));
  }

  expectCursorOwner(cursor) {
    const owner = this.findCursorOwner(cursor);
    if (owner === undefined) {
      throw new e.ElectroError(
        e.ErrorCodes.NoOwnerForCursor,
        `Supplied cursor does not resolve to Entity within the Service ${this.service.name}`,
      );
    }
    return owner;
  }

  getTableName() {
    return this.service.table;
  }

  setTableName(table) {
    this.service.table = table;
    for (let entity of Object.values(this.entities)) {
      entity.setTableName(table);
    }
  }

  _makeCollectionChain({ name = "", initialClauses = {} }, facets = {}) {
    const { entities, attributes, identifiers, indexType, index } =
      this.collectionSchema[name];
    const compositeAttributes = this.compositeAttributes[name];
    const allEntities = Object.values(entities);
    const entity = allEntities[0];

    let filterBuilder = new FilterFactory(attributes, FilterOperations);
    let whereBuilder = new WhereFactory(attributes, FilterOperations);
    let clauses = { ...initialClauses };

    clauses = filterBuilder.injectFilterClauses(clauses);
    clauses = whereBuilder.injectWhereClauses(clauses);

    const expression = identifiers.expression || "";

    let options = {
      // expressions, // DynamoDB doesnt return what I expect it would when provided with these entity filters
      parse: (options, data) => {
        if (options.data === DataOptions.raw) {
          return data;
        }
        return this.cleanseRetrievedData(index, entities, data, options);
      },
      formatCursor: {
        serialize: (key) => {
          return this.expectKeyOwner(key).serializeCursor(key);
        },
        deserialize: (cursor) => {
          return this.expectCursorOwner(cursor).deserializeCursor(cursor);
        },
      },
      identifiers: {
        names: identifiers.names || {},
        values: identifiers.values || {},
        expression: allEntities.length > 1 ? `(${expression})` : expression,
      },
      expressions: {
        names: {},
        values: {},
        expression: "",
      },
      attributes,
      entities,
      indexType,
      compositeAttributes,
      hydrator: async (entity, index, items, config) => {
        if (entity && entities[entity]) {
          return entities[entity].hydrate(index, items, {
            ...config,
            parse: undefined,
            hydrator: undefined,
            _isCollectionQuery: false,
            ignoreOwnership: config._providedIgnoreOwnership,
          });
        }

        // let itemLookup = [];
        let entityItemRefs = {};
        // let entityResultRefs = {};
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          for (let entityName in entities) {
            entityItemRefs[entityName] = entityItemRefs[entityName] || [];
            const entity = entities[entityName];
            // if (entity.ownsKeys({ keys: item })) {
            if (entity.ownsKeys(item)) {
              // const entityItemRefsIndex =
              entityItemRefs[entityName].push({
                item,
                itemSlot: i,
              });
              // itemLookup[i] = {
              // 	entityName,
              // 	entityItemRefsIndex,
              // 	originalItem: item,
              // }
            }
          }
        }

        let unprocessed = [];
        let data = new Array(items.length).fill(null);
        for (const entityName in entityItemRefs) {
          const itemRefs = entityItemRefs[entityName];
          const items = itemRefs.map((ref) => ref.item);
          const results = await entities[entity].hydrate(index, items, {
            ...config,
            parse: undefined,
            hydrate: false,
            hydrator: undefined,
            _isCollectionQuery: false,
            ignoreOwnership: config._providedIgnoreOwnership,
          });
          unprocessed = unprocessed.concat(results.unprocessed);
          if (results.data.length !== itemRefs.length) {
            throw new Error("Temporary: something wrong");
          }
          for (let r = 0; r < itemRefs.length; r++) {
            const itemRef = itemRefs[r];
            const hydrated = results.data[r];
            data[itemRef.itemSlot] = hydrated;
          }
        }

        return {
          data,
          unprocessed,
        };
      },
    };

    return entity.collection(name, clauses, facets, options);
  }

  _validateIndexCasingMatch(definition = {}, providedIndex = {}) {
    const definitionSk = definition.sk || {};
    const providedSk = providedIndex.sk || {};
    const pkCasingMatch = v.isMatchingCasing(
      definition.pk.casing,
      providedIndex.pk.casing,
    );
    const skCasingMatch = v.isMatchingCasing(
      definitionSk.casing,
      providedSk.casing,
    );
    return {
      pk: pkCasingMatch,
      sk: skCasingMatch,
    };
  }

  _validateCollectionDefinition(definition = {}, providedIndex = {}) {
    let isCustomMatchPK = definition.pk.isCustom === providedIndex.pk.isCustom;
    let isCustomMatchSK =
      !!(definition.sk && definition.sk.isCustom) ===
      !!(providedIndex.sk && providedIndex.sk.isCustom);
    let indexMatch = definition.index === providedIndex.index;
    let pkFieldMatch = definition.pk.field === providedIndex.pk.field;
    let pkFacetLengthMatch =
      definition.pk.facets.length === providedIndex.pk.facets.length;
    let scopeMatch = definition.scope === providedIndex.scope;
    let mismatchedFacetLabels = [];
    let collectionDifferences = [];
    let definitionIndexName = u.formatIndexNameForDisplay(definition.index);
    let providedIndexName = u.formatIndexNameForDisplay(providedIndex.index);
    let matchingKeyCasing = this._validateIndexCasingMatch(
      definition,
      providedIndex,
    );

    for (
      let i = 0;
      i < Math.max(definition.pk.labels.length, providedIndex.pk.labels.length);
      i++
    ) {
      let definitionFacet =
        definition.pk.labels[i] && definition.pk.labels[i].name;
      let definitionLabel =
        definition.pk.labels[i] && definition.pk.labels[i].label;
      let providedFacet =
        providedIndex.pk.labels[i] && providedIndex.pk.labels[i].name;
      let providedLabel =
        providedIndex.pk.labels[i] && providedIndex.pk.labels[i].label;
      let noLabels =
        definitionLabel === definitionFacet && providedLabel === providedFacet;
      if (definitionLabel !== providedLabel) {
        mismatchedFacetLabels.push({
          definitionFacet,
          definitionLabel,
          providedFacet,
          providedLabel,
          kind: "Partition",
          type: noLabels ? "facet" : "label",
        });
        break;
      } else if (definitionFacet !== providedFacet) {
        mismatchedFacetLabels.push({
          definitionFacet,
          definitionLabel,
          providedFacet,
          providedLabel,
          kind: "Partition",
          type: "facet",
        });
        break;
      }
    }

    if (!scopeMatch) {
      collectionDifferences.push(
        `The index scope value provided "${
          providedIndex.scope || "undefined"
        }" does not match established index scope value "${
          definition.scope || "undefined"
        }" on index "${providedIndexName}". Index scope options must match across all entities participating in a collection`,
      );
    }

    if (!isCustomMatchPK) {
      collectionDifferences.push(
        `The usage of key templates the partition key on index ${definitionIndexName} must be consistent across all Entities, some entities provided use template while others do not`,
      );
    }

    if (!isCustomMatchSK) {
      collectionDifferences.push(
        `The usage of key templates the sort key on index ${definitionIndexName} must be consistent across all Entities, some entities provided use template while others do not`,
      );
    }

    if (definition.type === "clustered") {
      for (
        let i = 0;
        i <
        Math.min(definition.sk.labels.length, providedIndex.sk.labels.length);
        i++
      ) {
        let definitionFacet =
          definition.sk.labels[i] && definition.sk.labels[i].name;
        let definitionLabel =
          definition.sk.labels[i] && definition.sk.labels[i].label;
        let providedFacet =
          providedIndex.sk.labels[i] && providedIndex.sk.labels[i].name;
        let providedLabel =
          providedIndex.sk.labels[i] && providedIndex.sk.labels[i].label;
        let noLabels =
          definitionLabel === definitionFacet &&
          providedLabel === providedFacet;
        if (definitionFacet === providedFacet) {
          if (definitionLabel !== providedLabel) {
            mismatchedFacetLabels.push({
              definitionFacet,
              definitionLabel,
              providedFacet,
              providedLabel,
              kind: "Sort",
              type: noLabels ? "facet" : "label",
            });
          }
        } else {
          break;
        }
      }
    }

    if (!matchingKeyCasing.pk) {
      collectionDifferences.push(
        `The pk property "casing" provided "${
          providedIndex.pk.casing || KeyCasing.default
        }" does not match established casing "${
          definition.pk.casing || KeyCasing.default
        }" on index "${providedIndexName}". Index casing options must match across all entities participating in a collection`,
      );
    }

    if (!matchingKeyCasing.sk) {
      const definedSk = definition.sk || {};
      const providedSk = providedIndex.sk || {};
      collectionDifferences.push(
        `The sk property "casing" provided "${
          definedSk.casing || KeyCasing.default
        }" does not match established casing "${
          providedSk.casing || KeyCasing.default
        }" on index "${providedIndexName}". Index casing options must match across all entities participating in a collection`,
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
        `Partition Key composite attributes provided [${providedIndex.pk.facets
          .map((val) => `"${val}"`)
          .join(
            ", ",
          )}] for index "${providedIndexName}" do not match established composite attributes [${definition.pk.facets
          .map((val) => `"${val}"`)
          .join(", ")}] on established index "${definitionIndexName}"`,
      );
      // Else if used here because if they don't even have the same facet length then the data collected for the mismatched facets would include undefined values
      // which would make the error messages even more confusing.
    } else if (mismatchedFacetLabels.length > 0) {
      for (let mismatch of mismatchedFacetLabels) {
        if (mismatch.type === "facet") {
          collectionDifferences.push(
            `${mismatch.kind} Key composite attributes provided for index "${providedIndexName}" do not match established composite attribute "${mismatch.definitionFacet}" on established index "${definitionIndexName}": "${mismatch.definitionLabel}" != "${mismatch.providedLabel}"; Composite attribute definitions must match between all members of a collection to ensure key structures will resolve to identical Partition Keys. Please ensure these composite attribute definitions are identical for all entities associated with this service.`,
          );
        } else {
          collectionDifferences.push(
            `${
              mismatch.kind
            } Key composite attributes provided for index "${providedIndexName}" contain conflicting composite attribute labels for established composite attribute "${
              mismatch.definitionFacet || ""
            }" on established index "${definitionIndexName}". Established composite attribute "${
              mismatch.definitionFacet || ""
            }" on established index "${definitionIndexName}" was defined with label "${
              mismatch.definitionLabel
            }" while provided composite attribute "${
              mismatch.providedFacet || ""
            }" on provided index "${providedIndexName}" is defined with label "${
              mismatch.providedLabel
            }". Composite attribute labels definitions must match between all members of a collection to ensure key structures will resolve to identical Partition Keys. Please ensure these labels definitions are identical for all entities associated with this service.`,
          );
        }
      }
    }
    return [!!collectionDifferences.length, collectionDifferences];
  }

  _compareEntityAttributes(
    entityName,
    definition = {},
    providedAttributes = {},
    keys,
  ) {
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
          `The attribute "${name}" with Table Field "${detail.field}" does not match established Table Field "${defined.field}"`,
        );
      }
      if (defined && detail && (defined.padding || detail.padding)) {
        const definedPadding = defined.padding || {};
        const detailPadding = detail.padding || {};
        if (
          keys.pk.facets.includes(name) &&
          (definedPadding.length !== detailPadding.length ||
            definedPadding.char !== detailPadding.char)
        ) {
          results.invalid.push(
            `The attribute "${name}" contains inconsistent padding definitions that impact how keys are formed`,
          );
        }
      }
    }
    return [!!results.invalid.length, results];
  }

  _processEntityAttributes(
    entityName,
    definition = {},
    providedAttributes = {},
    keys,
  ) {
    let [attributesAreIncompatible, attributeResults] =
      this._compareEntityAttributes(
        entityName,
        definition,
        providedAttributes,
        keys,
      );
    if (attributesAreIncompatible) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidJoin,
        `Inconsistent attribute(s) on the entity "${entityName}". The following attribute(s) are defined with incompatible or conflicting definitions across participating entities: ${attributeResults.invalid.join(
          ", ",
        )}. These attribute definitions must match among all members of the collection.`,
      );
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
    const [invalidDefinition, invalidIndexMessages] =
      this._validateCollectionDefinition(definition, providedIndex);
    if (invalidDefinition) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidJoin,
        `Validation Error while joining entity, "${name}". ${invalidIndexMessages.join(
          "; ",
        )}`,
      );
    }
    const sharedSortKeyAttributes = [];
    const sharedSortKeyCompositeAttributeLabels = [];
    const sharedSortKeyLabels = [];
    if (
      providedIndex.hasSk &&
      definition.hasSk &&
      Array.isArray(definition.sk.labels)
    ) {
      for (let i = 0; i < definition.sk.labels.length; i++) {
        const providedLabels = providedIndex.sk.labels[i];
        const definedLabels = definition.sk.labels[i];

        const namesMatch =
          providedLabels && providedLabels.name === definedLabels.name;
        const labelsMatch =
          providedLabels && providedLabels.label === definedLabels.label;
        if (!namesMatch || !labelsMatch) {
          break;
        }
        sharedSortKeyLabels.push({ ...definedLabels });
        sharedSortKeyCompositeAttributeLabels.push({
          ...definition.sk.facetLabels[i],
        });
        sharedSortKeyAttributes.push(definition.sk.facets[i]);
      }
    }
    return {
      ...definition,
      sk: {
        ...definition.sk,
        facets: sharedSortKeyAttributes,
        facetLabels: sharedSortKeyCompositeAttributeLabels,
        labels: sharedSortKeyLabels,
      },
    };
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
    return Object.values(entity.model.indexes).find((index) => {
      if (v.isStringHasLength(index.collection)) {
        return index.collection === collection;
      } else if (v.isArrayHasLength(index.collection)) {
        return index.collection.indexOf(collection) > 0;
      }
    });
  }

  _processSubCollections(
    providedType,
    existing,
    provided,
    entityName,
    collectionName,
  ) {
    let existingSubCollections;
    let providedSubCollections;
    if (v.isArrayHasLength(existing)) {
      existingSubCollections = existing;
    } else {
      existingSubCollections = [existing];
    }
    if (v.isArrayHasLength(provided)) {
      providedSubCollections = provided;
    } else {
      providedSubCollections = [provided];
    }

    if (
      providedSubCollections.length > 1 &&
      providedType === IndexTypes.clustered
    ) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidJoin,
        `Clustered indexes do not support sub-collections. The sub-collection "${collectionName}", on Entity "${entityName}" must be defined as either an individual collection name or the index must be redefined as an isolated cluster`,
      );
    }
    const existingRequiredIndex =
      existingSubCollections.indexOf(collectionName);
    const providedRequiredIndex =
      providedSubCollections.indexOf(collectionName);
    if (providedRequiredIndex < 0) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidJoin,
        `The collection definition for Collection "${collectionName}" does not exist on Entity "${entityName}".`,
      );
    }
    if (
      existingRequiredIndex >= 0 &&
      existingRequiredIndex !== providedRequiredIndex
    ) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidJoin,
        `The collection definition for Collection "${collectionName}", on Entity "${entityName}", does not match the established sub-collection order for this service. The collection name provided in slot ${
          providedRequiredIndex + 1
        }, ${
          providedSubCollections[existingRequiredIndex] === undefined
            ? "(not found)"
            : `"${providedSubCollections[existingRequiredIndex]}"`
        }, on Entity "${entityName}", does not match the established collection name in slot ${
          existingRequiredIndex + 1
        }, "${collectionName}". When using sub-collections, all Entities within a Service must must implement the same order for all preceding sub-collections.`,
      );
    }
    let length = Math.max(existingRequiredIndex, providedRequiredIndex);

    for (let i = 0; i <= length; i++) {
      let existingCollection = existingSubCollections[i];
      let providedCollection = providedSubCollections[i];
      if (v.isStringHasLength(existingCollection)) {
        if (
          existingCollection === providedCollection &&
          providedCollection === collectionName
        ) {
          return i;
        }
        if (existingCollection !== providedCollection) {
          throw new e.ElectroError(
            e.ErrorCodes.InvalidJoin,
            `The collection definition for Collection "${collectionName}", on Entity "${entityName}", does not match the established sub-collection order for this service. The collection name provided in slot ${
              i + 1
            }, "${providedCollection}", on Entity "${entityName}", does not match the established collection name in slot ${
              i + 1
            }, "${existingCollection}". When using sub-collections, all Entities within a Service must must implement the same order for all preceding sub-collections.`,
          );
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
        expression: "",
      },
      index: undefined,
      table: "",
      collection: [],
      indexType: undefined,
      hasSubCollections: undefined,
    };
    const providedType = providedIndex.type || IndexTypes.isolated;
    if (this.collectionSchema[collection].indexType === undefined) {
      this.collectionSchema[collection].indexType = providedType;
    } else if (this.collectionSchema[collection].indexType !== providedType) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidJoin,
        `Index type mismatch on collection ${collection}. The entity ${name} defines the index as type ${providedType} while the established type for that index is ${this.collectionSchema[collection].indexType}. Note that when omitted, indexes default to the type "${IndexTypes.isolated}"`,
      );
    }
    if (this.collectionSchema[collection].entities[name] !== undefined) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidJoin,
        `Entity with name '${name}' has already been joined to this service.`,
      );
    }

    if (this.collectionSchema[collection].table !== "") {
      if (this.collectionSchema[collection].table !== entity.getTableName()) {
        throw new e.ElectroError(
          e.ErrorCodes.InvalidJoin,
          `Entity with name '${name}' is defined to use a different Table than what is defined on other Service Entities and/or the Service itself. Entity '${name}' is defined with table name '${entity.getTableName()}' but the Service has been defined to use table name '${
            this.collectionSchema[collection].table
          }'. All Entities in a Service must reference the same DynamoDB table. To ensure all Entities will use the same DynamoDB table, it is possible to apply the property 'table' to the Service constructor's configuration parameter.`,
        );
      }
    } else {
      this.collectionSchema[collection].table = entity.getTableName();
    }

    this.collectionSchema[collection].keys = this._processEntityKeys(
      name,
      this.collectionSchema[collection].keys,
      providedIndex,
    );
    this.collectionSchema[collection].attributes =
      this._processEntityAttributes(
        name,
        this.collectionSchema[collection].attributes,
        entity.model.schema.attributes,
        this.collectionSchema[collection].keys,
      );
    this.collectionSchema[collection].entities[name] = entity;
    this.collectionSchema[collection].identifiers =
      this._processEntityIdentifiers(
        this.collectionSchema[collection].identifiers,
        entity.getIdentifierExpressions(name),
      );
    this.collectionSchema[collection].index =
      this._processEntityCollectionIndex(
        this.collectionSchema[collection].index,
        providedIndex.index,
        name,
        collection,
      );
    let collectionIndex = this._processSubCollections(
      providedType,
      this.collectionSchema[collection].collection,
      providedIndex.collection,
      name,
      collection,
    );
    this.collectionSchema[collection].collection[collectionIndex] = collection;
    this.collectionSchema[collection].hasSubCollections =
      this.collectionSchema[collection].hasSubCollections ||
      Array.isArray(providedIndex.collection);
    return this.collectionSchema[collection];
  }

  _processEntityCollectionIndex(existing, provided, name, collection) {
    if (typeof provided !== "string") {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidJoin,
        `Entity with name '${name}' does not have collection ${collection} defined on it's model`,
      );
    } else if (existing === undefined) {
      return provided;
    } else if (provided !== existing) {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidJoin,
        `Entity with name '${name}' defines collection ${collection} on index `,
      );
    } else {
      return existing;
    }
  }

  _processEntityIdentifiers(existing = {}, { names, values, expression } = {}) {
    let identifiers = {};
    if (names) {
      identifiers.names = Object.assign({}, existing.names, names);
    }
    if (values) {
      identifiers.values = Object.assign({}, existing.values, values);
    }
    if (expression) {
      identifiers.expression = [existing.expression, expression]
        .filter(Boolean)
        .join(" OR ");
    }
    return identifiers;
  }
}

module.exports = {
  Service,
};

},{"./clauses":17,"./client":18,"./entity":20,"./errors":21,"./filters":24,"./operations":25,"./transaction":29,"./types":30,"./util":33,"./validations":34,"./where":35}],28:[function(require,module,exports){
const memberTypeToSetType = {
  String: "String",
  Number: "Number",
  NumberValue: "Number",
  Binary: "Binary",
  string: "String",
  number: "Number",
};

class DynamoDBSet {
  constructor(list, type) {
    this.wrapperName = "Set";
    this.type = memberTypeToSetType[type];
    if (this.type === undefined) {
      new Error(`Invalid Set type: ${type}`);
    }
    this.values = Array.from(new Set([].concat(list)));
  }

  initialize(list, validate) {}

  detectType() {
    return memberTypeToSetType[typeof this.values[0]];
  }

  validate() {}

  toJSON() {
    return this.values;
  }
}

module.exports = { DynamoDBSet };

},{}],29:[function(require,module,exports){
const { TableIndex, TransactionMethods, DataOptions } = require("./types");
const { getEntityIdentifiers, matchToEntityAlias } = require("./entity");

function cleanseCanceledData(
  index = TableIndex,
  entities,
  data = {},
  config = {},
) {
  if (config.data === DataOptions.raw) {
    return data;
  }
  const identifiers = getEntityIdentifiers(entities);
  const canceled = data.canceled || [];
  const paramItems = config._paramItems || [];
  const results = [];
  for (let i = 0; i < canceled.length; i++) {
    const { Item, Code, Message } = canceled[i] || {};
    const paramItem = paramItems[i];
    const code = Code || "None";
    const rejected = code !== "None";
    const result = {
      rejected,
      code,
      message: Message,
    };

    if (Item) {
      const entityAlias = matchToEntityAlias({
        record: Item,
        paramItem,
        identifiers,
      });
      result.item = entities[entityAlias].formatResponse({ Item }, index, {
        ...config,
        pager: false,
        parse: undefined,
      }).data;
    } else {
      result.item = null;
    }

    results.push(result);
  }

  return results;
}

function cleanseTransactionData(
  index = TableIndex,
  entities,
  data = {},
  config = {},
) {
  if (config.data === DataOptions.raw) {
    return data;
  }
  const identifiers = getEntityIdentifiers(entities);
  data.Items = data.Items || [];
  const paramItems = config._paramItems || [];
  const results = [];
  for (let i = 0; i < data.Items.length; i++) {
    const record = data.Items[i];
    if (!record) {
      results.push(null);
      continue;
    }

    const paramItem = paramItems[i];
    const entityAlias = matchToEntityAlias({ paramItem, identifiers, record });
    if (!entityAlias) {
      continue;
    }

    // pager=false because we don't want the entity trying to parse the lastEvaluatedKey
    let formatted = entities[entityAlias].formatResponse(
      { Item: record },
      index,
      {
        ...config,
        pager: false,
        parse: undefined,
      },
    );

    results.push(formatted.data);
  }

  return results.map((item) => ({
    rejected: false,
    item,
  }));
}

function createTransaction(options) {
  const { fn, method, getEntities } = options;
  const operations = {
    params: (options = {}) => {
      const paramItems = fn(getEntities());
      const params = {
        TransactItems: paramItems,
      };

      if (typeof options.token === "string" && options.token.length) {
        params["ClientRequestToken"] = options.token;
      }
      if (options._returnParamItems) {
        return { params, paramItems };
      }
      return params;
    },
    go: async (options) => {
      const driver = Object.values(getEntities())[0];

      if (!driver) {
        throw new Error(
          "At least one entity must exist to perform a transaction",
        );
      }

      const { params, paramItems } = operations.params({
        ...options,
        _returnParamItems: true,
      });

      let canceled = false;
      if (paramItems.length === 0) {
        return {
          canceled,
          data: [],
        };
      }
      if (options && options.logger) {
        if (!options.listeners) {
          options.listeners = [];
        }
        options.listeners.push(options.logger);
      }
      const response = await driver.go(method, params, {
        ...options,
        parse: (options, data) => {
          if (options.data === DataOptions.raw) {
            return data;
          } else if (data.canceled) {
            canceled = true;
            return cleanseCanceledData(TableIndex, getEntities(), data, {
              ...options,
              _isTransaction: true,
              _paramItems: paramItems,
            });
          } else if (data.Responses) {
            return cleanseTransactionData(
              TableIndex,
              getEntities(),
              {
                Items: data.Responses.map((response) => response.Item),
              },
              {
                ...options,
                _isTransaction: true,
                _paramItems: paramItems,
              },
            );
          } else {
            return new Array(paramItems ? paramItems.length : 0).fill({
              item: null,
              code: "None",
              rejected: false,
              message: undefined,
            });
          }
        },
      });

      return {
        ...response,
        canceled,
      };
    },
  };

  return operations;
}

function createWriteTransaction(entities, fn) {
  return createTransaction({
    fn,
    method: TransactionMethods.transactWrite,
    getEntities: () => entities,
  });
}

function createGetTransaction(entities, fn) {
  return createTransaction({
    fn,
    method: TransactionMethods.transactGet,
    getEntities: () => entities,
  });
}

module.exports = {
  createTransaction,
  createWriteTransaction,
  createGetTransaction,
};

},{"./entity":20,"./types":30}],30:[function(require,module,exports){
const KeyTypes = {
  pk: "pk",
  sk: "sk",
};

const DataOptions = {
  raw: "raw",
  includeKeys: "includeKeys",
  attributes: "attributes",
};

const BatchWriteTypes = {
  batch: "batch",
  concurrent: "concurrent",
};

const ComparisonTypes = {
  keys: "keys",
  attributes: "attributes",
  v2: "v2",
};

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
  clustered_collection: "clustered_collection",
  is: "is",
};

const MethodTypes = {
  check: "check",
  put: "put",
  get: "get",
  query: "query",
  scan: "scan",
  update: "update",
  delete: "delete",
  remove: "remove",
  patch: "patch",
  create: "create",
  batchGet: "batchGet",
  batchWrite: "batchWrite",
  upsert: "upsert",
  transactWrite: "transactWrite",
  transactGet: "transactGet",
};

const TransactionMethods = {
  transactWrite: MethodTypes.transactWrite,
  transactGet: MethodTypes.transactGet,
};

const TransactionOperations = {
  [MethodTypes.get]: "Get",
  [MethodTypes.check]: "ConditionCheck",
  [MethodTypes.put]: "Put",
  [MethodTypes.create]: "Put",
  [MethodTypes.upsert]: "Update",
  [MethodTypes.update]: "Update",
  [MethodTypes.patch]: "Update",
  [MethodTypes.remove]: "Delete",
  [MethodTypes.delete]: "Delete",
};

const MethodTypeTranslation = {
  put: "put",
  get: "get",
  query: "query",
  scan: "scan",
  update: "update",
  delete: "delete",
  remove: "delete",
  patch: "update",
  create: "put",
  batchGet: "batchGet",
  batchWrite: "batchWrite",
  upsert: "update",
  transactWrite: "transactWrite",
  transactGet: "transactGet",
};

const IndexTypes = {
  isolated: "isolated",
  clustered: "clustered",
};

const Comparisons = {
  lte: "<=",
  lt: "<",
  gte: ">=",
  gt: ">",
};

const KeyAttributesComparisons = {
  lt: "<",
  gte: ">=",

  /**
   * gt becomes gte and last character of incoming value is shifted up one character code
   * example:
   * sk > '2020-09-05'
   *   expected
   *     - 2020-09-06@05:05_hero
   *     - 2020-10-05@05:05_hero
   *     - 2022-02-05@05:05_villian
   *     - 2022-06-05@05:05_clown
   *     - 2022-09-06@05:05_clown
   *   actual (bad - includes all 2020-09-05 records)
   *     - 2020-09-05@05:05_hero
   *     - 2020-09-06@05:05_hero
   *     - 2020-10-05@05:05_hero
   *     - 2022-02-05@05:05_villian
   *     - 2022-06-05@05:05_clown
   */
  gt: ">=",

  /**
   * lte becomes lt and last character of incoming value is shifted up one character code
   * example:
   * sk >= '2020-09-05'
   *   expected
   *     - 2012-02-05@05:05_clown
   *     - 2015-10-05@05:05_hero
   *     - 2017-02-05@05:05_clown
   *     - 2017-02-05@05:05_villian
   *     - 2020-02-05@05:05_clown
   *     - 2020-02-25@05:05_clown
   *     - 2020-09-05@05:05_hero
   *   actual (bad - missing all 2020-09-05 records)
   *     - 2012-02-05@05:05_clown
   *     - 2015-10-05@05:05_hero
   *     - 2017-02-05@05:05_clown
   *     - 2017-02-05@05:05_villian
   *     - 2020-02-05@05:05_clown
   *     - 2020-02-25@05:05_clown
   */
  lte: "<",
};

const CastTypes = ["string", "number"];

const AttributeTypes = {
  string: "string",
  number: "number",
  boolean: "boolean",
  enum: "enum",
  map: "map",
  set: "set",
  // enumSet: "enumSet",
  list: "list",
  any: "any",
  custom: "custom",
  static: "static",
};

const PathTypes = {
  ...AttributeTypes,
  item: "item",
};

const ExpressionTypes = {
  ConditionExpression: "ConditionExpression",
  FilterExpression: "FilterExpression",
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
  model: "model",
};

const ModelVersions = {
  beta: "beta",
  v1: "v1",
  v2: "v2",
};

const EntityVersions = {
  v1: "v1",
};

const ServiceVersions = {
  v1: "v1",
};

const MaxBatchItems = {
  [MethodTypes.batchGet]: 100,
  [MethodTypes.batchWrite]: 25,
};

const AttributeMutationMethods = {
  get: "get",
  set: "set",
};

const Pager = {
  raw: "raw",
  named: "named",
  item: "item",
  cursor: "cursor",
};

const UnprocessedTypes = {
  raw: "raw",
  item: "item",
};

const AttributeWildCard = "*";

const ItemOperations = {
  set: "set",
  delete: "delete",
  remove: "remove",
  add: "add",
  subtract: "subtract",
  append: "append",
  ifNotExists: "ifNotExists",
};

const UpsertOperations = {
  set: "set",
  add: "add",
  subtract: "subtract",
  append: "append",
  ifNotExists: "ifNotExists",
};

const AttributeProxySymbol = Symbol("attribute_proxy");
const TransactionCommitSymbol = Symbol("transaction_commit");

const BuilderTypes = {
  update: "update",
  filter: "filter",
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
  setters: "setters",
};

const ReturnValues = {
  default: "default",
  none: "none",
  all_old: "all_old",
  updated_old: "updated_old",
  all_new: "all_new",
  updated_new: "updated_new",
};

const FormatToReturnValues = {
  none: "NONE",
  default: "NONE",
  all_old: "ALL_OLD",
  updated_old: "UPDATED_OLD",
  all_new: "ALL_NEW",
  updated_new: "UPDATED_NEW",
};

const TableIndex = "";

const KeyCasing = {
  none: "none",
  upper: "upper",
  lower: "lower",
  default: "default",
};

const EventSubscriptionTypes = ["query", "results"];

const TerminalOperation = {
  go: "go",
  page: "page",
};

const AllPages = "all";

const ResultOrderOption = {
  asc: true,
  desc: false,
};

const ResultOrderParam = "ScanIndexForward";

const DynamoDBAttributeTypes = Object.entries({
  string: "S",
  stringSet: "SS",
  number: "N",
  numberSet: "NS",
  binary: "B",
  binarySet: "BS",
  boolean: "BOOL",
  null: "NULL",
  list: "L",
  map: "M",
}).reduce((obj, [name, type]) => {
  obj[name] = type;
  obj[type] = type;
  return obj;
}, {});

const CastKeyOptions = {
  string: "string",
  number: "number",
};

module.exports = {
  Pager,
  KeyTypes,
  CastTypes,
  KeyCasing,
  PathTypes,
  IndexTypes,
  QueryTypes,
  ValueTypes,
  TableIndex,
  MethodTypes,
  DataOptions,
  Comparisons,
  BuilderTypes,
  ReturnValues,
  MaxBatchItems,
  ModelVersions,
  ItemOperations,
  AttributeTypes,
  EntityVersions,
  CastKeyOptions,
  ComparisonTypes,
  ServiceVersions,
  ExpressionTypes,
  ElectroInstance,
  TraverserIndexes,
  UnprocessedTypes,
  AttributeWildCard,
  TerminalOperation,
  FormatToReturnValues,
  AttributeProxySymbol,
  ElectroInstanceTypes,
  MethodTypeTranslation,
  EventSubscriptionTypes,
  DynamoDBAttributeTypes,
  KeyAttributesComparisons,
  AttributeMutationMethods,
  AllPages,
  ResultOrderOption,
  ResultOrderParam,
  TransactionCommitSymbol,
  TransactionOperations,
  TransactionMethods,
  UpsertOperations,
  BatchWriteTypes,
};

},{}],31:[function(require,module,exports){
const { UpdateOperations } = require("./updateOperations");
const { AttributeOperationProxy, ExpressionState } = require("./operations");
const { ItemOperations, BuilderTypes } = require("./types");

class UpdateExpression extends ExpressionState {
  constructor(props = {}) {
    super({ ...props });
    this.operations = {
      set: new Set(),
      remove: new Set(),
      add: new Set(),
      subtract: new Set(),
      delete: new Set(),
    };
    this.composites = {};
    this.seen = new Map();
    this.type = BuilderTypes.update;
  }
  addComposite(attrName, value) {
    if (value !== undefined) {
      if (
        this.composites[attrName] === undefined ||
        this.composites[attrName] === value
      ) {
        this.composites[attrName] = value;
        return true;
      }
    }
    return false;
  }

  add(type, expression) {
    this.operations[type].add(expression);
  }

  unadd(type, expression) {
    this.operations[type].delete(expression);
  }

  set(name, value, operation = ItemOperations.set, attribute) {
    let operationToApply = operation;
    if (operation === ItemOperations.ifNotExists) {
      operationToApply = ItemOperations.set;
    }
    const seen = this.seen.get(name);
    let n;
    let v;
    if (seen) {
      n = seen.name;
      v = seen.value;
      this.unadd(operationToApply, seen.expression);
    } else {
      n = this.setName({}, name, name);
      v = this.setValue(name, value);
    }
    let expression = `${n.prop} = ${v}`;
    if (operation === ItemOperations.ifNotExists) {
      expression = `${n.prop} = if_not_exists(${n.prop}, ${v})`;
    }
    this.seen.set(name, {
      name: n,
      value: v,
      expression,
    });
    this.add(operationToApply, expression);
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
        expressions.push(
          `${type.toUpperCase()} ${Array.from(operations).join(", ")}`,
        );
      }
    }
    return expressions.join(" ");
  }
}

class UpdateEntity {
  constructor(attributes = {}, operations = {}) {
    this.attributes = { ...attributes };
    this.operations = { ...operations };
  }

  buildCallbackHandler(entity, state) {
    const proxy = new AttributeOperationProxy({
      builder: state.query.update,
      attributes: this.attributes,
      operations: this.operations,
    });

    return (cb, ...params) => {
      if (typeof cb !== "function") {
        throw new Error('Update Callback must be of type "function"');
      }
      proxy.invokeCallback(cb, ...params);
    };
  }
}

module.exports = {
  UpdateEntity,
  UpdateExpression,
};

},{"./operations":25,"./types":30,"./updateOperations":32}],32:[function(require,module,exports){
const { AttributeTypes, ItemOperations } = require("./types");

const deleteOperations = {
  canNest: false,
  template: function del(options, attr, path, value) {
    let operation = "";
    let expression = "";
    switch (attr.type) {
      case AttributeTypes.any:
      case AttributeTypes.set:
        operation = ItemOperations.delete;
        expression = `${path} ${value}`;
        break;
      default:
        throw new Error(
          `Invalid Update Attribute Operation: "DELETE" Operation can only be performed on attributes with type "set" or "any".`,
        );
    }
    return { operation, expression };
  },
};

const UpdateOperations = {
  ifNotExists: {
    template: function if_not_exists(options, attr, path, value) {
      const operation = ItemOperations.set;
      const expression = `${path} = if_not_exists(${path}, ${value})`;
      return { operation, expression };
    },
  },
  name: {
    canNest: true,
    template: function name(options, attr, path) {
      return path;
    },
  },
  value: {
    canNest: true,
    template: function value(options, attr, path, value) {
      return value;
    },
  },
  append: {
    canNest: false,
    template: function append(options, attr, path, value) {
      let operation = "";
      let expression = "";
      switch (attr.type) {
        case AttributeTypes.any:
        case AttributeTypes.list:
          const defaultValue = options.createValue("default_value", []);
          expression = `${path} = list_append(if_not_exists(${path}, ${defaultValue}), ${value})`;
          operation = ItemOperations.set;
          break;
        default:
          throw new Error(
            `Invalid Update Attribute Operation: "APPEND" Operation can only be performed on attributes with type "list" or "any".`,
          );
      }
      return { operation, expression };
    },
  },
  add: {
    canNest: false,
    template: function add(options, attr, path, value, defaultValue) {
      let operation = "";
      let expression = "";
      let type = attr.type;
      if (type === AttributeTypes.any) {
        type =
          typeof value === "number"
            ? AttributeTypes.number
            : AttributeTypes.any;
      }
      switch (type) {
        case AttributeTypes.any:
        case AttributeTypes.set: {
          operation = ItemOperations.add;
          expression = `${path} ${value}`;
          break;
        }
        case AttributeTypes.number: {
          if (options.nestedValue) {
            operation = ItemOperations.set;
            expression = `${path} = ${path} + ${value}`;
          } else if (defaultValue !== undefined) {
            // const defaultValueName = options.createValue(`default_value`, defaultValue)
            operation = ItemOperations.set;
            expression = `${path} = (if_not_exists(${path}, ${defaultValue}) + ${value})`;
          } else {
            operation = ItemOperations.add;
            expression = `${path} ${value}`;
          }
          break;
        }
        default:
          throw new Error(
            `Invalid Update Attribute Operation: "ADD" Operation can only be performed on attributes with type "number", "set", or "any".`,
          );
      }
      return { operation, expression };
    },
  },
  subtract: {
    canNest: false,
    template: function subtract(options, attr, path, value, defaultValue = 0) {
      let operation = "";
      let expression = "";
      switch (attr.type) {
        case AttributeTypes.any:
        case AttributeTypes.number: {
          let resolvedDefaultValue;
          if (
            typeof defaultValue === "string" &&
            defaultValue.startsWith(":")
          ) {
            resolvedDefaultValue = defaultValue;
          } else if (defaultValue !== undefined) {
            resolvedDefaultValue = options.createValue(
              "default_value",
              defaultValue,
            );
          } else {
            resolvedDefaultValue = options.createValue("default_value", 0);
          }
          // const defaultValuePath = options.createValue('default_value', resolvedDefaultValue);
          operation = ItemOperations.set;
          expression = `${path} = (if_not_exists(${path}, ${resolvedDefaultValue}) - ${value})`;
          break;
        }
        default:
          throw new Error(
            `Invalid Update Attribute Operation: "SUBTRACT" Operation can only be performed on attributes with type "number" or "any".`,
          );
      }

      return { operation, expression };
    },
  },
  set: {
    canNest: false,
    template: function set(options, attr, path, value) {
      let operation = "";
      let expression = "";
      switch (attr.type) {
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
          throw new Error(
            `Invalid Update Attribute Operation: "SET" Operation can only be performed on attributes with type "list", "map", "string", "number", "boolean", or "any".`,
          );
      }
      return { operation, expression };
    },
  },
  remove: {
    canNest: false,
    template: function remove(options, attr, ...paths) {
      let operation = "";
      let expression = "";
      switch (attr.type) {
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
          throw new Error(
            `Invalid Update Attribute Operation: "REMOVE" Operation can only be performed on attributes with type "map", "list", "string", "number", "boolean", or "any".`,
          );
        }
      }
      return { operation, expression };
    },
  },
  del: deleteOperations,
  delete: deleteOperations,
};

module.exports = {
  UpdateOperations,
};

},{"./types":30}],33:[function(require,module,exports){
(function (Buffer){(function (){
const t = require("./types");
const e = require("./errors");
const v = require("./validations");

function parseJSONPath(path = "") {
  if (typeof path !== "string") {
    throw new Error("Path must be a string");
  }
  path = path.replace(/\[/g, ".");
  path = path.replace(/\]/g, "");
  return path.split(".").filter((part) => part !== "");
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
  let nameInModelNamespace =
    model && model.model && v.isStringHasLength(model.model.entity);
  if (nameInModelNamespace) {
    return t.ModelVersions.v1;
  } else if (nameOnRoot) {
    return t.ModelVersions.beta;
  } else {
    return "";
  }
}

function applyBetaModelOverrides(
  model = {},
  { service = "", version = "", table = "" } = {},
) {
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

function commaSeparatedString(array = [], prefix = '"', postfix = '"') {
  return array.map((value) => `${prefix}${value}${postfix}`).join(", ");
}

function formatStringCasing(str, casing, defaultCase) {
  if (typeof str !== "string") {
    return str;
  }
  let strCase = defaultCase;
  if (v.isStringHasLength(casing) && typeof t.KeyCasing[casing] === "string") {
    strCase =
      t.KeyCasing.default === casing ? defaultCase : t.KeyCasing[casing];
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

class BatchGetOrderMaintainer {
  constructor({ table, enabled, keyFormatter }) {
    this.table = table;
    this.enabled = enabled;
    this.keyFormatter = keyFormatter;
    this.batchIndexMap = new Map();
    this.currentSlot = 0;
  }

  getSize() {
    return this.batchIndexMap.size;
  }

  getOrder(item) {
    const key = this.keyFormatter(item);
    const value = this.batchIndexMap.get(key);
    if (value === undefined) {
      return -1;
    }
    return value;
  }

  defineOrder(parameters = []) {
    if (this.enabled) {
      for (let i = 0; i < parameters.length; i++) {
        const batchParams = parameters[i];
        const recordKeys =
          (batchParams &&
            batchParams.RequestItems &&
            batchParams.RequestItems[this.table] &&
            batchParams.RequestItems[this.table].Keys) ||
          [];
        for (const recordKey of recordKeys) {
          const indexMapKey = this.keyFormatter(recordKey);
          this.batchIndexMap.set(indexMapKey, this.currentSlot++);
        }
      }
    }
  }
}

function getUnique(arr1, arr2) {
  return Array.from(new Set([...arr1, ...arr2]));
}

const cursorFormatter = {
  serialize: (key) => {
    if (!key) {
      return null;
    } else if (typeof val !== "string") {
      key = JSON.stringify(key);
    }
    return Buffer.from(key).toString("base64url");
  },
  deserialize: (cursor) => {
    if (!cursor) {
      return undefined;
    } else if (typeof cursor !== "string") {
      throw new Error(
        `Invalid cursor provided, expected type 'string' recieved: ${JSON.stringify(
          cursor,
        )}`,
      );
    }
    try {
      return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    } catch (err) {
      throw new Error("Unable to parse cursor");
    }
  },
};

function removeFixings({ prefix = "", postfix = "", value = "" } = {}) {
  const start = value.toLowerCase().startsWith(prefix.toLowerCase())
    ? prefix.length
    : 0;
  const end =
    value.length -
    (value.toLowerCase().endsWith(postfix.toLowerCase()) ? postfix.length : 0);

  let formatted = "";
  for (let i = start; i < end; i++) {
    formatted += value[i];
  }

  return formatted;
}

function addPadding({ padding = {}, value = "" } = {}) {
  return value.padStart(padding.length, padding.char);
}

function removePadding({ padding = {}, value = "" } = {}) {
  if (!padding.length || value.length >= padding.length) {
    return value;
  }

  let formatted = "";
  let useRemaining = false;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (useRemaining || i >= padding.length) {
      formatted += char;
    } else if (char !== padding.char) {
      formatted += char;
      useRemaining = true;
    }
  }

  return formatted;
}

function shiftSortOrder(str = "", codePoint) {
  let newString = "";
  for (let i = 0; i < str.length; i++) {
    const isLast = i === str.length - 1;
    let char = str[i];
    if (isLast) {
      char = String.fromCodePoint(char.codePointAt(0) + codePoint);
    }
    newString += char;
  }
  return newString;
}

function getFirstDefined(...params) {
  return params.find((val) => val !== undefined);
}

function regexpEscape(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  getUnique,
  batchItems,
  addPadding,
  regexpEscape,
  removePadding,
  removeFixings,
  parseJSONPath,
  shiftSortOrder,
  getFirstDefined,
  getInstanceType,
  getModelVersion,
  formatKeyCasing,
  cursorFormatter,
  genericizeJSONPath,
  commaSeparatedString,
  formatAttributeCasing,
  applyBetaModelOverrides,
  formatIndexNameForDisplay,
  BatchGetOrderMaintainer,
};

}).call(this)}).call(this,require("buffer").Buffer)
},{"./errors":21,"./types":30,"./validations":34,"buffer":3}],34:[function(require,module,exports){
const e = require("./errors");
const { KeyCasing } = require("./types");

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
      type: "boolean",
    },
    watch: {
      type: ["array", "string"],
      items: {
        type: "string",
      },
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
    padding: {
      type: "object",
      required: ["length", "char"],
      properties: {
        length: {
          type: "number",
        },
        char: {
          type: "string",
        },
      },
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
          items: {
            type: "string",
          },
          required: false,
        },
        composite: {
          type: ["array"],
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
        },
        cast: {
          type: "string",
          enum: ["string", "number"],
          required: false,
        },
        scope: {
          type: "string",
          required: false,
        },
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
        },
        cast: {
          type: "string",
          enum: ["string", "number"],
          required: false,
        },
      },
    },
    index: {
      type: "string",
    },
    collection: {
      type: ["array", "string"],
    },
    type: {
      type: "string",
      enum: ["clustered", "isolated"],
      required: false,
    },
    condition: {
      type: "any",
      required: false,
      format: "isFunction",
    },
  },
};

const Modelv1 = {
  type: "object",
  required: true,
  properties: {
    model: {
      type: "object",
      required: true,
      properties: {
        entity: {
          type: "string",
          required: true,
        },
        version: {
          type: "string",
          required: true,
        },
        service: {
          type: "string",
          required: true,
        },
      },
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
  required: ["model", "attributes", "indexes"],
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
  required: ["attributes", "indexes"],
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
      throw new e.ElectroError(
        e.ErrorCodes.InvalidModel,
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
  } catch (err) {
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
  return (
    isObjectHasLength(entityRecord) &&
    Object.values(entityRecord).find((value) => {
      return value._instance !== undefined;
    })
  );
}

function isNameModelRecordType(modelRecord) {
  return (
    isObjectHasLength(modelRecord) &&
    Object.values(modelRecord).find((value) => {
      return (
        value.model &&
        isStringHasLength(value.model.entity) &&
        isStringHasLength(value.model.version) &&
        isStringHasLength(value.model.service)
      );
    })
  );
}

function isBetaServiceConfig(serviceConfig) {
  return (
    isObjectHasLength(serviceConfig) &&
    (isStringHasLength(serviceConfig.service) ||
      isStringHasLength(serviceConfig.name)) &&
    isStringHasLength(serviceConfig.version)
  );
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
    let casingsAreEquivalent = [casing1, casing2].every((casing) => {
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
  model: validateModel,
};

},{"./errors":21,"./types":30,"jsonschema":9}],35:[function(require,module,exports){
const { MethodTypes, ExpressionTypes, BuilderTypes } = require("./types");
const {
  AttributeOperationProxy,
  ExpressionState,
  FilterOperations,
} = require("./operations");
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

  add(newExpression, filterOptions = {}) {
    const asPrefix = !!filterOptions.asPrefix;
    let expression = "";
    let existingExpression = this.expression;
    if (
      typeof existingExpression === "string" &&
      existingExpression.length > 0
    ) {
      newExpression = this._trim(newExpression);
      let isEmpty = this._isEmpty(newExpression);
      if (isEmpty) {
        return existingExpression;
      }

      if (
        !asPrefix &&
        !existingExpression.startsWith("(") &&
        !existingExpression.endsWith(")")
      ) {
        existingExpression = `(${existingExpression})`;
      }
      if (asPrefix) {
        expression = `(${newExpression}) AND ${existingExpression}`;
      } else {
        expression = `${existingExpression} AND ${newExpression}`;
      }
    } else {
      expression = this._trim(newExpression);
    }
    this.expression = expression;
  }

  // applies operations without verifying them against known attributes. Used internally for key conditions.
  unsafeSet(filterOptions, operation, name, ...values) {
    const { template } = FilterOperations[operation] || {};
    if (template === undefined) {
      throw new Error(
        `Invalid operation: "${operation}". Please report this issue via a bug ticket.`,
      );
    }
    const names = this.setName({}, name, name);
    const valueExpressions = values.map((value) => this.setValue(name, value));
    const condition = template(
      {},
      names.expression,
      names.prop,
      ...valueExpressions,
    );
    this.add(condition, filterOptions);
  }

  build() {
    return this.expression;
  }
}

class WhereFactory {
  constructor(attributes = {}, operations = {}) {
    this.attributes = { ...attributes };
    this.operations = { ...operations };
  }

  getExpressionType(methodType) {
    switch (methodType) {
      case MethodTypes.put:
      case MethodTypes.create:
      case MethodTypes.update:
      case MethodTypes.patch:
      case MethodTypes.delete:
      case MethodTypes.remove:
      case MethodTypes.upsert:
      case MethodTypes.get:
      case MethodTypes.check:
        return ExpressionTypes.ConditionExpression;
      default:
        return ExpressionTypes.FilterExpression;
    }
  }

  buildClause(cb) {
    if (typeof cb !== "function") {
      throw new e.ElectroError(
        e.ErrorCodes.InvalidWhere,
        'Where callback must be of type "function"',
      );
    }
    return (entity, state, ...params) => {
      const type = this.getExpressionType(state.query.method);
      const builder = state.query.filter[type];
      const proxy = new AttributeOperationProxy({
        builder,
        attributes: this.attributes,
        operations: this.operations,
      });
      const expression = proxy.invokeCallback(cb, ...params);
      if (typeof expression !== "string") {
        throw new e.ElectroError(
          e.ErrorCodes.InvalidWhere,
          "Invalid response from where clause callback. Expected return result to be of type string",
        );
      }
      builder.add(expression);
      return state;
    };
  }

  injectWhereClauses(clauses = {}, filters = {}) {
    let injected = { ...clauses };
    let filterParents = Object.entries(injected)
      .filter((clause) => {
        let [name, { children }] = clause;
        return children.find((child) => ["go", "commit"].includes(child));
      })
      .map(([name]) => name);
    let modelFilters = Object.keys(filters);
    let filterChildren = [];
    for (let [name, filter] of Object.entries(filters)) {
      filterChildren.push(name);
      injected[name] = {
        name,
        action: this.buildClause(filter),
        children: ["params", "go", "commit", "where", ...modelFilters],
      };
    }
    filterChildren.push("where");
    injected["where"] = {
      name: "where",
      action: (entity, state, fn) => {
        return this.buildClause(fn)(entity, state);
      },
      children: ["params", "go", "commit", "where", ...modelFilters],
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
  FilterExpression,
};

},{"./errors":21,"./operations":25,"./types":30}]},{},[16]);
