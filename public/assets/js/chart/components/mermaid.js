const mermaidComponent = {
    renderMermaid: function() {
        try {
            let code = this.currentMermaidCode();

            if (!code || code.trim() === '') {
                this.mermaidHtml('<div class="text-muted text-center p-5">フローチャートコードを入力してください</div>');
                return;
            }

            code = code.replace(/\\n/g, '\n');

            const element = document.createElement('div');
            element.className = 'mermaid';
            element.textContent = code;

            mermaid.render('mermaid-svg', code)
                .then(result => {
                    const containerHtml = `<div class="mermaid-container" style="transform: scale(${this.zoomLevel()}) translate(${this.panX()}px, ${this.panY()}px);">${result.svg}</div>`;
                    this.mermaidHtml(containerHtml);

                    setTimeout(() => {
                        this.setupZoomAndPan();
                        this.setupNodeClickHandlers();
                        this.updateNodeSelection();
                    }, 100);
                })
                .catch(error => {
                    console.error('Mermaidレンダリングエラー:', error);
                    this.mermaidHtml('<div class="text-danger text-center p-5">フローチャートの構文にエラーがあります</div>');
                });
        } catch (error) {
            console.error('renderMermaid例外:', error);
            this.mermaidHtml('<div class="text-danger text-center p-5">フローチャートの構文にエラーがあります</div>');
        }
    }
};
