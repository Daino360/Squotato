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
        const userActions = document.getElementById('user-actions');
        const guestMessage = document.getElementById('guest-message');

        if (this.user) {
            // User is logged in - show user actions
            authButtons.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmail.textContent = this.user.email;
            userActions.style.display = 'block';
            guestMessage.style.display = 'none';
        } else {
            // User is logged out - show guest message
            authButtons.style.display = 'flex';
            userInfo.style.display = 'none';
            userActions.style.display = 'none';
            guestMessage.style.display = 'block';
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
            this.showLoginMessage('Inserisci email e password patatose!', 'error');
            return;
        }

        try {
            this.setLoginButtonsState(true);
            await auth.signInWithEmailAndPassword(email, password);
            this.showLoginMessage('Benvenuto nella Patata! 🥔', 'success');
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
            this.showLoginMessage('Inserisci email e password patatose!', 'error');
            return;
        }

        if (password.length < 6) {
            this.showLoginMessage('La password deve essere di almeno 6 caratteri patatosi!', 'error');
            return;
        }

        try {
            this.setLoginButtonsState(true);
            await auth.createUserWithEmailAndPassword(email, password);
            this.showLoginMessage('Sei ufficialmente una Patata! 🎉🥔', 'success');
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
            loginBtn.textContent = 'Sto diventando una Patata...';
            signupBtn.textContent = 'Sto creando una Patata...';
        } else {
            loginBtn.textContent = 'Entra nella Patata';
            signupBtn.textContent = 'Diventa una Patata Nuova';
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
                return 'Email non valida! Usa un\'email patatosa!';
            case 'auth/user-disabled':
                return 'Questa Patata è stata disabilitata! 🥔💀';
            case 'auth/user-not-found':
                return 'Patata non trovata! Devi diventare una Patata prima!';
            case 'auth/wrong-password':
                return 'Password sbagliata! Le Patate non approvano!';
            case 'auth/email-already-in-use':
                return 'Questa email è già una Patata!';
            case 'auth/weak-password':
                return 'Password troppo debole! Le Patate vogliono sicurezza!';
            case 'auth/operation-not-allowed':
                return 'Operazione non permessa! Le Patate si ribellano!';
            case 'auth/too-many-requests':
                return 'Troppi tentativi! Le Patate sono stanche! Riprova più tardi.';
            default:
                return 'Errore patatoso: ' + error.message;
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
        document.getElementById('quote-author').textContent = `— ${quote.author || 'Patata Sconosciuta'}`;
        document.getElementById('likes-count').textContent = `👍 ${quote.likes || 0} patate contente`;
        document.getElementById('dislikes-count').textContent = `👎 ${quote.dislikes || 0} patate tristi`;
    }

    displayDefaultQuote() {
        const defaultQuotes = [
            { text: "Sono una patata e sono orgogliosa di esserlo!", author: "Patata Felice", likes: 0, dislikes: 0 },
            { text: "Le patate fritte sono le mie cugine cool", author: "Patata Normale", likes: 0, dislikes: 0 },
            { text: "Se il mondo fosse fatto di patate, non ci sarebbero guerre... solo purè", author: "Patata Filosofa", likes: 0, dislikes: 0 }
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
            button.textContent = rating === 'like' ? '👍 Patata Approvata!' :