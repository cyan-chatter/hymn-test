let webaudiostate = require('./webaudiostate')
const {generateMessage} = require('./messages')
const fs = require('fs')
var path = require('path');

const resp = {
    status : null, message : null
}

module.exports = async function (commandText,io,room){    
    const argstext = commandText.trim()
    const args = argstext.split(" ", 2)
    const command = args[0]
    const input = args[1]
    let resp;
    switch (command) {
        case 'play' : 
                    if(input) await play(input,io,room);
                    else errorMessage();
                    break;
        case 'pause' : 
                    if(input) errorMessage();
                    else pause(io,room);
                    break;  
        case 'resume' : 
                    if(input) errorMessage();
                    else resume(io,room);
                    break;  
        case 'stop' : 
                    if(input) errorMessage();
                    else stop(io,room);
                    break;              

        default: errorMessage();    
    }
}

const errorMessage = (message = "Incorrect Syntax") => {
    resp.status = 0
    resp.message = message
}

const play = async (input,io,room) => {    
    const filename = 'Ambre.mp3'
    var filepath = path.join(__dirname, filename);
    const stat = fs.statSync(filepath)
    console.log(stat)
    const clients = io.sockets.adapter.rooms[room].sockets    
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

const pause = (io,room) => {
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

const resume = (io,room) => {
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

const stop = (io,room) => {
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