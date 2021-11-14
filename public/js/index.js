const code = new URLSearchParams(window.location.search).get('code')

function login(){
  const anchor = document.createElement('a')
  anchor.href = `https://accounts.spotify.com/authorize?client_id=8860faf159354e5a815b9cf344707abf&response_type=code&redirect_uri=http://localhost:3000&scope=streaming%20user-read-email%20user-read-private%20user-library-read%20user-library-modify%20user-read-playback-state%20user-modify-playback-state`
  anchor.className = 'btn btn-primary'
  anchor.innerText = 'Login with Spotify'
  anchor.style.margin = '10px'
  document.querySelector('.centered-form__box').append(anchor)
}

if(!code){
  login()
} 
else document.getElementById("spcode").value = code
document.getElementById("spcode").style.display = 'none'