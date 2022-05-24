import { ControlsInteractive, PointerTracker, AnyCameraType } from 'io-gui-three-controls';
import { Vector2, Object3D } from 'three';
import { PrintArea, PrintAreaSpec } from '../PrintArea.js';
import { StagedEditor } from '../staged-editor.js';
declare type SelectTarget = {
    printArea: PrintArea;
    printAreaSpec: PrintAreaSpec;
    uv: Vector2;
    pxCoord: Vector2;
    object?: Object3D;
};
export declare class SelectionControls extends ControlsInteractive {
    stagedEditor: StagedEditor;
    throttleTimeout: number;
    dropTargetPrintAreaSpec: PrintAreaSpec | null;
    dropTargetPosition: Vector2 | null;
    constructor(stagedEditor: StagedEditor, camera: AnyCameraType, domElement: HTMLElement);
    onTrackedPointerUp(pointer: PointerTracker): void;
    _onDragOver(event: DragEvent): void;
    _onDrop(event: DragEvent): void;
    onTrackedDragOver(pointer: PointerTracker): void;
    getPrintAreaTarget(pointer: Vector2): SelectTarget | null;
}
export {};
//# sourceMappingURL=SelectionControls.d.ts.map