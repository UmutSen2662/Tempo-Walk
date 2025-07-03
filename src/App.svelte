<script lang="ts">
    // --- Svelte Reactive State Variables (using $state) ---
    let slowBpm = $state(60);
    let slowDurationMinutes = $state(3);
    let fastBpm = $state(120);
    let fastDurationMinutes = $state(3);
    let volume = $state(60); // Volume slider value 0-100

    let isPlaying = $state(false);
    let isPaused = $state(false);
    // currentPhase now only tracks 'slow', 'fast', or 'ready'
    // 'paused' state is handled by the isPaused flag.
    let currentPhase = $state<"slow" | "fast" | "ready">("ready");
    let remainingTime = $state(0); // Time remaining in current phase (in seconds)
    let isAudioReady = $state(false); // New state to track audio loading

    // --- Internal Variables (not directly reactive for UI, but managed by logic) ---
    let metronomeIntervalId: number | null = null;
    let countdownTimerId: number | null = null;
    let audioContext: AudioContext | null = null;
    let tickBuffer: AudioBuffer | null = null;
    let tackBuffer: AudioBuffer | null = null;
    let beatCounter: number = 0;
    const beatsPerMeasure: number = 2;

    // URLs for your metronome click sound files (relative to the 'public' folder)
    const tickAudioFileUrl: string = "./tick.mp3";
    const tackAudioFileUrl: string = "./tack.mp3";

    // --- DOM Element References (using bind:this) ---
    let messageBox: HTMLDivElement;

    // --- Derived States (using $derived) ---
    const slowDurationSeconds = $derived(slowDurationMinutes * 60);
    const fastDurationSeconds = $derived(fastDurationMinutes * 60);

    // New derived state for effective audio gain (exponential scale)
    const effectiveVolumeGain = $derived(Math.pow(volume / 100, 2) * 2); // Using power of 2 for a good curve

    // --- Utility Functions ---
    function showMessage(message: string, duration: number = 3000) {
        if (messageBox) {
            messageBox.textContent = message;
            messageBox.classList.add("show");
            setTimeout(() => {
                messageBox.classList.remove("show");
            }, duration);
        }
    }

    function formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }

    // --- Audio Functions ---
    async function initAudioContextAndLoadFiles() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                // We will resume the context on user interaction (Start button click)
                await loadAudioFiles();
                isAudioReady = true; // Set audio ready state after successful loading
            } catch (e) {
                console.error("Web Audio API is not supported or audio failed to load:", e);
                showMessage("Audio not supported or failed to load. Metronome sound will not work.");
                isAudioReady = false; // Ensure state reflects failure
            }
        }
    }

    async function loadAudioFiles() {
        try {
            const tickResponse = await fetch(tickAudioFileUrl);
            if (!tickResponse.ok) throw new Error(`HTTP error! status: ${tickResponse.status} for ${tickAudioFileUrl}`);
            tickBuffer = await audioContext!.decodeAudioData(await tickResponse.arrayBuffer());

            const tackResponse = await fetch(tackAudioFileUrl);
            if (!tackResponse.ok) throw new Error(`HTTP error! status: ${tackResponse.status} for ${tackAudioFileUrl}`);
            tackBuffer = await audioContext!.decodeAudioData(await tackResponse.arrayBuffer());

            console.log("Audio files loaded successfully!");
        } catch (error) {
            console.error("Error loading audio files:", error);
            showMessage(
                'Failed to load metronome sounds. Ensure "tick.mp3" and "tack.mp3" are in the "public" folder and accessible.'
            );
            throw error; // Re-throw to be caught by initAudioContextAndLoadFiles
        }
    }

    function playClick() {
        // Only play if audio context and buffers are ready
        if (!audioContext || !tickBuffer || !tackBuffer) {
            console.warn("Audio not ready for playback.");
            return;
        }

        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        source.buffer = beatCounter % beatsPerMeasure === 0 ? tickBuffer : tackBuffer;

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.setValueAtTime(effectiveVolumeGain, audioContext.currentTime);

        source.start(0);

        beatCounter = (beatCounter + 1) % beatsPerMeasure;
    }

    // --- Metronome Control Functions ---
    function startMetronomeClicks(bpmToUse: number) {
        if (metronomeIntervalId) {
            clearInterval(metronomeIntervalId);
        }
        const intervalDuration = (60 / bpmToUse) * 1000;
        beatCounter = 0;
        playClick();
        metronomeIntervalId = setInterval(playClick, intervalDuration);
    }

    function stopMetronomeClicks() {
        if (metronomeIntervalId) {
            clearInterval(metronomeIntervalId);
            metronomeIntervalId = null;
        }
    }

    // --- Interval Walk Logic ---
    function updatePhase() {
        if (remainingTime <= 0) {
            if (currentPhase === "slow") {
                currentPhase = "fast";
                remainingTime = fastDurationSeconds;
            } else {
                currentPhase = "slow";
                remainingTime = slowDurationSeconds;
            }
            startMetronomeClicks(currentPhase === "slow" ? slowBpm : fastBpm);
        }

        if (isPlaying && !isPaused) {
            remainingTime--;
        }

        if (remainingTime < 0) {
            remainingTime = 0;
        }
    }

    async function startIntervalWalk() {
        // Ensure audio context is active before proceeding
        if (audioContext && audioContext.state === "suspended") {
            try {
                await audioContext.resume();
                console.log("AudioContext resumed successfully on user interaction.");
            } catch (e) {
                console.error("Failed to resume AudioContext:", e);
                showMessage("Failed to activate audio. Please try again or check browser settings.");
                return;
            }
        }

        // Ensure audio is ready before starting
        if (!isAudioReady) {
            showMessage("Audio is still loading or failed to load. Please wait a moment and try again.");
            return;
        }

        const sBpm = slowBpm;
        const sDur = slowDurationMinutes;
        const fBpm = fastBpm;
        const fDur = fastDurationMinutes;

        if (
            isNaN(sBpm) ||
            sBpm < 40 ||
            sBpm > 240 ||
            isNaN(sDur) ||
            sDur < 1 ||
            sDur > 60 ||
            isNaN(fBpm) ||
            fBpm < 40 ||
            fBpm > 240 ||
            isNaN(fDur) ||
            fDur < 1 ||
            fDur > 60
        ) {
            showMessage("Please ensure all BPMs are between 40-240 and durations are between 1-60 minutes.");
            return;
        }

        // --- Core Change: Handle Resume vs. New Start ---
        if (isPaused) {
            isPaused = false;
            isPlaying = true;
            // currentPhase retains its value from before pause, so BPM is correct
            startMetronomeClicks(currentPhase === "slow" ? slowBpm : fastBpm);
            // Resume countdown timer
            if (countdownTimerId) clearInterval(countdownTimerId); // Clear any old timer just in case
            countdownTimerId = setInterval(updatePhase, 1000);
            console.log("Workout resumed.");
        } else {
            // Start a brand new workout
            isPlaying = true;
            isPaused = false;
            currentPhase = "slow"; // Always start a new workout with slow phase
            remainingTime = slowDurationSeconds;

            startMetronomeClicks(slowBpm);
            if (countdownTimerId) clearInterval(countdownTimerId);
            countdownTimerId = setInterval(updatePhase, 1000);
            console.log("New workout started.");
        }
    }

    function pauseIntervalWalk() {
        if (!isPlaying) return;

        isPaused = true; // Set paused state
        isPlaying = false; // No longer "playing" but in a paused state
        stopMetronomeClicks();
        if (countdownTimerId) {
            clearInterval(countdownTimerId);
            countdownTimerId = null;
        }
        // IMPORTANT FIX: Do NOT change currentPhase to "paused" here.
        // currentPhase should retain its actual phase ('slow' or 'fast')
        // so that resume knows which BPM to use.
        // The UI will display "Paused" based on the 'isPaused' flag.
        console.log("Workout paused. Current phase was:", currentPhase, "Remaining time:", remainingTime);
    }

    function stopIntervalWalk() {
        isPlaying = false;
        isPaused = false;
        stopMetronomeClicks();
        if (countdownTimerId) {
            clearInterval(countdownTimerId);
            countdownTimerId = null;
        }

        currentPhase = "ready";
        remainingTime = 0;
        beatCounter = 0;
        console.log("Workout stopped and reset.");
    }

    // --- Event Handler for Input Changes (BPM/Duration fields only) ---
    function handleWorkoutSettingChange() {
        if (isPlaying || isPaused) {
            stopIntervalWalk();
            showMessage("Settings changed. Press Start to begin new workout.");
        }
    }

    // --- Svelte 5 $effect for initial audio context creation and file loading ---
    // This effect runs once when the component is first rendered.
    $effect(() => {
        initAudioContextAndLoadFiles();
    });
