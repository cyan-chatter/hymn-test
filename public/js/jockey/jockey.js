const SpotifyWebApi = require('spotify-web-api-node')
function Queue(){var a=[],b=0;this.getLength=function(){return a.length-b};this.isEmpty=function(){return 0==a.length};this.enqueue=function(b){a.push(b)};this.dequeue=function(){if(0!=a.length){var c=a[b];2*++b>=a.length&&(a=a.slice(b),b=0);return c}};this.peek=function(){return 0<a.length?a[b]:void 0}};
// Store
// localStorage.setItem("lastname", "Smith");
// // Retrieve
// document.getElementById("result").innerHTML = localStorage.getItem("lastname"); 
function jockey(){

  let auth, accessToken, isexe = false, socketId;
  const spotifyApi = new SpotifyWebApi({
    clientId: "8b945ef10ea24755b83ac50cede405a0"
  })

  const queue = new Queue();
  
  let sse = new EventSource("http://localhost:3000/sse");
  
  sse.onmessage = (e) => {
    auth = JSON.parse(e.data);
    console.log(auth);
    //auth: clientId, accessToken, refreshToken, expiresIn 
    
    if(auth.accessToken){
      localStorage.setItem("accessToken", auth.accessToken)  
      spotifyApi.setAccessToken(auth.accessToken)
      if(!isexe) execute()
    }
  }

  accessToken = localStorage.getItem("accessToken")
  if(accessToken !== undefined && accessToken !== null){
    spotifyApi.setAccessToken(accessToken)
    isexe = true
    execute()
  }
  
  function execute(){
    
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

      console.log(spotifyApi)

      socket.on('play', (search) => {
        let song = null;
        spotifyApi.searchTracks(search).then(res => {
          if(res.body.tracks.items.length > 0){
            const track = res.body.tracks.items[0]
              song = {
                artist: track.artists[0].name,
                title: track.name,
                uri: track.uri
              }
              queue.enqueue(song)
          }
          console.log(queue.peek())
          
        })

        


    

        
      })
    })
    
    socket.on('user-disconnected', userId => {
      if (peers[userId]) peers[userId].close()
      socket.emit('hymn-client-details-disconnect', socketId)
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
    
    //socket.on('message', (message) => console.log("socket io works"))
    
    socket.on('room-data', ({room , users})=>{
        console.log("room-data", room, users)
    })

    socket.on('client-id', (id)=>{
      console.log('socket-id: ' + id)
      socketId = id
      socket.emit('hymn-client-details', {socketId : id, roomId : ROOM_ID})
    })
    
  }
 
}

const roomEl = document.getElementById('playroom')
let ROOM_ID = roomEl.getAttribute('roomid')
let ROOM_NAME = roomEl.getAttribute('roomname')
roomEl.innerText = `room: ${ROOM_NAME}`

jockey()