var express = require('express');
var router = express.Router();
var path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('lev', { title: 'Leverage Test' });
});

router.get('/dre', function(req, res, next) {
    //res.send('dre dont');
    //res.send(__dirname + '/../views/dre_files/dre.html');
    res.render('dre', { title: 'Dre Day' });
});


module.exports = router;
