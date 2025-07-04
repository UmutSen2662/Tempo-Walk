<script lang="ts">
    // Corrected $bindable() syntax directly in $props destructuring
    let { volume = $bindable() } = $props<{
        volume: number;
    }>();
</script>

<div class="volume-control">
    <label for="volumeSlider" class="volume-label">Volume</label>
    <input type="range" id="volumeSlider" min="0" max="100" bind:value={volume} step="10" class="volume-slider" />
</div>

<style>
    .volume-control {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        margin-bottom: 10px;
    }
    .volume-label {
        font-weight: bold;
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
</style>
