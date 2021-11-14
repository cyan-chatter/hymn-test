const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const ss = require('socket.io-stream')
const app = express()
const cors = require("cors")
const server = http.createServer(app)
const Filter = require('bad-words')
const { v4: uuidV4 } = require('uuid')
const bodyParser = require("body-parser")
require('dotenv').config({ path: `${__dirname}/dev.env` })

const SpotifyWebApi = require("spotify-web-api-node")
const lyricsFinder = require("lyrics-finder")

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
const publicDirectoryPath = path.join(__dirname, '../public')
app.use(express.static(publicDirectoryPath))
const port = process.env.PORT || 3000
const io = socketio.listen(server, {
    log: false,
    agent: false,
    origins: '*:*',
    transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling']
})

const {generateMessage, generateLocation} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom, setAudioState} = require('./utils/users')

const executeCommand = require('./utils/commands')
const Player = require('./utils/Player')

const invrooms = []

const generalroomid = 'general'
const soloroomid = uuidV4()

const generalroom = {
    roomname : 'general', roomid: 'general', roomtype : 'myroom-default', actives : 0, player : new Player(generalroomid)
}
const soloroom = {
    roomname : 'solo', roomid: soloroomid, roomtype : 'myroom-default', actives : 0, player : new Player(soloroomid)
}

const myroomsmap = new Map()

myroomsmap.set(generalroom.roomid,generalroom)
myroomsmap.set(soloroom.roomid,soloroom)

app.get('/', (req,res) => {
    res.render('index')
})

app.post('/newmyroom', (req,res)=>{
    let roomname = req.body.roomname
    let roomid = uuidV4()
    let roomtype = 'myroom'
    let actives = 0
    const newroom = {
        roomname, roomid, roomtype, actives
    }
    myroomsmap.set(roomid,newroom)
    res.send(newroom)
})
// app.post('/newinvroom', (req,res)=>{
//     let roomid = req.body.roomid
//     let roomname = roomsmap.get(roomid);
//     let roomtype = 'invroom'
//     let actives = 0
//     const newroom = {
//         roomname, roomid, roomtype, actives
//     }
//     invroomsmap.set(roomid,newroom)
//     res.send(newroom)
// })

//console.log(__dirname)

const jspath = path.join(publicDirectoryPath, './js/jockey')
const cp = path.join(jspath, 'jockey.js')

// app.use('./js/jockey/swan.js', browserify(cp))
// app.get('../public/js/jockey/swan.js', browserify(['spotify-web-api-node']))


function send (res,data) {
    console.log(data);
    res.write("data: {\n" + `data: "clientId": "${data.clientId}",\ndata: "accessToken": "${data.accessToken}",\ndata: "refreshToken": "${data.refreshToken}",\ndata: "expiresIn": "${data.expiresIn}"\n` + "data: }\n\n");
}

let sseres;

app.get("/sse", (req,res) => {
    res.setHeader("Content-Type", "text/event-stream");
    sseres = res;
})

app.post('/lobby', (req,res)=>{
    username = req.body.username
    const code = req.body.code
    const vals = Array.from(myroomsmap.values())
    console.log(process.env.REDIRECT_URI)
    const spotifyApi = new SpotifyWebApi({
      redirectUri: process.env.REDIRECT_URI,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
    })
  
    spotifyApi
      .authorizationCodeGrant(code)
      .then(data => {
        const auth = {
            accessToken: data.body.access_token,
            refreshToken: data.body.refresh_token,
            expiresIn: data.body.expires_in,
            clientId: process.env.CLIENT_ID      
        }
        // res.json({
        //   accessToken: data.body.access_token,
        //   refreshToken: data.body.refresh_token,
        //   expiresIn: data.body.expires_in,
        // })
        if(sseres === undefined || sseres === null) throw new Error('jockey is closed')
        send(sseres,auth);
        res.render('lobby',{
            username: req.body.username,
            myrooms : vals, 
            invrooms,
            auth,
            err : '0'
        })
      })
      .catch(err => {
        res.render('lobby',{
            username: req.body.username,
            myrooms : vals, 
            invrooms,
            auth : err,
            err : '1'
        })
      })
})

app.get('/lobby/:username', (req,res)=>{
    const vals = Array.from(myroomsmap.values())
    res.render('lobby',{
        username : req.params.username,
        myrooms : vals,  
        invrooms
    })
})


app.get('/room/:roomid/:username', (req,res) => {
    console.log("roomid: ", req.params.roomid)
    //console.log(myroomsmap.get(req.params.roomid))
    let room = myroomsmap.get(req.params.roomid).roomname
    //console.log(room)
    if(!room) return res.redirect('/')
    //
    let userdata = {
        username : req.params.username,
        room,
        roomId : req.params.roomid
    }
    res.render('chat', userdata)
})

