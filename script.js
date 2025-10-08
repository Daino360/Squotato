class QuoteApp {
    constructor() {
        this.currentQuote = null;
        this.user = null;
        this.userData = null;
        this.userRatings = new Map();
        this.initializeApp();
    }

    initializeApp() {
        console.log('🚀 Starting Squotato app...');
        
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
            background: #D32F2F;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            border: 1px solid #B71C1C;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: 'Source Sans Pro', sans-serif;
            font-weight: 600;
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
            guestLayout.style.display = 'none';
            userLayout.style.display = 'block';
            this.updatePotatoButton();
            console.log('✅ UI updated: User layout');
        } else {
            authButtons.style.display = 'flex';
            userInfo.style.display = 'none';
            guestLayout.style.display = 'block';
            userLayout.style.display = 'none';
            console.log('✅ UI updated: Guest layout');
        }
    }

    updatePotatoButton() {
        if (!this.currentQuote || !this.user) return;
        
        const potatoBtn = document.getElementById('potato-btn');
        
        if (!potatoBtn) {
            console.error('❌ Potato button not found');
            return;
        }
        
        const userHasPotato = this.userRatings.get(this.currentQuote.id) === 'potato';
        
        // Update button text and state
        const btnText = potatoBtn.querySelector('.btn-text');
        const btnActiveText = potatoBtn.querySelector('.btn-active-text');
        
        if (userHasPotato) {
            potatoBtn.classList.add('active');
            if (btnText) btnText.style.display = 'none';
            if (btnActiveText) btnActiveText.style.display = 'block';
        } else {
            potatoBtn.classList.remove('active');
            if (btnText) btnText.style.display = 'block';
            if (btnActiveText) btnActiveText.style.display = 'none';
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
            document.getElementById('potato-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePotato();
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
        document.getElementById('auth-modal').style.display = 'block';
        document.getElementById('auth-username').focus();
    }

    hideAuthModal() {
        document.getElementById('auth-modal').style.display = 'none';
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
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            console.log('✅ User created in Auth:', userCredential.user.uid);
            
            const userData = {
                username: username,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('users').doc(userCredential.user.uid).set(userData);
            console.log('✅ User data saved to Firestore');
            
            this.showAuthMessage('Registrazione completata! Benvenuto Squotater!', 'success');
            
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
            this.showAuthMessage('Bentornato in Squotato!', 'success');
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
                registerBtn.textContent = 'Registrati come Squotater';
                loginBtn.textContent = 'Accedi al tuo account';
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
            console.log('✅ Logout successful');
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
                const potatoes = data.potatoes || 0;
                
                let weight = 10;
                weight += Math.max(0, potatoes * 2);
                weight = Math.max(1, weight);
                
                quotes.push({
                    id: doc.id,
                    text: data.text,
                    author: data.author,
                    potatoes: potatoes,
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
            this.updatePotatoButton();

        } catch (error) {
            console.error('❌ Error loading quotes:', error);
            this.showError('Errore nel caricamento delle Squotes');
            this.displayDefaultQuote();
        }
    }

    displayQuote(quote) {
        const quoteText = document.getElementById('quote-text');
        const quoteAuthor = document.getElementById('quote-author');
        const potatoesNumber = document.getElementById('potatoes-number');

        if (quoteText) quoteText.textContent = `"${quote.text}"`;
        if (quoteAuthor) quoteAuthor.textContent = `— ${quote.author || 'Squotater Sconosciuto'}`;
        
        // Update the potatoes count
        if (potatoesNumber) potatoesNumber.textContent = quote.potatoes || 0;
    }

    displayDefaultQuote() {
        const defaultQuotes = [
            { text: "Benvenuto in Squotato! Aggiungi la tua prima Squote!", author: "Squotater Sistema", potatoes: 0 },
            { text: "Le patate del database si stanno ancora sbucciando...", author: "Patata Tecnica", potatoes: 0 },
            { text: "Ops! Nessuna Squote trovata. Crea la prima!", author: "Squotater Affamato", potatoes: 0 }
        ];
        const randomQuote = defaultQuotes[Math.floor(Math.random() * defaultQuotes.length)];
        this.displayQuote(randomQuote);
    }

    async togglePotato() {
        if (!this.currentQuote) {
            this.showError('Nessuna Squote selezionata');
            return;
        }

        if (!this.user) {
            this.showAuthModal();
            return;
        }

        const quoteId = this.currentQuote.id;
        const userHasPotato = this.userRatings.get(quoteId) === 'potato';
        
        try {
            if (userHasPotato) {
                // Remove potato
                await this.removePotato(quoteId);
                this.userRatings.delete(quoteId);
                // Update UI instantly
                this.currentQuote.potatoes = Math.max(0, (this.currentQuote.potatoes || 0) - 1);
            } else {
                // Add potato
                await this.addPotato(quoteId);
                this.userRatings.set(quoteId, 'potato');
                // Update UI instantly
                this.currentQuote.potatoes = (this.currentQuote.potatoes || 0) + 1;
            }
            
            // Update display instantly
            this.displayQuote(this.currentQuote);
            this.updatePotatoButton();
            
            console.log('✅ Potato updated successfully');
            
        } catch (error) {
            console.error('❌ Error toggling potato:', error);
            this.showError('Errore nel dare la patata: ' + error.message);
        }
    }

    async addPotato(quoteId) {
        try {
            const quoteRef = quotesCollection.doc(quoteId);
            
            await quoteRef.update({
                potatoes: firebase.firestore.FieldValue.increment(1)
            });

            await feedbackCollection.add({
                userId: this.user.uid,
                quoteId: quoteId,
                rating: 'potato',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Added potato to quote ${quoteId}`);

        } catch (error) {
            console.error('❌ Error adding potato:', error);
            throw error;
        }
    }

    async removePotato(quoteId) {
        try {
            const quoteRef = quotesCollection.doc(quoteId);
            
            await quoteRef.update({
                potatoes: firebase.firestore.FieldValue.increment(-1)
            });

            const ratingSnapshot = await feedbackCollection
                .where('userId', '==', this.user.uid)
                .where('quoteId', '==', quoteId)
                .where('rating', '==', 'potato')
                .get();

            const deletePromises = [];
            ratingSnapshot.forEach(doc => {
                deletePromises.push(doc.ref.delete());
            });
            
            await Promise.all(deletePromises);

            console.log(`✅ Removed potato from quote ${quoteId}`);

        } catch (error) {
            console.error('❌ Error removing potato:', error);
            throw error;
        }
    }

    showAddQuoteModal() {
        if (!this.user) {
            this.showAuthModal();
            return;
        }
        
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
                author: this.userData.username,
                potatoes: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: this.user.uid,
                custom: true
            });

            this.hideAddQuoteModal();
            alert('Squote aggiunta con successo!');
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
                alert('Perfetto! Riceverai una Squote ogni mattina!');
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