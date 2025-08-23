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

    splitNode: function(nodeId) {
        const nodeInfo = this.getNodeInfo(nodeId);
        if (!nodeInfo) {
            this.showError('ノード情報が取得できません');
            return;
        }

        const connections = this.getNodeConnections(nodeId);
        
        this.isLoading(true);
        
        apiComponent.analyzeSplitNode(nodeInfo.text, connections)
            .then(result => {
                if (result.can_split) {
                    this.executeDirectSplit(nodeId, result);
                } else {
                    this.showError('このノードは分割できません');
                }
            })
            .catch(error => {
                this.showError('分割分析に失敗しました: ' + error.message);
            })
            .finally(() => {
                this.isLoading(false);
            });
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
    },

    executeDirectSplit: function(nodeId, splitResult) {
        
        if (!splitResult.splits || splitResult.splits.length === 0) {
            this.showError('分割データが不正です');
            return;
        }

        try {
            // 分割処理中は自動レンダリングを抑制
            this.suppressAutoRender = true;
            
            // 元ノードのテキストを取得（削除前に）
            const nodeText = this.getNodeText(nodeId);
            
            // 0. 元ノードのサブグラフ所属を検出
            const subgraphInfo = this.getNodeSubgraphInfo(nodeId);
            
            // 1. 元ノードの接続情報を取得
            const originalConnections = this.getNodeConnections(nodeId);
            
            // 2. 分割ノードを生成
            const newNodeIds = this.createSplitNodesInSubgraph(nodeId, splitResult.splits, subgraphInfo);
            
            // 3. 外部接続を継承
            this.inheritExternalConnections(originalConnections, newNodeIds, splitResult.splits);
            
            // 4. 分割ノード間の内部接続を生成
            this.createInternalConnections(newNodeIds, splitResult.internal_connections || []);
            
            // 5. 元ノードを削除
            this.removeNodeFromMermaidCode(nodeId);
            
            // 6. 履歴に追加
            this.addToHistory(`ノード分割: ${nodeText} → ${splitResult.splits.length}個`);
            
            // 7. 自動レンダリング抑制を解除してレンダリング実行
            this.suppressAutoRender = false;
            this.renderMermaid();
            
            this.showSuccess(`ノードを${splitResult.splits.length}個に分割しました`);
            
        } catch (error) {
            this.suppressAutoRender = false; // エラー時もフラグをリセット
            this.showError('分割実行に失敗しました: ' + error.message);
        }
    },

    showSplitDialog: function(nodeId, splitResult) {
        this.currentSplitNodeId = nodeId;
        this.currentSplitResult = splitResult;
        
        const modal = document.createElement('div');
        modal.className = 'split-preview-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.right = '0';
        modal.style.bottom = '0';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.zIndex = '1050';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        
        const connections = this.getNodeConnections(nodeId);
        
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content" style="background: white; border-radius: 8px; padding: 20px; max-width: 800px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h4 class="modal-title">ノード分割プレビュー</h4>
                        <button type="button" class="close" onclick="nodeComponent.closeSplitDialog()" style="border: none; background: none; font-size: 24px; cursor: pointer;">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="original-node" style="margin-bottom: 20px;">
                            <h5>元のノード</h5>
                            <div class="alert alert-info" style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 10px; border-radius: 4px;">
                                ${this.getNodeText(nodeId)}
                            </div>
                        </div>
                        
                        <div class="split-options">
                            <h5>分割候補 (${splitResult.splits ? splitResult.splits.length : 0}個)</h5>
                            <div class="split-items" id="split-items-container">
                                ${this.renderSplitItems(splitResult.splits || [])}
                            </div>
                        </div>
                        
                        <div class="connections-preview" style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-top: 15px;">
                            <h6>接続プレビュー</h6>
                            <div>
                                <small><strong>入力接続:</strong> ${connections.incoming.join(', ') || 'なし'}</small><br>
                                <small><strong>出力接続:</strong> ${connections.outgoing.join(', ') || 'なし'}</small>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                        <button type="button" class="btn btn-secondary" onclick="nodeComponent.closeSplitDialog()" style="padding: 8px 16px; border: 1px solid #6c757d; background: #6c757d; color: white; border-radius: 4px; cursor: pointer;">
                            キャンセル
                        </button>
                        <button type="button" class="btn btn-primary" onclick="nodeComponent.executeSplit()" style="padding: 8px 16px; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
                            分割実行
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.currentSplitModal = modal;
    },

    renderSplitItems: function(splits) {
        return splits.map((split, index) => `
            <div class="split-item mb-2 p-2 border rounded">
                <div class="form-group mb-1">
                    <label class="form-label">タイトル:</label>
                    <input type="text" class="form-control form-control-sm split-title" 
                           value="${split.title}" data-split-index="${index}">
                </div>
                <div class="form-group mb-1">
                    <label class="form-label">内容:</label>
                    <textarea class="form-control form-control-sm split-content" rows="2"
                              data-split-index="${index}">${split.content}</textarea>
                </div>
                <div class="split-meta">
                    <small class="text-muted">
                        順序: ${split.sequence_order}
                        ${split.should_receive_input ? ' | 入力受信' : ''}
                        ${split.should_provide_output ? ' | 出力提供' : ''}
                    </small>
                </div>
            </div>
        `).join('');
    },

    closeSplitDialog: function() {
        if (this.currentSplitModal) {
            document.body.removeChild(this.currentSplitModal);
            this.currentSplitModal = null;
        }
        this.currentSplitNodeId = null;
        this.currentSplitResult = null;
    },

    executeSplit: function() {
        if (!this.currentSplitNodeId || !this.currentSplitResult) {
            this.showError('分割データが不正です');
            return;
        }

        // ユーザーが編集した分割データを取得
        const updatedSplits = this.getUpdatedSplitData();
        
        try {
            // 分割処理中は自動レンダリングを抑制
            this.suppressAutoRender = true;
            
            // 0. 元ノードのサブグラフ所属を検出
            const subgraphInfo = this.getNodeSubgraphInfo(this.currentSplitNodeId);
            
            // 1. 元ノードの接続情報を取得
            const originalConnections = this.getNodeConnections(this.currentSplitNodeId);
            
            // 2. 分割ノードを生成
            const newNodeIds = this.createSplitNodesInSubgraph(this.currentSplitNodeId, updatedSplits, subgraphInfo);
            
            // 3. 外部接続を継承
            this.inheritExternalConnections(originalConnections, newNodeIds, updatedSplits);
            
            // 4. 分割ノード間の内部接続を生成
            this.createInternalConnections(newNodeIds, this.currentSplitResult.internal_connections || []);
            
            // 5. 元ノードを削除
            this.removeNodeFromMermaidCode(this.currentSplitNodeId);
            
            // 6. 履歴に追加
            const nodeText = this.getNodeText(this.currentSplitNodeId);
            this.addToHistory(`ノード分割: ${nodeText} → ${updatedSplits.length}個`);
            
            // 7. 自動レンダリング抑制を解除してレンダリング実行
            this.suppressAutoRender = false;
            this.renderMermaid();
            
            this.closeSplitDialog();
            this.showSuccess(`ノードを${updatedSplits.length}個に分割しました`);
            
        } catch (error) {
            this.suppressAutoRender = false; // エラー時もフラグをリセット
            this.showError('分割実行に失敗しました: ' + error.message);
        }
    },

    getUpdatedSplitData: function() {
        const splits = [];
        const splitItems = document.querySelectorAll('#split-items-container .split-item');
        
        splitItems.forEach((item, index) => {
            const titleInput = item.querySelector('.split-title');
            const contentTextarea = item.querySelector('.split-content');
            
            if (titleInput && contentTextarea) {
                splits.push({
                    title: titleInput.value.trim(),
                    content: contentTextarea.value.trim(),
                    sequence_order: index,
                    should_receive_input: this.currentSplitResult.splits[index]?.should_receive_input || false,
                    should_provide_output: this.currentSplitResult.splits[index]?.should_provide_output || false
                });
            }
        });
        
        return splits;
    },

    createSplitNodes: function(originalNodeId, splits) {
        
        const newNodeIds = [];
        let code = this.currentMermaidCode();
        
        if (!Array.isArray(splits)) {
            return newNodeIds;
        }
        
        splits.forEach((split, index) => {
            const nodeId = `${originalNodeId}_split_${index + 1}`;
            newNodeIds.push(nodeId);
            
            // ノード定義を追加
            const name = split.title || split.name || `Split ${index + 1}`;
            code += `\n    ${nodeId}[${name}]`;
        });
        
        this.currentMermaidCode(code);
        return newNodeIds;
    },

    inheritExternalConnections: function(originalConnections, newNodeIds, splits) {
        let code = this.currentMermaidCode();
        
        // 入力接続の継承 - 最初に入力を受け取るべきノードに接続
        originalConnections.incoming.forEach(sourceNode => {
            const inputReceiver = splits.findIndex(s => s.should_receive_input);
            const targetNodeId = newNodeIds[inputReceiver >= 0 ? inputReceiver : 0];
            code += `\n    ${sourceNode} --> ${targetNodeId}`;
        });
        
        // 出力接続の継承 - 最後に出力を提供すべきノードから接続
        originalConnections.outgoing.forEach(targetNode => {
            const outputProvider = splits.findIndex(s => s.should_provide_output);
            const sourceNodeId = newNodeIds[outputProvider >= 0 ? outputProvider : splits.length - 1];
            code += `\n    ${sourceNodeId} --> ${targetNode}`;
        });
        
        this.currentMermaidCode(code);
    },

    createInternalConnections: function(newNodeIds, connectionSpecs) {
        let code = this.currentMermaidCode();
        const connectionsToAdd = [];
        
        if (connectionSpecs && connectionSpecs.length > 0) {
            // AIが提案した接続を使用
            connectionSpecs.forEach(conn => {
                if (conn.from_index < newNodeIds.length && conn.to_index < newNodeIds.length) {
                    const fromNode = newNodeIds[conn.from_index];
                    const toNode = newNodeIds[conn.to_index];
                    const arrow = conn.connection_type === 'conditional' ? '-.->': '-->';
                    const connectionLine = `    ${fromNode} ${arrow} ${toNode}`;
                    
                    // 重複チェック
                    if (!connectionsToAdd.includes(connectionLine) && !code.includes(connectionLine)) {
                        connectionsToAdd.push(connectionLine);
                    }
                }
            });
        } else {
            // デフォルト: シーケンシャル接続
            for (let i = 0; i < newNodeIds.length - 1; i++) {
                const connectionLine = `    ${newNodeIds[i]} --> ${newNodeIds[i + 1]}`;
                if (!connectionsToAdd.includes(connectionLine) && !code.includes(connectionLine)) {
                    connectionsToAdd.push(connectionLine);
                }
            }
        }
        
        if (connectionsToAdd.length > 0) {
            code += '\n' + connectionsToAdd.join('\n');
        }
        
        this.currentMermaidCode(code);
    },

    // ノードのサブグラフ所属情報を取得
    getNodeSubgraphInfo: function(nodeId) {
        const mermaidCode = this.currentMermaidCode();
        const lines = mermaidCode.split('\n');

        let subgraphStack = [];
        let currentLevel = 0;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('subgraph')) {
                const match = trimmedLine.match(/subgraph\s+(\w+)\s*[\[]?"?([^"]*)"?[\]]?/);
                if (match) {
                    const subgraphInfo = {
                        id: match[1],
                        name: match[2] || match[1],
                        level: currentLevel
                    };
                    subgraphStack.push(subgraphInfo);
                    currentLevel++;
                }
            }
            else if (trimmedLine === 'end' && subgraphStack.length > 0) {
                currentLevel--;
                if (subgraphStack.length > 0 && subgraphStack[subgraphStack.length - 1].level === currentLevel) {
                    subgraphStack.pop();
                }
            }
            else if (subgraphStack.length > 0) {
                // ノード定義を検出
                if (trimmedLine.includes(`${nodeId}[`) || trimmedLine.includes(`${nodeId}(`)) {
                    return {
                        parentSubgraph: subgraphStack[subgraphStack.length - 1],
                        nestLevel: currentLevel,
                        subgraphPath: subgraphStack.slice()
                    };
                }
            }
        }

        return null; // サブグラフに所属していない
    },

    // サブグラフ対応の分割ノード作成
    createSplitNodesInSubgraph: function(originalNodeId, splits, subgraphInfo) {
        const newNodeIds = [];
        let code = this.currentMermaidCode();
        
        if (!Array.isArray(splits)) {
            return newNodeIds;
        }

        if (subgraphInfo) {
            // サブグラフ内にノードを作成
            const lines = code.split('\n');
            const updatedLines = [];
            let inTargetSubgraph = false;
            let currentLevel = 0;
            let targetLevel = subgraphInfo.nestLevel;
            let nodesInserted = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();

                if (trimmedLine.startsWith('subgraph')) {
                    if (subgraphInfo.parentSubgraph && trimmedLine.includes(subgraphInfo.parentSubgraph.id)) {
                        inTargetSubgraph = true;
                    }
                    currentLevel++;
                    updatedLines.push(line);
                } else if (trimmedLine === 'end') {
                    if (inTargetSubgraph && currentLevel === targetLevel && !nodesInserted) {
                        // サブグラフの終了直前に分割ノードを挿入
                        const indent = '    '.repeat(targetLevel);
                        splits.forEach((split, index) => {
                            const nodeId = `${originalNodeId}_split_${index + 1}`;
                            newNodeIds.push(nodeId);
                            const name = split.title || split.name || `Split ${index + 1}`;
                            updatedLines.push(`${indent}${nodeId}[${name}]`);
                        });
                        nodesInserted = true;
                        inTargetSubgraph = false;
                    }
                    currentLevel--;
                    updatedLines.push(line);
                } else {
                    updatedLines.push(line);
                }
            }

            code = updatedLines.join('\n');
        } else {
            // ルートレベルにノードを作成（既存の処理）
            splits.forEach((split, index) => {
                const nodeId = `${originalNodeId}_split_${index + 1}`;
                newNodeIds.push(nodeId);
                const name = split.title || split.name || `Split ${index + 1}`;
                code += `\n    ${nodeId}[${name}]`;
            });
        }

        this.currentMermaidCode(code);
        return newNodeIds;
    }
};
