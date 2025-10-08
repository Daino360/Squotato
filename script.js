class QuoteApp {
    constructor() {
        this.currentQuote = null;
        this.user = null;
        this.userRatings = new Map();
        this.initializeApp();
    }

    initializeApp() {
        this.bindEvents();
        this.setupAuthListener();
        this.checkNotificationPermission();
        this.loadRandomQuote();
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

        messageEl.textContent = '';
        messageEl.className = 'login-message';

        if (!email || !password) {
            this.showLoginMessage('Inserisci email e password!', 'error');
            return;
        }

        try {
            this.setLoginButtonsState(true);
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
                
                let weight = 10;
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
            this.updateVoteButtons();

        } catch (error) {
            console.error('Error loading quote:', error);
            this.displayDefaultQuote();
        }
    }

    displayQuote(quote) {
        const quoteText = document.getElementById('quote-text');
        const quoteAuthor = document.getElementById('quote-author');
        const likesCount = document.getElementById('likes-count');
        const dislikesCount = document.getElementById('dislikes-count');

        if (quoteText) quoteText.textContent = `"${quote.text}"`;
        if (quoteAuthor) quoteAuthor.textContent = `— ${quote.author || 'Squotater Sconosciuto'}`;
        if (likesCount) likesCount.textContent = `👍 ${quote.likes || 0}`;
        if (dislikesCount) dislikesCount.textContent = `👎 ${quote.dislikes || 0}`;
    }

    displayDefaultQuote() {
        const defaultQuotes = [
            { text: "Sono una patata e sono orgogliosa di esserlo!", author: "Squotater Felice", likes: 0, dislikes: 0 },
            { text: "Le patate fritte sono le mie cugine cool", author: "Squotater Normale", likes: 0, dislikes: 0 },
            { text: "Se il mondo fosse fatto di patate, non ci sarebbero guerre... solo purè", author: "Squotater Filosofo", likes: 0, dislikes: 0 }
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

            ratingSnapshot.forEach(async (doc) => {
                await doc.ref.delete();
            });

            this.userRatings.delete(quoteId);
            console.log