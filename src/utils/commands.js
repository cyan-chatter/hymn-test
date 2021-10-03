module.exports = function (commandText){
    const argstext = commandText.trim()
    const args = argstext.split(" ", 2)
    const command = args[0]
    const input = args[1]

    switch (command) {
        case 'play' : 
                    if(input) play(input);
                    else errorMessage();
                    break;
        case 'pause' : 
                    if(input) errorMessage();
                    else pause();
                    break;            
    }

}

const errorMessage = (data = "Incorrect Syntax") => {
    console.log(data)
}

const play = (input) => {
    console.log('play',input)
}

const pause = () => {
    console.log('pause')
}