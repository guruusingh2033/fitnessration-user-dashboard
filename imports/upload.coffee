class writeStream
  constructor: (@path, @maxLength, @file) ->
    self           = @
    @stream        = fs.createWriteStream @path, {flags: 'a', mode: self.permissions, highWaterMark: 0}
    @drained       = true
    @writtenChunks = 0

    @stream.on 'drain', -> bound ->
      ++self.writtenChunks
      self.drained = true
      return

    @stream.on 'error', (error) -> bound ->
      return

  ###
  @memberOf writeStream
  @name write
  @param {Number} num - Chunk position in stream
  @param {Buffer} chunk - Chunk binary data
  @param {Function} callback - Callback
  @summary Write chunk in given order
  @returns {Boolean} - True if chunk is sent to stream, false if chunk is set into queue
  ###
  write: (num, chunk, callback) ->
    if not @stream._writableState.ended and num > @writtenChunks
      if @drained and num is (@writtenChunks + 1)
        @drained = false
        @stream.write chunk, callback
        return true
      else
        self = @
        Meteor.setTimeout ->
          self.write num, chunk
          return
        , 25
    return false

  ###
  @memberOf writeStream
  @name end
  @param {Function} callback - Callback
  @summary Finishes writing to writableStream, only after all chunks in queue is written
  @returns {Boolean} - True if stream is fulfilled, false if queue is in progress
  ###
  end: (callback) ->
    unless @stream._writableState.ended
      if @writtenChunks is @maxLength
        @stream.end callback
        return true
      else
        self = @
        Meteor.setTimeout ->
          self.end callback
          return
        , 25
    return false


bound = Meteor.bindEnvironment (callback) -> return callback()
WebApp.connectHandlers.use (request, response, next) ->
  if !!~request._parsedUrl.path.indexOf "#{self.downloadRoute}/#{self.collectionName}/__upload"
    if request.method is 'POST'
      body        = ''
      handleError = (error) ->
        console.warn "[FilesCollection] [Upload] [HTTP] Exception:", error
        response.writeHead 500
        response.end JSON.stringify {error}
        return

      request.on 'data', (data) -> bound ->
        body += data
        return

      request.on 'end', -> bound ->
        try
          opts            = JSON.parse body
          user            = self._getUser {request, response}
          _continueUpload = self._continueUpload opts.fileId
          unless _continueUpload
            throw new Meteor.Error 408, 'Can\'t continue upload, session expired. Start upload again.'

          {result, opts}  = self._prepareUpload _.extend(opts, _continueUpload), user.userId, 'HTTP'

          if opts.eof
            Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))()
            response.writeHead 200
            result.file.meta = fixJSONStringify result.file.meta if result?.file?.meta
            response.end JSON.stringify result
          else
            self.emit '_handleUpload', result, opts, NOOP

          response.writeHead 200
          response.end JSON.stringify {success: true}
        catch error
          handleError error
        return
    else
      next()
    return

_prepareUpload: if Meteor.isServer then (opts, userId, transport) ->
  opts.eof       ?= false
  opts.binData   ?= 'EOF'
  opts.chunkId   ?= -1
  opts.FSName    ?= opts.fileId
  opts.file.meta ?= {}

  console.info "[FilesCollection] [Upload] [#{transport}] Got ##{opts.chunkId}/#{opts.fileLength} chunks, dst: #{opts.file.name or opts.file.fileName}" if @debug

  fileName = @_getFileName opts.file
  {extension, extensionWithDot} = @_getExt fileName

  result           = opts.file
  result.path      = "#{@storagePath}#{nodePath.sep}#{opts.FSName}#{extensionWithDot}"
  result.name      = fileName
  result.meta      = opts.file.meta
  result.extension = extension
  result.ext       = extension
  result           = @_dataToSchema result
  result._id       = opts.fileId
  result.userId    = userId if userId

  if @onBeforeUpload and _.isFunction @onBeforeUpload
    isUploadAllowed = @onBeforeUpload.call(_.extend({
      file: opts.file
    }, {
      chunkId: opts.chunkId
      userId:  result.userId
      user:    -> if Meteor.users then Meteor.users.findOne(result.userId) else null
      eof:     opts.eof
    }), result)

    if isUploadAllowed isnt true
      throw new Meteor.Error(403, if _.isString(isUploadAllowed) then isUploadAllowed else '@onBeforeUpload() returned false')
  return {result, opts}

