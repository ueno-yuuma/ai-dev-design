const selectionComponent = {
    setupMultiSelection: function() {
        // Initialization logic for multi-selection
    },
    updateSelectionRectangle: function() {
        const selectionRect = document.getElementById('selection-rectangle');
        if (!selectionRect || !this.isSelecting()) return;

        const startX = Math.min(this.selectionStart.x, this.selectionCurrent.x);
        const startY = Math.min(this.selectionStart.y, this.selectionCurrent.y);
        const width = Math.abs(this.selectionCurrent.x - this.selectionStart.x);
        const height = Math.abs(this.selectionCurrent.y - this.selectionStart.y);

        selectionRect.style.left = startX + 'px';
        selectionRect.style.top = startY + 'px';
        selectionRect.style.width = width + 'px';
        selectionRect.style.height = height + 'px';
        selectionRect.classList.add('active');
    },
    finishSelection: function() {
        if (!this.isSelecting()) return;

        const selectedNodeIds = this.getNodesInSelectionArea();

        selectedNodeIds.forEach(nodeId => {
            if (this.selectedNodes().indexOf(nodeId) === -1) {
                this.selectedNodes.push(nodeId);
            }
        });

        this.isSelecting(false);
        this.selectionStart = null;
        this.selectionCurrent = null;

        const selectionRect = document.getElementById('selection-rectangle');
        if (selectionRect) {
            selectionRect.classList.remove('active');
        }

        const chartCanvas = document.getElementById('chart-canvas');
        if (chartCanvas) {
            chartCanvas.classList.remove('selecting');
        }

        this.updateNodeSelection();
    },
    getNodesInSelectionArea: function() {
        const mermaidContainer = document.querySelector('#mermaid-display .mermaid-container');
        if (!mermaidContainer) return [];

        const nodes = mermaidContainer.querySelectorAll('g.node');
        const selectedNodeIds = [];

        const selectionMinX = Math.min(this.selectionStart.x, this.selectionCurrent.x);
        const selectionMinY = Math.min(this.selectionStart.y, this.selectionCurrent.y);
        const selectionMaxX = Math.max(this.selectionStart.x, this.selectionCurrent.x);
        const selectionMaxY = Math.max(this.selectionStart.y, this.selectionCurrent.y);

        nodes.forEach(node => {
            const rect = node.getBoundingClientRect();
            const mermaidDisplayRect = document.getElementById('mermaid-display').getBoundingClientRect();

            const nodeX = rect.left - mermaidDisplayRect.left + rect.width / 2;
            const nodeY = rect.top - mermaidDisplayRect.top + rect.height / 2;

            if (nodeX >= selectionMinX && nodeX <= selectionMaxX &&
                nodeY >= selectionMinY && nodeY <= selectionMaxY) {
                const nodeId = this.extractNodeId(node);
                if (nodeId) {
                    selectedNodeIds.push(nodeId);
                }
            }
        });

        return selectedNodeIds;
    },
    clearMultiSelection: function() {
        this.selectedNodes([]);

        if (this.isSelecting()) {
            this.isSelecting(false);
            this.selectionStart = null;
            this.selectionCurrent = null;

            const selectionRect = document.getElementById('selection-rectangle');
            if (selectionRect) {
                selectionRect.classList.remove('active');
            }

            const chartCanvas = document.getElementById('chart-canvas');
            if (chartCanvas) {
                chartCanvas.classList.remove('selecting');
            }
        }

        this.updateNodeSelection();
    },
    updateNodeSelection: function() {
        const mermaidContainer = document.querySelector('#mermaid-display .mermaid-container');
        if (!mermaidContainer) return;

        const nodes = mermaidContainer.querySelectorAll('g.node');
        nodes.forEach(node => {
            node.classList.remove('multi-selected');
        });

        this.selectedNodes().forEach(nodeId => {
            const nodeElement = mermaidContainer.querySelector(`g.node[id*="${nodeId}"]`);
            if (nodeElement) {
                nodeElement.classList.add('multi-selected');
            }
        });
    },
    deleteSelectedNodes: function() {
        const selectedCount = this.selectedNodes().length;
        if (selectedCount === 0) {
            this.showError('削除するノードが選択されていません');
            return;
        }

        if (selectedCount > 1) {
            this.suppressAutoRender = true;
        }

        this.selectedNodes().forEach(nodeId => {
            this.removeNodeFromMermaidCode(nodeId);
        });

        if (selectedCount > 1) {
            this.suppressAutoRender = false;
            this.renderMermaid();
        }

        this.clearMultiSelection();
        this.addToHistory(`複数ノード削除: ${selectedCount}個`);
        this.showSuccess(`${selectedCount}個のノードを削除しました`);
    },
    selectAllNodes: function() {
        const mermaidContainer = document.querySelector('#mermaid-display .mermaid-container');
        if (!mermaidContainer) return;

        const nodes = mermaidContainer.querySelectorAll('g.node');
        const allNodeIds = [];

        nodes.forEach(node => {
            const nodeId = this.extractNodeId(node);
            if (nodeId) {
                allNodeIds.push(nodeId);
            }
        });

        this.selectedNodes(allNodeIds);
        this.updateNodeSelection();
    },
    addNodeToSelection: function(nodeId) {
        if (this.selectedNodes().indexOf(nodeId) === -1) {
            this.selectedNodes.push(nodeId);
            this.updateNodeSelection();
        }
    },
    toggleNodeSelection: function(nodeId) {
        const currentSelection = this.selectedNodes();
        const index = currentSelection.indexOf(nodeId);

        if (index !== -1) {
            this.selectedNodes.splice(index, 1);
        } else {
            this.selectedNodes.push(nodeId);
        }

        this.updateNodeSelection();
    },
    
    // Grouping functionality is now delegated to groupingComponent
    groupSelectedNodes: function() {
        return groupingComponent.groupSelectedNodes.call(this);
    },
    
    wrapNodesInSubgraph: function(mermaidCode, nodeIds, groupName, nodeSubgraphInfo) {
        return groupingComponent.wrapNodesInSubgraph.call(this, mermaidCode, nodeIds, groupName, nodeSubgraphInfo);
    },
    
    extractSelectedNodeContent: function(lines, nodeIds) {
        return groupingComponent.extractSelectedNodeContent.call(this, lines, nodeIds);
    },
    
    detectExternalConnections: function(lines, nodeIds) {
        return groupingComponent.detectExternalConnections.call(this, lines, nodeIds);
    },
    
    generateExternalConnections: function(externalConnections, subgraphId) {
        return groupingComponent.generateExternalConnections.call(this, externalConnections, subgraphId);
    },
    
    generateSubgraph: function(groupName, selectedContent, baseIndent, nodeIndent) {
        return groupingComponent.generateSubgraph.call(this, groupName, selectedContent, baseIndent, nodeIndent);
    },
    
    removeSelectedNodes: function(lines, nodeIds, targetNestLevel) {
        return groupingComponent.removeSelectedNodes.call(this, lines, nodeIds, targetNestLevel);
    },
    
    insertSubgraphAtCorrectPosition: function(cleanedLines, newSubgraph, targetNestLevel) {
        return groupingComponent.insertSubgraphAtCorrectPosition.call(this, cleanedLines, newSubgraph, targetNestLevel);
    },
    
    detectNodeSubgraphs: function(nodeIds) {
        return groupingComponent.detectNodeSubgraphs.call(this, nodeIds);
    },
    
    getNodeSubgraph: function(nodeId) {
        return groupingComponent.getNodeSubgraph.call(this, nodeId);
    },
    
    getDropTargetSubgraph: function(dropX, dropY) {
        return groupingComponent.getDropTargetSubgraph.call(this, dropX, dropY);
    },
    
    // サブグラフ関連のメソッド（groupingComponentに委譲）
    detectSubgraphClick: function(x, y) {
        return groupingComponent.detectSubgraphClick.call(this, x, y);
    },
    
    renameSubgraph: function(subgraphInfo) {
        return groupingComponent.renameSubgraph.call(this, subgraphInfo);
    },
    
    ungroupSubgraph: function(subgraphInfo) {
        return groupingComponent.ungroupSubgraph.call(this, subgraphInfo);
    },
    
    deleteSubgraph: function(subgraphInfo) {
        return groupingComponent.deleteSubgraph.call(this, subgraphInfo);
    }
};
