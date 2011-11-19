var express = require('express');
var crypto  = require('crypto');

var resources = [];

function get_resource(id) {
 id = parseInt(id)
 for (i in resources) {
   if(resources[i].id == id){
     return resources[i] 
   }
 }
}

function destroy_resource(id) {
 id = parseInt(id)
 for (i in resources) {
   if(resources[i].id == id){
     delete resources[i] 
   }
 }
}

function basic_auth (req, res, next) {
  if (req.headers.authorization && req.headers.authorization.search('Basic ') === 0) {
    // fetch login and password
    if (new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString() == 
        process.env.HEROKU_USERNAME + ':' + process.env.HEROKU_PASSWORD) {
      next();
      return;
    }
  }
  console.log('Unable to authenticate user');
  console.log(req.headers.authorization);
  res.header('WWW-Authenticate', 'Basic realm="Admin Area"');
  res.send('Authentication required', 401);
}

function sso_auth (req, res, next) {
  if(req.params.length == 0){
    var id = req.param('id')
  }else{
    var id = req.params.id
  }
  var pre_token = id + ':' + process.env.SSO_SALT + ':' + req.param('timestamp')
  var shasum = crypto.createHash('sha1')
  shasum.update(pre_token)
  var token = shasum.digest('hex')
  if( req.param('token') != token){
    res.send("Token Mismatch", 403);
    return;
  }
  var time = (new Date().getTime() / 1000) - (2 * 60);
  console.log(req.param('timestamp'))
  console.log(time)
  if( parseInt(req.param('timestamp')) < time ){
    res.send("Timestamp Expired", 403);
    return;
  }
  next();
}

var app = express.createServer(express.logger());

//Provision
app.post('/heroku/resources', express.bodyParser(), basic_auth, function(request, response) {
  console.log(request.body)
  var resource =  {id : resources.length + 1, plan : request.body.plan }
  resources.push(resource)
  response.send(resource)
});

//Plan Change
app.put('/heroku/resources/:id', express.bodyParser(), basic_auth, function(request, response) {
  console.log(request.body)
  console.log(request.params) 
  var resource =  get_resource(request.params.id)
  resource.plan = request.body.plan
  response.send("ok")
})

//Deprovision
app.delete('/heroku/resources/:id', basic_auth, function(request, response) {
  console.log(request.params)
  destroy_resource(request.params.id)
  response.send("ok")
})

//GET SSO
app.get('/heroku/resources/:id', sso_auth, function(request, response) {
  response.redirect("/")
})

//POST SSO
app.post('/sso/login', express.bodyParser(), sso_auth, function(request, response){
  response.redirect("/")
})

//SSO LANDING PAGE
app.get('/', function(request, response) {
  response.send("hello, world")
});


var port = process.env.PORT || 4567;
app.listen(port, function() {
  console.log("Listening on " + port);
});

