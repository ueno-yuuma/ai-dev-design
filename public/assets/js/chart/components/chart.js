const chartComponent = {
    isActionAllowed: function() {
        const now = Date.now();
        if (now - this.lastActionTime < this.actionDebounceDelay) {
            return false;
        }
        this.lastActionTime = now;
        return true;
    },
    loadCharts: async function() {
        if (!this.isAuthenticated()) return Promise.resolve();

        this.isLoading(true);

        try {
            const data = await this.apiCall(API_ENDPOINTS.charts);
            if (data.success) {
                this.savedCharts(data.data || []);
            }
            return data;
        } catch (error) {
            console.error('チャート読み込みエラー:', error);
            throw error;
        } finally {
            this.isLoading(false);
        }
    },
    createNewChart: function(options = {}) {
        const { ignoreStateCheck = false } = options;
        
        // デバウンス・処理中チェック（状態無視の場合はスキップ）
        if (!ignoreStateCheck && (!this.isActionAllowed() || this.isLoading() || this.isRendering())) {
            return;
        }

        this._createNewChartInternal();
    },

    // 内部メソッド: 実際のチャート作成処理
    _createNewChartInternal: function() {
        const newChart = {
            id: null,
            title: '新しいフローチャート',
            content: DEFAULT_CHART_CONTENT,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.currentChart(newChart);
        this.currentChartTitle(newChart.title);
        this.currentMermaidCode(newChart.content);
        this.resetChangeTracking();
        this.addToHistory();
        this.renderMermaid();
        this.showSuccess('新しいチャートを作成しました');
    },

    saveChart: function() {
        if (!this.currentChart()) {
            this.showError('保存するチャートがありません');
            return;
        }

        this.isLoading(true);

        const chartData = {
            title: this.currentChartTitle(),
            content: this.currentMermaidCode()
        };

        const isUpdate = this.currentChart().id;
        const url = isUpdate ? API_ENDPOINTS.chart(this.currentChart().id) : API_ENDPOINTS.charts;
        const method = isUpdate ? 'PUT' : 'POST';

        this.apiCall(url, {
            method: method,
            body: JSON.stringify(chartData)
        })
        .then(data => {
            if (data.success) {
                this.currentChart(data.data);
                this.resetChangeTracking();
                this.loadCharts();
                this.showSuccess(isUpdate ? 'チャートを更新しました' : 'チャートを保存しました');
            }
        })
        .catch(error => {
            console.error('チャート保存エラー:', error);
        })
        .finally(() => {
            this.isLoading(false);
        });
    },
    loadChart: function(chart) {
        // デバウンス・処理中チェック
        if (!this.isActionAllowed() || this.isLoading() || this.isRendering()) {
            return;
        }

        // 同じチャートの重複読み込みを防止
        if (this.currentChart() && this.currentChart().id === chart.id) {
            return;
        }

        this.currentChart(chart);
        this.currentChartTitle(chart.title);
        this.currentMermaidCode(chart.content);
        this.resetChangeTracking();
        this.addToHistory();
        this.renderMermaid();
        this.showSuccess(`「${chart.title}」を読み込みました`);
    },
    deleteChart: function(chart) {
        if (!confirm(`「${chart.title}」を削除しますか？`)) {
            return;
        }

        this.isLoading(true);

        this.apiCall(API_ENDPOINTS.chart(chart.id), {
            method: 'DELETE'
        })
        .then(data => {
            if (data.success) {
                this.loadCharts();
                if (this.currentChart() && this.currentChart().id === chart.id) {
                    this.currentChart(null);
                    this.currentChartTitle('');
                    this.currentMermaidCode('');
                    this.mermaidHtml('');
                }
                this.showSuccess('チャートを削除しました');
            }
        })
        .catch(error => {
            console.error('チャート削除エラー:', error);
        })
        .finally(() => {
            this.isLoading(false);
        });
    }
};
