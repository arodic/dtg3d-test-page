import { MeshStandardMaterial, Shader, Texture, Material } from "three";
import { PrintArea } from "../PrintArea";
export declare class GarmentMaterial extends MeshStandardMaterial {
    shader: Shader | null;
    normalMap: Texture;
    printAreas: PrintArea[];
    selectedPrintAreaIndex: number;
    diffuseDetailTexture: Texture;
    normalDetailTexture: Texture;
    copy(source: Material): this;
    onBeforeRender(): void;
    onBeforeCompile(shader: Shader): void;
}
//# sourceMappingURL=GarmentMaterial.d.ts.map