</script>

<div bind:this={messageBox} class="message-box"></div>

<div class="app-container">
    <h1 class="app-title">Interval Walk</h1>

    <!-- Current Phase & Timer Display -->
    <div class="phase-timer-display">
        <span class="current-phase-text">
            {#if isPaused}
                <!-- Check isPaused first for display -->
                Paused
            {:else if currentPhase === "slow"}
                Slow Walk
            {:else if currentPhase === "fast"}
                Fast Walk
            {:else}
                Ready
            {/if}
        </span>
        <span class="countdown-timer-text">{formatTime(remainingTime)}</span>
    </div>

    <!-- Slow Walk Settings -->
    <div class="phase-settings-card">
        <h2 class="phase-title">Slow Walk</h2>
        <div class="phase-inputs">
            <div class="input-group">
                <label for="slowBpmInput" class="input-label">BPM</label>
                <input
                    type="number"
                    id="slowBpmInput"
                    min="40"
                    max="240"
                    bind:value={slowBpm}
                    oninput={handleWorkoutSettingChange}
                    class="input-field"
                />
            </div>
            <div class="input-group">
                <label for="slowDurationInput" class="input-label">Duration (min)</label>
                <input
                    type="number"
                    id="slowDurationInput"
                    min="1"
                    max="60"
                    bind:value={slowDurationMinutes}
                    oninput={handleWorkoutSettingChange}
                    class="input-field"
                />
            </div>
        </div>
    </div>

    <!-- Fast Walk Settings -->
    <div class="phase-settings-card">
        <h2 class="phase-title">Fast Walk</h2>
        <div class="phase-inputs">
            <div class="input-group">
                <label for="fastBpmInput" class="input-label">BPM</label>
                <input
                    type="number"
                    id="fastBpmInput"
                    min="40"
                    max="240"
                    bind:value={fastBpm}
                    oninput={handleWorkoutSettingChange}
                    class="input-field"
                />
            </div>
            <div class="input-group">
                <label for="fastDurationInput" class="input-label">Duration (min)</label>
                <input
                    type="number"
                    id="fastDurationInput"
                    min="1"
                    max="60"
                    bind:value={fastDurationMinutes}
                    oninput={handleWorkoutSettingChange}
                    class="input-field"
                />
            </div>
        </div>
    </div>

    <!-- Volume Slider -->
    <div class="volume-control">
        <label for="volumeSlider" class="volume-label">Volume</label>
        <input type="range" id="volumeSlider" min="0" max="100" bind:value={volume} step="1" class="volume-slider" />
    </div>

    <!-- Control Buttons (Start, Pause, Stop) -->
    <div class="control-buttons">
        <button
            onclick={startIntervalWalk}
            disabled={(isPlaying && !isPaused) || !isAudioReady}
            class="control-button start-button"
            class:disabled={(isPlaying && !isPaused) || !isAudioReady}
        >
            {#if isPaused}Resume{:else}Start{/if}
        </button>
        <button
            onclick={pauseIntervalWalk}
            disabled={!isPlaying || isPaused}
            class="control-button pause-button"
            class:disabled={!isPlaying || isPaused}
        >
            Pause
        </button>
        <button
            onclick={stopIntervalWalk}
            disabled={!isPlaying && !isPaused}
            class="control-button stop-button"
            class:disabled={!isPlaying && !isPaused}
        >
            Stop
        </button>
    </div>
</div>

<style>
    /* General body styling */
    :root {
        font-family: sans-serif; /* Simpler font */
        background-color: #333; /* Dark background */
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        color: #eee; /* Light text color */
    }

    /* Message Box */
    .message-box {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #fff;
        color: #333;
        padding: 10px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition:
            opacity 0.3s ease-in-out,
            visibility 0.3s ease-in-out;
        text-align: center;
    }
    .message-box.show {
        opacity: 1;
        visibility: visible;
    }

    /* App Container */
    .app-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        background-color: #444; /* Slightly lighter dark background */
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%; /* Responsive width */
        margin: 20px; /* Some margin for smaller screens */
    }

    /* App Title */
    .app-title {
        font-size: 2.5em; /* Larger title */
        font-weight: bold;
        margin-bottom: 25px;
        color: #66bb6a; /* Green accent */
        text-align: center;
    }

    /* Phase & Timer Display */
    .phase-timer-display {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 25px;
    }
    .current-phase-text {
        font-size: 1.5em;
        font-weight: 600;
        color: #ccc;
        margin-bottom: 5px;
    }
    .countdown-timer-text {
        font-size: 3.5em;
        font-weight: bold;
        color: #66bb6a;
    }

    /* Phase Settings Card */
    .phase-settings-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        margin-bottom: 20px;
        padding: 15px;
        background-color: #555; /* Even lighter dark background */
        border-radius: 8px;
    }
    .phase-title {
        font-size: 1.3em;
        font-weight: bold;
        color: #66bb6a;
        margin-bottom: 15px;
    }
    .phase-inputs {
        display: flex;
        justify-content: space-around;
        width: 100%;
    }
    .input-group {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .input-label {
        font-size: 0.9em;
        color: #bbb;
        margin-bottom: 5px;
    }
    .input-field {
        width: 80px;
        padding: 5px;
        text-align: center;
        font-size: 1.5em;
        font-weight: bold;
        background-color: #333;
        color: #66bb6a;
        border: 1px solid #777;
        border-radius: 5px;
        outline: none;
    }
    .input-field:focus {
        border-color: #66bb6a;
        box-shadow: 0 0 0 2px rgba(102, 187, 106, 0.5);
    }

    /* Volume Control */
    .volume-control {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        margin-bottom: 30px;
    }
    .volume-label {
        font-size: 1.2em;
        color: #ccc;
        margin-bottom: 10px;
    }
    .volume-slider {
        width: 100%;
        height: 8px;
        background-color: #777;
        border-radius: 4px;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        cursor: pointer;
    }
    .volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        background-color: #66bb6a;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        margin-top: -6px; /* Adjust to center the thumb */
    }
    .volume-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background-color: #66bb6a;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        margin-top: -6px; /* Adjust to center the thumb */
    }
    .volume-slider::-webkit-slider-runnable-track {
        background: #666;
        border-radius: 4px;
        height: 8px;
    }
    .volume-slider::-moz-range-track {
        background: #666;
        border-radius: 4px;
        height: 8px;
    }

    /* Control Buttons */
    .control-buttons {
        display: flex;
        justify-content: space-around;
        width: 100%;
    }
    .control-button {
        font-weight: bold;
        padding: 12px 25px;
        border-radius: 25px;
        border: none;
        cursor: pointer;
        transition:
            background-color 0.2s ease,
            opacity 0.2s ease;
        color: #fff;
    }
    .control-button.disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .start-button {
        background-color: #4caf50; /* Green */
    }
    .start-button:hover:not(.disabled) {
        background-color: #43a047;
    }

    .pause-button {
        background-color: #ffc107; /* Yellow */
    }
    .pause-button:hover:not(.disabled) {
        background-color: #ffb300;
    }

    .stop-button {
        background-color: #f44336; /* Red */
    }
    .stop-button:hover:not(.disabled) {
        background-color: #e53935;
    }
</style>
