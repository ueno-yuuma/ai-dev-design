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

        if (confirm(`選択された${selectedCount}個のノードを削除しますか？`)) {
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
        }
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
    groupSelectedNodes: function() {
        const selectedCount = this.selectedNodes().length;
        if (selectedCount < 2) {
            this.showError('グループ化するには2個以上のノードを選択してください');
            return;
        }

        const groupName = prompt('グループ名を入力してください:', `グループ${Date.now()}`);
        if (!groupName) {
            return;
        }

        let mermaidCode = this.currentMermaidCode();
        const groupedCode = this.wrapNodesInSubgraph(mermaidCode, this.selectedNodes(), groupName);

        if (groupedCode !== mermaidCode) {
            this.suppressAutoRender = true;
            this.currentMermaidCode(groupedCode);
            this.suppressAutoRender = false;
            this.renderMermaid();

            this.clearMultiSelection();

            this.showSuccess(`${selectedCount}個のノードを「${groupName}」グループにまとめました`);
            this.addToHistory(`ノードグループ化: ${groupName}`);
        } else {
            this.showError('グループ化に失敗しました');
        }

        this.hideContextMenu();
    },
    wrapNodesInSubgraph: function(mermaidCode, nodeIds, groupName) {
        try {
            const lines = mermaidCode.split('\n');
            const resultLines = [];
            const processedNodes = new Set();
            let inSubgraph = false;
            let subgraphLevel = 0;

            let insertIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (line.startsWith('flowchart') || line.startsWith('graph')) {
                    resultLines.push(lines[i]);
                    continue;
                }

                if (line.startsWith('subgraph')) {
                    inSubgraph = true;
                    subgraphLevel++;
                    resultLines.push(lines[i]);
                    continue;
                } else if (line === 'end' && inSubgraph) {
                    subgraphLevel--;
                    if (subgraphLevel === 0) {
                        inSubgraph = false;
                    }
                    resultLines.push(lines[i]);
                    continue;
                }

                if (line === '' || line.startsWith('%%')) {
                    resultLines.push(lines[i]);
                    continue;
                }

                if (insertIndex === -1 && !inSubgraph && line.includes('[') && line.includes(']')) {
                    insertIndex = resultLines.length;
                }

                let isSelectedNodeLine = false;
                for (const nodeId of nodeIds) {
                    if (line.includes(`${nodeId}[`) || line.includes(`${nodeId}(`)) {
                        isSelectedNodeLine = true;
                        processedNodes.add(nodeId);
                        break;
                    }
                }

                if (isSelectedNodeLine && !inSubgraph) {
                    continue;
                }

                resultLines.push(lines[i]);
            }

            if (insertIndex === -1) {
                insertIndex = resultLines.length;
            }

            const subgraphLines = [];
            subgraphLines.push(`    subgraph ${groupName.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()} ["${groupName}"]`);

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine === '' || trimmedLine.startsWith('%%')) continue;

                for (const nodeId of nodeIds) {
                    if ((trimmedLine.includes(`${nodeId}[`) || trimmedLine.includes(`${nodeId}(`)) &&
                        !trimmedLine.startsWith('subgraph') && trimmedLine !== 'end') {
                        subgraphLines.push(`        ${trimmedLine}`);
                        break;
                    }
                }
            }

            subgraphLines.push('    end');

            resultLines.splice(insertIndex, 0, ...subgraphLines);

            return resultLines.join('\n');

        } catch (error) {
            console.error('グループ化処理エラー:', error);
            return mermaidCode;
        }
    },
    getNodeSubgraph: function(nodeId) {
        const mermaidCode = this.currentMermaidCode();
        const lines = mermaidCode.split('\n');

        let currentSubgraph = null;
        let subgraphLevel = 0;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('subgraph')) {
                subgraphLevel++;
                if (subgraphLevel === 1) {
                    const match = trimmedLine.match(/subgraph\s+(\w+)\s*\[?"?([^"]*)"?\]?/);
                    if (match) {
                        currentSubgraph = {
                            id: match[1],
                            name: match[2] || match[1]
                        };
                    }
                }
            }
            else if (trimmedLine === 'end' && subgraphLevel > 0) {
                subgraphLevel--;
                if (subgraphLevel === 0) {
                    currentSubgraph = null;
                }
            }
            else if (currentSubgraph && subgraphLevel === 1) {
                if (trimmedLine.includes(`${nodeId}[`) || trimmedLine.includes(`${nodeId}(`)) {
                    return currentSubgraph;
                }
            }
        }

        return null;
    },
    getDropTargetSubgraph: function(dropX, dropY) {
        const mermaidContainer = document.querySelector('#mermaid-display .mermaid-container');
        if (!mermaidContainer) return null;

        const subgraphs = mermaidContainer.querySelectorAll('g.cluster');

        for (const subgraph of subgraphs) {
            const rect = subgraph.getBoundingClientRect();
            const mermaidDisplayRect = document.getElementById('mermaid-display').getBoundingClientRect();

            const subgraphX = rect.left - mermaidDisplayRect.left;
            const subgraphY = rect.top - mermaidDisplayRect.top;
            const subgraphWidth = rect.width;
            const subgraphHeight = rect.height;

            if (dropX >= subgraphX && dropX <= subgraphX + subgraphWidth &&
                dropY >= subgraphY && dropY <= subgraphY + subgraphHeight) {

                const subgraphId = subgraph.id;
                if (subgraphId) {
                    const labelElement = subgraph.querySelector('text');
                    const subgraphName = labelElement ? labelElement.textContent : subgraphId;

                    return {
                        id: subgraphId,
                        name: subgraphName,
                        element: subgraph
                    };
                }
            }
        }

        return null;
    }
};
