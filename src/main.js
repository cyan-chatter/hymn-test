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
const {pipeline} = require('stream')
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
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const commandJob = require('./utils/commands')
const Player = require('./utils/Player')

let webaudiostate = require('./utils/webaudiostate')

const invrooms = []

const generalroomid = 'general'
const soloroomid = uuidV4()

const generalroom = {
    roomname : 'general', roomid: 'general', roomtype : 'myroom-default', actives : 0, player : new Player(generalroomid, 'general')
}
const soloroom = {
    roomname : 'solo', roomid: soloroomid, roomtype : 'myroom-default', actives : 0, player : new Player('solo', soloroomid)
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

app.post('/lobby', (req,res)=>{
    username = req.body.username
    const vals = Array.from(myroomsmap.values())
    console.log(vals)
    res.render('lobby',{
        username: req.body.username,
        myrooms : vals, 
        invrooms
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
    console.log(req.params)
    console.log(myroomsmap.get(req.params.roomid))
    let room = myroomsmap.get(req.params.roomid).roomname
    console.log(room)
    if(!room) return res.redirect('/')
    let userdata = {
        username : req.params.username,
        room,
        roomId : req.params.roomid
    }
    res.render('chat', userdata)
})


io.on('connection', (socket)=>{
    console.log('New Web Socket Connection')
    const stream = ss.createStream()

    socket.on('join', (options, callback)=>{
        const {error, user} = addUser({ id: socket.id, ...options})
        if(error){
            return callback(error)
        }
        socket.join(user.room)
        socket.to(user.room).broadcast.emit('user-connected', user.peerId)
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
        io.to(user.room).emit('message',generateMessage(user.username, commandText)) 
        await commandJob(commandText,io,user.room)
        callback('Command Delivered!')
    })
    
    socket.on('webaudiostate', ({isAudioLoaded,isAudioPlaying}) => {
        webaudiostate.isAudioLoaded = isAudioLoaded
        webaudiostate.isAudioPlaying = isAudioPlaying
    })
})

server.listen(port,()=>{
    console.log('Server is up at Port: ', port);
})