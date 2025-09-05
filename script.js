class SitFitApp {
    constructor() {
        this.timers = new Map();
        this.statistics = {
            todayReminders: 0,
            todayCompleted: 0,
            streak: 0
        };
        
        this.reminderTypes = {
            posture: {
                title: 'Posture Check!',
                message: 'Time to check your posture and adjust your sitting position. Sit up straight!',
                icon: 'fas fa-chair'
            },
            stretch: {
                title: 'Stretch Break!',
                message: 'Stand up and do some stretches. Move your neck, shoulders, and back.',
                icon: 'fas fa-running'
            },
            water: {
                title: 'Hydration Time!',
                message: 'Drink a glass of water to stay hydrated and healthy.',
                icon: 'fas fa-tint'
            },
            walk: {
                title: 'Walk Break!',
                message: 'Take a 5-minute walk to get your blood flowing and refresh your mind.',
                icon: 'fas fa-walking'
            },
            eye: {
                title: 'Eye Rest!',
                message: 'Look away from your screen. Focus on something 20 feet away for 20 seconds.',
                icon: 'fas fa-eye'
            },
            breathing: {
                title: 'Breathing Exercise!',
                message: 'Take 10 deep breaths. Inhale for 4 seconds, hold for 4, exhale for 4.',
                icon: 'fas fa-wind'
            }
        };
        
        this.alarmSounds = {
            beep: this.generateBeepSound(),
            chime: this.generateChimeSound(),
            bell: this.generateBellSound(),
            nature: this.generateNatureSound(),
            gentle: this.generateGentleSound()
        };
        
        this.currentAlarm = null;
        this.wakeLock = null;
        
        this.initializeApp();
        this.loadFromStorage();
        this.requestPermissions();
    }

    initializeApp() {
        this.bindEvents();
        this.updateUI();
        this.startStatsInterval();
        this.registerServiceWorker();
        
        // Update connection status
        this.updateConnectionStatus();
        window.addEventListener('online', () => this.updateConnectionStatus());
        window.addEventListener('offline', () => this.updateConnectionStatus());
    }

    bindEvents() {
        // Quick actions
        document.getElementById('quickStart').addEventListener('click', () => this.quickStart());
        document.getElementById('pauseAll').addEventListener('click', () => this.pauseAllTimers());
        document.getElementById('stopAll').addEventListener('click', () => this.stopAllTimers());
        
        // Form events
        document.getElementById('reminderType').addEventListener('change', (e) => {
            const customMessage = document.getElementById('customMessage');
            if (e.target.value === 'custom') {
                customMessage.style.display = 'block';
            } else {
                customMessage.style.display = 'none';
            }
        });
        
        document.getElementById('repeatDaily').addEventListener('change', (e) => {
            const weekdaysSection = document.getElementById('weekdaysSection');
            if (e.target.checked) {
                weekdaysSection.style.display = 'block';
                // Auto-select weekdays
                document.querySelectorAll('.weekdays input[type="checkbox"]').forEach((checkbox, index) => {
                    if (index < 5) checkbox.checked = true; // Monday to Friday
                });
            } else {
                weekdaysSection.style.display = 'none';
            }
        });
        
        document.getElementById('alarmVolume').addEventListener('input', (e) => {
            document.getElementById('volumeDisplay').textContent = e.target.value + '%';
        });
        
        document.getElementById('createTimer').addEventListener('click', () => this.createTimer());
        
        // Alarm modal events
        document.getElementById('dismissAlarm').addEventListener('click', () => this.dismissAlarm());
        document.getElementById('snoozeAlarm').addEventListener('click', () => this.snoozeAlarm());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentAlarm) {
                this.dismissAlarm();
            }
        });
        
        // Prevent page unload during active alarms
        window.addEventListener('beforeunload', (e) => {
            if (this.timers.size > 0) {
                e.preventDefault();
                e.returnValue = 'You have active reminders. Are you sure you want to leave?';
            }
        });
        
        // Visibility change handling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.timers.size > 0) {
                this.acquireWakeLock();
            } else {
                this.releaseWakeLock();
            }
        });
    }

    async requestPermissions() {
        // Request notification permission
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                await Notification.requestPermission();
            }
        }
        
        // Request wake lock permission for mobile
        if ('wakeLock' in navigator) {
            try {
                await navigator.wakeLock.request('screen');
            } catch (err) {
                console.log('Wake Lock not supported:', err);
            }
        }
    }

    async acquireWakeLock() {
        if ('wakeLock' in navigator && !this.wakeLock) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake lock acquired');
            } catch (err) {
                console.log('Failed to acquire wake lock:', err);
            }
        }
    }

    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
            console.log('Wake lock released');
        }
    }

    generateBeepSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.5, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.sin(2 * Math.PI * 800 * i / audioContext.sampleRate) * 0.3;
        }
        
        return buffer;
    }

    generateChimeSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 1, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const decay = 1 - (i / data.length);
            data[i] = (Math.sin(2 * Math.PI * 523 * i / audioContext.sampleRate) + 
                      Math.sin(2 * Math.PI * 659 * i / audioContext.sampleRate) + 
                      Math.sin(2 * Math.PI * 784 * i / audioContext.sampleRate)) * decay * 0.2;
        }
        
        return buffer;
    }

    generateBellSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const decay = Math.exp(-3 * i / data.length);
            data[i] = Math.sin(2 * Math.PI * 440 * i / audioContext.sampleRate) * decay * 0.3;
        }
        
        return buffer;
    }

    generateNatureSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 3, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() - 0.5) * 0.1 * Math.sin(2 * Math.PI * 200 * i / audioContext.sampleRate);
        }
        
        return buffer;
    }

    generateGentleSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const envelope = Math.sin(Math.PI * i / data.length);
            data[i] = Math.sin(2 * Math.PI * 300 * i / audioContext.sampleRate) * envelope * 0.2;
        }
        
        return buffer;
    }

    updateConnectionStatus() {
        const statusEl = document.getElementById('connectionStatus');
        if (navigator.onLine) {
            statusEl.textContent = 'Online';
            statusEl.className = 'status online';
        } else {
            statusEl.textContent = 'Offline';
            statusEl.className = 'status offline';
        }
    }

    quickStart() {
        this.createTimerWithSettings({
            type: 'posture',
            hours: 0,
            minutes: 30,
            seconds: 0,
            repeat: false,
            sound: 'chime',
            volume: 70,
            vibrate: true
        });
    }

    createTimer() {
        const type = document.getElementById('reminderType').value;
        const hours = parseInt(document.getElementById('hours').value) || 0;
        const minutes = parseInt(document.getElementById('minutes').value) || 0;
        const seconds = parseInt(document.getElementById('seconds').value) || 0;
        const repeat = document.getElementById('repeatDaily').checked;
        const sound = document.getElementById('alarmSound').value;
        const volume = parseInt(document.getElementById('alarmVolume').value);
        const vibrate = document.getElementById('vibrate').checked;
        const customText = document.getElementById('customText').value;
        
        const selectedDays = Array.from(document.querySelectorAll('.weekdays input[type="checkbox"]:checked'))
            .map(cb => parseInt(cb.value));
        
        if (hours === 0 && minutes === 0 && seconds === 0) {
            this.showNotification('Please set a valid time duration', 'error');
            return;
        }
        
        const settings = {
            type,
            hours,
            minutes,
            seconds,
            repeat,
            sound,
            volume,
            vibrate,
            customText,
            selectedDays: repeat ? selectedDays : []
        };
        
        this.createTimerWithSettings(settings);
    }

    createTimerWithSettings(settings) {
        const totalSeconds = settings.hours * 3600 + settings.minutes * 60 + settings.seconds;
        const timerId = Date.now().toString();
        
        const timer = {
            id: timerId,
            type: settings.type,
            totalSeconds,
            remainingSeconds: totalSeconds,
            isActive: true,
            isPaused: false,
            repeat: settings.repeat,
            sound: settings.sound,
            volume: settings.volume,
            vibrate: settings.vibrate,
            customText: settings.customText,
            selectedDays: settings.selectedDays,
            createdAt: new Date(),
            interval: null
        };
        
        this.timers.set(timerId, timer);
        this.startTimer(timerId);
        this.updateUI();
        this.saveToStorage();
        this.updateStatistics('created');
        
        this.showNotification('Reminder created successfully!', 'success');
        this.resetForm();
    }

    startTimer(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer) return;
        
        timer.interval = setInterval(() => {
            if (!timer.isPaused) {
                timer.remainingSeconds--;
                
                if (timer.remainingSeconds <= 0) {
                    this.triggerAlarm(timerId);
                    return;
                }
                
                this.updateTimerDisplay(timerId);
            }
        }, 1000);
    }

    pauseTimer(timerId) {
        const timer = this.timers.get(timerId);
        if (timer) {
            timer.isPaused = !timer.isPaused;
            this.updateUI();
        }
    }

    stopTimer(timerId) {
        const timer = this.timers.get(timerId);
        if (timer) {
            clearInterval(timer.interval);
            this.timers.delete(timerId);
            this.updateUI();
            this.saveToStorage();
        }
    }

    pauseAllTimers() {
        this.timers.forEach(timer => {
            timer.isPaused = true;
        });
        this.updateUI();
        this.showNotification('All timers paused', 'info');
    }

    stopAllTimers() {
        this.timers.forEach(timer => {
            clearInterval(timer.interval);
        });
        this.timers.clear();
        this.updateUI();
        this.saveToStorage();
        this.showNotification('All timers stopped', 'info');
    }

    async triggerAlarm(timerId) {
        const timer = this.timers.get(timerId);
        if (!timer) return;
        
        this.currentAlarm = { timerId, startTime: Date.now() };
        
        // Stop the timer
        clearInterval(timer.interval);
        
        // Show alarm modal
        this.showAlarmModal(timer);
        
        // Play alarm sound
        this.playAlarmSound(timer.sound, timer.volume);
        
        // Vibrate if supported and enabled
        if (timer.vibrate && 'vibrate' in navigator) {
            const vibratePattern = [500, 200, 500, 200, 500];
            navigator.vibrate(vibratePattern);
            
            // Continue vibrating until dismissed
            this.vibrateInterval = setInterval(() => {
                if (this.currentAlarm) {
                    navigator.vibrate(vibratePattern);
                }
            }, 2000);
        }
        
        // Send push notification
        this.sendNotification(timer);
        
        // Keep screen on
        this.acquireWakeLock();
        
        // Update statistics
        this.updateStatistics('triggered');
        
        // Handle repeat logic
        if (timer.repeat && timer.selectedDays.length > 0) {
            const today = new Date().getDay();
            if (timer.selectedDays.includes(today)) {
                // Schedule for tomorrow if it's a selected day
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                if (timer.selectedDays.includes(tomorrow.getDay())) {
                    timer.remainingSeconds = timer.totalSeconds;
                    this.startTimer(timerId);
                }
            }
        }
        
        // Auto-dismiss after 5 minutes if not manually dismissed
        setTimeout(() => {
            if (this.currentAlarm && this.currentAlarm.timerId === timerId) {
                this.dismissAlarm();
            }
        }, 300000); // 5 minutes
    }

    showAlarmModal(timer) {
        const modal = document.getElementById('alarmModal');
        const title = document.getElementById('alarmTitle');
        const message = document.getElementById('alarmMessage');
        const duration = document.getElementById('alarmDuration');
        
        const reminderType = this.reminderTypes[timer.type];
        
        if (timer.type === 'custom' && timer.customText) {
            title.textContent = 'Custom Reminder!';
            message.textContent = timer.customText;
        } else if (reminderType) {
            title.textContent = reminderType.title;
            message.textContent = reminderType.message;
        }
        
        // Update alarm duration counter
        this.alarmDurationInterval = setInterval(() => {
            if (this.currentAlarm) {
                const elapsed = Math.floor((Date.now() - this.currentAlarm.startTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                duration.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    playAlarmSound(soundType, volume) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();
            
            source.buffer = this.alarmSounds[soundType];
            source.loop = true;
            gainNode.gain.value = volume / 100;
            
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            source.start();
            this.currentAlarmSource = source;
            
        } catch (error) {
            console.error('Error playing alarm sound:', error);
            // Fallback to system notification sound
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBThW3v71');
            audio.volume = volume / 100;
            audio.loop = true;
            audio.play();
            this.currentAlarmAudio = audio;
        }
    }

    stopAlarmSound() {
        if (this.currentAlarmSource) {
            this.currentAlarmSource.stop();
            this.currentAlarmSource = null;
        }
        
        if (this.currentAlarmAudio) {
            this.currentAlarmAudio.pause();
            this.currentAlarmAudio.currentTime = 0;
            this.currentAlarmAudio = null;
        }
        
        if (this.vibrateInterval) {
            clearInterval(this.vibrateInterval);
            this.vibrateInterval = null;
        }
        
        if ('vibrate' in navigator) {
            navigator.vibrate(0); // Stop vibration
        }
    }

    dismissAlarm() {
        if (!this.currentAlarm) return;
        
        const timerId = this.currentAlarm.timerId;
        
        // Stop alarm sounds and vibration
        this.stopAlarmSound();
        
        // Clear duration interval
        if (this.alarmDurationInterval) {
            clearInterval(this.alarmDurationInterval);
        }
        
        // Hide modal
        document.getElementById('alarmModal').style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Release wake lock
        this.releaseWakeLock();
        
        // Remove timer if not repeating
        const timer = this.timers.get(timerId);
        if (!timer || !timer.repeat) {
            this.timers.delete(timerId);
        }
        
        this.currentAlarm = null;
        this.updateUI();
        this.saveToStorage();
        this.updateStatistics('completed');
    }

    snoozeAlarm() {
        if (!this.currentAlarm) return;
        
        const timerId = this.currentAlarm.timerId;
        const timer = this.timers.get(timerId);
        
        if (timer) {
            // Stop current alarm
            this.stopAlarmSound();
            
            // Hide modal
            document.getElementById('alarmModal').style.display = 'none';
            document.body.style.overflow = 'auto';
            
            // Set 5-minute snooze
            timer.remainingSeconds = 300; // 5 minutes
            this.startTimer(timerId);
            
            this.currentAlarm = null;
            this.updateUI();
            this.showNotification('Snoozed for 5 minutes', 'info');
        }
    }

    sendNotification(timer) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const reminderType = this.reminderTypes[timer.type];
            const title = timer.type === 'custom' ? 'Custom Reminder!' : reminderType.title;
            const body = timer.type === 'custom' && timer.customText ? timer.customText : reminderType.message;
            
            const notification = new Notification(title, {
                body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: timer.id,
                requireInteraction: true,
                silent: false
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }

    updateTimerDisplay(timerId) {
        const timerElement = document.querySelector(`[data-timer-id="${timerId}"]`);
        if (!timerElement) return;
        
        const timer = this.timers.get(timerId);
        const countdownEl = timerElement.querySelector('.timer-countdown');
        
        if (timer && countdownEl) {
            const hours = Math.floor(timer.remainingSeconds / 3600);
            const minutes = Math.floor((timer.remainingSeconds % 3600) / 60);
            const seconds = timer.remainingSeconds % 60;
            
            countdownEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Update progress bar
            const progressBar = timerElement.querySelector('.timer-progress-bar');
            if (progressBar) {
                const progress = ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100;
                progressBar.style.width = `${progress}%`;
            }
        }
    }

    updateUI() {
        this.renderActiveTimers();
        this.renderStatistics();
    }

    renderActiveTimers() {
        const container = document.getElementById('activeTimersList');
        
        if (this.timers.size === 0) {
            container.innerHTML = `
                <div class="no-timers">
                    <i class="fas fa-clock"></i>
                    <p>No active reminders</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        this.timers.forEach((timer, id) => {
            const reminderType = this.reminderTypes[timer.type];
            const hours = Math.floor(timer.remainingSeconds / 3600);
            const minutes = Math.floor((timer.remainingSeconds % 3600) / 60);
            const seconds = timer.remainingSeconds % 60;
            
            const timerEl = document.createElement('div');
            timerEl.className = 'timer-item';
            timerEl.setAttribute('data-timer-id', id);
            
            timerEl.innerHTML = `
                <div class="timer-info">
                    <h3>${timer.type === 'custom' ? 'Custom Reminder' : reminderType.title}</h3>
                    <p>${timer.repeat ? 'Repeating • ' : ''}${timer.isPaused ? 'Paused' : 'Active'}</p>
                    <div class="timer-progress">
                        <div class="timer-progress-bar" style="width: ${((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100}%"></div>
                    </div>
                </div>
                <div class="timer-countdown">${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</div>
                <div class="timer-actions">
                    <button onclick="app.pauseTimer('${id}')" title="${timer.isPaused ? 'Resume' : 'Pause'}">
                        <i class="fas fa-${timer.isPaused ? 'play' : 'pause'}"></i>
                    </button>
                    <button onclick="app.stopTimer('${id}')" title="Stop">
                        <i class="fas fa-stop"></i>
                    </button>
                </div>
            `;
            
            container.appendChild(timerEl);
        });
    }

    renderStatistics() {
        document.getElementById('todayReminders').textContent = this.statistics.todayReminders;
        document.getElementById('todayCompleted').textContent = this.statistics.todayCompleted;
        document.getElementById('streak').textContent = this.statistics.streak;
    }

    updateStatistics(action) {
        switch (action) {
            case 'created':
                this.statistics.todayReminders++;
                break;
            case 'completed':
                this.statistics.todayCompleted++;
                break;
            case 'triggered':
                // Update streak logic here
                break;
        }
        
        this.saveToStorage();
        this.renderStatistics();
    }

    startStatsInterval() {
        // Update stats every minute
        setInterval(() => {
            this.renderStatistics();
        }, 60000);
    }

    resetForm() {
        document.getElementById('reminderType').value = 'posture';
        document.getElementById('hours').value = '0';
        document.getElementById('minutes').value = '30';
        document.getElementById('seconds').value = '0';
        document.getElementById('repeatDaily').checked = false;
        document.getElementById('customText').value = '';
        document.getElementById('weekdaysSection').style.display = 'none';
        document.getElementById('customMessage').style.display = 'none';
        
        // Uncheck all weekdays
        document.querySelectorAll('.weekdays input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
    }

    showNotification(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    saveToStorage() {
        const data = {
            timers: Array.from(this.timers.entries()).map(([id, timer]) => ({
                id,
                ...timer,
                interval: null // Don't save intervals
            })),
            statistics: this.statistics,
            lastSaved: Date.now()
        };
        
        localStorage.setItem('sitfit-data', JSON.stringify(data));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('sitfit-data');
        if (!stored) return;
        
        try {
            const data = JSON.parse(stored);
            
            // Load statistics
            if (data.statistics) {
                this.statistics = { ...this.statistics, ...data.statistics };
            }
            
            // Load and restart active timers
            if (data.timers && Array.isArray(data.timers)) {
                const now = Date.now();
                const timeSinceLastSave = now - (data.lastSaved || now);
                
                data.timers.forEach(timerData => {
                    const timer = { ...timerData };
                    
                    // Adjust remaining time based on time elapsed
                    timer.remainingSeconds -= Math.floor(timeSinceLastSave / 1000);
                    
                    if (timer.remainingSeconds > 0) {
                        this.timers.set(timer.id, timer);
                        this.startTimer(timer.id);
                    }
                });
            }
            
        } catch (error) {
            console.error('Error loading from storage:', error);
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SitFitApp();
});

// Add CSS for toast notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);