<script lang="ts">
    // Define the props, which are now callback functions
    let { isPlaying, isPaused, isAudioReady, onStart, onPause, onStop } = $props<{
        isPlaying: boolean;
        isPaused: boolean;
        isAudioReady: boolean;
        onStart: () => void;
        onPause: () => void;
        onStop: () => void;
    }>();
</script>

<div class="control-buttons">
    <button
        onclick={onStart}
        disabled={(isPlaying && !isPaused) || !isAudioReady}
        class="control-button start-button"
        class:disabled={(isPlaying && !isPaused) || !isAudioReady}
    >
        {#if isPaused}Continue{:else}Start{/if}
    </button>
    <button
        onclick={onPause}
        disabled={!isPlaying || isPaused}
        class="control-button pause-button"
        class:disabled={!isPlaying || isPaused}
    >
        Pause
    </button>
    <button
        onclick={onStop}
        disabled={!isPlaying && !isPaused}
        class="control-button stop-button"
        class:disabled={!isPlaying && !isPaused}
    >
        Stop
    </button>
</div>

<style>
    .control-buttons {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        width: 100%;
        gap: 10px;
    }
    .control-button {
        font-weight: bold;
        height: 3rem;
        border-radius: 15px;
        border: none;
        cursor: pointer;
        transition:
            background-color 0.2s ease,
            opacity 0.2s ease;
        color: #fff;
        font-size: 1rem;
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
