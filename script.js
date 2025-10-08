class QuoteApp {
    constructor() {
        this.currentQuote = null;
        this.user = null;
        this.userRatings = new Map();
        this.initializeApp();
    }

    initializeApp() {
        // Check if Firebase is properly initialized
        if (typeof auth === 'undefined') {
            console.error('Firebase auth is not defined. Check your firebase.js file.');
            this.showError('Errore di configurazione. Ricarica la pagina.');
            return;
        }

        if (typeof quotesCollection === 'undefined') {
            console.error('Firestore is not defined. Check your firebase.js file.');
            this.showError('Errore di database. Ricarica la pagina.');
            return;
        }

        this.bindEvents();
        this.setupAuthListener();
        this.checkNotificationPermission();
        this.loadRandomQuote();
    }

    showError(message) {
        // Create error message display
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #FF4444;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            border: 3px solid #8B0000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: 'Comic Neue', cursive;
            font-weight: bold;
            text-align: center;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            console.log('Auth state changed:', user);
            this.user = user;
            
            if (user) {
                await this.loadUserRatings();
                this.hideLoginModal();
            } else {
                this.userRatings.clear();
            }
            
            this.updateAuthUI();
        });
    }

    async loadUserRatings() {
        if (!this.user) return;
        
        try {
            const snapshot = await feedbackCollection
                .where('userId', '==', this.user.uid)
                .get();
            
            this.userRatings.clear();
            snapshot.forEach(doc => {
                const data = doc.data();
                this.userRatings.set(data.quoteId, data.rating);
            });
            
            console.log('Loaded user ratings:', this.userRatings);
        } catch (error) {
            console.error('Error loading user ratings:', error);
            this.showError('Errore nel caricamento dei voti');
        }
    }

    updateAuthUI() {
        const authButtons = document.getElementById('auth-buttons');
        const userInfo = document.getElementById('user-info');
        const guestLayout = document.getElementById('guest-layout');
        const userLayout = document.getElementById('user-layout');

        if (this.user) {
            authButtons.style.display = 'none';
            userInfo.style.display = 'flex';
            guestLayout.style.display = 'none';
            userLayout.style.display = 'block';
            this.updateVoteButtons();
        } else {
            authButtons.style.display = 'flex';
            userInfo.style.display = 'none';
            guestLayout.style.display = 'block';
            userLayout.style.display = 'none';
        }
    }

    updateVoteButtons() {
        if (!this.currentQuote || !this.user) return;
        
        const likeBtn = document.getElementById('like-btn');
        const dislikeBtn = document.getElementById('dislike-btn');
        const userRating = this.userRatings.get(this.currentQuote.id);
        
        // Reset buttons
        likeBtn.classList.remove('active');
        dislikeBtn.classList.remove('active');
        
        // Set active state
        if (userRating === 'like') {
            likeBtn.classList.add('active');
        } else if (userRating === 'dislike') {
            dislikeBtn.classList.add('active');
        }
    }

    bindEvents() {
        console.log('Binding events...');

        // Auth events
        document.getElementById('show-login-btn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('signup-btn').addEventListener('click', () => this.signup());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('close-login').addEventListener('click', () => this.hideLoginModal());

        // Quote events
        document.getElementById('new-quote').addEventListener('click', () => this.loadRandomQuote());
        document.getElementById('guest-new-quote').addEventListener('click', () => this.loadRandomQuote());
        document.getElementById('like-btn').addEventListener('click', () => this.toggleVote('like'));
        document.getElementById('dislike-btn').addEventListener('click', () => this.toggleVote('dislike'));
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

        console.log('All events bound successfully');
    }

    showLoginModal() {
        document.getElementById('login-modal').style.display = 'block';
        document.getElementById('login-email').focus();
    }

    hideLoginModal() {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        const messageEl = document.getElementById('login-message');
        if (messageEl) {
            messageEl.textContent = '';
            messageEl.className = 'login-message';
        }
    }

    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const messageEl = document.getElementById('login-message');

        if (!messageEl) {
            console.error('Login message element not found');
            return;
        }

        messageEl.textContent = '';
        messageEl.className = 'login-message';

        if (!email || !password) {
            this.showLoginMessage('Inserisci email e password!', 'error');
            return;
        }

        try {
            this.setLoginButtonsState(true);
            console.log('Attempting login with:', email);
            await auth.signInWithEmailAndPassword(email, password);
            this.showLoginMessage('Benvenuto in Squotato! 🥔', 'success');
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

        if (!messageEl) {
            console.error('Login message element not found');
            return;
        }

        messageEl.textContent = '';
        messageEl.className = 'login-message';

        if (!email || !password) {
            this.showLoginMessage('Inserisci email e password!', 'error');
            return;
        }

        if (password.length < 6) {
            this.showLoginMessage('La password deve essere di almeno 6 caratteri!', 'error');
            return;
        }

        try {
            this.setLoginButtonsState(true);
            console.log('Attempting signup with:', email);
            await auth.createUserWithEmailAndPassword(email, password);
            this.showLoginMessage('Sei ora un vero Squotater! 🎉', 'success');
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
        
        if (loginBtn && signupBtn) {
            loginBtn.disabled = disabled;
            signupBtn.disabled = disabled;
            
            if (disabled) {
                loginBtn.textContent = 'Accesso...';
                signupBtn.textContent = 'Registrazione...';
            } else {
                loginBtn.textContent = '🎪 Entra in Squotato';
                signupBtn.textContent = '🌟 Diventa Squotater';
            }
        }
    }

    showLoginMessage(message, type) {
        const messageEl = document.getElementById('login-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `login-message ${type}`;
        }
    }

    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Email non valida!';
            case 'auth/user-not-found':
                return 'Squotater non trovato!';
            case 'auth/wrong-password':
                return 'Password errata!';
            case 'auth/email-already-in-use':
                return 'Email già registrata!';
            case 'auth/weak-password':
                return 'Password troppo debole!';
            case 'auth/network-request-failed':
                return 'Errore di connessione! Controlla internet.';
            default:
                return 'Errore: ' + error.message;
        }
    }

    async logout() {
        try {
            console.log('Logging out...');
            await auth.signOut();
        } catch (error) {
            console.error('Error logging out:', error);
            this.showError('Errore durante il logout');
        }
    }

    async loadRandomQuote() {
        console.log('Loading random quote from Firestore...');
        
        try {
            // Get all quotes from Firestore
            const snapshot = await quotesCollection.get();
            console.log('Firestore snapshot:', snapshot);
            
            const quotes = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log('Quote data:', data);
                
                const likes = data.likes || 0;
                const dislikes = data.dislikes || 0;
                
                // Improved probability calculation
                let weight = 10; // Base weight for all quotes
                weight += Math.max(0, likes * 2);
                weight -= Math.max(0, dislikes * 1);
                weight = Math.max(1, weight);
                
                quotes.push({
                    id: doc.id,
                    text: data.text,
                    author: data.author,
                    likes: likes,
                    dislikes: dislikes,
                    weight: weight
                });
            });

            console.log(`Found ${quotes.length} quotes in database`);

            if (quotes.length === 0) {
                console.log('No quotes found in database, displaying default');
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
            console.log('Selected quote:', this.currentQuote);
            this.displayQuote(this.currentQuote);
            this.updateVoteButtons();

        } catch (error) {
            console.error('Error loading quotes from Firestore:', error);
            this.showError('Errore nel caricamento delle Squotes');
            this.displayDefaultQuote();
        }
    }

    displayQuote(quote) {
        console.log('Displaying quote:', quote);
        
        const quoteText = document.getElementById('quote-text');
        const quoteAuthor = document.getElementById('quote-author');
        const likesCount = document.getElementById('likes-count');
        const dislikesCount = document.getElementById('dislikes-count');

        if (quoteText) {
            quoteText.textContent = `"${quote.text}"`;
        } else {
            console.error('quote-text element not found');
        }

        if (quoteAuthor) {
            quoteAuthor.textContent = `— ${quote.author || 'Squotater Sconosciuto'}`;
        }

        if (likesCount) {
            likesCount.textContent = `👍 ${quote.likes || 0}`;
        }

        if (dislikesCount) {
            dislikesCount.textContent = `👎 ${quote.dislikes || 0}`;
        }
    }

    displayDefaultQuote() {
        console.log('Displaying default quote (no quotes in database)');
        const defaultQuotes = [
            { text: "Benvenuto in Squotato! Le citazioni dal database non sono ancora caricate.", author: "Squotater Sistema", likes: 0, dislikes: 0 },
            { text: "Le patate del database si stanno ancora sbucciando... Ricarica tra poco!", author: "Patata Tecnica", likes: 0, dislikes: 0 },
            { text: "Ops! Nessuna Squote trovata. Qualcuno ha mangiato tutte le patate?", author: "Squotater Affamato", likes: 0, dislikes: 0 }
        ];
        const randomQuote = defaultQuotes[Math.floor(Math.random() * defaultQuotes.length)];
        this.displayQuote(randomQuote);
    }

    async toggleVote(rating) {
        if (!this.currentQuote || !this.user) {
            this.showLoginModal();
            return;
        }

        const quoteId = this.currentQuote.id;
        const currentRating = this.userRatings.get(quoteId);
        
        // If clicking the same rating, remove it
        if (currentRating === rating) {
            await this.removeVote(quoteId, rating);
        } else {
            // If switching from one rating to another, update it
            if (currentRating) {
                await this.removeVote(quoteId, currentRating);
            }
            await this.addVote(quoteId, rating);
        }
        
        // Reload the quote to get updated counts
        this.loadRandomQuote();
    }

    async addVote(quoteId, rating) {
        try {
            const quoteRef = quotesCollection.doc(quoteId);
            const field = rating === 'like' ? 'likes' : 'dislikes';
            
            await quoteRef.update({
                [field]: firebase.firestore.FieldValue.increment(1)
            });

            await feedbackCollection.add({
                userId: this.user.uid,
                quoteId: quoteId,
                rating: rating,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.userRatings.set(quoteId, rating);
            console.log(`Added ${rating} to quote ${quoteId}`);

        } catch (error) {
            console.error('Error adding vote:', error);
            this.showError('Errore nel votare la Squote');
        }
    }

    async removeVote(quoteId, rating) {
        try {
            const quoteRef = quotesCollection.doc(quoteId);
            const field = rating === 'like' ? 'likes' : 'dislikes';
            
            await quoteRef.update({
                [field]: firebase.firestore.FieldValue.increment(-1)
            });

            const ratingSnapshot = await feedbackCollection
                .where('userId', '==', this.user.uid)
                .where('quoteId', '==', quoteId)
                .where('rating', '==', rating)
                .get();

            const deletePromises = [];
            ratingSnapshot.forEach(doc => {
                deletePromises.push(doc.ref.delete());
            });
            
            await Promise.all(deletePromises);

            this.userRatings.delete(quoteId);
            console.log(`Removed ${rating} from quote ${quoteId}`);

        } catch (error) {
            console.error('Error removing vote:', error);
            this.showError('Errore nel rimuovere il voto');
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
            alert('Per favore inserisci una Squote!');
            return;
        }

        try {
            await quotesCollection.add({
                text: text,
                author: author || 'Squotater Anonimo',
                likes: 0,
                dislikes: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: this.user.uid,
                custom: true
            });

            this.hideAddQuoteModal();
            alert('Squote aggiunta con successo! 🎉');
            this.loadRandomQuote();

        } catch (error) {
            console.error('Error adding quote:', error);
            alert('Errore nell\'aggiungere la Squote. Riprova.');
        }
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                const notificationBtn = document.getElementById('enable-notifications');
                if (notificationBtn) {
                    notificationBtn.textContent = '🔔 Notifiche Attivate!';
                    notificationBtn.disabled = true;
                }
            } else {
                alert('Notifiche bloccate. Puoi abilitarle nelle impostazioni del browser.');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }

    checkNotificationPermission() {
        if (Notification.permission === 'granted') {
            const notificationBtn = document.getElementById('enable-notifications');
            if (notificationBtn) {
                notificationBtn.textContent = '🔔 Notifiche Attivate!';
                notificationBtn.disabled = true;
            }
        }
    }
}

// Add global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Squotato app...');
    new QuoteApp();
});