_handleUpload: if Meteor.isServer then (result, opts, cb) ->
  self = @

  try
    if opts.eof
      @_currentUploads[result._id].end -> bound ->
        self.emit '_finishUpload', result, opts, cb
        return
    else
      @_currentUploads[result._id].write opts.chunkId, new Buffer(opts.binData, 'base64'), cb
  catch e
    cb and cb e
  return

@_createStream = (_id, path, opts) ->
  return self._currentUploads[_id] = new writeStream path, opts.fileLength, opts

@_continueUpload = (_id) ->
  if self._currentUploads?[_id]?.file
    unless self._currentUploads[_id].stream._writableState.ended
      return self._currentUploads[_id].file
    else
      self._createStream _id, self._currentUploads[_id].file.file.path, self._currentUploads[_id].file
      return self._currentUploads[_id].file
  else
    contUpld = self._preCollection.findOne {_id}
    if contUpld
      self._createStream _id, contUpld.file.path, contUpld.file
    return contUpld

_methods[self._methodNames._Start] = (opts, returnMeta) ->
  check opts, {
    file:       Object
    fileId:     String
    FSName:     Match.Optional String
    chunkSize:  Number
    fileLength: Number
  }

  check returnMeta, Match.Optional Boolean

  console.info "[FilesCollection] [File Start Method] #{opts.file.name} - #{opts.fileId}" if self.debug
  {result}       = self._prepareUpload _.clone(opts), @userId, 'Start Method'
  opts._id       = opts.fileId
  opts.createdAt = new Date()
  self._preCollection.insert opts
  self._createStream result._id, result.path, opts

  if returnMeta
    return {
      uploadRoute: "#{self.downloadRoute}/#{self.collectionName}/__upload"
      file: result
    }
  else
    return true


_methods[self._methodNames._Write] = (opts) ->
  check opts, {
    eof:     Match.Optional Boolean
    fileId:  String
    binData: Match.Optional String
    chunkId: Match.Optional Number
  }

  _continueUpload = self._continueUpload opts.fileId
  unless _continueUpload
    throw new Meteor.Error 408, 'Can\'t continue upload, session expired. Start upload again.'

  @unblock()
  {result, opts} = self._prepareUpload _.extend(opts, _continueUpload), @userId, 'DDP'

  if opts.eof
    try
      return Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))()
    catch e
      console.warn "[FilesCollection] [Write Method] [DDP] Exception:", e if self.debug
      throw e
  else
    self.emit '_handleUpload', result, opts, NOOP
  return true


