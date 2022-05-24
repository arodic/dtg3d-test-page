import { Change, IoElement } from 'io-gui';
import { ThreeViewport } from 'io-gui-three-ui';
import { Mesh, Vector2 } from 'three';
import { PrintAreaSpec } from './PrintArea.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
declare type SceneSpec = {
    version: number;
    environment: {
        ibl: {
            url: string;
        };
        model?: ModelSpec;
    };
    garment: {
        model: ModelSpec;
        envelope?: ModelSpec;
        textures?: TextureSpec[];
        printAreas?: PrintAreaSpec[];
    };
};
export declare class StagedEditor extends IoElement {
    static get Style(): string;
    static get Properties(): {
        selectedPrintArea: null;
        selectedGraphic: null;
    };
    static get Listeners(): {
        drop: string;
        dragover: string;
        click: string;
    };
    sceneSpec?: SceneSpec;
    garmentMeshes: Mesh[];
    viewport: ThreeViewport;
    bokehPass: BokehPass;
    constructor(properties?: Record<string, any>);
    selectedPrintAreaChanged(change: Change): void;
    selectedGraphicChanged(): void;
    setGarmentColor(r: number, g: number, b: number): void;
    onBeforeRender(): void;
    loadScene(url: string): void;
    loadPrintLayer(file: File, printAreaSpec: PrintAreaSpec, uv: Vector2): void;
}
export {};
//# sourceMappingURL=staged-editor.d.ts.map