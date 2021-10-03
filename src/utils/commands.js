const {generateMessage} = require('./messages')

module.exports = function (commandText,io,room){    
    const argstext = commandText.trim()
    const args = argstext.split(" ", 2)
    const command = args[0]
    const input = args[1]
    let resp;
    switch (command) {
        case 'play' : 
                    if(input) resp = play(input);
                    else resp = errorMessage();
                    break;
        case 'pause' : 
                    if(input) resp = errorMessage();
                    else resp = pause();
                    break;            
    }
    io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
    
    let data = "This will soon be an Mp3 Stream"
    //to send the stream here
    io.to(room).emit('execute',data)
    


}

const errorMessage = (data = "Incorrect Syntax") => {
    return {
        filename,
        status : 0,
        message : data
    }
}

const play = (input) => {    
    const filename = __dirname + '/sampleMp3/' + 'River Phoenix - 1. River Phoenix - Week No.41.mp3'
    return {
        filename,
        status : 1,
        message : "Playing Song...."
    }

}

const pause = () => {
    return {
        filename,
        status : 1,
        message : "Pausing Song...."
    }
}