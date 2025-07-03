<script lang="ts">
    // Import new components
    import PhaseDisplay from "./components/PhaseDisplay.svelte";
    import PhaseSettings from "./components/PhaseSettings.svelte";
    import VolumeControl from "./components/VolumeControl.svelte";
    import ControlButtons from "./components/ControlButtons.svelte";

    // --- Svelte Reactive State Variables (using $state) ---
    let slowBpm = $state(60);
    let slowDurationSeconds = $state(180); // Now directly seconds (3 minutes)
    let fastBpm = $state(120);
    let fastDurationSeconds = $state(180); // Now directly seconds (3 minutes)
    let volume = $state(60); // Volume slider value 0-100

    let isPlaying = $state(false);
    let isPaused = $state(false);
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

    // --- Audio Functions ---
    async function initAudioContextAndLoadFiles() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

    async function handleStart() {
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
        const sDur = slowDurationSeconds; // Use seconds directly
        const fBpm = fastBpm;
        const fDur = fastDurationSeconds; // Use seconds directly

        if (
            isNaN(sBpm) ||
            sBpm < 40 ||
            sBpm > 240 ||
            isNaN(sDur) ||
            sDur < 10 ||
            sDur > 300 || // Adjusted validation for seconds
            isNaN(fBpm) ||
            fBpm < 40 ||
            fBpm > 240 ||
            isNaN(fDur) ||
            fDur < 10 ||
            fDur > 300 // Adjusted validation for seconds
        ) {
            showMessage("Please ensure all BPMs are between 40-240 and durations are between 10-300 seconds.");
            return;
        }

        if (isPaused) {
            isPaused = false;
            isPlaying = true;
            startMetronomeClicks(currentPhase === "slow" ? slowBpm : fastBpm);
            if (countdownTimerId) clearInterval(countdownTimerId);
            countdownTimerId = setInterval(updatePhase, 1000);
            console.log("Workout resumed.");
        } else {
            isPlaying = true;
            isPaused = false;
            currentPhase = "slow";
            remainingTime = slowDurationSeconds;

            startMetronomeClicks(slowBpm);
            if (countdownTimerId) clearInterval(countdownTimerId);
            countdownTimerId = setInterval(updatePhase, 1000);
            console.log("New workout started.");
        }
    }

    function handlePause() {
        if (!isPlaying) return;

        isPaused = true;
        isPlaying = false;
        stopMetronomeClicks();
        if (countdownTimerId) {
            clearInterval(countdownTimerId);
            countdownTimerId = null;
        }
        console.log("Workout paused. Current phase was:", currentPhase, "Remaining time:", remainingTime);
    }

    function handleStop() {
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

    // --- Event Handlers from Child Components (now directly called callbacks) ---
    function handlePhaseSettingsChange(detail: { title: string; bpm: number; durationSeconds: number }) {
        // Changed detail type
        const { title, bpm, durationSeconds } = detail; // Destructure durationSeconds
        if (title === "Slow Walk") {
            slowBpm = bpm;
            slowDurationSeconds = durationSeconds; // Assign to slowDurationSeconds
        } else if (title === "Fast Walk") {
            fastBpm = bpm;
            fastDurationSeconds = durationSeconds; // Assign to fastDurationSeconds
        }
        if (isPlaying || isPaused) {
            handleStop(); // Use handleStop to reset if playing/paused
            showMessage("Settings changed. Press Start to begin new workout.");
        }
    }

    function handleVolumeChange(newVolume: number) {
        volume = newVolume; // newVolume directly contains the volume number
    }

    // --- Svelte 5 $effect for initial audio context creation and file loading ---
    $effect(() => {
        initAudioContextAndLoadFiles();
    });
</script>

<div bind:this={messageBox} class="message-box"></div>

<div class="app-container">
    <h1 class="app-title">Interval Walk</h1>

    <!-- Phase Display Component -->
    <PhaseDisplay {currentPhase} {remainingTime} {isPaused} />

    <!-- Slow Walk Settings Component -->
    <PhaseSettings
        title="Slow Walk"
        initialBpm={slowBpm}
        initialDurationMinutes={slowDurationSeconds}
        onChangeSettings={handlePhaseSettingsChange}
    />

    <!-- Fast Walk Settings Component -->
    <PhaseSettings
        title="Fast Walk"
        initialBpm={fastBpm}
        initialDurationMinutes={fastDurationSeconds}
        onChangeSettings={handlePhaseSettingsChange}
    />

    <!-- Volume Control Component -->
    <VolumeControl initialVolume={volume} onChangeVolume={handleVolumeChange} />

    <!-- Control Buttons Component -->
    <ControlButtons
        {isPlaying}
        {isPaused}
        {isAudioReady}
        onStart={handleStart}
        onPause={handlePause}
        onStop={handleStop}
    />
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
</style>
