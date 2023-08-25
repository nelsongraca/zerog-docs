const LOWER_BOUND = 50;
const UPPER_BOUND = 150;
const UPDATE_INTERVAL = 20;
const FREQUENCY_READINGS = 4;
const HOLD_DURATION = 250; // in milliseconds
const AVERAGE_RANGE = 1;

let frequencyBuffer = [];
let lastStableFrequency = "N/A";
let holdEndTime = 0;  // Used to hold onto a detected frequency after a strum

async function startListening() {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 16384;

    updateFrequency(analyser);
}

function updateFrequency(analyser) {
    const currentTime = Date.now();

    if (currentTime >= holdEndTime) {
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencyData);

        const dominantFrequency = getDominantFrequency(analyser, frequencyData);

        if (dominantFrequency !== -1 && dominantFrequency > LOWER_BOUND && dominantFrequency < UPPER_BOUND) {
            frequencyBuffer.push(dominantFrequency);
            if (frequencyBuffer.length > FREQUENCY_READINGS) {
                frequencyBuffer.shift();
            }
            const medianFreq = median(frequencyBuffer);
            if (frequencyBuffer.every(freq => Math.abs(freq - medianFreq) < 20)) {
                lastStableFrequency = medianFreq.toFixed(0);
                console.log(`Stable dominant frequency detected: ${lastStableFrequency} Hz`);
                display(`Detected Tension Frequency: ${lastStableFrequency} Hz`);
                holdEndTime = currentTime + HOLD_DURATION;  // Set the hold duration after detecting a stable frequency
            }
        } else {
            display(`Detected Tension Frequency: ${lastStableFrequency} Hz (Out of range)`);
        }
    }
    setTimeout(() => updateFrequency(analyser), UPDATE_INTERVAL);
}


function getDominantFrequency(analyser, frequencyData) {
    const freqStep = analyser.context.sampleRate / analyser.fftSize;
    let maxAmplitude = -Infinity;
    let dominantFrequencyIndex = -1;

    frequencyData.forEach((amplitude, index) => {
        if (amplitude > maxAmplitude) {
            maxAmplitude = amplitude;
            dominantFrequencyIndex = index;
        }
    });

    if (dominantFrequencyIndex === -1) return -1;

    const startIdx = Math.max(0, dominantFrequencyIndex - AVERAGE_RANGE);
    const endIdx = Math.min(frequencyData.length - 1, dominantFrequencyIndex + AVERAGE_RANGE);
    let sumFrequency = 0;
    let sumAmplitude = 0;

    for (let i = startIdx; i <= endIdx; i++) {
        sumFrequency += frequencyData[i] * i * freqStep;
        sumAmplitude += frequencyData[i];
    }

    return sumFrequency / sumAmplitude;
}

function display(message) {
    document.getElementById("frequencyStats").textContent = message;
}

function mean(arr) {
    return arr.reduce((acc, val) => acc + val, 0) / arr.length;
}
function median(numbers) {
    const sorted = Array.from(numbers).sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}
function initiateListening() {
    const button = document.getElementById("startButton");
    button.disabled = true;
    button.textContent = "Calibrating...";
    startListening();
}