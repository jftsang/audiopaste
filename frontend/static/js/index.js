/** @jsx h */
import main from "./main.js";
import {h, app, text} from "hyperapp";

const recorderDiv = document.getElementById("recorderDiv")

const state = {
  isRecording: false,
  recorder: null,
  blob: null
}

const view = (state) => {
  const audioPreview = h("audio", {
    id: "audio",
    controls: true,
    class: "w-100",
    style: {maxWidth: "300px"}
  })
  const recordStartStopBtn = h("button", {
    id: "recordStartStopBtn",
    class: "btn btn-primary mx-2"
  }, [text("Record")])
  const uploadBtn = h("button", {
    id: "uploadBtn",
    class: "btn btn-success mx-2",
    disabled: true
  }, [text("Upload")])
  const pitchPipeBtn = h("button", {
    id: "pitchPipeBtn",
    class: "btn btn-secondary mx-2",
    dataBsToggle: "tooltip",
    dataBsPlacement: "bottom",
    title: "A440"
  }, [
    h("i", {class: "bi bi-music-note"}),
    text("A")
  ])

  return h("main", {}, [
    h("div", {class: "d-flex justify-content-center mb-3"}, [
      audioPreview
    ]),
    h("div", {class: "d-flex justify-content-center mb-3"}, [
      recordStartStopBtn,
      uploadBtn,
      pitchPipeBtn,
    ])
  ])
}


app({init: state, view, node: recorderDiv})

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
let oscillator = null

function startTone() {
  if (oscillator) {
    return
  }
  const audioCtx = new AudioContext();
  oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.type = "triangle";
  oscillator.frequency.value = 440;
  gainNode.gain.value = 0.5;
  oscillator.start();
  setTimeout(stopTone, 1000);
}

function stopTone() {
  if (oscillator) {
    oscillator.stop();
    oscillator = null;
  }
}

pitchPipeBtn.addEventListener("mousedown", startTone);
pitchPipeBtn.addEventListener("touchstart", startTone);
// pitchPipeBtn.addEventListener("mouseup", stopTone);
// pitchPipeBtn.addEventListener("touchend", stopTone);
// pitchPipeBtn.addEventListener("mouseleave", stopTone); // For mouse leave
