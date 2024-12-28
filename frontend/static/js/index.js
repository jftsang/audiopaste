/** @jsx h */
import main from "./main.js";
import { h, app } from "hyperapp";

const audioEl = document.getElementById("audio")
const recordStartStopBtn = document.getElementById("recordStartStopBtn")
const uploadBtn = document.getElementById("uploadBtn")

let recorder = null;

let blob = null;


recordStartStopBtn.addEventListener("click", async function () {
  if (recordStartStopBtn.textContent === "Record") {
    recordStartStopBtn.textContent = "Stop"
    await startRecording();
  } else {
    recordStartStopBtn.textContent = "Record"
    await stopRecording();
  }
});

async function startRecording() {
  // request permission
  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
  // https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

  const stream = await navigator.mediaDevices.getUserMedia({audio: true});
  recorder = new MediaRecorder(stream, {mimeType: "audio/webm"});
  let chunks = [];
  recorder.start();
  recorder.ondataavailable = (event) => {
    chunks.push(event.data);
  };
  recorder.onstop = async () => {
    blob = new Blob(chunks, {type: "audio/webm"});
    console.log(blob);
    chunks = [];
    const audioURL = window.URL.createObjectURL(blob);
    audioEl.src = audioURL;
    audioEl.controls = true;
    console.log(audioURL);
  };
}

async function stopRecording() {
  recorder.stop();
  recorder = null;
  uploadBtn.disabled = false;
}


uploadBtn.addEventListener("click", async function () {
  if (!audioEl.src) {
    console.log("No audio file");
    return;
  }

  const formData = new FormData();

  formData.append("audio", blob, "recorded.webm");

  const res = await fetch("/upload", {
    method: "POST",
    body: formData
  });
  const key = (await res.json()).key
  window.location.href = `/p/${key}`
})

const pitchPipeBtn = document.getElementById("pitchPipeBtn")

pitchPipeBtn.addEventListener("click", async () => {
  // play a 440 Hz note
  const audioCtx = new AudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.type = "triangle";
  oscillator.frequency.value = 440;
  gainNode.gain.value = 0.5;
  oscillator.start();
  setTimeout(() => {oscillator.stop();}, 400);
});
