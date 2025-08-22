const groupingComponent = {
    _performGrouping: function(groupName, nodeSubgraphInfo, groupType) {
        if (!groupName) {
            this.hideContextMenu();
            return;
        }

        const selectedCount = this.selectedNodes().length;
        let mermaidCode = this.currentMermaidCode();
        
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

    groupSelectedNodes: function() {
        const selectedCount = this.selectedNodes().length;
        if (selectedCount < 2) {
            this.showError('グループ化するには2個以上のノードを選択してください');
            return;
        }

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
        }

        // 設定に応じて処理を分岐
        if (this.settings.autoGenerateGroupName()) {
            // --- 自動生成ロジック ---
            this.isLoading(true);
            
            // 選択ノードのラベルを抽出
            const content = this.extractSelectedNodeContent(this.currentMermaidCode().split('\n'), this.selectedNodes());
            const nodeLabels = content.nodeDefinitions.map(def => {
                const match = def.match(/[\[(]([^)]+)[\])]/); // A["label"] or A("label")
                if (match) return match[1];
                const match2 = def.match(/[\[]([^"\n]+)[\]]/);
                if (match2) return match2[1];
                const match3 = def.match(/[\[]([^[]+)[\]]/);
                return match3 ? match3[1] : '';
            }).filter(label => label);

            if (nodeLabels.length === 0) {
                this.showError('グループ化するノードのテキストが取得できませんでした。');
                this.isLoading(false);
                return;
            }

            // APIを呼び出し
            apiComponent.generateGroupName(nodeLabels)
                .then(groupName => {
                    this._performGrouping(groupName, nodeSubgraphInfo, groupType);
                })
                .catch(error => {
                    console.error('Error generating group name:', error);
                    this.showError(`グループ名の自動生成に失敗しました: ${error.message}`);
                })
                .finally(() => {
                    this.isLoading(false);
                });

        } else {
            // --- 手動入力ロジック ---
            const defaultName = canNest ? `ネストグループ${Date.now()}` : `グループ${Date.now()}`;
            const promptMessage = canNest ? 
                'ネストグループ名を入力してください（既存グループ内に作成されます）:' : 
                'グループ名を入力してください:';
                
            const groupName = prompt(promptMessage, defaultName);
            this._performGrouping(groupName, nodeSubgraphInfo, groupType);
        }
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
                const nodeDefRegex = new RegExp(`\\b${nodeId}([\[][^\]]+[\]]|\([^)]+\))`);
                const match = trimmedLine.match(nodeDefRegex);
                if (match && !processedDefs.has(nodeId)) {
                    nodeDefinitions.push(trimmedLine);
                    processedDefs.add(nodeId);
                }
            }
            
            // 選択されたノード間の接続を抽出
            if (trimmedLine.includes('-->')) {
                const foundNodes = nodeIds.filter(nodeId => {
                    const nodeRefRegex = new RegExp(`\\b${nodeId}([\[]|\()`);
                    return nodeRefRegex.test(trimmedLine);
                });
                if (foundNodes.length >= 2 && !processedConns.has(trimmedLine)) {
                    connections.push(trimmedLine);
                    processedConns.add(trimmedLine);
                }
            }
        }
        
        return {
            nodeDefinitions: [...new Set(nodeDefinitions)],
            connections: [...new Set(connections)]
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
                    const sourceIdMatch = sourceNode.match(/^([^\[(]+)/);
                    if (sourceIdMatch) sourceNode = sourceIdMatch[1].trim();
                    
                    const targetIdMatch = targetNode.match(/^([^\[(]+)/);
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
            
            const isRelevantLine = nodeIds.some(nodeId => {
                const nodeRefRegex = new RegExp(`\\b${nodeId}([\[]|\(|-->|$)`);
                return nodeRefRegex.test(trimmedLine);
            });

            if (isRelevantLine) {
                 shouldSkip = true;
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
                if (currentLevel === targetNestLevel && targetNestLevel > 0) {
                    insertIndex = i;
                    break;
                }
                currentLevel--;
            } else if (targetNestLevel === 0 && insertIndex === -1 && 
                      (trimmedLine.includes('[') || trimmedLine.includes('(') || trimmedLine.startsWith('subgraph'))) {
                // ルートレベルの場合、最初のノードまたはサブグラフの前に挿入
                insertIndex = i;
                break;
            }
        }
        
        // 挿入位置が見つからない場合は末尾に追加
        if (insertIndex === -1) {
            // 最後の 'end' がある場合はその前に挿入
            const lastEnd = cleanedLines.map(l => l.trim()).lastIndexOf('end');
            if (lastEnd !== -1) {
                insertIndex = lastEnd;
            } else {
                insertIndex = cleanedLines.length;
            }
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
                const match = trimmedLine.match(/subgraph\s+(\w+)\s*[\[]?"?([^"]*)"?[\]]?/);
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
                    const match = trimmedLine.match(/subgraph\s+(\w+)\s*[\[]?"?([^"]*)"?[\]]?/);
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
    },

    // サブグラフのクリック検出
    detectSubgraphClick: function(x, y) {
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

            if (x >= subgraphX && x <= subgraphX + subgraphWidth &&
                y >= subgraphY && y <= subgraphY + subgraphHeight) {
                
                // サブグラフ内のノードをクリックしていないことを確認
                const nodes = subgraph.querySelectorAll('g.node');
                let clickedOnNode = false;
                
                for (const node of nodes) {
                    const nodeRect = node.getBoundingClientRect();
                    const nodeX = nodeRect.left - mermaidDisplayRect.left;
                    const nodeY = nodeRect.top - mermaidDisplayRect.top;
                    const nodeWidth = nodeRect.width;
                    const nodeHeight = nodeRect.height;
                    
                    if (x >= nodeX && x <= nodeX + nodeWidth &&
                        y >= nodeY && y <= nodeY + nodeHeight) {
                        clickedOnNode = true;
                        break;
                    }
                }
                
                if (!clickedOnNode) {
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
        }

        return null;
    },

    // サブグラフ名変更
    renameSubgraph: function(subgraphInfo) {
        if (!subgraphInfo) return;
        
        const newName = prompt('新しいサブグラフ名を入力してください:', subgraphInfo.name);
        if (!newName || newName === subgraphInfo.name) return;
        
        let mermaidCode = this.currentMermaidCode();
        const lines = mermaidCode.split('\n');
        
        // サブグラフの定義行を見つけて更新
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            if (trimmedLine.includes(`subgraph ${subgraphInfo.id}`)) {
                // サブグラフの名前部分を更新
                const match = trimmedLine.match(/^(\s*subgraph\s+\w+\s*[\[]?")[^"]*("[\]]?)$/);
                if (match) {
                    lines[i] = line.replace(/^(\s*subgraph\s+\w+\s*[\[]?")[^"]*("[\]]?)$/, `$1${newName}$2`);
                    break;
                }
            }
        }
        
        const updatedCode = lines.join('\n');
        if (updatedCode !== mermaidCode) {
            this.suppressAutoRender = true;
            this.currentMermaidCode(updatedCode);
            this.suppressAutoRender = false;
            this.renderMermaid();
            this.addToHistory(`サブグラフ名変更: ${subgraphInfo.name} → ${newName}`);
            this.showSuccess(`サブグラフ名を「${newName}」に変更しました`);
        } else {
            this.showError('サブグラフ名変更に失敗しました');
        }
    },

    // サブグラフのグループ解除
    ungroupSubgraph: function(subgraphInfo) {
        if (!subgraphInfo) {
            console.error('ungroupSubgraph: subgraphInfo is null');
            return;
        }
        
        console.log('ungroupSubgraph: サブグラフ情報', subgraphInfo);
        
        if (!confirm(`サブグラフ「${subgraphInfo.name}」のグループを解除しますか？`)) return;
        
        let mermaidCode = this.currentMermaidCode();
        const lines = mermaidCode.split('\n');
        const resultLines = [];
        
        let inTargetSubgraph = false;
        let subgraphLevel = 0;
        let targetSubgraphLevel = 0;
        let subgraphContent = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('subgraph')) {
                if (trimmedLine.includes(subgraphInfo.id)) {
                    inTargetSubgraph = true;
                    targetSubgraphLevel = subgraphLevel;
                    // サブグラフの開始行はスキップ
                    subgraphLevel++;
                    continue;
                } else {
                    subgraphLevel++;
                    resultLines.push(line);
                }
            } else if (trimmedLine === 'end') {
                if (inTargetSubgraph && subgraphLevel === targetSubgraphLevel + 1) {
                    // ターゲットサブグラフの終了
                    inTargetSubgraph = false;
                    // サブグラフの内容を現在の位置に展開
                    resultLines.push(...subgraphContent);
                    subgraphContent = [];
                    subgraphLevel--;
                    continue;
                } else {
                    subgraphLevel--;
                    resultLines.push(line);
                }
            } else {
                if (inTargetSubgraph) {
                    // インデントを調整してサブグラフの内容を保存
                    let adjustedLine = line;
                    // 先頭のインデント（スペース4個またはタブ1個）を1レベル削除
                    if (adjustedLine.startsWith('    ')) {
                        adjustedLine = adjustedLine.substring(4);
                    } else if (adjustedLine.startsWith('\t')) {
                        adjustedLine = adjustedLine.substring(1);
                    }
                    subgraphContent.push(adjustedLine);
                } else {
                    resultLines.push(line);
                }
            }
        }
        
        const updatedCode = resultLines.join('\n');
        console.log('ungroupSubgraph: 元のコード長', mermaidCode.length);
        console.log('ungroupSubgraph: 更新後コード長', updatedCode.length);
        console.log('ungroupSubgraph: サブグラフ内容', subgraphContent);
        
        if (updatedCode !== mermaidCode) {
            console.log('ungroupSubgraph: コードが変更されました、レンダリング開始');
            this.suppressAutoRender = true;
            this.currentMermaidCode(updatedCode);
            this.suppressAutoRender = false;
            this.renderMermaid();
            this.addToHistory(`グループ解除: ${subgraphInfo.name}`);
            this.showSuccess(`サブグラフ「${subgraphInfo.name}」のグループを解除しました`);
        } else {
            console.error('ungroupSubgraph: コードに変更がありません');
            this.showError('グループ解除に失敗しました');
        }
    },

    // サブグラフ削除
    deleteSubgraph: function(subgraphInfo) {
        if (!subgraphInfo) return;
        
        if (!confirm(`サブグラフ「${subgraphInfo.name}」とその中のすべての要素を削除しますか？`)) return;
        
        let mermaidCode = this.currentMermaidCode();
        const lines = mermaidCode.split('\n');
        const resultLines = [];
        
        let inTargetSubgraph = false;
        let subgraphLevel = 0;
        let targetSubgraphLevel = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('subgraph')) {
                if (trimmedLine.includes(subgraphInfo.id)) {
                    inTargetSubgraph = true;
                    targetSubgraphLevel = subgraphLevel;
                    // サブグラフ全体をスキップ開始
                }
                subgraphLevel++;
            } else if (trimmedLine === 'end') {
                if (inTargetSubgraph && subgraphLevel === targetSubgraphLevel + 1) {
                    // ターゲットサブグラフの終了
                    inTargetSubgraph = false;
                    subgraphLevel--;
                    continue; // end行もスキップ
                }
                subgraphLevel--;
            }
            
            if (!inTargetSubgraph) {
                resultLines.push(line);
            }
        }
        
        const updatedCode = resultLines.join('\n');
        if (updatedCode !== mermaidCode) {
            this.suppressAutoRender = true;
            this.currentMermaidCode(updatedCode);
            this.suppressAutoRender = false;
            this.renderMermaid();
            this.addToHistory(`サブグラフ削除: ${subgraphInfo.name}`);
            this.showSuccess(`サブグラフ「${subgraphInfo.name}」を削除しました`);
        } else {
            this.showError('サブグラフ削除に失敗しました');
        }
    }
};