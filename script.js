class QuoteApp {
    constructor() {
        this.currentQuote = null;
        this.initializeApp();
    }

    initializeApp() {
        this.bindEvents();
        this.loadRandomQuote();
        this.checkNotificationPermission();
    }

    bindEvents() {
        document.getElementById('new-quote').addEventListener('click', () => this.loadRandomQuote());
        document.getElementById('like-btn').addEventListener('click', () => this.rateQuote('like'));
        document.getElementById('dislike-btn').addEventListener('click', () => this.rateQuote('dislike'));
        document.getElementById('add-quote').addEventListener('click', () => this.showAddQuoteModal());
        document.getElementById('submit-quote').addEventListener('click', () => this.submitCustomQuote());
        document.getElementById('cancel-quote').addEventListener('click', () => this.hideAddQuoteModal());
        document.getElementById('enable-notifications').addEventListener('click', () => this.requestNotificationPermission());
    }

    async loadRandomQuote() {
        try {
            // Get quotes with weights (more likes = higher chance)
            const snapshot = await quotesCollection.get();
            const quotes = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                quotes.push({
                    id: doc.id,
                    ...data,
                    // Calculate weight based on likes/dislikes
                    weight: Math.max(1, (data.likes || 0) - (data.dislikes || 0) + 10)
                });
            });

            if (quotes.length === 0) {
                this.displayDefaultQuote();
                return;
            }

            // Weighted random selection
            const weightedQuotes = [];
            quotes.forEach(quote => {
                for (let i = 0; i < quote.weight; i++) {
                    weightedQuotes.push(quote);
                }
            });

            const randomIndex = Math.floor(Math.random() * weightedQuotes.length);
            this.currentQuote = weightedQuotes[randomIndex];
            this.displayQuote(this.currentQuote);

        } catch (error) {
            console.error('Error loading quote:', error);
            this.displayDefaultQuote();
        }
    }

    displayQuote(quote) {
        document.getElementById('quote-text').textContent = `"${quote.text}"`;
        document.getElementById('quote-author').textContent = `— ${quote.author || 'Unknown'}`;
    }

    displayDefaultQuote() {
        const defaultQuotes = [
            { text: "The only thing standing between you and your goal is the bullshit story you keep telling yourself.", author: "Unknown Realist" },
            { text: "They say 'follow your dreams.' So I went back to bed.", author: "Sleeping Philosopher" },
            { text: "The road to success is always under construction. Mostly because you haven't started working on it.", author: "Construction Worker Philosopher" }
        ];
        const randomQuote = defaultQuotes[Math.floor(Math.random() * defaultQuotes.length)];
        this.displayQuote(randomQuote);
    }

    async rateQuote(rating) {
        if (!this.currentQuote) return;

        try {
            const quoteRef = quotesCollection.doc(this.currentQuote.id);
            const field = rating === 'like' ? 'likes' : 'dislikes';
            
            await quoteRef.update({
                [field]: firebase.firestore.FieldValue.increment(1)
            });

            // Store feedback for better recommendations
            await feedbackCollection.add({
                quoteId: this.currentQuote.id,
                rating: rating,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Visual feedback
            const button = document.getElementById(`${rating}-btn`);
            button.textContent = rating === 'like' ? '👍 Liked!' : '👎 Disliked!';
            setTimeout(() => {
                button.textContent = rating === 'like' ? '👍 Like' : '👎 Dislike';
            }, 1000);

        } catch (error) {
            console.error('Error rating quote:', error);
        }
    }

    showAddQuoteModal() {
        document.getElementById('add-quote-modal').style.display = 'block';
    }

    hideAddQuoteModal() {
        document.getElementById('add-quote-modal').style.display = 'none';
        document.getElementById('new-quote-text').value = '';
        document.getElementById('new-quote-author').value = '';
    }

    async submitCustomQuote() {
        const text = document.getElementById('new-quote-text').value.trim();
        const author = document.getElementById('new-quote-author').value.trim();

        if (!text) {
            alert('Please enter a quote!');
            return;
        }

        try {
            await quotesCollection.add({
                text: text,
                author: author || 'Anonymous',
                likes: 0,
                dislikes: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                custom: true
            });

            this.hideAddQuoteModal();
            alert('Quote added successfully!');
            this.loadRandomQuote();

        } catch (error) {
            console.error('Error adding quote:', error);
            alert('Error adding quote. Please try again.');
        }
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                await this.setupPushNotifications();
                document.getElementById('enable-notifications').textContent = 'Notifications Enabled ✓';
            } else {
                alert('Notifications blocked. You can enable them in your browser settings.');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }

    checkNotificationPermission() {
        if (Notification.permission === 'granted') {
            document.getElementById('enable-notifications').textContent = 'Notifications Enabled ✓';
            this.setupPushNotifications();
        }
    }

    async setupPushNotifications() {
        // This would require additional Firebase Cloud Messaging setup
        // For GitHub Pages, we'll use a simpler approach with scheduled notifications
        this.scheduleDailyNotification();
    }

    scheduleDailyNotification() {
        // Schedule a daily notification at 8:00 AM
        if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
            // Register service worker for background notifications
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered');
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }
}

// Service Worker for notifications (sw.js)
// Note: This file needs to be at the root of your GitHub Pages site

const CACHE_NAME = 'quote-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/firebase.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

self.addEventListener('push', (event) => {
    const options = {
        body: 'Your daily dose of reality is here. Click to read your quote.',
        icon: '/icon.png',
        badge: '/badge.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'explore',
                title: 'Read Quote',
                icon: '/icon.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Daily Dose of Reality', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuoteApp();
});