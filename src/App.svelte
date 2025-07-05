<script lang="ts">
    // Import new components
    import PhaseDisplay from "./components/PhaseDisplay.svelte";
    import PhaseSettings from "./components/PhaseSettings.svelte";
    import VolumeControl from "./components/VolumeControl.svelte";
    import ControlButtons from "./components/ControlButtons.svelte";

    // Local Storage Key
    const LOCAL_STORAGE_KEY = "intervalWalkSettings";
    const DEBOUNCE_DELAY_MS = 500; // 500ms debounce delay

    // Svelte Reactive State Variables (using $state)
    // Initialize with default values, which will be overwritten by loaded settings
    let slowBpm = $state(80); // Default: 80 bpm
    let slowDurationSeconds = $state(180); // Default: 3 minutes
    let fastBpm = $state(100); // Default: 100 bpm
    let fastDurationSeconds = $state(180); // Default: 3 minutes
    let volume = $state(60); // Default: 60%

    let isPlaying = $state(false);
    let isPaused = $state(false);
    let currentPhase = $state<"slow" | "fast" | "ready">("ready");
    let totalTime = $state(0); // Total time of the workout
    let remainingTime = $state(0); // Time remaining in current phase (in seconds)
    let isAudioReady = $state(false); // New state to track audio loading

    // Internal Variables (not directly reactive for UI, but managed by logic)
    let metronomeIntervalId: number | null = null;
    let countdownTimerId: number | null = null;
    let audioContext: AudioContext | null = null;
    let tickBuffer: AudioBuffer | null = null; // To store the decoded 'tick' audio file
    let tackBuffer: AudioBuffer | null = null; // To store the decoded 'tack' audio file
    let beatCounter: number = 0;
    const beatsPerMeasure: number = 2;

    // Debounce timer ID
    let debounceTimeoutId: number | null = null;

    // URLs for your metronome click sound files (relative to the 'public' folder)
    const tickAudioFileUrl: string = "./tick.mp3";
    const tackAudioFileUrl: string = "./tack.mp3";

    // DOM Element References (using bind:this)
    let messageBox: HTMLDivElement;

    // Derived States (using $derived)
    const effectiveVolumeGain = $derived(Math.pow(volume / 100, 2)); // Using power of 2 for a good curve

    // Utility Functions
    function showMessage(message: string, duration: number = 3000) {
        console.log("showMessage called with:", message); // Debug log
        if (messageBox) {
            console.log("messageBox element is available:", messageBox); // Debug log
            messageBox.textContent = message;
            // Directly set opacity and pointer-events
            messageBox.style.opacity = "1";
            messageBox.style.pointerEvents = "auto";
            console.log("messageBox style after showing:", messageBox.style.opacity); // Debug log
            setTimeout(() => {
                messageBox.style.opacity = "0";
                messageBox.style.pointerEvents = "none"; // Revert pointer-events after fade out
                console.log("messageBox style after hiding:", messageBox.style.opacity); // Debug log
            }, duration);
        } else {
            console.warn("messageBox element is not yet available when showMessage was called."); // Debug log
        }
    }

    // Local Storage Functions
    function saveSettingsToLocalStorage() {
        try {
            const settings = {
                slowBpm: slowBpm,
                slowDurationSeconds: slowDurationSeconds,
                fastBpm: fastBpm,
                fastDurationSeconds: fastDurationSeconds,
                volume: volume,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
            console.log("Settings saved to local storage.");
        } catch (error) {
            console.error("Failed to save settings to local storage:", error);
            showMessage("Failed to save settings. Your browser might be in private mode.");
        }
    }

    // Debounced version of saveSettingsToLocalStorage
    function debouncedSaveSettings() {
        if (debounceTimeoutId) {
            clearTimeout(debounceTimeoutId);
        }
        debounceTimeoutId = setTimeout(() => {
            saveSettingsToLocalStorage();
            debounceTimeoutId = null;
        }, DEBOUNCE_DELAY_MS);
    }

    function loadSettingsFromLocalStorage() {
        try {
            const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                slowBpm = settings.slowBpm !== undefined ? settings.slowBpm : 60;
                slowDurationSeconds = settings.slowDurationSeconds !== undefined ? settings.slowDurationSeconds : 180;
                fastBpm = settings.fastBpm !== undefined ? settings.fastBpm : 120;
                fastDurationSeconds = settings.fastDurationSeconds !== undefined ? settings.fastDurationSeconds : 180;
                volume = settings.volume !== undefined ? settings.volume : 60;
                console.log("Settings loaded from local storage:", settings);
            }
        } catch (error) {
            console.error("Failed to load settings from local storage:", error);
            showMessage("Failed to load saved settings.");
        }
    }

    // Audio Functions
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

    // Metronome Control Functions
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

    // Interval Walk Logic
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
            totalTime++;
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
        const sDur = slowDurationSeconds;
        const fBpm = fastBpm;
        const fDur = fastDurationSeconds;

        if (
            isNaN(sBpm) ||
            sBpm < 40 ||
            sBpm > 240 ||
            isNaN(sDur) ||
            sDur < 10 ||
            sDur > 300 ||
            isNaN(fBpm) ||
            fBpm < 40 ||
            fBpm > 240 ||
            isNaN(fDur) ||
            fDur < 10 ||
            fDur > 300
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
        totalTime = 0;
        console.log("Workout stopped and reset.");
    }

    // Svelte 5 $effect for initial audio context creation and file loading
    $effect(() => {
        loadSettingsFromLocalStorage(); // Load settings first
        initAudioContextAndLoadFiles(); // Then initialize audio
    });

    // $effect to save Volume, BPM and Duration settings whenever they change
    $effect(() => {
        volume;
        slowBpm;
        slowDurationSeconds;
        fastBpm;
        fastDurationSeconds;

        debouncedSaveSettings();
    });
</script>

<div bind:this={messageBox} class="message-box"></div>

<div class="app-container">
    <h1 class="app-state">
        {#if isPaused}
            Paused
        {:else if currentPhase === "slow"}
            Slow Walk
        {:else if currentPhase === "fast"}
            Fast Walk
        {:else if currentPhase === "ready"}
            Ready
        {/if}
    </h1>

    <!-- Phase Display Component -->
    <PhaseDisplay {remainingTime} {totalTime} />

    <!-- Slow Walk Settings Component -->
    <PhaseSettings title="Slow Walk" bind:bpm={slowBpm} bind:durationSeconds={slowDurationSeconds} />

    <!-- Fast Walk Settings Component -->
    <PhaseSettings title="Fast Walk" bind:bpm={fastBpm} bind:durationSeconds={fastDurationSeconds} />

    <!-- Volume Control Component -->
    <VolumeControl bind:volume />

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
    /* Message Box */
    .message-box {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #ccc;
        color: #222;
        padding: 10px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        z-index: 10;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
        text-align: center;
        pointer-events: none;
        width: calc(100% - 80px);
    }

    /* App Container */
    .app-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        gap: 20px;
    }

    /* App Title */
    .app-state {
        font-size: 2.5em;
        font-weight: bold;
        color: #66bb6a;
        text-align: center;
        margin: 0;
        margin-bottom: 10px;
    }
</style>
