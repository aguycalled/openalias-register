const express = require('express')
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const bitcore = require('bitcore-lib');
const Message = require('bitcore-message');
const fs = require('fs');
const util = require('util');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const auth = "Basic " + new Buffer(config.user + ":" + config.password).toString("base64");

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
  res.render('index', {step: 0, error: ''});
})
app.post('/', function (req, res) {
  if(req.body.address && req.body.email) {
    if(/[^a-zA-Z0-9\.]/.test(req.body.email)) {
      res.render('index', {step: 0, error: 'Username can only contain alphanumeric characters (a-z and 0-9) and dots (.)'});
      return;
    }
    try {
      new bitcore.Address(req.body.address);
    }catch(e){
      res.render('index', {step: 0, error: 'Invalid NavCoin address'});
      return;
    }
    request({ url: util.format(config.url, req.body.email+".nav.community", "txt"), headers: { "Authorization": auth } }, function (err, response, body) {
      if(err){
        res.render('index', {step: 0, error: 'Internal error, please try again'});
      } else {
        let r = JSON.parse(body);
        if(!req.body.signature) {
	  console.log(r);
          if(r.length > 0) {
            var prevAddress = r[0].value.split("oa1:nav recipient_address=")[1].split(";")[0];
            if(!prevAddress) {
              res.render('index', {step: 0, error: 'This username is already registered.'});
            } else {
              res.render('index', {step: 1, error: 'This username is already registered! Provide a cryptographic signature to update it.', prevaddress: prevAddress, address: req.body.address, email: req.body.email});
            }
          } else {
            res.render('index', {step: 1, error: '', prevaddress: req.body.address, address: req.body.address, email: req.body.email});
          }
        } else {
          try {
            var boolMessage = Message(req.body.email+'@nav.community').verify(req.body.prevaddress, req.body.signature);
          }catch(e){
            res.render('index', {step: 1, error: 'Wrong signature', prevaddress: req.body.prevaddress, address: req.body.address, email: req.body.email});
            return;
          }
          if(!boolMessage) {
            res.render('index', {step: 1, error: 'Wrong signature', prevaddress: req.body.prevaddress, address: req.body.address, email: req.body.email});
          } else {
            request({ url: util.format(config.url, req.body.email+".nav.community", "txt"), method: "POST", headers: { "Authorization": auth }, body: "oa1:nav recipient_address="+req.body.address+";" }, function (err, response, body) {
              if(err){
                res.render('index', {step: 1, error: 'Internal error', prevaddress: req.body.address, address: req.body.address, email: req.body.email});
              } else {
                res.render('index', {step: 2, error: '', address: req.body.address, email: req.body.email});
              }
            });
          }
        }
      };
    });
  } else {
    res.render('index', {step: 0, error: 'Please indicate a NavCoin address and username.'});
  }
})

app.listen(config.port, function () {
})
