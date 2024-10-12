// soundManager.js

export class SoundManager {
    constructor() {
        this.sounds = {};
        this.loadSounds();
    }

    loadSounds() {
        // Define the sounds you want to preload
        const soundFiles = {
            pop: 'assets/sounds/pop.mp3',
            miss: 'assets/sounds/miss.mp3'
        };

        // Preload each sound
        for (const [key, src] of Object.entries(soundFiles)) {
            const audio = new Audio(src);
            audio.preload = 'auto';
            audio.volume = 0.5; // Adjust volume (0.0 to 1.0)
            this.sounds[key] = audio;
        }
    }

    playSound(name) {
        if (this.sounds[name]) {
            // Clone the audio to allow rapid successive plays
            const soundClone = this.sounds[name].cloneNode();
            soundClone.volume = this.sounds[name].volume; // Ensure volume is retained
            soundClone.play().catch(error => {
                console.error(`Error playing sound "${name}":`, error);
            });
        } else {
            console.warn(`Sound "${name}" does not exist.`);
        }
    }
}
