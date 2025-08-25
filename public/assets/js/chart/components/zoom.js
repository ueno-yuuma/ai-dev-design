const zoomComponent = {
    setupZoomAndPan: function() {
        const mermaidDisplay = document.getElementById('mermaid-display');
        if (!mermaidDisplay) return;

        mermaidDisplay.removeEventListener('wheel', this.handleWheel);
        mermaidDisplay.removeEventListener('mousedown', this.handleMouseDown);
        mermaidDisplay.removeEventListener('mousemove', this.handleMouseMove);
        mermaidDisplay.removeEventListener('mouseup', this.handleMouseUp);
        mermaidDisplay.removeEventListener('mouseleave', this.handleMouseLeave);
        mermaidDisplay.removeEventListener('contextmenu', this.handleCanvasRightClick);

        mermaidDisplay.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        mermaidDisplay.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        mermaidDisplay.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        mermaidDisplay.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        mermaidDisplay.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        mermaidDisplay.addEventListener('contextmenu', (e) => this.handleCanvasRightClick(e));
    },
    handleWheel: function(e) {
        if (this.isInlineEditing() || this.isNodeDragging()) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const zoomFactor = 0.1;
        const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
        const newZoom = Math.max(0.1, Math.min(3.0, this.zoomLevel() + delta));

        this.zoomLevel(newZoom);
        this.updateMermaidTransform();
    },
    handleMouseDown: function(e) {
        if (this.isInlineEditing() || this.isNodeDragging()) {
            return;
        }

        const target = e.target;
        if (target.closest && target.closest('g.node')) {
            return;
        }

        if (e.button === 0) { // Left mouse button
            const mermaidDisplay = document.getElementById('mermaid-display');
            const rect = mermaidDisplay.getBoundingClientRect();

            this.selectionStart = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };

            if (!e.ctrlKey && !e.metaKey) {
                this.selectedNodes([]);
                this.updateNodeSelection();
            }

            this.isSelecting(true);

            const chartCanvas = document.getElementById('chart-canvas');
            if (chartCanvas) {
                chartCanvas.classList.add('selecting');
            }

            e.preventDefault();
        } else if (e.button === 2) { // Right mouse button
            this.isDragging(true);
            this.lastMousePos = { x: e.clientX, y: e.clientY };

            const mermaidDisplay = document.getElementById('mermaid-display');
            if (mermaidDisplay) {
                mermaidDisplay.classList.add('panning');
            }

            e.preventDefault();
        }
    },
    handleMouseMove: function(e) {
        if (this.isDragging()) {
            const deltaX = e.clientX - this.lastMousePos.x;
            const deltaY = e.clientY - this.lastMousePos.y;

            this.panX(this.panX() + deltaX / this.zoomLevel());
            this.panY(this.panY() + deltaY / this.zoomLevel());

            this.lastMousePos = { x: e.clientX, y: e.clientY };
            this.updateMermaidTransform();
            e.preventDefault();
        } else if (this.isSelecting()) {
            const mermaidDisplay = document.getElementById('mermaid-display');
            const rect = mermaidDisplay.getBoundingClientRect();

            this.selectionCurrent = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };

            this.updateSelectionRectangle();
            e.preventDefault();
        }
    },
    handleMouseUp: function(e) {
        if (e.button === 2 || this.isDragging()) {
            this.isDragging(false);

            const mermaidDisplay = document.getElementById('mermaid-display');
            if (mermaidDisplay) {
                mermaidDisplay.classList.remove('panning');
            }
        } else if (e.button === 0 && this.isSelecting()) {
            const hasActualDrag = this.selectionCurrent &&
                                  this.selectionStart &&
                                  (Math.abs(this.selectionCurrent.x - this.selectionStart.x) > 5 ||
                                   Math.abs(this.selectionCurrent.y - this.selectionStart.y) > 5);

            if (hasActualDrag) {
                this.finishSelection();
            } else {
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

                if (!e.ctrlKey && !e.metaKey) {
                    this.selectedNodes([]);
                    this.updateNodeSelection();
                }
            }

            e.preventDefault();
        }
    },
    handleMouseLeave: function(e) {
        if (this.isDragging()) {
            this.isDragging(false);

            const mermaidDisplay = document.getElementById('mermaid-display');
            if (mermaidDisplay) {
                mermaidDisplay.classList.remove('panning');
            }
        }

        if (this.isSelecting()) {
            this.finishSelection();
        }
    },
    updateMermaidTransform: function() {
        const container = document.querySelector('#mermaid-display .mermaid-container');
        if (container) {
            container.style.transform = `scale(${this.zoomLevel()}) translate(${this.panX()}px, ${this.panY()}px)`;
        }
    },
    resetZoomAndPan: function() {
        this.zoomLevel(1.0);
        this.panX(0);
        this.panY(0);
        this.updateMermaidTransform();
    },
    handleCanvasRightClick: function(event) {
        const target = event.target;

        if (target.closest && target.closest('g.node')) {
            return;
        }

        event.preventDefault();

        if (this.selectedNodes().length > 0) {
            this.showContextMenu(event.clientX, event.clientY);
        }
        else {
            this.clearNodeSelection();
        }
    }
};
