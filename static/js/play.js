const contentDiv = document.getElementById("contentDiv")
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
        const errorMessage = (await response.json()).detail;
        contentDiv.innerText = errorMessage;
        return false;
    }

    const audioBlob = await response.blob();
    const audioUrlObject = URL.createObjectURL(audioBlob);
    const audioEl = new Audio(audioUrlObject);
    audioEl.controls = true;
    contentDiv.appendChild(audioEl);

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
    idx = recentlyViewed.indexOf(key);
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
