import { IoNode } from 'io-gui';
import { WebGLRenderer, WebGLRenderTarget, Scene, OrthographicCamera, Object3D } from "three";
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutlinePass } from './OutlinePass.js';
export declare type PrintAreaSpec = {
    name: string;
    targetMeshName: string;
    resolution: number[];
    uvBounds: number[];
    centimeterWidthHeight: number[];
    layers: ModelSpec[];
};
export declare class PrintArea extends IoNode {
    name: string;
    targetMeshName: string;
    uvBounds: number[];
    centimeterWidthHeight: number[];
    layers: ModelSpec[];
    renderer: WebGLRenderer;
    renderTarget: WebGLRenderTarget;
    pickerRenderTarget: WebGLRenderTarget;
    scene: Scene;
    camera: OrthographicCamera;
    composer: EffectComposer;
    outlinePass: OutlinePass;
    selection: Object3D[];
    constructor(spec: PrintAreaSpec, renderer: WebGLRenderer);
    loadLayers(specs: ModelSpec[]): void;
    loadLayer(spec: ModelSpec): void;
    render(): void;
}
//# sourceMappingURL=PrintArea.d.ts.map