const nodeSplitComponent = {
    splitNode: function(nodeId) {
        const nodeInfo = this.getNodeInfo(nodeId);
        if (!nodeInfo) {
            this.showError('ノード情報が取得できません');
            return;
        }

        const connections = this.getNodeConnections(nodeId);
        
        this.showLoading('ノードを分析中...');
        
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
                this.hideLoading();
            });
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
                        <button type="button" class="close" onclick="nodeSplitComponent.closeSplitDialog()" style="border: none; background: none; font-size: 24px; cursor: pointer;">
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
                        <button type="button" class="btn btn-secondary" onclick="nodeSplitComponent.closeSplitDialog()" style="padding: 8px 16px; border: 1px solid #6c757d; background: #6c757d; color: white; border-radius: 4px; cursor: pointer;">
                            キャンセル
                        </button>
                        <button type="button" class="btn btn-primary" onclick="nodeSplitComponent.executeSplit()" style="padding: 8px 16px; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">
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
    }
};