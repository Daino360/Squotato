class QuoteApp {
    constructor() {
        this.currentQuote = null;
        this.user = null;
        this.userData = null;
        this.userRatings = new Map();
        this.quoteImages = ['🥔', '🍟', '🥑', '🌮', '🍕', '🌭', '🍔', '🥨', '🥞', '🧇', '🍗', '🥓', '🥚', '🧀', '🥐', '🥖', '🥨', '🧈', '🍠', '🥕'];
        this.initializeApp();
    }

    initializeApp() {
        console.log('🚀 Starting Squotato app...');
        
        // Check if Firebase is properly loaded
        if (typeof firebase === 'undefined') {
            this.showError('Firebase non caricato. Controlla la connessione internet.');
            return;
        }

        if (!window.auth || !window.quotesCollection) {
            this.showError('Firebase non inizializzato correttamente. Ricarica la pagina.');
            return;
        }

        this.bindEvents();
        this.setupAuthListener();
        this.loadRandomQuote();
        
        console.log('✅ App initialized successfully');
    }

    showError(message) {
        const existingError = document.querySelector('.global-error');
        if (existingError) existingError.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'global-error';
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
            max-width: 90%;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    setupAuthListener() {
        auth.onAuthStateChanged(async (user) => {
            console.log('👤 Auth state changed:', user ? user.email : 'No user');
            this.user = user;
            
            if (user) {
                try {
                    await this.loadUserData();
                    await this.loadUserRatings();
                    this.hideAuthModal();
                    console.log('✅ User fully loaded');
                } catch (error) {
                    console.error('❌ Error loading user data:', error);
                    this.showError('Errore nel caricamento del profilo');
                }
            } else {
                this.userData = null;
                this.userRatings.clear();
                console.log('✅ User logged out');
            }
            
            this.updateAuthUI();
        });
    }

    async loadUserData() {
        if (!this.user) return;
        
        try {
            console.log('📋 Loading user data for:', this.user.uid);
            const userDoc = await db.collection('users').doc(this.user.uid).get();
            
            if (userDoc.exists) {
                this.userData = userDoc.data();
                console.log('✅ Loaded user data:', this.userData);
            } else {
                // Create user data if it doesn't exist
                const username = document.getElementById('auth-username')?.value.trim() || 'Squotater';
                this.userData = {
                    username: username,
                    email: this.user.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                await db.collection('users').doc(this.user.uid).set(this.userData);
                console.log('✅ Created new user data:', this.userData);
            }
        } catch (error) {
            console.error('❌ Error loading user data:', error);
            // Create a fallback user data
            this.userData = {
                username: 'Squotater',
                email: this.user.email,
                createdAt: new Date()
            };
        }
    }

    async loadUserRatings() {
        if (!this.user) return;
        
        try {
            console.log('📊 Loading user ratings for:', this.user.uid);
            const snapshot = await feedbackCollection
                .where('userId', '==', this.user.uid)
                .get();
            
            this.userRatings.clear();
            snapshot.forEach(doc => {
                const data = doc.data();
                this.userRatings.set(data.quoteId, data.rating);
            });
            
            console.log('✅ Loaded user ratings:', this.userRatings.size);
        } catch (error) {
            console.error('❌ Error loading user ratings:', error);
            this.userRatings.clear();
        }
    }

    updateAuthUI() {
        const authButtons = document.getElementById('auth-buttons');
        const userInfo = document.getElementById('user-info');
        const userUsername = document.getElementById('user-username');
        const welcomeUsername = document.getElementById('welcome-username');
        const guestLayout = document.getElementById('guest-layout');
        const userLayout = document.getElementById('user-layout');

        if (!authButtons || !userInfo || !guestLayout || !userLayout) {
            console.error('❌ UI elements not found');
            return;
        }

        if (this.user && this.userData) {
            authButtons.style.display = 'none';
            userInfo.style.display = 'flex';
            if (userUsername) userUsername.textContent = this.userData.username;
            if (welcomeUsername) welcomeUsername.textContent = this.userData.username;
            guestLayout.style.display = 'none';
            userLayout.style.display = 'block';
            this.updateVoteButtons();
            console.log('✅ UI updated: User layout');
        } else {
            authButtons.style.display = 'flex';
            userInfo.style.display = 'none';
            guestLayout.style.display = 'block';
            userLayout.style.display = 'none';
            console.log('✅ UI updated: Guest layout');
        }
    }

    updateVoteButtons() {
        if (!this.currentQuote || !this.user) return;
        
        const likeBtn = document.getElementById('like-btn');
        const dislikeBtn = document.getElementById('dislike-btn');
        
        if (!likeBtn || !dislikeBtn) {
            console.error('❌ Vote buttons not found');
            return;
        }
        
        const userRating = this.userRatings.get(this.currentQuote.id);
        
        likeBtn.classList.remove('active');
        dislikeBtn.classList.remove('active');
        
        if (userRating === 'like') {
            likeBtn.classList.add('active');
            console.log('✅ Like button active');
        } else if (userRating === 'dislike') {
            dislikeBtn.classList.add('active');
            console.log('✅ Dislike button active');
        }
    }

    bindEvents() {
        console.log('🔗 Binding events...');

        try {
            // Auth events
            const showLoginBtn = document.getElementById('show-login-btn');
            const registerBtn = document.getElementById('register-btn');
            const loginBtn = document.getElementById('login-btn');
            const logoutBtn = document.getElementById('logout-btn');
            const closeAuthBtn = document.getElementById('close-auth');

            if (showLoginBtn) showLoginBtn.addEventListener('click', () => this.showAuthModal());
            if (registerBtn) registerBtn.addEventListener('click', () => this.register());
            if (loginBtn) loginBtn.addEventListener('click', () => this.login());
            if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
            if (closeAuthBtn) closeAuthBtn.addEventListener('click', () => this.hideAuthModal());

            // Quote events
            const newQuoteBtn = document.getElementById('new-quote');
            const guestNewQuoteBtn = document.getElementById('guest-new-quote');
            const likeBtn = document.getElementById('like-btn');
            const dislikeBtn = document.getElementById('dislike-btn');
            const addQuoteBtn = document.getElementById('add-quote');
            const submitQuoteBtn = document.getElementById('submit-quote');
            const cancelQuoteBtn = document.getElementById('cancel-quote');
            const enableNotificationsBtn = document.getElementById('enable-notifications');

            if (newQuoteBtn) newQuoteBtn.addEventListener('click', () => this.loadRandomQuote());
            if (guestNewQuoteBtn) guestNewQuoteBtn.addEventListener('click', () => this.loadRandomQuote());
            if (likeBtn) likeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleVote('like');
            });
            if (dislikeBtn) dislikeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleVote('dislike');
            });
            if (addQuoteBtn) addQuoteBtn.addEventListener('click', () => this.showAddQuoteModal());
            if (submitQuoteBtn) submitQuoteBtn.addEventListener('click', () => this.submitCustomQuote());
            if (cancelQuoteBtn) cancelQuoteBtn.addEventListener('click', () => this.hideAddQuoteModal());
            if (enableNotificationsBtn) enableNotificationsBtn.addEventListener('click', () => this.requestNotificationPermission());

            // Close modals when clicking outside
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    this.hideAuthModal();
                    this.hideAddQuoteModal();
                }
            });

            console.log('✅ All events bound successfully');
        } catch (error) {
            console.error('❌ Error binding events:', error);
            this.showError('Errore nell\'inizializzazione della pagina');
        }
    }

    showAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'block';
            const usernameInput = document.getElementById('auth-username');
            if (usernameInput) usernameInput.focus();
        } else {
            console.error('❌ Auth modal not found');
        }
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        const usernameInput = document.getElementById('auth-username');
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        const messageEl = document.getElementById('auth-message');
        
        if (usernameInput) usernameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (messageEl) {
            messageEl.textContent = '';
            messageEl.className = 'auth-message';
        }
    }

    async register() {
        const usernameInput = document.getElementById('auth-username');
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        const messageEl = document.getElementById('auth-message');

        if (!usernameInput || !emailInput || !passwordInput || !messageEl) {
            this.showError('Errore interno. Ricarica la pagina.');
            return;
        }

        const username = usernameInput.value.trim();
        const email = emailInput.value;
        const password = passwordInput.value;

        messageEl.textContent = '';
        messageEl.className = 'auth-message';

        if (!username || !email || !password) {
            this.showAuthMessage('Inserisci username, email e password!', 'error');
            return;
        }

        if (username.length < 2) {
            this.showAuthMessage('L\'username deve essere di almeno 2 caratteri!', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAuthMessage('La password deve essere di almeno 6 caratteri!', 'error');
            return;
        }

        try {
            this.setAuthButtonsState(true);
            console.log('👤 Attempting registration...');
            
            // Create user in Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            console.log('✅ User created in Auth:', userCredential.user.uid);
            
            // Create user data in Firestore
            const userData = {
                username: username,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('users').doc(userCredential.user.uid).set(userData);
            console.log('✅ User data saved to Firestore');
            
            this.showAuthMessage('Registrazione completata! Benvenuto Squotater! 🎉', 'success');
            
        } catch (error) {
            console.error('❌ Registration error:', error);
            this.showAuthMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            this.setAuthButtonsState(false);
        }
    }

    async login() {
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        const messageEl = document.getElementById('auth-message');

        if (!emailInput || !passwordInput || !messageEl) {
            this.showError('Errore interno. Ricarica la pagina.');
            return;
        }

        const email = emailInput.value;
        const password = passwordInput.value;

        messageEl.textContent = '';
        messageEl.className = 'auth-message';

        if (!email || !password) {
            this.showAuthMessage('Inserisci email e password!', 'error');
            return;
        }

        try {
            this.setAuthButtonsState(true);
            console.log('🔐 Attempting login...');
            await auth.signInWithEmailAndPassword(email, password);
            this.showAuthMessage('Bentornato in Squotato! 🥔', 'success');
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showAuthMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            this.setAuthButtonsState(false);
        }
    }

    setAuthButtonsState(disabled) {
        const registerBtn = document.getElementById('register-btn');
        const loginBtn = document.getElementById('login-btn');
        
        if (registerBtn && loginBtn) {
            registerBtn.disabled = disabled;
            loginBtn.disabled = disabled;
            
            if (disabled) {
                registerBtn.textContent = 'Registrazione...';
                loginBtn.textContent = 'Accesso...';
            } else {
                registerBtn.textContent = '🌟 Registrati come Squotater';
                loginBtn.textContent = '🎪 Accedi al tuo account';
            }
        }
    }

    showAuthMessage(message, type) {
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `auth-message ${type}`;
        }
    }

    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Email non valida!';
            case 'auth/user-not-found':
                return 'Utente non trovato!';
            case 'auth/wrong-password':
                return 'Password errata!';
            case 'auth/email-already-in-use':
                return 'Email già registrata!';
            case 'auth/weak-password':
                return 'Password troppo debole!';
            case 'auth/network-request-failed':
                return 'Errore di connessione!';
            case 'auth/operation-not-allowed':
                return 'Registrazione non abilitata! Contatta l\'amministratore.';
            default:
                return 'Errore: ' + error.message;
        }
    }

    async logout() {
        try {
            console.log('🚪 Logging out...');
            await auth.signOut();
            console.log('✅ Logout successful');
        } catch (error) {
            console.error('❌ Error logging out:', error);
            this.showError('Errore durante il logout');
        }
    }

    async loadRandomQuote() {
        console.log('📖 Loading random quote...');
        
        try {
            const snapshot = await quotesCollection.get();
            const quotes = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log('📝 Quote data:', data);
                
                const likes = data.likes || 0;
                const dislikes = data.dislikes || 0;
                
                let weight = 10;
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

            console.log(`📚 Found ${quotes.length} quotes in database`);

            if (quotes.length === 0) {
                console.log('ℹ️ No quotes found, showing default');
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
            console.log('🎯 Selected quote:', this.currentQuote);
            this.displayQuote(this.currentQuote);
            this.updateVoteButtons();

        } catch (error) {
            console.error('❌ Error loading quotes:', error);
            this.showError('Errore nel caricamento delle Squotes');
            this.displayDefaultQuote();
        }
    }

    displayQuote(quote) {
        const quoteText = document.getElementById('quote-text');
        const quoteAuthor = document.getElementById('quote-author');
        const quoteImage = document.getElementById('quote-image');
        const likesCount = document.getElementById('likes-count');
        const dislikesCount = document.getElementById('dislikes-count');

        if (quoteText) quoteText.textContent = `"${quote.text}"`;
        if (quoteAuthor) quoteAuthor.textContent = `— ${quote.author || 'Squotater Sconosciuto'}`;
        if (quoteImage) {
            const randomImage = this.quoteImages[Math.floor(Math.random() * this.quoteImages.length)];
            quoteImage.textContent = randomImage;
        }
        if (likesCount) likesCount.textContent = `👍 ${quote.likes || 0}`;
        if (dislikesCount) dislikesCount.textContent = `👎 ${quote.dislikes || 0}`;
    }

    displayDefaultQuote() {
        const defaultQuotes = [
            { text: "Benvenuto in Squotato! Aggiungi la tua prima Squote!", author: "Squotater Sistema", likes: 0, dislikes: 0 },
            { text: "Le patate del database si stanno ancora sbucciando...", author: "Patata Tecnica", likes: 0, dislikes: 0 },
            { text: "Ops! Nessuna Squote trovata. Crea la prima!", author: "Squotater Affamato", likes: 0, dislikes: 0 }
        ];
        const randomQuote = defaultQuotes[Math.floor(Math.random() * defaultQuotes.length)];
        this.displayQuote(randomQuote);
    }

    async toggleVote(rating) {
        if (!this.currentQuote) {
            this.showError('Nessuna Squote selezionata');
            return;
        }

        if (!this.user) {
            this.showAuthModal();
            return;
        }

        const quoteId = this.currentQuote.id;
        const currentRating = this.userRatings.get(quoteId);
        
        try {
            if (currentRating === rating) {
                // Remove vote
                await this.removeVote(quoteId, rating);
                this.userRatings.delete(quoteId);
            } else {
                // Add or change vote
                if (currentRating) {
                    await this.removeVote(quoteId, currentRating);
                }
                await this.addVote(quoteId, rating);
                this.userRatings.set(quoteId, rating);
            }
            
            // Update UI immediately
            this.updateVoteButtons();
            console.log('✅ Vote updated successfully');
            
        } catch (error) {
            console.error('❌ Error toggling vote:', error);
            this.showError('Errore nel votare');
        }
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

            console.log(`✅ Added ${rating} to quote ${quoteId}`);

        } catch (error) {
            console.error('❌ Error adding vote:', error);
            throw error;
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

            console.log(`✅ Removed ${rating} from quote ${quoteId}`);

        } catch (error) {
            console.error('❌ Error removing vote:', error);
            throw error;
        }
    }

    showAddQuoteModal() {
        if (!this.user) {
            this.showAuthModal();
            return;
        }
        
        // Set the author name in the modal
        const authorName = document.getElementById('quote-author-name');
        if (authorName && this.userData) {
            authorName.textContent = this.userData.username;
        }
        
        const modal = document.getElementById('add-quote-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideAddQuoteModal() {
        const modal = document.getElementById('add-quote-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        const quoteText = document.getElementById('new-quote-text');
        if (quoteText) quoteText.value = '';
    }

    async submitCustomQuote() {
        if (!this.user || !this.userData) {
            this.showAuthModal();
            return;
        }

        const quoteText = document.getElementById('new-quote-text');
        if (!quoteText) {
            this.showError('Errore interno. Ricarica la pagina.');
            return;
        }

        const text = quoteText.value.trim();

        if (!text) {
            alert('Per favore inserisci una Squote!');
            return;
        }

        try {
            await quotesCollection.add({
                text: text,
                author: this.userData.username,
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
            console.error('❌ Error adding quote:', error);
            alert('Errore nell\'aggiungere la Squote. Riprova.');
        }
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                const notificationBtn = document.getElementById('enable-notifications');
                if (notificationBtn) {
                    notificationBtn.textContent = '📩 Notifiche Attivate!';
                    notificationBtn.disabled = true;
                }
                alert('Perfetto! Riceverai una Squote ogni mattina! 🌅');
            } else {
                alert('Notifiche bloccate. Puoi abilitarle nelle impostazioni del browser.');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('🥔 DOM loaded, starting Squotato...');
    new QuoteApp();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('💥 Global error:', event.error);
});