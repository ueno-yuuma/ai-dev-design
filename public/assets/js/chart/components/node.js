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

        if (confirm(`ノード「${this.getNodeText(this.selectedNodeId())}」を削除しますか？`)) {
            const nodeText = this.getNodeText(this.selectedNodeId());
            this.removeNodeFromMermaidCode(this.selectedNodeId());
            this.addToHistory(`ノード削除: ${nodeText}`);
            this.hideContextMenu();
            this.clearNodeSelection();
            this.showSuccess('ノードを削除しました');
        }
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

        const nodePatterns = [
            new RegExp(`\\s*${nodeId}\\[[^\\]]+\\]`, 'g'),
            new RegExp(`\\s*${nodeId}\\([^\\)]+\\)`, 'g'),
            new RegExp(`\\s*${nodeId}\\{[^\\}]+\\}`, 'g'),
            new RegExp(`\\s*${nodeId}\\[\\[[^\\]]+\\]\\]`, 'g')
        ];

        nodePatterns.forEach(pattern => {
            code = code.replace(pattern, '');
        });

        const connectionPatterns = [
            new RegExp(`\\s*[A-Za-z0-9_]+\\s*-->\\s*${nodeId}`, 'g'),
            new RegExp(`\\s*${nodeId}\\s*-->\\s*[A-Za-z0-9_]+`, 'g'),
            new RegExp(`\\s*[A-Za-z0-9_]+\\s*->>\\s*${nodeId}`, 'g'),
            new RegExp(`\\s*${nodeId}\\s*->>\\s*[A-Za-z0-9_]+`, 'g')
        ];

        connectionPatterns.forEach(pattern => {
            code = code.replace(pattern, '');
        });

        this.currentMermaidCode(code);
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
    }
};
