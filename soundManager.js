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

        // Preload each sound with specified volume levels
        for (const [key, src] of Object.entries(soundFiles)) {
            const audio = new Audio(src);
            audio.preload = 'auto';
            // Set default volume levels (0.0 to 1.0)
            if (key === 'pop') {
                audio.volume = 0.5; // 50% volume for pop sound
            } else if (key === 'miss') {
                audio.volume = 0.3; // 30% volume for miss sound
            }
            this.sounds[key] = audio;
        }
    }

    playSound(name) {
        if (this.sounds[name]) {
            // Clone the audio to allow rapid successive plays
            const soundClone = this.sounds[name].cloneNode();
            soundClone.play().catch(error => {
                console.error(`Error playing sound "${name}":`, error);
            });
        } else {
            console.warn(`Sound "${name}" does not exist.`);
        }
    }

    setVolume(name, volume) {
        if (this.sounds[name]) {
            this.sounds[name].volume = Math.min(Math.max(volume, 0), 1); // Clamp between 0 and 1
        } else {
            console.warn(`Sound "${name}" does not exist.`);
        }
    }
}
