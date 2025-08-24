const nodeComponent = {
    setupNodeClickHandlers: function() {
        const mermaidContainer = document.querySelector('#mermaid-display .mermaid-container');
        if (!mermaidContainer) return;

        const nodes = mermaidContainer.querySelectorAll('g.node');

        nodes.forEach(node => {
            node.removeEventListener('click', this.handleNodeClick);

            node.addEventListener('mousedown', (e) => {
                if (e.button === 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.startNodeDrag(e, node);
                }
            });

            node.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleNodeRightClick(e, node);
            });

            node.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            node.addEventListener('drop', (e) => {
                e.preventDefault();
                this.handleNodeDrop(e, node);
            });

            node.addEventListener('mouseenter', () => {
                if (!this.isDragging() && !this.isNodeDragging()) {
                    node.style.cursor = 'pointer';
                }
            });

            node.addEventListener('mouseleave', () => {
                if (!this.isDragging() && !this.isNodeDragging()) {
                    node.style.cursor = 'default';
                }
            });
        });

        document.addEventListener('click', (e) => this.handleDocumentClick(e));

        const mermaidDisplay = document.getElementById('mermaid-display');
        if (mermaidDisplay) {
            mermaidDisplay.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                
                // ノードがクリックされていない場合、サブグラフのクリックを検出
                const target = e.target;
                const isNode = target.closest('g.node');
                
                if (!isNode) {
                    const rect = mermaidDisplay.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    const subgraphInfo = this.detectSubgraphClick(x, y);
                    if (subgraphInfo) {
                        this.handleSubgraphRightClick(e, subgraphInfo);
                    } else {
                        // 空の場所のクリック
                        this.hideContextMenu();
                        this.clearNodeSelection();
                        this.clearMultiSelection();
                    }
                }
            });
        }
    },
    handleNodeRightClick: function(event, nodeElement) {
        const nodeId = this.extractNodeId(nodeElement);
        if (!nodeId) return;

        const isNodeInSelection = this.selectedNodes().indexOf(nodeId) !== -1;

        if (!isNodeInSelection) {
            this.clearNodeSelection();
            this.selectedNodeId(nodeId);
            this.selectedNodeElement = nodeElement;
            this.highlightSelectedNode(nodeElement);

            this.clearMultiSelection();
            this.addNodeToSelection(nodeId);
        }

        this.showContextMenu(event.clientX, event.clientY);
    },
    handleSubgraphRightClick: function(event, subgraphInfo) {
        // ノード選択をクリア
        this.clearNodeSelection();
        this.clearMultiSelection();
        
        // サブグラフ情報を設定
        this.currentSubgraph(subgraphInfo);
        
        // サブグラフ用コンテキストメニューを表示
        this.showSubgraphContextMenu(event.clientX, event.clientY);
    },
    extractNodeId: function(nodeElement) {
        const id = nodeElement.id;
        if (id && id.startsWith('flowchart-')) {
            return id.replace('flowchart-', '').split('-')[0];
        }
        return null;
    },
    clearNodeSelection: function() {
        const prevSelected = document.querySelector('.node-rect.highlighted, .node-circle.highlighted, .node-diamond.highlighted, .node-hexagon.highlighted');
        if (prevSelected) {
            prevSelected.classList.remove('highlighted');
        }
        this.selectedNodeId(null);
        this.selectedNodeElement = null;
    },
    highlightSelectedNode: function(nodeElement) {
        const shapes = nodeElement.querySelectorAll('rect, circle, polygon, path');
        shapes.forEach(shape => {
            if (shape.classList.contains('node-rect') ||
                shape.classList.contains('node-circle') ||
                shape.classList.contains('node-diamond') ||
                shape.classList.contains('node-hexagon') ||
                shape.getAttribute('class')?.includes('node')) {
                shape.classList.add('highlighted');
            }
        });
    },
    deleteSelectedNode: function() {
        if (!this.selectedNodeId()) {
            this.showError('削除するノードが選択されていません');
            return;
        }

        const nodeText = this.getNodeText(this.selectedNodeId());
        this.removeNodeFromMermaidCode(this.selectedNodeId());
        this.addToHistory(`ノード削除: ${nodeText}`);
        this.hideContextMenu();
        this.clearNodeSelection();
        this.showSuccess('ノードを削除しました');
    },
    getNodeText: function(nodeId) {
        const code = this.currentMermaidCode();
        const regex = new RegExp(nodeId + '\\[([^\\]]+)\\]', 'g');
        const match = regex.exec(code);
        return match ? match[1] : nodeId;
    },
    getNodeInfo: function(nodeId) {
        const code = this.currentMermaidCode();

        let regex = new RegExp(nodeId + '\\[([^\\]]+)\\]', 'g');
        let match = regex.exec(code);
        if (match) return { text: match[1], shape: 'rect' };

        regex = new RegExp(nodeId + '\\(([^\\)]+)\\)', 'g');
        match = regex.exec(code);
        if (match) return { text: match[1], shape: 'round' };

        regex = new RegExp(nodeId + '\\{([^\\}]+)\\}', 'g');
        match = regex.exec(code);
        if (match) return { text: match[1], shape: 'diamond' };

        regex = new RegExp(nodeId + '\\[\\[([^\\]]+)\\]\\]', 'g');
        match = regex.exec(code);
        if (match) return { text: match[1], shape: 'hexagon' };

        return null;
    },
    updateNodeText: function(nodeId, newText) {
        let code = this.currentMermaidCode();

        const patterns = [
            { regex: new RegExp(nodeId + '\\[([^\\]]+)\\]', 'g'), replacement: `${nodeId}[${newText}]` },
            { regex: new RegExp(nodeId + '\\(([^\\)]+)\\)', 'g'), replacement: `${nodeId}(${newText})` },
            { regex: new RegExp(nodeId + '\\{([^\\}]+)\\}', 'g'), replacement: `${nodeId}{${newText}}` },
            { regex: new RegExp(nodeId + '\\[\\[([^\\]]+)\\]\\]', 'g'), replacement: `${nodeId}[[${newText}]]` }
        ];

        patterns.forEach(pattern => {
            code = code.replace(pattern.regex, pattern.replacement);
        });

        this.currentMermaidCode(code);
    },
    changeNodeShape: function(nodeId, newShape) {
        let code = this.currentMermaidCode();
        const nodeInfo = this.getNodeInfo(nodeId);
        if (!nodeInfo) return;

        const currentPatterns = [
            new RegExp(nodeId + '\\[[^\\]]+\\]', 'g'),
            new RegExp(nodeId + '\\([^\\)]+\\)', 'g'),
            new RegExp(nodeId + '\\{[^\\}]+\\}', 'g'),
            new RegExp(nodeId + '\\[\\[[^\\]]+\\]\\]', 'g')
        ];

        currentPatterns.forEach(pattern => {
            code = code.replace(pattern, '');
        });

        const shapes = {
            'rect': `${nodeId}[${nodeInfo.text}]`,
            'round': `${nodeId}(${nodeInfo.text})`,
            'diamond': `${nodeId}{${nodeInfo.text}}`,
            'hexagon': `${nodeId}[[${nodeInfo.text}]]`
        };

        const newNodeDef = shapes[newShape];
        if (newNodeDef) {
            code = code.replace(/graph (TD|LR)\s*\n/, `graph LR\n    ${newNodeDef}\n`);
        }

        this.currentMermaidCode(code);
    },
    removeNodeFromMermaidCode: function(nodeId) {
        let code = this.currentMermaidCode();
        const lines = code.split('\n');
        const resultLines = [];

        // 正確なnode IDのエスケープ
        const escapedNodeId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            let shouldSkip = false;
            
            // ノード定義行をスキップ
            const nodeDefPatterns = [
                new RegExp(`^\\s*${escapedNodeId}\\[[^\\]]+\\]\\s*$`),
                new RegExp(`^\\s*${escapedNodeId}\\([^\\)]+\\)\\s*$`),
                new RegExp(`^\\s*${escapedNodeId}\\{[^\\}]+\\}\\s*$`),
                new RegExp(`^\\s*${escapedNodeId}\\[\\[[^\\]]+\\]\\]\\s*$`)
            ];
            
            for (const pattern of nodeDefPatterns) {
                if (pattern.test(line)) {
                    shouldSkip = true;
                    break;
                }
            }
            
            // 接続行をスキップ（該当ノードを含む行）
            if (!shouldSkip && trimmedLine.includes('-->')) {
                const connectionPatterns = [
                    new RegExp(`\\b${escapedNodeId}\\s*-->`),
                    new RegExp(`-->\\s*${escapedNodeId}\\b`)
                ];
                
                for (const pattern of connectionPatterns) {
                    if (pattern.test(trimmedLine)) {
                        shouldSkip = true;
                        break;
                    }
                }
            }
            
            if (!shouldSkip) {
                resultLines.push(line);
            }
        }

        this.currentMermaidCode(resultLines.join('\n'));
    },
    updateNode: function() {
        this.editNode();
    },
    deleteNode: function() {
        this.deleteSelectedNode();
    },
    addNodeToChart: function(nodeType) {
        const nodeId = 'node_' + Date.now();
        const nodeLabel = this.getNodeLabel(nodeType);

        let currentCode = this.currentMermaidCode();

        if (currentCode.includes('graph TD') || currentCode.includes('graph LR')) {
            currentCode += `\n    ${nodeId}[${nodeLabel}]`;
        } else {
            currentCode = `graph LR\n    ${nodeId}[${nodeLabel}]`;
        }

        this.currentMermaidCode(currentCode);
        this.addToHistory();
        this.renderMermaid();
        this.showSuccess(`${nodeLabel}ノードを追加しました`);
    },
    getNodeLabel: function(nodeType) {
        const typeMap = {
            'start': '開始',
            'process': '処理',
            'decision': '判定',
            'end': '終了',
            'input': '入力',
            'output': '出力'
        };
        return typeMap[nodeType] || '処理';
    },
    
    getNodeConnections: function(nodeId) {
        const code = this.currentMermaidCode();
        const lines = code.split('\n');
        
        const incoming = [];
        const outgoing = [];
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.includes('-->')) {
                const match = trimmed.match(/^([^-]+)-->(.+)$/);
                if (match) {
                    let source = match[1].trim();
                    let target = match[2].trim();
                    
                    // ノード定義（[ラベル]）を含む場合は、ノードIDのみを抽出
                    const sourceIdMatch = source.match(/^([^\[(]+)/);
                    if (sourceIdMatch) source = sourceIdMatch[1].trim();
                    
                    const targetIdMatch = target.match(/^([^\[(]+)/);
                    if (targetIdMatch) target = targetIdMatch[1].trim();
                    
                    if (target === nodeId) {
                        incoming.push(source);
                    } else if (source === nodeId) {
                        outgoing.push(target);
                    }
                }
            }
        });
        
        return { incoming, outgoing };
    }
};