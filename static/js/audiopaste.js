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
}


uploadBtn.addEventListener("click", async function () {
    const blobURL = audioEl.src;

    if (!blobURL) {
        console.log("No audio file");
        return;
    }

    const formData = new FormData();

    formData.append("audio", blob, "recorded.wav");

    const res = await fetch("/upload", {
        method: "POST",
        body: formData
    });
    const key = (await res.json()).key

    window.location.href = `/p/${key}`
})
