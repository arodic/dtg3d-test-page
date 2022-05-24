import { ControlsInteractive } from 'io-gui-three-controls';
import { Vector2, Raycaster } from 'three';
const raycaster = new Raycaster();
raycaster.layers.set(1);
const SUPPORTED_FILE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/tiff',
    'image/svg+xml',
    'image/targa',
    'image/gif'
];
export class SelectionControls extends ControlsInteractive {
    stagedEditor;
    throttleTimeout = 0;
    dropTargetPrintAreaSpec = null;
    dropTargetPosition = null;
    constructor(stagedEditor, camera, domElement) {
        super(camera, domElement);
        this.stagedEditor = stagedEditor;
    }
    onTrackedPointerUp(pointer) {
        if (pointer.view.offset.length() < 0.002) {
            const target = this.getPrintAreaTarget(pointer.view.current);
            if (target) {
                this.stagedEditor.selectedPrintArea = target.printArea;
                if (target.object) {
                    this.stagedEditor.selectedGraphic = target.object;
                }
                else {
                    this.stagedEditor.selectedGraphic = null;
                }
            }
            else {
                this.stagedEditor.selectedPrintArea = null;
                this.stagedEditor.selectedGraphic = null;
            }
        }
    }
    _onDragOver(event) {
        super._onDragOver(event);
        if (event.dataTransfer) {
            const isSupported = SUPPORTED_FILE_TYPES.indexOf(event.dataTransfer.items[0].type) !== -1;
            if (isSupported) {
                event.dataTransfer.dropEffect = 'copy';
            }
        }
    }
    _onDrop(event) {
        super._onDrop(event);
        if (event.dataTransfer) {
            const isSupported = SUPPORTED_FILE_TYPES.indexOf(event.dataTransfer.items[0].type) !== -1;
            if (isSupported && this.dropTargetPrintAreaSpec && this.dropTargetPosition) {
                this.stagedEditor.loadPrintLayer(event.dataTransfer.files[0], this.dropTargetPrintAreaSpec, this.dropTargetPosition);
            }
        }
        this.dropTargetPrintAreaSpec = null;
        this.dropTargetPosition = null;
    }
    onTrackedDragOver(pointer) {
        if (this.throttleTimeout)
            return;
        this.throttleTimeout = setTimeout(() => { this.throttleTimeout = 0; }, 100);
        const target = this.getPrintAreaTarget(pointer.view.current);
        if (target) {
            this.dropTargetPrintAreaSpec = target.printAreaSpec;
            this.dropTargetPosition = target.uv;
            this.stagedEditor.selectedPrintArea = target.printArea;
        }
        else {
            this.stagedEditor.selectedPrintArea = null;
        }
    }
    getPrintAreaTarget(pointer) {
        raycaster.setFromCamera(pointer, this.camera);
        const sceneSpec = this.stagedEditor.sceneSpec;
        const garmentMeshes = this.stagedEditor.garmentMeshes;
        if (sceneSpec) {
            const intersects = raycaster.intersectObjects(garmentMeshes, true);
            if (sceneSpec.garment.printAreas && intersects.length) {
                for (let i = 0; i < sceneSpec.garment.printAreas.length; i++) {
                    const printAreaSpec = sceneSpec.garment.printAreas[i];
                    const mesh = garmentMeshes.find(mesh => { return mesh.name === printAreaSpec.targetMeshName; });
                    if (mesh && intersects[0].object === mesh) {
                        const _uv = intersects[0].uv;
                        const _b = printAreaSpec.uvBounds;
                        if (_uv.x > _b[1] && _uv.x < _b[3] && _uv.y > _b[0] && _uv.y < _b[2]) {
                            const uv = new Vector2((_uv.x - _b[1]) / (_b[3] - _b[1]), (_uv.y - _b[0]) / (_b[2] - _b[0]));
                            const material = mesh?.material;
                            const printArea = material.printAreas.find((printArea) => { return printArea.name === printAreaSpec.name; });
                            const pxCoord = new Vector2(Math.floor(printArea.pickerRenderTarget.width * uv.x), Math.floor(printArea.pickerRenderTarget.height * uv.y));
                            const pixelBuffer = new Uint8Array(4);
                            this.stagedEditor.viewport.renderer.readRenderTargetPixels(printArea.pickerRenderTarget, pxCoord.x, pxCoord.y, 1, 1, pixelBuffer);
                            const id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | (pixelBuffer[2]);
                            const object = printArea.scene.getObjectById(id);
                            return {
                                printArea: printArea,
                                printAreaSpec: printAreaSpec,
                                uv: uv,
                                pxCoord: pxCoord,
                                object: object,
                            };
                        }
                    }
                }
            }
        }
        return null;
    }
}
//# sourceMappingURL=SelectionControls.js.map