class UploadInstance
  # __proto__: EventEmitter.prototype
  constructor: (@config, @collection) ->
    EventEmitter.call @
    console.info '[FilesCollection] [insert()]' if @collection.debug
    self                     = @
    @config.meta            ?= {}
    @config.streams         ?= 2
    @config.streams          = 2 if @config.streams < 1
    @config.transport       ?= 'ddp'
    @config.chunkSize       ?= @collection.chunkSize
    @config.allowWebWorkers ?= true
    @config.transport        = @config.transport.toLowerCase()

    check @config, {
      file:            Match.Any
      fileName:        Match.Optional String
      meta:            Match.Optional Object
      onError:         Match.Optional Function
      onAbort:         Match.Optional Function
      streams:         Match.OneOf 'dynamic', Number
      onStart:         Match.Optional Function
      transport:       Match.OneOf 'http', 'ddp'
      chunkSize:       Match.OneOf 'dynamic', Number
      onUploaded:      Match.Optional Function
      onProgress:      Match.Optional Function
      onBeforeUpload:  Match.Optional Function
      allowWebWorkers: Boolean
    }

    if @config.file
      if @collection.debug
        console.time('insert ' + @config.file.name)
        console.time('loadFile ' + @config.file.name)

      if Worker and @config.allowWebWorkers
        @worker = new Worker '/packages/ostrio_files/worker.js'
      else
        @worker = null

      @config.debug = @collection.debug
      @currentChunk = 0
      @transferTime = 0
      @trackerComp  = null
      @sentChunks   = 0
      @fileLength   = 1
      @EOFsent      = false
      @FSName       = if @collection.namingFunction then @collection.namingFunction(@config.file) else @fileId
      @fileId       = Random.id()
      @pipes        = []
      @fileData     =
        size: @config.file.size
        type: @config.file.type
        name: @config.fileName or @config.file.name
        meta: @config.meta

      @fileData = _.extend @fileData, @collection._getExt(self.config.file.name), {mime: @collection._getMimeType(@fileData)}
      @fileData['mime-type'] = @fileData.mime

      @result = new @collection._FileUpload _.extend self.config, {@fileData, @fileId, _Abort: @collection._methodNames._Abort}

      @beforeunload = (e) ->
        message = if _.isFunction(self.collection.onbeforeunloadMessage) then self.collection.onbeforeunloadMessage.call(self.result, self.fileData) else self.collection.onbeforeunloadMessage
        e.returnValue = message if e
        return message
      @result.config.beforeunload = @beforeunload
      window.addEventListener 'beforeunload', @beforeunload, false

      @result.config._onEnd = -> self.emitEvent '_onEnd'

      @addListener 'end', @end
      @addListener 'start', @start
      @addListener 'upload', @upload
      @addListener 'sendEOF', @sendEOF
      @addListener 'prepare', @prepare
      @addListener 'sendChunk', @sendChunk
      @addListener 'proceedChunk', @proceedChunk
      @addListener 'createStreams', @createStreams

      @addListener 'calculateStats', _.throttle ->
        _t = (self.transferTime / self.sentChunks) / self.config.streams
        self.result.estimateTime.set (_t * (self.fileLength - self.sentChunks))
        self.result.estimateSpeed.set (self.config.chunkSize / (_t / 1000))
        progress = Math.round((self.sentChunks / self.fileLength) * 100)
        self.result.progress.set progress
        self.config.onProgress and self.config.onProgress.call self.result, progress, self.fileData
        self.result.emitEvent 'progress', [progress, self.fileData]
        return
      , 250

      @addListener '_onEnd', ->
        Meteor.clearInterval(self.result.estimateTimer) if self.result.estimateTimer
        self.worker.terminate() if self.worker
        self.trackerComp.stop() if self.trackerComp
        window.removeEventListener('beforeunload', self.beforeunload, false) if self.beforeunload
        self.result.progress.set(0) if self.result
    else
      throw new Meteor.Error 500, '[FilesCollection] [insert] Have you forget to pass a File itself?'

  end: (error, data) ->
    console.timeEnd('insert ' + @config.file.name) if @collection.debug
    @emitEvent '_onEnd'
    @result.emitEvent 'uploaded', [error, data]
    @config.onUploaded and @config.onUploaded.call @result, error, data
    if error
      console.error '[FilesCollection] [insert] [end] Error:', error if @collection.debug
      @result.abort()
      @result.state.set 'aborted'
      @result.emitEvent 'error', [error, @fileData]
      @config.onError and @config.onError.call @result, error, @fileData
    else
      @result.state.set 'completed'
      @collection.emitEvent 'afterUpload', [data]
    @result.emitEvent 'end', [error, (data or @fileData)]
    return @result

  sendChunk: (evt) ->
    self = @
    opts =
      fileId:     @fileId
      binData:    evt.data.bin
      chunkId:    evt.data.chunkId

    @emitEvent 'data', [evt.data.bin]
    if @pipes.length
      for pipeFunc in @pipes
        opts.binData = pipeFunc opts.binData

    if @fileLength is evt.data.chunkId
      console.timeEnd('loadFile ' + @config.file.name) if @collection.debug
      @emitEvent 'readEnd'

    if opts.binData and opts.binData.length
      if @config.transport is 'ddp'
        Meteor.call @collection._methodNames._Write, opts, (error) ->
          self.transferTime += (+new Date) - evt.data.start
          if error
            if self.result.state.get() isnt 'aborted'
              self.emitEvent 'end', [error]
          else
            ++self.sentChunks
            if self.sentChunks >= self.fileLength
              self.emitEvent 'sendEOF', [opts]
            else if self.currentChunk < self.fileLength
              self.emitEvent 'upload'
            self.emitEvent 'calculateStats'
          return
      else
        opts.file.meta = fixJSONStringify opts.file.meta if opts?.file?.meta
        HTTP.call 'POST', "#{@collection.downloadRoute}/#{@collection.collectionName}/__upload", {data: opts}, (error, result) ->
          self.transferTime += (+new Date) - evt.data.start
          if error
            if "#{error}" is "Error: network"
              self.result.pause()
            else
              if self.result.state.get() isnt 'aborted'
                self.emitEvent 'end', [error]
          else
            ++self.sentChunks
            if self.sentChunks >= self.fileLength
              self.emitEvent 'sendEOF', [opts]
            else if self.currentChunk < self.fileLength
              self.emitEvent 'upload'
            self.emitEvent 'calculateStats'
          return
    return

  sendEOF: (opts) ->
    unless @EOFsent
      @EOFsent = true
      self = @
      opts =
        eof:    true
        fileId: @fileId

      if @config.transport is 'ddp'
        Meteor.call @collection._methodNames._Write, opts, ->
          self.emitEvent 'end', arguments
          return
      else
        HTTP.call 'POST', "#{@collection.downloadRoute}/#{@collection.collectionName}/__upload", {data: opts}, (error, result) ->
          res      = JSON.parse result?.content or {}
          res.meta = fixJSONParse res.meta if res?.meta
          self.emitEvent 'end', [error, res]
          return
    return

  proceedChunk: (chunkId, start) ->
    self       = @
    chunk      = @config.file.slice (@config.chunkSize * (chunkId - 1)), (@config.chunkSize * chunkId)
    fileReader = new FileReader

    fileReader.onloadend = (evt) ->
      self.emitEvent 'sendChunk', [{
        data: {
          bin: (fileReader?.result or evt.srcElement?.result or evt.target?.result).split(',')[1]
          chunkId: chunkId
          start: start
        }
      }]
      return

    fileReader.onerror = (e) ->
      self.emitEvent 'end', [(e.target or e.srcElement).error]
      return

    fileReader.readAsDataURL chunk
    return

  upload: -> 
    start = +new Date
    if @result.onPause.get()
      return

    if @result.state.get() is 'aborted'
      return @

    if @currentChunk <= @fileLength
      ++@currentChunk
      if @worker
        @worker.postMessage({@sentChunks, start, @currentChunk, chunkSize: @config.chunkSize, file: @config.file})
      else
        @emitEvent 'proceedChunk', [@currentChunk, start]
    return

  createStreams: ->
    i    = 1
    self = @
    while i <= @config.streams
      self.emitEvent 'upload'
      i++
    return

  prepare: ->
    self = @

    @config.onStart and @config.onStart.call @result, null, @fileData
    @result.emitEvent 'start', [null, @fileData]

    if @config.chunkSize is 'dynamic'
      @config.chunkSize = @config.file.size / 1000
      if @config.chunkSize < 327680
        @config.chunkSize = 327680
      else if @config.chunkSize > 1048576
        @config.chunkSize = 1048576

      if @config.transport is 'http'
        @config.chunkSize = Math.round @config.chunkSize / 2

    @config.chunkSize = Math.floor(@config.chunkSize / 8) * 8
    _len = Math.ceil(@config.file.size / @config.chunkSize)
    if @config.streams is 'dynamic'
      @config.streams = _.clone _len
      @config.streams = 24 if @config.streams > 24

      if @config.transport is 'http'
        @config.streams = Math.round @config.streams / 2

    @fileLength               = if _len <= 0 then 1 else _len
    @config.streams           = @fileLength if @config.streams > @fileLength
    @result.config.fileLength = @fileLength

    opts =
      file:       @fileData
      fileId:     @fileId
      chunkSize:  @config.chunkSize
      fileLength: @fileLength
    opts.FSName = @FSName if @FSName isnt @fileId

    Meteor.call @collection._methodNames._Start, opts, (error) ->
      if error
        console.error '[FilesCollection] [.call(_Start)] Error:', error if self.collection.debug
        self.emitEvent 'end', [error]
      else
        self.result.continueFunc = ->
          console.info '[FilesCollection] [insert] [continueFunc]' if self.collection.debug
          self.emitEvent 'createStreams'
          return
        self.emitEvent 'createStreams'
      return
    return

  pipe: (func) -> 
    @pipes.push func
    return @

  start: ->
    self = @
    if @config.file.size <= 0
      @end new Meteor.Error 400, 'Can\'t upload empty file'
      return @result

    if @config.onBeforeUpload and _.isFunction @config.onBeforeUpload
      isUploadAllowed = @config.onBeforeUpload.call _.extend(@result, @collection._getUser()), @fileData
      if isUploadAllowed isnt true
        return @end new Meteor.Error(403, if _.isString(isUploadAllowed) then isUploadAllowed else 'config.onBeforeUpload() returned false')

    if @collection.onBeforeUpload and _.isFunction @collection.onBeforeUpload
      isUploadAllowed = @collection.onBeforeUpload.call _.extend(@result, @collection._getUser()), @fileData
      if isUploadAllowed isnt true
        return @end new Meteor.Error(403, if _.isString(isUploadAllowed) then isUploadAllowed else 'collection.onBeforeUpload() returned false')

    Tracker.autorun (computation) ->
      self.trackerComp = computation
      unless self.result.onPause.get()
        if Meteor.status().connected
          console.info '[FilesCollection] [insert] [Tracker] [continue]' if self.collection.debug
          self.result.continue()
        else
          console.info '[FilesCollection] [insert] [Tracker] [pause]' if self.collection.debug
          self.result.pause()
      return

    if @worker
      @worker.onmessage = (evt) ->
        if evt.data.error
          console.warn evt.data.error if self.collection.debug
          self.emitEvent 'proceedChunk', [evt.data.chunkId, evt.data.start]
        else
          self.emitEvent 'sendChunk', [evt]
        return
      @worker.onerror   = (e) -> 
        self.emitEvent 'end', [e.message]
        return

    if @collection.debug
      if @worker
        console.info '[FilesCollection] [insert] using WebWorkers'
      else
        console.info '[FilesCollection] [insert] using MainThread'

    self.emitEvent 'prepare'
    return @result

  manual: -> 
    self = @
    @result.start = ->
      self.emitEvent 'start'
      return
    @result.pipe = (func) ->
      self.pipe func
      return @
    return @result



