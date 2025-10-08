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
        
        if (!window.firebase || !window.auth || !window.quotesCollection) {
            this.showError('Firebase non caricato correttamente. Ricarica la pagina.');
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

        setTimeout(() => errorDiv.remove(), 5000);
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
                } catch (error) {
                    console.error('Error in auth state change:', error);
                }
            } else {
                this.userData = null;
                this.userRatings.clear();
            }
            
            this.updateAuthUI();
        });
    }

    async loadUserData() {
        if (!this.user) return;
        
        try {
            const userDoc = await db.collection('users').doc(this.user.uid).get();
            if (userDoc.exists) {
                this.userData = userDoc.data();
                console.log('✅ Loaded user data:', this.userData);
            } else {
                // Create user data if it doesn't exist
                this.userData = {
                    username: 'Squotater',
                    email: this.user.email,
                    createdAt: new Date()
                };
                await db.collection('users').doc(this.user.uid).set(this.userData);
                console.log('✅ Created new user data');
            }
        } catch (error) {
            console.error('❌ Error loading user data:', error);
        }
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
            
            console.log('✅ Loaded user ratings:', this.userRatings.size);
        } catch (error) {
            console.error('❌ Error loading user ratings:', error);
        }
    }

    updateAuthUI() {
        const authButtons = document.getElementById('auth-buttons');
        const userInfo = document.getElementById('user-info');
        const userUsername = document.getElementById('user-username');
        const welcomeUsername = document.getElementById('welcome-username');
        const guestLayout = document.getElementById('guest-layout');
        const userLayout = document.getElementById('user-layout');

        if (this.user && this.userData) {
            authButtons.style.display = 'none';
            userInfo.style.display = 'flex';
            if (userUsername) userUsername.textContent = this.userData.username;
            if (welcomeUsername) welcomeUsername.textContent = this.userData.username;
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
        
        if (!likeBtn || !dislikeBtn) return;
        
        const userRating = this.userRatings.get(this.currentQuote.id);
        
        likeBtn.classList.remove('active');
        dislikeBtn.classList.remove('active');
        
        if (userRating === 'like') {
            likeBtn.classList.add('active');
        } else if (userRating === 'dislike') {
            dislikeBtn.classList.add('active');
        }
    }

    bindEvents() {
        console.log('🔗 Binding events...');

        try {
            // Auth events
            document.getElementById('show-login-btn').addEventListener('click', () => this.showAuthModal());
            document.getElementById('register-btn').addEventListener('click', () => this.register());
            document.getElementById('login-btn').addEventListener('click', () => this.login());
            document.getElementById('logout-btn').addEventListener('click', () => this.logout());
            document.getElementById('close-auth').addEventListener('click', () => this.hideAuthModal());

            // Quote events
            document.getElementById('new-quote').addEventListener('click', () => this.loadRandomQuote());
            document.getElementById('guest-new-quote').addEventListener('click', () => this.loadRandomQuote());
            document.getElementById('like-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleVote('like');
            });
            document.getElementById('dislike-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleVote('dislike');
            });
            document.getElementById('add-quote').addEventListener('click', () => this.showAddQuoteModal());
            document.getElementById('submit-quote').addEventListener('click', () => this.submitCustomQuote());
            document.getElementById('cancel-quote').addEventListener('click', () => this.hideAddQuoteModal());
            document.getElementById('enable-notifications').addEventListener('click', () => this.requestNotificationPermission());

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
            document.getElementById('auth-username').focus();
        }
    }

    hideAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        document.getElementById('auth-username').value = '';
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';
        const messageEl = document.getElementById('auth-message');
        if (messageEl) {
            messageEl.textContent = '';
            messageEl.className = 'auth-message';
        }
    }

    async register() {
        const username = document.getElementById('auth-username').value.trim();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const messageEl = document.getElementById('auth-message');

        if (!messageEl) {
            this.showError('Errore interno. Ricarica la pagina.');
            return;
        }

        messageEl.textContent = '';
        messageEl.className = 'auth-message';

        if (!username || !email || !password) {
            this.showAuthMessage('Inserisci username, email e password!', 'error');
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
            
            // Create user data in Firestore
            this.userData = {
                username: username,
                email: email,
                createdAt: new Date()
            };
            
            await db.collection('users').doc(userCredential.user.uid).set(this.userData);
            
            this.showAuthMessage('Registrazione completata! Benvenuto Squotater! 🎉', 'success');
        } catch (error) {
            console.error('❌ Registration error:', error);
            this.showAuthMessage(this.getAuthErrorMessage(error), 'error');
        } finally {
            this.setAuthButtonsState(false);
        }
    }

    async login() {
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const messageEl = document.getElementById('auth-message');

        if (!messageEl) {
            this.showError('Errore interno. Ricarica la pagina.');
            return;
        }

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
            default:
                return 'Errore: ' + error.message;
        }
    }

    async logout() {
        try {
            console.log('🚪 Logging out...');
            await auth.signOut();
        } catch (error) {
            console.error('❌ Error logging out:', error);
        }
    }

    async loadRandomQuote() {
        console.log('📖 Loading random quote...');
        
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
                    text: data.text,
                    author: data.author,
                    likes: likes,
                    dislikes: dislikes,
                    weight: weight
                });
            });

            console.log(`📚 Found ${quotes.length} quotes in database`);

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
            // Select random image from our array
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
                await this.removeVote(quoteId, rating);
            } else {
                if (currentRating) {
                    await this.removeVote(quoteId, currentRating);
                }
                await this.addVote(quoteId, rating);
            }
            
            // Update the current quote data without reloading
            if (rating === 'like') {
                if (currentRating === 'like') {
                    this.currentQuote.likes = Math.max(0, (this.currentQuote.likes || 0) - 1);
                } else {
                    this.currentQuote.likes = (this.currentQuote.likes || 0) + 1;
                    if (currentRating === 'dislike') {
                        this.currentQuote.dislikes = Math.max(0, (this.currentQuote.dislikes || 0) - 1);
                    }
                }
            } else if (rating === 'dislike') {
                if (currentRating === 'dislike') {
                    this.currentQuote.dislikes = Math.max(0, (this.currentQuote.dislikes || 0) - 1);
                } else {
                    this.currentQuote.dislikes = (this.currentQuote.dislikes || 0) + 1;
                    if (currentRating === 'like') {
                        this.currentQuote.likes = Math.max(0, (this.currentQuote.likes || 0) - 1);
                    }
                }
            }
            
            this.displayQuote(this.currentQuote);
            this.updateVoteButtons();
            
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

            this.userRatings.set(quoteId, rating);
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

            this.userRatings.delete(quoteId);
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
        
        document.getElementById('add-quote-modal').style.display = 'block';
    }

    hideAddQuoteModal() {
        document.getElementById('add-quote-modal').style.display = 'none';
        document.getElementById('new-quote-text').value = '';
    }

    async submitCustomQuote() {
        if (!this.user || !this.userData) {
            this.showAuthModal();
            return;
        }

        const text = document.getElementById('new-quote-text').value.trim();

        if (!text) {
            alert('Per favore inserisci una Squote!');
            return;
        }

        try {
            await quotesCollection.add({
                text: text,
                author: this.userData.username, // Use the user's username as author
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