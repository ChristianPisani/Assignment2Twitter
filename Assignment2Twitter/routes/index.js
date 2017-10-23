var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Twitter Search' });
});

router.get('/tweets', function(req, res) {
  let keywords = req.param('keywords');

  //Remove dangerous symbols
  keywords = keywords.replace(/(["´`'])/g, '');
  keywords = keywords.split(',');

  res.json(keywords);
  res.end();
});

router.get("/visualization", function(req, res) {
  res.render('datavisualization', {title: 'Data'});
});

module.exports = router;
