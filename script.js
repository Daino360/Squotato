class QuoteApp {
    constructor() {
        this.currentQuote = null;
        this.user = null;
        this.initializeApp();
    }

    initializeApp() {
        this.bindEvents();
        this.setupAuthListener();
        this.checkNotificationPermission();
    }

    setupAuthListener() {
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.user = user;
                this.showMainApp();
                this.loadRandomQuote();
            } else {
                this.user = null;
                this.showLoginSection();
            }
        });
    }

    showMainApp() {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
    }

    showLoginSection() {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('main-app').style.display = 'none';
    }

    bindEvents() {
        // Auth events
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('signup-btn').addEventListener('click', () => this.signup());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Quote events
        document.getElementById('new-quote').addEventListener('click', () => this.loadRandomQuote());
        document.getElementById('like-btn').addEventListener('click', () => this.rateQuote('like'));
        document.getElementById('dislike-btn').addEventListener('click', () => this.rateQuote('dislike'));
        document.getElementById('add-quote').addEventListener('click', () => this.showAddQuoteModal());
        document.getElementById('submit-quote').addEventListener('click', () => this.submitCustomQuote());
        document.getElementById('cancel-quote').addEventListener('click', () => this.hideAddQuoteModal());
        document.getElementById('enable-notifications').addEventListener('click', () => this.requestNotificationPermission());
    }

    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const messageEl = document.getElementById('login-message');

        try {
            await auth.signInWithEmailAndPassword(email, password);
            messageEl.textContent = 'Accesso effettuato!';
            messageEl.style.color = '#2ecc71';
        } catch (error) {
            messageEl.textContent = this.getAuthErrorMessage(error);
            messageEl.style.color = '#e74c3c';
        }
    }

    async signup() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const messageEl = document.getElementById('login-message');

        try {
            await auth.createUserWithEmailAndPassword(email, password);
            messageEl.textContent = 'Registrazione completata!';
            messageEl.style.color = '#2ecc71';
        } catch (error) {
            messageEl.textContent = this.getAuthErrorMessage(error);
            messageEl.style.color = '#e74c3c';
        }
    }

    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Email non valida';
            case 'auth/user-disabled':
                return 'Account disabilitato';
            case 'auth/user-not-found':
                return 'Utente non trovato';
            case 'auth/wrong-password':
                return 'Password errata';
            case 'auth/email-already-in-use':
                return 'Email già in uso';
            case 'auth/weak-password':
                return 'Password troppo debole';
            default:
                return 'Errore: ' + error.message;
        }
    }

    async logout() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }

    async loadRandomQuote() {
        try {
            const snapshot = await quotesCollection.get();
            const quotes = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const likes = data.likes || 0;
                const dislikes = data.dislikes || 0;
                
                // Improved probability calculation
                // Base weight + likes boost - dislikes penalty
                let weight = 10; // Base weight for all quotes
                weight += Math.max(0, likes * 2); // Each like adds 2 to weight
                weight -= Math.max(0, dislikes * 1); // Each dislike subtracts 1
                weight = Math.max(1, weight); // Minimum weight of 1
                
                quotes.push({
                    id: doc.id,
                    ...data,
                    weight: weight
                });
            });

            if (quotes.length === 0) {
                this.displayDefaultQuote();
                return;
            }

            // Weighted random selection
            const totalWeight = quotes.reduce((sum, quote) => sum + quote.weight, 0);
            let random = Math.random() * totalWeight;
            let selectedQuote = null;

            for (const quote of quotes) {
                random -= quote.weight;
                if (random <= 0) {
                    selectedQuote = quote;
                    break;
                }
            }

            // Fallback if no quote selected
            if (!selectedQuote) {
                selectedQuote = quotes[Math.floor(Math.random() * quotes.length)];
            }

            this.currentQuote = selectedQuote;
            this.displayQuote(this.currentQuote);

        } catch (error) {
            console.error('Error loading quote:', error);
            this.displayDefaultQuote();
        }
    }

    displayQuote(quote) {
        document.getElementById('quote-text').textContent = `"${quote.text}"`;
        document.getElementById('quote-author').textContent = `— ${quote.author || 'Sconosciuto'}`;
        document.getElementById('likes-count').textContent = `👍 ${quote.likes || 0}`;
        document.getElementById('dislikes-count').textContent = `👎 ${quote.dislikes || 0}`;
    }

    displayDefaultQuote() {
        const defaultQuotes = [
            { text: "L'unica cosa che si frappone tra te e il tuo obiettivo è la stronzata che continui a raccontarti.", author: "Realista Sconosciuto", likes: 0, dislikes: 0 },
            { text: "Dicono 'segui i tuoi sogni'. Quindi sono tornato a letto.", author: "Filosofo Dormiente", likes: 0, dislikes: 0 },
            { text: "La strada per il successo è sempre in costruzione. Principalmente perché non hai ancora iniziato a lavorarci.", author: "Filosofo Edile", likes: 0, dislikes: 0 }
        ];
        const randomQuote = defaultQuotes[Math.floor(Math.random() * defaultQuotes.length)];
        this.displayQuote(randomQuote);
    }

    async rateQuote(rating) {
        if (!this.currentQuote) return;

        try {
            const quoteRef = quotesCollection.doc(this.currentQuote.id);
            const field = rating === 'like' ? 'likes' : 'dislikes';
            const oppositeField = rating === 'like' ? 'dislikes' : 'likes';
            
            // Update the quote's likes/dislikes
            await quoteRef.update({
                [field]: firebase.firestore.FieldValue.increment(1)
            });

            // Store user feedback for personalization
            if (this.user) {
                await feedbackCollection.add({
                    userId: this.user.uid,
                    quoteId: this.currentQuote.id,
                    rating: rating,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // Update current quote data and display
            this.currentQuote[field] = (this.currentQuote[field] || 0) + 1;
            this.displayQuote(this.currentQuote);

            // Visual feedback
            const button = document.getElementById(`${rating}-btn`);
            const originalText = button.textContent;
            button.textContent = rating === 'like' ? '👍 Piaciuto!' : '👎 Non Piaciuto!';
            button.disabled = true;
            
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 1000);

        } catch (error) {
            console.error('Error rating quote:', error);
        }
    }

    showAddQuoteModal() {
        if (!this.user) {
            alert('Devi accedere per aggiungere citazioni!');
            return;
        }
        document.getElementById('add-quote-modal').style.display = 'block';
    }

    hideAddQuoteModal() {
        document.getElementById('add-quote-modal').style.display = 'none';
        document.getElementById('new-quote-text').value = '';
        document.getElementById('new-quote-author').value = '';
    }

    async submitCustomQuote() {
        if (!this.user) {
            alert('Devi accedere per aggiungere citazioni!');
            return;
        }

        const text = document.getElementById('new-quote-text').value.trim();
        const author = document.getElementById('new-quote-author').value.trim();

        if (!text) {
            alert('Per favore inserisci una citazione!');
            return;
        }

        try {
            await quotesCollection.add({
                text: text,
                author: author || 'Anonimo',
                likes: 0,
                dislikes: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: this.user.uid,
                custom: true
            });

            this.hideAddQuoteModal();
            alert('Citazione aggiunta con successo!');
            this.loadRandomQuote();

        } catch (error) {
            console.error('Error adding quote:', error);
            alert('Errore nell\'aggiungere la citazione. Riprova.');
        }
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                await this.setupPushNotifications();
                document.getElementById('enable-notifications').textContent = 'Notifiche Attivate ✓';
            } else {
                alert('Notifiche bloccate. Puoi abilitarle nelle impostazioni del browser.');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }

    checkNotificationPermission() {
        if (Notification.permission === 'granted') {
            document.getElementById('enable-notifications').textContent = 'Notifiche Attivate ✓';
            this.setupPushNotifications();
        }
    }

    async setupPushNotifications() {
        this.scheduleDailyNotification();
    }

    scheduleDailyNotification() {
        if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
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

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuoteApp();
});