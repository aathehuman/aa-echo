document.addEventListener('DOMContentLoaded', function() {
    // ====================================================================================================
    // FIREBASE AND WEBRTC INITIALIZATION
    // ====================================================================================================
    
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyBnyx167FxrE6RKOpCg2g87zIp_dThvS2s",
        authDomain: "aa-echo.firebaseapp.com",
        projectId: "aa-echo",
        storageBucket: "aa-echo.firebasestorage.app",
        messagingSenderId: "1032881843806",
        appId: "1:1032881843806:web:f1f0d73a96f9e256298ecf",
        measurementId: "G-3SDT9J79VP"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();
	
	// WebRTC configuration
	const configuration = {
		iceServers: [
			{ urls: 'stun:stun.l.google.com:19302' },
			{ urls: 'stun:stun1.l.google.com:19302' },
			{ urls: 'stun:stun2.l.google.com:19302' },
			{ urls: 'stun:stun3.l.google.com:19302' },
			{ 
				urls: 'turn:turn.cloudflare.com:3478',
				username: 'test',
				credential: 'test'
			}
		]
	};

    // Set auth persistence
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            console.log("📎✔️ Auth persistence set to LOCAL.");
        })
        .catch((error) => {
            console.error("📎❌ Error setting auth persistence:", error);
        });


    // ====================================================================================================
    // GLOBAL VARIABLES AND STATE MANAGEMENT
    // ====================================================================================================
    
    console.log("%c welcome to echo! ", 'font-size: 30px; background: linear-gradient(135deg, #1a1a2e, #294752); border: 1px solid #fff; border-radius: 30px; font-weight: 1000;');
    
    // DOM elements
    const authContainer = document.getElementById('auth-container');
    const appMain = document.getElementById('app-main');
    const guestTab = document.getElementById('guest-tab');
    const accountTab = document.getElementById('account-tab');
    const guestPanel = document.getElementById('guest-panel');
    const accountPanel = document.getElementById('account-panel');
    const signupPanel = document.getElementById('signup-panel');
    const usernamePanel = document.getElementById('username-panel');
    const guestUsername = document.getElementById('guest-username');
    const guestLoginBtn = document.getElementById('guest-login-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const signupEmail = document.getElementById('signup-email');
    const signupPassword = document.getElementById('signup-password');
    const displayName = document.getElementById('display-name');
    const signupBtn = document.getElementById('signup-btn');
    const chooseUsername = document.getElementById('choose-username');
    const setUsernameBtn = document.getElementById('set-username-btn');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const resetPasswordBtn = document.getElementById('reset-password-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    const contactsList = document.getElementById('contacts-list');
    const callStatus = document.getElementById('current-call-name');
    const localVideo = document.getElementById('local-video');
    const remoteVideo = document.getElementById('remote-video');
    const remoteVideoLabel = document.getElementById('remote-video-label');
    const muteBtn = document.getElementById('mute-btn');
    const videoBtn = document.getElementById('video-btn');
    const endCallBtn = document.getElementById('end-call-btn');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
	const toggleScreenShareBtn = document.getElementById('toggle-screen-share-btn');
	const screenShareVideo = document.getElementById('screen-share-video');
    
    // Email verification elements
    const emailVerificationIcon = document.getElementById('email-verification-icon');
    const verificationIcon = document.getElementById('verification-icon');
    const tooltipStatus = document.getElementById('tooltip-status');
    const tooltipEmail = document.getElementById('tooltip-email');
    const verifyEmailBtn = document.getElementById('verify-email-btn');
    
    // State variables
    let currentUser = null;
    let localStream = null;
    let remoteStream = null;
    let peerConnection = null;
    let currentCall = null;
    let isMuted = false;
    let isVideoOff = false;
    let allUsers = {};
    let collapsedSections = {};
	let isScreenSharing = false;
	let screenShareStream = null;
	
	// ====================================================================================================
	// UTILITY FUNCTIONS
	// ====================================================================================================
	
	// Activity helper ig
	document.addEventListener('click', function() {
		// Check if we have a remote video that's not playing
		if (remoteVideo && remoteVideo.srcObject && remoteVideo.paused) {
			// Try to reload the video element first
			if (remoteVideo.readyState === 0) {
				console.log("Reloading video element after user interaction");
				remoteVideo.load();
			}
			
			// Then try to play
			remoteVideo.play().catch(e => {
				console.log("Could not resume video after user interaction:", e);
			});
		}
	}, { once: false });

	// Structured logging helper with optional color-coding
	function log(message, level = 0, feature = null) {
		const indent = '    '.repeat(level);
		let color = 'inherit'; // default color
		let borderLeft = 'transparent'; // default border
		
		// Assign colors based on feature
		if (feature === 'auth') {
			color = '#3498db'; 
			borderLeft = '#3498db', '3px'; // Blue
		}
		if (feature === 'admin') {
			color = '#9b59b6'; 
			borderLeft = '#9b59b6', '3px'; // Purple
		}
		if (feature === 'message') {
			color = '#2ecc71'; 
			borderLeft = '#2ecc71', '3px'; // Green
		}
		if (feature === 'call') {
			color = '#e67e22'; 
			borderLeft = '#e67e22', '3px'; // Orange
		}
		if (feature === 'user') {
			color = '#f39c12'; 
			borderLeft = '#f39c12', '3px'; // Orange
		}
		
		// Use %c for styling in the console
		console.log(`%c${indent}${message}`, `color: ${color}; font-weight: bold; border-left: 3px solid ${borderLeft}; padding-left: 5px;`);
	}

    // ====================================================================================================
    // IN-APP NOTIFICATION SYSTEM
    // ====================================================================================================
    
    class NotificationSystem {
        constructor() {
            this.container = document.getElementById('notification-container');
            this.notifications = [];
            this.maxNotifications = 5;
        }

        show(message, type = 'info', title = null, duration = 4000) {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            
            notification.innerHTML = `
                <div class="notification-icon"></div>
                <div class="notification-content">
                    ${title ? `<div class="notification-title">${title}</div>` : ''}
                    <div class="notification-message">${message}</div>
                </div>
                <button class="notification-close">×</button>
            `;
            
            // Add to container
            this.container.appendChild(notification);
            
            // Limit number of notifications
            if (this.notifications.length >= this.maxNotifications) {
                const oldest = this.notifications.shift();
                this.remove(oldest);
            }
            
            this.notifications.push(notification);
            
            // Show notification with animation
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            // Auto-dismiss
            if (duration > 0) {
                setTimeout(() => {
                    this.remove(notification);
                }, duration);
            }
            
            // Close button
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => {
                this.remove(notification);
            });
            
            // Click to dismiss
            notification.addEventListener('click', (e) => {
                if (!e.target.classList.contains('notification-close')) {
                    this.remove(notification);
                }
            });
            
            return notification;
        }
        
        remove(notification) {
            if (!notification || !notification.parentNode) return;
            
            notification.classList.add('hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
            }, 300);
        }
        
        // Convenience methods
        success(message, title = null, duration = 4000) {
            return this.show(message, 'success', title, duration);
        }
        
        error(message, title = null, duration = 6000) {
            return this.show(message, 'error', title, duration);
        }
        
        warning(message, title = null, duration = 5000) {
            return this.show(message, 'warning', title, duration);
        }
        
        info(message, title = null, duration = 4000) {
            return this.show(message, 'info', title, duration);
        }
        
        // Clear all notifications
        clear() {
            this.notifications.forEach(notification => {
                this.remove(notification);
            });
            this.notifications = [];
        }
    }
    
    // Create global notification instance
    const notifications = new NotificationSystem();

    // ====================================================================================================
    // UTILITY FUNCTIONS
    // ====================================================================================================
    
    // Helper function to set a button's loading state
    function setButtonLoading(buttonElement, isLoading) {
        if (!buttonElement) return;
        
        if (isLoading) {
            buttonElement.dataset.originalText = buttonElement.textContent;
            buttonElement.disabled = true;
            buttonElement.classList.add('button-loading');
            buttonElement.innerHTML = '<span class="spinner"></span>';
        } else {
            buttonElement.disabled = false;
            buttonElement.classList.remove('button-loading');
            buttonElement.textContent = buttonElement.dataset.originalText;
        }
    }

    // Initialize collapsed sections from localStorage
    function initCollapsedSections() {
        const saved = localStorage.getItem('collapsedSections');
        if (saved) {
            collapsedSections = JSON.parse(saved);
        } else {
            if (window.innerWidth <= 480) {
                collapsedSections = {
                    'recent-chats-section': false,
                    'rooms-section': true,
                    'admin-section': true 
                };
            } else {
                collapsedSections = {
                    'recent-chats-section': false,
                    'rooms-section': true,
                    'admin-section': true
                };
            }
        }
    }

    function applyCollapsedStates() {
        Object.keys(collapsedSections).forEach(sectionId => {
            const section = document.getElementById(sectionId);
            const content = document.getElementById(sectionId.replace('-section', '-content'));
            const toggle = section ? section.querySelector('.collapse-toggle') : null;
        
            if (section && content && toggle) {
                if (collapsedSections[sectionId]) {
                    content.classList.add('collapsed');
                    toggle.classList.add('collapsed');
                    toggle.textContent = '▶';
                } else {
                    content.classList.remove('collapsed');
                    toggle.classList.remove('collapsed');
                    toggle.textContent = '▼';
                }
            }
        });
    }

    // Toggle section collapse
    function toggleSection(sectionId) {
        collapsedSections[sectionId] = !collapsedSections[sectionId];
        localStorage.setItem('collapsedSections', JSON.stringify(collapsedSections));
        applyCollapsedStates();
    }

    // ====================================================================================================
    // AUTHENTICATION FUNCTIONS
    // ====================================================================================================
    
    // Auth tab switching
    function switchAuthTab(tab) {
        if (!guestTab || !accountTab || !guestPanel || !accountPanel || 
            !signupPanel || !usernamePanel) {
            console.error("🗂️ ❌ Missing auth tab elements");
            return;
        }
        
        if (tab === 'guest') {
            guestTab.classList.add('active');
            accountTab.classList.remove('active');
            guestPanel.classList.add('active');
            accountPanel.classList.remove('active');
            signupPanel.classList.remove('active');
            usernamePanel.classList.remove('active');
        } else {
            accountTab.classList.add('active');
            guestTab.classList.remove('active');
            accountPanel.classList.add('active');
            guestPanel.classList.remove('active');
            signupPanel.classList.remove('active');
            usernamePanel.classList.remove('active');
        }
    }

    function switchAuthPanel(panel) {
        if (!guestPanel || !accountPanel || !signupPanel || !usernamePanel) {
            console.error("🗂 ❌ Missing auth panel elements");
            return;
        }
        
        // Hide all panels first
        guestPanel.classList.remove('active');
        accountPanel.classList.remove('active');
        signupPanel.classList.remove('active');
        usernamePanel.classList.remove('active');
        
        // Show the requested panel
        if (panel === 'signup') {
            signupPanel.classList.add('active');
        } else if (panel === 'login') {
            accountPanel.classList.add('active');
        } else if (panel === 'username') {
            usernamePanel.classList.add('active');
        }
    }

    // Login as guest
    function loginAsGuest() {
        const username = guestUsername.value.trim();
        if (!username) {
            notifications.error('u gotta enter a username , bro.', 'action required', '6000');
            return;
        }
        
        setButtonLoading(guestLoginBtn, true);
        
        const username_lower = username.toLowerCase();
        database.ref('users').orderByChild('displayName_lower').equalTo(username_lower).once('value')
            .then(snapshot => {
                if (snapshot.exists()) {
                    notifications.error(`"${username}" is taken, bro. choose another.`, 'error', '6000');
                    setButtonLoading(guestLoginBtn, false);
                    return Promise.reject(new Error('Username taken'));
                }
                
                return auth.signInAnonymously();
            })
            .then(userCredential => {
                currentUser = userCredential.user;
                console.log("👤🤨 ✅ Guest signed in successfully");
                
                return database.ref('users/' + currentUser.uid).set({
                    displayName: username,
                    displayName_lower: username.toLowerCase(),
                    isGuest: true,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP,
                    uid: currentUser.uid
                });
            })
            .then(() => {
                return currentUser.updateProfile({ displayName: username });
            })
            .then(() => {
                setupUser();
            })
            .catch(error => {
                console.error("couldn't sign u in as guest bro. error:", error);
                if (error.message !== 'Username taken') {
                    notifications.error(error.message);
                }
            })
            .finally(() => {
                setButtonLoading(guestLoginBtn, false);
            });
    }

    // Login with email
    function loginWithEmail() {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (email && password) {
            setButtonLoading(loginBtn, true);

            auth.signInWithEmailAndPassword(email, password)
                .then(userCredential => {
                    currentUser = userCredential.user;
                    return currentUser.reload();
                })
                .then(() => {
                    console.log("Email user signed in:", currentUser);
                    
                    if (!currentUser.displayName || currentUser.displayName === '') {
                        switchAuthPanel('username');
                    } else {
                        setupUser();
                    }
                    
                    updateVerificationUI();
                })
                .catch(error => {
                    console.error("📧➡️ ❌ Error signing in:", error);
                    
                    let specificMessage = "";
                    if (error.code === 'auth/user-not-found') {
                        specificMessage = "ur account wasn't found.";
                    } else if (error.code === 'auth/invalid-login-credentials') {
                        specificMessage = "that might be the wrong email/password combination.";
                    } else if (error.code === 'auth/wrong-password') {
                        specificMessage = "that's the wrong password.";
                    } else if (error.code === 'auth/invalid-email') {
                        specificMessage = "that email isn't in the correct format.";
                    } else if (error.code === 'auth/user-disabled') {
                        specificMessage = "ur account's been disabled by a leader.";
                    } else if (error.code === 'auth/too-many-requests') {
                        specificMessage = "u tried logging in too many times. try again later.";
                    }

                    if (specificMessage) {
                        notifications.error("couldn't sign u in, mate." + " " + specificMessage);
                    } else {
                        notifications.error("couldn't sign u in, mate." + " " + error.message);
                    }
                })
                .finally(() => {
                    setButtonLoading(loginBtn, false);
                });
        } else {
            notifications.warning('u gotta enter an email and password, mate.');
        }
    }
    
    // Send verification email
    function sendEmailVerification() {
        if (!currentUser) {
            notifications.error('u gotta log in first, mate.');
            return;
        }
        
        if (currentUser.emailVerified) {
            notifications.error('ur email is already verified, bro.');
            return;
        }
        
        const verifyButton = document.getElementById('verify-email-btn');
        if (verifyButton) {
            verifyButton.disabled = true;
            verifyButton.textContent = 'sending...';
        }
        
        currentUser.sendEmailVerification()
            .then(() => {
                const tooltipStatus = document.getElementById('tooltip-status');
                if (tooltipStatus) {
                    tooltipStatus.textContent = 'email sent! check your inbox and spam folders.';
                    tooltipStatus.style.color = '#4caf50';
                    
                    setTimeout(() => {
                        tooltipStatus.textContent = 'email not verified';
                        tooltipStatus.style.color = '#f44336';
                    }, 5000);
                }
            })
            .catch(error => {
                console.error("📩✔️ ❌ Error sending verification email:", error);
                
                const tooltipStatus = document.getElementById('tooltip-status');
                if (tooltipStatus) {
                    tooltipStatus.textContent = `error: ${error.message}`;
                    tooltipStatus.style.color = '#f44336';
                    
                    setTimeout(() => {
                        tooltipStatus.textContent = 'email not verified';
                        tooltipStatus.style.color = '#f44336';
                    }, 5000);
                }
            })
            .finally(() => {
                if (verifyButton) {
                    verifyButton.disabled = false;
                    verifyButton.textContent = 'verify email';
                }
            });
    }

    // Update UI based on verification status
    function updateVerificationUI() {
        const container = document.getElementById('email-verification-icon');
        const icon = document.getElementById('verification-icon');
        const tooltipStatus = document.getElementById('tooltip-status');
        const tooltipEmail = document.getElementById('tooltip-email');
        const verifyBtn = document.getElementById('verify-email-btn');
        
        if (!container || !icon || !tooltipStatus) return;
        
        if (currentUser && !currentUser.isAnonymous) {
            container.style.display = 'block';
            
            if (currentUser.emailVerified) {
                icon.className = 'verification-icon verified';
                icon.textContent = '✓';
                tooltipStatus.textContent = 'email verified';
                tooltipStatus.style.color = '#4caf50';
                if (verifyBtn) verifyBtn.style.display = 'none';
            } else {
                icon.className = 'verification-icon not-verified';
                icon.textContent = '✕';
                tooltipStatus.textContent = 'email not verified';
                tooltipStatus.style.color = '#f44336';
                if (verifyBtn) verifyBtn.style.display = 'block';
            }
            
            if (currentUser.email && tooltipEmail) {
                tooltipEmail.textContent = currentUser.email;
            }
        } else {
            container.style.display = 'none';
        }
    }

    // Set username for new users
    function setUsername() {
        const username = chooseUsername.value.trim();
        
        if (username && currentUser) {
            setButtonLoading(setUsernameBtn, true);

            currentUser.updateProfile({ displayName: username })
                .then(() => {
                    return database.ref('users/' + currentUser.uid).update({
                        displayName: username,
                        displayName_lower: username.toLowerCase(),
                        uid: currentUser.uid
                    });
                })
                .then(() => {
                    setupUser();
                })
                .catch(error => {
                    console.error("👤📛 ❌ Set username failed. Error:", error);
                    notifications.error("couldn't set that username for u, bro. check the console for details.", "that didn't work", '6000');
                })
                .finally(() => {
                    setButtonLoading(setUsernameBtn, false);
                });
        } else {
            notifications.warning('u gotta enter a username, mate.');
        }
    }

    // Sign up new user
    function signUp() {
        const email = signupEmail.value.trim();
        const password = signupPassword.value;
        const name = displayName.value.trim();
        
        if (!email || !password || !name) {
            notifications.error('Please fill all fields', 'Validation Error', 3000);
            return;
        }
        
        if (password.length < 6) {
            notifications.error('Password must be at least 6 characters', 'Validation Error', 3000);
            return;
        }
        
        if (email && password && name) {
            setButtonLoading(signupBtn, true);

            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    return userCredential.user.updateProfile({ displayName: name });
                })
                .then(() => {
                    currentUser = auth.currentUser;
                    return currentUser.sendEmailVerification();
                })
                .then(() => {
                    return database.ref('users/' + currentUser.uid).set({
                        displayName: currentUser.displayName || 'New User',
                        displayName_lower: (currentUser.displayName || 'New User').toLowerCase(),
                        isGuest: false,
                        emailVerified: false,
                        email: email,
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        lastSeen: firebase.database.ServerValue.TIMESTAMP,
                        uid: currentUser.uid
                    });
                })
                .then(() => {
                    notifications.success('thanks for joining echo, bro! make sure u verify ur email to make calls. u might have to check ur spam folder too.', 'thanks!', '10000');
                    setupUser();
                })
                .catch(error => {
                    console.error("couldn't sign u up, mate. error:", error);
                    notifications.error(error.message);
                })
                .finally(() => {
                    setButtonLoading(signupBtn, false);
                });
        } else {
            notifications.warning('u gotta fill all fields, mate.');
        }
    }

    // Reset password
    function resetPassword() {
        const email = emailInput.value.trim();
        
        if (!email) {
            notifications.warning('u gotta enter your email address first, bro.');
            return;
        }

        const originalText = resetPasswordBtn.textContent;
        resetPasswordBtn.textContent = 'sending...';
        resetPasswordBtn.disabled = true;

        auth.sendPasswordResetEmail(email)
            .then(() => {
                notifications.success('password reset email sent, bro! check your email. try looking in your spam folder too.', 'done', '10000');
            })
            .catch(error => {
                console.error(" error:", error);
                notifications.error("couldn't send that password reset email, bro. check the console for details.", "that didn't work", '6000');
            })
            .finally(() => {
                resetPasswordBtn.textContent = originalText;
                resetPasswordBtn.disabled = false;
            });
    }

    function logout() {
        log("...⬅️🚗🚪 ℹ️ Logging out..", 0, 'auth');
        
        if (currentUser) {
            auth.signOut().then(() => {
                log("✔️ Firebase sign-out successful.", 1, 'auth');
            }).catch(error => {
                console.error("⬅️🚗..🚪 ❌ Firebase sign-out failed:", error);
            });
        }
        currentUser = null;
        
        if (currentCall) {
            endCall();
        }
        
        document.body.classList.remove('is-logged-in');
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.remove('user-logged-in');
        }
        
        if (authContainer) {
            authContainer.style.display = 'flex';
            authContainer.style.position = 'relative';
            authContainer.style.zIndex = '1000';
            authContainer.style.backgroundColor = '';
        }
        
        if (appMain) {
            appMain.style.display = 'none';
            appMain.classList.remove('visible');
        }
        
        void document.body.offsetHeight;
        
        setTimeout(() => {
            switchAuthTab('account');
            switchAuthPanel('login');
            
            if (authContainer) {
                authContainer.scrollIntoView({ behavior: 'instant', block: 'start' });
            }
        }, 50);
        
        log("🚗⬅️...🚪✅ Logout successful!", 0, 'auth');
    }

    // ====================================================================================================
    // USER SETUP AND DATA LOADING FUNCTIONS
    // ====================================================================================================
    
    // Setup user after authentication
    async function setupUser() {
        try {
            log("👤⚙️ ℹ️ Setting up user..", 0, 'user');
            
            document.body.classList.add('is-logged-in');
            document.querySelector('.app-container').classList.add('user-logged-in');

            const displayName = currentUser.displayName || 'User';
            userName.textContent = displayName;
            const avatarText = displayName && displayName.length > 0 ? displayName.charAt(0).toUpperCase() : 'U';
            userAvatar.textContent = avatarText;

            if (authContainer) {
                authContainer.style.display = 'none';
            }
            if (appMain) {
                appMain.style.display = 'flex';
            }
            
            log("✔️ UI/states set", 1, 'user');

            const userRef = database.ref('users/' + currentUser.uid);
            
            await userRef.update({
                displayName: displayName,
                displayName_lower: displayName.toLowerCase(),
                isGuest: currentUser.isAnonymous || false,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
            
            userRef.onDisconnect().update({
                isOnline: false,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
            
            log("✔️ Database and listeners loaded", 1, 'user');

            await loadUsers();
            loadContacts();
            
            setupMedia();
            listenForIncomingCalls();
            
            updateVerificationUI();
            
            const appMainElement = document.getElementById('app-main');
            if (appMainElement) {
                appMainElement.classList.add('visible');
            }

        } catch (error) {
            console.error("❌ CRITICAL ERROR in setupUser:", error);
            notifications.error("a critical error occurred during login, bro. check the console for details.", 'CRITICAL ERROR', 10000);
            
            const appMainElement = document.getElementById('app-main');
            if (appMainElement) appMainElement.classList.add('visible');
        }
        
        log("👤⚙️ User has been set up!", 0, 'user');
    }

    // Load users
    function loadUsers() {
        console.log("👥📋 Loading users - Creating a new, clean slate.");
        return new Promise((resolve, reject) => {
            const usersRef = database.ref('users');
            
            usersRef.once('value').then(snapshot => {
                console.log("👥📋 Received snapshot from Firebase.");
                
                allUsers = {};
                snapshot.forEach(childSnapshot => {
                    const user = childSnapshot.val();
                    const userId = childSnapshot.key;
                    allUsers[userId] = user;
                });
                
                console.log("👥📋 All users loaded. allUsers object now contains:", allUsers);
                resolve();
            }).catch(error => {
                console.error("👥📋 Failed to load users:", error);
                resolve();
            });
        });
    }
    
    // Load contacts from Firebase
    function loadContacts() {
        contactsList.innerHTML = '';
        
        Object.keys(allUsers).forEach(userId => {
            if (userId === currentUser.uid) return;
            
            const user = allUsers[userId];
            if (!user) return;
            
            const contactItem = document.createElement('div');
            contactItem.classList.add('recent-chat-item');
            
            const now = Date.now();
            const twoMinutesAgo = now - (2 * 60 * 1000);
            const isOnline = user.lastSeen && user.lastSeen > twoMinutesAgo;
            
            if (isOnline) {
                contactItem.classList.add('online');
            } else {
                contactItem.classList.add('offline');
            }
            
            const contactAvatar = document.createElement('div');
            contactAvatar.classList.add('contact-avatar');
            const avatarText = user.displayName ? 
                user.displayName.charAt(0).toUpperCase() : 'U';
            contactAvatar.textContent = avatarText;
            
            const contactName = document.createElement('div');
            contactName.classList.add('chat-name');
            contactName.textContent = user.displayName || 'Unknown User';
            
            contactItem.appendChild(contactAvatar);
            contactItem.appendChild(contactName);
            
            contactItem.addEventListener('click', () => {
                startCall(userId, user.displayName || 'Unknown User');
            });
            
            contactsList.appendChild(contactItem);
        });
    }

    // ====================================================================================================
    // CALLING FUNCTIONS
    // ====================================================================================================

    // DOM elements for call modal
    const incomingCallModal = document.getElementById('incoming-call-modal');
    const callerAvatar = document.getElementById('caller-avatar');
    const callerName = document.getElementById('caller-name');
    const acceptCallBtn = document.getElementById('accept-call-btn');
    const rejectCallBtn = document.getElementById('reject-call-btn');

    // State variables for calls
    let incomingCallData = null;
    let callTimeout = null;

    // Setup media (camera and microphone)
    async function setupMedia() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            localVideo.srcObject = localStream;
            
            console.log("Local media setup successful:", {
                audioTracks: localStream.getAudioTracks().length,
                videoTracks: localStream.getVideoTracks().length
            });
        } catch (error) {
            console.error("Error accessing media devices:", error);
            notifications.error("Could not access camera/microphone. Please check permissions.", "Media Error");
        }
    }

    // Start a call (as the initiator)
    function startCall(userId, displayName) {
        if (currentCall) {
            notifications.warning("You're already in a call. End current call first.", "Call Active");
            return;
        }
        
        callStatus.textContent = `Calling ${displayName}...`;
        remoteVideoLabel.textContent = displayName;
        
        const callId = generateCallId();
        
        // Initialize SimplePeer as the initiator
        peerConnection = new SimplePeer({
            initiator: true,
            trickle: false, // We'll handle signaling ourselves via Firebase
            stream: localStream,
            config: configuration
        });
        
        // 1. When SimplePeer generates a signal (the offer), send it to Firebase
        peerConnection.on('signal', data => {
            console.log("CALLER: Sending offer signal:", data);
            database.ref(`calls/${callId}`).set({
                offer: data, // Store the offer under the 'offer' key
                from: currentUser.uid,
                to: userId,
                fromName: currentUser.displayName || 'Unknown User',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        });
        
        // 2. When we receive the remote stream, play it
        peerConnection.on('stream', stream => {
            console.log("CALLER: Remote stream received");
            remoteStream = stream;
            remoteVideo.srcObject = stream;
            remoteVideo.play().catch(e => console.error("Error playing remote video:", e));
            
            callStatus.textContent = `Connected with ${displayName}`;
            notifications.success(`Connected with ${displayName}`, "Call Connected");
            currentCall = { userId, displayName, callId };
        });
        
        // 3. Handle connection state changes
        peerConnection.on('connect', () => {
            console.log("CALLER: Peer connection established");
        });
        
        peerConnection.on('close', () => {
            console.log("CALLER: Peer connection closed");
            endCall();
        });
        
        peerConnection.on('error', err => {
            console.error("CALLER: Peer connection error:", err);
            notifications.error("Connection error: " + err.message, "Connection Error");
            endCall();
        });
        
        // 4. Listen for the answer from the receiver at the 'answer' location
        database.ref(`calls/${callId}/answer`).on('value', snapshot => {
            if (snapshot.exists()) {
                const answerData = snapshot.val();
                console.log("CALLER: Answer received:", answerData);
                
                // Stop listening for answers after we get one
                database.ref(`calls/${callId}/answer`).off();
                
                try {
                    peerConnection.signal(answerData);
                } catch (error) {
                    console.error("CALLER: Error processing answer:", error);
                }
            }
        });
        
        // Set up timeout for unanswered call
        callTimeout = setTimeout(() => {
            if (!currentCall) {
                notifications.warning(`${displayName} didn't answer`, "Call Unanswered");
                endCall();
            }
        }, 30000);
    }

    // This function now ONLY shows the incoming call UI. The actual work is in acceptCall.
    function answerCall(callData) {
        if (currentCall) {
            // Already in a call, reject this one by removing it from Firebase
            database.ref(`calls/${callData.callId}`).remove();
            return;
        }
        
        if (!callData || !callData.offer) {
            console.error("Invalid call data received:", callData);
            notifications.error("Invalid call data received", "Call Error");
            return;
        }
        
        incomingCallData = callData;
        
        // Show incoming call modal
        callerName.textContent = callData.fromName || 'Unknown User';
        const avatarText = callData.fromName ? 
            callData.fromName.charAt(0).toUpperCase() : 'U';
        callerAvatar.textContent = avatarText;
        incomingCallModal.classList.add('show');
        
        // Auto-reject after 30 seconds if not answered
        callTimeout = setTimeout(() => {
            if (incomingCallData) {
                rejectCall();
            }
        }, 30000);
    }

    // Accept an incoming call (as the receiver)
    function acceptCall() {
        const callData = incomingCallData;
        if (!callData) return;
        
        // Clear the auto-reject timeout
        if (callTimeout) {
            clearTimeout(callTimeout);
            callTimeout = null;
        }
        
        // Hide the modal
        incomingCallModal.classList.remove('show');
        callStatus.textContent = `Connecting with ${callData.fromName}...`;
        remoteVideoLabel.textContent = callData.fromName;
        
        // Initialize SimplePeer as the receiver (not the initiator)
        peerConnection = new SimplePeer({
            initiator: false,
            trickle: false,
            stream: localStream,
            config: configuration
        });
        
        // 1. When SimplePeer generates a signal (the answer), send it to Firebase
        peerConnection.on('signal', data => {
            console.log("RECEIVER: Sending answer signal:", data);
            database.ref(`calls/${callData.callId}/answer`).set(data);
        });
        
        // 2. When we receive the remote stream, play it
        peerConnection.on('stream', stream => {
            console.log("RECEIVER: Remote stream received");
            remoteStream = stream;
            remoteVideo.srcObject = stream;
            remoteVideo.play().catch(e => console.error("Error playing remote video:", e));
            
            callStatus.textContent = `Connected with ${callData.fromName}`;
            notifications.success(`Connected with ${callData.fromName}`, "Call Connected");
            currentCall = { 
                userId: callData.from, 
                displayName: callData.fromName,
                callId: callData.callId
            };
        });
        
        // 3. Handle connection state changes
        peerConnection.on('connect', () => {
            console.log("RECEIVER: Peer connection established");
        });
        
        peerConnection.on('close', () => {
            console.log("RECEIVER: Peer connection closed");
            endCall();
        });
        
        peerConnection.on('error', err => {
            console.error("RECEIVER: Peer connection error:", err);
            notifications.error("Connection error: " + err.message, "Connection Error");
            endCall();
        });
        
        // 4. Process the offer from the caller
        try {
            console.log("RECEIVER: Processing offer:", callData.offer);
            peerConnection.signal(callData.offer);
        } catch (error) {
            console.error("RECEIVER: Error processing offer:", error);
            endCall();
        }
    }

    // Reject an incoming call
    function rejectCall() {
        if (!incomingCallData) return;
        
        if (callTimeout) {
            clearTimeout(callTimeout);
            callTimeout = null;
        }
        
        incomingCallModal.classList.remove('show');
        
        // Remove the entire call entry from Firebase to signal rejection
        database.ref(`calls/${incomingCallData.callId}`).remove();
        
        incomingCallData = null;
    }

    // End current call
    function endCall() {
        // Clear any pending timeout
        if (callTimeout) {
            clearTimeout(callTimeout);
            callTimeout = null;
        }
        
        const callId = currentCall ? currentCall.callId : null;
        
        if (currentCall) {
            console.log("Ending call with ID:", currentCall.callId);
            
            // Clean up peer connection using SimplePeer's destroy method
            if (peerConnection) {
                peerConnection.destroy();
                peerConnection = null;
            }
            
            // Clean up remote stream
            if (remoteStream) {
                remoteStream.getTracks().forEach(track => track.stop());
                remoteStream = null;
            }
            
            // Clear remote video
            if (remoteVideo) {
                remoteVideo.pause();
                remoteVideo.srcObject = null;
            }

			// Stop screen share stream if active
			if (isScreenSharing && screenShareStream) {
			    screenShareStream.getTracks().forEach(track => track.stop());
			    screenShareStream = null;
			    isScreenSharing = false;
			    
			    if (screenShareVideo) {
			        screenShareVideo.style.display = 'none';
			        screenShareVideo.srcObject = null;
			    }
			    
			    // Update screen share button
			    if (toggleScreenShareBtn) {
			        toggleScreenShareBtn.classList.remove('screen-sharing');
			        toggleScreenShareBtn.textContent = '🖥️';
			    }
			}
            
            remoteVideoLabel.textContent = "Waiting for connection...";
            
            // Remove call data from Firebase
            database.ref(`calls/${currentCall.callId}`).remove();
            
            // Reset state
            currentCall = null;
            callStatus.textContent = "Ready to make calls";
            notifications.info("Call ended", "Call Status");
        }
        
        // Clear any incoming call
        if (incomingCallData) {
            incomingCallData = null;
            incomingCallModal.classList.remove('show');
        }
        
        // If we had a call ID but no currentCall (e.g., call was rejected), clean it up
        if (callId && !currentCall) {
            database.ref(`calls/${callId}`).remove();
        }
    }

    // Toggle mute
    function toggleMute() {
        if (!localStream) return;
        
        isMuted = !isMuted;
        const audioTracks = localStream.getAudioTracks();
        
        audioTracks.forEach(track => {
            track.enabled = !isMuted;
        });
        
        muteBtn.textContent = isMuted ? '🔇' : '🎤';
        muteBtn.classList.toggle('muted', isMuted);
        notifications.info(isMuted ? "Microphone muted" : "Microphone unmuted", "Audio Status");
    }

    // Toggle video
    function toggleVideo() {
        if (!localStream) return;
        
        isVideoOff = !isVideoOff;
        const videoTracks = localStream.getVideoTracks();
        
        videoTracks.forEach(track => {
            track.enabled = !isVideoOff;
        });
        
        videoBtn.textContent = isVideoOff ? '📹' : '📹'; // You might want different icons here
        videoBtn.classList.toggle('muted', isVideoOff);
        notifications.info(isVideoOff ? "Camera turned off" : "Camera turned on", "Video Status");
    }

    // Generate a unique call ID
    function generateCallId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Listen for incoming calls
    function listenForIncomingCalls() {
        database.ref('calls').on('child_added', snapshot => {
            if (snapshot.exists()) {
                const callId = snapshot.key;
                const callData = snapshot.val();
                
                console.log("Incoming call detected:", callData);
                
                // Only handle incoming calls where current user is the recipient
                if (callData.to === currentUser.uid && !currentCall && !incomingCallData) {
                    // Add the callId to the data object for later use
                    callData.callId = callId;
                    
                    // Validate the call data has an offer
                    if (callData.offer && callData.from && callData.fromName) {
                        answerCall(callData);
                    } else {
                        console.error("Invalid call data received (missing offer):", callData);
                        // Clean up invalid call data
                        database.ref(`calls/${callId}`).remove();
                    }
                }
            }
        });
        
        // Also listen for call removals (when a call ends or is rejected)
        database.ref('calls').on('child_removed', snapshot => {
            const callId = snapshot.key;
            
            // If this was our call and it's been removed, end our call
            if (currentCall && currentCall.callId === callId) {
                console.log("Call was removed from Firebase, ending call");
                endCall();
            }
            
            // If this was an incoming call and it's been removed, clear the UI
            if (incomingCallData && incomingCallData.callId === callId) {
                console.log("Incoming call was removed from Firebase");
                incomingCallData = null;
                incomingCallModal.classList.remove('show');
            }
        });
    }

	// Toggle screen sharing
	async function toggleScreenShare() {
	    if (!isCallActive) {
	        notifications.warning("You need to be in a call to share your screen.", "Cannot Share");
	        return;
	    }
	
	    if (isScreenSharing) {
	        // Stop screen sharing
	        if (screenShareStream) {
	            screenShareStream.getTracks().forEach(track => track.stop());
	            screenShareStream = null;
	        }
	        
	        isScreenSharing = false;
	        
	        if (screenShareVideo) {
	            screenShareVideo.style.display = 'none';
	            screenShareVideo.srcObject = null;
	        }
	        
	        // Update screen share button
	        if (toggleScreenShareBtn) {
	            toggleScreenShareBtn.classList.remove('screen-sharing');
	            toggleScreenShareBtn.textContent = '🖥️';
	        }
	        
	        // Remove screen share track from peer connection
	        if (peerConnection) {
	            const sender = peerConnection.getSenders().find(s => 
	                s.track && s.track.kind === 'video' && s.track.label.includes('screen')
	            );
	            if (sender) {
	                peerConnection.removeTrack(sender);
	            }
	            
	            // Add back camera video track if available
	            if (localStream) {
	                const videoTrack = localStream.getVideoTracks()[0];
	                if (videoTrack) {
	                    peerConnection.addTrack(videoTrack, localStream);
	                }
	            }
	        }
	    } else {
	        try {
	            // Start screen sharing
	            screenShareStream = await navigator.mediaDevices.getDisplayMedia({
	                video: true,
	                audio: false
	            });
	            
	            isScreenSharing = true;
	            
	            if (screenShareVideo) {
	                screenShareVideo.srcObject = screenShareStream;
	                screenShareVideo.style.display = 'block';
	            }
	            
	            // Update screen share button
	            if (toggleScreenShareBtn) {
	                toggleScreenShareBtn.classList.add('screen-sharing');
	                toggleScreenShareBtn.textContent = '⏹️';
	            }
	            
	            // Replace camera video with screen share in peer connection
	            if (peerConnection) {
	                const sender = peerConnection.getSenders().find(s => 
	                    s.track && s.track.kind === 'video' && !s.track.label.includes('screen')
	                );
	                if (sender) {
	                    peerConnection.removeTrack(sender);
	                }
	                
	                // Add screen share track
	                const screenTrack = screenShareStream.getVideoTracks()[0];
	                if (screenTrack) {
	                    peerConnection.addTrack(screenTrack, screenShareStream);
	                }
	            }
	            
	            // Handle screen share end
	            screenShareStream.getVideoTracks()[0].addEventListener('ended', () => {
	                toggleScreenShare();
	            });
	            
	        } catch (error) {
	            console.error("Error starting screen share:", error);
	            notifications.error("Could not share your screen.", "Screen Share Error");
	        }
	    }
	}
	
    // ====================================================================================================
    // EVENT LISTENERS
    // ====================================================================================================
    
    // Auth tab switching
    if (guestTab) guestTab.addEventListener('click', () => switchAuthTab('guest'));
    if (accountTab) accountTab.addEventListener('click', () => switchAuthTab('account'));
    if (showSignup) showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthPanel('signup');
    });
    if (showLogin) showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthPanel('login');
    });
    if (resetPasswordBtn) resetPasswordBtn.addEventListener('click', resetPassword);

    // Auth functionality
    if (guestLoginBtn) guestLoginBtn.addEventListener('click', loginAsGuest);
    if (loginBtn) loginBtn.addEventListener('click', loginWithEmail);
    if (signupBtn) signupBtn.addEventListener('click', signUp);
    if (setUsernameBtn) setUsernameBtn.addEventListener('click', setUsername);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    // Email verification button
    if (verifyEmailBtn) {
        verifyEmailBtn.addEventListener('click', sendEmailVerification);
    }
    
    // Allow Enter key to login from password field
    if (passwordInput) passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (loginBtn) loginBtn.click();
        }
    });

    // Allow Enter key to sign up from password field
    if (displayName) displayName.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (signupBtn) signupBtn.click();
        }
    });

    // Allow Enter key to set username from username field
    if (chooseUsername) chooseUsername.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (setUsernameBtn) setUsernameBtn.click();
        }
    });
    
    // Allow Enter key to join as guest from the username field
    if (guestUsername) guestUsername.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (guestLoginBtn) guestLoginBtn.click();
        }
    });
    
    // Call controls
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);
    if (videoBtn) videoBtn.addEventListener('click', toggleVideo);
    if (endCallBtn) endCallBtn.addEventListener('click', endCall);
	if (toggleScreenShareBtn) toggleScreenShareBtn.addEventListener('click', toggleScreenShare);

	// Call modal event listeners
	if (acceptCallBtn) acceptCallBtn.addEventListener('click', acceptCall);
	if (rejectCallBtn) rejectCallBtn.addEventListener('click', rejectCall);
    
    // Mobile menu toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 480 && 
            sidebar && !sidebar.contains(e.target) && 
            mobileMenuToggle && !mobileMenuToggle.contains(e.target) && 
            sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });

    // Collapse toggle listeners
    document.querySelectorAll('.collapse-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const sectionId = toggle.dataset.section;
            toggleSection(sectionId);
        });
    });

    // Section header click to toggle
    document.querySelectorAll('.section-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.classList.contains('collapse-toggle')) {
                return;
            }
            const section = header.closest('.collapsible-section');
            if (section) {
                toggleSection(section.id);
            }
        });
    });
    
    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
        console.log("🔐 Auth state changed!");
        console.log("🔐 User object:", user);

        if (user) {
            currentUser = user;
            setupUser();
        } else {
            currentUser = null;
            authContainer.style.display = 'flex';
            appMain.style.display = 'none';
        }
    });
    
    // Initialize collapsed sections
    initCollapsedSections();
    applyCollapsedStates();
	
    // ====================================================================================================
    // DEBUGGING
    // ====================================================================================================
	
	// Debug remote media
	function debugRemoteMedia() {
		if (remoteVideo && remoteVideo.srcObject) {
			const stream = remoteVideo.srcObject;
			console.log("Remote video debug:", {
				hasStream: !!stream,
				streamActive: stream && stream.active,
				audioTracks: stream ? stream.getAudioTracks().length : 0,
				videoTracks: stream ? stream.getVideoTracks().length : 0,
				videoElementState: remoteVideo.readyState,
				videoElementPaused: remoteVideo.paused,
				currentTime: remoteVideo.currentTime
			});
		}
	}
	
	// Brother asked a very good question
	function monitorVideoElement() {
		if (!remoteVideo || !currentCall) return;
		
		console.log("Video element state:", {
			readyState: remoteVideo.readyState,
			networkState: remoteVideo.networkState,
			paused: remoteVideo.paused,
			ended: remoteVideo.ended,
			currentTime: remoteVideo.currentTime,
			duration: remoteVideo.duration,
			error: remoteVideo.error
		});
		
		// If the video element is in an error state, try to recover
		if (remoteVideo.error) {
			console.error("Video element error:", remoteVideo.error);
			console.log("Attempting to recover from video error");
			
			// Clear the error and reload
			remoteVideo.srcObject = remoteVideo.srcObject;
			remoteVideo.load();
		}
	}

	// Update the debug interval to use this new function
	setInterval(() => {
		if (currentCall) {
			debugRemoteMedia();
			monitorVideoElement();
		}
	}, 2000);

	// Call periodically to debug
	setInterval(() => {
		if (currentCall) {
			debugRemoteMedia();
		}
	}, 2000);

});
