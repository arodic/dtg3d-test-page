import { MeshBasicMaterial, Shader } from "three";
export declare class GraphicMaterial extends MeshBasicMaterial {
    showID: number;
    objectID: number;
    shader: Shader | null;
    constructor(parameters: any);
    onBeforeRender(): void;
    onBeforeCompile(shader: Shader): void;
}
//# sourceMappingURL=GraphicMaterial.d.ts.map