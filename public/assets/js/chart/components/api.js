const apiComponent = {
    apiCall: function(url, options = {}) {
        const self = this;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies for authentication
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };

        return fetch(url, mergedOptions)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        // Unauthorized - redirect to login
                        self.isAuthenticated(false);
                        self.userName('');
                        self.userEmail('');
                        currentUser = null;
                        throw new Error('認証が必要です。再度ログインしてください。');
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .catch(error => {
                self.showError(`API呼び出しエラー: ${error.message}`);
                throw error;
            });
    },

    generateGroupName: function(nodeLabels) {
        const url = '/api/generate_name'; // The new route
        const options = {
            method: 'POST',
            body: JSON.stringify({ node_labels: nodeLabels })
        };

        return this.apiCall(url, options)
            .then(data => {
                if (data && data.group_name) {
                    return data.group_name;
                } else {
                    throw new Error('APIからグループ名が返されませんでした。');
                }
            });
    }
};
