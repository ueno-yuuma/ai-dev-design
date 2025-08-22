const mermaidComponent = {
    renderMermaid: function() {
        // レンダリング中の重複実行を防止
        if (this.isRendering()) {
            return;
        }
        this.isRendering(true);
        
        try {
            let code = this.currentMermaidCode();

            if (!code || code.trim() === '') {
                this.mermaidHtml('<div class="text-muted text-center p-5">フローチャートコードを入力してください</div>');
                this.isRendering(false);
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

                    // レンダリング完了後にイベントハンドラーを設定
                    setTimeout(() => {
                        this.setupZoomAndPan();
                        this.setupNodeClickHandlers();
                        this.updateNodeSelection();
                        this.adjustSubgraphLabels();
                        this.isRendering(false); // レンダリング完了
                    }, 100);
                })
                .catch(error => {
                    console.error('Mermaidレンダリングエラー:', error);
                    this.mermaidHtml('<div class="text-danger text-center p-5">フローチャートの構文にエラーがあります</div>');
                    this.isRendering(false); // エラー時もフラグをリセット
                });
        } catch (error) {
            console.error('renderMermaid例外:', error);
            this.mermaidHtml('<div class="text-danger text-center p-5">フローチャートの構文にエラーがあります</div>');
            this.isRendering(false); // 例外時もフラグをリセット
        }
    },

    adjustSubgraphLabels: function() {
        const mermaidContainer = document.querySelector('.mermaid-container');
        if (!mermaidContainer) return;

        // subgraphのクラスター要素を取得し、ネストレベル順にソート
        const clusters = Array.from(mermaidContainer.querySelectorAll('g.cluster'));
        const clusterInfo = this.analyzeClusterHierarchy(clusters);
        
        clusters.forEach(cluster => {
            const titleElement = cluster.querySelector('text');
            const rectElement = cluster.querySelector('rect');
            
            if (titleElement && rectElement) {
                const clusterId = cluster.id;
                const nestLevel = clusterInfo[clusterId]?.nestLevel || 0;
                
                // rectの位置とサイズを取得
                const rect = rectElement.getBBox();
                
                // ネストレベルに応じてタイトル位置を調整
                const verticalOffset = 15 + (nestLevel * 5); // ネストレベルごとに5px下げる
                const fontSize = Math.max(12, 16 - (nestLevel * 1)); // ネストが深いほど小さく
                
                // タイトルの位置を調整
                titleElement.setAttribute('x', rect.x + rect.width / 2);
                titleElement.setAttribute('y', rect.y + verticalOffset);
                titleElement.setAttribute('text-anchor', 'middle');
                titleElement.setAttribute('dominant-baseline', 'hanging');
                
                // ネストレベルに応じたスタイルを適用
                const colors = ['#2c3e50', '#34495e', '#5d6d7e', '#85929e'];
                const fillColor = colors[Math.min(nestLevel, colors.length - 1)];
                
                titleElement.style.fill = fillColor;
                titleElement.style.fontWeight = nestLevel === 0 ? '700' : '600';
                titleElement.style.fontSize = `${fontSize}px`;
                titleElement.style.stroke = 'white';
                titleElement.style.strokeWidth = nestLevel === 0 ? '4' : '3';
                titleElement.style.paintOrder = 'stroke fill';
                
                // ネストしたサブグラフの場合、背景を少し透明にする
                if (nestLevel > 0) {
                    rectElement.style.fillOpacity = Math.max(0.1, 0.3 - (nestLevel * 0.05));
                }
            }
        });
    },

    analyzeClusterHierarchy: function(clusters) {
        const clusterInfo = {};
        
        clusters.forEach(cluster => {
            const rect = cluster.querySelector('rect');
            if (!rect) return;
            
            const clusterRect = rect.getBBox();
            let nestLevel = 0;
            
            // 他のクラスターに含まれているかチェック
            clusters.forEach(otherCluster => {
                if (cluster === otherCluster) return;
                
                const otherRect = otherCluster.querySelector('rect');
                if (!otherRect) return;
                
                const otherClusterRect = otherRect.getBBox();
                
                // このクラスターが他のクラスター内に含まれているかチェック
                if (clusterRect.x > otherClusterRect.x &&
                    clusterRect.y > otherClusterRect.y &&
                    clusterRect.x + clusterRect.width < otherClusterRect.x + otherClusterRect.width &&
                    clusterRect.y + clusterRect.height < otherClusterRect.y + otherClusterRect.height) {
                    nestLevel++;
                }
            });
            
            clusterInfo[cluster.id] = {
                nestLevel: nestLevel,
                rect: clusterRect
            };
        });
        
        return clusterInfo;
    }
};
