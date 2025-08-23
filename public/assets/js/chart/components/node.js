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
        console.log('removeNodeFromMermaidCode called for:', nodeId);
        let code = this.currentMermaidCode();
        console.log('Code before node removal:', code);

        const nodePatterns = [
            new RegExp(`\\s*${nodeId}\\[[^\\]]+\\]`, 'g'),
            new RegExp(`\\s*${nodeId}\\([^\\)]+\\)`, 'g'),
            new RegExp(`\\s*${nodeId}\\{[^\\}]+\\}`, 'g'),
            new RegExp(`\\s*${nodeId}\\[\\[[^\\]]+\\]\\]`, 'g')
        ];

        nodePatterns.forEach((pattern, index) => {
            const matches = code.match(pattern);
            if (matches) {
                console.log(`Node pattern ${index} matches:`, matches);
                code = code.replace(pattern, '');
            }
        });

        console.log('Code after node definition removal:', code);

        // 正確なnode IDのエスケープ
        const escapedNodeId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const connectionPatterns = [
            new RegExp(`\\s*[A-Za-z0-9_]+\\s*-->\\s*${escapedNodeId}\\b`, 'g'),
            new RegExp(`\\s*${escapedNodeId}\\s*-->\\s*[A-Za-z0-9_]+`, 'g'),
            new RegExp(`\\s*[A-Za-z0-9_]+\\s*->>\\s*${escapedNodeId}\\b`, 'g'),
            new RegExp(`\\s*${escapedNodeId}\\s*->>\\s*[A-Za-z0-9_]+`, 'g')
        ];

        connectionPatterns.forEach((pattern, index) => {
            const matches = code.match(pattern);
            if (matches) {
                console.log(`Connection pattern ${index} matches:`, matches);
                code = code.replace(pattern, '');
            }
        });

        console.log('Code after connection removal:', code);
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
                console.log('Split analysis result:', result);
                console.log('Splits array:', result.splits);
                if (result.can_split) {
                    console.log('Executing split directly for node:', nodeId);
                    this.executeDirectSplit(nodeId, result);
                } else {
                    this.showError('このノードは分割できません');
                }
            })
            .catch(error => {
                console.error('Node split analysis error:', error);
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
        console.log('executeDirectSplit called with:', nodeId, splitResult);
        console.log('splitResult.splits details:', JSON.stringify(splitResult.splits, null, 2));
        
        if (!splitResult.splits || splitResult.splits.length === 0) {
            this.showError('分割データが不正です');
            return;
        }

        try {
            // 元ノードのテキストを取得（削除前に）
            const nodeText = this.getNodeText(nodeId);
            
            // 1. 元ノードの接続情報を取得
            const originalConnections = this.getNodeConnections(nodeId);
            console.log('Original connections:', originalConnections);
            
            // 2. 分割ノードを生成
            console.log('Passing splits to createSplitNodes:', splitResult.splits);
            const newNodeIds = this.createSplitNodes(nodeId, splitResult.splits);
            
            // 3. 外部接続を継承
            this.inheritExternalConnections(originalConnections, newNodeIds, splitResult.splits);
            
            // 4. 分割ノード間の内部接続を生成
            this.createInternalConnections(newNodeIds, splitResult.internal_connections || []);
            
            // 5. 元ノードを削除
            console.log('Removing original node:', nodeId);
            this.removeNodeFromMermaidCode(nodeId);
            
            // 6. 履歴に追加
            console.log('Adding to history:', `ノード分割: ${nodeText} → ${splitResult.splits.length}個`);
            this.addToHistory(`ノード分割: ${nodeText} → ${splitResult.splits.length}個`);
            
            // 7. レンダリング
            console.log('Final Mermaid code before rendering:', this.currentMermaidCode());
            this.renderMermaid();
            
            this.showSuccess(`ノードを${splitResult.splits.length}個に分割しました`);
            
        } catch (error) {
            console.error('Direct split execution error:', error);
            this.showError('分割実行に失敗しました: ' + error.message);
        }
    },

    showSplitDialog: function(nodeId, splitResult) {
        console.log('showSplitDialog called with:', nodeId, splitResult);
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
        console.log('Split dialog modal added to DOM');
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
        console.log('executeSplit called');
        if (!this.currentSplitNodeId || !this.currentSplitResult) {
            console.error('Split data is invalid:', this.currentSplitNodeId, this.currentSplitResult);
            this.showError('分割データが不正です');
            return;
        }

        // ユーザーが編集した分割データを取得
        const updatedSplits = this.getUpdatedSplitData();
        console.log('Updated splits data:', updatedSplits);
        
        try {
            // 1. 元ノードの接続情報を取得
            const originalConnections = this.getNodeConnections(this.currentSplitNodeId);
            
            // 2. 分割ノードを生成
            const newNodeIds = this.createSplitNodes(this.currentSplitNodeId, updatedSplits);
            
            // 3. 外部接続を継承
            this.inheritExternalConnections(originalConnections, newNodeIds, updatedSplits);
            
            // 4. 分割ノード間の内部接続を生成
            this.createInternalConnections(newNodeIds, this.currentSplitResult.internal_connections || []);
            
            // 5. 元ノードを削除
            console.log('Removing original node:', this.currentSplitNodeId);
            this.removeNodeFromMermaidCode(this.currentSplitNodeId);
            
            // 6. 履歴に追加
            const nodeText = this.getNodeText(this.currentSplitNodeId);
            console.log('Adding to history:', `ノード分割: ${nodeText} → ${updatedSplits.length}個`);
            this.addToHistory(`ノード分割: ${nodeText} → ${updatedSplits.length}個`);
            
            // 7. レンダリング
            console.log('Final Mermaid code before rendering:', this.currentMermaidCode());
            this.renderMermaid();
            
            this.closeSplitDialog();
            this.showSuccess(`ノードを${updatedSplits.length}個に分割しました`);
            
        } catch (error) {
            console.error('Split execution error:', error);
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
        console.log('createSplitNodes called with:', originalNodeId, splits);
        console.log('typeof splits:', typeof splits, 'Array.isArray:', Array.isArray(splits));
        console.log('splits details in createSplitNodes:', JSON.stringify(splits, null, 2));
        
        const newNodeIds = [];
        let code = this.currentMermaidCode();
        console.log('Current Mermaid code before split:', code);
        
        if (!Array.isArray(splits)) {
            console.error('Splits is not an array:', splits);
            return newNodeIds;
        }
        
        splits.forEach((split, index) => {
            console.log(`Processing split ${index}:`, split);
            const nodeId = `${originalNodeId}_split_${index + 1}`;
            newNodeIds.push(nodeId);
            
            // ノード定義を追加
            const name = split.name || `Split ${index + 1}`;
            code += `\n    ${nodeId}[${name}]`;
            console.log(`Added split node: ${nodeId}[${name}]`);
        });
        
        console.log('Updated Mermaid code with split nodes:', code);
        this.currentMermaidCode(code);
        console.log('New node IDs created:', newNodeIds);
        return newNodeIds;
    },

    inheritExternalConnections: function(originalConnections, newNodeIds, splits) {
        console.log('inheritExternalConnections called with:', originalConnections, newNodeIds, splits);
        let code = this.currentMermaidCode();
        
        // 入力接続の継承 - 最初に入力を受け取るべきノードに接続
        originalConnections.incoming.forEach(sourceNode => {
            const inputReceiver = splits.findIndex(s => s.should_receive_input);
            const targetNodeId = newNodeIds[inputReceiver >= 0 ? inputReceiver : 0];
            console.log(`Adding input connection: ${sourceNode} --> ${targetNodeId}`);
            code += `\n    ${sourceNode} --> ${targetNodeId}`;
        });
        
        // 出力接続の継承 - 最後に出力を提供すべきノードから接続
        originalConnections.outgoing.forEach(targetNode => {
            const outputProvider = splits.findIndex(s => s.should_provide_output);
            const sourceNodeId = newNodeIds[outputProvider >= 0 ? outputProvider : splits.length - 1];
            console.log(`Adding output connection: ${sourceNodeId} --> ${targetNode}`);
            code += `\n    ${sourceNodeId} --> ${targetNode}`;
        });
        
        this.currentMermaidCode(code);
    },

    createInternalConnections: function(newNodeIds, connectionSpecs) {
        console.log('createInternalConnections called with:', newNodeIds, connectionSpecs);
        let code = this.currentMermaidCode();
        
        if (connectionSpecs && connectionSpecs.length > 0) {
            // AIが提案した接続を使用
            console.log('Using AI suggested connections');
            connectionSpecs.forEach(conn => {
                if (conn.from_index < newNodeIds.length && conn.to_index < newNodeIds.length) {
                    const fromNode = newNodeIds[conn.from_index];
                    const toNode = newNodeIds[conn.to_index];
                    const arrow = conn.connection_type === 'conditional' ? '-.->': '-->';
                    console.log(`Adding AI connection: ${fromNode} ${arrow} ${toNode}`);
                    code += `\n    ${fromNode} ${arrow} ${toNode}`;
                }
            });
        } else {
            // デフォルト: シーケンシャル接続
            console.log('Using default sequential connections');
            for (let i = 0; i < newNodeIds.length - 1; i++) {
                console.log(`Adding sequential connection: ${newNodeIds[i]} --> ${newNodeIds[i + 1]}`);
                code += `\n    ${newNodeIds[i]} --> ${newNodeIds[i + 1]}`;
            }
        }
        
        this.currentMermaidCode(code);
    }
};
