(function() {
  var Database, portchecker, ravendb, spawn;

  ravendb = require('ravendb');

  spawn = require('child_process').spawn;

  portchecker = require('portchecker');

  Database = ravendb().__proto__;

  Database.useNTLM = function(domain, username, password, cb) {
    var getPort, user_pwd,
      _this = this;
    getPort = function(cb) {
      return portchecker.getFirstAvailable(5000, 6000, 'localhost', function(port, host) {
        return cb(port, host);
      });
    };
    user_pwd = new Buffer("" + username + ":" + password).toString('base64');
    this.setAuthorization("Basic " + user_pwd);
    if (this.ntlm != null) return false;
    return getPort(function(port, host) {
      var ntlmaps;
      try {
        ntlmaps = spawn('python', ["" + __dirname + "/../deps/ntlmaps/main.py", "--domain=" + domain, "--port=" + port]);
        _this.ntlm = ntlmaps;
        _this.ntlm.port = port;
        _this.ntlm.host = host;
        if (_this.ntlm != null) {
          _this.setProxy("http://" + _this.ntlm.host + ":" + _this.ntlm.port);
        }
        process.on('exit', function() {
          return ntlmaps.kill('SIGINT');
        });
        ntlmaps.stdout.on('data', function(data) {
          return console.log("ntlmaps stdout: " + data);
        });
        ntlmaps.stderr.on('data', function(data) {
          return console.error("ntlmaps stderr: " + data);
        });
        ntlmaps.on('exit', function(code) {
          _this.ntlm = null;
          _this.setProxy(null);
          if (code !== 0) return console.error("ntlmaps exited with code " + code);
        });
        if (cb != null) return cb(true);
      } catch (error) {
        if (cb != null) return cb(false);
      }
    });
  };

  module.exports = ravendb;

}).call(this);