app.get('/jockey', (req,res)=>{
    const room = 'general'
    let roomname = myroomsmap.get(room).roomname
    res.render('jockey', {room, roomname})
})

app.get('/jockey/:roomid', (req,res)=>{
    const room = req.params.roomid
    let roomname = myroomsmap.get(room).roomname
    res.render('jockey', {room, roomname})
})


app.post("/refresh", (req, res) => {
    const refreshToken = req.body.refreshToken
    const spotifyApi = new SpotifyWebApi({
      redirectUri: process.env.REDIRECT_URI,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken,
    })
  
    spotifyApi
      .refreshAccessToken()
      .then(data => {
        res.json({
          accessToken: data.body.accessToken,
          expiresIn: data.body.expiresIn,
        })
      })
      .catch(err => {
        console.log(err)
        res.sendStatus(400)
      })
})

app.post("/login", (req, res) => {
    const code = req.body.code
    const spotifyApi = new SpotifyWebApi({
      redirectUri: process.env.REDIRECT_URI,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
    })
  
    spotifyApi
      .authorizationCodeGrant(code)
      .then(data => {
        res.json({
          accessToken: data.body.access_token,
          refreshToken: data.body.refresh_token,
          expiresIn: data.body.expires_in,
        })
      })
      .catch(err => {
        res.sendStatus(400)
      })
  })
  
  app.get("/lyrics", async (req, res) => {
    const lyrics =
      (await lyricsFinder(req.query.artist, req.query.track)) || "No Lyrics Found"
    res.json({ lyrics })
  })

  const jockeys = [] // [ {socketId, roomId} ]

io.on('connection', (socket)=>{
    console.log('New Web Socket Connection')
    socket.on('join', (options, callback)=>{
        const {error, user} = addUser({ id: socket.id, ...options})
        if(error){
            return callback(error)
        }
        socket.join(user.room)
        socket.to(user.room).broadcast.emit('user-connected', user.peerId, socket.id)
        socket.emit('message', generateMessage('', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('', `${user.username} has joined the chat`))    
        let room = myroomsmap.get(user.room)
        myroomsmap.set(user.room, {
            ...room,
            actives : ++room.actives
        })
        io.to(user.room).emit('roomData', {
            room: options.roomname,
            users: getUsersInRoom(user.room)
        })
        socket.emit('client-id', socket.id)
        socket.on('hymn-client-details', ({socketId,roomId})=>{
            console.log(socketId, roomId)
            jockeys.push({socketId, roomId})
        })
        
        callback()
    })

    socket.on('send-message',(messageText, callback)=>{   
        const user = getUser(socket.id)       
        const filter = new Filter()
        if(filter.isProfane(messageText)){
            return callback('Profanity is Not Allowed Here!. Keep the Chat Clean')
        }
        
        io.to(user.room).emit('message',generateMessage(user.username, messageText))
        callback('Message Delivered!')
    })

    socket.on('disconnect',async ()=>{
        const user = removeUser(socket.id)
        if(user){
            socket.to(user.room).broadcast.emit('user-disconnected', user.peerId)
            io.to(user.room).emit('message', generateMessage('', `${user.username} has left the chat`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
            let room = myroomsmap.get(user.room)
            myroomsmap.set(user.room, {
                ...room,
                actives : --room.actives
            })
            socket.on('hymn-client-details-disconnect', (socketId) =>{
                const filterJockey = (el) => {
                    return el.socketId !== socketId
                }
                jockeys.filter(filterJockey)
            })
        }
    })
    
    socket.on('send-location', (location,callback)=>{
        const user = getUser(socket.id)
        const messageText = `https://google.com/maps?q=${location.latitude},${location.longitude}`
        io.to(user.room).emit('locationMessage', generateLocation(user.username, messageText))
        callback()
    })

    socket.on('send-command',async (commandText, callback)=>{   
        const user = getUser(socket.id)
        const roomid = user.room
        const room = myroomsmap.get(roomid)
        io.to(roomid).emit('message',generateMessage(user.username, commandText)) 
        const jockey = jockeys.find(el=>el.roomId === roomid)
        if(!jockey) callback('Jockey Not Connected!')
        else{
            await executeCommand(commandText,io,roomid,room.player,jockey.socketId,ss)
            callback('Command Delivered!')
        }
    })
    
    socket.on('webaudiostate', (webaudiostate) => {
        const user = setAudioState(socket.id, webaudiostate.user.isAudioLoaded, webaudiostate.user.isAudioPlaying) //for user
        const room = myroomsmap.get(user.room)
        room.player.webaudiostate = {
            isAudioLoaded : webaudiostate.room.isAudioLoaded,
            isAudioPlaying : webaudiostate.room.isAudioPlaying
        }
        myroomsmap.set(user.room, room)
    })


    
})

server.listen(port,()=>{
    console.log('Server is up at Port: ', port);
})