const importExportComponent = {
    exportChart: function() {
        if (!this.currentChart()) {
            this.showError('エクスポートするチャートがありません');
            return;
        }

        const dataStr = JSON.stringify({
            title: this.currentChartTitle(),
            mermaidCode: this.currentMermaidCode(),
            exportedAt: new Date().toISOString()
        }, null, 2);

        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.currentChartTitle()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showSuccess('チャートをエクスポートしました');
    },
    importChart: function() {
        // デバウンス・処理中チェック
        if (!this.isActionAllowed() || this.isLoading() || this.isRendering()) {
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.title && data.mermaidCode) {
                            const importedChart = {
                                id: null,
                                title: data.title + ' (インポート)',
                                content: data.mermaidCode,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            };

                            this.currentChart(importedChart);
                            this.currentChartTitle(importedChart.title);
                            this.currentMermaidCode(importedChart.content);
                            this.addToHistory();
                            this.renderMermaid();
                            this.showSuccess('チャートをインポートしました');
                        } else {
                            this.showError('無効なファイル形式です');
                        }
                    } catch (error) {
                        this.showError('ファイルの読み込みに失敗しました');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
};