class FileUpload
  __proto__: EventEmitter.prototype
  constructor: (@config) ->
    EventEmitter.call @
    self           = @
    @file          = _.extend @config.file, @config.fileData
    @state         = new ReactiveVar 'active'
    @onPause       = new ReactiveVar false
    @progress      = new ReactiveVar 0
    @estimateTime  = new ReactiveVar 1000
    @estimateSpeed = new ReactiveVar 0
    @estimateTimer = Meteor.setInterval ->
      if self.state.get() is 'active'
        _currentTime = self.estimateTime.get()
        if _currentTime > 1000
          self.estimateTime.set _currentTime - 1000
      return
    , 1000
  continueFunc:  -> return
  pause: ->
    console.info '[FilesCollection] [insert] [.pause()]' if @config.debug
    unless @onPause.get()
      @onPause.set true
      @state.set 'paused'
      @emitEvent 'pause', [@file]
    return
  continue: ->
    console.info '[FilesCollection] [insert] [.continue()]' if @config.debug
    if @onPause.get()
      @onPause.set false
      @state.set 'active'
      @emitEvent 'continue', [@file]
      @continueFunc()
    return
  toggle: ->
    console.info '[FilesCollection] [insert] [.toggle()]' if @config.debug
    if @onPause.get() then @continue() else @pause()
    return
  abort: ->
    console.info '[FilesCollection] [insert] [.abort()]' if @config.debug
    window.removeEventListener 'beforeunload', @config.beforeunload, false
    @config.onAbort and @config.onAbort.call @, @file
    @emitEvent 'abort', [@file]
    @pause()
    @config._onEnd()
    @state.set 'aborted'
    console.timeEnd('insert ' + @config.file.name) if @config.debug
    Meteor.call @config._Abort, @config.fileId
    return