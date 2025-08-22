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

        // スマートグループ化: 条件に応じて通常グループ化かネストグループ化を自動選択
        let nodeSubgraphInfo;
        let canNest = false;
        let groupType = '通常';
        
        try {
            nodeSubgraphInfo = this.detectNodeSubgraphs(this.selectedNodes());
            canNest = nodeSubgraphInfo && nodeSubgraphInfo.canNest && 
                     nodeSubgraphInfo.allNodesInSameSubgraph && 
                     nodeSubgraphInfo.maxNestLevel > 0;
            
            if (canNest) {
                groupType = 'ネスト';
            }
        } catch (error) {
            console.error('サブグラフ情報取得エラー:', error);
            // エラーの場合は通常グループ化にフォールバック
        }

        const defaultName = canNest ? `ネストグループ${Date.now()}` : `グループ${Date.now()}`;
        const promptMessage = canNest ? 
            'ネストグループ名を入力してください（既存グループ内に作成されます）:' : 
            'グループ名を入力してください:';
            
        const groupName = prompt(promptMessage, defaultName);
        if (!groupName) {
            return;
        }

        let mermaidCode = this.currentMermaidCode();
        
        // 統合されたグループ化処理（通常もネストも同一アルゴリズム）
        const groupedCode = this.wrapNodesInSubgraph(mermaidCode, this.selectedNodes(), groupName, nodeSubgraphInfo);

        if (groupedCode !== mermaidCode) {
            this.suppressAutoRender = true;
            this.currentMermaidCode(groupedCode);
            this.suppressAutoRender = false;
            this.renderMermaid();

            this.clearMultiSelection();

            this.showSuccess(`${selectedCount}個のノードを「${groupName}」${groupType}グループにまとめました`);
            this.addToHistory(`${groupType}グループ化: ${groupName}`);
        } else {
            this.showError('グループ化に失敗しました');
        }

        this.hideContextMenu();
    },


    wrapNodesInSubgraph: function(mermaidCode, nodeIds, groupName, nodeSubgraphInfo = null) {
        try {
            const lines = mermaidCode.split('\n');
            
            // サブグラフ情報を取得または新規作成
            if (!nodeSubgraphInfo) {
                nodeSubgraphInfo = this.detectNodeSubgraphs(nodeIds);
            }
            
            // ネストレベルと親サブグラフを特定
            const targetNestLevel = nodeSubgraphInfo.maxNestLevel;
            const baseIndent = '    '.repeat(targetNestLevel + 1);
            const nodeIndent = '    '.repeat(targetNestLevel + 2);
            
            // 外部接続を検出
            const externalConnections = this.detectExternalConnections(lines, nodeIds);
            
            // 選択されたノードとその関係を抽出
            const selectedContent = this.extractSelectedNodeContent(lines, nodeIds);
            
            // 選択されたノードを除去した元のコードを生成
            const cleanedLines = this.removeSelectedNodes(lines, nodeIds, targetNestLevel);
            
            // 新しいサブグラフを生成
            const newSubgraph = this.generateSubgraph(groupName, selectedContent, baseIndent, nodeIndent);
            
            // サブグラフIDを取得（生成されたサブグラフの最初の行から）
            const subgraphIdMatch = newSubgraph[0].match(/subgraph\s+(\w+)/);
            const subgraphId = subgraphIdMatch ? subgraphIdMatch[1] : groupName;
            
            // 外部接続をサブグラフレベルの接続に変換
            const externalConnectionLines = this.generateExternalConnections(externalConnections, subgraphId);
            
            // 適切な位置に新しいサブグラフを挿入
            let result = this.insertSubgraphAtCorrectPosition(cleanedLines, newSubgraph, targetNestLevel);
            
            // 外部接続を追加
            if (externalConnectionLines.length > 0) {
                result += '\n' + externalConnectionLines.join('\n');
            }
            
            return result;

        } catch (error) {
            console.error('グループ化処理エラー:', error);
            return mermaidCode;
        }
    },

    extractSelectedNodeContent: function(lines, nodeIds) {
        const nodeDefinitions = [];
        const connections = [];
        const processedDefs = new Set();
        const processedConns = new Set();
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine === '' || trimmedLine.startsWith('%%') || 
                trimmedLine.startsWith('subgraph') || trimmedLine === 'end') continue;
            
            // ノード定義を抽出（より正確なパターンマッチング）
            for (const nodeId of nodeIds) {
                const nodeDefRegex = new RegExp(`\\b${nodeId}\\[([^\\]]+)\\]`);
                const match = trimmedLine.match(nodeDefRegex);
                if (match && !processedDefs.has(nodeId)) {
                    const nodeDef = `${nodeId}[${match[1]}]`;
                    nodeDefinitions.push(nodeDef);
                    processedDefs.add(nodeId);
                }
            }
            
            // 選択されたノード間の接続を抽出
            if (trimmedLine.includes('-->')) {
                const foundNodes = nodeIds.filter(nodeId => trimmedLine.includes(nodeId));
                if (foundNodes.length >= 2 && !processedConns.has(trimmedLine)) {
                    connections.push(trimmedLine);
                    processedConns.add(trimmedLine);
                }
            }
        }
        
        return {
            nodeDefinitions: nodeDefinitions,
            connections: connections
        };
    },

    detectExternalConnections: function(lines, nodeIds) {
        const incomingConnections = []; // サブグラフ外 -> 選択ノード
        const outgoingConnections = []; // 選択ノード -> サブグラフ外
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine === '' || trimmedLine.startsWith('%%') || 
                trimmedLine.startsWith('subgraph') || trimmedLine === 'end') continue;
            
            if (trimmedLine.includes('-->')) {
                // 接続の両端を解析
                const arrowMatch = trimmedLine.match(/^([^-]+)-->/);
                const targetMatch = trimmedLine.match(/-->(.+)$/);
                
                if (arrowMatch && targetMatch) {
                    let sourceNode = arrowMatch[1].trim();
                    let targetNode = targetMatch[1].trim();
                    
                    // ノード定義（[ラベル]）を含む場合は、ノードIDのみを抽出
                    const sourceIdMatch = sourceNode.match(/^([^\[]+)/);
                    if (sourceIdMatch) sourceNode = sourceIdMatch[1].trim();
                    
                    const targetIdMatch = targetNode.match(/^([^\[]+)/);
                    if (targetIdMatch) targetNode = targetIdMatch[1].trim();
                    
                    // サブグラフ外からの接続を検出
                    if (!nodeIds.includes(sourceNode) && nodeIds.includes(targetNode)) {
                        incomingConnections.push({
                            source: sourceNode,
                            target: targetNode,
                            originalLine: trimmedLine
                        });
                    }
                    
                    // サブグラフ外への接続を検出
                    if (nodeIds.includes(sourceNode) && !nodeIds.includes(targetNode)) {
                        outgoingConnections.push({
                            source: sourceNode,
                            target: targetNode,
                            originalLine: trimmedLine
                        });
                    }
                }
            }
        }
        
        
        return {
            incoming: incomingConnections,
            outgoing: outgoingConnections
        };
    },

    generateExternalConnections: function(externalConnections, subgraphId) {
        const newConnections = [];
        
        // サブグラフ内の元のノードへの接続を維持
        for (const conn of externalConnections.incoming) {
            const newConnection = `${conn.source} --> ${conn.target}`;
            newConnections.push(newConnection);
        }
        
        // サブグラフ内の元のノードからの接続を維持
        for (const conn of externalConnections.outgoing) {
            const newConnection = `${conn.source} --> ${conn.target}`;
            newConnections.push(newConnection);
        }
        
        return newConnections;
    },

    generateSubgraph: function(groupName, selectedContent, baseIndent, nodeIndent) {
        const subgraphLines = [];
        const groupId = groupName.replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now();
        
        subgraphLines.push(`${baseIndent}subgraph ${groupId} ["${groupName}"]`);
        
        // ノード定義を追加
        for (const nodeDef of selectedContent.nodeDefinitions) {
            subgraphLines.push(`${nodeIndent}${nodeDef}`);
        }
        
        // 接続を追加
        for (const connection of selectedContent.connections) {
            subgraphLines.push(`${nodeIndent}${connection}`);
        }
        
        subgraphLines.push(`${baseIndent}end`);
        
        return subgraphLines;
    },

    removeSelectedNodes: function(lines, nodeIds, targetNestLevel) {
        const resultLines = [];
        let currentLevel = 0;
        let inTargetSubgraph = (targetNestLevel === 0);
        
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('flowchart') || trimmedLine.startsWith('graph')) {
                resultLines.push(line);
                continue;
            }
            
            if (trimmedLine.startsWith('subgraph')) {
                currentLevel++;
                // 選択されたノードがあるレベルに入った時にinTargetSubgraphをtrueにする
                if (targetNestLevel > 0 && currentLevel === targetNestLevel) {
                    inTargetSubgraph = true;
                }
                resultLines.push(line);
                continue;
            }
            
            if (trimmedLine === 'end') {
                // 選択されたノードがあるレベルから出る時にinTargetSubgraphをfalseにする
                if (targetNestLevel > 0 && currentLevel === targetNestLevel) {
                    inTargetSubgraph = false;
                }
                currentLevel--;
                resultLines.push(line);
                continue;
            }
            
            if (trimmedLine === '' || trimmedLine.startsWith('%%')) {
                resultLines.push(line);
                continue;
            }
            
            // 選択されたノードに関連する行をスキップ
            let shouldSkip = false;
            
            if (inTargetSubgraph || targetNestLevel === 0) {
                for (const nodeId of nodeIds) {
                    // ノード定義行をスキップ
                    if (trimmedLine.includes(`${nodeId}[`)) {
                        shouldSkip = true;
                        break;
                    }
                    
                    // 選択されたノードに関連する接続もスキップ（内部・外部問わず）
                    if (trimmedLine.includes('-->') && trimmedLine.includes(nodeId)) {
                        shouldSkip = true;
                        break;
                    }
                }
            }
            
            if (!shouldSkip) {
                resultLines.push(line);
            }
        }
        
        return resultLines;
    },

    insertSubgraphAtCorrectPosition: function(cleanedLines, newSubgraph, targetNestLevel) {
        let insertIndex = -1;
        let currentLevel = 0;
        
        
        for (let i = 0; i < cleanedLines.length; i++) {
            const trimmedLine = cleanedLines[i].trim();
            
            if (trimmedLine.startsWith('subgraph')) {
                currentLevel++;
            } else if (trimmedLine === 'end') {
                // targetNestLevelのサブグラフの終了直前に挿入（ネスト内に挿入）
                if (currentLevel === targetNestLevel) {
                    insertIndex = i;
                    break;
                }
                currentLevel--;
            } else if (targetNestLevel === 0 && insertIndex === -1 && 
                      (trimmedLine.includes('[') || trimmedLine.startsWith('subgraph'))) {
                // ルートレベルの場合、最初のノードまたはサブグラフの前に挿入
                insertIndex = i;
                break;
            }
        }
        
        // 挿入位置が見つからない場合は末尾に追加
        if (insertIndex === -1) {
            insertIndex = cleanedLines.length;
        }
        
        // 新しいサブグラフを挿入
        const result = [...cleanedLines];
        result.splice(insertIndex, 0, ...newSubgraph);
        
        return result.join('\n');
    },

    detectNodeSubgraphs: function(nodeIds) {
        const mermaidCode = this.currentMermaidCode();
        const lines = mermaidCode.split('\n');
        
        
        const nodeSubgraphs = {};
        const subgraphStack = [];
        let maxNestLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('subgraph')) {
                const match = trimmedLine.match(/subgraph\s+(\w+)\s*\[?"?([^"]*)"?\]?/);
                if (match) {
                    const subgraph = {
                        id: match[1],
                        name: match[2] || match[1],
                        level: subgraphStack.length
                    };
                    subgraphStack.push(subgraph);
                }
            } else if (trimmedLine === 'end' && subgraphStack.length > 0) {
                subgraphStack.pop();
            } else {
                // ノードの定義行かチェック
                for (const nodeId of nodeIds) {
                    if (trimmedLine.includes(`${nodeId}[`) || trimmedLine.includes(`${nodeId}(`)) {
                        nodeSubgraphs[nodeId] = {
                            nestLevel: subgraphStack.length,
                            parentSubgraphs: [...subgraphStack],
                            insertPosition: subgraphStack.length > 0 ? 'nested' : 'root'
                        };
                        maxNestLevel = Math.max(maxNestLevel, subgraphStack.length);
                        break;
                    }
                }
            }
        }

        // 同じサブグラフ内のノードかチェック
        const subgraphGroups = {};
        let canNestTogether = true;
        
        for (const nodeId in nodeSubgraphs) {
            const subgraphPath = nodeSubgraphs[nodeId].parentSubgraphs.map(sg => sg.id).join('.');
            if (!subgraphGroups[subgraphPath]) {
                subgraphGroups[subgraphPath] = [];
            }
            subgraphGroups[subgraphPath].push(nodeId);
        }
        
        // 選択されたノードが複数の異なるサブグラフにまたがっている場合はネスト不可
        if (Object.keys(subgraphGroups).length > 1) {
            canNestTogether = false;
        }

        return {
            nodeSubgraphs,
            maxNestLevel,
            canNest: maxNestLevel >= 0 && canNestTogether,
            subgraphGroups,
            allNodesInSameSubgraph: Object.keys(subgraphGroups).length <= 1
        };
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
