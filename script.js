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
        this.loadRandomQuote(); // Load quote immediately for guests
    }

    setupAuthListener() {
        auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user);
            this.user = user;
            this.updateAuthUI();
            
            if (user) {
                this.hideLoginModal();
            }
        });
    }

    updateAuthUI() {
        const authButtons = document.getElementById('auth-buttons');
        const userInfo = document.getElementById('user-info');
        const userEmail = document.getElementById('user-email');
        const addQuoteBtn = document.getElementById('add-quote');

        if (this.user) {
            // User is logged in
            authButtons.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmail.textContent = this.user.email;
            addQuoteBtn.style.display = 'block';
        } else {
            // User is logged out
            authButtons.style.display = 'flex';
            userInfo.style.display = 'none';
            addQuoteBtn.style.display = 'none';
        }
    }

    bindEvents() {
        // Auth events
        document.getElementById('show-login-btn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('signup-btn').addEventListener('click', () => this.signup());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('close-login').addEventListener('click', () => this.hideLoginModal());

        // Enter key for login inputs
        document.getElementById('login-email').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        document.getElementById('login-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });

        // Quote events
        document.getElementById('new-quote').addEventListener('click', () => this.loadRandomQuote());
        document.getElementById('like-btn').addEventListener('click', () => this.rateQuote('like'));
        document.getElementById('dislike-btn').addEventListener('click', () => this.rateQuote('dislike'));
        document.getElementById('add-quote').addEventListener('click', () => this.showAddQuoteModal());
        document.getElementById('submit-quote').addEventListener('click', () => this.submitCustomQuote());
        document.getElementById('cancel-quote').addEventListener('click', () => this.hideAddQuoteModal());
        document.getElementById('enable-notifications').addEventListener('click', () => this.requestNotificationPermission());

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideLoginModal();
                this.hideAddQuoteModal();
            }
        });
    }

    showLoginModal() {
        document.getElementById('login-modal').style.display = 'block';
        document.getElementById('login-email').focus();
    }

    hideLoginModal() {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-message').textContent = '';
        document.getElementById('login-message').className = 'login-message';
    }

    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const messageEl = document.getElementById('login-message');

        // Clear previous messages
        messageEl.textContent = '';
        messageEl.className = 'login-message';

        if (!email || !password) {
            this.showLoginMessage('Inserisci email e password', 'error');
            return;
        }

        try {
            this.setLoginButtonsState(true);
            await auth.signInWithEmailAndPassword(email, password);
            this.showLoginMessage('Accesso effettuato con successo!', 'success');
            // Modal will close automatically due to auth state change
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            this.setLoginButtonsState(false);
        }
    }

    async signup() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const messageEl = document.getElementById('login-message');

        // Clear previous messages
        messageEl.textContent = '';
        messageEl.className = 'login-message';

        if (!email || !password) {
            this.showLoginMessage('Inserisci email e password', 'error');
            return;
        }

        if (password.length < 6) {
            this.showLoginMessage('La password deve essere di almeno 6 caratteri', 'error');
            return;
        }

        try {
            this.setLoginButtonsState(true);
            await auth.createUserWithEmailAndPassword(email, password);
            this.showLoginMessage('Registrazione completata! Benvenuto!', 'success');
            // Modal will close automatically due to auth state change
        } catch (error) {
            console.error('Signup error:', error);
            this.showLoginMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            this.setLoginButtonsState(false);
        }
    }

    setLoginButtonsState(disabled) {
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        
        loginBtn.disabled = disabled;
        signupBtn.disabled = disabled;
        
        if (disabled) {
            loginBtn.textContent = 'Caricamento...';
            signupBtn.textContent = 'Caricamento...';
        } else {
            loginBtn.textContent = 'Accedi';
            signupBtn.textContent = 'Registrati';
        }
    }

    showLoginMessage(message, type) {
        const messageEl = document.getElementById('login-message');
        messageEl.textContent = message;
        messageEl.className = `login-message ${type}`;
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
            case 'auth/operation-not-allowed':
                return 'Operazione non permessa';
            case 'auth/too-many-requests':
                return 'Troppi tentativi. Riprova più tardi.';
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
                let weight = 10; // Base weight for all quotes
                weight += Math.max(0, likes * 2);
                weight -= Math.max(0, dislikes * 1);
                weight = Math.max(1, weight);
                
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

            this.currentQuote = selectedQuote || quotes[0];
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
            
            await quoteRef.update({
                [field]: firebase.firestore.FieldValue.increment(1)
            });

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
            this.showLoginModal();
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
            this.showLoginModal();
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
                document.getElementById('enable-notifications').textContent = 'Notifiche Attivate ✓';
                document.getElementById('enable-notifications').disabled = true;
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
            document.getElementById('enable-notifications').disabled = true;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuoteApp();
});