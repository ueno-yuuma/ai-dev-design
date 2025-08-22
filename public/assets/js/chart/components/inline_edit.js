const inlineEditComponent = {
    startInlineTextEdit: function() {
        if (!this.selectedNodeId() || !this.selectedNodeElement) {
            this.showError('編集するノードが選択されていません');
            return;
        }

        this.hideContextMenu();
        this.startInlineEditor('text');
    },
    startInlineTypeChange: function() {
        if (!this.selectedNodeId() || !this.selectedNodeElement) {
            this.showError('変更するノードが選択されていません');
            return;
        }

        this.hideContextMenu();
        this.startInlineEditor('type');
    },
    startInlineEditor: function(type) {
        if (this.isInlineEditing()) {
            this.finishInlineEdit();
        }

        this.isInlineEditing(true);
        this.inlineEditorType = type;

        const nodeRect = this.getNodeBounds(this.selectedNodeElement);
        if (!nodeRect) return;

        if (type === 'text') {
            this.showInlineTextEditor(nodeRect);
        } else if (type === 'type') {
            this.showInlineTypeSelector(nodeRect);
        }

        this.selectedNodeElement.classList.add('editing');
    },
    showInlineTextEditor: function(nodeRect) {
        const editor = document.getElementById('inline-text-editor');
        if (!editor) return;

        const currentText = this.getNodeText(this.selectedNodeId());
        editor.value = currentText;

        const canvasRect = document.getElementById('mermaid-display').getBoundingClientRect();
        editor.style.left = (canvasRect.left + nodeRect.centerX - 50) + 'px';
        editor.style.top = (canvasRect.top + nodeRect.centerY - 10) + 'px';
        editor.style.display = 'block';

        setTimeout(() => {
            editor.focus();
            editor.select();
        }, 0);

        editor.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.finishTextEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelInlineEdit();
            }
        };

        editor.onblur = () => {
            setTimeout(() => this.finishTextEdit(), 100);
        };
    },
    showInlineTypeSelector: function(nodeRect) {
        const selector = document.getElementById('inline-type-selector');
        if (!selector) return;

        const currentNodeInfo = this.getNodeInfo(this.selectedNodeId());
        const currentType = currentNodeInfo ? currentNodeInfo.shape : 'rect';

        selector.querySelectorAll('.type-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.type === currentType) {
                option.classList.add('selected');
            }
        });

        const canvasRect = document.getElementById('mermaid-display').getBoundingClientRect();
        selector.style.left = (canvasRect.left + nodeRect.centerX - 80) + 'px';
        selector.style.top = (canvasRect.top + nodeRect.centerY + 20) + 'px';
        selector.style.display = 'block';

        selector.querySelectorAll('.type-option').forEach(option => {
            option.onclick = () => {
                const newType = option.dataset.type;
                if (newType !== currentType) {
                    this.changeNodeShape(this.selectedNodeId(), newType);
                    this.addToHistory('ノード種類変更');
                    this.showSuccess('ノードの種類を変更しました');
                }
                this.finishInlineEdit();
            };
        });

        setTimeout(() => {
            document.addEventListener('click', (e) => this.handleInlineEditorOutsideClick(e));
        }, 0);
    },
    getNodeBounds: function(nodeElement) {
        try {
            const rect = nodeElement.getBoundingClientRect();
            const canvasRect = document.getElementById('mermaid-display').getBoundingClientRect();

            return {
                centerX: rect.left + rect.width / 2 - canvasRect.left,
                centerY: rect.top + rect.height / 2 - canvasRect.top,
                width: rect.width,
                height: rect.height
            };
        } catch (error) {
            console.error('Error getting node bounds:', error);
            return null;
        }
    },
    finishTextEdit: function() {
        const editor = document.getElementById('inline-text-editor');
        if (!editor || editor.style.display === 'none') return;

        const newText = editor.value.trim();
        const currentText = this.getNodeText(this.selectedNodeId());

        if (newText && newText !== currentText) {
            this.updateNodeText(this.selectedNodeId(), newText);
            this.addToHistory('テキスト編集');
            this.showSuccess('ノードのテキストを更新しました');
        }

        this.finishInlineEdit();
    },
    finishInlineEdit: function() {
        const textEditor = document.getElementById('inline-text-editor');
        const typeSelector = document.getElementById('inline-type-selector');

        if (textEditor) {
            textEditor.style.display = 'none';
            textEditor.onkeydown = null;
            textEditor.onblur = null;
        }

        if (typeSelector) {
            typeSelector.style.display = 'none';
            typeSelector.querySelectorAll('.type-option').forEach(option => {
                option.onclick = null;
            });
        }

        if (this.selectedNodeElement) {
            this.selectedNodeElement.classList.remove('editing');
        }

        this.isInlineEditing(false);
        this.inlineEditorType = null;

        document.removeEventListener('click', this.handleInlineEditorOutsideClick);
    },
    cancelInlineEdit: function() {
        this.finishInlineEdit();
    },
    handleInlineEditorOutsideClick: function(event) {
        const textEditor = document.getElementById('inline-text-editor');
        const typeSelector = document.getElementById('inline-type-selector');

        if (textEditor && textEditor.contains(event.target)) return;
        if (typeSelector && typeSelector.contains(event.target)) return;

        this.finishInlineEdit();
    },
    editNode: function() {
        this.startInlineTextEdit();
    },
    changeNodeType: function() {
        this.startInlineTypeChange();
    }
};
