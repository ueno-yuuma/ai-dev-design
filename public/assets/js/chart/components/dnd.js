const dndComponent = {
    startNodeDrag: function(event, nodeElement) {
        const nodeId = this.extractNodeId(nodeElement);
        if (!nodeId) return;

        this.dragSourceNode = {
            id: nodeId,
            element: nodeElement
        };

        const mermaidDisplay = document.getElementById('mermaid-display');
        const displayRect = mermaidDisplay.getBoundingClientRect();
        this.dragStartPos = {
            x: event.clientX - displayRect.left,
            y: event.clientY - displayRect.top,
            clientX: event.clientX,
            clientY: event.clientY
        };
        this.dragStartTime = Date.now();

        document.addEventListener('mousemove', (e) => this.handleNodeDragMove(e));
        document.addEventListener('mouseup', (e) => this.handleNodeDragEnd(e));
    },
    handleNodeDragMove: function(event) {
        if (!this.dragSourceNode) return;

        if (!this.isNodeDragging()) {
            const distance = Math.sqrt(
                Math.pow(event.clientX - this.dragStartPos.clientX, 2) +
                Math.pow(event.clientY - this.dragStartPos.clientY, 2)
            );

            if (distance > this.dragThreshold) {
                this.isNodeDragging(true);

                this.createDragLine(this.dragStartPos.x, this.dragStartPos.y);

                this.dragSourceNode.element.style.opacity = '0.7';
                const mermaidDisplay = document.getElementById('mermaid-display');
                mermaidDisplay.style.cursor = 'crosshair';
            } else {
                return;
            }
        }

        const mermaidDisplay = document.getElementById('mermaid-display');
        const displayRect = mermaidDisplay.getBoundingClientRect();
        const currentX = event.clientX - displayRect.left;
        const currentY = event.clientY - displayRect.top;

        this.updateDragLine(this.dragStartPos.x, this.dragStartPos.y, currentX, currentY);
    },
    handleNodeDragEnd: function(event) {
        const wasDragging = this.isNodeDragging();
        const currentTime = Date.now();
        const timeDiff = currentTime - this.dragStartTime;

        if (wasDragging) {
            const mermaidDisplay = document.getElementById('mermaid-display');
            const displayRect = mermaidDisplay.getBoundingClientRect();
            const dropX = event.clientX - displayRect.left;
            const dropY = event.clientY - displayRect.top;

            const targetNode = this.getNodeAtPosition(event.clientX, event.clientY);

            if (targetNode && targetNode !== this.dragSourceNode.element) {
                const targetNodeId = this.extractNodeId(targetNode);
                if (targetNodeId) {
                    this.createConnection(this.dragSourceNode.id, targetNodeId);
                }
            } else {
                this.createChildNode(this.dragSourceNode.id, dropX, dropY);
            }
        } else if (this.dragSourceNode && timeDiff < 300) {
            const nodeId = this.dragSourceNode.id;

            if (event.ctrlKey || event.metaKey) {
                this.toggleNodeSelection(nodeId);
            } else {
                this.clearMultiSelection();
                this.addNodeToSelection(nodeId);
            }
        }

        this.endNodeDrag();
    },
    createDragLine: function(startX, startY) {
        const mermaidDisplay = document.getElementById('mermaid-display');

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1000';
        svg.id = 'drag-line-svg';

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', startX);
        line.setAttribute('y2', startY);
        line.setAttribute('stroke', '#007bff');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.id = 'drag-line';

        svg.appendChild(line);
        mermaidDisplay.appendChild(svg);

        this.dragLine = line;
    },
    updateDragLine: function(startX, startY, endX, endY) {
        if (this.dragLine) {
            this.dragLine.setAttribute('x2', endX);
            this.dragLine.setAttribute('y2', endY);
        }
    },
    endNodeDrag: function() {
        const dragSvg = document.getElementById('drag-line-svg');
        if (dragSvg) {
            dragSvg.remove();
        }

        if (this.dragSourceNode && this.dragSourceNode.element) {
            this.dragSourceNode.element.style.opacity = '1';
        }

        const mermaidDisplay = document.getElementById('mermaid-display');
        if (mermaidDisplay) {
            mermaidDisplay.style.cursor = 'default';
        }

        document.removeEventListener('mousemove', this.handleNodeDragMove);
        document.removeEventListener('mouseup', this.handleNodeDragEnd);

        this.isNodeDragging(false);
        this.dragSourceNode = null;
        this.dragLine = null;
    },
    getNodeAtPosition: function(clientX, clientY) {
        const elements = document.elementsFromPoint(clientX, clientY);
        for (let element of elements) {
            if (element.classList && element.classList.contains('node')) {
                return element;
            }
            const nodeParent = element.closest('g.node');
            if (nodeParent) {
                return nodeParent;
            }
        }
        return null;
    },
    createConnection: function(sourceId, targetId) {
        let code = this.currentMermaidCode();

        // 接続のみの行をマッチする（ノード宣言は除く）
        const connectionPattern = new RegExp(`^\\s*${sourceId}\\s*-->\\s*${targetId}\\s*$`, 'gm');
        
        const connectionExists = connectionPattern.test(code);
        
        if (connectionExists) {
            // Connection exists, remove it
            // 新しい正規表現を作成（test()で内部状態が変わるため）
            const removePattern = new RegExp(`^\\s*${sourceId}\\s*-->\\s*${targetId}\\s*$`, 'gm');
            code = code.replace(removePattern, '');
            this.currentMermaidCode(code);
            this.addToHistory(`接続削除: ${sourceId} -> ${targetId}`);
            this.showSuccess('ノード間の接続を削除しました');
        } else {
            // Connection doesn't exist, add it
            code += `\n    ${sourceId} --> ${targetId}`;
            this.currentMermaidCode(code);
            this.addToHistory(`接続追加: ${sourceId} -> ${targetId}`);
            this.showSuccess('ノード間に接続を作成しました');
        }
    },
    createChildNode: function(parentId, x, y) {
        const newNodeId = 'node_' + Date.now();
        const newNodeLabel = '新しいノード';

        const parentSubgraph = this.getNodeSubgraph(parentId);
        const dropTargetSubgraph = this.getDropTargetSubgraph(x, y);

        let code = this.currentMermaidCode();
        let message = '';

        if (parentSubgraph && dropTargetSubgraph && parentSubgraph.id === dropTargetSubgraph.id) {
            code = this.addNodeToSubgraph(code, newNodeId, newNodeLabel, parentSubgraph.id);
            code += `\n    ${parentId} --> ${newNodeId}`;
            message = `${parentSubgraph.name}グループ内に新しいノードを作成しました`;
        } else if (parentSubgraph && !dropTargetSubgraph) {
            code += `\n    ${newNodeId}[${newNodeLabel}]`;
            code += `\n    ${parentId} --> ${newNodeId}`;
            message = `${parentSubgraph.name}グループからグループ外に新しいノードを作成しました`;
        } else if (parentSubgraph && dropTargetSubgraph && parentSubgraph.id !== dropTargetSubgraph.id) {
            code = this.addNodeToSubgraph(code, newNodeId, newNodeLabel, dropTargetSubgraph.id);
            code += `\n    ${parentId} --> ${newNodeId}`;
            message = `${parentSubgraph.name}グループから${dropTargetSubgraph.name}グループに新しいノードを作成しました`;
        } else if (!parentSubgraph && dropTargetSubgraph) {
            code = this.addNodeToSubgraph(code, newNodeId, newNodeLabel, dropTargetSubgraph.id);
            code += `\n    ${parentId} --> ${newNodeId}`;
            message = `${dropTargetSubgraph.name}グループ内に新しいノードを作成しました`;
        } else {
            code += `\n    ${newNodeId}[${newNodeLabel}]`;
            code += `\n    ${parentId} --> ${newNodeId}`;
            message = '新しい子ノードを作成しました';
        }

        this.currentMermaidCode(code);
        this.addToHistory(`子ノード追加: ${parentId} -> ${newNodeId}`);
        this.showSuccess(message);
    },
    addNodeToSubgraph: function(mermaidCode, nodeId, nodeLabel, subgraphId) {
        const lines = mermaidCode.split('\n');
        const resultLines = [];
        let inTargetSubgraph = false;
        let subgraphLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('subgraph')) {
                subgraphLevel++;
                if (trimmedLine.includes(subgraphId)) {
                    inTargetSubgraph = true;
                }
                resultLines.push(line);
            }
            else if (trimmedLine === 'end' && subgraphLevel > 0) {
                if (inTargetSubgraph && subgraphLevel === 1) {
                    resultLines.push(`        ${nodeId}[${nodeLabel}]`);
                    inTargetSubgraph = false;
                }
                subgraphLevel--;
                resultLines.push(line);
            }
            else {
                resultLines.push(line);
            }
        }

        return resultLines.join('\n');
    },
    handleNodeDrop: function(event, targetElement) {
        // This is handled in handleNodeDragEnd
    },
    setupDragAndDrop: function() {
        // This is handled by the node click handlers now
    },
    allowDrop: function(vm, event) {
        event.preventDefault();
        return true;
    },
    onDrop: function(vm, event) {
        event.preventDefault();
        const nodeType = event.dataTransfer.getData('text/plain');

        if (nodeType) {
            this.addNodeToChart(nodeType);
        }

        return true;
    }
};
