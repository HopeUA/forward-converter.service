var expect   = require("chai").expect;
var timecode = require("../lib/timecode.js");

describe("Timecode", function(){
    describe("#stringToUnix()", function(){
        it("should convert date and time string to unix time", function(){
            var date = '1990-03-17';
            var time = '09:42:50.45';

            var unix = timecode.stringToUnix(time, date);

            expect(unix).to.equal(637666970450);
        });

        it("should convert time string to unix time", function(){
            var time = '09:42:50.45';

            var unix = timecode.stringToUnix(time);

            expect(unix).to.equal(34970450);
        });

        it ("should throw error on invalid date", function(){
            var date = "invalid date";

            expect(function() {
                timecode.stringToUnix('', date);
            }).to.throw(Error);
        });

        it("should throw error on invalid time", function(){
            var time = "invalid time";

            expect(function() {
                timecode.stringToUnix(time);
            }).to.throw(Error);
        });

        it("should throw error on empty input", function(){
            expect(function() {
                timecode.stringToUnix();
            }).to.throw(Error);
        });
    });

    describe("#unixToString()", function(){
        it("should convert unix time to timecode with specified format", function(){
            var time   = 34970450;
            var format = "h:m:s";

            var timeString = timecode.unixToString(time, format);
            expect(timeString).to.equal("09:42:50");

            timeString = timecode.unixToString(time);
            expect(timeString).to.equal("09:42:50.45");
        });

        it("should throw error on empty input", function(){
            expect(function() {
                timecode.unixToString();
            }).to.throw(Error);
        });
    });
});

