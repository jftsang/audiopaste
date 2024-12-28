// noinspection ES6UnusedImports
import main from "./main.js";
import WaveSurfer from "https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js"
// import spectrogram from "https://unpkg.com/wavesurfer.js@7/dist/plugins/spectrogram.js"


const contentDiv = document.getElementById("contentDiv")
const audioDiv = document.getElementById("audioDiv")
const key = document.getElementById("key").value
const audioUrl = document.getElementById("audioUrl").value

function createSpectrogram(container, content) {
  const wavesurfer = WaveSurfer.create({
    container: container,
    waveColor: 'rgb(200, 0, 200)',
    progressColor: 'rgb(100, 0, 100)',
    url: content,
  })
  wavesurfer.on('click', () => {
    if (wavesurfer.isPlaying())
      wavesurfer.pause()
  })
  /*
  wavesurfer.registerPlugin(
    spectrogram.create({
      labels: true,
      height: 100,
      scale: 'mel', // 'linear' or 'mel'
      frequencyMin: 24,
      frequencyMax: 24000,
      fftSamples: 2048,
      labelsBackground: 'rgba(0, 0, 0, 0.1)',
    }),
  )
   */
  return wavesurfer
}

async function loadAudio() {

  const wavesurfer = createSpectrogram(audioDiv, audioUrl);

  const playBtn = document.createElement("button")
  playBtn.innerText = "play/pause"
  audioDiv.appendChild(playBtn)

  window.addEventListener("keypress", e => {
    if (e.key === " ") {
      togglePlayPause()
      e.preventDefault()  // no scroll
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
  const copyDirectLinkBtn = document.getElementById("copyDirectLinkBtn")
  copyDirectLinkBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(audioUrl)
  })
  const downloadBtn = document.getElementById("downloadBtn")
  downloadBtn.addEventListener("click", () => {
    window.open(audioUrl)
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
