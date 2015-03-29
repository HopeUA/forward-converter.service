var expect = require("chai").expect;
var parse  = require("../lib/parse.js");

describe("XML Parse", function(){
    describe("#parse()", function(){
        it("should convert xml string to set of the data maps", function(done){
            var xml = "<?xml version=\"1.0\" ?>\n<root TimeCodeFormat=\"10ms\" FrameRate=\"25.00\">\n<item type=\"Movie\" date=\"2014-03-12\" time=\"23:59:59.99\" duration=\"0:29:44.56\" fadeIn=\"0.10\" file=\"E:\\stream\\OKNA\\OKNA02608.mov\" fadeOut=\"0.00\" realDuration=\"0:29:44.56\" error=\"0\">\n\n  <movie file=\"E:\\stream\\OKNA\\OKNA02608.mov\" crossfade=\"0.10\" duration=\"0:29:44.56\" file_duration=\"0:29:44.56\" \/>\n\n<\/item>\n<item type=\"Movie\" date=\"2014-03-12\" time=\"0:29:44.46\" duration=\"0:18:39.64\" fadeIn=\"0.10\" file=\"E:\\stream\\LLZA\\LLZA02010.mov\" fadeOut=\"0.10\" realDuration=\"0:18:39.62\" error=\"0\">\n\n  <movie file=\"E:\\stream\\LLZA\\LLZA02010.mov\" crossfade=\"0.10\" duration=\"0:18:39.64\" file_duration=\"0:18:39.64\" \/>\n\n<\/item>\n<\/root>";
            parse(xml).then(function(result){
                expect(result.size).to.equal(2);
            }).then(done, done);
        });

        it("should return error (FC-001) on invalid input", function(done){
            var xml = "invalid xml";
            parse(xml).catch(function(error){
                expect(error.code).to.equal('FC-001')
            }).then(done, done);
        });

        it("should return error (FC-002) on invalid xml structure", function(done){
            var xml = "<?xml version=\"1.0\" ?>\n<root TimeCodeFormat=\"10ms\" FrameRate=\"25.00\">\n<\/root>";
            parse(xml).catch(function(error){
                expect(error.code).to.equal('FC-002')
            }).then(done, done);
        });
    });
});
