const {Server} = require('ws')
const {h, randomHash} = require('changtopia/util/hash.js')
const {toJsString, fromJsString} = require('changtopia/util/strings.js')
const FileHandler = require('./fileHandler/fileHandler.js')
const config = require('../config.json')


function makeReply(message, payload, secret) {
  return JSON.stringify({sender: message.recipient, recipient: message.sender, id: randomHash(), payload, requestId: message.id, secret})
}

class MessageHandler {
  constructor (hosts) {
    this.hosts = hosts
  }

  async [h('publish')](ws, host, message) {
    const [name, pid] = message.payload
    if (host.publishedPids[toJsString(name)]) {
      console.error(`${message.sender.host.toString(16)} tried to repost ${toJsString(name)}`)
      ws.send(makeReply(message, [h('error'), h('already_published'), fromJsString(`A process has already been published on ${toJsString(name)}`)]))
      return
    }
    host.publishedPids[toJsString(name)] = pid
    ws.send(makeReply(message, [h('published')]))
    return
  }

  async [h('unpublish')](ws, host, message) {
    const [name] = message.payload
    delete host.publishedPids[toJsString(name)]
    console.log(`${message.sender.host.toString(16)} unpublished ${toJsString(name)}`)
    ws.send(makeReply(message, [h('unpublished')]))
    return
  }

  async [h('fetch_a_dude')](ws, host, message) {
    const [name] = message.payload
    const thing = Object.values(this.hosts).reduce((acc, host) => [...acc, ...Object.entries(host.publishedPids)], []).find((e) => {return e[0] === toJsString(name) && e[1].host !== message.sender.host})
    if (thing) {
      ws.send(makeReply(message, [thing[1]]))
    } else {
      ws.send(makeReply(message, [h('nothing')]))
    }
    return
  }

  async [h('fetch_dem_dudes')](ws, host, message) {
    const [name] = message.payload
    const pids = Object.values(this.hosts).reduce((acc, host) => [...acc, ...Object.entries(host.publishedPids)], []).filter((e) => e[0] === toJsString(name) && e[1].host !== message.sender.host).map(e => e[1])
    ws.send(makeReply(message, [pids]))
    return
  }

  async [h('fetch_a_file')](ws, host, message) {
    const [_path] = message.payload
    const path = _path.map(p => Array.isArray(p) ? toJsString(p) : p)
    const content = fromJsString(await FileHandler.getFile(path))
    console.log('Saved file')
    ws.send(makeReply(message, [content]))
    return
  }

  async [h('commit_a_file')](ws, host, message) {
    const [_path, _user, _content, _options] = message.payload
    const path = _path.map(p => Array.isArray(p) ? toJsString(p) : p)
    const user = toJsString(_user)
    const content = toJsString(_content)
    const options = {
      protected: !!_options.includes(h('protected'))
    }
    await FileHandler.storeFile(path, user, content, options)
    ws.send(makeReply(message, [h('ok')]))
    return
  }

  async [h('find_a_file')](ws, host, message) {
    const [_path] = message.payload
    const path = _path.map(p => Array.isArray(p) ? toJsString(p) : p)
    const result = (await FileHandler.listFiles(path)).map(p => fromJsString(p))
    console.log('fuck tits', result)
    ws.send(makeReply(message, result))
    return
  }

  handleMessage(ws, _message) {
    const message = JSON.parse(_message)
    const host = this.hosts[message.sender.host]
    if (message.recipient.host === 0) {
      const [kind, ...payload] = message.payload
      message.payload = payload // be horrible and alter the message
      if (this[kind]) {
        this[kind](ws, host, message).catch(err => {
          ws.send(makeReply(message, [h('error'), fromJsString(err.message)]))
        })
      } else {
        ws.send(JSON.stringify({recipient: message.sender, type: 'A strange and silly message', id: message.id}))
      }
    } else {
      const recipientHost = this.hosts[message.recipient.host]
      if (!recipientHost) {
        ws.send(JSON.stringify({type: 'host_not_found', id: message.id, rawMessage: message}))
        return
      }
      recipientHost.socket.send(JSON.stringify(message))
    }
  }

}

module.exports.startMediator = () => {
  //initialize the WebSocket server instance
  const port = config.mediator_port
  const wsServer = new Server({port})
  console.log(`mediator listening on port ${port}`)

  const hosts = {}

  const messageHandler = new MessageHandler(hosts)

  wsServer.on('connection', (ws, req) => {
    console.log(`Received connection from ${req.socket.remoteAddress}`)
    ws.once('message', (message) => {
      const {type, host} = JSON.parse(message)
      if (type === 'register') {
        console.log(`Registering host: ${host.toString(16)}`)

        if (hosts[host]) {
          ws.send(JSON.stringify({type: 'error', msg: 'Host already registered'}))
        } else {
          hosts[host] = {socket: ws, publishedPids: {}, lives: true}
          ws.on('pong', () => hosts[host].lives = true)

          hosts[host].poll = setInterval(() => {
            if (!hosts[host].lives) {
              ws.terminate()
              console.log(`Host ${host.toString(16)} stopped responding`)
            } else {
              hosts[host].lives = false
              ws.ping()
            }
          }, 5000)

          ws.on('message', (message) => messageHandler.handleMessage(ws, message))
          ws.on('close', () => {
            clearInterval(hosts[host].poll)
            console.log(`Host ${host.toString(16)} is no longer with us`)
            delete hosts[host]
          })

          console.log(`Host ${host.toString(16)} registered`)
          ws.send(JSON.stringify({type: 'registered'}))
        }
      } else {
        console.log('Received arbitrary message before registration')
        ws.send(JSON.stringify({type: 'error', msg: 'Not yet registered'}))
      }
    })
  })
}
