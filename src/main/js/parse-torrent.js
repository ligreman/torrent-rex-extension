//Minified Rusha:
(function () {
    if (typeof module !== 'undefined') {
        module.exports = Rusha;
    }
    if (typeof window !== 'undefined') {
        window.Rusha = Rusha;
    }
    if (typeof FileReaderSync !== 'undefined') {
        var reader = new FileReaderSync(), hasher = new Rusha(4 * 1024 * 1024);
        self.onmessage = function onMessage(event) {
            var hash, data = event.data.data;
            if (data instanceof Blob) {
                try {
                    data = reader.readAsBinaryString(data);
                } catch (e) {
                    self.postMessage({id: event.data.id, error: e.name});
                    return;
                }
            }
            hash = hasher.digest(data);
            self.postMessage({id: event.data.id, hash: hash});
        };
    }
    function Rusha(sizeHint) {
        "use strict";
        var self = {fill: 0};
        var padlen = function (len) {
            return len + 1 + ((len) % 64 < 56 ? 56 : 56 + 64) - (len) % 64 + 8;
        };
        var padZeroes = function (bin, len) {
            for (var i = len >> 2; i < bin.length; i++)bin[i] = 0;
        };
        var padData = function (bin, len) {
            bin[len >> 2] |= 0x80 << (24 - (len % 4 << 3));
            bin[(((len >> 2) + 2) & ~0x0f) + 15] = len << 3;
        };
        var convStr = function (str, bin, len) {
            var i;
            for (i = 0; i < len; i = i + 4 | 0) {
                bin[i >> 2] = str.charCodeAt(i) << 24 | str.charCodeAt(i + 1) << 16 | str.charCodeAt(i + 2) << 8 | str.charCodeAt(i + 3);
            }
        };
        var convBuf = function (buf, bin, len) {
            var i, m = len % 4, j = len - m;
            for (i = 0; i < j; i = i + 4 | 0) {
                bin[i >> 2] = buf[i] << 24 | buf[i + 1] << 16 | buf[i + 2] << 8 | buf[i + 3];
            }
            switch (m) {
                case 0:
                    bin[j >> 2] |= buf[j + 3];
                case 3:
                    bin[j >> 2] |= buf[j + 2] << 8;
                case 2:
                    bin[j >> 2] |= buf[j + 1] << 16;
                case 1:
                    bin[j >> 2] |= buf[j] << 24;
            }
        };
        var conv = function (data, bin, len) {
            if (typeof data === 'string') {
                return convStr(data, bin, len);
            } else if (data instanceof Array || (typeof global !== 'undefined' && typeof global.Buffer !== 'undefined' && global.Buffer.isBuffer(data))) {
                return convBuf(data, bin, len);
            } else if (data instanceof ArrayBuffer) {
                return convBuf(new Uint8Array(data), bin, len);
            } else if (data.buffer instanceof ArrayBuffer) {
                return convBuf(new Uint8Array(data.buffer), bin, len);
            } else {
                throw new Error('Unsupported data type.');
            }
        };
        var hex = function (arrayBuffer) {
            var i, x, hex_tab = "0123456789abcdef", res = [], binarray = new Uint8Array(arrayBuffer);
            for (i = 0; i < binarray.length; i++) {
                x = binarray[i];
                res[i] = hex_tab.charAt((x >> 4) & 0xF) +
                    hex_tab.charAt((x >> 0) & 0xF);
            }
            return res.join('');
        };
        var nextPow2 = function (v) {
            var p = 1;
            while (p < v)p = p << 1;
            return p;
        };
        var resize = function (size) {
            self.sizeHint = size;
            self.heap = new ArrayBuffer(nextPow2(padlen(size) + 320));
            self.core = RushaCore({Int32Array: Int32Array, DataView: DataView}, {}, self.heap);
        };
        resize(sizeHint || 0);
        var coreCall = function (len) {
            var h = new Int32Array(self.heap, len << 2, 5);
            h[0] = 1732584193;
            h[1] = -271733879;
            h[2] = -1732584194;
            h[3] = 271733878;
            h[4] = -1009589776;
            self.core.hash(len);
        };
        var rawDigest = this.rawDigest = function (str) {
            var len = str.byteLength || str.length;
            if (len > self.sizeHint) {
                resize(len);
            }
            var view = new Int32Array(self.heap, 0, padlen(len) >> 2);
            padZeroes(view, len);
            conv(str, view, len);
            padData(view, len);
            coreCall(view.length);
            var out = new Int32Array(5);
            var arr = new DataView(out.buffer);
            arr.setInt32(0, view[0], false);
            arr.setInt32(4, view[1], false);
            arr.setInt32(8, view[2], false);
            arr.setInt32(12, view[3], false);
            arr.setInt32(16, view[4], false);
            return out;
        };
        this.digest = this.digestFromString = this.digestFromBuffer = this.digestFromArrayBuffer = function (str) {
            return hex(rawDigest(str).buffer);
        };
    }

    function RushaCore(stdlib, foreign, heap) {
        "use asm";
        var H = new stdlib.Int32Array(heap);

        function hash(k) {
            k = k | 0;
            var i = 0, j = 0, y0 = 0, z0 = 0, y1 = 0, z1 = 0, y2 = 0, z2 = 0, y3 = 0, z3 = 0, y4 = 0, z4 = 0, t0 = 0, t1 = 0;
            y0 = H[k + 0 << 2 >> 2] | 0;
            y1 = H[k + 1 << 2 >> 2] | 0;
            y2 = H[k + 2 << 2 >> 2] | 0;
            y3 = H[k + 3 << 2 >> 2] | 0;
            y4 = H[k + 4 << 2 >> 2] | 0;
            for (i = 0; (i | 0) < (k | 0); i = i + 16 | 0) {
                z0 = y0;
                z1 = y1;
                z2 = y2;
                z3 = y3;
                z4 = y4;
                for (j = 0; (j | 0) < 16; j = j + 1 | 0) {
                    t1 = H[i + j << 2 >> 2] | 0;
                    t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 & y2 | ~y1 & y3) | 0) + ((t1 + y4 | 0) + 1518500249 | 0) | 0);
                    y4 = y3;
                    y3 = y2;
                    y2 = ((y1) << 30 | (y1) >>> 2);
                    y1 = y0;
                    y0 = t0;
                    H[k + j << 2 >> 2] = t1;
                }
                for (j = k + 16 | 0; (j | 0) < (k + 20 | 0); j = j + 1 | 0) {
                    t1 = (((H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) << 1 | (H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) >>> 31));
                    t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 & y2 | ~y1 & y3) | 0) + ((t1 + y4 | 0) + 1518500249 | 0) | 0);
                    y4 = y3;
                    y3 = y2;
                    y2 = ((y1) << 30 | (y1) >>> 2);
                    y1 = y0;
                    y0 = t0;
                    H[j << 2 >> 2] = t1;
                }
                for (j = k + 20 | 0; (j | 0) < (k + 40 | 0); j = j + 1 | 0) {
                    t1 = (((H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) << 1 | (H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) >>> 31));
                    t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 ^ y2 ^ y3) | 0) + ((t1 + y4 | 0) + 1859775393 | 0) | 0);
                    y4 = y3;
                    y3 = y2;
                    y2 = ((y1) << 30 | (y1) >>> 2);
                    y1 = y0;
                    y0 = t0;
                    H[j << 2 >> 2] = t1;
                }
                for (j = k + 40 | 0; (j | 0) < (k + 60 | 0); j = j + 1 | 0) {
                    t1 = (((H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) << 1 | (H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) >>> 31));
                    t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 & y2 | y1 & y3 | y2 & y3) | 0) + ((t1 + y4 | 0) - 1894007588 | 0) | 0);
                    y4 = y3;
                    y3 = y2;
                    y2 = ((y1) << 30 | (y1) >>> 2);
                    y1 = y0;
                    y0 = t0;
                    H[j << 2 >> 2] = t1;
                }
                for (j = k + 60 | 0; (j | 0) < (k + 80 | 0); j = j + 1 | 0) {
                    t1 = (((H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) << 1 | (H[j - 3 << 2 >> 2] ^ H[j - 8 << 2 >> 2] ^ H[j - 14 << 2 >> 2] ^ H[j - 16 << 2 >> 2]) >>> 31));
                    t0 = ((((y0) << 5 | (y0) >>> 27) + (y1 ^ y2 ^ y3) | 0) + ((t1 + y4 | 0) - 899497514 | 0) | 0);
                    y4 = y3;
                    y3 = y2;
                    y2 = ((y1) << 30 | (y1) >>> 2);
                    y1 = y0;
                    y0 = t0;
                    H[j << 2 >> 2] = t1;
                }
                y0 = y0 + z0 | 0;
                y1 = y1 + z1 | 0;
                y2 = y2 + z2 | 0;
                y3 = y3 + z3 | 0;
                y4 = y4 + z4 | 0;
            }
            H[0] = y0;
            H[1] = y1;
            H[2] = y2;
            H[3] = y3;
            H[4] = y4;
        }

        return {hash: hash};
    }
})();
//End Minified Rusha

