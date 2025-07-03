<script lang="ts">
    // Define the props, which now include the callback function
    let { title, initialBpm, initialDurationMinutes, onChangeSettings } = $props<{
        title: string;
        initialBpm: number;
        initialDurationMinutes: number; // This prop still comes as minutes from parent, but we'll use it as seconds directly
        onChangeSettings: (detail: { title: string; bpm: number; durationSeconds: number }) => void; // Changed detail type to durationSeconds
    }>();

    // Use $state to make these values internal to the component.
    // They are initialized from props once.
    let bpm = $state(initialBpm);
    // Initialize duration directly as seconds, assuming initialDurationMinutes is now initialDurationSeconds
    let durationSeconds = $state(initialDurationMinutes); // Renamed for clarity, but still takes the value from initialDurationMinutes prop

    // Function to call the parent's callback
    function handleChange() {
        onChangeSettings({
            title: title,
            bpm: bpm,
            durationSeconds: durationSeconds, // Pass duration as seconds
        });
    }

    // This $state effect is removed as it was causing issues with input resetting.
    // The internal 'bpm' and 'durationSeconds' are now solely updated by 'bind:value'
    // and passed up via 'onChangeSettings'. When the parent updates its state
    // and passes new 'initialBpm'/'initialDurationMinutes' props, the child's
    // '$state(initialValue)' initialization will handle the update correctly.
</script>

<div class="phase-settings-card">
    <h2 class="phase-title">{title}</h2>
    <div class="phase-inputs">
        <div class="input-group">
            <label for="{title.toLowerCase().replace(' ', '')}BpmInput" class="input-label">BPM</label>
            <input
                type="number"
                id="{title.toLowerCase().replace(' ', '')}BpmInput"
                min="40"
                max="240"
                bind:value={bpm}
                oninput={handleChange}
                class="input-field"
            />
        </div>
        <div class="input-group">
            <label for="{title.toLowerCase().replace(' ', '')}DurationInput" class="input-label">Duration (sec)</label>
            <!-- Changed label to (sec) -->
            <input
                type="number"
                id="{title.toLowerCase().replace(' ', '')}DurationInput"
                min="10"
                max="900"
                bind:value={durationSeconds}
                oninput={handleChange}
                class="input-field"
            />
        </div>
    </div>
</div>

<style>
    .phase-settings-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        margin-bottom: 20px;
        padding: 15px;
        background-color: #555;
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
</style>
