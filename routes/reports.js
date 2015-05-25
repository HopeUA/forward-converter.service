var fs      = require('fs');
var express = require('express');
var router  = express.Router();
var xml2js  = require('xml2js');
var request = require('request');
var xlsx    = require('node-xlsx');
var config  = require('config');
var timecode = require('../lib/timecode');

var parser = new xml2js.Parser({
    normalizeTags: true,
    normalize: true
});

var mediaAPIendpoint = config.get('mediaApi.endpoint');
var mediaAPItoken    = config.get('mediaApi.token');

router.post('/jobs', function(req, res, next) {
    var data = req.body.data;
    var episodeDataQueue = [];

    var nextEpisodeData = function(idx){
        idx = idx || 0;

        var codePattern = /[A-Z]{4}\d{5}/;
        var infoPattern = /INFO_/;

        if (!(idx in episodeDataQueue)) {
            saveXls();
            return;
        }

        var nextIndex = idx + 1;
        var code      = episodeDataQueue[idx].code;

        if (codePattern.test(code)) {
            var url       = mediaAPIendpoint + '/episodes/' + code + '?token=' + mediaAPItoken;

            var options = {
                url: url
            };
            request(options, function(error, response, body){
                if (response.statusCode == 200) {
                    var data = JSON.parse(body);

                    episodeDataQueue[idx].title   = data.title;
                    episodeDataQueue[idx].program = data.show.title;
                    episodeDataQueue[idx].author  = data.author;
                    episodeDataQueue[idx].guests  = data.guests;
                }

                nextEpisodeData(nextIndex);
            });
        } else if (infoPattern.test(code)) {
            episodeDataQueue[idx].title   = 'Анонс';
            episodeDataQueue[idx].program = 'Анонс';
            nextEpisodeData(nextIndex);
        } else {
            episodeDataQueue[idx].title   = 'Рубрикатор';
            episodeDataQueue[idx].program = 'Рубрикатор';
            nextEpisodeData(nextIndex);
        }

    };

    parser.parseString(data, function(err, result){
        var item;
        var codePattern = /([^\\]+)\.mov/;
        var converted = [];

        if (err) {
            res.status(400);
            res.json({
                error: {
                    code: 'FC-001',
                    message: 'Непонятный формат файла'
                }
            });
            return;
        }

        try {
            for (item of result.root.item) {

                var match = codePattern.exec(item.$.file);
                if (match == null) {
                    continue;
                }

                var code = match[1];
                episodeDataQueue.push(
                    {
                        code: code,
                        date: item.$.date,
                        time: item.$.time,
                        duration: item.$.duration
                    }
                );
            }

            nextEpisodeData();
        } catch (xmlError) {
            res.status(400);
            res.json({
                error: {
                    code: 'FC-002',
                    message: 'Ошибка структуры файла: ' + xmlError.message
                }
            });
        }

    });

    var saveXls = function (){
        var data = [[
            'Программа',
            'Тема',
            'Длительность',
            'Таймкод',
            'Автор',
            'Ведущий',
            'Гости',
            'Код',
            'Дата'
        ]];
        var item = null;
        for (item of episodeDataQueue) {
            var dateStart = timecode.stringToUnix(item.time, item.date);
            var duration  = timecode.stringToUnix(item.duration);
            var dateEnd   = dateStart + duration;

            try {
                data.push([
                    item.program,
                    item.title,
                    timecode.unixToString(duration, "h:m:s"),
                    timecode.unixToString(dateStart, "h:m") + ' – ' + timecode.unixToString(dateEnd, "h:m"),
                    '',
                    item.author,
                    item.guests,
                    item.code,
                    item.date
                ]);
            } catch (error) {
                data.push([
                    error.message,
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    ''
                ]);
            }
        }

        var buffer = xlsx.build([{name: item.date, data: data}]);
        fs.writeFile('data/' + item.date + '.xlsx', buffer, function(){
            var file = 'http://' + req.headers.host + '/data/' + item.date + '.xlsx';
            sendResponse(file);
        });
    };

    var sendResponse = function(file){
        res.json({
            'xlsx': file
        });
    };
});

module.exports = router;
