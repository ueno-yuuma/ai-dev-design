const loadingComponent = {
    // ローディング状態の管理
    isLoading: ko.observable(false),
    loadingMessage: ko.observable('読み込み中...'),

    // ローディング表示の制御
    showLoading: function(message = '読み込み中...') {
        this.loadingMessage(message);
        this.isLoading(true);
    },

    hideLoading: function() {
        this.isLoading(false);
        this.loadingMessage('読み込み中...');
    },

    // ログイン専用のローディング表示
    showLoginLoading: function() {
        this.showLoading('ログイン中...');
    },

    // ログアウト専用のローディング表示
    showLogoutLoading: function() {
        this.showLoading('ログアウト中...');
    },

    // 認証状態確認のローディング表示
    showAuthCheckLoading: function() {
        this.showLoading('認証状態を確認中...');
    }
};