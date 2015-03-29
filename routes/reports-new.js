var router = require('express').Router();
var parse  = require('../lib/parse');

router.post('/jobs', function(req, res, next) {
    var data = req.body.data;

    parse(data).then(function(episodesData){
        for (episode of episodesData) {

        }
    }).catch(function(parseError){
        res.status(parseError.status);
        res.json(parseError);
    });

});

module.exports = router;