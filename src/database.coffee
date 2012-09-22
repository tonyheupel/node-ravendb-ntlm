ravendb = require('ravendb')
spawn = require('child_process').spawn
portchecker = require('portchecker')


# Get a reference to the Database class
Database = ravendb.Database


Database.prototype.useNTLM = (domain, username, password, proxyHost='localhost', port=null, cb=null) ->

  @setBasicAuthorization username, password

  if @ntlm?
    if cb?
      cb(@ntlm)
    else
      return

  defineGetPort = (port, proxyHost) ->
    if port?
      getPort = (getPortCallback) ->
        getPortCallback(port, proxyHost)
    else
      getPort = (getPortCallback) ->
        portchecker.getFirstAvailable 5000, 6000, proxyHost, getPortCallback

    getPort


  getPort = defineGetPort port, proxyHost
  getPort (port, host) =>
    try
      ntlmaps = spawn 'python', ["#{__dirname}/../deps/ntlmaps/main.py",
                                 "--domain=#{domain}",
                                 # "--username=#{username}",
                                 # "--password=#{password}",
                                 "--port=#{port}"]

      @ntlm = ntlmaps
      @ntlm.port = port
      @ntlm.host = host

      @setProxy "http://#{@ntlm.host}:#{@ntlm.port}" if @ntlm?


      process.on 'exit', ->
        ntlmaps.kill 'SIGINT'


      ntlmaps.stdout.on 'data', (data) ->
        console.log "ntlmaps stdout: #{data}"


      ntlmaps.stderr.on 'data', (data) ->
        console.error "ntlmaps stderr: #{data}"


      ntlmaps.on 'exit', (code) =>
        @ntlm = null
        @setProxy null
        console.error "ntlmaps exited with code #{code}" if code isnt 0

      cb(true) if cb?
    catch error
      cb(false) if cb?



module.exports = ravendb
