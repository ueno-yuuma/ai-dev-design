const uiComponent = {
    showContextMenu: function(x, y) {
        const selectedCount = this.selectedNodes().length;
        const menuId = selectedCount > 1 ? 'multi-node-context-menu' : 'node-context-menu';
        const menu = document.getElementById(menuId);
        if (!menu) return;

        this.hideContextMenu();

        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.add('show');
        this.contextMenuVisible(true);

        // This was missing from the original file, but the review mentioned it.
        // I will add it here.
        if (!this.contextMenuPosition) {
            this.contextMenuPosition = ko.observable({ x: 0, y: 0 });
        }
        this.contextMenuPosition({ x: x, y: y });

        setTimeout(() => {
            const rect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (rect.right > viewportWidth) {
                menu.style.left = (x - rect.width) + 'px';
            }
            if (rect.bottom > viewportHeight) {
                menu.style.top = (y - rect.height) + 'px';
            }
        }, 0);
    },
    hideContextMenu: function() {
        const singleMenu = document.getElementById('node-context-menu');
        const multiMenu = document.getElementById('multi-node-context-menu');

        if (singleMenu) {
            singleMenu.classList.remove('show');
        }
        if (multiMenu) {
            multiMenu.classList.remove('show');
        }

        this.contextMenuVisible(false);
    },
    handleDocumentClick: function(event) {
        const singleMenu = document.getElementById('node-context-menu');
        const multiMenu = document.getElementById('multi-node-context-menu');

        if (singleMenu && !singleMenu.contains(event.target) &&
            multiMenu && !multiMenu.contains(event.target)) {
            this.hideContextMenu();
        }
    },
    setupKeyboardShortcuts: function() {
        document.addEventListener('keydown', (e) => {
            if (this.isInlineEditing()) {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveChart();
                        break;
                    case 'a':
                        e.preventDefault();
                        this.selectAllNodes();
                        break;
                }
            } else {
                switch (e.key) {
                    case 'Delete':
                    case 'Backspace':
                        e.preventDefault();
                        if (this.selectedNodes().length > 0) {
                            this.deleteSelectedNodes();
                        }
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.clearMultiSelection();
                        break;
                }
            }
        });
    },
    showOperationGuide: function() {
        $('#operation-guide-modal').modal('show');
    },
    showSettings: function() {
        this.showError('設定機能は実装予定です');
    },
    detailNode: function() {
        if (!this.selectedNode()) {
            this.showError('詳細化するノードを選択してください');
            return;
        }

        this.showError('AI詳細化機能は実装予定です');
    },
    optimizeFlow: function() {
        if (!this.currentChart()) {
            this.showError('最適化するフローチャートがありません');
            return;
        }

        this.showError('AI最適化機能は実装予定です');
    },
    updateFromCode: function() {
        this.addToHistory();
        this.renderMermaid();
        $('#code-editor-modal').modal('hide');
        this.showSuccess('Mermaidコードを更新しました');
    },
    setupNavTabs: function() {
        // This function is empty in the original file.
    }
};
