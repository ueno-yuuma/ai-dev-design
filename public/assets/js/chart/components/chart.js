const chartComponent = {
    loadCharts: function() {
        if (!this.isAuthenticated()) return;

        this.isLoading(true);

        this.apiCall(API_ENDPOINTS.charts)
            .then(data => {
                if (data.success) {
                    this.savedCharts(data.data || []);
                }
            })
            .catch(error => {
                console.error('チャート読み込みエラー:', error);
            })
            .finally(() => {
                this.isLoading(false);
            });
    },
    createNewChart: function() {
        const newChart = {
            id: null,
            title: '新しいフローチャート',
            content: 'graph TD\n    A[開始] --> B[処理]\n    B --> C[終了]',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.currentChart(newChart);
        this.currentChartTitle(newChart.title);
        this.currentMermaidCode(newChart.content);
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
        this.currentChart(chart);
        this.currentChartTitle(chart.title);
        this.currentMermaidCode(chart.content);
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
