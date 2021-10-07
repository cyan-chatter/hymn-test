//const messages = require("../../src/utils/messages")
//import ss from 'socket.io-stream';
const socket = io()

//Elements
const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $locationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// const {username, room} = Qs.parse(location.search, { ignoreQueryPrefix:true})

const audioGrid = document.getElementById('audio-grid')
const micbtn = document.getElementById('toggle-mic-btn')
const $commandForm = document.querySelector('#command-form')
const $commandFormInput = $commandForm.querySelector('input')
const $commandFormButton = $commandForm.querySelector('button')

let micmuted = true

const myPeer = new Peer(undefined, {
  host: '/',
  port: '3001'
})

function newEl(type){
  const el = document.createElement(type)
  return el   
}

const myaudio = newEl('audio')
myaudio.muted = true
const peers = {}

navigator.mediaDevices.getUserMedia({  
  video: false,
  audio: true
}).then(stream => {
  
  //Stream Object
  console.log("stream",stream)
  stream.getTracks().forEach((t) => {
    console.log("initial disable")
    if (t.kind === 'audio') t.enabled = false
  })
  addaudioStream(myaudio, stream)


  micbtn.addEventListener('click', ()=>{  
    micmuted  = !micmuted
    if(micmuted){
      console.log('muted') 
      stream.getTracks().forEach((t) => {
        console.log("event disable")
        if (t.kind === 'audio') t.enabled = false
      })
    } 
    else{
      console.log('unmuted')
      stream.getTracks().forEach((t) => {
        console.log("event enable")
        if (t.kind === 'audio') t.enabled = true
      })
    }
    addaudioStream(myaudio, stream)
  })

  myPeer.on('call', call => {
    console.log("incoming call")
    call.answer(stream)
    const audio = newEl('audio')
    call.on('stream', useraudioStream => {
      console.log("incoming audio called")
      addaudioStream(audio, useraudioStream)
    })
  })

  socket.on('user-connected', userId => {
      console.log("new user connects", userId)
    connectToNewUser(userId, stream)
  })
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})

myPeer.on('open', peerId => {
    console.log("peer id at on", peerId)
    socket.emit('join',{username, room: ROOM_ID, peerId, roomname : room}, (error)=>{
        if(error){
            alert(error)
            location.href = '/'
        }
    })
})

function connectToNewUser(userId, stream) {
    console.log("connects new peer")
    const audio = newEl('audio')
    const call = myPeer.call(userId, stream)
  call.on('stream', useraudioStream => {
      console.log("self audio called")
    addaudioStream(audio, useraudioStream)
  })
  call.on('close', () => {
    audio.remove()
  })

  peers[userId] = call
}

function addaudioStream(audio, stream) {
    console.log("audio added")
  audio.srcObject = stream
  audio.addEventListener('loadedmetadata', () => {
    audio.play()
  })
  audioGrid.append(audio)
}  



const autoscroll = ()=>{
    const $newMessage = $messages.lastElementChild

    //height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // visible height
    const visibleHeight = $messages.offsetHeight

    // height of messages container
    const containerHeight = $messages.scrollHeight

    // how far have i scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight

    if(containerHeight - newMessageHeight <= scrollOffset){
        // scroll to the bottom 
        $messages.scrollTop = $messages.scrollHeight
    }

}

socket.on('message', (message)=>{
    console.log(message)
    const html = Mustache.render(messageTemplate,{
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('locationMessage', (location)=>{
    console.log(location)
    const html = Mustache.render(locationTemplate,{
        username: location.username,
        url: location.url,
        createdAt: moment(location.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()    
})

socket.on('roomData', ({room , users})=>{
    const html = Mustache.render(sidebarTemplate, {
      room,
      users  
    })

    document.querySelector('#sidebar').innerHTML = html
})

 $messageForm.addEventListener('submit', (e)=>{
    e.preventDefault()
    $messageFormButton.setAttribute('disabled', 'disabled')
    const messageText = e.target.elements.message_text.value
    socket.emit('send-message',messageText,(error)=>{
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus() 
        if(error){
           return console.log(error)    
        }
        console.log('Message Delivered!')
    })
 })

 $locationButton.addEventListener('click', ()=>{
     
     if(!navigator.geolocation){
         return alert('Geolocation is not supported by your Browser.  :(')
     }

     $locationButton.setAttribute('disabled', 'disabled')

     navigator.geolocation.getCurrentPosition((position)=>{
           
        const locate = {
            latitude: undefined,
            longitude: undefined
        }
           locate.latitude = position.coords.latitude
           locate.longitude = position.coords.longitude

           socket.emit('send-location', locate,()=>{
            console.log('Location Shared!')
            $locationButton.removeAttribute('disabled')
           })      
        })     
 })

//music handling

$commandForm.addEventListener('submit', (e)=>{
  e.preventDefault()
  $commandFormButton.setAttribute('disabled', 'disabled')
  const commandText = e.target.elements.command_text.value  
  socket.emit('send-command',commandText,(log)=>{
      $commandFormButton.removeAttribute('disabled')
      $commandFormInput.value = ''
      $commandFormInput.focus() 
      if(log){
         return console.log(log)    
      }
      else console.log('Command Sent! but No Log Received')
  })
})


// socket.on('playData', async function (chunk) {
//   console.log("playdata executes",chunk)
// })
// socket.on('playEnd', async function (m) {
//   console.log("playend executes",m)
// })
// socket.on('playError', async function (m) {
//   console.log(chunk)
// })

let audioCtx;
let source;
let songLength;

if(window.webkitAudioContext) {
  audioCtx = new window.webkitAudioContext();
} else {
  audioCtx = new window.AudioContext();
}

//receiving and decoding arrayBuffer to audioBuffer
socket.on('play', (data)=>{
  source = audioCtx.createBufferSource()
  audioCtx.decodeAudioData(data.buffer, function(buffer) {
    myBuffer = buffer
    songLength = buffer.duration
    source.buffer = myBuffer
    source.connect(audioCtx.destination)
    source.loop = false
  }, function(e){"Error with decoding audio data" + e.error})
  source.start(0)
  const webaudiostate = {
    user: {
      isAudioLoaded : true,
      isAudioPlaying : true
    },
    room : {
      isAudioLoaded : true,
      isAudioPlaying : true
    }
  }
  socket.emit('webaudiostate', webaudiostate)
})


socket.on('pause', (data)=>{
  if(audioCtx.state === 'running') {
    audioCtx.suspend()
  }
  const webaudiostate = {
    user: {
      isAudioLoaded : true,
      isAudioPlaying : false
    },
    room: {
      isAudioLoaded : true,
      isAudioPlaying : false
    }
  }
  socket.emit('webaudiostate', webaudiostate)
})

socket.on('resume', (data)=>{
  if(audioCtx.state === 'suspended') {
    audioCtx.resume()  
  }
  const webaudiostate = {
    user: {
      isAudioLoaded : true,
      isAudioPlaying : true
    },
    room : {
      isAudioLoaded : true,
      isAudioPlaying : true
    }
  }
  socket.emit('webaudiostate', webaudiostate)
})

socket.on('stop', (data) => {
  source.stop(0);
  const webaudiostate = {
    user: {
      isAudioLoaded : true,
      isAudioPlaying : false
    },
    room: {
      isAudioLoaded : true,
      isAudioPlaying : false
    }
  }
  socket.emit('webaudiostate', webaudiostate)
})


