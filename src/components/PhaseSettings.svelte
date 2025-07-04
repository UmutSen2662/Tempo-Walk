<script lang="ts">
    let {
        title,
        bpm = $bindable(), // This declares 'bpm' as a bindable prop
        durationSeconds = $bindable(), // This declares 'durationSeconds' as a bindable prop
    } = $props<{
        title: string;
        bpm: number;
        durationSeconds: number;
    }>();
</script>

<div class="phase-settings-card">
    <h2 class="phase-title">{title}</h2>
    <div class="phase-inputs">
        <div class="input-group">
            <label for="{title.toLowerCase().replace(' ', '')}BpmInput" class="input-label">BPM</label>
            <div class="input-controls">
                <button onclick={() => (bpm = Math.max(40, bpm - 5))}>-</button>
                <input
                    type="number"
                    id="{title.toLowerCase().replace(' ', '')}BpmInput"
                    min="40"
                    max="240"
                    bind:value={bpm}
                    class="input-field"
                />
                <button onclick={() => (bpm = Math.min(240, bpm + 5))}>+</button>
            </div>
        </div>
        <div class="input-group">
            <label for="{title.toLowerCase().replace(' ', '')}DurationInput" class="input-label">Duration (sec)</label>
            <div class="input-controls">
                <button onclick={() => (durationSeconds = Math.max(10, durationSeconds - 10))}>-</button>
                <input
                    type="number"
                    id="{title.toLowerCase().replace(' ', '')}DurationInput"
                    min="10"
                    max="300"
                    bind:value={durationSeconds}
                    class="input-field"
                />
                <button onclick={() => (durationSeconds = Math.min(300, durationSeconds + 10))}>+</button>
            </div>
        </div>
    </div>
</div>

<style>
    .phase-settings-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: calc(100% - 30px);
        padding: 15px;
        background-color: #444;
        border-radius: 15px;
    }
    .phase-title {
        font-size: 1.4em;
        font-weight: bold;
        color: #66bb6a;
        margin: 0;
        margin-bottom: 20px;
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
        color: #ccc;
        margin-bottom: 5px;
    }
    .input-controls {
        display: flex;
        background-color: #333;
        border: 1px solid #777;
        border-radius: 15px;
        overflow: hidden;
    }
    .input-controls button {
        font-size: 2em;
        background-color: #333;
        color: #ccc;
        width: 1em;
        border: none;
        outline: none;
    }
    .input-field {
        width: 2em;
        padding: 5px;
        text-align: center;
        font-size: 1.5em;
        font-weight: bold;
        background-color: #333;
        color: #66bb6a;
        outline: none;
        border: none;
        border-left: 1px solid #777;
        border-right: 1px solid #777;
        outline: none;
    }
    .input-field:focus {
        border-color: #66bb6a;
    }
</style>
