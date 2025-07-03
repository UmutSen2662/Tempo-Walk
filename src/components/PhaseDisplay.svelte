<script lang="ts">
    let { currentPhase, remainingTime, isPaused } = $props<{
        currentPhase: "slow" | "fast" | "ready";
        remainingTime: number;
        isPaused: boolean;
    }>();

    function formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
</script>

<div class="phase-timer-display">
    <span class="current-phase-text">
        {#if isPaused}
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

<style>
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
</style>
