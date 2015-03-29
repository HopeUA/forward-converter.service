/**
 * Timecode module
 *
 * @module forward-converter/timecode
 */

exports = module.exports = {};

/**
 * Converts string date and time to unix time
 *
 * @param {string} time - Timecode, format hh:mm:ss.ms
 * @param {string} [date] - Date, format yyyy-mm-dd
 * @returns {number} Unix time
 */
exports.stringToUnix = function(time, date){
    "use strict";

    var unix = 0;

    var timeRegExp = /(\d{1,2}):(\d{2}):(\d{2})\.(\d{2})/;
    var dateRegExp = /(\d{4})\-(\d{2})\-(\d{2})/;

    // Date
    if (typeof date != "undefined") {
        var dateMatches = dateRegExp.exec(date);

        if (dateMatches == null) {
            throw new Error("Date format error: " + date + " (expects 0000-00-00)");
        }

        unix += Date.UTC(
            parseInt(dateMatches[1]),
            parseInt(dateMatches[2]) - 1,
            parseInt(dateMatches[3]),
            0,
            0,
            0,
            0
        );
    }

    // Time
    var timeMatches = timeRegExp.exec(time);

    if (timeMatches == null) {
        throw new Error("Time format error: " + time + " (expects 00:00:00.00)");
    }

    unix += parseInt(timeMatches[1]) * 60 * 60 * 1000
            + parseInt(timeMatches[2]) * 60 * 1000
            + parseInt(timeMatches[3]) * 1000
            + parseInt(timeMatches[4]) * 10;

    return unix;
};

/**
 * Converts unix time to timecode string
 *
 * @param {number} time - Unix time
 * @param {string} [format=h:m:s.ms] - Timecode format (vars: h,m,s,ms)
 *
 * @returns {string} Timecode
 */
exports.unixToString = function(time, format){
    "use strict";

    if (typeof time === "undefined") {
        throw Error("Unix time expected");
    }

    var date     = new Date(time);
    var timecode = format || "h:m:s.ms";


    timecode = timecode.replace(/ms/g, Math.floor(date.getUTCMilliseconds().pad() / 10).pad());
    timecode = timecode.replace(/s/g,  date.getUTCSeconds().pad());
    timecode = timecode.replace(/m/g,  date.getUTCMinutes().pad());
    timecode = timecode.replace(/h/g,  date.getUTCHours().pad());

    return timecode;
};

/**
 * Adds lead zeros to number
 *
 * @param {number} [size=2] - Length of the string result
 * @returns {string}
 */
Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {
        s = "0" + s;
    }

    return s;
};
