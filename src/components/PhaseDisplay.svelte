<script lang="ts">
    let { remainingTime, totalTime } = $props<{
        remainingTime: number;
        totalTime: number;
    }>();

    function formatTime(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
</script>

<div class="timer-display">
    <div class="timer-display-group">
        <span class="display-text"> Current Phase </span>
        <span class="timer-text">{formatTime(remainingTime)}</span>
    </div>

    <div class="timer-display-group">
        <span class="display-text"> Total Time </span>
        <span class="timer-text">{formatTime(totalTime)}</span>
    </div>
</div>

<style>
    .timer-display {
        display: flex;
        align-items: center;
        justify-content: space-around;
        width: 100%;
    }
    .timer-display-group {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .display-text {
        font-size: 1.2em;
        font-weight: 600;
        color: #ccc;
        margin-bottom: 5px;
    }
    .timer-text {
        font-size: 3em;
        font-weight: bold;
        color: #66bb6a;
    }
</style>
