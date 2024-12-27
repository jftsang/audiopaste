import WaveSurfer from "https://unpkg.com/wavesurfer.js@7.8.13/dist/wavesurfer.esm.js"
import spectrogram from "https://unpkg.com/wavesurfer.js@7/dist/plugins/spectrogram.js"


const contentDiv = document.getElementById("contentDiv")
const audioDiv = document.getElementById("audioDiv")
const key = document.getElementById("key").value
const audioUrl = document.getElementById("audioUrl").value

async function loadAudio() {
  let response;
  try {
    response = await fetch(audioUrl);
  } catch (fetchError) {
    contentDiv.innerText = `Failed to load audio: ${fetchError.message}`;
    return false;
  }
  if (!response.ok) {
    contentDiv.innerText = (await response.json()).detail;
    return false;
  }
  //

  const wavesurfer = WaveSurfer.create({
    container: audioDiv,
    waveColor: 'rgb(200, 0, 200)',
    progressColor: 'rgb(100, 0, 100)',
    url: audioUrl,
  })
  wavesurfer.on('click', () => {
    if (wavesurfer.isPlaying())
      wavesurfer.pause()
  })
  wavesurfer.registerPlugin(
    spectrogram.create({
      labels: true,
      height: 100,
      splitChannels: true,
      scale: 'linear', // or 'mel'
      frequencyMax: 8000,
      frequencyMin: 0,
      fftSamples: 1024,
      labelsBackground: 'rgba(0, 0, 0, 0.1)',
    }),
  )

  const playBtn = document.createElement("button")
  playBtn.innerText = "play/pause"
  audioDiv.appendChild(playBtn)

  window.addEventListener("keypress", e => {
    if (e.key === " ") {
      togglePlayPause()
    }
  })
  playBtn.addEventListener("click", togglePlayPause)

  function togglePlayPause() {
    if (wavesurfer.isPlaying())
      wavesurfer.pause()
    else
      wavesurfer.play()
  }


  const input = document.getElementById("url");
  const copyBtn = document.getElementById("copyBtn")
  input.value = window.location.href;
  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(input.value)
  })

  return true;
}

function updateRecentlyViewed(successful) {
  const recentlyViewed = JSON.parse(localStorage.getItem("recentlyViewed") || "[]")
  const idx = recentlyViewed.indexOf(key);
  if (idx >= 0) {
    recentlyViewed.splice(idx, 1);
  }
  if (successful) {
    recentlyViewed.push(key);
    if (recentlyViewed.length > 10) {
      recentlyViewed.shift();
    }
  }
  localStorage.setItem("recentlyViewed", JSON.stringify(recentlyViewed));
}

loadAudio().then(successful => updateRecentlyViewed(successful))
