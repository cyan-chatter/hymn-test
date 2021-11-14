const SpotifyWebApi = require('spotify-web-api-node')

function jockey(){

  let auth;
  let sse = new EventSource("http://localhost:3000/sse");
  sse.onmessage = (e) => {
    auth = JSON.parse(e.data);
    console.log(auth);
  }

  const socket = io()

  const myPeer = new Peer(undefined, {
    host: '/',
    port: '3001'
  })
  
  const peers = {}
  
  navigator.mediaDevices.getUserMedia({  
    video: false,
    audio: true
  })
  .then(stream => {  
    stream.getTracks().forEach((t) => {
      console.log("initial disable")
      if (t.kind === 'audio') t.enabled = false
    })
  
    myPeer.on('call', call => {
      console.log("incoming call")
      call.answer(stream)
    })
  
    socket.on('user-connected', userId => {
      console.log("new user connects", userId)
      setTimeout(()=>connectToNewUser(userId, stream), 1000)
    })

    const spotifyApi = new SpotifyWebApi({
      clientId: "8b945ef10ea24755b83ac50cede405a0",
    })

    console.log(spotifyApi)

    

    


  })
  
  socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()
  })
  
  myPeer.on('open', peerId => {
      console.log("peer id at on", peerId)
      socket.emit('join',{username : "hymn", room: ROOM_ID, peerId, roomname : ROOM_NAME}, (error)=>{
          if(error){
              alert(error)
              location.href = '/'
          }
      })
  })
  
  function connectToNewUser(userId, stream) {
      console.log("connects new peer")
      const call = myPeer.call(userId, stream)
      peers[userId] = call
  }
  
  // function addaudioStream(audio, stream) {
  //   audio.srcObject = stream
  //   audio.addEventListener('loadedmetadata', () => {
  //     audio.play()
  //   })
  //   audioGrid.append(audio)
  // }  
  
  socket.on('message', (message) => console.log("socket io works"))
  
  socket.on('room-data', ({room , users})=>{
      console.log("room-data", room, users)
  })
    
}

const roomEl = document.getElementById('playroom')
let ROOM_ID = roomEl.getAttribute('roomid')
let ROOM_NAME = roomEl.getAttribute('roomname')
roomEl.innerText = `room: ${ROOM_NAME}`

jockey()