const authComponent = {
    checkAuthStatus: function() {
        const self = this;
        // ローディング開始
        self.showLoading('認証状態を確認中...');

        // Check authentication status from server
        fetch(API_ENDPOINTS.authStatus, {
            method: 'GET',
            credentials: 'include' // Include cookies
        })
        .then(response => response.json())
        .then(data => {
            if (data.authenticated && data.user) {
                self.isAuthenticated(true);
                self.userName(data.user.name);
                self.userEmail(data.user.email);
                currentUser = data.user;

                // Load charts after authentication confirmed
                // 認証成功後の処理を実行
                self.handlePostAuthSuccess();
            } else {
                self.isAuthenticated(false);
                self.userName('');
                self.userEmail('');
                currentUser = null;
            }
        })
        .catch(error => {
            console.error('Error checking auth status:', error);
            self.isAuthenticated(false);
            self.userName('');
            self.userEmail('');
            currentUser = null;
        })
        .finally(() => {
            // ローディング終了
            self.hideLoading();
        });
    },
    logout: function() {
        if (typeof signOut === 'function') {
            signOut();
        } else {
            // Fallback to server-side logout
            fetch(API_ENDPOINTS.logout, {
                method: 'POST',
                credentials: 'include'
            })
            .then(() => {
                currentUser = null;
                authToken = null;

                this.isAuthenticated(false);
                this.userName('');
                this.userEmail('');
                this.savedCharts([]);
                this.currentChart(null);
                this.showSuccess('ログアウトしました');

                const reloadDelay = (typeof APP_CONSTANTS !== 'undefined') ? 
                    APP_CONSTANTS.DELAYS.RELOAD_DELAY : 1000;
                setTimeout(() => location.reload(), reloadDelay);
            })
            .catch(() => {
                // Even if server logout fails, clear client state
                currentUser = null;
                authToken = null;

                this.isAuthenticated(false);
                this.userName('');
                this.userEmail('');
                this.savedCharts([]);
                this.currentChart(null);

                const reloadDelay = (typeof APP_CONSTANTS !== 'undefined') ? 
                    APP_CONSTANTS.DELAYS.RELOAD_DELAY : 1000;
                setTimeout(() => location.reload(), reloadDelay);
            });
        }
    }
};
