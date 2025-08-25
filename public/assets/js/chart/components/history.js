const historyComponent = {
    addToHistory: function(description = '操作') {
        const state = {
            title: this.currentChartTitle(),
            code: this.currentMermaidCode(),
            description: description,
            timestamp: Date.now()
        };

        if (this.historyIndex < this.history.length - 1) {
            this.history.splice(this.historyIndex + 1);
        }

        this.history.push(state);
        this.historyIndex = this.history.length - 1;

        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    },
    undo: function() {
        if (this.historyIndex < 1 || this.history.length < 2) {
            this.showError('これ以上元に戻せません');
            return;
        }

        this.historyIndex--;
        const state = this.history[this.historyIndex];

        this.restoreState(state);
        this.showSuccess(`元に戻しました: ${state.description}`);
    },
    redo: function() {
        if (this.historyIndex >= this.history.length - 1) {
            this.showError('これ以上やり直せません');
            return;
        }

        this.historyIndex++;
        const state = this.history[this.historyIndex];

        this.restoreState(state);
        this.showSuccess(`やり直しました: ${state.description}`);
    },
    restoreState: function(state) {
        const originalAddToHistory = this.addToHistory;
        this.addToHistory = function() {};

        try {
            this.currentChartTitle(state.title);
            this.currentMermaidCode(state.code);
        } catch (error) {
            console.error('状態復元エラー:', error);
            this.showError('状態復元中にエラーが発生しました');
        } finally {
            this.addToHistory = originalAddToHistory;
        }
    }
};
