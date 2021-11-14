const {generateMessage} = require('./messages')
const fs = require('fs')
var path = require('path');
const fsPromises = require('fs').promises

const getFileData = async fn => {
    data = await fsPromises.readFile(fn)
    return data
}

const resp = {
    status : null, message : null
}

const getClients = (io,room,socketId) => {
    const clientList = []
    let clients = io.sockets.adapter.rooms[room].sockets    
    for (const clientId in clients){
        if(clientId !== socketId){
           clientList.push(clientId)
        }
    }
    return clientList
}

module.exports = async function (commandText,io,room,player,socketId,ss){    
    const argstext = commandText.trim()
    const args = argstext.split(" ", 2)
    const command = args[0]
    const input = args[1]
    const clients = getClients(io,room,socketId)
    /*
    input : input argument
    io : socket io
    room : roomId 
    player : room player object
    socketId : Jockey socket id
    ss : socket io stream
    clients : array of connected clients (jokcey excluded)
    */
    
    switch (command) {
        case 'play' : 
                    if(input) //await play(input,io,room,player,ss);
                    await playPeer(input,io,room,clients,socketId);
                    else errorMessage();
                    break;
        case 'pause' : 
                    if(input) errorMessage();
                    else //pause(io,room,player.webaudiostate);
                    await pausePeer();
                    break;  
        case 'resume' : 
                    if(input) errorMessage();
                    else //resume(io,room,player.webaudiostate);
                    await resumePeer();
                    break;  
        case 'stop' : 
                    if(input) errorMessage();
                    else //stop(io,room,player.webaudiostate);
                    await stopPeer();
                    break;              

        default: errorMessage();    
    }
}

const errorMessage = (message = "Incorrect Syntax") => {
    resp.status = 0
    resp.message = message
}

const play = async (input,io,room,player,ss) => {    
    
    const filename = 'Ambre.mp3'
    var filepath = path.join(__dirname, filename);
    const stat = fs.statSync(filepath)
    console.log(stat)
    const clients = io.sockets.adapter.rooms[room].sockets    
    player.queue.enqueue()
    io.to(room).emit('message',generateMessage('Hymn', 'Added to Queue'))
    resp.status = 1
    resp.message = "Playing Song...."  
    io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
    
    //to send a file
    fs.readFile(filepath, function(err, buf){
        for (const clientId in clients){
            const socket = io.sockets.connected[clientId]
            socket.emit('play', { audio: true, buffer: buf })
        }       
    })
    
    // const readStream = fs.createReadStream(filepath)
    // readStream.on('open', function () {
    //     for (const clientId in clients){
    //         const socket = io.sockets.connected[clientId]
    //         ss(socket).emit('playStream', readStream)
    //     }
    // }) 
    // readStream.on('error', function(err) {
    //     console.log(err)
    // })

    // ss(socket).on('file', function(stream) {
    //     fs.createReadStream(filepath).pipe(stream)
    // })

    // readStream.on('data', (chunk)=>{
    //     for (const clientId in clients){
    //         const socket = io.sockets.connected[clientId]
    //         socket.emit('playData', chunk)
    //     }
    // })
    // readStream.on('end', ()=>{
    //     for (const clientId in clients){
    //         const socket = io.sockets.connected[clientId]
    //         socket.emit('playEnd', "Stream Ends")
    //     }
    // })
    // readStream.on('error', (err) => {
    //     socket.emit('playError', "An Error Has Occurred While Reading the Stream")
    //     console.error(err);
    // })
}

const pause = (io,room,webaudiostate) => {
    const clients = io.sockets.adapter.rooms[room].sockets 
    if(!(webaudiostate.isAudioLoaded && webaudiostate.isAudioPlaying)){
        resp.status = 0
        resp.message = "Not Playing.."    
        io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
        return
    }   
    resp.status = 1
    resp.message = "Pausing Song...."
    io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
    for (const clientId in clients){
        const socket = io.sockets.connected[clientId]
        socket.emit('pause', "pause the song")
    }          
}

const resume = (io,room,webaudiostate) => {
    const clients = io.sockets.adapter.rooms[room].sockets    
    if(!webaudiostate.isAudioLoaded){
        resp.status = 0
        resp.message = "Nothing to Play.."    
        io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
        return
    }
    if(webaudiostate.isAudioPlaying){
        resp.status = 0
        resp.message = "Already Playing.."    
        io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
        return
    }
    resp.status = 1
    resp.message = "Resuming Song...."
    io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
    for (const clientId in clients){
        const socket = io.sockets.connected[clientId]
        socket.emit('resume', "resume the song")
    }          
}

const stop = (io,room,webaudiostate) => {
    const clients = io.sockets.adapter.rooms[room].sockets    
    if(!webaudiostate.isAudioLoaded){
        resp.status = 0
        resp.message = "No Music to Stop.."    
        io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
        return
    }
    resp.status = 1
    resp.message = "Stopping Music...."
    io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
    for (const clientId in clients){
        const socket = io.sockets.connected[clientId]
        socket.emit('stop', "stop the song")
    }          
}

const playPeer = (input,io,room,clients,socketId) => {
    console.log("playPeer")
    

}

const pausePeer = () => {
    console.log("pausePeer")
}

const resumePeer = () => {
    console.log("resumePeer")
}

const searchPeer = () => {
    console.log("searchPeer")
}

const stopPeer = () => {
    console.log("stopPeer")
}