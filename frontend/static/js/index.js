/** @jsx h */
import {app, h, text} from "hyperapp";

const recorderDiv = document.getElementById("recorderDiv")

const initialState = {
  recorder: null,
  blob: null,
  oscillator: null,
}

const view = (state, actions) => {
  console.log(state)
  const audioURL = state.blob ? window.URL.createObjectURL(state.blob) : null;

  const audioPreview = h("audio", {
    id: "audio",
    src: audioURL,
    controls: true,
    class: "w-100",
    style: {maxWidth: "300px"}
  })

  // Update the button handler to use actions directly
  const handleRecordStartStopBtn = () => {
    if (state.recorder !== null && state.recorder !== "initializing") {
      state.recorder.stop();
      actions.setRecorder(null);  // Stop recording and reset recorder state
    } else {
      actions.requestRecorder();  // Start recording
    }
  };

  const label = (
    state.recorder === null ? "Record" : (
      state.recorder === "initializing" ? "Initializing..." : "Stop"
    )
  )
  const recordStartStopBtn = h("button", {
    id: "recordStartStopBtn",
    class: "btn btn-primary mx-2",
    onclick: handleRecordStartStopBtn,
  }, [text(label)]);

  const uploadBtn = h("button", {
    id: "uploadBtn",
    class: "btn btn-success mx-2",
    disabled: (state.blob === null)
  }, [text("Upload")]);

  const handlePitchPipeBtn = (state) => {
    if (state.oscillator) {
      state.oscillator.stop();
      return {...state, oscillator: null}
    }

    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = "triangle";
    oscillator.frequency.value = 440;
    gainNode.gain.value = 0.5;
    oscillator.start();

    // TODO automatically stop after 1 second
    //  need to dynamically get new state
    //  https://chatgpt.com/share/67716b90-0edc-8005-9d9b-19ead3395852
    return {...state, oscillator};
  };

  const pitchPipeBtn = h("button", {
    id: "pitchPipeBtn",
    class: "btn btn-secondary mx-2",
    dataBsToggle: "tooltip",
    dataBsPlacement: "bottom",
    onclick: handlePitchPipeBtn,
    title: "A440"
  }, [h("i", {class: "bi bi-music-note"}), text("A")])


  return h("main", {}, [
    h("div", {class: "d-flex justify-content-center mb-3"}, [
      audioPreview
    ]),
    h("div", {class: "d-flex justify-content-center mb-3"}, [
      recordStartStopBtn, uploadBtn, pitchPipeBtn
    ])
  ])
}


const actions = {
  setRecorder: (state, recorder) => ({...state, recorder}),
  setBlob: (state, blob) => ({...state, blob}),
  resetRecorder: (state) => ({...state, recorder: null}),
  requestRecorder: (state) => {
    navigator.mediaDevices.getUserMedia({audio: true})
      .then((stream) => {
        const recorder = new MediaRecorder(stream, {mimeType: "audio/webm"});
        let chunks = [];

        recorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, {type: "audio/webm"});
          chunks = [];
          (actions.setBlob(state, blob));  // Dispatch setBlob through dispatch
        };

        recorder.start();
        (actions.setRecorder(state, recorder));  // Dispatch setRecorder through dispatch
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error);
        (actions.resetRecorder(state));  // Dispatch resetRecorder through dispatch
      });
  },
};

app({init: initialState, view, actions, node: recorderDiv});


/*

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


 */
