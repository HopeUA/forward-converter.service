/**
 * XML Parser module
 *
 * @module forward-converter/parser
 */

module.exports = parse;

var xml2js    = require('xml2js');
var xmlParser = new xml2js.Parser({
    normalizeTags: true,
    normalize: true
});

function parse(data) {
    "use strict";

    return new Promise(function(resolve, reject){
        xmlParser.parseString(data, function(error, result){
            var episodeData = new Set();
            var codePattern = /[A-Z]{4}\d{5}/;

            if (error) {
                reject({
                    status: 400,
                    code: "FC-001",
                    message: "Непонятный формат файла"
                });
            }

            try {
                for (let item of result.root.item) {

                    var match = codePattern.exec(item.$.file);
                    if (match == null) {
                        continue;
                    }

                    var data = new Map;
                    data.set('code', match[0]);
                    data.set('date', item.$.date);
                    data.set('time', item.$.time);
                    data.set('duration', item.$.duration);

                    episodeData.add(data);
                }
            } catch (xmlError) {
                reject({
                    status: 400,
                    code: "FC-002",
                    message: "Ошибка структуры файла: " + xmlError.message
                });
            }

            resolve(episodeData);
        });
    });
}