function bdecode(str) {
    if (pos > str.length) {
        return null;
    }
    switch (str[pos]) {
        case 100: //char code for 'd'
            pos++;
            var retval = [];
            while (str[pos] != 101) { // char code for 'e'
                var key = bdecode(str);
                var val = bdecode(str);
                if (key === null || val === null)
                    break;
                retval[key] = val;
            }
            if (infoEnd == -1)
                infoEnd = pos + 1;
            retval["isDct"] = true;
            pos++;
            return retval;

        case 108: // char code for 'l'
            pos++;
            var retval2 = [];
            while (str[pos] != 101) { // char code for 'e'
                var val2 = bdecode(str);
                if (val2 === null)
                    break;
                retval2.push(val2);
            }
            pos++;
            return retval2;

        case 105: //char code for 'i'
            pos++;
            var digits = Array.prototype.indexOf.call(str, 101, pos) - pos; // 101 = char code for 'e'
            var val3 = "";
            for (i = pos; i < digits + pos; i++) {
                val3 += String.fromCharCode(str[i]);
            }
            val3 = Math.round(parseFloat(val3));
            pos += digits + 1;
            return val3;

        default:
            var digits2 = Array.prototype.indexOf.call(str, 58, pos) - pos; //58 = char code for ':'
            if (digits2 < 0 || digits2 > 20)
                return null;
            var len2 = "";
            for (i = pos; i < digits2 + pos; i++) {
                len2 += String.fromCharCode(str[i]);
            }
            var len = parseInt(len2);
            pos += digits2 + 1;
            var fstring = "";
            for (i = pos; i < len + pos; i++) {
                fstring += String.fromCharCode(str[i]);
            }
            pos += len;
            if (fstring == "info") {
                infoBegin = pos;
                infoEnd = -1;
            }
            return fstring;
    }
}


/****/
var pos = 0;
var infoBegin = 0;
var infoEnd = 0;
var torrentArrayBuffer;
var r = new Rusha();

//window.onload = function() {
var fileInput = document.getElementById('fileInput');
var fileDisplayArea = document.getElementById('fileDisplayArea');

fileInput.addEventListener('change', function (e) {
    var file = fileInput.files[0];
    var reader = new FileReader();

    reader.onload = function (e) {
        pos = 0;
        torrentArrayBuffer = reader.result;
        var int8view = new Uint8Array(torrentArrayBuffer);
        console.log(bdecode(int8view));
        console.log("Info_Hash: " + r.digestFromArrayBuffer(torrentArrayBuffer.slice(infoBegin, infoEnd)));
    };

    reader.readAsArrayBuffer(file);
});
/****/