// アプリケーション開始
document.addEventListener('DOMContentLoaded', function() {
    const viewModel = new ChartViewModel();
    ko.applyBindings(viewModel);
    viewModel.initialize();

    // Google Identity Services コールバック
    window.handleCredentialResponse = function(response) {
        // ローディング開始
        viewModel.showLoading('ログイン中...');

        // Send credential to server for verification
        fetch(API_ENDPOINTS.login, {
            method: 'POST',
            credentials: 'include', // Include cookies
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credential: response.credential
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.user) {
                currentUser = data.user;

                viewModel.isAuthenticated(true);
                viewModel.userName(currentUser.name);
                viewModel.userEmail(currentUser.email);

                viewModel.loadCharts();
                // Automatically create a new chart after login
                viewModel.createNewChart();
                viewModel.showSuccess('ログインしました');
            } else {
                viewModel.showError('ログインに失敗しました: ' + (data.error || '不明なエラー'));
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            viewModel.showError('ログインに失敗しました');
        })
        .finally(() => {
            // ローディング終了
            viewModel.hideLoading();
        });
    };

    // サインアウト
    window.signOut = function() {
        // ローディング開始
        viewModel.showLoading('ログアウト中...');

        fetch(API_ENDPOINTS.logout, {
            method: 'POST',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                google.accounts.id.disableAutoSelect();

                currentUser = null;
                authToken = null;

                viewModel.isAuthenticated(false);
                viewModel.userName('');
                viewModel.userEmail('');
                viewModel.savedCharts([]);
                viewModel.currentChart(null);
                viewModel.showSuccess('ログアウトしました');

                // ページをリロードして認証状態をリセット
                setTimeout(() => location.reload(), 1000);
            } else {
                viewModel.showError('ログアウトに失敗しました');
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
            // Even if server logout fails, clear client state
            google.accounts.id.disableAutoSelect();
            currentUser = null;
            authToken = null;

            viewModel.isAuthenticated(false);
            viewModel.userName('');
            viewModel.userEmail('');
            viewModel.savedCharts([]);
            viewModel.currentChart(null);

            setTimeout(() => location.reload(), 1000);
        })
        .finally(() => {
            // ローディング終了
            viewModel.hideLoading();
        });
    };

    // 初期化状態管理
    let isGoogleSignInInitialized = false;
    let isGoogleApiReady = false;

    // Google Script onload callback
    window.googleScriptLoaded = function() {
        isGoogleApiReady = true;
        // すぐに初期化を試行
        initializeGoogleSignInImmediately();
    };

    // 最適化されたGoogle API待機関数
    function waitForGoogleAPI() {
        return new Promise((resolve, reject) => {
            // 既にAPIが利用可能な場合
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                resolve();
                return;
            }

            // スクリプトが読み込まれている場合の短時間待機
            let attempts = 0;
            const maxAttempts = 20; // 1秒間待機 (20 × 50ms)

            const checkAPI = () => {
                attempts++;
                if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Google API not available after waiting 1 second'));
                } else {
                    setTimeout(checkAPI, 50); // 50ms間隔に短縮
                }
            };

            checkAPI();
        });
    }

    // 即座にGoogle Sign-Inを初期化（重複防止付き）
    function initializeGoogleSignInImmediately() {
        if (isGoogleSignInInitialized) {
            return; // 既に初期化済みの場合は何もしない
        }

        if (!window.GOOGLE_CLIENT_ID || window.GOOGLE_CLIENT_ID === '') {
            console.error('Google Client ID is not set');
            return;
        }

        waitForGoogleAPI()
            .then(() => {
                isGoogleSignInInitialized = true;

                // 初期化
                google.accounts.id.initialize({
                    client_id: window.GOOGLE_CLIENT_ID,
                    callback: handleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });

                // ボタン描画
                const buttonDiv = document.getElementById('google-signin-button');
                if (buttonDiv) {
                    google.accounts.id.renderButton(buttonDiv, {
                        theme: 'filled_blue',
                        size: 'large',
                        type: 'standard',
                        width: 280
                    });
                    console.log('Google Sign-In button rendered successfully');
                } else {
                    console.warn('Google Sign-In button container not found');
                }
            })
            .catch(error => {
                console.error('Google Sign-In setup failed:', error);
                // フォールバック: 500ms後に再試行
                setTimeout(() => {
                    isGoogleSignInInitialized = false;
                    initializeGoogleSignInImmediately();
                }, 500);
            });
    }

    // レガシー用の初期化関数（後方互換性のため保持）
    function initializeGoogleSignIn() {
        return initializeGoogleSignInImmediately();
    }

    // 最適化された初期化: 即座に実行、フォールバック付き
    function optimizedGoogleSignInInit() {
        // 即座に初期化を試行
        initializeGoogleSignInImmediately();

        // フォールバック: 200ms後にもう一度試行（DOM準備が遅い場合）
        setTimeout(() => {
            if (!isGoogleSignInInitialized) {
                initializeGoogleSignInImmediately();
            }
        }, 200);
    }

    // DOMContentLoaded時に即座に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', optimizedGoogleSignInInit);
    } else {
        // 既にDOMが準備済みの場合は即座に実行
        optimizedGoogleSignInInit();
    }

    // ウィンドウリサイズ時の再描画
    window.addEventListener('resize', function() {
        setTimeout(() => viewModel.renderMermaid(), 200);
    });
});
